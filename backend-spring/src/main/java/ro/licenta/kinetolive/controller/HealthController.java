// Controller simplu pentru verificarea backend-ului KinetoLive
package ro.licenta.kinetolive.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public String healthCheck() {
        return "KinetoLive backend functioneaza.";
    }
}