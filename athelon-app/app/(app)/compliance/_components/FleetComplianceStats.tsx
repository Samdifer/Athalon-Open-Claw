"use client";

/**
 * FleetComplianceStats.tsx
 *
 * Fleet-wide compliance stat cards shown at the top of the AD Compliance page.
 *
 * Phase F enhancement: adds a 5th stat card showing fleet-wide AD compliance
 * posture (overdue ADs + aircraft with issues) using the getFleetAdSummary
 * Convex query. This makes the stats row genuinely useful for the DOM —
 * the previous version only showed fleet status counts with no AD data.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  PlaneTakeoff,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FleetAircraft {
  _id: Id<"aircraft">;
  status: string;
  openWorkOrderCount: number;
}

interface FleetComplianceStatsProps {
  fleet: FleetAircraft[];
  orgId: Id<"organizations">;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function FleetComplianceStats({ fleet, orgId }: FleetComplianceStatsProps) {
  const airworthy = fleet.filter((a) => a.status === "airworthy").length;
  const inMaint = fleet.filter((a) => a.status === "in_maintenance").length;
  const totalOpen = fleet.reduce((sum, a) => sum + a.openWorkOrderCount, 0);

  // Phase F: AD compliance summary from Convex
  const adSummary = useQuery(api.adCompliance.getFleetAdSummary, {
    organizationId: orgId,
  });
  const adSummaryLoading = adSummary === undefined;

  const overdueAds = adSummary?.fleetTotals.overdueAds ?? 0;
  const pendingAds = adSummary?.fleetTotals.pendingAds ?? 0;
  const aircraftWithIssues = adSummary?.fleetTotals.aircraftWithIssues ?? 0;
  const adIssueCount = overdueAds + pendingAds;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Fleet Size */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Fleet Size
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {fleet.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                aircraft
              </p>
            </div>
            <div className="p-2 rounded-lg bg-muted/40">
              <PlaneTakeoff className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Airworthy */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Airworthy
              </p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {airworthy}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                in-service
              </p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* In Maintenance */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                In Maintenance
              </p>
              <p className="text-2xl font-bold text-sky-400 mt-1">{inMaint}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                aircraft
              </p>
            </div>
            <div className="p-2 rounded-lg bg-sky-500/10">
              <AlertTriangle className="w-4 h-4 text-sky-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Work Orders */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Open Work Orders
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {totalOpen}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                fleet-wide
              </p>
            </div>
            <div className="p-2 rounded-lg bg-muted/40">
              <FileSearch className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AD Issues (Phase F) */}
      <Card
        className={`border-border/60 ${
          adIssueCount > 0
            ? "border-red-500/30 bg-red-500/5"
            : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                AD Issues
              </p>
              {adSummaryLoading ? (
                <Skeleton className="h-8 w-10 mt-1" />
              ) : (
                <p
                  className={`text-2xl font-bold mt-1 ${
                    adIssueCount > 0 ? "text-red-400" : "text-foreground"
                  }`}
                >
                  {adIssueCount}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {adSummaryLoading
                  ? "loading…"
                  : adIssueCount > 0
                    ? `${aircraftWithIssues} aircraft affected`
                    : "all compliant"}
              </p>
            </div>
            <div
              className={`p-2 rounded-lg ${
                adIssueCount > 0 ? "bg-red-500/10" : "bg-muted/40"
              }`}
            >
              <ShieldAlert
                className={`w-4 h-4 ${
                  adIssueCount > 0 ? "text-red-400" : "text-muted-foreground"
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
