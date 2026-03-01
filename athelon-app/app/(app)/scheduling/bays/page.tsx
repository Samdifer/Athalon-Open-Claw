"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Warehouse, PlaneTakeoff, Wrench, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type BayType = "hangar" | "ramp" | "paint";

type Bay = {
  _id: Id<"hangarBays">;
  name: string;
  description?: string;
  type: BayType;
  capacity: number;
  status: "available" | "occupied" | "maintenance";
  currentAircraftId?: Id<"aircraft">;
  currentWorkOrderId?: Id<"workOrders">;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function statusColor(status: Bay["status"]) {
  switch (status) {
    case "available":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "occupied":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30";
    case "maintenance":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  }
}

function typeIcon(type: BayType) {
  switch (type) {
    case "hangar":
      return <Warehouse className="w-5 h-5" />;
    case "ramp":
      return <PlaneTakeoff className="w-5 h-5" />;
    case "paint":
      return <Wrench className="w-5 h-5" />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BAY FORM DIALOG
// ─────────────────────────────────────────────────────────────────────────────

function BayFormDialog({
  open,
  onClose,
  orgId,
  editBay,
}: {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
  editBay?: Bay;
}) {
  const createBay = useMutation(api.hangarBays.createBay);
  const updateBay = useMutation(api.hangarBays.updateBay);

  const [name, setName] = useState(editBay?.name ?? "");
  const [description, setDescription] = useState(editBay?.description ?? "");
  const [type, setType] = useState<BayType>(editBay?.type ?? "hangar");
  const [capacity, setCapacity] = useState(String(editBay?.capacity ?? 1));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Bay name is required");
      return;
    }
    setSaving(true);
    try {
      if (editBay) {
        await updateBay({
          bayId: editBay._id,
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          capacity: Number(capacity) || 1,
        });
        toast.success("Bay updated");
      } else {
        await createBay({
          organizationId: orgId,
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          capacity: Number(capacity) || 1,
        });
        toast.success("Bay created");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save bay");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editBay ? "Edit Bay" : "Add Hangar Bay"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="bay-name">Name</Label>
            <Input
              id="bay-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bay 1"
            />
          </div>
          <div>
            <Label htmlFor="bay-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as BayType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hangar">Hangar</SelectItem>
                <SelectItem value="ramp">Ramp</SelectItem>
                <SelectItem value="paint">Paint</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bay-cap">Capacity</Label>
            <Input
              id="bay-cap"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bay-desc">Description</Label>
            <Textarea
              id="bay-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editBay ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL PANEL
// ─────────────────────────────────────────────────────────────────────────────

function BayDetailPanel({
  bay,
  onClose,
  onEdit,
}: {
  bay: Bay;
  onClose: () => void;
  onEdit: () => void;
}) {
  const releaseBay = useMutation(api.hangarBays.releaseBay);
  const [isReleasing, setIsReleasing] = useState(false);

  async function handleRelease() {
    setIsReleasing(true);
    try {
      await releaseBay({ bayId: bay._id });
      toast.success("Bay released");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to release bay");
    } finally {
      setIsReleasing(false);
    }
  }

  return (
    <div className="fixed top-12 right-0 bottom-0 w-full sm:w-[340px] z-50 bg-background border-l border-border/60 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <h3 className="text-sm font-semibold text-foreground">{bay.name}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close panel">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Badge className={statusColor(bay.status)}>{bay.status}</Badge>
          <Badge variant="outline">{bay.type}</Badge>
        </div>
        {bay.description && (
          <p className="text-sm text-muted-foreground">{bay.description}</p>
        )}
        <div className="text-sm">
          <span className="text-muted-foreground">Capacity:</span> {bay.capacity} aircraft
        </div>
        {bay.currentWorkOrderId && (
          <div className="text-sm">
            <span className="text-muted-foreground">Current WO:</span>{" "}
            <Link
              to={`/work-orders/${bay.currentWorkOrderId}`}
              className="text-primary hover:underline"
            >
              View Work Order →
            </Link>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          {bay.status === "occupied" && (
            <Button variant="outline" size="sm" onClick={handleRelease} disabled={isReleasing}>
              {isReleasing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Releasing…
                </>
              ) : (
                "Release Bay"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function BaysPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const bays = useQuery(
    api.hangarBays.listBays,
    orgId ? { organizationId: orgId } : "skip",
  );
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || bays === undefined,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBay, setEditBay] = useState<Bay | undefined>();
  const [selectedBay, setSelectedBay] = useState<Bay | undefined>();

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="p-6" data-testid="page-loading-state">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-xl border border-border/60 bg-muted/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Bay management requires organization setup"
        missingInfo="Complete onboarding before configuring hangar and ramp bays."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !bays) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Warehouse className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Hangar Bays</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage hangar bays, ramp spots, and paint bays
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-9 gap-1.5 flex-shrink-0"
          onClick={() => {
            setEditBay(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Bay
        </Button>
      </div>

      {/* Bay Grid */}
      {bays.length === 0 ? (
        <ActionableEmptyState
          title="No bays configured yet"
          missingInfo="Add your first bay to start assigning work orders and tracking occupancy."
          primaryActionLabel="Add First Bay"
          primaryActionType="button"
          primaryActionTarget={() => {
            setEditBay(undefined);
            setDialogOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {(bays as Bay[]).map((bay) => (
            <button
              key={bay._id}
              className="text-left rounded-xl border border-border/60 bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all space-y-3"
              onClick={() => setSelectedBay(bay)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {typeIcon(bay.type)}
                  <span className="font-semibold text-sm">{bay.name}</span>
                </div>
                <Badge className={statusColor(bay.status)} variant="outline">
                  {bay.status}
                </Badge>
              </div>
              {bay.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {bay.description}
                </p>
              )}
              <div className="text-xs text-muted-foreground">
                {bay.type} · capacity {bay.capacity}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <BayFormDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditBay(undefined);
          }}
          orgId={orgId}
          editBay={editBay}
        />
      )}

      {/* Detail Panel */}
      {selectedBay && (
        <BayDetailPanel
          bay={selectedBay}
          onClose={() => setSelectedBay(undefined)}
          onEdit={() => {
            setEditBay(selectedBay);
            setSelectedBay(undefined);
            setDialogOpen(true);
          }}
        />
      )}
    </div>
  );
}
