"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Link } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Package,
  Users,
  Wrench,
  BarChart2,
  Navigation,
  FileBarChart,
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
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number) {
  return n.toFixed(1) + "%";
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [, month] = key.split("-");
  return MONTH_NAMES[parseInt(month, 10) - 1];
}

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

// ── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
}

function MetricCard({ title, value, subtitle, icon, color = "text-foreground" }: MetricCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">{title}</p>
            <p className={`text-xl sm:text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {icon && (
            <div className="p-2 rounded-md bg-muted/40 text-muted-foreground">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FinancialDashboardPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const invoices = useQuery(api.billing.listInvoices, orgId ? { orgId } : "skip");
  const purchaseOrders = useQuery(api.billing.listPurchaseOrders, orgId ? { orgId } : "skip");
  const customers = useQuery(api.customers.listCustomers, orgId ? { orgId } : "skip");

  const isLoading = !isLoaded || invoices === undefined || purchaseOrders === undefined;

  // ── Derived metrics ────────────────────────────────────────────────────────

  const now = Date.now();
  const startOfMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1); d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const startOfQuarter = useMemo(() => {
    const d = new Date();
    d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const startOfYear = useMemo(() => {
    const d = new Date();
    d.setMonth(0, 1); d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const kpis = useMemo(() => {
    if (!invoices || !purchaseOrders) return null;

    // Revenue = only collected invoices (PAID or PARTIAL). DRAFT/SENT are receivables,
    // not revenue. Period attribution uses paidAt (cash received), not createdAt.
    const collectedInvoices = invoices.filter(
      (i) => i.status === "PAID" || i.status === "PARTIAL",
    );
    const revenueAll = collectedInvoices.reduce((s, i) => s + i.total, 0);
    const revenueMTD = collectedInvoices
      .filter((i) => (i.paidAt ?? i.createdAt) >= startOfMonth)
      .reduce((s, i) => s + i.total, 0);
    const revenueQTD = collectedInvoices
      .filter((i) => (i.paidAt ?? i.createdAt) >= startOfQuarter)
      .reduce((s, i) => s + i.total, 0);
    const revenueYTD = collectedInvoices
      .filter((i) => (i.paidAt ?? i.createdAt) >= startOfYear)
      .reduce((s, i) => s + i.total, 0);

    const laborCost = collectedInvoices.reduce((s, i) => s + i.laborTotal, 0);
    const partsCost = purchaseOrders.filter((po) => po.status !== "DRAFT").reduce((s, po) => s + po.total, 0);
    const totalCOGS = laborCost + partsCost;
    const grossMargin = revenueAll > 0 ? ((revenueAll - totalCOGS) / revenueAll) * 100 : 0;
    const netProfit = revenueAll - totalCOGS;

    return { revenueAll, revenueMTD, revenueQTD, revenueYTD, laborCost, partsCost, totalCOGS, grossMargin, netProfit };
  }, [invoices, purchaseOrders, startOfMonth, startOfQuarter, startOfYear]);

  // ── Monthly revenue trend (last 12 months) ────────────────────────────────

  const monthlyRevenue = useMemo(() => {
    if (!invoices) return [];
    const keys: string[] = [];
    const d = new Date();
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      keys.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
    }
    const byMonth: Record<string, number> = {};
    for (const k of keys) byMonth[k] = 0;
    for (const inv of invoices) {
      // Only count collected revenue; use payment date for period attribution
      if (inv.status !== "PAID" && inv.status !== "PARTIAL") continue;
      const key = getMonthKey(inv.paidAt ?? inv.createdAt);
      if (byMonth[key] !== undefined) byMonth[key] += inv.total;
    }
    return keys.map((key) => ({ month: getMonthLabel(key), revenue: byMonth[key] }));
  }, [invoices]);

  // ── Margin trend ───────────────────────────────────────────────────────────

  const marginTrend = useMemo(() => {
    if (!invoices || !purchaseOrders) return [];
    const keys: string[] = [];
    const d = new Date();
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      keys.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
    }
    const revByMonth: Record<string, number> = {};
    const costByMonth: Record<string, number> = {};
    for (const k of keys) { revByMonth[k] = 0; costByMonth[k] = 0; }
    for (const inv of invoices) {
      if (inv.status !== "PAID" && inv.status !== "PARTIAL") continue;
      const key = getMonthKey(inv.paidAt ?? inv.createdAt);
      if (revByMonth[key] !== undefined) {
        revByMonth[key] += inv.total;
        costByMonth[key] += inv.laborTotal;
      }
    }
    for (const po of purchaseOrders) {
      if (po.status === "DRAFT") continue;
      const key = getMonthKey(po.createdAt);
      if (costByMonth[key] !== undefined) costByMonth[key] += po.total;
    }
    return keys.map((key) => {
      const rev = revByMonth[key];
      const cost = costByMonth[key];
      const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
      return { month: getMonthLabel(key), margin: Math.round(margin * 10) / 10 };
    });
  }, [invoices, purchaseOrders]);

  // ── Top 5 customers by revenue ─────────────────────────────────────────────

  const topCustomers = useMemo(() => {
    if (!invoices || !customers) return [];
    const byCustomer = new Map<string, { name: string; total: number; count: number }>();
    for (const inv of invoices) {
      if (inv.status !== "PAID" && inv.status !== "PARTIAL") continue;
      const cid = inv.customerId as string;
      if (!byCustomer.has(cid)) {
        const c = customers.find((x) => x._id === cid);
        byCustomer.set(cid, { name: c?.name ?? "Unknown", total: 0, count: 0 });
      }
      const e = byCustomer.get(cid)!;
      e.total += inv.total;
      e.count++;
    }
    return Array.from(byCustomer.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [invoices, customers]);

  // ── Revenue by customer ───────────────────────────────────────────────────
  // NOTE: WO-type and aircraft-type revenue breakdowns require server-side joins
  // (invoice → work order → type/aircraft). These are tracked as BACKEND-NEEDED
  // in MASTER-BUILD-LIST.md. Real data shown in topCustomers above.

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">Financial Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue, margins, and P&amp;L overview</p>
      </div>

      {/* Reports Sub-Navigation */}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports"><FileBarChart className="w-3.5 h-3.5" />Overview</Link>
        </Button>
        <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link to="/reports/financials"><DollarSign className="w-3.5 h-3.5" />Financial Dashboard</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials/forecast"><TrendingUp className="w-3.5 h-3.5" />Forecast</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials/profitability"><BarChart2 className="w-3.5 h-3.5" />Profitability</Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials/runway"><Navigation className="w-3.5 h-3.5" />Runway</Link>
        </Button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue (YTD)"
          value={fmtUSD(kpis?.revenueYTD ?? 0)}
          subtitle={`MTD ${fmtUSD(kpis?.revenueMTD ?? 0)} · QTD ${fmtUSD(kpis?.revenueQTD ?? 0)}`}
          icon={<DollarSign className="w-4 h-4" />}
          color="text-foreground"
        />
        <MetricCard
          title="Total COGS"
          value={fmtUSD(kpis?.totalCOGS ?? 0)}
          subtitle={`Parts ${fmtUSD(kpis?.partsCost ?? 0)} · Labor ${fmtUSD(kpis?.laborCost ?? 0)}`}
          icon={<Package className="w-4 h-4" />}
          color="text-amber-400"
        />
        <MetricCard
          title="Gross Margin"
          value={fmtPct(kpis?.grossMargin ?? 0)}
          subtitle="Revenue less COGS"
          icon={<TrendingUp className="w-4 h-4" />}
          color={
            (kpis?.grossMargin ?? 0) > 20
              ? "text-green-400"
              : (kpis?.grossMargin ?? 0) > 0
                ? "text-amber-400"
                : "text-red-400"
          }
        />
        <MetricCard
          title="Net Profit"
          value={fmtUSD(kpis?.netProfit ?? 0)}
          subtitle="Revenue − COGS"
          icon={<Receipt className="w-4 h-4" />}
          color={(kpis?.netProfit ?? 0) >= 0 ? "text-green-400" : "text-red-400"}
        />
      </div>

      {/* ── Revenue Trend (Area Chart) ────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue — Last 12 Months</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyRevenue.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtUSD(Number(v ?? 0)), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Margin Trend + Aircraft Revenue ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={marginTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${Number(v ?? 0)}%`, "Margin"]} />
                <Line type="monotone" dataKey="margin" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Revenue by Aircraft Type</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/10 text-center px-4">
              <p className="text-sm font-medium text-muted-foreground">Aircraft type breakdown unavailable</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs">
                Revenue by aircraft type requires joining invoices to work orders and aircraft records — a server-side query not yet implemented. See MASTER-BUILD-LIST.md.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Top Customers + WO Types ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" /> Top 5 Customers by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Invoices</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No data</TableCell></TableRow>
                ) : (
                  topCustomers.map((c) => (
                    <TableRow key={c.name} className="border-border/40">
                      <TableCell className="text-sm font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums">{c.count}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums">{fmtUSD(c.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Revenue by WO Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/10 text-center px-4 py-8">
              <p className="text-sm font-medium text-muted-foreground">WO type breakdown unavailable</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs">
                Revenue by work order type requires a server-side join from invoices to work order types. See MASTER-BUILD-LIST.md.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
