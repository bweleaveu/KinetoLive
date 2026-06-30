// Controller pentru verificarea statusului microserviciului ML
package ro.licenta.kinetolive.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.licenta.kinetolive.dto.MlServiceStatusDto;
import ro.licenta.kinetolive.ml.MlServiceClient;

@RestController
@RequestMapping("/api/ml")
@RequiredArgsConstructor
public class MlStatusController {

    private final MlServiceClient mlServiceClient;

    @GetMapping("/status")
    public MlServiceStatusDto getMlServiceStatus() {
        return mlServiceClient.getStatus();
    }
}
