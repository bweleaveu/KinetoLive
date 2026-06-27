// Service pentru logica exercitiilor (business logic)
package ro.licenta.kinetolive.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.dto.ExerciseResponseDto;
import ro.licenta.kinetolive.entity.Exercise;
import ro.licenta.kinetolive.repository.ExerciseRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;

    public List<ExerciseResponseDto> getAllActiveExercises() {
        return exerciseRepository.findAllByActiveTrueOrderByExerciseCodeAsc()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    public ExerciseResponseDto getExerciseByCode(Integer exerciseCode) {
        Exercise exercise = exerciseRepository.findByExerciseCodeAndActiveTrue(exerciseCode)
                .orElseThrow(() -> new RuntimeException("Exercise not found: " + exerciseCode));

        return mapToResponseDto(exercise);
    }

    // Converteste entitatea Exercise in DTO pentru frontend
    private ExerciseResponseDto mapToResponseDto(Exercise exercise) {
        return new ExerciseResponseDto(
                exercise.getId(),
                exercise.getExerciseCode(),
                exercise.getNameRo(),
                exercise.getNameEn(),
                exercise.getDescriptionRo(),
                exercise.getDescriptionEn(),
                exercise.isActive()
        );
    }
}