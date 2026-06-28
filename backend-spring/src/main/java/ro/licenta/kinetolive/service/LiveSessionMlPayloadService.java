// Service pentru pregatirea datelor live in format compatibil cu modelul ML
package ro.licenta.kinetolive.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.dto.MlAnalysisPayloadDto;
import ro.licenta.kinetolive.dto.MlSignalSampleDto;
import ro.licenta.kinetolive.dto.SensorSampleMessage;
import ro.licenta.kinetolive.entity.TherapySession;
import ro.licenta.kinetolive.repository.TherapySessionRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LiveSessionMlPayloadService {

    private static final int SAMPLING_FREQUENCY_HZ = 25;
    private static final int MINIMUM_SAMPLE_COUNT = 25;

    private static final List<String> FEATURE_COLUMNS = List.of(
            "acc_x",
            "acc_y",
            "acc_z",
            "gyr_x",
            "gyr_y",
            "gyr_z"
    );

    private final LiveSessionBufferService liveSessionBufferService;
    private final TherapySessionRepository therapySessionRepository;

    public MlAnalysisPayloadDto buildMlPayload(Long sessionId) {
        List<SensorSampleMessage> bufferedSamples = liveSessionBufferService.getSamples(sessionId);

        List<MlSignalSampleDto> mlSamples = bufferedSamples
                .stream()
                .map(this::mapToMlSignalSample)
                .toList();

        int sampleCount = mlSamples.size();

        double durationSeconds = sampleCount / (double) SAMPLING_FREQUENCY_HZ;

        boolean readyForAnalysis = sampleCount >= MINIMUM_SAMPLE_COUNT;

        String message = readyForAnalysis
                ? "Session data is ready for ML analysis."
                : "Not enough samples for ML analysis. At least 25 samples are recommended.";

        Integer selectedExerciseCode = resolveSelectedExerciseCode(sessionId);

        return new MlAnalysisPayloadDto(
                sessionId,
                SAMPLING_FREQUENCY_HZ,
                sampleCount,
                durationSeconds,
                readyForAnalysis,
                message,
                selectedExerciseCode,
                FEATURE_COLUMNS,
                mlSamples
        );
    }

    private Integer resolveSelectedExerciseCode(Long sessionId) {
        // Citeste exercitiul selectat la pornirea sesiunii
        return therapySessionRepository.findById(sessionId)
                .map(TherapySession::getIntendedExercise)
                .map(exercise -> exercise != null ? exercise.getExerciseCode() : null)
                .orElse(null);
    }

    private MlSignalSampleDto mapToMlSignalSample(SensorSampleMessage sample) {
        return new MlSignalSampleDto(
                sample.sampleIndex(),
                sample.accX(),
                sample.accY(),
                sample.accZ(),
                sample.gyrX(),
                sample.gyrY(),
                sample.gyrZ()
        );
    }
}