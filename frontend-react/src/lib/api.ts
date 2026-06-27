// Client API pentru comunicarea cu backend-ul KinetoLive
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export const WS_URL =
  import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws/sensor";

export interface Exercise {
  id?: number;
  exerciseCode: number;
  name: string;
  description: string;
  active?: boolean;
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

export interface MlRepetitionPrediction {
  repetitionIndex: number;
  durationSeconds: number;

  predictedExerciseCode: number;
  predictedExerciseName: string;
  exerciseConfidence: number;

  predictedQualityCode: number;
  predictedQualityName: string;
  qualityConfidence: number;

  sampleCount: number;
  startSample: number;
  endSample: number;
}

export interface MLAnalysisResult {
  sessionId?: number;
  sampleCount?: number;
  durationSeconds?: number;
  repetitionCount?: number;

  detectedExerciseCode?: number | null;
  detectedExerciseName?: string | null;
  exerciseConfidence?: number | null;

  qualityCode?: number | null;
  qualityName?: string | null;
  qualityConfidence?: number | null;

  readyForAnalysis?: boolean;
  message?: string;

  repetitions?: RepetitionResult[];
}

export interface LiveSessionAnalysisResult {
  sessionId: number;
  savedToDatabase: boolean;
  message: string;
  mlResult: MLAnalysisResult;
  savedSession: TherapySession | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} on ${path}`);
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
    qualityConfidence: normalizeConfidence(repetition.qualityConfidence),
  };
}

function normalizeMlResult(result: MLAnalysisResult): MLAnalysisResult {
  // Adapteaza raspunsul ML la formatul folosit in componentele React
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

  clearBuffer: (sessionId: number) =>
    request<void>(`/api/live-sessions/${sessionId}/samples`, {
      method: "DELETE",
    }),
};

export const EXERCISE_FALLBACK: Exercise[] = [
  {
    exerciseCode: 6,
    name: "Exercise 6",
    description:
      "Sitting on a chair, holding a 1 kg weight in the right hand, extend the right arm in front of the body to just above the right knee with the palm facing upwards. Bending the elbow joint, raise the weight until the forearm is perpendicular with the thigh, hold for 5 s, and return to the initial position.",
  },
  {
    exerciseCode: 7,
    name: "Exercise 7",
    description:
      "Standing upright with the right arm holding a 1 kg weight and hanging straight down, raise the weight to the right side from the shoulder joint to a horizontal position while keeping the elbow joint straight, hold for 5 s, then return to the initial position.",
  },
  {
    exerciseCode: 8,
    name: "Exercise 8",
    description:
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
