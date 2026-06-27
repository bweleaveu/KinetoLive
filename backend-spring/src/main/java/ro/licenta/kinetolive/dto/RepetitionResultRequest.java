// DTO pentru rezultatul unei repetari detectate
package ro.licenta.kinetolive.dto;

public record RepetitionResultRequest(
        Integer repetitionIndex,
        Double durationSeconds,
        Integer predictedExerciseCode,
        Double exerciseConfidence,
        Integer predictedQualityCode,
        String predictedQualityName,
        Double qualityConfidence,
        Integer sampleCount,
        Integer startSample,
        Integer endSample
) {
}