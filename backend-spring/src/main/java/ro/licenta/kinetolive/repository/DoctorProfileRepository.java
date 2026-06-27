// Repository pentru profilurile doctorilor
package ro.licenta.kinetolive.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ro.licenta.kinetolive.entity.AppUser;
import ro.licenta.kinetolive.entity.DoctorProfile;

import java.util.Optional;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {

    Optional<DoctorProfile> findByUser(AppUser user);

    boolean existsByUser(AppUser user);
}