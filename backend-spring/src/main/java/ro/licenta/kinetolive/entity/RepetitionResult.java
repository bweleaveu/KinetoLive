// Entitate pentru rezultatul unei repetari detectate
package ro.licenta.kinetolive.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "repetition_results")
public class RepetitionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "therapy_session_id", nullable = false)
    private TherapySession therapySession;

    @Column(nullable = false)
    private Integer repetitionIndex;

    private Double durationSeconds;

    private Integer predictedExerciseCode;

    private Double exerciseConfidence;

    private Integer predictedQualityCode;

    @Column(length = 80)
    private String predictedQualityName;

    private Double qualityConfidence;

    private Integer sampleCount;

    private Integer startSample;

    private Integer endSample;
}