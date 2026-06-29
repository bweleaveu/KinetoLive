// Hook pentru pacientul selectat global in aplicatie
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type PatientProfile } from "@/lib/api";
import { getStoredToken } from "@/lib/auth";
import { getDoctorSettings } from "@/lib/doctorSettings";

export const SELECTED_PATIENT_KEY = "kinetolive:selectedPatientId";
export const LAST_SELECTED_PATIENT_KEY = "kinetolive:lastSelectedPatientId";
export const SELECTED_PATIENT_EVENT = "kinetolive:selected-patient-changed";

function readPatientIdFromStorage(key: string): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(key);
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readStoredPatientId(): number | null {
  return readPatientIdFromStorage(SELECTED_PATIENT_KEY);
}

function readLastSelectedPatientId(): number | null {
  return readPatientIdFromStorage(LAST_SELECTED_PATIENT_KEY);
}

function getLatestAddedPatientId(patients: PatientProfile[]): number | null {
  if (patients.length === 0) {
    return null;
  }

  return patients.reduce((latestPatient, currentPatient) => {
    return currentPatient.id > latestPatient.id ? currentPatient : latestPatient;
  }, patients[0]).id;
}

function patientExists(patients: PatientProfile[], patientId: number | null) {
  return patientId !== null && patients.some((patient) => patient.id === patientId);
}

function writeStoredPatientId(patientId: number | null) {
  if (typeof window === "undefined") {
    return;
  }

  const previousValue = window.localStorage.getItem(SELECTED_PATIENT_KEY);
  const nextValue = patientId ? String(patientId) : null;

  if (nextValue) {
    window.localStorage.setItem(SELECTED_PATIENT_KEY, nextValue);
    window.localStorage.setItem(LAST_SELECTED_PATIENT_KEY, nextValue);
  } else {
    window.localStorage.removeItem(SELECTED_PATIENT_KEY);
  }

  if (previousValue === nextValue) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SELECTED_PATIENT_EVENT, { detail: { patientId } }),
  );
}

function resetSelectedPatientState(
  setPatients: (patients: PatientProfile[]) => void,
  setSelectedPatientIdState: (patientId: number | null) => void,
  setError: (error: string | null) => void,
) {
  setPatients([]);
  setSelectedPatientIdState(null);
  setError(null);
  writeStoredPatientId(null);
}

export function useSelectedPatient() {
  const initialLoadRef = useRef(true);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatientId, setSelectedPatientIdState] = useState<number | null>(
    () => readStoredPatientId(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadPatients = useCallback(async (options?: { preserveStoredSelection?: boolean }) => {
    setLoading(true);
    setError(null);

    if (!getStoredToken()) {
      resetSelectedPatientState(
        setPatients,
        setSelectedPatientIdState,
        setError,
      );
      setLoading(false);
      return;
    }

    try {
      const loadedPatients = await api.patients();
      const storedPatientId = readStoredPatientId();
      const lastSelectedPatientId = readLastSelectedPatientId();
      const latestAddedPatientId = getLatestAddedPatientId(loadedPatients);
      const settings = getDoctorSettings();

      const shouldUseLoginPreference =
        initialLoadRef.current && !options?.preserveStoredSelection;

      let preferredPatientId = storedPatientId;

      if (shouldUseLoginPreference) {
        if (settings.patientSelectionPreference === "latestAdded") {
          preferredPatientId = latestAddedPatientId;
        } else if (!patientExists(loadedPatients, storedPatientId)) {
          preferredPatientId = lastSelectedPatientId;
        }
      }

      const nextPatientId = patientExists(loadedPatients, preferredPatientId)
        ? preferredPatientId
        : latestAddedPatientId;

      setPatients(loadedPatients);
      setSelectedPatientIdState(nextPatientId);

      if (nextPatientId !== storedPatientId) {
        writeStoredPatientId(nextPatientId);
      }
    } catch (caughtError) {
      if (!getStoredToken()) {
        resetSelectedPatientState(
          setPatients,
          setSelectedPatientIdState,
          setError,
        );
        return;
      }

      setError((caughtError as Error).message);
    } finally {
      initialLoadRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadPatients();
  }, [reloadPatients]);

  useEffect(() => {
    const handleSelectedPatientChange = () => {
      setSelectedPatientIdState(readStoredPatientId());
      reloadPatients({ preserveStoredSelection: true });
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SELECTED_PATIENT_KEY) {
        setSelectedPatientIdState(readStoredPatientId());
        reloadPatients({ preserveStoredSelection: true });
      }
    };

    window.addEventListener(SELECTED_PATIENT_EVENT, handleSelectedPatientChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        SELECTED_PATIENT_EVENT,
        handleSelectedPatientChange,
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [reloadPatients]);

  const selectedPatient = useMemo(() => {
    return patients.find((patient) => patient.id === selectedPatientId) ?? null;
  }, [patients, selectedPatientId]);

  const selectPatient = useCallback((patientId: number | null) => {
    setSelectedPatientIdState(patientId);
    writeStoredPatientId(patientId);
  }, []);

  return {
    patients,
    selectedPatient,
    selectedPatientId,
    loading,
    error,
    reloadPatients,
    selectPatient,
  };
}
