// Pagina pentru profilul doctorului si setarile aplicatiei
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Dumbbell,
  Eye,
  Gauge,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { SectionCard, StatCard } from "@/components/StatCard";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useAuth } from "@/hooks/useAuth";
import { EXERCISE_FALLBACK } from "@/lib/api";
import {
  DEFAULT_DOCTOR_SETTINGS,
  getDoctorSettings,
  saveDoctorSettings,
  type AnalysisAction,
  type DoctorSettings,
  type PatientSelectionPreference,
} from "@/lib/doctorSettings";
import type { DoctorProfilePayload } from "@/lib/auth";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Profile & settings — KinetoLive" }] }),
  component: SettingsPage,
});

const SETTINGS_TEXT = {
  ro: {
    title: "Profil si setari",
    subtitle:
      "Datele contului doctorului si preferintele folosite in fluxul KinetoLive.",
    doctorProfile: "Profil doctor",
    doctorProfileSubtitle:
      "Informatii salvate in baza de date pentru doctorul autentificat.",
    firstName: "Prenume",
    lastName: "Nume de familie",
    fullName: "Nume complet",
    fullNameHint: "prenume si nume de familie",
    email: "Email",
    role: "Rol",
    roleDoctor: "Doctor",
    accountStatus: "Status cont",
    active: "Activ",
    inactive: "Inactiv",
    createdAt: "Data creare cont",
    profileId: "ID profil doctor",
    specialization: "Specializare",
    clinicName: "Clinica",
    phoneNumber: "Numar de telefon",
    notCompleted: "—",
    authenticated: "Autentificat",
    localPreferences: "Preferinte locale",
    savedInBrowser: "Salvate in browser",
    saveProfile: "Salveaza profilul",
    savingProfile: "Se salveaza...",
    profileSaved: "Profilul doctorului a fost actualizat.",
    profileSaveError: "Profilul doctorului nu a putut fi actualizat.",
    livePreferences: "Preferinte sesiune live",
    livePreferencesSubtitle:
      "Setari pregatite pentru modul de analiza si alegerea exercitiului.",
    defaultExercise: "Exercitiu implicit",
    automaticDetection: "Detectie automata",
    defaultAnalysisAction: "Actiune implicita dupa oprirea sesiunii",
    doNothing: "Nu face nimic",
    patientSelectionPreference: "Pacient selectat dupa autentificare",
    lastSelectedPatient: "Pacientul selectat in sesiunea trecuta",
    latestAddedPatient: "Ultimul pacient adaugat",
    analyzeOnly: "Analizeaza doar",
    analyzeAndSave: "Analizeaza si salveaza",
    allowExerciseChangeAfterStop:
      "Permite schimbarea exercitiului dupa oprirea sesiunii",
    displayPreferences: "Preferinte afisare rezultate",
    displayPreferencesSubtitle:
      "Alege cat de detaliate sunt rezultatele afisate pentru analiza ML.",
    showConfidenceScores: "Afiseaza scorurile de incredere",
    showModelDetectedExercise: "Afiseaza exercitiul vazut de model",
    showSegments: "Afiseaza intervalele start-final ale repetarilor",
    showMlDebug: "Afiseaza informatii debug pentru segmentare",
    safetyPreferences: "Date si siguranta",
    safetyPreferencesSubtitle:
      "Confirmari utile pentru actiuni care pot sterge date.",
    confirmPatientDelete: "Cere confirmare inainte de stergerea unui pacient",
    confirmSessionDelete: "Cere confirmare inainte de stergerea unei sesiuni",
    sensorSummary: "Senzor si analiza",
    sensorSummarySubtitle: "Rezumatul configuratiei tehnice folosite de KinetoLive.",
    sensor: "Senzor",
    sensorValue: "ESP32 + BNO055",
    frequency: "Frecventa",
    frequencyValue: "25 Hz",
    models: "Modele ML",
    modelsValue: "Exercitii 6, 7 si 8",
    openCalibration: "Mergi la calibrare",
    openLiveSession: "Mergi la sesiune live",
    reset: "Reseteaza preferintele",
    savedAutomatically: "Modificarile se salveaza automat local.",
  },
  en: {
    title: "Profile & settings",
    subtitle:
      "Doctor account data and preferences used in the KinetoLive workflow.",
    doctorProfile: "Doctor profile",
    doctorProfileSubtitle:
      "Information stored in the database for the authenticated doctor.",
    firstName: "First name",
    lastName: "Last name",
    fullName: "Full name",
    fullNameHint: "first name and last name",
    email: "Email",
    role: "Role",
    roleDoctor: "Doctor",
    accountStatus: "Account status",
    active: "Active",
    inactive: "Inactive",
    createdAt: "Account created at",
    profileId: "Doctor profile ID",
    specialization: "Specialization",
    clinicName: "Clinic",
    phoneNumber: "Phone number",
    notCompleted: "—",
    authenticated: "Authenticated",
    localPreferences: "Local preferences",
    savedInBrowser: "Saved in browser",
    saveProfile: "Save profile",
    savingProfile: "Saving...",
    profileSaved: "Doctor profile was updated.",
    profileSaveError: "Doctor profile could not be updated.",
    livePreferences: "Live session preferences",
    livePreferencesSubtitle:
      "Settings prepared for the analysis mode and default exercise selection.",
    defaultExercise: "Default exercise",
    automaticDetection: "Automatic detection",
    defaultAnalysisAction: "Default action after stopping a session",
    doNothing: "Do nothing",
    patientSelectionPreference: "Selected patient after login",
    lastSelectedPatient: "Patient selected in the previous session",
    latestAddedPatient: "Latest added patient",
    analyzeOnly: "Analyze only",
    analyzeAndSave: "Analyze and save",
    allowExerciseChangeAfterStop: "Allow changing exercise after stopping session",
    displayPreferences: "Result display preferences",
    displayPreferencesSubtitle:
      "Choose how detailed the machine learning analysis results should be.",
    showConfidenceScores: "Show confidence scores",
    showModelDetectedExercise: "Show model-detected exercise",
    showSegments: "Show repetition start-end intervals",
    showMlDebug: "Show segmentation debug information",
    safetyPreferences: "Data and safety",
    safetyPreferencesSubtitle:
      "Useful confirmations for actions that can remove data.",
    confirmPatientDelete: "Ask for confirmation before deleting a patient",
    confirmSessionDelete: "Ask for confirmation before deleting a session",
    sensorSummary: "Sensor and analysis",
    sensorSummarySubtitle: "Technical configuration summary used by KinetoLive.",
    sensor: "Sensor",
    sensorValue: "ESP32 + BNO055",
    frequency: "Frequency",
    frequencyValue: "25 Hz",
    models: "ML models",
    modelsValue: "Exercises 6, 7 and 8",
    openCalibration: "Go to calibration",
    openLiveSession: "Go to live session",
    reset: "Reset preferences",
    savedAutomatically: "Changes are saved locally automatically.",
  },
} as const;

function SettingsPage() {
  const { language } = useAppLanguage();
  const { doctor, updateDoctorProfile } = useAuth();
  const text = SETTINGS_TEXT[language];
  const [settings, setSettings] = useState<DoctorSettings>(() => getDoctorSettings());
  const [profileForm, setProfileForm] = useState<DoctorProfilePayload>(() => ({
    firstName: "",
    lastName: "",
    email: "",
    specialization: "",
    clinicName: "",
    phoneNumber: "",
  }));
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    saveDoctorSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!doctor) {
      return;
    }

    setProfileForm({
      firstName: doctor.firstName ?? getFirstNameFromFullName(doctor.fullName),
      lastName: doctor.lastName ?? getLastNameFromFullName(doctor.fullName),
      email: doctor.email ?? "",
      specialization: doctor.specialization ?? "",
      clinicName: doctor.clinicName ?? "",
      phoneNumber: doctor.phoneNumber ?? "",
    });
  }, [doctor]);

  const exerciseOptions = useMemo(
    () =>
      EXERCISE_FALLBACK.map((exercise) => ({
        code: exercise.exerciseCode,
        name:
          language === "ro"
            ? exercise.nameRo || `${text.defaultExercise} ${exercise.exerciseCode}`
            : exercise.nameEn || `${text.defaultExercise} ${exercise.exerciseCode}`,
      })),
    [language, text.defaultExercise],
  );

  function updateSetting<K extends keyof DoctorSettings>(
    key: K,
    value: DoctorSettings[K],
  ) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value,
    }));
  }

  function updateProfileForm<K extends keyof DoctorProfilePayload>(
    key: K,
    value: DoctorProfilePayload[K],
  ) {
    setProfileForm((currentProfileForm) => ({
      ...currentProfileForm,
      [key]: value,
    }));
  }

  function resetSettings() {
    setSettings(DEFAULT_DOCTOR_SETTINGS);
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      await updateDoctorProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        email: profileForm.email.trim(),
        specialization: emptyToNull(profileForm.specialization),
        clinicName: emptyToNull(profileForm.clinicName),
        phoneNumber: emptyToNull(profileForm.phoneNumber),
      });
      setProfileMessage({ type: "success", text: text.profileSaved });
    } catch {
      setProfileMessage({ type: "error", text: text.profileSaveError });
    } finally {
      setIsSavingProfile(false);
    }
  }

  const formattedCreatedAt = formatDateTime(doctor?.createdAt, language);

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {text.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {text.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label={text.accountStatus}
          value={doctor?.active === false ? text.inactive : text.active}
          hint={doctor?.email}
          icon={ShieldCheck}
          tone={doctor?.active === false ? "amber" : "mint"}
        />
        <StatCard
          label={text.role}
          value={doctor?.role || text.roleDoctor}
          hint={doctor?.fullName || text.roleDoctor}
          icon={UserRound}
          tone="primary"
        />
        <StatCard
          label={text.localPreferences}
          value={<span className="inline-flex items-center gap-2">{text.savedInBrowser}</span>}
          hint={text.savedAutomatically}
          icon={Save}
          tone="cyan"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SectionCard title={text.doctorProfile} subtitle={text.doctorProfileSubtitle}>
          <form className="space-y-5" onSubmit={handleProfileSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ProfileInput
                label={text.firstName}
                value={profileForm.firstName}
                onChange={(value) => updateProfileForm("firstName", value)}
                required
              />
              <ProfileInput
                label={text.lastName}
                value={profileForm.lastName}
                onChange={(value) => updateProfileForm("lastName", value)}
                required
              />
            </div>

            <ProfileInput
              label={text.email}
              value={profileForm.email}
              onChange={(value) => updateProfileForm("email", value)}
              type="email"
              required
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ProfileInput
                label={text.specialization}
                value={profileForm.specialization ?? ""}
                onChange={(value) => updateProfileForm("specialization", value)}
              />
              <ProfileInput
                label={text.clinicName}
                value={profileForm.clinicName ?? ""}
                onChange={(value) => updateProfileForm("clinicName", value)}
              />
            </div>

            <ProfileInput
              label={text.phoneNumber}
              value={profileForm.phoneNumber ?? ""}
              onChange={(value) => updateProfileForm("phoneNumber", value)}
              type="tel"
            />

            <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
              <ProfileRow
                label={text.fullName}
                hint={text.fullNameHint}
                value={doctor?.fullName || text.notCompleted}
              />
              <ProfileRow label={text.profileId} value={doctor?.doctorProfileId ?? text.notCompleted} />
              <ProfileRow label={text.role} value={doctor?.role || text.roleDoctor} />
              <ProfileRow label={text.createdAt} value={formattedCreatedAt || text.notCompleted} />
            </div>

            {profileMessage ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                  profileMessage.type === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                }`}
              >
                {profileMessage.text}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSavingProfile ? text.savingProfile : text.saveProfile}
            </button>
          </form>
        </SectionCard>

        <SectionCard title={text.livePreferences} subtitle={text.livePreferencesSubtitle}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-foreground">{text.defaultExercise}</span>
              <select
                value={settings.defaultExerciseCode}
                onChange={(event) =>
                  updateSetting("defaultExerciseCode", Number(event.target.value))
                }
                className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                {exerciseOptions.map((exercise) => (
                  <option key={exercise.code} value={exercise.code}>
                    {exercise.code === 0 ? text.automaticDetection : exercise.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium text-foreground">
                {text.defaultAnalysisAction}
              </span>
              <select
                value={settings.defaultAnalysisAction}
                onChange={(event) =>
                  updateSetting(
                    "defaultAnalysisAction",
                    event.target.value as AnalysisAction,
                  )
                }
                className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="none">{text.doNothing}</option>
                <option value="analyze">{text.analyzeOnly}</option>
                <option value="analyzeAndSave">{text.analyzeAndSave}</option>
              </select>
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-foreground">
                {text.patientSelectionPreference}
              </span>
              <select
                value={settings.patientSelectionPreference}
                onChange={(event) =>
                  updateSetting(
                    "patientSelectionPreference",
                    event.target.value as PatientSelectionPreference,
                  )
                }
                className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="lastSelected">{text.lastSelectedPatient}</option>
                <option value="latestAdded">{text.latestAddedPatient}</option>
              </select>
            </label>
          </div>

          <div className="mt-4">
            <ToggleRow
              checked={settings.allowExerciseChangeAfterStop}
              label={text.allowExerciseChangeAfterStop}
              onChange={(checked) =>
                updateSetting("allowExerciseChangeAfterStop", checked)
              }
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title={text.displayPreferences}
          subtitle={text.displayPreferencesSubtitle}
          action={<Eye className="h-5 w-5 text-[color:var(--primary)]" />}
        >
          <div className="space-y-3">
            <ToggleRow
              checked={settings.showConfidenceScores}
              label={text.showConfidenceScores}
              onChange={(checked) => updateSetting("showConfidenceScores", checked)}
            />
            <ToggleRow
              checked={settings.showModelDetectedExercise}
              label={text.showModelDetectedExercise}
              onChange={(checked) =>
                updateSetting("showModelDetectedExercise", checked)
              }
            />
            <ToggleRow
              checked={settings.showSegments}
              label={text.showSegments}
              onChange={(checked) => updateSetting("showSegments", checked)}
            />
            <ToggleRow
              checked={settings.showMlDebug}
              label={text.showMlDebug}
              onChange={(checked) => updateSetting("showMlDebug", checked)}
            />
          </div>
        </SectionCard>

        <SectionCard
          title={text.safetyPreferences}
          subtitle={text.safetyPreferencesSubtitle}
          action={<SlidersHorizontal className="h-5 w-5 text-[color:var(--cyan)]" />}
        >
          <div className="space-y-3">
            <ToggleRow
              checked={settings.confirmPatientDelete}
              label={text.confirmPatientDelete}
              onChange={(checked) => updateSetting("confirmPatientDelete", checked)}
            />
            <ToggleRow
              checked={settings.confirmSessionDelete}
              label={text.confirmSessionDelete}
              onChange={(checked) => updateSetting("confirmSessionDelete", checked)}
            />
          </div>

          <button
            type="button"
            onClick={resetSettings}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-muted/50 px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            {text.reset}
          </button>
        </SectionCard>
      </div>

      <SectionCard title={text.sensorSummary} subtitle={text.sensorSummarySubtitle}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoPill icon={<Activity className="h-4 w-4" />} label={text.sensor} value={text.sensorValue} />
          <InfoPill icon={<Gauge className="h-4 w-4" />} label={text.frequency} value={text.frequencyValue} />
          <InfoPill icon={<Dumbbell className="h-4 w-4" />} label={text.models} value={text.modelsValue} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/calibration"
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-muted/50 px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            {text.openCalibration}
          </Link>
          <Link
            to="/live-session"
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {text.openLiveSession}
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}

function ProfileInput({
                        label,
                        value,
                        onChange,
                        type = "text",
                        required = false,
                      }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
      />
    </label>
  );
}

function ProfileRow({
                      label,
                      value,
                      hint,
                    }: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex min-h-[86px] flex-col justify-center rounded-2xl border border-border bg-background/70 px-5 py-4">
      <div className="text-xs font-medium uppercase leading-snug tracking-wide text-muted-foreground">
        {label}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[11px] font-medium leading-snug text-muted-foreground/80">
          {hint}
        </div>
      ) : null}
      <div className="mt-2 break-words text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function ToggleRow({
                     checked,
                     label,
                     onChange,
                   }: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted/40">
      <span>{label}</span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border bg-muted transition">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute left-1 h-4 w-4 rounded-full bg-muted-foreground transition peer-checked:translate-x-5 peer-checked:bg-primary" />
      </span>
    </label>
  );
}

function InfoPill({
                    icon,
                    label,
                    value,
                  }: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-[color:var(--primary)]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <CheckCircle2 className="h-4 w-4 text-[color:var(--mint)]" />
        {value}
      </div>
    </div>
  );
}

function emptyToNull(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue : null;
}

function getFirstNameFromFullName(fullName?: string | null): string {
  if (!fullName) {
    return "";
  }

  return fullName.trim().split(/\s+/)[0] ?? "";
}

function getLastNameFromFullName(fullName?: string | null): string {
  if (!fullName) {
    return "";
  }

  const parts = fullName.trim().split(/\s+/);

  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

function formatDateTime(value: string | null | undefined, language: "ro" | "en") {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString(language === "ro" ? "ro-RO" : "en-US");
}
