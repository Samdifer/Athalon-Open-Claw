"use client";

/**
 * AircraftAdComplianceTab.tsx
 * Phase F: Compliance Layer
 *
 * Per-aircraft AD (Airworthiness Directive) compliance table for the fleet
 * detail page. Shows all ADs tracked for this aircraft with their compliance
 * status, last compliance date, next due date, and a direct link to the
 * global AD compliance page.
 *
 * Data source: adCompliance.listAdRecordsForAircraft (Convex query)
 *
 * Regulatory context:
 *   14 CFR § 39.3: No person may operate a product to which an AD applies
 *   except in accordance with that AD. This table is the technician's primary
 *   view of AD compliance status for a specific aircraft. Non-compliant ADs
 *   block return to service.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ExternalLink,
  RefreshCcw,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AircraftAdComplianceTabProps {
  aircraftId: Id<"aircraft">;
  organizationId: Id<"organizations">;
  tailNumber: string;
  totalTimeHours: number;
}

// ─── Compliance status helpers ────────────────────────────────────────────────

type DisplayStatus = "overdue" | "due_soon" | "compliant" | "pending" | "not_applicable" | "superseded";

function getDisplayStatus(record: {
  complianceStatus: string;
  nextDueDate?: number | null;
  applicable: boolean;
}): DisplayStatus {
  if (!record.applicable) return "not_applicable";
  if (record.complianceStatus === "superseded") return "superseded";
  if (record.complianceStatus === "pending_determination") return "pending";
  if (record.complianceStatus === "not_complied") return "overdue";
  if (record.complianceStatus === "not_applicable") return "not_applicable";

  const now = Date.now();
  const dueSoonThresholdMs = 30 * 24 * 60 * 60 * 1000;

  if (record.nextDueDate != null) {
    if (record.nextDueDate < now) return "overdue";
    if (record.nextDueDate <= now + dueSoonThresholdMs) return "due_soon";
  }

  return "compliant";
}

const STATUS_CONFIG: Record<
  DisplayStatus,
  { label: string; badge: string; Icon: React.ElementType; iconColor: string }
> = {
  overdue: {
    label: "Non-Compliant",
    badge: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    Icon: ShieldAlert,
    iconColor: "text-red-600 dark:text-red-400",
  },
  due_soon: {
    label: "Due Soon",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    Icon: Clock,
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  compliant: {
    label: "Compliant",
    badge: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    Icon: ShieldCheck,
    iconColor: "text-green-600 dark:text-green-400",
  },
  pending: {
    label: "Pending Review",
    badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    Icon: AlertTriangle,
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  not_applicable: {
    label: "N/A",
    badge: "bg-muted text-muted-foreground border-border/40",
    Icon: Info,
    iconColor: "text-muted-foreground",
  },
  superseded: {
    label: "Superseded",
    badge: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
    Icon: Circle,
    iconColor: "text-muted-foreground",
  },
};

// ─── AD Row ───────────────────────────────────────────────────────────────────

function AdRow({
  record,
  totalTimeHours,
}: {
  record: {
    _id: Id<"adCompliance">;
    complianceStatus: string;
    applicable: boolean;
    lastComplianceDate?: number | null;
    lastComplianceHours?: number | null;
    nextDueDate?: number | null;
    nextDueHours?: number | null;
    ad: {
      adNumber: string;
      subject: string;
      effectiveDate: number;
      adType: string;
      complianceType: string;
      recurringIntervalHours?: number | null;
      recurringIntervalDays?: number | null;
      emergencyAd: boolean;
      supersededByAdId?: string | null;
    } | null;
  };
  totalTimeHours: number;
}) {
  const displayStatus = getDisplayStatus(record);
  const cfg = STATUS_CONFIG[displayStatus];
  const StatusIcon = cfg.Icon;
  const isObsolete = displayStatus === "not_applicable" || displayStatus === "superseded";

  // Remaining hours to next due (positive = days left; negative = overdue)
  const remainingHours =
    record.nextDueHours != null
      ? record.nextDueHours - totalTimeHours
      : null;

  return (
    <div className={`py-3 px-1 flex items-start gap-3 ${isObsolete ? "opacity-50" : ""}`}>
      <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.iconColor}`} />

      <div className="flex-1 min-w-0">
        {/* Row 1: AD number + badges */}
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-mono text-xs font-bold text-foreground">
            {record.ad?.adNumber ?? "—"}
          </span>
          {record.ad?.emergencyAd && (
            <Badge className="text-[9px] bg-red-500/15 text-red-400 border-red-500/30 border">
              EMERGENCY
            </Badge>
          )}
          {record.ad?.adType === "recurring" && (
            <Badge
              variant="outline"
              className="text-[9px] border-border/50 text-muted-foreground gap-0.5"
            >
              <RefreshCcw className="w-2.5 h-2.5" />
              Recurring
            </Badge>
          )}
          <Badge className={`border text-[10px] ${cfg.badge}`}>
            {cfg.label}
          </Badge>
        </div>

        {/* Row 2: Subject */}
        <p className="text-xs text-muted-foreground leading-snug">
          {record.ad?.subject ?? "No subject available"}
        </p>

        {/* Row 3: Compliance dates + next due */}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {record.lastComplianceDate != null ? (
            <span className="text-[11px] text-muted-foreground">
              Last complied: {formatDate(record.lastComplianceDate)}
              {record.lastComplianceHours != null &&
                ` @ ${record.lastComplianceHours.toFixed(1)}h TT`}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              No compliance on record
            </span>
          )}

          {record.nextDueDate != null && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span
                className={`text-[11px] font-medium ${
                  displayStatus === "overdue"
                    ? "text-red-600 dark:text-red-400"
                    : displayStatus === "due_soon"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                }`}
              >
                Next due: {formatDate(record.nextDueDate)}
              </span>
            </>
          )}

          {remainingHours != null && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span
                className={`text-[11px] ${
                  remainingHours < 0
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : remainingHours <= 25
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                }`}
              >
                {remainingHours < 0
                  ? `${Math.abs(remainingHours).toFixed(0)}h overdue`
                  : `${remainingHours.toFixed(0)}h remaining`}
              </span>
            </>
          )}

          {record.ad?.complianceType === "recurring" && record.ad.recurringIntervalHours != null && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[11px] text-muted-foreground">
                Interval: {record.ad.recurringIntervalHours}h
              </span>
            </>
          )}

          {record.ad?.complianceType === "recurring" && record.ad.recurringIntervalDays != null && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[11px] text-muted-foreground">
                Interval: {record.ad.recurringIntervalDays} days
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AircraftAdComplianceTab({
  aircraftId,
  organizationId,
  tailNumber,
  totalTimeHours,
}: AircraftAdComplianceTabProps) {
  const records = useQuery(api.adCompliance.listAdRecordsForAircraft, {
    aircraftId,
    organizationId,
  });

  const isLoading = records === undefined;

  // Partition into buckets for display
  const applicableRecords = (records ?? []).filter(
    (r) => r.applicable === true && r.complianceStatus !== "not_applicable" && r.complianceStatus !== "superseded",
  );
  const notApplicableRecords = (records ?? []).filter(
    (r) => r.applicable === false || r.complianceStatus === "not_applicable" || r.complianceStatus === "superseded",
  );

  // Non-compliant / pending = needs attention
  const attentionRecords = applicableRecords.filter((r) => {
    const s = getDisplayStatus(r);
    return s === "overdue" || s === "pending" || s === "due_soon";
  });
  const compliantRecords = applicableRecords.filter(
    (r) => getDisplayStatus(r) === "compliant",
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Airworthiness Directive compliance tracking for {tailNumber}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 border-border/60"
        >
          <Link to="/compliance">
            <ExternalLink className="w-3 h-3" />
            Fleet Compliance
          </Link>
        </Button>
      </div>

      {/* Regulatory notice */}
      <Card className="border-border/40 bg-amber-500/5 border-l-2 border-l-amber-500">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">14 CFR § 39.3</span>{" "}
              — Non-compliant ADs block Return to Service. The RTS sign-off gate
              verifies zero overdue applicable ADs before authorizing release.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      {!isLoading && (records ?? []).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              label: "Tracked ADs",
              value: applicableRecords.length,
              color: "text-foreground",
            },
            {
              label: "Non-Compliant",
              value: attentionRecords.filter(
                (r) => getDisplayStatus(r) === "overdue",
              ).length,
              color: "text-red-400",
            },
            {
              label: "Due Soon",
              value: attentionRecords.filter(
                (r) => getDisplayStatus(r) === "due_soon",
              ).length,
              color: "text-amber-400",
            },
            {
              label: "Compliant",
              value: compliantRecords.length,
              color: "text-green-400",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/60">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground font-medium">
                  {stat.label}
                </p>
                <p className={`text-xl font-bold mt-0.5 ${stat.color}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && (records ?? []).length === 0 && (
        <Card className="border-border/60">
          <CardContent className="py-14 text-center">
            <ShieldCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No AD compliance records
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs mx-auto">
              AD compliance records are created when recordAdCompliance is
              called for this aircraft. Records will appear here once the AD
              compliance module is populated.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Needs Attention */}
      {!isLoading && attentionRecords.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground">
              Needs Attention
            </h3>
            <Badge
              variant="secondary"
              className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
            >
              {attentionRecords.length}
            </Badge>
          </div>
          <Card className="border-border/60 border-l-2 border-l-red-500">
            <CardContent className="px-4 py-0">
              <div className="divide-y divide-border/30">
                {attentionRecords.map((rec) => (
                  <AdRow
                    key={rec._id}
                    record={rec as Parameters<typeof AdRow>[0]["record"]}
                    totalTimeHours={totalTimeHours}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliant ADs */}
      {!isLoading && compliantRecords.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground">
              Compliant
            </h3>
            <Badge
              variant="secondary"
              className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
            >
              {compliantRecords.length}
            </Badge>
          </div>
          <Card className="border-border/60">
            <CardContent className="px-4 py-0">
              <div className="divide-y divide-border/30">
                {compliantRecords.map((rec) => (
                  <AdRow
                    key={rec._id}
                    record={rec as Parameters<typeof AdRow>[0]["record"]}
                    totalTimeHours={totalTimeHours}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Not Applicable / Superseded (collapsed) */}
      {!isLoading && notApplicableRecords.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-muted-foreground">
              Not Applicable / Superseded
            </h3>
            <Badge variant="secondary" className="text-[10px] bg-muted">
              {notApplicableRecords.length}
            </Badge>
          </div>
          <Card className="border-border/60">
            <CardContent className="px-4 py-0">
              <div className="divide-y divide-border/30">
                {notApplicableRecords.map((rec) => (
                  <AdRow
                    key={rec._id}
                    record={rec as Parameters<typeof AdRow>[0]["record"]}
                    totalTimeHours={totalTimeHours}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
