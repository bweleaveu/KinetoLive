# Functii pentru segmentarea semnalului in repetari individuale
import numpy as np
from scipy.signal import find_peaks


FS = 25

VALID_EXERCISE_CODES = (6, 7, 8)

SMOOTHING_WINDOW = 5
MIN_PEAK_PROMINENCE = 1e-8
PEAKS_PER_REPETITION = 2

# Parametri diferiti pentru fiecare exercitiu.
# Valorile sunt folosite doar pentru detectarea repetarilor, nu pentru antrenarea modelelor.
SEGMENTATION_CONFIG_BY_EXERCISE = {
    6: {
        # E6 produce frecvent varfuri secundare pe rotatia mainii.
        # Pragurile sunt putin mai stricte ca sa nu taie o repetare in doua.
        "prominence_factor": 0.11,
        "height_factor": 0.18,
        "min_peak_distance_seconds": 0.38,
        "active_threshold_factor": 0.20,
        "active_margin_seconds": 0.55,
        "min_segment_seconds": 0.80,
    },
    7: {
        "prominence_factor": 0.10,
        "height_factor": 0.16,
        "min_peak_distance_seconds": 0.38,
        "active_threshold_factor": 0.20,
        "active_margin_seconds": 0.55,
        "min_segment_seconds": 0.90,
    },
    8: {
        "prominence_factor": 0.12,
        "height_factor": 0.16,
        "min_peak_distance_seconds": 0.45,
        "active_threshold_factor": 0.22,
        "active_margin_seconds": 0.50,
        "min_segment_seconds": 0.50,
    },
}

DEFAULT_SEGMENTATION_CONFIG = {
    "prominence_factor": 0.10,
    "height_factor": 0.14,
    "min_peak_distance_seconds": 0.35,
    "active_threshold_factor": 0.20,
    "active_margin_seconds": 0.55,
    "min_segment_seconds": 0.70,
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

    return config


def smooth_signal(values, window_size=SMOOTHING_WINDOW):
    # Netezeste un vector folosind media mobila
    values = np.asarray(values, dtype=float)

    if len(values) == 0:
        return values

    window_size = min(int(window_size), len(values))

    if window_size < 2:
        return values

    kernel = np.ones(window_size, dtype=float) / window_size

    return np.convolve(values, kernel, mode="same")


def robust_normalize(values):
    # Normalizeaza robust un semnal pentru a combina accelerometrul cu giroscopul
    values = np.asarray(values, dtype=float)

    if len(values) == 0:
        return values

    percentile_95 = np.percentile(values, 95)
    percentile_5 = np.percentile(values, 5)
    scale = percentile_95 - percentile_5

    if scale < 1e-8:
        scale = np.std(values)

    if scale < 1e-8:
        return np.zeros_like(values, dtype=float)

    normalized = (values - np.median(values)) / scale

    return np.clip(normalized, 0.0, None)


def calculate_motion_signal(segment_data):
    # Calculeaza un semnal de miscare din giroscop si accelerometru
    segment_data = np.asarray(segment_data, dtype=float)

    if segment_data.ndim != 2 or segment_data.shape[1] != 6:
        return np.asarray([], dtype=float)

    if len(segment_data) == 0:
        return np.asarray([], dtype=float)

    acc = segment_data[:, 0:3]
    gyr = segment_data[:, 3:6]

    acc_centered = acc - np.median(acc, axis=0)
    acc_dynamic_magnitude = np.linalg.norm(acc_centered, axis=1)
    gyr_magnitude = np.linalg.norm(gyr, axis=1)

    motion_signal = (
        0.75 * robust_normalize(gyr_magnitude)
        + 0.25 * robust_normalize(acc_dynamic_magnitude)
    )

    return smooth_signal(motion_signal)


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
    # Detecteaza varfurile importante ale miscarii
    config = get_segmentation_config(selected_exercise_code)
    motion_signal = calculate_motion_signal(segment_data)

    if len(motion_signal) < FS:
        return np.asarray([], dtype=int), motion_signal, MIN_PEAK_PROMINENCE, {
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


def build_repetition_segments_from_peaks(segment_data, peaks, detection_debug, config):
    # Transforma perechile de varfuri in segmente fara suprapuneri
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

        segments.append(segment)

        segment_info.append({
            "repetitionIndex": len(segments),
            "startSample": int(start_sample),
            "endSample": int(end_sample),
            "sampleCount": int(len(segment)),
            "durationSeconds": float(len(segment) / FS),
            "firstPeak": int(first_peak),
            "secondPeak": int(second_peak),
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
    }

    return segments, segment_info, detection_info
