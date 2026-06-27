// Controale RO/EN si tema light/dark pentru paginile publice (login/register)
import { useEffect, useState } from "react";
import { Languages, Moon, Sun } from "lucide-react";
import { saveLanguage } from "@/lib/language";
import { useAppLanguage } from "@/hooks/useAppLanguage";

export function AuthPageControls() {
  const { language } = useAppLanguage();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("kinetolive:theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("kinetolive:theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const toggleLanguage = () => saveLanguage(language === "ro" ? "en" : "ro");

  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
      <button
        type="button"
        onClick={toggleLanguage}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
        aria-label={language === "ro" ? "Schimba limba" : "Change language"}
      >
        <Languages className="h-4 w-4 text-[color:var(--primary)]" />
        <span>{language === "ro" ? "RO" : "EN"}</span>
      </button>

      <button
        type="button"
        onClick={() => setIsDarkMode((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/50 text-foreground transition hover:bg-muted"
        aria-label={
          isDarkMode
            ? language === "ro"
              ? "Schimba la tema luminoasa"
              : "Switch to light mode"
            : language === "ro"
              ? "Schimba la tema intunecata"
              : "Switch to dark mode"
        }
      >
        {isDarkMode ? (
          <Sun className="h-4 w-4 text-[color:var(--amber)]" />
        ) : (
          <Moon className="h-4 w-4 text-[color:var(--primary)]" />
        )}
      </button>
    </div>
  );
}
