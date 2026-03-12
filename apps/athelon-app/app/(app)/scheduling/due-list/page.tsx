import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CalendarClock, CalendarRange, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { MissingPrereqBanner } from "@/components/zero-state/MissingPrereqBanner";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { SchedulingSubNav } from "../_components/SchedulingSubNav";

const HORIZONS = [30, 60, 90, 180] as const;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function SchedulingDueListPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [horizonDays, setHorizonDays] = useState<(typeof HORIZONS)[number]>(90);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [monthIso, setMonthIso] = useState(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });

  const dueData = useQuery(
    api.planningFromDueList.dueListWorkbench,
    orgId
      ? {
          organizationId: orgId,
          horizonDays,
          includeAdCompliance: true,
        }
      : "skip",
  );

  const generateMonthlyPlan = useMutation(api.planningFromDueList.generateMonthlyPlan);

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || dueData === undefined,
  });

  const selectedItems = useMemo(() => {
    if (!dueData) return [];
    return dueData.events.filter((event) => selected[event.dueKey]);
  }, [dueData, selected]);

  const selectionByGroup = useMemo(() => {
    const byGroup = {
      overdue: 0,
      dueSoon: 0,
      planned: 0,
    };
    if (!dueData) return byGroup;
    for (const item of selectedItems) {
      if (item.status === "overdue") byGroup.overdue += 1;
      if (item.status === "due_soon") byGroup.dueSoon += 1;
      if (item.status === "planned") byGroup.planned += 1;
    }
    return byGroup;
  }, [dueData, selectedItems]);

  function toggleKey(key: string) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectGroup(items: Array<{ dueKey: string }>, on: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const item of items) {
        next[item.dueKey] = on;
      }
      return next;
    });
  }

  async function handleGeneratePlan() {
    if (!orgId) {
      toast.error("Organization context is required.");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Select at least one due item.");
      return;
    }

    const [year, month] = monthIso.split("-").map(Number);
    const monthStart = Date.UTC(year, month - 1, 1);

    setIsGenerating(true);
    try {
      const result = await generateMonthlyPlan({
        organizationId: orgId,
        monthStart,
        dueItems: selectedItems.map((item) => ({
          dueKey: item.dueKey,
          aircraftId: item.aircraftId as Id<"aircraft">,
          title: item.title,
          details: item.details,
          dueDate: item.dueDate,
          source: item.source,
        })),
        planTitle: `Monthly plan ${monthIso}`,
      });

      toast.success(
        `Generated ${result.createdWorkOrders.length} draft work order(s) from ${result.totalItems} due item(s).`,
      );
      setSelected({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate monthly plan.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4" data-testid="due-list-loading-state">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (prereq.state !== "ready") {
    return <MissingPrereqBanner kind={prereq.missingKind ?? "needs_org_context"} />;
  }

  if (!dueData || dueData.events.length === 0) {
    return (
      <ActionableEmptyState
        title="Due-list workbench is clear"
        missingInfo="No events fell within the selected horizon. Expand horizon or verify maintenance intervals."
        primaryActionLabel="Set 180-day horizon"
        primaryActionType="button"
        primaryActionTarget={() => setHorizonDays(180)}
      />
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <SchedulingSubNav />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-3 text-lg">
            <span className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5" />
              Due-List Planning Workbench
            </span>
            <Badge variant="outline">{dueData.totals.all} events</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {HORIZONS.map((days) => (
              <Button
                key={days}
                variant={horizonDays === days ? "default" : "outline"}
                size="sm"
                data-testid={`due-list-horizon-${days}`}
                onClick={() => setHorizonDays(days)}
              >
                {days}-day horizon
              </Button>
            ))}
            <Badge variant="secondary">Overdue {dueData.totals.overdue}</Badge>
            <Badge variant="secondary">Due soon {dueData.totals.dueSoon}</Badge>
            <Badge variant="secondary">Planned {dueData.totals.planned}</Badge>
            <Badge variant={dueData.totals.withConflicts > 0 ? "destructive" : "outline"}>
              Conflicts {dueData.totals.withConflicts}
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="text-sm text-muted-foreground">
              Select due events and generate a monthly draft work-order package with seeded task cards.
            </div>
            <div className="flex items-center gap-2">
              <input
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                data-testid="due-list-month-picker"
                type="month"
                value={monthIso}
                onChange={(e) => setMonthIso(e.target.value)}
              />
              <Button
                data-testid="due-list-generate-plan"
                onClick={handleGeneratePlan}
                disabled={isGenerating || selectedItems.length === 0}
              >
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
                Generate monthly plan
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Selected: {selectedItems.length} total • Overdue {selectionByGroup.overdue} • Due soon {selectionByGroup.dueSoon} • Planned {selectionByGroup.planned}
          </div>
        </CardContent>
      </Card>

      {[
        { key: "overdue", title: "Overdue", items: dueData.groups.overdue },
        { key: "dueSoon", title: "Due Soon (0–30 days)", items: dueData.groups.dueSoon },
        { key: "planned", title: "Planned Window", items: dueData.groups.planned },
      ].map((group) => (
        <Card key={group.key}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>{group.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{group.items.length}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`due-list-select-all-${group.key}`}
                  onClick={() => selectGroup(group.items, true)}
                  disabled={group.items.length === 0}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`due-list-clear-${group.key}`}
                  onClick={() => selectGroup(group.items, false)}
                  disabled={group.items.length === 0}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {group.items.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No events in this group.
              </div>
            ) : (
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.dueKey}
                    className="rounded-md border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={!!selected[item.dueKey]}
                          data-testid={`due-list-select-${item.dueKey}`}
                          onCheckedChange={() => toggleKey(item.dueKey)}
                          aria-label={`Select ${item.title}`}
                        />
                        <div className="space-y-1">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.aircraftLabel} • {item.details}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Interval: {item.intervalSummary.join(" / ")}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 text-right text-sm">
                        <div>Due: {formatDate(item.dueDate)}</div>
                        <Badge variant={item.status === "overdue" ? "destructive" : "secondary"}>
                          {item.dueInDays < 0 ? `${Math.abs(item.dueInDays)} days overdue` : `${item.dueInDays} days`}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Recurring projection:</span>
                      {item.projectionDates.map((projectionDate, idx) => (
                        <Badge key={`${item.dueKey}-p-${idx}`} variant="outline">
                          {idx === 0 ? "Next" : `Run ${idx + 1}`}: {formatDate(projectionDate)}
                        </Badge>
                      ))}
                    </div>

                    {item.hasConflict && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Conflict marker: {item.conflictReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
