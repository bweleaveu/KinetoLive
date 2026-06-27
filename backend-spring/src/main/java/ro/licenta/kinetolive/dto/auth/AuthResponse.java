// DTO pentru raspunsul de autentificare trimis catre frontend
package ro.licenta.kinetolive.dto.auth;

public record AuthResponse(
        String token,
        DoctorResponse doctor
) {
}
