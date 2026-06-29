// Setari locale pentru profilul doctorului si fluxul KinetoLive
export const DOCTOR_SETTINGS_KEY = "kinetolive:doctor-settings";

export type AnalysisAction = "none" | "analyze" | "analyzeAndSave";
export type PatientSelectionPreference = "lastSelected" | "latestAdded";

export interface DoctorSettings {
  defaultExerciseCode: number;
  defaultAnalysisAction: AnalysisAction;
  patientSelectionPreference: PatientSelectionPreference;
  allowExerciseChangeAfterStop: boolean;
  showConfidenceScores: boolean;
  showModelDetectedExercise: boolean;
  showSegments: boolean;
  showMlDebug: boolean;
  confirmPatientDelete: boolean;
  confirmSessionDelete: boolean;
}

export const DEFAULT_DOCTOR_SETTINGS: DoctorSettings = {
  defaultExerciseCode: 0,
  defaultAnalysisAction: "none",
  patientSelectionPreference: "lastSelected",
  allowExerciseChangeAfterStop: true,
  showConfidenceScores: true,
  showModelDetectedExercise: true,
  showSegments: true,
  showMlDebug: true,
  confirmPatientDelete: true,
  confirmSessionDelete: true,
};

export function getDoctorSettings(): DoctorSettings {
  if (typeof window === "undefined") {
    return DEFAULT_DOCTOR_SETTINGS;
  }

  try {
    const savedSettings = window.localStorage.getItem(DOCTOR_SETTINGS_KEY);

    if (!savedSettings) {
      return DEFAULT_DOCTOR_SETTINGS;
    }

    return {
      ...DEFAULT_DOCTOR_SETTINGS,
      ...(JSON.parse(savedSettings) as Partial<DoctorSettings>),
    };
  } catch {
    return DEFAULT_DOCTOR_SETTINGS;
  }
}

export function saveDoctorSettings(settings: DoctorSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DOCTOR_SETTINGS_KEY, JSON.stringify(settings));
}
