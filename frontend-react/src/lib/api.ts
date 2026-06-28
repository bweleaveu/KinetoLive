// Client API pentru comunicarea cu backend-ul KinetoLive
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export const WS_URL =
  import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws/sensor";

// Interfata pentru exercitii cu texte in romana si engleza
export interface Exercise {
  id?: number;
  exerciseCode: number;
  nameRo?: string;
  nameEn?: string;
  descriptionRo?: string;
  descriptionEn?: string;
  active?: boolean;
}


export interface PatientProfile {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  doctorId?: number | null;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  medicalNotes?: string | null;
}

export interface PatientProfilePayload {
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  medicalNotes?: string | null;
}

export interface TherapySession {
  id: number;
  patientId: number;
  patientName?: string;

  intendedExerciseCode: number;
  intendedExerciseName?: string;

  detectedExerciseCode?: number | null;
  detectedExerciseName?: string | null;

  status: string;
  startedAt: string;
  endedAt?: string | null;

  sampleCount?: number | null;
  durationSeconds?: number | null;
  repetitionCount?: number | null;

  exerciseConfidence?: number | null;

  qualityModelExerciseCode?: number | null;
  qualityModelExerciseName?: string | null;

  qualityCode?: number | null;
  qualityName?: string | null;
  qualityConfidence?: number | null;

  notes?: string | null;
  message?: string | null;
}

export interface RepetitionResult {
  id?: number;
  repetitionIndex: number;

  durationSeconds?: number | null;

  predictedExerciseCode?: number | null;
  predictedQualityCode?: number | null;
  predictedQualityName?: string | null;

  exerciseConfidence?: number | null;
  qualityConfidence?: number | null;

  modelDetectedExerciseCode?: number | null;
  modelDetectedExerciseName?: string | null;
  modelDetectedExerciseConfidence?: number | null;

  qualityModelExerciseCode?: number | null;
  qualityModelExerciseName?: string | null;

  classificationStartSample?: number | null;
  classificationEndSample?: number | null;

  motionAmplitude?: number | null;
  accEnergy?: number | null;
  gyrEnergy?: number | null;

  sampleCount?: number | null;
  startSample?: number | null;
  endSample?: number | null;

  // Campuri pastrate pentru compatibilitate cu paginile deja generate
  startIndex?: number | null;
  endIndex?: number | null;
  exerciseCode?: number | null;
  qualityName?: string | null;
}

// Interfata pentru un esantion primit de la senzor
export interface SensorSample {
  sessionId: number;
  sampleIndex: number;

  accX: number;
  accY: number;
  accZ: number;

  gyrX: number;
  gyrY: number;
  gyrZ: number;

  magX: number;
  magY: number;
  magZ: number;

  quatW: number;
  quatX: number;
  quatY: number;
  quatZ: number;

  calSys: number;
  calAcc: number;
  calGyr: number;
  calMag: number;

  // Camp local folosit doar in frontend pentru timpul real din grafic
  timeSeconds?: number;
}

export interface LiveSensorBroadcastMessage {
  type: string;
  serverTime: string;
  bufferedSampleCount: number;
  sample: SensorSample;
}

export interface LiveSessionBufferStatus {
  sessionId: number;
  sampleCount: number;
  active: boolean;
}

// Interfata pentru starea controlului ESP32 din backend
export interface DeviceControlState {
  streamingEnabled: boolean;
  sessionId: number | null;

  calibrationCommandId?: number | null;
  calibrationCommand?: string | null;
  calibrationMonitoringEnabled?: boolean;
}

export interface DeviceCalibrationStatus {
  calSys: number;
  calAcc: number;
  calGyr: number;
  calMag: number;

  calibrationSaved: boolean;
  fullyCalibrated: boolean;
  usable: boolean;
  monitoringEnabled: boolean;
  restartRequired: boolean;

  stableSamples: number;
  requiredStableSamples: number;

  pendingCommandId?: number | null;
  pendingCommand?: string | null;

  message?: string | null;
  messageType?: "success" | "warning" | "error" | "info" | string | null;
  lastUpdatedAt?: string | null;
}

export interface MlRepetitionPrediction {
  repetitionIndex: number;
  durationSeconds: number;

  predictedExerciseCode: number;
  predictedExerciseName: string;
  exerciseConfidence: number;

  modelDetectedExerciseCode?: number | null;
  modelDetectedExerciseName?: string | null;
  modelDetectedExerciseConfidence?: number | null;

  qualityModelExerciseCode?: number | null;
  qualityModelExerciseName?: string | null;

  predictedQualityCode: number;
  predictedQualityName: string;
  qualityConfidence: number;

  sampleCount: number;
  startSample: number;
  endSample: number;

  classificationStartSample?: number | null;
  classificationEndSample?: number | null;

  motionAmplitude?: number | null;
  accEnergy?: number | null;
  gyrEnergy?: number | null;
}

export interface MLAnalysisResult {
  sessionId?: number;
  sampleCount?: number;
  durationSeconds?: number;
  repetitionCount?: number;

  selectedExerciseCode?: number | null;
  selectedExerciseName?: string | null;
  analysisMode?: string | null;

  detectedExerciseCode?: number | null;
  detectedExerciseName?: string | null;
  exerciseConfidence?: number | null;

  qualityModelExerciseCode?: number | null;
  qualityModelExerciseName?: string | null;

  qualityCode?: number | null;
  qualityName?: string | null;
  qualityConfidence?: number | null;

  readyForAnalysis?: boolean;
  message?: string;

  segmentationInformation?: Record<string, unknown> | null;
  motionMetrics?: Record<string, unknown> | null;

  repetitions?: RepetitionResult[];
}

export interface LiveSessionAnalysisResult {
  sessionId: number;
  savedToDatabase: boolean;
  message: string;
  mlResult: MLAnalysisResult;
  savedSession: TherapySession | null;
}

// Importa tokenul JWT salvat dupa login
import { dispatchUnauthorized, getStoredToken } from "@/lib/auth";

// Trimite request-uri catre backend si adauga tokenul JWT daca doctorul este logat
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      dispatchUnauthorized();
    }

    const errorText = await response.text().catch(() => "");

    throw new Error(
      errorText || `${response.status} ${response.statusText} on ${path}`,
    );
  }

  const text = await response.text();

  return text ? (JSON.parse(text) as T) : (undefined as T);
}

function normalizeConfidence(value?: number | null): number | null {
  // Backend-ul trimite increderea in procente, iar frontend-ul existent o afiseaza ca valoare 0-1
  if (typeof value !== "number") {
    return value ?? null;
  }

  if (value > 1) {
    return value / 100;
  }

  return value;
}

function normalizeQualityName(value?: string | null): string | null {
  // Pastreaza denumirile de calitate intr-un format folosit in interfata
  if (!value) {
    return value ?? null;
  }

  if (value === "Amplitudine mica") {
    return "Small amplitude";
  }

  return value;
}

function normalizeSession(session: TherapySession): TherapySession {
  // Adapteaza raspunsul unei sesiuni la structura folosita de frontend
  return {
    ...session,
    exerciseConfidence: normalizeConfidence(session.exerciseConfidence),
    qualityConfidence: normalizeConfidence(session.qualityConfidence),
    qualityName: normalizeQualityName(session.qualityName),
    message: session.message ?? session.notes ?? null,
  };
}

function normalizeRepetition(repetition: RepetitionResult): RepetitionResult {
  // Adapteaza raspunsul unei repetari la structura folosita de paginile existente
  const exerciseCode =
    repetition.exerciseCode ?? repetition.predictedExerciseCode ?? null;

  const qualityName = normalizeQualityName(
    repetition.qualityName ?? repetition.predictedQualityName ?? null,
  );

  return {
    ...repetition,
    exerciseCode,
    qualityName,
    startIndex: repetition.startIndex ?? repetition.startSample ?? null,
    endIndex: repetition.endIndex ?? repetition.endSample ?? null,
    exerciseConfidence: normalizeConfidence(repetition.exerciseConfidence),
    modelDetectedExerciseConfidence: normalizeConfidence(
      repetition.modelDetectedExerciseConfidence,
    ),
    qualityConfidence: normalizeConfidence(repetition.qualityConfidence),
  };
}

function normalizeMlResult(result: MLAnalysisResult): MLAnalysisResult {
  // Adapteaza raspunsul analizei prin invatare automata la formatul folosit in componentele React
  return {
    ...result,
    exerciseConfidence: normalizeConfidence(result.exerciseConfidence),
    qualityConfidence: normalizeConfidence(result.qualityConfidence),
    qualityName: normalizeQualityName(result.qualityName),
    repetitions: result.repetitions?.map(normalizeRepetition) ?? [],
  };
}

export const api = {
  // Verifica daca backend-ul Spring Boot raspunde
  health: async () => {
    const response = await fetch(`${API_BASE}/api/health`);

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} on /api/health`);
    }

    return response.text();
  },

  exercises: () => request<Exercise[]>("/api/exercises"),

  exercise: (code: number) => request<Exercise>(`/api/exercises/${code}`),

  patients: () => request<PatientProfile[]>("/api/patients"),

  patient: (patientId: number) =>
    request<PatientProfile>(`/api/patients/${patientId}`),

  createPatient: (payload: PatientProfilePayload) =>
    request<PatientProfile>("/api/patients", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updatePatient: (patientId: number, payload: PatientProfilePayload) =>
    request<PatientProfile>(`/api/patients/${patientId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deletePatient: (patientId: number) =>
    request<void>(`/api/patients/${patientId}`, {
      method: "DELETE",
    }),

  startSession: async (patientId: number, intendedExerciseCode: number) => {
    const session = await request<TherapySession>("/api/therapy-sessions/start", {
      method: "POST",
      body: JSON.stringify({
        patientId,
        intendedExerciseCode,
      }),
    });

    return normalizeSession(session);
  },

  patientSessions: async (patientId: number) => {
    const sessions = await request<TherapySession[]>(
      `/api/therapy-sessions/patient/${patientId}`,
    );

    return sessions.map(normalizeSession);
  },

  session: async (sessionId: number) => {
    const session = await request<TherapySession>(
      `/api/therapy-sessions/${sessionId}`,
    );

    return normalizeSession(session);
  },

  sessionRepetitions: async (sessionId: number) => {
    const repetitions = await request<RepetitionResult[]>(
      `/api/therapy-sessions/${sessionId}/repetitions`,
    );

    return repetitions.map(normalizeRepetition);
  },

  liveSampleCount: (sessionId: number) =>
    request<LiveSessionBufferStatus>(
      `/api/live-sessions/${sessionId}/sample-count`,
    ),

  liveSamples: (sessionId: number) =>
    request<SensorSample[]>(`/api/live-sessions/${sessionId}/samples`),

  analyze: async (sessionId: number) => {
    const result = await request<MLAnalysisResult>(
      `/api/live-sessions/${sessionId}/analyze`,
      {
        method: "POST",
      },
    );

    return normalizeMlResult(result);
  },

  analyzeAndSave: async (sessionId: number) => {
    const result = await request<LiveSessionAnalysisResult>(
      `/api/live-sessions/${sessionId}/analyze-and-save`,
      {
        method: "POST",
      },
    );

    return normalizeMlResult(result.mlResult);
  },

  analyzeAndSaveFull: async (sessionId: number) => {
    const result = await request<LiveSessionAnalysisResult>(
      `/api/live-sessions/${sessionId}/analyze-and-save`,
      {
        method: "POST",
      },
    );

    return {
      ...result,
      mlResult: normalizeMlResult(result.mlResult),
      savedSession: result.savedSession
        ? normalizeSession(result.savedSession)
        : null,
    };
  },

  // Anunta backend-ul ca ESP32 trebuie sa inceapa transmiterea pentru sesiunea curenta
  startDeviceStreaming: (sessionId: number) =>
    request<DeviceControlState>(`/api/device-control/start/${sessionId}`, {
      method: "POST",
    }),

  // Anunta backend-ul ca ESP32 trebuie sa opreasca transmiterea
  stopDeviceStreaming: () =>
    request<DeviceControlState>("/api/device-control/stop", {
      method: "POST",
    }),

  // Citeste starea controlului ESP32
  deviceControlState: () =>
    request<DeviceControlState>("/api/device-control/state"),

  // Citeste statusul calibrarii BNO055
  deviceCalibrationStatus: () =>
    request<DeviceCalibrationStatus>("/api/device-calibration/status"),

  // Porneste monitorizarea calibrarii BNO055
  startDeviceCalibration: () =>
    request<DeviceCalibrationStatus>("/api/device-calibration/start", {
      method: "POST",
    }),

  // Opreste monitorizarea calibrarii BNO055
  stopDeviceCalibration: () =>
    request<DeviceCalibrationStatus>("/api/device-calibration/stop", {
      method: "POST",
    }),

  // Salveaza calibrarea curenta in memoria nevolatila a ESP32
  saveDeviceCalibration: () =>
    request<DeviceCalibrationStatus>("/api/device-calibration/save", {
      method: "POST",
    }),

  // Sterge calibrarea salvata
  clearDeviceCalibration: () =>
    request<DeviceCalibrationStatus>("/api/device-calibration/clear", {
      method: "POST",
    }),

  // Cere ESP32 sa foloseasca profilul de calibrare salvat
  useSavedDeviceCalibration: () =>
    request<DeviceCalibrationStatus>("/api/device-calibration/use-saved", {
      method: "POST",
    }),

  clearBuffer: (sessionId: number) =>
    request<void>(`/api/live-sessions/${sessionId}/samples`, {
      method: "DELETE",
    }),
};

// Exercitii locale de rezerva, folosite daca backend-ul nu raspunde
export const EXERCISE_FALLBACK: Exercise[] = [
  {
    exerciseCode: 0,
    nameRo: "Detectie automata",
    nameEn: "Automatic detection",
    descriptionRo:
      "Aplicatia detecteaza automat exercitiul executat si foloseste modelul de calitate potrivit.",
    descriptionEn:
      "The application automatically detects the performed exercise and uses the proper quality model.",
  },
  {
    exerciseCode: 6,
    nameRo: "Exercitiul 6",
    nameEn: "Exercise 6",
    descriptionRo:
      "Stati asezat pe un scaun si tineti o greutate de 1 kg in mana dreapta. Intindeti bratul drept in fata corpului, putin deasupra genunchiului drept, cu palma orientata in sus. Indoiti cotul si ridicati greutatea pana cand antebratul ajunge perpendicular pe coapsa. Mentineti pozitia timp de 5 secunde, apoi reveniti la pozitia initiala.",
    descriptionEn:
      "Sitting on a chair, holding a 1 kg weight in the right hand, extend the right arm in front of the body to just above the right knee with the palm facing upwards. Bending the elbow joint, raise the weight until the forearm is perpendicular with the thigh, hold for 5 s, and return to the initial position.",
  },
  {
    exerciseCode: 7,
    nameRo: "Exercitiul 7",
    nameEn: "Exercise 7",
    descriptionRo:
      "Stati in picioare, cu bratul drept intins pe langa corp si cu o greutate de 1 kg in mana dreapta. Ridicati bratul lateral, din umar, pana ajunge in pozitie orizontala, mentinand cotul drept. Mentineti pozitia timp de 5 secunde, apoi reveniti la pozitia initiala.",
    descriptionEn:
      "Standing upright with the right arm holding a 1 kg weight and hanging straight down, raise the weight to the right side from the shoulder joint to a horizontal position while keeping the elbow joint straight, hold for 5 s, then return to the initial position.",
  },
  {
    exerciseCode: 8,
    nameRo: "Exercitiul 8",
    nameEn: "Exercise 8",
    descriptionRo:
      "Stati culcat cu fata in jos pe o suprafata plana ridicata, cu bratul drept lasat peste margine si indoit la nivelul cotului. Ridicati antebratul drept pana cand cotul se indreapta. Mentineti pozitia timp de 5 secunde, apoi reveniti la pozitia initiala.",
    descriptionEn:
      "Lying facedown on a raised flat surface, hang the right arm over the side at the elbow. Raise the right forearm to straighten the elbow, hold for 5 s, then return to the initial position.",
  },
];

export const QUALITY_COLORS: Record<string, string> = {
  Normal: "var(--color-mint)",
  Rapid: "var(--color-amber)",
  "Small amplitude": "var(--color-violet)",
  "Amplitudine mica": "var(--color-violet)",
};

export function qualityBadgeClass(quality?: string | null): string {
  const normalizedQuality = normalizeQualityName(quality);

  switch (normalizedQuality) {
    case "Normal":
      return "bg-[color:var(--mint)]/15 text-[color:var(--mint)] border-[color:var(--mint)]/30";
    case "Rapid":
      return "bg-[color:var(--amber)]/15 text-[color:var(--amber)] border-[color:var(--amber)]/30";
    case "Small amplitude":
      return "bg-[color:var(--violet)]/15 text-[color:var(--violet)] border-[color:var(--violet)]/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
