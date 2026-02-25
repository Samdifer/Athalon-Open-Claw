"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  PlusCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundCard } from "@/components/NotFoundCard";
import { CreateRecordForm } from "./_components/CreateRecordForm";
import { RecordsList } from "./_components/RecordsList";

export default function MaintenanceRecordsPage() {
  const params = useParams<{ id: string }>();
  const workOrderId = params.id as Id<"workOrders">;
  const { orgId } = useCurrentOrg();

  const [showForm, setShowForm] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<string | null>(null);

  // Fetch close readiness report (contains maintenance records summary)
  const report = useQuery(
    api.returnToService.getCloseReadinessReport,
    orgId && workOrderId
      ? { workOrderId, organizationId: orgId }
      : "skip",
  );

  // FEAT-021: Fetch full records (with signatureHash) for immutability indicator
  const fullRecords = useQuery(
    api.maintenanceRecords.listForWorkOrder,
    orgId && workOrderId
      ? { workOrderId, organizationId: orgId }
      : "skip",
  );

  // Build signatureHash lookup map: recordId → hash
  const hashMap = new Map<string, string>(
    (fullRecords ?? [])
      .filter((r) => r.signatureHash)
      .map((r) => [r._id as string, r.signatureHash as string]),
  );

  function handleSuccess() {
    setShowForm(false);
    setCorrectionTarget(null);
  }

  function handleCorrect(recordId: string) {
    setCorrectionTarget(recordId);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (report === undefined) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-64" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (report === null) {
    return (
      <NotFoundCard
        message="Work order not found. It may have been deleted or the link is invalid."
        backHref="/work-orders"
        backLabel="Back to Work Orders"
      />
    );
  }

  const records = report.maintenanceRecords;
  const unsignedCount = records.filter(
    (r: { isBlocking: boolean }) => r.isBlocking,
  ).length;

  return (
    <div className="space-y-5">
      {/* Back */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 -ml-2 text-xs text-muted-foreground"
      >
        <Link href={`/work-orders/${workOrderId}`}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          {report.workOrderNumber}
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            Maintenance Records
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono">{report.workOrderNumber}</span>
            {" · "}
            <span className="font-mono font-semibold">
              {report.aircraftRegistration}
            </span>
          </p>
        </div>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => {
              setCorrectionTarget(null);
              setShowForm(true);
            }}
            className="gap-1.5 h-8 text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Record
          </Button>
        )}
      </div>

      {/* Status Banner */}
      {unsignedCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              {unsignedCount} record{unsignedCount !== 1 ? "s" : ""}{" "}
              {unsignedCount !== 1 ? "are" : "is"} not signed. All maintenance
              records must be signed before RTS can be authorized.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showForm && orgId && (
        <Card className="border-primary/30 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              {correctionTarget ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  Correction Record
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  New Maintenance Record
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateRecordForm
              workOrderId={workOrderId}
              organizationId={orgId}
              onSuccess={handleSuccess}
              onCancel={() => {
                setShowForm(false);
                setCorrectionTarget(null);
              }}
              initialState={
                correctionTarget
                  ? { isCorrection: true, correctsRecordId: correctionTarget }
                  : { isCorrection: false }
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      <RecordsList
        records={records}
        hashMap={hashMap}
        showForm={showForm}
        onCorrect={handleCorrect}
        onAddFirst={() => {
          setCorrectionTarget(null);
          setShowForm(true);
        }}
      />

      {/* Regulatory Note */}
      <p className="text-[11px] text-muted-foreground/60 text-center">
        Maintenance records are immutable once signed. Errors must be corrected
        by creating a correction record. Per 14 CFR 43.9 and AC 43-9C.
      </p>
    </div>
  );
}
