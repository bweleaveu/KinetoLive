// Monitorizeaza sesiunea live activa si marcheaza FAILED cand ESP32 nu mai trimite date
package ro.licenta.kinetolive.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class LiveSessionFailureMonitor {

    private static final Duration DEVICE_DISCONNECT_TIMEOUT = Duration.ofSeconds(10);

    private final DeviceControlService deviceControlService;
    private final TherapySessionService therapySessionService;

    @Scheduled(fixedDelay = 2000)
    public void markDisconnectedLiveSessionAsFailed() {
        DeviceControlService.ActiveStreamState state = deviceControlService.getActiveStreamState();

        if (!state.streamingEnabled() || state.activeSessionId() == null) {
            return;
        }

        Instant lastActivity = state.lastSensorSampleAt() != null
                ? state.lastSensorSampleAt()
                : state.streamingStartedAt();

        if (lastActivity == null) {
            return;
        }

        Duration inactiveFor = Duration.between(lastActivity, Instant.now());

        if (inactiveFor.compareTo(DEVICE_DISCONNECT_TIMEOUT) < 0) {
            return;
        }

        boolean sessionFailed = therapySessionService.failStartedSession(
                state.activeSessionId(),
                "FAILED_DEVICE_DISCONNECTED_TIMEOUT"
        );

        if (sessionFailed) {
            deviceControlService.clearFailedSession(state.activeSessionId());
        }
    }
}
