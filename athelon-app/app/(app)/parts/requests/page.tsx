"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type InspectionResult = "approved" | "rejected";

interface PartItem {
  _id: Id<"parts">;
  partNumber: string;
  partName: string;
  description?: string | null;
  serialNumber?: string | null;
  condition: string;
  location: string;
  supplier?: string | null;
  receivingDate?: number | null;
  isOwnerSupplied: boolean;
  receivingWorkOrderId?: Id<"workOrders"> | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLocationStyle(location: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    pending_inspection: {
      label: "Pending Inspection",
      color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
    },
    inventory: {
      label: "In Stock",
      color: "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10",
    },
    installed: {
      label: "Installed",
      color: "text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/10",
    },
    removed_pending_disposition: {
      label: "Removed — Pending Disposition",
      color: "text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/10",
    },
    quarantine: {
      label: "Quarantine",
      color: "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10",
    },
    scrapped: {
      label: "Scrapped",
      color: "text-slate-500 dark:text-slate-400 border-slate-500/30 bg-slate-500/10",
    },
    returned_to_vendor: {
      label: "Returned to Vendor",
      color: "text-muted-foreground border-border/30 bg-muted",
    },
  };
  return map[location] ?? { label: location, color: "text-muted-foreground border-border/30 bg-muted" };
}

// ─── Receiving Inspection Dialog ──────────────────────────────────────────────

interface InspectDialogProps {
  open: boolean;
  onClose: () => void;
  part: PartItem | null;
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
    if (!part) return;
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
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            Receiving Inspection
          </DialogTitle>
        </DialogHeader>

        {part && (
          <div className="space-y-4 py-2">
            {/* Part info */}
            <div className="p-3 rounded-md bg-muted/20 border border-border/40 space-y-1">
              <p className="text-sm font-semibold font-mono text-foreground">
                {part.partNumber}
              </p>
              <p className="text-sm text-muted-foreground">{part.partName}</p>
              {part.description && (
                <p className="text-xs text-muted-foreground">{part.description}</p>
              )}
              {part.serialNumber && (
                <p className="text-xs text-muted-foreground font-mono">S/N: {part.serialNumber}</p>
              )}
            </div>

            {/* Inspection result */}
            <div>
              <Label className="text-xs font-medium mb-2 block">
                Inspection Result <span className="text-destructive">*</span>
              </Label>
              <Select value={result} onValueChange={(v) => setResult(v as InspectionResult)}>
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
        )}

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
            className={`min-w-[140px] gap-1.5 ${
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PartsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-7 w-20 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartsRequestsPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const [inspectTarget, setInspectTarget] = useState<PartItem | null>(null);

  // Parts pending receiving inspection
  const pendingParts = useQuery(
    api.parts.listParts,
    orgId ? { organizationId: orgId, location: "pending_inspection" } : "skip",
  );

  // Parts removed from aircraft, awaiting disposition decision
  const removedParts = useQuery(
    api.parts.listParts,
    orgId ? { organizationId: orgId, location: "removed_pending_disposition" } : "skip",
  );

  const isLoading = !isLoaded || pendingParts === undefined || removedParts === undefined;

  const allParts = [...(pendingParts ?? []), ...(removedParts ?? [])] as PartItem[];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
            Parts Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? (
              <Skeleton className="h-3 w-32 inline-block" />
            ) : (
              <>
                {(pendingParts ?? []).length} pending inspection
                {(removedParts ?? []).length > 0 && (
                  <> · <span className="text-orange-500 dark:text-orange-400">{(removedParts ?? []).length} removed / pending disposition</span></>
                )}
              </>
            )}
          </p>
        </div>
        <Button size="sm" asChild className="w-full sm:w-auto">
          <Link to="/parts/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Receive Part
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div role="status" aria-label="Loading parts queue">
          <PartsSkeleton />
        </div>
      ) : allParts.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No pending parts</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Parts pending inspection or disposition will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="space-y-2"
          aria-live="polite"
          aria-label={`Parts queue, ${allParts.length} part${allParts.length !== 1 ? "s" : ""}`}
        >
          {allParts.map((part) => {
            const locationStyle = getLocationStyle(part.location);
            const isPendingInspection = part.location === "pending_inspection";
            const isRemovedPending = part.location === "removed_pending_disposition";

            return (
              <Card
                key={part._id}
                className={`border-border/60 ${isRemovedPending ? "border-l-4 border-l-orange-500" : isPendingInspection ? "border-l-4 border-l-amber-500" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {isRemovedPending ? (
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          P/N: {part.partNumber}
                        </span>
                        {(part.condition === "unserviceable" || part.location === "quarantine") && (
                          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px] font-semibold">
                            UNSERVICEABLE
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] border ${locationStyle.color}`}
                        >
                          {locationStyle.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {part.partName}
                        {part.description ? ` — ${part.description}` : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {part.serialNumber && (
                          <>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              S/N: {part.serialNumber}
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                          </>
                        )}
                        <span className="text-[11px] text-muted-foreground capitalize">
                          Cond: {part.condition}
                        </span>
                        {part.supplier && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">
                              {part.supplier}
                            </span>
                          </>
                        )}
                        {part.receivingDate && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">
                              Received{" "}
                              {new Date(part.receivingDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </>
                        )}
                        {part.isOwnerSupplied && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground border-border/40"
                            >
                              OSP
                            </Badge>
                          </>
                        )}
                        {isRemovedPending && part.receivingWorkOrderId && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <Link
                              to={`/work-orders/${part.receivingWorkOrderId}`}
                              className="text-[11px] text-primary hover:underline"
                            >
                              View WO
                            </Link>
                          </>
                        )}
                      </div>
                      {/* Disposition guidance for removed parts */}
                      {isRemovedPending && (
                        <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1.5">
                          Removed from aircraft — awaiting disposition (scrap, return to vendor, or return to stock via full WO flow).
                        </p>
                      )}
                    </div>

                    {/* Action column */}
                    <div className="flex-shrink-0">
                      {isPendingInspection && techId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                          onClick={() => setInspectTarget(part)}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          Inspect
                        </Button>
                      ) : isPendingInspection && !techId ? (
                        <span className="text-[10px] text-muted-foreground">No tech profile</span>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Receiving Inspection Dialog */}
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
