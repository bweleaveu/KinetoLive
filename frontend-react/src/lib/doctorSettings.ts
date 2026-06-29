// Setari locale pentru profilul doctorului si fluxul KinetoLive
export const DOCTOR_SETTINGS_KEY = "kinetolive:doctor-settings";
export const DOCTOR_SETTINGS_EVENT = "kinetolive:doctor-settings-changed";

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

function normalizeDoctorSettings(settings: Partial<DoctorSettings>): DoctorSettings {
  const mergedSettings = {
    ...DEFAULT_DOCTOR_SETTINGS,
    ...settings,
  };

  if (![0, 6, 7, 8].includes(mergedSettings.defaultExerciseCode)) {
    mergedSettings.defaultExerciseCode = DEFAULT_DOCTOR_SETTINGS.defaultExerciseCode;
  }

  if (!["none", "analyze", "analyzeAndSave"].includes(mergedSettings.defaultAnalysisAction)) {
    mergedSettings.defaultAnalysisAction = DEFAULT_DOCTOR_SETTINGS.defaultAnalysisAction;
  }

  if (!["lastSelected", "latestAdded"].includes(mergedSettings.patientSelectionPreference)) {
    mergedSettings.patientSelectionPreference = DEFAULT_DOCTOR_SETTINGS.patientSelectionPreference;
  }

  return mergedSettings;
}

export function getDoctorSettings(): DoctorSettings {
  if (typeof window === "undefined") {
    return DEFAULT_DOCTOR_SETTINGS;
  }

  try {
    const savedSettings = window.localStorage.getItem(DOCTOR_SETTINGS_KEY);

    if (!savedSettings) {
      return DEFAULT_DOCTOR_SETTINGS;
    }

    return normalizeDoctorSettings(
      JSON.parse(savedSettings) as Partial<DoctorSettings>,
    );
  } catch {
    return DEFAULT_DOCTOR_SETTINGS;
  }
}

export function saveDoctorSettings(settings: DoctorSettings) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSettings = normalizeDoctorSettings(settings);

  window.localStorage.setItem(
    DOCTOR_SETTINGS_KEY,
    JSON.stringify(normalizedSettings),
  );

  window.dispatchEvent(
    new CustomEvent(DOCTOR_SETTINGS_EVENT, {
      detail: { settings: normalizedSettings },
    }),
  );
}

export function resetDoctorSettings() {
  saveDoctorSettings(DEFAULT_DOCTOR_SETTINGS);
}
