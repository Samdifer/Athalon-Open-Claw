"use client";

// MBP-0116: Schedule Snapshot / Baseline Comparison
// Save current schedule as baseline, compare against actual.

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Camera,
  Layers,
  Trash2,
  Eye,
  EyeOff,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { toast } from "sonner";

type SnapshotEntry = {
  workOrderId: string;
  workOrderNumber: string;
  hangarBayId: string;
  startDate: number;
  endDate: number;
  priority: string;
  aircraftReg?: string;
};

type ScheduledProject = {
  workOrderId: string;
  workOrderNumber: string;
  hangarBayId: string;
  scheduledStartDate: number;
  promisedDeliveryDate: number;
  priority: string;
  aircraft: { currentRegistration: string | undefined; make: string; model: string } | null;
};

interface ScheduleSnapshotPanelProps {
  orgId: Id<"organizations">;
  currentProjects: ScheduledProject[];
  activeSnapshotId: string | null;
  onSetActiveSnapshot: (id: string | null) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatSlippage(days: number): { label: string; icon: React.ReactNode; color: string } {
  if (days > 1) return { label: `${Math.round(days)}d late`, icon: <TrendingDown className="w-3 h-3" />, color: "text-red-500" };
  if (days < -1) return { label: `${Math.abs(Math.round(days))}d early`, icon: <TrendingUp className="w-3 h-3" />, color: "text-emerald-500" };
  return { label: "On track", icon: <Minus className="w-3 h-3" />, color: "text-muted-foreground" };
}

export function ScheduleSnapshotPanel({
  orgId,
  currentProjects,
  activeSnapshotId,
  onSetActiveSnapshot,
}: ScheduleSnapshotPanelProps) {
  const snapshots = useQuery(api.scheduleSnapshots.listSnapshots, { organizationId: orgId });
  const saveSnapshot = useMutation(api.scheduleSnapshots.saveSnapshot);
  const deleteSnapshot = useMutation(api.scheduleSnapshots.deleteSnapshot);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [saving, setSaving] = useState(false);

  const activeSnapshot = useMemo(() => {
    if (!activeSnapshotId || !snapshots) return null;
    return snapshots.find((s) => s._id === activeSnapshotId) ?? null;
  }, [activeSnapshotId, snapshots]);

  // Compute slippage between baseline and current
  const slippageData = useMemo(() => {
    if (!activeSnapshot) return null;

    const baselineMap = new Map<string, SnapshotEntry>();
    for (const entry of activeSnapshot.entries) {
      baselineMap.set(entry.workOrderId, entry);
    }

    let totalSlippageDays = 0;
    let trackedCount = 0;
    const perWO: {
      workOrderId: string;
      workOrderNumber: string;
      baselineEnd: number;
      actualEnd: number;
      slippageDays: number;
    }[] = [];

    for (const project of currentProjects) {
      const baseline = baselineMap.get(project.workOrderId);
      if (!baseline) continue;

      const slippageDays = (project.promisedDeliveryDate - baseline.endDate) / DAY_MS;
      totalSlippageDays += slippageDays;
      trackedCount++;
      perWO.push({
        workOrderId: project.workOrderId,
        workOrderNumber: project.workOrderNumber,
        baselineEnd: baseline.endDate,
        actualEnd: project.promisedDeliveryDate,
        slippageDays,
      });
    }

    return {
      averageSlippage: trackedCount > 0 ? totalSlippageDays / trackedCount : 0,
      trackedCount,
      perWO: perWO.sort((a, b) => b.slippageDays - a.slippageDays),
    };
  }, [activeSnapshot, currentProjects]);

  async function handleSave() {
    if (!snapshotName.trim()) {
      toast.error("Snapshot name is required");
      return;
    }
    setSaving(true);
    try {
      const entries: SnapshotEntry[] = currentProjects.map((p) => ({
        workOrderId: p.workOrderId,
        workOrderNumber: p.workOrderNumber,
        hangarBayId: p.hangarBayId,
        startDate: p.scheduledStartDate,
        endDate: p.promisedDeliveryDate,
        priority: p.priority,
        aircraftReg: p.aircraft?.currentRegistration ?? undefined,
      }));

      await saveSnapshot({
        organizationId: orgId,
        name: snapshotName.trim(),
        entries,
      });
      toast.success("Schedule snapshot saved");
      setSaveDialogOpen(false);
      setSnapshotName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save snapshot");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(snapshotId: Id<"scheduleSnapshots">) {
    try {
      if (activeSnapshotId === snapshotId) onSetActiveSnapshot(null);
      await deleteSnapshot({ snapshotId });
      toast.success("Snapshot deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete snapshot");
    }
  }

  return (
    <div className="space-y-3">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-7"
          onClick={() => {
            setSnapshotName(
              `Baseline ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
            );
            setSaveDialogOpen(true);
          }}
        >
          <Camera className="w-3.5 h-3.5" />
          Save Snapshot
        </Button>
        {activeSnapshot && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={() => onSetActiveSnapshot(null)}
          >
            <EyeOff className="w-3.5 h-3.5" />
            Hide Baseline
          </Button>
        )}
      </div>

      {/* Snapshot list */}
      {snapshots && snapshots.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Saved Snapshots
          </span>
          {snapshots.map((snap) => (
            <div
              key={snap._id}
              className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                activeSnapshotId === snap._id
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/40 hover:border-border/60"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-medium truncate block">{snap.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {snap.entries.length} WOs ·{" "}
                  {new Date(snap.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  onSetActiveSnapshot(activeSnapshotId === snap._id ? null : snap._id)
                }
              >
                {activeSnapshotId === snap._id ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => handleDelete(snap._id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Slippage report */}
      {slippageData && (
        <div className="space-y-2 border-t border-border/40 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Schedule Slippage
            </span>
            <Badge variant="outline" className="text-[9px]">
              {slippageData.trackedCount} WOs tracked
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {(() => {
              const s = formatSlippage(slippageData.averageSlippage);
              return (
                <span className={`flex items-center gap-1 font-medium ${s.color}`}>
                  {s.icon}
                  Avg: {s.label}
                </span>
              );
            })()}
          </div>

          {slippageData.perWO.slice(0, 5).map((wo) => {
            const s = formatSlippage(wo.slippageDays);
            return (
              <div key={wo.workOrderId} className="flex items-center gap-2 text-[11px]">
                <span className="font-mono text-muted-foreground">{wo.workOrderNumber}</span>
                <span className={`flex items-center gap-0.5 ${s.color}`}>
                  {s.icon}
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Schedule Snapshot</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Snapshot name"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value.slice(0, 60))}
              maxLength={60}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Captures {currentProjects.length} scheduled work order(s) as a baseline.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Snapshot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Get baseline ghost bar positions for overlay on Gantt.
 * Returns map of workOrderId → { startDate, endDate } from the active snapshot.
 */
export function getBaselinePositions(
  snapshot: { entries: SnapshotEntry[] } | null,
): Map<string, { startDate: number; endDate: number }> {
  const map = new Map<string, { startDate: number; endDate: number }>();
  if (!snapshot) return map;
  for (const entry of snapshot.entries) {
    map.set(entry.workOrderId, {
      startDate: entry.startDate,
      endDate: entry.endDate,
    });
  }
  return map;
}
