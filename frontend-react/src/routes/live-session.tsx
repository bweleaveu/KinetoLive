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
  ShieldCheck,
  Trash2,
  UserRound,
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
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useSelectedPatient } from "@/hooks/useSelectedPatient";
import {
  DOCTOR_SETTINGS_EVENT,
  getDoctorSettings,
  type DoctorSettings,
} from "@/lib/doctorSettings";

export const Route = createFileRoute("/live-session")({
  head: () => ({ meta: [{ title: "Live Session — KinetoLive" }] }),
  component: LiveSessionPage,
});

// Frecventa de esantionare folosita de sistemul KinetoLive
const SAMPLE_RATE_HZ = 25;

const SELECTED_EXERCISE_KEY = "kinetolive:selectedExercise";

// Texte pentru pagina Live Session in romana si engleza
const LIVE_SESSION_TEXT = {
  ro: {
    pageTitle: "Sesiune live",
    pageDescription:
      "Porneste o sesiune de recuperare, transmite esantioane BNO055 prin WebSocket si analizeaza semnalul complet al miscarii.",
    simulatorNotice:
      "Modul simulator este activ. Semnalul afisat este generat artificial pentru testarea interfetei si nu este inregistrat de senzorul BNO055 real.",
    sessionStarted: (sessionId: number, exerciseLabel: string) =>
      `Sesiunea #${sessionId} a fost pornita pentru ${exerciseLabel}.`,
    couldNotStartSession: "Nu s-a putut porni sesiunea:",
    exerciseChanged:
      "Exercitiul sesiunii a fost actualizat. Acum poti rula analiza cu noua selectie.",
    couldNotChangeExercise: "Nu s-a putut schimba exercitiul sesiunii:",
    updatingExercise: "Se actualizeaza exercitiul...",
    mlAnalysisCompleted: "Analiza prin invatare automata a fost finalizata.",
    mlAnalysisSaved: "Analiza prin invatare automata a fost finalizata si salvata.",
    liveBufferCleared: "Bufferul live a fost golit.",
    currentSession: "Sesiune curenta",
    notStarted: "Nepornita",
    readyForLiveMonitoring: "Pregatita pentru monitorizare live",
    selectedExercise: "Exercitiu selectat",
    selectedPatient: "Pacient selectat",
    noPatient: "Niciun pacient",
    noSelectedPatient:
      "Nu exista pacient selectat. Mergi la sectiunea Pacienti si selecteaza sau adauga un pacient.",
    cannotStartWithoutPatient:
      "Nu poti porni sesiunea pana nu selectezi un pacient.",
    exercise: "Exercitiul",
    connectionStatus: "Starea conexiunii",
    liveDataStream: "Flux live de date",
    liveSamples: "Esantioane live",
    bufferedBySessionId: "Buffer pe baza sessionId",
    sensorOrientationTitle: "Orientarea in spatiu",
    sensorOrientationSubtitle:
      "Pozitia senzorului calculata pe baza valorilor quaternion w, x, y si z.",
    rawAccelerometerTitle: "Miscarea bratului",
    rawAccelerometerSubtitle:
      "Acceleratia masurata pe axele X, Y si Z in timpul exercitiului.",
    rawGyroscopeTitle: "Viteza miscarii",
    rawGyroscopeSubtitle:
      "Viteza de rotatie a bratului pe axele X, Y si Z.",
    calibrationTitle: "Calibrare BNO055",
    calibrationSubtitle: "Ultimele valori de calibrare",
    noLiveSample: "Nu a fost primit inca niciun esantion live",
    mlResultTitle: "Rezultat analiza prin invatare automata",
    mlResultSubtitle: "Predictie exercitiu si calitate",
    patientResultTitle: "Interpretarea rezultatului",
    evaluation: "Evaluare",
    detectedQualityType: "Calificativ detectat",
    whatItMeans: "Ce inseamna?",
    whatToDoNext: "Ce trebuie sa faci?",
    detectedExercise: "Exercitiu detectat",
    repetitions: "Repetari",
    quality: "Calificativ",
    exerciseConfidence: "Scor exercitiu",
    qualityConfidence: "Scor calitate",
    evaluatedExercise: "Exercitiu evaluat",
    modelDetectedExercise: "Exercitiu vazut de model",
    qualityModel: "Model calitate",
    repetitionsTable: "Repetari detectate",
    segment: "Segment",
    classificationWindow: "Fereastra clasificare",
    analysisDebug: "Detalii segmentare",
    analysisMode: "Mod analiza",
    selectedByDoctor: "Selectat de doctor",
    automaticDetection: "Detectie automata",
    rawPeaks: "Varfuri detectate",
    rawRepetitions: "Repetari brute",
    activeZone: "Zona activa",
    noMlMessage: "Niciun mesaj de analiza prin invatare automata disponibil.",
    analysisStatusTitle: "Status analiza",
    analysisReadyMessage:
      "Rezultatul a fost generat. Verifica interpretarea si recomandarile de mai sus.",
    runAnalyzeMessage:
      "Ruleaza \"Analizeaza\" sau \"Analizeaza si salveaza\" pentru a afisa rezultatul analizei prin invatare automata.",
    liveControls: "Controale live",
    intendedExercise: "Exercitiu intentionat",
    session: "Sesiune",
    noSession: "Fara sesiune",
    samples: "Esantioane",
    connection: "Conexiune",
    source: "Sursa",
    simulator: "Simulator",
    sensorReady: "Senzor pregatit",
    starting: "Se porneste...",
    startSession: "Porneste sesiunea",
    endSession: "Opreste sesiunea",
    startSimulator: "Porneste simulatorul",
    stopSimulator: "Opreste simulatorul",
    analyzing: "Se analizeaza...",
    analyze: "Analizeaza",
    saving: "Se salveaza...",
    analyzeAndSave: "Analizeaza si salveaza",
    clearLiveBuffer: "Goleste bufferul live",
    simulated: "Simulat",
    liveData: "Date live",
    ready: "Pregatit",
    latestRawValuesPlaceholder:
      "Ultimele valori masurate vor aparea aici dupa primul esantion.",
    spatialOrientation: "Orientare in spatiu",
    armMovement: "Miscarea bratului",
    movementSpeed: "Viteza miscarii",
    quaternion: "Quaternion",
    accelerometer: "Accelerometru",
    gyroscope: "Giroscop",
    magnetometer: "Magnetometru",
    system: "Sistem",
    connected: "Conectat",
    emptyChartMessage:
      "Porneste o sesiune, apoi apasa \"Porneste simulatorul\" sau transmite date reale de la senzor pentru a vedea miscarea bratului in timp real.",
    sensorValuesGuideTitle: "Cum interpretezi valorile?",
    sensorValuesGuideSubtitle:
      "Explicatii simple pentru valorile afisate in grafice",
    spatialOrientationTechnical: "Detalii tehnice: quaternion",
    spatialOrientationText:
      "Arata pozitia senzorului in timpul exercitiului. Valorile w, x, y si z descriu orientarea bratului in spatiu. Nu trebuie urmarita o valoare exacta, ci o miscare controlata si asemanatoare la fiecare repetare.",
    armMovementTechnical: "Detalii tehnice: accelerometru",
    armMovementText:
      "Arata acceleratia bratului. Cand bratul este ridicat sau coborat, valorile se modifica. O executie buna produce o miscare lina, fara smucituri mari.",
    movementSpeedTechnical: "Detalii tehnice: giroscop",
    movementSpeedText:
      "Arata cat de repede se roteste sau se schimba pozitia bratului. Daca miscarea este prea rapida, graficul are varfuri mari si aplicatia poate marca repetarea ca \"Rapid\".",
    exerciseExecutionTitle: "Cum trebuie executat exercitiul?",
    exerciseExecutionTechnical: "Recomandare pentru pacient",
    exerciseExecutionText:
      "Executa miscarea lent, complet si controlat. Evita smuciturile si incearca sa pastrezi acelasi ritm la fiecare repetare. Daca apare \"Rapid\", miscarea a fost prea rapida. Daca apare \"Amplitudine mica\", miscarea nu a fost completa sau bratul nu a fost ridicat suficient.",
    connectionStatusValues: {
      idle: "In asteptare",
      open: "Conectat",
      connecting: "Se conecteaza",
      closed: "Inchis",
    },
    qualityValues: {
      Normal: "Normal",
      Rapid: "Rapid",
      "Small amplitude": "Amplitudine mica",
    },
    qualityFeedback: {
      Normal: {
        title: "Executie corecta",
        evaluation: "Executie buna",
        explanation:
          "Miscarea a fost efectuata controlat, cu amplitudine potrivita pentru exercitiu.",
        recommendation:
          "Continua in acelasi ritm si incearca sa pastrezi miscarea la fel de controlata la fiecare repetare.",
      },
      Rapid: {
        title: "Miscare prea rapida",
        evaluation: "Necesita corectie",
        explanation:
          "Exercitiul a fost executat prea repede. Miscarea brusca poate reduce controlul si poate afecta calitatea repetarii.",
        recommendation:
          "Ridica si coboara bratul mai lent, fara smucituri. Pastreaza un ritm constant si controleaza miscarea pana la final.",
      },
      "Small amplitude": {
        title: "Executie incompleta",
        evaluation: "Necesita corectie",
        explanation:
          "Miscarea pare prea scurta. Bratul nu a fost ridicat suficient sau exercitiul nu a fost dus pana la capat.",
        recommendation:
          "Incearca sa faci miscarea completa. Ridica bratul mai mult, lent si controlat, pana ajungi aproape de pozitia indicata pentru exercitiu.",
      },
      unknown: {
        title: "Rezultat neclar",
        evaluation: "Verifica executia",
        explanation:
          "Aplicatia nu a putut interpreta clar calitatea executiei pentru aceasta sesiune.",
        recommendation:
          "Repeta exercitiul lent si controlat, apoi ruleaza din nou analiza.",
      },
    },
    sessionStoppedMessage: (sessionId: number) =>
      `Sesiunea #${sessionId} a fost oprita. Acum poti rula analiza.`,
    couldNotStopDevice: "Nu s-a putut opri transmiterea ESP32:",
    noSessionForAnalysis: "Nu exista o sesiune pentru analiza.",
  },
  en: {
    pageTitle: "Live Session",
    pageDescription:
      "Start a rehabilitation session, stream BNO055 samples through WebSocket and analyze the complete movement signal.",
    simulatorNotice:
      "Simulator mode is active. The displayed signal is generated artificially for interface testing and is not recorded from the real BNO055 sensor.",
    sessionStarted: (sessionId: number, exerciseLabel: string) =>
      `Session #${sessionId} was started for ${exerciseLabel}.`,
    couldNotStartSession: "Could not start session:",
    exerciseChanged:
      "The session exercise was updated. You can now run the analysis with the new selection.",
    couldNotChangeExercise: "Could not change the session exercise:",
    updatingExercise: "Updating exercise...",
    mlAnalysisCompleted: "Machine learning analysis was completed.",
    mlAnalysisSaved: "Machine learning analysis was completed and saved.",
    liveBufferCleared: "Live buffer was cleared.",
    currentSession: "Current session",
    notStarted: "Not started",
    readyForLiveMonitoring: "Ready for live monitoring",
    selectedExercise: "Selected exercise",
    selectedPatient: "Selected patient",
    noPatient: "No patient",
    noSelectedPatient:
      "No patient selected. Go to Patients and select or add a patient.",
    cannotStartWithoutPatient:
      "You cannot start the session until you select a patient.",
    exercise: "Exercise",
    connectionStatus: "Connection status",
    liveDataStream: "Live data stream",
    liveSamples: "Live samples",
    bufferedBySessionId: "Buffered by sessionId",
    sensorOrientationTitle: "Spatial orientation",
    sensorOrientationSubtitle:
      "Sensor position calculated from quaternion values w, x, y and z.",
    rawAccelerometerTitle: "Arm movement",
    rawAccelerometerSubtitle:
      "Acceleration measured on the X, Y and Z axes during the exercise.",
    rawGyroscopeTitle: "Movement speed",
    rawGyroscopeSubtitle:
      "Arm rotation speed on the X, Y and Z axes.",
    calibrationTitle: "BNO055 calibration",
    calibrationSubtitle: "Latest calibration values",
    noLiveSample: "No live sample received yet",
    mlResultTitle: "Machine learning result",
    mlResultSubtitle: "Exercise and quality prediction",
    patientResultTitle: "Patient result interpretation",
    evaluation: "Evaluation",
    detectedQualityType: "Detected rating",
    whatItMeans: "What it means",
    whatToDoNext: "What to do next",
    detectedExercise: "Detected exercise",
    repetitions: "Repetitions",
    quality: "Execution rating",
    exerciseConfidence: "Exercise confidence",
    qualityConfidence: "Quality confidence",
    evaluatedExercise: "Evaluated exercise",
    modelDetectedExercise: "Model-detected exercise",
    qualityModel: "Quality model",
    repetitionsTable: "Detected repetitions",
    segment: "Segment",
    classificationWindow: "Classification window",
    analysisDebug: "Segmentation details",
    analysisMode: "Analysis mode",
    selectedByDoctor: "Selected by doctor",
    automaticDetection: "Automatic detection",
    rawPeaks: "Detected peaks",
    rawRepetitions: "Raw repetitions",
    activeZone: "Active zone",
    noMlMessage: "No machine learning analysis message available.",
    analysisStatusTitle: "Analysis status",
    analysisReadyMessage:
      "The result has been generated. Check the interpretation and recommendations above.",
    runAnalyzeMessage:
      "Run \"Analyze\" or \"Analyze & save\" to display the Machine learning result.",
    liveControls: "Live controls",
    intendedExercise: "Intended exercise",
    session: "Session",
    noSession: "No session",
    samples: "Samples",
    connection: "Connection",
    source: "Source",
    simulator: "Simulator",
    sensorReady: "Sensor ready",
    starting: "Starting...",
    startSession: "Start session",
    endSession: "End session",
    startSimulator: "Start simulator",
    stopSimulator: "Stop simulator",
    analyzing: "Analyzing...",
    analyze: "Analyze",
    saving: "Saving...",
    analyzeAndSave: "Analyze & save",
    clearLiveBuffer: "Clear live buffer",
    simulated: "Simulated",
    liveData: "Live data",
    ready: "Ready",
    latestRawValuesPlaceholder:
      "Latest measured values will appear here after the first sample.",
    spatialOrientation: "Spatial orientation",
    armMovement: "Arm movement",
    movementSpeed: "Movement speed",
    quaternion: "Quaternion",
    accelerometer: "Accelerometer",
    gyroscope: "Gyroscope",
    magnetometer: "Magnetometer",
    system: "System",
    connected: "Connected",
    emptyChartMessage:
      "Start a session, then press \"Start simulator\" or stream real sensor data to see the arm movement in real time.",
    sensorValuesGuideTitle: "How to read the values",
    sensorValuesGuideSubtitle:
      "Simple explanations for the values displayed in the charts",
    spatialOrientationTechnical: "Technical detail: quaternion",
    spatialOrientationText:
      "Shows the sensor position during the exercise. The w, x, y and z values describe the arm orientation in space. The patient does not need to follow an exact value, but should perform a controlled movement that looks similar across repetitions.",
    armMovementTechnical: "Technical detail: accelerometer",
    armMovementText:
      "Shows the acceleration of the arm. When the arm is raised or lowered, the values change. A good execution produces a smooth movement, without sudden jerks.",
    movementSpeedTechnical: "Technical detail: gyroscope",
    movementSpeedText:
      "Shows how fast the arm rotates or changes position. If the movement is too fast, the chart shows large peaks and the application may classify the repetition as \"Rapid\".",
    exerciseExecutionTitle: "How should the exercise be performed?",
    exerciseExecutionTechnical: "Patient recommendation",
    exerciseExecutionText:
      "Perform the movement slowly, completely and in a controlled way. Avoid sudden jerks and try to keep the same rhythm for each repetition. If the result shows \"Rapid\", the movement was too fast. If it shows \"Small amplitude\", the movement was not complete or the arm was not raised enough.",
    connectionStatusValues: {
      idle: "Idle",
      open: "Connected",
      connecting: "Connecting",
      closed: "Closed",
    },
    qualityValues: {
      Normal: "Normal",
      Rapid: "Rapid",
      "Small amplitude": "Small amplitude",
    },
    qualityFeedback: {
      Normal: {
        title: "Correct execution",
        evaluation: "Good execution",
        explanation:
          "The movement was performed in a controlled way, with a proper range of motion for the exercise.",
        recommendation:
          "Continue with the same rhythm and try to keep the movement controlled during each repetition.",
      },
      Rapid: {
        title: "Movement too fast",
        evaluation: "Needs correction",
        explanation:
          "The exercise was performed too quickly. A sudden movement can reduce control and affect repetition quality.",
        recommendation:
          "Raise and lower the arm more slowly, without sudden jerks. Keep a steady rhythm and control the movement until the end.",
      },
      "Small amplitude": {
        title: "Incomplete execution",
        evaluation: "Needs correction",
        explanation:
          "The movement appears too short. The arm was not raised enough or the exercise was not completed fully.",
        recommendation:
          "Try to perform the full movement. Raise the arm more, slowly and in a controlled way, until you are close to the indicated exercise position.",
      },
      unknown: {
        title: "Unclear result",
        evaluation: "Check execution",
        explanation:
          "The application could not clearly interpret the execution quality for this session.",
        recommendation:
          "Repeat the exercise slowly and in a controlled way, then run the analysis again.",
      },
    },
    sessionStoppedMessage: (sessionId: number) =>
      `Session #${sessionId} was stopped. You can now run the analysis.`,
    couldNotStopDevice: "Could not stop ESP32 streaming:",
    noSessionForAnalysis: "There is no session available for analysis.",
  },
} as const;

type LiveSessionText = (typeof LIVE_SESSION_TEXT)[keyof typeof LIVE_SESSION_TEXT];


function LiveSessionPage() {
  const { language } = useAppLanguage();
  const text = LIVE_SESSION_TEXT[language];
  const {
    selectedPatient,
    selectedPatientId,
    loading: patientLoading,
  } = useSelectedPatient();

  const [exercises, setExercises] = useState<Exercise[]>(EXERCISE_FALLBACK);
  const [doctorSettings, setDoctorSettings] = useState<DoctorSettings>(() =>
    getDoctorSettings(),
  );

  const [intended, setIntended] = useState<number>(() => {
    // Citeste exercitiul ales anterior sau exercitiul implicit din setarile doctorului
    const storedExercise = sessionStorage.getItem(SELECTED_EXERCISE_KEY);
    const parsedExercise = Number(storedExercise);

    if (Number.isFinite(parsedExercise) && parsedExercise >= 0) {
      return parsedExercise;
    }

    const defaultExerciseCode = getDoctorSettings().defaultExerciseCode;

    return [0, 6, 7, 8].includes(defaultExerciseCode)
      ? defaultExerciseCode
      : 0;
  });

  const [sessionId, setSessionId] = useState<number | null>(null);

  // Arata daca sesiunea curenta a fost oprita si poate fi analizata
  const [sessionStopped, setSessionStopped] = useState(false);

  const [starting, setStarting] = useState(false);
  const [changingExercise, setChangingExercise] = useState(false);
  const [busy, setBusy] = useState<"analyze" | "save" | "clear" | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pastreaza tipul mesajului de succes pentru a se retraduce cand se schimba limba
  type SuccessMessageType =
    | "mlAnalysisCompleted"
    | "mlAnalysisSaved"
    | null;

  const [successMessageType, setSuccessMessageType] =
    useState<SuccessMessageType>(null);

  const [result, setResult] = useState<MLAnalysisResult | null>(null);

  const ws = useSensorWebSocket(sessionId);

  useEffect(() => {
    // Tine pagina Live Session sincronizata cu preferintele locale ale doctorului
    const reloadDoctorSettings = () => {
      setDoctorSettings(getDoctorSettings());
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "kinetolive:doctor-settings") {
        reloadDoctorSettings();
      }
    };

    window.addEventListener(DOCTOR_SETTINGS_EVENT, reloadDoctorSettings);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(DOCTOR_SETTINGS_EVENT, reloadDoctorSettings);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    // Retraduce mesajul de succes cand se schimba limba
    if (successMessageType === "mlAnalysisCompleted") {
      setSuccess(text.mlAnalysisCompleted);
    }

    if (successMessageType === "mlAnalysisSaved") {
      setSuccess(text.mlAnalysisSaved);
    }
  }, [language, successMessageType]);

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

  const selectedExerciseName = useMemo(() => {
    // Alege numele exercitiului in functie de limba selectata
    return language === "ro"
      ? selectedExercise.nameRo ||
      selectedExercise.nameEn ||
      `Exercitiul ${selectedExercise.exerciseCode}`
      : selectedExercise.nameEn ||
      selectedExercise.nameRo ||
      `Exercise ${selectedExercise.exerciseCode}`;
  }, [language, selectedExercise]);

  const selectedExerciseDescription = useMemo(() => {
    // Alege descrierea exercitiului in functie de limba selectata
    return language === "ro"
      ? selectedExercise.descriptionRo || selectedExercise.descriptionEn || ""
      : selectedExercise.descriptionEn || selectedExercise.descriptionRo || "";
  }, [language, selectedExercise]);

  const selectedExerciseDisplayName = selectedExerciseName || `${text.exercise} ${intended}`;

  const connectionStatusLabel = formatConnectionStatus(
    ws.status,
    text.connectionStatusValues,
  );

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
    // Pregateste valorile brute ale accelerometrului
    return ws.samples.map((sample) => ({
      time: sample.timeSeconds ?? round(sample.sampleIndex / SAMPLE_RATE_HZ, 2),
      accX: round(sample.accX, 4),
      accY: round(sample.accY, 4),
      accZ: round(sample.accZ, 4),
    }));
  }, [ws.samples]);

  const gyroscopeData = useMemo(() => {
    // Pregateste valorile brute ale giroscopului
    return ws.samples.map((sample) => ({
      time: sample.timeSeconds ?? round(sample.sampleIndex / SAMPLE_RATE_HZ, 2),
      gyrX: round(sample.gyrX, 4),
      gyrY: round(sample.gyrY, 4),
      gyrZ: round(sample.gyrZ, 4),
    }));
  }, [ws.samples]);

  const lastSample = ws.samples[ws.samples.length - 1] ?? null;
  const hasLiveData = ws.samples.length > 0;

  // Schimba exercitiul local sau actualizeaza sesiunea oprita in backend.
  const changeIntendedExercise = async (exerciseCode: number) => {
    if (exerciseCode === intended || changingExercise) {
      return;
    }

    setError(null);
    setSuccessMessageType(null);
    setSuccess(null);
    setResult(null);

    if (!sessionId) {
      setIntended(exerciseCode);
      return;
    }

    if (!sessionStopped) {
      return;
    }

    setChangingExercise(true);

    try {
      const updatedSession = await api.updateSessionIntendedExercise(
        sessionId,
        exerciseCode,
      );

      setIntended(updatedSession.intendedExerciseCode ?? exerciseCode);
      setSuccess(text.exerciseChanged);
    } catch (caughtError) {
      setError(`${text.couldNotChangeExercise} ${(caughtError as Error).message}`);
    } finally {
      setChangingExercise(false);
    }
  };

  // Porneste o sesiune noua si anunta backend-ul ca ESP32 trebuie sa transmita automat
  const startSession = async () => {
    if (!selectedPatientId) {
      setError(text.cannotStartWithoutPatient);
      return;
    }

    setStarting(true);
    setError(null);
    setSuccessMessageType(null);
    setSuccess(null);
    setResult(null);
    setSimulating(false);
    setSessionStopped(false);
    ws.reset();

    try {
      await api.stopDeviceStreaming();

      const session = await api.startSession(selectedPatientId, intended);

      setSessionId(session.id);

      await api.startDeviceStreaming(session.id);

      // Mesaj simplu, fara retraducere automata
      setSuccessMessageType(null);
      setSuccess(text.sessionStarted(session.id, selectedExerciseDisplayName));
    } catch (caughtError) {
      setError(`${text.couldNotStartSession} ${(caughtError as Error).message}`);
    } finally {
      setStarting(false);
    }
  };

  // Opreste transmiterea ESP32, dar pastreaza sessionId pentru analiza
  const endSession = async () => {
    if (!sessionId) {
      return;
    }

    setError(null);
    setSuccessMessageType(null);
    setSuccess(null);

    try {
      await api.stopDeviceStreaming();

      ws.stopSimulator();
      setSimulating(false);
      setSessionStopped(true);

      if (doctorSettings.defaultAnalysisAction === "analyze") {
        await run("analyze");
        return;
      }

      if (doctorSettings.defaultAnalysisAction === "analyzeAndSave") {
        await run("save");
        return;
      }

      // Mesaj simplu, fara retraducere automata
      setSuccessMessageType(null);
      setSuccess(text.sessionStoppedMessage(sessionId));
    } catch (caughtError) {
      setError(`${text.couldNotStopDevice} ${(caughtError as Error).message}`);
    }
  };

  const startSimulator = () => {
    // Porneste simulatorul de date BNO055
    setError(null);
    setSuccessMessageType(null);
    setSuccess(null);
    ws.startSimulator();
    setSimulating(true);
  };

  const stopSimulator = () => {
    // Opreste simulatorul de date BNO055
    ws.stopSimulator();
    setSimulating(false);
  };

  // Ruleaza analiza, salvarea sau stergerea bufferului pentru sesiunea live
  const run = async (kind: "analyze" | "save" | "clear") => {
    if (!sessionId) {
      setError(text.noSessionForAnalysis);
      return;
    }

    setBusy(kind);
    setError(null);
    setSuccessMessageType(null);
    setSuccess(null);

    try {
      if (kind === "analyze") {
        await api.stopDeviceStreaming();

        ws.stopSimulator();
        setSimulating(false);

        const analysisResult = await api.analyze(sessionId);

        setResult(analysisResult);

        // Afiseaza mesaj tradus pentru analiza finalizata
        setSuccessMessageType("mlAnalysisCompleted");
        setSuccess(text.mlAnalysisCompleted);

        // Dupa analiza, sesiunea ramane oprita si poate fi inlocuita cu una noua
        setSessionStopped(true);

        return;
      }

      if (kind === "save") {
        await api.stopDeviceStreaming();

        ws.stopSimulator();
        setSimulating(false);

        const saveResponse = await api.analyzeAndSaveFull(sessionId);

        setResult(saveResponse.mlResult);

        // Afiseaza mesaj tradus pentru analiza salvata
        setSuccessMessageType("mlAnalysisSaved");
        setSuccess(text.mlAnalysisSaved);

        // Dupa salvare, pregateste interfata pentru o sesiune noua
        setSessionId(null);
        setSessionStopped(false);
        ws.reset();

        return;
      }

      await api.stopDeviceStreaming();
      await api.clearBuffer(sessionId);

      ws.stopSimulator();
      setSimulating(false);
      ws.reset();
      setResult(null);
      // Mesaj simplu, fara retraducere automata
      setSuccessMessageType(null);
      setSuccess(text.liveBufferCleared);
    } catch (caughtError) {
      setError((caughtError as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const canSendLiveData = Boolean(sessionId) && ws.status === "open";

  const resultQualityFeedback = result?.qualityName
    ? getQualityFeedback(result.qualityName, text.qualityFeedback)
    : null;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {text.pageTitle}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {text.pageDescription}
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

      {simulating && (
        <div className="card-soft border-cyan/30 bg-[color:var(--cyan)]/5 p-4 text-sm text-[color:var(--cyan)]">
          {text.simulatorNotice}
        </div>
      )}

      {!patientLoading && !selectedPatientId && (
        <div className="card-soft border-amber/30 bg-[color:var(--amber)]/5 p-4 text-sm text-[color:var(--amber)]">
          {text.noSelectedPatient}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
        <LiveControlsPanel
          intended={intended}
          exercises={exercises}
          selectedExercise={selectedExercise}
          selectedExerciseDisplayName={selectedExerciseDisplayName}
          selectedExerciseDescription={selectedExerciseDescription}
          sessionId={sessionId}

          // Trimite starea de oprire catre panoul de control
          sessionStopped={sessionStopped}
          allowExerciseChangeAfterStop={doctorSettings.allowExerciseChangeAfterStop}

          wsStatus={ws.status}
          sampleCount={ws.count}
          starting={starting}
          changingExercise={changingExercise}
          busy={busy}
          simulating={simulating}
          canSendLiveData={canSendLiveData}
          canStartSession={Boolean(selectedPatientId) && !patientLoading}
          lastSample={lastSample}
          onExerciseChange={changeIntendedExercise}
          onStartSession={startSession}
          onEndSession={endSession}
          onStartSimulator={startSimulator}
          onStopSimulator={stopSimulator}
          onAnalyze={() => run("analyze")}
          onSave={() => run("save")}
          onClear={() => run("clear")}
        />

        <div className="min-w-0 space-y-3">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label={text.currentSession}
                value={sessionId ? `#${sessionId}` : text.notStarted}
                hint={text.readyForLiveMonitoring}
                icon={Radio}
                tone="primary"
              />

              <StatCard
                label={text.selectedExercise}
                value={selectedExerciseDisplayName}
                hint={intended === 0 ? text.automaticDetection : selectedExerciseName}
                icon={Dumbbell}
                tone="cyan"
              />

              <StatCard
                label={text.selectedPatient}
                value={selectedPatient?.fullName ?? text.noPatient}
                hint={selectedPatient ? `ID ${selectedPatient.id}` : text.noSelectedPatient}
                icon={UserRound}
                tone="mint"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard
                label={text.connectionStatus}
                value={connectionStatusLabel}
                hint={text.liveDataStream}
                icon={Wifi}
                tone={ws.status === "open" ? "mint" : "amber"}
              />

              <StatCard
                label={text.liveSamples}
                value={ws.count}
                hint={text.bufferedBySessionId}
                icon={Activity}
                tone="violet"
              />
            </div>
          </div>

          <SectionCard
            title={text.sensorOrientationTitle}
            subtitle={text.sensorOrientationSubtitle}
          >
            <LiveValuesStrip sample={lastSample} />

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
                {/* Tooltip compatibil cu dark mode si labelFormatter */}
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  labelFormatter={(value) => `${value}s`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="quatW" name="quatW" stroke="var(--primary)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="quatX" name="quatX" stroke="var(--cyan)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="quatY" name="quatY" stroke="var(--mint)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="quatZ" name="quatZ" stroke="var(--amber)" dot={false} strokeWidth={2} />
              </LineChart>
            </LiveChart>
          </SectionCard>

          <div className="grid gap-3 lg:grid-cols-2">
            <SectionCard
              title={text.rawAccelerometerTitle}
              subtitle={text.rawAccelerometerSubtitle}
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
                  {/* Tooltip compatibil cu dark mode si labelFormatter */}
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    labelFormatter={(value) => `${value}s`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="accX" name="accX" stroke="var(--primary)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="accY" name="accY" stroke="var(--cyan)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="accZ" name="accZ" stroke="var(--mint)" dot={false} strokeWidth={2} />
                </LineChart>
              </LiveChart>
            </SectionCard>

            <SectionCard
              title={text.rawGyroscopeTitle}
              subtitle={text.rawGyroscopeSubtitle}
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
                  {/* Tooltip compatibil cu dark mode si labelFormatter */}
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    labelFormatter={(value) => `${value}s`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="gyrX" name="gyrX" stroke="var(--primary)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="gyrY" name="gyrY" stroke="var(--violet)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="gyrZ" name="gyrZ" stroke="var(--amber)" dot={false} strokeWidth={2} />
                </LineChart>
              </LiveChart>
            </SectionCard>
          </div>

          <SectionCard
            title={text.sensorValuesGuideTitle}
            subtitle={text.sensorValuesGuideSubtitle}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SensorGuideCard
                icon={Radio}
                title={text.spatialOrientation}
                technicalLabel={text.spatialOrientationTechnical}
                text={text.spatialOrientationText}
              />

              <SensorGuideCard
                icon={Activity}
                title={text.armMovement}
                technicalLabel={text.armMovementTechnical}
                text={text.armMovementText}
              />

              <SensorGuideCard
                icon={BarChart3}
                title={text.movementSpeed}
                technicalLabel={text.movementSpeedTechnical}
                text={text.movementSpeedText}
              />

              <SensorGuideCard
                icon={CheckCircle2}
                title={text.exerciseExecutionTitle}
                technicalLabel={text.exerciseExecutionTechnical}
                text={text.exerciseExecutionText}
              />
            </div>
          </SectionCard>

          <div className="grid gap-3">
            <SectionCard title={text.calibrationTitle} subtitle={text.calibrationSubtitle}>
              {lastSample ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <CalibrationItem label={text.system} value={lastSample.calSys} />
                  <CalibrationItem label={text.accelerometer} value={lastSample.calAcc} />
                  <CalibrationItem label={text.gyroscope} value={lastSample.calGyr} />
                  <CalibrationItem label={text.magnetometer} value={lastSample.calMag} />
                </div>
              ) : (
                <div className="grid min-h-[120px] place-items-center text-sm text-muted-foreground">
                  {text.noLiveSample}
                </div>
              )}
            </SectionCard>

            <SectionCard title={text.mlResultTitle} subtitle={text.mlResultSubtitle}>
              {result ? (
                <div className="space-y-3">
                  {result.qualityName && resultQualityFeedback && (
                    <QualityFeedbackCard
                      title={text.patientResultTitle}
                      quality={result.qualityName}
                      feedback={resultQualityFeedback}
                      evaluationLabel={text.evaluation}
                      detectedQualityTypeLabel={text.detectedQualityType}
                      detectedQualityType={formatQualityName(
                        result.qualityName,
                        text.qualityValues,
                      )}
                      explanationLabel={text.whatItMeans}
                      recommendationLabel={text.whatToDoNext}
                    />
                  )}

                  <div className="grid gap-3 md:grid-cols-3">
                    <ResultMetric
                      label={text.detectedExercise}
                      value={
                        result.detectedExerciseCode
                          ? `${text.exercise} ${result.detectedExerciseCode}`
                          : "—"
                      }
                      icon={Dumbbell}
                    />

                    <ResultMetric
                      label={text.repetitions}
                      value={String(result.repetitionCount ?? 0)}
                      icon={BarChart3}
                    />

                    <ResultMetric
                      label={text.quality}
                      value={
                        resultQualityFeedback?.title ??
                        (result.qualityName
                          ? formatQualityName(result.qualityName, text.qualityValues)
                          : "—")
                      }
                      icon={CheckCircle2}
                      quality={result.qualityName}
                    />
                  </div>

                  {doctorSettings.showConfidenceScores && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <ConfidenceBar label={text.exerciseConfidence} value={result.exerciseConfidence} />
                      <ConfidenceBar label={text.qualityConfidence} value={result.qualityConfidence} />
                    </div>
                  )}

                  <AnalysisModeCard
                    result={result}
                    text={text}
                    showModelDetectedExercise={doctorSettings.showModelDetectedExercise}
                  />

                  {result.repetitions && result.repetitions.length > 0 && (
                    <RepetitionsTable
                      result={result}
                      text={text}
                      settings={doctorSettings}
                    />
                  )}

                  {doctorSettings.showMlDebug && (
                    <SegmentationDebugCard result={result} text={text} />
                  )}

                  <ResultStatusNotice
                    title={text.analysisStatusTitle}
                    message={text.analysisReadyMessage}
                  />
                </div>
              ) : (
                <div className="grid min-h-[170px] place-items-center text-sm text-muted-foreground">
                  {text.runAnalyzeMessage}
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
                             selectedExerciseDisplayName,
                             selectedExerciseDescription,
                             sessionId,

                             // Starea de oprire a sesiunii curente
                             sessionStopped,
                             allowExerciseChangeAfterStop,

                             wsStatus,
                             sampleCount,
                             starting,
                             changingExercise,
                             busy,
                             simulating,
                             canSendLiveData,
                             canStartSession,
                             lastSample,
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
  selectedExerciseDisplayName: string;
  selectedExerciseDescription: string;
  sessionId: number | null;

  // Starea de oprire a sesiunii curente
  sessionStopped: boolean;
  allowExerciseChangeAfterStop: boolean;

  wsStatus: string;
  sampleCount: number;
  starting: boolean;
  changingExercise: boolean;
  busy: "analyze" | "save" | "clear" | null;
  simulating: boolean;
  canSendLiveData: boolean;
  canStartSession: boolean;
  lastSample: SensorSample | null;
  onExerciseChange: (exerciseCode: number) => void | Promise<void>;

  // Tipurile actualizate pentru actiuni care pot fi asincrone
  onStartSession: () => void | Promise<void>;
  onEndSession: () => void | Promise<void>;

  onStartSimulator: () => void;
  onStopSimulator: () => void;
  onAnalyze: () => void;
  onSave: () => void;
  onClear: () => void;
}) {
  // Panou de control cu scroll intern ca butoanele sa ramana accesibile
  const { language } = useAppLanguage();
  const text = LIVE_SESSION_TEXT[language];

  return (
    <aside className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {text.liveControls}
            </div>
            <div className="mt-1 text-xl font-semibold text-foreground">
              {selectedExerciseDisplayName}
            </div>
          </div>

          <SourceBadge simulating={simulating} hasLiveData={sampleCount > 0} />
        </div>

        <p className="mt-3 rounded-xl border border-border bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
          {selectedExerciseDescription}
        </p>

        <label className="mt-4 block text-sm font-medium text-foreground">
          {text.intendedExercise}
        </label>

        <select
          value={intended}
          onChange={(event) => onExerciseChange(Number(event.target.value))}
          disabled={
            (Boolean(sessionId) &&
              (!sessionStopped || !allowExerciseChangeAfterStop)) ||
            changingExercise ||
            starting ||
            Boolean(busy)
          }
          className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exercises
            .filter((exercise) => exercise.active !== false)
            .map((exercise) => {
              const optionName =
                language === "ro"
                  ? exercise.nameRo ||
                  exercise.nameEn ||
                  `${text.exercise} ${exercise.exerciseCode}`
                  : exercise.nameEn ||
                  exercise.nameRo ||
                  `${text.exercise} ${exercise.exerciseCode}`;

              return (
                <option key={exercise.exerciseCode} value={exercise.exerciseCode}>
                  {optionName}
                </option>
              );
            })}
        </select>

        {changingExercise && (
          <p className="mt-2 text-xs text-muted-foreground">
            {text.updatingExercise}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <InfoPill label={text.session} value={sessionId ? `#${sessionId}` : text.noSession} />
          <InfoPill label={text.samples} value={String(sampleCount)} />
          <InfoPill label={text.connection} value={formatConnectionStatus(wsStatus, text.connectionStatusValues)} />
          <InfoPill label={text.source} value={simulating ? text.simulator : text.sensorReady} />
        </div>

        <div className="mt-4 grid gap-2">
          <button
            onClick={onStartSession}

            // Permite pornirea unei sesiuni noi daca sesiunea curenta a fost oprita
            disabled={!canStartSession || starting || changingExercise || (Boolean(sessionId) && !sessionStopped)}

            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            {starting ? text.starting : text.startSession}
          </button>

          <button
            onClick={onEndSession}

            // Opreste doar daca exista sesiune si inca nu este oprita
            disabled={!sessionId || sessionStopped || changingExercise}

            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CircleStop className="h-4 w-4" />
            {text.endSession}
          </button>

          <button
            onClick={onStartSimulator}
            disabled={!canSendLiveData || simulating || changingExercise}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-mint/30 bg-[color:var(--mint)]/10 px-4 py-2.5 text-sm font-semibold text-[color:var(--mint)] transition hover:bg-[color:var(--mint)]/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Activity className="h-4 w-4" />
            {text.startSimulator}
          </button>

          <button
            onClick={onStopSimulator}
            disabled={!simulating || changingExercise}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CircleStop className="h-4 w-4" />
            {text.stopSimulator}
          </button>

          <button
            onClick={onAnalyze}
            disabled={!sessionId || changingExercise || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {busy === "analyze" ? text.analyzing : text.analyze}
          </button>

          <button
            onClick={onSave}
            disabled={!sessionId || changingExercise || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan/30 bg-[color:var(--cyan)]/10 px-4 py-2.5 text-sm font-semibold text-[color:var(--cyan)] transition hover:bg-[color:var(--cyan)]/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy === "save" ? text.saving : text.analyzeAndSave}
          </button>

          <button
            onClick={onClear}
            disabled={!sessionId || changingExercise || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose/30 bg-[color:var(--rose)]/10 px-4 py-2.5 text-sm font-semibold text-[color:var(--rose)] transition hover:bg-[color:var(--rose)]/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {text.clearLiveBuffer}
          </button>
        </div>

      </div>
    </aside>
  );
}

function SourceBadge({ simulating, hasLiveData }: { simulating: boolean; hasLiveData: boolean }) {
  // Afiseaza sursa datelor live
  const { language } = useAppLanguage();
  const text = LIVE_SESSION_TEXT[language];

  if (simulating) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-[color:var(--cyan)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--cyan)]">
        <ShieldCheck className="h-3.5 w-3.5" />
        {text.simulated}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
      <ShieldCheck className="h-3.5 w-3.5" />
      {hasLiveData ? text.liveData : text.ready}
    </span>
  );
}

function LiveValuesStrip({ sample }: { sample: SensorSample | null }) {
  // Afiseaza ultimele valori live langa graficul principal
  const { language } = useAppLanguage();
  const text = LIVE_SESSION_TEXT[language];

  if (!sample) {
    return (
      <div className="mb-3 rounded-2xl border border-border bg-muted/25 p-3 text-sm text-muted-foreground">
        {text.latestRawValuesPlaceholder}
      </div>
    );
  }

  return (
    <div className="mb-3 grid gap-2 md:grid-cols-3">
      <MiniValueRow
        label={text.spatialOrientation}
        value={`w ${round(sample.quatW, 3)} · x ${round(sample.quatX, 3)} · y ${round(sample.quatY, 3)} · z ${round(sample.quatZ, 3)}`}
      />
      <MiniValueRow
        label={text.armMovement}
        value={`x ${round(sample.accX, 3)} · y ${round(sample.accY, 3)} · z ${round(sample.accZ, 3)}`}
      />
      <MiniValueRow
        label={text.movementSpeed}
        value={`x ${round(sample.gyrX, 3)} · y ${round(sample.gyrY, 3)} · z ${round(sample.gyrZ, 3)}`}
      />
    </div>
  );
}

function MiniValueRow({ label, value }: { label: string; value: string }) {
  // Afiseaza un rand compact de valori live
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[11px] font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function SensorGuideCard({
                           icon: Icon,
                           title,
                           technicalLabel,
                           text,
                         }: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  technicalLabel: string;
  text: string;
}) {
  // Afiseaza o explicatie scurta pentru valorile senzorilor
  return (
    <div className="rounded-2xl border border-border bg-muted/25 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>

      <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {technicalLabel}
      </div>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  // Afiseaza o informatie scurta in panoul de control
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
      <div className="truncate text-xs font-medium text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ConnectionBadge({ status }: { status: string }) {
  // Afiseaza starea conexiunii live
  const { language } = useAppLanguage();
  const text = LIVE_SESSION_TEXT[language];
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
      {formatConnectionStatus(status, text.connectionStatusValues)}
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

type QualityFeedback = {
  title: string;
  evaluation: string;
  explanation: string;
  recommendation: string;
};

function QualityFeedbackCard({
                               title,
                               quality,
                               feedback,
                               evaluationLabel,
                               detectedQualityTypeLabel,
                               detectedQualityType,
                               explanationLabel,
                               recommendationLabel,
                             }: {
  title: string;
  quality: string;
  feedback: QualityFeedback;
  evaluationLabel: string;
  detectedQualityTypeLabel: string;
  detectedQualityType: string;
  explanationLabel: string;
  recommendationLabel: string;
}) {
  // Afiseaza rezultatul analizei pe intelesul pacientului
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${qualityPanelClass(quality)}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${qualityIconClass(quality)}`}>
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </div>

            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {feedback.title}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{detectedQualityTypeLabel}</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="font-semibold text-foreground">{detectedQualityType}</span>
            </div>
          </div>
        </div>

        <div className="flex w-fit flex-col gap-1 rounded-2xl border border-border bg-background/70 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {evaluationLabel}
          </span>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${qualityBadgeClass(
              quality,
            )}`}
          >
            {feedback.evaluation}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {explanationLabel}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {feedback.explanation}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {recommendationLabel}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {feedback.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}


function AnalysisModeCard({
                            result,
                            text,
                            showModelDetectedExercise,
                          }: {
  result: MLAnalysisResult;
  text: LiveSessionText;
  showModelDetectedExercise: boolean;
}) {
  // Afiseaza diferenta dintre exercitiul selectat si exercitiul vazut de model
  const modeLabel =
    result.analysisMode === "manual"
      ? text.selectedByDoctor
      : text.automaticDetection;

  return (
    <div
      className={`grid gap-3 ${
        showModelDetectedExercise ? "md:grid-cols-3" : "md:grid-cols-2"
      }`}
    >
      <ResultMetric
        label={text.analysisMode}
        value={modeLabel}
        icon={ShieldCheck}
      />

      <ResultMetric
        label={text.evaluatedExercise}
        value={formatExerciseResult(result.qualityModelExerciseCode, text)}
        icon={Dumbbell}
      />

      {showModelDetectedExercise && (
        <ResultMetric
          label={text.modelDetectedExercise}
          value={formatExerciseResult(result.detectedExerciseCode, text)}
          icon={Activity}
        />
      )}
    </div>
  );
}

function RepetitionsTable({
                            result,
                            text,
                            settings,
                          }: {
  result: MLAnalysisResult;
  text: LiveSessionText;
  settings: DoctorSettings;
}) {
  // Afiseaza fiecare repetare detectata si clasificarea ei
  const repetitions = result.repetitions ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold text-foreground">
          {text.repetitionsTable}
        </div>
        <div className="text-xs text-muted-foreground">
          {text.qualityModel}: {formatExerciseResult(result.qualityModelExerciseCode, text)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">{text.quality}</th>
            {settings.showConfidenceScores && (
              <th className="px-4 py-3">{text.qualityConfidence}</th>
            )}
            <th className="px-4 py-3">{text.evaluatedExercise}</th>
            {settings.showSegments && (
              <>
                <th className="px-4 py-3">{text.segment}</th>
                <th className="px-4 py-3">{text.classificationWindow}</th>
              </>
            )}
            <th className="px-4 py-3">{text.samples}</th>
          </tr>
          </thead>

          <tbody className="divide-y divide-border">
          {repetitions.map((repetition) => {
            const qualityName = repetition.qualityName ?? repetition.predictedQualityName ?? "—";

            return (
              <tr key={repetition.repetitionIndex} className="align-top">
                <td className="px-4 py-3 font-semibold text-foreground">
                  {repetition.repetitionIndex}
                </td>
                <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${qualityBadgeClass(
                        qualityName,
                      )}`}
                    >
                      {formatQualityName(qualityName, text.qualityValues)}
                    </span>
                </td>
                {settings.showConfidenceScores && (
                  <td className="px-4 py-3 text-muted-foreground">
                    {toPercent(repetition.qualityConfidence).toFixed(1)}%
                  </td>
                )}
                <td className="px-4 py-3 text-muted-foreground">
                  <div>
                    {formatExerciseResult(
                      repetition.qualityModelExerciseCode ??
                      result.qualityModelExerciseCode ??
                      repetition.exerciseCode,
                      text,
                    )}
                  </div>
                  {settings.showModelDetectedExercise &&
                    repetition.modelDetectedExerciseCode &&
                    repetition.modelDetectedExerciseCode !==
                    (repetition.qualityModelExerciseCode ?? result.qualityModelExerciseCode) && (
                      <div className="mt-1 text-xs text-muted-foreground/70">
                        {text.modelDetectedExercise}: {formatExerciseResult(
                        repetition.modelDetectedExerciseCode,
                        text,
                      )}
                        {typeof repetition.modelDetectedExerciseConfidence === "number" && (
                          <span className="ml-1">
                              ({toPercent(repetition.modelDetectedExerciseConfidence).toFixed(1)}%)
                            </span>
                        )}
                      </div>
                    )}
                </td>
                {settings.showSegments && (
                  <>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {formatSampleRange(repetition.startSample, repetition.endSample)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {formatSampleRange(
                        repetition.classificationStartSample,
                        repetition.classificationEndSample,
                      )}
                    </td>
                  </>
                )}
                <td className="px-4 py-3 text-muted-foreground">
                  {repetition.sampleCount ?? "—"}
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SegmentationDebugCard({
                                 result,
                                 text,
                               }: {
  result: MLAnalysisResult;
  text: LiveSessionText;
}) {
  // Afiseaza informatii utile pentru reglarea segmentarii
  const segmentation = result.segmentationInformation ?? {};

  if (!result.segmentationInformation) {
    return null;
  }

  const peakCount = getDebugNumber(segmentation, "peakCount");
  const rawRepetitionCount = getDebugNumber(segmentation, "rawRepetitionCount");
  const activeStart = getDebugNumber(segmentation, "activeStartSample");
  const activeEnd = getDebugNumber(segmentation, "activeEndSample");
  const segmentationExerciseCode = getDebugNumber(segmentation, "segmentationExerciseCode");

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {text.analysisDebug}
          </div>
          <div className="text-xs text-muted-foreground">
            {text.evaluatedExercise}: {formatExerciseResult(segmentationExerciseCode, text)}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <InfoPill label={text.rawPeaks} value={formatDebugValue(peakCount)} />
        <InfoPill label={text.rawRepetitions} value={formatDebugValue(rawRepetitionCount)} />
        <InfoPill
          label={text.activeZone}
          value={formatSampleRange(activeStart, activeEnd)}
        />
        <InfoPill
          label={text.qualityModel}
          value={formatExerciseResult(result.qualityModelExerciseCode, text)}
        />
      </div>
    </div>
  );
}

function getDebugNumber(
  value: Record<string, unknown>,
  key: string,
): number | null {
  // Citeste o valoare numerica din debug-ul ML
  const rawValue = value[key];

  return typeof rawValue === "number" && Number.isFinite(rawValue)
    ? rawValue
    : null;
}

function formatDebugValue(value?: number | null): string {
  // Formateaza valori numerice din debug
  return typeof value === "number" ? String(Math.round(value)) : "—";
}

function formatSampleRange(
  start?: number | null,
  end?: number | null,
): string {
  // Formateaza intervalul de esantioane
  if (typeof start !== "number" || typeof end !== "number") {
    return "—";
  }

  return `${Math.round(start)}-${Math.round(end)}`;
}

function formatExerciseResult(
  exerciseCode: number | null | undefined,
  text: LiveSessionText,
): string {
  // Formateaza numele unui exercitiu in functie de cod
  if (exerciseCode === 0) {
    return text.automaticDetection;
  }

  if (typeof exerciseCode !== "number") {
    return "—";
  }

  return `${text.exercise} ${exerciseCode}`;
}

function ResultStatusNotice({
                              title,
                              message,
                            }: {
  title: string;
  message: string;
}) {
  // Afiseaza mesaj localizat dupa finalizarea analizei
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-mint/30 bg-[color:var(--mint)]/5 p-4 text-sm">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--mint)]/10 text-[color:var(--mint)]">
        <CheckCircle2 className="h-4 w-4" />
      </div>

      <div>
        <div className="font-semibold text-foreground">{title}</div>
        <p className="mt-1 leading-6 text-muted-foreground">{message}</p>
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
  // Afiseaza un rezultat important al analizei prin invatare automata
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
  const { language } = useAppLanguage();
  const text = LIVE_SESSION_TEXT[language];
  const heightClass = size === "large" ? "h-[205px]" : "h-[165px]";

  if (empty) {
    return (
      <div className={`grid ${heightClass} place-items-center text-sm text-muted-foreground`}>
        {text.emptyChartMessage}
      </div>
    );
  }

  return (
    <div className={`${heightClass} w-full`}>
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
  // Converteste increderea modelului in procent
  if (typeof value !== "number") {
    return 0;
  }

  if (value > 1) {
    return round(value, 1);
  }

  return round(value * 100, 1);
}

function formatConnectionStatus(
  status: string,
  statusValues: Record<string, string>,
): string {
  // Traduce statusul conexiunii pentru afisare
  return statusValues[status] ?? status;
}

function normalizeQualityKey(qualityName?: string | null): string {
  // Normalizeaza calitatea pentru maparea explicatiilor si culorilor
  if (!qualityName) {
    return "unknown";
  }

  if (qualityName === "Amplitudine mica") {
    return "Small amplitude";
  }

  if (
    qualityName === "Normal" ||
    qualityName === "Rapid" ||
    qualityName === "Small amplitude"
  ) {
    return qualityName;
  }

  return "unknown";
}

function getQualityFeedback(
  qualityName: string,
  qualityFeedback: Record<string, QualityFeedback>,
): QualityFeedback {
  // Returneaza explicatia potrivita pentru calitatea detectata
  const normalizedQuality = normalizeQualityKey(qualityName);

  return qualityFeedback[normalizedQuality] ?? qualityFeedback.unknown;
}

function qualityPanelClass(qualityName?: string | null): string {
  // Alege culoarea panoului de explicatie pentru calitate
  const normalizedQuality = normalizeQualityKey(qualityName);

  switch (normalizedQuality) {
    case "Normal":
      return "border-[color:var(--mint)]/30 bg-[color:var(--mint)]/5";
    case "Rapid":
      return "border-[color:var(--amber)]/30 bg-[color:var(--amber)]/5";
    case "Small amplitude":
      return "border-[color:var(--violet)]/30 bg-[color:var(--violet)]/5";
    default:
      return "border-border bg-muted/20";
  }
}

function qualityIconClass(qualityName?: string | null): string {
  // Alege culoarea iconitei pentru rezultatul calitatii
  const normalizedQuality = normalizeQualityKey(qualityName);

  switch (normalizedQuality) {
    case "Normal":
      return "bg-[color:var(--mint)]/10 text-[color:var(--mint)]";
    case "Rapid":
      return "bg-[color:var(--amber)]/10 text-[color:var(--amber)]";
    case "Small amplitude":
      return "bg-[color:var(--violet)]/10 text-[color:var(--violet)]";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatQualityName(
  qualityName: string,
  qualityValues: Record<string, string>,
): string {
  // Traduce numele calitatii pentru afisare
  return qualityValues[qualityName] ?? qualityName;
}

function round(value: number, decimals = 0): number {
  // Rotunjeste o valoare numerica
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}
