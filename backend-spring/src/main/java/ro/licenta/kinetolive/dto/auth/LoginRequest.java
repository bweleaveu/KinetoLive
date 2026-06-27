// DTO pentru cererea de autentificare a doctorului
package ro.licenta.kinetolive.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @Email(message = "Emailul nu este valid.")
        @NotBlank(message = "Emailul este obligatoriu.")
        String email,

        @NotBlank(message = "Parola este obligatorie.")
        String password
) {
}
