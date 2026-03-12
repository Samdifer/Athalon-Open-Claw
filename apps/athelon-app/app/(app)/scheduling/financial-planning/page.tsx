"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useSelectedLocation } from "@/components/LocationSwitcher";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Save, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { SchedulingSubNav } from "../_components/SchedulingSubNav";

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function FinancialPlanningPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const { selectedLocationId } = useSelectedLocation(orgId);
  const selectedShopLocationFilter =
    selectedLocationId === "all"
      ? "all"
      : (selectedLocationId as Id<"shopLocations">);
  const [saving, setSaving] = useState(false);

  const settings = useQuery(
    api.schedulerPlanning.getPlanningFinancialSettings,
    orgId ? { organizationId: orgId } : "skip",
  );
  const projects = useQuery(
    api.schedulerPlanning.listPlannerProjects,
    orgId
      ? {
          organizationId: orgId,
          includeArchived: false,
          shopLocationId: selectedShopLocationFilter,
        }
      : "skip",
  );
  const workOrders = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId
      ? { organizationId: orgId, shopLocationId: selectedShopLocationFilter }
      : "skip",
  );
  const saveSettings = useMutation(api.schedulerPlanning.upsertPlanningFinancialSettings);

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading:
      !isLoaded ||
      settings === undefined ||
      projects === undefined ||
      workOrders === undefined,
  });

  const [form, setForm] = useState({
    defaultShopRate: "",
    defaultLaborCostRate: "",
    monthlyFixedOverhead: "",
    monthlyVariableOverhead: "",
    annualCapexAssumption: "",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      defaultShopRate: String(settings.defaultShopRate ?? 125),
      defaultLaborCostRate: String(settings.defaultLaborCostRate ?? 52),
      monthlyFixedOverhead: String(settings.monthlyFixedOverhead ?? 38000),
      monthlyVariableOverhead: String(settings.monthlyVariableOverhead ?? 12000),
      annualCapexAssumption: String(settings.annualCapexAssumption ?? 120000),
    });
  }, [settings]);

  const parsed = useMemo(() => {
    const defaultShopRate = Number(form.defaultShopRate || 0);
    const defaultLaborCostRate = Number(form.defaultLaborCostRate || 0);
    const monthlyFixedOverhead = Number(form.monthlyFixedOverhead || 0);
    const monthlyVariableOverhead = Number(form.monthlyVariableOverhead || 0);
    const annualCapexAssumption = Number(form.annualCapexAssumption || 0);
    return {
      defaultShopRate,
      defaultLaborCostRate,
      monthlyFixedOverhead,
      monthlyVariableOverhead,
      annualCapexAssumption,
    };
  }, [form]);

  const projection = useMemo(() => {
    const woMap = new Map((workOrders ?? []).map((wo) => [wo._id, wo]));
    const activeProjects = (projects ?? []).filter(
      (p) => !["closed", "cancelled", "voided"].includes(p.workOrderStatus),
    );

    let projectedHours = 0;
    for (const p of activeProjects) {
      const wo = woMap.get(p.workOrderId);
      if (!wo) continue;
      projectedHours += Math.max(0, wo.remainingHours ?? wo.effectiveEstimatedHours ?? 0);
    }

    const projectedRevenue = projectedHours * parsed.defaultShopRate;
    const projectedLaborCost = projectedHours * parsed.defaultLaborCostRate;
    const monthlyOverhead =
      parsed.monthlyFixedOverhead +
      parsed.monthlyVariableOverhead +
      parsed.annualCapexAssumption / 12;

    const projectedProfit = projectedRevenue - projectedLaborCost - monthlyOverhead;

    return {
      activeProjectCount: activeProjects.length,
      projectedHours,
      projectedRevenue,
      projectedLaborCost,
      monthlyOverhead,
      projectedProfit,
    };
  }, [projects, workOrders, parsed]);

  async function handleSave() {
    if (!orgId) return;

    // Validate all inputs are real, non-negative numbers before hitting backend.
    // Number("100k") = NaN, Number("-5") = -5 — both would corrupt planning calculations.
    const fields: [string, number][] = [
      ["Default Shop Rate", parsed.defaultShopRate],
      ["Labor Cost Rate", parsed.defaultLaborCostRate],
      ["Monthly Fixed Overhead", parsed.monthlyFixedOverhead],
      ["Monthly Variable Overhead", parsed.monthlyVariableOverhead],
      ["Annual CAPEX Assumption", parsed.annualCapexAssumption],
    ];
    for (const [label, value] of fields) {
      if (Number.isNaN(value)) {
        toast.error(`${label}: enter a valid number (e.g. 125, not "125/hr")`);
        return;
      }
      if (value < 0) {
        toast.error(`${label} cannot be negative`);
        return;
      }
    }

    setSaving(true);
    try {
      await saveSettings({
        organizationId: orgId,
        defaultShopRate: parsed.defaultShopRate,
        defaultLaborCostRate: parsed.defaultLaborCostRate,
        monthlyFixedOverhead: parsed.monthlyFixedOverhead,
        monthlyVariableOverhead: parsed.monthlyVariableOverhead,
        annualCapexAssumption: parsed.annualCapexAssumption,
      });
      toast.success("Planning financial settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Financial planning requires organization setup"
        missingInfo="Complete onboarding before configuring planning assumptions."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <SchedulingSubNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Calculator className="w-5 h-5 text-muted-foreground" />
            Planning Financials
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure planning assumptions and review projected schedule-linked P&L.
          </p>
        </div>
        <Badge variant="outline" className="text-[11px]">
          Planner v2
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase text-muted-foreground mb-1">Active Projects</p>
            <p className="text-2xl font-semibold">{projection.activeProjectCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Work-order-backed projects in planner
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase text-muted-foreground mb-1">Projected Revenue</p>
            <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {money(projection.projectedRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {projection.projectedHours.toFixed(1)} remaining labor hours
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase text-muted-foreground mb-1">Projected Profit</p>
            <p
              className={`text-2xl font-semibold ${
                projection.projectedProfit >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {money(projection.projectedProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              {projection.projectedProfit >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              Revenue - labor - overhead
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm">Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Default Shop Rate ($/hr)</Label>
            <Input
              value={form.defaultShopRate}
              onChange={(e) => setForm((p) => ({ ...p, defaultShopRate: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Labor Cost Rate ($/hr)</Label>
            <Input
              value={form.defaultLaborCostRate}
              onChange={(e) => setForm((p) => ({ ...p, defaultLaborCostRate: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Monthly Fixed Overhead</Label>
            <Input
              value={form.monthlyFixedOverhead}
              onChange={(e) => setForm((p) => ({ ...p, monthlyFixedOverhead: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Monthly Variable Overhead</Label>
            <Input
              value={form.monthlyVariableOverhead}
              onChange={(e) => setForm((p) => ({ ...p, monthlyVariableOverhead: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Annual CAPEX Assumption</Label>
            <Input
              value={form.annualCapexAssumption}
              onChange={(e) => setForm((p) => ({ ...p, annualCapexAssumption: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Computed Monthly Overhead</Label>
            <div className="h-8 px-3 rounded-md border border-border/60 bg-muted/20 flex items-center text-sm font-medium">
              {money(projection.monthlyOverhead)}
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="h-8 text-xs">
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Assumptions"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
