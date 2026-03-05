"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import {
  BarChart2,
  Download,
  Clock,
  CheckCircle2,
  Plane,
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

export default function ThroughputReportPage() {
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

  const woResult = useQuery(
    api.workOrders.listWorkOrders,
    orgId
      ? { organizationId: orgId, status: "closed" as const, paginationOpts: { numItems: 500, cursor: null } }
      : "skip",
  );

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || woResult === undefined,
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

  const closedWOs = useMemo(() => {
    if (!woResult?.page) return [];
    return (woResult.page as any[]).filter((wo) => {
      const ts = wo.closedAt ?? wo.completedAt ?? wo._creationTime;
      return ts >= fromTs && ts < toTs;
    });
  }, [woResult, fromTs, toTs]);

  // Monthly throughput data
  const monthlyData = useMemo(() => {
    const monthly: Record<string, { count: number; totalTatMs: number }> = {};
    for (const wo of closedWOs) {
      const closeTs = wo.closedAt ?? wo.completedAt ?? wo._creationTime;
      const d = new Date(closeTs);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) monthly[key] = { count: 0, totalTatMs: 0 };
      monthly[key].count += 1;
      const openTs = wo.openedAt ?? wo._creationTime;
      monthly[key].totalTatMs += closeTs - openTs;
    }
    const entries = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
    const years = new Set(entries.map(([k]) => k.split("-")[0]));
    const multiYear = years.size > 1;
    return entries.map(([key, vals]) => {
      const [yr, m] = key.split("-");
      const monthName = MONTH_NAMES[parseInt(m!, 10) - 1];
      const avgTatDays = vals.count > 0 ? vals.totalTatMs / vals.count / (1000 * 60 * 60 * 24) : 0;
      return {
        month: multiYear ? `${monthName} '${yr!.slice(2)}` : monthName!,
        completed: vals.count,
        avgTatDays: Math.round(avgTatDays * 10) / 10,
        key,
      };
    });
  }, [closedWOs]);

  // By aircraft type (make + model from enriched data)
  const byAircraftType = useMemo(() => {
    const map: Record<string, { count: number; totalTatMs: number }> = {};
    for (const wo of closedWOs) {
      const ac = wo.aircraft;
      const label = ac ? `${ac.make ?? ""} ${ac.model ?? ""}`.trim() || "Unknown" : "Unknown";
      if (!map[label]) map[label] = { count: 0, totalTatMs: 0 };
      map[label].count += 1;
      const openTs = wo.openedAt ?? wo._creationTime;
      const closeTs = wo.closedAt ?? wo.completedAt ?? wo._creationTime;
      map[label].totalTatMs += closeTs - openTs;
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([type, vals]) => ({
        type,
        count: vals.count,
        avgTatDays: vals.count > 0 ? Math.round((vals.totalTatMs / vals.count / (1000 * 60 * 60 * 24)) * 10) / 10 : 0,
      }));
  }, [closedWOs]);

  const totalCompleted = closedWOs.length;
  const overallAvgTat = useMemo(() => {
    if (closedWOs.length === 0) return 0;
    const totalMs = closedWOs.reduce((s, wo) => {
      const openTs = wo.openedAt ?? wo._creationTime;
      const closeTs = wo.closedAt ?? wo.completedAt ?? wo._creationTime;
      return s + (closeTs - openTs);
    }, 0);
    return Math.round((totalMs / closedWOs.length / (1000 * 60 * 60 * 24)) * 10) / 10;
  }, [closedWOs]);

  function handleExportCSV() {
    if (monthlyData.length === 0) {
      toast.error("No data to export.");
      return;
    }
    const rows = monthlyData.map((d) => ({
      Month: d.month,
      Completed: d.completed,
      "Avg TAT (days)": d.avgTatDays,
    }));
    downloadCSV(rows, "throughput-report.csv");
    toast.success("Throughput report exported.");
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return <Skeleton className="h-96 w-full" data-testid="page-loading-state" />;
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        icon={BarChart2}
        title="Organization Required"
        description="Complete onboarding before viewing throughput reports."
        missingInfo="Complete onboarding before viewing throughput reports."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            WO Throughput Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Closed work orders by month, turnaround time, and aircraft type.
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
              <CheckCircle2 className="w-3.5 h-3.5" />
              WOs Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{totalCompleted}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Avg TAT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{overallAvgTat} days</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5" />
              Aircraft Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{byAircraftType.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart: monthly throughput */}
      {monthlyData.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly WO Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}d`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="completed" name="Completed" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="avgTatDays" name="Avg TAT (days)" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly data table */}
      {monthlyData.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Month</TableHead>
                  <TableHead className="text-xs text-right">Completed</TableHead>
                  <TableHead className="text-xs text-right">Avg TAT (days)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((row) => (
                  <TableRow key={row.key} className="border-border/40">
                    <TableCell className="text-xs">{row.month}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.completed}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.avgTatDays}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-border/40 font-semibold">
                  <TableCell className="text-xs">Total</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{totalCompleted}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{overallAvgTat}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* By aircraft type */}
      {byAircraftType.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">By Aircraft Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Aircraft Type</TableHead>
                  <TableHead className="text-xs text-right">WOs Completed</TableHead>
                  <TableHead className="text-xs text-right">Avg TAT (days)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byAircraftType.map((row) => (
                  <TableRow key={row.type} className="border-border/40">
                    <TableCell className="text-xs font-medium">{row.type}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{row.avgTatDays}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {monthlyData.length === 0 && (
        <ActionableEmptyState
          icon={BarChart2}
          title="No Throughput Data"
          description="No closed work orders found in the selected date range."
        />
      )}
    </div>
  );
}
