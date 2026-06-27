// Service pentru trimiterea bufferului live catre microserviciul Python ML si salvarea rezultatului
package ro.licenta.kinetolive.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.dto.*;
import ro.licenta.kinetolive.ml.MlServiceClient;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LiveSessionAnalysisService {

    private final LiveSessionMlPayloadService liveSessionMlPayloadService;
    private final LiveSessionBufferService liveSessionBufferService;
    private final MlServiceClient mlServiceClient;
    private final TherapySessionService therapySessionService;

    public MlAnalysisResponseDto analyzeLiveSession(Long sessionId) {
        MlAnalysisPayloadDto payload = liveSessionMlPayloadService.buildMlPayload(sessionId);

        return mlServiceClient.analyzeSession(payload);
    }

    public LiveSessionAnalysisResultDto analyzeAndSaveLiveSession(Long sessionId) {
        MlAnalysisPayloadDto payload = liveSessionMlPayloadService.buildMlPayload(sessionId);

        MlAnalysisResponseDto mlResponse = mlServiceClient.analyzeSession(payload);

        if (!Boolean.TRUE.equals(mlResponse.readyForAnalysis())) {
            return new LiveSessionAnalysisResultDto(
                    sessionId,
                    false,
                    mlResponse.message(),
                    mlResponse,
                    null
            );
        }

        CompleteTherapySessionRequest completeRequest = mapMlResponseToCompleteRequest(mlResponse);

        TherapySessionResponseDto savedSession = therapySessionService.completeSession(
                sessionId,
                completeRequest
        );

        liveSessionBufferService.clearSession(sessionId);

        return new LiveSessionAnalysisResultDto(
                sessionId,
                true,
                "ML analysis was saved to the database.",
                mlResponse,
                savedSession
        );
    }

    private CompleteTherapySessionRequest mapMlResponseToCompleteRequest(MlAnalysisResponseDto mlResponse) {
        List<RepetitionResultRequest> repetitions = mlResponse.repetitions()
                .stream()
                .map(this::mapRepetitionToRequest)
                .toList();

        return new CompleteTherapySessionRequest(
                mlResponse.detectedExerciseCode(),
                mlResponse.sampleCount(),
                mlResponse.durationSeconds(),
                mlResponse.repetitionCount(),
                mlResponse.exerciseConfidence(),
                mlResponse.qualityCode(),
                mlResponse.qualityName(),
                mlResponse.qualityConfidence(),
                mlResponse.message(),
                repetitions
        );
    }

    private RepetitionResultRequest mapRepetitionToRequest(
            MlRepetitionPredictionResponseDto repetition
    ) {
        return new RepetitionResultRequest(
                repetition.repetitionIndex(),
                repetition.durationSeconds(),
                repetition.predictedExerciseCode(),
                repetition.exerciseConfidence(),
                repetition.predictedQualityCode(),
                repetition.predictedQualityName(),
                repetition.qualityConfidence(),
                repetition.sampleCount(),
                repetition.startSample(),
                repetition.endSample()
        );
    }
}