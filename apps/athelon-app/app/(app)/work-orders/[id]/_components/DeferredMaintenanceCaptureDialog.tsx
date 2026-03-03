"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

type Category = "deferred_maintenance" | "note" | "ad_tracking";
type Priority = "low" | "medium" | "high" | "critical";

interface DraftItem {
  id: string;
  description: string;
  category: Category;
  priority: Priority;
}

interface DeferredMaintenanceCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: Id<"workOrders">;
  organizationId: Id<"organizations">;
  onComplete: () => void;
}

export function DeferredMaintenanceCaptureDialog({
  open,
  onOpenChange,
  workOrderId,
  organizationId,
  onComplete,
}: DeferredMaintenanceCaptureDialogProps) {
  const createItems = useMutation(api.carryForwardItems.createFromWOClose);
  const [items, setItems] = useState<DraftItem[]>([
    { id: crypto.randomUUID(), description: "", category: "deferred_maintenance", priority: "medium" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", category: "deferred_maintenance", priority: "medium" },
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateItem = useCallback((id: string, field: keyof DraftItem, value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
  }, []);

  const handleSubmit = async () => {
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one item with a description.");
      return;
    }
    setSubmitting(true);
    try {
      await createItems({
        workOrderId,
        organizationId,
        items: validItems.map((i) => ({
          description: i.description.trim(),
          category: i.category,
          priority: i.priority,
        })),
      });
      toast.success(`${validItems.length} deferred item${validItems.length > 1 ? "s" : ""} captured`);
      setItems([{ id: crypto.randomUUID(), description: "", category: "deferred_maintenance", priority: "medium" }]);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to capture deferred items");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setItems([{ id: crypto.randomUUID(), description: "", category: "deferred_maintenance", priority: "medium" }]);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Capture Deferred Maintenance?</DialogTitle>
          <DialogDescription>
            Record any deferred maintenance items before closing this work order. These will be tracked against the aircraft for future scheduling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {items.map((item, idx) => (
            <div key={item.id} className="rounded-md border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-red-400"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                {/* BUG-QCM-C8: Deferred item description had no maxLength cap.
                    A tech pasting a verbose MEL text or squawk narrative could
                    exceed the backend schema limit and lose all deferred items
                    entered in the dialog (form clears on submit error). Deferred
                    maintenance items are part of the QCM audit trail — an uncapped
                    field is a regulatory documentation risk. Capped at 300 chars,
                    consistent with other short description fields in the app. */}
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value.slice(0, 300))}
                  placeholder="Describe the deferred maintenance item..."
                  className="h-8 text-xs border-border/60 mt-1"
                  maxLength={300}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={item.category}
                    onValueChange={(v) => updateItem(item.id, "category", v)}
                  >
                    <SelectTrigger className="h-8 text-xs border-border/60 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deferred_maintenance">Deferred Maintenance</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="ad_tracking">AD Tracking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select
                    value={item.priority}
                    onValueChange={(v) => updateItem(item.id, "priority", v)}
                  >
                    <SelectTrigger className="h-8 text-xs border-border/60 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="w-full h-8 text-xs gap-1.5"
          >
            <Plus className="w-3 h-3" />
            Add Another Item
          </Button>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip} disabled={submitting}>
            Skip
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Save Deferred Items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
