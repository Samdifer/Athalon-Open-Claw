// ─── PersonnelStatCard ──────────────────────────────────────────────────────
// Reusable KPI tile for Personnel Command area.

interface PersonnelStatCardProps {
  label: string;
  value: string | number;
  tone?: "default" | "amber" | "red" | "green";
}

const TONE_CLASS: Record<NonNullable<PersonnelStatCardProps["tone"]>, string> = {
  default: "text-foreground",
  amber: "text-amber-500",
  red: "text-red-500",
  green: "text-green-600 dark:text-green-400",
};

export function PersonnelStatCard({
  label,
  value,
  tone = "default",
}: PersonnelStatCardProps) {
  return (
    <div className="rounded border border-border/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-xl font-mono font-semibold mt-1 ${TONE_CLASS[tone]}`}>
        {value}
      </div>
    </div>
  );
}
