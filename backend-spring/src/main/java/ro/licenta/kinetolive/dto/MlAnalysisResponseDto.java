// DTO pentru raspunsul complet primit de la microserviciul Python ML
package ro.licenta.kinetolive.dto;

import java.util.List;

public record MlAnalysisResponseDto(
        Long sessionId,
        Integer sampleCount,
        Double durationSeconds,
        Integer repetitionCount,

        Integer detectedExerciseCode,
        String detectedExerciseName,
        Double exerciseConfidence,

        Integer qualityCode,
        String qualityName,
        Double qualityConfidence,

        Boolean readyForAnalysis,
        String message,

        List<MlRepetitionPredictionResponseDto> repetitions
) {
}