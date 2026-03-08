/**
 * LinkWorkOrderDialog — Associate a finding to an existing work order.
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Link2, CheckCircle2 } from "lucide-react";
import type { UnaccountedFinding, WorkOrderSummary } from "../types";
import type { Id } from "@/convex/_generated/dataModel";
import { useLinkToWorkOrder } from "../api";

interface LinkWorkOrderDialogProps {
  finding: UnaccountedFinding | null;
  workOrders: WorkOrderSummary[];
  onClose: () => void;
}

export function LinkWorkOrderDialog({
  finding,
  workOrders,
  onClose,
}: LinkWorkOrderDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedWO, setSelectedWO] = useState<Id<"workOrders"> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const linkMutation = useLinkToWorkOrder();

  const filtered = useMemo(() => {
    if (!search.trim()) return workOrders;
    const q = search.toLowerCase();
    return workOrders.filter(
      (wo) =>
        wo.workOrderNumber.toLowerCase().includes(q) ||
        wo.description.toLowerCase().includes(q) ||
        wo.aircraftRegistration.toLowerCase().includes(q),
    );
  }, [workOrders, search]);

  const handleSubmit = async () => {
    if (!finding || !selectedWO) return;
    setSubmitting(true);
    try {
      await linkMutation(finding._id, selectedWO);
      onClose();
      resetState();
    } catch (err) {
      console.error("Link failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetState = () => {
    setSearch("");
    setSelectedWO(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      resetState();
    }
  };

  return (
    <Dialog open={!!finding} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="link-wo-dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">Associate to Work Order</DialogTitle>
          <DialogDescription className="text-xs">
            Link{" "}
            <span className="font-mono font-medium">{finding?.referenceNumber}</span>{" "}
            to an existing work order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search work orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
              data-testid="link-wo-search"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 border border-border/40 rounded p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No matching work orders
              </p>
            ) : (
              filtered.map((wo) => (
                <button
                  key={String(wo._id)}
                  onClick={() => setSelectedWO(wo._id)}
                  className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                    selectedWO === wo._id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/40 border border-transparent"
                  }`}
                  data-testid={`wo-option-${String(wo._id)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-foreground">
                          {wo.workOrderNumber}
                        </span>
                        <Badge variant="outline" className="text-[9px]">
                          {wo.aircraftRegistration}
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">
                          {wo.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {wo.description}
                      </p>
                    </div>
                    {selectedWO === wo._id && (
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!selectedWO || submitting}
            className="text-xs gap-1"
            data-testid="link-wo-submit"
          >
            <Link2 className="w-3 h-3" />
            {submitting ? "Linking…" : "Link to Work Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
