# PARTEA 1 - Importuri, configurare generala, feature-uri si incarcare modele

from pathlib import Path
import json
import time

import joblib
import numpy as np
import pandas as pd
import serial
import serial.tools.list_ports
import streamlit as st

from scipy.signal import find_peaks


# ==========================================================
# CONFIGURARE PAGINA STREAMLIT
# ==========================================================

st.set_page_config(
    page_title="Kinetoterapie BNO055",
    page_icon="🏃",
    layout="wide",
)


# ==========================================================
# VERIFICARE VERSIUNE STREAMLIT
# ==========================================================

if not hasattr(st, "fragment"):
    st.error(
        "Versiunea Streamlit este prea veche. "
        "Ruleaza: pip install --upgrade streamlit"
    )
    st.stop()


# ==========================================================
# CONFIGURARE GENERALA
# ==========================================================

FS = 25
BAUD_RATE = 115200
SERIAL_TIMEOUT = 0.05

NUMAR_ESANTIOANE_CALIBRARE_STABILA = FS
NUMAR_MAXIM_ESANTIOANE_CITITE = 250
NUMAR_MINIM_ESANTIOANE_EXECUTIE = FS

INTERVAL_ACTUALIZARE_CALIBRARE = "200ms"
INTERVAL_ACTUALIZARE_EXECUTIE = "200ms"


# ==========================================================
# CONFIGURARE DETECTARE REPETARI
# ==========================================================

FEREASTRA_NETEZIRE = 5

DISTANTA_MINIMA_VARF = int(
    0.30 * FS
)

FACTOR_PROMINENTA_VARF = 0.05
PROMINENTA_MINIMA_VARF = 1e-8

# CONFIGURARE LIVE COUNT MAI STABILA
# Acesti parametri sunt folositi doar pentru afisarea live a repetarilor

FACTOR_PROMINENTA_VARF_LIVE = 0.12

DISTANTA_MINIMA_VARF_LIVE = int(
    0.45 * FS
)

ESANTIOANE_CONFIRMATE_LIVE = int(
    0.50 * FS
)


VARFURI_PENTRU_REPETARE = 2

MARGINE_SEGMENT_REPETARE = int(
    0.80 * FS
)

DURATA_MINIMA_REPETARE = int(
    0.50 * FS
)

# CONFIGURARE FILTRARE SEGMENTE IN FUNCTIE DE EXERCITIU
# Pentru e6 relaxam filtrarea, deoarece in testele live pierde repetari reale.

DURATA_MINIMA_REPETARE_FINALA_PE_EXERCITIU = {
    6: int(1.50 * FS),
    7: int(1.80 * FS),
    8: DURATA_MINIMA_REPETARE,
}

FILTRARE_SUPRAPUNERE_PE_EXERCITIU = {
    6: False,
    7: False,
    8: False,
}

# CONFIGURARE DETECTARE LIVE PE FIECARE EXERCITIU
# e6 si e7 sunt setate mai permisiv pentru a nu pierde repetari reale.
# e8 ramane mai strict, deoarece poate produce varfuri suplimentare.

FACTOR_PROMINENTA_VARF_LIVE_PE_EXERCITIU = {
    6: 0.05,
    7: 0.07,
    8: 0.12,
}

DISTANTA_MINIMA_VARF_LIVE_PE_EXERCITIU = {
    6: int(0.25 * FS),
    7: int(0.28 * FS),
    8: int(0.45 * FS),
}

ESANTIOANE_CONFIRMATE_LIVE_PE_EXERCITIU = {
    6: int(0.25 * FS),
    7: int(0.30 * FS),
    8: int(0.50 * FS),
}


# ==========================================================
# COLOANE FOLOSITE DE MODELE
# ==========================================================

SIGNAL_COLUMNS = [
    "acc_x",
    "acc_y",
    "acc_z",
    "gyr_x",
    "gyr_y",
    "gyr_z",
]


# ==========================================================
# FEATURE-URI FOLOSITE DE MODELELE NOI
# ==========================================================

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

for coloana in SIGNAL_COLUMNS:
    for statistica in PER_AXIS_FEATURE_STATISTICS:
        FEATURE_NAMES.append(
            f"{coloana}_{statistica}"
        )

FEATURE_NAMES.extend([
    "duration_seconds",
    "acc_energy",
    "gyr_energy",
])

for prefix in ["acc", "gyr"]:
    for statistica in MAGNITUDE_FEATURE_STATISTICS:
        FEATURE_NAMES.append(
            f"{prefix}_magnitude_{statistica}"
        )

for prefix in ["acc", "gyr"]:
    for statistica in JERK_FEATURE_STATISTICS:
        FEATURE_NAMES.append(
            f"{prefix}_jerk_{statistica}"
        )

FEATURE_NAMES.extend(
    CORRELATION_FEATURES
)


# ==========================================================
# DENUMIRI EXERCITII SI CALITATI
# ==========================================================

EXERCISE_NAMES = {
    6: "Exercițiul 6",
    7: "Exercițiul 7",
    8: "Exercițiul 8",
}

QUALITY_NAMES = {
    1: "Normal",
    2: "Rapid",
    3: "Amplitudine mică",
}


# ==========================================================
# INITIALIZARE SESSION STATE
# ==========================================================

def initialize_session_state():
    valori_initiale = {
        "models_loaded": False,
        "model_exercise": None,
        "quality_models": None,
        "gui_config": None,

        "serial_connection": None,
        "esp_connected": False,
        "connected_port": None,

        "calibration_running": False,
        "sensor_calibrated": False,
        "calibration_stable_samples": 0,
        "calibration_status": {
            "SYS": 0,
            "ACC": 0,
            "GYR": 0,
            "MAG": 0,
        },
        "calibration_saved": False,
        "calibration_message": "",
        "calibration_message_type": "info",
        "calibration_restart_needed": False,

        "execution_running": False,
        "execution_start_time": None,
        "execution_stop_time": None,
        "execution_signal": [],
        "execution_orientation": [],
        "execution_ready_to_process": False,

        "live_repetition_count": 0,
        "live_peak_count": 0,
        "final_repetition_count": 0,
        "repetition_results": [],
        "segmentation_information": None,

        "selected_exercise": 6,
        "last_prediction": None,
        "exercise_history": [],

        "unwrap_orientation": True,
    }

    for cheie, valoare in valori_initiale.items():
        if cheie not in st.session_state:
            st.session_state[cheie] = valoare


initialize_session_state()


# ==========================================================
# INCARCARE MODELE STANDARD PENTRU GUI
# ==========================================================

@st.cache_resource(show_spinner=False)
def load_models(
    models_root_text,
):
    models_root = Path(
        models_root_text
    )

    model_paths = {
        "exercise": (
            models_root
            / "identificare_exercitii"
            / "model_identificare_exercitii.joblib"
        ),
        6: (
            models_root
            / "calitate_e6"
            / "model_calitate_e6.joblib"
        ),
        7: (
            models_root
            / "calitate_e7"
            / "model_calitate_e7.joblib"
        ),
        8: (
            models_root
            / "calitate_e8"
            / "model_calitate_e8.joblib"
        ),
    }

    gui_config_path = (
        models_root
        / "gui_config.json"
    )

    fisiere_lipsa = []

    for cale_model in model_paths.values():
        if not cale_model.exists():
            fisiere_lipsa.append(
                str(cale_model)
            )

    if not gui_config_path.exists():
        fisiere_lipsa.append(
            str(gui_config_path)
        )

    if fisiere_lipsa:
        mesaj = (
            "Nu au fost gasite urmatoarele fisiere:\n\n"
            + "\n".join(
                fisiere_lipsa
            )
        )

        raise FileNotFoundError(
            mesaj
        )

    with open(
        gui_config_path,
        "r",
        encoding="utf-8",
    ) as file:
        gui_config = json.load(
            file
        )

    model_exercise = joblib.load(
        model_paths["exercise"]
    )

    quality_models = {
        6: joblib.load(
            model_paths[6]
        ),
        7: joblib.load(
            model_paths[7]
        ),
        8: joblib.load(
            model_paths[8]
        ),
    }

    modele_de_verificat = [
        model_exercise,
        quality_models[6],
        quality_models[7],
        quality_models[8],
    ]

    for model in modele_de_verificat:
        if hasattr(
            model,
            "n_features_in_",
        ):
            if (
                model.n_features_in_
                != len(FEATURE_NAMES)
            ):
                raise ValueError(
                    "Un model asteapta "
                    f"{model.n_features_in_} trasaturi, "
                    f"dar aplicatia genereaza "
                    f"{len(FEATURE_NAMES)} trasaturi."
                )

    return (
        model_exercise,
        quality_models,
        gui_config,
    )


# ==========================================================
# TABEL INFORMATII MODELE
# ==========================================================

def get_model_info(
    model_exercise,
    quality_models,
    gui_config=None,
):
    randuri = [
        {
            "Model": "Identificare exercițiu",
            "Clase": list(
                model_exercise.classes_
            ),
            "Clasificator selectat": (
                gui_config.get(
                    "selected_models",
                    {},
                ).get(
                    "identificare_exercitii",
                    "-"
                )
                if gui_config is not None
                else "-"
            ),
        }
    ]

    for exercise_label in [6, 7, 8]:
        task_name = f"calitate_e{exercise_label}"

        randuri.append({
            "Model": (
                "Calitate "
                + EXERCISE_NAMES[
                    exercise_label
                ]
            ),
            "Clase": list(
                quality_models[
                    exercise_label
                ].classes_
            ),
            "Clasificator selectat": (
                gui_config.get(
                    "selected_models",
                    {},
                ).get(
                    task_name,
                    "-"
                )
                if gui_config is not None
                else "-"
            ),
        })

    return pd.DataFrame(
        randuri
    )


# PARTEA 2 - Functii seriale, calibrare ESP32 si citire BNO055


# ==========================================================
# CAUTARE PORTURI SERIALE DISPONIBILE
# ==========================================================

def gaseste_porturi_seriale():
    return list(
        serial.tools.list_ports.comports()
    )


# ==========================================================
# VERIFICARE CONEXIUNE SERIALA
# ==========================================================

def conexiune_este_deschisa():
    conexiune = st.session_state.get(
        "serial_connection"
    )

    return (
        conexiune is not None
        and conexiune.is_open
    )


# ==========================================================
# RESETARE STARI DEPENDENTE DE CONEXIUNEA SERIALA
# ==========================================================

def reseteaza_stari_seriale():
    st.session_state[
        "calibration_running"
    ] = False

    st.session_state[
        "sensor_calibrated"
    ] = False

    st.session_state[
        "calibration_stable_samples"
    ] = 0

    st.session_state[
        "calibration_status"
    ] = {
        "SYS": 0,
        "ACC": 0,
        "GYR": 0,
        "MAG": 0,
    }

    st.session_state[
        "calibration_saved"
    ] = False

    st.session_state[
        "calibration_message"
    ] = ""

    st.session_state[
        "calibration_message_type"
    ] = "info"

    st.session_state[
        "calibration_restart_needed"
    ] = False

    st.session_state[
        "execution_running"
    ] = False

    st.session_state[
        "execution_ready_to_process"
    ] = False


# ==========================================================
# INCHIDERE CONEXIUNE SERIALA
# ==========================================================

def inchide_conexiunea_seriala():
    conexiune = st.session_state.get(
        "serial_connection"
    )

    if conexiune is not None:
        try:
            if conexiune.is_open:
                conexiune.close()

        except serial.SerialException:
            pass

    st.session_state[
        "serial_connection"
    ] = None

    st.session_state[
        "esp_connected"
    ] = False

    st.session_state[
        "connected_port"
    ] = None

    reseteaza_stari_seriale()


# ==========================================================
# SETARE MESAJ CALIBRARE
# ==========================================================

def seteaza_mesaj_calibrare(
    mesaj,
    tip="info",
):
    st.session_state[
        "calibration_message"
    ] = mesaj

    st.session_state[
        "calibration_message_type"
    ] = tip


# ==========================================================
# TRIMITERE COMANDA CATRE ESP32
# ==========================================================

# TRIMITERE COMANDA CATRE ESP32 CU REINCERCARI
# Aceasta varianta este mai stabila dupa refresh/reconectare Streamlit

def trimite_comanda_esp32(
    comanda,
    prefix_raspuns,
    timeout_secunde=5.0,
    numar_incercari=3,
):
    if not conexiune_este_deschisa():
        raise serial.SerialException(
            "Conexiunea seriala nu este deschisa."
        )

    conexiune = st.session_state[
        "serial_connection"
    ]

    for incercare in range(
        numar_incercari
    ):
        try:
            conexiune.reset_input_buffer()
            conexiune.reset_output_buffer()

        except serial.SerialException:
            raise

        time.sleep(
            0.2
        )

        mesaj = f"{comanda}\n".encode(
            "utf-8"
        )

        conexiune.write(
            mesaj
        )

        conexiune.flush()

        timp_start = time.time()

        while (
            time.time() - timp_start
            < timeout_secunde
        ):
            linie = conexiune.readline().decode(
                "utf-8",
                errors="ignore",
            ).strip()

            if not linie:
                continue

            if linie.startswith(
                prefix_raspuns
            ):
                return linie

        time.sleep(
            0.5
        )

    raise TimeoutError(
        "ESP32 nu a raspuns la comanda "
        f"{comanda} dupa {numar_incercari} incercari."
    )


# ==========================================================
# PARSARE RASPUNS GET_CAL
# ==========================================================

def parseaza_raspuns_get_cal(
    linie,
):
    parti = linie.strip().split(
        ";"
    )

    if (
        len(parti) != 6
        or parti[0] != "CAL"
    ):
        return None

    try:
        return {
            "SYS": int(parti[1]),
            "ACC": int(parti[2]),
            "GYR": int(parti[3]),
            "MAG": int(parti[4]),
            "saved": bool(
                int(parti[5])
            ),
        }

    except ValueError:
        return None


# ==========================================================
# CITIRE PROFIL CALIBRARE DIN ESP32
# ==========================================================

def actualizeaza_profil_calibrare_esp32():
    raspuns = trimite_comanda_esp32(
        "GET_CAL",
        "CAL;",
    )

    stare = parseaza_raspuns_get_cal(
        raspuns
    )

    if stare is None:
        raise ValueError(
            "Raspuns GET_CAL invalid: "
            f"{raspuns}"
        )

    st.session_state[
        "calibration_status"
    ] = {
        "SYS": stare["SYS"],
        "ACC": stare["ACC"],
        "GYR": stare["GYR"],
        "MAG": stare["MAG"],
    }

    st.session_state[
        "calibration_saved"
    ] = stare["saved"]

    calibrare_completa = all(
        stare[cheie] == 3
        for cheie in (
            "SYS",
            "ACC",
            "GYR",
            "MAG",
        )
    )

    # Daca exista profil salvat in NVM, permitem folosirea sistemului
    # chiar daca valorile SYS/ACC/GYR/MAG nu sunt inca toate 3 dupa restart.

    calibrare_utilizabila = (
            calibrare_completa
            or stare[
                "saved"
            ]
    )

    st.session_state[
        "sensor_calibrated"
    ] = calibrare_utilizabila

    st.session_state[
        "calibration_stable_samples"
    ] = (
        NUMAR_ESANTIOANE_CALIBRARE_STABILA
        if calibrare_completa
        else 0
    )



# ==========================================================
# CONECTARE ESP32
# ==========================================================

def conecteaza_esp32(
    port_selectat,
):
    inchide_conexiunea_seriala()

    conexiune = serial.Serial(
        port=port_selectat,
        baudrate=BAUD_RATE,
        timeout=SERIAL_TIMEOUT,
    )

    # Asteptam resetarea si initializarea ESP32
    # Dupa deschiderea portului, ESP32 poate avea nevoie de cateva secunde

    time.sleep(
        4
    )

    conexiune.reset_input_buffer()
    conexiune.reset_output_buffer()

    time.sleep(
        0.5
    )


    st.session_state[
        "serial_connection"
    ] = conexiune

    st.session_state[
        "esp_connected"
    ] = True

    st.session_state[
        "connected_port"
    ] = port_selectat

    reseteaza_stari_seriale()

    try:
        actualizeaza_profil_calibrare_esp32()

        if st.session_state[
            "calibration_saved"
        ]:
            seteaza_mesaj_calibrare(
                "Profilul de calibrare salvat a fost detectat "
                "in memoria ESP32.",
                "success",
            )
        else:
            seteaza_mesaj_calibrare(
                "Nu exista un profil de calibrare salvat. "
                "Calibreaza senzorul si apoi apasa Salvare.",
                "info",
            )

    except (
        serial.SerialException,
        TimeoutError,
        ValueError,
    ) as eroare:
        seteaza_mesaj_calibrare(
            "ESP32 este conectat, dar starea calibrarii "
            f"nu a putut fi citita: {eroare}",
            "warning",
        )


# ==========================================================
# PARSARE LINIE BNO055 CU 17 CAMPURI
# ==========================================================

def parseaza_linie_bno055(
    linie,
):
    """
    Format asteptat de la Arduino:

    acc_x;acc_y;acc_z;
    gyr_x;gyr_y;gyr_z;
    mag_x;mag_y;mag_z;
    quat_w;quat_x;quat_y;quat_z;
    cal_sys;cal_acc;cal_gyr;cal_mag
    """

    parti = linie.strip().split(
        ";"
    )

    if len(parti) != 17:
        return None

    try:
        valori = np.asarray(
            [
                float(valoare)
                for valoare in parti
            ],
            dtype=float,
        )

    except ValueError:
        return None

    if not np.isfinite(
        valori
    ).all():
        return None

    return {
        "acc": valori[0:3],
        "gyr": valori[3:6],
        "mag": valori[6:9],
        "quat": valori[9:13],

        "cal_sys": int(
            valori[13]
        ),
        "cal_acc": int(
            valori[14]
        ),
        "cal_gyr": int(
            valori[15]
        ),
        "cal_mag": int(
            valori[16]
        ),

        "linie": linie,
    }


# ==========================================================
# CITIRE ESANTIOANE DISPONIBILE DIN BUFFER
# ==========================================================

def citeste_esantioane_disponibile(
    numar_maxim=NUMAR_MAXIM_ESANTIOANE_CITITE,
):
    conexiune = st.session_state.get(
        "serial_connection"
    )

    if (
        conexiune is None
        or not conexiune.is_open
    ):
        return []

    esantioane = []

    try:
        while (
            conexiune.in_waiting > 0
            and len(esantioane)
            < numar_maxim
        ):
            linie = conexiune.readline().decode(
                "utf-8",
                errors="ignore",
            ).strip()

            if not linie:
                continue

            esantion = parseaza_linie_bno055(
                linie
            )

            if esantion is not None:
                esantioane.append(
                    esantion
                )

    except serial.SerialException:
        inchide_conexiunea_seriala()

    return esantioane


# ==========================================================
# CITIRE UN SINGUR ESANTION VALID
# ==========================================================

def citeste_un_esantion_valid(
    timeout_secunde=3,
):
    conexiune = st.session_state.get(
        "serial_connection"
    )

    if (
        conexiune is None
        or not conexiune.is_open
    ):
        return None

    timp_start = time.time()

    while (
        time.time() - timp_start
        < timeout_secunde
    ):
        try:
            linie = conexiune.readline().decode(
                "utf-8",
                errors="ignore",
            ).strip()

        except serial.SerialException:
            return None

        if not linie:
            continue

        esantion = parseaza_linie_bno055(
            linie
        )

        if esantion is not None:
            return esantion

    return None


# ==========================================================
# CONVERSIE QUATERNION IN ROLL PITCH YAW
# ==========================================================

def quaternion_to_euler_degrees(
    quaternion,
):
    quaternion = np.asarray(
        quaternion,
        dtype=float,
    )

    qw, qx, qy, qz = quaternion

    norma = np.linalg.norm(
        quaternion
    )

    if norma < 1e-10:
        return (
            0.0,
            0.0,
            0.0,
        )

    qw = qw / norma
    qx = qx / norma
    qy = qy / norma
    qz = qz / norma

    sin_roll = 2.0 * (
        qw * qx
        + qy * qz
    )

    cos_roll = 1.0 - 2.0 * (
        qx * qx
        + qy * qy
    )

    roll = np.arctan2(
        sin_roll,
        cos_roll,
    )

    sin_pitch = 2.0 * (
        qw * qy
        - qz * qx
    )

    sin_pitch = np.clip(
        sin_pitch,
        -1.0,
        1.0,
    )

    pitch = np.arcsin(
        sin_pitch
    )

    sin_yaw = 2.0 * (
        qw * qz
        + qx * qy
    )

    cos_yaw = 1.0 - 2.0 * (
        qy * qy
        + qz * qz
    )

    yaw = np.arctan2(
        sin_yaw,
        cos_yaw,
    )

    return (
        float(
            np.degrees(
                roll
            )
        ),
        float(
            np.degrees(
                pitch
            )
        ),
        float(
            np.degrees(
                yaw
            )
        ),
    )


# ==========================================================
# VERIFICARE CALIBRARE COMPLETA BNO055
# ==========================================================

def calibrare_bno055_completa(
    esantion,
):
    return (
        esantion["cal_sys"] == 3
        and esantion["cal_acc"] == 3
        and esantion["cal_gyr"] == 3
        and esantion["cal_mag"] == 3
    )

# VERIFICARE DACA SISTEMUL ARE CALIBRARE UTILIZABILA
# Permite executia daca senzorul este calibrat acum sau daca exista profil salvat in NVM

def sistem_are_calibrare_utilizabila():
    return (
        st.session_state[
            "sensor_calibrated"
        ]
        or st.session_state[
            "calibration_saved"
        ]
    )



# PARTEA 3 - Extragerea celor 112 trasaturi pentru modelele noi


# ==========================================================
# CALCUL RMS
# ==========================================================

def calculeaza_rms(
    valori,
):
    valori = np.asarray(
        valori,
        dtype=float,
    )

    return float(
        np.sqrt(
            np.mean(
                valori ** 2
            )
        )
    )


# ==========================================================
# CALCUL IQR
# ==========================================================

def calculeaza_iqr(
    valori,
):
    valori = np.asarray(
        valori,
        dtype=float,
    )

    q75 = np.percentile(
        valori,
        75,
    )

    q25 = np.percentile(
        valori,
        25,
    )

    return float(
        q75 - q25
    )


# ==========================================================
# CALCUL ZERO CROSSINGS
# ==========================================================

def calculeaza_zero_crossings(
    valori,
):
    valori = np.asarray(
        valori,
        dtype=float,
    )

    if len(valori) < 2:
        return 0.0

    semne = np.sign(
        valori
    )

    treceri = np.where(
        np.diff(
            semne
        ) != 0
    )[0]

    return float(
        len(
            treceri
        )
    )


# ==========================================================
# CALCUL CORELATIE
# ==========================================================

def calculeaza_corelatie(
    x,
    y,
):
    x = np.asarray(
        x,
        dtype=float,
    )

    y = np.asarray(
        y,
        dtype=float,
    )

    if (
        len(x) < 2
        or len(y) < 2
    ):
        return 0.0

    if (
        np.std(x) < 1e-12
        or np.std(y) < 1e-12
    ):
        return 0.0

    corelatie = np.corrcoef(
        x,
        y,
    )[0, 1]

    if not np.isfinite(
        corelatie
    ):
        return 0.0

    return float(
        corelatie
    )


# ==========================================================
# CALCUL STATISTICI PENTRU UN VECTOR
# ==========================================================

def calculeaza_statistici_vector(
    valori,
):
    valori = np.asarray(
        valori,
        dtype=float,
    )

    diferente = np.diff(
        valori
    )

    if len(diferente) == 0:
        diferente = np.asarray(
            [0.0],
            dtype=float,
        )

    minim = np.min(
        valori
    )

    maxim = np.max(
        valori
    )

    statistici = {
        "mean": float(
            np.mean(
                valori
            )
        ),
        "std": float(
            np.std(
                valori
            )
        ),
        "min": float(
            minim
        ),
        "max": float(
            maxim
        ),
        "range": float(
            maxim - minim
        ),
        "rms": calculeaza_rms(
            valori
        ),
        "median": float(
            np.median(
                valori
            )
        ),
        "iqr": calculeaza_iqr(
            valori
        ),
        "mean_abs": float(
            np.mean(
                np.abs(
                    valori
                )
            )
        ),
        "zero_crossings": calculeaza_zero_crossings(
            valori
        ),
        "diff_mean_abs": float(
            np.mean(
                np.abs(
                    diferente
                )
            )
        ),
        "diff_std": float(
            np.std(
                diferente
            )
        ),
        "diff_rms": calculeaza_rms(
            diferente
        ),
    }

    return statistici


# ==========================================================
# EXTRAGERE FEATURE-URI DINTR-UN SEGMENT
# ==========================================================

def extrage_trasaturi_segment(
    date_segment,
    fs=None,
):
    if fs is None:
        fs = FS

    date_segment = np.asarray(
        date_segment,
        dtype=float,
    )

    if date_segment.ndim != 2:
        raise ValueError(
            "Segmentul trebuie sa fie o matrice 2D."
        )

    if date_segment.shape[1] != 6:
        raise ValueError(
            "Segmentul trebuie sa aiba sase coloane: "
            "acc_x, acc_y, acc_z, gyr_x, gyr_y, gyr_z."
        )

    if len(date_segment) < 2:
        raise ValueError(
            "Segmentul contine prea putine esantioane."
        )

    if not np.isfinite(
        date_segment
    ).all():
        raise ValueError(
            "Segmentul contine valori invalide."
        )

    trasaturi = []

    acc = date_segment[
        :,
        0:3,
    ]

    gyr = date_segment[
        :,
        3:6,
    ]

    # Statistici pe fiecare axa acc si gyr
    for index_coloana in range(
        len(
            SIGNAL_COLUMNS
        )
    ):
        valori = date_segment[
            :,
            index_coloana,
        ]

        statistici = calculeaza_statistici_vector(
            valori
        )

        for nume_statistica in PER_AXIS_FEATURE_STATISTICS:
            trasaturi.append(
                statistici[
                    nume_statistica
                ]
            )

    # Durata segmentului
    durata = (
        len(date_segment)
        / fs
    )

    # Energie acc si gyr
    energie_acc = np.mean(
        np.sum(
            acc ** 2,
            axis=1,
        )
    )

    energie_gyr = np.mean(
        np.sum(
            gyr ** 2,
            axis=1,
        )
    )

    trasaturi.extend([
        float(
            durata
        ),
        float(
            energie_acc
        ),
        float(
            energie_gyr
        ),
    ])

    # Magnitudine acc si gyr
    magnitudine_acc = np.linalg.norm(
        acc,
        axis=1,
    )

    magnitudine_gyr = np.linalg.norm(
        gyr,
        axis=1,
    )

    statistici_magnitudine_acc = calculeaza_statistici_vector(
        magnitudine_acc
    )

    statistici_magnitudine_gyr = calculeaza_statistici_vector(
        magnitudine_gyr
    )

    for nume_statistica in MAGNITUDE_FEATURE_STATISTICS:
        trasaturi.append(
            statistici_magnitudine_acc[
                nume_statistica
            ]
        )

    for nume_statistica in MAGNITUDE_FEATURE_STATISTICS:
        trasaturi.append(
            statistici_magnitudine_gyr[
                nume_statistica
            ]
        )

    # Jerk acc si gyr
    jerk_acc = np.diff(
        acc,
        axis=0,
    ) * fs

    jerk_gyr = np.diff(
        gyr,
        axis=0,
    ) * fs

    if len(jerk_acc) == 0:
        jerk_acc = np.zeros(
            (1, 3),
            dtype=float,
        )

    if len(jerk_gyr) == 0:
        jerk_gyr = np.zeros(
            (1, 3),
            dtype=float,
        )

    magnitudine_jerk_acc = np.linalg.norm(
        jerk_acc,
        axis=1,
    )

    magnitudine_jerk_gyr = np.linalg.norm(
        jerk_gyr,
        axis=1,
    )

    statistici_jerk_acc = calculeaza_statistici_vector(
        magnitudine_jerk_acc
    )

    statistici_jerk_gyr = calculeaza_statistici_vector(
        magnitudine_jerk_gyr
    )

    for nume_statistica in JERK_FEATURE_STATISTICS:
        trasaturi.append(
            statistici_jerk_acc[
                nume_statistica
            ]
        )

    for nume_statistica in JERK_FEATURE_STATISTICS:
        trasaturi.append(
            statistici_jerk_gyr[
                nume_statistica
            ]
        )

    # Corelatii intre axe si intre acc/gyr pe aceeasi axa
    trasaturi.extend([
        calculeaza_corelatie(
            acc[:, 0],
            acc[:, 1],
        ),
        calculeaza_corelatie(
            acc[:, 0],
            acc[:, 2],
        ),
        calculeaza_corelatie(
            acc[:, 1],
            acc[:, 2],
        ),
        calculeaza_corelatie(
            gyr[:, 0],
            gyr[:, 1],
        ),
        calculeaza_corelatie(
            gyr[:, 0],
            gyr[:, 2],
        ),
        calculeaza_corelatie(
            gyr[:, 1],
            gyr[:, 2],
        ),
        calculeaza_corelatie(
            acc[:, 0],
            gyr[:, 0],
        ),
        calculeaza_corelatie(
            acc[:, 1],
            gyr[:, 1],
        ),
        calculeaza_corelatie(
            acc[:, 2],
            gyr[:, 2],
        ),
    ])

    rezultat = np.asarray(
        trasaturi,
        dtype=float,
    )

    if len(rezultat) != len(FEATURE_NAMES):
        raise ValueError(
            f"Au fost extrase {len(rezultat)} trasaturi, "
            f"dar modelele asteapta {len(FEATURE_NAMES)}."
        )

    if not np.isfinite(
        rezultat
    ).all():
        raise ValueError(
            "Trasaturile contin valori invalide."
        )

    return rezultat



# PARTEA 4 - Detectarea miscarii, numararea repetarilor si segmentarea executiilor


# ==========================================================
# CALCUL SEMNAL FOLOSIT PENTRU DETECTAREA MISCARII
# ==========================================================

def calculeaza_semnal_miscare(
    date_segment,
):
    date_segment = np.asarray(
        date_segment,
        dtype=float,
    )

    if (
        date_segment.ndim != 2
        or date_segment.shape[1] != 6
    ):
        return np.asarray(
            [],
            dtype=float,
        )

    if len(date_segment) == 0:
        return np.asarray(
            [],
            dtype=float,
        )

    gyr = date_segment[
        :,
        3:6,
    ]

    magnitudine_gyr = np.linalg.norm(
        gyr,
        axis=1,
    )

    dimensiune_fereastra = min(
        FEREASTRA_NETEZIRE,
        len(
            magnitudine_gyr
        ),
    )

    if dimensiune_fereastra < 2:
        return magnitudine_gyr

    nucleu = (
        np.ones(
            dimensiune_fereastra,
            dtype=float,
        )
        / dimensiune_fereastra
    )

    semnal_netezit = np.convolve(
        magnitudine_gyr,
        nucleu,
        mode="same",
    )

    return semnal_netezit


# ==========================================================
# DETECTARE VARFURI IMPORTANTE ALE MISCARII
# ==========================================================

def detecteaza_varfuri_repetitii(
    date_segment,
):
    semnal_miscare = calculeaza_semnal_miscare(
        date_segment
    )

    if len(semnal_miscare) < FS:
        return (
            np.asarray(
                [],
                dtype=int,
            ),
            semnal_miscare,
            PROMINENTA_MINIMA_VARF,
        )

    percentila_95 = np.percentile(
        semnal_miscare,
        95,
    )

    percentila_20 = np.percentile(
        semnal_miscare,
        20,
    )

    amplitudine_semnal = (
        percentila_95
        - percentila_20
    )

    prag_prominenta = max(
        amplitudine_semnal
        * FACTOR_PROMINENTA_VARF,
        PROMINENTA_MINIMA_VARF,
    )

    varfuri, _ = find_peaks(
        semnal_miscare,
        distance=DISTANTA_MINIMA_VARF,
        prominence=prag_prominenta,
    )

    return (
        varfuri,
        semnal_miscare,
        prag_prominenta,
    )


# ==========================================================
# NUMARARE REPETARI DINTR-UN SEMNAL
# ==========================================================

def numara_repetitii(
    date_segment,
):
    (
        varfuri,
        semnal_miscare,
        prag_prominenta,
    ) = detecteaza_varfuri_repetitii(
        date_segment
    )

    numar_repetitii = (
        len(varfuri)
        // VARFURI_PENTRU_REPETARE
    )

    return {
        "repetition_count": int(
            numar_repetitii
        ),
        "peak_count": int(
            len(varfuri)
        ),
        "peaks": varfuri,
        "motion_signal": semnal_miscare,
        "prominence": float(
            prag_prominenta
        ),
    }

# NUMARARE REPETARI LIVE MAI STABILA
# Aceasta functie evita numararea varfurilor foarte recente

# NUMARARE REPETARI LIVE CU PARAMETRI DIFERITI PE EXERCITIU
# Folosim exercitiul selectat pentru a adapta sensibilitatea detectiei.

def numara_repetitii_live(
    date_segment,
):
    semnal_miscare = calculeaza_semnal_miscare(
        date_segment
    )

    if len(semnal_miscare) < FS:
        return {
            "repetition_count": 0,
            "peak_count": 0,
            "peaks": np.asarray(
                [],
                dtype=int,
            ),
            "motion_signal": semnal_miscare,
            "prominence": PROMINENTA_MINIMA_VARF,
        }

    exercitiu_selectat = int(
        st.session_state.get(
            "selected_exercise",
            6,
        )
    )

    factor_prominenta = FACTOR_PROMINENTA_VARF_LIVE_PE_EXERCITIU.get(
        exercitiu_selectat,
        0.10,
    )

    distanta_minima_varf = DISTANTA_MINIMA_VARF_LIVE_PE_EXERCITIU.get(
        exercitiu_selectat,
        int(0.35 * FS),
    )

    esantioane_confirmate = ESANTIOANE_CONFIRMATE_LIVE_PE_EXERCITIU.get(
        exercitiu_selectat,
        int(0.40 * FS),
    )

    percentila_95 = np.percentile(
        semnal_miscare,
        95,
    )

    percentila_20 = np.percentile(
        semnal_miscare,
        20,
    )

    amplitudine_semnal = (
        percentila_95
        - percentila_20
    )

    prag_prominenta = max(
        amplitudine_semnal
        * factor_prominenta,
        PROMINENTA_MINIMA_VARF,
    )

    varfuri, _ = find_peaks(
        semnal_miscare,
        distance=distanta_minima_varf,
        prominence=prag_prominenta,
    )

    limita_confirmare = max(
        0,
        len(semnal_miscare)
        - esantioane_confirmate,
    )

    varfuri_confirmate = varfuri[
        varfuri < limita_confirmare
    ]

    numar_repetitii = (
        len(varfuri_confirmate)
        // VARFURI_PENTRU_REPETARE
    )

    return {
        "repetition_count": int(
            numar_repetitii
        ),
        "peak_count": int(
            len(varfuri_confirmate)
        ),
        "peaks": varfuri_confirmate,
        "motion_signal": semnal_miscare,
        "prominence": float(
            prag_prominenta
        ),
    }


# ==========================================================
# SEGMENTARE SESIUNE IN REPETARI INDIVIDUALE
# ==========================================================


# Filtram segmentele prea scurte pentru a evita repetari false

# SEGMENTARE SESIUNE IN REPETARI INDIVIDUALE
# Varianta stabila pentru GUI: fiecare pereche de doua varfuri devine o executie.
# Nu mai eliminam executii pe baza duratei, deoarece la e8 unele segmente pot fi mai scurte.

# SEGMENTARE SESIUNE IN REPETARI INDIVIDUALE
# Folosim reguli diferite pentru e6/e7 si e8.
# e6/e7: filtrare mai stricta.
# e8: filtrare mai permisiva pentru a nu elimina executii reale.

def segmenteaza_repetitii(
    date_segment,
):
    date_segment = np.asarray(
        date_segment,
        dtype=float,
    )

    exercitiu_selectat = int(
        st.session_state.get(
            "selected_exercise",
            6,
        )
    )

    durata_minima_finala = DURATA_MINIMA_REPETARE_FINALA_PE_EXERCITIU.get(
        exercitiu_selectat,
        DURATA_MINIMA_REPETARE,
    )

    filtreaza_suprapuneri = FILTRARE_SUPRAPUNERE_PE_EXERCITIU.get(
        exercitiu_selectat,
        True,
    )

    # Linia noua din segmenteaza_repetitii
    # Folosim aceeasi detectie ca la live, ca numarul final sa fie coerent cu live-ul
    informatii_detectie = numara_repetitii_live(
        date_segment
    )

    varfuri = informatii_detectie[
        "peaks"
    ]

    numar_repetitii_brut = (
        len(varfuri)
        // VARFURI_PENTRU_REPETARE
    )

    if numar_repetitii_brut == 0:
        informatii_detectie[
            "repetition_count"
        ] = 0

        informatii_detectie[
            "raw_repetition_count"
        ] = 0

        informatii_detectie[
            "rejected_segments"
        ] = []

        return (
            [],
            [],
            informatii_detectie,
        )

    varfuri_folosite = varfuri[
        :numar_repetitii_brut
        * VARFURI_PENTRU_REPETARE
    ]

    segmente = []
    informatii_segmente = []
    segmente_respinse = []

    ultimul_end_segment_acceptat = -1

    for index_repetare in range(
        numar_repetitii_brut
    ):
        index_primul_varf = (
            index_repetare
            * VARFURI_PENTRU_REPETARE
        )

        primul_varf = int(
            varfuri_folosite[
                index_primul_varf
            ]
        )

        al_doilea_varf = int(
            varfuri_folosite[
                index_primul_varf + 1
            ]
        )

        start_segment = max(
            0,
            primul_varf
            - MARGINE_SEGMENT_REPETARE,
        )

        end_segment = min(
            len(date_segment),
            al_doilea_varf
            + MARGINE_SEGMENT_REPETARE
            + 1,
        )

        lungime_segment = (
            end_segment
            - start_segment
        )

        durata_segment = (
            lungime_segment
            / FS
        )

        if lungime_segment < durata_minima_finala:
            segmente_respinse.append({
                "candidate_repetition": index_repetare + 1,
                "start_sample": start_segment,
                "end_sample": end_segment,
                "samples": lungime_segment,
                "duration_seconds": durata_segment,
                "reason": "durata_prea_mica",
            })

            continue

        if (
            filtreaza_suprapuneri
            and start_segment < ultimul_end_segment_acceptat
        ):
            segmente_respinse.append({
                "candidate_repetition": index_repetare + 1,
                "start_sample": start_segment,
                "end_sample": end_segment,
                "samples": lungime_segment,
                "duration_seconds": durata_segment,
                "reason": "suprapunere_cu_segment_anterior",
            })

            continue

        segment = date_segment[
            start_segment:end_segment
        ].copy()

        segmente.append(
            segment
        )

        informatii_segmente.append({
            "repetition": len(
                segmente
            ),
            "start_sample": start_segment,
            "end_sample": end_segment,
            "samples": len(
                segment
            ),
            "duration_seconds": (
                len(segment)
                / FS
            ),
            "first_peak": primul_varf,
            "second_peak": al_doilea_varf,
        })

        ultimul_end_segment_acceptat = end_segment

    informatii_detectie[
        "raw_peak_count"
    ] = int(
        len(varfuri)
    )

    informatii_detectie[
        "raw_repetition_count"
    ] = int(
        numar_repetitii_brut
    )

    informatii_detectie[
        "repetition_count"
    ] = len(
        segmente
    )

    informatii_detectie[
        "rejected_segments"
    ] = segmente_respinse

    informatii_detectie[
        "selected_exercise_for_segmentation"
    ] = exercitiu_selectat

    return (
        segmente,
        informatii_segmente,
        informatii_detectie,
    )


# PARTEA 5 - Clasificarea sesiunii pe repetari si agregarea rezultatului final


# ==========================================================
# OBTINERE PROBABILITATI DE LA MODEL
# ==========================================================

def obtine_probabilitati_model(
    model,
    X,
):
    if hasattr(
        model,
        "predict_proba",
    ):
        probabilitati = model.predict_proba(
            X
        )[0]

        return (
            np.asarray(
                model.classes_,
                dtype=int,
            ),
            np.asarray(
                probabilitati,
                dtype=float,
            ),
        )

    clasa_prezisa = int(
        model.predict(
            X
        )[0]
    )

    clase = np.asarray(
        model.classes_,
        dtype=int,
    )

    probabilitati = np.zeros(
        len(
            clase
        ),
        dtype=float,
    )

    index_clasa = np.where(
        clase == clasa_prezisa
    )[0]

    if len(index_clasa) > 0:
        probabilitati[
            index_clasa[0]
        ] = 1.0

    return (
        clase,
        probabilitati,
    )


# ==========================================================
# CONVERTIRE PROBABILITATI IN DICTIONAR PROCENTE
# ==========================================================

def converteste_probabilitati_in_dict(
    clase,
    probabilitati,
):
    return {
        int(clasa): float(
            probabilitate * 100
        )
        for clasa, probabilitate in zip(
            clase,
            probabilitati,
        )
    }


# ==========================================================
# AGREGARE PROBABILITATI PE CLASE FIXE
# ==========================================================

def adauga_probabilitati_agregate(
    vector_agregat,
    clase_model,
    probabilitati_model,
):
    for clasa, probabilitate in zip(
        clase_model,
        probabilitati_model,
    ):
        clasa = int(
            clasa
        )

        if clasa in vector_agregat:
            vector_agregat[
                clasa
            ] += float(
                probabilitate
            )


# ==========================================================
# CLASIFICARE SESIUNE PE REPETARI
# ==========================================================

# CLASIFICARE SESIUNE PE REPETARI
# Folosim exercitiul selectat manual pentru evaluarea calitatii.
# Modelul de identificare ramane doar pentru verificare.

def clasifica_sesiune_pe_repetitii(
    date_segment,
):
    (
        segmente,
        informatii_segmente,
        informatii_detectie,
    ) = segmenteaza_repetitii(
        date_segment
    )

    if not segmente:
        raise ValueError(
            "Nu a fost detectata nicio repetare completa."
        )

    model_exercise = st.session_state[
        "model_exercise"
    ]

    quality_models = st.session_state[
        "quality_models"
    ]

    exercitiu_selectat = int(
        st.session_state[
            "selected_exercise"
        ]
    )

    if exercitiu_selectat not in quality_models:
        raise ValueError(
            "Modelul de calitate pentru exercitiul selectat "
            f"{exercitiu_selectat} nu exista."
        )

    model_calitate_selectat = quality_models[
        exercitiu_selectat
    ]

    rezultate_repetitii = []

    probabilitati_exercitii_agregate = {
        6: 0.0,
        7: 0.0,
        8: 0.0,
    }

    probabilitati_calitati_agregate = {
        1: 0.0,
        2: 0.0,
        3: 0.0,
    }

    for index_repetare, segment in enumerate(
        segmente
    ):
        trasaturi = extrage_trasaturi_segment(
            segment
        )

        X_repetare = trasaturi.reshape(
            1,
            -1,
        )

        (
            clase_exercitii,
            probabilitati_exercitii,
        ) = obtine_probabilitati_model(
            model_exercise,
            X_repetare,
        )

        adauga_probabilitati_agregate(
            probabilitati_exercitii_agregate,
            clase_exercitii,
            probabilitati_exercitii,
        )

        index_exercitiu_model = int(
            np.argmax(
                probabilitati_exercitii
            )
        )

        exercitiu_detectat_model = int(
            clase_exercitii[
                index_exercitiu_model
            ]
        )

        incredere_exercitiu_model = float(
            probabilitati_exercitii[
                index_exercitiu_model
            ]
            * 100
        )

        (
            clase_calitati,
            probabilitati_calitati,
        ) = obtine_probabilitati_model(
            model_calitate_selectat,
            X_repetare,
        )

        adauga_probabilitati_agregate(
            probabilitati_calitati_agregate,
            clase_calitati,
            probabilitati_calitati,
        )

        index_calitate = int(
            np.argmax(
                probabilitati_calitati
            )
        )

        calitate_repetare = int(
            clase_calitati[
                index_calitate
            ]
        )

        incredere_calitate = float(
            probabilitati_calitati[
                index_calitate
            ]
            * 100
        )

        rezultate_repetitii.append({
            **informatii_segmente[
                index_repetare
            ],
            "predicted_exercise": exercitiu_selectat,
            "model_detected_exercise": exercitiu_detectat_model,
            "exercise_confidence": incredere_exercitiu_model,
            "predicted_quality": calitate_repetare,
            "quality_confidence": incredere_calitate,
        })

    numar_repetitii = len(
        rezultate_repetitii
    )

    for clasa in probabilitati_exercitii_agregate:
        probabilitati_exercitii_agregate[
            clasa
        ] /= numar_repetitii

    for clasa in probabilitati_calitati_agregate:
        probabilitati_calitati_agregate[
            clasa
        ] /= numar_repetitii

    exercitiu_detectat_model_final = max(
        probabilitati_exercitii_agregate,
        key=probabilitati_exercitii_agregate.get,
    )

    calitate_finala = max(
        probabilitati_calitati_agregate,
        key=probabilitati_calitati_agregate.get,
    )

    incredere_exercitiu_model_final = (
        probabilitati_exercitii_agregate[
            exercitiu_detectat_model_final
        ]
        * 100
    )

    incredere_calitate_finala = (
        probabilitati_calitati_agregate[
            calitate_finala
        ]
        * 100
    )

    probabilitati_exercitii_dict = {
        clasa: probabilitate * 100
        for clasa, probabilitate
        in probabilitati_exercitii_agregate.items()
    }

    probabilitati_calitati_dict = {
        clasa: probabilitate * 100
        for clasa, probabilitate
        in probabilitati_calitati_agregate.items()
    }

    return {
        "exercise": int(
            exercitiu_selectat
        ),
        "exercise_confidence": float(
            100.0
        ),
        "model_detected_exercise": int(
            exercitiu_detectat_model_final
        ),
        "model_detected_exercise_confidence": float(
            incredere_exercitiu_model_final
        ),
        "exercise_probabilities": (
            probabilitati_exercitii_dict
        ),

        "quality": int(
            calitate_finala
        ),
        "quality_confidence": float(
            incredere_calitate_finala
        ),
        "quality_probabilities": (
            probabilitati_calitati_dict
        ),

        "repetition_count": numar_repetitii,
        "repetition_results": rezultate_repetitii,
        "segmentation_information": informatii_detectie,
    }



# PARTEA 6 - Calibrare, control executie si pregatire orientare pentru grafic


# ==========================================================
# PORNIRE CALIBRARE FIZICA
# ==========================================================

def porneste_calibrarea():
    if not conexiune_este_deschisa():
        return

    if st.session_state[
        "calibration_restart_needed"
    ]:
        seteaza_mesaj_calibrare(
            "Repornește sau reconectează ESP32 după ștergerea "
            "calibrării.",
            "warning",
        )
        return

    conexiune = st.session_state[
        "serial_connection"
    ]

    conexiune.reset_input_buffer()

    st.session_state[
        "execution_running"
    ] = False

    st.session_state[
        "calibration_running"
    ] = True

    st.session_state[
        "sensor_calibrated"
    ] = False

    st.session_state[
        "calibration_stable_samples"
    ] = 0

    st.session_state[
        "calibration_status"
    ] = {
        "SYS": 0,
        "ACC": 0,
        "GYR": 0,
        "MAG": 0,
    }

    seteaza_mesaj_calibrare(
        "Monitorizarea calibrării a pornit. Urmează "
        "instrucțiunile afișate sub indicatori.",
        "info",
    )


# ==========================================================
# OPRIRE MONITORIZARE CALIBRARE
# ==========================================================

def anuleaza_calibrarea():
    st.session_state[
        "calibration_running"
    ] = False

    st.session_state[
        "calibration_stable_samples"
    ] = 0

    st.session_state[
        "sensor_calibrated"
    ] = False

    seteaza_mesaj_calibrare(
        "Monitorizarea calibrării a fost oprită.",
        "info",
    )


# ==========================================================
# SALVARE CALIBRARE IN ESP32
# ==========================================================

def salveaza_calibrarea_in_esp32():
    status = st.session_state[
        "calibration_status"
    ]

    calibrare_completa = all(
        status[cheie] == 3
        for cheie in (
            "SYS",
            "ACC",
            "GYR",
            "MAG",
        )
    )

    if not calibrare_completa:
        seteaza_mesaj_calibrare(
            "Calibrarea nu poate fi salvată până când "
            "SYS, ACC, GYR și MAG nu sunt toate 3.",
            "warning",
        )
        return

    try:
        raspuns = trimite_comanda_esp32(
            "SAVE_CAL",
            "ACK;SAVE_CAL;",
        )

        if raspuns == "ACK;SAVE_CAL;OK":
            st.session_state[
                "calibration_saved"
            ] = True

            st.session_state[
                "calibration_restart_needed"
            ] = False

            seteaza_mesaj_calibrare(
                "Calibrarea a fost salvată în memoria "
                "nevolatilă a ESP32.",
                "success",
            )

        else:
            seteaza_mesaj_calibrare(
                "ESP32 a refuzat salvarea: "
                f"{raspuns}",
                "error",
            )

    except (
        serial.SerialException,
        TimeoutError,
    ) as eroare:
        seteaza_mesaj_calibrare(
            f"Salvarea calibrării a eșuat: {eroare}",
            "error",
        )


# ==========================================================
# STERGERE CALIBRARE DIN ESP32
# ==========================================================

def sterge_calibrarea_din_esp32():
    try:
        raspuns = trimite_comanda_esp32(
            "CLEAR_CAL",
            "ACK;CLEAR_CAL;",
        )

        if raspuns.startswith(
            "ACK;CLEAR_CAL;OK"
        ):
            st.session_state[
                "calibration_saved"
            ] = False

            st.session_state[
                "sensor_calibrated"
            ] = False

            st.session_state[
                "calibration_running"
            ] = False

            st.session_state[
                "calibration_stable_samples"
            ] = 0

            st.session_state[
                "calibration_restart_needed"
            ] = True

            seteaza_mesaj_calibrare(
                "Calibrarea salvată a fost ștearsă. "
                "Apasă EN/RESET pe ESP32 sau deconectează "
                "și reconectează placa înainte de o nouă calibrare.",
                "success",
            )

        else:
            seteaza_mesaj_calibrare(
                "ESP32 a refuzat ștergerea: "
                f"{raspuns}",
                "error",
            )

    except (
        serial.SerialException,
        TimeoutError,
    ) as eroare:
        seteaza_mesaj_calibrare(
            f"Ștergerea calibrării a eșuat: {eroare}",
            "error",
        )


# ==========================================================
# INSTRUCTIUNI PENTRU CALIBRARE
# ==========================================================

def obtine_instructiune_calibrare(
    status,
):
    if status["GYR"] < 3:
        return "Ține senzorul complet nemișcat pentru giroscop."

    if status["ACC"] < 3:
        return (
            "Menține senzorul pe rând în cele șase orientări "
            "stabile pentru accelerometru."
        )

    if status["MAG"] < 3:
        return (
            "Execută lent mișcări în forma cifrei 8, "
            "departe de obiecte metalice."
        )

    if status["SYS"] < 3:
        return (
            "Componentele sunt calibrate. Continuă mișcarea "
            "lentă și așteaptă stabilizarea SYS la 3."
        )

    return (
        "Calibrarea este completă. Apasă Salvare calibrare."
    )


# ==========================================================
# ADAUGARE ESANTION IN EXECUTIA CURENTA
# ==========================================================

def adauga_esantion_executie(
    esantion,
):
    index_esantion = len(
        st.session_state[
            "execution_signal"
        ]
    )

    timp_esantion = (
        index_esantion
        / FS
    )

    rand_semnal = np.concatenate([
        esantion["acc"],
        esantion["gyr"],
    ])

    roll, pitch, yaw = quaternion_to_euler_degrees(
        esantion["quat"]
    )

    st.session_state[
        "execution_signal"
    ].append(
        rand_semnal.tolist()
    )

    st.session_state[
        "execution_orientation"
    ].append({
        "t": timp_esantion,
        "roll": roll,
        "pitch": pitch,
        "yaw": yaw,
        "SYS": esantion["cal_sys"],
        "ACC": esantion["cal_acc"],
        "GYR": esantion["cal_gyr"],
        "MAG": esantion["cal_mag"],
    })


# ==========================================================
# PORNIRE EXECUTIE EXERCITIU
# ==========================================================

# PORNIRE EXECUTIE EXERCITIU
# Porneste inregistrarea daca modelele sunt incarcate, ESP32 este conectat
# si exista calibrare utilizabila, fie completa curent, fie salvata in NVM.

def porneste_executia():
    sistem_pregatit_pentru_start = (
        st.session_state[
            "models_loaded"
        ]
        and conexiune_este_deschisa()
        and sistem_are_calibrare_utilizabila()
        and not st.session_state[
            "calibration_running"
        ]
    )

    if not sistem_pregatit_pentru_start:
        seteaza_mesaj_calibrare(
            "START nu poate porni: verifica modelele, conexiunea ESP32 "
            "si calibrarea.",
            "warning",
        )
        return

    conexiune = st.session_state[
        "serial_connection"
    ]

    conexiune.reset_input_buffer()

    st.session_state[
        "execution_signal"
    ] = []

    st.session_state[
        "execution_orientation"
    ] = []

    st.session_state[
        "execution_start_time"
    ] = time.time()

    st.session_state[
        "execution_stop_time"
    ] = None

    st.session_state[
        "execution_running"
    ] = True

    st.session_state[
        "execution_ready_to_process"
    ] = False

    st.session_state[
        "last_prediction"
    ] = None

    st.session_state[
        "live_repetition_count"
    ] = 0

    st.session_state[
        "live_peak_count"
    ] = 0

    st.session_state[
        "final_repetition_count"
    ] = 0

    st.session_state[
        "repetition_results"
    ] = []

    st.session_state[
        "segmentation_information"
    ] = None

    st.rerun()


# ==========================================================
# OPRIRE EXECUTIE EXERCITIU
# ==========================================================

def opreste_executia():
    if not st.session_state[
        "execution_running"
    ]:
        return

    esantioane_ramase = citeste_esantioane_disponibile()

    for esantion in esantioane_ramase:
        adauga_esantion_executie(
            esantion
        )

    st.session_state[
        "execution_running"
    ] = False

    st.session_state[
        "execution_stop_time"
    ] = time.time()

    st.session_state[
        "execution_ready_to_process"
    ] = True


# ==========================================================
# STERGERE ULTIMA INREGISTRARE
# ==========================================================

def sterge_ultima_inregistrare():
    st.session_state[
        "execution_running"
    ] = False

    st.session_state[
        "execution_start_time"
    ] = None

    st.session_state[
        "execution_stop_time"
    ] = None

    st.session_state[
        "execution_signal"
    ] = []

    st.session_state[
        "execution_orientation"
    ] = []

    st.session_state[
        "execution_ready_to_process"
    ] = False

    st.session_state[
        "last_prediction"
    ] = None

    st.session_state[
        "live_repetition_count"
    ] = 0

    st.session_state[
        "live_peak_count"
    ] = 0

    st.session_state[
        "final_repetition_count"
    ] = 0

    st.session_state[
        "repetition_results"
    ] = []

    st.session_state[
        "segmentation_information"
    ] = None


# ==========================================================
# PREGATIRE ORIENTARE PENTRU GRAFIC
# ==========================================================

def pregateste_orientare_pentru_grafic(
    orientare,
):
    df_orientare = pd.DataFrame(
        orientare
    )

    if df_orientare.empty:
        return df_orientare

    if st.session_state[
        "unwrap_orientation"
    ]:
        for coloana in (
            "roll",
            "pitch",
            "yaw",
        ):
            valori_radiani = np.radians(
                df_orientare[
                    coloana
                ].to_numpy(
                    dtype=float
                )
            )

            valori_continue = np.unwrap(
                valori_radiani
            )

            df_orientare[
                coloana
            ] = np.degrees(
                valori_continue
            )

    numar_maxim_puncte = 2000

    if len(df_orientare) > numar_maxim_puncte:
        indici = np.linspace(
            0,
            len(df_orientare) - 1,
            numar_maxim_puncte,
            dtype=int,
        )

        df_orientare = df_orientare.iloc[
            indici
        ].copy()

    return df_orientare



# PARTEA 6 - Calibrare, control executie si pregatire orientare pentru grafic


# ==========================================================
# PORNIRE CALIBRARE FIZICA
# ==========================================================

def porneste_calibrarea():
    if not conexiune_este_deschisa():
        return

    if st.session_state[
        "calibration_restart_needed"
    ]:
        seteaza_mesaj_calibrare(
            "Repornește sau reconectează ESP32 după ștergerea "
            "calibrării.",
            "warning",
        )
        return

    conexiune = st.session_state[
        "serial_connection"
    ]

    conexiune.reset_input_buffer()

    st.session_state[
        "execution_running"
    ] = False

    st.session_state[
        "calibration_running"
    ] = True

    st.session_state[
        "sensor_calibrated"
    ] = False

    st.session_state[
        "calibration_stable_samples"
    ] = 0

    st.session_state[
        "calibration_status"
    ] = {
        "SYS": 0,
        "ACC": 0,
        "GYR": 0,
        "MAG": 0,
    }

    seteaza_mesaj_calibrare(
        "Monitorizarea calibrării a pornit. Urmează "
        "instrucțiunile afișate sub indicatori.",
        "info",
    )


# ==========================================================
# OPRIRE MONITORIZARE CALIBRARE
# ==========================================================

def anuleaza_calibrarea():
    st.session_state[
        "calibration_running"
    ] = False

    st.session_state[
        "calibration_stable_samples"
    ] = 0

    st.session_state[
        "sensor_calibrated"
    ] = False

    seteaza_mesaj_calibrare(
        "Monitorizarea calibrării a fost oprită.",
        "info",
    )


# ==========================================================
# SALVARE CALIBRARE IN ESP32
# ==========================================================

def salveaza_calibrarea_in_esp32():
    status = st.session_state[
        "calibration_status"
    ]

    calibrare_completa = all(
        status[cheie] == 3
        for cheie in (
            "SYS",
            "ACC",
            "GYR",
            "MAG",
        )
    )

    if not calibrare_completa:
        seteaza_mesaj_calibrare(
            "Calibrarea nu poate fi salvată până când "
            "SYS, ACC, GYR și MAG nu sunt toate 3.",
            "warning",
        )
        return

    try:
        raspuns = trimite_comanda_esp32(
            "SAVE_CAL",
            "ACK;SAVE_CAL;",
        )

        if raspuns == "ACK;SAVE_CAL;OK":
            st.session_state[
                "calibration_saved"
            ] = True

            st.session_state[
                "calibration_restart_needed"
            ] = False

            seteaza_mesaj_calibrare(
                "Calibrarea a fost salvată în memoria "
                "nevolatilă a ESP32.",
                "success",
            )

        else:
            seteaza_mesaj_calibrare(
                "ESP32 a refuzat salvarea: "
                f"{raspuns}",
                "error",
            )

    except (
        serial.SerialException,
        TimeoutError,
    ) as eroare:
        seteaza_mesaj_calibrare(
            f"Salvarea calibrării a eșuat: {eroare}",
            "error",
        )


# ==========================================================
# STERGERE CALIBRARE DIN ESP32
# ==========================================================

def sterge_calibrarea_din_esp32():
    try:
        raspuns = trimite_comanda_esp32(
            "CLEAR_CAL",
            "ACK;CLEAR_CAL;",
        )

        if raspuns.startswith(
            "ACK;CLEAR_CAL;OK"
        ):
            st.session_state[
                "calibration_saved"
            ] = False

            st.session_state[
                "sensor_calibrated"
            ] = False

            st.session_state[
                "calibration_running"
            ] = False

            st.session_state[
                "calibration_stable_samples"
            ] = 0

            st.session_state[
                "calibration_restart_needed"
            ] = True

            seteaza_mesaj_calibrare(
                "Calibrarea salvată a fost ștearsă. "
                "Apasă EN/RESET pe ESP32 sau deconectează "
                "și reconectează placa înainte de o nouă calibrare.",
                "success",
            )

        else:
            seteaza_mesaj_calibrare(
                "ESP32 a refuzat ștergerea: "
                f"{raspuns}",
                "error",
            )

    except (
        serial.SerialException,
        TimeoutError,
    ) as eroare:
        seteaza_mesaj_calibrare(
            f"Ștergerea calibrării a eșuat: {eroare}",
            "error",
        )


# ==========================================================
# INSTRUCTIUNI PENTRU CALIBRARE
# ==========================================================

def obtine_instructiune_calibrare(
    status,
):
    if status["GYR"] < 3:
        return "Ține senzorul complet nemișcat pentru giroscop."

    if status["ACC"] < 3:
        return (
            "Menține senzorul pe rând în cele șase orientări "
            "stabile pentru accelerometru."
        )

    if status["MAG"] < 3:
        return (
            "Execută lent mișcări în forma cifrei 8, "
            "departe de obiecte metalice."
        )

    if status["SYS"] < 3:
        return (
            "Componentele sunt calibrate. Continuă mișcarea "
            "lentă și așteaptă stabilizarea SYS la 3."
        )

    return (
        "Calibrarea este completă. Apasă Salvare calibrare."
    )


# ==========================================================
# ADAUGARE ESANTION IN EXECUTIA CURENTA
# ==========================================================

def adauga_esantion_executie(
    esantion,
):
    index_esantion = len(
        st.session_state[
            "execution_signal"
        ]
    )

    timp_esantion = (
        index_esantion
        / FS
    )

    rand_semnal = np.concatenate([
        esantion["acc"],
        esantion["gyr"],
    ])

    roll, pitch, yaw = quaternion_to_euler_degrees(
        esantion["quat"]
    )

    st.session_state[
        "execution_signal"
    ].append(
        rand_semnal.tolist()
    )

    st.session_state[
        "execution_orientation"
    ].append({
        "t": timp_esantion,
        "roll": roll,
        "pitch": pitch,
        "yaw": yaw,
        "SYS": esantion["cal_sys"],
        "ACC": esantion["cal_acc"],
        "GYR": esantion["cal_gyr"],
        "MAG": esantion["cal_mag"],
    })


# ==========================================================
# PORNIRE EXECUTIE EXERCITIU
# ==========================================================

def porneste_executia():
    sistem_pregatit = (
        st.session_state[
            "models_loaded"
        ]
        and conexiune_este_deschisa()
        and st.session_state[
            "sensor_calibrated"
        ]
        and not st.session_state[
            "calibration_running"
        ]
    )

    if not sistem_pregatit:
        return

    conexiune = st.session_state[
        "serial_connection"
    ]

    conexiune.reset_input_buffer()

    st.session_state[
        "execution_signal"
    ] = []

    st.session_state[
        "execution_orientation"
    ] = []

    st.session_state[
        "execution_start_time"
    ] = time.time()

    st.session_state[
        "execution_stop_time"
    ] = None

    st.session_state[
        "execution_running"
    ] = True

    st.session_state[
        "execution_ready_to_process"
    ] = False

    st.session_state[
        "last_prediction"
    ] = None

    st.session_state[
        "live_repetition_count"
    ] = 0

    st.session_state[
        "live_peak_count"
    ] = 0

    st.session_state[
        "final_repetition_count"
    ] = 0

    st.session_state[
        "repetition_results"
    ] = []

    st.session_state[
        "segmentation_information"
    ] = None


# ==========================================================
# OPRIRE EXECUTIE EXERCITIU
# ==========================================================

def opreste_executia():
    if not st.session_state[
        "execution_running"
    ]:
        return

    esantioane_ramase = citeste_esantioane_disponibile()

    for esantion in esantioane_ramase:
        adauga_esantion_executie(
            esantion
        )

    st.session_state[
        "execution_running"
    ] = False

    st.session_state[
        "execution_stop_time"
    ] = time.time()

    st.session_state[
        "execution_ready_to_process"
    ] = True


# ==========================================================
# STERGERE ULTIMA INREGISTRARE
# ==========================================================

def sterge_ultima_inregistrare():
    st.session_state[
        "execution_running"
    ] = False

    st.session_state[
        "execution_start_time"
    ] = None

    st.session_state[
        "execution_stop_time"
    ] = None

    st.session_state[
        "execution_signal"
    ] = []

    st.session_state[
        "execution_orientation"
    ] = []

    st.session_state[
        "execution_ready_to_process"
    ] = False

    st.session_state[
        "last_prediction"
    ] = None

    st.session_state[
        "live_repetition_count"
    ] = 0

    st.session_state[
        "live_peak_count"
    ] = 0

    st.session_state[
        "final_repetition_count"
    ] = 0

    st.session_state[
        "repetition_results"
    ] = []

    st.session_state[
        "segmentation_information"
    ] = None


# ==========================================================
# PREGATIRE ORIENTARE PENTRU GRAFIC
# ==========================================================

def pregateste_orientare_pentru_grafic(
    orientare,
):
    df_orientare = pd.DataFrame(
        orientare
    )

    if df_orientare.empty:
        return df_orientare

    if st.session_state[
        "unwrap_orientation"
    ]:
        for coloana in (
            "roll",
            "pitch",
            "yaw",
        ):
            valori_radiani = np.radians(
                df_orientare[
                    coloana
                ].to_numpy(
                    dtype=float
                )
            )

            valori_continue = np.unwrap(
                valori_radiani
            )

            df_orientare[
                coloana
            ] = np.degrees(
                valori_continue
            )

    numar_maxim_puncte = 2000

    if len(df_orientare) > numar_maxim_puncte:
        indici = np.linspace(
            0,
            len(df_orientare) - 1,
            numar_maxim_puncte,
            dtype=int,
        )

        df_orientare = df_orientare.iloc[
            indici
        ].copy()

    return df_orientare



# PARTEA 7 - Interfata Streamlit pentru modele, conectare ESP32 si testare date


# ==========================================================
# TITLUL APLICATIEI
# ==========================================================

st.title(
    "Sistem de monitorizare a exercițiilor de kinetoterapie"
)

st.caption(
    "BNO055 + ESP32 + modele machine learning + Streamlit"
)


# ==========================================================
# SIDEBAR PENTRU INCARCAREA MODELELOR
# ==========================================================

st.sidebar.header(
    "Configurare"
)

default_models_root = (
    r"D:\Personal\FAKULTHA\AC\anul4\LICENTA\Roxana"
    r"\atnecilpp\exerc\physical+therapy+exercises+dataset"
    r"\modele_v2"
    r"\modele_joblib"
)

models_root_text = st.sidebar.text_input(
    "Folder modele .joblib",
    value=default_models_root,
)

if st.sidebar.button(
    "Încarcă modelele",
    type="primary",
    use_container_width=True,
):
    try:
        with st.spinner(
            "Se încarcă modelele..."
        ):
            (
                model_exercise,
                quality_models,
                gui_config,
            ) = load_models(
                models_root_text
            )

        st.session_state[
            "model_exercise"
        ] = model_exercise

        st.session_state[
            "quality_models"
        ] = quality_models

        st.session_state[
            "gui_config"
        ] = gui_config

        st.session_state[
            "models_loaded"
        ] = True

        st.sidebar.success(
            "Modelele au fost încărcate."
        )

    except Exception as eroare:
        st.session_state[
            "models_loaded"
        ] = False

        st.session_state[
            "model_exercise"
        ] = None

        st.session_state[
            "quality_models"
        ] = None

        st.session_state[
            "gui_config"
        ] = None

        st.sidebar.error(
            str(
                eroare
            )
        )


if st.session_state[
    "models_loaded"
]:
    st.sidebar.success(
        "Status modele: încărcate"
    )

else:
    st.sidebar.warning(
        "Status modele: neîncărcate"
    )


# ==========================================================
# SECTIUNEA 1 - INFORMATII DESPRE MODELE
# ==========================================================

st.header(
    "1. Modelele de clasificare"
)

if st.session_state[
    "models_loaded"
]:
    model_info_df = get_model_info(
        st.session_state[
            "model_exercise"
        ],
        st.session_state[
            "quality_models"
        ],
        st.session_state[
            "gui_config"
        ],
    )

    st.success(
        "Cele patru modele standard pentru GUI sunt pregătite."
    )

    st.dataframe(
        model_info_df,
        use_container_width=True,
        hide_index=True,
    )

    coloana_features, coloana_fs = st.columns(
        2
    )

    coloana_features.metric(
        "Număr de trăsături",
        len(
            FEATURE_NAMES
        ),
    )

    coloana_fs.metric(
        "Frecvență eșantionare",
        f"{FS} Hz",
    )

    with st.expander(
        "Configurarea încărcată pentru GUI"
    ):
        st.json(
            st.session_state[
                "gui_config"
            ]
        )

else:
    st.warning(
        "Încarcă modelele din bara laterală."
    )


# ==========================================================
# SECTIUNEA 2 - CONECTARE ESP32
# ==========================================================

st.header(
    "2. Conectare ESP32"
)

porturi_detectate = gaseste_porturi_seriale()

optiuni_porturi = {
    (
        f"{port.device} - "
        f"{port.description}"
    ): port.device
    for port in porturi_detectate
}

if optiuni_porturi:
    descriere_port = st.selectbox(
        "Alege portul serial",
        options=list(
            optiuni_porturi.keys()
        ),
        disabled=(
            st.session_state[
                "execution_running"
            ]
            or st.session_state[
                "calibration_running"
            ]
        ),
    )

    port_selectat = optiuni_porturi[
        descriere_port
    ]

else:
    port_selectat = None

    st.warning(
        "Nu a fost detectat niciun port serial."
    )


coloana_conectare, coloana_deconectare = st.columns(
    2
)

with coloana_conectare:
    if st.button(
        "Conectează ESP32",
        type="primary",
        disabled=(
            port_selectat is None
            or st.session_state[
                "execution_running"
            ]
            or st.session_state[
                "calibration_running"
            ]
        ),
        use_container_width=True,
    ):
        try:
            conecteaza_esp32(
                port_selectat
            )

            st.success(
                f"ESP32 a fost conectat pe {port_selectat}."
            )

        except serial.SerialException as eroare:
            inchide_conexiunea_seriala()

            st.error(
                "Conectarea a eșuat: "
                f"{eroare}"
            )


with coloana_deconectare:
    if st.button(
        "Deconectează ESP32",
        disabled=(
            not conexiune_este_deschisa()
            or st.session_state[
                "execution_running"
            ]
            or st.session_state[
                "calibration_running"
            ]
        ),
        use_container_width=True,
    ):
        inchide_conexiunea_seriala()

        st.warning(
            "ESP32 a fost deconectat."
        )


if conexiune_este_deschisa():
    st.success(
        "Status ESP32: conectat"
    )

    st.write(
        "Port activ:",
        st.session_state[
            "connected_port"
        ],
    )

else:
    st.warning(
        "Status ESP32: deconectat"
    )


# ==========================================================
# FORMAT ASTEPTAT DE LA ARDUINO
# ==========================================================

with st.expander(
    "Formatul așteptat de la Arduino"
):
    st.code(
        (
            "acc_x;acc_y;acc_z;"
            "gyr_x;gyr_y;gyr_z;"
            "mag_x;mag_y;mag_z;"
            "quat_w;quat_x;quat_y;quat_z;"
            "cal_sys;cal_acc;cal_gyr;cal_mag"
        ),
        language="text",
    )

    st.write(
        "Linia trebuie să conțină exact 17 câmpuri."
    )

    st.write(
        "Pentru clasificare sunt folosite doar primele 6 valori: "
        "acc_x, acc_y, acc_z, gyr_x, gyr_y, gyr_z."
    )


# ==========================================================
# TESTARE DATE PRIMITE DE LA ESP32
# ==========================================================

if st.button(
    "Testează datele primite",
    disabled=(
        not conexiune_este_deschisa()
        or st.session_state[
            "execution_running"
        ]
        or st.session_state[
            "calibration_running"
        ]
    ),
):
    conexiune = st.session_state[
        "serial_connection"
    ]

    conexiune.reset_input_buffer()

    esantion_test = citeste_un_esantion_valid(
        timeout_secunde=3
    )

    if esantion_test is None:
        st.error(
            "Nu a fost primită o linie validă cu 17 câmpuri."
        )

    else:
        st.success(
            "Linia primită are formatul corect."
        )

        st.code(
            esantion_test[
                "linie"
            ],
            language="text",
        )

        (
            coloana_sys,
            coloana_acc,
            coloana_gyr,
            coloana_mag,
        ) = st.columns(
            4
        )

        coloana_sys.metric(
            "SYS",
            esantion_test[
                "cal_sys"
            ],
        )

        coloana_acc.metric(
            "ACC",
            esantion_test[
                "cal_acc"
            ],
        )

        coloana_gyr.metric(
            "GYR",
            esantion_test[
                "cal_gyr"
            ],
        )

        coloana_mag.metric(
            "MAG",
            esantion_test[
                "cal_mag"
            ],
        )

        date_test_df = pd.DataFrame(
            [
                {
                    "acc_x": esantion_test["acc"][0],
                    "acc_y": esantion_test["acc"][1],
                    "acc_z": esantion_test["acc"][2],
                    "gyr_x": esantion_test["gyr"][0],
                    "gyr_y": esantion_test["gyr"][1],
                    "gyr_z": esantion_test["gyr"][2],
                    "mag_x": esantion_test["mag"][0],
                    "mag_y": esantion_test["mag"][1],
                    "mag_z": esantion_test["mag"][2],
                    "quat_w": esantion_test["quat"][0],
                    "quat_x": esantion_test["quat"][1],
                    "quat_y": esantion_test["quat"][2],
                    "quat_z": esantion_test["quat"][3],
                }
            ]
        )

        st.dataframe(
            date_test_df,
            use_container_width=True,
            hide_index=True,
        )



# PARTEA 8 - Interfata pentru calibrarea sistemului BNO055


# ==========================================================
# SECTIUNEA 3 - CALIBRAREA SISTEMULUI
# ==========================================================

st.header(
    "3. Calibrarea sistemului"
)

st.info(
    """
Calibrarea se efectuează fizic înaintea exercițiilor:

- **GYR:** ține senzorul complet nemișcat;
- **ACC:** menține senzorul în cele șase orientări stabile;
- **MAG:** execută lent mișcări în forma cifrei 8;
- **SYS:** așteaptă stabilizarea sistemului de fuziune.

Calibrarea poate fi salvată numai când:

**SYS = 3, ACC = 3, GYR = 3 și MAG = 3**
"""
)


# ==========================================================
# BUTOANE CALIBRARE, SALVARE SI STERGERE
# ==========================================================

(
    coloana_calibrare,
    coloana_salvare,
    coloana_stergere,
) = st.columns(
    3
)

with coloana_calibrare:
    eticheta_calibrare = (
        "Oprește calibrarea"
        if st.session_state[
            "calibration_running"
        ]
        else "Calibrează sistemul"
    )

    if st.button(
        eticheta_calibrare,
        type=(
            "secondary"
            if st.session_state[
                "calibration_running"
            ]
            else "primary"
        ),
        disabled=(
            not conexiune_este_deschisa()
            or st.session_state[
                "execution_running"
            ]
            or st.session_state[
                "calibration_restart_needed"
            ]
        ),
        use_container_width=True,
    ):
        if st.session_state[
            "calibration_running"
        ]:
            anuleaza_calibrarea()

        else:
            porneste_calibrarea()

        st.rerun()


with coloana_salvare:
    status_curent = st.session_state[
        "calibration_status"
    ]

    calibrare_salvabila = all(
        status_curent[
            cheie
        ] == 3
        for cheie in (
            "SYS",
            "ACC",
            "GYR",
            "MAG",
        )
    )

    st.button(
        "Salvează calibrarea",
        on_click=salveaza_calibrarea_in_esp32,
        disabled=(
            not conexiune_este_deschisa()
            or st.session_state[
                "execution_running"
            ]
            or st.session_state[
                "calibration_running"
            ]
            or st.session_state[
                "calibration_restart_needed"
            ]
            or not calibrare_salvabila
        ),
        use_container_width=True,
    )


with coloana_stergere:
    st.button(
        "Șterge calibrarea",
        on_click=sterge_calibrarea_din_esp32,
        disabled=(
            not conexiune_este_deschisa()
            or st.session_state[
                "execution_running"
            ]
            or st.session_state[
                "calibration_running"
            ]
            or not st.session_state[
                "calibration_saved"
            ]
        ),
        use_container_width=True,
    )


# ==========================================================
# AFISARE MESAJ CALIBRARE
# ==========================================================

mesaj_calibrare = st.session_state[
    "calibration_message"
]

if mesaj_calibrare:
    tip_mesaj = st.session_state[
        "calibration_message_type"
    ]

    functie_mesaj = {
        "success": st.success,
        "warning": st.warning,
        "error": st.error,
        "info": st.info,
    }.get(
        tip_mesaj,
        st.info,
    )

    functie_mesaj(
        mesaj_calibrare
    )


# ==========================================================
# AFISARE STATUS PROFIL CALIBRARE
# ==========================================================

if st.session_state[
    "calibration_saved"
]:
    st.success(
        "Profil de calibrare în ESP32: SALVAT"
    )

else:
    st.caption(
        "Profil de calibrare în ESP32: NESALVAT"
    )


# ==========================================================
# STABILIRE ACTUALIZARE AUTOMATA CALIBRARE
# ==========================================================

calibration_run_every = (
    INTERVAL_ACTUALIZARE_CALIBRARE
    if st.session_state[
        "calibration_running"
    ]
    else None
)


# ==========================================================
# ACTUALIZARE PERIODICA VALORI CALIBRARE
# ==========================================================

@st.fragment(
    run_every=calibration_run_every
)
def actualizeaza_calibrarea():
    if st.session_state[
        "calibration_running"
    ]:
        if not conexiune_este_deschisa():
            st.session_state[
                "calibration_running"
            ] = False

            st.session_state[
                "sensor_calibrated"
            ] = False

            st.error(
                "Conexiunea serială a fost pierdută."
            )

            return

        esantioane = citeste_esantioane_disponibile()

        for esantion in esantioane:
            st.session_state[
                "calibration_status"
            ] = {
                "SYS": esantion[
                    "cal_sys"
                ],
                "ACC": esantion[
                    "cal_acc"
                ],
                "GYR": esantion[
                    "cal_gyr"
                ],
                "MAG": esantion[
                    "cal_mag"
                ],
            }

            if calibrare_bno055_completa(
                esantion
            ):
                st.session_state[
                    "calibration_stable_samples"
                ] += 1

            else:
                st.session_state[
                    "calibration_stable_samples"
                ] = 0

            if (
                st.session_state[
                    "calibration_stable_samples"
                ]
                >= NUMAR_ESANTIOANE_CALIBRARE_STABILA
            ):
                st.session_state[
                    "sensor_calibrated"
                ] = True

                st.session_state[
                    "calibration_running"
                ] = False

                seteaza_mesaj_calibrare(
                    "Calibrarea este completă. Apasă "
                    "Salvează calibrarea pentru memorarea offseturilor.",
                    "success",
                )

                st.rerun()

    status = st.session_state[
        "calibration_status"
    ]

    (
        coloana_sys,
        coloana_acc,
        coloana_gyr,
        coloana_mag,
    ) = st.columns(
        4
    )

    coloana_sys.metric(
        "SYS",
        status[
            "SYS"
        ],
    )

    coloana_acc.metric(
        "ACC",
        status[
            "ACC"
        ],
    )

    coloana_gyr.metric(
        "GYR",
        status[
            "GYR"
        ],
    )

    coloana_mag.metric(
        "MAG",
        status[
            "MAG"
        ],
    )

    progres_componente = int(
        (
            status[
                "SYS"
            ]
            + status[
                "ACC"
            ]
            + status[
                "GYR"
            ]
            + status[
                "MAG"
            ]
        )
        / 12
        * 100
    )

    progres_stabilitate = int(
        min(
            (
                st.session_state[
                    "calibration_stable_samples"
                ]
                / NUMAR_ESANTIOANE_CALIBRARE_STABILA
                * 100
            ),
            100,
        )
    )

    st.write(
        "Nivelul componentelor:"
    )

    st.progress(
        progres_componente
    )

    st.write(
        "Confirmarea stabilității:"
    )

    st.progress(
        progres_stabilitate
    )

    st.info(
        obtine_instructiune_calibrare(
            status
        )
    )

    if st.session_state[
        "calibration_running"
    ]:
        st.warning(
            "Calibrarea este în desfășurare."
        )

        st.write(
            "Eșantioane stabile:",
            st.session_state[
                "calibration_stable_samples"
            ],
            "/",
            NUMAR_ESANTIOANE_CALIBRARE_STABILA,
        )

    elif st.session_state[
        "calibration_saved"
    ]:
        st.success(
            "Profilul de calibrare salvat în ESP32 este disponibil. "
            "Poți porni exercițiile fără recalibrare."
        )

    elif st.session_state[
        "sensor_calibrated"
    ]:
        st.success(
            "Sistemul este calibrat. Salvează profilul "
            "pentru a-l restaura automat la următoarea pornire."
        )

    else:
        st.info(
            "Apasă butonul «Calibrează sistemul»."
        )


actualizeaza_calibrarea()



# PARTEA 9 - Interfata pentru executia exercitiului si afisarea live


# ==========================================================
# SECTIUNEA 4 - EXECUTAREA EXERCITIULUI
# ==========================================================

st.header(
    "4. Executarea exercițiului"
)

st.info(
    """
Apasă START înainte de prima repetare și STOP după ultima repetare.

Aplicația va:

- număra live repetările detectate;
- afișa Roll, Pitch și Yaw pe întregul interval;
- segmenta repetările după STOP;
- clasifica fiecare repetare separat;
- calcula rezultatul general al sesiunii.
"""
)


# ==========================================================
# SELECTARE EXERCITIU INTENTIONAT
# ==========================================================

st.selectbox(
    "Exercițiul pe care intenționezi să îl execuți",
    options=[
        6,
        7,
        8,
    ],
    format_func=lambda valoare: (
        EXERCISE_NAMES[
            valoare
        ]
    ),
    key="selected_exercise",
    disabled=st.session_state[
        "execution_running"
    ],
)


# ==========================================================
# OPTIUNE AFISARE ORIENTARE
# ==========================================================

st.checkbox(
    "Elimină salturile unghiurilor la ±180°",
    key="unwrap_orientation",
    disabled=st.session_state[
        "execution_running"
    ],
)


# ==========================================================
# VERIFICARE DACA SISTEMUL ESTE PREGATIT
# ==========================================================

# VERIFICARE DACA SISTEMUL ESTE PREGATIT
# Acceptam calibrarea curenta completa sau profilul salvat in NVM

sistem_pregatit = (
    st.session_state[
        "models_loaded"
    ]
    and conexiune_este_deschisa()
    and sistem_are_calibrare_utilizabila()
    and not st.session_state[
        "calibration_running"
    ]
)


# ==========================================================
# BUTOANE START SI STOP
# ==========================================================

(
    coloana_start_exercitiu,
    coloana_stop_exercitiu,
) = st.columns(
    2
)

with coloana_start_exercitiu:
    st.button(
        "START exercițiu",
        type="primary",
        on_click=porneste_executia,
        disabled=(
            not sistem_pregatit
            or st.session_state[
                "execution_running"
            ]
        ),
        use_container_width=True,
    )

with coloana_stop_exercitiu:
    st.button(
        "STOP exercițiu",
        on_click=opreste_executia,
        disabled=not st.session_state[
            "execution_running"
        ],
        use_container_width=True,
    )


# ==========================================================
# MESAJE STATUS EXECUTIE
# ==========================================================

if not st.session_state[
    "models_loaded"
]:
    st.warning(
        "Încarcă modelele înainte de START."
    )

elif not conexiune_este_deschisa():
    st.warning(
        "Conectează ESP32 înainte de START."
    )

elif not sistem_are_calibrare_utilizabila():
    st.warning(
        "Finalizează calibrarea sau folosește un profil "
        "de calibrare salvat în ESP32 înainte de START."
    )

elif st.session_state[
    "execution_running"
]:
    st.success(
        "Înregistrarea este activă. "
        "Apasă STOP după ultima repetare."
    )

else:
    st.success(
        "Sistemul este pregătit pentru exercițiu."
    )


# ==========================================================
# STABILIRE ACTUALIZARE AUTOMATA EXECUTIE
# ==========================================================

execution_run_every = (
    INTERVAL_ACTUALIZARE_EXECUTIE
    if st.session_state[
        "execution_running"
    ]
    else None
)


# ==========================================================
# ACTUALIZARE LIVE EXECUTIE
# ==========================================================

@st.fragment(
    run_every=execution_run_every
)
def actualizeaza_executia_live():
    if st.session_state[
        "execution_running"
    ]:
        if not conexiune_este_deschisa():
            st.session_state[
                "execution_running"
            ] = False

            st.error(
                "Conexiunea serială a fost pierdută."
            )

            return

        esantioane = citeste_esantioane_disponibile()

        for esantion in esantioane:
            adauga_esantion_executie(
                esantion
            )

        if len(
            st.session_state[
                "execution_signal"
            ]
        ) >= FS:
            date_live = np.asarray(
                st.session_state[
                    "execution_signal"
                ],
                dtype=float,
            )

            # FUNCTIA NOUA FOLOSITA PENTRU LIVE
            informatii_live = numara_repetitii_live(
                date_live
            )


            st.session_state[
                "live_repetition_count"
            ] = informatii_live[
                "repetition_count"
            ]

            st.session_state[
                "live_peak_count"
            ] = informatii_live[
                "peak_count"
            ]

    orientare = st.session_state[
        "execution_orientation"
    ]

    if not orientare:
        st.info(
            "Orientarea și numărul repetărilor vor fi afișate "
            "după apăsarea butonului START."
        )

        return

    ultima_valoare = orientare[
        -1
    ]

    (
        coloana_roll,
        coloana_pitch,
        coloana_yaw,
        coloana_repetari,
    ) = st.columns(
        4
    )

    coloana_roll.metric(
        "Roll",
        f"{ultima_valoare['roll']:.2f}°",
    )

    coloana_pitch.metric(
        "Pitch",
        f"{ultima_valoare['pitch']:.2f}°",
    )

    coloana_yaw.metric(
        "Yaw",
        f"{ultima_valoare['yaw']:.2f}°",
    )

    coloana_repetari.metric(
        "Execuții detectate live",
        st.session_state[
            "live_repetition_count"
        ],
    )

    (
        coloana_durata,
        coloana_esantioane,
    ) = st.columns(
        2
    )

    coloana_durata.metric(
        "Durata înregistrării",
        f"{ultima_valoare['t']:.2f} s",
    )

    coloana_esantioane.metric(
        "Eșantioane înregistrate",
        len(
            st.session_state[
                "execution_signal"
            ]
        ),
    )

    st.caption(
        "Vârfuri detectate: "
        f"{st.session_state['live_peak_count']} | "
        "Două vârfuri sunt considerate o repetare."
    )

    df_orientare_grafic = pregateste_orientare_pentru_grafic(
        orientare
    )

    st.line_chart(
        df_orientare_grafic.set_index(
            "t"
        )[
            [
                "roll",
                "pitch",
                "yaw",
            ]
        ],
        use_container_width=True,
    )

    st.info(
        "Calibrare curentă | "
        f"SYS: {ultima_valoare['SYS']} | "
        f"ACC: {ultima_valoare['ACC']} | "
        f"GYR: {ultima_valoare['GYR']} | "
        f"MAG: {ultima_valoare['MAG']}"
    )

    if st.session_state[
        "execution_running"
    ]:
        st.success(
            "Înregistrarea continuă. "
            "Apasă STOP după ultima repetare."
        )

    else:
        st.info(
            "Înregistrarea este oprită. "
            "Graficul complet rămâne afișat."
        )


actualizeaza_executia_live()



# PARTEA 10 - Procesarea dupa STOP si afisarea rezultatului final


# ==========================================================
# CLASIFICARE DATE DUPA APASAREA BUTONULUI STOP
# ==========================================================

if st.session_state[
    "execution_ready_to_process"
]:
    st.session_state[
        "execution_ready_to_process"
    ] = False

    date_segment = np.asarray(
        st.session_state[
            "execution_signal"
        ],
        dtype=float,
    )

    if len(date_segment) < NUMAR_MINIM_ESANTIOANE_EXECUTIE:
        st.session_state[
            "last_prediction"
        ] = None

        st.error(
            "Înregistrarea este prea scurtă. "
            "Sunt necesare cel puțin "
            f"{NUMAR_MINIM_ESANTIOANE_EXECUTIE} eșantioane."
        )

    else:
        try:
            rezultat = clasifica_sesiune_pe_repetitii(
                date_segment
            )

            rezultat[
                "expected_exercise"
            ] = st.session_state[
                "selected_exercise"
            ]

            rezultat[
                "samples"
            ] = len(
                date_segment
            )

            rezultat[
                "duration_seconds"
            ] = (
                len(date_segment)
                / FS
            )

            st.session_state[
                "last_prediction"
            ] = rezultat

            st.session_state[
                "final_repetition_count"
            ] = rezultat[
                "repetition_count"
            ]

            st.session_state[
                "repetition_results"
            ] = rezultat[
                "repetition_results"
            ]

            st.session_state[
                "segmentation_information"
            ] = rezultat[
                "segmentation_information"
            ]

            rand_istoric = {
                "timestamp": time.strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),
                "expected_exercise": rezultat[
                    "expected_exercise"
                ],
                "predicted_exercise": rezultat[
                    "exercise"
                ],
                "exercise_confidence": rezultat[
                    "exercise_confidence"
                ],
                "predicted_quality": rezultat[
                    "quality"
                ],
                "quality_confidence": rezultat[
                    "quality_confidence"
                ],
                "repetition_count": rezultat[
                    "repetition_count"
                ],
                "samples": rezultat[
                    "samples"
                ],
                "duration_seconds": rezultat[
                    "duration_seconds"
                ],
            }

            st.session_state[
                "exercise_history"
            ].append(
                rand_istoric
            )

        except Exception as eroare:
            st.session_state[
                "last_prediction"
            ] = None

            st.error(
                f"Predicția a eșuat: {eroare}"
            )


# ==========================================================
# AFISARE REZULTAT ULTIMA SESIUNE
# ==========================================================

if st.session_state[
    "last_prediction"
] is not None:
    rezultat = st.session_state[
        "last_prediction"
    ]

    st.subheader(
        "Rezultatul sesiunii"
    )

    (
        coloana_exercitiu,
        coloana_calitate,
        coloana_executii,
    ) = st.columns(
        3
    )

    coloana_exercitiu.metric(
        "Exercițiu evaluat",
        EXERCISE_NAMES[
            rezultat[
                "exercise"
            ]
        ],
        (
            f"{rezultat['exercise_confidence']:.2f}% "
            "încredere"
        ),
    )

    coloana_calitate.metric(
        "Calitatea execuției",
        QUALITY_NAMES[
            rezultat[
                "quality"
            ]
        ],
        (
            f"{rezultat['quality_confidence']:.2f}% "
            "încredere"
        ),
    )

    coloana_executii.metric(
        "Număr de execuții",
        rezultat[
            "repetition_count"
        ],
    )

    if (
            rezultat[
                "model_detected_exercise"
            ]
            == rezultat[
        "expected_exercise"
    ]
    ):
        st.success(
            "Modelul de identificare confirmă exercițiul selectat."
        )

    else:
        st.warning(
            "Pentru evaluarea calității s-a folosit exercițiul selectat: "
            f"{EXERCISE_NAMES[rezultat['expected_exercise']]}. "
            "Modelul de identificare ar fi detectat "
            f"{EXERCISE_NAMES[rezultat['model_detected_exercise']]} "
            f"cu {rezultat['model_detected_exercise_confidence']:.2f}% încredere."
        )

    (
        coloana_durata,
        coloana_numar,
    ) = st.columns(
        2
    )

    coloana_durata.metric(
        "Durata analizată",
        f"{rezultat['duration_seconds']:.2f} s",
    )

    coloana_numar.metric(
        "Număr de eșantioane",
        rezultat[
            "samples"
        ],
    )


    # ==========================================================
    # AFISARE REZULTAT FIECARE EXECUTIE
    # ==========================================================

    st.subheader(
        "Rezultatele fiecărei execuții"
    )

    rezultate_repetitii_df = pd.DataFrame(
        rezultat[
            "repetition_results"
        ]
    )

    if not rezultate_repetitii_df.empty:
        rezultate_repetitii_df[
            "predicted_exercise_name"
        ] = rezultate_repetitii_df[
            "predicted_exercise"
        ].map(
            EXERCISE_NAMES
        )

        rezultate_repetitii_df[
            "predicted_quality_name"
        ] = rezultate_repetitii_df[
            "predicted_quality"
        ].map(
            QUALITY_NAMES
        )

        coloane_repetitii = [
            "repetition",
            "duration_seconds",
            "predicted_exercise_name",
            "exercise_confidence",
            "predicted_quality_name",
            "quality_confidence",
            "samples",
            "start_sample",
            "end_sample",
        ]

        st.dataframe(
            rezultate_repetitii_df[
                coloane_repetitii
            ],
            use_container_width=True,
            hide_index=True,
        )


    # ==========================================================
    # AFISARE PROBABILITATI REZULTAT GENERAL
    # ==========================================================

    with st.expander(
        "Probabilitățile rezultatului general"
    ):
        probabilitati_exercitii_df = pd.DataFrame([
            {
                "Clasă": EXERCISE_NAMES[
                    clasa
                ],
                "Probabilitate [%]": probabilitate,
            }
            for clasa, probabilitate
            in rezultat[
                "exercise_probabilities"
            ].items()
        ])

        st.write(
            "Probabilități exerciții"
        )

        st.dataframe(
            probabilitati_exercitii_df,
            use_container_width=True,
            hide_index=True,
        )

        probabilitati_calitate_df = pd.DataFrame([
            {
                "Clasă": QUALITY_NAMES[
                    clasa
                ],
                "Probabilitate [%]": probabilitate,
            }
            for clasa, probabilitate
            in rezultat[
                "quality_probabilities"
            ].items()
        ])

        st.write(
            "Probabilități calitate"
        )

        st.dataframe(
            probabilitati_calitate_df,
            use_container_width=True,
            hide_index=True,
        )


    # ==========================================================
    # AFISARE INFORMATII SEGMENTARE
    # ==========================================================

    with st.expander(
        "Informații despre segmentare"
    ):
        informatii_segmentare = rezultat[
            "segmentation_information"
        ]

        st.write(
            "Număr vârfuri detectate:",
            informatii_segmentare[
                "peak_count"
            ],
        )

        st.write(
            "Prominență folosită:",
            informatii_segmentare[
                "prominence"
            ],
        )

        st.write(
            "Două vârfuri sunt considerate o execuție."
        )


    # ==========================================================
    # AFISARE SI DESCARCARE DATE BRUTE
    # ==========================================================

    with st.expander(
        "Datele brute și orientarea"
    ):
        date_semnal_df = pd.DataFrame(
            st.session_state[
                "execution_signal"
            ],
            columns=SIGNAL_COLUMNS,
        )

        date_orientare_df = pd.DataFrame(
            st.session_state[
                "execution_orientation"
            ]
        )

        st.write(
            "Date accelerometru și giroscop"
        )

        st.dataframe(
            date_semnal_df,
            use_container_width=True,
        )

        st.write(
            "Date orientare"
        )

        st.dataframe(
            date_orientare_df,
            use_container_width=True,
        )

        (
            coloana_download_semnal,
            coloana_download_orientare,
            coloana_download_repetitii,
        ) = st.columns(
            3
        )

        with coloana_download_semnal:
            st.download_button(
                "Descarcă semnalul CSV",
                data=date_semnal_df.to_csv(
                    index=False
                ).encode(
                    "utf-8"
                ),
                file_name="semnal_exercitiu.csv",
                mime="text/csv",
                use_container_width=True,
            )

        with coloana_download_orientare:
            st.download_button(
                "Descarcă orientarea CSV",
                data=date_orientare_df.to_csv(
                    index=False
                ).encode(
                    "utf-8"
                ),
                file_name="orientare_exercitiu.csv",
                mime="text/csv",
                use_container_width=True,
            )

        with coloana_download_repetitii:
            st.download_button(
                "Descarcă repetările CSV",
                data=rezultate_repetitii_df.to_csv(
                    index=False
                ).encode(
                    "utf-8"
                ),
                file_name="rezultate_repetitii.csv",
                mime="text/csv",
                use_container_width=True,
            )


# ==========================================================
# BUTON STERGERE ULTIMA SESIUNE
# ==========================================================

if (
    st.session_state[
        "execution_signal"
    ]
    and not st.session_state[
        "execution_running"
    ]
):
    st.button(
        "Șterge ultima sesiune",
        on_click=sterge_ultima_inregistrare,
    )



# PARTEA 11 - Istoricul sesiunilor finalizate


# ==========================================================
# SECTIUNEA 5 - ISTORICUL SESIUNILOR
# ==========================================================

st.header(
    "5. Istoricul sesiunilor"
)

if st.session_state[
    "exercise_history"
]:
    istoric_df = pd.DataFrame(
        st.session_state[
            "exercise_history"
        ]
    )

    istoric_df[
        "expected_exercise_name"
    ] = istoric_df[
        "expected_exercise"
    ].map(
        EXERCISE_NAMES
    )

    istoric_df[
        "predicted_exercise_name"
    ] = istoric_df[
        "predicted_exercise"
    ].map(
        EXERCISE_NAMES
    )

    istoric_df[
        "quality_name"
    ] = istoric_df[
        "predicted_quality"
    ].map(
        QUALITY_NAMES
    )

    coloane_afisate = [
        "timestamp",
        "expected_exercise_name",
        "predicted_exercise_name",
        "exercise_confidence",
        "quality_name",
        "quality_confidence",
        "repetition_count",
        "samples",
        "duration_seconds",
    ]

    st.dataframe(
        istoric_df[
            coloane_afisate
        ],
        use_container_width=True,
        hide_index=True,
    )

    st.download_button(
        "Descarcă istoricul CSV",
        data=istoric_df.to_csv(
            index=False
        ).encode(
            "utf-8"
        ),
        file_name="istoric_sesiuni.csv",
        mime="text/csv",
    )

else:
    st.info(
        "Nu a fost finalizată încă nicio sesiune."
    )

