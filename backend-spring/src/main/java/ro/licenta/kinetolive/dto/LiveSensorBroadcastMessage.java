// DTO pentru mesajul live retransmis catre clientii conectati prin WebSocket
package ro.licenta.kinetolive.dto;

import java.time.LocalDateTime;

public record LiveSensorBroadcastMessage(
        String type,
        LocalDateTime serverTime,
        Integer bufferedSampleCount,
        SensorSampleMessage sample
) {
}