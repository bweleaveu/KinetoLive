# Configurare generala pentru serviciul ML KinetoLive
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODELS_ROOT = PROJECT_ROOT / "models"

FS = 25

EXERCISE_NAMES = {
    6: "Exercise 6",
    7: "Exercise 7",
    8: "Exercise 8",
}

QUALITY_NAMES = {
    1: "Normal",
    2: "Rapid",
    3: "Small amplitude",
}