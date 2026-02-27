"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Package,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────

type InspectionResult = "approved" | "rejected";

// ─── Inspect Dialog ────────────────────────────────────────────────────────────

interface InspectDialogProps {
  open: boolean;
  onClose: () => void;
  part: {
    _id: Id<"parts">;
    partNumber: string;
    description?: string | null;
    serialNumber?: string | null;
  };
  techId: Id<"technicians">;
}

function InspectDialog({ open, onClose, part, techId }: InspectDialogProps) {
  const [result, setResult] = useState<InspectionResult>("approved");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeInspection = useMutation(api.gapFixes.completeReceivingInspection);

  function resetForm() {
    setResult("approved");
    setInspectionNotes("");
    setRejectionReason("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    setError(null);

    if (result === "rejected" && !rejectionReason.trim()) {
      setError("Rejection reason is required when rejecting a part.");
      return;
    }

    setSubmitting(true);
    try {
      await completeInspection({
        partId: part._id,
        inspectedByTechnicianId: techId,
        inspectionResult: result,
        inspectionNotes: inspectionNotes.trim() || undefined,
        rejectionReason: result === "rejected" ? rejectionReason.trim() : undefined,
      });

      toast.success(
        result === "approved"
          ? `Part ${part.partNumber} approved — moved to inventory.`
          : `Part ${part.partNumber} rejected — moved to quarantine.`,
      );
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete inspection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
            Receiving Inspection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Part info */}
          <div className="p-3 rounded-md bg-muted/20 border border-border/40 space-y-1">
            <p className="text-sm font-semibold text-foreground font-mono">
              {part.partNumber}
            </p>
            {part.description && (
              <p className="text-xs text-muted-foreground">{part.description}</p>
            )}
            {part.serialNumber && (
              <p className="text-xs text-muted-foreground">S/N: {part.serialNumber}</p>
            )}
          </div>

          {/* Inspection result */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Inspection Result <span className="text-destructive">*</span>
            </Label>
            <Select
              value={result}
              onValueChange={(v) => setResult(v as InspectionResult)}
            >
              <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    Approved — Move to Inventory
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    Rejected — Move to Quarantine
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rejection reason (only if rejected) */}
          {result === "rejected" && (
            <div>
              <Label className="text-xs font-medium mb-1.5 block">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Describe why the part is being rejected…"
                rows={2}
                className="text-sm bg-muted/30 border-border/60 resize-none"
              />
            </div>
          )}

          {/* Inspector notes */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Inspector Notes{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              placeholder="Any observations during receiving inspection…"
              rows={2}
              className="text-sm bg-muted/30 border-border/60 resize-none"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            className={`min-w-[120px] gap-1.5 ${
              result === "approved"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : result === "approved" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PartsReceivingPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const [inspectTarget, setInspectTarget] = useState<{
    _id: Id<"parts">;
    partNumber: string;
    description?: string | null;
    serialNumber?: string | null;
  } | null>(null);

  const parts = useQuery(
    api.gapFixes.listPartsPendingInspection,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isLoading = !isLoaded || parts === undefined;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            Parts Receiving Inspection
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Parts awaiting receiving inspection before entering inventory.
          </p>
        </div>
        {parts !== undefined && (
          <Badge variant="secondary" className="text-xs tabular-nums">
            {parts.length} pending
          </Badge>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !parts || parts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border/50 rounded-lg">
          <ClipboardCheck className="w-8 h-8 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">
              No parts pending inspection
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Parts will appear here after being received and marked for inspection.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Part Number
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Description
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Serial Number
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Condition
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Received Date
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part) => (
                <TableRow key={part._id} className="hover:bg-muted/10">
                  <TableCell className="font-mono text-sm font-semibold text-foreground">
                    {part.partNumber}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                    <span className="truncate block">
                      {part.description ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {part.serialNumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    {part.condition ? (
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${
                          part.condition === "serviceable"
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : part.condition === "unserviceable"
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {part.condition.replace(/_/g, " ")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(part as unknown as { receivedAt?: number }).receivedAt
                      ? formatDate((part as unknown as { receivedAt: number }).receivedAt)
                      : part._creationTime
                      ? formatDate(part._creationTime)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {techId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                        onClick={() =>
                          setInspectTarget({
                            _id: part._id,
                            partNumber: part.partNumber,
                            description: part.description,
                            serialNumber: part.serialNumber,
                          })
                        }
                      >
                        <ClipboardCheck className="w-3 h-3" />
                        Inspect
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No tech profile
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Inspect Dialog */}
      {inspectTarget && techId && (
        <InspectDialog
          open={!!inspectTarget}
          onClose={() => setInspectTarget(null)}
          part={inspectTarget}
          techId={techId}
        />
      )}
    </div>
  );
}
