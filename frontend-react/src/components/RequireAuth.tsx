// Garda care redirectioneaza vizitatorii neautentificati catre /login
import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useAppLanguage } from "@/hooks/useAppLanguage";

const REQUIRE_AUTH_TEXT = {
  ro: {
    loading: "Se incarca...",
  },
  en: {
    loading: "Loading...",
  },
} as const;

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { language } = useAppLanguage();
  const text = REQUIRE_AUTH_TEXT[language];

  const navigate = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate({ to: "/login", replace: true });
    }
  }, [status, navigate]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
          {text.loading}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}