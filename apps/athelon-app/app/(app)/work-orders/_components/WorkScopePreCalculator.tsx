"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Calculator, ClipboardPlus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type WorkScopeSuggestion = {
  id: string;
  taskName: string;
  ataChapter: string;
  dueReason: string;
};

type Props = {
  aircraftType: string;
  currentTotalTimeHours?: number;
  currentCycles?: number;
  averageMonthlyHours?: number;
  averageMonthlyCycles?: number;
  lookAheadHours?: number;
  lookAheadDays?: number;
  onAddAll?: (items: WorkScopeSuggestion[]) => void;
  onAddSelected?: (items: WorkScopeSuggestion[]) => void;
};

export function WorkScopePreCalculator({
  aircraftType,
  currentTotalTimeHours = 0,
  currentCycles = 0,
  averageMonthlyHours = 80,
  averageMonthlyCycles = 60,
  lookAheadHours = 30,
  lookAheadDays = 30,
  onAddAll,
  onAddSelected,
}: Props) {
  const { orgId } = useCurrentOrg();

  const projections = useQuery(
    api.maintenancePrograms.computeDueDates,
    orgId && aircraftType
      ? {
          organizationId: orgId,
          aircraftType,
          currentTotalTime: currentTotalTimeHours,
          currentCycles,
          averageMonthlyHours,
          averageMonthlyCycles,
        }
      : "skip",
  );

  const now = Date.now();
  const dayWindowMs = lookAheadDays * 86_400_000;

  const dueSoon = useMemo(() => {
    return (projections ?? []).filter((item) => {
      const hourProjection = item.projections.find((p) => p.type === "hours");
      const parsedHoursRemaining = hourProjection
        ? Number.parseFloat(hourProjection.remaining.replace(/[^0-9.\-]/g, ""))
        : Number.NaN;
      const hasTimeWindowHit = Number.isFinite(parsedHoursRemaining)
        ? parsedHoursRemaining <= lookAheadHours
        : false;

      const hasDateWindowHit =
        item.effectiveDueDate != null ? item.effectiveDueDate - now <= dayWindowMs : false;

      return hasTimeWindowHit || hasDateWindowHit;
    });
  }, [projections, lookAheadHours, now, dayWindowMs]);

  const suggestions: WorkScopeSuggestion[] = useMemo(
    () =>
      dueSoon.map((item) => ({
        id: String(item.programId),
        taskName: item.taskName,
        ataChapter: item.ataChapter,
        dueReason:
          item.effectiveDueDate != null
            ? `Due by ${new Date(item.effectiveDueDate).toLocaleDateString("en-US", { timeZone: "UTC" })} (UTC)`
            : `Due within ${lookAheadHours} flight hours`,
      })),
    [dueSoon, lookAheadHours],
  );

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const selectedRows = suggestions.filter((row) => selectedIds[row.id]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calculator className="w-4 h-4 text-muted-foreground" />
          Work Scope Pre-Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Predicted task cards due within {lookAheadHours} flight hours or {lookAheadDays} days based on active maintenance programs.
        </p>

        {!aircraftType ? (
          <p className="text-xs text-muted-foreground">Select an aircraft type to calculate projected work scope.</p>
        ) : projections === undefined ? (
          <p className="text-xs text-muted-foreground">Calculating projected scope…</p>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No due maintenance program items found in the look-ahead window.</p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-2 rounded-md border border-border/60 p-3 cursor-pointer"
              >
                <Checkbox
                  checked={!!selectedIds[item.id]}
                  onCheckedChange={(checked) =>
                    setSelectedIds((prev) => ({ ...prev, [item.id]: !!checked }))
                  }
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.taskName}</p>
                  <p className="text-[11px] text-muted-foreground">ATA {item.ataChapter}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.dueReason}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onAddAll?.(suggestions)}
            disabled={suggestions.length === 0}
          >
            <ClipboardPlus className="w-3.5 h-3.5" />
            Add All
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => onAddSelected?.(selectedRows)}
            disabled={selectedRows.length === 0}
          >
            Add Selected ({selectedRows.length})
          </Button>
          <Label className="text-xs text-muted-foreground ml-auto">{suggestions.length} suggested task card(s)</Label>
        </div>
      </CardContent>
    </Card>
  );
}
