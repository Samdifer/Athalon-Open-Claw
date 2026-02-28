"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  ClipboardCheck,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  reconciled: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
  reconciled: "Reconciled",
};

export default function InventoryCountPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();
  const [selectedCountId, setSelectedCountId] = useState<Id<"inventoryCounts"> | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reconcileConfirmOpen, setReconcileConfirmOpen] = useState(false);

  const counts = useQuery(
    api.physicalInventory.listCounts,
    orgId ? { orgId } : "skip",
  );

  const countDetail = useQuery(
    api.physicalInventory.getCountWithItems,
    selectedCountId ? { countId: selectedCountId } : "skip",
  );

  const createCount = useMutation(api.physicalInventory.createInventoryCount);
  const startCount = useMutation(api.physicalInventory.startCount);
  const recordItem = useMutation(api.physicalInventory.recordItemCount);
  const completeCount = useMutation(api.physicalInventory.completeCount);
  const reconcileCount = useMutation(api.physicalInventory.reconcileCount);
  const deleteCount = useMutation(api.physicalInventory.deleteCount);

  const handleCreate = async () => {
    if (!orgId || !newName.trim()) return;
    if (actionLoading === "create") return;
    setActionLoading("create");
    try {
      const id = await createCount({
        orgId,
        name: newName,
        notes: newNotes || undefined,
      });
      toast.success("Inventory count created");
      setCreateDialogOpen(false);
      setNewName("");
      setNewNotes("");
      setSelectedCountId(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create count");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = async () => {
    if (!selectedCountId || actionLoading === "start") return;
    setActionLoading("start");
    try {
      await startCount({ countId: selectedCountId, countedBy: techId });
      toast.success("Count started — items loaded from inventory");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start count");
    } finally {
      setActionLoading(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Detail view
  if (selectedCountId && countDetail) {
    const items = countDetail.items ?? [];
    const counted = items.filter((i) => i.actualQuantity !== undefined).length;
    const total = items.length;
    const progress = total > 0 ? (counted / total) * 100 : 0;
    const varianceItems = items.filter((i) => i.variance !== undefined && i.variance !== 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCountId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{countDetail.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={STATUS_STYLES[countDetail.status]}>
                {STATUS_LABELS[countDetail.status]}
              </Badge>
              {countDetail.notes && (
                <span className="text-sm text-muted-foreground">{countDetail.notes}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {countDetail.status === "draft" && (
              <Button onClick={handleStart} disabled={actionLoading === "start"}>
                {actionLoading === "start" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                )}
                {actionLoading === "start" ? "Starting…" : "Start Count"}
              </Button>
            )}
            {countDetail.status === "in_progress" && (
              <Button
                disabled={actionLoading === "complete"}
                onClick={async () => {
                  if (confirm("Complete this count? No more items can be counted after this.")) {
                    setActionLoading("complete");
                    try {
                      await completeCount({ countId: selectedCountId });
                      toast.success("Count completed");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to complete count");
                    } finally {
                      setActionLoading(null);
                    }
                  }
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Count
              </Button>
            )}
            {countDetail.status === "completed" && (
              <Button
                variant="destructive"
                disabled={actionLoading === "reconcile"}
                onClick={() => setReconcileConfirmOpen(true)}
              >
                Reconcile
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => window.print()}
              title="Print count sheet"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Items</div>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Counted</div>
              <div className="text-2xl font-bold">{counted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Variances Found</div>
              <div className="text-2xl font-bold text-destructive">{varianceItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="text-2xl font-bold">{Math.round(progress)}%</div>
            </CardContent>
          </Card>
        </div>

        {total > 0 && (
          <Progress value={progress} className="h-2" />
        )}

        {/* Items Table */}
        {total === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {countDetail.status === "draft"
                  ? 'Click "Start Count" to populate items from current inventory'
                  : "No items in this count"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead className="text-right">Expected Qty</TableHead>
                  <TableHead className="text-right">Actual Qty</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const hasVariance = item.variance !== undefined && item.variance !== 0;
                  return (
                    <TableRow key={item._id} className={hasVariance ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
                      <TableCell>{item.partName}</TableCell>
                      <TableCell className="text-right">{item.expectedQuantity}</TableCell>
                      <TableCell className="text-right">
                        {countDetail.status === "in_progress" ? (
                          <Input
                            type="number"
                            className="w-20 ml-auto"
                            defaultValue={item.actualQuantity ?? ""}
                            onBlur={async (e) => {
                              const val = e.target.value;
                              if (val !== "") {
                                try {
                                  await recordItem({
                                    itemId: item._id,
                                    actualQuantity: Number(val),
                                  });
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Failed to record count");
                                }
                              }
                            }}
                          />
                        ) : (
                          <span>{item.actualQuantity ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.variance !== undefined ? (
                          <span
                            className={
                              item.variance === 0
                                ? "text-green-500"
                                : "text-destructive font-medium"
                            }
                          >
                            {item.variance > 0 ? "+" : ""}
                            {item.variance}
                            {hasVariance && (
                              <AlertTriangle className="inline ml-1 h-3 w-3" />
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {countDetail.status === "in_progress" ? (
                          <Input
                            className="w-24"
                            defaultValue={item.location ?? ""}
                            placeholder="Location"
                            onBlur={async (e) => {
                              if (item.actualQuantity !== undefined) {
                                try {
                                  await recordItem({
                                    itemId: item._id,
                                    actualQuantity: item.actualQuantity,
                                    location: e.target.value || undefined,
                                  });
                                } catch (err) {
                                  toast.error("Failed to save location");
                                }
                              }
                            }}
                          />
                        ) : (
                          <span>{item.location ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {countDetail.status === "in_progress" ? (
                          <Input
                            className="w-32"
                            defaultValue={item.notes ?? ""}
                            placeholder="Notes"
                            onBlur={async (e) => {
                              if (item.actualQuantity !== undefined) {
                                try {
                                  await recordItem({
                                    itemId: item._id,
                                    actualQuantity: item.actualQuantity,
                                    notes: e.target.value || undefined,
                                  });
                                } catch (err) {
                                  toast.error("Failed to save notes");
                                }
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xs">{item.notes ?? "—"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        <AlertDialog open={reconcileConfirmOpen} onOpenChange={setReconcileConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reconcile Inventory?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently adjust all stock quantities to match your physical count.
                This action cannot be undone. Items with variances will be corrected in the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  setActionLoading("reconcile");
                  try {
                    await reconcileCount({ countId: selectedCountId });
                    toast.success("Inventory reconciled — stock quantities updated");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to reconcile inventory");
                  } finally {
                    setActionLoading(null);
                  }
                }}
              >
                Reconcile
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Counts</h1>
          <p className="text-muted-foreground">
            Physical inventory count sessions
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Start New Count
        </Button>
      </div>

      {!counts || counts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No inventory counts yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreateDialogOpen(true)}
            >
              Start your first count
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.map((count) => (
                <TableRow
                  key={count._id}
                  className="cursor-pointer"
                  onClick={() => setSelectedCountId(count._id)}
                >
                  <TableCell className="font-medium">{count.name}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLES[count.status]}>
                      {STATUS_LABELS[count.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {count.startedAt
                      ? new Date(count.startedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {count.completedAt
                      ? new Date(count.completedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {count.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {count.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm("Delete this draft count?")) {
                            try {
                              await deleteCount({ countId: count._id });
                              toast.success("Count deleted");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Failed to delete count");
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Inventory Count</DialogTitle>
            <DialogDescription>
              Create a new physical inventory count session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Q1 2026 Annual Count"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || actionLoading === "create"}
            >
              {actionLoading === "create" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Count
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
