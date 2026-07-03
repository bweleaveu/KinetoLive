// DTO pentru actualizarea profilului doctorului autentificat
package ro.licenta.kinetolive.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDoctorProfileRequest(
        @NotBlank(message = "Prenumele este obligatoriu.")
        @Size(max = 80, message = "Prenumele este prea lung.")
        String firstName,

        @NotBlank(message = "Numele este obligatoriu.")
        @Size(max = 80, message = "Numele este prea lung.")
        String lastName,

        @Email(message = "Emailul nu este valid.")
        @NotBlank(message = "Emailul este obligatoriu.")
        @Size(max = 120, message = "Emailul este prea lung.")
        String email,

        @Size(max = 120, message = "Specializarea este prea lunga.")
        String specialization,

        @Size(max = 120, message = "Numele clinicii este prea lung.")
        String clinicName,

        @Size(max = 30, message = "Numarul de telefon este prea lung.")
        String phoneNumber
) {
}
