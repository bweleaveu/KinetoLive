// DTO pentru doctorul autentificat in aplicatia KinetoLive
package ro.licenta.kinetolive.dto.auth;

public record DoctorResponse(
        Long id,
        String email,
        String fullName,
        String role
) {
}
