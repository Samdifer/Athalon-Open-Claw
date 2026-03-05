"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plane,
  ChevronRight,
  List,
  ClipboardList,
  ShieldAlert,
  ArrowLeft,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { ExportCSVButton } from "@/src/shared/components/ExportCSVButton";

// ─── Status Badge ────────────────────────────────────────────────────────────

function AdStatusBadge({
  isOverdue,
  isDueSoon,
  complianceStatus,
}: {
  isOverdue: boolean;
  isDueSoon: boolean;
  complianceStatus: string;
}) {
  // BUG-QCM-AT-001: Previously `pending_determination` was combined with
  // `not_complied` and shown as a red "Not Complied" badge. These are different
  // states: `not_complied` = actively non-compliant (blocks RTS), while
  // `pending_determination` = applicability not yet established (needs review,
  // but does not necessarily mean the aircraft is out of compliance). Showing
  // pending ADs as "Not Complied" inflated the apparent non-compliance count
  // on the Audit Trail, alarmed QCM inspectors unnecessarily, and broke trust
  // in the dashboard. Now `pending_determination` gets its own amber badge,
  // consistent with how ad-sb/page.tsx's `statusBadge` function handles it.
  if (complianceStatus === "pending_determination") {
    return (
      <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
        <Clock className="w-2.5 h-2.5 mr-1" />
        Pending
      </Badge>
    );
  }
  if (complianceStatus === "not_complied") {
    return (
      <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
        Not Complied
      </Badge>
    );
  }
  if (isOverdue) {
    return (
      <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
        Overdue
      </Badge>
    );
  }
  if (isDueSoon) {
    return (
      <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
        <Clock className="w-2.5 h-2.5 mr-1" />
        Due Soon
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]">
      <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
      Complied
    </Badge>
  );
}

// ─── Applies-To Badge ────────────────────────────────────────────────────────

function AppliesToBadge({ appliesTo }: { appliesTo: string }) {
  const map: Record<string, string> = {
    aircraft: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    engine:   "bg-purple-500/15 text-purple-400 border-purple-500/30",
    part:     "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <Badge variant="outline" className={`text-[10px] border ${map[appliesTo] ?? "bg-muted text-muted-foreground"}`}>
      {appliesTo}
    </Badge>
  );
}

// ─── AD Row ──────────────────────────────────────────────────────────────────

function AdRow({ item }: { item: {
  adComplianceId: Id<"adCompliance">;
  adNumber: string;
  adTitle: string;
  complianceStatus: string;
  adType?: string;
  isOverdue: boolean;
  isDueSoon: boolean;
  nextDueDate?: number;
  nextDueHours?: number;
  hoursRemaining?: number;
  daysRemaining?: number;
  lastComplianceDate?: number;
  appliesTo: string;
}}) {
  const formatDate = (ms?: number) =>
    ms ? new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="flex-shrink-0 mt-0.5">
        <AdStatusBadge
          isOverdue={item.isOverdue}
          isDueSoon={item.isDueSoon}
          complianceStatus={item.complianceStatus}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-mono text-xs font-semibold text-foreground">
            {item.adNumber}
          </span>
          <AppliesToBadge appliesTo={item.appliesTo} />
          {item.adType && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/40">
              {item.adType.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.adTitle}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {item.lastComplianceDate && (
            <span className="text-[11px] text-muted-foreground">
              Last: {formatDate(item.lastComplianceDate)}
            </span>
          )}
          {item.nextDueDate != null && (
            <span className={`text-[11px] ${item.isOverdue ? "text-red-400" : item.isDueSoon ? "text-amber-400" : "text-muted-foreground"}`}>
              Due: {formatDate(item.nextDueDate)}
              {item.daysRemaining != null && (
                <span className="ml-1">
                  ({item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)}d overdue` : `${item.daysRemaining}d`})
                </span>
              )}
            </span>
          )}
          {item.nextDueHours != null && (
            <span className={`text-[11px] font-mono ${item.isOverdue ? "text-red-400" : item.isDueSoon ? "text-amber-400" : "text-muted-foreground"}`}>
              Due: {item.nextDueHours.toFixed(1)} hr
              {item.hoursRemaining != null && (
                <span className="ml-1">
                  ({item.hoursRemaining <= 0 ? `${Math.abs(item.hoursRemaining).toFixed(1)} hr overdue` : `${item.hoursRemaining.toFixed(1)} hr remaining`})
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AD Compliance Panel ─────────────────────────────────────────────────────

function AdCompliancePanel({
  aircraftId,
  organizationId,
}: {
  aircraftId: Id<"aircraft">;
  organizationId: Id<"organizations">;
}) {
  const result = useQuery(api.adCompliance.checkAdDueForAircraft, {
    aircraftId,
    organizationId,
  });

  if (result === undefined) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (result === null) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Aircraft not found.</p>
        </CardContent>
      </Card>
    );
  }

  const { items, summary, currentHours, aircraftRegistration } = result;

  return (
    <div className="space-y-4">
      {/* Summary Row
          BUG-QCM-C3: Same issue as AdComplianceTab BUG-QCM-C2 — the 4-card
          summary only tracked overdueCount (date-overrun ADs). An aircraft with
          0 overdue but 3 never-performed ADs showed "Overdue: 0" neutral/grey
          while the blocking banner below was red. Added a 5th "Not Complied"
          card that lights up red when notCompliedCount > 0, matching the blocking
          banner and giving the QCM inspector consistent severity signals across
          the page. */}
      {(() => {
        const notCompliedCount =
          (summary as unknown as Record<string, number>)["notCompliedCount"] ?? 0;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="border-border/60">
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Total ADs</p>
                <span className="text-lg font-bold text-foreground">{summary.total}</span>
              </CardContent>
            </Card>
            <Card className={`border-border/60 ${summary.overdueCount > 0 ? "border-red-500/40 bg-red-500/5" : ""}`}>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Overdue</p>
                <span className={`text-lg font-bold ${summary.overdueCount > 0 ? "text-red-400" : "text-foreground"}`}>
                  {summary.overdueCount}
                </span>
              </CardContent>
            </Card>
            <Card className={`border-border/60 ${notCompliedCount > 0 ? "border-red-500/40 bg-red-500/5" : ""}`}>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Not Complied</p>
                <span className={`text-lg font-bold ${notCompliedCount > 0 ? "text-red-400" : "text-foreground"}`}>
                  {notCompliedCount}
                </span>
              </CardContent>
            </Card>
            <Card className={`border-border/60 ${summary.dueSoonCount > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Due Soon</p>
                <span className={`text-lg font-bold ${summary.dueSoonCount > 0 ? "text-amber-400" : "text-foreground"}`}>
                  {summary.dueSoonCount}
                </span>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Aircraft TT</p>
                <span className="text-lg font-bold font-mono text-foreground">
                  {currentHours.toFixed(1)} hr
                </span>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Blocking Banner */}
      {summary.hasBlockingItems && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3 flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 font-medium">
                {/* BUG-QCM-AT-002: Previous inline JSX text-node concatenation produced
                    garbled output when overdueCount=0 but both notComplied and
                    pendingDetermination were >0 (e.g. "N776AB has 1 not-complied1
                    pending-determination ADs."). The " and " separator only rendered
                    when overdueCount>0, so two non-overdue issue types ran together
                    with no space or comma between them. Replaced with a helper that
                    builds the list as a JS array joined with " and " / ", " — same
                    pattern used throughout the billing analytics page. */}
                {aircraftRegistration} has{" "}
                {(() => {
                  const parts: string[] = [];
                  if (summary.overdueCount > 0) parts.push(`${summary.overdueCount} overdue`);
                  if (summary.notCompliedCount > 0) parts.push(`${summary.notCompliedCount} not-complied`);
                  if (summary.pendingDeterminationCount > 0) parts.push(`${summary.pendingDeterminationCount} pending-determination`);
                  return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
                })()}{" "}
                ADs. Aircraft may not return to service until these are resolved.
              </p>
            </div>
            {/* BUG-QCM-048: Blocking banner had no action link. QCM could see
                "3 overdue ADs" but had no direct path to record compliance or
                update status — they had to navigate away to Compliance → AD/SB,
                then re-select the aircraft from a dropdown. Now provides a
                direct link to /compliance/ad-sb pre-filtered to this aircraft. */}
            <Link
              to={`/compliance/ad-sb?aircraft=${encodeURIComponent(aircraftId)}`}
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 whitespace-nowrap flex-shrink-0 font-medium border border-red-500/30 rounded px-1.5 py-0.5 hover:bg-red-500/10 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Update AD/SB
            </Link>
          </CardContent>
        </Card>
      )}

      {/* AD List */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Airworthiness Directives — {aircraftRegistration}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-400/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No applicable ADs on file for this aircraft.</p>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <AdRow key={item.adComplianceId} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Aircraft Fleet Summary Row ───────────────────────────────────────────────

// Preloaded summary shape accepted from fleet-level queries
interface PreloadedAdSummary {
  total: number;
  overdueCount: number;
  dueSoonCount: number;
  notCompliedCount: number;
}

function AircraftComplianceSummaryRow({
  ac,
  organizationId,
  isSelected,
  onSelect,
  preloadedSummary,
}: {
  ac: { _id: Id<"aircraft">; currentRegistration?: string; make?: string; model?: string };
  organizationId: Id<"organizations">;
  isSelected: boolean;
  onSelect: (id: string) => void;
  /** When provided from fleetAdSummary, skip the per-aircraft Convex query.
   *  BH-QCM-004: Eliminates N redundant checkAdDueForAircraft subscriptions
   *  in the fleet overview — one subscription per aircraft was being fired even
   *  though the fleet summary already contained all needed count fields.
   *  With 10+ aircraft this was 10+ concurrent Convex subscriptions on page load. */
  preloadedSummary?: PreloadedAdSummary;
}) {
  // Skip the per-aircraft query when summary is already available from the fleet overview.
  const result = useQuery(
    api.adCompliance.checkAdDueForAircraft,
    preloadedSummary
      ? "skip"
      : { aircraftId: ac._id, organizationId },
  );

  const loading = !preloadedSummary && result === undefined;

  const { total, overdueCount, dueSoonCount, notCompliedCount } =
    preloadedSummary ??
    result?.summary ?? {
      total: 0,
      overdueCount: 0,
      dueSoonCount: 0,
      notCompliedCount: 0,
    };

  const hasBlockers = (overdueCount ?? 0) > 0 || (notCompliedCount ?? 0) > 0;
  const hasDueSoon = !hasBlockers && (dueSoonCount ?? 0) > 0;

  return (
    <button
      onClick={() => onSelect(ac._id)}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 transition-colors hover:bg-muted/50 ${
        isSelected ? "bg-primary/5" : ""
      }`}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0 w-2 h-2 rounded-full mt-0.5">
        {loading ? (
          <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
        ) : hasBlockers ? (
          <div className="w-2 h-2 rounded-full bg-red-500" />
        ) : hasDueSoon ? (
          <div className="w-2 h-2 rounded-full bg-amber-500" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-green-500" />
        )}
      </div>

      {/* Tail + type */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground">
            {ac.currentRegistration ?? "—"}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {ac.make ?? ""} {ac.model ?? ""}
          </span>
        </div>
      </div>

      {/* AD counts */}
      {loading ? (
        <Skeleton className="h-5 w-24" />
      ) : (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground">{total} AD{total !== 1 ? "s" : ""}</span>
          {(overdueCount ?? 0) > 0 && (
            <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30 h-5 px-1.5">
              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
              {overdueCount} overdue
            </Badge>
          )}
          {(notCompliedCount ?? 0) > 0 && (
            <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30 h-5 px-1.5">
              {notCompliedCount} non-complied
            </Badge>
          )}
          {!hasBlockers && (dueSoonCount ?? 0) > 0 && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30 h-5 px-1.5">
              <Clock className="w-2.5 h-2.5 mr-0.5" />
              {dueSoonCount} due soon
            </Badge>
          )}
          {!hasBlockers && !(dueSoonCount ?? 0) && total > 0 && (
            <Badge variant="outline" className="text-[10px] bg-green-500/15 text-green-400 border-green-500/30 h-5 px-1.5">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
              Compliant
            </Badge>
          )}
          {total === 0 && (
            <span className="text-[11px] text-muted-foreground/60">No ADs on file</span>
          )}
        </div>
      )}

      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
    </button>
  );
}

// ─── Fleet Overview Panel ─────────────────────────────────────────────────────

function FleetOverviewPanel({
  aircraft,
  organizationId,
  selectedAircraftId,
  onSelect,
  summaryByAircraftId,
}: {
  aircraft: { _id: Id<"aircraft">; currentRegistration?: string; make?: string; model?: string }[];
  organizationId: Id<"organizations">;
  selectedAircraftId: string | null;
  onSelect: (id: string) => void;
  /** Pre-built map of aircraft ID → compliance counts from fleet summary.
   *  When provided, each row skips its own per-aircraft Convex query. */
  summaryByAircraftId?: Map<string, PreloadedAdSummary>;
}) {
  if (aircraft.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center">
          <Plane className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No aircraft in fleet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <List className="w-3.5 h-3.5" />
          Fleet Overview — Click a row to drill in
        </CardTitle>
        {/* BUG-QCM-049: "Non-compliant first" subtitle was always shown even during
            the window while fleetAdSummary is still loading (sortedAircraft falls back
            to insertion order). Aircraft were rendering in database insertion order but
            the subtitle told the QCM they were sorted by compliance tier. A QCM who
            checks "N776AB at the top must be the worst" was wrong.
            Now: subtitle says "Loading sort order…" until fleetAdSummary resolves, then
            switches to "Non-compliant first" only when the sort is actually applied. */}
        <p className="text-[11px] text-muted-foreground">
          All {aircraft.length} fleet aircraft ·{" "}
          {(summaryByAircraftId?.size ?? 0) > 0 ? "Non-compliant first" : "Loading sort order…"}{" "}
          · Overdue ADs block RTS
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {aircraft.map((ac) => (
          <AircraftComplianceSummaryRow
            key={ac._id}
            ac={ac}
            organizationId={organizationId}
            isSelected={selectedAircraftId === ac._id}
            onSelect={onSelect}
            preloadedSummary={summaryByAircraftId?.get(ac._id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditTrailPage() {
  // BUG-QCM-048: Previously `useCurrentOrg()` was destructured without `isLoaded`.
  // Every other compliance page (compliance/page.tsx, ad-sb/page.tsx,
  // qcm-review/page.tsx) guards against missing org context via `usePagePrereqs`
  // or `isLoaded` checks — the audit trail was the only one that didn't.
  // Consequence: a user without an organization, or with a slow Clerk load,
  // would see skeleton states permanently with no explanation and no path forward.
  // Now: while org context is loading we show a spinner; once loaded without
  // an org we show the standard "missing context" ActionableEmptyState.
  const { orgId, isLoaded: orgLoaded } = useCurrentOrg();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(
    () => searchParams.get("aircraft") ?? null,
  );

  const setSelectedAircraftInUrl = (aircraftId: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (aircraftId) {
      nextParams.set("aircraft", aircraftId);
    } else {
      nextParams.delete("aircraft");
    }
    setSearchParams(nextParams, { replace: true });
  };

  // BUG-QCM-AT-004: Audit Trail did not read/sync ?aircraft from URL, so deep
  // links from AD/SB and refresh/share/back always dropped the QCM back to an
  // unselected state. Syncing state with query params preserves drill-in context.
  useEffect(() => {
    const aircraftId = searchParams.get("aircraft");
    setSelectedAircraftId(aircraftId && aircraftId.length > 0 ? aircraftId : null);
  }, [searchParams]);

  const aircraft = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  // Fleet AD summary — used to sort aircraft in the FleetOverviewPanel so that
  // "Non-compliant first" in the panel subtitle is actually true.
  // Without this sort the claim was false: aircraft rendered in insertion order.
  const fleetAdSummary = useQuery(
    api.adCompliance.getFleetAdSummary,
    orgId ? { organizationId: orgId } : "skip",
  );

  // BH-QCM-004: Pre-build a summary map from fleetAdSummary so each
  // AircraftComplianceSummaryRow can skip its own per-aircraft query.
  // The fleet summary already contains overdueCount, dueSoonCount, etc.
  // Without this map, N per-aircraft Convex subscriptions fire on every
  // audit trail page load — one per aircraft in the fleet.
  const summaryByAircraftId = useMemo<Map<string, PreloadedAdSummary>>(() => {
    const m = new Map<string, PreloadedAdSummary>();
    if (!fleetAdSummary) return m;
    for (const s of fleetAdSummary.aircraftSummaries ?? []) {
      m.set(s.aircraftId, {
        total: s.total,
        overdueCount: s.overdueCount,
        dueSoonCount: s.dueSoonCount,
        // Access notCompliedCount via type cast — the field exists in the
        // backend response but isn't in the TypeScript interface yet.
        notCompliedCount: (s as unknown as Record<string, number>)["notCompliedCount"] ?? 0,
      });
    }
    return m;
  }, [fleetAdSummary]);

  // Build a compliance-tier map: 0 = overdue/not-complied (worst), 1 = pending,
  // 2 = due-soon, 3 = compliant, 4 = no records on file
  const sortedAircraft = useMemo(() => {
    if (!aircraft) return [];
    if (!fleetAdSummary) return aircraft; // fall back to insertion order while loading

    const tierMap = new Map<string, number>();
    for (const s of fleetAdSummary.aircraftSummaries ?? []) {
      let tier = 3; // compliant default
      if (s.overdueCount > 0 || (s as unknown as Record<string,number>)["notCompliedCount"] > 0) tier = 0;
      else if (s.pendingCount > 0) tier = 1;
      else if (s.dueSoonCount > 0) tier = 2;
      else if (s.total === 0) tier = 4;
      tierMap.set(s.aircraftId, tier);
    }

    return [...aircraft].sort((a, b) => {
      const ta = tierMap.get(a._id) ?? 4;
      const tb = tierMap.get(b._id) ?? 4;
      if (ta !== tb) return ta - tb; // lower tier = worse = first
      // Secondary: alphabetical by registration
      return (a.currentRegistration ?? "").localeCompare(b.currentRegistration ?? "");
    });
  }, [aircraft, fleetAdSummary]);

  const exportRows = useMemo(
    () =>
      (fleetAdSummary?.aircraftSummaries ?? []).map((summary) => ({
        event: "AD Compliance Snapshot",
        user: "System",
        timestamp: new Date().toISOString(),
        details: `${
          aircraft?.find((ac) => ac._id === summary.aircraftId)?.currentRegistration ??
          summary.aircraftId.slice(-6)
        }: ${summary.overdueCount} overdue, ${summary.dueSoonCount} due soon, ${summary.total} total ADs`,
      })),
    [aircraft, fleetAdSummary],
  );

  // BUG-QCM-048: Guard against missing org context (see comment above on isLoaded).
  if (!orgLoaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <ActionableEmptyState
        title="Audit trail requires organization setup"
        missingInfo="Complete onboarding before reviewing per-aircraft AD compliance and audit data."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      {/* BUG-QCM-F4: Previously the Audit Trail page had no sub-navigation — a QCM
          inspector landing here from the Compliance dashboard had no way to reach
          the main Compliance overview, AD/SB tracking, or QCM Review without using
          the browser back button or the sidebar. Added: (1) a "← Back to Compliance"
          ghost button for quick return, (2) "AD/SB Tracking" and "QCM Review"
          shortcut buttons matching the pattern already used on qcm-review/page.tsx.
          All four compliance pages are now cross-linked so the QCM can cycle through
          the full workflow without losing navigation context. */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            AD Compliance Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live airworthiness directive status · All overdue checks use current aircraft hours
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <ExportCSVButton
            data={exportRows}
            columns={[
              { key: "event", header: "Event" },
              { key: "user", header: "User" },
              { key: "timestamp", header: "Timestamp" },
              { key: "details", header: "Details" },
            ]}
            fileName="audit-trail.csv"
            showDateFilter
            dateFieldKey="timestamp"
            className="h-8 text-xs"
          />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
          >
            <Link to="/compliance">
              <ArrowLeft className="w-3.5 h-3.5" />
              Compliance
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/60"
          >
            <Link
              to={
                selectedAircraftId
                  ? `/compliance/ad-sb?aircraft=${encodeURIComponent(selectedAircraftId)}`
                  : "/compliance/ad-sb"
              }
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              AD/SB Tracking
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/60"
          >
            <Link to="/compliance/qcm-review">
              <ClipboardList className="w-3.5 h-3.5" />
              QCM Review
            </Link>
          </Button>
        </div>
      </div>

      {/* Fleet Overview — all aircraft at a glance */}
      {aircraft === undefined ? (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      ) : orgId ? (
        <FleetOverviewPanel
          aircraft={sortedAircraft}
          organizationId={orgId}
          selectedAircraftId={selectedAircraftId}
          onSelect={(aircraftId) => setSelectedAircraftInUrl(aircraftId)}
          summaryByAircraftId={summaryByAircraftId}
        />
      ) : null}

      {/* Aircraft Selector — for manual override / drill-in */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Plane className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Select Aircraft to Inspect
              </label>
              {aircraft === undefined ? (
                <Skeleton className="h-9 w-64" />
              ) : (
                <Select
                  value={selectedAircraftId ?? "__all"}
                  onValueChange={(val) =>
                    setSelectedAircraftInUrl(val === "__all" ? null : val)
                  }
                >
                  <SelectTrigger className="h-9 w-64 text-xs">
                    <SelectValue placeholder="Choose an aircraft…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all" className="text-xs">
                      All Aircraft (Fleet Overview)
                    </SelectItem>
                    {sortedAircraft.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No aircraft in fleet
                      </SelectItem>
                    ) : (
                      sortedAircraft.map((ac) => (
                        <SelectItem key={ac._id} value={ac._id} className="text-xs">
                          <span className="font-mono font-semibold mr-2">{ac.currentRegistration}</span>
                          <span className="text-muted-foreground">{ac.make} {ac.model}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AD Compliance Results */}
      {!selectedAircraftId ? (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <Plane className="w-7 h-7 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Click an aircraft in the Fleet Overview or use the selector above to drill into full AD detail.
            </p>
          </CardContent>
        </Card>
      ) : orgId ? (
        <AdCompliancePanel
          aircraftId={selectedAircraftId as Id<"aircraft">}
          organizationId={orgId}
        />
      ) : (
        <Card className="border-border/60">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No organization context. Please sign in to an organization.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
