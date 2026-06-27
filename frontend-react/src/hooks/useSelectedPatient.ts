// Hook pentru pacientul selectat global in aplicatie
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type PatientProfile } from "@/lib/api";
import { getStoredToken } from "@/lib/auth";

export const SELECTED_PATIENT_KEY = "kinetolive:selectedPatientId";
export const SELECTED_PATIENT_EVENT = "kinetolive:selected-patient-changed";

function readStoredPatientId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(SELECTED_PATIENT_KEY);
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function writeStoredPatientId(patientId: number | null) {
  if (typeof window === "undefined") {
    return;
  }

  const previousValue = window.localStorage.getItem(SELECTED_PATIENT_KEY);
  const nextValue = patientId ? String(patientId) : null;

  if (previousValue === nextValue) {
    return;
  }

  if (nextValue) {
    window.localStorage.setItem(SELECTED_PATIENT_KEY, nextValue);
  } else {
    window.localStorage.removeItem(SELECTED_PATIENT_KEY);
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
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatientId, setSelectedPatientIdState] = useState<number | null>(
    () => readStoredPatientId(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadPatients = useCallback(async () => {
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
      const storedPatientExists = loadedPatients.some(
        (patient) => patient.id === storedPatientId,
      );

      const nextPatientId = storedPatientExists
        ? storedPatientId
        : loadedPatients[0]?.id ?? null;

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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadPatients();
  }, [reloadPatients]);

  useEffect(() => {
    const handleSelectedPatientChange = () => {
      setSelectedPatientIdState(readStoredPatientId());
      reloadPatients();
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SELECTED_PATIENT_KEY) {
        setSelectedPatientIdState(readStoredPatientId());
        reloadPatients();
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
