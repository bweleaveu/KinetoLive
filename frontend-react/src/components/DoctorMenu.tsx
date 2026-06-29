// Meniu doctor cu nume, email, profil si buton de deconectare
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppLanguage } from "@/hooks/useAppLanguage";
// Navigare catre profil/setari si dupa deconectare
import { useNavigate } from "@tanstack/react-router";

const TEXT = {
  ro: {
    signOut: "Deconectare",
    doctor: "Doctor",
    profileSettings: "Profil și setări",
  },
  en: {
    signOut: "Sign out",
    doctor: "Doctor",
    profileSettings: "Profile & settings",
  },
} as const;

export function DoctorMenu() {
  const { doctor, logout } = useAuth();
  const navigate = useNavigate();
  const { language } = useAppLanguage();
  const text = TEXT[language];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!doctor) return null;

  const initials = (doctor.fullName || doctor.email)
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-2xl border border-border bg-muted/50 px-2 py-1 transition hover:bg-muted"
      >
        <div className="hidden text-right sm:block">
          <div className="text-sm font-semibold leading-tight text-foreground">
            {doctor.fullName || text.doctor}
          </div>
          <div className="text-xs text-muted-foreground">{doctor.email}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[color:var(--cyan)] to-[color:var(--primary)] text-sm font-bold text-primary-foreground">
          {initials || <UserRound className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-border bg-popover p-2 shadow-xl">
          <div className="px-3 py-2">
            <div className="text-sm font-semibold text-foreground">
              {doctor.fullName || text.doctor}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {doctor.email}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/settings" });
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <Settings className="h-4 w-4" />
            {text.profileSettings}
          </button>

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
              navigate({ to: "/login", replace: true });
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            {text.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
