"use client";

import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  ChevronDown,
  Minus,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

type StatusFilter = "all" | "compliant" | "due_soon" | "overdue" | "not_applicable" | "pending";

function statusBadge(status: string, isOverdue?: boolean, isDueSoon?: boolean) {
  if (status === "not_applicable") {
    return <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">N/A</Badge>;
  }
  if (status === "superseded") {
    return <Badge variant="secondary" className="text-[10px]">Superseded</Badge>;
  }
  // BUG-QCM-1: Previously both `not_complied` and `isOverdue` returned an identical "Overdue"
  // destructive badge. These are meaningfully different:
  //   • not_complied = AD was never performed (e.g. AD issued, applicability confirmed, work not done)
  //   • isOverdue    = recurring AD compliance interval exceeded (last done X, due date passed)
  // On the audit trail page this was already corrected (BUG-QCM-AT-001). A QCM inspector
  // switching between the two pages saw "Not Complied" in one view and "Overdue" in the other
  // for the exact same AD record — undermining confidence in both pages.
  // Now: not_complied = red "Not Complied" badge, overdue due-date = red "Overdue" badge.
  if (status === "not_complied") {
    return <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30">Not Complied</Badge>;
  }
  if (isOverdue) {
    return <Badge variant="destructive" className="text-[10px]">Overdue</Badge>;
  }
  if (isDueSoon) {
    return <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Due Soon</Badge>;
  }
  if (status === "pending_determination") {
    return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
  }
  return <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Compliant</Badge>;
}

export default function AdSbCompliancePage() {
  const { orgId, isLoaded } = useCurrentOrg();
  // BUG-QCM-003: Read ?aircraft=<id> from the URL so that links from the
  // AircraftComplianceCard (on the main Compliance page) can pre-select a
  // specific aircraft and land the QCM inspector directly at that aircraft's
  // AD records — instead of requiring a second dropdown interaction.
  const [searchParams] = useSearchParams();
  const initialAircraft = searchParams.get("aircraft") ?? "all";
  const [selectedAircraft, setSelectedAircraft] = useState<string>(initialAircraft);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fleetSummary = useQuery(
    api.adCompliance.getFleetAdSummary,
    orgId ? { organizationId: orgId } : "skip",
  );

  const aircraft = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const aircraftRecords = useQuery(
    api.adCompliance.listAdRecordsForAircraft,
    orgId && selectedAircraft !== "all"
      ? {
          aircraftId: selectedAircraft as Id<"aircraft">,
          organizationId: orgId,
        }
      : "skip",
  );

  // Build a flat table of all records when viewing all aircraft
  // For "all" view, we show fleet summary; for specific aircraft, we show records
  const isLoading =
    !isLoaded ||
    fleetSummary === undefined ||
    aircraft === undefined ||
    (selectedAircraft !== "all" && aircraftRecords === undefined);
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: isLoading,
  });

  const totals = fleetSummary?.fleetTotals;

  // Aircraft lookup
  const aircraftMap = useMemo(() => {
    const m = new Map<string, { registration: string; make: string; model: string }>();
    for (const a of aircraft ?? []) {
      m.set(a._id, {
        registration: a.currentRegistration ?? "N/A",
        make: a.make ?? "",
        model: a.model ?? "",
      });
    }
    return m;
  }, [aircraft]);

  // Filter aircraft summaries for fleet view — status filter applies to both views
  const filteredFleetSummaries = useMemo(() => {
    const summaries = fleetSummary?.aircraftSummaries ?? [];
    if (statusFilter === "all") return summaries;
    return summaries.filter((s) => {
      // notCompliedCount may not be in the TypeScript surface yet — access via cast.
      const notCompliedCount = (s as unknown as Record<string, number>)["notCompliedCount"] ?? 0;
      if (statusFilter === "overdue") return s.overdueCount > 0 || notCompliedCount > 0;
      if (statusFilter === "due_soon") return s.dueSoonCount > 0 && s.overdueCount === 0 && notCompliedCount === 0;
      if (statusFilter === "compliant") {
        // BUG-QCM-F2: Previously omitted notCompliedCount check. An aircraft with
        // overdueCount:0, dueSoonCount:0, pendingCount:0 but notCompliedCount:3
        // (3 ADs that were never performed) was returned as "Compliant". These are
        // actively non-compliant aircraft that block RTS. Now explicitly excluded.
        return s.overdueCount === 0 && notCompliedCount === 0 && s.dueSoonCount === 0 && s.pendingCount === 0 && s.total > 0;
      }
      if (statusFilter === "pending") return s.pendingCount > 0;
      if (statusFilter === "not_applicable") return false; // N/A is a record-level concept, not aircraft-level
      return true;
    });
  }, [fleetSummary, statusFilter]);

  // Filter records for per-aircraft view
  const filteredRecords = useMemo(() => {
    if (!aircraftRecords) return [];
    const now = Date.now();
    const threshold = 30 * 24 * 60 * 60 * 1000;
    return aircraftRecords.filter((r) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "not_applicable") return r.complianceStatus === "not_applicable";
      if (statusFilter === "pending") return r.complianceStatus === "pending_determination";
      if (statusFilter === "overdue") {
        // BUG-QCM-F1: Previously only matched r.complianceStatus === "not_complied".
        // But the "Overdue" badge also renders for records where the next due DATE
        // has already passed (recurring AD interval exceeded, status still
        // "complied_recurring"). A QCM filtering for "overdue" was missing all
        // date-based overruns — only seeing records that were NEVER performed.
        // Now includes both: not_complied (never performed) AND date-overruns
        // (nextDueDate passed on a recurring AD that was last done years ago).
        const isDueDateOverrun =
          r.complianceStatus !== "not_complied" &&
          r.nextDueDate != null &&
          r.nextDueDate < now &&
          r.applicable;
        return r.complianceStatus === "not_complied" || isDueDateOverrun;
      }
      if (statusFilter === "compliant") {
        return r.complianceStatus === "complied_one_time" || r.complianceStatus === "complied_recurring";
      }
      if (statusFilter === "due_soon") {
        return (
          r.applicable &&
          r.nextDueDate != null &&
          r.nextDueDate >= now &&
          r.nextDueDate <= now + threshold
        );
      }
      return true;
    });
  }, [aircraftRecords, statusFilter]);

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-5" data-testid="page-loading-state">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="AD/SB tracking requires organization setup"
        missingInfo="Complete onboarding before reviewing compliance records."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !fleetSummary || !aircraft) return null;

  if (aircraft.length === 0) {
    return (
      <ActionableEmptyState
        title="No aircraft available for AD/SB tracking"
        missingInfo="Add at least one aircraft to begin compliance tracking and due-date monitoring."
        primaryActionLabel="Add Aircraft"
        primaryActionType="link"
        primaryActionTarget="/fleet"
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-muted-foreground" />
          AD/SB Compliance Tracking
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Airworthiness Directive and Service Bulletin compliance status across the fleet
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Compliant
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totals?.compliantAds ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Due Soon
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {totals?.dueSoonAds ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Overdue
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {totals?.overdueAds ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Minus className="w-3.5 h-3.5" />
              Pending
            </div>
            <p className="text-2xl font-bold">
              {totals?.pendingAds ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Filters:</span>
        </div>
        <Select
          value={selectedAircraft}
          onValueChange={(v) => {
            setSelectedAircraft(v);
            // Reset status filter when switching aircraft — avoids "no results" confusion
            // when an overdue-filtered view from one aircraft carries over to another
            setStatusFilter("all");
          }}
        >
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="All Aircraft" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Aircraft (Fleet View)</SelectItem>
            {(aircraft ?? []).map((a) => (
              <SelectItem key={a._id} value={a._id}>
                {a.currentRegistration ?? a._id.slice(-6)} — {a.make} {a.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="due_soon">Due Soon</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            {/* BUG-QCM-002: "N/A" is a record-level classification — an individual
                AD can be N/A for a specific aircraft, but no aircraft as a whole is
                "N/A". In fleet view, selecting N/A returned 0 aircraft every time
                with a confusing "No aircraft match" message. Hide this option when
                in fleet view; it remains available (and useful) per-aircraft. */}
            {selectedAircraft !== "all" && (
              <SelectItem value="not_applicable">N/A</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Fleet View (all aircraft) */}
      {selectedAircraft === "all" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Fleet AD Compliance by Aircraft</span>
              {statusFilter !== "all" && (
                <span className="text-xs font-normal text-muted-foreground">
                  {filteredFleetSummaries.length} of {(fleetSummary.aircraftSummaries ?? []).length} aircraft
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(fleetSummary.aircraftSummaries ?? []).length === 0 ? (
              <ActionableEmptyState
                title="No AD compliance records tracked yet"
                missingInfo="Start with fleet records and compliance events to populate this dashboard."
                primaryActionLabel="Open Fleet"
                primaryActionType="link"
                primaryActionTarget="/fleet"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Aircraft</TableHead>
                    <TableHead className="text-xs text-center">Tracked</TableHead>
                    <TableHead className="text-xs text-center">Compliant</TableHead>
                    <TableHead className="text-xs text-center">Due Soon</TableHead>
                    <TableHead className="text-xs text-center">Overdue</TableHead>
                    <TableHead className="text-xs text-center">Pending</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFleetSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        No aircraft match the "{statusFilter}" filter.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {filteredFleetSummaries.map((s) => {
                    const ac = aircraftMap.get(s.aircraftId);
                    return (
                      <TableRow key={s.aircraftId}>
                        <TableCell className="text-xs font-mono font-medium">
                          {ac?.registration ?? s.aircraftId.slice(-6)}
                          {ac && (
                            <span className="text-muted-foreground ml-2 font-sans font-normal">
                              {ac.make} {ac.model}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-center">{s.total}</TableCell>
                        <TableCell className="text-xs text-center text-emerald-600 dark:text-emerald-400">
                          {s.compliantCount}
                        </TableCell>
                        <TableCell className="text-xs text-center text-amber-600 dark:text-amber-400">
                          {s.dueSoonCount || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {s.overdueCount > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-semibold">{s.overdueCount}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {s.pendingCount || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1"
                            onClick={() => {
                              setSelectedAircraft(s.aircraftId);
                              // BH-QCM-001: Reset status filter when drilling into a per-aircraft
                              // view via the fleet table "View" button. Previously this bypassed
                              // the aircraft-selector onValueChange handler that resets the filter.
                              // A QCM filtering for "overdue" then clicking "View" on an aircraft
                              // with 0 overdue but 4 due-soon ADs would see 0 rows — masking the
                              // approaching due dates completely.
                              setStatusFilter("all");
                            }}
                          >
                            View <ArrowUpRight className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Per-Aircraft View */}
      {selectedAircraft !== "all" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>
                AD Records — {aircraftMap.get(selectedAircraft)?.registration ?? selectedAircraft}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {aircraftRecords === undefined ? (
              <div className="p-6 space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">AD Number</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Next Due</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    {/* BUG-QCM-2: Previously no Actions column — QCM inspector could
                        view AD status but had no path to record a compliance event,
                        amend due hours, or update applicability without manually
                        navigating to Fleet Management → aircraft → AD Compliance tab.
                        Now each row has a "Manage →" link directly to that aircraft's
                        fleet detail page. */}
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        No records match the current filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((r) => {
                      const now = Date.now();
                      const threshold = 30 * 24 * 60 * 60 * 1000;
                      // BUG-QCM-1: not_complied is now handled separately in statusBadge().
                      // isOverdue should only be true for due-date overruns, not status flags.
                      const isOverdue =
                        r.complianceStatus !== "not_complied" &&
                        (r.nextDueDate != null && r.nextDueDate < now && r.applicable);
                      const isDueSoon =
                        !isOverdue &&
                        r.complianceStatus !== "not_complied" &&
                        r.nextDueDate != null &&
                        r.nextDueDate >= now &&
                        r.nextDueDate <= now + threshold;
                      const isSuperseded = r.ad?.supersededByAdId != null;
                      const acReg = aircraftMap.get(selectedAircraft)?.registration;

                      return (
                        <TableRow key={r._id} className={isOverdue || r.complianceStatus === "not_complied" ? "bg-red-500/5" : isDueSoon ? "bg-amber-500/5" : ""}>
                          <TableCell className="text-xs font-mono font-medium">
                            {r.ad?.adNumber ?? "—"}
                            {isSuperseded && (
                              <Badge variant="outline" className="ml-1.5 text-[9px] px-1">
                                Superseded
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">
                            {r.ad?.subject ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs capitalize">
                            {r.ad?.adType?.replace(/_/g, " ") ?? "—"}
                          </TableCell>
                          <TableCell>
                            {statusBadge(r.complianceStatus, isOverdue, isDueSoon)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.nextDueDate
                              ? new Date(r.nextDueDate).toLocaleDateString()
                              : r.nextDueHours != null
                                ? `${r.nextDueHours}h`
                                : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {r.complianceHistory?.length > 0
                              ? r.complianceHistory[r.complianceHistory.length - 1].complianceMethodUsed ?? "—"
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {acReg ? (
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] gap-1 text-primary hover:bg-primary/5"
                              >
                                <Link to={`/fleet/${encodeURIComponent(acReg)}`}>
                                  Manage <ExternalLink className="w-2.5 h-2.5" />
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Regulatory Note */}
      <p className="text-[11px] text-muted-foreground/60 text-center">
        AD compliance per 14 CFR § 39. All compliance actions require re-authentication and are
        permanently recorded per 14 CFR 91.417.
      </p>
    </div>
  );
}
