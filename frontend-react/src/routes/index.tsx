// Pagina Dashboard pentru platforma KinetoLive
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactElement } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  Dumbbell,
  Gauge,
  ListChecks,
  Radio,
  Repeat,
  Server,
  Timer,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SectionCard, StatCard } from "@/components/StatCard";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useSelectedPatient } from "@/hooks/useSelectedPatient";
import { api, qualityBadgeClass, type TherapySession } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — KinetoLive" }] }),
  component: DashboardPage,
});


type QuickActionTo = "/live-session" | "/exercises" | "/sessions" | "/patients";

// Texte pentru Dashboard in romana si engleza
const DASHBOARD_TEXT = {
  ro: {
    title: "KinetoLive Dashboard",
    subtitle:
      "Prezentare generala a sesiunilor de recuperare, monitorizarii live a senzorilor, predictiilor prin invatare automata si progresului pacientului.",
    backend: "Backend",
    online: "online",
    offline: "offline",
    checking: "verificare",
    backendErrorPrefix: "Nu s-a putut conecta la backend-ul Spring Boot",
    backendErrorHint:
      "Verifica daca backend-ul ruleaza pe http://localhost:8080.",
    startLiveSession: "Porneste sesiune live",
    startLiveSessionDescription:
      "Deschide pagina de monitorizare live si transmite datele senzorului BNO055.",
    exerciseLibrary: "Biblioteca de exercitii",
    exerciseLibraryDescription:
      "Vezi exercitiile de recuperare folosite de fluxul de invatare automata.",
    sessionsHistory: "Istoric sesiuni",
    sessionsHistoryDescription:
      "Revizuieste sesiunile salvate, repetarile si rezultatele de calitate.",
    patients: "Pacienti",
    patientsDescription: "Alege pacientul activ pentru datele afisate.",
    selectedPatient: "Pacient selectat",
    noSelectedPatient: "Nu exista pacient selectat. Adauga sau selecteaza un pacient din sectiunea Pacienti.",
    totalSessions: "Total sesiuni",
    completed: "finalizate",
    started: "pornite",
    lastExercise: "Ultimul exercitiu",
    noSession: "Nicio sesiune",
    lastQuality: "Ultima calitate",
    noAnalysisYet: "Nicio analiza inca",
    totalRepetitions: "Total repetari",
    repetitionsHint: "Detectate prin segmentare automata",
    avgDuration: "Durata medie",
    completedSessions: "Sesiuni finalizate",
    avgExerciseConfidence: "Incredere medie exercitiu",
    exerciseClassifier: "Clasificator exercitii",
    avgQualityConfidence: "Incredere medie calitate",
    qualityClassifier: "Clasificator calitate",
    backendStatus: "Status backend",
    springBootPort: "Spring Boot · port 8080",
    sessionDuration: "Durata sesiunilor",
    sessionDurationSubtitle: "Ultimele sesiuni, in secunde",
    durationLabel: "Durata",
    repetitionsPerSession: "Repetari pe sesiune",
    repetitionsPerSessionSubtitle: "Repetari detectate",
    repetitionsLabel: "Repetari",
    qualityDistribution: "Distributia calitatii",
    qualityDistributionSubtitle: "Clase de calitate ale executiei",
    exerciseDistribution: "Distributia exercitiilor",
    exerciseDistributionSubtitle: "Exercitiile 6, 7 si 8",
    sessionsLabel: "Sesiuni",
    // Texte pentru graficul scorurilor de analiza
    confidenceTrend: "Evolutia scorurilor de analiza",
    confidenceTrendSubtitle:
      "Scorurile calculate pentru exercitiu si calitatea executiei",
    exerciseConfidence: "Scor analiza exercitiu",
    qualityConfidence: "Scor analiza calitate",
    recentSessions: "Sesiuni recente",
    recentSessionsSubtitle: "Ultimele sesiuni de terapie salvate",
    viewAll: "Vezi toate",
    noSessionsYet:
      "Nu exista sesiuni inca. Porneste o sesiune live pentru a genera date.",
    tableSession: "Sesiune",
    tableStatus: "Status",
    tableIntended: "Planificat",
    tableDetected: "Detectat",
    tableQuality: "Calitate",
    tableReps: "Rep",
    tableDuration: "Durata",
    tableStarted: "Pornita",
    pipelineTitle: "Pipeline KinetoLive",
    pipelineDescription:
      "Datele BNO055 sunt transmise prin WebSocket, stocate temporar de Spring Boot, analizate de microserviciul Python pentru invatare automata si salvate in PostgreSQL.",
    loading: "Se incarca...",
    noDataYet: "Nu exista date inca",
    exerciseWord: "Exercitiul",
    statusCompleted: "FINALIZATA",
    statusStarted: "PORNITA",
    statusOther: "NEFINALIZATA",
    qualityNormal: "Normal",
    qualityRapid: "Rapid",
    qualitySmallAmplitude: "Amplitudine mica",
  },
  en: {
    title: "KinetoLive Dashboard",
    subtitle:
      "Overview of rehabilitation sessions, live sensor monitoring, machine learning predictions and patient progress.",
    backend: "Backend",
    online: "online",
    offline: "offline",
    checking: "checking",
    backendErrorPrefix: "Could not reach Spring Boot backend",
    backendErrorHint: "Make sure the backend is running on http://localhost:8080.",
    startLiveSession: "Start live session",
    startLiveSessionDescription:
      "Open the live monitoring page and stream BNO055 sensor data.",
    exerciseLibrary: "Exercise library",
    exerciseLibraryDescription:
      "View the rehabilitation exercises used by the machine learning pipeline.",
    sessionsHistory: "Sessions history",
    sessionsHistoryDescription:
      "Review saved sessions, repetitions and quality results.",
    patients: "Patients",
    patientsDescription: "Choose the active patient for displayed data.",
    selectedPatient: "Selected patient",
    noSelectedPatient: "No patient selected. Add or select a patient from the Patients section.",
    totalSessions: "Total sessions",
    completed: "completed",
    started: "started",
    lastExercise: "Last exercise",
    noSession: "No session",
    lastQuality: "Last quality",
    noAnalysisYet: "No analysis yet",
    totalRepetitions: "Total repetitions",
    repetitionsHint: "Detected by machine learning segmentation",
    avgDuration: "Avg duration",
    completedSessions: "Completed sessions",
    avgExerciseConfidence: "Avg exercise confidence",
    exerciseClassifier: "Exercise classifier",
    avgQualityConfidence: "Avg quality confidence",
    qualityClassifier: "Quality classifier",
    backendStatus: "Backend status",
    springBootPort: "Spring Boot · port 8080",
    sessionDuration: "Session duration",
    sessionDurationSubtitle: "Last sessions, in seconds",
    durationLabel: "Duration",
    repetitionsPerSession: "Repetitions per session",
    repetitionsPerSessionSubtitle: "Detected repetitions",
    repetitionsLabel: "Repetitions",
    qualityDistribution: "Quality distribution",
    qualityDistributionSubtitle: "Execution quality classes",
    exerciseDistribution: "Exercise distribution",
    exerciseDistributionSubtitle: "Exercise 6, 7 and 8",
    sessionsLabel: "Sessions",
    confidenceTrend: "Confidence trend",
    confidenceTrendSubtitle: "Exercise and quality confidence over time",
    exerciseConfidence: "Exercise confidence",
    qualityConfidence: "Quality confidence",
    recentSessions: "Recent sessions",
    recentSessionsSubtitle: "Last saved therapy sessions",
    viewAll: "View all",
    noSessionsYet: "No sessions yet. Start a live session to generate data.",
    tableSession: "Session",
    tableStatus: "Status",
    tableIntended: "Intended",
    tableDetected: "Detected",
    tableQuality: "Quality",
    tableReps: "Reps",
    tableDuration: "Duration",
    tableStarted: "Started",
    pipelineTitle: "KinetoLive pipeline",
    pipelineDescription:
      "BNO055 samples are streamed through WebSocket, buffered by Spring Boot, analyzed by the Python machine learning service and saved in PostgreSQL.",
    loading: "Loading...",
    noDataYet: "No data yet",
    exerciseWord: "Exercise",
    statusCompleted: "COMPLETED",
    statusStarted: "STARTED",
    statusOther: "NOT COMPLETED",
    qualityNormal: "Normal",
    qualityRapid: "Rapid",
    qualitySmallAmplitude: "Small amplitude",
  },
} as const;

type DashboardText = (typeof DASHBOARD_TEXT)[keyof typeof DASHBOARD_TEXT];

function DashboardPage() {
  const { language } = useAppLanguage();
  const text = DASHBOARD_TEXT[language];
  const {
    selectedPatient,
    selectedPatientId,
    loading: patientLoading,
  } = useSelectedPatient();

  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    // Incarca datele principale pentru Dashboard
    let active = true;

    async function loadDashboardData() {
      if (patientLoading) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await api.health();

        if (!active) {
          return;
        }

        setBackendOnline(true);

        if (!selectedPatientId) {
          setSessions([]);
          return;
        }

        const patientSessions = await api.patientSessions(selectedPatientId);

        if (!active) {
          return;
        }

        setSessions(patientSessions ?? []);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setBackendOnline(false);
        setError((caughtError as Error).message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      active = false;
    };
  }, [patientLoading, selectedPatientId]);

  const stats = useMemo(() => {
    // Calculeaza indicatorii principali pentru Dashboard
    const totalSessions = sessions.length;
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

    const averageExerciseConfidence = average(
      completedSessions.map((session) => session.exerciseConfidence),
    );

    const averageQualityConfidence = average(
      completedSessions.map((session) => session.qualityConfidence),
    );

    const lastSession = sessions[0] ?? null;
    const lastCompletedSession = completedSessions[0] ?? lastSession;

    return {
      totalSessions,
      completedSessions: completedSessions.length,
      startedSessions: startedSessions.length,
      totalRepetitions,
      averageDuration,
      averageExerciseConfidence,
      averageQualityConfidence,
      lastSession,
      lastCompletedSession,
    };
  }, [sessions]);

  const durationSeries = useMemo(() => {
    // Pregateste graficul duratei sesiunilor
    return [...sessions]
      .reverse()
      .slice(-10)
      .map((session) => ({
        name: `#${session.id}`,
        duration: round(session.durationSeconds ?? 0, 1),
      }));
  }, [sessions]);

  const repetitionSeries = useMemo(() => {
    // Pregateste graficul repetarilor pe sesiune
    return [...sessions]
      .reverse()
      .slice(-10)
      .map((session) => ({
        name: `#${session.id}`,
        repetitions: session.repetitionCount ?? 0,
      }));
  }, [sessions]);

  const confidenceSeries = useMemo(() => {
    // Pregateste graficul increderii modelului de invatare automata
    return [...sessions]
      .reverse()
      .slice(-10)
      .map((session) => ({
        name: `#${session.id}`,
        exercise: toPercent(session.exerciseConfidence),
        quality: toPercent(session.qualityConfidence),
      }));
  }, [sessions]);

  const qualityDistribution = useMemo(() => {
    // Pregateste distributia claselor de calitate
    const counts: Record<string, number> = {
      Normal: 0,
      Rapid: 0,
      "Small amplitude": 0,
    };

    sessions.forEach((session) => {
      if (session.qualityName && session.qualityName in counts) {
        counts[session.qualityName] += 1;
      }
    });

    return Object.entries(counts).map(([rawName, value]) => ({
      rawName,
      name: formatQualityName(rawName, text),
      value,
    }));
  }, [sessions, text]);

  const exerciseDistribution = useMemo(() => {
    // Pregateste distributia exercitiilor analizate
    const counts: Record<number, number> = {
      6: 0,
      7: 0,
      8: 0,
    };

    sessions.forEach((session) => {
      const exerciseCode =
        session.detectedExerciseCode ?? session.intendedExerciseCode;

      if (exerciseCode in counts) {
        counts[exerciseCode] += 1;
      }
    });

    return Object.entries(counts).map(([code, value]) => ({
      name: formatExerciseName(Number(code), text),
      value,
    }));
  }, [sessions, text]);

  const recentSessions = useMemo(() => {
    // Pastreaza ultimele sesiuni pentru tabelul rapid
    return sessions.slice(0, 5);
  }, [sessions]);

  const lastSession = stats.lastCompletedSession;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {text.title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {text.subtitle}
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground">
          <span
            className={`h-2 w-2 rounded-full ${
              backendOnline ? "bg-[color:var(--mint)]" : "bg-[color:var(--amber)]"
            }`}
          />
          {text.backend} {backendOnline ? text.online : backendOnline === false ? text.offline : text.checking}
        </div>
      </div>

      {error && (
        <div className="card-soft border-rose/30 bg-[color:var(--rose)]/5 p-4 text-sm text-[color:var(--rose)]">
          {text.backendErrorPrefix}: {error}. {text.backendErrorHint}
        </div>
      )}

      {!patientLoading && !selectedPatient && (
        <div className="card-soft border-amber/30 bg-[color:var(--amber)]/5 p-4 text-sm text-[color:var(--amber)]">
          {text.noSelectedPatient}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <QuickActionCard
          to="/live-session"
          title={text.startLiveSession}
          description={text.startLiveSessionDescription}
          icon={Radio}
        />

        <QuickActionCard
          to="/exercises"
          title={text.exerciseLibrary}
          description={text.exerciseLibraryDescription}
          icon={Dumbbell}
        />

        <QuickActionCard
          to="/sessions"
          title={text.sessionsHistory}
          description={text.sessionsHistoryDescription}
          icon={ListChecks}
        />

        <QuickActionCard
          to="/patients"
          title={text.patients}
          description={selectedPatient?.fullName ?? text.patientsDescription}
          icon={UsersRound}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={text.totalSessions}
          value={stats.totalSessions}
          hint={`${stats.completedSessions} ${text.completed} · ${stats.startedSessions} ${text.started}`}
          icon={Activity}
          tone="primary"
        />

        <StatCard
          label={text.lastExercise}
          value={
            lastSession?.detectedExerciseCode
              ? formatExerciseName(lastSession.detectedExerciseCode, text)
              : lastSession?.intendedExerciseCode
                ? formatExerciseName(lastSession.intendedExerciseCode, text)
                : "—"
          }
          hint={lastSession ? formatDateTime(lastSession.startedAt, language) : text.noSession}
          icon={Dumbbell}
          tone="cyan"
        />

        <StatCard
          label={text.lastQuality}
          value={formatQualityName(lastSession?.qualityName, text)}
          hint={lastSession?.status ? formatStatus(lastSession.status, text) : text.noAnalysisYet}
          icon={CheckCircle2}
          tone="mint"
        />

        <StatCard
          label={text.totalRepetitions}
          value={stats.totalRepetitions}
          hint={text.repetitionsHint}
          icon={Repeat}
          tone="violet"
        />

        <StatCard
          label={text.avgDuration}
          value={`${round(stats.averageDuration, 1)} s`}
          hint={text.completedSessions}
          icon={Timer}
          tone="amber"
        />

        <StatCard
          label={text.avgExerciseConfidence}
          value={formatPercent(stats.averageExerciseConfidence)}
          hint={text.exerciseClassifier}
          icon={TrendingUp}
          tone="cyan"
        />

        <StatCard
          label={text.avgQualityConfidence}
          value={formatPercent(stats.averageQualityConfidence)}
          hint={text.qualityClassifier}
          icon={Gauge}
          tone="mint"
        />

        <StatCard
          label={text.backendStatus}
          value={
            backendOnline === null
              ? `${text.checking}...`
              : backendOnline
                ? text.online
                : text.offline
          }
          hint={text.springBootPort}
          icon={backendOnline ? Server : AlertCircle}
          tone={backendOnline ? "mint" : "rose"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={text.sessionDuration} subtitle={text.sessionDurationSubtitle}>
          <ChartWrap loading={loading} empty={!durationSeries.length} loadingText={text.loading} emptyText={text.noDataYet}>
            <LineChart data={durationSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              {/* Tooltip compatibil cu dark mode */}
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
              />
              <Line
                type="monotone"
                dataKey="duration"
                name={text.durationLabel}
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard title={text.repetitionsPerSession} subtitle={text.repetitionsPerSessionSubtitle}>
          <ChartWrap loading={loading} empty={!repetitionSeries.length} loadingText={text.loading} emptyText={text.noDataYet}>
            <BarChart data={repetitionSeries}>
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
                dataKey="repetitions"
                name={text.repetitionsLabel}
                fill="var(--cyan)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard title={text.qualityDistribution} subtitle={text.qualityDistributionSubtitle}>
          <ChartWrap loading={loading} empty={!sessions.length} loadingText={text.loading} emptyText={text.noDataYet}>
            <PieChart>
              {/* Grafic donut pentru distributia calitatii */}
              <Pie
                data={qualityDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
              >
                {qualityDistribution.map((item) => (
                  <Cell
                    key={item.rawName}
                    fill={getQualityColor(item.rawName)}
                    stroke="var(--card)"
                    strokeWidth={3}
                  />
                ))}
              </Pie>
              {/* Tooltip compatibil cu dark mode */}
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard title={text.exerciseDistribution} subtitle={text.exerciseDistributionSubtitle}>
          <ChartWrap loading={loading} empty={!sessions.length} loadingText={text.loading} emptyText={text.noDataYet}>
            <BarChart data={exerciseDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              {/* Tooltip cu highlight discret pe coloane */}
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              />
              <Bar
                dataKey="value"
                name={text.sessionsLabel}
                fill="var(--violet)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard
          title={text.confidenceTrend}
          subtitle={text.confidenceTrendSubtitle}
          className="lg:col-span-2"
        >
          <ChartWrap loading={loading} empty={!confidenceSeries.length} loadingText={text.loading} emptyText={text.noDataYet}>
            <LineChart data={confidenceSeries}>
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
                name={text.exerciseConfidence}
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="quality"
                name={text.qualityConfidence}
                stroke="var(--mint)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartWrap>
        </SectionCard>
      </div>

      <SectionCard
        title={text.recentSessions}
        subtitle={text.recentSessionsSubtitle}
        action={
          <Link
            to="/sessions"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-muted"
          >
            {text.viewAll}
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        {recentSessions.length === 0 ? (
          <div className="grid min-h-[120px] place-items-center text-sm text-muted-foreground">
            {text.noSessionsYet}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">{text.tableSession}</th>
                <th className="py-3 pr-4">{text.tableStatus}</th>
                <th className="py-3 pr-4">{text.tableIntended}</th>
                <th className="py-3 pr-4">{text.tableDetected}</th>
                <th className="py-3 pr-4">{text.tableQuality}</th>
                <th className="py-3 pr-4">{text.tableReps}</th>
                <th className="py-3 pr-4">{text.tableDuration}</th>
                <th className="py-3">{text.tableStarted}</th>
              </tr>
              </thead>

              <tbody>
              {recentSessions.map((session) => (
                <tr key={session.id} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    #{session.id}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={session.status} label={formatStatus(session.status, text)} />
                  </td>
                  <td className="py-3 pr-4">
                    {formatExerciseName(session.intendedExerciseCode, text)}
                  </td>
                  <td className="py-3 pr-4">
                    {session.detectedExerciseCode
                      ? formatExerciseName(session.detectedExerciseCode, text)
                      : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {session.qualityName ? (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${qualityBadgeClass(
                          session.qualityName,
                        )}`}
                      >
                          {formatQualityName(session.qualityName, text)}
                        </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-4">{session.repetitionCount ?? 0}</td>
                  <td className="py-3 pr-4">
                    {typeof session.durationSeconds === "number"
                      ? `${round(session.durationSeconds, 1)} s`
                      : "—"}
                  </td>
                  <td className="py-3">
                    {formatDateTime(session.startedAt, language)}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="card-soft p-5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Cpu className="h-4 w-4" />
          {text.pipelineTitle}
        </div>
        <p className="mt-1">{text.pipelineDescription}</p>
      </div>
    </div>
  );
}

function QuickActionCard({
                           to,
                           title,
                           description,
                           icon: Icon,
                         }: {
  to: QuickActionTo;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  // Card pentru actiuni rapide in Dashboard
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>

        <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
      </div>

      <div className="mt-4 font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  // Afiseaza statusul sesiunii
  const className =
    status === "COMPLETED"
      ? "border-[color:var(--mint)]/30 bg-[color:var(--mint)]/10 text-[color:var(--mint)]"
      : status === "STARTED"
        ? "border-[color:var(--amber)]/30 bg-[color:var(--amber)]/10 text-[color:var(--amber)]"
        : "border-[color:var(--rose)]/30 bg-[color:var(--rose)]/10 text-[color:var(--rose)]";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function ChartWrap({
                     children,
                     loading,
                     empty,
                     loadingText,
                     emptyText,
                   }: {
  children: ReactElement;
  loading: boolean;
  empty: boolean;
  loadingText: string;
  emptyText: string;
}) {
  // Afiseaza stari simple pentru grafice
  if (loading) {
    return (
      <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">
        {loadingText}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
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

function average(values: Array<number | null | undefined>): number {
  // Calculeaza media valorilor numerice valide
  const numericValues = values.filter(
    (value): value is number => typeof value === "number",
  );

  if (!numericValues.length) {
    return 0;
  }

  return (
    numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
  );
}

function toPercent(value?: number | null): number {
  // Converteste valorile de incredere in procente
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

function formatDateTime(value: string | null | undefined, language: "ro" | "en"): string {
  // Formateaza data unei sesiuni
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(language === "ro" ? "ro-RO" : "en-US");
}

function formatExerciseName(
  exerciseCode: number | null | undefined,
  text: DashboardText,
): string {
  // Formateaza numele exercitiului in functie de limba
  if (!exerciseCode) {
    return "—";
  }

  return `${text.exerciseWord} ${exerciseCode}`;
}

function formatQualityName(
  value: string | null | undefined,
  text: DashboardText,
): string {
  // Formateaza clasa de calitate in functie de limba
  switch (value) {
    case "Normal":
      return text.qualityNormal;
    case "Rapid":
      return text.qualityRapid;
    case "Small amplitude":
      return text.qualitySmallAmplitude;
    default:
      return value ?? "—";
  }
}

function formatStatus(status: string, text: DashboardText): string {
  // Formateaza statusul sesiunii in functie de limba
  switch (status) {
    case "COMPLETED":
      return text.statusCompleted;
    case "STARTED":
      return text.statusStarted;
    default:
      return text.statusOther;
  }
}

function getQualityColor(value: string): string {
  // Returneaza culoarea pentru distributia calitatii
  switch (value) {
    case "Normal":
      return "var(--mint)";
    case "Rapid":
      return "var(--amber)";
    case "Small amplitude":
      return "var(--violet)";
    default:
      return "var(--muted)";
  }
}
