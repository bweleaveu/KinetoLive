// DTO pentru doctorul autentificat in aplicatia KinetoLive
package ro.licenta.kinetolive.dto.auth;

import java.time.LocalDateTime;

public record DoctorResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String fullName,
        String role,
        boolean active,
        LocalDateTime createdAt,
        Long doctorProfileId,
        String specialization,
        String clinicName,
        String phoneNumber
) {
}
