// DTO pentru rezultatul unei repetari primit de la microserviciul Python ML
package ro.licenta.kinetolive.dto;

public record MlRepetitionPredictionResponseDto(
        Integer repetitionIndex,
        Double durationSeconds,
        Integer predictedExerciseCode,
        String predictedExerciseName,
        Double exerciseConfidence,
        Integer predictedQualityCode,
        String predictedQualityName,
        Double qualityConfidence,
        Integer sampleCount,
        Integer startSample,
        Integer endSample
) {
}