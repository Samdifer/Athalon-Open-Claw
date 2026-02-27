"use client";

import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdItem = {
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
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function AdStatusBadge({
  isOverdue,
  isDueSoon,
  complianceStatus,
}: {
  isOverdue: boolean;
  isDueSoon: boolean;
  complianceStatus: string;
}) {
  if (complianceStatus === "not_complied" || complianceStatus === "pending_determination") {
    return (
      <Badge variant="outline" className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]">
        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
        Not Complied
      </Badge>
    );
  }
  if (isOverdue) {
    return (
      <Badge variant="outline" className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]">
        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
        Overdue
      </Badge>
    );
  }
  if (isDueSoon) {
    return (
      <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
        <Clock className="w-2.5 h-2.5 mr-1" />
        Due Soon
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 text-[10px]">
      <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
      Complied
    </Badge>
  );
}

// ─── AD Row ───────────────────────────────────────────────────────────────────

function AdRow({ item }: { item: AdItem }) {
  const fmt = (ms?: number) =>
    ms
      ? new Date(ms).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      : null;

  const appliesToColors: Record<string, string> = {
    aircraft: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    engine:   "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    part:     "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <AdStatusBadge
        isOverdue={item.isOverdue}
        isDueSoon={item.isDueSoon}
        complianceStatus={item.complianceStatus}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-mono text-xs font-semibold text-foreground">{item.adNumber}</span>
          <Badge
            variant="outline"
            className={`text-[10px] border ${appliesToColors[item.appliesTo] ?? "bg-muted text-muted-foreground"}`}
          >
            {item.appliesTo}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{item.adTitle}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {item.lastComplianceDate && (
            <span className="text-[10px] text-muted-foreground/70">
              Last: {fmt(item.lastComplianceDate)}
            </span>
          )}
          {item.nextDueDate != null && (
            <span className={`text-[10px] ${item.isOverdue ? "text-red-600 dark:text-red-400" : item.isDueSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70"}`}>
              Due: {fmt(item.nextDueDate)}
              {item.daysRemaining != null && (
                <span> ({item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)}d overdue` : `${item.daysRemaining}d`})</span>
              )}
            </span>
          )}
          {item.nextDueHours != null && (
            <span className={`text-[10px] font-mono ${item.isOverdue ? "text-red-600 dark:text-red-400" : item.isDueSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70"}`}>
              Due: {item.nextDueHours.toFixed(1)} hr
              {item.hoursRemaining != null && (
                <span> ({item.hoursRemaining <= 0 ? `${Math.abs(item.hoursRemaining).toFixed(1)} hr over` : `${item.hoursRemaining.toFixed(1)} hr left`})</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AD Compliance Panel — uses workOrderId to look up aircraft ───────────────

function AdCompliancePanelInner({
  workOrderId,
  organizationId,
}: {
  workOrderId: Id<"workOrders">;
  organizationId: Id<"organizations">;
}) {
  // Fetch the close readiness report to get the aircraftId
  const report = useQuery(api.returnToService.getCloseReadinessReport, {
    workOrderId,
    organizationId,
  });

  // Fetch AD compliance for the aircraft once we have its ID
  const adData = useQuery(
    api.adCompliance.checkAdDueForAircraft,
    report?.aircraftId
      ? { aircraftId: report.aircraftId as Id<"aircraft">, organizationId }
      : "skip",
  );

  if (report === undefined || (report?.aircraftId && adData === undefined)) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">Work order not found.</p>
      </div>
    );
  }

  if (!report.aircraftId || adData === null) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">No aircraft associated with this work order.</p>
      </div>
    );
  }

  if (adData === undefined) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  const { items, summary, currentHours, aircraftRegistration } = adData;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Total ADs</p>
            <span className="text-lg font-bold text-foreground">{summary.total}</span>
          </CardContent>
        </Card>
        <Card className={`border-border/60 ${summary.overdueCount > 0 ? "border-red-500/40 bg-red-500/5" : ""}`}>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Overdue</p>
            <span className={`text-lg font-bold ${summary.overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
              {summary.overdueCount}
            </span>
          </CardContent>
        </Card>
        <Card className={`border-border/60 ${summary.dueSoonCount > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Due Soon</p>
            <span className={`text-lg font-bold ${summary.dueSoonCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
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

      {/* Blocking Banner */}
      {summary.hasBlockingItems && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              {aircraftRegistration} has blocking AD items. Aircraft may not return to service until resolved.
            </p>
          </CardContent>
        </Card>
      )}

      {/* AD List */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            AD Compliance — {aircraftRegistration}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-500/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No applicable ADs on file.</p>
            </div>
          ) : (
            items.map((item: AdItem) => (
              <AdRow key={item.adComplianceId} item={item} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Export: AdComplianceTab ─────────────────────────────────────────────
// Self-contained: reads workOrderId from URL params, orgId from Clerk.

export function AdComplianceTab() {
  const params = useParams<{ id: string }>();
  const { orgId } = useCurrentOrg();

  const workOrderId = params.id as Id<"workOrders">;

  if (!orgId) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No organization context. Please sign in to an organization.
        </p>
      </div>
    );
  }

  return (
    <AdCompliancePanelInner
      workOrderId={workOrderId}
      organizationId={orgId}
    />
  );
}
