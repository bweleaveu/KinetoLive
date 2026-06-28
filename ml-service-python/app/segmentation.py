# Functii pentru segmentarea semnalului in repetari individuale
import numpy as np
from scipy.signal import find_peaks


FS = 25

SMOOTHING_WINDOW = 5
MIN_PEAK_PROMINENCE = 1e-8

PEAKS_PER_REPETITION = 2
REPETITION_SEGMENT_MARGIN = int(0.80 * FS)

# Parametri diferiti pentru fiecare exercitiu
# E6 trebuie sa fie mai permisiv, altfel pierde repetari reale.
PEAK_PROMINENCE_FACTOR_BY_EXERCISE = {
    6: 0.04,
    7: 0.06,
    8: 0.10,
}

MIN_PEAK_DISTANCE_BY_EXERCISE = {
    6: int(0.22 * FS),
    7: int(0.26 * FS),
    8: int(0.40 * FS),
}

MIN_FINAL_REPETITION_DURATION_BY_EXERCISE = {
    6: int(1.20 * FS),
    7: int(1.60 * FS),
    8: int(0.80 * FS),
}

FILTER_OVERLAP_BY_EXERCISE = {
    6: False,
    7: False,
    8: False,
}


def calculate_motion_signal(segment_data):
    # Calculeaza semnalul de miscare pe baza magnitudinii giroscopului
    segment_data = np.asarray(segment_data, dtype=float)

    if segment_data.ndim != 2 or segment_data.shape[1] != 6:
        return np.asarray([], dtype=float)

    if len(segment_data) == 0:
        return np.asarray([], dtype=float)

    gyr = segment_data[:, 3:6]
    gyr_magnitude = np.linalg.norm(gyr, axis=1)

    window_size = min(SMOOTHING_WINDOW, len(gyr_magnitude))

    if window_size < 2:
        return gyr_magnitude

    kernel = np.ones(window_size, dtype=float) / window_size

    return np.convolve(gyr_magnitude, kernel, mode="same")


def detect_repetition_peaks(segment_data, selected_exercise_code=None):
    # Detecteaza varfurile importante ale miscarii
    motion_signal = calculate_motion_signal(segment_data)

    if len(motion_signal) < FS:
        return np.asarray([], dtype=int), motion_signal, MIN_PEAK_PROMINENCE

    exercise_code = selected_exercise_code if selected_exercise_code in (6, 7, 8) else 6

    peak_prominence_factor = PEAK_PROMINENCE_FACTOR_BY_EXERCISE.get(
        exercise_code,
        0.05,
    )

    min_peak_distance = MIN_PEAK_DISTANCE_BY_EXERCISE.get(
        exercise_code,
        int(0.30 * FS),
    )

    percentile_95 = np.percentile(motion_signal, 95)
    percentile_20 = np.percentile(motion_signal, 20)

    signal_amplitude = percentile_95 - percentile_20

    prominence_threshold = max(
        signal_amplitude * peak_prominence_factor,
        MIN_PEAK_PROMINENCE,
    )

    peaks, _ = find_peaks(
        motion_signal,
        distance=min_peak_distance,
        prominence=prominence_threshold,
    )

    return peaks, motion_signal, prominence_threshold


def segment_repetitions(segment_data, selected_exercise_code=None):
    # Segmenteaza o sesiune in repetari individuale
    segment_data = np.asarray(segment_data, dtype=float)

    exercise_code = selected_exercise_code if selected_exercise_code in (6, 7, 8) else 6

    min_final_repetition_duration = MIN_FINAL_REPETITION_DURATION_BY_EXERCISE.get(
        exercise_code,
        int(1.50 * FS),
    )

    filter_overlap = FILTER_OVERLAP_BY_EXERCISE.get(
        exercise_code,
        False,
    )

    peaks, motion_signal, prominence = detect_repetition_peaks(
        segment_data,
        exercise_code,
    )

    if len(peaks) < PEAKS_PER_REPETITION:
        detection_info = {
            "peak_count": int(len(peaks)),
            "prominence": float(prominence),
            "raw_repetition_count": 0,
            "repetition_count": 0,
            "rejected_segments": [],
        }

        return [], [], detection_info

    raw_repetition_count = len(peaks) // PEAKS_PER_REPETITION
    used_peaks = peaks[:raw_repetition_count * PEAKS_PER_REPETITION]

    segments = []
    segment_info = []
    rejected_segments = []

    last_accepted_end = -1

    for repetition_index in range(raw_repetition_count):
        first_peak_index = repetition_index * PEAKS_PER_REPETITION

        first_peak = int(used_peaks[first_peak_index])
        second_peak = int(used_peaks[first_peak_index + 1])

        start_sample = max(0, first_peak - REPETITION_SEGMENT_MARGIN)
        end_sample = min(len(segment_data), second_peak + REPETITION_SEGMENT_MARGIN + 1)

        segment_length = end_sample - start_sample
        duration_seconds = segment_length / FS

        if segment_length < min_final_repetition_duration:
            rejected_segments.append({
                "candidateRepetition": repetition_index + 1,
                "startSample": start_sample,
                "endSample": end_sample,
                "samples": segment_length,
                "durationSeconds": duration_seconds,
                "reason": "duration_too_short",
            })

            continue

        if filter_overlap and start_sample < last_accepted_end:
            rejected_segments.append({
                "candidateRepetition": repetition_index + 1,
                "startSample": start_sample,
                "endSample": end_sample,
                "samples": segment_length,
                "durationSeconds": duration_seconds,
                "reason": "overlap_with_previous_segment",
            })

            continue

        segment = segment_data[start_sample:end_sample].copy()

        segments.append(segment)

        segment_info.append({
            "repetitionIndex": len(segments),
            "startSample": start_sample,
            "endSample": end_sample,
            "sampleCount": len(segment),
            "durationSeconds": len(segment) / FS,
            "firstPeak": first_peak,
            "secondPeak": second_peak,
        })

        last_accepted_end = end_sample

    detection_info = {
        "peak_count": int(len(peaks)),
        "prominence": float(prominence),
        "raw_repetition_count": int(raw_repetition_count),
        "repetition_count": len(segments),
        "rejected_segments": rejected_segments,
        "selected_exercise_for_segmentation": exercise_code,
    }

    return segments, segment_info, detection_info