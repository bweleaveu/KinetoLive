// Repository pentru exercitiile de recuperare
package ro.licenta.kinetolive.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ro.licenta.kinetolive.entity.Exercise;

import java.util.List;
import java.util.Optional;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

    Optional<Exercise> findByExerciseCode(Integer exerciseCode);

    Optional<Exercise> findByExerciseCodeAndActiveTrue(Integer exerciseCode);

    boolean existsByExerciseCode(Integer exerciseCode);

    List<Exercise> findAllByActiveTrueOrderByExerciseCodeAsc();
}