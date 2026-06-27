// Configurare globala pentru limba aplicatiei KinetoLive
export type AppLanguage = "ro" | "en";

export function getSavedLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "ro";
  }

  const savedLanguage = localStorage.getItem("kinetolive:language");

  return savedLanguage === "en" ? "en" : "ro";
}

export function saveLanguage(language: AppLanguage) {
  localStorage.setItem("kinetolive:language", language);
  window.dispatchEvent(new Event("kinetolive:language-change"));
}

export function listenForLanguageChange(callback: () => void) {
  window.addEventListener("kinetolive:language-change", callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("kinetolive:language-change", callback);
    window.removeEventListener("storage", callback);
  };
}