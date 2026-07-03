// Client de autentificare pentru KinetoLive
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export const TOKEN_STORAGE_KEY = "kinetolive:token";

export interface Doctor {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  role?: string;
  active?: boolean;
  createdAt?: string | null;
  doctorProfileId?: number | null;
  specialization?: string | null;
  clinicName?: string | null;
  phoneNumber?: string | null;
}

export interface DoctorProfilePayload {
  firstName: string;
  lastName: string;
  email: string;
  specialization?: string | null;
  clinicName?: string | null;
  phoneNumber?: string | null;
}

export interface AuthResponse {
  token: string;
  doctor: Doctor;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function dispatchUnauthorized() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kinetolive:unauthorized"));
}

async function authJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function authenticatedJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    authJson<AuthResponse>("/api/auth/login", { email, password }),

  register: (fullName: string, email: string, password: string) =>
    authJson<AuthResponse>("/api/auth/register", { fullName, email, password }),

  me: async (token: string): Promise<Doctor> =>
    authenticatedJson<Doctor>("/api/auth/me", token),

  updateProfile: async (
    token: string,
    payload: DoctorProfilePayload,
  ): Promise<AuthResponse> =>
    authenticatedJson<AuthResponse>("/api/auth/me", token, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
