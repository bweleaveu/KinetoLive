# Functii pentru segmentarea semnalului in repetari individuale
import numpy as np
from scipy.signal import find_peaks


FS = 25

VALID_EXERCISE_CODES = (6, 7, 8)

MIN_PEAK_PROMINENCE = 1e-8
PEAKS_PER_REPETITION = 2
AXIS_NAMES = ("x", "y", "z")

# Segmentarea foloseste un semnal de miscare intentionata, nu norma bruta a giroscopului.
# Astfel, tremuratul rapid pe axe secundare nu mai creeaza varfuri false.
SEGMENTATION_CONFIG_BY_EXERCISE = {
    6: {
        "prominence_factor": 0.13,
        "height_factor": 0.20,
        "min_peak_distance_seconds": 0.44,
        "active_threshold_factor": 0.22,
        "active_margin_seconds": 0.50,
        "min_segment_seconds": 0.78,
        "intentional_window_seconds": 0.36,
        "axis_selection_ratio": 0.42,
        "min_coherent_amplitude_ratio": 0.10,
        "tremor_rejection_ratio": 0.62,
    },
    7: {
        "prominence_factor": 0.13,
        "height_factor": 0.20,
        "min_peak_distance_seconds": 0.44,
        "active_threshold_factor": 0.22,
        "active_margin_seconds": 0.50,
        "min_segment_seconds": 0.82,
        "intentional_window_seconds": 0.38,
        "axis_selection_ratio": 0.45,
        "min_coherent_amplitude_ratio": 0.10,
        "tremor_rejection_ratio": 0.62,
    },
    8: {
        "prominence_factor": 0.15,
        "height_factor": 0.20,
        "min_peak_distance_seconds": 0.50,
        "active_threshold_factor": 0.24,
        "active_margin_seconds": 0.48,
        "min_segment_seconds": 0.50,
        "intentional_window_seconds": 0.32,
        "axis_selection_ratio": 0.40,
        "min_coherent_amplitude_ratio": 0.09,
        "tremor_rejection_ratio": 0.66,
    },
}

DEFAULT_SEGMENTATION_CONFIG = {
    "prominence_factor": 0.13,
    "height_factor": 0.18,
    "min_peak_distance_seconds": 0.42,
    "active_threshold_factor": 0.22,
    "active_margin_seconds": 0.50,
    "min_segment_seconds": 0.75,
    "intentional_window_seconds": 0.36,
    "axis_selection_ratio": 0.42,
    "min_coherent_amplitude_ratio": 0.10,
    "tremor_rejection_ratio": 0.62,
}


def get_exercise_code(selected_exercise_code):
    # Normalizeaza codul exercitiului pentru segmentare
    try:
        exercise_code = int(selected_exercise_code)
    except (TypeError, ValueError):
        return 6

    if exercise_code in VALID_EXERCISE_CODES:
        return exercise_code

    return 6


def get_segmentation_config(selected_exercise_code):
    # Returneaza configuratia de segmentare pentru exercitiul curent
    exercise_code = get_exercise_code(selected_exercise_code)
    config = dict(DEFAULT_SEGMENTATION_CONFIG)
    config.update(SEGMENTATION_CONFIG_BY_EXERCISE.get(exercise_code, {}))
    config["exercise_code"] = exercise_code
    config["min_peak_distance_samples"] = max(
        1,
        int(round(config["min_peak_distance_seconds"] * FS)),
    )
    config["active_margin_samples"] = max(
        0,
        int(round(config["active_margin_seconds"] * FS)),
    )
    config["min_segment_samples"] = max(
        2,
        int(round(config["min_segment_seconds"] * FS)),
    )
    config["intentional_window_samples"] = make_odd_window(
        max(3, int(round(config["intentional_window_seconds"] * FS))),
    )

    return config


def make_odd_window(value):
    # Pastreaza fereastra impara pentru netezire simetrica
    value = int(value)

    if value % 2 == 0:
        value += 1

    return max(3, value)


def smooth_signal(values, window_size=5):
    # Netezeste un vector folosind media mobila cu padding la margini
    values = np.asarray(values, dtype=float)

    if len(values) == 0:
        return values

    window_size = min(int(window_size), len(values))

    if window_size < 2:
        return values

    if window_size % 2 == 0:
        window_size -= 1

    if window_size < 2:
        return values

    pad = window_size // 2
    padded = np.pad(values, pad_width=pad, mode="edge")
    kernel = np.ones(window_size, dtype=float) / window_size

    return np.convolve(padded, kernel, mode="valid")


def smooth_axis_matrix(values, window_size):
    # Netezeste fiecare axa separat
    values = np.asarray(values, dtype=float)

    if values.ndim != 2 or values.shape[1] == 0:
        return values

    smoothed = np.zeros_like(values, dtype=float)

    for axis_index in range(values.shape[1]):
        smoothed[:, axis_index] = smooth_signal(values[:, axis_index], window_size)

    return smoothed


def robust_range(values, low_percentile=5, high_percentile=95):
    # Calculeaza amplitudinea robusta a unui vector
    values = np.asarray(values, dtype=float)

    if len(values) == 0:
        return 0.0

    return float(
        np.percentile(values, high_percentile) - np.percentile(values, low_percentile)
    )


def robust_normalize_positive(values):
    # Normalizeaza un semnal pozitiv pentru combinarea axelor
    values = np.asarray(values, dtype=float)

    if len(values) == 0:
        return values

    baseline = np.percentile(values, 10)
    amplitude = np.percentile(values, 95) - baseline

    if amplitude < 1e-8:
        amplitude = np.std(values)

    if amplitude < 1e-8:
        return np.zeros_like(values, dtype=float)

    normalized = (values - baseline) / amplitude

    return np.clip(normalized, 0.0, None)


def get_axis_ranges(values):
    # Returneaza range-ul robust pentru fiecare axa
    values = np.asarray(values, dtype=float)

    if values.ndim != 2 or values.shape[1] == 0:
        return np.asarray([], dtype=float)

    return np.asarray(
        [robust_range(values[:, axis_index]) for axis_index in range(values.shape[1])],
        dtype=float,
    )


def calculate_axis_weights(low_frequency_axes, residual_axes, axis_selection_ratio):
    # Alege axele dominante ale miscarii intentionate si reduce axele dominate de tremor
    low_ranges = get_axis_ranges(low_frequency_axes)
    residual_ranges = get_axis_ranges(residual_axes)

    if len(low_ranges) == 0:
        return np.asarray([], dtype=float), low_ranges, residual_ranges, []

    max_low_range = float(np.max(low_ranges))

    if max_low_range < 1e-8:
        weights = np.zeros_like(low_ranges, dtype=float)
        weights[int(np.argmax(low_ranges))] = 1.0
        return weights, low_ranges, residual_ranges, [int(np.argmax(low_ranges))]

    selected_mask = low_ranges >= max_low_range * axis_selection_ratio

    if not np.any(selected_mask):
        selected_mask[int(np.argmax(low_ranges))] = True

    tremor_ratio = residual_ranges / (low_ranges + residual_ranges + 1e-8)
    axis_quality = 1.0 - np.clip(tremor_ratio, 0.0, 0.85)
    raw_weights = low_ranges * axis_quality * selected_mask.astype(float)

    if float(np.sum(raw_weights)) < 1e-8:
        raw_weights = low_ranges * selected_mask.astype(float)

    if float(np.sum(raw_weights)) < 1e-8:
        raw_weights = np.zeros_like(low_ranges, dtype=float)
        raw_weights[int(np.argmax(low_ranges))] = 1.0

    weights = raw_weights / np.sum(raw_weights)
    selected_axes = [int(index) for index, is_selected in enumerate(selected_mask) if is_selected]

    return weights, low_ranges, residual_ranges, selected_axes


def get_weighted_axis_activity(low_frequency_axes, weights):
    # Construieste activitatea pe axele dominante
    low_frequency_axes = np.asarray(low_frequency_axes, dtype=float)
    weights = np.asarray(weights, dtype=float)

    if low_frequency_axes.ndim != 2 or low_frequency_axes.shape[1] == 0:
        return np.asarray([], dtype=float)

    if len(weights) != low_frequency_axes.shape[1] or np.sum(weights) < 1e-8:
        weights = np.ones(low_frequency_axes.shape[1], dtype=float)
        weights = weights / np.sum(weights)

    return np.sum(np.abs(low_frequency_axes) * weights.reshape(1, -1), axis=1)


def calculate_intentional_motion_details(segment_data, selected_exercise_code=None):
    # Calculeaza semnalul de miscare intentionata si metricele de tremor
    segment_data = np.asarray(segment_data, dtype=float)
    config = get_segmentation_config(selected_exercise_code)

    if segment_data.ndim != 2 or segment_data.shape[1] != 6 or len(segment_data) == 0:
        return {
            "motionSignal": np.asarray([], dtype=float),
            "config": config,
            "debug": {
                "dominantGyrAxes": [],
                "dominantAccAxes": [],
                "gyrTremorRatio": 0.0,
                "accTremorRatio": 0.0,
                "dominantGyrLowRange": 0.0,
                "dominantAccLowRange": 0.0,
                "intentionalWindowSamples": int(config["intentional_window_samples"]),
            },
        }

    acc = segment_data[:, 0:3]
    gyr = segment_data[:, 3:6]

    acc_centered = acc - np.median(acc, axis=0)
    gyr_centered = gyr - np.median(gyr, axis=0)

    window_size = config["intentional_window_samples"]

    low_acc = smooth_axis_matrix(acc_centered, window_size)
    low_gyr = smooth_axis_matrix(gyr_centered, window_size)

    residual_acc = acc_centered - low_acc
    residual_gyr = gyr_centered - low_gyr

    gyr_weights, gyr_low_ranges, gyr_residual_ranges, dominant_gyr_axes = calculate_axis_weights(
        low_gyr,
        residual_gyr,
        config["axis_selection_ratio"],
    )
    acc_weights, acc_low_ranges, acc_residual_ranges, dominant_acc_axes = calculate_axis_weights(
        low_acc,
        residual_acc,
        config["axis_selection_ratio"],
    )

    gyr_activity = get_weighted_axis_activity(low_gyr, gyr_weights)
    acc_activity = get_weighted_axis_activity(low_acc, acc_weights)

    gyr_motion = robust_normalize_positive(gyr_activity)
    acc_motion = robust_normalize_positive(acc_activity)

    motion_signal = 0.82 * gyr_motion + 0.18 * acc_motion
    motion_signal = smooth_signal(motion_signal, 3)

    dominant_gyr_low_range = float(
        np.sum(gyr_low_ranges * gyr_weights)
        if len(gyr_low_ranges) == len(gyr_weights)
        else 0.0
    )
    dominant_acc_low_range = float(
        np.sum(acc_low_ranges * acc_weights)
        if len(acc_low_ranges) == len(acc_weights)
        else 0.0
    )

    dominant_gyr_residual_range = float(
        np.sum(gyr_residual_ranges * gyr_weights)
        if len(gyr_residual_ranges) == len(gyr_weights)
        else 0.0
    )
    dominant_acc_residual_range = float(
        np.sum(acc_residual_ranges * acc_weights)
        if len(acc_residual_ranges) == len(acc_weights)
        else 0.0
    )

    gyr_tremor_ratio = dominant_gyr_residual_range / (
        dominant_gyr_low_range + dominant_gyr_residual_range + 1e-8
    )
    acc_tremor_ratio = dominant_acc_residual_range / (
        dominant_acc_low_range + dominant_acc_residual_range + 1e-8
    )

    debug = {
        "dominantGyrAxes": [AXIS_NAMES[index] for index in dominant_gyr_axes],
        "dominantAccAxes": [AXIS_NAMES[index] for index in dominant_acc_axes],
        "gyrLowRanges": [float(value) for value in gyr_low_ranges],
        "gyrResidualRanges": [float(value) for value in gyr_residual_ranges],
        "accLowRanges": [float(value) for value in acc_low_ranges],
        "accResidualRanges": [float(value) for value in acc_residual_ranges],
        "gyrAxisWeights": [float(value) for value in gyr_weights],
        "accAxisWeights": [float(value) for value in acc_weights],
        "gyrTremorRatio": float(gyr_tremor_ratio),
        "accTremorRatio": float(acc_tremor_ratio),
        "dominantGyrLowRange": dominant_gyr_low_range,
        "dominantAccLowRange": dominant_acc_low_range,
        "dominantGyrResidualRange": dominant_gyr_residual_range,
        "dominantAccResidualRange": dominant_acc_residual_range,
        "intentionalWindowSamples": int(window_size),
    }

    return {
        "motionSignal": motion_signal,
        "lowGyr": low_gyr,
        "lowAcc": low_acc,
        "residualGyr": residual_gyr,
        "residualAcc": residual_acc,
        "gyrWeights": gyr_weights,
        "accWeights": acc_weights,
        "config": config,
        "debug": debug,
    }


def calculate_intentional_motion_metrics(segment_data, selected_exercise_code=None):
    # Calculeaza amplitudinea miscarii intentionate pentru clasificarea calitatii
    details = calculate_intentional_motion_details(segment_data, selected_exercise_code)
    debug = details["debug"]

    dominant_gyr_range = float(debug.get("dominantGyrLowRange", 0.0))
    dominant_acc_range = float(debug.get("dominantAccLowRange", 0.0))
    gyr_tremor_ratio = float(debug.get("gyrTremorRatio", 0.0))
    acc_tremor_ratio = float(debug.get("accTremorRatio", 0.0))

    # Penalizam energia de tremor in amplitudine ca sa nu para miscare normala.
    tremor_penalty = max(0.45, 1.0 - 0.45 * max(gyr_tremor_ratio, acc_tremor_ratio))
    motion_amplitude = float(
        (0.78 * dominant_gyr_range + 0.22 * dominant_acc_range) * tremor_penalty
    )

    return {
        "motionAmplitude": motion_amplitude,
        "dominantGyrRange": dominant_gyr_range,
        "dominantAccRange": dominant_acc_range,
        "gyrTremorRatio": gyr_tremor_ratio,
        "accTremorRatio": acc_tremor_ratio,
    }


def calculate_motion_signal(segment_data, selected_exercise_code=None):
    # Calculeaza semnalul de miscare intentionata folosit pentru varfuri
    details = calculate_intentional_motion_details(segment_data, selected_exercise_code)

    return details["motionSignal"]


def find_active_range(motion_signal, config):
    # Gaseste zona activa a miscarii si elimina repausul de la inceput/final
    motion_signal = np.asarray(motion_signal, dtype=float)

    if len(motion_signal) == 0:
        return 0, 0, 0.0, 0.0

    percentile_95 = np.percentile(motion_signal, 95)
    percentile_20 = np.percentile(motion_signal, 20)
    amplitude = percentile_95 - percentile_20

    if amplitude < 1e-8:
        return 0, len(motion_signal), float(percentile_20), float(amplitude)

    active_threshold = percentile_20 + amplitude * config["active_threshold_factor"]
    active_mask = motion_signal >= active_threshold

    if not np.any(active_mask):
        return 0, len(motion_signal), float(active_threshold), float(amplitude)

    active_indices = np.where(active_mask)[0]
    margin = config["active_margin_samples"]

    active_start = max(0, int(active_indices[0]) - margin)
    active_end = min(len(motion_signal), int(active_indices[-1]) + margin + 1)

    if active_end <= active_start:
        return 0, len(motion_signal), float(active_threshold), float(amplitude)

    return active_start, active_end, float(active_threshold), float(amplitude)


def detect_repetition_peaks(segment_data, selected_exercise_code=None):
    # Detecteaza varfurile importante ale miscarii intentionate
    config = get_segmentation_config(selected_exercise_code)
    motion_details = calculate_intentional_motion_details(
        segment_data,
        config["exercise_code"],
    )
    motion_signal = motion_details["motionSignal"]

    if len(motion_signal) < FS:
        return np.asarray([], dtype=int), motion_signal, MIN_PEAK_PROMINENCE, {
            **motion_details["debug"],
            "exerciseCodeForSegmentation": config["exercise_code"],
            "activeStartSample": 0,
            "activeEndSample": int(len(motion_signal)),
            "activeThreshold": 0.0,
            "motionAmplitude": 0.0,
            "peakHeightThreshold": 0.0,
            "minPeakDistanceSamples": config["min_peak_distance_samples"],
        }

    active_start, active_end, active_threshold, motion_amplitude = find_active_range(
        motion_signal,
        config,
    )

    active_motion_signal = motion_signal[active_start:active_end]

    if len(active_motion_signal) < FS:
        active_motion_signal = motion_signal
        active_start = 0
        active_end = len(motion_signal)

    percentile_95 = np.percentile(active_motion_signal, 95)
    percentile_20 = np.percentile(active_motion_signal, 20)
    signal_amplitude = percentile_95 - percentile_20

    prominence_threshold = max(
        signal_amplitude * config["prominence_factor"],
        MIN_PEAK_PROMINENCE,
    )

    peak_height_threshold = percentile_20 + signal_amplitude * config["height_factor"]

    local_peaks, _ = find_peaks(
        active_motion_signal,
        distance=config["min_peak_distance_samples"],
        prominence=prominence_threshold,
        height=peak_height_threshold,
    )

    peaks = local_peaks + active_start

    detection_debug = {
        **motion_details["debug"],
        "exerciseCodeForSegmentation": config["exercise_code"],
        "activeStartSample": int(active_start),
        "activeEndSample": int(active_end),
        "activeThreshold": float(active_threshold),
        "motionAmplitude": float(motion_amplitude),
        "peakHeightThreshold": float(peak_height_threshold),
        "minPeakDistanceSamples": int(config["min_peak_distance_samples"]),
        "prominenceFactor": float(config["prominence_factor"]),
        "heightFactor": float(config["height_factor"]),
    }

    return peaks, motion_signal, prominence_threshold, detection_debug


def calculate_candidate_tremor_metrics(segment, selected_exercise_code):
    # Verifica daca un segment scurt este mai degraba tremor decat repetare coerenta
    metrics = calculate_intentional_motion_metrics(segment, selected_exercise_code)
    raw_gyr = np.asarray(segment[:, 3:6], dtype=float)
    centered_gyr = raw_gyr - np.median(raw_gyr, axis=0)
    raw_gyr_ranges = get_axis_ranges(centered_gyr)
    raw_gyr_range = float(np.max(raw_gyr_ranges)) if len(raw_gyr_ranges) else 0.0

    metrics["rawGyrRange"] = raw_gyr_range
    metrics["coherentToRawRatio"] = float(
        metrics["dominantGyrRange"] / (raw_gyr_range + 1e-8)
    )

    return metrics


def build_repetition_segments_from_peaks(segment_data, peaks, detection_debug, config):
    # Transforma perechile de varfuri in segmente si respinge fragmentele de tremor
    raw_repetition_count = len(peaks) // PEAKS_PER_REPETITION
    used_peaks = peaks[: raw_repetition_count * PEAKS_PER_REPETITION]

    if raw_repetition_count == 0:
        return [], [], []

    active_start = int(detection_debug.get("activeStartSample", 0))
    active_end = int(detection_debug.get("activeEndSample", len(segment_data)))

    if active_end <= active_start:
        active_start = 0
        active_end = len(segment_data)

    peak_pairs = []
    centers = []

    for repetition_index in range(raw_repetition_count):
        first_peak_index = repetition_index * PEAKS_PER_REPETITION
        first_peak = int(used_peaks[first_peak_index])
        second_peak = int(used_peaks[first_peak_index + 1])

        if second_peak < first_peak:
            first_peak, second_peak = second_peak, first_peak

        peak_pairs.append((first_peak, second_peak))
        centers.append((first_peak + second_peak) / 2.0)

    segments = []
    segment_info = []
    rejected_segments = []
    full_motion_metrics = calculate_intentional_motion_metrics(
        segment_data[active_start:active_end],
        config["exercise_code"],
    )
    reference_amplitude = max(
        float(full_motion_metrics.get("dominantGyrRange", 0.0)),
        1e-8,
    )

    for repetition_index, (first_peak, second_peak) in enumerate(peak_pairs):
        if repetition_index == 0:
            start_sample = active_start
        else:
            start_sample = int(round((centers[repetition_index - 1] + centers[repetition_index]) / 2.0))

        if repetition_index == len(peak_pairs) - 1:
            end_sample = active_end
        else:
            end_sample = int(round((centers[repetition_index] + centers[repetition_index + 1]) / 2.0))

        start_sample = max(0, min(start_sample, len(segment_data) - 1))
        end_sample = max(start_sample + 1, min(end_sample, len(segment_data)))

        segment_length = end_sample - start_sample
        duration_seconds = segment_length / FS

        if segment_length < config["min_segment_samples"]:
            rejected_segments.append({
                "candidateRepetition": repetition_index + 1,
                "startSample": int(start_sample),
                "endSample": int(end_sample),
                "samples": int(segment_length),
                "durationSeconds": float(duration_seconds),
                "reason": "duration_too_short",
            })
            continue

        segment = segment_data[start_sample:end_sample].copy()
        tremor_metrics = calculate_candidate_tremor_metrics(
            segment,
            config["exercise_code"],
        )
        relative_coherent_amplitude = float(
            tremor_metrics["dominantGyrRange"] / reference_amplitude
        )
        tremor_like_segment = bool(
            relative_coherent_amplitude < config["min_coherent_amplitude_ratio"]
            and tremor_metrics["gyrTremorRatio"] >= config["tremor_rejection_ratio"]
            and tremor_metrics["coherentToRawRatio"] < 0.45
        )

        if tremor_like_segment:
            rejected_segments.append({
                "candidateRepetition": repetition_index + 1,
                "startSample": int(start_sample),
                "endSample": int(end_sample),
                "samples": int(segment_length),
                "durationSeconds": float(duration_seconds),
                "reason": "tremor_like_low_coherence",
                "relativeCoherentAmplitude": relative_coherent_amplitude,
                "gyrTremorRatio": float(tremor_metrics["gyrTremorRatio"]),
                "coherentToRawRatio": float(tremor_metrics["coherentToRawRatio"]),
            })
            continue

        segments.append(segment)

        segment_info.append({
            "repetitionIndex": len(segments),
            "startSample": int(start_sample),
            "endSample": int(end_sample),
            "sampleCount": int(len(segment)),
            "durationSeconds": float(len(segment) / FS),
            "firstPeak": int(first_peak),
            "secondPeak": int(second_peak),
            "relativeCoherentAmplitude": relative_coherent_amplitude,
            "gyrTremorRatio": float(tremor_metrics["gyrTremorRatio"]),
            "coherentToRawRatio": float(tremor_metrics["coherentToRawRatio"]),
        })

    return segments, segment_info, rejected_segments


def segment_repetitions(segment_data, selected_exercise_code=None):
    # Segmenteaza o sesiune in repetari individuale
    segment_data = np.asarray(segment_data, dtype=float)
    config = get_segmentation_config(selected_exercise_code)

    peaks, motion_signal, prominence, detection_debug = detect_repetition_peaks(
        segment_data,
        config["exercise_code"],
    )

    if len(peaks) < PEAKS_PER_REPETITION:
        detection_info = {
            **detection_debug,
            "peakCount": int(len(peaks)),
            "peakSamples": [int(peak) for peak in peaks],
            "prominence": float(prominence),
            "rawRepetitionCount": 0,
            "repetitionCount": 0,
            "rejectedSegments": [],
        }

        return [], [], detection_info

    raw_repetition_count = len(peaks) // PEAKS_PER_REPETITION

    segments, segment_info, rejected_segments = build_repetition_segments_from_peaks(
        segment_data,
        peaks,
        detection_debug,
        config,
    )

    detection_info = {
        **detection_debug,
        "peakCount": int(len(peaks)),
        "peakSamples": [int(peak) for peak in peaks],
        "prominence": float(prominence),
        "rawRepetitionCount": int(raw_repetition_count),
        "repetitionCount": int(len(segments)),
        "rejectedSegments": rejected_segments,
        "minSegmentSamples": int(config["min_segment_samples"]),
        "minCoherentAmplitudeRatio": float(config["min_coherent_amplitude_ratio"]),
        "tremorRejectionRatio": float(config["tremor_rejection_ratio"]),
    }

    return segments, segment_info, detection_info
