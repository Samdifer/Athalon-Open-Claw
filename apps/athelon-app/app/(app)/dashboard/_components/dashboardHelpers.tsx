import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

// ─── Status label map ─────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  in_progress: "In Progress",
  pending_signoff: "Pending Sign-Off",
  on_hold: "On Hold",
  closed: "Closed",
  voided: "Voided",
  cancelled: "Cancelled",
};

// ─── KPI Sparkline ──────────────────────────────────────────────────────────

export function MiniSparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  const gradId = `grad-${id}-${color}`;
  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Status badge helper ──────────────────────────────────────────────────────

export function getStatusBadge(status: string, label: string, priority?: string) {
  if (priority === "aog")
    return (
      <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 font-medium text-[10px]">
        AOG
      </Badge>
    );
  const map: Record<string, string> = {
    open: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    in_progress: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    pending_inspection: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    pending_signoff: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    open_discrepancies: "bg-red-500/15 text-red-400 border border-red-500/30",
    on_hold: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    draft: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
    closed: "bg-green-500/15 text-green-400 border border-green-500/30",
    cancelled: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
    voided: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
  };
  return (
    <Badge
      variant="outline"
      className={`font-medium text-[10px] ${map[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {label}
    </Badge>
  );
}

// ─── Severity styles ──────────────────────────────────────────────────────────

export function getSeverityStyles(severity: string) {
  const map: Record<string, { border: string; icon: string; bg: string }> = {
    critical: {
      border: "border-l-red-500",
      icon: "text-red-400",
      bg: "bg-red-500/5",
    },
    warning: {
      border: "border-l-amber-500",
      icon: "text-amber-400",
      bg: "bg-amber-500/5",
    },
    info: {
      border: "border-l-sky-500",
      icon: "text-sky-400",
      bg: "bg-sky-500/5",
    },
  };
  return map[severity] ?? map["info"]!;
}

// ─── Active WO status filter ──────────────────────────────────────────────────

export const ACTIVE_STATUSES = [
  "open",
  "in_progress",
  "on_hold",
  "pending_inspection",
  "pending_signoff",
  "open_discrepancies",
] as const;

export function isActiveStatus(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}
