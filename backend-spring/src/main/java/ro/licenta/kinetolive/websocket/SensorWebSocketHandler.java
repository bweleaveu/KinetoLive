// Handler WebSocket pentru primirea si retransmiterea datelor live de la senzor
package ro.licenta.kinetolive.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import ro.licenta.kinetolive.dto.LiveSensorBroadcastMessage;
import ro.licenta.kinetolive.dto.SensorSampleMessage;
import ro.licenta.kinetolive.service.LiveSessionBufferService;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
@RequiredArgsConstructor
public class SensorWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final LiveSessionBufferService liveSessionBufferService;

    private final Set<WebSocketSession> connectedSessions = new CopyOnWriteArraySet<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        connectedSessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        connectedSessions.remove(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            SensorSampleMessage sensorSample = objectMapper.readValue(
                    message.getPayload(),
                    SensorSampleMessage.class
            );

            int bufferedSampleCount = liveSessionBufferService.addSample(sensorSample);

            LiveSensorBroadcastMessage broadcastMessage = new LiveSensorBroadcastMessage(
                    "SENSOR_SAMPLE",
                    LocalDateTime.now(),
                    bufferedSampleCount,
                    sensorSample
            );

            String broadcastJson = objectMapper.writeValueAsString(broadcastMessage);

            sendToAllConnectedClients(broadcastJson);
        } catch (Exception exception) {
            sendErrorMessage(session, "Invalid sensor message: " + exception.getMessage());
        }
    }

    private void sendToAllConnectedClients(String message) {
        connectedSessions.removeIf(session -> !session.isOpen());

        for (WebSocketSession session : connectedSessions) {
            try {
                session.sendMessage(new TextMessage(message));
            } catch (Exception exception) {
                connectedSessions.remove(session);
            }
        }
    }

    private void sendErrorMessage(WebSocketSession session, String errorMessage) throws Exception {
        if (session.isOpen()) {
            String errorJson = objectMapper.writeValueAsString(
                    new WebSocketErrorMessage(
                            "ERROR",
                            LocalDateTime.now(),
                            errorMessage
                    )
            );

            session.sendMessage(new TextMessage(errorJson));
        }
    }

    private record WebSocketErrorMessage(
            String type,
            LocalDateTime serverTime,
            String message
    ) {
    }
}