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
import ro.licenta.kinetolive.dto.auth.UpdateDoctorProfileRequest;
import ro.licenta.kinetolive.entity.AppUser;
import ro.licenta.kinetolive.entity.DoctorProfile;
import ro.licenta.kinetolive.entity.enums.UserRole;
import ro.licenta.kinetolive.repository.AppUserRepository;
import ro.licenta.kinetolive.repository.DoctorProfileRepository;
import ro.licenta.kinetolive.security.JwtService;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final DoctorProfileRepository doctorProfileRepository;
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

        DoctorProfile profile = doctorProfileRepository.save(
                DoctorProfile.builder()
                        .user(savedDoctor)
                        .build()
        );

        String token = jwtService.generateToken(savedDoctor);

        return new AuthResponse(token, mapDoctor(savedDoctor, profile));
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        AppUser doctor = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email sau parola incorecta."));

        validateDoctorAccount(doctor);

        if (!passwordEncoder.matches(request.password(), doctor.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email sau parola incorecta.");
        }

        DoctorProfile profile = getOrCreateDoctorProfile(doctor);
        String token = jwtService.generateToken(doctor);

        return new AuthResponse(token, mapDoctor(doctor, profile));
    }

    public DoctorResponse getCurrentDoctor(String email) {
        AppUser doctor = getAuthenticatedDoctor(email);
        DoctorProfile profile = getOrCreateDoctorProfile(doctor);

        return mapDoctor(doctor, profile);
    }

    @Transactional
    public AuthResponse updateCurrentDoctor(String currentEmail, UpdateDoctorProfileRequest request) {
        AppUser doctor = getAuthenticatedDoctor(currentEmail);
        DoctorProfile profile = getOrCreateDoctorProfile(doctor);

        String normalizedEmail = normalizeEmail(request.email());

        if (!doctor.getEmail().equals(normalizedEmail) && appUserRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exista deja un cont cu acest email.");
        }

        doctor.setFirstName(normalizeRequiredText(request.firstName()));
        doctor.setLastName(normalizeRequiredText(request.lastName()));
        doctor.setEmail(normalizedEmail);

        profile.setSpecialization(normalizeOptionalText(request.specialization()));
        profile.setClinicName(normalizeOptionalText(request.clinicName()));
        profile.setPhoneNumber(normalizeOptionalText(request.phoneNumber()));

        AppUser savedDoctor = appUserRepository.save(doctor);
        DoctorProfile savedProfile = doctorProfileRepository.save(profile);
        String token = jwtService.generateToken(savedDoctor);

        return new AuthResponse(token, mapDoctor(savedDoctor, savedProfile));
    }

    private AppUser getAuthenticatedDoctor(String email) {
        AppUser doctor = appUserRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Doctorul autentificat nu a fost gasit."));

        validateDoctorAccount(doctor);

        return doctor;
    }

    private void validateDoctorAccount(AppUser doctor) {
        if (!doctor.isActive() || doctor.getRole() != UserRole.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doar doctorii pot accesa aplicatia.");
        }
    }

    private DoctorProfile getOrCreateDoctorProfile(AppUser doctor) {
        return doctorProfileRepository.findByUser(doctor)
                .orElseGet(() -> doctorProfileRepository.save(
                        DoctorProfile.builder()
                                .user(doctor)
                                .build()
                ));
    }

    private DoctorResponse mapDoctor(AppUser doctor, DoctorProfile profile) {
        return new DoctorResponse(
                doctor.getId(),
                doctor.getEmail(),
                doctor.getFirstName(),
                doctor.getLastName(),
                doctor.getFirstName() + " " + doctor.getLastName(),
                doctor.getRole().name(),
                doctor.isActive(),
                doctor.getCreatedAt(),
                profile.getId(),
                profile.getSpecialization(),
                profile.getClinicName(),
                profile.getPhoneNumber()
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String normalizeRequiredText(String value) {
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }

        String normalizedValue = value.trim().replaceAll("\\s+", " ");

        return normalizedValue.isBlank() ? null : normalizedValue;
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
