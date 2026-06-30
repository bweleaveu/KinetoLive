// Client HTTP pentru comunicarea cu microserviciul Python ML
package ro.licenta.kinetolive.ml;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.dto.MlAnalysisPayloadDto;
import ro.licenta.kinetolive.dto.MlAnalysisResponseDto;
import ro.licenta.kinetolive.dto.MlServiceStatusDto;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class MlServiceClient {

    private final ObjectMapper objectMapper;

    @Value("${kinetolive.ml-service.base-url}")
    private String mlServiceBaseUrl;


    public MlServiceStatusDto getStatus() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .uri(URI.create(getHealthUrl()))
                    .timeout(Duration.ofSeconds(5))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpClient httpClient = HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .connectTimeout(Duration.ofSeconds(3))
                    .build();

            HttpResponse<String> httpResponse = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            if (httpResponse.statusCode() < 200 || httpResponse.statusCode() >= 300) {
                return offlineStatus("ML service returned HTTP " + httpResponse.statusCode() + ".");
            }

            JsonNode root = objectMapper.readTree(httpResponse.body());

            return new MlServiceStatusDto(
                    true,
                    getText(root, "status"),
                    getText(root, "service"),
                    getInteger(root, "samplingFrequencyHz"),
                    getBoolean(root, "modelsLoaded"),
                    getInteger(root, "featureCount"),
                    null
            );
        } catch (IOException exception) {
            return offlineStatus("Could not reach the ML service on " + normalizeBaseUrl() + ".");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return offlineStatus("The ML service status check was interrupted.");
        } catch (RuntimeException exception) {
            return offlineStatus(exception.getMessage());
        }
    }

    public MlAnalysisResponseDto analyzeSession(MlAnalysisPayloadDto payload) {
        if (payload == null) {
            throw new RuntimeException("ML payload is null. The backend could not build the analysis request.");
        }

        try {
            String requestBody = objectMapper.writeValueAsString(payload);


            if (requestBody == null || requestBody.isBlank() || "null".equals(requestBody.trim())) {
                throw new RuntimeException("ML payload was serialized as null or empty JSON.");
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .uri(URI.create(getAnalyzeUrl()))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpClient httpClient = HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> httpResponse = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            int statusCode = httpResponse.statusCode();
            String responseBody = httpResponse.body();

            if (statusCode < 200 || statusCode >= 300) {
                throw new RuntimeException(
                        "ML service returned HTTP " + statusCode + ". Response body: " + responseBody
                );
            }

            if (responseBody == null || responseBody.isBlank()) {
                throw new RuntimeException("ML service returned an empty response body.");
            }

            ObjectMapper responseMapper = objectMapper.copy()
                    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            return responseMapper.readValue(responseBody, MlAnalysisResponseDto.class);
        } catch (JsonProcessingException exception) {
            throw new RuntimeException("Could not serialize or deserialize the ML analysis JSON.", exception);
        } catch (IOException exception) {
            throw new RuntimeException(
                    "Could not call the KinetoLive ML service. Make sure it is running on " + mlServiceBaseUrl + ".",
                    exception
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("The KinetoLive ML service call was interrupted.", exception);
        }
    }

    private MlServiceStatusDto offlineStatus(String message) {
        return new MlServiceStatusDto(
                false,
                "offline",
                "KinetoLive ML Service",
                null,
                false,
                null,
                message
        );
    }

    private String getAnalyzeUrl() {
        String baseUrl = normalizeBaseUrl();

        if (baseUrl.endsWith("/api/ml/analyze")) {
            return baseUrl;
        }

        return baseUrl + "/api/ml/analyze";
    }

    private String getHealthUrl() {
        String baseUrl = normalizeBaseUrl();

        if (baseUrl.endsWith("/api/ml/analyze")) {
            return baseUrl.replace("/api/ml/analyze", "/api/ml/health");
        }

        if (baseUrl.endsWith("/api/ml/health")) {
            return baseUrl;
        }

        return baseUrl + "/api/ml/health";
    }

    private String normalizeBaseUrl() {
        String baseUrl = mlServiceBaseUrl == null ? "http://localhost:8000" : mlServiceBaseUrl.trim();

        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }

        return baseUrl;
    }

    private String getText(JsonNode root, String fieldName) {
        JsonNode value = root.get(fieldName);
        return value == null || value.isNull() ? null : value.asText();
    }

    private Integer getInteger(JsonNode root, String fieldName) {
        JsonNode value = root.get(fieldName);
        return value == null || value.isNull() ? null : value.asInt();
    }

    private Boolean getBoolean(JsonNode root, String fieldName) {
        JsonNode value = root.get(fieldName);
        return value == null || value.isNull() ? null : value.asBoolean();
    }
}
