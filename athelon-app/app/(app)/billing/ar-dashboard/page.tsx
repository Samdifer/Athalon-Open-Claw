"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  AlertTriangle,
  DollarSign,
  Clock,
  TrendingDown,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Link } from "react-router-dom";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
}

function KpiCard({ title, value, subtitle, icon, color = "" }: KpiCardProps) {
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

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function overdueRowClass(days: number) {
  if (days >= 60) return "bg-red-500/5 hover:bg-red-500/10";
  if (days >= 30) return "bg-orange-500/5 hover:bg-orange-500/10";
  return "bg-yellow-500/5 hover:bg-yellow-500/10";
}

function overdueBadge(days: number) {
  if (days >= 60)
    return <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400 bg-red-500/10">{days}d</Badge>;
  if (days >= 30)
    return <Badge variant="outline" className="text-[10px] border-orange-500/40 text-orange-400 bg-orange-500/10">{days}d</Badge>;
  return <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400 bg-yellow-500/10">{days}d</Badge>;
}

export default function ArDashboardPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const aging = useQuery(
    api.billingV4.getArAgingSummary,
    orgId ? { orgId } : "skip",
  );

  const overdueInvoices = useQuery(
    api.billingV4.listOverdueInvoices,
    orgId ? { orgId } : "skip",
  );

  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isLoading = !isLoaded || aging === undefined || overdueInvoices === undefined;

  const customerMap = useMemo(() => {
    if (!customers) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const c of customers) m.set(c._id as string, c.name);
    return m;
  }, [customers]);

  const sortedCustomerBalances = useMemo(() => {
    if (!aging) return [];
    return [...aging.customerBalances].sort((a, b) => b.balance - a.balance);
  }, [aging]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-56" />
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

  const buckets = aging?.buckets ?? { current: 0, over30: 0, over60: 0, over90: 0, total: 0 };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AR Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Accounts receivable command center — {aging?.invoiceCount ?? 0} outstanding invoices
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Total Outstanding"
          value={fmt(buckets.total)}
          subtitle={`${aging?.invoiceCount ?? 0} invoices`}
          icon={<DollarSign className="w-4 h-4" />}
          color="text-amber-400"
        />
        <KpiCard
          title="Current"
          value={fmt(buckets.current)}
          subtitle="Not yet overdue"
          icon={<Clock className="w-4 h-4" />}
          color="text-green-400"
        />
        <KpiCard
          title="30–60 Days Overdue"
          value={fmt(buckets.over30)}
          subtitle="Needs attention"
          icon={<AlertTriangle className="w-4 h-4" />}
          color="text-orange-400"
        />
        <KpiCard
          title="60+ Days Overdue"
          value={fmt(buckets.over60 + buckets.over90)}
          subtitle="Critical"
          icon={<TrendingDown className="w-4 h-4" />}
          color="text-red-400"
        />
      </div>

      {/* Overdue Invoices Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Overdue Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {overdueInvoices.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs text-muted-foreground">No overdue invoices — great work!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Invoice #</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Due Date</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs text-right">Balance</TableHead>
                  <TableHead className="text-xs text-center">Days Overdue</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.map((inv) => (
                  <TableRow
                    key={inv._id}
                    className={`border-border/40 ${overdueRowClass(inv.daysOverdue)}`}
                  >
                    <TableCell>
                      <Link
                        to={`/billing/invoices/${inv._id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {customerMap.get(inv.customerId as string) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-right">{fmt(inv.total)}</TableCell>
                    <TableCell className="text-xs text-right font-semibold text-amber-400">
                      {fmt(inv.balance)}
                    </TableCell>
                    <TableCell className="text-center">
                      {overdueBadge(inv.daysOverdue)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/10"
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <Link to={`/billing/invoices/${inv._id}`}>
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Record Payment
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Balances Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Customer Balances</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedCustomerBalances.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs text-muted-foreground">No outstanding customer balances.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Outstanding Balance</TableHead>
                  <TableHead className="text-xs text-right">Oldest Invoice (days)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCustomerBalances.map((cb) => (
                  <TableRow key={cb.customerId} className="border-border/40">
                    <TableCell className="text-sm">
                      {customerMap.get(cb.customerId) ?? cb.customerId}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-right text-amber-400">
                      {fmt(cb.balance)}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {cb.oldest > 0 ? (
                        <span className={cb.oldest >= 60 ? "text-red-400" : cb.oldest >= 30 ? "text-orange-400" : "text-yellow-400"}>
                          {cb.oldest}d
                        </span>
                      ) : "Current"}
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
