// DTO pentru raspunsul complet primit de la microserviciul Python ML
package ro.licenta.kinetolive.dto;

import java.util.List;
import java.util.Map;

public record MlAnalysisResponseDto(
        Long sessionId,
        Integer sampleCount,
        Double durationSeconds,
        Integer repetitionCount,

        Integer selectedExerciseCode,
        String selectedExerciseName,
        String analysisMode,

        Integer detectedExerciseCode,
        String detectedExerciseName,
        Double exerciseConfidence,

        Integer qualityModelExerciseCode,
        String qualityModelExerciseName,

        Integer qualityCode,
        String qualityName,
        Double qualityConfidence,

        Boolean readyForAnalysis,
        String message,

        Map<String, Object> segmentationInformation,
        Map<String, Object> motionMetrics,

        List<MlRepetitionPredictionResponseDto> repetitions
) {
}