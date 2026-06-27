# Service pentru incarcarea modelelor si rularea predictiilor ML
import joblib
import numpy as np

from app.config import MODELS_ROOT, FS, EXERCISE_NAMES, QUALITY_NAMES
from app.feature_extraction import extract_segment_features, FEATURE_NAMES
from app.segmentation import segment_repetitions
from app.schemas import MlAnalysisPayloadDto, MlAnalysisResponseDto, RepetitionPredictionDto

# Praguri pentru detectarea unei sesiuni fara miscare reala
MIN_GYR_P95_FOR_VALID_MOVEMENT = 0.35
MIN_GYR_MAX_FOR_VALID_MOVEMENT = 0.80
MIN_ACC_AXIS_RANGE_FOR_VALID_MOVEMENT = 0.45
MIN_ACTIVE_GYR_RATIO_FOR_VALID_MOVEMENT = 0.05
MIN_ACTIVE_ACC_RATIO_FOR_VALID_MOVEMENT = 0.05


def calculate_motion_metrics(signal_data):
    # Calculeaza indicatori pentru a separa miscarea reala de zgomotul senzorului
    signal_data = np.asarray(signal_data, dtype=float)

    acc = signal_data[:, 0:3]
    gyr = signal_data[:, 3:6]

    acc_centered = acc - np.median(acc, axis=0)
    gyr_magnitude = np.linalg.norm(gyr, axis=1)
    acc_dynamic_magnitude = np.linalg.norm(acc_centered, axis=1)

    acc_axis_ranges = np.percentile(acc, 95, axis=0) - np.percentile(acc, 5, axis=0)

    return {
        "gyr_p95": float(np.percentile(gyr_magnitude, 95)),
        "gyr_max": float(np.max(gyr_magnitude)),
        "acc_axis_range_max": float(np.max(acc_axis_ranges)),
        "acc_dynamic_p95": float(np.percentile(acc_dynamic_magnitude, 95)),
        "active_gyr_ratio": float(
            np.mean(gyr_magnitude >= MIN_GYR_P95_FOR_VALID_MOVEMENT)
        ),
        "active_acc_ratio": float(
            np.mean(acc_dynamic_magnitude >= MIN_ACC_AXIS_RANGE_FOR_VALID_MOVEMENT)
        ),
    }


def has_enough_real_movement(signal_data):
    # Decide daca exista miscare reala, nu doar zgomot cand senzorul sta pe masa
    metrics = calculate_motion_metrics(signal_data)

    has_gyro_movement = (
        metrics["gyr_p95"] >= MIN_GYR_P95_FOR_VALID_MOVEMENT
        or metrics["gyr_max"] >= MIN_GYR_MAX_FOR_VALID_MOVEMENT
        or metrics["active_gyr_ratio"] >= MIN_ACTIVE_GYR_RATIO_FOR_VALID_MOVEMENT
    )

    has_acc_movement = (
        metrics["acc_axis_range_max"] >= MIN_ACC_AXIS_RANGE_FOR_VALID_MOVEMENT
        or metrics["active_acc_ratio"] >= MIN_ACTIVE_ACC_RATIO_FOR_VALID_MOVEMENT
    )

    return has_gyro_movement and has_acc_movement, metrics


class PredictionService:
    # Service principal pentru predictia exercitiului si a calitatii executiei

    def __init__(self):
        self.model_exercise = None
        self.quality_models = {}
        self.models_loaded = False
        self.missing_files = []
        self.loading_error = None

        self.load_models()

    def load_models(self):
        # Incarca modelele joblib din folderul models
        exercise_model_path = (
            MODELS_ROOT
            / "identificare_exercitii"
            / "model_identificare_exercitii.joblib"
        )

        quality_model_paths = {
            6: MODELS_ROOT / "calitate_e6" / "model_calitate_e6.joblib",
            7: MODELS_ROOT / "calitate_e7" / "model_calitate_e7.joblib",
            8: MODELS_ROOT / "calitate_e8" / "model_calitate_e8.joblib",
        }

        missing_files = []

        if not exercise_model_path.exists():
            missing_files.append(str(exercise_model_path))

        for model_path in quality_model_paths.values():
            if not model_path.exists():
                missing_files.append(str(model_path))

        if missing_files:
            self.models_loaded = False
            self.missing_files = missing_files
            self.loading_error = "One or more .joblib model files are missing."
            return

        try:
            self.model_exercise = joblib.load(exercise_model_path)

            self.quality_models = {
                exercise_code: joblib.load(model_path)
                for exercise_code, model_path in quality_model_paths.items()
            }

            self.validate_model_feature_count()

            self.models_loaded = True
            self.missing_files = []
            self.loading_error = None

        except Exception as exception:
            self.models_loaded = False
            self.loading_error = str(exception)

    def validate_model_feature_count(self):
        # Verifica daca modelele asteapta acelasi numar de trasaturi
        models_to_check = [
            self.model_exercise,
            self.quality_models[6],
            self.quality_models[7],
            self.quality_models[8],
        ]

        for model in models_to_check:
            if hasattr(model, "n_features_in_"):
                if model.n_features_in_ != len(FEATURE_NAMES):
                    raise ValueError(
                        f"One model expects {model.n_features_in_} features, "
                        f"but the service generates {len(FEATURE_NAMES)} features."
                    )

    def get_status(self):
        # Returneaza statusul modelelor incarcate
        return {
            "modelsLoaded": self.models_loaded,
            "modelsRoot": str(MODELS_ROOT),
            "missingFiles": self.missing_files,
            "loadingError": self.loading_error,
            "featureCount": len(FEATURE_NAMES),
        }

    def analyze_session(self, payload: MlAnalysisPayloadDto) -> MlAnalysisResponseDto:
        # Analizeaza o sesiune live primita din backend
        if not payload.samples:
            return MlAnalysisResponseDto(
                sessionId=payload.sessionId,
                sampleCount=0,
                durationSeconds=0,
                repetitionCount=0,
                detectedExerciseCode=None,
                detectedExerciseName=None,
                exerciseConfidence=None,
                qualityCode=None,
                qualityName=None,
                qualityConfidence=None,
                readyForAnalysis=False,
                message="There are no samples for analysis.",
                repetitions=[],
            )

        signal_data = self.convert_payload_to_signal_matrix(payload)

        if len(signal_data) < FS:
            return MlAnalysisResponseDto(
                sessionId=payload.sessionId,
                sampleCount=len(signal_data),
                durationSeconds=len(signal_data) / FS,
                repetitionCount=0,
                detectedExerciseCode=None,
                detectedExerciseName=None,
                exerciseConfidence=None,
                qualityCode=None,
                qualityName=None,
                qualityConfidence=None,
                readyForAnalysis=False,
                message="There are not enough samples for ML analysis.",
                repetitions=[],
            )

        has_real_movement, motion_metrics = has_enough_real_movement(signal_data)
        print("MOTION_METRICS:", motion_metrics)

        if not has_real_movement:
            return MlAnalysisResponseDto(
                sessionId=payload.sessionId,
                sampleCount=len(signal_data),
                durationSeconds=len(signal_data) / FS,
                repetitionCount=0,
                detectedExerciseCode=None,
                detectedExerciseName=None,
                exerciseConfidence=None,
                qualityCode=None,
                qualityName=None,
                qualityConfidence=None,
                readyForAnalysis=False,
                message=(
                    "Nu a fost detectata miscare suficienta pentru analiza. "
                    "Senzorul pare sa fie in repaus."
                ),
                repetitions=[],
            )

        segments, segment_info, detection_info = segment_repetitions(signal_data)

        if not segments:
            return MlAnalysisResponseDto(
                sessionId=payload.sessionId,
                sampleCount=len(signal_data),
                durationSeconds=len(signal_data) / FS,
                repetitionCount=0,
                detectedExerciseCode=None,
                detectedExerciseName=None,
                exerciseConfidence=None,
                qualityCode=None,
                qualityName=None,
                qualityConfidence=None,
                readyForAnalysis=False,
                message="No complete repetition was detected.",
                repetitions=[],
            )

        repetition_predictions = []

        exercise_probabilities_sum = {
            6: 0.0,
            7: 0.0,
            8: 0.0,
        }

        quality_probabilities_sum = {
            1: 0.0,
            2: 0.0,
            3: 0.0,
        }

        for index, segment in enumerate(segments):
            features = extract_segment_features(segment, FS)
            x_segment = features.reshape(1, -1)

            exercise_classes, exercise_probabilities = self.get_model_probabilities(
                self.model_exercise,
                x_segment,
            )

            predicted_exercise_code = int(
                exercise_classes[np.argmax(exercise_probabilities)]
            )
            exercise_confidence = float(np.max(exercise_probabilities) * 100)

            self.add_probabilities(
                exercise_probabilities_sum,
                exercise_classes,
                exercise_probabilities,
            )

            if predicted_exercise_code not in self.quality_models:
                continue

            quality_model = self.quality_models[predicted_exercise_code]

            quality_classes, quality_probabilities = self.get_model_probabilities(
                quality_model,
                x_segment,
            )

            predicted_quality_code = int(
                quality_classes[np.argmax(quality_probabilities)]
            )
            quality_confidence = float(np.max(quality_probabilities) * 100)

            self.add_probabilities(
                quality_probabilities_sum,
                quality_classes,
                quality_probabilities,
            )

            current_segment_info = segment_info[index]

            repetition_predictions.append(
                RepetitionPredictionDto(
                    repetitionIndex=current_segment_info["repetitionIndex"],
                    durationSeconds=current_segment_info["durationSeconds"],
                    predictedExerciseCode=predicted_exercise_code,
                    predictedExerciseName=EXERCISE_NAMES.get(
                        predicted_exercise_code,
                        str(predicted_exercise_code),
                    ),
                    exerciseConfidence=exercise_confidence,
                    predictedQualityCode=predicted_quality_code,
                    predictedQualityName=QUALITY_NAMES.get(
                        predicted_quality_code,
                        str(predicted_quality_code),
                    ),
                    qualityConfidence=quality_confidence,
                    sampleCount=current_segment_info["sampleCount"],
                    startSample=current_segment_info["startSample"],
                    endSample=current_segment_info["endSample"],
                )
            )

        if not repetition_predictions:
            return MlAnalysisResponseDto(
                sessionId=payload.sessionId,
                sampleCount=len(signal_data),
                durationSeconds=len(signal_data) / FS,
                repetitionCount=0,
                detectedExerciseCode=None,
                detectedExerciseName=None,
                exerciseConfidence=None,
                qualityCode=None,
                qualityName=None,
                qualityConfidence=None,
                readyForAnalysis=False,
                message="Repetitions were detected, but they could not be classified.",
                repetitions=[],
            )

        repetition_count = len(repetition_predictions)

        for exercise_code in exercise_probabilities_sum:
            exercise_probabilities_sum[exercise_code] /= repetition_count

        for quality_code in quality_probabilities_sum:
            quality_probabilities_sum[quality_code] /= repetition_count

        detected_exercise_code = max(
            exercise_probabilities_sum,
            key=exercise_probabilities_sum.get,
        )

        detected_quality_code = max(
            quality_probabilities_sum,
            key=quality_probabilities_sum.get,
        )

        return MlAnalysisResponseDto(
            sessionId=payload.sessionId,
            sampleCount=len(signal_data),
            durationSeconds=len(signal_data) / FS,
            repetitionCount=repetition_count,
            detectedExerciseCode=detected_exercise_code,
            detectedExerciseName=EXERCISE_NAMES.get(
                detected_exercise_code,
                str(detected_exercise_code),
            ),
            exerciseConfidence=float(
                exercise_probabilities_sum[detected_exercise_code] * 100
            ),
            qualityCode=detected_quality_code,
            qualityName=QUALITY_NAMES.get(
                detected_quality_code,
                str(detected_quality_code),
            ),
            qualityConfidence=float(quality_probabilities_sum[detected_quality_code] * 100),
            readyForAnalysis=True,
            message="ML analysis was completed successfully.",
            repetitions=repetition_predictions,
        )

    def convert_payload_to_signal_matrix(self, payload: MlAnalysisPayloadDto):
        # Converteste payload-ul Spring Boot intr-o matrice Nx6 pentru ML
        rows = []

        for sample in payload.samples:
            rows.append([
                sample.accX,
                sample.accY,
                sample.accZ,
                sample.gyrX,
                sample.gyrY,
                sample.gyrZ,
            ])

        return np.asarray(rows, dtype=float)

    def get_model_probabilities(self, model, x):
        # Obtine probabilitatile de la un model sklearn
        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(x)[0]

            return (
                np.asarray(model.classes_, dtype=int),
                np.asarray(probabilities, dtype=float),
            )

        predicted_class = int(model.predict(x)[0])

        classes = np.asarray(model.classes_, dtype=int)
        probabilities = np.zeros(len(classes), dtype=float)

        class_index = np.where(classes == predicted_class)[0]

        if len(class_index) > 0:
            probabilities[class_index[0]] = 1.0

        return classes, probabilities

    def add_probabilities(self, aggregate, classes, probabilities):
        # Adauga probabilitatile unei repetari in agregarea finala
        for class_value, probability in zip(classes, probabilities):
            class_value = int(class_value)

            if class_value in aggregate:
                aggregate[class_value] += float(probability)


prediction_service = PredictionService()
