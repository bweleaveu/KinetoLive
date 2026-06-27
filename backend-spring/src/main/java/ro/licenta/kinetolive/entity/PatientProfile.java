// Entitate pentru profilul unui pacient
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

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private AppUser user;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    private DoctorProfile assignedDoctor;

    private LocalDate dateOfBirth;

    @Column(length = 30)
    private String phoneNumber;

    @Column(columnDefinition = "TEXT")
    private String medicalNotes;
}