// DTO pentru crearea si actualizarea pacientilor unui doctor
package ro.licenta.kinetolive.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record PatientProfileRequest(
        @NotBlank(message = "Prenumele pacientului este obligatoriu.")
        @Size(max = 80, message = "Prenumele poate avea cel mult 80 de caractere.")
        String firstName,

        @NotBlank(message = "Numele pacientului este obligatoriu.")
        @Size(max = 80, message = "Numele poate avea cel mult 80 de caractere.")
        String lastName,

        LocalDate dateOfBirth,

        @Size(max = 30, message = "Telefonul poate avea cel mult 30 de caractere.")
        String phoneNumber,

        String medicalNotes
) {
}
