// Layout principal pentru interfata KinetoLive
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Dumbbell,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Radio,
  Settings,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  {
    to: "/",
    label: "Dashboard",
    description: "Overview",
    icon: LayoutDashboard,
  },
  {
    to: "/exercises",
    label: "Exercises",
    description: "Exercise library",
    icon: Dumbbell,
  },
  {
    to: "/live-session",
    label: "Live Session",
    description: "Sensor monitoring",
    icon: Radio,
  },
  {
    to: "/sessions",
    label: "Sessions",
    description: "Saved results",
    icon: ListChecks,
  },
] as const;

export function AppLayout({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const activeRoute = NAV.find((item) =>
    item.to === "/" ? pathname === "/" : pathname.startsWith(item.to),
  );

  const pageTitle = activeRoute?.label ?? "KinetoLive";
  const pageDescription =
    activeRoute?.description ?? "Rehabilitation monitoring platform";

  function isActiveRoute(to: string) {
    // Verifica daca ruta curenta este activa in sidebar
    return to === "/" ? pathname === "/" : pathname.startsWith(to);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-border bg-sidebar px-4 py-5 md:flex md:flex-col">
          <div className="mb-8 flex items-center gap-3 rounded-2xl px-2">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[color:var(--primary)] to-[color:var(--cyan)] text-primary-foreground shadow-md shadow-primary/20">
              <HeartPulse className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="truncate text-lg font-bold tracking-tight text-sidebar-foreground">
                KinetoLive
              </div>
              <div className="text-xs text-muted-foreground">
                Rehab monitoring
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {NAV.map(({ to, label, description, icon: Icon }) => {
              const active = isActiveRoute(to);

              return (
                <Link
                  key={to}
                  to={to}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-xl transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-semibold">{label}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 rounded-2xl border border-border bg-background/70 p-3">
            <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>

              <div>
                <div>Settings</div>
                <div className="text-xs font-normal text-muted-foreground">
                  Coming later
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4 text-[color:var(--mint)]" />
                ESP32 · BNO055
              </div>

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Live inertial data streamed through WebSocket at 25 Hz.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BarChart3 className="h-4 w-4 text-[color:var(--cyan)]" />
                ML analysis
              </div>

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Exercise detection, repetition segmentation and quality
                classification.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
            <div className="flex min-h-[76px] items-center justify-between gap-4 px-5 md:px-7">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  KinetoLive
                </div>

                <div className="mt-1 flex items-center gap-3">
                  <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
                    {pageTitle}
                  </h1>

                  <span className="hidden rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground lg:inline-flex">
                    {pageDescription}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold leading-tight text-foreground">
                    Test Patient
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Patient ID · 1
                  </div>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[color:var(--cyan)] to-[color:var(--primary)] text-sm font-bold text-primary-foreground shadow-md shadow-primary/20">
                  <UserRound className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
              {NAV.map(({ to, label, icon: Icon }) => {
                const active = isActiveRoute(to);

                return (
                  <Link
                    key={to}
                    to={to}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </header>

          <main className="flex-1 px-5 py-6 md:px-7">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}