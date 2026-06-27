// Client REST pentru comunicarea cu microserviciul Python ML
package ro.licenta.kinetolive.ml;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import ro.licenta.kinetolive.dto.MlAnalysisPayloadDto;
import ro.licenta.kinetolive.dto.MlAnalysisResponseDto;

@Service
@RequiredArgsConstructor
public class MlServiceClient {

    private final RestClient.Builder restClientBuilder;

    @Value("${kinetolive.ml-service.base-url}")
    private String mlServiceBaseUrl;

    public MlAnalysisResponseDto analyzeSession(MlAnalysisPayloadDto payload) {
        try {
            RestClient restClient = restClientBuilder
                    .baseUrl(mlServiceBaseUrl)
                    .build();

            MlAnalysisResponseDto response = restClient
                    .post()
                    .uri("/api/ml/analyze")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(MlAnalysisResponseDto.class);

            if (response == null) {
                throw new RuntimeException("ML service returned an empty response.");
            }

            return response;
        } catch (RestClientException exception) {
            throw new RuntimeException(
                    "Could not call the KinetoLive ML service. Make sure it is running on http://localhost:8000.",
                    exception
            );
        }
    }
}