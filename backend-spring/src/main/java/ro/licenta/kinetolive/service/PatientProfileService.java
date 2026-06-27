// Service pentru administrarea pacientilor doctorului autentificat
package ro.licenta.kinetolive.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ro.licenta.kinetolive.dto.PatientProfileRequest;
import ro.licenta.kinetolive.dto.PatientProfileResponseDto;
import ro.licenta.kinetolive.entity.AppUser;
import ro.licenta.kinetolive.entity.DoctorProfile;
import ro.licenta.kinetolive.entity.PatientProfile;
import ro.licenta.kinetolive.entity.TherapySession;
import ro.licenta.kinetolive.entity.enums.UserRole;
import ro.licenta.kinetolive.repository.AppUserRepository;
import ro.licenta.kinetolive.repository.DoctorProfileRepository;
import ro.licenta.kinetolive.repository.PatientProfileRepository;
import ro.licenta.kinetolive.repository.RepetitionResultRepository;
import ro.licenta.kinetolive.repository.TherapySessionRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientProfileService {

    private final PatientProfileRepository patientProfileRepository;
    private final TherapySessionRepository therapySessionRepository;
    private final RepetitionResultRepository repetitionResultRepository;
    private final AppUserRepository appUserRepository;
    private final DoctorProfileRepository doctorProfileRepository;

    public List<PatientProfileResponseDto> getPatientsForDoctor(String doctorEmail) {
        DoctorProfile doctorProfile = getOrCreateDoctorProfile(doctorEmail);

        return patientProfileRepository
                .findAllByAssignedDoctorOrderByLastNameAscFirstNameAsc(doctorProfile)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    public PatientProfileResponseDto getPatientForDoctor(String doctorEmail, Long patientId) {
        DoctorProfile doctorProfile = getOrCreateDoctorProfile(doctorEmail);
        PatientProfile patient = getOwnedPatient(patientId, doctorProfile);

        return mapToDto(patient);
    }

    @Transactional
    public PatientProfileResponseDto createPatient(String doctorEmail, PatientProfileRequest request) {
        DoctorProfile doctorProfile = getOrCreateDoctorProfile(doctorEmail);

        PatientProfile patient = PatientProfile.builder()
                .firstName(cleanRequired(request.firstName()))
                .lastName(cleanRequired(request.lastName()))
                .assignedDoctor(doctorProfile)
                .dateOfBirth(request.dateOfBirth())
                .phoneNumber(cleanOptional(request.phoneNumber()))
                .medicalNotes(cleanOptional(request.medicalNotes()))
                .build();

        return mapToDto(patientProfileRepository.save(patient));
    }

    @Transactional
    public PatientProfileResponseDto updatePatient(String doctorEmail, Long patientId, PatientProfileRequest request) {
        DoctorProfile doctorProfile = getOrCreateDoctorProfile(doctorEmail);
        PatientProfile patient = getOwnedPatient(patientId, doctorProfile);

        patient.setFirstName(cleanRequired(request.firstName()));
        patient.setLastName(cleanRequired(request.lastName()));
        patient.setDateOfBirth(request.dateOfBirth());
        patient.setPhoneNumber(cleanOptional(request.phoneNumber()));
        patient.setMedicalNotes(cleanOptional(request.medicalNotes()));

        return mapToDto(patientProfileRepository.save(patient));
    }

    @Transactional
    public void deletePatient(String doctorEmail, Long patientId) {
        DoctorProfile doctorProfile = getOrCreateDoctorProfile(doctorEmail);
        PatientProfile patient = getOwnedPatient(patientId, doctorProfile);

        // Sterge intai rezultatele pe repetari, apoi sesiunile, apoi pacientul.
        // Asa evitam erori de foreign key in PostgreSQL.
        List<TherapySession> sessions = therapySessionRepository.findAllByPatient(patient);

        for (TherapySession session : sessions) {
            repetitionResultRepository.deleteAll(
                    repetitionResultRepository.findAllByTherapySessionOrderByRepetitionIndexAsc(session)
            );
        }

        therapySessionRepository.deleteAll(sessions);
        patientProfileRepository.delete(patient);
    }

    private PatientProfile getOwnedPatient(Long patientId, DoctorProfile doctorProfile) {
        PatientProfile patient = patientProfileRepository.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pacientul nu a fost gasit."));

        if (patient.getAssignedDoctor() == null || !patient.getAssignedDoctor().getId().equals(doctorProfile.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu ai acces la acest pacient.");
        }

        return patient;
    }

    private DoctorProfile getOrCreateDoctorProfile(String doctorEmail) {
        AppUser doctorUser = appUserRepository.findByEmail(doctorEmail.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Doctorul autentificat nu a fost gasit."));

        if (!doctorUser.isActive() || doctorUser.getRole() != UserRole.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doar doctorii pot administra pacienti.");
        }

        return doctorProfileRepository.findByUser(doctorUser)
                .orElseGet(() -> doctorProfileRepository.save(
                        DoctorProfile.builder()
                                .user(doctorUser)
                                .specialization("Physical Therapy")
                                .clinicName("KinetoLive")
                                .build()
                ));
    }

    private PatientProfileResponseDto mapToDto(PatientProfile patient) {
        Long doctorId = patient.getAssignedDoctor() != null
                ? patient.getAssignedDoctor().getId()
                : null;

        String fullName = (patient.getFirstName() + " " + patient.getLastName()).trim();

        return new PatientProfileResponseDto(
                patient.getId(),
                patient.getFirstName(),
                patient.getLastName(),
                fullName,
                doctorId,
                patient.getDateOfBirth(),
                patient.getPhoneNumber(),
                patient.getMedicalNotes()
        );
    }

    private String cleanRequired(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private String cleanOptional(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }
}
