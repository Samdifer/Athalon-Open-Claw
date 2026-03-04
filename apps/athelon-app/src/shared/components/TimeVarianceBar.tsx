import { cn } from "@/lib/utils";

type TimeVarianceBarProps = {
  estimatedHours: number;
  actualHours: number;
  compact?: boolean;
};

function getVarianceTone(estimatedHours: number, actualHours: number) {
  if (estimatedHours <= 0) return "bg-slate-500";
  if (actualHours <= estimatedHours) return "bg-green-500";
  if (actualHours <= estimatedHours * 1.1) return "bg-amber-500";
  return "bg-red-500";
}

export function TimeVarianceBar({ estimatedHours, actualHours, compact = false }: TimeVarianceBarProps) {
  const variance = actualHours - estimatedHours;
  const progressPct = estimatedHours > 0 ? Math.min(160, (actualHours / estimatedHours) * 100) : 0;
  const tone = getVarianceTone(estimatedHours, actualHours);

  return (
    <div className={cn("space-y-1.5", compact && "space-y-1")}>
      <div className={cn("flex items-center gap-2 text-xs", compact ? "text-[11px]" : "text-xs")}>
        <span className="text-muted-foreground">Estimated: {estimatedHours.toFixed(1)}h</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-foreground">Actual: {actualHours.toFixed(1)}h</span>
        <span className="text-muted-foreground">|</span>
        <span className={cn("font-medium", variance > 0 ? "text-red-500" : "text-green-600 dark:text-green-400")}>
          Variance: {variance >= 0 ? "+" : ""}{variance.toFixed(1)}h
        </span>
      </div>
      <div className={cn("bg-primary/20 relative w-full overflow-hidden rounded-full", compact ? "h-1.5" : "h-2")}>
        <div
          className={cn("h-full transition-all", tone)}
          style={{ width: `${Math.max(0, Math.min(progressPct, 160))}%` }}
        />
      </div>
    </div>
  );
}
