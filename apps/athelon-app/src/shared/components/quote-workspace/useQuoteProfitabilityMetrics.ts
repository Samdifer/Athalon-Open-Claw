import { useMemo } from "react";

export interface ProfitabilityLineItem {
  type: "labor" | "part" | "external_service";
  qty: number;
  unitPrice: number;
  total: number;
  directCost?: number;
}

export interface ProfitabilityMetrics {
  laborRevenue: number;
  partsRevenue: number;
  serviceRevenue: number;
  totalRevenue: number;
  totalLaborHours: number;
  estimatedLaborCost: number;
  directPartsCost: number;
  directServiceCost: number;
  totalDirectCost: number;
  grossProfit: number;
  marginPercent: number;
}

export function useQuoteProfitabilityMetrics(
  lineItems: ProfitabilityLineItem[],
  averageHourlyCost: number,
): ProfitabilityMetrics {
  return useMemo(() => {
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
}

export function marginColor(margin: number) {
  if (margin >= 30)
    return {
      badge: "bg-green-500/15 text-green-600 dark:text-green-400",
      bar: "bg-green-500",
      text: "text-green-600 dark:text-green-400",
    };
  if (margin >= 15)
    return {
      badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
    };
  return {
    badge: "bg-red-500/15 text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
  };
}

export function fmtCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
