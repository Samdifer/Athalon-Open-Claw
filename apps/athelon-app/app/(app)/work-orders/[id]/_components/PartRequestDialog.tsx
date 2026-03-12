import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Search, Package, Loader2, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface PartRequestDialogProps {
  open: boolean;
  onClose: () => void;
  workOrderId: Id<"workOrders">;
  organizationId: Id<"organizations">;
  technicianId?: Id<"technicians">;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PartRequestDialog({
  open,
  onClose,
  workOrderId,
  organizationId,
  technicianId,
}: PartRequestDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPart, setSelectedPart] = useState<InventoryPart | null>(null);
  const [partNumber, setPartNumber] = useState("");
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"search" | "manual">("search");

  const requestPart = useMutation(api.workOrderParts.requestPart);

  // Fetch inventory parts for search
  const allParts = useQuery(
    api.parts.listParts,
    organizationId
      ? { organizationId, location: "inventory" }
      : "skip",
  );

  // Filter parts by search term
  const filteredParts = useMemo(() => {
    if (!allParts || !searchTerm.trim()) return [];
    const term = searchTerm.trim().toUpperCase();
    return (allParts as InventoryPart[])
      .filter(
        (part) =>
          part.partNumber.toUpperCase().includes(term) ||
          part.partName.toUpperCase().includes(term) ||
          (part.description?.toUpperCase().includes(term) ?? false),
      )
      .slice(0, 20);
  }, [allParts, searchTerm]);

  // Count available stock for selected part number
  const availableQty = useMemo(() => {
    if (!allParts || !selectedPart) return 0;
    return (allParts as InventoryPart[]).filter(
      (part) =>
        part.partNumber === selectedPart.partNumber &&
        part.location === "inventory",
    ).length;
  }, [allParts, selectedPart]);

  function resetForm() {
    setSearchTerm("");
    setSelectedPart(null);
    setPartNumber("");
    setPartName("");
    setQuantity("1");
    setNotes("");
    setError(null);
    setMode("search");
  }

  function handleClose() {
    if (submitting) return;
    resetForm();
    onClose();
  }

  function selectInventoryPart(part: InventoryPart) {
    setSelectedPart(part);
    setPartNumber(part.partNumber);
    setPartName(part.partName);
    setSearchTerm("");
  }

  function switchToManual() {
    setMode("manual");
    setSelectedPart(null);
  }

  function switchToSearch() {
    setMode("search");
    setPartNumber("");
    setPartName("");
  }

  async function handleSubmit() {
    setError(null);

    if (!partNumber.trim()) {
      setError("Part number is required.");
      return;
    }
    if (!partName.trim()) {
      setError("Part name is required.");
      return;
    }

    const qty = Math.max(1, Number(quantity) || 1);

    setSubmitting(true);
    try {
      await requestPart({
        organizationId,
        workOrderId,
        partNumber: partNumber.trim(),
        partName: partName.trim(),
        quantityRequested: qty,
        notes: notes.trim() || undefined,
        requestedByTechnicianId: technicianId,
        partId: selectedPart?._id,
      });

      toast.success(`Part request submitted: ${partNumber.trim().toUpperCase()}`);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit part request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4 text-primary" />
            Request Part for Work Order
          </DialogTitle>
          <DialogDescription className="text-xs">
            Search inventory for an available part or create a new request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "search" ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={switchToSearch}
            >
              <Search className="w-3 h-3 mr-1" />
              From Inventory
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "manual" ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={switchToManual}
            >
              <Plus className="w-3 h-3 mr-1" />
              Manual Entry
            </Button>
          </div>

          {mode === "search" && !selectedPart && (
            <>
              {/* Search input */}
              <div className="space-y-1.5">
                <Label className="text-xs">Search Inventory</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by part number or name..."
                    className="h-8 text-xs pl-8"
                    autoFocus
                  />
                </div>
              </div>

              {/* Search results */}
              {searchTerm.trim() && (
                <div className="max-h-48 overflow-y-auto space-y-1 border border-border/40 rounded-md p-2">
                  {filteredParts.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground">No matching parts in inventory</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="link"
                        className="text-xs mt-1 h-auto p-0"
                        onClick={switchToManual}
                      >
                        Create manual request instead
                      </Button>
                    </div>
                  ) : (
                    filteredParts.map((part) => (
                      <button
                        key={part._id}
                        type="button"
                        className="w-full text-left rounded-md border border-border/40 hover:bg-muted/40 p-2 transition-colors"
                        onClick={() => selectInventoryPart(part)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold">{part.partNumber}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10"
                          >
                            In Stock
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{part.partName}</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                          {part.serialNumber && <span>S/N {part.serialNumber}</span>}
                          <span className="capitalize">Cond: {part.condition}</span>
                          {part.supplier && <span>{part.supplier}</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* Selected part summary */}
          {selectedPart && (
            <div className="p-3 rounded-md bg-muted/20 border border-border/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold">{selectedPart.partNumber}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] text-muted-foreground"
                  onClick={() => {
                    setSelectedPart(null);
                    setPartNumber("");
                    setPartName("");
                  }}
                >
                  Change
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{selectedPart.partName}</p>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                {selectedPart.serialNumber && <span>S/N {selectedPart.serialNumber}</span>}
                <span className="capitalize">Cond: {selectedPart.condition}</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {availableQty} available
                </span>
              </div>
            </div>
          )}

          {/* Manual entry fields */}
          {mode === "manual" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Part Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. MS20470AD4-4"
                  className="h-8 text-xs font-mono"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Part Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="e.g. Universal Head Rivet"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* Quantity + Notes (always shown once part is selected or manual) */}
          {(selectedPart || mode === "manual") && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity Needed</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-8 text-xs w-32"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                  placeholder="Task step reference, urgency notes, etc."
                  rows={2}
                  maxLength={500}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

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
            disabled={submitting || (!selectedPart && mode === "search")}
            className="min-w-[120px] gap-1.5"
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Package className="w-3.5 h-3.5" />
                Request Part
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
