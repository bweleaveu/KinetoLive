// Pagina pentru biblioteca de exercitii KinetoLive
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Info,
  PlayCircle,
  RefreshCcw,
  Radio,
} from "lucide-react";

import { SectionCard, StatCard } from "@/components/StatCard";
import { api, EXERCISE_FALLBACK, type Exercise } from "@/lib/api";

export const Route = createFileRoute("/exercises")({
  head: () => ({ meta: [{ title: "Exercises — KinetoLive" }] }),
  component: ExercisesPage,
});

const SELECTED_EXERCISE_KEY = "kinetolive:selectedExercise";

function ExercisesPage() {
  const navigate = useNavigate();

  const [exercises, setExercises] = useState<Exercise[]>(EXERCISE_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadExercises() {
    // Incarca exercitiile din backend-ul Spring Boot
    setLoading(true);
    setError(null);

    try {
      const result = await api.exercises();

      if (result.length > 0) {
        setExercises(result);
      } else {
        setExercises(EXERCISE_FALLBACK);
      }
    } catch (caughtError) {
      setError((caughtError as Error).message);
      setExercises(EXERCISE_FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExercises();
  }, []);

  const activeExercises = useMemo(() => {
    // Pastreaza doar exercitiile active si le ordoneaza dupa cod
    return exercises
      .filter((exercise) => exercise.active !== false)
      .sort((a, b) => a.exerciseCode - b.exerciseCode);
  }, [exercises]);

  function startLiveSession(exerciseCode: number) {
    // Salveaza exercitiul ales si deschide pagina Live Session
    sessionStorage.setItem(SELECTED_EXERCISE_KEY, String(exerciseCode));

    navigate({
      to: "/live-session",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Rehabilitation Exercises
          </h1>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Exercises used by KinetoLive for live BNO055 monitoring, repetition
            segmentation and ML-based execution quality analysis.
          </p>
        </div>

        <button
          onClick={loadExercises}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card-soft border-amber/30 bg-[color:var(--amber)]/5 p-4 text-sm text-[color:var(--amber)]">
          Could not load exercises from Spring Boot: {error}. Showing local
          fallback exercises.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Available exercises"
          value={activeExercises.length}
          hint="Exercise 6, 7 and 8"
          icon={Dumbbell}
          tone="primary"
        />

        <StatCard
          label="Sensor stream"
          value="25 Hz"
          hint="BNO055 + ESP32"
          icon={Radio}
          tone="cyan"
        />

        <StatCard
          label="ML input"
          value="6 axes"
          hint="accX, accY, accZ, gyrX, gyrY, gyrZ"
          icon={Activity}
          tone="mint"
        />
      </div>

      <SectionCard
        title="Exercise library"
        subtitle="Choose an exercise and start a live monitoring session"
      >
        {loading ? (
          <div className="grid min-h-[260px] place-items-center text-sm text-muted-foreground">
            Loading exercises...
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            {activeExercises.map((exercise) => (
              <article
                key={exercise.exerciseCode}
                className="flex flex-col rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      Exercise {exercise.exerciseCode}
                    </div>

                    <h2 className="mt-3 text-lg font-semibold text-foreground">
                      {exercise.name}
                    </h2>
                  </div>

                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                </div>

                <div className="min-h-[150px] rounded-xl border border-border bg-muted/25 p-3">
                  <p className="max-h-[135px] overflow-y-auto pr-1 text-sm leading-6 text-muted-foreground">
                    {exercise.description}
                  </p>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                  <ExerciseInfoRow
                    icon={CheckCircle2}
                    label="Used for"
                    value="Exercise detection and quality classification"
                  />

                  <ExerciseInfoRow
                    icon={Info}
                    label="Signal"
                    value="Accelerometer and gyroscope features"
                  />
                </div>

                <button
                  onClick={() => startLiveSession(exercise.exerciseCode)}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  <PlayCircle className="h-4 w-4" />
                  Start live session
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="KinetoLive workflow"
        subtitle="How the selected exercise is processed by the platform"
      >
        <div className="grid gap-4 md:grid-cols-4">
          <WorkflowStep
            number="1"
            title="Start session"
            text="The selected exercise is sent to the Spring Boot backend."
          />

          <WorkflowStep
            number="2"
            title="Stream data"
            text="BNO055 samples are transmitted live through WebSocket."
          />

          <WorkflowStep
            number="3"
            title="Analyze signal"
            text="The Python ML service segments repetitions and classifies the execution."
          />

          <WorkflowStep
            number="4"
            title="Save results"
            text="The final session and repetition results are saved in PostgreSQL."
          />
        </div>
      </SectionCard>
    </div>
  );
}

function ExerciseInfoRow({
                           icon: Icon,
                           label,
                           value,
                         }: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  // Afiseaza o informatie scurta despre exercitiu
  return (
    <div className="flex items-start gap-2 rounded-xl bg-muted/30 p-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

      <div>
        <div className="font-semibold text-foreground">{label}</div>
        <div>{value}</div>
      </div>
    </div>
  );
}

function WorkflowStep({
                        number,
                        title,
                        text,
                      }: {
  number: string;
  title: string;
  text: string;
}) {
  // Afiseaza un pas din fluxul aplicatiei KinetoLive
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {number}
      </div>

      <div className="font-semibold text-foreground">{title}</div>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}