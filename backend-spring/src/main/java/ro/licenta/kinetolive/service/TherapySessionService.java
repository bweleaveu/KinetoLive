// Service pentru logica sesiunilor de recuperare
package ro.licenta.kinetolive.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ro.licenta.kinetolive.dto.*;
import ro.licenta.kinetolive.entity.*;
import ro.licenta.kinetolive.entity.enums.SessionStatus;
import ro.licenta.kinetolive.entity.enums.UserRole;
import ro.licenta.kinetolive.repository.*;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TherapySessionService {

    private final TherapySessionRepository therapySessionRepository;
    private final RepetitionResultRepository repetitionResultRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final ExerciseRepository exerciseRepository;
    private final AppUserRepository appUserRepository;
    private final DoctorProfileRepository doctorProfileRepository;

    @Transactional
    public TherapySessionResponseDto startSession(String doctorEmail, StartTherapySessionRequest request) {
        PatientProfile patient = getOwnedPatient(doctorEmail, request.patientId());

        Exercise intendedExercise = exerciseRepository.findByExerciseCodeAndActiveTrue(request.intendedExerciseCode())
                .orElseThrow(() -> new RuntimeException("Exercise not found: " + request.intendedExerciseCode()));

        TherapySession therapySession = TherapySession.builder()
                .patient(patient)
                .intendedExercise(intendedExercise)
                .status(SessionStatus.STARTED)
                .startedAt(LocalDateTime.now())
                .build();

        TherapySession savedSession = therapySessionRepository.save(therapySession);

        return mapSessionToDto(savedSession);
    }

    @Transactional
    public TherapySessionResponseDto completeSession(Long sessionId, CompleteTherapySessionRequest request) {
        TherapySession therapySession = therapySessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Therapy session not found: " + sessionId));

        Exercise detectedExercise = null;

        if (request.detectedExerciseCode() != null) {
            detectedExercise = exerciseRepository.findByExerciseCode(request.detectedExerciseCode())
                    .orElse(null);
        }

        therapySession.setDetectedExercise(detectedExercise);
        therapySession.setStatus(SessionStatus.COMPLETED);
        therapySession.setEndedAt(LocalDateTime.now());
        therapySession.setSampleCount(request.sampleCount());
        therapySession.setDurationSeconds(request.durationSeconds());
        therapySession.setRepetitionCount(request.repetitionCount());
        therapySession.setExerciseConfidence(request.exerciseConfidence());
        therapySession.setQualityCode(request.qualityCode());
        therapySession.setQualityName(request.qualityName());
        therapySession.setQualityConfidence(request.qualityConfidence());
        therapySession.setNotes(request.notes());

        // Sterge repetarile vechi ale sesiunii pentru a evita dublarea rezultatelor
        TherapySession savedSession = therapySessionRepository.save(therapySession);

        List<RepetitionResult> existingRepetitions = repetitionResultRepository
                .findAllByTherapySessionOrderByRepetitionIndexAsc(savedSession);

        repetitionResultRepository.deleteAll(existingRepetitions);

        if (request.repetitions() != null) {
            for (RepetitionResultRequest repetitionRequest : request.repetitions()) {
                RepetitionResult repetitionResult = RepetitionResult.builder()
                        .therapySession(savedSession)
                        .repetitionIndex(repetitionRequest.repetitionIndex())
                        .durationSeconds(repetitionRequest.durationSeconds())
                        .predictedExerciseCode(repetitionRequest.predictedExerciseCode())
                        .exerciseConfidence(repetitionRequest.exerciseConfidence())
                        .predictedQualityCode(repetitionRequest.predictedQualityCode())
                        .predictedQualityName(repetitionRequest.predictedQualityName())
                        .qualityConfidence(repetitionRequest.qualityConfidence())
                        .sampleCount(repetitionRequest.sampleCount())
                        .startSample(repetitionRequest.startSample())
                        .endSample(repetitionRequest.endSample())
                        .build();

                repetitionResultRepository.save(repetitionResult);
            }
        }

        return mapSessionToDto(savedSession);
    }

    public TherapySessionResponseDto getSessionById(String doctorEmail, Long sessionId) {
        TherapySession therapySession = getOwnedSession(doctorEmail, sessionId);

        return mapSessionToDto(therapySession);
    }

    public List<TherapySessionResponseDto> getSessionsByPatient(String doctorEmail, Long patientId) {
        PatientProfile patient = getOwnedPatient(doctorEmail, patientId);

        return therapySessionRepository.findAllByPatientOrderByStartedAtDesc(patient)
                .stream()
                .map(this::mapSessionToDto)
                .toList();
    }

    public List<RepetitionResultResponseDto> getRepetitionsBySession(String doctorEmail, Long sessionId) {
        TherapySession therapySession = getOwnedSession(doctorEmail, sessionId);

        return repetitionResultRepository.findAllByTherapySessionOrderByRepetitionIndexAsc(therapySession)
                .stream()
                .map(this::mapRepetitionToDto)
                .toList();
    }

    private PatientProfile getOwnedPatient(String doctorEmail, Long patientId) {
        DoctorProfile doctorProfile = getOrCreateDoctorProfile(doctorEmail);

        PatientProfile patient = patientProfileRepository.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found: " + patientId));

        if (patient.getAssignedDoctor() == null || !patient.getAssignedDoctor().getId().equals(doctorProfile.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu ai acces la acest pacient.");
        }

        return patient;
    }

    private TherapySession getOwnedSession(String doctorEmail, Long sessionId) {
        DoctorProfile doctorProfile = getOrCreateDoctorProfile(doctorEmail);

        TherapySession therapySession = therapySessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Therapy session not found: " + sessionId));

        PatientProfile patient = therapySession.getPatient();

        if (patient.getAssignedDoctor() == null || !patient.getAssignedDoctor().getId().equals(doctorProfile.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu ai acces la aceasta sesiune.");
        }

        return therapySession;
    }

    private DoctorProfile getOrCreateDoctorProfile(String doctorEmail) {
        AppUser doctorUser = appUserRepository.findByEmail(doctorEmail.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Doctorul autentificat nu a fost gasit."));

        if (!doctorUser.isActive() || doctorUser.getRole() != UserRole.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doar doctorii pot accesa sesiunile.");
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

    private TherapySessionResponseDto mapSessionToDto(TherapySession therapySession) {
        PatientProfile patient = therapySession.getPatient();

        String patientName = (
                patient.getFirstName() + " " + patient.getLastName()
        ).trim();

        Exercise intendedExercise = therapySession.getIntendedExercise();
        Exercise detectedExercise = therapySession.getDetectedExercise();

        return new TherapySessionResponseDto(
                therapySession.getId(),
                patient.getId(),
                patientName,
                intendedExercise.getExerciseCode(),
                intendedExercise.getNameEn(),
                detectedExercise != null ? detectedExercise.getExerciseCode() : null,
                detectedExercise != null ? detectedExercise.getNameEn() : null,
                therapySession.getStatus().name(),
                therapySession.getStartedAt(),
                therapySession.getEndedAt(),
                therapySession.getSampleCount(),
                therapySession.getDurationSeconds(),
                therapySession.getRepetitionCount(),
                therapySession.getExerciseConfidence(),
                therapySession.getQualityCode(),
                therapySession.getQualityName(),
                therapySession.getQualityConfidence(),
                therapySession.getNotes()
        );
    }

    private RepetitionResultResponseDto mapRepetitionToDto(RepetitionResult repetitionResult) {
        return new RepetitionResultResponseDto(
                repetitionResult.getId(),
                repetitionResult.getRepetitionIndex(),
                repetitionResult.getDurationSeconds(),
                repetitionResult.getPredictedExerciseCode(),
                repetitionResult.getExerciseConfidence(),
                repetitionResult.getPredictedQualityCode(),
                repetitionResult.getPredictedQualityName(),
                repetitionResult.getQualityConfidence(),
                repetitionResult.getSampleCount(),
                repetitionResult.getStartSample(),
                repetitionResult.getEndSample()
        );
    }
}
