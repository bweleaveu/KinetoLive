// DTO pentru actualizarea exercitiului intentionat al unei sesiuni live
package ro.licenta.kinetolive.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateIntendedExerciseRequest(
        @NotNull Integer intendedExerciseCode
) {
}
