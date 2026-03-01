"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Fuel,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number) {
  return n.toFixed(1) + "%";
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function futureMonthLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${MONTH_NAMES[d.getMonth()]}`;
}

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BusinessRunwayPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const invoices = useQuery(api.billing.listInvoices, orgId ? { orgId } : "skip");
  const purchaseOrders = useQuery(api.billing.listPurchaseOrders, orgId ? { orgId } : "skip");

  const isLoading = !isLoaded || invoices === undefined || purchaseOrders === undefined;

  // ── Historical averages (last 3 months) ────────────────────────────────────

  const metrics = useMemo(() => {
    if (!invoices || !purchaseOrders) return null;

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime();

    const recentInvoices = invoices.filter((i) => i.status !== "VOID" && i.createdAt >= threeMonthsAgo);
    const recentPOs = purchaseOrders.filter((po) => po.status !== "DRAFT" && po.createdAt >= threeMonthsAgo);

    const totalRevenue = recentInvoices.reduce((s, i) => s + i.total, 0);
    const totalLabor = recentInvoices.reduce((s, i) => s + i.laborTotal, 0);
    const totalParts = recentPOs.reduce((s, po) => s + po.total, 0);
    const overhead = totalRevenue * 0.15; // 15% overhead (industry typical)

    const months = 3;
    const avgRevenue = totalRevenue / months;
    const avgBurn = (totalLabor + totalParts + overhead) / months;
    const avgNetPerMonth = avgRevenue - avgBurn;

    // Current cash position: total collected minus total spent
    const allCollected = invoices.filter((i) => i.status !== "VOID").reduce((s, i) => s + i.amountPaid, 0);
    const allSpent = purchaseOrders.filter((po) => po.status !== "DRAFT").reduce((s, po) => s + po.total, 0)
      + invoices.filter((i) => i.status !== "VOID").reduce((s, i) => s + i.laborTotal, 0);
    const cashPosition = allCollected - allSpent;

    // Runway calculation
    const runwayMonths = avgBurn > 0 && avgNetPerMonth < 0
      ? Math.max(0, cashPosition / Math.abs(avgNetPerMonth))
      : avgNetPerMonth >= 0
        ? Infinity
        : 0;

    // Break-even analysis
    const avgMarginPerWO = recentInvoices.length > 0
      ? recentInvoices.reduce((s, i) => {
          const woCost = i.laborTotal + (i.partsTotal * 0.7); // approx actual parts
          return s + (i.total - woCost);
        }, 0) / recentInvoices.length
      : 0;
    const breakEvenWOs = avgBurn > 0 && avgMarginPerWO > 0
      ? Math.ceil(avgBurn / avgMarginPerWO)
      : 0;

    return {
      avgRevenue,
      avgBurn,
      avgNetPerMonth,
      cashPosition,
      runwayMonths,
      breakEvenWOs,
      avgMarginPerWO,
      totalLabor: totalLabor / months,
      totalParts: totalParts / months,
      overhead: overhead / months,
    };
  }, [invoices, purchaseOrders]);

  // ── Runway projection chart (12 months) ────────────────────────────────────

  const runwayChart = useMemo(() => {
    if (!metrics) return [];
    let cash = metrics.cashPosition;
    const data = [{ month: "Now", cash: Math.round(cash) }];
    for (let i = 1; i <= 12; i++) {
      cash += metrics.avgNetPerMonth;
      data.push({ month: futureMonthLabel(i), cash: Math.round(cash) });
    }
    return data;
  }, [metrics]);

  const isHealthy = metrics ? metrics.runwayMonths === Infinity || metrics.runwayMonths > 6 : false;
  const isCritical = metrics ? metrics.runwayMonths < 3 && metrics.runwayMonths !== Infinity : false;

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
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">Business Runway</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Burn rate, cash position, and sustainability analysis</p>
      </div>

      {/* ── Health Status ─────────────────────────────────────────────────── */}
      {isCritical && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Critical: Less than 3 months runway</p>
              <p className="text-xs text-muted-foreground">
                At current burn rate, cash reserves will be depleted in {metrics?.runwayMonths.toFixed(1)} months.
                Immediate action required: reduce costs or accelerate revenue.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isHealthy && (
        <Card className="border-green-500/40 bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-400">
                {metrics?.runwayMonths === Infinity ? "Cash Flow Positive" : `${metrics?.runwayMonths.toFixed(0)}+ Months Runway`}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics?.runwayMonths === Infinity
                  ? "Revenue exceeds expenses — the business is self-sustaining at current rates."
                  : "Sufficient runway. Continue monitoring for seasonal variations."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Monthly Burn Rate</p>
            <p className="text-xl font-bold tabular-nums text-amber-400">{fmtUSD(metrics?.avgBurn ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg last 3 months</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Avg Monthly Revenue</p>
            <p className="text-xl font-bold tabular-nums text-green-400">{fmtUSD(metrics?.avgRevenue ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg last 3 months</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Cash Position</p>
            <p className={`text-xl font-bold tabular-nums ${(metrics?.cashPosition ?? 0) >= 0 ? "text-foreground" : "text-red-400"}`}>
              {fmtUSD(metrics?.cashPosition ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Collected − spent</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Months of Runway</p>
            <p className={`text-xl font-bold tabular-nums ${isHealthy ? "text-green-400" : isCritical ? "text-red-400" : "text-amber-400"}`}>
              {metrics?.runwayMonths === Infinity ? "∞" : (metrics?.runwayMonths ?? 0).toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">At current rates</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Burn Breakdown ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Labor Cost/mo</p>
            <p className="text-lg font-bold tabular-nums text-foreground">{fmtUSD(metrics?.totalLabor ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Parts Cost/mo</p>
            <p className="text-lg font-bold tabular-nums text-foreground">{fmtUSD(metrics?.totalParts ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Overhead/mo</p>
            <p className="text-lg font-bold tabular-nums text-muted-foreground">{fmtUSD(metrics?.overhead ?? 0)}</p>
            <p className="text-[10px] text-muted-foreground">Est. 15% of revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Runway Projection Chart ───────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">12-Month Cash Position Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={runwayChart}>
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtUSD(Number(v ?? 0)), "Cash"]} />
              <ReferenceLine y={0} stroke="hsl(var(--chart-5))" strokeDasharray="4 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="cash" stroke="hsl(var(--chart-1))" fill="url(#cashGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Break-Even Analysis ───────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4" /> Break-Even Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">WOs Needed / Month</p>
              <p className="text-3xl font-bold tabular-nums text-foreground">{metrics?.breakEvenWOs ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">To cover monthly burn at avg margin</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Avg Margin / WO</p>
              <p className="text-3xl font-bold tabular-nums text-green-400">{fmtUSD(metrics?.avgMarginPerWO ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Based on last 3 months</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Monthly Burn</p>
              <p className="text-3xl font-bold tabular-nums text-amber-400">{fmtUSD(metrics?.avgBurn ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Labor + parts + overhead</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
