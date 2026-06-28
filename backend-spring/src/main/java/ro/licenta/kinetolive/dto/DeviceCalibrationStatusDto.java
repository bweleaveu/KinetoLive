// DTO pentru starea calibrarii BNO055 raportata de ESP32
package ro.licenta.kinetolive.dto;

import java.time.LocalDateTime;

public record DeviceCalibrationStatusDto(
        Integer calSys,
        Integer calAcc,
        Integer calGyr,
        Integer calMag,

        boolean calibrationSaved,
        boolean fullyCalibrated,
        boolean usable,
        boolean monitoringEnabled,
        boolean restartRequired,

        Integer stableSamples,
        Integer requiredStableSamples,

        Long pendingCommandId,
        String pendingCommand,

        String message,
        String messageType,
        LocalDateTime lastUpdatedAt
) {
}
