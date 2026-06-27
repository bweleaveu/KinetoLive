// DTO pentru pornirea unei sesiuni de recuperare
package ro.licenta.kinetolive.dto;

import jakarta.validation.constraints.NotNull;

public record StartTherapySessionRequest(
        @NotNull Long patientId,
        @NotNull Integer intendedExerciseCode
) {
}