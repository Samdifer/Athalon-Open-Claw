"use client";

import { cn } from "@/lib/utils";

type AuditScoreBand = "green" | "yellow" | "red";

export type WeightedScoreInput = {
  label: string;
  score: number;
  weight: number;
};

function getBand(score: number): AuditScoreBand {
  if (score >= 90) return "green";
  if (score >= 70) return "yellow";
  return "red";
}

const bandStyles: Record<AuditScoreBand, { text: string; stroke: string; ring: string }> = {
  green: {
    text: "text-emerald-500",
    stroke: "#10b981",
    ring: "bg-emerald-500/10 border-emerald-500/30",
  },
  yellow: {
    text: "text-amber-500",
    stroke: "#f59e0b",
    ring: "bg-amber-500/10 border-amber-500/30",
  },
  red: {
    text: "text-rose-500",
    stroke: "#f43f5e",
    ring: "bg-rose-500/10 border-rose-500/30",
  },
};

export function AuditReadinessScore({ metrics }: { metrics: WeightedScoreInput[] }) {
  const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0) || 1;
  const weighted = metrics.reduce((sum, m) => sum + m.score * m.weight, 0) / totalWeight;
  const score = Math.max(0, Math.min(100, Math.round(weighted)));

  const band = getBand(score);
  const radius = 56;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("rounded-lg border p-5", bandStyles[band].ring)}>
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall Audit Readiness Score</p>
          <p className="mt-1 text-sm text-muted-foreground">Weighted across training, calibration, ADs, QCM, documentation, and discrepancies.</p>
        </div>

        <div className="relative h-36 w-36 shrink-0">
          <svg className="h-36 w-36 -rotate-90" viewBox="0 0 140 140" aria-hidden>
            <circle cx="70" cy="70" r={radius} stroke="currentColor" strokeWidth={stroke} className="text-muted/30" fill="none" />
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke={bandStyles[band].stroke}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold", bandStyles[band].text)}>{score}%</span>
            <span className="text-[11px] text-muted-foreground">Readiness</span>
          </div>
        </div>
      </div>
    </div>
  );
}
