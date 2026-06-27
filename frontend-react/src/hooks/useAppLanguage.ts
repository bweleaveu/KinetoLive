// Hook global pentru limba aplicatiei KinetoLive
import { useEffect, useState } from "react";
import {
  getSavedLanguage,
  listenForLanguageChange,
  type AppLanguage,
} from "@/lib/language";

export function useAppLanguage() {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    return getSavedLanguage();
  });

  useEffect(() => {
    // Actualizeaza limba cand utilizatorul schimba RO / EN din header
    return listenForLanguageChange(() => {
      setLanguage(getSavedLanguage());
    });
  }, []);

  return {
    language,
  };
}