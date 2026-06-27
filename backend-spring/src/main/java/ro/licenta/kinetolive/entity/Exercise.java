// Entitate pentru exercitiile disponibile in KinetoLive
package ro.licenta.kinetolive.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "exercises")
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Integer exerciseCode;

    // Campuri bilingve pentru numele si descrierea exercitiului
    @Column(name = "name_ro")
    private String nameRo;

    @Column(name = "name_en")
    private String nameEn;

    @Column(name = "description_ro", columnDefinition = "TEXT")
    private String descriptionRo;

    @Column(name = "description_en", columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(nullable = false)
    private boolean active;

    @PrePersist
    public void onCreate() {
        active = true;
    }
}