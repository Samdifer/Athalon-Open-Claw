"use client";

import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AircraftRow {
  _id: Id<"aircraft">;
  make: string;
  model: string;
  currentRegistration?: string;
  totalTimeAirframeHours: number;
  status: string;
  openWorkOrderCount: number;
  operatingOrganizationId?: Id<"organizations">;
}

interface AircraftComplianceCardProps {
  aircraft: AircraftRow;
  orgId: Id<"organizations">;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AircraftComplianceCard({
  aircraft,
  orgId,
}: AircraftComplianceCardProps) {
  const tailNumber = aircraft.currentRegistration ?? "—";
  const reg = aircraft.currentRegistration;

  const compliance = useQuery(
    api.adCompliance.checkAdDueForAircraft,
    reg ? { aircraftId: aircraft._id, organizationId: orgId } : "skip",
  );

  const summary = compliance?.summary;
  const isLoading = compliance === undefined;
  const noData = compliance === null;

  // Determine overall compliance status
  type ComplianceStatus = "overdue" | "due_soon" | "pending" | "ok" | "unknown";
  let complianceStatus: ComplianceStatus = "unknown";
  if (!isLoading && !noData && summary) {
    if (summary.overdueCount > 0) complianceStatus = "overdue";
    else if (summary.notCompliedCount > 0) complianceStatus = "overdue";
    else if (summary.pendingDeterminationCount > 0) complianceStatus = "pending";
    else if (summary.dueSoonCount > 0) complianceStatus = "due_soon";
    else complianceStatus = "ok";
  }

  const statusConfig = {
    overdue: {
      label: "Non-Compliant",
      badge: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
      icon: ShieldAlert,
      iconColor: "text-red-600 dark:text-red-400",
      borderLeft: "border-l-red-500",
    },
    due_soon: {
      label: "Due Soon",
      badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      icon: Clock,
      iconColor: "text-amber-600 dark:text-amber-400",
      borderLeft: "border-l-amber-500",
    },
    pending: {
      label: "Pending Review",
      badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
      icon: AlertTriangle,
      iconColor: "text-orange-600 dark:text-orange-400",
      borderLeft: "border-l-orange-500",
    },
    ok: {
      label: "Compliant",
      badge: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
      icon: ShieldCheck,
      iconColor: "text-green-600 dark:text-green-400",
      borderLeft: "border-l-transparent",
    },
    unknown: {
      label: "Not Configured",
      badge: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
      icon: Info,
      iconColor: "text-muted-foreground",
      borderLeft: "border-l-transparent",
    },
  };

  const cfg = statusConfig[complianceStatus];
  const StatusIcon = cfg.icon;

  // If registration is undefined, link to aircraft ID-based fallback — /fleet/— is a 404
  const fleetHref = aircraft.currentRegistration
    ? `/fleet/${encodeURIComponent(aircraft.currentRegistration)}`
    : `/fleet/${aircraft._id}`;

  return (
    <Link to={fleetHref}>
      <Card
        className={`border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer border-l-2 ${cfg.borderLeft}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Status icon */}
            <div className="flex-shrink-0">
              <StatusIcon className={`w-5 h-5 ${cfg.iconColor}`} />
            </div>

            {/* Aircraft info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-mono font-bold text-base text-foreground">
                  {tailNumber}
                </span>
                <span className="text-sm text-muted-foreground">
                  {aircraft.make} {aircraft.model}
                </span>
                {aircraft.openWorkOrderCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] h-4 px-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                  >
                    {aircraft.openWorkOrderCount} open WO
                  </Badge>
                )}
              </div>

              {/* Compliance metrics */}
              {isLoading ? (
                <div className="flex gap-3 mt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : noData || !summary ? (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No compliance records
                </p>
              ) : (
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">
                    {summary.total} tracked AD{summary.total !== 1 ? "s" : ""}
                  </span>
                  {summary.overdueCount > 0 && (
                    <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                      {summary.overdueCount} overdue
                    </span>
                  )}
                  {summary.dueSoonCount > 0 && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                      {summary.dueSoonCount} due soon
                    </span>
                  )}
                  {summary.pendingDeterminationCount > 0 && (
                    <span className="text-[11px] text-orange-600 dark:text-orange-400">
                      {summary.pendingDeterminationCount} pending review
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {aircraft.totalTimeAirframeHours.toFixed(1)} hrs TT
                  </span>
                </div>
              )}
            </div>

            {/* Right: status badge + arrow */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <Badge
                  variant="outline"
                  className={`text-[10px] border font-medium ${cfg.badge}`}
                >
                  {cfg.label}
                </Badge>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
