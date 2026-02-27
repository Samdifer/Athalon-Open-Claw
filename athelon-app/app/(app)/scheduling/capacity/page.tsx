"use client";

import { AlertTriangle, BarChart3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round1(n: number): string {
  return n.toFixed(1);
}

function utilizationColor(pct: number): string {
  if (pct > 100) return "bg-red-500";
  if (pct > 85) return "bg-amber-500";
  return "bg-emerald-500";
}

function utilizationTextColor(pct: number): string {
  if (pct > 100) return "text-red-600 dark:text-red-400";
  if (pct > 85) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CapacitySkeleton() {
  return (
    <div className="space-y-5">
      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Table skeleton */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

function StatCard({ label, value, sub, valueClass }: StatCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className={`text-2xl font-semibold tabular-nums ${valueClass ?? "text-foreground"}`}>
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CapacityPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const utilization = useQuery(
    api.capacity.getCapacityUtilization,
    orgId ? { organizationId: orgId, periodWeeks: 4 } : "skip",
  );

  if (!isLoaded || utilization === undefined) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-56 mb-1" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <CapacitySkeleton />
      </div>
    );
  }

  const {
    totalAvailableHours,
    committedHours,
    utilizationPercent,
    bufferPercent,
    isOverCapacity,
    isNearBuffer,
    byTechnician,
  } = utilization;

  const bufferBarWidth = Math.min(utilizationPercent, 100);

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            Capacity — Next 4 Weeks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Available and committed hours across all active technicians.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/personnel">
            Adjust Shifts
          </Link>
        </Button>
      </div>

      {/* ── Warning Banner ─────────────────────────────────────────────── */}
      {(isNearBuffer || isOverCapacity) && (
        <div
          className={`rounded-lg border p-4 flex items-start gap-3 ${
            isOverCapacity
              ? "border-red-500/40 bg-red-500/8"
              : "border-amber-500/40 bg-amber-500/8"
          }`}
          aria-live="polite"
        >
          <AlertTriangle
            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              isOverCapacity
                ? "text-red-600 dark:text-red-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          />
          <div>
            <p
              className={`text-sm font-semibold ${
                isOverCapacity
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {isOverCapacity ? "Over Capacity" : "Near Capacity"} — Committed
              hours exceed {isOverCapacity ? "available" : "buffer"} capacity.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review task assignments or adjust technician shifts.
            </p>
          </div>
        </div>
      )}

      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Available"
          value={`${round1(totalAvailableHours)}h`}
          sub="Total shift hours"
        />
        <StatCard
          label="Committed"
          value={`${round1(committedHours)}h`}
          sub="Assigned task hours"
        />
        <StatCard
          label="Utilization"
          value={`${utilizationPercent}%`}
          sub={isOverCapacity ? "Over capacity" : isNearBuffer ? "Near buffer" : "On track"}
          valueClass={utilizationTextColor(utilizationPercent)}
        />
        <StatCard
          label="Buffer"
          value={`${bufferPercent}%`}
          sub="Reserved capacity"
          valueClass="text-muted-foreground"
        />
      </div>

      {/* ── Per-Tech Table ─────────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            By Technician
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {byTechnician.length === 0 ? (
            <div className="py-12 text-center px-4">
              <Users className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No active technicians found. Add technicians in{" "}
                <Link
                  to="/personnel"
                  className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Personnel
                </Link>{" "}
                to see capacity.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {byTechnician.map((tech) => {
                const barPct = Math.min(tech.utilizationPercent, 100);
                const barColor = utilizationColor(tech.utilizationPercent);
                const labelColor = utilizationTextColor(tech.utilizationPercent);

                return (
                  <div
                    key={tech.technicianId}
                    className="px-4 py-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      {/* Name + hours */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">
                          {tech.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">
                          {round1(tech.assignedEstimatedHours)}h /{" "}
                          {round1(tech.availableHours)}h
                        </span>
                      </div>
                      {/* Utilization % label */}
                      <span
                        className={`text-xs font-semibold tabular-nums flex-shrink-0 ${labelColor}`}
                      >
                        {tech.utilizationPercent}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
