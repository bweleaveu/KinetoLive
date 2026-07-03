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

// Import hook pentru limba aplicatiei
import { useAppLanguage } from "@/hooks/useAppLanguage";

import { api, EXERCISE_FALLBACK, type Exercise } from "@/lib/api";

export const Route = createFileRoute("/exercises")({
  head: () => ({ meta: [{ title: "KinetoLive" }] }),
  component: ExercisesPage,
});

const SELECTED_EXERCISE_KEY = "kinetolive:selectedExercise";

// Texte pentru pagina Exercises in romana si engleza
const EXERCISES_TEXT = {
  ro: {
    pageTitle: "Exercitii de recuperare",
    browserTitle: "Exercitii — KinetoLive",
    pageDescription:
      "Exercitii folosite de KinetoLive pentru monitorizare live BNO055, segmentarea repetarilor si analiza calitatii executiei prin invatare automata.",
    refresh: "Reincarca",
    errorPrefix: "Nu s-au putut incarca exercitiile din Spring Boot:",
    errorSuffix: "Sunt afisate exercitiile locale de rezerva.",
    availableExercises: "Exercitii disponibile",
    exerciseListHint: "Detectie automata + exercitiile 6, 7 si 8",
    autoDetection: "Detectie automata",
    sensorStream: "Flux senzori",
    mlInput: "Date pentru invatare automata",
    axes: "6 axe",
    exerciseLibrary: "Biblioteca de exercitii",
    exerciseLibrarySubtitle:
      "Alege un exercitiu si porneste o sesiune de monitorizare live",
    loadingExercises: "Se incarca exercitiile...",
    exercise: "Exercitiul",
    usedFor: "Folosit pentru",
    usedForValue: "Detectarea exercitiului si clasificarea calitatii",
    signal: "Semnal",
    signalValue: "Caracteristici din accelerometru si giroscop",
    startLiveSession: "Porneste sesiune live",
    workflowTitle: "Flux KinetoLive",
    workflowSubtitle:
      "Cum este procesat exercitiul selectat de platforma",
    workflowStartTitle: "Pornire sesiune",
    workflowStartText:
      "Exercitiul selectat este trimis catre backend-ul Spring Boot.",
    workflowStreamTitle: "Transmitere date",
    workflowStreamText:
      "Esantioanele BNO055 sunt transmise live prin WebSocket.",
    workflowAnalyzeTitle: "Analiza semnal",
    workflowAnalyzeText:
      "Microserviciul Python pentru invatare automata segmenteaza repetarile si clasifica executia.",
    workflowSaveTitle: "Salvare rezultate",
    workflowSaveText:
      "Sesiunea finala si rezultatele repetarilor sunt salvate in PostgreSQL.",
  },
  en: {
    pageTitle: "Rehabilitation Exercises",
    browserTitle: "Exercises — KinetoLive",
    pageDescription:
      "Exercises used by KinetoLive for live BNO055 monitoring, repetition segmentation and machine learning-based execution quality analysis.",
    refresh: "Refresh",
    errorPrefix: "Could not load exercises from Spring Boot:",
    errorSuffix: "Showing local fallback exercises.",
    availableExercises: "Available exercises",
    exerciseListHint: "Automatic detection + exercises 6, 7 and 8",
    autoDetection: "Automatic detection",
    sensorStream: "Sensor stream",
    mlInput: "Machine learning input",
    axes: "6 axes",
    exerciseLibrary: "Exercise library",
    exerciseLibrarySubtitle:
      "Choose an exercise and start a live monitoring session",
    loadingExercises: "Loading exercises...",
    exercise: "Exercise",
    usedFor: "Used for",
    usedForValue: "Exercise detection and quality classification",
    signal: "Signal",
    signalValue: "Accelerometer and gyroscope features",
    startLiveSession: "Start live session",
    workflowTitle: "KinetoLive workflow",
    workflowSubtitle:
      "How the selected exercise is processed by the platform",
    workflowStartTitle: "Start session",
    workflowStartText:
      "The selected exercise is sent to the Spring Boot backend.",
    workflowStreamTitle: "Stream data",
    workflowStreamText:
      "BNO055 samples are transmitted live through WebSocket.",
    workflowAnalyzeTitle: "Analyze signal",
    workflowAnalyzeText:
      "The Python machine learning service segments repetitions and classifies the execution.",
    workflowSaveTitle: "Save results",
    workflowSaveText:
      "The final session and repetition results are saved in PostgreSQL.",
  },
} as const;

function ExercisesPage() {
  const navigate = useNavigate();

  // Citeste limba curenta a aplicatiei
  const { language } = useAppLanguage();

  const text = EXERCISES_TEXT[language];

  useEffect(() => {
    document.title = text.browserTitle;
  }, [text.browserTitle]);

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
            {text.pageTitle}
          </h1>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {text.pageDescription}
          </p>
        </div>

        <button
          onClick={loadExercises}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <RefreshCcw className="h-4 w-4" />
          {text.refresh}
        </button>
      </div>

      {error && (
        <div className="card-soft border-amber/30 bg-[color:var(--amber)]/5 p-4 text-sm text-[color:var(--amber)]">
          {text.errorPrefix} {error}. {text.errorSuffix}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label={text.availableExercises}
          value={activeExercises.length}
          hint={text.exerciseListHint}
          icon={Dumbbell}
          tone="primary"
        />

        <StatCard
          label={text.sensorStream}
          value="25 Hz"
          hint="BNO055 + ESP32"
          icon={Radio}
          tone="cyan"
        />

        <StatCard
          label={text.mlInput}
          value={text.axes}
          hint="accX, accY, accZ, gyrX, gyrY, gyrZ"
          icon={Activity}
          tone="mint"
        />
      </div>

      <SectionCard
        title={text.exerciseLibrary}
        subtitle={text.exerciseLibrarySubtitle}
      >
        {loading ? (
          <div className="grid min-h-[260px] place-items-center text-sm text-muted-foreground">
            {text.loadingExercises}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-2">
            {/* Afiseaza cardurile exercitiilor cu nume si descriere in functie de limba */}
            {activeExercises.map((exercise) => {
              const isAutomaticDetection = exercise.exerciseCode === 0;

              const exerciseName = isAutomaticDetection
                ? language === "ro"
                  ? exercise.nameRo || exercise.nameEn || text.autoDetection
                  : exercise.nameEn || exercise.nameRo || text.autoDetection
                : language === "ro"
                  ? exercise.nameRo || exercise.nameEn || `Exercitiul ${exercise.exerciseCode}`
                  : exercise.nameEn || exercise.nameRo || `Exercise ${exercise.exerciseCode}`;

              const exerciseDescription =
                language === "ro"
                  ? exercise.descriptionRo || exercise.descriptionEn || ""
                  : exercise.descriptionEn || exercise.descriptionRo || "";

              const exerciseLabel = isAutomaticDetection
                ? text.autoDetection
                : language === "ro"
                  ? `Exercitiul ${exercise.exerciseCode}`
                  : `Exercise ${exercise.exerciseCode}`;

              return (
                <article
                  key={exercise.exerciseCode}
                  className="flex flex-col rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {exerciseLabel}
                      </div>

                      <h2 className="mt-3 text-lg font-semibold text-foreground">
                        {exerciseName}
                      </h2>
                    </div>

                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Dumbbell className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="min-h-[150px] rounded-xl border border-border bg-muted/25 p-3">
                    <p className="max-h-[135px] overflow-y-auto pr-1 text-sm leading-6 text-muted-foreground">
                      {exerciseDescription}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                    <ExerciseInfoRow
                      icon={CheckCircle2}
                      label={text.usedFor}
                      value={text.usedForValue}
                    />

                    <ExerciseInfoRow
                      icon={Info}
                      label={text.signal}
                      value={text.signalValue}
                    />
                  </div>

                  <button
                    onClick={() => startLiveSession(exercise.exerciseCode)}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {text.startLiveSession}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={text.workflowTitle}
        subtitle={text.workflowSubtitle}
      >
        <div className="grid gap-4 md:grid-cols-4">
          <WorkflowStep
            number="1"
            title={text.workflowStartTitle}
            text={text.workflowStartText}
          />

          <WorkflowStep
            number="2"
            title={text.workflowStreamTitle}
            text={text.workflowStreamText}
          />

          <WorkflowStep
            number="3"
            title={text.workflowAnalyzeTitle}
            text={text.workflowAnalyzeText}
          />

          <WorkflowStep
            number="4"
            title={text.workflowSaveTitle}
            text={text.workflowSaveText}
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
