// DTO primit de la ESP32 cu statusul calibrarii BNO055
package ro.licenta.kinetolive.dto;

public record DeviceCalibrationReportRequest(
        Integer calSys,
        Integer calAcc,
        Integer calGyr,
        Integer calMag,
        Boolean calibrationSaved,
        Boolean fullyCalibrated,

        Long commandId,
        String command,
        Boolean success,
        String message
) {
}
