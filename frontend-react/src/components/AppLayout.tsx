// Layout principal pentru interfata KinetoLive
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  BicepsFlexed,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Moon,
  Radio,
  Sun,
  UsersRound,
  // Iconita pentru selectarea limbii
  Languages,
} from "lucide-react";

// Importuri React pentru layout, dark mode si sidebar collapsibil
import { useEffect, useState, type ReactNode } from "react";

// Import pentru salvarea limbii globale
import {
  getSavedLanguage,
  listenForLanguageChange,
  saveLanguage,
  type AppLanguage,
} from "@/lib/language";

// Meniu pentru doctorul autentificat
import { DoctorMenu } from "@/components/DoctorMenu";
import { useSelectedPatient } from "@/hooks/useSelectedPatient";

const NAV = [
  {
    to: "/",
    icon: LayoutDashboard,
  },
  {
    to: "/exercises",
    icon: Dumbbell,
  },
  {
    to: "/patients",
    icon: UsersRound,
  },
  {
    to: "/calibration",
    icon: Gauge,
  },
  {
    to: "/live-session",
    icon: Radio,
  },
  {
    to: "/sessions",
    icon: ListChecks,
  },
] as const;

// Texte pentru interfata in romana si engleza
const TEXT = {
  ro: {
    appSubtitle: "Monitorizare recuperare",
    dashboard: "Dashboard",
    dashboardDescription: "Prezentare generala",
    exercises: "Exercitii",
    exercisesDescription: "Biblioteca de exercitii",
    patients: "Pacienti",
    patientsDescription: "Selectare pacient",
    calibration: "Calibrare",
    calibrationDescription: "Configurare senzor",
    liveSession: "Sesiune live",
    liveSessionDescription: "Monitorizare senzori",
    sessions: "Sesiuni",
    sessionsDescription: "Rezultate salvate",
    collapse: "Restrange",
    dark: "Intunecat",
    light: "Luminos",
    selectedPatient: "Pacient selectat",
    noSelectedPatient: "Niciun pacient selectat",
    espTitle: "ESP32 · BNO055",
    espDescription: "Date inertiale live transmise prin WebSocket la 25 Hz.",
    mlTitle: "Analiza prin invatare automata",
    mlDescription: "Detectarea exercitiului, segmentarea repetarilor si clasificarea calitatii.",
  },
  en: {
    appSubtitle: "Rehab monitoring",
    dashboard: "Dashboard",
    dashboardDescription: "Overview",
    exercises: "Exercises",
    exercisesDescription: "Exercise library",
    patients: "Patients",
    patientsDescription: "Patient selection",
    calibration: "Calibration",
    calibrationDescription: "Sensor setup",
    liveSession: "Live Session",
    liveSessionDescription: "Sensor monitoring",
    sessions: "Sessions",
    sessionsDescription: "Saved results",
    collapse: "Collapse",
    dark: "Dark",
    light: "Light",
    selectedPatient: "Selected patient",
    noSelectedPatient: "No selected patient",
    espTitle: "ESP32 · BNO055",
    espDescription: "Live inertial data streamed through WebSocket at 25 Hz.",
    mlTitle: "Machine learning analysis",
    mlDescription: "Exercise detection, repetition segmentation and quality classification.",
  },
} as const;

// Componenta principala de layout
export function AppLayout({ children }: { children?: ReactNode }) {
  // State pentru tema light/dark a aplicatiei
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const savedTheme = localStorage.getItem("kinetolive:theme");

    if (savedTheme === "dark") {
      return true;
    }

    if (savedTheme === "light") {
      return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // Aplica tema selectata pe elementul HTML principal
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("kinetolive:theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // State pentru limba interfetei
  const [language, setLanguage] = useState<AppLanguage>(() => getSavedLanguage());

  useEffect(() => {
    // Actualizeaza limba daca este schimbata din alta zona a aplicatiei
    return listenForLanguageChange(() => {
      setLanguage(getSavedLanguage());
    });
  }, []);

  const changeLanguage = () => {
    const nextLanguage: AppLanguage = language === "ro" ? "en" : "ro";

    saveLanguage(nextLanguage);
    setLanguage(nextLanguage);
  };

  const text = TEXT[language];
  const { selectedPatient } = useSelectedPatient();

  // Elemente pentru meniul lateral, traduse in functie de limba selectata
  const navigationItems = [
    {
      to: "/",
      label: text.dashboard,
      description: text.dashboardDescription,
      icon: LayoutDashboard,
    },
    {
      to: "/exercises",
      label: text.exercises,
      description: text.exercisesDescription,
      icon: Dumbbell,
    },
    {
      to: "/patients",
      label: text.patients,
      description: text.patientsDescription,
      icon: UsersRound,
    },
    {
      to: "/calibration",
      label: text.calibration,
      description: text.calibrationDescription,
      icon: Gauge,
    },
    {
      to: "/live-session",
      label: text.liveSession,
      description: text.liveSessionDescription,
      icon: Radio,
    },
    {
      to: "/sessions",
      label: text.sessions,
      description: text.sessionsDescription,
      icon: ListChecks,
    },
  ] as const;

  // State pentru sidebar collapsibil
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem("kinetolive:sidebar-collapsed") === "true";
  });

  useEffect(() => {
    // Salveaza starea sidebarului in localStorage
    localStorage.setItem("kinetolive:sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const activeRoute = NAV.find((item) =>
    item.to === "/" ? pathname === "/" : pathname.startsWith(item.to),
  );

  // Titlul si descrierea paginii active in functie de limba selectata
  const routeTextMap = {
    "/": {
      label: text.dashboard,
      description: text.dashboardDescription,
    },
    "/exercises": {
      label: text.exercises,
      description: text.exercisesDescription,
    },
    "/patients": {
      label: text.patients,
      description: text.patientsDescription,
    },
    "/calibration": {
      label: text.calibration,
      description: text.calibrationDescription,
    },
    "/live-session": {
      label: text.liveSession,
      description: text.liveSessionDescription,
    },
    "/sessions": {
      label: text.sessions,
      description: text.sessionsDescription,
    },
  } as const;

  const activeRouteText = routeTextMap[activeRoute?.to as keyof typeof routeTextMap];

  const pageTitle = activeRouteText?.label ?? "KinetoLive";
  const pageDescription = activeRouteText?.description ?? text.appSubtitle;

  function isActiveRoute(to: string) {
    // Verifica daca ruta curenta este activa in sidebar
    return to === "/" ? pathname === "/" : pathname.startsWith(to);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar principal collapsibil */}
        <aside
          className={`hidden shrink-0 overflow-hidden border-r border-border bg-sidebar px-4 py-5 transition-[width] duration-100 ease-out md:flex md:flex-col ${
            isSidebarCollapsed ? "w-24" : "w-[260px]"
          }`}
        >
          {/* Logo KinetoLive din sidebar */}
          <div className="mb-4 grid h-16 w-full grid-cols-[64px_minmax(0,1fr)] items-center rounded-2xl">
            <div className="flex h-16 w-16 items-center justify-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[color:var(--primary)] to-[color:var(--cyan)] text-primary-foreground shadow-md shadow-primary/20">
                <BicepsFlexed className="h-6 w-6" />
              </div>
            </div>

            {!isSidebarCollapsed && (
              <div className="min-w-0 overflow-hidden pl-3">
                <div className="truncate text-lg font-bold tracking-tight text-sidebar-foreground">
                  KinetoLive
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {/*Subtitlu logo tradus*/}
                  {text.appSubtitle}
                </div>
              </div>
            )}
          </div>

          {/* Buton pentru collapse/expand sidebar */}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((currentValue) => !currentValue)}
            className={`mb-4 grid h-16 rounded-2xl border border-border bg-background/70 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
              isSidebarCollapsed ? "w-16 grid-cols-[64px]" : "w-full grid-cols-[64px_minmax(0,1fr)]"
            }`}
          >
            <div className="flex h-16 w-16 items-center justify-center">
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </div>

            {!isSidebarCollapsed && (
              <span className="flex min-w-0 items-center overflow-hidden whitespace-nowrap pl-3">
                {/*Text collapse tradus*/}
                {text.collapse}
              </span>
            )}
          </button>

          {/* Navigatie desktop */}
          <nav className="flex flex-col gap-2">
            {navigationItems.map(({ to, label, description, icon: Icon }) => {
              const active = isActiveRoute(to);

              return (
                <Link
                  key={to}
                  to={to}
                  title={isSidebarCollapsed ? label : undefined}
                  className={`group grid h-16 rounded-2xl text-sm transition-colors ${
                    isSidebarCollapsed
                      ? "w-16 grid-cols-[64px]"
                      : "w-full grid-cols-[64px_minmax(0,1fr)]"
                  } ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center">
                    <div
                      className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  {!isSidebarCollapsed && (
                    <div className="flex min-w-0 flex-col justify-center overflow-hidden pl-3">
                      <div className="truncate font-semibold">{label}</div>
                      <div className="truncate text-xs text-muted-foreground">{description}</div>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Afiseaza cardurile informative doar cand sidebarul este extins */}
          {!isSidebarCollapsed && (
            <div className="mt-auto space-y-3">
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <UsersRound className="h-4 w-4 text-[color:var(--primary)]" />
                  {text.selectedPatient}
                </div>

                <p className="mt-2 truncate text-xs leading-5 text-muted-foreground">
                  {selectedPatient
                    ? `${selectedPatient.fullName} · ID ${selectedPatient.id}`
                    : text.noSelectedPatient}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Activity className="h-4 w-4 text-[color:var(--mint)]" />
                  {/*Titlu ESP32 tradus*/}
                  {text.espTitle}
                </div>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {/*Descriere ESP32 tradusa*/}
                  {text.espDescription}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BarChart3 className="h-4 w-4 text-[color:var(--cyan)]" />
                  {/*Titlu analiza prin invatare automata tradus*/}
                  {text.mlTitle}
                </div>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {/*Descriere analiza prin invatare automata tradusa*/}
                  {text.mlDescription}
                </p>
              </div>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
            <div className="flex min-h-[76px] items-center justify-between gap-4 px-5 md:px-7">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  KinetoLive
                </div>

                <div className="mt-1 flex items-center gap-3">
                  <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
                    {pageTitle}
                  </h1>

                  <span className="hidden rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground lg:inline-flex">
                    {pageDescription}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Selector pentru limba interfetei */}
                <button
                  type="button"
                  onClick={changeLanguage}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                  aria-label={language === "ro" ? "Schimba limba" : "Change language"}
                >
                  <Languages className="h-4 w-4 text-[color:var(--primary)]" />
                  <span>{language === "ro" ? "RO" : "EN"}</span>
                </button>

                {/* Buton pentru schimbarea temei light/dark */}
                <button
                  type="button"
                  onClick={() => setIsDarkMode((currentValue) => !currentValue)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
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

                  <span className="hidden lg:inline">
                    {/*Text buton dark mode tradus*/}
                    {isDarkMode ? text.light : text.dark}
                  </span>
                </button>

                {/* Meniu pentru doctorul autentificat si buton de sign out */}
                <DoctorMenu />
              </div>
            </div>

            {/* Navigatie mobila */}
            <div className="flex gap-2 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
              {navigationItems.map(({ to, label, icon: Icon }) => {
                const active = isActiveRoute(to);

                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </header>

          <main className="flex-1 px-5 py-6 md:px-7">{children ?? <Outlet />}</main>
        </div>
      </div>
    </div>
  );
}
