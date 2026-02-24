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
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
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

  // Quote pipeline metrics
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
    const conversionRate = total > 0
      ? Math.round(((byStatus.CONVERTED?.count ?? 0) / total) * 100)
      : 0;

    return { byStatus, total, totalValue, conversionRate };
  }, [quotes]);

  // Invoice metrics
  const invoiceMetrics = useMemo(() => {
    if (!invoices) return null;
    const outstanding = invoices.filter((i) => i.status === "SENT");
    const outstandingValue = outstanding.reduce((sum, i) => sum + i.balance, 0);
    const collectedValue = invoices
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amountPaid, 0);
    return { outstanding: outstanding.length, outstandingValue, collectedValue };
  }, [invoices]);

  // Top 5 customers by quote value
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

  // Recent conversions (last 10 converted quotes)
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
        <h1 className="text-xl font-semibold text-foreground">Billing Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Sales pipeline and revenue overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Total Quotes"
          value={quoteMetrics?.total ?? 0}
          subtitle={`$${(quoteMetrics?.totalValue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })} pipeline`}
          icon={<FileText className="w-4 h-4" />}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${quoteMetrics?.conversionRate ?? 0}%`}
          subtitle={`${quoteMetrics?.byStatus.CONVERTED?.count ?? 0} converted`}
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-green-400"
        />
        <MetricCard
          title="Outstanding"
          value={`$${(invoiceMetrics?.outstandingValue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          subtitle={`${invoiceMetrics?.outstanding ?? 0} invoices`}
          icon={<Receipt className="w-4 h-4" />}
          color="text-amber-400"
        />
        <MetricCard
          title="Collected"
          value={`$${(invoiceMetrics?.collectedValue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          subtitle="Fully paid invoices"
          icon={<BarChart3 className="w-4 h-4" />}
          color="text-green-400"
        />
      </div>

      {/* Quote Pipeline */}
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
                    <div className={`text-muted-foreground`}>{STATUS_ICONS[status]}</div>
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

          {/* Visual bar */}
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
                        <a href={`/billing/quotes/${q._id}`} className="font-mono text-xs text-primary hover:underline">
                          {q.quoteNumber}
                        </a>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(q.updatedAt)}</TableCell>
                      <TableCell className="text-sm font-medium text-right">${q.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
