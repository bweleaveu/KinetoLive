import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: "primary" | "cyan" | "mint" | "violet" | "amber" | "rose";
}) {
  const toneMap: Record<string, string> = {
    primary: "var(--primary)",
    cyan: "var(--cyan)",
    mint: "var(--mint)",
    violet: "var(--violet)",
    amber: "var(--amber)",
    rose: "var(--rose)",
  };
  const color = toneMap[tone];
  return (
    <div className="card-soft p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-2 truncate text-2xl font-semibold text-foreground">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-soft p-5 ${className}`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
