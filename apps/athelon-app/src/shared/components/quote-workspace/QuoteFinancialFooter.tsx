"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, ChevronRight, AlertTriangle } from "lucide-react";
import {
  type ProfitabilityMetrics,
  marginColor,
  fmtCurrency,
} from "./useQuoteProfitabilityMetrics";
import { cn } from "@/lib/utils";

export interface QuoteFinancialFooterProps {
  metrics: ProfitabilityMetrics;
  total: number;
  laborTotal: number;
  partsTotal: number;
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
      className={cn(
        "flex items-center justify-between text-xs",
        bold ? "font-semibold" : "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function QuoteFinancialFooter({
  metrics,
  total,
  laborTotal,
  partsTotal,
}: QuoteFinancialFooterProps) {
  const colors = marginColor(metrics.marginPercent);
  const barWidth = Math.min(Math.max(metrics.marginPercent, 0), 100);

  return (
    <div className="sticky bottom-0 z-10 mt-4 rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        {/* Revenue breakdown */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase text-muted-foreground font-medium">
              Labor
            </p>
            <p className="font-semibold">
              ${fmtCurrency(laborTotal)}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                {metrics.totalLaborHours.toFixed(1)}h
              </span>
            </p>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="space-y-0.5">
            <p className="text-[10px] uppercase text-muted-foreground font-medium">
              Parts
            </p>
            <p className="font-semibold">${fmtCurrency(partsTotal)}</p>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="space-y-0.5">
            <p className="text-[10px] uppercase text-muted-foreground font-medium">
              Services
            </p>
            <p className="font-semibold">
              ${fmtCurrency(metrics.serviceRevenue)}
            </p>
          </div>
        </div>

        {/* Total + Margin */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase text-muted-foreground font-medium">
              Total
            </p>
            <p className="text-lg font-bold tracking-tight">
              ${fmtCurrency(total)}
            </p>
          </div>

          <Separator orientation="vertical" className="h-10" />

          {/* Margin with expandable popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors hover:opacity-80",
                  colors.badge,
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {metrics.marginPercent.toFixed(1)}%
                <ChevronRight className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Profitability Breakdown
              </div>

              {/* Margin bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Gross Margin</span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                      colors.badge,
                    )}
                  >
                    {metrics.marginPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      colors.bar,
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              {/* Revenue */}
              <div className="space-y-1 border-t border-border pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Revenue
                </p>
                <DetailRow
                  label="Labor"
                  value={`$${fmtCurrency(metrics.laborRevenue)}`}
                />
                <DetailRow
                  label="Parts"
                  value={`$${fmtCurrency(metrics.partsRevenue)}`}
                />
                <DetailRow
                  label="Vendor/Service"
                  value={`$${fmtCurrency(metrics.serviceRevenue)}`}
                />
                <DetailRow
                  label="Total Revenue"
                  value={`$${fmtCurrency(metrics.totalRevenue)}`}
                  bold
                />
              </div>

              {/* Costs */}
              <div className="space-y-1 border-t border-border pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Costs
                </p>
                <DetailRow
                  label="Labor Cost"
                  value={`$${fmtCurrency(metrics.estimatedLaborCost)}`}
                />
                <DetailRow
                  label="Parts Cost"
                  value={`$${fmtCurrency(metrics.directPartsCost)}`}
                />
                <DetailRow
                  label="Service Cost"
                  value={`$${fmtCurrency(metrics.directServiceCost)}`}
                />
                <DetailRow
                  label="Total Cost"
                  value={`$${fmtCurrency(metrics.totalDirectCost)}`}
                  bold
                />
              </div>

              {/* Profit */}
              <div className="border-t border-border pt-2">
                <DetailRow
                  label="Gross Profit"
                  value={`$${fmtCurrency(metrics.grossProfit)}`}
                  bold
                />
              </div>

              {/* Low margin alert */}
              {metrics.marginPercent < 15 && (
                <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Low margin — review pricing
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
