// DTO folosit pentru trimiterea datelor despre o sesiune catre frontend
package ro.licenta.kinetolive.dto;

import java.time.LocalDateTime;

public record TherapySessionResponseDto(
        Long id,
        Long patientId,
        String patientName,
        Integer intendedExerciseCode,
        String intendedExerciseName,
        Integer detectedExerciseCode,
        String detectedExerciseName,
        String status,
        LocalDateTime startedAt,
        LocalDateTime endedAt,
        Integer sampleCount,
        Double durationSeconds,
        Integer repetitionCount,
        Double exerciseConfidence,
        Integer qualityCode,
        String qualityName,
        Double qualityConfidence,
        String notes
) {
}