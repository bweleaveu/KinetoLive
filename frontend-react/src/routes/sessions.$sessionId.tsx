// Pagina pentru detaliile unei sesiuni de recuperare KinetoLive
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  Dumbbell,
  Download,
  Gauge,
  Repeat,
  Timer,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SectionCard, StatCard } from "@/components/StatCard";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import {
  api,
  qualityBadgeClass,
  type RepetitionResult,
  type TherapySession,
} from "@/lib/api";

export const Route = createFileRoute("/sessions/$sessionId")({
  head: () => ({ meta: [{ title: "KinetoLive" }] }),
  component: SessionDetailsPage,
});


// Texte pentru pagina Session Details in romana si engleza
const SESSION_DETAILS_TEXT = {
  ro: {
    loading: "Se incarca detaliile sesiunii...",
    errorPrefix: "Nu s-au putut incarca detaliile sesiunii:",
    errorSuffix: "Asigura-te ca Spring Boot ruleaza pe http://localhost:8080.",
    notFound: (id: number) => `Sesiunea #${id} nu a fost gasita.`,
    backToSessions: "Inapoi la sesiuni",
    exportReport: "Exporta raport",
    reportFileName: (id: number) => `kinetolive-raport-sesiune-${id}.html`,
    reportTitle: (id: number) => `Raport sesiune KinetoLive #${id}`,
    reportGeneratedAt: "Generat la",
    reportPatientSection: "Date pacient si sesiune",
    reportMlSection: "Rezultat analiza",
    reportRepetitionSection: "Rezultate pe repetari",
    sessionTitle: (id: number) => `Sesiunea #${id}`,
    pageDescription:
      "Analiza prin invatare automata detaliata, rezultate pe repetari si calitatea executiei.",
    intendedExercise: "Exercitiu intentionat",
    selectedByDoctor: "Selectat de doctor",
    locale: "ro-RO",
    htmlLanguage: "ro",
    pageTitle: "Detalii sesiune — KinetoLive",
    automaticDetection: "Detectie automata",
    automaticDetectionShort: "Detectie auto",
    detectedExercise: "Exercitiu detectat",
    mlResult: "Rezultat analiza prin invatare automata",
    executionQuality: "Calitatea executiei",
    repetitions: "Repetari",
    detectedRepetitions: "Repetari detectate",
    duration: "Durata",
    samples: "esantioane",
    exerciseConfidence: "Incredere exercitiu",
    exerciseClassifier: "Clasificator exercitiu",
    qualityConfidence: "Incredere calitate",
    qualityClassifier: "Clasificator calitate",
    startedAt: "Pornita la",
    sessionSummary: "Rezumat sesiune",
    sessionSummarySubtitle: "Informatii principale salvate in PostgreSQL",
    patient: "Pacient",
    status: "Status",
    endedAt: "Oprita la",
    sampleCount: "Numar esantioane",
    mlMessage: "Mesaj analiza prin invatare automata",
    noMessageAvailable: "Niciun mesaj disponibil",
    repetitionDuration: "Durata repetarilor",
    durationInSeconds: "Durata in secunde",
    samplesPerRepetition: "Esantioane pe repetare",
    segmentSize: "Dimensiune segment",
    confidencePerRepetition: "Incredere pe repetare",
    confidenceSubtitle: "Incredere exercitiu si calitate",
    durationSeries: "Durata",
    samplesSeries: "Esantioane",
    exerciseConfidenceSeries: "Incredere exercitiu",
    qualityConfidenceSeries: "Incredere calitate",
    repetitionResults: "Rezultate repetari",
    repetitionResultsSubtitle: "Predictie pentru fiecare repetare detectata",
    noRepetitionResults:
      "Nu au fost salvate rezultate pe repetari pentru aceasta sesiune.",
    noRepetitionData: "Nu exista date disponibile pentru repetari",
    tableRep: "Rep",
    tableExercise: "Exercitiu",
    tableExerciseConfidence: "Incredere exercitiu",
    tableQuality: "Calitate",
    tableQualityConfidence: "Incredere calitate",
    tableDuration: "Durata",
    tableSamples: "Esantioane",
    tableStart: "Start",
    tableEnd: "Final",
    exercise: "Exercitiul",
    qualityValues: {
      Normal: "Normal",
      Rapid: "Rapid",
      "Small amplitude": "Amplitudine mica",
    },
    statusValues: {
      STARTED: "Nefinalizata",
      COMPLETED: "Finalizata",
      FAILED: "Esuata",
    },
  },
  en: {
    loading: "Loading session details...",
    errorPrefix: "Could not load session details:",
    errorSuffix: "Make sure Spring Boot is running on http://localhost:8080.",
    notFound: (id: number) => `Session #${id} was not found.`,
    backToSessions: "Back to sessions",
    exportReport: "Export report",
    reportFileName: (id: number) => `kinetolive-session-report-${id}.html`,
    reportTitle: (id: number) => `KinetoLive session report #${id}`,
    reportGeneratedAt: "Generated at",
    reportPatientSection: "Patient and session data",
    reportMlSection: "Analysis result",
    reportRepetitionSection: "Repetition results",
    sessionTitle: (id: number) => `Session #${id}`,
    pageDescription:
      "Detailed Machine learning analysis, repetition results and execution quality.",
    intendedExercise: "Intended exercise",
    selectedByDoctor: "Selected by doctor",
    locale: "en-US",
    htmlLanguage: "en",
    pageTitle: "Session details — KinetoLive",
    automaticDetection: "Automatic detection",
    automaticDetectionShort: "Auto detection",
    detectedExercise: "Detected exercise",
    mlResult: "Machine learning result",
    executionQuality: "Execution quality",
    repetitions: "Repetitions",
    detectedRepetitions: "Detected repetitions",
    duration: "Duration",
    samples: "samples",
    exerciseConfidence: "Exercise confidence",
    exerciseClassifier: "Exercise classifier",
    qualityConfidence: "Quality confidence",
    qualityClassifier: "Quality classifier",
    startedAt: "Started at",
    sessionSummary: "Session summary",
    sessionSummarySubtitle: "Main information saved in PostgreSQL",
    patient: "Patient",
    status: "Status",
    endedAt: "Ended at",
    sampleCount: "Sample count",
    mlMessage: "Machine learning message",
    noMessageAvailable: "No message available",
    repetitionDuration: "Repetition duration",
    durationInSeconds: "Duration in seconds",
    samplesPerRepetition: "Samples per repetition",
    segmentSize: "Segment size",
    confidencePerRepetition: "Confidence per repetition",
    confidenceSubtitle: "Exercise and quality confidence",
    durationSeries: "Duration",
    samplesSeries: "Samples",
    exerciseConfidenceSeries: "Exercise confidence",
    qualityConfidenceSeries: "Quality confidence",
    repetitionResults: "Repetition results",
    repetitionResultsSubtitle: "Prediction for each detected repetition",
    noRepetitionResults:
      "No repetition results were saved for this session.",
    noRepetitionData: "No repetition data available",
    tableRep: "Rep",
    tableExercise: "Exercise",
    tableExerciseConfidence: "Exercise confidence",
    tableQuality: "Quality",
    tableQualityConfidence: "Quality confidence",
    tableDuration: "Duration",
    tableSamples: "Samples",
    tableStart: "Start",
    tableEnd: "End",
    exercise: "Exercise",
    qualityValues: {
      Normal: "Normal",
      Rapid: "Rapid",
      "Small amplitude": "Small amplitude",
    },
    statusValues: {
      STARTED: "Unfinished",
      COMPLETED: "Completed",
      FAILED: "Failed",
    },
  },
} as const;

function SessionDetailsPage() {
  const { language } = useAppLanguage();
  const text = SESSION_DETAILS_TEXT[language];
  const { sessionId } = Route.useParams();

  useEffect(() => {
    document.title = text.pageTitle;
  }, [text.pageTitle]);

  const numericSessionId = Number(sessionId);

  const [session, setSession] = useState<TherapySession | null>(null);
  const [repetitions, setRepetitions] = useState<RepetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Incarca sesiunea selectata si repetarile salvate pentru aceasta
    let active = true;

    async function loadSessionDetails() {
      setLoading(true);
      setError(null);

      try {
        const [selectedSession, repetitionResults] = await Promise.all([
          api.session(numericSessionId),
          api.sessionRepetitions(numericSessionId),
        ]);

        if (!active) {
          return;
        }

        setSession(selectedSession);
        setRepetitions(repetitionResults ?? []);
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

    loadSessionDetails();

    return () => {
      active = false;
    };
  }, [numericSessionId]);

  const durationChartData = useMemo(() => {
    // Pregateste datele pentru graficul duratei repetarilor
    return repetitions.map((repetition) => ({
      name: `Rep ${repetition.repetitionIndex}`,
      duration: round(repetition.durationSeconds ?? 0, 2),
    }));
  }, [repetitions]);

  const confidenceChartData = useMemo(() => {
    // Pregateste datele pentru graficul increderii modelului pe repetari
    return repetitions.map((repetition) => ({
      name: `Rep ${repetition.repetitionIndex}`,
      exercise: toPercent(repetition.exerciseConfidence),
      quality: toPercent(repetition.qualityConfidence),
    }));
  }, [repetitions]);

  const sampleChartData = useMemo(() => {
    // Pregateste datele pentru graficul numarului de esantioane pe repetare
    return repetitions.map((repetition) => ({
      name: `Rep ${repetition.repetitionIndex}`,
      samples: repetition.sampleCount ?? 0,
    }));
  }, [repetitions]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">
        {text.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />

        <div className="card-soft border-rose/30 bg-[color:var(--rose)]/5 p-4 text-sm text-[color:var(--rose)]">
          {text.errorPrefix} {error}. {text.errorSuffix}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <BackLink />

        <div className="card-soft p-6 text-sm text-muted-foreground">
          {text.notFound(numericSessionId)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {text.sessionTitle(session.id)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {text.pageDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportSessionReport(session, repetitions, text)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            {text.exportReport}
          </button>

          <StatusBadge
            status={session.status}
            label={formatStatus(session.status, text.statusValues)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={text.intendedExercise}
          value={formatExerciseLabel(session.intendedExerciseCode, text, false)}
          hint={session.intendedExerciseName ?? text.selectedByDoctor}
          icon={Dumbbell}
          tone="primary"
        />

        <StatCard
          label={text.detectedExercise}
          value={
            session.detectedExerciseCode
              ? formatExerciseLabel(session.detectedExerciseCode, text, false)
              : "—"
          }
          hint={session.detectedExerciseName ?? text.mlResult}
          icon={Activity}
          tone="cyan"
        />

        <StatCard
          label={text.executionQuality}
          value={
            session.qualityName
              ? formatQualityName(session.qualityName, text.qualityValues)
              : "—"
          }
          hint={formatStatus(session.status, text.statusValues)}
          icon={CheckCircle2}
          tone="mint"
        />

        <StatCard
          label={text.repetitions}
          value={session.repetitionCount ?? repetitions.length}
          hint={text.detectedRepetitions}
          icon={Repeat}
          tone="violet"
        />

        <StatCard
          label={text.duration}
          value={
            typeof session.durationSeconds === "number"
              ? `${round(session.durationSeconds, 1)} s`
              : "—"
          }
          hint={`${session.sampleCount ?? 0} ${text.samples}`}
          icon={Timer}
          tone="amber"
        />

        <StatCard
          label={text.exerciseConfidence}
          value={formatPercent(session.exerciseConfidence)}
          hint={text.exerciseClassifier}
          icon={Gauge}
          tone="cyan"
        />

        <StatCard
          label={text.qualityConfidence}
          value={formatPercent(session.qualityConfidence)}
          hint={text.qualityClassifier}
          icon={Gauge}
          tone="mint"
        />

        <StatCard
          label={text.startedAt}
          value={formatShortDate(session.startedAt, text.locale)}
          hint={formatTime(session.startedAt, text.locale)}
          icon={Timer}
          tone="primary"
        />
      </div>

      <SectionCard title={text.sessionSummary} subtitle={text.sessionSummarySubtitle}>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label={text.patient} value={session.patientName ?? `${text.patient} ${session.patientId}`} />
          <InfoRow label={text.status} value={formatStatus(session.status, text.statusValues)} />
          <InfoRow label={text.startedAt} value={formatDateTime(session.startedAt, text.locale)} />
          <InfoRow label={text.endedAt} value={formatDateTime(session.endedAt, text.locale)} />
          <InfoRow label={text.sampleCount} value={String(session.sampleCount ?? 0)} />
          <InfoRow
            label={text.mlMessage}
            value={session.message ?? session.notes ?? text.noMessageAvailable}
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={text.repetitionDuration} subtitle={text.durationInSeconds}>
          <ChartWrap empty={!durationChartData.length}>
            <BarChart data={durationChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              {/* Tooltip compatibil cu dark mode */}
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              />
              <Bar
                dataKey="duration"
                name={text.durationSeries}
                fill="var(--primary)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard title={text.samplesPerRepetition} subtitle={text.segmentSize}>
          <ChartWrap empty={!sampleChartData.length}>
            <BarChart data={sampleChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              {/* Tooltip compatibil cu dark mode */}
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              />
              <Bar
                dataKey="samples"
                name={text.samplesSeries}
                fill="var(--violet)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard
          title={text.confidencePerRepetition}
          subtitle={text.confidenceSubtitle}
          className="lg:col-span-2"
        >
          <ChartWrap empty={!confidenceChartData.length}>
            <LineChart data={confidenceChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
              {/* Tooltip compatibil cu dark mode */}
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="exercise"
                name={text.exerciseConfidenceSeries}
                stroke="var(--primary)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="quality"
                name={text.qualityConfidenceSeries}
                stroke="var(--mint)"
                strokeWidth={2}
              />
            </LineChart>
          </ChartWrap>
        </SectionCard>
      </div>

      <SectionCard title={text.repetitionResults} subtitle={text.repetitionResultsSubtitle}>
        {repetitions.length === 0 ? (
          <div className="grid min-h-[160px] place-items-center text-sm text-muted-foreground">
            {text.noRepetitionResults}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">{text.tableRep}</th>
                <th className="py-3 pr-4">{text.tableExercise}</th>
                <th className="py-3 pr-4">{text.tableExerciseConfidence}</th>
                <th className="py-3 pr-4">{text.tableQuality}</th>
                <th className="py-3 pr-4">{text.tableQualityConfidence}</th>
                <th className="py-3 pr-4">{text.tableDuration}</th>
                <th className="py-3 pr-4">{text.tableSamples}</th>
                <th className="py-3 pr-4">{text.tableStart}</th>
                <th className="py-3">{text.tableEnd}</th>
              </tr>
              </thead>

              <tbody>
              {repetitions.map((repetition) => (
                <tr
                  key={repetition.id ?? repetition.repetitionIndex}
                  className="border-b border-border/60 transition hover:bg-muted/40"
                >
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {repetition.repetitionIndex}
                  </td>

                  <td className="py-3 pr-4">
                    {repetition.predictedExerciseCode
                      ? formatExerciseLabel(repetition.predictedExerciseCode, text, false)
                      : repetition.exerciseCode
                        ? formatExerciseLabel(repetition.exerciseCode, text, false)
                        : "—"}
                  </td>

                  <td className="py-3 pr-4">
                    {formatPercent(repetition.exerciseConfidence)}
                  </td>

                  <td className="py-3 pr-4">
                    {repetition.qualityName ? (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${qualityBadgeClass(
                          repetition.qualityName,
                        )}`}
                      >
                        {formatQualityName(repetition.qualityName, text.qualityValues)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="py-3 pr-4">
                    {formatPercent(repetition.qualityConfidence)}
                  </td>

                  <td className="py-3 pr-4">
                    {typeof repetition.durationSeconds === "number"
                      ? `${round(repetition.durationSeconds, 2)} s`
                      : "—"}
                  </td>

                  <td className="py-3 pr-4">
                    {repetition.sampleCount ?? "—"}
                  </td>

                  <td className="py-3 pr-4">
                    {repetition.startIndex ?? repetition.startSample ?? "—"}
                  </td>

                  <td className="py-3">
                    {repetition.endIndex ?? repetition.endSample ?? "—"}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function BackLink() {
  // Buton pentru revenirea la istoricul sesiunilor
  const { language } = useAppLanguage();
  const text = SESSION_DETAILS_TEXT[language];

  return (
    <Link
      to="/sessions"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {text.backToSessions}
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  // Rand simplu pentru informatii despre sesiune
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
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
    <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function ChartWrap({
                     children,
                     empty,
                   }: {
  children: ReactElement;
  empty: boolean;
}) {
  // Afiseaza un grafic sau o stare goala
  const { language } = useAppLanguage();
  const text = SESSION_DETAILS_TEXT[language];

  if (empty) {
    return (
      <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">
        {text.noRepetitionData}
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

// Stil pentru tooltipurile graficelor in light mode si dark mode
const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--popover-foreground)",
  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.18)",
} as const;

const tooltipLabelStyle = {
  color: "var(--popover-foreground)",
  fontWeight: 600,
} as const;

const tooltipItemStyle = {
  color: "var(--popover-foreground)",
} as const;

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
  // Formateaza data completa in limba selectata
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(locale);
}

function formatShortDate(value?: string | null, locale = "ro-RO"): string {
  // Formateaza doar data scurta in limba selectata
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(locale);
}

function formatTime(value?: string | null, locale = "ro-RO"): string {
  // Formateaza doar ora in limba selectata
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleTimeString(locale);
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
  text: (typeof SESSION_DETAILS_TEXT)[keyof typeof SESSION_DETAILS_TEXT],
  short = false,
): string {
  // Afiseaza corect detectia automata in loc de Exercitiul 0
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
  text: (typeof SESSION_DETAILS_TEXT)[keyof typeof SESSION_DETAILS_TEXT],
) {
  // Genereaza un raport HTML descarcabil pentru sesiunea selectata
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
  text: (typeof SESSION_DETAILS_TEXT)[keyof typeof SESSION_DETAILS_TEXT],
): string {
  // Construieste continutul raportului HTML pentru export
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

  return `<!doctype html>
<html lang="${text.htmlLanguage}">
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
      <p>KinetoLive • ${escapeHtml(text.reportGeneratedAt)} ${escapeHtml(formatDateTime(new Date().toISOString(), text.locale))}</p>
    </section>

    <section class="grid">
      <article class="card">
        <h2>${escapeHtml(text.reportPatientSection)}</h2>
        ${reportField(text.patient, session.patientName ?? `${text.patient} ${session.patientId}`)}
        ${reportField(text.status, formatStatus(session.status, text.statusValues))}
        ${reportField(text.startedAt, formatDateTime(session.startedAt, text.locale))}
        ${reportField(text.endedAt, formatDateTime(session.endedAt, text.locale))}
      </article>

      <article class="card">
        <h2>${escapeHtml(text.reportMlSection)}</h2>
        ${reportField(text.intendedExercise, formatExerciseLabel(session.intendedExerciseCode, text))}
        ${reportField(text.detectedExercise, formatExerciseLabel(session.detectedExerciseCode, text))}
        ${reportField(text.executionQuality, quality)}
        ${reportField(text.repetitions, String(session.repetitionCount ?? repetitions.length))}
        ${reportField(text.duration, typeof session.durationSeconds === "number" ? `${round(session.durationSeconds, 1)} s` : "—")}
        ${reportField(text.exerciseConfidence, formatPercent(session.exerciseConfidence))}
        ${reportField(text.qualityConfidence, formatPercent(session.qualityConfidence))}
      </article>
    </section>

    <section class="card">
      <h2>${escapeHtml(text.reportRepetitionSection)}</h2>
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(text.tableRep)}</th>
            <th>${escapeHtml(text.tableExercise)}</th>
            <th>${escapeHtml(text.tableExerciseConfidence)}</th>
            <th>${escapeHtml(text.tableQuality)}</th>
            <th>${escapeHtml(text.tableQualityConfidence)}</th>
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

function formatQualityName(
  qualityName: string,
  qualityValues: Record<string, string>,
): string {
  // Traduce numele calitatii pentru afisare
  return qualityValues[qualityName] ?? qualityName;
}
