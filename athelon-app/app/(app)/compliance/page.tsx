"use client";

import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ShieldAlert,
  AlertTriangle,
  FileSearch,
  PlaneTakeoff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AircraftComplianceCard,
  type AircraftRow,
} from "./_components/AircraftComplianceCard";
import { FleetComplianceStats } from "./_components/FleetComplianceStats";

export default function CompliancePage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const fleet = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isFleetLoading = !isLoaded || fleet === undefined;

  // Show all aircraft — sorted alphabetically by registration.
  // Per-aircraft compliance status (non-compliant / due-soon / compliant) is computed
  // inside each AircraftComplianceCard via api.adCompliance.checkAdDueForAircraft.
  // Grouping by openWorkOrderCount is orthogonal to AD compliance and was misleading.
  const allAircraft = (fleet ?? []) as AircraftRow[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-muted-foreground" />
            AD Compliance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fleet-wide airworthiness directive compliance status
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-border/60 w-full sm:w-auto"
        >
          <Link to="/compliance/audit-trail">
            <FileSearch className="w-3.5 h-3.5" />
            Audit Trail
          </Link>
        </Button>
      </div>

      {/* Fleet stats */}
      {isFleetLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">
                14 CFR 39 — Airworthiness Directives
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                ADs are legally enforceable rules that correct unsafe conditions
                in aviation products. Non-compliance with an applicable AD
                renders the aircraft ineligible for return to service. The
                Athelon RTS gate blocks sign-off when overdue ADs are present
                for the aircraft.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fleet AD Compliance Status — all aircraft, sorted alphabetically.
          Each card queries and displays its own live compliance status.
          Non-compliant aircraft show a red left border; due-soon amber; compliant green. */}
      {isFleetLoading && (
        <div className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-4">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!isFleetLoading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Fleet AD Compliance Status
            </h2>
            <Badge variant="secondary" className="text-[10px] bg-muted">
              {allAircraft.length}
            </Badge>
          </div>

          {allAircraft.length === 0 ? (
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
          ) : (
            <div className="space-y-2">
              {allAircraft.map((aircraft) => (
                <AircraftComplianceCard
                  key={aircraft._id}
                  aircraft={aircraft}
                  orgId={orgId!}
                />
              ))}
            </div>
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
                <Link
                  to="/compliance/audit-trail"
                  className="flex items-start gap-3"
                >
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
                <Link to="/fleet" className="flex items-start gap-3">
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
