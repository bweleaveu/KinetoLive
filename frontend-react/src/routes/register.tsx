// Pagina de inregistrare pentru doctori
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BicepsFlexed } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { AuthPageControls } from "@/components/AuthPageControls";

export const Route = createFileRoute("/register")({
  ssr: false,
  component: RegisterPage,
});

const TEXT = {
  ro: {
    title: "Creeaza cont de doctor",
    subtitle: "Inregistreaza-te pentru a accesa platforma KinetoLive.",
    fullName: "Nume complet",
    email: "Email",
    password: "Parola (minim 6 caractere)",
    submit: "Inregistrare",
    submitting: "Se creeaza contul...",
    haveAccount: "Ai deja cont?",
    login: "Conecteaza-te",
    error: "Inregistrarea a esuat.",
  },
  en: {
    title: "Create a doctor account",
    subtitle: "Register to access the KinetoLive platform.",
    fullName: "Full name",
    email: "Email",
    password: "Password (min 6 characters)",
    submit: "Create account",
    submitting: "Creating account...",
    haveAccount: "Already have an account?",
    login: "Sign in",
    error: "Registration failed.",
  },
} as const;

function RegisterPage() {
  const { register, status } = useAuth();
  const { language } = useAppLanguage();
  const navigate = useNavigate();
  const text = TEXT[language];

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") navigate({ to: "/", replace: true });
  }, [status, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(fullName, email, password);
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : text.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <AuthPageControls />
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[color:var(--primary)] to-[color:var(--cyan)] text-primary-foreground">
            <BicepsFlexed className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-foreground">
              KinetoLive
            </div>
            <div className="text-xs text-muted-foreground">{text.subtitle}</div>
          </div>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-foreground">{text.title}</h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {text.fullName}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {text.email}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {text.password}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? text.submitting : text.submit}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {text.haveAccount}{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            {text.login}
          </Link>
        </div>
      </div>
    </div>
  );
}
