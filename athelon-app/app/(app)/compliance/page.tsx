"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  PlaneTakeoff,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Aircraft Compliance Card ─────────────────────────────────────────────────
// Renders compliance status for a single aircraft.
// Calls checkAdDueForAircraft independently so hooks rules are satisfied.

interface AircraftRow {
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

function AircraftComplianceCard({ aircraft, orgId }: AircraftComplianceCardProps) {
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
    else if (summary.total > 0) complianceStatus = "ok";
    else complianceStatus = "ok"; // No ADs = no issues
  }

  const statusConfig = {
    overdue: {
      label: "Non-Compliant",
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: ShieldAlert,
      iconColor: "text-red-400",
      borderLeft: "border-l-red-500",
    },
    due_soon: {
      label: "Due Soon",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: Clock,
      iconColor: "text-amber-400",
      borderLeft: "border-l-amber-500",
    },
    pending: {
      label: "Pending Review",
      badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      icon: AlertTriangle,
      iconColor: "text-orange-400",
      borderLeft: "border-l-orange-500",
    },
    ok: {
      label: "Compliant",
      badge: "bg-green-500/15 text-green-400 border-green-500/30",
      icon: ShieldCheck,
      iconColor: "text-green-400",
      borderLeft: "border-l-transparent",
    },
    unknown: {
      label: "Not Configured",
      badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      icon: Info,
      iconColor: "text-muted-foreground",
      borderLeft: "border-l-transparent",
    },
  };

  const cfg = statusConfig[complianceStatus];
  const StatusIcon = cfg.icon;

  return (
    <Link href={`/fleet/${tailNumber}`}>
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
                    className="text-[9px] h-4 px-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/20"
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
                    <span className="text-[11px] text-red-400 font-medium">
                      {summary.overdueCount} overdue
                    </span>
                  )}
                  {summary.dueSoonCount > 0 && (
                    <span className="text-[11px] text-amber-400">
                      {summary.dueSoonCount} due soon
                    </span>
                  )}
                  {summary.pendingDeterminationCount > 0 && (
                    <span className="text-[11px] text-orange-400">
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

// ─── Fleet Compliance Summary ─────────────────────────────────────────────────
// Aggregated counts from all aircraft queries. Uses a separate component
// so it only renders when fleet data is loaded.

interface FleetSummaryProps {
  fleet: AircraftRow[];
  orgId: Id<"organizations">;
}

function FleetComplianceStats({ fleet, orgId }: FleetSummaryProps) {
  // Query compliance for all aircraft (each is its own hook call via sub-component
  // pattern — this component intentionally calls N hooks for N aircraft).
  // For fleet sizes >20, this would need pagination but small Part 145 shops are fine.

  // We aggregate in the parent page via AircraftComplianceCard-level data.
  // For the stat row we show simple fleet counts from aircraft status.

  const airworthy = fleet.filter((a) => a.status === "airworthy").length;
  const inMaint = fleet.filter((a) => a.status === "in_maintenance").length;
  const outOfService = fleet.filter(
    (a) => a.status === "out_of_service",
  ).length;

  const totalOpen = fleet.reduce((sum, a) => sum + a.openWorkOrderCount, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                In Maintenance
              </p>
              <p className="text-2xl font-bold text-sky-400 mt-1">
                {inMaint}
              </p>
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
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const fleet = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isFleetLoading = !isLoaded || fleet === undefined;

  // Split fleet into buckets for the UI
  const nonCompliant = (fleet ?? []).filter((a) => {
    // We can't access per-aircraft compliance data here because hooks must be in
    // sub-components. We sort aircraft with open WOs first as a proxy.
    return a.openWorkOrderCount > 0;
  });

  const noOpenWo = (fleet ?? []).filter((a) => a.openWorkOrderCount === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-muted-foreground" />
            AD Compliance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fleet-wide airworthiness directive compliance status
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border/60">
          <Link href="/compliance/audit-trail">
            <FileSearch className="w-3.5 h-3.5" />
            Audit Trail
          </Link>
        </Button>
      </div>

      {/* Fleet stats */}
      {isFleetLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <FleetComplianceStats fleet={fleet ?? []} orgId={orgId!} />
      )}

      {/* Regulatory notice */}
      <Card className="border-border/40 bg-amber-500/5 border-l-2 border-l-amber-500">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">
                14 CFR 39 — Airworthiness Directives
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                ADs are legally enforceable rules that correct unsafe conditions in
                aviation products. Non-compliance with an applicable AD renders the
                aircraft ineligible for return to service. The Athelon RTS gate blocks
                sign-off when overdue ADs are present for the aircraft.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aircraft with active work */}
      {!isFleetLoading && nonCompliant.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Aircraft with Active Work Orders
            </h2>
            <Badge
              variant="secondary"
              className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20"
            >
              {nonCompliant.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {nonCompliant.map((aircraft) => (
              <AircraftComplianceCard
                key={aircraft._id}
                aircraft={aircraft}
                orgId={orgId!}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rest of fleet */}
      {!isFleetLoading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {nonCompliant.length > 0 ? "Other Fleet Aircraft" : "All Fleet Aircraft"}
            </h2>
            {isFleetLoading ? (
              <Skeleton className="h-4 w-8" />
            ) : (
              <Badge variant="secondary" className="text-[10px] bg-muted">
                {noOpenWo.length > 0 ? noOpenWo.length : (fleet ?? []).length}
              </Badge>
            )}
          </div>

          {isFleetLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border/60">
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (noOpenWo.length === 0 && nonCompliant.length > 0) ? null : (
            <div className="space-y-2">
              {(noOpenWo.length > 0 ? noOpenWo : fleet ?? []).map((aircraft) => (
                <AircraftComplianceCard
                  key={aircraft._id}
                  aircraft={aircraft}
                  orgId={orgId!}
                />
              ))}
            </div>
          )}

          {!isFleetLoading && (fleet ?? []).length === 0 && (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center">
                <PlaneTakeoff className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No aircraft registered
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Add aircraft to your fleet to track AD compliance.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick links */}
      {!isFleetLoading && (fleet ?? []).length > 0 && (
        <>
          <Separator className="opacity-40" />
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Compliance Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                asChild
                variant="outline"
                className="justify-start h-auto py-3 px-4 border-border/60"
              >
                <Link href="/compliance/audit-trail" className="flex items-start gap-3">
                  <FileSearch className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-xs font-medium">Audit Trail</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Review all signed maintenance events
                    </p>
                  </div>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="justify-start h-auto py-3 px-4 border-border/60"
              >
                <Link href="/fleet" className="flex items-start gap-3">
                  <PlaneTakeoff className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-xs font-medium">Fleet Management</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Manage aircraft and per-aircraft AD records
                    </p>
                  </div>
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
