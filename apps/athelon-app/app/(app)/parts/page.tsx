"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useSelectedLocation } from "@/components/LocationSwitcher";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronRight,
  Lock,
  Unlock,
  ClipboardCheck,
  ScanLine,
  Printer,
} from "lucide-react";
import { ExportCSVButton } from "@/src/shared/components/ExportCSVButton";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { printBarcodeLabel } from "@/lib/barcode";
import { PartsRequestForm, type PartsRequestRecord } from "@/app/(app)/parts/_components/PartsRequestForm";
import { PartsRequestQueue } from "@/app/(app)/parts/_components/PartsRequestQueue";
import { QRCodeBadge } from "@/components/QRCodeBadge";
import { PartStatusBadge } from "@/src/shared/components/PartStatusBadge";
import { QRScannerDialog } from "@/components/QRScannerDialog";
import { InventoryMasterTab } from "./_components/InventoryMasterTab";
import { InventoryKanban } from "./_components/InventoryKanban";
import { PartTagBadges } from "./_components/PartTagBadges";
import { PartLocationCell } from "./_components/PartLocationCell";
import { TagFilterDropdown } from "./_components/TagFilterDropdown";
import { QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ─────────────────────────────────────────────────────────────────────

type LocationFilter =
  | "all"
  | "inventory"
  | "pending_inspection"
  | "installed"
  | "quarantine"
  | "removed_pending_disposition"
  | "low_stock"
  | "inventory_master"
  | "kanban"
  | "parts_requests";

type PartCategory = "all" | "consumable" | "standard" | "rotable" | "expendable" | "repairable";

type InspectionResult = "approved" | "rejected";

interface PartDoc {
  _id: Id<"parts">;
  _creationTime?: number;
  shopLocationId?: Id<"shopLocations">;
  partNumber: string;
  partName: string;
  description?: string;
  serialNumber?: string;
  isSerialized?: boolean;
  condition: string;
  location: string;
  receivingDate?: number;
  receivingWorkOrderId?: Id<"workOrders">;
  supplier?: string;
  purchaseOrderNumber?: string;
  isOwnerSupplied: boolean;
  isLifeLimited: boolean;
  lifeLimitHours?: number;
  lifeLimitCycles?: number;
  hasShelfLifeLimit?: boolean;
  shelfLifeLimitDate?: number;
  hoursAccumulatedBeforeInstall?: number;
  cyclesAccumulatedBeforeInstall?: number;
  reservedForWorkOrderId?: Id<"workOrders">;
  reservedByTechnicianId?: Id<"technicians">;
  reservedAt?: number;
  receivingInspectedAt?: number;
  receivingInspectionNotes?: string;
  receivingRejectionReason?: string;
  quarantineReason?: string;
  notes?: string;
  minStockLevel?: number;
  reorderPoint?: number;
  quantityOnHand?: number;
  quantity?: number;
  installPosition?: string;
  eightOneThirtyId?: Id<"eightOneThirtyRecords">;
  // Phase 1-7 inventory extensions (fields resolve after schema migration)
  partCategory?: string;
  lotNumber?: string;
  binLocation?: string;
  binLocationId?: Id<"warehouseBins">;
  unitCost?: number;
}

const LOCATION_LABEL: Record<string, string> = {
  pending_inspection: "Pending Inspection",
  inventory: "In Stock",
  installed: "Installed",
  removed_pending_disposition: "Pending Disposition",
  quarantine: "Quarantine",
  scrapped: "Scrapped",
  returned_to_vendor: "Returned to Vendor",
};

function getPartsRequestStorageKey(orgId: string) {
  return `athelon:parts-requests:${orgId}`;
}

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  serviceable: "Serviceable",
  overhauled: "OH",
  repaired: "Repaired",
  unserviceable: "Unserviceable",
  quarantine: "Quarantine",
  scrapped: "Scrapped",
};

const CATEGORY_LABEL: Record<string, string> = {
  consumable: "Consumable",
  standard: "Standard",
  rotable: "Rotable",
  expendable: "Expendable",
  repairable: "Repairable",
};

const CATEGORY_STYLES: Record<string, string> = {
  consumable: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  standard: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  rotable: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  expendable: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  repairable: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

function getConditionStyles(condition: string): string {
  const map: Record<string, string> = {
    new: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    serviceable: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    overhauled: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    repaired: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
    unserviceable: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    quarantine: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    scrapped: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
  };
  return map[condition] ?? "bg-muted text-muted-foreground";
}

function getLocationIcon(location: string) {
  switch (location) {
    case "pending_inspection":
      return <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />;
    case "inventory":
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />;
    case "quarantine":
      return <ShieldAlert className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />;
    case "removed_pending_disposition":
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />;
    default:
      return <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />;
  }
}

// ─── Receiving Inspection Dialog ───────────────────────────────────────────────

interface ReceivingInspectionDialogProps {
  open: boolean;
  part: PartDoc | null;
  technicianId: Id<"technicians"> | null;
  onClose: () => void;
  onSuccess: (result: InspectionResult) => void;
}

function ReceivingInspectionDialog({
  open,
  part,
  technicianId,
  onClose,
  onSuccess,
}: ReceivingInspectionDialogProps) {
  const [inspectionResult, setInspectionResult] = useState<InspectionResult>("approved");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeInspection = useMutation(api.gapFixes.completeReceivingInspection);

  async function handleSubmit() {
    if (!part || !technicianId) return;
    if (inspectionResult === "rejected" && !rejectionReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await completeInspection({
        partId: part._id,
        inspectedByTechnicianId: technicianId,
        inspectionResult,
        inspectionNotes: inspectionNotes.trim() || undefined,
        rejectionReason: inspectionResult === "rejected" ? rejectionReason.trim() : undefined,
      });
      onSuccess(inspectionResult);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inspection failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setInspectionResult("approved");
    setInspectionNotes("");
    setRejectionReason("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) handleClose(); }}>
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
            <div className="rounded-md bg-muted/30 border border-border/40 px-3 py-2 space-y-0.5">
              <p className="font-mono text-sm font-semibold">{part.partNumber}</p>
              <p className="text-sm text-muted-foreground">{part.partName}</p>
              {part.serialNumber && (
                <p className="text-xs text-muted-foreground">S/N: {part.serialNumber}</p>
              )}
            </div>

            {/* Inspection result */}
            <div>
              <Label className="text-xs font-medium mb-2 block">
                Inspection Result <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <div className="flex gap-3">
                {(["approved", "rejected"] as const).map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border text-sm transition-colors ${
                      inspectionResult === r
                        ? r === "approved"
                          ? "bg-green-500/15 border-green-500/50 text-green-600 dark:text-green-400"
                          : "bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400"
                        : "border-border/50 text-muted-foreground hover:border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="inspectionResult"
                      value={r}
                      checked={inspectionResult === r}
                      onChange={() => setInspectionResult(r)}
                      className="sr-only"
                    />
                    {r === "approved" ? "✓ Approved" : "✗ Rejected"}
                  </label>
                ))}
              </div>
            </div>

            {/* Inspection notes */}
            <div>
              <Label htmlFor="insp-notes" className="text-xs font-medium mb-1.5 block">
                Inspection Notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="insp-notes"
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="Enter inspection notes..."
                rows={2}
                className="text-sm bg-muted/30 border-border/60 resize-none"
              />
            </div>

            {/* Rejection reason (only when rejected) */}
            {inspectionResult === "rejected" && (
              <div>
                <Label htmlFor="insp-reject-reason" className="text-xs font-medium mb-1.5 block">
                  Rejection Reason <span className="text-red-600 dark:text-red-400">*</span>
                </Label>
                <Textarea
                  id="insp-reject-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Describe why this part is being rejected..."
                  rows={2}
                  className="text-sm bg-muted/30 border-border/60 resize-none"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
                {error}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !technicianId}
            className={
              inspectionResult === "rejected"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }
          >
            {isSubmitting ? "Submitting..." : inspectionResult === "approved" ? "Approve — Move to Stock" : "Reject — Move to Quarantine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reserve Part Dialog ───────────────────────────────────────────────────────

interface WorkOrderOption {
  _id: Id<"workOrders">;
  workOrderNumber: string;
  description?: string;
  aircraft?: { currentRegistration?: string; make?: string; model?: string } | null;
}

interface ReservePartDialogProps {
  open: boolean;
  part: PartDoc | null;
  technicianId: Id<"technicians"> | null;
  workOrders: WorkOrderOption[];
  onClose: () => void;
  onSuccess: (woNumber: string) => void;
}

function ReservePartDialog({
  open,
  part,
  technicianId,
  workOrders,
  onClose,
  onSuccess,
}: ReservePartDialogProps) {
  const [selectedWoId, setSelectedWoId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reservePart = useMutation(api.gapFixes.reservePartForWorkOrder);

  async function handleReserve() {
    if (!part || !technicianId || !selectedWoId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await reservePart({
        partId: part._id,
        workOrderId: selectedWoId as Id<"workOrders">,
        reservedByTechnicianId: technicianId,
      });
      const wo = workOrders.find((w) => w._id === selectedWoId);
      onSuccess(wo?.workOrderNumber ?? "WO");
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reservation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setSelectedWoId("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) handleClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4 text-primary" />
            Reserve Part
          </DialogTitle>
        </DialogHeader>

        {part && (
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted/30 border border-border/40 px-3 py-2 space-y-0.5">
              <p className="font-mono text-sm font-semibold">{part.partNumber}</p>
              <p className="text-sm text-muted-foreground">{part.partName}</p>
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">
                Work Order <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <Select value={selectedWoId} onValueChange={setSelectedWoId}>
                <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60">
                  <SelectValue placeholder="Select a work order..." />
                </SelectTrigger>
                <SelectContent>
                  {workOrders.map((wo) => (
                    <SelectItem key={wo._id} value={wo._id}>
                      <span className="font-mono">{wo.workOrderNumber}</span>
                      {wo.aircraft?.currentRegistration && (
                        <span className="text-muted-foreground ml-2">
                          — {wo.aircraft.currentRegistration}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
                {error}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleReserve}
            disabled={isSubmitting || !selectedWoId || !technicianId}
          >
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            {isSubmitting ? "Reserving..." : "Reserve Part"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Part Detail Sheet ─────────────────────────────────────────────────────────

interface PartDetailSheetProps {
  part: PartDoc | null;
  onClose: () => void;
}

function PartDetailSheet({ part, onClose }: PartDetailSheetProps) {
  const open = !!part;

  if (!part) {
    return (
      <Sheet open={false} onOpenChange={() => {}}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" />
      </Sheet>
    );
  }

  const shelfExpiry = part.shelfLifeLimitDate
    ? new Date(part.shelfLifeLimitDate)
    : null;
  const shelfExpired = shelfExpiry ? shelfExpiry < new Date() : false;

  function row(label: string, value: ReactNode, highlight?: "warn" | "err") {
    if (!value && value !== 0) return null;
    return (
      <div className="flex justify-between items-start gap-4 py-1.5">
        <span className="text-xs text-muted-foreground shrink-0 min-w-[130px]">{label}</span>
        <span
          className={`text-xs text-right font-medium ${
            highlight === "err"
              ? "text-red-600 dark:text-red-400"
              : highlight === "warn"
              ? "text-amber-600 dark:text-amber-400"
              : "text-foreground"
          }`}
        >
          {value}
        </span>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <Package className="w-4 h-4 text-muted-foreground" />
            Part Detail
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Identity */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Identity
            </p>
            <div className="bg-muted/20 rounded-md border border-border/40 px-3 py-2 space-y-0.5 divide-y divide-border/30">
              {row("Part Number", <span className="font-mono">{part.partNumber}</span>)}
              {row("Description", part.partName)}
              {part.description && row("Notes", part.description)}
              {row("Serial Number", part.serialNumber ? <span className="font-mono">{part.serialNumber}</span> : null)}
              {row(
                "Condition",
                <Badge
                  variant="outline"
                  className={`text-[10px] border font-medium ${getConditionStyles(part.condition)}`}
                >
                  {CONDITION_LABEL[part.condition] ?? part.condition}
                </Badge>,
              )}
              {row("Location", <PartStatusBadge status={part.location} />)}
              {part.installPosition && row("Install Position", part.installPosition)}
              {part.partCategory && row(
                "Category",
                <Badge
                  variant="outline"
                  className={`text-[10px] border font-medium ${CATEGORY_STYLES[part.partCategory] ?? "bg-muted text-muted-foreground"}`}
                >
                  {CATEGORY_LABEL[part.partCategory] ?? part.partCategory}
                </Badge>,
              )}
              {part.lotNumber && row("Lot Number", <span className="font-mono">{part.lotNumber}</span>)}
              {row("Bin Location", <PartLocationCell binLocationId={part.binLocationId ? String(part.binLocationId) : undefined} legacyBinLocation={part.binLocation} />)}
              {part.unitCost != null && row(
                "Unit Cost",
                `$${part.unitCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Tags
            </p>
            <PartTagBadges partId={String(part._id)} maxVisible={10} />
          </div>

          <Separator className="opacity-30" />

          {/* Receiving */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Receiving / Traceability
            </p>
            <div className="bg-muted/20 rounded-md border border-border/40 px-3 py-2 divide-y divide-border/30">
              {row(
                "Received Date",
                part.receivingDate
                  ? new Date(part.receivingDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })
                  : null,
              )}
              {row("Supplier", part.supplier)}
              {row("P.O. Number", part.purchaseOrderNumber)}
              {row("Owner Supplied", part.isOwnerSupplied ? "Yes" : null)}
              {part.eightOneThirtyId && row("8130-3 Record", "On file ✓")}
              {part.receivingInspectedAt &&
                row(
                  "Inspected",
                  new Date(part.receivingInspectedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  }),
                )}
              {part.receivingInspectionNotes && row("Inspection Notes", part.receivingInspectionNotes)}
              {part.receivingRejectionReason &&
                row("Rejection Reason", part.receivingRejectionReason, "err")}
            </div>
          </div>

          {/* Life & Shelf Limits */}
          {(part.isLifeLimited || part.hasShelfLifeLimit) && (
            <>
              <Separator className="opacity-30" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Life &amp; Shelf Limits
                </p>
                <div className="bg-muted/20 rounded-md border border-border/40 px-3 py-2 divide-y divide-border/30">
                  {part.isLifeLimited && (
                    <>
                      <div className="py-1.5 flex items-center gap-1.5">
                        <Badge className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          Life Limited
                        </Badge>
                      </div>
                      {row("Life Limit", part.lifeLimitHours ? `${part.lifeLimitHours} hrs` : null)}
                      {row("Life Limit Cycles", part.lifeLimitCycles ? `${part.lifeLimitCycles} cycles` : null)}
                      {row(
                        "Hours at Install",
                        part.hoursAccumulatedBeforeInstall != null
                          ? `${part.hoursAccumulatedBeforeInstall} hrs`
                          : null,
                      )}
                      {row(
                        "Cycles at Install",
                        part.cyclesAccumulatedBeforeInstall != null
                          ? `${part.cyclesAccumulatedBeforeInstall} cycles`
                          : null,
                      )}
                      {part.lifeLimitHours != null &&
                        part.hoursAccumulatedBeforeInstall != null &&
                        row(
                          "Hours Remaining",
                          `${Math.max(0, part.lifeLimitHours - part.hoursAccumulatedBeforeInstall).toFixed(1)} hrs`,
                          part.lifeLimitHours - (part.hoursAccumulatedBeforeInstall ?? 0) < part.lifeLimitHours * 0.1
                            ? "err"
                            : part.lifeLimitHours - (part.hoursAccumulatedBeforeInstall ?? 0) < part.lifeLimitHours * 0.25
                            ? "warn"
                            : undefined,
                        )}
                    </>
                  )}
                  {part.hasShelfLifeLimit && shelfExpiry && (
                    <>
                      {row(
                        "Shelf Life Expiry",
                        shelfExpiry.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        }),
                        shelfExpired ? "err" : undefined,
                      )}
                      {shelfExpired && (
                        <div className="py-1.5">
                          <Badge className="text-[10px] bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                            ⚠ SHELF LIFE EXPIRED
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Quarantine */}
          {part.location === "quarantine" && part.quarantineReason && (
            <>
              <Separator className="opacity-30" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Quarantine
                </p>
                <div className="rounded-md bg-orange-500/10 border border-orange-500/30 px-3 py-2">
                  <p className="text-xs text-orange-600 dark:text-orange-400">{part.quarantineReason}</p>
                </div>
              </div>
            </>
          )}

          {/* Reservation */}
          {part.reservedForWorkOrderId && (
            <>
              <Separator className="opacity-30" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Reservation
                </p>
                <div className="bg-muted/20 rounded-md border border-border/40 px-3 py-2 divide-y divide-border/30">
                  <div className="py-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Reserved</span>
                  </div>
                  {part.reservedAt &&
                    row(
                      "Reserved At",
                      new Date(part.reservedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      }),
                    )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {part.notes && (
            <>
              <Separator className="opacity-30" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Notes
                </p>
                <p className="text-xs text-muted-foreground bg-muted/20 rounded-md border border-border/40 px-3 py-2">
                  {part.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function PartSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartsPage() {
  const [activeTab, setActiveTab] = useState<LocationFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<PartCategory>("all");
  const [tagFilter, setTagFilter] = useState<{ tagId?: string; subtagId?: string } | null>(null);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const { role } = useUserRole();

  // Show cost column for admin and parts_clerk roles
  const canViewCost = role === "admin" || role === "shop_manager" || role === "parts_clerk";

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "parts_requests") {
      setActiveTab("parts_requests");
    }
  }, [searchParams]);
  const { orgId, isLoaded } = useCurrentOrg();
  const { selectedLocationId } = useSelectedLocation(orgId);
  const selectedShopLocationId =
    selectedLocationId === "all"
      ? "all"
      : (selectedLocationId as Id<"shopLocations">);

  // Dialog state
  const [inspectPart, setInspectPart] = useState<PartDoc | null>(null);
  const [reservePart, setReservePart] = useState<PartDoc | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrPart, setQrPart] = useState<PartDoc | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [detailPart, setDetailPart] = useState<PartDoc | null>(null);
  const [partsRequests, setPartsRequests] = useState<PartsRequestRecord[]>([]);

  // Load all parts
  const allParts = useQuery(
    api.parts.listParts,
    orgId
      ? {
          organizationId: orgId,
          shopLocationId: selectedShopLocationId,
        }
      : "skip",
  );

  // Load pending inspection parts (server-indexed query)
  const pendingInspectionParts = useQuery(
    api.gapFixes.listPartsPendingInspection,
    orgId ? { organizationId: orgId } : "skip",
  );

  // Tag filter: get part IDs matching the selected tag
  const tagFilteredParts = useQuery(
    api.partTags.getPartsByTag,
    orgId && tagFilter?.tagId
      ? {
          organizationId: orgId,
          tagId: tagFilter.tagId as Id<"tags">,
          subtagId: tagFilter.subtagId as Id<"subtags"> | undefined,
        }
      : "skip",
  );
  const tagFilterPartIds = useMemo(() => {
    if (!tagFilter?.tagId || tagFilteredParts === undefined) return null;
    return new Set(tagFilteredParts);
  }, [tagFilter, tagFilteredParts]);

  // Load self technician for inspections / reservations
  const selfTech = useQuery(
    api.technicians.getSelf,
    orgId ? { organizationId: orgId } : "skip",
  );

  // Load active work orders for reserve dialog
  const activeWorkOrders = useQuery(
    api.workOrders.listActive,
    orgId ? { organizationId: orgId, limit: 50 } : "skip",
  );

  const releasePart = useMutation(api.gapFixes.releasePartReservation);

  const isLoading = !isLoaded || allParts === undefined;
  const parts = (allParts ?? []) as PartDoc[];
  const technicianId = selfTech?._id ?? null;

  useEffect(() => {
    if (!orgId) {
      setPartsRequests([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(getPartsRequestStorageKey(orgId));
      setPartsRequests(raw ? (JSON.parse(raw) as PartsRequestRecord[]) : []);
    } catch {
      setPartsRequests([]);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    window.localStorage.setItem(getPartsRequestStorageKey(orgId), JSON.stringify(partsRequests));
  }, [orgId, partsRequests]);

  // For pending tab, use the server-indexed query; otherwise use allParts filtered client-side
  const filtered = useMemo(() => {
    let result =
      activeTab === "pending_inspection"
        ? ((pendingInspectionParts ?? []) as PartDoc[]).filter((part) =>
            selectedShopLocationId === "all" ? true : part.shopLocationId === selectedShopLocationId,
          )
        : parts;

    // Location filter (skip for pending_inspection — already filtered)
    if (activeTab === "low_stock") {
      result = result.filter(
        (p) =>
          p.reorderPoint != null &&
          p.location === "inventory" &&
          (p.quantityOnHand ?? p.quantity ?? 0) <= p.reorderPoint,
      );
    } else if (
      activeTab !== "all" &&
      activeTab !== "pending_inspection" &&
      activeTab !== "inventory_master" &&
      activeTab !== "parts_requests"
    ) {
      result = result.filter((p) => p.location === activeTab);
    }

    // Category filter (Phase 8)
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.partCategory === categoryFilter);
    }

    // Search — includes lot number and bin location
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.partNumber.toLowerCase().includes(q) ||
          p.partName.toLowerCase().includes(q) ||
          (p.serialNumber ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.lotNumber ?? "").toLowerCase().includes(q) ||
          (p.binLocation ?? "").toLowerCase().includes(q),
      );
    }

    // Tag filter — restrict to parts that have the selected tag
    if (tagFilterPartIds) {
      result = result.filter((p) => tagFilterPartIds.has(p._id));
    }

    return result;
  }, [parts, pendingInspectionParts, activeTab, categoryFilter, search, selectedShopLocationId, tagFilterPartIds]);

  // Count per tab — memoized so badge counts don't recompute on dialog state changes or search keystrokes
  const counts = useMemo<Record<LocationFilter, number>>(() => {
    let inventory = 0, pending = 0, installed = 0, quarantine = 0, removed = 0, lowStock = 0;
    for (const p of parts) {
      if (p.location === "inventory") {
        inventory++;
        // Low stock: only flag when actual qty is at or below reorder point
        if (p.reorderPoint != null) {
          const qty = p.quantityOnHand ?? p.quantity ?? 0;
          if (qty <= p.reorderPoint) lowStock++;
        }
      } else if (p.location === "pending_inspection") {
        pending++;
      } else if (p.location === "installed") {
        installed++;
      } else if (p.location === "quarantine") {
        quarantine++;
      } else if (p.location === "removed_pending_disposition") {
        removed++;
      }
    }
    // Use server-indexed pending_inspection count when available (org-wide, not filtered by location)
    // so the badge reflects total pending work regardless of shop location filter
    const pendingCount = pendingInspectionParts !== undefined ? pendingInspectionParts.length : pending;
    return {
      all: parts.length,
      inventory,
      pending_inspection: pendingCount,
      installed,
      quarantine,
      removed_pending_disposition: removed,
      low_stock: lowStock,
      kanban: parts.length,
      inventory_master: parts.length,
      parts_requests: partsRequests.length,
    };
  }, [parts, pendingInspectionParts, partsRequests.length]);

  const exportRows = useMemo(
    () =>
      filtered.map((p) => ({
        partNumber: p.partNumber ?? "",
        description: p.partName ?? p.description ?? "",
        quantity: p.quantityOnHand ?? p.quantity ?? "",
        location: LOCATION_LABEL[p.location] ?? p.location ?? "",
        condition: CONDITION_LABEL[p.condition] ?? p.condition ?? "",
        category: p.partCategory ? (CATEGORY_LABEL[p.partCategory] ?? p.partCategory) : "",
        lotNumber: p.lotNumber ?? "",
        binLocation: p.binLocation ?? "",
        cost: p.unitCost != null ? p.unitCost.toFixed(2) : "",
        createdAt: p._creationTime ? new Date(p._creationTime).toISOString() : "",
      })),
    [filtered],
  );

  async function handleRelease(part: PartDoc) {
    try {
      await releasePart({ partId: part._id });
      toast.success(`Reservation released for ${part.partNumber}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Release failed");
    }
  }

  // Work orders for reserve dialog
  const workOrderOptions: WorkOrderOption[] = (activeWorkOrders ?? []) as WorkOrderOption[];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            Parts Inventory
          </h1>
          {isLoading ? (
            <Skeleton className="h-4 w-40 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {parts.length} parts ·{" "}
              {counts.pending_inspection > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {counts.pending_inspection} pending inspection ·{" "}
                </span>
              )}
              {counts.inventory} in stock
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 text-xs border-border/60 w-full sm:w-auto"
          >
            <Link to="/parts/receiving">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Receiving Queue
              {counts.pending_inspection > 0 && (
                <Badge className="ml-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] h-4 px-1">
                  {counts.pending_inspection}
                </Badge>
              )}
            </Link>
          </Button>
          <ExportCSVButton
            data={exportRows}
            columns={[
              { key: "partNumber", header: "P/N" },
              { key: "description", header: "Description" },
              { key: "category", header: "Category" },
              { key: "quantity", header: "Quantity" },
              { key: "location", header: "Location" },
              { key: "condition", header: "Condition" },
              { key: "lotNumber", header: "Lot #" },
              { key: "binLocation", header: "Bin" },
              { key: "cost", header: "Cost" },
            ]}
            fileName="parts-inventory.csv"
            showDateFilter
            dateFieldKey="createdAt"
            className="h-8 gap-1.5 text-xs"
          />
          <Button asChild size="sm" className="h-8 text-xs w-full sm:w-auto">
            <Link to="/parts/new">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Part
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as LocationFilter)}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-8 bg-muted/40 p-0.5 flex-wrap">
            {(
              [
                ["all", "All"],
                ["inventory", "In Stock"],
                ["pending_inspection", "Pending"],
                ["installed", "Installed"],
                ["quarantine", "Quarantine"],
                ["removed_pending_disposition", "Disposition"],
                ["low_stock", "Low Stock"],
                ["kanban", "Kanban"],
                ["inventory_master", "Inventory Master"],
                ["parts_requests", "Parts Requests"],
              ] as const
            ).map(([tab, label]) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-7 px-3 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                {label}
                {!isLoading && counts[tab] > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 h-4 min-w-[16px] px-1 text-[9px] ${
                      activeTab === tab
                        ? "bg-primary/15 text-primary"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}
                  >
                    {counts[tab]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 ml-auto">
          {/* Category filter — Phase 8 */}
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as PartCategory)}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-muted/30 border-border/60">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="consumable">Consumable</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="rotable">Rotable</SelectItem>
              <SelectItem value="expendable">Expendable</SelectItem>
              <SelectItem value="repairable">Repairable</SelectItem>
            </SelectContent>
          </Select>
          <TagFilterDropdown onFilterChange={setTagFilter} />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search P/N, name, S/N, lot, bin…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-56 bg-muted/30 border-border/60"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/60"
            onClick={() => setScannerOpen(true)}
          >
            <ScanLine className="w-3.5 h-3.5" />
            Scan
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/60"
            title="Scan a part's QR code to search for it"
            onClick={() => setQrScannerOpen(true)}
          >
            <QrCode className="w-3.5 h-3.5" />
            QR
          </Button>
        </div>
      </div>

      {/* Pending Inspection table (dedicated view when that tab is active) */}
      {activeTab === "pending_inspection" && (
        <div className="space-y-2">
          {pendingInspectionParts === undefined ? (
            Array.from({ length: 3 }).map((_, i) => <PartSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No parts pending inspection
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Part Number</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Serial Number</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Condition</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Received Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Received via WO</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map((part) => (
                    <tr key={part._id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{part.partNumber}</td>
                      <td className="px-4 py-3 text-xs text-foreground">{part.partName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {part.serialNumber ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] border font-medium ${getConditionStyles(part.condition)}`}
                        >
                          {CONDITION_LABEL[part.condition] ?? part.condition}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {part.receivingDate
                          ? new Date(part.receivingDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "UTC",
                            })
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {part.receivingWorkOrderId ? (
                          <Link
                            to={`/work-orders/${part.receivingWorkOrderId}`}
                            className="text-primary hover:underline"
                          >
                            View WO
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                          onClick={() => setInspectPart(part)}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "parts_requests" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <PartsRequestForm
            partsCatalog={parts.map((p) => ({
              _id: String(p._id),
              partNumber: p.partNumber,
              partName: p.partName,
              description: p.description,
              supplier: p.supplier,
            }))}
            requests={partsRequests}
            onRequestsChange={setPartsRequests}
          />
          <PartsRequestQueue requests={partsRequests} onRequestsChange={setPartsRequests} />
        </div>
      )}

      {activeTab === "inventory_master" && <InventoryMasterTab />}

      {activeTab === "kanban" && (
        <InventoryKanban
          parts={parts.map((part) => ({
            _id: String(part._id),
            partNumber: part.partNumber,
            partName: part.partName,
            description: part.description,
            condition: part.condition,
            location: part.location,
            quantity: part.quantity,
            quantityOnHand: part.quantityOnHand,
            supplier: part.supplier,
            reservedForWorkOrderId: part.reservedForWorkOrderId ? String(part.reservedForWorkOrderId) : undefined,
            serialNumber: part.serialNumber,
          }))}
        />
      )}

      {/* Parts list (all other tabs) */}
      {activeTab !== "pending_inspection" && activeTab !== "parts_requests" && activeTab !== "inventory_master" && activeTab !== "kanban" && (
        <>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <PartSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center">
                <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No parts found
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {activeTab === "all"
                    ? "No parts in inventory. Add a part to get started."
                    : "No parts match the current filter."}
                </p>
                {activeTab === "all" && (
                  <Button asChild size="sm" className="mt-4">
                    <Link to="/parts/new">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Part
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((part) => {
                const isLifeLimited = part.isLifeLimited;
                const isQuarantine = part.location === "quarantine";
                const isInventory = part.location === "inventory";
                const isReserved = !!part.reservedForWorkOrderId;

                return (
                  <Card
                    key={part._id}
                    className={`border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer ${
                      isQuarantine ? "border-l-4 border-l-orange-500" : ""
                    }`}
                    onClick={() => setDetailPart(part)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="pt-0.5">{getLocationIcon(part.location)}</div>
                        <div className="flex-1 min-w-0">
                          {/* Row 1: P/N + condition + location + reserved badge */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-sm font-semibold text-foreground">
                              {part.partNumber}
                            </span>
                            {part.serialNumber && (
                              <span className="font-mono text-xs text-muted-foreground">
                                S/N {part.serialNumber}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] border font-medium ${getConditionStyles(part.condition)}`}
                            >
                              {CONDITION_LABEL[part.condition] ?? part.condition}
                            </Badge>
                            <PartStatusBadge status={part.location} />
                            {isLifeLimited && (
                              <Badge className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                                Life Limited
                              </Badge>
                            )}
                            {isQuarantine && (
                              <Badge className="text-[10px] bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                                ⚠ Quarantine
                              </Badge>
                            )}
                            {isInventory && part.reorderPoint != null && (part.quantityOnHand ?? part.quantity ?? 0) <= part.reorderPoint && (
                              <Badge className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                ⚠ Low Stock
                              </Badge>
                            )}
                            {isReserved && (
                              <Badge className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                Reserved
                              </Badge>
                            )}
                            {part.partCategory && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] border font-medium ${CATEGORY_STYLES[part.partCategory] ?? "bg-muted text-muted-foreground"}`}
                              >
                                {CATEGORY_LABEL[part.partCategory] ?? part.partCategory}
                              </Badge>
                            )}
                            <PartTagBadges partId={String(part._id)} maxVisible={2} />
                          </div>

                          {/* Row 2: Name */}
                          <p className="text-sm text-foreground font-medium truncate">
                            {part.partName}
                          </p>

                          {/* Row 3: Additional info */}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {/* Quantity — only shown for non-serialized bulk parts in inventory */}
                            {!part.isSerialized && isInventory && (part.quantityOnHand != null || part.quantity != null) && (
                              <span className={`text-[11px] font-medium ${
                                part.reorderPoint != null && (part.quantityOnHand ?? part.quantity ?? 0) <= part.reorderPoint
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-foreground"
                              }`}>
                                Qty: {part.quantityOnHand ?? part.quantity}
                              </span>
                            )}
                            {part.supplier && (
                              <span className="text-[11px] text-muted-foreground">
                                Supplier: {part.supplier}
                              </span>
                            )}
                            {part.isOwnerSupplied && (
                              <span className="text-[11px] text-sky-600 dark:text-sky-400">
                                Owner-Supplied
                              </span>
                            )}
                            {part.receivingDate && (
                              <span className="text-[11px] text-muted-foreground">
                                Received{" "}
                                {new Date(part.receivingDate).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
                                )}
                              </span>
                            )}
                            {part.isLifeLimited && part.lifeLimitHours && (
                              <span className="text-[11px] text-purple-600 dark:text-purple-400">
                                Life limit: {part.lifeLimitHours} hrs
                              </span>
                            )}
                            {part.lotNumber && (
                              <span className="text-[11px] text-muted-foreground">
                                Lot: <span className="font-mono">{part.lotNumber}</span>
                              </span>
                            )}
                            {(part.binLocationId || part.binLocation) && (
                              <span className="text-[11px] text-muted-foreground">
                                <PartLocationCell
                                  binLocationId={part.binLocationId ? String(part.binLocationId) : undefined}
                                  legacyBinLocation={part.binLocation}
                                />
                              </span>
                            )}
                            {canViewCost && part.unitCost != null && (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                ${part.unitCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40"
                            title="Print Label"
                            onClick={(e) => {
                              e.stopPropagation();
                              printBarcodeLabel(part.partNumber, part.partName, part.serialNumber);
                            }}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40"
                            title="Show QR Code"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQrPart(part);
                            }}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>
                          {isInventory && !isReserved && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 border-border/50 text-muted-foreground hover:text-blue-400 hover:border-blue-500/40"
                              title="Reserve for Work Order"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReservePart(part);
                              }}
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isInventory && isReserved && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 border-blue-500/40 text-blue-400 hover:text-muted-foreground hover:border-border/50"
                              title="Release Reservation"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRelease(part);
                              }}
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Receiving Inspection Dialog */}
      <ReceivingInspectionDialog
        open={!!inspectPart}
        part={inspectPart}
        technicianId={technicianId}
        onClose={() => setInspectPart(null)}
        onSuccess={(result) => {
          if (result === "approved") {
            toast.success("Part approved — moved to inventory");
          } else {
            toast.error("Part rejected — moved to quarantine");
          }
          setInspectPart(null);
        }}
      />

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(value) => {
          setSearch(value);
          setScannerOpen(false);
          toast.success(`Scanned: ${value}`);
        }}
        title="Scan Part Barcode"
      />

      {/* Reserve Part Dialog */}
      <ReservePartDialog
        open={!!reservePart}
        part={reservePart}
        technicianId={technicianId}
        workOrders={workOrderOptions}
        onClose={() => setReservePart(null)}
        onSuccess={(woNumber) => {
          toast.success(`Part reserved for ${woNumber}`);
          setReservePart(null);
        }}
      />

      {/* QR Code Dialog */}
      <Dialog open={!!qrPart} onOpenChange={(v) => !v && setQrPart(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Part QR Code</DialogTitle>
          </DialogHeader>
          {qrPart && (
            <div className="flex justify-center py-4">
              <QRCodeBadge
                value={`PART:${qrPart.partNumber}:${qrPart.serialNumber ?? "N/A"}`}
                label={qrPart.partName}
                size={160}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Scanner */}
      <QRScannerDialog open={qrScannerOpen} onClose={() => setQrScannerOpen(false)} />

      {/* Part Detail Sheet */}
      <PartDetailSheet
        part={detailPart}
        onClose={() => setDetailPart(null)}
      />
    </div>
  );
}
