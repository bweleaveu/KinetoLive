// Repository pentru sesiunile de recuperare
package ro.licenta.kinetolive.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ro.licenta.kinetolive.entity.PatientProfile;
import ro.licenta.kinetolive.entity.TherapySession;

import java.util.List;

public interface TherapySessionRepository extends JpaRepository<TherapySession, Long> {

    List<TherapySession> findAllByPatientOrderByStartedAtDesc(PatientProfile patient);
}