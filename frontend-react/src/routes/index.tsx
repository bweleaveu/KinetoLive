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
import { api, qualityBadgeClass, type TherapySession } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — KinetoLive" }] }),
  component: DashboardPage,
});

const PATIENT_ID = 1;

type QuickActionTo = "/live-session" | "/exercises" | "/sessions";

function DashboardPage() {
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    // Incarca datele principale pentru Dashboard
    let active = true;

    async function loadDashboardData() {
      setLoading(true);
      setError(null);

      try {
        await api.health();

        if (!active) {
          return;
        }

        setBackendOnline(true);

        const patientSessions = await api.patientSessions(PATIENT_ID);

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
  }, []);

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
    // Pregateste graficul increderii modelului ML
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

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const exerciseDistribution = useMemo(() => {
    // Pregateste distributia exercitiilor analizate
    const counts: Record<string, number> = {
      "Exercise 6": 0,
      "Exercise 7": 0,
      "Exercise 8": 0,
    };

    sessions.forEach((session) => {
      const exerciseCode =
        session.detectedExerciseCode ?? session.intendedExerciseCode;
      const key = `Exercise ${exerciseCode}`;

      if (key in counts) {
        counts[key] += 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [sessions]);

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
            KinetoLive Dashboard
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Overview of rehabilitation sessions, live sensor monitoring, ML
            predictions and patient progress.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground">
          <span
            className={`h-2 w-2 rounded-full ${
              backendOnline ? "bg-[color:var(--mint)]" : "bg-[color:var(--amber)]"
            }`}
          />
          Backend {backendOnline ? "online" : backendOnline === false ? "offline" : "checking"}
        </div>
      </div>

      {error && (
        <div className="card-soft border-rose/30 bg-[color:var(--rose)]/5 p-4 text-sm text-[color:var(--rose)]">
          Could not reach Spring Boot backend: {error}. Make sure the backend is
          running on http://localhost:8080.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickActionCard
          to="/live-session"
          title="Start live session"
          description="Open the live monitoring page and stream BNO055 sensor data."
          icon={Radio}
        />

        <QuickActionCard
          to="/exercises"
          title="Exercise library"
          description="View the rehabilitation exercises used by the ML pipeline."
          icon={Dumbbell}
        />

        <QuickActionCard
          to="/sessions"
          title="Sessions history"
          description="Review saved sessions, repetitions and quality results."
          icon={ListChecks}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total sessions"
          value={stats.totalSessions}
          hint={`${stats.completedSessions} completed · ${stats.startedSessions} started`}
          icon={Activity}
          tone="primary"
        />

        <StatCard
          label="Last exercise"
          value={
            lastSession?.detectedExerciseCode
              ? `Exercise ${lastSession.detectedExerciseCode}`
              : lastSession?.intendedExerciseCode
                ? `Exercise ${lastSession.intendedExerciseCode}`
                : "—"
          }
          hint={lastSession ? formatDateTime(lastSession.startedAt) : "No session"}
          icon={Dumbbell}
          tone="cyan"
        />

        <StatCard
          label="Last quality"
          value={lastSession?.qualityName ?? "—"}
          hint={lastSession?.status ?? "No analysis yet"}
          icon={CheckCircle2}
          tone="mint"
        />

        <StatCard
          label="Total repetitions"
          value={stats.totalRepetitions}
          hint="Detected by ML segmentation"
          icon={Repeat}
          tone="violet"
        />

        <StatCard
          label="Avg duration"
          value={`${round(stats.averageDuration, 1)} s`}
          hint="Completed sessions"
          icon={Timer}
          tone="amber"
        />

        <StatCard
          label="Avg exercise confidence"
          value={formatPercent(stats.averageExerciseConfidence)}
          hint="Exercise classifier"
          icon={TrendingUp}
          tone="cyan"
        />

        <StatCard
          label="Avg quality confidence"
          value={formatPercent(stats.averageQualityConfidence)}
          hint="Quality classifier"
          icon={Gauge}
          tone="mint"
        />

        <StatCard
          label="Backend status"
          value={
            backendOnline === null
              ? "Checking..."
              : backendOnline
                ? "Online"
                : "Offline"
          }
          hint="Spring Boot · port 8080"
          icon={backendOnline ? Server : AlertCircle}
          tone={backendOnline ? "mint" : "rose"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Session duration" subtitle="Last sessions, in seconds">
          <ChartWrap loading={loading} empty={!durationSeries.length}>
            <LineChart data={durationSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="duration"
                name="Duration"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard title="Repetitions per session" subtitle="Detected repetitions">
          <ChartWrap loading={loading} empty={!repetitionSeries.length}>
            <BarChart data={repetitionSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="repetitions"
                name="Repetitions"
                fill="var(--cyan)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard title="Quality distribution" subtitle="Execution quality classes">
          <ChartWrap loading={loading} empty={!sessions.length}>
            <PieChart>
              <Pie
                data={qualityDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
              >
                {qualityDistribution.map((item) => (
                  <Cell key={item.name} fill={getQualityColor(item.name)} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard title="Exercise distribution" subtitle="Exercise 6, 7 and 8">
          <ChartWrap loading={loading} empty={!sessions.length}>
            <BarChart data={exerciseDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="value"
                name="Sessions"
                fill="var(--violet)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard
          title="Confidence trend"
          subtitle="Exercise and quality confidence over time"
          className="lg:col-span-2"
        >
          <ChartWrap loading={loading} empty={!confidenceSeries.length}>
            <LineChart data={confidenceSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="exercise"
                name="Exercise confidence"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="quality"
                name="Quality confidence"
                stroke="var(--mint)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartWrap>
        </SectionCard>
      </div>

      <SectionCard
        title="Recent sessions"
        subtitle="Last saved therapy sessions"
        action={
          <Link
            to="/sessions"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-muted"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        {recentSessions.length === 0 ? (
          <div className="grid min-h-[120px] place-items-center text-sm text-muted-foreground">
            No sessions yet. Start a live session to generate data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Session</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Intended</th>
                <th className="py-3 pr-4">Detected</th>
                <th className="py-3 pr-4">Quality</th>
                <th className="py-3 pr-4">Reps</th>
                <th className="py-3 pr-4">Duration</th>
                <th className="py-3">Started</th>
              </tr>
              </thead>

              <tbody>
              {recentSessions.map((session) => (
                <tr key={session.id} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    #{session.id}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="py-3 pr-4">
                    Exercise {session.intendedExerciseCode}
                  </td>
                  <td className="py-3 pr-4">
                    {session.detectedExerciseCode
                      ? `Exercise ${session.detectedExerciseCode}`
                      : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {session.qualityName ? (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${qualityBadgeClass(
                          session.qualityName,
                        )}`}
                      >
                          {session.qualityName}
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
                  <td className="py-3">{formatDateTime(session.startedAt)}</td>
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
          KinetoLive pipeline
        </div>
        <p className="mt-1">
          BNO055 samples are streamed through WebSocket, buffered by Spring Boot,
          analyzed by the Python ML service and saved in PostgreSQL.
        </p>
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

function StatusBadge({ status }: { status: string }) {
  // Afiseaza statusul sesiunii
  const className =
    status === "COMPLETED"
      ? "border-[color:var(--mint)]/30 bg-[color:var(--mint)]/10 text-[color:var(--mint)]"
      : status === "STARTED"
        ? "border-[color:var(--amber)]/30 bg-[color:var(--amber)]/10 text-[color:var(--amber)]"
        : "border-[color:var(--rose)]/30 bg-[color:var(--rose)]/10 text-[color:var(--rose)]";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {status}
    </span>
  );
}

function ChartWrap({
                     children,
                     loading,
                     empty,
                   }: {
  children: ReactElement;
  loading: boolean;
  empty: boolean;
}) {
  // Afiseaza stari simple pentru grafice
  if (loading) {
    return (
      <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (empty) {
    return (
      <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
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

function formatDateTime(value?: string | null): string {
  // Formateaza data unei sesiuni
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
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
