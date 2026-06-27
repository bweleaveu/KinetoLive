// Ruta principala pentru aplicatia KinetoLive
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AppLayout } from "../components/AppLayout";
import { useAppLanguage } from "@/hooks/useAppLanguage";

// Importuri pentru autentificare si verificarea rutei curente
import { useLocation } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";

// Texte pentru pagina principala, eroare si 404
const ROOT_TEXT = {
  ro: {
    notFoundTitle: "Pagina nu a fost gasita",
    notFoundDescription: "Pagina pe care o cauti nu exista.",
    goHome: "Mergi la dashboard",
    errorTitle: "Pagina nu s-a incarcat",
    errorDescription:
      "A aparut o problema. Incearca din nou sau revino la dashboard.",
    tryAgain: "Incearca din nou",
  },
  en: {
    notFoundTitle: "Page not found",
    notFoundDescription: "The page you are looking for does not exist.",
    goHome: "Go home",
    errorTitle: "This page did not load",
    errorDescription: "Something went wrong. Try again or go home.",
    tryAgain: "Try again",
  },
} as const;

function NotFoundComponent() {
  const { language } = useAppLanguage();
  const text = ROOT_TEXT[language];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {text.notFoundTitle}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {text.notFoundDescription}
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {text.goHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  const router = useRouter();
  const { language } = useAppLanguage();
  const text = ROOT_TEXT[language];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">
          {text.errorTitle}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {text.errorDescription}
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {text.tryAgain}
          </button>

          <a
            href="/"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            {text.goHome}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KinetoLive — Rehab Monitoring" },
      {
        name: "description",
        content:
          "Real-time inertial sensor monitoring and machine learning-based analysis for physical therapy exercises.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ro" suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>

    <body>
    {children}
    <Scripts />
    </body>
    </html>
  );
}

// Componenta principala care separa paginile publice de aplicatia protejata
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {isAuthPage ? (
          <Outlet />
        ) : (
          <RequireAuth>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </RequireAuth>
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}