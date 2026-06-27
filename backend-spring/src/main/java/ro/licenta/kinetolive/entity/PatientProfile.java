// Entitate pentru profilul medical al unui pacient, fara cont de autentificare
package ro.licenta.kinetolive.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "patient_profiles")
public class PatientProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String firstName;

    @Column(nullable = false, length = 80)
    private String lastName;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    private DoctorProfile assignedDoctor;

    private LocalDate dateOfBirth;

    @Column(length = 30)
    private String phoneNumber;

    @Column(columnDefinition = "TEXT")
    private String medicalNotes;
}