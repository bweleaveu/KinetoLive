// Pagina pentru selectarea si administrarea pacientilor doctorului autentificat
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Phone,
  Pencil,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { SectionCard, StatCard } from "@/components/StatCard";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useSelectedPatient } from "@/hooks/useSelectedPatient";
import {
  api,
  type PatientProfile,
  type PatientProfilePayload,
} from "@/lib/api";
import { getDoctorSettings } from "@/lib/doctorSettings";

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
    editPatient: "Editeaza pacient",
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
    editPatientSubtitle: "Modifica datele pacientului selectat",
    firstName: "Prenume",
    lastName: "Nume",
    dateOfBirth: "Data nasterii",
    dateOfBirthPlaceholder: "zz/ll/aaaa",
    invalidDateOfBirth: "Data nasterii trebuie sa fie in formatul zi/luna/an.",
    phoneNumber: "Telefon",
    medicalNotes: "Observatii medicale",
    firstNamePlaceholder: "ex. Andrei",
    lastNamePlaceholder: "ex. Popescu",
    phonePlaceholder: "ex. 0712345678",
    notesPlaceholder: "Diagnostic, recomandari, limitari de miscare...",
    create: "Salveaza pacientul",
    saveChanges: "Salveaza modificarile",
    cancelEdit: "Anuleaza editarea",
    creating: "Se salveaza...",
    select: "Selecteaza",
    selected: "Selectat",
    edit: "Editeaza",
    delete: "Sterge",
    deleteConfirm: (name: string) =>
      `Sigur vrei sa stergi pacientul ${name}? Se vor sterge si sesiunile si rezultatele lui salvate.`,
    emptyTitle: "Nu exista pacienti inca",
    emptyDescription:
      "Adauga primul pacient pentru ca Dashboard-ul, istoricul si sesiunea live sa foloseasca date reale pentru pacientul ales.",
    loading: "Se incarca pacientii...",
    errorPrefix: "Nu s-au putut incarca pacientii:",
    createErrorPrefix: "Nu s-a putut crea pacientul:",
    updateErrorPrefix: "Nu s-a putut actualiza pacientul:",
    deleteErrorPrefix: "Nu s-a putut sterge pacientul:",
    created: "Pacientul a fost adaugat si selectat.",
    updated: "Datele pacientului au fost actualizate.",
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
    editPatient: "Edit patient",
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
    editPatientSubtitle: "Update the selected patient details",
    firstName: "First name",
    lastName: "Last name",
    dateOfBirth: "Date of birth",
    dateOfBirthPlaceholder: "dd/mm/yyyy",
    invalidDateOfBirth: "Date of birth must use the day/month/year format.",
    phoneNumber: "Phone",
    medicalNotes: "Medical notes",
    firstNamePlaceholder: "e.g. John",
    lastNamePlaceholder: "e.g. Smith",
    phonePlaceholder: "e.g. 0712345678",
    notesPlaceholder: "Diagnosis, recommendations, movement limitations...",
    create: "Save patient",
    saveChanges: "Save changes",
    cancelEdit: "Cancel editing",
    creating: "Saving...",
    select: "Select",
    selected: "Selected",
    edit: "Edit",
    delete: "Delete",
    deleteConfirm: (name: string) =>
      `Are you sure you want to delete ${name}? The saved sessions and results will also be deleted.`,
    emptyTitle: "No patients yet",
    emptyDescription:
      "Add the first patient so the Dashboard, history and live session can use real data for the chosen patient.",
    loading: "Loading patients...",
    errorPrefix: "Could not load patients:",
    createErrorPrefix: "Could not create patient:",
    updateErrorPrefix: "Could not update patient:",
    deleteErrorPrefix: "Could not delete patient:",
    created: "The patient was added and selected.",
    updated: "Patient details were updated.",
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
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
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

  async function handleSubmitPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    setSuccess(null);

    const normalizedDateOfBirth = normalizeDateInputToIso(form.dateOfBirth);

    if (form.dateOfBirth.trim() && !normalizedDateOfBirth) {
      setActionError(text.invalidDateOfBirth);
      setSaving(false);
      return;
    }

    const payload: PatientProfilePayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: normalizedDateOfBirth,
      phoneNumber: form.phoneNumber.trim() || null,
      medicalNotes: form.medicalNotes.trim() || null,
    };

    try {
      if (editingPatientId !== null) {
        const updatedPatient = await api.updatePatient(
          editingPatientId,
          payload,
        );

        if (selectedPatientId === editingPatientId) {
          selectPatient(updatedPatient.id);
        }

        setEditingPatientId(null);
        setForm(emptyForm);
        setSuccess(text.updated);
        await reloadPatients();
        return;
      }

      const createdPatient = await api.createPatient(payload);

      selectPatient(createdPatient.id);
      setForm(emptyForm);
      setSuccess(text.created);
      await reloadPatients();
    } catch (caughtError) {
      const prefix =
        editingPatientId !== null
          ? text.updateErrorPrefix
          : text.createErrorPrefix;
      setActionError(`${prefix} ${(caughtError as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleStartEdit(patient: PatientProfile) {
    setEditingPatientId(patient.id);
    setActionError(null);
    setSuccess(null);
    setForm({
      firstName: patient.firstName ?? "",
      lastName: patient.lastName ?? "",
      dateOfBirth: patient.dateOfBirth
        ? formatIsoDateForInput(patient.dateOfBirth)
        : "",
      phoneNumber: patient.phoneNumber ?? "",
      medicalNotes: patient.medicalNotes ?? "",
    });
  }

  function handleCancelEdit() {
    setEditingPatientId(null);
    setForm(emptyForm);
    setActionError(null);
  }

  async function handleDeletePatient(patientId: number, patientName: string) {
    const doctorSettings = getDoctorSettings();

    if (doctorSettings.confirmPatientDelete) {
      const confirmed = window.confirm(text.deleteConfirm(patientName));

      if (!confirmed) {
        return;
      }
    }

    setActionError(null);
    setSuccess(null);

    try {
      await api.deletePatient(patientId);

      if (selectedPatientId === patientId) {
        selectPatient(null);
      }

      if (editingPatientId === patientId) {
        handleCancelEdit();
      }

      setSuccess(text.deleted);
      await reloadPatients();
    } catch (caughtError) {
      setActionError(
        `${text.deleteErrorPrefix} ${(caughtError as Error).message}`,
      );
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

                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
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
                            wide
                          />
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
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
                          onClick={() => handleStartEdit(patient)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                          {text.edit}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeletePatient(patient.id, patient.fullName)
                          }
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

        <SectionCard
          title={editingPatientId !== null ? text.editPatient : text.addPatient}
          subtitle={
            editingPatientId !== null
              ? text.editPatientSubtitle
              : text.addPatientSubtitle
          }
        >
          <form className="space-y-4" onSubmit={handleSubmitPatient}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field
                label={text.firstName}
                value={form.firstName}
                placeholder={text.firstNamePlaceholder}
                required
                onChange={(value) =>
                  setForm((current) => ({ ...current, firstName: value }))
                }
              />
              <Field
                label={text.lastName}
                value={form.lastName}
                placeholder={text.lastNamePlaceholder}
                required
                onChange={(value) =>
                  setForm((current) => ({ ...current, lastName: value }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <DateOfBirthField
                label={text.dateOfBirth}
                value={form.dateOfBirth}
                placeholder={text.dateOfBirthPlaceholder}
                onChange={(value) =>
                  setForm((current) => ({ ...current, dateOfBirth: value }))
                }
              />
              <Field
                label={text.phoneNumber}
                value={form.phoneNumber}
                placeholder={text.phonePlaceholder}
                onChange={(value) =>
                  setForm((current) => ({ ...current, phoneNumber: value }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                {text.medicalNotes}
              </label>
              <textarea
                value={form.medicalNotes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    medicalNotes: event.target.value,
                  }))
                }
                placeholder={text.notesPlaceholder}
                rows={5}
                className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={
                  saving || !form.firstName.trim() || !form.lastName.trim()
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingPatientId !== null ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {saving
                  ? text.creating
                  : editingPatientId !== null
                    ? text.saveChanges
                    : text.create}
              </button>

              {editingPatientId !== null && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {text.cancelEdit}
                </button>
              )}
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

function DateOfBirthField({
                            label,
                            value,
                            onChange,
                            placeholder,
                          }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(formatDateInput(event.target.value))}
        placeholder={placeholder}
        inputMode="numeric"
        maxLength={10}
        className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
      />
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
                       wide = false,
                     }: {
  icon: typeof Calendar;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${wide ? "max-w-[360px]" : ""}`}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{value}</span>
    </div>
  );
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function normalizeDateInputToIso(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const match = trimmedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  const date = new Date(year, month - 1, day);
  const isValidDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValidDate) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}`;
}

function formatIsoDateForInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return "";
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = parseIsoDate(value);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = parseIsoDate(dateOfBirth);

  if (!birthDate) {
    return null;
  }

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
