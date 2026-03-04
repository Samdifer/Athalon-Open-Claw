import { cn } from "@/lib/utils";

type RemainingLifeBarProps = {
  currentValue?: number | null;
  limitValue?: number | null;
  className?: string;
};

function safeNumber(value?: number | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getRemainingLifeMetrics(currentValue?: number | null, limitValue?: number | null) {
  const current = safeNumber(currentValue);
  const limit = safeNumber(limitValue);
  if (limit <= 0) {
    return {
      remaining: 0,
      percentRemaining: 0,
      percentUsed: 0,
      status: "unknown" as const,
    };
  }

  const remainingRaw = limit - current;
  const percentRemainingRaw = (remainingRaw / limit) * 100;
  const percentRemaining = Math.max(-999, Math.min(100, percentRemainingRaw));
  const percentUsed = Math.max(0, Math.min(100, (current / limit) * 100));

  const status = percentRemaining <= 0
    ? "overdue"
    : percentRemaining <= 10
      ? "critical"
      : percentRemaining <= 20
        ? "warning"
        : "healthy";

  return {
    remaining: remainingRaw,
    percentRemaining,
    percentUsed,
    status,
  };
}

function getBarColor(status: ReturnType<typeof getRemainingLifeMetrics>["status"]) {
  switch (status) {
    case "overdue":
      return "bg-black";
    case "critical":
      return "bg-red-500";
    case "warning":
      return "bg-amber-500";
    case "healthy":
      return "bg-emerald-500";
    default:
      return "bg-slate-400";
  }
}

export function RemainingLifeBar({ currentValue, limitValue, className }: RemainingLifeBarProps) {
  const metrics = getRemainingLifeMetrics(currentValue, limitValue);
  const percentText = Number.isFinite(metrics.percentRemaining)
    ? `${metrics.percentRemaining.toFixed(1)}%`
    : "—";

  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full transition-all", getBarColor(metrics.status))}
          style={{ width: `${metrics.percentUsed}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{percentText} remaining</span>
        <span>{metrics.remaining.toFixed(1)} remaining</span>
      </div>
    </div>
  );
}
