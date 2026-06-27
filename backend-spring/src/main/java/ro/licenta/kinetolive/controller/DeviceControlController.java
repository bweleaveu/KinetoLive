// Controller pentru controlul ESP32 din frontend
package ro.licenta.kinetolive.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.licenta.kinetolive.dto.DeviceControlStateResponse;
import ro.licenta.kinetolive.service.DeviceControlService;

@RestController
@RequestMapping("/api/device-control")
public class DeviceControlController {

    private final DeviceControlService deviceControlService;

    public DeviceControlController(DeviceControlService deviceControlService) {
        this.deviceControlService = deviceControlService;
    }

    @GetMapping("/state")
    public DeviceControlStateResponse getState() {
        return deviceControlService.getState();
    }

    @PostMapping("/start/{sessionId}")
    public DeviceControlStateResponse start(@PathVariable Long sessionId) {
        return deviceControlService.start(sessionId);
    }   

    @PostMapping("/stop")
    public DeviceControlStateResponse stop() {
        return deviceControlService.stop();
    }
}