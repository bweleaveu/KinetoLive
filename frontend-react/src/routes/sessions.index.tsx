// Pagina pentru istoricul sesiunilor pacientului in KinetoLive
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Repeat,
  Search,
  Timer,
  XCircle,
} from "lucide-react";

import { SectionCard, StatCard } from "@/components/StatCard";
import { api, qualityBadgeClass, type TherapySession } from "@/lib/api";

export const Route = createFileRoute("/sessions/")({
  head: () => ({ meta: [{ title: "Sessions — KinetoLive" }] }),
  component: SessionsPage,
});

const PATIENT_ID = 1;
const STATUS_FILTERS = ["ALL", "STARTED", "COMPLETED", "FAILED"] as const;

function SessionsPage() {
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");

  useEffect(() => {
    // Incarca sesiunile salvate pentru pacientul de test
    let active = true;

    async function loadSessions() {
      setLoading(true);
      setError(null);

      try {
        const result = await api.patientSessions(PATIENT_ID);

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
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sessions History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved rehabilitation sessions, ML predictions and repetition results.
          </p>
        </div>

        <Link
          to="/live-session"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Start live session
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {error && (
        <div className="card-soft border-rose/30 bg-[color:var(--rose)]/5 p-4 text-sm text-[color:var(--rose)]">
          Could not load sessions: {error}. Make sure Spring Boot is running on
          http://localhost:8080.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total sessions"
          value={stats.totalSessions}
          hint="All patient sessions"
          icon={Activity}
          tone="primary"
        />

        <StatCard
          label="Completed"
          value={stats.completedSessions}
          hint="Analyzed and saved"
          icon={CheckCircle2}
          tone="mint"
        />

        <StatCard
          label="Started"
          value={stats.startedSessions}
          hint="Not finalized yet"
          icon={Clock}
          tone="amber"
        />

        <StatCard
          label="Total repetitions"
          value={stats.totalRepetitions}
          hint="Detected by segmentation"
          icon={Repeat}
          tone="violet"
        />

        <StatCard
          label="Avg duration"
          value={`${round(stats.averageDuration, 1)} s`}
          hint="Completed sessions"
          icon={Timer}
          tone="cyan"
        />
      </div>

      <SectionCard
        title="Therapy sessions"
        subtitle="Filter, search and open saved session details"
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by exercise, quality or status..."
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
              <option value="ALL">All statuses</option>
              <option value="STARTED">Started</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-[240px] place-items-center text-sm text-muted-foreground">
            Loading sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="grid min-h-[240px] place-items-center text-center text-sm text-muted-foreground">
            <div>
              <XCircle className="mx-auto mb-2 h-7 w-7" />
              No sessions found. Start a live session to generate data.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Session</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Started</th>
                <th className="py-3 pr-4">Ended</th>
                <th className="py-3 pr-4">Intended</th>
                <th className="py-3 pr-4">Detected</th>
                <th className="py-3 pr-4">Quality</th>
                <th className="py-3 pr-4">Reps</th>
                <th className="py-3 pr-4">Duration</th>
                <th className="py-3 pr-4">Confidence</th>
                <th className="py-3 text-right">Details</th>
              </tr>
              </thead>

              <tbody>
              {filteredSessions.map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-border/60 transition hover:bg-muted/40"
                >
                  <td className="py-3 pr-4 font-medium text-foreground">
                    #{session.id}
                  </td>

                  <td className="py-3 pr-4">
                    <StatusBadge status={session.status} />
                  </td>

                  <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                    {formatDateTime(session.startedAt)}
                  </td>

                  <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                    {formatDateTime(session.endedAt)}
                  </td>

                  <td className="py-3 pr-4 whitespace-nowrap">
                    Exercise {session.intendedExerciseCode}
                  </td>

                  <td className="py-3 pr-4 whitespace-nowrap">
                    {session.detectedExerciseCode
                      ? `Exercise ${session.detectedExerciseCode}`
                      : "—"}
                  </td>

                  <td className="py-3 pr-4 whitespace-nowrap">
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

                  <td className="py-3 pr-4 whitespace-nowrap">
                    {typeof session.durationSeconds === "number"
                      ? `${round(session.durationSeconds, 1)} s`
                      : "—"}
                  </td>

                  <td className="py-3 pr-4">
                    <div className="min-w-[130px]">
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Exercise</span>
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
                    </div>
                  </td>

                  <td className="py-3 text-right">
                    <Link
                      to="/sessions/$sessionId"
                      params={{ sessionId: String(session.id) }}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-muted"
                    >
                      View
                      <ChevronRight className="h-4 w-4" />
                    </Link>
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

function StatusBadge({ status }: { status: string }) {
  // Afiseaza statusul sesiunii cu o culoare relevanta
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
