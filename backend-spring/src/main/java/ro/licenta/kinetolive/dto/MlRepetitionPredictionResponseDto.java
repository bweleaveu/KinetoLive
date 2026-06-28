// DTO pentru rezultatul unei repetari primit de la microserviciul Python ML
package ro.licenta.kinetolive.dto;

public record MlRepetitionPredictionResponseDto(
        Integer repetitionIndex,
        Double durationSeconds,
        Integer predictedExerciseCode,
        String predictedExerciseName,
        Double exerciseConfidence,
        Integer modelDetectedExerciseCode,
        String modelDetectedExerciseName,
        Double modelDetectedExerciseConfidence,
        Integer qualityModelExerciseCode,
        String qualityModelExerciseName,
        Integer predictedQualityCode,
        String predictedQualityName,
        Double qualityConfidence,
        Integer sampleCount,
        Integer startSample,
        Integer endSample,
        Integer classificationStartSample,
        Integer classificationEndSample,
        Double motionAmplitude,
        Double accEnergy,
        Double gyrEnergy
) {
}