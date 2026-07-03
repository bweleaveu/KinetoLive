// Service pentru sesiunea activa folosita de ESP32
package ro.licenta.kinetolive.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.dto.DeviceControlStateResponse;

import java.time.Instant;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class DeviceControlService {

    private final DeviceCalibrationService deviceCalibrationService;

    private boolean streamingEnabled = false;
    private Long activeSessionId = null;
    private Instant streamingStartedAt = null;
    private Instant lastSensorSampleAt = null;

    public synchronized DeviceControlStateResponse start(Long sessionId) {
        this.activeSessionId = sessionId;
        this.streamingEnabled = true;
        this.streamingStartedAt = Instant.now();
        this.lastSensorSampleAt = null;

        return buildStateResponse();
    }

    public synchronized DeviceControlStateResponse stop() {
        this.streamingEnabled = false;

        return buildStateResponse();
    }

    public synchronized DeviceControlStateResponse getState() {
        return buildStateResponse();
    }

    public synchronized void recordSensorSample(Long sessionId) {
        if (!this.streamingEnabled || sessionId == null) {
            return;
        }

        if (Objects.equals(this.activeSessionId, sessionId)) {
            this.lastSensorSampleAt = Instant.now();
        }
    }

    public synchronized ActiveStreamState getActiveStreamState() {
        return new ActiveStreamState(
                this.streamingEnabled,
                this.activeSessionId,
                this.streamingStartedAt,
                this.lastSensorSampleAt
        );
    }

    public synchronized void clearFailedSession(Long sessionId) {
        if (!Objects.equals(this.activeSessionId, sessionId)) {
            return;
        }

        this.streamingEnabled = false;
        this.activeSessionId = null;
        this.streamingStartedAt = null;
        this.lastSensorSampleAt = null;
    }

    private DeviceControlStateResponse buildStateResponse() {
        return deviceCalibrationService.buildDeviceControlState(
                this.streamingEnabled,
                this.activeSessionId
        );
    }

    public record ActiveStreamState(
            boolean streamingEnabled,
            Long activeSessionId,
            Instant streamingStartedAt,
            Instant lastSensorSampleAt
    ) {
    }
}
