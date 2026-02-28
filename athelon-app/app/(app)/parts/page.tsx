"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronRight,
  Filter,
  Lock,
  Unlock,
  ClipboardCheck,
  Download,
  ScanLine,
  Printer,
} from "lucide-react";
import { downloadCSV } from "@/lib/export";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { printBarcodeLabel } from "@/lib/barcode";
import { QRCodeBadge } from "@/components/QRCodeBadge";
import { QRScannerDialog } from "@/components/QRScannerDialog";
import { QrCode } from "lucide-react";
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
  | "low_stock";

type InspectionResult = "approved" | "rejected";

interface PartDoc {
  _id: Id<"parts">;
  partNumber: string;
  partName: string;
  serialNumber?: string;
  condition: string;
  location: string;
  receivingDate?: number;
  receivingWorkOrderId?: Id<"workOrders">;
  supplier?: string;
  isOwnerSupplied: boolean;
  isLifeLimited: boolean;
  lifeLimitHours?: number;
  reservedForWorkOrderId?: Id<"workOrders">;
  reservedByTechnicianId?: Id<"technicians">;
  description?: string;
  minStockLevel?: number;
  reorderPoint?: number;
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

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  serviceable: "Serviceable",
  overhauled: "OH",
  repaired: "Repaired",
  unserviceable: "Unserviceable",
  quarantine: "Quarantine",
  scrapped: "Scrapped",
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
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
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
  const [search, setSearch] = useState("");
  const { orgId, isLoaded } = useCurrentOrg();

  // Dialog state
  const [inspectPart, setInspectPart] = useState<PartDoc | null>(null);
  const [reservePart, setReservePart] = useState<PartDoc | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrPart, setQrPart] = useState<PartDoc | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  // Load all parts
  const allParts = useQuery(
    api.parts.listParts,
    orgId ? { organizationId: orgId } : "skip",
  );

  // Load pending inspection parts (server-indexed query)
  const pendingInspectionParts = useQuery(
    api.gapFixes.listPartsPendingInspection,
    orgId ? { organizationId: orgId } : "skip",
  );

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

  // For pending tab, use the server-indexed query; otherwise use allParts filtered client-side
  const filtered = useMemo(() => {
    let result =
      activeTab === "pending_inspection"
        ? ((pendingInspectionParts ?? []) as PartDoc[])
        : parts;

    // Location filter (skip for pending_inspection — already filtered)
    if (activeTab === "low_stock") {
      result = result.filter(
        (p) => p.reorderPoint != null && p.location === "inventory",
      );
    } else if (activeTab !== "all" && activeTab !== "pending_inspection") {
      result = result.filter((p) => p.location === activeTab);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.partNumber.toLowerCase().includes(q) ||
          p.partName.toLowerCase().includes(q) ||
          (p.serialNumber ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [parts, pendingInspectionParts, activeTab, search]);

  // Count per tab
  const counts: Record<LocationFilter, number> = {
    all: parts.length,
    inventory: parts.filter((p) => p.location === "inventory").length,
    pending_inspection: parts.filter((p) => p.location === "pending_inspection").length,
    installed: parts.filter((p) => p.location === "installed").length,
    quarantine: parts.filter((p) => p.location === "quarantine").length,
    removed_pending_disposition: parts.filter(
      (p) => p.location === "removed_pending_disposition",
    ).length,
    low_stock: parts.filter(
      (p) => p.reorderPoint != null && p.location === "inventory",
    ).length,
  };

  function showToast(text: string, kind: "success" | "error") {
    setToastMsg({ text, kind });
    setTimeout(() => setToastMsg(null), 3500);
  }

  async function handleRelease(part: PartDoc) {
    try {
      await releasePart({ partId: part._id });
      showToast(`Reservation released for ${part.partNumber}`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Release failed", "error");
    }
  }

  // Work orders for reserve dialog
  const workOrderOptions: WorkOrderOption[] = (activeWorkOrders ?? []) as WorkOrderOption[];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-md px-4 py-3 text-sm font-medium shadow-lg border ${
            toastMsg.kind === "success"
              ? "bg-green-50 dark:bg-green-900/90 border-green-500/50 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/90 border-red-500/50 text-red-700 dark:text-red-300"
          }`}
        >
          {toastMsg.kind === "success" ? "✓ " : "✗ "}
          {toastMsg.text}
        </div>
      )}

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
            <Link to="/parts/requests">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Receiving Queue
              {counts.pending_inspection > 0 && (
                <Badge className="ml-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] h-4 px-1">
                  {counts.pending_inspection}
                </Badge>
              )}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              if (filtered.length) {
                downloadCSV(
                  filtered.map((p: any) => ({
                    "Part Number": p.partNumber ?? "",
                    Description: p.description ?? "",
                    Status: p.status ?? "",
                    Quantity: p.quantityOnHand ?? p.quantity ?? "",
                    Location: p.location ?? "",
                  })),
                  "parts-inventory.csv",
                );
                setToastMsg({ text: "Parts exported to CSV", kind: "success" });
              }
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
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
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search P/N, name, S/N…"
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
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
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

      {/* Parts list (all other tabs) */}
      {activeTab !== "pending_inspection" && (
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
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border/40 text-muted-foreground"
                            >
                              {LOCATION_LABEL[part.location] ?? part.location}
                            </Badge>
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
                            {part.reorderPoint != null && isInventory && (
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
                          </div>

                          {/* Row 2: Name */}
                          <p className="text-sm text-foreground font-medium truncate">
                            {part.partName}
                          </p>

                          {/* Row 3: Additional info */}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
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
                                  { month: "short", day: "numeric", year: "numeric" },
                                )}
                              </span>
                            )}
                            {part.isLifeLimited && part.lifeLimitHours && (
                              <span className="text-[11px] text-purple-600 dark:text-purple-400">
                                Life limit: {part.lifeLimitHours} hrs
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
            showToast(`Part approved — moved to inventory`, "success");
          } else {
            showToast(`Part rejected — moved to quarantine`, "error");
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
          showToast(`Scanned: ${value}`, "success");
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
          showToast(`Part reserved for ${woNumber}`, "success");
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
    </div>
  );
}
