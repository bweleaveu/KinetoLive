// DTO folosit pentru trimiterea datelor despre exercitii catre frontend
package ro.licenta.kinetolive.dto;

public record ExerciseResponseDto(
        Long id,
        Integer exerciseCode,
        String nameRo,
        String nameEn,
        String descriptionRo,
        String descriptionEn,
        boolean active
) {
}