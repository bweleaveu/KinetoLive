// Pagina pentru monitorizarea live a unei sesiuni KinetoLive
import { createFileRoute } from "@tanstack/react-router";
import { type ComponentType, type ReactElement, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleStop,
  Dumbbell,
  Play,
  Radio,
  Save,
  Send,
  Trash2,
  Wifi,
} from "lucide-react";
import {
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
  EXERCISE_FALLBACK,
  qualityBadgeClass,
  type Exercise,
  type MLAnalysisResult,
  type SensorSample,
} from "@/lib/api";
import { useSensorWebSocket } from "@/hooks/useSensorWebSocket";

export const Route = createFileRoute("/live-session")({
  head: () => ({ meta: [{ title: "Live Session — KinetoLive" }] }),
  component: LiveSessionPage,
});

// Frecventa de esantionare folosita de sistemul KinetoLive
const SAMPLE_RATE_HZ = 25;

const PATIENT_ID = 1;
const SELECTED_EXERCISE_KEY = "kinetolive:selectedExercise";

function LiveSessionPage() {
  const [exercises, setExercises] = useState<Exercise[]>(EXERCISE_FALLBACK);
  const [intended, setIntended] = useState<number>(() => {
    // Citeste exercitiul ales anterior din pagina Exercises
    const storedExercise = sessionStorage.getItem(SELECTED_EXERCISE_KEY);
    const parsedExercise = Number(storedExercise);

    return Number.isFinite(parsedExercise) && parsedExercise > 0
      ? parsedExercise
      : 6;
  });

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState<"analyze" | "save" | "clear" | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<MLAnalysisResult | null>(null);

  const ws = useSensorWebSocket(sessionId);

  useEffect(() => {
    // Incarca exercitiile reale din backend
    let active = true;

    async function loadExercises() {
      try {
        const loadedExercises = await api.exercises();

        if (active && loadedExercises.length > 0) {
          setExercises(loadedExercises);
        }
      } catch {
        if (active) {
          setExercises(EXERCISE_FALLBACK);
        }
      }
    }

    loadExercises();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Pastreaza exercitiul selectat pentru navigarea dintre pagini
    sessionStorage.setItem(SELECTED_EXERCISE_KEY, String(intended));
  }, [intended]);

  const selectedExercise = useMemo(() => {
    // Gaseste exercitiul selectat pentru descrierea din pagina
    return (
      exercises.find((exercise) => exercise.exerciseCode === intended) ??
      EXERCISE_FALLBACK.find((exercise) => exercise.exerciseCode === intended) ??
      EXERCISE_FALLBACK[0]
    );
  }, [exercises, intended]);

  const orientationData = useMemo(() => {
    // Pregateste orientarile reale ale senzorului din quaternioni
    return ws.samples.map((sample) => ({
      time: sample.timeSeconds ?? round(sample.sampleIndex / SAMPLE_RATE_HZ, 2),
      quatW: round(sample.quatW, 4),
      quatX: round(sample.quatX, 4),
      quatY: round(sample.quatY, 4),
      quatZ: round(sample.quatZ, 4),
    }));
  }, [ws.samples]);

  const accelerometerData = useMemo(() => {
    // Pregateste valorile brute ale accelerometrului, exact ca in fisierele plotate in MATLAB
    return ws.samples.map((sample) => ({
      time: sample.timeSeconds ?? round(sample.sampleIndex / SAMPLE_RATE_HZ, 2),
      accX: round(sample.accX, 4),
      accY: round(sample.accY, 4),
      accZ: round(sample.accZ, 4),
    }));
  }, [ws.samples]);

  const gyroscopeData = useMemo(() => {
    // Pregateste valorile brute ale giroscopului, exact ca in fisierele plotate in MATLAB
    return ws.samples.map((sample) => ({
      time: sample.timeSeconds ?? round(sample.sampleIndex / SAMPLE_RATE_HZ, 2),
      gyrX: round(sample.gyrX, 4),
      gyrY: round(sample.gyrY, 4),
      gyrZ: round(sample.gyrZ, 4),
    }));
  }, [ws.samples]);

  const lastSample = ws.samples[ws.samples.length - 1] ?? null;

  const startSession = async () => {
    // Porneste o sesiune noua pentru pacientul de test
    setStarting(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    setSimulating(false);
    ws.reset();

    try {
      const session = await api.startSession(PATIENT_ID, intended);
      setSessionId(session.id);
      setSuccess(`Session #${session.id} was started for Exercise ${intended}.`);
    } catch (caughtError) {
      setError(`Could not start session: ${(caughtError as Error).message}`);
    } finally {
      setStarting(false);
    }
  };

  const endSession = () => {
    // Opreste sesiunea live fara analiza
    ws.stopSimulator();
    setSimulating(false);
    setSessionId(null);
    ws.reset();
    setResult(null);
    setSuccess(null);
    setError(null);
  };

  const startSimulator = () => {
    // Porneste simulatorul de date BNO055
    setError(null);
    setSuccess(null);
    ws.startSimulator();
    setSimulating(true);
  };

  const stopSimulator = () => {
    // Opreste simulatorul de date BNO055
    ws.stopSimulator();
    setSimulating(false);
  };

  const run = async (kind: "analyze" | "save" | "clear") => {
    // Ruleaza actiunile principale pentru sesiunea live
    if (!sessionId) {
      return;
    }

    setBusy(kind);
    setError(null);
    setSuccess(null);

    try {
      if (kind === "analyze") {
        ws.stopSimulator();
        setSimulating(false);

        const analysisResult = await api.analyze(sessionId);
        setResult(analysisResult);
        setSuccess("ML analysis was completed.");
        return;
      }

      if (kind === "save") {
        ws.stopSimulator();
        setSimulating(false);

        const saveResponse = await api.analyzeAndSaveFull(sessionId);

        setResult(saveResponse.mlResult);
        setSuccess(saveResponse.message);
        return;
      }

      await api.clearBuffer(sessionId);
      ws.stopSimulator();
      setSimulating(false);
      ws.reset();
      setResult(null);
      setSuccess("Live buffer was cleared.");
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const canSendLiveData = Boolean(sessionId) && ws.status === "open";

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Live Session
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Start a rehabilitation session, stream BNO055 samples through
            WebSocket and analyze the complete movement signal.
          </p>
        </div>

        <ConnectionBadge status={ws.status} />
      </div>

      {error && (
        <div className="card-soft border-rose/30 bg-[color:var(--rose)]/5 p-4 text-sm text-[color:var(--rose)]">
          {error}
        </div>
      )}

      {success && (
        <div className="card-soft border-mint/30 bg-[color:var(--mint)]/5 p-4 text-sm text-[color:var(--mint)]">
          {success}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[310px_minmax(0,1fr)] xl:items-start">
        <LiveControlsPanel
          intended={intended}
          exercises={exercises}
          selectedExercise={selectedExercise}
          sessionId={sessionId}
          wsStatus={ws.status}
          sampleCount={ws.count}
          starting={starting}
          busy={busy}
          simulating={simulating}
          canSendLiveData={canSendLiveData}
          onExerciseChange={(exerciseCode) => {
            setIntended(exerciseCode);
            setResult(null);
            setSuccess(null);
          }}
          onStartSession={startSession}
          onEndSession={endSession}
          onStartSimulator={startSimulator}
          onStopSimulator={stopSimulator}
          onAnalyze={() => run("analyze")}
          onSave={() => run("save")}
          onClear={() => run("clear")}
        />

        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Current session"
              value={sessionId ? `#${sessionId}` : "Not started"}
              hint="Created by Spring Boot"
              icon={Radio}
              tone="primary"
            />

            <StatCard
              label="Selected exercise"
              value={`Exercise ${intended}`}
              hint={selectedExercise?.name ?? "Exercise"}
              icon={Dumbbell}
              tone="cyan"
            />

            <StatCard
              label="WebSocket status"
              value={ws.status}
              hint="Spring Boot live stream"
              icon={Wifi}
              tone={ws.status === "open" ? "mint" : "amber"}
            />

            <StatCard
              label="Live samples"
              value={ws.count}
              hint="Buffered by sessionId"
              icon={Activity}
              tone="violet"
            />
          </div>

          <SectionCard
            title="Sensor orientation over time"
            subtitle="Live quaternion values from BNO055: quatW, quatX, quatY and quatZ"
          >
            <LiveChart empty={!orientationData.length} size="large">
              <LineChart data={orientationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="time"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(value) => `${value}s`}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  domain={[-1, 1]}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(value) => `${value}s`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="quatW"
                  name="quatW"
                  stroke="var(--primary)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="quatX"
                  name="quatX"
                  stroke="var(--cyan)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="quatY"
                  name="quatY"
                  stroke="var(--mint)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="quatZ"
                  name="quatZ"
                  stroke="var(--amber)"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </LiveChart>
          </SectionCard>

          <LatestLiveValues sample={lastSample} />

          <div className="grid gap-3 lg:grid-cols-2">
            <SectionCard
              title="Raw accelerometer values"
              subtitle="accX, accY and accZ exactly as received from BNO055"
            >
              <LiveChart empty={!accelerometerData.length}>
                <LineChart data={accelerometerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="time"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickFormatter={(value) => `${value}s`}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(value) => `${value}s`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="accX"
                    name="accX"
                    stroke="var(--primary)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="accY"
                    name="accY"
                    stroke="var(--cyan)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="accZ"
                    name="accZ"
                    stroke="var(--mint)"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </LiveChart>
            </SectionCard>

            <SectionCard
              title="Raw gyroscope values"
              subtitle="gyrX, gyrY and gyrZ exactly as received from BNO055"
            >
              <LiveChart empty={!gyroscopeData.length}>
                <LineChart data={gyroscopeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="time"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickFormatter={(value) => `${value}s`}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(value) => `${value}s`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="gyrX"
                    name="gyrX"
                    stroke="var(--primary)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="gyrY"
                    name="gyrY"
                    stroke="var(--violet)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="gyrZ"
                    name="gyrZ"
                    stroke="var(--amber)"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </LiveChart>
            </SectionCard>
          </div>

          <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <SectionCard title="BNO055 calibration" subtitle="Latest calibration values">
              {lastSample ? (
                <div className="grid grid-cols-2 gap-3">
                  <CalibrationItem label="System" value={lastSample.calSys} />
                  <CalibrationItem label="Accelerometer" value={lastSample.calAcc} />
                  <CalibrationItem label="Gyroscope" value={lastSample.calGyr} />
                  <CalibrationItem label="Magnetometer" value={lastSample.calMag} />
                </div>
              ) : (
                <div className="grid min-h-[160px] place-items-center text-sm text-muted-foreground">
                  No live sample received yet
                </div>
              )}
            </SectionCard>

            <SectionCard title="ML result" subtitle="Exercise and quality prediction">
              {result ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <ResultMetric
                      label="Detected exercise"
                      value={
                        result.detectedExerciseCode
                          ? `Exercise ${result.detectedExerciseCode}`
                          : "—"
                      }
                      icon={Dumbbell}
                    />

                    <ResultMetric
                      label="Repetitions"
                      value={String(result.repetitionCount ?? 0)}
                      icon={BarChart3}
                    />

                    <ResultMetric
                      label="Quality"
                      value={result.qualityName ?? "—"}
                      icon={CheckCircle2}
                      quality={result.qualityName}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <ConfidenceBar
                      label="Exercise confidence"
                      value={result.exerciseConfidence}
                    />

                    <ConfidenceBar
                      label="Quality confidence"
                      value={result.qualityConfidence}
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    {result.message ?? "No ML message available."}
                  </div>
                </div>
              ) : (
                <div className="grid min-h-[190px] place-items-center text-sm text-muted-foreground">
                  Run Analyze or Analyze & save to display the ML result.
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveControlsPanel({
                             intended,
                             exercises,
                             selectedExercise,
                             sessionId,
                             wsStatus,
                             sampleCount,
                             starting,
                             busy,
                             simulating,
                             canSendLiveData,
                             onExerciseChange,
                             onStartSession,
                             onEndSession,
                             onStartSimulator,
                             onStopSimulator,
                             onAnalyze,
                             onSave,
                             onClear,
                           }: {
  intended: number;
  exercises: Exercise[];
  selectedExercise: Exercise;
  sessionId: number | null;
  wsStatus: string;
  sampleCount: number;
  starting: boolean;
  busy: "analyze" | "save" | "clear" | null;
  simulating: boolean;
  canSendLiveData: boolean;
  onExerciseChange: (exerciseCode: number) => void;
  onStartSession: () => void;
  onEndSession: () => void;
  onStartSimulator: () => void;
  onStopSimulator: () => void;
  onAnalyze: () => void;
  onSave: () => void;
  onClear: () => void;
}) {
  // Panou de control asezat normal in layout, nu peste grafice
  return (
    <aside className="xl:sticky xl:top-24 xl:self-start">
      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live controls
        </div>

        <div className="mt-2 text-xl font-semibold text-foreground">
          Exercise {intended}
        </div>

        <p className="mt-2 max-h-[74px] overflow-hidden text-sm leading-6 text-muted-foreground">
          {selectedExercise?.description}
        </p>

        <label className="mt-4 block text-sm font-medium text-foreground">
          Intended exercise
        </label>

        <select
          value={intended}
          onChange={(event) => onExerciseChange(Number(event.target.value))}
          disabled={Boolean(sessionId)}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exercises
            .filter((exercise) => exercise.active !== false)
            .map((exercise) => (
              <option key={exercise.exerciseCode} value={exercise.exerciseCode}>
                Exercise {exercise.exerciseCode}
              </option>
            ))}
        </select>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <InfoPill label="Session" value={sessionId ? `#${sessionId}` : "No session"} />
          <InfoPill label="Samples" value={String(sampleCount)} />
          <InfoPill label="WebSocket" value={wsStatus} />
          <InfoPill label="Simulator" value={simulating ? "Running" : "Stopped"} />
        </div>

        <div className="mt-4 grid gap-2">
          <button
            onClick={onStartSession}
            disabled={starting || Boolean(sessionId)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            {starting ? "Starting..." : "Start session"}
          </button>

          <button
            onClick={onEndSession}
            disabled={!sessionId}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CircleStop className="h-4 w-4" />
            End session
          </button>

          <button
            onClick={onStartSimulator}
            disabled={!canSendLiveData || simulating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-mint/30 bg-[color:var(--mint)]/10 px-4 py-3 text-sm font-semibold text-[color:var(--mint)] transition hover:bg-[color:var(--mint)]/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Activity className="h-4 w-4" />
            Start simulator
          </button>

          <button
            onClick={onStopSimulator}
            disabled={!simulating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CircleStop className="h-4 w-4" />
            Stop simulator
          </button>

          <button
            onClick={onAnalyze}
            disabled={!sessionId || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {busy === "analyze" ? "Analyzing..." : "Analyze"}
          </button>

          <button
            onClick={onSave}
            disabled={!sessionId || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan/30 bg-[color:var(--cyan)]/10 px-4 py-3 text-sm font-semibold text-[color:var(--cyan)] transition hover:bg-[color:var(--cyan)]/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy === "save" ? "Saving..." : "Analyze & save"}
          </button>

          <button
            onClick={onClear}
            disabled={!sessionId || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose/30 bg-[color:var(--rose)]/10 px-4 py-3 text-sm font-semibold text-[color:var(--rose)] transition hover:bg-[color:var(--rose)]/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Clear live buffer
          </button>
        </div>
      </div>
    </aside>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  // Afiseaza o informatie scurta in panoul de control
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
      <div className="text-xs font-medium text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ConnectionBadge({ status }: { status: string }) {
  // Afiseaza starea conexiunii WebSocket
  const isOpen = status === "open";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
        isOpen
          ? "border-[color:var(--mint)]/30 bg-[color:var(--mint)]/10 text-[color:var(--mint)]"
          : "border-[color:var(--amber)]/30 bg-[color:var(--amber)]/10 text-[color:var(--amber)]"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isOpen ? "bg-[color:var(--mint)]" : "bg-[color:var(--amber)]"
        }`}
      />
      {isOpen ? "Connected" : status}
    </div>
  );
}

function LatestLiveValues({ sample }: { sample: SensorSample | null }) {
  // Afiseaza ultimele valori live primite de la senzor
  if (!sample) {
    return (
      <SectionCard title="Latest live values" subtitle="Raw values will appear after the first sample">
        <div className="grid min-h-[110px] place-items-center text-sm text-muted-foreground">
          No live sample received yet.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Latest live values"
      subtitle="Current quaternion orientation and raw sensor values"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <LiveValueGroup
          title="Quaternion orientation"
          values={[
            ["quatW", sample.quatW],
            ["quatX", sample.quatX],
            ["quatY", sample.quatY],
            ["quatZ", sample.quatZ],
          ]}
        />

        <LiveValueGroup
          title="Accelerometer"
          values={[
            ["accX", sample.accX],
            ["accY", sample.accY],
            ["accZ", sample.accZ],
          ]}
        />

        <LiveValueGroup
          title="Gyroscope"
          values={[
            ["gyrX", sample.gyrX],
            ["gyrY", sample.gyrY],
            ["gyrZ", sample.gyrZ],
          ]}
        />
      </div>
    </SectionCard>
  );
}

function LiveValueGroup({
                          title,
                          values,
                        }: {
  title: string;
  values: Array<[string, number]>;
}) {
  // Afiseaza un grup de valori numerice live
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {values.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-mono text-sm font-semibold text-foreground">
              {round(value, 4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalibrationItem({ label, value }: { label: string; value: number }) {
  // Afiseaza un nivel de calibrare BNO055
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center gap-3">
        <div className="text-2xl font-semibold text-foreground">{value}/3</div>
        <div className="h-2 flex-1 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${Math.min(value, 3) * 33.33}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ResultMetric({
                        label,
                        value,
                        icon: Icon,
                        quality,
                      }: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  quality?: string | null;
}) {
  // Afiseaza un rezultat ML important
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>

      {quality ? (
        <span
          className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold ${qualityBadgeClass(
            quality,
          )}`}
        >
          {value}
        </span>
      ) : (
        <div className="mt-3 text-lg font-semibold text-foreground">{value}</div>
      )}
    </div>
  );
}

function ConfidenceBar({
                         label,
                         value,
                       }: {
  label: string;
  value?: number | null;
}) {
  // Afiseaza increderea modelului ca bara procentuala
  const percent = toPercent(value);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">
          {percent.toFixed(1)}%
        </span>
      </div>

      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function LiveChart({
                     children,
                     empty,
                     size = "normal",
                   }: {
  children: ReactElement;
  empty: boolean;
  size?: "normal" | "large";
}) {
  // Afiseaza grafic live sau stare goala
  const heightClass = size === "large" ? "h-[190px]" : "h-[155px]";

  if (empty) {
    return (
      <div className={`grid ${heightClass} place-items-center text-sm text-muted-foreground`}>
        Start a session, then press Start simulator to see live movement data.
      </div>
    );
  }

  return (
    <div className={`${heightClass} w-full`}>
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
  // Converteste increderea modelului in procent
  if (typeof value !== "number") {
    return 0;
  }

  if (value > 1) {
    return round(value, 1);
  }

  return round(value * 100, 1);
}

function round(value: number, decimals = 0): number {
  // Rotunjeste o valoare numerica
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}
