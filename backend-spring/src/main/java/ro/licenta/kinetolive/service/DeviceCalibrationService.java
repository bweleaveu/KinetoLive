// Service pentru controlul calibrarii BNO055 prin ESP32 WiFi
package ro.licenta.kinetolive.service;

import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.dto.DeviceCalibrationReportRequest;
import ro.licenta.kinetolive.dto.DeviceCalibrationStatusDto;
import ro.licenta.kinetolive.dto.DeviceControlStateResponse;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class DeviceCalibrationService {

    private static final int REQUIRED_STABLE_SAMPLES = 25;

    private final AtomicLong commandSequence = new AtomicLong(0);

    private Integer calSys = 0;
    private Integer calAcc = 0;
    private Integer calGyr = 0;
    private Integer calMag = 0;

    private boolean calibrationSaved = false;
    private boolean monitoringEnabled = false;
    private boolean restartRequired = false;

    private int stableSamples = 0;

    private Long pendingCommandId = null;
    private String pendingCommand = null;

    private String message = "Astept raportarea statusului de calibrare de la ESP32.";
    private String messageType = "info";
    private LocalDateTime lastUpdatedAt = null;

    public synchronized DeviceCalibrationStatusDto getStatus() {
        return toStatusDto();
    }

    public synchronized DeviceCalibrationStatusDto startMonitoring() {
        monitoringEnabled = true;
        restartRequired = false;
        stableSamples = 0;
        message = "Monitorizarea calibrarii a pornit. Urmeaza instructiunile afisate.";
        messageType = "info";

        return toStatusDto();
    }

    public synchronized DeviceCalibrationStatusDto stopMonitoring() {
        monitoringEnabled = false;
        stableSamples = 0;
        message = "Monitorizarea calibrarii a fost oprita.";
        messageType = "info";

        return toStatusDto();
    }

    public synchronized DeviceCalibrationStatusDto saveCalibration() {
        if (!isFullyCalibrated()) {
            message = "Calibrarea nu poate fi salvata pana cand SYS, ACC, GYR si MAG nu sunt toate 3.";
            messageType = "warning";
            return toStatusDto();
        }

        enqueueCommand("SAVE_CAL");
        message = "Comanda de salvare a calibrarii a fost trimisa catre ESP32.";
        messageType = "info";

        return toStatusDto();
    }

    public synchronized DeviceCalibrationStatusDto clearCalibration() {
        enqueueCommand("CLEAR_CAL");
        message = "Comanda de stergere a calibrarii a fost trimisa catre ESP32.";
        messageType = "info";

        return toStatusDto();
    }

    public synchronized DeviceCalibrationStatusDto useSavedCalibration() {
        enqueueCommand("USE_SAVED_CAL");
        message = "Comanda de folosire a calibrarii salvate a fost trimisa catre ESP32.";
        messageType = "info";

        return toStatusDto();
    }

    public synchronized DeviceControlStateResponse buildDeviceControlState(
            boolean streamingEnabled,
            Long sessionId
    ) {
        return new DeviceControlStateResponse(
                streamingEnabled,
                sessionId,
                pendingCommandId,
                pendingCommand,
                monitoringEnabled
        );
    }

    public synchronized DeviceCalibrationStatusDto receiveReport(DeviceCalibrationReportRequest request) {
        if (request.calSys() != null) {
            calSys = clampCalibrationValue(request.calSys());
        }

        if (request.calAcc() != null) {
            calAcc = clampCalibrationValue(request.calAcc());
        }

        if (request.calGyr() != null) {
            calGyr = clampCalibrationValue(request.calGyr());
        }

        if (request.calMag() != null) {
            calMag = clampCalibrationValue(request.calMag());
        }

        if (request.calibrationSaved() != null) {
            calibrationSaved = request.calibrationSaved();
        }

        boolean fullyCalibratedNow = request.fullyCalibrated() != null
                ? request.fullyCalibrated()
                : isFullyCalibrated();

        if (fullyCalibratedNow) {
            stableSamples = Math.min(stableSamples + 1, REQUIRED_STABLE_SAMPLES);
        } else if (monitoringEnabled) {
            stableSamples = 0;
        }

        lastUpdatedAt = LocalDateTime.now();

        if (request.commandId() != null
                && request.commandId().equals(pendingCommandId)) {
            handleCommandResult(request);
        } else if (monitoringEnabled && fullyCalibratedNow && stableSamples >= REQUIRED_STABLE_SAMPLES) {
            monitoringEnabled = false;
            message = "Calibrarea este completa. Poti salva profilul in memoria nevolatila.";
            messageType = "success";
        } else if (calibrationSaved) {
            message = "Profilul de calibrare salvat este disponibil in ESP32.";
            messageType = "success";
        } else if (monitoringEnabled) {
            message = "Monitorizarea calibrarii este activa.";
            messageType = "info";
        }

        return toStatusDto();
    }

    private void handleCommandResult(DeviceCalibrationReportRequest request) {
        boolean success = Boolean.TRUE.equals(request.success());
        String command = request.command() != null ? request.command() : pendingCommand;
        String deviceMessage = request.message() != null ? request.message() : "";

        if (success && "SAVE_CAL".equals(command)) {
            calibrationSaved = true;
            restartRequired = false;
            monitoringEnabled = false;
            message = "Calibrarea a fost salvata in memoria nevolatila a ESP32.";
            messageType = "success";
        } else if (success && "CLEAR_CAL".equals(command)) {
            calibrationSaved = false;
            restartRequired = false;
            monitoringEnabled = false;
            stableSamples = 0;

            calSys = 0;
            calAcc = 0;
            calGyr = 0;
            calMag = 0;

            message = "Calibrarea salvata a fost stearsa. Senzorul a fost resetat si poate fi recalibrat.";
            messageType = "success";
        } else if (success && "USE_SAVED_CAL".equals(command)) {
            calibrationSaved = true;
            restartRequired = false;
            message = "Profilul de calibrare salvat a fost aplicat de ESP32.";
            messageType = "success";
        } else {
            message = deviceMessage.isBlank()
                    ? "ESP32 a raportat o eroare la comanda de calibrare."
                    : deviceMessage;
            messageType = "error";
        }

        pendingCommandId = null;
        pendingCommand = null;
    }

    private void enqueueCommand(String command) {
        pendingCommandId = commandSequence.incrementAndGet();
        pendingCommand = command;
    }

    private DeviceCalibrationStatusDto toStatusDto() {
        boolean fullyCalibrated = isFullyCalibrated();
        boolean usable = fullyCalibrated || calibrationSaved;

        return new DeviceCalibrationStatusDto(
                calSys,
                calAcc,
                calGyr,
                calMag,
                calibrationSaved,
                fullyCalibrated,
                usable,
                monitoringEnabled,
                restartRequired,
                stableSamples,
                REQUIRED_STABLE_SAMPLES,
                pendingCommandId,
                pendingCommand,
                message,
                messageType,
                lastUpdatedAt
        );
    }

    private boolean isFullyCalibrated() {
        return calSys == 3 && calAcc == 3 && calGyr == 3 && calMag == 3;
    }

    private Integer clampCalibrationValue(Integer value) {
        if (value == null) {
            return 0;
        }

        return Math.max(0, Math.min(3, value));
    }
}
