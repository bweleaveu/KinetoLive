// DTO pentru payload-ul pregatit pentru analiza ML
package ro.licenta.kinetolive.dto;

import java.util.List;

public record MlAnalysisPayloadDto(
        Long sessionId,
        Integer samplingFrequencyHz,
        Integer sampleCount,
        Double durationSeconds,
        boolean readyForAnalysis,
        String message,
        Integer selectedExerciseCode,
        List<String> featureColumns,
        List<MlSignalSampleDto> samples
) {
}