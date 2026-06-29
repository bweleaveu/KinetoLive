# Aplicatia FastAPI pentru microserviciul ML KinetoLive
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI

from app.config import FS, MODELS_ROOT
from app.feature_extraction import FEATURE_NAMES
from app.prediction_service import prediction_service
from app.schemas import MlAnalysisPayloadDto, MlAnalysisResponseDto
from app.segmentation import segment_repetitions


def show_startup_info():
    # Afiseaza linkurile utile la pornirea serviciului ML
    print()
    print("==================================================")
    print("KinetoLive ML Service is running.")
    print("Health check: http://localhost:8000/api/ml/health")
    print("Swagger UI:   http://localhost:8000/docs")
    print("OpenAPI JSON: http://localhost:8000/openapi.json")
    print(f"Models root:  {MODELS_ROOT}")
    print(f"ML features:  {len(FEATURE_NAMES)}")
    print(f"Models loaded: {prediction_service.models_loaded}")
    print("==================================================")
    print()


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    # Ruleaza codul de pornire al aplicatiei FastAPI
    show_startup_info()
    yield


app = FastAPI(
    title="KinetoLive ML Service",
    version="1.0.0",
    description="Microserviciu pentru analiza exercitiilor de recuperare folosind modelele ML.",
    lifespan=lifespan,
)


@app.get("/api/ml/health")
def health_check():
    # Verifica daca serviciul ML ruleaza si daca modelele sunt incarcate
    return {
        "status": "running",
        "service": "KinetoLive ML Service",
        "samplingFrequencyHz": FS,
        **prediction_service.get_status(),
    }


@app.get("/api/ml/features")
def get_features():
    # Returneaza lista trasaturilor generate pentru modelele ML
    return {
        "featureCount": len(FEATURE_NAMES),
        "features": FEATURE_NAMES,
    }


@app.post("/api/ml/validate-payload")
def validate_payload(payload: MlAnalysisPayloadDto):
    # Verifica daca payload-ul primit de la Spring Boot are structura corecta
    return {
        "status": "valid",
        "sessionId": payload.sessionId,
        "sampleCount": payload.sampleCount,
        "receivedSamples": len(payload.samples),
        "durationSeconds": payload.durationSeconds,
    }


@app.post("/api/ml/test-segmentation")
def test_segmentation(payload: MlAnalysisPayloadDto):
    # Testeaza segmentarea repetarilor pe baza payload-ului primit
    signal_data = convert_payload_to_signal_matrix(payload)

    segments, segment_info, detection_info = segment_repetitions(
        signal_data,
        payload.selectedExerciseCode,
    )

    return {
        "sessionId": payload.sessionId,
        "sampleCount": len(signal_data),
        "durationSeconds": len(signal_data) / FS,
        "detectedRepetitions": len(segments),
        "detectionInfo": detection_info,
        "segments": segment_info,
    }


# Ruleaza analiza completa si afiseaza eroarea exacta daca apare
@app.post("/api/ml/analyze", response_model=MlAnalysisResponseDto)
def analyze_session(payload: MlAnalysisPayloadDto):
    try:
        return prediction_service.analyze_session(payload)
    except Exception as exception:
        print("EROARE LA ANALIZA ML:")
        print(type(exception).__name__)
        print(str(exception))
        raise


def convert_payload_to_signal_matrix(payload: MlAnalysisPayloadDto):
    # Converteste payload-ul primit intr-o matrice Nx6 pentru ML
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