// Controller REST pentru endpoint-urile sesiunilor de recuperare
package ro.licenta.kinetolive.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
    public TherapySessionResponseDto startSession(@Valid @RequestBody StartTherapySessionRequest request) {
        return therapySessionService.startSession(request);
    }

    @PutMapping("/{sessionId}/complete")
    public TherapySessionResponseDto completeSession(
            @PathVariable Long sessionId,
            @RequestBody CompleteTherapySessionRequest request
    ) {
        return therapySessionService.completeSession(sessionId, request);
    }

    @GetMapping("/patient/{patientId}")
    public List<TherapySessionResponseDto> getSessionsByPatient(@PathVariable Long patientId) {
        return therapySessionService.getSessionsByPatient(patientId);
    }

    @GetMapping("/{sessionId}/repetitions")
    public List<RepetitionResultResponseDto> getRepetitionsBySession(@PathVariable Long sessionId) {
        return therapySessionService.getRepetitionsBySession(sessionId);
    }
}