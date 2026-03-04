"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import {
  Package,
  Download,
  DollarSign,
  AlertTriangle,
  Clock,
  BarChart2,
  TrendingUp,
  FileBarChart,
  Navigation,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCSV } from "@/lib/export";
import { toast } from "sonner";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the return shapes from convex/inventoryValuation.ts
// (these provide compile-time safety before `convex dev` regenerates api types)
// ─────────────────────────────────────────────────────────────────────────────

type ConditionData = { totalValue: number; partCount: number };

type InventoryValueResult = {
  totalValue: number;
  partCount: number;
  conditionBreakdown: Record<string, ConditionData>;
};

type CategoryResult = {
  category: string;
  totalValue: number;
  partCount: number;
};

type ReorderAlert = {
  partNumber: string;
  partName: string;
  currentQty: number;
  reorderPoint: number | undefined;
  minStockLevel: number | undefined;
};

type LotSummary = {
  lotId: string;
  lotNumber: string;
  partNumber: string;
  partName: string;
  remainingQuantity: number;
  expiryDate: number;
  condition: string;
};

type ShelfLifeResult = {
  expired: Array<LotSummary>;
  within30d: Array<LotSummary>;
  within60d: Array<LotSummary>;
  within90d: Array<LotSummary>;
  totalExpiring: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  serviceable: "Serviceable",
  overhauled: "Overhauled",
  repaired: "Repaired",
  unserviceable: "Unserviceable",
  quarantine: "Quarantine",
  scrapped: "Scrapped",
};

const CONDITION_BADGE_VARIANTS: Record<string, string> = {
  new: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  serviceable: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  overhauled: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  repaired: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  unserviceable: "bg-red-500/15 text-red-400 border-red-500/30",
  quarantine: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  scrapped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const CATEGORY_LABELS: Record<string, string> = {
  consumable: "Consumable",
  standard: "Standard",
  rotable: "Rotable",
  expendable: "Expendable",
  repairable: "Repairable",
  uncategorized: "Uncategorized",
};

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryReportsPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const inventoryValue = useQuery(
    api.inventoryValuation.getInventoryValue,
    orgId ? { organizationId: orgId } : "skip",
  ) as InventoryValueResult | undefined;

  const valueByCategory = useQuery(
    api.inventoryValuation.getInventoryValueByCategory,
    orgId ? { organizationId: orgId } : "skip",
  ) as Array<CategoryResult> | undefined;

  const reorderReport = useQuery(
    api.inventoryValuation.getReorderReport,
    orgId ? { organizationId: orgId } : "skip",
  ) as Array<ReorderAlert> | undefined;

  const shelfLifeReport = useQuery(
    api.inventoryValuation.getShelfLifeReport,
    orgId ? { organizationId: orgId } : "skip",
  ) as ShelfLifeResult | undefined;

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading:
      !isLoaded ||
      inventoryValue === undefined ||
      valueByCategory === undefined ||
      reorderReport === undefined ||
      shelfLifeReport === undefined,
  });

  // Condition breakdown sorted by value (highest first)
  const conditionEntries = useMemo(() => {
    if (!inventoryValue) return [];

    const entries: Array<[string, ConditionData]> = Object.entries(
      inventoryValue.conditionBreakdown,
    );
    return entries
      .filter(([, data]) => data.totalValue > 0)
      .sort(([, a], [, b]) => b.totalValue - a.totalValue);
  }, [inventoryValue]);

  // CSV export data
  const csvExportData = useMemo(() => {
    if (!inventoryValue || !valueByCategory) return [];

    const rows: Array<Record<string, unknown>> = [];

    // Summary row
    rows.push({
      Section: "Total Inventory",
      Category: "",
      Condition: "",
      Value: inventoryValue.totalValue,
      "Part Count": inventoryValue.partCount,
    });

    // Category rows
    for (const cat of valueByCategory) {
      rows.push({
        Section: "By Category",
        Category: CATEGORY_LABELS[cat.category] ?? cat.category,
        Condition: "",
        Value: cat.totalValue,
        "Part Count": cat.partCount,
      });
    }

    // Condition rows
    const condBreakdownEntries: Array<[string, ConditionData]> = Object.entries(
      inventoryValue.conditionBreakdown,
    );
    for (const [condition, data] of condBreakdownEntries) {
      if (data.partCount > 0) {
        rows.push({
          Section: "By Condition",
          Category: "",
          Condition: CONDITION_LABELS[condition] ?? condition,
          Value: data.totalValue,
          "Part Count": data.partCount,
        });
      }
    }

    // Reorder alerts
    if (reorderReport) {
      for (const alert of reorderReport) {
        rows.push({
          Section: "Reorder Alert",
          Category: alert.partNumber,
          Condition: alert.partName,
          Value: "",
          "Part Count": alert.currentQty,
          "Reorder Point": alert.reorderPoint ?? "",
          "Min Stock Level": alert.minStockLevel ?? "",
        });
      }
    }

    return rows;
  }, [inventoryValue, valueByCategory, reorderReport]);

  // ─── Loading / Error States ─────────────────────────────────────────────
  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return <Skeleton className="h-96 w-full" data-testid="page-loading-state" />;
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Inventory reports require organization setup"
        missingInfo="Complete onboarding before viewing inventory valuation data."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventory Valuation
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Inventory value, stock alerts, and shelf life monitoring
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={csvExportData.length === 0}
          onClick={() => {
            downloadCSV(csvExportData, "inventory-valuation-report.csv");
            toast.success("Inventory report exported");
          }}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Report Sub-Navigation */}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports">
            <BarChart2 className="w-3.5 h-3.5" />
            Overview
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials">
            <DollarSign className="w-3.5 h-3.5" />
            Financial Dashboard
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials/forecast">
            <TrendingUp className="w-3.5 h-3.5" />
            Forecast
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials/runway">
            <Navigation className="w-3.5 h-3.5" />
            Runway
          </Link>
        </Button>
        <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link to="/reports/inventory">
            <Package className="w-3.5 h-3.5" />
            Inventory
          </Link>
        </Button>
      </div>

      {/* Total Inventory Value — Hero Card */}
      <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Total Inventory Value
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums mt-1">
                {inventoryValue ? formatCurrency(inventoryValue.totalValue) : "--"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {inventoryValue
                  ? `${inventoryValue.partCount.toLocaleString()} total parts`
                  : "Loading..."}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="text-center px-4 py-2 rounded-lg bg-background/60 border border-border/40">
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-semibold text-amber-400 tabular-nums">
                  {reorderReport ? reorderReport.length : "--"}
                </p>
              </div>
              <div className="text-center px-4 py-2 rounded-lg bg-background/60 border border-border/40">
                <p className="text-xs text-muted-foreground">Expiring</p>
                <p className="text-xl font-semibold text-orange-400 tabular-nums">
                  {shelfLifeReport ? shelfLifeReport.totalExpiring : "--"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value by Category + Value by Condition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Value by Category */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileBarChart className="w-4 h-4 text-muted-foreground" />
              Value by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!valueByCategory ? (
              <Skeleton className="h-[200px] w-full" />
            ) : valueByCategory.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No categorized parts found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs text-right">Parts</TableHead>
                    <TableHead className="text-xs text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...valueByCategory]
                    .sort((a: CategoryResult, b: CategoryResult) => b.totalValue - a.totalValue)
                    .map((row: CategoryResult) => (
                      <TableRow key={row.category} className="border-border/40">
                        <TableCell className="text-xs font-medium">
                          {CATEGORY_LABELS[row.category] ?? row.category}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {row.partCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-medium">
                          {formatCurrency(row.totalValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Value by Condition */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-muted-foreground" />
              Value by Condition
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!inventoryValue ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Condition</TableHead>
                    <TableHead className="text-xs text-right">Parts</TableHead>
                    <TableHead className="text-xs text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(
                    Object.entries(inventoryValue.conditionBreakdown) as Array<[string, ConditionData]>
                  )
                    .filter(([, data]: [string, ConditionData]) => data.partCount > 0)
                    .sort(([, a]: [string, ConditionData], [, b]: [string, ConditionData]) => b.totalValue - a.totalValue)
                    .map(([condition, data]: [string, ConditionData]) => (
                      <TableRow key={condition} className="border-border/40">
                        <TableCell className="text-xs">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${CONDITION_BADGE_VARIANTS[condition] ?? ""}`}
                          >
                            {CONDITION_LABELS[condition] ?? condition}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {data.partCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-medium">
                          {formatCurrency(data.totalValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {(
                    Object.values(inventoryValue.conditionBreakdown) as Array<ConditionData>
                  ).every((d: ConditionData) => d.partCount === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs text-center text-muted-foreground py-8">
                        No parts with condition data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Low Stock Alerts
            {reorderReport && reorderReport.length > 0 && (
              <Badge variant="outline" className="ml-1 bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                {reorderReport.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link to="/parts/alerts">View All Alerts</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!reorderReport ? (
            <Skeleton className="h-[150px] w-full" />
          ) : reorderReport.length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground">
              All parts are above reorder thresholds
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Part Number</TableHead>
                  <TableHead className="text-xs">Part Name</TableHead>
                  <TableHead className="text-xs text-right">Current Qty</TableHead>
                  <TableHead className="text-xs text-right">Reorder Point</TableHead>
                  <TableHead className="text-xs text-right">Min Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reorderReport.slice(0, 10).map((alert: ReorderAlert) => (
                  <TableRow key={alert.partNumber} className="border-border/40">
                    <TableCell className="text-xs font-mono font-medium">
                      {alert.partNumber}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]">
                      {alert.partName}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-semibold text-red-400">
                      {alert.currentQty}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {alert.reorderPoint ?? "--"}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {alert.minStockLevel ?? "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Shelf Life Expiry Summary */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" />
            Shelf Life Expiry Summary
            {shelfLifeReport && shelfLifeReport.totalExpiring > 0 && (
              <Badge
                variant="outline"
                className="ml-1 bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px]"
              >
                {shelfLifeReport.totalExpiring}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!shelfLifeReport ? (
            <Skeleton className="h-[150px] w-full" />
          ) : shelfLifeReport.totalExpiring === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground">
              No lots expiring within 90 days
            </div>
          ) : (
            <div className="space-y-4">
              {/* Urgency Band Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-red-400 font-medium">
                    Expired
                  </p>
                  <p className="text-lg font-bold text-red-400 tabular-nums">
                    {shelfLifeReport.expired.length}
                  </p>
                </div>
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-orange-400 font-medium">
                    Within 30d
                  </p>
                  <p className="text-lg font-bold text-orange-400 tabular-nums">
                    {shelfLifeReport.within30d.length}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-amber-400 font-medium">
                    Within 60d
                  </p>
                  <p className="text-lg font-bold text-amber-400 tabular-nums">
                    {shelfLifeReport.within60d.length}
                  </p>
                </div>
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-yellow-400 font-medium">
                    Within 90d
                  </p>
                  <p className="text-lg font-bold text-yellow-400 tabular-nums">
                    {shelfLifeReport.within90d.length}
                  </p>
                </div>
              </div>

              {/* Expired + Expiring Soon Table */}
              {(shelfLifeReport.expired.length > 0 || shelfLifeReport.within30d.length > 0) && (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Lot Number</TableHead>
                      <TableHead className="text-xs">Part Number</TableHead>
                      <TableHead className="text-xs">Part Name</TableHead>
                      <TableHead className="text-xs text-right">Remaining Qty</TableHead>
                      <TableHead className="text-xs text-right">Expiry Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...shelfLifeReport.expired, ...shelfLifeReport.within30d]
                      .sort((a: LotSummary, b: LotSummary) => a.expiryDate - b.expiryDate)
                      .slice(0, 10)
                      .map((lot: LotSummary) => {
                        const isExpired = lot.expiryDate <= Date.now();
                        return (
                          <TableRow key={lot.lotId} className="border-border/40">
                            <TableCell className="text-xs">
                              <Badge
                                variant="outline"
                                className={
                                  isExpired
                                    ? "bg-red-500/15 text-red-400 border-red-500/30 text-[10px]"
                                    : "bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px]"
                                }
                              >
                                {isExpired ? "Expired" : "Expiring Soon"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {lot.lotNumber}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {lot.partNumber}
                            </TableCell>
                            <TableCell className="text-xs truncate max-w-[160px]">
                              {lot.partName}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums">
                              {lot.remainingQuantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums">
                              {formatDate(lot.expiryDate)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Highest-Value Condition Groups */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            Highest-Value Condition Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!inventoryValue ? (
            <Skeleton className="h-[200px] w-full" />
          ) : conditionEntries.length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground">
              No parts with cost data
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs w-8">#</TableHead>
                  <TableHead className="text-xs">Condition</TableHead>
                  <TableHead className="text-xs text-right">Part Count</TableHead>
                  <TableHead className="text-xs text-right">Total Value</TableHead>
                  <TableHead className="text-xs text-right">Avg Value / Part</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conditionEntries.map(([condition, data]: [string, ConditionData], index: number) => (
                  <TableRow key={condition} className="border-border/40">
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${CONDITION_BADGE_VARIANTS[condition] ?? ""}`}
                      >
                        {CONDITION_LABELS[condition] ?? condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {data.partCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-medium">
                      {formatCurrency(data.totalValue)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {data.partCount > 0
                        ? formatCurrency(data.totalValue / data.partCount)
                        : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
