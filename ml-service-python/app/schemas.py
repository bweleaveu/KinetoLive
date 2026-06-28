# Scheme Pydantic pentru requesturile si raspunsurile serviciului ML
from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class MlSignalSampleDto(BaseModel):
    sampleIndex: Optional[int] = None

    accX: float
    accY: float
    accZ: float

    gyrX: float
    gyrY: float
    gyrZ: float


class MlAnalysisPayloadDto(BaseModel):
    sessionId: int
    samplingFrequencyHz: int
    sampleCount: int
    durationSeconds: float
    readyForAnalysis: bool
    message: str
    selectedExerciseCode: Optional[int] = None
    featureColumns: List[str]
    samples: List[MlSignalSampleDto]


class RepetitionPredictionDto(BaseModel):
    repetitionIndex: int
    durationSeconds: float

    predictedExerciseCode: int
    predictedExerciseName: str
    exerciseConfidence: float

    modelDetectedExerciseCode: Optional[int] = None
    modelDetectedExerciseName: Optional[str] = None
    modelDetectedExerciseConfidence: Optional[float] = None

    qualityModelExerciseCode: Optional[int] = None
    qualityModelExerciseName: Optional[str] = None

    predictedQualityCode: int
    predictedQualityName: str
    qualityConfidence: float

    sampleCount: int
    startSample: int
    endSample: int

    classificationStartSample: Optional[int] = None
    classificationEndSample: Optional[int] = None

    motionAmplitude: Optional[float] = None
    accEnergy: Optional[float] = None
    gyrEnergy: Optional[float] = None


class MlAnalysisResponseDto(BaseModel):
    sessionId: int
    sampleCount: int
    durationSeconds: float
    repetitionCount: int

    selectedExerciseCode: Optional[int] = None
    selectedExerciseName: Optional[str] = None
    analysisMode: Optional[str] = None

    detectedExerciseCode: Optional[int]
    detectedExerciseName: Optional[str]
    exerciseConfidence: Optional[float]

    qualityModelExerciseCode: Optional[int] = None
    qualityModelExerciseName: Optional[str] = None

    qualityCode: Optional[int]
    qualityName: Optional[str]
    qualityConfidence: Optional[float]

    readyForAnalysis: bool
    message: str

    segmentationInformation: Optional[Dict[str, Any]] = None
    motionMetrics: Optional[Dict[str, Any]] = None

    repetitions: List[RepetitionPredictionDto]
