// Hook global pentru limba aplicatiei KinetoLive
import { useEffect, useState } from "react";
import {
  getSavedLanguage,
  listenForLanguageChange,
  type AppLanguage,
} from "@/lib/language";

export function useAppLanguage() {
  const [language, setLanguage] = useState<AppLanguage>("ro");

  useEffect(() => {
    // Citeste limba salvata doar dupa ce aplicatia a fost incarcata in browser
    const savedLanguage = getSavedLanguage();

    setLanguage(savedLanguage);
    document.documentElement.lang = savedLanguage;

    // Actualizeaza limba cand utilizatorul schimba RO / EN din header
    return listenForLanguageChange(() => {
      const nextLanguage = getSavedLanguage();

      setLanguage(nextLanguage);
      document.documentElement.lang = nextLanguage;
    });
  }, []);

  return {
    language,
  };
}