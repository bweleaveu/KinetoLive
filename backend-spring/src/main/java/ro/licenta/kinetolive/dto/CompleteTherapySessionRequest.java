// DTO pentru finalizarea unei sesiuni de recuperare
package ro.licenta.kinetolive.dto;

import java.util.List;

public record CompleteTherapySessionRequest(
        Integer detectedExerciseCode,
        Integer sampleCount,
        Double durationSeconds,
        Integer repetitionCount,
        Double exerciseConfidence,
        Integer qualityCode,
        String qualityName,
        Double qualityConfidence,
        String notes,
        List<RepetitionResultRequest> repetitions
) {
}