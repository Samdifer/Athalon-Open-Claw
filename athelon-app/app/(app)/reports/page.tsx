"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { FileBarChart, Download, DollarSign, TrendingUp, BarChart2, Navigation, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
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
} from "recharts";
import { downloadCSV } from "@/lib/export";
import { toast } from "sonner";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ReportsPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const invoices = useQuery(
    api.billing.listInvoices,
    orgId ? { orgId, status: "PAID" as const } : "skip",
  );

  const woResult = useQuery(
    api.workOrders.listWorkOrders,
    orgId
      ? { organizationId: orgId, status: "closed" as const, paginationOpts: { numItems: 500, cursor: null } }
      : "skip",
  );

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || invoices === undefined || woResult === undefined,
  });

  const fromTs = new Date(dateFrom).getTime();
  const toTs = new Date(dateTo).getTime() + 86400000;
  const dateRangeInvalid = dateFrom && dateTo && fromTs > toTs;

  // Revenue by month
  const revenueData = useMemo(() => {
    if (!invoices) return [];
    const monthly: Record<string, number> = {};
    for (const inv of invoices) {
      const ts = inv.paidAt ?? inv.updatedAt;
      if (!ts || ts < fromTs || ts > toTs) continue;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthly[key] = (monthly[key] || 0) + (inv.total ?? 0);
    }
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [, m] = key.split("-");
        return { month: MONTH_NAMES[parseInt(m!, 10) - 1], revenue: Math.round(total * 100) / 100, key };
      });
  }, [invoices, fromTs, toTs]);

  // WO throughput by month
  const throughputData = useMemo(() => {
    if (!woResult?.page) return [];
    const monthly: Record<string, number> = {};
    for (const wo of woResult.page as any[]) {
      const ts = wo.completedAt ?? wo._creationTime;
      if (ts < fromTs || ts > toTs) continue;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthly[key] = (monthly[key] || 0) + 1;
    }
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [, m] = key.split("-");
        return { month: MONTH_NAMES[parseInt(m!, 10) - 1], completed: count, key };
      });
  }, [woResult, fromTs, toTs]);

  // useMemo so these aggregations don't re-run on every keystroke in the date inputs
  // (revenueData / throughputData are already memoized; totalRevenue / totalWOs depend only on them).
  const totalRevenue = useMemo(
    () => revenueData.reduce((s, d) => s + d.revenue, 0),
    [revenueData],
  );
  const totalWOs = useMemo(
    () => throughputData.reduce((s, d) => s + d.completed, 0),
    [throughputData],
  );

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return <Skeleton className="h-96 w-full" data-testid="page-loading-state" />;
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Reports require organization setup"
        missingInfo="Complete onboarding before viewing revenue and work-order analytics."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <FileBarChart className="w-5 h-5" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Revenue & work order analytics
          </p>
        </div>
      </div>

      {/* Financial Sub-Navigation */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link to="/reports">
            <BarChart2 className="w-3.5 h-3.5" />
            Overview
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials">
            <DollarSign className="w-3.5 h-3.5" />
            Financial Dashboard
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials/forecast">
            <TrendingUp className="w-3.5 h-3.5" />
            Forecast
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials/profitability">
            <BarChart2 className="w-3.5 h-3.5" />
            Profitability
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 border border-border/40" asChild>
          <Link to="/reports/financials/runway">
            <Navigation className="w-3.5 h-3.5" />
            Runway
          </Link>
        </Button>
      </div>

      {/* Date Range Picker */}
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40 h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date range validation error */}
      {dateRangeInvalid && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs font-medium">
            "From" date is after "To" date — no data will match this range. Swap the dates to see results.
          </p>
        </div>
      )}

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Monthly Revenue</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                if (revenueData.length) {
                  downloadCSV(
                    revenueData.map((d) => ({ Month: d.key, Revenue: d.revenue })),
                    "revenue-report.csv",
                  );
                  toast.success("Revenue report exported");
                }
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            {!invoices ? (
              <Skeleton className="h-[250px] w-full" />
            ) : revenueData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                No revenue data in this period
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Total: <span className="font-semibold text-foreground">${totalRevenue.toLocaleString()}</span>
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }}
                      formatter={(value: any) => [`$${value?.toLocaleString?.() ?? value}`, "Revenue"]}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">WO Throughput</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                if (throughputData.length) {
                  downloadCSV(
                    throughputData.map((d) => ({ Month: d.key, Completed: d.completed })),
                    "wo-throughput-report.csv",
                  );
                  toast.success("WO throughput report exported");
                }
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            {!woResult ? (
              <Skeleton className="h-[250px] w-full" />
            ) : throughputData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                No completed WOs in this period
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Total: <span className="font-semibold text-foreground">{totalWOs} work orders</span>
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={throughputData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }}
                      formatter={(value: any) => [value, "Completed"]}
                    />
                    <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Revenue Summary Table</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for selected period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Month</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                  <TableHead className="text-xs text-right">WOs Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueData.map((row) => {
                  const woCount = throughputData.find((t) => t.key === row.key)?.completed ?? 0;
                  return (
                    <TableRow key={row.key} className="border-border/40">
                      <TableCell className="text-xs">{row.key}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-medium">
                        ${row.revenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{woCount}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-border/40 font-semibold">
                  <TableCell className="text-xs">Total</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">${totalRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{totalWOs}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
