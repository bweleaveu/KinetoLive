// Client HTTP pentru comunicarea cu microserviciul Python ML
package ro.licenta.kinetolive.ml;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.dto.MlAnalysisPayloadDto;
import ro.licenta.kinetolive.dto.MlAnalysisResponseDto;

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

    public MlAnalysisResponseDto analyzeSession(MlAnalysisPayloadDto payload) {
        if (payload == null) {
            throw new RuntimeException("ML payload is null. The backend could not build the analysis request.");
        }

        try {
            String requestBody = objectMapper.writeValueAsString(payload);

            System.out.println("ML_ANALYZE_URL=" + getAnalyzeUrl());
            System.out.println("ML_PAYLOAD_LENGTH=" + requestBody.length());
            System.out.println("ML_PAYLOAD_START=" + requestBody.substring(0, Math.min(300, requestBody.length())));

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

    private String getAnalyzeUrl() {
        String baseUrl = mlServiceBaseUrl == null ? "http://localhost:8000" : mlServiceBaseUrl.trim();

        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }

        if (baseUrl.endsWith("/api/ml/analyze")) {
            return baseUrl;
        }

        return baseUrl + "/api/ml/analyze";
    }
}
