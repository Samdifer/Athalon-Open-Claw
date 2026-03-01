"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  BarChart3,
  TrendingUp,
  FileText,
  Receipt,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SENT: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  APPROVED: "bg-green-500/15 text-green-400 border-green-500/30",
  CONVERTED: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  DECLINED: "bg-red-500/15 text-red-400 border-red-500/30",
  PAID: "bg-green-500/15 text-green-400 border-green-500/30",
  VOID: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  DRAFT: <FileText className="w-3.5 h-3.5" />,
  SENT: <Send className="w-3.5 h-3.5" />,
  APPROVED: <CheckCircle className="w-3.5 h-3.5" />,
  CONVERTED: <RefreshCw className="w-3.5 h-3.5" />,
  DECLINED: <XCircle className="w-3.5 h-3.5" />,
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
}

function MetricCard({ title, value, subtitle, icon, color = "" }: MetricCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">{title}</p>
            <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {icon && (
            <div className="p-2 rounded-md bg-muted/40 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

export default function AnalyticsPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const quotes = useQuery(
    api.billing.listQuotes,
    orgId ? { orgId } : "skip",
  );

  const invoices = useQuery(
    api.billing.listInvoices,
    orgId ? { orgId } : "skip",
  );

  const customers = useQuery(
    api.customers.listCustomers,
    orgId ? { orgId } : "skip",
  );

  const isLoading = !isLoaded || quotes === undefined || invoices === undefined;

  // ── Top-level invoice metrics ──────────────────────────────────────────────
  const invoiceMetrics = useMemo(() => {
    if (!invoices) return null;
    const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
    const totalCollected = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const outstandingAR = invoices
      .filter((i) => i.status !== "PAID" && i.status !== "VOID")
      .reduce((sum, i) => sum + i.balance, 0);
    const count = invoices.length;
    const avgInvoiceValue = count > 0 ? totalInvoiced / count : 0;
    return { totalInvoiced, totalCollected, outstandingAR, count, avgInvoiceValue };
  }, [invoices]);

  // ── Quote conversion rate ──────────────────────────────────────────────────
  const quoteMetrics = useMemo(() => {
    if (!quotes) return null;
    const byStatus = {
      DRAFT: { count: 0, value: 0 },
      SENT: { count: 0, value: 0 },
      APPROVED: { count: 0, value: 0 },
      CONVERTED: { count: 0, value: 0 },
      DECLINED: { count: 0, value: 0 },
    } as Record<string, { count: number; value: number }>;

    for (const q of quotes) {
      if (byStatus[q.status]) {
        byStatus[q.status].count++;
        byStatus[q.status].value += q.total;
      }
    }

    const total = quotes.length;
    const totalValue = quotes.reduce((sum, q) => sum + q.total, 0);
    const sentCount = byStatus.SENT?.count ?? 0;
    const convertedCount = byStatus.CONVERTED?.count ?? 0;
    const conversionRate = sentCount > 0
      ? Math.round((convertedCount / sentCount) * 100)
      : total > 0
        ? Math.round((convertedCount / total) * 100)
        : 0;

    return { byStatus, total, totalValue, conversionRate };
  }, [quotes]);

  // ── Monthly Revenue (last 6 months) ───────────────────────────────────────
  const monthlyData = useMemo(() => {
    if (!invoices) return [];

    // Build last-6-months keys
    const now = new Date();
    const keys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const byMonth: Record<string, { invoiced: number; collected: number; outstanding: number }> = {};
    for (const k of keys) byMonth[k] = { invoiced: 0, collected: 0, outstanding: 0 };

    for (const inv of invoices) {
      const key = getMonthKey(inv.createdAt);
      if (!byMonth[key]) continue;
      byMonth[key].invoiced += inv.total;
      byMonth[key].collected += inv.amountPaid;
      if (inv.status !== "PAID" && inv.status !== "VOID") {
        byMonth[key].outstanding += inv.balance;
      }
    }

    return keys.map((key) => ({ key, label: getMonthLabel(key), ...byMonth[key] }));
  }, [invoices]);

  // ── Customer lookup ────────────────────────────────────────────────────────
  const topCustomers = useMemo(() => {
    if (!quotes || !customers) return [];
    const byCustomer = new Map<string, { name: string; total: number; count: number }>();

    for (const q of quotes) {
      const custId = q.customerId as string;
      if (!byCustomer.has(custId)) {
        const customer = customers.find((c) => c._id === custId);
        byCustomer.set(custId, { name: customer?.name ?? "Unknown", total: 0, count: 0 });
      }
      const entry = byCustomer.get(custId)!;
      entry.total += q.total;
      entry.count++;
    }

    return Array.from(byCustomer.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [quotes, customers]);

  // ── AR Aging buckets ────────────────────────────────────────────────────
  const arAging = useMemo(() => {
    if (!invoices) return [];
    const now = Date.now();
    const buckets = { Current: 0, "30 Days": 0, "60 Days": 0, "90+ Days": 0 };
    for (const inv of invoices) {
      if (inv.status === "PAID" || inv.status === "VOID") continue;
      const age = (now - inv.createdAt) / (1000 * 60 * 60 * 24);
      if (age <= 30) buckets.Current += inv.balance;
      else if (age <= 60) buckets["30 Days"] += inv.balance;
      else if (age <= 90) buckets["60 Days"] += inv.balance;
      else buckets["90+ Days"] += inv.balance;
    }
    return Object.entries(buckets).map(([name, amount]) => ({ name, amount: Math.round(amount) }));
  }, [invoices]);

  // ── Top customers by revenue ───────────────────────────────────────────
  const topCustomersByRevenue = useMemo(() => {
    if (!invoices || !customers) return [];
    const byCustomer = new Map<string, { name: string; total: number }>();
    for (const inv of invoices) {
      if (inv.status === "VOID") continue;
      const custId = inv.customerId as string;
      if (!byCustomer.has(custId)) {
        const customer = customers?.find((c) => c._id === custId);
        byCustomer.set(custId, { name: customer?.name ?? "Unknown", total: 0 });
      }
      byCustomer.get(custId)!.total += inv.total;
    }
    return Array.from(byCustomer.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [invoices, customers]);

  const recentConversions = useMemo(() => {
    if (!quotes) return [];
    return quotes
      .filter((q) => q.status === "CONVERTED")
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);
  }, [quotes]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-border/60">
          <CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">Billing Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue, AR, and pipeline overview</p>
      </div>

      {/* ── Top Metrics (5 cards) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <MetricCard
          title="Total Invoiced"
          value={fmtUSD(invoiceMetrics?.totalInvoiced ?? 0)}
          subtitle={`${invoiceMetrics?.count ?? 0} invoices`}
          icon={<Receipt className="w-4 h-4" />}
          color="text-foreground"
        />
        <MetricCard
          title="Total Collected"
          value={fmtUSD(invoiceMetrics?.totalCollected ?? 0)}
          subtitle="Payments received"
          icon={<DollarSign className="w-4 h-4" />}
          color="text-green-400"
        />
        <MetricCard
          title="Outstanding AR"
          value={fmtUSD(invoiceMetrics?.outstandingAR ?? 0)}
          subtitle="Unpaid balances"
          icon={<TrendingDown className="w-4 h-4" />}
          color="text-amber-400"
        />
        <MetricCard
          title="Quote Conversion"
          value={`${quoteMetrics?.conversionRate ?? 0}%`}
          subtitle={`${quoteMetrics?.byStatus.CONVERTED?.count ?? 0} converted`}
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-purple-400"
        />
        <MetricCard
          title="Avg Invoice Value"
          value={fmtUSD(invoiceMetrics?.avgInvoiceValue ?? 0)}
          subtitle="Per invoice"
          icon={<BarChart3 className="w-4 h-4" />}
          color="text-blue-400"
        />
      </div>

      {/* ── Monthly Revenue Table ─────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Monthly Revenue — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-xs">Month</TableHead>
                <TableHead className="text-xs text-right">Invoiced</TableHead>
                <TableHead className="text-xs text-right">Collected</TableHead>
                <TableHead className="text-xs text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((row) => (
                <TableRow key={row.key} className="border-border/40">
                  <TableCell className="text-sm font-medium">{row.label}</TableCell>
                  <TableCell className="text-sm text-right">{fmtUSD(row.invoiced)}</TableCell>
                  <TableCell className="text-sm text-right text-green-400">{fmtUSD(row.collected)}</TableCell>
                  <TableCell className="text-sm text-right text-amber-400">{fmtUSD(row.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Charts Row: Revenue Trend + AR Aging + Top Customers ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue by Month Chart */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }} formatter={((v: any) => [`$${v?.toLocaleString?.() ?? v}`, ""]) as any} />
                  <Line type="monotone" dataKey="invoiced" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Invoiced" />
                  <Line type="monotone" dataKey="collected" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} name="Collected" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* AR Aging Chart */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AR Aging</CardTitle>
          </CardHeader>
          <CardContent>
            {arAging.every((b) => b.amount === 0) ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No outstanding AR</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={arAging}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }} formatter={((v: any) => [`$${v?.toLocaleString?.() ?? v}`, "Balance"]) as any} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {arAging.map((_, i) => {
                      const colors = ["#22c55e", "#f59e0b", "#f97316", "#ef4444"];
                      return <Cell key={i} fill={colors[i] ?? "#6b7280"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Customers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomersByRevenue.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topCustomersByRevenue} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={80} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }} formatter={((v: any) => [`$${v?.toLocaleString?.() ?? v}`, "Revenue"]) as any} />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quote Funnel ──────────────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quote Pipeline by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {["DRAFT", "SENT", "APPROVED", "CONVERTED", "DECLINED"].map((status) => {
              const data = quoteMetrics?.byStatus[status] ?? { count: 0, value: 0 };
              return (
                <div key={status} className="p-3 rounded-lg border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-muted-foreground">{STATUS_ICONS[status]}</div>
                    <Badge variant="outline" className={`text-[10px] border ${STATUS_STYLES[status] ?? ""}`}>
                      {status}
                    </Badge>
                  </div>
                  <p className="text-xl font-bold">{data.count}</p>
                  <p className="text-xs text-muted-foreground">
                    ${data.value.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </p>
                </div>
              );
            })}
          </div>

          {(quoteMetrics?.total ?? 0) > 0 && (
            <div className="mt-4">
              <div className="flex h-3 rounded-full overflow-hidden">
                {["DRAFT", "SENT", "APPROVED", "CONVERTED", "DECLINED"].map((status, i) => {
                  const count = quoteMetrics?.byStatus[status]?.count ?? 0;
                  const pct = quoteMetrics?.total ? (count / quoteMetrics.total) * 100 : 0;
                  const colors = ["bg-muted-foreground/40", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-red-500"];
                  if (pct === 0) return null;
                  return (
                    <div key={status} style={{ width: `${pct}%` }} className={`${colors[i]} transition-all`} />
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2 flex-wrap">
                {["DRAFT", "SENT", "APPROVED", "CONVERTED", "DECLINED"].map((status, i) => {
                  const colors = ["bg-muted-foreground/40", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-red-500"];
                  const count = quoteMetrics?.byStatus[status]?.count ?? 0;
                  if (count === 0) return null;
                  return (
                    <div key={status} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${colors[i]}`} />
                      <span className="text-[10px] text-muted-foreground">{status} ({count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Bottom: Customer + Conversion tables ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Customers */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top 5 Customers by Quote Value</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topCustomers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-muted-foreground">No customer data yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs text-right">Quotes</TableHead>
                    <TableHead className="text-xs text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.map((c, i) => (
                    <TableRow key={c.id} className="border-border/40">
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-4">{i + 1}</span>
                          {c.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-right">{c.count}</TableCell>
                      <TableCell className="text-sm font-semibold text-right">
                        ${c.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversions */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Conversions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentConversions.length === 0 ? (
              <div className="py-8 text-center">
                <RefreshCw className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No conversions yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Approved quotes converted to work orders will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Quote</TableHead>
                    <TableHead className="text-xs">Converted</TableHead>
                    <TableHead className="text-xs text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentConversions.map((q) => (
                    <TableRow key={q._id} className="border-border/40">
                      <TableCell>
                        <Link to={`/billing/quotes/${q._id}`} className="font-mono text-xs text-primary hover:underline">
                          {q.quoteNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(q.updatedAt)}</TableCell>
                      <TableCell className="text-sm font-medium text-right tabular-nums">${q.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
