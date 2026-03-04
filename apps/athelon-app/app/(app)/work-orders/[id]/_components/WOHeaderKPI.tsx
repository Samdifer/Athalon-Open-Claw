"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { AlertTriangle, CalendarClock, Clock3, Wrench } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { formatCurrency, formatDateUTC } from "@/src/shared/lib/format";
import { toast } from "sonner";

type WorkOrderLike = {
  _id: Id<"workOrders">;
  promisedDeliveryDate?: number;
  estimatedLaborHoursOverride?: number;
  status?: string;
};

type TaskCardLike = {
  estimatedHours?: number;
};

type TimeEntryLike = {
  durationMinutes?: number;
  clockInAt: number;
  clockOutAt?: number;
  rateAtTime?: number;
};

type PartLike = Record<string, unknown>;

function normalizeDateInputToUTC(dateInput: string): number {
  const [y, m, d] = dateInput.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function getPartCost(part: PartLike): number {
  const candidates = [
    part.unitCost,
    part.cost,
    part.purchasePrice,
    part.unitPrice,
    part.currentValue,
  ];
  const value = candidates.find((n) => typeof n === "number" && Number.isFinite(n)) as
    | number
    | undefined;
  return value ?? 0;
}

export function WOHeaderKPI({
  workOrder,
  taskCards,
  timeEntries,
  parts,
}: {
  workOrder: WorkOrderLike;
  taskCards: TaskCardLike[];
  timeEntries: TimeEntryLike[];
  parts: PartLike[];
}) {
  const { orgId, tech } = useCurrentOrg();
  const updateScheduleFields = useMutation(api.workOrders.updateScheduleFields);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRtsDate, setNewRtsDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const isManagerOrAdmin = tech?.role === "admin" || tech?.role === "shop_manager";

  const estimatedHours = useMemo(() => {
    if (typeof workOrder.estimatedLaborHoursOverride === "number") {
      return workOrder.estimatedLaborHoursOverride;
    }
    return taskCards.reduce((sum, card) => sum + (card.estimatedHours ?? 0), 0);
  }, [taskCards, workOrder.estimatedLaborHoursOverride]);

  const actualHours = useMemo(() => {
    const now = Date.now();
    return timeEntries.reduce((sum, entry) => {
      if (typeof entry.durationMinutes === "number") return sum + entry.durationMinutes / 60;
      if (entry.clockOutAt) return sum + Math.max(0, entry.clockOutAt - entry.clockInAt) / 3600000;
      return sum + Math.max(0, now - entry.clockInAt) / 3600000;
    }, 0);
  }, [timeEntries]);

  const blendedRate = useMemo(() => {
    const rates = timeEntries
      .map((entry) => entry.rateAtTime)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0);
    if (rates.length === 0) return 125;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }, [timeEntries]);

  const partsCost = useMemo(() => parts.reduce((sum, part) => sum + getPartCost(part), 0), [parts]);
  const laborCost = actualHours * blendedRate;
  const totalWip = partsCost + laborCost;

  const dayDelta = useMemo(() => {
    if (!workOrder.promisedDeliveryDate) return null;
    const DAY = 1000 * 60 * 60 * 24;
    return Math.ceil((workOrder.promisedDeliveryDate - Date.now()) / DAY);
  }, [workOrder.promisedDeliveryDate]);

  const rtsIndicator =
    dayDelta === null ? "none" : dayDelta < 0 ? "overdue" : dayDelta < 3 ? "at_risk" : "on_track";

  const indicatorStyles: Record<string, string> = {
    none: "border-border/60",
    on_track: "border-green-500/40 bg-green-500/5",
    at_risk: "border-amber-500/40 bg-amber-500/5",
    overdue: "border-red-500/40 bg-red-500/5",
  };

  const indicatorTextStyles: Record<string, string> = {
    none: "text-muted-foreground",
    on_track: "text-green-400",
    at_risk: "text-amber-400",
    overdue: "text-red-400",
  };

  const handleUpdateRtsDate = async () => {
    if (!orgId) return;
    if (!newRtsDate) {
      toast.error("Select a new RTS date.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for this RTS date change.");
      return;
    }

    setSaving(true);
    try {
      await updateScheduleFields({
        organizationId: orgId,
        workOrderId: workOrder._id,
        promisedDeliveryDate: normalizeDateInputToUTC(newRtsDate),
      });
      toast.success("RTS date updated.", {
        description: `Reason logged: ${reason.trim()}`,
      });
      setDialogOpen(false);
      setReason("");
      setNewRtsDate("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update RTS date.");
    } finally {
      setSaving(false);
    }
  };

  const hoursProgress = estimatedHours > 0 ? Math.min(100, (actualHours / estimatedHours) * 100) : 0;

  return (
    <div className="space-y-3">
      <Card className={indicatorStyles[rtsIndicator]}>
        <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Committed RTS Date</p>
            {workOrder.promisedDeliveryDate ? (
              <>
                <p className="text-xl sm:text-2xl font-semibold text-foreground">
                  {formatDateUTC(workOrder.promisedDeliveryDate)}
                </p>
                <p className={`text-xs mt-1 ${indicatorTextStyles[rtsIndicator]}`}>
                  {rtsIndicator === "overdue"
                    ? `${Math.abs(dayDelta ?? 0)} day(s) overdue`
                    : rtsIndicator === "at_risk"
                      ? `${dayDelta} day(s) remaining — at risk`
                      : `${dayDelta} day(s) remaining — on track`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No committed RTS date set.</p>
            )}
          </div>

          {isManagerOrAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  Update RTS Date
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Update committed RTS date</DialogTitle>
                  <DialogDescription>
                    Post-inspection date commitment update. A reason is required.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-rts-date">New RTS date</Label>
                    <Input
                      id="new-rts-date"
                      type="date"
                      value={newRtsDate}
                      onChange={(e) => setNewRtsDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rts-reason">Reason</Label>
                    <Textarea
                      id="rts-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why is the RTS commitment date changing?"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateRtsDate} disabled={saving}>
                    {saving ? "Saving..." : "Save RTS Date"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Estimated vs Actual Hours</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">{actualHours.toFixed(1)}h</span>
              <span className="text-xs text-muted-foreground">/ {estimatedHours.toFixed(1)}h est.</span>
            </div>
            <Progress value={hoursProgress} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Parts Cost</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(partsCost)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Labor Cost</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(laborCost)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{actualHours.toFixed(1)}h × {formatCurrency(blendedRate)}/hr</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Total WIP</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalWip)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Days Until RTS</p>
            <div className="flex items-center gap-1.5">
              {dayDelta !== null && dayDelta < 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <p className={`text-lg font-bold ${dayDelta !== null && dayDelta < 0 ? "text-red-400" : "text-foreground"}`}>
                {dayDelta === null ? "—" : dayDelta}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Clock3 className="w-3 h-3" />
              promised date countdown
            </p>
          </CardContent>
        </Card>
      </div>

      {rtsIndicator === "overdue" && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <Wrench className="w-3 h-3" />
          RTS commitment is overdue and requires schedule recovery action.
        </p>
      )}
    </div>
  );
}
