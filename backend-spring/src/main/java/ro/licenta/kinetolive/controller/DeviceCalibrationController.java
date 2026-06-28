// Controller pentru calibrarea BNO055 prin ESP32 WiFi
package ro.licenta.kinetolive.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.licenta.kinetolive.dto.DeviceCalibrationReportRequest;
import ro.licenta.kinetolive.dto.DeviceCalibrationStatusDto;
import ro.licenta.kinetolive.service.DeviceCalibrationService;

@RestController
@RequestMapping("/api/device-calibration")
@RequiredArgsConstructor
public class DeviceCalibrationController {

    private final DeviceCalibrationService deviceCalibrationService;

    @GetMapping("/status")
    public DeviceCalibrationStatusDto getStatus() {
        return deviceCalibrationService.getStatus();
    }

    @PostMapping("/start")
    public DeviceCalibrationStatusDto startMonitoring() {
        return deviceCalibrationService.startMonitoring();
    }

    @PostMapping("/stop")
    public DeviceCalibrationStatusDto stopMonitoring() {
        return deviceCalibrationService.stopMonitoring();
    }

    @PostMapping("/save")
    public DeviceCalibrationStatusDto saveCalibration() {
        return deviceCalibrationService.saveCalibration();
    }

    @PostMapping("/clear")
    public DeviceCalibrationStatusDto clearCalibration() {
        return deviceCalibrationService.clearCalibration();
    }

    @PostMapping("/use-saved")
    public DeviceCalibrationStatusDto useSavedCalibration() {
        return deviceCalibrationService.useSavedCalibration();
    }

    @PostMapping("/report")
    public DeviceCalibrationStatusDto receiveReport(@RequestBody DeviceCalibrationReportRequest request) {
        return deviceCalibrationService.receiveReport(request);
    }
}
