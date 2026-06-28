// Service pentru sesiunea activa folosita de ESP32
package ro.licenta.kinetolive.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.dto.DeviceControlStateResponse;

@Service
@RequiredArgsConstructor
public class DeviceControlService {

    private final DeviceCalibrationService deviceCalibrationService;

    private boolean streamingEnabled = false;
    private Long activeSessionId = null;

    public synchronized DeviceControlStateResponse start(Long sessionId) {
        this.activeSessionId = sessionId;
        this.streamingEnabled = true;

        return deviceCalibrationService.buildDeviceControlState(
                this.streamingEnabled,
                this.activeSessionId
        );
    }

    public synchronized DeviceControlStateResponse stop() {
        this.streamingEnabled = false;

        return deviceCalibrationService.buildDeviceControlState(
                this.streamingEnabled,
                this.activeSessionId
        );
    }

    public synchronized DeviceControlStateResponse getState() {
        return deviceCalibrationService.buildDeviceControlState(
                this.streamingEnabled,
                this.activeSessionId
        );
    }
}
