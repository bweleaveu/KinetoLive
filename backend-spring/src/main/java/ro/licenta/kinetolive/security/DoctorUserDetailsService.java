// Service folosit de Spring Security pentru incarcarea doctorului dupa email
package ro.licenta.kinetolive.security;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.entity.AppUser;
import ro.licenta.kinetolive.entity.enums.UserRole;
import ro.licenta.kinetolive.repository.AppUserRepository;

import java.util.List;

@Service
public class DoctorUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    public DoctorUserDetailsService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Doctorul nu a fost gasit."));

        if (user.getRole() != UserRole.DOCTOR) {
            throw new UsernameNotFoundException("Doar doctorii pot accesa aplicatia.");
        }

        return new User(
                user.getEmail(),
                user.getPasswordHash(),
                user.isActive(),
                true,
                true,
                true,
                List.of(new SimpleGrantedAuthority("ROLE_DOCTOR"))
        );
    }
}