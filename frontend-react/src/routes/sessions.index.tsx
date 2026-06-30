// Pagina pentru istoricul sesiunilor pacientului in KinetoLive
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Repeat,
  Search,
  Timer,
  Trash2,
  XCircle,
} from "lucide-react";

import { SectionCard, StatCard } from "@/components/StatCard";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useSelectedPatient } from "@/hooks/useSelectedPatient";
import { api, qualityBadgeClass, type TherapySession } from "@/lib/api";
import { getDoctorSettings } from "@/lib/doctorSettings";

export const Route = createFileRoute("/sessions/")({
  head: () => ({ meta: [{ title: "Sessions — KinetoLive" }] }),
  component: SessionsPage,
});

const STATUS_FILTERS = ["ALL", "STARTED", "COMPLETED"] as const;

// Texte pentru pagina Sessions in romana si engleza
const SESSIONS_TEXT = {
  ro: {
    pageTitle: "Istoric sesiuni",
    pageDescription:
      "Sesiuni de recuperare salvate, predictii prin invatare automata si rezultate pe repetari.",
    startLiveSession: "Porneste sesiune live",
    errorPrefix: "Nu s-au putut incarca sesiunile:",
    errorSuffix: "Asigura-te ca Spring Boot ruleaza pe http://localhost:8080.",
    totalSessions: "Total sesiuni",
    allPatientSessions: "Toate sesiunile pacientului",
    completed: "Finalizate",
    analyzedAndSaved: "Analizate si salvate",
    started: "Nefinalizate",
    notFinalizedYet: "Sesiuni pornite, dar nefinalizate",
    totalRepetitions: "Total repetari",
    detectedBySegmentation: "Detectate prin segmentare",
    avgDuration: "Durata medie",
    completedSessions: "Sesiuni finalizate",
    therapySessions: "Sesiuni terapie",
    therapySessionsSubtitle:
      "Filtreaza, cauta si deschide detaliile sesiunilor salvate",
    searchPlaceholder: "Cauta dupa exercitiu, calitate sau status...",
    allStatuses: "Toate statusurile",
    loadingSessions: "Se incarca sesiunile...",
    noSessionsFound:
      "Nu a fost gasita nicio sesiune. Porneste o sesiune live pentru a genera date.",
    noSelectedPatient:
      "Nu exista pacient selectat. Mergi la sectiunea Pacienti si selecteaza un pacient.",
    tableSession: "Sesiune",
    tableStatus: "Status",
    tableStarted: "Pornita",
    tableEnded: "Oprita",
    tableIntended: "Intentionat",
    tableDetected: "Detectat",
    tableQuality: "Calitate",
    tableReps: "Repetari",
    tableDuration: "Durata",
    tableConfidence: "Incredere",
    tableActions: "Actiuni",
    exercise: "Exercitiul",
    automaticDetection: "Detectie automata",
    automaticDetectionShort: "Detectie auto",
    view: "Vezi",
    deleteSession: "Sterge",
    deletingSession: "Se sterge...",
    deleteSessionConfirm:
      "Sigur vrei sa stergi sesiunea #{{sessionId}}? Rezultatele salvate pentru aceasta sesiune vor fi eliminate.",
    deleteSessionError: "Nu s-a putut sterge sesiunea:",
    exerciseConfidence: "Exercitiu",
    qualityValues: {
      Normal: "Normal",
      Rapid: "Rapid",
      "Small amplitude": "Amplitudine mica",
    },
    statusValues: {
      ALL: "Toate statusurile",
      STARTED: "Nefinalizata",
      COMPLETED: "Finalizata",
    },
  },
  en: {
    pageTitle: "Sessions History",
    pageDescription:
      "Saved rehabilitation sessions, machine learning predictions and repetition results.",
    startLiveSession: "Start live session",
    errorPrefix: "Could not load sessions:",
    errorSuffix: "Make sure Spring Boot is running on http://localhost:8080.",
    totalSessions: "Total sessions",
    allPatientSessions: "All patient sessions",
    completed: "Completed",
    analyzedAndSaved: "Analyzed and saved",
    started: "Unfinished",
    notFinalizedYet: "Started but not completed",
    totalRepetitions: "Total repetitions",
    detectedBySegmentation: "Detected by segmentation",
    avgDuration: "Avg duration",
    completedSessions: "Completed sessions",
    therapySessions: "Therapy sessions",
    therapySessionsSubtitle:
      "Filter, search and open saved session details",
    searchPlaceholder: "Search by exercise, quality or status...",
    allStatuses: "All statuses",
    loadingSessions: "Loading sessions...",
    noSessionsFound:
      "No sessions found. Start a live session to generate data.",
    noSelectedPatient:
      "No patient selected. Go to Patients and select a patient.",
    tableSession: "Session",
    tableStatus: "Status",
    tableStarted: "Started",
    tableEnded: "Ended",
    tableIntended: "Intended",
    tableDetected: "Detected",
    tableQuality: "Quality",
    tableReps: "Reps",
    tableDuration: "Duration",
    tableConfidence: "Confidence",
    tableActions: "Actions",
    exercise: "Exercise",
    automaticDetection: "Automatic detection",
    automaticDetectionShort: "Auto detection",
    view: "View",
    deleteSession: "Delete",
    deletingSession: "Deleting...",
    deleteSessionConfirm:
      "Are you sure you want to delete session #{{sessionId}}? The saved results for this session will be removed.",
    deleteSessionError: "Could not delete session:",
    exerciseConfidence: "Exercise",
    qualityValues: {
      Normal: "Normal",
      Rapid: "Rapid",
      "Small amplitude": "Small amplitude",
    },
    statusValues: {
      ALL: "All statuses",
      STARTED: "Unfinished",
      COMPLETED: "Completed",
    },
  },
} as const;

type SessionsText = (typeof SESSIONS_TEXT)[keyof typeof SESSIONS_TEXT];

function SessionsPage() {
  const { language } = useAppLanguage();
  const text = SESSIONS_TEXT[language];
  const { selectedPatientId, loading: patientLoading } = useSelectedPatient();

  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);

  useEffect(() => {
    // Incarca sesiunile salvate pentru pacientul selectat
    let active = true;

    async function loadSessions() {
      if (patientLoading) {
        return;
      }

      setLoading(true);
      setError(null);

      if (!selectedPatientId) {
        setSessions([]);
        setLoading(false);
        return;
      }

      try {
        const result = await api.patientSessions(selectedPatientId);

        if (active) {
          setSessions(result ?? []);
        }
      } catch (caughtError) {
        if (active) {
          setError((caughtError as Error).message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSessions();

    return () => {
      active = false;
    };
  }, [patientLoading, selectedPatientId]);

  const stats = useMemo(() => {
    // Calculeaza indicatorii principali pentru istoricul sesiunilor
    const completedSessions = sessions.filter(
      (session) => session.status === "COMPLETED",
    );

    const startedSessions = sessions.filter(
      (session) => session.status === "STARTED",
    );

    const totalRepetitions = sessions.reduce(
      (sum, session) => sum + (session.repetitionCount ?? 0),
      0,
    );

    const averageDuration = average(
      completedSessions.map((session) => session.durationSeconds),
    );

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      startedSessions: startedSessions.length,
      totalRepetitions,
      averageDuration,
    };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    // Filtreaza sesiunile dupa status si text cautat
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return sessions.filter((session) => {
      const matchesStatus =
        statusFilter === "ALL" || session.status === statusFilter;

      const searchableText = [
        session.id,
        session.patientName,
        session.status,
        session.intendedExerciseName,
        session.detectedExerciseName,
        session.qualityName,
        session.intendedExerciseCode,
        session.detectedExerciseCode,
        session.intendedExerciseCode === 0 ? text.automaticDetection : null,
        session.detectedExerciseCode === 0 ? text.automaticDetection : null,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [sessions, searchTerm, statusFilter]);


  async function handleDeleteSession(session: TherapySession) {
    // Sterge o sesiune salvata si actualizeaza lista locala
    const doctorSettings = getDoctorSettings();

    if (doctorSettings.confirmSessionDelete) {
      const confirmMessage = text.deleteSessionConfirm.replace(
        "{{sessionId}}",
        String(session.id),
      );

      const confirmed = window.confirm(confirmMessage);

      if (!confirmed) {
        return;
      }
    }

    setDeletingSessionId(session.id);
    setError(null);

    try {
      await api.deleteSession(session.id);
      setSessions((currentSessions) =>
        currentSessions.filter((currentSession) => currentSession.id !== session.id),
      );
    } catch (caughtError) {
      setError(`${text.deleteSessionError} ${(caughtError as Error).message}`);
    } finally {
      setDeletingSessionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {text.pageTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {text.pageDescription}
          </p>
        </div>

        <Link
          to="/live-session"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {text.startLiveSession}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {error && (
        <div className="card-soft border-rose/30 bg-[color:var(--rose)]/5 p-4 text-sm text-[color:var(--rose)]">
          {text.errorPrefix} {error}. {text.errorSuffix}
        </div>
      )}

      {!patientLoading && !selectedPatientId && (
        <div className="card-soft border-amber/30 bg-[color:var(--amber)]/5 p-4 text-sm text-[color:var(--amber)]">
          {text.noSelectedPatient}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={text.totalSessions}
          value={stats.totalSessions}
          hint={text.allPatientSessions}
          icon={Activity}
          tone="primary"
        />

        <StatCard
          label={text.completed}
          value={stats.completedSessions}
          hint={text.analyzedAndSaved}
          icon={CheckCircle2}
          tone="mint"
        />

        <StatCard
          label={text.started}
          value={stats.startedSessions}
          hint={text.notFinalizedYet}
          icon={Clock}
          tone="amber"
        />

        <StatCard
          label={text.totalRepetitions}
          value={stats.totalRepetitions}
          hint={text.detectedBySegmentation}
          icon={Repeat}
          tone="violet"
        />

        <StatCard
          label={text.avgDuration}
          value={`${round(stats.averageDuration, 1)} s`}
          hint={text.completedSessions}
          icon={Timer}
          tone="cyan"
        />
      </div>

      <SectionCard
        title={text.therapySessions}
        subtitle={text.therapySessionsSubtitle}
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={text.searchPlaceholder}
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number])
              }
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
            >
              <option value="ALL">{text.allStatuses}</option>
              <option value="STARTED">{text.statusValues.STARTED}</option>
              <option value="COMPLETED">{text.statusValues.COMPLETED}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-[240px] place-items-center text-sm text-muted-foreground">
            {text.loadingSessions}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="grid min-h-[240px] place-items-center text-center text-sm text-muted-foreground">
            <div>
              <XCircle className="mx-auto mb-2 h-7 w-7" />
              {text.noSessionsFound}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSessions.map((session) => (
              <article
                key={session.id}
                className="rounded-2xl border border-border/60 bg-background/55 px-3.5 py-2.5 transition hover:border-primary/30 hover:bg-muted/30"
              >
                <div className="grid gap-3 lg:grid-cols-[150px_minmax(0,1fr)_155px_auto] lg:items-center xl:grid-cols-[160px_minmax(0,1fr)_170px_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-start lg:gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-foreground">
                          #{session.id}
                        </span>
                        <StatusBadge
                          status={session.status}
                          label={formatStatus(session.status, text.statusValues)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground lg:block lg:space-y-0.5">
                        <span className="inline-block">
                          <span className="font-medium text-foreground/80">
                            {text.tableStarted}:
                          </span>{" "}
                          {formatDateTime(session.startedAt)}
                        </span>
                        <span className="hidden text-muted-foreground lg:hidden sm:inline">•</span>
                        <span className="inline-block">
                          <span className="font-medium text-foreground/80">
                            {text.tableEnded}:
                          </span>{" "}
                          {formatDateTime(session.endedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-3 xl:grid-cols-[minmax(118px,1fr)_minmax(118px,1fr)_minmax(150px,1.2fr)_70px_78px]">
                    <SessionField label={text.tableIntended}>
                      {formatExerciseNameForSessionCard(
                        session.intendedExerciseCode,
                        text,
                      )}
                    </SessionField>

                    <SessionField label={text.tableDetected}>
                      {formatExerciseNameForSessionCard(
                        session.detectedExerciseCode,
                        text,
                      )}
                    </SessionField>

                    <SessionField label={text.tableQuality}>
                      {session.qualityName ? (
                        <span
                          className={`inline-flex max-w-fit whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5 ${qualityBadgeClass(
                            session.qualityName,
                          )}`}
                        >
                          {formatQualityNameForSessionCard(
                            session.qualityName,
                            text.qualityValues,
                            language,
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </SessionField>

                    <SessionField label={text.tableReps}>
                      {String(session.repetitionCount ?? 0)}
                    </SessionField>

                    <SessionField label={text.tableDuration}>
                      {typeof session.durationSeconds === "number"
                        ? `${round(session.durationSeconds, 1)} s`
                        : "—"}
                    </SessionField>
                  </div>

                  <div className="min-w-0 lg:w-[155px] xl:w-[170px]">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{text.tableConfidence}</span>
                      <span>{formatPercent(session.exerciseConfidence)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${toPercent(session.exerciseConfidence)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {text.exerciseConfidence}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                    <Link
                      to="/sessions/$sessionId"
                      params={{ sessionId: String(session.id) }}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold transition hover:bg-muted"
                    >
                      {text.view}
                      <ChevronRight className="h-4 w-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => void handleDeleteSession(session)}
                      disabled={deletingSessionId === session.id}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[color:var(--rose)]/30 bg-[color:var(--rose)]/5 px-3 text-xs font-semibold text-[color:var(--rose)] transition hover:bg-[color:var(--rose)]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingSessionId === session.id
                        ? text.deletingSession
                        : text.deleteSession}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SessionField({
                        label,
                        children,
                      }: {
  label: string;
  children: ReactNode;
}) {
  // Afiseaza o valoare compacta pentru cardul unei sesiuni salvate
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  // Afiseaza statusul sesiunii cu o culoare relevanta
  const className =
    status === "COMPLETED"
      ? "border-[color:var(--mint)]/30 bg-[color:var(--mint)]/10 text-[color:var(--mint)]"
      : status === "STARTED"
        ? "border-[color:var(--amber)]/30 bg-[color:var(--amber)]/10 text-[color:var(--amber)]"
        : "border-[color:var(--rose)]/30 bg-[color:var(--rose)]/10 text-[color:var(--rose)]";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function average(values: Array<number | null | undefined>): number {
  // Calculeaza media valorilor numerice valide
  const numericValues = values.filter(
    (value): value is number => typeof value === "number",
  );

  if (!numericValues.length) {
    return 0;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function toPercent(value?: number | null): number {
  // Converteste valorile de incredere in procent
  if (typeof value !== "number") {
    return 0;
  }

  if (value > 1) {
    return round(value, 1);
  }

  return round(value * 100, 1);
}

function formatPercent(value?: number | null): string {
  // Formateaza procentul pentru afisare
  return `${toPercent(value).toFixed(1)}%`;
}

function round(value: number, decimals = 0): number {
  // Rotunjeste o valoare numerica
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function formatDateTime(value?: string | null): string {
  // Formateaza data si ora unei sesiuni
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function formatStatus(
  status: string,
  statusValues: Record<string, string>,
): string {
  // Traduce statusul sesiunii pentru afisare
  return statusValues[status] ?? status;
}

function formatExerciseName(
  exerciseCode: number | null | undefined,
  text: SessionsText,
): string {
  // Afiseaza corect detectia automata in loc de Exercitiul 0
  if (exerciseCode === 0) {
    return text.automaticDetection;
  }

  if (typeof exerciseCode !== "number") {
    return "—";
  }

  return `${text.exercise} ${exerciseCode}`;
}


function formatExerciseNameForSessionCard(
  exerciseCode: number | null | undefined,
  text: SessionsText,
): string {
  // Afiseaza detectia automata intr-o forma scurta in cardurile din lista
  if (exerciseCode === 0) {
    return text.automaticDetectionShort;
  }

  return formatExerciseName(exerciseCode, text);
}

function formatQualityNameForSessionCard(
  qualityName: string,
  qualityValues: Record<string, string>,
  language: "ro" | "en",
): string {
  // Afiseaza calitatea intr-o forma compacta pentru lista de sesiuni
  const translatedQualityName = formatQualityName(qualityName, qualityValues);

  if (qualityName === "Small amplitude") {
    return language === "ro" ? "Amp. mica" : "Small amp.";
  }

  return translatedQualityName;
}

function formatQualityName(
  qualityName: string,
  qualityValues: Record<string, string>,
): string {
  // Traduce numele calitatii pentru afisare
  return qualityValues[qualityName] ?? qualityName;
}
