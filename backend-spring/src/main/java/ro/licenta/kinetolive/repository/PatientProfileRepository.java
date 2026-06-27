// Repository pentru profilurile medicale ale pacientilor
package ro.licenta.kinetolive.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ro.licenta.kinetolive.entity.DoctorProfile;
import ro.licenta.kinetolive.entity.PatientProfile;

import java.util.List;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {

    List<PatientProfile> findAllByAssignedDoctorOrderByLastNameAscFirstNameAsc(DoctorProfile assignedDoctor);
}
