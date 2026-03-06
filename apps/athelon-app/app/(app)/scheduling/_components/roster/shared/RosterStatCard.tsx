import type { ReactNode } from "react";

type KpiTone = "default" | "green" | "amber" | "red";

function toneClasses(tone: KpiTone): string {
  switch (tone) {
    case "green":
      return "text-emerald-600 dark:text-emerald-400";
    case "amber":
      return "text-amber-500 dark:text-amber-400";
    case "red":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-foreground";
  }
}

interface RosterStatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: KpiTone;
}

export function RosterStatCard({
  label,
  value,
  icon,
  tone = "default",
}: RosterStatCardProps) {
  return (
    <div className="rounded border border-border/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className={`text-xl font-mono font-semibold mt-1 ${toneClasses(tone)}`}>
        {value}
      </div>
    </div>
  );
}
