"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import {
  DollarSign,
  Download,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Legend,
} from "recharts";
import { downloadCSV } from "@/lib/export";
import { toast } from "sonner";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RevenueReportPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const invoices = useQuery(
    api.billing.listInvoices,
    orgId ? { orgId, status: "PAID" as const } : "skip",
  );

  const customers = useQuery(
    api.customers.listCustomers,
    orgId ? { organizationId: orgId } : "skip",
  );

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || invoices === undefined || customers === undefined,
  });

  const fromTs = useMemo(() => {
    if (!dateFrom) return NaN;
    const [y, m, d] = dateFrom.split("-").map(Number);
    return new Date(y!, m! - 1, d!).getTime();
  }, [dateFrom]);
  const toTs = useMemo(() => {
    if (!dateTo) return NaN;
    const [y, m, d] = dateTo.split("-").map(Number);
    return new Date(y!, m! - 1, d!).getTime() + 86400000;
  }, [dateTo]);

  // Filtered invoices
  const filtered = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      const ts = inv.paidAt ?? inv.createdAt;
      return ts && ts >= fromTs && ts < toTs;
    });
  }, [invoices, fromTs, toTs]);

  // Customer lookup map
  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    if (customers) {
      for (const c of customers) {
        map.set(c._id, (c as any).companyName ?? (c as any).name ?? "Unknown");
      }
    }
    return map;
  }, [customers]);

  // Monthly revenue data
  const monthlyData = useMemo(() => {
    const monthly: Record<string, { revenue: number; labor: number; parts: number }> = {};
    for (const inv of filtered) {
      const ts = inv.paidAt ?? inv.createdAt;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) monthly[key] = { revenue: 0, labor: 0, parts: 0 };
      monthly[key].revenue += inv.total ?? 0;
      monthly[key].labor += inv.laborTotal ?? 0;
      monthly[key].parts += inv.partsTotal ?? 0;
    }
    const entries = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
    const years = new Set(entries.map(([k]) => k.split("-")[0]));
    const multiYear = years.size > 1;
    return entries.map(([key, vals]) => {
      const [yr, m] = key.split("-");
      const monthName = MONTH_NAMES[parseInt(m!, 10) - 1];
      return {
        month: multiYear ? `${monthName} '${yr!.slice(2)}` : monthName!,
        revenue: Math.round(vals.revenue * 100) / 100,
        labor: Math.round(vals.labor * 100) / 100,
        parts: Math.round(vals.parts * 100) / 100,
        key,
      };
    });
  }, [filtered]);

  // Revenue by customer
  const byCustomer = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of filtered) {
      const name = customerMap.get(inv.customerId as string) ?? "Unknown";
      map[name] = (map[name] || 0) + (inv.total ?? 0);
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([customer, revenue]) => ({ customer, revenue: Math.round(revenue * 100) / 100 }));
  }, [filtered, customerMap]);

  // Revenue by service type (labor vs parts)
  const byServiceType = useMemo(() => {
    let labor = 0;
    let parts = 0;
    let other = 0;
    for (const inv of filtered) {
      labor += inv.laborTotal ?? 0;
      parts += inv.partsTotal ?? 0;
      other += (inv.total ?? 0) - (inv.laborTotal ?? 0) - (inv.partsTotal ?? 0);
    }
    return [
      { type: "Labor", revenue: Math.round(labor * 100) / 100 },
      { type: "Parts", revenue: Math.round(parts * 100) / 100 },
      ...(other > 0.01 ? [{ type: "Other", revenue: Math.round(other * 100) / 100 }] : []),
    ];
  }, [filtered]);

  const totalRevenue = useMemo(
    () => monthlyData.reduce((s, d) => s + d.revenue, 0),
    [monthlyData],
  );

  function handleExportCSV() {
    if (monthlyData.length === 0) {
      toast.error("No data to export.");
      return;
    }
    const rows = monthlyData.map((d) => ({
      Month: d.month,
      Revenue: d.revenue,
      Labor: d.labor,
      Parts: d.parts,
    }));
    downloadCSV(rows, "revenue-report.csv");
    toast.success("Revenue report exported.");
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return <Skeleton className="h-96 w-full" data-testid="page-loading-state" />;
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        icon={DollarSign}
        title="Organization Required"
        description="Complete onboarding before viewing revenue reports."
        missingInfo="Complete onboarding before viewing revenue reports."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Monthly Revenue Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue by month, customer, and service type.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Date filters */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">${fmtUsd(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{byCustomer.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{filtered.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Line + Bar chart: monthly revenue */}
      {monthlyData.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [`$${fmtUsd(value)}`, undefined]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="labor" name="Labor" fill="hsl(var(--chart-1))" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="parts" name="Parts" fill="hsl(var(--chart-2))" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Revenue by customer */}
      {byCustomer.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue by Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                  <TableHead className="text-xs text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCustomer.map((row) => (
                  <TableRow key={row.customer} className="border-border/40">
                    <TableCell className="text-xs font-medium">{row.customer}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">${fmtUsd(row.revenue)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {totalRevenue > 0 ? ((row.revenue / totalRevenue) * 100).toFixed(1) : "0.0"}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Revenue by service type */}
      {byServiceType.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byServiceType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip
                    formatter={(value: number) => [`$${fmtUsd(value)}`, undefined]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byServiceType.map((row) => (
                    <TableRow key={row.type} className="border-border/40">
                      <TableCell className="text-xs font-medium">{row.type}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">${fmtUsd(row.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {monthlyData.length === 0 && (
        <ActionableEmptyState
          icon={DollarSign}
          title="No Revenue Data"
          description="No paid invoices found in the selected date range."
        />
      )}
    </div>
  );
}
