"use client";

/**
 * Lots & Batches Page
 * Inventory Phase 3: Lot Management
 *
 * Manages consumable/expendable parts received in bulk lots. Features include:
 * - Filterable lot list with search by part number or lot number
 * - Condition-based filtering (new, serviceable, quarantine, expired, depleted)
 * - Create Lot dialog with auto-generated lot numbers
 * - Lot detail Sheet (slide-over) with tabs for Documents, Parts, and History
 *
 * FAA Part 145 regulatory context:
 *   Lot tracking ensures traceability of batch materials (sealants, fasteners,
 *   chemicals, etc.) per 14 CFR 145.211.
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { toast } from "sonner";
import {
  Boxes,
  Plus,
  Search,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { ConformityDocumentPanel } from "../_components/ConformityDocumentPanel";

// ─── Types & Constants ─────────────────────────────────────────────────────

type LotCondition = "new" | "serviceable" | "quarantine" | "expired" | "depleted";

const CONDITION_TABS: Array<{ label: string; value: LotCondition | "all" }> = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Serviceable", value: "serviceable" },
  { label: "Quarantine", value: "quarantine" },
  { label: "Expired", value: "expired" },
  { label: "Depleted", value: "depleted" },
];

const CONDITION_STYLES: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  serviceable: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  quarantine: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  expired: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  depleted: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

function conditionLabel(c: string) {
  return c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// ─── Create Lot Dialog ─────────────────────────────────────────────────────

function CreateLotDialog({
  open,
  onClose,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
}) {
  const create = useMutation(api.lots.createLot);
  // BUG-HUNT-114: Fetch vendors so we can use a proper selector. Previously
  // the form had a free-text "Vendor" input that was never sent to the backend
  // (createLot expects vendorId, not vendorName). The clerk would fill in a
  // vendor name, submit the lot, and the vendor info was silently discarded.
  const vendors = useQuery(api.vendors.listVendors, { orgId });
  const [partNumber, setPartNumber] = useState("");
  const [partName, setPartName] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [hasShelfLife, setHasShelfLife] = useState(false);
  const [shelfLifeDate, setShelfLifeDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPartNumber("");
    setPartName("");
    setLotNumber("");
    setBatchNumber("");
    setQuantity("");
    setVendorId("");
    setHasShelfLife(false);
    setShelfLifeDate("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!partNumber.trim()) {
      toast.error("Part number is required.");
      return;
    }
    if (!partName.trim()) {
      toast.error("Part name is required.");
      return;
    }
    if (!quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      toast.error("Quantity must be a positive number.");
      return;
    }
    if (hasShelfLife && !shelfLifeDate) {
      toast.error("Shelf life expiry date is required when shelf life is enabled.");
      return;
    }

    setSaving(true);
    try {
      await create({
        organizationId: orgId,
        partNumber: partNumber.trim(),
        partName: partName.trim(),
        lotNumber: lotNumber.trim() || undefined,
        batchNumber: batchNumber.trim() || undefined,
        originalQuantity: parseFloat(quantity),
        receivedQuantity: parseFloat(quantity),
        vendorId: vendorId ? (vendorId as Id<"vendors">) : undefined,
        receivedByUserId: "system",
        hasShelfLife,
        shelfLifeExpiryDate: shelfLifeDate
          ? new Date(shelfLifeDate).getTime()
          : undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Lot created successfully.");
      reset();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create lot",
      );
    } finally {
      setSaving(false);
    }
  };

  function handleClose() {
    if (!saving) {
      reset();
      onClose();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !saving) handleClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Lot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Part Number *</Label>
              <Input
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value.slice(0, 50))}
                maxLength={50}
                placeholder="e.g. MS20470AD4-6"
              />
            </div>
            <div>
              <Label>Part Name *</Label>
              <Input
                value={partName}
                onChange={(e) => setPartName(e.target.value.slice(0, 100))}
                maxLength={100}
                placeholder="e.g. Rivet, Universal Head"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                Lot Number{" "}
                <span className="text-[10px] text-muted-foreground">
                  (auto-generated if blank)
                </span>
              </Label>
              <Input
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value.slice(0, 50))}
                maxLength={50}
                placeholder="LOT-20260304-XXXX"
              />
            </div>
            <div>
              <Label>Batch Number</Label>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value.slice(0, 50))}
                maxLength={50}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>
            <div>
              <Label>Vendor</Label>
              {vendors === undefined ? (
                <div className="h-9 bg-muted/30 rounded-md border border-border/60 animate-pulse" />
              ) : vendors.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No vendors configured.
                </p>
              ) : (
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60">
                    <SelectValue placeholder="Select vendor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v._id} value={v._id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={hasShelfLife}
              onCheckedChange={setHasShelfLife}
              id="shelf-life-toggle"
            />
            <Label htmlFor="shelf-life-toggle">Has Shelf Life</Label>
          </div>
          {hasShelfLife && (
            <div>
              <Label>Shelf Life Expiry Date *</Label>
              <Input
                type="date"
                value={shelfLifeDate}
                onChange={(e) => setShelfLifeDate(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? "Creating..." : "Create Lot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lot Detail Sheet ──────────────────────────────────────────────────────

function LotDetailSheet({
  lotId,
  orgId,
  onClose,
}: {
  lotId: Id<"lots"> | null;
  orgId: Id<"organizations">;
  onClose: () => void;
}) {
  const lot = useQuery(api.lots.getLot, lotId ? { lotId } : "skip");

  if (!lotId) return null;

  const quantityPct =
    lot && lot.originalQuantity > 0
      ? Math.round((lot.remainingQuantity / lot.originalQuantity) * 100)
      : 0;

  return (
    <Sheet open={!!lotId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {lot ? (
              <span className="flex items-center gap-2">
                <span className="font-mono">{lot.lotNumber}</span>
                <Badge
                  variant="outline"
                  className={CONDITION_STYLES[lot.condition]}
                >
                  {conditionLabel(lot.condition)}
                </Badge>
              </span>
            ) : (
              <Skeleton className="h-5 w-40" />
            )}
          </SheetTitle>
          <SheetDescription>
            {lot ? (
              <span>
                P/N: {lot.partNumber} -- {lot.partName}
              </span>
            ) : (
              <Skeleton className="h-4 w-64" />
            )}
          </SheetDescription>
        </SheetHeader>

        {!lot ? (
          <div className="space-y-2 mt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Quantity Bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>
                  {lot.remainingQuantity} / {lot.originalQuantity} remaining
                </span>
                <span>{quantityPct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    quantityPct > 50
                      ? "bg-green-500"
                      : quantityPct > 20
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${quantityPct}%` }}
                />
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {lot.batchNumber && (
                <div>
                  <span className="font-medium">Batch #:</span>{" "}
                  {lot.batchNumber}
                </div>
              )}
              {((lot as Record<string, unknown>).vendorName as string | undefined) && (
                <div>
                  <span className="font-medium">Vendor:</span>{" "}
                  {String((lot as Record<string, unknown>).vendorName ?? "")}
                </div>
              )}
              {lot.hasShelfLife && lot.shelfLifeExpiryDate && (
                <div>
                  <span className="font-medium">Shelf Life Expires:</span>{" "}
                  {formatDate(lot.shelfLifeExpiryDate)}
                </div>
              )}
              <div>
                <span className="font-medium">Created:</span>{" "}
                {formatDate(lot.createdAt)}
              </div>
            </div>

            {lot.notes && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                {lot.notes}
              </div>
            )}

            {/* Tabs: Documents, Parts, History */}
            <Tabs defaultValue="documents" className="mt-2">
              <TabsList className="h-8 bg-muted/40 p-0.5 w-full">
                <TabsTrigger
                  value="documents"
                  className="h-7 text-xs flex-1 data-[state=active]:bg-background"
                >
                  Documents
                </TabsTrigger>
                <TabsTrigger
                  value="parts"
                  className="h-7 text-xs flex-1 data-[state=active]:bg-background"
                >
                  Parts
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="h-7 text-xs flex-1 data-[state=active]:bg-background"
                >
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="mt-3">
                <ConformityDocumentPanel
                  organizationId={orgId}
                  lotId={lotId}
                />
              </TabsContent>

              <TabsContent value="parts" className="mt-3">
                <LotPartsTab lotId={lotId} />
              </TabsContent>

              <TabsContent value="history" className="mt-3">
                <LotHistoryPlaceholder lotId={lotId} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Lot Parts Tab ──────────────────────────────────────────────────────────

function LotPartsTab({ lotId }: { lotId: Id<"lots"> }) {
  const { orgId } = useCurrentOrg();
  const parts = useQuery(api.lots.getLotParts, orgId ? { organizationId: orgId, lotId } : "skip");

  if (parts === undefined) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          No parts issued from this lot yet.
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          Parts will appear here when issued from this lot to work orders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {parts.map((part) =>
        part ? (
          <div
            key={part._id}
            className="flex items-center justify-between text-xs p-2 bg-muted/20 rounded"
          >
            <div>
              <span className="font-mono font-medium">{part.partNumber}</span>
              {part.serialNumber && (
                <span className="text-muted-foreground ml-2">
                  S/N: {part.serialNumber}
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-[10px]">
              {part.condition}
            </Badge>
          </div>
        ) : null,
      )}
    </div>
  );
}

// ─── Lot History Placeholder ────────────────────────────────────────────────
// Lot-level history uses the partHistory table filtered by lotId.
// A full implementation would query partHistory by lotId — for now we show
// a placeholder since partHistory is indexed by partId, not lotId directly.

function LotHistoryPlaceholder({ lotId: _lotId }: { lotId: Id<"lots"> }) {
  return (
    <div className="py-6 text-center">
      <p className="text-xs text-muted-foreground">
        Lot activity history coming soon.
      </p>
      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
        Issue, quarantine, and expiry events will appear here.
      </p>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LotsPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [conditionFilter, setConditionFilter] = useState<
    LotCondition | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<Id<"lots"> | null>(null);

  const lots = useQuery(
    api.lots.listLots,
    orgId
      ? {
          organizationId: orgId,
          condition:
            conditionFilter === "all" ? undefined : conditionFilter,
        }
      : "skip",
  );

  // BUG-HUNT-111: Stats cards must reflect global totals regardless of the
  // active condition tab. Previously stats were derived from the tab-filtered
  // `lots` query — switching to "Quarantine" made "Total Lots" show only
  // quarantine lot count and "Active" show 0. Fetch all lots separately so the
  // summary stays accurate (same pattern as cores BUG-PC-HUNT-108).
  const allLots = useQuery(
    api.lots.listLots,
    orgId ? { organizationId: orgId } : "skip",
  );

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || lots === undefined || allLots === undefined,
  });

  // Client-side search filter
  const filteredLots = useMemo(() => {
    if (!lots) return [];
    if (!searchQuery.trim()) return lots;
    const q = searchQuery.toLowerCase();
    return lots.filter(
      (lot) =>
        lot.partNumber.toLowerCase().includes(q) ||
        lot.lotNumber.toLowerCase().includes(q) ||
        lot.partName.toLowerCase().includes(q) ||
        (lot.batchNumber && lot.batchNumber.toLowerCase().includes(q)),
    );
  }, [lots, searchQuery]);

  // Stats — derived from allLots (unfiltered) so summary cards are always global
  const stats = useMemo(() => {
    if (!allLots) return { total: 0, active: 0, quarantined: 0, expired: 0 };
    return {
      total: allLots.length,
      active: allLots.filter(
        (l) => l.condition === "new" || l.condition === "serviceable",
      ).length,
      quarantined: allLots.filter((l) => l.condition === "quarantine").length,
      expired: allLots.filter((l) => l.condition === "expired").length,
    };
  }, [allLots]);

  if (
    prereq.state === "loading_context" ||
    prereq.state === "loading_data"
  ) {
    return (
      <div className="p-6 space-y-3" data-testid="page-loading-state">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Lot management requires organization setup"
        missingInfo="Complete onboarding to manage lots, batches, and shelf-life tracking."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="h-6 w-6" /> Lots & Batches
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage consumable and expendable part lots, shelf life, and
            conformity documentation
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Lot
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Total Lots
          </p>
          <p className="text-lg font-bold">{stats.total}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Active
          </p>
          <p className="text-lg font-bold text-green-500">{stats.active}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Quarantined
          </p>
          <p className="text-lg font-bold text-amber-500">
            {stats.quarantined}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Expired
          </p>
          <p className="text-lg font-bold text-red-500">{stats.expired}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 border-b pb-1 flex-wrap">
          {CONDITION_TABS.map((t) => (
            <Button
              key={t.value}
              variant={conditionFilter === t.value ? "default" : "ghost"}
              size="sm"
              onClick={() =>
                setConditionFilter(t.value as LotCondition | "all")
              }
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by P/N, lot #, or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs w-64 bg-muted/30 border-border/60"
          />
        </div>
      </div>

      {/* Lots Table */}
      {filteredLots.length === 0 ? (
        <ActionableEmptyState
          title="No lots found"
          missingInfo={
            searchQuery || conditionFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "Create your first lot to start tracking consumable parts and shelf life."
          }
          primaryActionLabel="Create Lot"
          primaryActionType="button"
          primaryActionTarget={() => setCreateOpen(true)}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lot Number</TableHead>
              <TableHead>Part Number</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead className="text-right">Qty (rem/orig)</TableHead>
              <TableHead>Shelf Life</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Vendor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLots.map((lot) => {
              const isShelfLifeWarning =
                lot.hasShelfLife &&
                lot.shelfLifeExpiryDate &&
                lot.shelfLifeExpiryDate < Date.now() + 30 * 24 * 60 * 60 * 1000;

              return (
                <TableRow
                  key={lot._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedLotId(lot._id)}
                >
                  <TableCell className="font-mono text-sm">
                    {lot.lotNumber}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {lot.partNumber}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {lot.partName}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">
                      {lot.remainingQuantity}
                    </span>
                    <span className="text-muted-foreground">
                      /{lot.originalQuantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    {lot.hasShelfLife && lot.shelfLifeExpiryDate ? (
                      <span
                        className={
                          isShelfLifeWarning
                            ? "text-amber-500 font-medium"
                            : ""
                        }
                      >
                        {formatDate(lot.shelfLifeExpiryDate)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={CONDITION_STYLES[lot.condition]}
                    >
                      {conditionLabel(lot.condition)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {((lot as Record<string, unknown>).vendorName as string | undefined) || (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <CreateLotDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgId={orgId}
      />
      <LotDetailSheet
        lotId={selectedLotId}
        orgId={orgId}
        onClose={() => setSelectedLotId(null)}
      />
    </div>
  );
}
