// Pagina pentru calibrarea senzorului BNO055 conectat la ESP32
import { createFileRoute } from "@tanstack/react-router";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  Eraser,
  Gauge,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  StopCircle,
} from "lucide-react";

import { SectionCard, StatCard } from "@/components/StatCard";
import { api, type DeviceCalibrationStatus } from "@/lib/api";
import { useAppLanguage } from "@/hooks/useAppLanguage";

export const Route = createFileRoute("/calibration")({
  head: () => ({ meta: [{ title: "KinetoLive" }] }),
  component: CalibrationPage,
});

const POLLING_INTERVAL_MS = 1000;

const CALIBRATION_TEXT = {
  ro: {
    pageTitle: "Calibrare senzor",
    browserTitle: "Calibrare senzor — KinetoLive",
    locale: "ro-RO",
    pageDescription:
      "Calibreaza sistemul BNO055 sau foloseste profilul salvat in memoria nevolatila a ESP32.",
    statusTitle: "Status calibrare",
    statusSubtitle: "Valorile SYS, ACC, GYR si MAG sunt raportate periodic de ESP32 prin WiFi.",
    controlsTitle: "Control calibrare",
    controlsSubtitle:
      "Porneste monitorizarea, salveaza profilul complet sau foloseste profilul existent.",
    instructionsTitle: "Instructiuni pentru calibrare",
    instructionsSubtitle: "Urmeaza pasii fizici recomandati pentru BNO055.",
    savedProfileTitle: "Profil salvat",
    savedProfileSubtitle: "Memoria nevolatila ESP32",
    usableTitle: "Sistem utilizabil",
    usableSubtitle: "Calibrare curenta sau profil salvat",
    lastUpdate: "Ultima actualizare",
    never: "Niciodata",
    yes: "Da",
    no: "Nu",
    available: "Disponibil",
    unavailable: "Indisponibil",
    complete: "Complet",
    incomplete: "Incomplet",
    componentLevel: "Nivelul componentelor",
    stabilityConfirmation: "Confirmarea stabilitatii",
    stableSamples: "Esantioane stabile",
    startCalibration: "Calibreaza sistemul",
    stopCalibration: "Opreste calibrarea",
    saveCalibration: "Salveaza calibrarea",
    useSavedCalibration: "Foloseste calibrarea salvata",
    clearCalibration: "Sterge calibrarea",
    refreshStatus: "Actualizeaza statusul",
    actionRunning: "Se trimite comanda...",
    noStatus:
      "Astept raportarea statusului de la ESP32. Verifica daca backend-ul ruleaza si placa este conectata la aceeasi retea WiFi.",
    monitoringActive: "Monitorizarea calibrarii este activa.",
    savedAvailable:
      "Profilul de calibrare salvat este disponibil. Poti porni sesiunile live fara recalibrare.",
    fullyCalibrated: "Calibrarea curenta este completa. Poti salva profilul in memoria nevolatila.",
    restartRequired:
      "Calibrarea salvata a fost stearsa. Repornește sau reconecteaza ESP32 inainte de o noua calibrare.",
    commandPending:
      "Comanda a fost trimisa catre backend si va fi preluata de ESP32 la urmatorul polling.",
    gyroInstruction: "GYR: tine senzorul complet nemiscat pentru giroscop.",
    accInstruction:
      "ACC: mentine senzorul pe rand in cele sase orientari stabile pentru accelerometru.",
    magInstruction: "MAG: executa lent miscari in forma cifrei 8, departe de obiecte metalice.",
    sysInstruction:
      "SYS: componentele sunt calibrate. Continua miscarea lenta si asteapta stabilizarea sistemului.",
    doneInstruction:
      "Calibrarea este completa. Apasa Salveaza calibrarea pentru memorarea offseturilor.",
    savedInstruction: "Profilul salvat poate fi folosit la pornirile urmatoare ale ESP32.",
    guide1:
      "1. Apasa Calibreaza sistemul pentru a porni monitorizarea valorilor SYS, ACC, GYR si MAG.",
    guide2:
      "2. Tine senzorul nemiscat pentru GYR, apoi pozitioneaza-l stabil in mai multe orientari pentru ACC.",
    guide3: "3. Pentru MAG, misca senzorul lent in forma cifrei 8, departe de obiecte metalice.",
    guide4:
      "4. Cand toate valorile ajung la 3 si stabilitatea este confirmata, apasa Salveaza calibrarea.",
    couldNotLoad: "Nu s-a putut citi statusul calibrarii:",
    couldNotSend: "Nu s-a putut trimite comanda:",
  },
  en: {
    pageTitle: "Sensor calibration",
    browserTitle: "Sensor calibration — KinetoLive",
    locale: "en-US",
    pageDescription:
      "Calibrate the BNO055 system or use the profile saved in the ESP32 non-volatile memory.",
    statusTitle: "Calibration status",
    statusSubtitle:
      "SYS, ACC, GYR and MAG values are reported periodically by the ESP32 over WiFi.",
    controlsTitle: "Calibration control",
    controlsSubtitle: "Start monitoring, save the complete profile or use the existing profile.",
    instructionsTitle: "Calibration instructions",
    instructionsSubtitle: "Follow the physical steps recommended for BNO055.",
    savedProfileTitle: "Saved profile",
    savedProfileSubtitle: "ESP32 non-volatile memory",
    usableTitle: "System usable",
    usableSubtitle: "Current calibration or saved profile",
    lastUpdate: "Last update",
    never: "Never",
    yes: "Yes",
    no: "No",
    available: "Available",
    unavailable: "Unavailable",
    complete: "Complete",
    incomplete: "Incomplete",
    componentLevel: "Component level",
    stabilityConfirmation: "Stability confirmation",
    stableSamples: "Stable samples",
    startCalibration: "Calibrate system",
    stopCalibration: "Stop calibration",
    saveCalibration: "Save calibration",
    useSavedCalibration: "Use saved calibration",
    clearCalibration: "Clear calibration",
    refreshStatus: "Refresh status",
    actionRunning: "Sending command...",
    noStatus:
      "Waiting for calibration status from ESP32. Check that the backend is running and the board is on the same WiFi network.",
    monitoringActive: "Calibration monitoring is active.",
    savedAvailable:
      "A saved calibration profile is available. You can start live sessions without recalibrating.",
    fullyCalibrated:
      "The current calibration is complete. You can save the profile to non-volatile memory.",
    restartRequired:
      "The saved calibration was cleared. Restart or reconnect the ESP32 before a new calibration.",
    commandPending:
      "The command was sent to the backend and will be picked up by ESP32 on the next polling cycle.",
    gyroInstruction: "GYR: keep the sensor completely still for the gyroscope.",
    accInstruction: "ACC: place the sensor steadily in the six orientations for the accelerometer.",
    magInstruction:
      "MAG: slowly move the sensor in a figure-eight pattern, away from metal objects.",
    sysInstruction:
      "SYS: the components are calibrated. Continue slow movement and wait for system stabilization.",
    doneInstruction: "Calibration is complete. Press Save calibration to store the offsets.",
    savedInstruction: "The saved profile can be reused on the next ESP32 startups.",
    guide1: "1. Press Calibrate system to monitor SYS, ACC, GYR and MAG values.",
    guide2:
      "2. Keep the sensor still for GYR, then place it steadily in several orientations for ACC.",
    guide3:
      "3. For MAG, move the sensor slowly in a figure-eight pattern, away from metal objects.",
    guide4: "4. When all values reach 3 and stability is confirmed, press Save calibration.",
    couldNotLoad: "Could not read calibration status:",
    couldNotSend: "Could not send command:",
  },
} as const;

function CalibrationPage() {
  const { language } = useAppLanguage();
  const text = CALIBRATION_TEXT[language];

  useEffect(() => {
    document.title = text.browserTitle;
  }, [text.browserTitle]);

  const [status, setStatus] = useState<DeviceCalibrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const nextStatus = await api.deviceCalibrationStatus();
      setStatus(nextStatus);
      setError(null);
    } catch (caughtError) {
      setError(`${text.couldNotLoad} ${(caughtError as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialStatus() {
      try {
        const nextStatus = await api.deviceCalibrationStatus();

        if (active) {
          setStatus(nextStatus);
          setError(null);
        }
      } catch (caughtError) {
        if (active) {
          setError(`${text.couldNotLoad} ${(caughtError as Error).message}`);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInitialStatus();

    const intervalId = window.setInterval(() => {
      if (active) {
        void loadStatus(false);
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [language]);

  const componentProgress = useMemo(() => {
    if (!status) {
      return 0;
    }

    return Math.round(((status.calSys + status.calAcc + status.calGyr + status.calMag) / 12) * 100);
  }, [status]);

  const stabilityProgress = useMemo(() => {
    if (!status || !status.requiredStableSamples) {
      return 0;
    }

    return Math.min(Math.round((status.stableSamples / status.requiredStableSamples) * 100), 100);
  }, [status]);

  const instruction = getCalibrationInstruction(status, text);
  const statusMessage = getStatusMessage(status, text);

  const hasPendingCommand = Boolean(status?.pendingCommandId);
  const canRunAction = !hasPendingCommand && !action;

  async function runAction(actionName: string, callback: () => Promise<DeviceCalibrationStatus>) {
    setAction(actionName);
    setError(null);

    try {
      const nextStatus = await callback();
      setStatus(nextStatus);
    } catch (caughtError) {
      setError(`${text.couldNotSend} ${(caughtError as Error).message}`);
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{text.pageTitle}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{text.pageDescription}</p>
      </div>

      {error && (
        <div className="card-soft border-rose/30 bg-[color:var(--rose)]/5 p-4 text-sm text-[color:var(--rose)]">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label={text.savedProfileTitle}
          value={status?.calibrationSaved ? text.available : text.unavailable}
          hint={text.savedProfileSubtitle}
          icon={Database}
          tone={status?.calibrationSaved ? "mint" : "amber"}
        />

        <StatCard
          label={text.usableTitle}
          value={status?.usable ? text.yes : text.no}
          hint={text.usableSubtitle}
          icon={ShieldCheck}
          tone={status?.usable ? "mint" : "rose"}
        />

        <StatCard
          label={text.lastUpdate}
          value={formatDateTime(status?.lastUpdatedAt, text.never, text.locale)}
          hint={loading ? text.actionRunning : statusMessage}
          icon={loading ? Loader2 : Gauge}
          tone={status?.usable ? "cyan" : "amber"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <SectionCard title={text.statusTitle} subtitle={text.statusSubtitle}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <CalibrationLevelCard label="SYS" value={status?.calSys ?? 0} />
              <CalibrationLevelCard label="ACC" value={status?.calAcc ?? 0} />
              <CalibrationLevelCard label="GYR" value={status?.calGyr ?? 0} />
              <CalibrationLevelCard label="MAG" value={status?.calMag ?? 0} />
            </div>

            <div className="mt-5 space-y-4">
              <ProgressBlock label={text.componentLevel} value={componentProgress} />

              <ProgressBlock
                label={text.stabilityConfirmation}
                value={stabilityProgress}
                hint={
                  status
                    ? `${text.stableSamples}: ${status.stableSamples}/${status.requiredStableSamples}`
                    : undefined
                }
              />
            </div>
          </SectionCard>

          <SectionCard title={text.instructionsTitle} subtitle={text.instructionsSubtitle}>
            <div className="rounded-2xl border border-border bg-muted/25 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{instruction}</div>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    <p>{text.guide1}</p>
                    <p>{text.guide2}</p>
                    <p>{text.guide3}</p>
                    <p>{text.guide4}</p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title={text.controlsTitle} subtitle={text.controlsSubtitle}>
          <div className="space-y-3">
            <StatusNotice status={status} message={statusMessage} />

            <button
              type="button"
              onClick={() => void runAction("refresh", () => api.deviceCalibrationStatus())}
              disabled={Boolean(action)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              {text.refreshStatus}
            </button>

            <button
              type="button"
              onClick={() => void runAction("start", () => api.startDeviceCalibration())}
              disabled={!canRunAction || status?.monitoringEnabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              {text.startCalibration}
            </button>

            <button
              type="button"
              onClick={() => void runAction("stop", () => api.stopDeviceCalibration())}
              disabled={!canRunAction || !status?.monitoringEnabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <StopCircle className="h-4 w-4" />
              {text.stopCalibration}
            </button>

            <button
              type="button"
              onClick={() => void runAction("save", () => api.saveDeviceCalibration())}
              disabled={
                !canRunAction ||
                !status?.fullyCalibrated ||
                status?.monitoringEnabled ||
                status?.restartRequired
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-mint/30 bg-[color:var(--mint)]/10 px-4 py-2.5 text-sm font-semibold text-[color:var(--mint)] transition hover:bg-[color:var(--mint)]/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {text.saveCalibration}
            </button>

            <button
              type="button"
              onClick={() => void runAction("use-saved", () => api.useSavedDeviceCalibration())}
              disabled={!canRunAction || !status?.calibrationSaved || status?.monitoringEnabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan/30 bg-[color:var(--cyan)]/10 px-4 py-2.5 text-sm font-semibold text-[color:var(--cyan)] transition hover:bg-[color:var(--cyan)]/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              {text.useSavedCalibration}
            </button>

            <button
              type="button"
              onClick={() => void runAction("clear", () => api.clearDeviceCalibration())}
              disabled={!canRunAction || !status?.calibrationSaved || status?.monitoringEnabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose/30 bg-[color:var(--rose)]/10 px-4 py-2.5 text-sm font-semibold text-[color:var(--rose)] transition hover:bg-[color:var(--rose)]/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Eraser className="h-4 w-4" />
              {text.clearCalibration}
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function CalibrationLevelCard({ label, value }: { label: string; value: number }) {
  const percentage = Math.min(Math.max(value, 0), 3) * 33.33;

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="text-3xl font-semibold text-foreground">{value}/3</div>
        <div className="h-2 flex-1 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </div>
  );
}

function ProgressBlock({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-3 rounded-full bg-muted">
        <div
          className="h-3 rounded-full bg-primary transition-[width]"
          style={{ width: `${value}%` }}
        />
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function StatusNotice({
                        status,
                        message,
                      }: {
  status: DeviceCalibrationStatus | null;
  message: string;
}) {
  const tone = status?.restartRequired
    ? "rose"
    : status?.usable
      ? "mint"
      : status?.monitoringEnabled
        ? "cyan"
        : "amber";

  const toneClass = {
    rose: "border-rose/30 bg-[color:var(--rose)]/5 text-[color:var(--rose)]",
    mint: "border-mint/30 bg-[color:var(--mint)]/5 text-[color:var(--mint)]",
    cyan: "border-cyan/30 bg-[color:var(--cyan)]/5 text-[color:var(--cyan)]",
    amber: "border-amber/30 bg-[color:var(--amber)]/5 text-[color:var(--amber)]",
  }[tone];

  return <div className={`rounded-2xl border p-4 text-sm leading-6 ${toneClass}`}>{message}</div>;
}

function getStatusMessage(
  status: DeviceCalibrationStatus | null,
  text: (typeof CALIBRATION_TEXT)[keyof typeof CALIBRATION_TEXT],
): string {
  if (!status) {
    return text.noStatus;
  }

  if (status.restartRequired) {
    return text.restartRequired;
  }

  if (status.pendingCommandId) {
    return text.commandPending;
  }

  if (status.fullyCalibrated) {
    return text.fullyCalibrated;
  }

  if (status.calibrationSaved) {
    return text.savedAvailable;
  }

  if (status.monitoringEnabled) {
    return text.monitoringActive;
  }

  return text.noStatus;
}

function getCalibrationInstruction(
  status: DeviceCalibrationStatus | null,
  text: (typeof CALIBRATION_TEXT)[keyof typeof CALIBRATION_TEXT],
): string {
  if (!status) {
    return text.noStatus;
  }

  if (status.calGyr < 3) {
    return text.gyroInstruction;
  }

  if (status.calAcc < 3) {
    return text.accInstruction;
  }

  if (status.calMag < 3) {
    return text.magInstruction;
  }

  if (status.calSys < 3) {
    return text.sysInstruction;
  }

  if (status.calibrationSaved) {
    return text.savedInstruction;
  }

  return text.doneInstruction;
}

function formatDateTime(
  value: string | null | undefined,
  fallback: string,
  locale = "ro-RO",
) {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleString(locale);
}
