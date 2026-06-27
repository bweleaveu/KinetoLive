// Entitate pentru rezultatul unei repetari detectate
package ro.licenta.kinetolive.entity;

import jakarta.persistence.*;
import lombok.*;
import ro.licenta.kinetolive.entity.enums.SessionStatus;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "therapy_sessions")
public class TherapySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;

    @ManyToOne(optional = false)
    @JoinColumn(name = "intended_exercise_id", nullable = false)
    private Exercise intendedExercise;

    @ManyToOne
    @JoinColumn(name = "detected_exercise_id")
    private Exercise detectedExercise;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SessionStatus status;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    private LocalDateTime endedAt;

    private Integer sampleCount;

    private Double durationSeconds;

    private Integer repetitionCount;

    private Double exerciseConfidence;

    private Integer qualityCode;

    @Column(length = 80)
    private String qualityName;

    private Double qualityConfidence;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @PrePersist
    public void onCreate() {
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }

        if (status == null) {
            status = SessionStatus.STARTED;
        }
    }
}