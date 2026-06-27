// Controller REST pentru pacientii doctorului autentificat
package ro.licenta.kinetolive.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import ro.licenta.kinetolive.dto.PatientProfileRequest;
import ro.licenta.kinetolive.dto.PatientProfileResponseDto;
import ro.licenta.kinetolive.service.PatientProfileService;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientProfileController {

    private final PatientProfileService patientProfileService;

    @GetMapping
    public List<PatientProfileResponseDto> getPatients(Authentication authentication) {
        return patientProfileService.getPatientsForDoctor(authentication.getName());
    }

    @GetMapping("/{patientId}")
    public PatientProfileResponseDto getPatient(
            Authentication authentication,
            @PathVariable Long patientId
    ) {
        return patientProfileService.getPatientForDoctor(authentication.getName(), patientId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PatientProfileResponseDto createPatient(
            Authentication authentication,
            @Valid @RequestBody PatientProfileRequest request
    ) {
        return patientProfileService.createPatient(authentication.getName(), request);
    }

    @PutMapping("/{patientId}")
    public PatientProfileResponseDto updatePatient(
            Authentication authentication,
            @PathVariable Long patientId,
            @Valid @RequestBody PatientProfileRequest request
    ) {
        return patientProfileService.updatePatient(authentication.getName(), patientId, request);
    }

    @DeleteMapping("/{patientId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePatient(
            Authentication authentication,
            @PathVariable Long patientId
    ) {
        patientProfileService.deletePatient(authentication.getName(), patientId);
    }
}
