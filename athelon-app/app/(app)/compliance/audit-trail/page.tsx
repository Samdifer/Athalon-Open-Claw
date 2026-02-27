"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  if (complianceStatus === "not_complied" || complianceStatus === "pending_determination") {
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
      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* Blocking Banner */}
      {summary.hasBlockingItems && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400 font-medium">
              {aircraftRegistration} has {summary.overdueCount > 0 ? `${summary.overdueCount} overdue` : ""}
              {summary.overdueCount > 0 && (summary.notCompliedCount > 0 || summary.pendingDeterminationCount > 0) ? " and " : ""}
              {summary.notCompliedCount > 0 ? `${summary.notCompliedCount} not-complied` : ""}
              {summary.pendingDeterminationCount > 0 ? `${summary.pendingDeterminationCount} pending-determination` : ""} ADs.
              Aircraft may not return to service until these are resolved.
            </p>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditTrailPage() {
  const { orgId } = useCurrentOrg();

  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);

  const aircraft = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  return (
    <div className="space-y-5">
      {/* Header */}
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
      </div>

      {/* Aircraft Selector */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Plane className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Select Aircraft
              </label>
              {aircraft === undefined ? (
                <Skeleton className="h-9 w-64" />
              ) : (
                <Select
                  value={selectedAircraftId ?? ""}
                  onValueChange={(val) => setSelectedAircraftId(val || null)}
                >
                  <SelectTrigger className="h-9 w-64 text-xs">
                    <SelectValue placeholder="Choose an aircraft…" />
                  </SelectTrigger>
                  <SelectContent>
                    {aircraft.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No aircraft in fleet
                      </SelectItem>
                    ) : (
                      aircraft.map((ac) => (
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
            <p className="text-sm text-muted-foreground">Select an aircraft above to view AD compliance status.</p>
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
