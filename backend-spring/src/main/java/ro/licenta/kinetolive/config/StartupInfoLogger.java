// Clasa pentru afisarea informatiilor utile la pornirea aplicatiei
package ro.licenta.kinetolive.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class StartupInfoLogger {

    @EventListener(ApplicationReadyEvent.class)
    public void showStartupInfo() {
        log.info("""
                KinetoLive backend ready
                  Health:  http://localhost:8080/api/health
                  Swagger: http://localhost:8080/swagger-ui.html
                  OpenAPI: http://localhost:8080/v3/api-docs
                """);
    }
}
