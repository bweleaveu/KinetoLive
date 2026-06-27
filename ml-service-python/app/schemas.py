# Scheme Pydantic pentru requesturile si raspunsurile serviciului ML
from pydantic import BaseModel
from typing import List, Optional


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
    featureColumns: List[str]
    samples: List[MlSignalSampleDto]


class RepetitionPredictionDto(BaseModel):
    repetitionIndex: int
    durationSeconds: float
    predictedExerciseCode: int
    predictedExerciseName: str
    exerciseConfidence: float
    predictedQualityCode: int
    predictedQualityName: str
    qualityConfidence: float
    sampleCount: int
    startSample: int
    endSample: int


class MlAnalysisResponseDto(BaseModel):
    sessionId: int
    sampleCount: int
    durationSeconds: float
    repetitionCount: int

    detectedExerciseCode: Optional[int]
    detectedExerciseName: Optional[str]
    exerciseConfidence: Optional[float]

    qualityCode: Optional[int]
    qualityName: Optional[str]
    qualityConfidence: Optional[float]

    readyForAnalysis: bool
    message: str

    repetitions: List[RepetitionPredictionDto]