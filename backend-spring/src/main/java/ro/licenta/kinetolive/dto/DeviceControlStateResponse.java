// DTO pentru starea de control folosita de ESP32
package ro.licenta.kinetolive.dto;

public record DeviceControlStateResponse(
        boolean streamingEnabled,
        Long sessionId
) {
}