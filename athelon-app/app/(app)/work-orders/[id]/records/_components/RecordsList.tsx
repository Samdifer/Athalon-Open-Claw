"use client";

import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Wrench,
  Lock,
  Info,
  RotateCcw,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ─── Record Status Badge ────────────────────────────────────────────────────────

function RecordStatusBadge({
  isSigned,
  isBlocking,
}: {
  isSigned: boolean;
  isBlocking: boolean;
}) {
  if (isSigned && !isBlocking) {
    return (
      <Badge
        variant="outline"
        className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]"
      >
        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
        Signed
      </Badge>
    );
  }
  if (isBlocking) {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]"
      >
        <XCircle className="w-2.5 h-2.5 mr-1" />
        Unsigned
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]"
    >
      <Clock className="w-2.5 h-2.5 mr-1" />
      Pending
    </Badge>
  );
}

// ─── Record Type Badge ──────────────────────────────────────────────────────────

function RecordTypeBadge({ recordType }: { recordType: string }) {
  const map: Record<string, string> = {
    maintenance_43_9: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    inspection_43_11: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    correction: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  const labels: Record<string, string> = {
    maintenance_43_9: "43.9 Maint",
    inspection_43_11: "43.11 Insp",
    correction: "Correction",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] border ${map[recordType] ?? "bg-muted text-muted-foreground"}`}
    >
      {labels[recordType] ?? recordType}
    </Badge>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RecordRow {
  recordId: string;
  recordType: string;
  completionDate?: number;
  isSigned: boolean;
  isBlocking: boolean;
}

interface RecordsListProps {
  records: RecordRow[];
  hashMap: Map<string, string>;
  showForm: boolean;
  onCorrect: (recordId: string) => void;
  onAddFirst: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function RecordsList({
  records,
  hashMap,
  showForm,
  onCorrect,
  onAddFirst,
}: RecordsListProps) {
  const unsignedCount = records.filter((r) => r.isBlocking).length;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5" />
            Records ({records.length})
          </span>
          {records.length > 0 && unsignedCount === 0 && (
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All Signed
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {records.length === 0 ? (
          <div className="py-10 text-center">
            <FileText className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No maintenance records yet.
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Per 14 CFR 43.9, at least one signed maintenance record is
              required before RTS.
            </p>
            {!showForm && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 h-8 text-xs gap-1.5"
                onClick={onAddFirst}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add First Record
              </Button>
            )}
          </div>
        ) : (
          <div>
            {records.map((record, idx) => {
              const sigHash = hashMap.get(record.recordId);
              const hashPreview = sigHash ? sigHash.slice(0, 8) : null;

              return (
                <div key={record.recordId}>
                  {idx > 0 && <Separator className="opacity-30 my-1" />}
                  <div className="flex items-start gap-3 py-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <RecordStatusBadge
                        isSigned={record.isSigned}
                        isBlocking={record.isBlocking}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <RecordTypeBadge recordType={record.recordType} />
                        <span className="font-mono text-[10px] text-muted-foreground/60">
                          {record.recordId.slice(0, 12)}…
                        </span>
                        {/* FEAT-021: Immutability indicator for signed records */}
                        {record.isSigned && hashPreview && (
                          <span
                            title="This record is cryptographically sealed and cannot be modified."
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-mono cursor-help"
                          >
                            <Lock className="w-2.5 h-2.5 flex-shrink-0" />
                            {hashPreview}
                          </span>
                        )}
                      </div>
                      {record.completionDate && (
                        <p className="text-[11px] text-muted-foreground">
                          Completion:{" "}
                          {new Date(record.completionDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            },
                          )}
                        </p>
                      )}
                      {/* FEAT-021: Correction required notice for signed records */}
                      {record.isSigned && (
                        <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded border border-amber-500/20 bg-amber-500/5">
                          <Info className="w-3 h-3 text-amber-400/70 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-amber-400/70 leading-relaxed">
                            <span className="font-semibold text-amber-400">
                              CORRECTION REQUIRED?
                            </span>{" "}
                            This record is sealed. Errors must be corrected via
                            the append-only correction chain — create a
                            Correction Record referencing this record&apos;s
                            ID. The original record is preserved unchanged per
                            14 CFR 43.9 and AC 43-9C.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1 px-2"
                        onClick={() => onCorrect(record.recordId)}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Correct
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
