// Service pentru sesiunea activa folosita de ESP32
package ro.licenta.kinetolive.service;

import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.dto.DeviceControlStateResponse;

@Service
public class DeviceControlService {

    private boolean streamingEnabled = false;
    private Long activeSessionId = null;

    public synchronized DeviceControlStateResponse start(Long sessionId) {
        this.activeSessionId = sessionId;
        this.streamingEnabled = true;

        return new DeviceControlStateResponse(this.streamingEnabled, this.activeSessionId);
    }

    public synchronized DeviceControlStateResponse stop() {
        this.streamingEnabled = false;

        return new DeviceControlStateResponse(this.streamingEnabled, this.activeSessionId);
    }

    public synchronized DeviceControlStateResponse getState() {
        return new DeviceControlStateResponse(this.streamingEnabled, this.activeSessionId);
    }
}