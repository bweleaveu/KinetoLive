# Service pentru incarcarea modelelor si rularea predictiilor ML
import joblib
import numpy as np

from app.config import MODELS_ROOT, FS, EXERCISE_NAMES, QUALITY_NAMES
from app.feature_extraction import extract_segment_features, FEATURE_NAMES
from app.segmentation import VALID_EXERCISE_CODES, segment_repetitions
from app.schemas import MlAnalysisPayloadDto, MlAnalysisResponseDto, RepetitionPredictionDto

# Praguri pentru detectarea unei sesiuni fara miscare reala
MIN_GYR_P95_FOR_VALID_MOVEMENT = 0.35
MIN_GYR_MAX_FOR_VALID_MOVEMENT = 0.80
MIN_ACC_AXIS_RANGE_FOR_VALID_MOVEMENT = 0.45
MIN_ACTIVE_GYR_RATIO_FOR_VALID_MOVEMENT = 0.05
MIN_ACTIVE_ACC_RATIO_FOR_VALID_MOVEMENT = 0.05

AUTO_EXERCISE_CODE = 0
CLASSIFICATION_CONTEXT_REPETITIONS = 1


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


def normalize_selected_exercise_code(value):
    # Normalizeaza exercitiul selectat in frontend
    try:
        selected_exercise_code = int(value)
    except (TypeError, ValueError):
        return AUTO_EXERCISE_CODE

    if selected_exercise_code in VALID_EXERCISE_CODES:
        return selected_exercise_code

    return AUTO_EXERCISE_CODE


def safe_mean_probability(probability_sum, count):
    # Calculeaza media probabilitatilor agregate
    if count <= 0:
        return probability_sum

    return {
        class_code: probability / count
        for class_code, probability in probability_sum.items()
    }


def get_signal_energy(segment):
    # Calculeaza energia accelerometrului si a giroscopului pentru debug
    segment = np.asarray(segment, dtype=float)

    if len(segment) == 0:
        return 0.0, 0.0, 0.0

    acc = segment[:, 0:3]
    gyr = segment[:, 3:6]

    acc_energy = float(np.mean(np.sum(acc ** 2, axis=1)))
    gyr_energy = float(np.mean(np.sum(gyr ** 2, axis=1)))

    acc_centered = acc - np.median(acc, axis=0)
    gyr_magnitude = np.linalg.norm(gyr, axis=1)
    acc_dynamic = np.linalg.norm(acc_centered, axis=1)

    motion_amplitude = float(
        (np.percentile(gyr_magnitude, 95) - np.percentile(gyr_magnitude, 5))
        + 0.25 * (np.percentile(acc_dynamic, 95) - np.percentile(acc_dynamic, 5))
    )

    return motion_amplitude, acc_energy, gyr_energy


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
            "qualityModels": {
                exercise_code: type(model).__name__
                for exercise_code, model in self.quality_models.items()
            },
        }

    def analyze_session(self, payload: MlAnalysisPayloadDto) -> MlAnalysisResponseDto:
        # Analizeaza o sesiune live primita din backend
        if not payload.samples:
            return self.build_empty_response(
                payload=payload,
                message="There are no samples for analysis.",
            )

        signal_data = self.convert_payload_to_signal_matrix(payload)
        selected_exercise_code = normalize_selected_exercise_code(
            payload.selectedExerciseCode,
        )
        analysis_mode = (
            "manual"
            if selected_exercise_code in VALID_EXERCISE_CODES
            else "automatic"
        )

        if len(signal_data) < FS:
            return self.build_empty_response(
                payload=payload,
                message="There are not enough samples for ML analysis.",
                sample_count=len(signal_data),
                selected_exercise_code=selected_exercise_code,
                analysis_mode=analysis_mode,
            )

        has_real_movement, motion_metrics = has_enough_real_movement(signal_data)

        if not has_real_movement:
            return self.build_empty_response(
                payload=payload,
                message=(
                    "Nu a fost detectata miscare suficienta pentru analiza. "
                    "Senzorul pare sa fie in repaus."
                ),
                sample_count=len(signal_data),
                selected_exercise_code=selected_exercise_code,
                analysis_mode=analysis_mode,
                motion_metrics=motion_metrics,
            )

        segmentation_result = self.select_segmentation_strategy(
            signal_data,
            selected_exercise_code,
            analysis_mode,
        )

        segments = segmentation_result["segments"]
        segment_info = segmentation_result["segment_info"]
        detection_info = segmentation_result["detection_info"]
        segmentation_exercise_code = segmentation_result["segmentation_exercise_code"]

        if not segments:
            return self.build_empty_response(
                payload=payload,
                message="No complete repetition was detected.",
                sample_count=len(signal_data),
                selected_exercise_code=selected_exercise_code,
                analysis_mode=analysis_mode,
                segmentation_information=detection_info,
                motion_metrics=motion_metrics,
            )

        classification_inputs = self.build_classification_inputs(
            signal_data,
            segments,
            segment_info,
        )

        exercise_predictions = self.predict_exercise_for_repetitions(
            classification_inputs,
        )

        exercise_probability_means = safe_mean_probability(
            exercise_predictions["probability_sum"],
            len(exercise_predictions["items"]),
        )

        detected_exercise_code = max(
            exercise_probability_means,
            key=exercise_probability_means.get,
        )
        detected_exercise_confidence = float(
            exercise_probability_means[detected_exercise_code] * 100
        )

        if analysis_mode == "manual":
            quality_model_exercise_code = selected_exercise_code
        else:
            quality_model_exercise_code = detected_exercise_code

        if quality_model_exercise_code not in self.quality_models:
            quality_model_exercise_code = segmentation_exercise_code

        quality_model = self.quality_models[quality_model_exercise_code]

        repetition_predictions, quality_probability_sum = self.predict_quality_for_repetitions(
            classification_inputs=classification_inputs,
            exercise_prediction_items=exercise_predictions["items"],
            segment_info=segment_info,
            quality_model=quality_model,
            quality_model_exercise_code=quality_model_exercise_code,
        )

        if not repetition_predictions:
            return self.build_empty_response(
                payload=payload,
                message="Repetitions were detected, but they could not be classified.",
                sample_count=len(signal_data),
                selected_exercise_code=selected_exercise_code,
                analysis_mode=analysis_mode,
                detected_exercise_code=detected_exercise_code,
                exercise_confidence=detected_exercise_confidence,
                quality_model_exercise_code=quality_model_exercise_code,
                segmentation_information=detection_info,
                motion_metrics=motion_metrics,
            )

        quality_probability_means = safe_mean_probability(
            quality_probability_sum,
            len(repetition_predictions),
        )

        detected_quality_code = max(
            quality_probability_means,
            key=quality_probability_means.get,
        )

        detection_info = {
            **detection_info,
            "analysisMode": analysis_mode,
            "selectedExerciseCode": selected_exercise_code,
            "segmentationExerciseCode": segmentation_exercise_code,
            "qualityModelExerciseCode": quality_model_exercise_code,
            "exerciseProbabilityMeans": {
                str(key): float(value * 100)
                for key, value in exercise_probability_means.items()
            },
            "qualityProbabilityMeans": {
                str(key): float(value * 100)
                for key, value in quality_probability_means.items()
            },
        }

        return MlAnalysisResponseDto(
            sessionId=payload.sessionId,
            sampleCount=len(signal_data),
            durationSeconds=len(signal_data) / FS,
            repetitionCount=len(repetition_predictions),
            selectedExerciseCode=selected_exercise_code,
            selectedExerciseName=self.get_selected_exercise_name(selected_exercise_code),
            analysisMode=analysis_mode,
            detectedExerciseCode=int(detected_exercise_code),
            detectedExerciseName=EXERCISE_NAMES.get(
                int(detected_exercise_code),
                str(detected_exercise_code),
            ),
            exerciseConfidence=detected_exercise_confidence,
            qualityModelExerciseCode=int(quality_model_exercise_code),
            qualityModelExerciseName=EXERCISE_NAMES.get(
                int(quality_model_exercise_code),
                str(quality_model_exercise_code),
            ),
            qualityCode=int(detected_quality_code),
            qualityName=QUALITY_NAMES.get(
                int(detected_quality_code),
                str(detected_quality_code),
            ),
            qualityConfidence=float(quality_probability_means[detected_quality_code] * 100),
            readyForAnalysis=True,
            message="ML analysis was completed successfully.",
            segmentationInformation=detection_info,
            motionMetrics=motion_metrics,
            repetitions=repetition_predictions,
        )

    def select_segmentation_strategy(self, signal_data, selected_exercise_code, analysis_mode):
        # Alege segmentarea manuala sau automata
        if analysis_mode == "manual":
            segments, segment_info, detection_info = segment_repetitions(
                signal_data,
                selected_exercise_code,
            )

            return {
                "segments": segments,
                "segment_info": segment_info,
                "detection_info": detection_info,
                "segmentation_exercise_code": selected_exercise_code,
            }

        candidates = []

        for exercise_code in VALID_EXERCISE_CODES:
            segments, segment_info, detection_info = segment_repetitions(
                signal_data,
                exercise_code,
            )

            if not segments:
                candidates.append({
                    "score": -1.0,
                    "segments": segments,
                    "segment_info": segment_info,
                    "detection_info": detection_info,
                    "segmentation_exercise_code": exercise_code,
                })
                continue

            classification_inputs = self.build_classification_inputs(
                signal_data,
                segments,
                segment_info,
            )

            exercise_predictions = self.predict_exercise_for_repetitions(
                classification_inputs,
            )

            probability_means = safe_mean_probability(
                exercise_predictions["probability_sum"],
                len(exercise_predictions["items"]),
            )

            own_probability = probability_means.get(exercise_code, 0.0)
            best_probability = max(probability_means.values()) if probability_means else 0.0
            repetition_count = len(segments)
            rejected_count = len(detection_info.get("rejectedSegments", []))

            count_bonus = min(repetition_count, 12) * 0.01
            rejection_penalty = rejected_count * 0.02
            score = float(0.70 * own_probability + 0.30 * best_probability + count_bonus - rejection_penalty)

            candidates.append({
                "score": score,
                "segments": segments,
                "segment_info": segment_info,
                "detection_info": {
                    **detection_info,
                    "automaticCandidateScore": score,
                    "automaticCandidateOwnProbability": float(own_probability * 100),
                    "automaticCandidateBestProbability": float(best_probability * 100),
                },
                "segmentation_exercise_code": exercise_code,
            })

        best_candidate = max(candidates, key=lambda candidate: candidate["score"])

        best_candidate["detection_info"] = {
            **best_candidate["detection_info"],
            "automaticCandidates": [
                {
                    "exerciseCode": int(candidate["segmentation_exercise_code"]),
                    "score": float(candidate["score"]),
                    "repetitionCount": int(len(candidate["segments"])),
                    "peakCount": int(candidate["detection_info"].get("peakCount", 0)),
                }
                for candidate in candidates
            ],
        }

        return best_candidate

    def build_classification_inputs(self, signal_data, segments, segment_info):
        # Creeaza ferestre de clasificare cu context in jurul fiecarei repetari
        classification_inputs = []
        repetition_count = len(segments)

        for index, segment in enumerate(segments):
            left_index = max(0, index - CLASSIFICATION_CONTEXT_REPETITIONS)
            right_index = min(
                repetition_count - 1,
                index + CLASSIFICATION_CONTEXT_REPETITIONS,
            )

            classification_start = int(segment_info[left_index]["startSample"])
            classification_end = int(segment_info[right_index]["endSample"])

            classification_start = max(0, classification_start)
            classification_end = min(len(signal_data), classification_end)

            classification_segment = signal_data[classification_start:classification_end]

            if len(classification_segment) < 2:
                classification_start = int(segment_info[index]["startSample"])
                classification_end = int(segment_info[index]["endSample"])
                classification_segment = segment

            features = extract_segment_features(classification_segment, FS)

            classification_inputs.append({
                "segment": segment,
                "classificationSegment": classification_segment,
                "features": features,
                "classificationStartSample": int(classification_start),
                "classificationEndSample": int(classification_end),
            })

        return classification_inputs

    def predict_exercise_for_repetitions(self, classification_inputs):
        # Ruleaza modelul de identificare a exercitiului pe fiecare repetare
        probability_sum = {6: 0.0, 7: 0.0, 8: 0.0}
        items = []

        for classification_input in classification_inputs:
            x_segment = classification_input["features"].reshape(1, -1)

            exercise_classes, exercise_probabilities = self.get_model_probabilities(
                self.model_exercise,
                x_segment,
            )

            predicted_exercise_code = int(
                exercise_classes[np.argmax(exercise_probabilities)]
            )
            exercise_confidence = float(np.max(exercise_probabilities) * 100)

            self.add_probabilities(
                probability_sum,
                exercise_classes,
                exercise_probabilities,
            )

            items.append({
                "predictedExerciseCode": predicted_exercise_code,
                "exerciseConfidence": exercise_confidence,
                "classes": exercise_classes,
                "probabilities": exercise_probabilities,
            })

        return {
            "items": items,
            "probability_sum": probability_sum,
        }

    def predict_quality_for_repetitions(
        self,
        classification_inputs,
        exercise_prediction_items,
        segment_info,
        quality_model,
        quality_model_exercise_code,
    ):
        # Ruleaza modelul de calitate corect pentru fiecare repetare
        quality_probability_sum = {1: 0.0, 2: 0.0, 3: 0.0}
        repetition_predictions = []

        for index, classification_input in enumerate(classification_inputs):
            x_segment = classification_input["features"].reshape(1, -1)

            quality_classes, quality_probabilities = self.get_model_probabilities(
                quality_model,
                x_segment,
            )

            predicted_quality_code = int(
                quality_classes[np.argmax(quality_probabilities)]
            )
            quality_confidence = float(np.max(quality_probabilities) * 100)

            self.add_probabilities(
                quality_probability_sum,
                quality_classes,
                quality_probabilities,
            )

            current_segment_info = segment_info[index]
            exercise_prediction = exercise_prediction_items[index]
            motion_amplitude, acc_energy, gyr_energy = get_signal_energy(
                classification_input["segment"],
            )

            repetition_predictions.append(
                RepetitionPredictionDto(
                    repetitionIndex=current_segment_info["repetitionIndex"],
                    durationSeconds=current_segment_info["durationSeconds"],
                    predictedExerciseCode=int(quality_model_exercise_code),
                    predictedExerciseName=EXERCISE_NAMES.get(
                        int(quality_model_exercise_code),
                        str(quality_model_exercise_code),
                    ),
                    exerciseConfidence=exercise_prediction["exerciseConfidence"],
                    modelDetectedExerciseCode=exercise_prediction["predictedExerciseCode"],
                    modelDetectedExerciseName=EXERCISE_NAMES.get(
                        exercise_prediction["predictedExerciseCode"],
                        str(exercise_prediction["predictedExerciseCode"]),
                    ),
                    modelDetectedExerciseConfidence=exercise_prediction["exerciseConfidence"],
                    qualityModelExerciseCode=int(quality_model_exercise_code),
                    qualityModelExerciseName=EXERCISE_NAMES.get(
                        int(quality_model_exercise_code),
                        str(quality_model_exercise_code),
                    ),
                    predictedQualityCode=predicted_quality_code,
                    predictedQualityName=QUALITY_NAMES.get(
                        predicted_quality_code,
                        str(predicted_quality_code),
                    ),
                    qualityConfidence=quality_confidence,
                    sampleCount=current_segment_info["sampleCount"],
                    startSample=current_segment_info["startSample"],
                    endSample=current_segment_info["endSample"],
                    classificationStartSample=classification_input["classificationStartSample"],
                    classificationEndSample=classification_input["classificationEndSample"],
                    motionAmplitude=motion_amplitude,
                    accEnergy=acc_energy,
                    gyrEnergy=gyr_energy,
                )
            )

        return repetition_predictions, quality_probability_sum

    def build_empty_response(
        self,
        payload,
        message,
        sample_count=0,
        selected_exercise_code=None,
        analysis_mode=None,
        detected_exercise_code=None,
        exercise_confidence=None,
        quality_model_exercise_code=None,
        segmentation_information=None,
        motion_metrics=None,
    ):
        # Construieste un raspuns gol, dar cu informatii de debug cand exista
        if sample_count == 0 and payload.samples:
            sample_count = len(payload.samples)

        selected_exercise_code = normalize_selected_exercise_code(
            selected_exercise_code
            if selected_exercise_code is not None
            else payload.selectedExerciseCode,
        )

        if analysis_mode is None:
            analysis_mode = (
                "manual"
                if selected_exercise_code in VALID_EXERCISE_CODES
                else "automatic"
            )

        return MlAnalysisResponseDto(
            sessionId=payload.sessionId,
            sampleCount=sample_count,
            durationSeconds=sample_count / FS,
            repetitionCount=0,
            selectedExerciseCode=selected_exercise_code,
            selectedExerciseName=self.get_selected_exercise_name(selected_exercise_code),
            analysisMode=analysis_mode,
            detectedExerciseCode=detected_exercise_code,
            detectedExerciseName=(
                EXERCISE_NAMES.get(int(detected_exercise_code), str(detected_exercise_code))
                if detected_exercise_code is not None
                else None
            ),
            exerciseConfidence=exercise_confidence,
            qualityModelExerciseCode=quality_model_exercise_code,
            qualityModelExerciseName=(
                EXERCISE_NAMES.get(
                    int(quality_model_exercise_code),
                    str(quality_model_exercise_code),
                )
                if quality_model_exercise_code is not None
                else None
            ),
            qualityCode=None,
            qualityName=None,
            qualityConfidence=None,
            readyForAnalysis=False,
            message=message,
            segmentationInformation=segmentation_information,
            motionMetrics=motion_metrics,
            repetitions=[],
        )

    def get_selected_exercise_name(self, selected_exercise_code):
        # Returneaza numele exercitiului selectat
        if selected_exercise_code in VALID_EXERCISE_CODES:
            return EXERCISE_NAMES.get(selected_exercise_code, str(selected_exercise_code))

        return "Automatic detection"

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
