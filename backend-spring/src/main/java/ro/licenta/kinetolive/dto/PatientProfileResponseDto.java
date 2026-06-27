// DTO trimis catre frontend pentru pacientii doctorului autentificat
package ro.licenta.kinetolive.dto;

import java.time.LocalDate;

public record PatientProfileResponseDto(
        Long id,
        String firstName,
        String lastName,
        String fullName,
        Long doctorId,
        LocalDate dateOfBirth,
        String phoneNumber,
        String medicalNotes
) {
}
