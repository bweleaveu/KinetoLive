// Pagina pentru detaliile unei sesiuni de recuperare KinetoLive
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  Dumbbell,
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
import {
  api,
  qualityBadgeClass,
  type RepetitionResult,
  type TherapySession,
} from "@/lib/api";

export const Route = createFileRoute("/sessions/$sessionId")({
  head: () => ({ meta: [{ title: "Session Details — KinetoLive" }] }),
  component: SessionDetailsPage,
});

const PATIENT_ID = 1;

function SessionDetailsPage() {
  const { sessionId } = Route.useParams();

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
        const [sessions, repetitionResults] = await Promise.all([
          api.patientSessions(PATIENT_ID),
          api.sessionRepetitions(numericSessionId),
        ]);

        const selectedSession =
          sessions.find((item) => item.id === numericSessionId) ?? null;

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
        Loading session details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />

        <div className="card-soft border-rose/30 bg-[color:var(--rose)]/5 p-4 text-sm text-[color:var(--rose)]">
          Could not load session details: {error}. Make sure Spring Boot is
          running on http://localhost:8080.
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <BackLink />

        <div className="card-soft p-6 text-sm text-muted-foreground">
          Session #{numericSessionId} was not found.
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
            Session #{session.id}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Detailed ML analysis, repetition results and execution quality.
          </p>
        </div>

        <StatusBadge status={session.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Intended exercise"
          value={`Exercise ${session.intendedExerciseCode}`}
          hint={session.intendedExerciseName ?? "Selected by patient"}
          icon={Dumbbell}
          tone="primary"
        />

        <StatCard
          label="Detected exercise"
          value={
            session.detectedExerciseCode
              ? `Exercise ${session.detectedExerciseCode}`
              : "—"
          }
          hint={session.detectedExerciseName ?? "ML result"}
          icon={Activity}
          tone="cyan"
        />

        <StatCard
          label="Execution quality"
          value={session.qualityName ?? "—"}
          hint={session.status}
          icon={CheckCircle2}
          tone="mint"
        />

        <StatCard
          label="Repetitions"
          value={session.repetitionCount ?? repetitions.length}
          hint="Detected repetitions"
          icon={Repeat}
          tone="violet"
        />

        <StatCard
          label="Duration"
          value={
            typeof session.durationSeconds === "number"
              ? `${round(session.durationSeconds, 1)} s`
              : "—"
          }
          hint={`${session.sampleCount ?? 0} samples`}
          icon={Timer}
          tone="amber"
        />

        <StatCard
          label="Exercise confidence"
          value={formatPercent(session.exerciseConfidence)}
          hint="Exercise classifier"
          icon={Gauge}
          tone="cyan"
        />

        <StatCard
          label="Quality confidence"
          value={formatPercent(session.qualityConfidence)}
          hint="Quality classifier"
          icon={Gauge}
          tone="mint"
        />

        <StatCard
          label="Started at"
          value={formatShortDate(session.startedAt)}
          hint={formatTime(session.startedAt)}
          icon={Timer}
          tone="primary"
        />
      </div>

      <SectionCard title="Session summary" subtitle="Main information saved in PostgreSQL">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Patient" value={session.patientName ?? `Patient ${session.patientId}`} />
          <InfoRow label="Status" value={session.status} />
          <InfoRow label="Started at" value={formatDateTime(session.startedAt)} />
          <InfoRow label="Ended at" value={formatDateTime(session.endedAt)} />
          <InfoRow label="Sample count" value={String(session.sampleCount ?? 0)} />
          <InfoRow
            label="ML message"
            value={session.message ?? session.notes ?? "No message available"}
          />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Repetition duration" subtitle="Duration in seconds">
          <ChartWrap empty={!durationChartData.length}>
            <BarChart data={durationChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="duration"
                name="Duration"
                fill="var(--primary)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard title="Samples per repetition" subtitle="Segment size">
          <ChartWrap empty={!sampleChartData.length}>
            <BarChart data={sampleChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="samples"
                name="Samples"
                fill="var(--violet)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartWrap>
        </SectionCard>

        <SectionCard
          title="Confidence per repetition"
          subtitle="Exercise and quality confidence"
          className="lg:col-span-2"
        >
          <ChartWrap empty={!confidenceChartData.length}>
            <LineChart data={confidenceChartData}>
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
              />
              <Line
                type="monotone"
                dataKey="quality"
                name="Quality confidence"
                stroke="var(--mint)"
                strokeWidth={2}
              />
            </LineChart>
          </ChartWrap>
        </SectionCard>
      </div>

      <SectionCard title="Repetition results" subtitle="Prediction for each detected repetition">
        {repetitions.length === 0 ? (
          <div className="grid min-h-[160px] place-items-center text-sm text-muted-foreground">
            No repetition results were saved for this session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Rep</th>
                <th className="py-3 pr-4">Exercise</th>
                <th className="py-3 pr-4">Exercise confidence</th>
                <th className="py-3 pr-4">Quality</th>
                <th className="py-3 pr-4">Quality confidence</th>
                <th className="py-3 pr-4">Duration</th>
                <th className="py-3 pr-4">Samples</th>
                <th className="py-3 pr-4">Start</th>
                <th className="py-3">End</th>
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
                      ? `Exercise ${repetition.predictedExerciseCode}`
                      : repetition.exerciseCode
                        ? `Exercise ${repetition.exerciseCode}`
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
                          {repetition.qualityName}
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
  return (
    <Link
      to="/sessions"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to sessions
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

function StatusBadge({ status }: { status: string }) {
  // Afiseaza statusul sesiunii cu o culoare relevanta
  const className =
    status === "COMPLETED"
      ? "border-[color:var(--mint)]/30 bg-[color:var(--mint)]/10 text-[color:var(--mint)]"
      : status === "STARTED"
        ? "border-[color:var(--amber)]/30 bg-[color:var(--amber)]/10 text-[color:var(--amber)]"
        : "border-[color:var(--rose)]/30 bg-[color:var(--rose)]/10 text-[color:var(--rose)]";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${className}`}>
      {status}
    </span>
  );
}

function ChartWrap({
                     children,
                     empty,
                   }: {
  children: React.ReactElement;
  empty: boolean;
}) {
  // Afiseaza un grafic sau o stare goala
  if (empty) {
    return (
      <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">
        No repetition data available
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
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
  // Formateaza data completa
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function formatShortDate(value?: string | null): string {
  // Formateaza doar data scurta
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString();
}

function formatTime(value?: string | null): string {
  // Formateaza doar ora
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleTimeString();
}