// Provider de autentificare pentru doctori
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  authApi,
  dispatchUnauthorized,
  getStoredToken,
  setStoredToken,
  type Doctor,
} from "@/lib/auth";

type Status = "loading" | "authenticated" | "unauthenticated";

const SELECTED_PATIENT_KEY = "kinetolive:selectedPatientId";
const SELECTED_PATIENT_EVENT = "kinetolive:selected-patient-changed";

function clearSelectedPatientAfterLogout() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SELECTED_PATIENT_KEY);
  window.dispatchEvent(
    new CustomEvent(SELECTED_PATIENT_EVENT, { detail: { patientId: null } }),
  );
}

interface AuthContextValue {
  doctor: Doctor | null;
  token: string | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // Incarca sesiunea existenta din localStorage la pornire
  useEffect(() => {
    const existing = getStoredToken();
    if (!existing) {
      setStatus("unauthenticated");
      return;
    }
    setToken(existing);
    authApi
      .me(existing)
      .then((d) => {
        setDoctor(d);
        setStatus("authenticated");
      })
      .catch(() => {
        setStoredToken(null);
        clearSelectedPatientAfterLogout();
        setToken(null);
        setDoctor(null);
        setStatus("unauthenticated");
      });
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    clearSelectedPatientAfterLogout();
    setToken(null);
    setDoctor(null);
    setStatus("unauthenticated");
  }, []);

  // Asculta evenimentele 401 din apelurile API
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("kinetolive:unauthorized", handler);
    return () => window.removeEventListener("kinetolive:unauthorized", handler);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setStoredToken(res.token);
    setToken(res.token);
    setDoctor(res.doctor);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      const res = await authApi.register(fullName, email, password);
      setStoredToken(res.token);
      setToken(res.token);
      setDoctor(res.doctor);
      setStatus("authenticated");
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{ doctor, token, status, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Helper exportat pentru a permite scapare in afara React
export { dispatchUnauthorized };
