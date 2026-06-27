// Controller REST pentru endpoint-urile exercitiilor
package ro.licenta.kinetolive.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ro.licenta.kinetolive.dto.ExerciseResponseDto;
import ro.licenta.kinetolive.service.ExerciseService;

import java.util.List;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseService exerciseService;

    @GetMapping
    public List<ExerciseResponseDto> getAllExercises() {
        return exerciseService.getAllActiveExercises();
    }

    @GetMapping("/{exerciseCode}")
    public ExerciseResponseDto getExerciseByCode(@PathVariable Integer exerciseCode) {
        return exerciseService.getExerciseByCode(exerciseCode);
    }
}