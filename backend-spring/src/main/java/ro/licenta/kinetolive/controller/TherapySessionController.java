// Controller REST pentru endpoint-urile sesiunilor de recuperare
package ro.licenta.kinetolive.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import ro.licenta.kinetolive.dto.*;
import ro.licenta.kinetolive.service.TherapySessionService;

import java.util.List;

@RestController
@RequestMapping("/api/therapy-sessions")
@RequiredArgsConstructor
public class TherapySessionController {

    private final TherapySessionService therapySessionService;

    @PostMapping("/start")
    public TherapySessionResponseDto startSession(
            Authentication authentication,
            @Valid @RequestBody StartTherapySessionRequest request
    ) {
        return therapySessionService.startSession(authentication.getName(), request);
    }

    @PutMapping("/{sessionId}/complete")
    public TherapySessionResponseDto completeSession(
            @PathVariable Long sessionId,
            @RequestBody CompleteTherapySessionRequest request
    ) {
        return therapySessionService.completeSession(sessionId, request);
    }


    @PatchMapping("/{sessionId}/intended-exercise")
    public TherapySessionResponseDto updateIntendedExercise(
            Authentication authentication,
            @PathVariable Long sessionId,
            @Valid @RequestBody UpdateIntendedExerciseRequest request
    ) {
        return therapySessionService.updateIntendedExercise(authentication.getName(), sessionId, request);
    }

    @GetMapping("/{sessionId}")
    public TherapySessionResponseDto getSessionById(
            Authentication authentication,
            @PathVariable Long sessionId
    ) {
        return therapySessionService.getSessionById(authentication.getName(), sessionId);
    }

    @GetMapping("/patient/{patientId}")
    public List<TherapySessionResponseDto> getSessionsByPatient(
            Authentication authentication,
            @PathVariable Long patientId
    ) {
        return therapySessionService.getSessionsByPatient(authentication.getName(), patientId);
    }

    @DeleteMapping("/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSession(
            Authentication authentication,
            @PathVariable Long sessionId
    ) {
        therapySessionService.deleteSession(authentication.getName(), sessionId);
    }

    @GetMapping("/{sessionId}/repetitions")
    public List<RepetitionResultResponseDto> getRepetitionsBySession(
            Authentication authentication,
            @PathVariable Long sessionId
    ) {
        return therapySessionService.getRepetitionsBySession(authentication.getName(), sessionId);
    }
}
