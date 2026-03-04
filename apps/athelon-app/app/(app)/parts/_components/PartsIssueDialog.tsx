"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Package, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryPart {
  _id: Id<"parts">;
  partNumber: string;
  partName: string;
  description?: string;
  serialNumber?: string;
  condition: string;
  location: string;
  supplier?: string;
}

interface PartsIssueDialogProps {
  open: boolean;
  onClose: () => void;
  requestId: Id<"workOrderParts">;
  partNumber: string;
  partName: string;
  workOrderId: Id<"workOrders">;
  organizationId: Id<"organizations">;
  technicianId?: Id<"technicians">;
  performedByUserId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PartsIssueDialog({
  open,
  onClose,
  requestId,
  partNumber,
  partName,
  workOrderId,
  organizationId,
  technicianId,
  performedByUserId,
}: PartsIssueDialogProps) {
  const [selectedPartId, setSelectedPartId] = useState<Id<"parts"> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NOTE: api.workOrderParts types resolve after `convex dev` regenerates types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issuePart = useMutation((api as any).workOrderParts?.issuePart);

  // Fetch parts matching the part number that are in inventory
  const inventoryParts = useQuery(
    api.parts.listParts,
    organizationId
      ? { organizationId, location: "inventory" }
      : "skip",
  );

  // Filter to matching part numbers
  const matchingParts = useMemo(() => {
    if (!inventoryParts) return [];
    const normalizedPn = partNumber.toUpperCase().trim();
    return (inventoryParts as InventoryPart[]).filter(
      (part) => part.partNumber.toUpperCase().trim() === normalizedPn,
    );
  }, [inventoryParts, partNumber]);

  function resetForm() {
    setSelectedPartId(null);
    setError(null);
  }

  function handleClose() {
    if (submitting) return;
    resetForm();
    onClose();
  }

  async function handleIssue() {
    setError(null);

    if (!selectedPartId) {
      setError("Select a part from inventory to issue.");
      return;
    }

    setSubmitting(true);
    try {
      await issuePart({
        requestId,
        partId: selectedPartId,
        issuedByTechnicianId: technicianId,
        performedByUserId,
      });

      toast.success(`Part ${partNumber} issued to work order.`);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue part.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLoading = inventoryParts === undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4 text-primary" />
            Issue Part from Inventory
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select a matching part from inventory to fulfill this request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Request info */}
          <div className="p-3 rounded-md bg-muted/20 border border-border/40 space-y-1">
            <p className="text-xs text-muted-foreground">Requested Part</p>
            <p className="text-sm font-semibold font-mono">{partNumber}</p>
            <p className="text-xs text-muted-foreground">{partName}</p>
          </div>

          {/* Matching parts list */}
          <div>
            <p className="text-xs font-medium mb-2">
              Available in Inventory ({isLoading ? "..." : matchingParts.length})
            </p>

            {isLoading ? (
              <div className="text-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">Loading inventory...</p>
              </div>
            ) : matchingParts.length === 0 ? (
              <div className="text-center py-6 border border-border/40 rounded-md">
                <Package className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  No matching parts in inventory for P/N {partNumber}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Receive the part first, then issue it here.
                </p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {matchingParts.map((part) => {
                  const isSelected = selectedPartId === part._id;
                  return (
                    <button
                      key={part._id}
                      type="button"
                      className={`w-full text-left rounded-md border p-2.5 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/40 hover:bg-muted/40"
                      }`}
                      onClick={() => setSelectedPartId(part._id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold">{part.partNumber}</span>
                        <div className="flex items-center gap-1.5">
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10"
                          >
                            Available
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{part.partName}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                        {part.serialNumber && <span>S/N {part.serialNumber}</span>}
                        <span className="capitalize">Cond: {part.condition}</span>
                        {part.supplier && <span>{part.supplier}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
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
            disabled={submitting || !selectedPartId || matchingParts.length === 0}
            className="min-w-[120px] gap-1.5"
            onClick={handleIssue}
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Issue Part
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
