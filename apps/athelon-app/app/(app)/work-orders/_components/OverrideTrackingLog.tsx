"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportCSVButton } from "@/src/shared/components/ExportCSVButton";

export type SuggestionDecisionLog = {
  id: string;
  date: number;
  technician: string;
  suggestion: string;
  overrideReason?: string;
  workOrder: string;
  accepted: boolean;
};

type Props = {
  entries: SuggestionDecisionLog[];
};

export function OverrideTrackingLog({ entries }: Props) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState("all");

  const technicians = useMemo(
    () => [...new Set(entries.map((row) => row.technician))].sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00.000Z`).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59.999Z`).getTime() : null;

    return entries.filter((row) => {
      if (technicianFilter !== "all" && row.technician !== technicianFilter) return false;
      if (fromMs != null && row.date < fromMs) return false;
      if (toMs != null && row.date > toMs) return false;
      return true;
    });
  }, [entries, fromDate, toDate, technicianFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const overrides = filtered.filter((row) => !row.accepted).length;
    const accepted = total - overrides;
    const overrideRate = total ? (overrides / total) * 100 : 0;
    return { total, accepted, overrides, overrideRate };
  }, [filtered]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            AI Override Tracking Log
          </CardTitle>
          <ExportCSVButton
            data={filtered.map((row) => ({
              date: new Date(row.date).toISOString(),
              technician: row.technician,
              suggestion: row.suggestion,
              overrideReason: row.overrideReason ?? "",
              workOrder: row.workOrder,
              decision: row.accepted ? "Accepted" : "Overridden",
            }))}
            columns={[
              { key: "date", header: "Date (UTC)" },
              { key: "technician", header: "Technician" },
              { key: "suggestion", header: "Suggestion" },
              { key: "overrideReason", header: "Override Reason" },
              { key: "workOrder", header: "Work Order" },
              { key: "decision", header: "Decision" },
            ]}
            fileName="faa-ai-override-log.csv"
            className="h-8 text-xs"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-md border border-border/60 p-2">
            <p className="text-[11px] text-muted-foreground">Total Decisions</p>
            <p className="text-lg font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <p className="text-[11px] text-muted-foreground">Accepted</p>
            <p className="text-lg font-semibold text-emerald-400">{stats.accepted}</p>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <p className="text-[11px] text-muted-foreground">Overrides</p>
            <p className="text-lg font-semibold text-amber-400">{stats.overrides}</p>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <p className="text-[11px] text-muted-foreground">Override Rate</p>
            <p className="text-lg font-semibold">{stats.overrideRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">From (UTC)</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To (UTC)</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Technician</Label>
            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="all">All technicians</option>
              {technicians.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-md border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Suggestion</TableHead>
                <TableHead>Override Reason</TableHead>
                <TableHead>Work Order</TableHead>
                <TableHead>Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    No override records found for current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{new Date(row.date).toLocaleDateString("en-US", { timeZone: "UTC" })}</TableCell>
                    <TableCell>{row.technician}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{row.suggestion}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{row.overrideReason ?? "—"}</TableCell>
                    <TableCell>{row.workOrder}</TableCell>
                    <TableCell>
                      {row.accepted ? (
                        <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 bg-emerald-500/10">Accepted</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-400 border-amber-500/40 bg-amber-500/10">Overridden</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
