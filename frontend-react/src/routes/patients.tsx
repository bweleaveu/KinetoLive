// Pagina pentru selectarea si administrarea pacientilor doctorului autentificat
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { SectionCard, StatCard } from "@/components/StatCard";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useSelectedPatient } from "@/hooks/useSelectedPatient";
import { api, type PatientProfilePayload } from "@/lib/api";

export const Route = createFileRoute("/patients")({
  head: () => ({ meta: [{ title: "Patients — KinetoLive" }] }),
  component: PatientsPage,
});

const PATIENTS_TEXT = {
  ro: {
    pageTitle: "Pacienti",
    pageDescription:
      "Alege pacientul activ pentru Dashboard, Sesiuni si Sesiune live. Doctorul poate adauga pacienti noi si ii poate sterge pe cei existenti.",
    addPatient: "Adauga pacient",
    selectedPatient: "Pacient selectat",
    selectedPatientHint: "Datele aplicatiei se incarca pentru acest pacient",
    totalPatients: "Total pacienti",
    totalPatientsHint: "Pacienti asignati doctorului logat",
    withPhone: "Cu telefon",
    withNotes: "Cu observatii",
    patientsList: "Lista pacienti",
    patientsListSubtitle:
      "Selecteaza pacientul pentru care vrei sa vezi progresul si sesiunile",
    addPatientSubtitle: "Completeaza datele pacientului nou",
    firstName: "Prenume",
    lastName: "Nume",
    dateOfBirth: "Data nasterii",
    phoneNumber: "Telefon",
    medicalNotes: "Observatii medicale",
    firstNamePlaceholder: "ex. Andrei",
    lastNamePlaceholder: "ex. Popescu",
    phonePlaceholder: "ex. 0712345678",
    notesPlaceholder: "Diagnostic, recomandari, limitari de miscare...",
    create: "Salveaza pacientul",
    creating: "Se salveaza...",
    select: "Selecteaza",
    selected: "Selectat",
    delete: "Sterge",
    deleteConfirm: (name: string) =>
      `Sigur vrei sa stergi pacientul ${name}? Se vor sterge si sesiunile si rezultatele lui salvate.`,
    emptyTitle: "Nu exista pacienti inca",
    emptyDescription:
      "Adauga primul pacient pentru ca Dashboard-ul, istoricul si sesiunea live sa foloseasca date reale pentru pacientul ales.",
    loading: "Se incarca pacientii...",
    errorPrefix: "Nu s-au putut incarca pacientii:",
    createErrorPrefix: "Nu s-a putut crea pacientul:",
    deleteErrorPrefix: "Nu s-a putut sterge pacientul:",
    created: "Pacientul a fost adaugat si selectat.",
    deleted: "Pacientul a fost sters.",
    openDashboard: "Mergi la dashboard",
    years: "ani",
    noBirthDate: "Data nasterii necompletata",
    noPhone: "Telefon necompletat",
    noNotes: "Fara observatii medicale",
  },
  en: {
    pageTitle: "Patients",
    pageDescription:
      "Choose the active patient for Dashboard, Sessions and Live Session. The doctor can add new patients and delete existing ones.",
    addPatient: "Add patient",
    selectedPatient: "Selected patient",
    selectedPatientHint: "Application data is loaded for this patient",
    totalPatients: "Total patients",
    totalPatientsHint: "Patients assigned to the logged-in doctor",
    withPhone: "With phone",
    withNotes: "With notes",
    patientsList: "Patients list",
    patientsListSubtitle:
      "Select the patient whose progress and sessions you want to view",
    addPatientSubtitle: "Fill in the new patient details",
    firstName: "First name",
    lastName: "Last name",
    dateOfBirth: "Date of birth",
    phoneNumber: "Phone",
    medicalNotes: "Medical notes",
    firstNamePlaceholder: "e.g. John",
    lastNamePlaceholder: "e.g. Smith",
    phonePlaceholder: "e.g. 0712345678",
    notesPlaceholder: "Diagnosis, recommendations, movement limitations...",
    create: "Save patient",
    creating: "Saving...",
    select: "Select",
    selected: "Selected",
    delete: "Delete",
    deleteConfirm: (name: string) =>
      `Are you sure you want to delete ${name}? The saved sessions and results will also be deleted.`,
    emptyTitle: "No patients yet",
    emptyDescription:
      "Add the first patient so the Dashboard, history and live session can use real data for the chosen patient.",
    loading: "Loading patients...",
    errorPrefix: "Could not load patients:",
    createErrorPrefix: "Could not create patient:",
    deleteErrorPrefix: "Could not delete patient:",
    created: "The patient was added and selected.",
    deleted: "The patient was deleted.",
    openDashboard: "Go to dashboard",
    years: "years",
    noBirthDate: "Birth date not completed",
    noPhone: "Phone not completed",
    noNotes: "No medical notes",
  },
} as const;

const emptyForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  phoneNumber: "",
  medicalNotes: "",
};

function PatientsPage() {
  const { language } = useAppLanguage();
  const text = PATIENTS_TEXT[language];

  const {
    patients,
    selectedPatient,
    selectedPatientId,
    loading,
    error,
    reloadPatients,
    selectPatient,
  } = useSelectedPatient();

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const stats = useMemo(() => {
    return {
      totalPatients: patients.length,
      withPhone: patients.filter((patient) => patient.phoneNumber).length,
      withNotes: patients.filter((patient) => patient.medicalNotes).length,
    };
  }, [patients]);

  async function handleCreatePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    setSuccess(null);

    const payload: PatientProfilePayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth || null,
      phoneNumber: form.phoneNumber.trim() || null,
      medicalNotes: form.medicalNotes.trim() || null,
    };

    try {
      const createdPatient = await api.createPatient(payload);

      selectPatient(createdPatient.id);
      setForm(emptyForm);
      setSuccess(text.created);
      await reloadPatients();
    } catch (caughtError) {
      setActionError(`${text.createErrorPrefix} ${(caughtError as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePatient(patientId: number, patientName: string) {
    const confirmed = window.confirm(text.deleteConfirm(patientName));

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setSuccess(null);

    try {
      await api.deletePatient(patientId);

      if (selectedPatientId === patientId) {
        selectPatient(null);
      }

      setSuccess(text.deleted);
      await reloadPatients();
    } catch (caughtError) {
      setActionError(`${text.deleteErrorPrefix} ${(caughtError as Error).message}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {text.pageTitle}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {text.pageDescription}
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
        >
          {text.openDashboard}
        </Link>
      </div>

      {error && (
        <div className="card-soft border-rose/30 bg-[color:var(--rose)]/5 p-4 text-sm text-[color:var(--rose)]">
          {text.errorPrefix} {error}
        </div>
      )}

      {actionError && (
        <div className="card-soft border-rose/30 bg-[color:var(--rose)]/5 p-4 text-sm text-[color:var(--rose)]">
          {actionError}
        </div>
      )}

      {success && (
        <div className="card-soft border-mint/30 bg-[color:var(--mint)]/5 p-4 text-sm text-[color:var(--mint)]">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={text.selectedPatient}
          value={selectedPatient?.fullName ?? "—"}
          hint={text.selectedPatientHint}
          icon={CheckCircle2}
          tone="primary"
        />
        <StatCard
          label={text.totalPatients}
          value={stats.totalPatients}
          hint={text.totalPatientsHint}
          icon={UsersRound}
          tone="cyan"
        />
        <StatCard
          label={text.withPhone}
          value={stats.withPhone}
          hint={text.phoneNumber}
          icon={Phone}
          tone="mint"
        />
        <StatCard
          label={text.withNotes}
          value={stats.withNotes}
          hint={text.medicalNotes}
          icon={FileText}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <SectionCard
          title={text.patientsList}
          subtitle={text.patientsListSubtitle}
        >
          {loading ? (
            <div className="grid min-h-[260px] place-items-center text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {text.loading}
              </span>
            </div>
          ) : patients.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <UsersRound className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground">
                  {text.emptyTitle}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {text.emptyDescription}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {patients.map((patient) => {
                const active = patient.id === selectedPatientId;
                const age = getAge(patient.dateOfBirth);

                return (
                  <div
                    key={patient.id}
                    className={`rounded-2xl border p-4 transition ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-foreground">
                            {patient.fullName}
                          </h3>
                          {active && (
                            <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                              {text.selected}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                          <PatientInfo
                            icon={Calendar}
                            value={
                              patient.dateOfBirth
                                ? `${formatDate(patient.dateOfBirth)}${age !== null ? ` · ${age} ${text.years}` : ""}`
                                : text.noBirthDate
                            }
                          />
                          <PatientInfo
                            icon={Phone}
                            value={patient.phoneNumber || text.noPhone}
                          />
                          <PatientInfo
                            icon={FileText}
                            value={patient.medicalNotes || text.noNotes}
                          />
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => selectPatient(patient.id)}
                          disabled={active}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {active ? text.selected : text.select}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePatient(patient.id, patient.fullName)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose/30 bg-[color:var(--rose)]/10 px-4 py-2 text-sm font-semibold text-[color:var(--rose)] transition hover:bg-[color:var(--rose)]/15"
                        >
                          <Trash2 className="h-4 w-4" />
                          {text.delete}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title={text.addPatient} subtitle={text.addPatientSubtitle}>
          <form className="space-y-4" onSubmit={handleCreatePatient}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field
                label={text.firstName}
                value={form.firstName}
                placeholder={text.firstNamePlaceholder}
                required
                onChange={(value) => setForm((current) => ({ ...current, firstName: value }))}
              />
              <Field
                label={text.lastName}
                value={form.lastName}
                placeholder={text.lastNamePlaceholder}
                required
                onChange={(value) => setForm((current) => ({ ...current, lastName: value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field
                type="date"
                label={text.dateOfBirth}
                value={form.dateOfBirth}
                onChange={(value) => setForm((current) => ({ ...current, dateOfBirth: value }))}
              />
              <Field
                label={text.phoneNumber}
                value={form.phoneNumber}
                placeholder={text.phonePlaceholder}
                onChange={(value) => setForm((current) => ({ ...current, phoneNumber: value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                {text.medicalNotes}
              </label>
              <textarea
                value={form.medicalNotes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, medicalNotes: event.target.value }))
                }
                placeholder={text.notesPlaceholder}
                rows={5}
                className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {saving ? text.creating : text.create}
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-[color:var(--rose)]"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
      />
    </div>
  );
}

function PatientInfo({
  icon: Icon,
  value,
}: {
  icon: typeof Calendar;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{value}</span>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return Number.isFinite(age) && age >= 0 ? age : null;
}
