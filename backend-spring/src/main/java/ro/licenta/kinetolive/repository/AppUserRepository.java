// Repository pentru utilizatorii aplicatiei KinetoLive
package ro.licenta.kinetolive.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ro.licenta.kinetolive.entity.AppUser;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmail(String email);

    boolean existsByEmail(String email);
}