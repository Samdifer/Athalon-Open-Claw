"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number) {
  return n.toFixed(1) + "%";
}

function marginColor(pct: number): string {
  if (pct > 20) return "text-green-400";
  if (pct >= 0) return "text-amber-400";
  return "text-red-400";
}

function marginBg(pct: number): string {
  if (pct > 20) return "bg-green-500/10 border-green-500/30 text-green-400";
  if (pct >= 0) return "bg-amber-500/10 border-amber-500/30 text-amber-400";
  return "bg-red-500/10 border-red-500/30 text-red-400";
}

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type DateRange = "MTD" | "QTD" | "YTD" | "ALL";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WOProfitabilityPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [range, setRange] = useState<DateRange>("YTD");

  const invoices = useQuery(api.billing.listInvoices, orgId ? { orgId } : "skip");
  const purchaseOrders = useQuery(api.billing.listPurchaseOrders, orgId ? { orgId } : "skip");
  const customers = useQuery(api.customers.listCustomers, orgId ? { orgId } : "skip");

  const isLoading = !isLoaded || invoices === undefined || purchaseOrders === undefined;

  // ── Date range cutoff ──────────────────────────────────────────────────────

  const cutoff = useMemo(() => {
    const now = new Date();
    switch (range) {
      case "MTD": {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        return d.getTime();
      }
      case "QTD": {
        const d = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return d.getTime();
      }
      case "YTD": {
        const d = new Date(now.getFullYear(), 0, 1);
        return d.getTime();
      }
      case "ALL":
        return 0;
    }
  }, [range]);

  // ── Per-WO P&L rows ───────────────────────────────────────────────────────

  interface WORow {
    invoiceNumber: string;
    workOrderId: string | undefined;
    customer: string;
    quoted: number;
    actualParts: number;
    actualLabor: number;
    total: number;
    margin: number;
    marginPct: number;
  }

  const woRows = useMemo((): WORow[] => {
    if (!invoices || !purchaseOrders || !customers) return [];

    const filtered = invoices.filter((i) => i.status !== "VOID" && i.createdAt >= cutoff);

    // Build PO cost by work order
    const poCostByWO = new Map<string, number>();
    for (const po of purchaseOrders) {
      if (po.status === "DRAFT" || !po.workOrderId) continue;
      const key = po.workOrderId as string;
      poCostByWO.set(key, (poCostByWO.get(key) ?? 0) + po.total);
    }

    return filtered.map((inv) => {
      const woId = inv.workOrderId as string | undefined;
      const actualParts = woId ? (poCostByWO.get(woId) ?? inv.partsTotal * 0.7) : inv.partsTotal * 0.7;
      const actualLabor = inv.laborTotal;
      const totalCost = actualParts + actualLabor;
      const margin = inv.total - totalCost;
      const marginPct = inv.total > 0 ? (margin / inv.total) * 100 : 0;
      const cust = customers.find((c) => c._id === inv.customerId);

      return {
        invoiceNumber: inv.invoiceNumber,
        workOrderId: woId,
        customer: cust?.name ?? "Unknown",
        quoted: inv.total,
        actualParts,
        actualLabor,
        total: inv.total,
        margin,
        marginPct,
      };
    }).sort((a, b) => b.margin - a.margin);
  }, [invoices, purchaseOrders, customers, cutoff]);

  // ── Summary stats ──────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    if (woRows.length === 0) return null;
    const avgMargin = woRows.reduce((s, r) => s + r.marginPct, 0) / woRows.length;
    const best = woRows[0];
    const worst = woRows[woRows.length - 1];
    return { avgMargin, best, worst, count: woRows.length };
  }, [woRows]);

  // ── Profitability by "aircraft type" (approximated from customer) ──────────

  const profitByType = useMemo(() => {
    if (woRows.length === 0) return [];
    // Group by customer as proxy (real impl would join aircraft)
    const byCustomer = new Map<string, { revenue: number; cost: number }>();
    for (const r of woRows) {
      if (!byCustomer.has(r.customer)) byCustomer.set(r.customer, { revenue: 0, cost: 0 });
      const e = byCustomer.get(r.customer)!;
      e.revenue += r.total;
      e.cost += r.actualParts + r.actualLabor;
    }
    return Array.from(byCustomer.entries())
      .map(([name, d]) => ({
        name: name.length > 15 ? name.slice(0, 15) + "…" : name,
        margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
        revenue: d.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [woRows]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/60"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">WO Profitability</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Per-work-order P&amp;L analysis</p>
        </div>
        <div className="flex gap-1">
          {(["MTD", "QTD", "YTD", "ALL"] as DateRange[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
              className="text-xs h-7 px-3"
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Avg Margin</p>
            <p className={`text-xl font-bold tabular-nums ${marginColor(summary?.avgMargin ?? 0)}`}>
              {fmtPct(summary?.avgMargin ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Across {summary?.count ?? 0} WOs</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Best WO</p>
            <p className="text-xl font-bold tabular-nums text-green-400">
              {summary?.best ? fmtPct(summary.best.marginPct) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{summary?.best?.invoiceNumber ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Worst WO</p>
            <p className={`text-xl font-bold tabular-nums ${marginColor(summary?.worst?.marginPct ?? 0)}`}>
              {summary?.worst ? fmtPct(summary.worst.marginPct) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{summary?.worst?.invoiceNumber ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Total Analyzed</p>
            <p className="text-xl font-bold tabular-nums text-foreground">{summary?.count ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Work orders</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Per-WO P&L Table ──────────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Per-WO Profit &amp; Loss</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Invoice #</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Invoiced</TableHead>
                  <TableHead className="text-xs text-right">Parts Cost</TableHead>
                  <TableHead className="text-xs text-right">Labor Cost</TableHead>
                  <TableHead className="text-xs text-right">Margin</TableHead>
                  <TableHead className="text-xs text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {woRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      No invoices found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  woRows.map((row) => (
                    <TableRow key={row.invoiceNumber} className="border-border/40">
                      <TableCell className="text-sm font-mono">{row.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{row.customer}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums">{fmtUSD(row.total)}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums text-amber-400">{fmtUSD(row.actualParts)}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums text-amber-400">{fmtUSD(row.actualLabor)}</TableCell>
                      <TableCell className={`text-sm text-right tabular-nums font-medium ${marginColor(row.marginPct)}`}>
                        {fmtUSD(row.margin)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`text-xs tabular-nums ${marginBg(row.marginPct)}`}>
                          {fmtPct(row.marginPct)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Profitability by Customer Chart ────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Profitability by Customer
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-400">Connect live data for aircraft type</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profitByType.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={profitByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={120} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v ?? 0).toFixed(1)}%`, "Margin"]} />
                <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                  {profitByType.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.margin > 20 ? "hsl(var(--chart-2))" : entry.margin >= 0 ? "hsl(var(--chart-3))" : "hsl(var(--chart-5))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
