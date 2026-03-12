"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { MissingPrereqBanner } from "@/components/zero-state/MissingPrereqBanner";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  BarChart2,
  Navigation,
  FileBarChart,
  Info,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function futureMonthLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function getMonthKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

type Horizon = 3 | 6 | 12;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CashFlowForecastPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [horizon, setHorizon] = useState<Horizon>(6);

  const invoices = useQuery(api.billing.listInvoices, orgId ? { orgId } : "skip");
  const quotes = useQuery(api.billing.listQuotes, orgId ? { orgId } : "skip");
  const purchaseOrders = useQuery(api.billing.listPurchaseOrders, orgId ? { orgId } : "skip");

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || invoices === undefined || quotes === undefined || purchaseOrders === undefined,
  });

  const isLoading = !isLoaded || invoices === undefined || quotes === undefined || purchaseOrders === undefined;

  // ── Revenue pipeline (approved quotes + in-progress) ───────────────────────

  const pipeline = useMemo(() => {
    if (!quotes) return 0;
    return quotes
      .filter((q) => q.status === "APPROVED" || q.status === "SENT")
      .reduce((s, q) => s + q.total, 0);
  }, [quotes]);

  // ── Historical monthly averages (last 3 months) ───────────────────────────

  const historicalAvg = useMemo(() => {
    if (!invoices || !purchaseOrders) return { revenue: 0, partsCost: 0, laborCost: 0, overhead: 0 };

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime();

    // BUG-BM-HUNT-001: Forecast revenue must only include collected cash.
    // Draft/sent invoices are not realized revenue yet and inflate projections.
    const recentInvoices = invoices.filter(
      (i) => (i.status === "PAID" || i.status === "PARTIAL") && i.createdAt >= threeMonthsAgo,
    );
    const recentPOs = purchaseOrders.filter((po) => po.status !== "DRAFT" && po.createdAt >= threeMonthsAgo);

    const totalRevenue = recentInvoices.reduce(
      (s, i) => s + (i.status === "PARTIAL" ? (i.amountPaid ?? i.total) : i.total),
      0,
    );
    const totalLabor = recentInvoices.reduce((s, i) => s + i.laborTotal, 0);
    const totalParts = recentPOs.reduce((s, po) => s + po.total, 0);

    // Overhead estimated at 15% of revenue (industry typical for Part 145)
    const months = 3;
    return {
      revenue: totalRevenue / months,
      partsCost: totalParts / months,
      laborCost: totalLabor / months,
      overhead: (totalRevenue * 0.15) / months,
    };
  }, [invoices, purchaseOrders]);

  // ── Forecast table data ────────────────────────────────────────────────────

  const forecastData = useMemo(() => {
    const rows: Array<{
      month: string;
      revenue: number;
      partsCost: number;
      laborCost: number;
      overhead: number;
      net: number;
    }> = [];

    // Distribute pipeline revenue over first few months with decay
    const pipelinePerMonth = pipeline > 0 ? pipeline / Math.min(horizon, 6) : 0;

    for (let i = 1; i <= horizon; i++) {
      // Revenue: avg + pipeline tapering off
      const pipelineContrib = i <= 6 ? pipelinePerMonth * Math.max(0, 1 - (i - 1) * 0.15) : 0;
      const revenue = historicalAvg.revenue + pipelineContrib;
      const partsCost = historicalAvg.partsCost;
      const laborCost = historicalAvg.laborCost;
      const overhead = historicalAvg.overhead;
      const net = revenue - partsCost - laborCost - overhead;

      rows.push({
        month: futureMonthLabel(i),
        revenue,
        partsCost,
        laborCost,
        overhead,
        net,
      });
    }
    return rows;
  }, [horizon, historicalAvg, pipeline]);

  const hasNegativeMonths = forecastData.some((r) => r.net < 0);

  // ── Chart data ─────────────────────────────────────────────────────────────

  const chartData = forecastData.map((r) => ({
    month: r.month.split(" ")[0], // short label
    Revenue: Math.round(r.revenue),
    Cost: Math.round(r.partsCost + r.laborCost + r.overhead),
    Profit: Math.round(r.net),
  }));

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/60"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (prereq.state === "missing_context" && prereq.missingKind) {
    return <MissingPrereqBanner kind={prereq.missingKind} actionLabel="Go to Settings" actionTarget="/settings/shop" />;
  }

  return (
    <div className="space-y-5">
      {/* Reports Sub-Navigation */}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports"><FileBarChart className="w-3.5 h-3.5" />Overview</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials"><DollarSign className="w-3.5 h-3.5" />Financial Dashboard</Link>
        </Button>
        <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link to="/reports/financials/forecast"><TrendingUp className="w-3.5 h-3.5" />Forecast</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials/profitability"><BarChart2 className="w-3.5 h-3.5" />Profitability</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials/runway"><Navigation className="w-3.5 h-3.5" />Runway</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Cash Flow Forecast</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Projected revenue, costs, and cash position</p>
        </div>
        <div className="flex gap-1">
          {([3, 6, 12] as Horizon[]).map((h) => (

            <Button
              key={h}
              size="sm"
              variant={horizon === h ? "default" : "outline"}
              onClick={() => setHorizon(h)}
              className="text-xs h-7 px-3"
            >
              {h}mo
            </Button>
          ))}
        </div>
      </div>

      {/* ── Methodology Disclaimer ────────────────────────────────────────── */}
      <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400">
        <Info className="size-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-400">
          Note: Forecast figures are estimated from the last 3 months of paid invoices and approved quotes. Pipeline revenue is distributed linearly over the horizon with a 15% monthly decay. Results are indicative only and should not be used as a substitute for formal financial planning.
        </AlertDescription>
      </Alert>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Revenue Pipeline</p>
            <p className="text-xl font-bold tabular-nums text-foreground">{fmtUSD(pipeline)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Approved + sent quotes</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Avg Monthly Revenue</p>
            <p className="text-xl font-bold tabular-nums text-green-400">{fmtUSD(historicalAvg.revenue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Last 3 months</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Avg Monthly Cost</p>
            <p className="text-xl font-bold tabular-nums text-amber-400">{fmtUSD(historicalAvg.partsCost + historicalAvg.laborCost + historicalAvg.overhead)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Parts + Labor + OH</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Projected Net/mo</p>
            <p className={`text-xl font-bold tabular-nums ${forecastData[0]?.net >= 0 ? "text-green-400" : "text-red-400"}`}>
              {fmtUSD(forecastData[0]?.net ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Next month</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Negative Cash Flow Alert ──────────────────────────────────────── */}
      {hasNegativeMonths && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Negative Cash Flow Projected</p>
              <p className="text-xs text-muted-foreground">
                {forecastData.filter((r) => r.net < 0).length} month(s) show negative net cash flow in the {horizon}-month forecast.
                Review cost structure or accelerate pipeline conversion.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Projection Chart ──────────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{horizon}-Month Revenue / Cost / Profit Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtUSD(Number(v ?? 0)), ""]} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="Cost" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="Profit" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Cash Flow Table ───────────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Monthly Cash Flow Detail</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Month</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                  <TableHead className="text-xs text-right">Parts Cost</TableHead>
                  <TableHead className="text-xs text-right">Labor Cost</TableHead>
                  <TableHead className="text-xs text-right">Overhead</TableHead>
                  <TableHead className="text-xs text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecastData.map((row) => (
                  <TableRow key={row.month} className="border-border/40">
                    <TableCell className="text-sm font-medium">{row.month}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{fmtUSD(row.revenue)}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums text-amber-400">{fmtUSD(row.partsCost)}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums text-amber-400">{fmtUSD(row.laborCost)}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums text-muted-foreground">{fmtUSD(row.overhead)}</TableCell>
                    <TableCell className={`text-sm text-right tabular-nums font-medium ${row.net >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {fmtUSD(row.net)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
