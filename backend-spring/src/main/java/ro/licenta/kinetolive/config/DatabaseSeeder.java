// Clasa pentru initializarea datelor de baza in KinetoLive
package ro.licenta.kinetolive.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import ro.licenta.kinetolive.entity.AppUser;
import ro.licenta.kinetolive.entity.DoctorProfile;
import ro.licenta.kinetolive.entity.Exercise;
import ro.licenta.kinetolive.entity.PatientProfile;
import ro.licenta.kinetolive.entity.enums.UserRole;
import ro.licenta.kinetolive.repository.AppUserRepository;
import ro.licenta.kinetolive.repository.DoctorProfileRepository;
import ro.licenta.kinetolive.repository.ExerciseRepository;
import ro.licenta.kinetolive.repository.PatientProfileRepository;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final ExerciseRepository exerciseRepository;
    private final AppUserRepository appUserRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedExercises();
        seedTestUsers();
    }

    // Initializeaza exercitiile cu texte in romana si engleza
    private void seedExercises() {
        addOrUpdateExercise(
                0,
                "Detectie automata",
                "Automatic detection",
                "Aplicatia detecteaza automat exercitiul executat si foloseste modelul de calitate potrivit.",
                "The application automatically detects the performed exercise and uses the proper quality model."
        );

        addOrUpdateExercise(
                6,
                "Exercitiul 6",
                "Exercise 6",
                "Stati asezat pe un scaun si tineti o greutate de 1 kg in mana dreapta. Intindeti bratul drept in fata corpului, putin deasupra genunchiului drept, cu palma orientata in sus. Indoiti cotul si ridicati greutatea pana cand antebratul ajunge perpendicular pe coapsa. Mentineti pozitia timp de 5 secunde, apoi reveniti la pozitia initiala.",
                "Sitting on a chair, holding a 1 kg weight in the right hand, extend the right arm in front of the body to just above the right knee with the palm facing upwards. Bending the elbow joint, raise the weight until the forearm is perpendicular with the thigh, hold for 5 s, and return to the initial position."
        );

        addOrUpdateExercise(
                7,
                "Exercitiul 7",
                "Exercise 7",
                "Stati in picioare, cu bratul drept intins pe langa corp si cu o greutate de 1 kg in mana dreapta. Ridicati bratul lateral, din umar, pana ajunge in pozitie orizontala, mentinand cotul drept. Mentineti pozitia timp de 5 secunde, apoi reveniti la pozitia initiala.",
                "Standing upright with the right arm holding a 1 kg weight and hanging straight down, raise the weight to the right side from the shoulder joint to a horizontal position while keeping the elbow joint straight, hold for 5 s, then return to the initial position."
        );

        addOrUpdateExercise(
                8,
                "Exercitiul 8",
                "Exercise 8",
                "Stati culcat cu fata in jos pe o suprafata plana ridicata, cu bratul drept lasat peste margine si indoit la nivelul cotului. Ridicati antebratul drept pana cand cotul se indreapta. Mentineti pozitia timp de 5 secunde, apoi reveniti la pozitia initiala.",
                "Lying facedown on a raised flat surface, hang the right arm over the side at the elbow. Raise the right forearm to straighten the elbow, hold for 5 s, then return to the initial position."
        );
    }

    // Adauga sau actualizeaza un exercitiu cu texte bilingve
    private void addOrUpdateExercise(
            Integer exerciseCode,
            String nameRo,
            String nameEn,
            String descriptionRo,
            String descriptionEn
    ) {
        Exercise exercise = exerciseRepository.findByExerciseCode(exerciseCode)
                .orElse(
                        Exercise.builder()
                                .exerciseCode(exerciseCode)
                                .active(true)
                                .build()
                );

        exercise.setNameRo(nameRo);
        exercise.setNameEn(nameEn);
        exercise.setDescriptionRo(descriptionRo);
        exercise.setDescriptionEn(descriptionEn);
        exercise.setActive(true);

        exerciseRepository.save(exercise);
    }

    // Creeaza datele initiale pentru doctorul de test si pacientul de test
    private void seedTestUsers() {
        AppUser doctorUser = appUserRepository.findByEmail("doctor@kinetolive.test")
                .orElseGet(() -> appUserRepository.save(
                        AppUser.builder()
                                .firstName("Test")
                                .lastName("Doctor")
                                .email("doctor@kinetolive.test")
                                .passwordHash(passwordEncoder.encode("doctor123"))
                                .role(UserRole.DOCTOR)
                                .active(true)
                                .build()
                ));

        if (doctorUser.getPasswordHash() == null || !doctorUser.getPasswordHash().startsWith("$2")) {
            doctorUser.setPasswordHash(passwordEncoder.encode("doctor123"));
            doctorUser.setRole(UserRole.DOCTOR);
            doctorUser.setActive(true);
            doctorUser = appUserRepository.save(doctorUser);
        }

        final AppUser finalDoctorUser = doctorUser;

        DoctorProfile doctorProfile = doctorProfileRepository.findByUser(finalDoctorUser)
                .orElseGet(() -> doctorProfileRepository.save(
                        DoctorProfile.builder()
                                .user(finalDoctorUser)
                                .specialization("Physical Therapy")
                                .clinicName("KinetoLive Test Clinic")
                                .phoneNumber("0700000000")
                                .build()
                ));

        // Creeaza pacientul medical de test fara cont de autentificare
        patientProfileRepository.findById(1L)
                .orElseGet(() -> patientProfileRepository.save(
                        PatientProfile.builder()
                                .firstName("Test")
                                .lastName("Patient")
                                .assignedDoctor(doctorProfile)
                                .dateOfBirth(LocalDate.of(2000, 1, 1))
                                .phoneNumber("0711111111")
                                .medicalNotes("Test patient used for KinetoLive backend development.")
                                .build()
                ));
    }

}