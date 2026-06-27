// DTO folosit pentru trimiterea rezultatelor repetarilor catre frontend
package ro.licenta.kinetolive.dto;

public record RepetitionResultResponseDto(
        Long id,
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