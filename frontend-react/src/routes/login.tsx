// Pagina de autentificare pentru doctori
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BicepsFlexed } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { AuthPageControls } from "@/components/AuthPageControls";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
});

const TEXT = {
  ro: {
    title: "Bun venit",
    subtitle: "Conecteaza-te in contul de doctor.",
    email: "Email",
    password: "Parola",
    submit: "Conectare",
    submitting: "Se conecteaza...",
    noAccount: "Nu ai cont?",
    register: "Creeaza cont",
    error: "Email sau parola incorecte.",
    emailRequired: "Completeaza adresa de email.",
    emailInvalid: "Introdu o adresa de email valida.",
    passwordRequired: "Completeaza parola.",
    passwordTooShort: "Parola trebuie sa aiba cel putin 6 caractere.",
  },
  en: {
    title: "Welcome back",
    subtitle: "Sign in to your doctor account.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    submitting: "Signing in...",
    noAccount: "No account yet?",
    register: "Create one",
    error: "Invalid email or password.",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    passwordRequired: "Enter your password.",
    passwordTooShort: "Password must have at least 6 characters.",
  },
} as const;

type LoginErrorCode =
  | "invalidCredentials"
  | "emailRequired"
  | "emailInvalid"
  | "passwordRequired"
  | "passwordTooShort";

function LoginPage() {
  const { login, status } = useAuth();
  const { language } = useAppLanguage();
  const navigate = useNavigate();
  const text = TEXT[language];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<LoginErrorCode | null>(null);
  const error = errorCode ? getLoginErrorMessage(errorCode, text) : null;

  useEffect(() => {
    if (status === "authenticated") navigate({ to: "/", replace: true });
  }, [status, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorCode(null);

    const validationError = validateLoginForm(email, password);
    if (validationError) {
      setErrorCode(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      navigate({ to: "/", replace: true });
    } catch {
      setErrorCode("invalidCredentials");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
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

        <form onSubmit={onSubmit} noValidate className="space-y-4">
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
          {text.noAccount}{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            {text.register}
          </Link>
        </div>
      </div>
    </div>
  );
}

function validateLoginForm(email: string, password: string): LoginErrorCode | null {
  if (!email.trim()) {
    return "emailRequired";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "emailInvalid";
  }

  if (!password) {
    return "passwordRequired";
  }

  if (password.length < 6) {
    return "passwordTooShort";
  }

  return null;
}

function getLoginErrorMessage(
  errorCode: LoginErrorCode,
  text: (typeof TEXT)[keyof typeof TEXT],
): string {
  switch (errorCode) {
    case "emailRequired":
      return text.emailRequired;
    case "emailInvalid":
      return text.emailInvalid;
    case "passwordRequired":
      return text.passwordRequired;
    case "passwordTooShort":
      return text.passwordTooShort;
    case "invalidCredentials":
    default:
      return text.error;
  }
}
