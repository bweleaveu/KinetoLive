// Configurare WebSocket pentru comunicarea live cu senzorul
package ro.licenta.kinetolive.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import ro.licenta.kinetolive.websocket.SensorWebSocketHandler;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final SensorWebSocketHandler sensorWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(sensorWebSocketHandler, "/ws/sensor")
                .setAllowedOrigins("*");
    }
}