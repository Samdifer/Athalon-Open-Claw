"use client";

import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  PlusCircle,
  AlertTriangle,
  RotateCcw,
  Download,
  List,
  Clock,
  Search,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { NotFoundCard } from "@/components/NotFoundCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CreateRecordForm } from "./_components/CreateRecordForm";

function inspectionBadge(type?: string) {
  if (!type) return null;
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    annual: { label: "Annual", variant: "default" },
    "100_hour": { label: "100-Hour", variant: "default" },
    progressive: { label: "Progressive", variant: "secondary" },
    conditional: { label: "Conditional", variant: "outline" },
  };
  const info = map[type] ?? { label: type, variant: "outline" as const };
  return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
}

export default function MaintenanceRecordsPage() {
  const params = useParams<{ id: string }>();
  const workOrderId = params.id as Id<"workOrders">;
  const { orgId } = useCurrentOrg();

  const [showForm, setShowForm] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filtered full records for the table/timeline view
  const filteredFullRecords = useMemo(() => {
    if (!fullRecords) return [];
    if (!searchQuery.trim()) return fullRecords;
    const q = searchQuery.toLowerCase();
    return fullRecords.filter(
      (r) =>
        r.workPerformed?.toLowerCase().includes(q) ||
        r.approvedDataReference?.toLowerCase().includes(q) ||
        r.sequenceNumber?.toString().includes(q),
    );
  }, [fullRecords, searchQuery]);

  function handleSuccess() {
    setShowForm(false);
    setCorrectionTarget(null);
  }

  function handleCorrect(recordId: string) {
    setCorrectionTarget(recordId);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleExport() {
    if (!fullRecords || !report) return;
    const lines = [
      `Maintenance Records — ${report.workOrderNumber} — ${report.aircraftRegistration}`,
      `Exported: ${new Date().toISOString()}`,
      "",
      "Seq\tDate\tDescription\tApproved Data\tSigned",
      ...fullRecords.map((r) =>
        [
          r.sequenceNumber,
          r.completionDate ? new Date(r.completionDate).toLocaleDateString() : "—",
          (r.workPerformed ?? "").replace(/\t/g, " ").slice(0, 80),
          r.approvedDataReference ?? "—",
          r.signatureHash ? "Yes" : "No",
        ].join("\t"),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `records-${report.workOrderNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
  const totalRecords = fullRecords?.length ?? records.length;
  const signedCount = fullRecords?.filter((r) => r.signatureHash).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Back */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 -ml-2 text-xs text-muted-foreground"
      >
        <Link to={`/work-orders/${workOrderId}`}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          {report.workOrderNumber}
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            Maintenance Records
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono">{report.workOrderNumber}</span>
            {" · "}
            <span className="font-mono font-semibold">
              {report.aircraftRegistration}
            </span>
            {" · "}
            <span>{totalRecords} record{totalRecords !== 1 ? "s" : ""}</span>
            {signedCount > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {" "}({signedCount} signed)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-1.5 h-8 text-xs"
            disabled={!fullRecords?.length}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
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
      </div>

      {/* Status Banner */}
      {unsignedCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
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
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Correction Record
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  New Maintenance Record
                </>
              )}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Per 14 CFR 43.9 — include description of work, approved data reference, and FAA 8610-2 info if applicable.
            </p>
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

      {/* View Toggle & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "timeline")} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="table" className="text-xs gap-1.5 h-7 px-3">
              <List className="w-3 h-3" /> Table
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1.5 h-7 px-3">
              <Clock className="w-3 h-3" /> Timeline
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records…"
            className="h-8 text-xs pl-8"
          />
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-12">#</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Approved Data</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFullRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      {searchQuery ? "No records match your search." : "No maintenance records yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFullRecords.map((r) => {
                    const isSigned = !!r.signatureHash;
                    const isCorrection = !!(r as Record<string, unknown>).correctsRecordId;
                    return (
                      <TableRow key={r._id} className={isCorrection ? "bg-amber-500/5" : ""}>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {r.sequenceNumber}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {r.completionDate ? new Date(r.completionDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[250px] truncate">
                          {isCorrection && (
                            <RotateCcw className="w-3 h-3 text-amber-500 inline mr-1" />
                          )}
                          {r.workPerformed ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[140px] truncate">
                          {r.approvedDataReference ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {inspectionBadge((r as Record<string, unknown>).inspectionType as string | undefined)}
                          {r.returnedToService && (
                            <Badge className="text-[9px] ml-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                              RTS
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isSigned ? (
                            <Lock className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Unsigned</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isCorrection && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={() => handleCorrect(r._id)}
                            >
                              Correct
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <div className="space-y-0 relative">
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />
          {filteredFullRecords.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {searchQuery ? "No records match your search." : "No maintenance records yet."}
              </CardContent>
            </Card>
          ) : (
            filteredFullRecords.map((r, i) => {
              const isSigned = !!r.signatureHash;
              const isCorrection = !!(r as Record<string, unknown>).correctsRecordId;
              return (
                <div key={r._id} className="relative pl-10 pb-5">
                  <div
                    className={`absolute left-[14px] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                      isSigned
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-background border-amber-500"
                    }`}
                  />
                  <Card className={`${isCorrection ? "border-amber-500/30" : ""}`}>
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            #{r.sequenceNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {r.completionDate ? new Date(r.completionDate).toLocaleDateString() : "—"}
                          </span>
                          {isCorrection && (
                            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30">
                              <RotateCcw className="w-2.5 h-2.5 mr-1" /> Correction
                            </Badge>
                          )}
                          {inspectionBadge((r as Record<string, unknown>).inspectionType as string | undefined)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isSigned && <Lock className="w-3 h-3 text-emerald-500" />}
                          {r.returnedToService && (
                            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                              RTS
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs">{r.workPerformed ?? "No description"}</p>
                      {r.approvedDataReference && (
                        <p className="text-[10px] font-mono text-muted-foreground">
                          Ref: {r.approvedDataReference}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* AI-075: Legacy RecordsList removed — replaced by filteredFullRecords table/timeline above */}

      {/* Regulatory Note */}
      <p className="text-[11px] text-muted-foreground/60 text-center">
        Maintenance records are immutable once signed. Errors must be corrected
        by creating a correction record. Per 14 CFR 43.9, AC 43-9C, and FAA Form 8610-2.
      </p>
    </div>
  );
}
