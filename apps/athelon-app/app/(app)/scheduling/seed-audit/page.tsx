"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { useRbac } from "@/hooks/useRbac";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldOff } from "lucide-react";

const PARTS_CONTRACT = {
  consumables_hardware: 18,
  powerplant_service: 12,
  airframe_brake_env: 10,
  avionics_electrical: 8,
  lifeLimited: 6,
  shelfLifeLimited: 10,
  serialized: 20,
  ownerSupplied: 2,
  lowStock: 6,
  pendingInspection: 4,
  quarantine: 4,
  removedPendingDisposition: 4,
  installed: 6,
  expiredShelfLife: 2,
  nearLifeLimit: 2,
  lifeExpiredInQuarantine: 1,
  pendingWithoutInspection: 4,
};

function severityRank(severity: string) {
  switch (severity) {
    case "critical": return 0;
    case "high": return 1;
    case "medium": return 2;
    case "low": return 3;
    default: return 4;
  }
}

function PassBadge({ pass }: { pass: boolean }) {
  return <Badge variant={pass ? "default" : "destructive"}>{pass ? "PASS" : "FAIL"}</Badge>;
}

export default function SeedAuditPage() {
  const { isLoaded } = useCurrentOrg();
  const { isAdmin } = useRbac();

  const coverage = useQuery(api.seedAudit.getRepairStationSeedCoverage, {});
  const gaps = useQuery(api.seedAudit.getSchedulerParityGaps, {});

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || coverage === undefined || gaps === undefined,
  });

  if (isLoaded && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <ShieldOff className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          The Seed Audit page is restricted to administrators. Contact your shop admin if you need access.
        </p>
      </div>
    );
  }

  const openGaps = useMemo(
    () => (gaps ?? []).filter((gap) => (gap.status ?? "open") !== "resolved"),
    [gaps],
  );
  const topGaps = useMemo(
    () => [...openGaps].sort((a, b) => severityRank(a.severity) - severityRank(b.severity)).slice(0, 8),
    [openGaps],
  );

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4" data-testid="page-loading-state">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Seed audit requires organization setup"
        missingInfo="Complete onboarding before running seed monitoring from the app."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!coverage || !gaps) return null;

  const countKeys = Object.keys(coverage.requiredCounts ?? {}) as Array<
    keyof typeof coverage.requiredCounts
  >;

  const familyRows = [
    ["consumables_hardware", PARTS_CONTRACT.consumables_hardware],
    ["powerplant_service", PARTS_CONTRACT.powerplant_service],
    ["airframe_brake_env", PARTS_CONTRACT.airframe_brake_env],
    ["avionics_electrical", PARTS_CONTRACT.avionics_electrical],
  ] as const;

  const edgeRows = [
    ["lifeLimited", PARTS_CONTRACT.lifeLimited],
    ["shelfLifeLimited", PARTS_CONTRACT.shelfLifeLimited],
    ["serialized", PARTS_CONTRACT.serialized],
    ["ownerSupplied", PARTS_CONTRACT.ownerSupplied],
    ["lowStock", PARTS_CONTRACT.lowStock],
    ["pendingInspection", PARTS_CONTRACT.pendingInspection],
    ["quarantine", PARTS_CONTRACT.quarantine],
    ["removedPendingDisposition", PARTS_CONTRACT.removedPendingDisposition],
    ["installed", PARTS_CONTRACT.installed],
    ["expiredShelfLife", PARTS_CONTRACT.expiredShelfLife],
    ["nearLifeLimit", PARTS_CONTRACT.nearLifeLimit],
    ["lifeExpiredInQuarantine", PARTS_CONTRACT.lifeExpiredInQuarantine],
    ["pendingWithoutInspection", PARTS_CONTRACT.pendingWithoutInspection],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Repair Station Seed Audit</h1>
          <p className="text-sm text-muted-foreground">
            Deterministic King Air/TBM scenario coverage and Scheduler parity gap tracking.
          </p>
        </div>
        <Badge variant={coverage.coveragePassFail?.pass ? "default" : "destructive"}>
          {coverage.coveragePassFail?.pass ? "Coverage PASS" : "Coverage FAIL"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Scenario</p>
            <p className="text-sm font-semibold mt-1">{coverage.scenarioKey}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Open Gaps</p>
            <p className="text-2xl font-semibold mt-1">{openGaps.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Resolved Gaps</p>
            <p className="text-2xl font-semibold mt-1">
              {(gaps ?? []).filter((gap) => (gap.status ?? "open") === "resolved").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Count Failures</p>
            <p className="text-2xl font-semibold mt-1">{coverage.coveragePassFail?.countFailures?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm">Coverage Counts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {countKeys.map((key) => {
            const required = coverage.requiredCounts[key];
            const actual = coverage.actualCounts[key];
            const pass = required === actual;
            return (
              <div key={key} className="flex items-center justify-between text-sm">
                <span>{key}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{actual} / {required}</span>
                  <PassBadge pass={pass} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm">Per-Location Scheduled Counts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(coverage.perLocationScheduledCounts ?? []).map((row) => {
              const pass = row.scheduled === 15;
              return (
                <div key={row.locationId} className="flex items-center justify-between text-sm">
                  <span>{row.locationCode}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{row.scheduled} / 15</span>
                    <PassBadge pass={pass} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm">Per-Location Tool Counts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(coverage.perLocationToolCounts ?? []).map((row) => {
              const pass = row.tools === 20;
              return (
                <div key={row.locationId} className="flex items-center justify-between text-sm">
                  <span>{row.locationCode}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{row.tools} / 20</span>
                    <PassBadge pass={pass} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm">Fleet Component Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(coverage.fleetComponentCoverage ?? []).map((row) => {
            const pass = row.engines === row.expected && row.propellers === row.expected;
            return (
              <div key={row.aircraftId} className="flex items-center justify-between text-sm">
                <span>{row.tailNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">E:{row.engines}/{row.expected} · P:{row.propellers}/{row.expected}</span>
                  <PassBadge pass={pass} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm">Parts Family Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {familyRows.map(([family, minimum]) => {
              const actual = coverage.partsUseCaseCoverage?.familyCounts?.[family] ?? 0;
              const pass = actual >= minimum;
              return (
                <div key={family} className="flex items-center justify-between text-sm">
                  <span>{family}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{actual} / {minimum}</span>
                    <PassBadge pass={pass} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm">Parts Edge Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {edgeRows.map(([metric, minimum]) => {
              const actual = coverage.partsUseCaseCoverage?.[metric] ?? 0;
              const pass = actual >= minimum;
              return (
                <div key={metric} className="flex items-center justify-between text-sm">
                  <span>{metric}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{actual} / {minimum}</span>
                    <PassBadge pass={pass} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm">Top Open Gaps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topGaps.length === 0 && (
            <p className="text-sm text-muted-foreground">No open gaps detected.</p>
          )}
          {topGaps.map((gap) => (
            <div key={gap.gapId} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{gap.gapId}</p>
                <Badge variant="outline">{gap.severity}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{gap.impact}</p>
              <p className="text-xs mt-2"><span className="font-medium">Recommended:</span> {gap.recommendedFix}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
