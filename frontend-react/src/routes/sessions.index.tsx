// Pagina pentru istoricul sesiunilor pacientului in KinetoLive
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
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
import {
  api,
  qualityBadgeClass,
  type RepetitionResult,
  type TherapySession,
} from "@/lib/api";
import { getDoctorSettings } from "@/lib/doctorSettings";

export const Route = createFileRoute("/sessions/")({
  head: () => ({ meta: [{ title: "KinetoLive" }] }),
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
    patient: "Pacient",
    tableSession: "Sesiune",
    tableStatus: "Status",
    tableStarted: "Pornita",
    tableEnded: "Oprita",
    tableIntended: "Intentionat",
    tableDetected: "Detectat",
    tableQuality: "Calitate",
    tableReps: "Repetari",
    tableSamples: "Esantioane",
    tableDuration: "Durata",
    tableConfidence: "Incredere",
    tableActions: "Actiuni",
    exercise: "Exercitiul",
    locale: "ro-RO",
    htmlLanguage: "ro",
    browserTitle: "Istoric sesiuni — KinetoLive",
    automaticDetection: "Detectie automata",
    automaticDetectionShort: "Detectie auto",
    view: "Vezi",
    deleteSession: "Sterge",
    deletingSession: "Se sterge...",
    deleteSessionConfirm:
      "Sigur vrei sa stergi sesiunea #{{sessionId}}? Rezultatele salvate pentru aceasta sesiune vor fi eliminate.",
    deleteSessionError: "Nu s-a putut sterge sesiunea:",
    exportReport: "Exporta raport",
    exportReportShort: "Raport",
    exportingReport: "Se exporta...",
    exportingReportShort: "Export...",
    exportReportError: "Nu s-a putut exporta raportul:",
    reportFileName: (id: number) => `kinetolive-raport-sesiune-${id}.html`,
    reportTitle: (id: number) => `Raport sesiune KinetoLive #${id}`,
    reportGeneratedAt: "Generat la",
    reportPatientSection: "Date pacient si sesiune",
    reportMlSection: "Rezultat analiza",
    reportRepetitionSection: "Rezultate pe repetari",
    noRepetitionResults: "Nu au fost salvate rezultate pe repetari pentru aceasta sesiune.",
    tableStart: "Start",
    tableEnd: "Final",
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
    patient: "Patient",
    tableSession: "Session",
    tableStatus: "Status",
    tableStarted: "Started",
    tableEnded: "Ended",
    tableIntended: "Intended",
    tableDetected: "Detected",
    tableQuality: "Quality",
    tableReps: "Reps",
    tableSamples: "Samples",
    tableDuration: "Duration",
    tableConfidence: "Confidence",
    tableActions: "Actions",
    exercise: "Exercise",
    locale: "en-US",
    htmlLanguage: "en",
    browserTitle: "Sessions history — KinetoLive",
    automaticDetection: "Automatic detection",
    automaticDetectionShort: "Auto detection",
    view: "View",
    deleteSession: "Delete",
    deletingSession: "Deleting...",
    deleteSessionConfirm:
      "Are you sure you want to delete session #{{sessionId}}? The saved results for this session will be removed.",
    deleteSessionError: "Could not delete session:",
    exportReport: "Export report",
    exportReportShort: "Report",
    exportingReport: "Exporting...",
    exportingReportShort: "Export...",
    exportReportError: "Could not export report:",
    reportFileName: (id: number) => `kinetolive-session-report-${id}.html`,
    reportTitle: (id: number) => `KinetoLive session report #${id}`,
    reportGeneratedAt: "Generated at",
    reportPatientSection: "Patient and session data",
    reportMlSection: "Analysis result",
    reportRepetitionSection: "Repetition results",
    noRepetitionResults: "No repetition results were saved for this session.",
    tableStart: "Start",
    tableEnd: "End",
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

function SessionsPage() {
  const { language } = useAppLanguage();
  const text = SESSIONS_TEXT[language];
  const { selectedPatientId, loading: patientLoading } = useSelectedPatient();

  useEffect(() => {
    document.title = text.browserTitle;
  }, [text.browserTitle]);

  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const [exportingSessionId, setExportingSessionId] = useState<number | null>(null);

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

  async function handleExportReport(session: TherapySession) {
    // Exporta rapid raportul HTML al unei sesiuni finalizate
    setExportingSessionId(session.id);
    setError(null);

    try {
      const repetitionResults = await api.sessionRepetitions(session.id);
      exportSessionReport(session, repetitionResults ?? [], text);
    } catch (caughtError) {
      setError(`${text.exportReportError} ${(caughtError as Error).message}`);
    } finally {
      setExportingSessionId(null);
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
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <article
                key={session.id}
                className="rounded-2xl border border-border/60 bg-background/55 p-4 transition hover:border-primary/30 hover:bg-muted/30"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="text-lg font-semibold text-foreground">
                        #{session.id}
                      </span>
                      <StatusBadge
                        status={session.status}
                        label={formatStatus(session.status, text.statusValues)}
                      />
                      <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/50 sm:block" />
                      <span className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {text.tableStarted}:
                        </span>{" "}
                        {formatDateTime(session.startedAt, text.locale)}
                      </span>
                      <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/50 sm:block" />
                      <span className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {text.tableEnded}:
                        </span>{" "}
                        {formatDateTime(session.endedAt, text.locale)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                    <Link
                      to="/sessions/$sessionId"
                      params={{ sessionId: String(session.id) }}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold transition hover:bg-muted"
                    >
                      {text.view}
                      <ChevronRight className="h-4 w-4" />
                    </Link>

                    {session.status === "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => void handleExportReport(session)}
                        disabled={exportingSessionId === session.id}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        title={text.exportReport}
                      >
                        <Download className="h-4 w-4" />
                        {exportingSessionId === session.id
                          ? text.exportingReportShort
                          : text.exportReportShort}
                      </button>
                    )}

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

                <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_72px_82px_minmax(170px,1.25fr)]">
                  <SessionField label={text.tableIntended}>
                    {formatExerciseLabel(session.intendedExerciseCode, text, true)}
                  </SessionField>

                  <SessionField label={text.tableDetected}>
                    {formatExerciseLabel(session.detectedExerciseCode, text, true)}
                  </SessionField>

                  <SessionField label={text.tableQuality}>
                    {session.qualityName ? (
                      <span
                        className={`inline-flex max-w-full whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5 ${qualityBadgeClass(
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

                  <SessionConfidenceField
                    label={text.tableConfidence}
                    sublabel={text.exerciseConfidence}
                    value={session.exerciseConfidence}
                  />
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

function SessionConfidenceField({
                                  label,
                                  sublabel,
                                  value,
                                }: {
  label: string;
  sublabel: string;
  value?: number | null;
}) {
  // Afiseaza increderea exercitiului fara sa ocupe o coloana separata mare
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{sublabel}</span>
        <span className="shrink-0 font-semibold text-foreground">
          {formatPercent(value)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${toPercent(value)}%` }}
        />
      </div>
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

function formatDateTime(value?: string | null, locale = "ro-RO"): string {
  // Formateaza data si ora unei sesiuni in limba selectata
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(locale);
}

function formatStatus(
  status: string,
  statusValues: Record<string, string>,
): string {
  // Traduce statusul sesiunii pentru afisare
  return statusValues[status] ?? status;
}

function formatExerciseLabel(
  exerciseCode: number | null | undefined,
  text: (typeof SESSIONS_TEXT)[keyof typeof SESSIONS_TEXT],
  short = false,
): string {
  // Afiseaza detectia automata in loc de Exercitiul 0
  if (typeof exerciseCode !== "number") {
    return "—";
  }

  if (exerciseCode === 0) {
    return short ? text.automaticDetectionShort : text.automaticDetection;
  }

  return `${text.exercise} ${exerciseCode}`;
}

function exportSessionReport(
  session: TherapySession,
  repetitions: RepetitionResult[],
  text: (typeof SESSIONS_TEXT)[keyof typeof SESSIONS_TEXT],
) {
  // Genereaza un raport HTML descarcabil din lista de sesiuni
  const html = buildSessionReportHtml(session, repetitions, text);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = text.reportFileName(session.id);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildSessionReportHtml(
  session: TherapySession,
  repetitions: RepetitionResult[],
  text: (typeof SESSIONS_TEXT)[keyof typeof SESSIONS_TEXT],
): string {
  // Construieste raportul HTML pentru export rapid
  const reportRows = repetitions.length
    ? repetitions
      .map((repetition) => {
        const exerciseCode =
          repetition.predictedExerciseCode ?? repetition.exerciseCode ?? null;
        const qualityName = repetition.qualityName ?? repetition.predictedQualityName;

        return `
            <tr>
              <td>${escapeHtml(String(repetition.repetitionIndex))}</td>
              <td>${escapeHtml(formatExerciseLabel(exerciseCode, text))}</td>
              <td>${escapeHtml(formatPercent(repetition.exerciseConfidence))}</td>
              <td>${escapeHtml(qualityName ? formatQualityName(qualityName, text.qualityValues) : "—")}</td>
              <td>${escapeHtml(formatPercent(repetition.qualityConfidence))}</td>
              <td>${escapeHtml(typeof repetition.durationSeconds === "number" ? `${round(repetition.durationSeconds, 2)} s` : "—")}</td>
              <td>${escapeHtml(String(repetition.sampleCount ?? "—"))}</td>
              <td>${escapeHtml(String(repetition.startIndex ?? repetition.startSample ?? "—"))}</td>
              <td>${escapeHtml(String(repetition.endIndex ?? repetition.endSample ?? "—"))}</td>
            </tr>
          `;
      })
      .join("")
    : `<tr><td colspan="9" class="empty">${escapeHtml(text.noRepetitionResults)}</td></tr>`;

  const quality = session.qualityName
    ? formatQualityName(session.qualityName, text.qualityValues)
    : "—";
  const htmlLanguage = text.htmlLanguage;

  return `<!doctype html>
<html lang="${htmlLanguage}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(text.reportTitle(session.id))}</title>
  <style>
    body {
      margin: 0;
      background: #f4f7fb;
      color: #172033;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.45;
    }

    .page {
      max-width: 980px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    .header {
      border-radius: 22px;
      background: linear-gradient(135deg, #0f766e, #2563eb);
      color: #ffffff;
      padding: 26px;
      margin-bottom: 18px;
    }

    .header h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }

    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .card {
      background: #ffffff;
      border: 1px solid #dbe3ee;
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
    }

    .card h2 {
      margin: 0 0 14px;
      font-size: 17px;
    }

    .field {
      margin-bottom: 10px;
    }

    .label {
      display: block;
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .value {
      color: #111827;
      font-size: 14px;
      font-weight: 700;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      font-size: 13px;
    }

    th, td {
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 8px;
      text-align: left;
      vertical-align: top;
    }

    th {
      color: #475569;
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .empty {
      color: #64748b;
      text-align: center;
    }

    @media print {
      body { background: #ffffff; }
      .page { max-width: none; padding: 0; }
      .card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <h1>${escapeHtml(text.reportTitle(session.id))}</h1>
      <p>KinetoLive • ${escapeHtml(text.reportGeneratedAt)} ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
    </section>

    <section class="grid">
      <article class="card">
        <h2>${escapeHtml(text.reportPatientSection)}</h2>
        ${reportField(text.tableSession, `#${session.id}`)}
        ${reportField(text.patient, session.patientName ?? `${text.patient} ${session.patientId}`)}
        ${reportField(text.tableStatus, formatStatus(session.status, text.statusValues))}
        ${reportField(text.tableStarted, formatDateTime(session.startedAt, text.locale))}
        ${reportField(text.tableEnded, formatDateTime(session.endedAt, text.locale))}
      </article>

      <article class="card">
        <h2>${escapeHtml(text.reportMlSection)}</h2>
        ${reportField(text.tableIntended, formatExerciseLabel(session.intendedExerciseCode, text))}
        ${reportField(text.tableDetected, formatExerciseLabel(session.detectedExerciseCode, text))}
        ${reportField(text.tableQuality, quality)}
        ${reportField(text.tableReps, String(session.repetitionCount ?? repetitions.length))}
        ${reportField(text.tableDuration, typeof session.durationSeconds === "number" ? `${round(session.durationSeconds, 1)} s` : "—")}
        ${reportField(text.tableConfidence, formatPercent(session.exerciseConfidence))}
      </article>
    </section>

    <section class="card">
      <h2>${escapeHtml(text.reportRepetitionSection)}</h2>
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(text.tableReps)}</th>
            <th>${escapeHtml(text.tableDetected)}</th>
            <th>${escapeHtml(text.exerciseConfidence)}</th>
            <th>${escapeHtml(text.tableQuality)}</th>
            <th>${escapeHtml(text.tableConfidence)}</th>
            <th>${escapeHtml(text.tableDuration)}</th>
            <th>${escapeHtml(text.tableSamples)}</th>
            <th>${escapeHtml(text.tableStart)}</th>
            <th>${escapeHtml(text.tableEnd)}</th>
          </tr>
        </thead>
        <tbody>${reportRows}</tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

function reportField(label: string, value: string): string {
  // Rand de informatie pentru raportul HTML exportat
  return `
    <div class="field">
      <span class="label">${escapeHtml(label)}</span>
      <span class="value">${escapeHtml(value)}</span>
    </div>
  `;
}

function escapeHtml(value: string): string {
  // Protejeaza raportul HTML de caractere speciale
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
