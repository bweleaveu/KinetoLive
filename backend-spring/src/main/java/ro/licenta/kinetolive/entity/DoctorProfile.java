// Entitate pentru profilul unui doctor
package ro.licenta.kinetolive.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "doctor_profiles")
public class DoctorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private AppUser user;

    @Column(length = 120)
    private String specialization;

    @Column(length = 120)
    private String clinicName;

    @Column(length = 30)
    private String phoneNumber;
}