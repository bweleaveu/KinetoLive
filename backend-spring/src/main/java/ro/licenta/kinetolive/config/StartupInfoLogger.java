// Clasa pentru afisarea linkurilor utile la pornirea aplicatiei
package ro.licenta.kinetolive.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class StartupInfoLogger {

    @EventListener(ApplicationReadyEvent.class)
    public void showStartupInfo() {
        System.out.println();
        System.out.println("==================================================");
        System.out.println("KinetoLive backend is running.");
        System.out.println("Health check: http://localhost:8080/api/health");
        System.out.println("Swagger UI:   http://localhost:8080/swagger-ui.html");
        System.out.println("OpenAPI JSON: http://localhost:8080/v3/api-docs");
        System.out.println("==================================================");
        System.out.println();
    }
}