"use client";

import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  PlaneTakeoff,
  ClipboardList,
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
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

export default function CompliancePage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const fleet = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isFleetLoading = !isLoaded || fleet === undefined;
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: isFleetLoading,
  });

  // Show all aircraft — sorted alphabetically by registration.
  // Per-aircraft compliance status (non-compliant / due-soon / compliant) is computed
  // inside each AircraftComplianceCard via api.adCompliance.checkAdDueForAircraft.
  // We sort alphabetically here; the audit-trail page provides compliance-tier sort.
  // BH-005: Previously the comment said "sorted alphabetically" but no .sort() was
  // applied — fleet returned in database insertion order (undefined order).
  const allAircraft = [...(fleet ?? [])].sort((a, b) =>
    (a.currentRegistration ?? "").localeCompare(b.currentRegistration ?? ""),
  ) as AircraftRow[];

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-6" data-testid="page-loading-state">
        {/* BUG-QCM-C15: Loading skeleton had 4 cards in a 4-column grid, but
            FleetComplianceStats renders 5 cards in a 5-column grid (lg:grid-cols-5).
            When the page finished loading, the layout shifted from 4 to 5 columns.
            This caused a jarring reflow: the stat cards would jump and reposition.
            A QCM landing here during a slow query would see the layout reorganize
            unexpectedly, making it look like the page glitched. Fix: 5 skeletons
            in a 5-column grid to match the resolved state exactly. */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Compliance tracking requires organization setup"
        missingInfo="Complete onboarding before monitoring AD compliance."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !fleet) return null;

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
      <FleetComplianceStats fleet={fleet} orgId={orgId} />

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
          <ActionableEmptyState
            title="No aircraft registered"
            missingInfo="Add aircraft to your fleet before tracking AD compliance and due items."
            primaryActionLabel="Add Aircraft"
            primaryActionType="link"
            primaryActionTarget="/fleet"
          />
        ) : (
          <div className="space-y-2">
            {allAircraft.map((aircraft) => (
              <AircraftComplianceCard
                key={aircraft._id}
                aircraft={aircraft}
                orgId={orgId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      {(fleet ?? []).length > 0 && (
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
                    {/* BH-007: Previous description "Review all signed maintenance
                        events" was misleading — the audit-trail page shows per-aircraft
                        AD compliance detail with overdue/due-soon drill-down, not a
                        chronological maintenance event log. */}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Per-aircraft AD compliance detail and due-date drill-down
                    </p>
                  </div>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="justify-start h-auto py-3 px-4 border-border/60"
              >
                <Link to="/compliance/ad-sb" className="flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-xs font-medium">AD/SB Tracking</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Detailed AD/SB compliance records and filters
                    </p>
                  </div>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="justify-start h-auto py-3 px-4 border-border/60"
              >
                <Link to="/compliance/qcm-review" className="flex items-start gap-3">
                  <ClipboardList className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-xs font-medium">QCM Review</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      IA sign-off queue and WO close readiness
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
