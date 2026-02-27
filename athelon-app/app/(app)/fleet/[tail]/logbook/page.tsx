"use client";

/**
 * app/(app)/fleet/[tail]/logbook/page.tsx
 * Athelon — Per-aircraft Maintenance Logbook Timeline
 *
 * Displays all maintenance records for a specific aircraft in reverse-chronological
 * order (newest first) with filtering and expand-in-place for long narratives.
 *
 * Backend query: api.maintenanceRecords.listByAircraft (added in convex/maintenanceRecords.ts).
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  Wrench,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordType = "maintenance_43_9" | "inspection_43_11" | "correction";
type FilterType = "all" | RecordType;

interface MaintenanceRecord {
  _id: Id<"maintenanceRecords">;
  recordType: RecordType;
  sequenceNumber: number;
  completionDate: number;
  workPerformed: string;
  approvedDataReference: string;
  signingTechnicianLegalName: string;
  signingTechnicianCertNumber?: string;
  signingTechnicianCertType?: string;
  partsReplaced?: Array<{
    partNumber: string;
    partName: string;
    quantity: number;
    action: string;
  }>;
  returnedToService: boolean;
  returnToServiceStatement?: string;
  corrects?: Id<"maintenanceRecords">;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRecordTypeMeta(type: RecordType): {
  label: string;
  color: string;
  icon: React.ReactNode;
  cfr: string;
} {
  switch (type) {
    case "maintenance_43_9":
      return {
        label: "Maintenance",
        color: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
        icon: <Wrench className="w-3 h-3" />,
        cfr: "14 CFR 43.9",
      };
    case "inspection_43_11":
      return {
        label: "Inspection",
        color: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
        icon: <ClipboardCheck className="w-3 h-3" />,
        cfr: "14 CFR 43.11",
      };
    case "correction":
      return {
        label: "Correction",
        color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        icon: <AlertCircle className="w-3 h-3" />,
        cfr: "AC 43-9C",
      };
  }
}

function formatSequence(n: number): string {
  return `#${String(n).padStart(3, "0")}`;
}

/**
 * Parse a pipe-separated approved data reference into human-readable parts.
 * Format: "{docType}|{identifier}|{revision}|{section}"
 * Falls back to returning the raw string if not structured.
 */
function parseApprovedDataRef(raw: string): string {
  if (!raw.includes("|")) return raw;
  const parts = raw.split("|");
  const [docType, identifier, revision, section] = parts;
  const base = `${docType} ${identifier} (${revision})`;
  return section?.trim() ? `${base} § ${section}` : base;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LogbookSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-28 ml-auto" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Separator className="opacity-40" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Timeline Entry ───────────────────────────────────────────────────────────

function LogbookEntry({ record }: { record: MaintenanceRecord }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getRecordTypeMeta(record.recordType);
  const TRUNCATE_LIMIT = 280;
  const needsTruncation = record.workPerformed.length > TRUNCATE_LIMIT;
  const displayText =
    !expanded && needsTruncation
      ? record.workPerformed.slice(0, TRUNCATE_LIMIT).trimEnd() + "…"
      : record.workPerformed;

  const partCount = record.partsReplaced?.length ?? 0;

  return (
    <Card className="border-border/60 hover:border-border/80 transition-colors">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Sequence number */}
          <span className="font-mono text-sm font-bold text-foreground tabular-nums">
            {formatSequence(record.sequenceNumber)}
          </span>

          {/* Record type badge */}
          <Badge
            variant="outline"
            className={`text-[11px] border flex items-center gap-1 ${meta.color}`}
          >
            {meta.icon}
            {meta.label}
          </Badge>

          {/* CFR citation */}
          <span className="text-[11px] text-muted-foreground/60 font-mono">
            {meta.cfr}
          </span>

          {/* Correction indicator */}
          {record.corrects && (
            <Badge
              variant="outline"
              className="text-[11px] border border-amber-500/30 text-amber-400/70 bg-amber-500/5"
            >
              Amends prior entry
            </Badge>
          )}

          {/* RTS badge */}
          {record.returnedToService && (
            <Badge
              variant="outline"
              className="text-[11px] border border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10 flex items-center gap-1 ml-auto"
            >
              <CheckCircle2 className="w-3 h-3" />
              Returned to Service
            </Badge>
          )}

          {/* Date — pushed right when no RTS badge */}
          {!record.returnedToService && (
            <span className="text-[11px] text-muted-foreground ml-auto">
              {formatDate(record.completionDate)}
            </span>
          )}
          {record.returnedToService && (
            <span className="text-[11px] text-muted-foreground">
              {formatDate(record.completionDate)}
            </span>
          )}
        </div>

        {/* Work performed */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
            Work Performed
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {displayText}
          </p>
          {needsTruncation && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> Show full entry
                </>
              )}
            </button>
          )}
        </div>

        <Separator className="opacity-30 mb-3" />

        {/* Meta row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {/* Approved data */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
              Approved Data
            </p>
            <p className="text-[12px] text-foreground/80 font-mono">
              {parseApprovedDataRef(record.approvedDataReference)}
            </p>
          </div>

          {/* Technician */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
              Signed By
            </p>
            <p className="text-[12px] text-foreground/80">
              {record.signingTechnicianLegalName}
              {record.signingTechnicianCertNumber && (
                <span className="text-muted-foreground font-mono ml-1">
                  ({record.signingTechnicianCertType ?? "Cert"}{" "}
                  {record.signingTechnicianCertNumber})
                </span>
              )}
            </p>
          </div>

          {/* Parts replaced */}
          {partCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground">
                {partCount} part{partCount !== 1 ? "s" : ""} replaced/installed
              </span>
            </div>
          )}

          {/* RTS statement snippet */}
          {record.returnedToService && record.returnToServiceStatement && (
            <div className="col-span-full mt-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
                Return to Service Statement
              </p>
              <p className="text-[12px] text-green-400/80 italic leading-relaxed">
                {record.returnToServiceStatement.length > 200
                  ? record.returnToServiceStatement.slice(0, 200).trimEnd() +
                    "…"
                  : record.returnToServiceStatement}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "maintenance_43_9", label: "Maintenance" },
  { value: "inspection_43_11", label: "Inspection" },
  { value: "correction", label: "Correction" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AircraftLogbookPage() {
  const params = useParams();
  const tailNumber = decodeURIComponent(params.tail as string);

  const { orgId, isLoaded: orgLoaded } = useCurrentOrg();

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Get aircraft record so we have the aircraftId
  const aircraft = useQuery(
    api.aircraft.getByTailNumber,
    orgId ? { organizationId: orgId, tailNumber } : "skip",
  );

  const rawRecords = useQuery(
    api.maintenanceRecords.listByAircraft,
    orgId && aircraft
      ? { aircraftId: aircraft._id, organizationId: orgId }
      : "skip",
  );
  // Cast to our display interface (Convex returns a superset of these fields)
  const records = rawRecords as MaintenanceRecord[] | undefined;

  const isLoading = !orgLoaded || aircraft === undefined;

  // ── Filter logic ─────────────────────────────────────────────────────────────
  const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
  const toMs = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

  const filtered = (records ?? []).filter((r) => {
    if (filterType !== "all" && r.recordType !== filterType) return false;
    if (fromMs && r.completionDate < fromMs) return false;
    if (toMs && r.completionDate > toMs) return false;
    return true;
  });

  // Sort newest first
  const sorted = [...filtered].sort((a, b) => b.sequenceNumber - a.sequenceNumber);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="sm" className="mt-0.5">
          <Link to="/fleet">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Fleet
          </Link>
        </Button>
        <div className="flex-1">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-52" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : aircraft === null ? (
            <>
              <h1 className="text-2xl font-bold font-mono text-foreground">
                {tailNumber}
              </h1>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">Aircraft not found</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
                <h1 className="text-2xl font-bold text-foreground">
                  <span className="font-mono">{aircraft.currentRegistration}</span>
                  <span className="text-muted-foreground font-normal ml-2 text-lg">
                    Maintenance Logbook
                  </span>
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 ml-7">
                {aircraft.yearOfManufacture} {aircraft.make} {aircraft.model}
                {aircraft.series ? ` ${aircraft.series}` : ""} — S/N{" "}
                {aircraft.serialNumber}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Record type filter */}
            <div className="flex items-center gap-1.5">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    filterType === opt.value
                      ? "border-border bg-muted text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-5 opacity-40" />

            {/* Date range */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-background border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-background border border-border/60 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Record count */}
            {records !== undefined && (
              <span className="ml-auto text-xs text-muted-foreground">
                {sorted.length} of {records.length} record
                {records.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {isLoading ? (
        <LogbookSkeleton />
      ) : aircraft === null ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-8 h-8 text-red-400/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Aircraft &ldquo;{tailNumber}&rdquo; not found
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-4">
              <Link to="/fleet">← Back to Fleet</Link>
            </Button>
          </CardContent>
        </Card>
      ) : sorted.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No maintenance records for this aircraft
            </p>
            {(filterType !== "all" || dateFrom || dateTo) && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try adjusting your filters
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Timeline entries */
        <div className="relative space-y-3">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border/40 -z-0" />
          {sorted.map((record) => (
            <div key={record._id} className="relative pl-10">
              {/* Timeline dot */}
              <div
                className={`absolute left-3 top-4 w-3.5 h-3.5 rounded-full border-2 border-background ${
                  record.recordType === "maintenance_43_9"
                    ? "bg-sky-500"
                    : record.recordType === "inspection_43_11"
                    ? "bg-violet-500"
                    : "bg-amber-500"
                }`}
              />
              <LogbookEntry record={record} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
