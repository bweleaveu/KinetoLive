// Service pentru autentificarea si inregistrarea doctorilor
package ro.licenta.kinetolive.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ro.licenta.kinetolive.dto.auth.AuthResponse;
import ro.licenta.kinetolive.dto.auth.DoctorResponse;
import ro.licenta.kinetolive.dto.auth.LoginRequest;
import ro.licenta.kinetolive.dto.auth.RegisterRequest;
import ro.licenta.kinetolive.entity.AppUser;
import ro.licenta.kinetolive.entity.enums.UserRole;
import ro.licenta.kinetolive.repository.AppUserRepository;
import ro.licenta.kinetolive.security.JwtService;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (appUserRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exista deja un cont cu acest email.");
        }

        String[] nameParts = splitFullName(request.fullName());

        AppUser doctor = AppUser.builder()
                .firstName(nameParts[0])
                .lastName(nameParts[1])
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(UserRole.DOCTOR)
                .active(true)
                .build();

        AppUser savedDoctor = appUserRepository.save(doctor);
        String token = jwtService.generateToken(savedDoctor);

        return new AuthResponse(token, mapDoctor(savedDoctor));
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        AppUser doctor = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email sau parola incorecta."));

        if (!doctor.isActive() || doctor.getRole() != UserRole.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doar doctorii pot accesa aplicatia.");
        }

        if (!passwordEncoder.matches(request.password(), doctor.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email sau parola incorecta.");
        }

        String token = jwtService.generateToken(doctor);

        return new AuthResponse(token, mapDoctor(doctor));
    }

    public DoctorResponse getCurrentDoctor(String email) {
        AppUser doctor = appUserRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Doctorul autentificat nu a fost gasit."));

        if (!doctor.isActive() || doctor.getRole() != UserRole.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doar doctorii pot accesa aplicatia.");
        }

        return mapDoctor(doctor);
    }

    private DoctorResponse mapDoctor(AppUser doctor) {
        return new DoctorResponse(
                doctor.getId(),
                doctor.getEmail(),
                doctor.getFirstName() + " " + doctor.getLastName(),
                doctor.getRole().name()
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String[] splitFullName(String fullName) {
        String normalizedFullName = fullName.trim().replaceAll("\\s+", " ");
        String[] parts = normalizedFullName.split(" ", 2);

        if (parts.length == 1) {
            return new String[]{parts[0], "Doctor"};
        }

        return new String[]{parts[0], parts[1]};
    }
}
