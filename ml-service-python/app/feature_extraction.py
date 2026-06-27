# Functii pentru extragerea celor 112 trasaturi folosite de modelele ML
import numpy as np


SIGNAL_COLUMNS = [
    "acc_x",
    "acc_y",
    "acc_z",
    "gyr_x",
    "gyr_y",
    "gyr_z",
]

PER_AXIS_FEATURE_STATISTICS = [
    "mean",
    "std",
    "min",
    "max",
    "range",
    "rms",
    "median",
    "iqr",
    "mean_abs",
    "zero_crossings",
    "diff_mean_abs",
    "diff_std",
    "diff_rms",
]

MAGNITUDE_FEATURE_STATISTICS = [
    "mean",
    "std",
    "min",
    "max",
    "range",
    "rms",
    "median",
    "iqr",
]

JERK_FEATURE_STATISTICS = [
    "mean_abs",
    "std",
    "rms",
]

CORRELATION_FEATURES = [
    "acc_corr_xy",
    "acc_corr_xz",
    "acc_corr_yz",
    "gyr_corr_xy",
    "gyr_corr_xz",
    "gyr_corr_yz",
    "acc_gyr_corr_x",
    "acc_gyr_corr_y",
    "acc_gyr_corr_z",
]

FEATURE_NAMES = []

for column in SIGNAL_COLUMNS:
    for statistic in PER_AXIS_FEATURE_STATISTICS:
        FEATURE_NAMES.append(f"{column}_{statistic}")

FEATURE_NAMES.extend([
    "duration_seconds",
    "acc_energy",
    "gyr_energy",
])

for prefix in ["acc", "gyr"]:
    for statistic in MAGNITUDE_FEATURE_STATISTICS:
        FEATURE_NAMES.append(f"{prefix}_magnitude_{statistic}")

for prefix in ["acc", "gyr"]:
    for statistic in JERK_FEATURE_STATISTICS:
        FEATURE_NAMES.append(f"{prefix}_jerk_{statistic}")

FEATURE_NAMES.extend(CORRELATION_FEATURES)


def calculate_rms(values):
    # Calculeaza valoarea RMS pentru un vector
    values = np.asarray(values, dtype=float)
    return float(np.sqrt(np.mean(values ** 2)))


def calculate_iqr(values):
    # Calculeaza intervalul intercuartilic pentru un vector
    values = np.asarray(values, dtype=float)
    q75 = np.percentile(values, 75)
    q25 = np.percentile(values, 25)
    return float(q75 - q25)


def calculate_zero_crossings(values):
    # Calculeaza numarul de treceri prin zero
    values = np.asarray(values, dtype=float)

    if len(values) < 2:
        return 0.0

    signs = np.sign(values)
    crossings = np.where(np.diff(signs) != 0)[0]

    return float(len(crossings))


def calculate_correlation(x, y):
    # Calculeaza corelatia dintre doua semnale
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)

    if len(x) < 2 or len(y) < 2:
        return 0.0

    if np.std(x) < 1e-12 or np.std(y) < 1e-12:
        return 0.0

    correlation = np.corrcoef(x, y)[0, 1]

    if not np.isfinite(correlation):
        return 0.0

    return float(correlation)


def calculate_vector_statistics(values):
    # Calculeaza statisticile principale pentru un vector
    values = np.asarray(values, dtype=float)
    differences = np.diff(values)

    if len(differences) == 0:
        differences = np.asarray([0.0], dtype=float)

    minimum = np.min(values)
    maximum = np.max(values)

    return {
        "mean": float(np.mean(values)),
        "std": float(np.std(values)),
        "min": float(minimum),
        "max": float(maximum),
        "range": float(maximum - minimum),
        "rms": calculate_rms(values),
        "median": float(np.median(values)),
        "iqr": calculate_iqr(values),
        "mean_abs": float(np.mean(np.abs(values))),
        "zero_crossings": calculate_zero_crossings(values),
        "diff_mean_abs": float(np.mean(np.abs(differences))),
        "diff_std": float(np.std(differences)),
        "diff_rms": calculate_rms(differences),
    }


def extract_segment_features(segment_data, fs):
    # Extrage cele 112 trasaturi dintr-un segment de semnal
    segment_data = np.asarray(segment_data, dtype=float)

    if segment_data.ndim != 2:
        raise ValueError("Segmentul trebuie sa fie o matrice 2D.")

    if segment_data.shape[1] != 6:
        raise ValueError("Segmentul trebuie sa aiba 6 coloane: acc_x, acc_y, acc_z, gyr_x, gyr_y, gyr_z.")

    if len(segment_data) < 2:
        raise ValueError("Segmentul contine prea putine esantioane.")

    if not np.isfinite(segment_data).all():
        raise ValueError("Segmentul contine valori invalide.")

    features = []

    acc = segment_data[:, 0:3]
    gyr = segment_data[:, 3:6]

    for column_index in range(len(SIGNAL_COLUMNS)):
        values = segment_data[:, column_index]
        statistics = calculate_vector_statistics(values)

        for statistic_name in PER_AXIS_FEATURE_STATISTICS:
            features.append(statistics[statistic_name])

    duration_seconds = len(segment_data) / fs

    acc_energy = np.mean(np.sum(acc ** 2, axis=1))
    gyr_energy = np.mean(np.sum(gyr ** 2, axis=1))

    features.extend([
        float(duration_seconds),
        float(acc_energy),
        float(gyr_energy),
    ])

    acc_magnitude = np.linalg.norm(acc, axis=1)
    gyr_magnitude = np.linalg.norm(gyr, axis=1)

    acc_magnitude_statistics = calculate_vector_statistics(acc_magnitude)
    gyr_magnitude_statistics = calculate_vector_statistics(gyr_magnitude)

    for statistic_name in MAGNITUDE_FEATURE_STATISTICS:
        features.append(acc_magnitude_statistics[statistic_name])

    for statistic_name in MAGNITUDE_FEATURE_STATISTICS:
        features.append(gyr_magnitude_statistics[statistic_name])

    acc_jerk = np.diff(acc, axis=0) * fs
    gyr_jerk = np.diff(gyr, axis=0) * fs

    if len(acc_jerk) == 0:
        acc_jerk = np.zeros((1, 3), dtype=float)

    if len(gyr_jerk) == 0:
        gyr_jerk = np.zeros((1, 3), dtype=float)

    acc_jerk_magnitude = np.linalg.norm(acc_jerk, axis=1)
    gyr_jerk_magnitude = np.linalg.norm(gyr_jerk, axis=1)

    acc_jerk_statistics = calculate_vector_statistics(acc_jerk_magnitude)
    gyr_jerk_statistics = calculate_vector_statistics(gyr_jerk_magnitude)

    for statistic_name in JERK_FEATURE_STATISTICS:
        features.append(acc_jerk_statistics[statistic_name])

    for statistic_name in JERK_FEATURE_STATISTICS:
        features.append(gyr_jerk_statistics[statistic_name])

    features.extend([
        calculate_correlation(acc[:, 0], acc[:, 1]),
        calculate_correlation(acc[:, 0], acc[:, 2]),
        calculate_correlation(acc[:, 1], acc[:, 2]),
        calculate_correlation(gyr[:, 0], gyr[:, 1]),
        calculate_correlation(gyr[:, 0], gyr[:, 2]),
        calculate_correlation(gyr[:, 1], gyr[:, 2]),
        calculate_correlation(acc[:, 0], gyr[:, 0]),
        calculate_correlation(acc[:, 1], gyr[:, 1]),
        calculate_correlation(acc[:, 2], gyr[:, 2]),
    ])

    result = np.asarray(features, dtype=float)

    if len(result) != len(FEATURE_NAMES):
        raise ValueError(
            f"Au fost extrase {len(result)} trasaturi, dar modelul asteapta {len(FEATURE_NAMES)}."
        )

    if not np.isfinite(result).all():
        raise ValueError("Trasaturile contin valori invalide.")

    return result