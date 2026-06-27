// Entitate pentru utilizatorii aplicatiei KinetoLive
package ro.licenta.kinetolive.entity;

import jakarta.persistence.*;
import lombok.*;
import ro.licenta.kinetolive.entity.enums.UserRole;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "app_users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String firstName;

    @Column(nullable = false, length = 80)
    private String lastName;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private boolean active;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        active = true;
    }
}