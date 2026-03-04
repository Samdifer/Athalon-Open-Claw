"use client";

import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DiamondTier = "none" | "bronze" | "silver" | "gold";

export type DiamondProgressInput = {
  technicianName: string;
  eligibleHours: number;
  nonEligibleHours: number;
  tier: DiamondTier;
  nextTierTargetHours: number;
};

const TIER_STYLES: Record<DiamondTier, string> = {
  none: "bg-muted text-muted-foreground border-border",
  bronze: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  silver: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  gold: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
};

const TIER_LABELS: Record<DiamondTier, string> = {
  none: "None",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

const TIER_FLOORS: Record<DiamondTier, number> = {
  none: 0,
  bronze: 16,
  silver: 40,
  gold: 80,
};

function clampPct(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function DiamondAwardProgress({ data }: { data: DiamondProgressInput }) {
  const floor = TIER_FLOORS[data.tier];
  const range = data.nextTierTargetHours - floor;
  const progressPct =
    data.tier === "gold" ? 100 : range <= 0 ? 100 : clampPct(((data.eligibleHours - floor) / range) * 100);
  const remaining = Math.max(0, data.nextTierTargetHours - data.eligibleHours);

  const radius = 48;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-3">
          <span className="truncate">{data.technicianName}</span>
          <Badge variant="outline" className={cn("text-[11px]", TIER_STYLES[data.tier])}>
            {TIER_LABELS[data.tier]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative h-28 w-28 shrink-0">
            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120" aria-hidden>
              <circle cx="60" cy="60" r={radius} stroke="currentColor" strokeWidth={stroke} className="text-muted/30" fill="none" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#3b82f6"
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold">{data.eligibleHours.toFixed(1)}h</span>
              <span className="text-[11px] text-muted-foreground">Eligible</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground">
              Toward next tier: <span className="font-medium text-foreground">{progressPct.toFixed(0)}%</span>
            </p>
            <p className="text-muted-foreground">
              Eligible hours: <span className="font-medium text-foreground">{data.eligibleHours.toFixed(1)}h</span>
            </p>
            <p className="text-muted-foreground">
              Non-eligible hours: <span className="font-medium text-foreground">{data.nonEligibleHours.toFixed(1)}h</span>
            </p>
            <p className="text-muted-foreground">
              {data.tier === "gold"
                ? "Top tier achieved"
                : `${remaining.toFixed(1)}h needed to reach ${data.nextTierTargetHours}h`}
            </p>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="h-8 text-xs w-full">
          <Link to="/personnel/training">View Training Records</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
