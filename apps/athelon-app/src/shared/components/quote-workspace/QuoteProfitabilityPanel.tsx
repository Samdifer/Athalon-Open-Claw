import { useMemo } from "react";
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuoteProfitabilityPanelProps {
  lineItems: Array<{
    type: "labor" | "part" | "external_service";
    qty: number;
    unitPrice: number;
    total: number;
    directCost?: number;
  }>;
  shopRate: number;
  averageHourlyCost: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function fmt(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function marginColor(margin: number) {
  if (margin >= 30)
    return {
      badge: "bg-green-500/15 text-green-600",
      bar: "bg-green-500",
    };
  if (margin >= 15)
    return {
      badge: "bg-amber-500/15 text-amber-600",
      bar: "bg-amber-500",
    };
  return {
    badge: "bg-red-500/15 text-red-600",
    bar: "bg-red-500",
  };
}

export function QuoteProfitabilityPanel({
  lineItems,
  shopRate,
  averageHourlyCost,
  collapsed = false,
  onToggleCollapse,
}: QuoteProfitabilityPanelProps) {
  // shopRate = billout rate charged to customers (per hour).
  // averageHourlyCost = internal blended labor cost used for GP calculation.
  const metrics = useMemo(() => {
    const laborLines = lineItems.filter((l) => l.type === "labor");
    const partLines = lineItems.filter((l) => l.type === "part");
    const serviceLines = lineItems.filter(
      (l) => l.type === "external_service",
    );

    const laborRevenue = laborLines.reduce((sum, l) => sum + l.total, 0);
    const partsRevenue = partLines.reduce((sum, l) => sum + l.total, 0);
    const serviceRevenue = serviceLines.reduce((sum, l) => sum + l.total, 0);
    const totalRevenue = laborRevenue + partsRevenue + serviceRevenue;

    const totalLaborHours = laborLines.reduce((sum, l) => sum + l.qty, 0);
    const estimatedLaborCost = totalLaborHours * averageHourlyCost;

    const directPartsCost = partLines.reduce(
      (sum, l) => sum + (l.directCost ?? l.total),
      0,
    );
    const directServiceCost = serviceLines.reduce(
      (sum, l) => sum + (l.directCost ?? l.total),
      0,
    );

    const totalDirectCost =
      estimatedLaborCost + directPartsCost + directServiceCost;
    const grossProfit = totalRevenue - totalDirectCost;
    const marginPercent =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      laborRevenue,
      partsRevenue,
      serviceRevenue,
      totalRevenue,
      totalLaborHours,
      estimatedLaborCost,
      directPartsCost,
      directServiceCost,
      totalDirectCost,
      grossProfit,
      marginPercent,
    };
  }, [lineItems, averageHourlyCost]);

  const colors = marginColor(metrics.marginPercent);
  const barWidth = Math.min(Math.max(metrics.marginPercent, 0), 100);

  return (
    <div className="flex w-full max-w-[280px] flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Profitability
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand profitability panel" : "Collapse profitability panel"}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronUp className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>

      {collapsed ? null : (
        <>
          {/* Total Quote Value */}
          <div className="flex items-baseline gap-1.5">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-2xl font-bold tracking-tight">
              ${fmt(metrics.totalRevenue)}
            </span>
          </div>

          {/* Revenue Breakdown */}
          <div className="space-y-1 border-t border-border pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Revenue
            </p>
            <Row
              label="Labor Revenue"
              value={`$${fmt(metrics.laborRevenue)}`}
              sub={
                <Badge
                  variant="secondary"
                  className="ml-1 px-1.5 py-0 text-[10px]"
                >
                  {metrics.totalLaborHours.toFixed(1)} hrs
                </Badge>
              }
            />
            <Row
              label="Parts Revenue"
              value={`$${fmt(metrics.partsRevenue)}`}
            />
            <Row
              label="Vendor/Service Revenue"
              value={`$${fmt(metrics.serviceRevenue)}`}
            />
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-1 border-t border-border pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Costs
            </p>
            <Row
              label="Est. Labor Cost"
              value={`$${fmt(metrics.estimatedLaborCost)}`}
              sub={
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({metrics.totalLaborHours.toFixed(1)} hrs × $
                  {fmt(averageHourlyCost)}/hr cost · ${fmt(shopRate)}/hr bill)
                </span>
              }
            />
            <Row
              label="Direct Parts Cost"
              value={`$${fmt(metrics.directPartsCost)}`}
            />
            <Row
              label="Direct Service Cost"
              value={`$${fmt(metrics.directServiceCost)}`}
            />
          </div>

          {/* Margin Section */}
          <div className="space-y-2 border-t border-border pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Gross Profit</span>
              <span className="font-semibold">${fmt(metrics.grossProfit)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Margin</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors.badge}`}
              >
                {metrics.marginPercent.toFixed(1)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${colors.bar}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>

            {/* Low margin alert */}
            {metrics.marginPercent < 15 && (
              <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Low margin — review pricing
              </div>
            )}
          </div>

          {/* Collapsible Full Breakdown */}
          <details className="border-t border-border pt-2 text-xs">
            <summary className="cursor-pointer select-none font-medium text-muted-foreground hover:text-foreground">
              Full Breakdown
            </summary>
            <div className="mt-2 space-y-1 pl-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Revenue
              </p>
              <DetailRow
                label="Labor"
                value={`$${fmt(metrics.laborRevenue)}`}
              />
              <DetailRow
                label="Parts"
                value={`$${fmt(metrics.partsRevenue)}`}
              />
              <DetailRow
                label="Vendor/Service"
                value={`$${fmt(metrics.serviceRevenue)}`}
              />
              <DetailRow
                label="Total Revenue"
                value={`$${fmt(metrics.totalRevenue)}`}
                bold
              />

              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Costs
              </p>
              <DetailRow
                label="Labor Cost"
                value={`$${fmt(metrics.estimatedLaborCost)}`}
              />
              <DetailRow
                label="Parts Cost"
                value={`$${fmt(metrics.directPartsCost)}`}
              />
              <DetailRow
                label="Service Cost"
                value={`$${fmt(metrics.directServiceCost)}`}
              />
              <DetailRow
                label="Total Cost"
                value={`$${fmt(metrics.totalDirectCost)}`}
                bold
              />

              <div className="mt-1 border-t border-dashed border-border pt-1">
                <DetailRow
                  label="Gross Profit"
                  value={`$${fmt(metrics.grossProfit)}`}
                  bold
                />
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function Row({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center font-medium">
        {value}
        {sub}
      </span>
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-semibold" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
