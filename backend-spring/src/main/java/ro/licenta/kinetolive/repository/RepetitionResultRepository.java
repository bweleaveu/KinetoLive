// Repository pentru rezultatele repetarilor
package ro.licenta.kinetolive.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ro.licenta.kinetolive.entity.RepetitionResult;
import ro.licenta.kinetolive.entity.TherapySession;

import java.util.List;

public interface RepetitionResultRepository extends JpaRepository<RepetitionResult, Long> {

    List<RepetitionResult> findAllByTherapySessionOrderByRepetitionIndexAsc(TherapySession therapySession);
}