// Repository pentru profilurile pacientilor
package ro.licenta.kinetolive.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ro.licenta.kinetolive.entity.AppUser;
import ro.licenta.kinetolive.entity.PatientProfile;

import java.util.Optional;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {

    Optional<PatientProfile> findByUser(AppUser user);

    boolean existsByUser(AppUser user);
}