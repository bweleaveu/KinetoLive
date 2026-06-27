// Controller REST pentru verificarea, analiza si salvarea esantioanelor live
package ro.licenta.kinetolive.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ro.licenta.kinetolive.dto.*;
import ro.licenta.kinetolive.service.LiveSessionAnalysisService;
import ro.licenta.kinetolive.service.LiveSessionBufferService;
import ro.licenta.kinetolive.service.LiveSessionMlPayloadService;

import java.util.List;

@RestController
@RequestMapping("/api/live-sessions")
@RequiredArgsConstructor
public class LiveSessionController {

    private final LiveSessionBufferService liveSessionBufferService;
    private final LiveSessionMlPayloadService liveSessionMlPayloadService;
    private final LiveSessionAnalysisService liveSessionAnalysisService;

    @GetMapping("/{sessionId}/sample-count")
    public LiveSessionBufferStatusDto getSampleCount(@PathVariable Long sessionId) {
        return new LiveSessionBufferStatusDto(
                sessionId,
                liveSessionBufferService.getSampleCount(sessionId),
                liveSessionBufferService.hasSession(sessionId)
        );
    }

    @GetMapping("/{sessionId}/samples")
    public List<SensorSampleMessage> getSamples(@PathVariable Long sessionId) {
        return liveSessionBufferService.getSamples(sessionId);
    }

    @GetMapping("/{sessionId}/ml-payload")
    public MlAnalysisPayloadDto getMlPayload(@PathVariable Long sessionId) {
        return liveSessionMlPayloadService.buildMlPayload(sessionId);
    }

    @PostMapping("/{sessionId}/analyze")
    public MlAnalysisResponseDto analyzeLiveSession(@PathVariable Long sessionId) {
        return liveSessionAnalysisService.analyzeLiveSession(sessionId);
    }

    @PostMapping("/{sessionId}/analyze-and-save")
    public LiveSessionAnalysisResultDto analyzeAndSaveLiveSession(@PathVariable Long sessionId) {
        return liveSessionAnalysisService.analyzeAndSaveLiveSession(sessionId);
    }

    @DeleteMapping("/{sessionId}/samples")
    public LiveSessionBufferStatusDto clearSamples(@PathVariable Long sessionId) {
        liveSessionBufferService.clearSession(sessionId);

        return new LiveSessionBufferStatusDto(
                sessionId,
                0,
                false
        );
    }
}