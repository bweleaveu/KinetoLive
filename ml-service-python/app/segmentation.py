# Functii pentru segmentarea semnalului in repetari individuale
import numpy as np
from scipy.signal import find_peaks


FS = 25

SMOOTHING_WINDOW = 5
MIN_PEAK_DISTANCE = int(0.30 * FS)
PEAK_PROMINENCE_FACTOR = 0.05
MIN_PEAK_PROMINENCE = 1e-8

PEAKS_PER_REPETITION = 2
REPETITION_SEGMENT_MARGIN = int(0.80 * FS)
MIN_FINAL_REPETITION_DURATION = int(2.20 * FS)


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


def detect_repetition_peaks(segment_data):
    # Detecteaza varfurile importante ale miscarii
    motion_signal = calculate_motion_signal(segment_data)

    if len(motion_signal) < FS:
        return np.asarray([], dtype=int), motion_signal, MIN_PEAK_PROMINENCE

    percentile_95 = np.percentile(motion_signal, 95)
    percentile_20 = np.percentile(motion_signal, 20)

    signal_amplitude = percentile_95 - percentile_20

    prominence_threshold = max(
        signal_amplitude * PEAK_PROMINENCE_FACTOR,
        MIN_PEAK_PROMINENCE,
    )

    peaks, _ = find_peaks(
        motion_signal,
        distance=MIN_PEAK_DISTANCE,
        prominence=prominence_threshold,
    )

    return peaks, motion_signal, prominence_threshold


def segment_repetitions(segment_data):
    # Segmenteaza o sesiune in repetari individuale
    segment_data = np.asarray(segment_data, dtype=float)

    peaks, motion_signal, prominence = detect_repetition_peaks(segment_data)

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

        if segment_length < MIN_FINAL_REPETITION_DURATION:
            rejected_segments.append({
                "candidateRepetition": repetition_index + 1,
                "startSample": start_sample,
                "endSample": end_sample,
                "samples": segment_length,
                "durationSeconds": duration_seconds,
                "reason": "duration_too_short",
            })

            continue

        if start_sample < last_accepted_end:
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
    }

    return segments, segment_info, detection_info