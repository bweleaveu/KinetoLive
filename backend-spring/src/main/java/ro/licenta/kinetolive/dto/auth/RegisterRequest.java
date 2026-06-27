// DTO pentru inregistrarea unui doctor nou
package ro.licenta.kinetolive.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Numele complet este obligatoriu.")
        @Size(max = 160, message = "Numele complet este prea lung.")
        String fullName,

        @Email(message = "Emailul nu este valid.")
        @NotBlank(message = "Emailul este obligatoriu.")
        String email,

        @NotBlank(message = "Parola este obligatorie.")
        @Size(min = 6, message = "Parola trebuie sa aiba minimum 6 caractere.")
        String password
) {
}
