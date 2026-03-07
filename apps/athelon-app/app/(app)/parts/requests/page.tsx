"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Loader2, AlertCircle, Send, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useSelectedLocation } from "@/components/LocationSwitcher";
import { toast } from "sonner";
import { PartStatusBadge } from "@/src/shared/components/PartStatusBadge";
import { PartsIssueDialog } from "@/app/(app)/parts/_components/PartsIssueDialog";
import { Input } from "@/components/ui/input";
import {
  type PartReturnQueueItem,
  getReturnQueue,
  saveReturnQueue,
  PartReturnDialog,
} from "@/app/(app)/parts/_components/PartReturnDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of a workOrderParts record from the live query. */
interface WoPartRequest {
  _id: Id<"workOrderParts">;
  organizationId: Id<"organizations">;
  workOrderId: Id<"workOrders">;
  partNumber: string;
  partName: string;
  status: string;
  quantityRequested: number;
  notes?: string;
  createdAt: number;
}

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
        checklistCompleted: true,
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
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitting) handleClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            Receiving Inspection
          </DialogTitle>
          <DialogDescription className="text-xs">
            Inspect the incoming part and record your findings.
          </DialogDescription>
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
                  onChange={(e) => setRejectionReason(e.target.value.slice(0, 500))}
                  placeholder="Describe why the part is being rejected…"
                  rows={2}
                  maxLength={500}
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
                onChange={(e) => setInspectionNotes(e.target.value.slice(0, 500))}
                placeholder="Any observations during receiving inspection…"
                rows={2}
                maxLength={500}
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
  const { selectedLocationId } = useSelectedLocation(orgId);
  const selectedShopLocationId =
    selectedLocationId === "all"
      ? "all"
      : (selectedLocationId as Id<"shopLocations">);

  const [inspectTarget, setInspectTarget] = useState<PartItem | null>(null);
  const [issueTarget, setIssueTarget] = useState<{
    requestId: Id<"workOrderParts">;
    partNumber: string;
    partName: string;
    workOrderId: Id<"workOrders">;
  } | null>(null);

  // MBP-0048: Part Return Queue
  const [returnQueue, setReturnQueue] = useState<PartReturnQueueItem[]>(() =>
    orgId ? getReturnQueue(orgId) : [],
  );

  // Refresh return queue when orgId changes
  // (simple effect-free approach: re-read on render if orgId is set)
  const refreshReturnQueue = () => {
    if (orgId) setReturnQueue(getReturnQueue(orgId));
  };

  function handleReturnAction(itemId: string, action: "received" | "inspected" | "restocked" | "rejected") {
    if (!orgId) return;
    const queue = getReturnQueue(orgId);
    const updated = queue.map((item) =>
      item.id === itemId ? { ...item, status: action as PartReturnQueueItem["status"] } : item,
    );
    saveReturnQueue(orgId, updated);
    setReturnQueue(updated);
    toast.success(`Part return marked as ${action}.`);
  }

  // MBP-0037: Catalog search for intake control
  const [catalogSearch, setCatalogSearch] = useState("");
  const allInventoryParts = useQuery(
    api.parts.listParts,
    orgId
      ? { organizationId: orgId, location: "inventory", shopLocationId: selectedShopLocationId }
      : "skip",
  ) as PartItem[] | undefined;

  const catalogResults = (allInventoryParts ?? []).filter((p) => {
    if (!catalogSearch.trim()) return false;
    const q = catalogSearch.toLowerCase();
    return (
      p.partNumber.toLowerCase().includes(q) ||
      p.partName.toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q)
    );
  }).slice(0, 10);

  // Open WO part requests across all work orders
  // NOTE: api.workOrderParts types resolve after `convex dev` regenerates types
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const openRequests: WoPartRequest[] | undefined = useQuery(
    (api as any).workOrderParts?.listOpenRequests,
    orgId ? { organizationId: orgId } : "skip",
  ) as WoPartRequest[] | undefined;

  const cancelRequest = useMutation(
    (api as any).workOrderParts?.cancelRequest,
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Parts pending receiving inspection
  const pendingParts = useQuery(
    api.parts.listParts,
    orgId
      ? { organizationId: orgId, location: "pending_inspection", shopLocationId: selectedShopLocationId }
      : "skip",
  );

  // Parts removed from aircraft, awaiting disposition decision
  const removedParts = useQuery(
    api.parts.listParts,
    orgId
      ? { organizationId: orgId, location: "removed_pending_disposition", shopLocationId: selectedShopLocationId }
      : "skip",
  );

  const isLoading = !isLoaded || pendingParts === undefined || removedParts === undefined;
  const isOpenRequestsLoading = !isLoaded || openRequests === undefined;

  const allParts = [...(pendingParts ?? []), ...(removedParts ?? [])] as PartItem[];

  async function handleCancelRequest(requestId: Id<"workOrderParts">) {
    if (typeof cancelRequest !== "function") {
      toast.error("Part request cancellation is not available — workOrderParts module may not be deployed yet.");
      return;
    }
    try {
      await cancelRequest({ requestId });
      toast.success("Part request cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel request.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
            Parts Queue
          </h1>
          <span className="block text-sm text-muted-foreground mt-0.5">
            {isLoading ? (
              <Skeleton className="h-3 w-32 inline-block" />
            ) : (
              <>
                {(openRequests ?? []).length} open requests
                {" · "}
                {(pendingParts ?? []).length} pending inspection
                {(removedParts ?? []).length > 0 && (
                  <> · <span className="text-orange-500 dark:text-orange-400">{(removedParts ?? []).length} removed / pending disposition</span></>
                )}
              </>
            )}
          </span>
        </div>
        <Button size="sm" asChild className="w-full sm:w-auto">
          <Link to="/parts/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Receive Part
          </Link>
        </Button>
      </div>

      {/* ─── Open WO Part Requests ──────────────────────────────────────── */}
      {!isOpenRequestsLoading && (openRequests ?? []).length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Open Work Order Part Requests
              <Badge variant="outline" className="text-[10px] ml-1">
                {(openRequests ?? []).length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(openRequests ?? []).map((request) => (
              <div
                key={request._id}
                className="rounded-md border border-border/50 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold">
                        {request.partNumber}
                      </span>
                      <PartStatusBadge status={request.status} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {request.partName}
                    </p>
                  </div>
                  <Link
                    to={`/work-orders/${request.workOrderId}`}
                    className="text-[10px] text-primary hover:underline flex-shrink-0"
                  >
                    View WO
                  </Link>
                </div>
                <div className="text-[11px] text-muted-foreground flex gap-3 flex-wrap">
                  <span>Qty: {request.quantityRequested}</span>
                  {request.notes && <span>{request.notes}</span>}
                  <span>
                    {new Date(request.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {orgId && (
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setIssueTarget({
                          requestId: request._id,
                          partNumber: request.partNumber,
                          partName: request.partName,
                          workOrderId: request.workOrderId,
                        })
                      }
                    >
                      Issue from Inventory
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleCancelRequest(request._id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                        {part.condition === "unserviceable" && (
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
                                timeZone: "UTC",
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
                      ) : isRemovedPending && part.receivingWorkOrderId ? (
                        <Link
                          to={`/work-orders/${part.receivingWorkOrderId}`}
                          className="inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md border border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 transition-colors"
                        >
                          Disposition via WO →
                        </Link>
                      ) : isRemovedPending ? (
                        <Link
                          to={`/parts?q=${encodeURIComponent(part.partNumber)}`}
                          className="inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md border border-border/50 text-muted-foreground hover:bg-muted/40 transition-colors"
                        >
                          View in Inventory →
                        </Link>
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

      {/* Parts Issue Dialog */}
      {issueTarget && orgId && (
        <PartsIssueDialog
          open={!!issueTarget}
          onClose={() => setIssueTarget(null)}
          requestId={issueTarget.requestId}
          partNumber={issueTarget.partNumber}
          partName={issueTarget.partName}
          workOrderId={issueTarget.workOrderId}
          organizationId={orgId}
          technicianId={techId ?? undefined}
        />
      )}

      {/* ─── MBP-0037: Catalog Search / Intake Control ─────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Catalog Search — Part Request Intake
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Search existing parts to prefill a request, or submit a net-new part for clerk approval.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search by part number, name, or description..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="text-sm"
          />
          {catalogResults.length > 0 && (
            <div className="space-y-1.5">
              {catalogResults.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between p-2 rounded-md border border-border/40 bg-muted/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-medium truncate">{p.partNumber}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.partName}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] ml-2">
                    {p.condition}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {catalogSearch.trim() && catalogResults.length === 0 && allInventoryParts !== undefined && (
            <p className="text-xs text-muted-foreground italic">
              No matching parts found in catalog. You may submit a net-new part request via{" "}
              <Link to="/parts/new" className="text-primary hover:underline">Receive Part</Link>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── MBP-0048: Part Return Queue ────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" />
              Part Return Queue
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={refreshReturnQueue}>
                Refresh
              </Button>
              <PartReturnDialog
                orgId={orgId}
                techName={undefined}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {returnQueue.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No parts pending return. Technicians can initiate returns from work card steps.
            </p>
          ) : (
            <div className="space-y-2">
              {returnQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-md border border-border/40"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-medium">{item.partNumber}</span>
                      {item.serialNumber && (
                        <span className="text-[10px] text-muted-foreground font-mono">S/N: {item.serialNumber}</span>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          item.status === "pending"
                            ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
                            : item.status === "received"
                              ? "border-blue-500/30 text-blue-600 dark:text-blue-400"
                              : item.status === "restocked"
                                ? "border-green-500/30 text-green-600 dark:text-green-400"
                                : item.status === "rejected"
                                  ? "border-red-500/30 text-red-600 dark:text-red-400"
                                  : "border-border/30"
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Qty: {item.quantity} · {item.condition} · Returned by: {item.returnedBy}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{item.reason}</p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(item.returnedAt).toLocaleString()}
                    </p>
                  </div>
                  {item.status === "pending" && (
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={() => handleReturnAction(item.id, "received")}
                      >
                        Confirm Receipt
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 text-red-500"
                        onClick={() => handleReturnAction(item.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {item.status === "received" && (
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={() => handleReturnAction(item.id, "inspected")}
                      >
                        Inspected
                      </Button>
                    </div>
                  )}
                  {item.status === "inspected" && (
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 text-green-600"
                        onClick={() => handleReturnAction(item.id, "restocked")}
                      >
                        Re-Stock
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
