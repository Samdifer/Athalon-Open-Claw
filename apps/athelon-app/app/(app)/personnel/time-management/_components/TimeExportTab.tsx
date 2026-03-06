"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDuration,
  formatTimestamp,
  formatDateShort,
  getWeekStart,
  normalizeApprovalStatus,
} from "@/lib/time-utils";
import type { TimeManagementTabProps } from "../page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MS_PER_DAY = 86_400_000;

function weekLabel(ws: Date): string {
  const we = new Date(ws.getTime() + 6 * MS_PER_DAY);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(ws)} - ${fmt(we)}`;
}

function exportCSV(
  exportEntries: TimeManagementTabProps["entries"],
  techMap: Map<string, string>,
) {
  const header =
    "Date,Technician,Entry Type,Clock In,Clock Out,Duration (min),Status,Notes";
  const rows = exportEntries.map((e) => {
    const techName = techMap.get(e.technicianId as string) ?? "Unknown";
    const date = new Date(e.clockInAt).toLocaleDateString();
    const clockIn = new Date(e.clockInAt).toLocaleString();
    const clockOut = e.clockOutAt
      ? new Date(e.clockOutAt).toLocaleString()
      : "Active";
    const duration = e.durationMinutes ?? "";
    const status = normalizeApprovalStatus(e);
    const notes = (e.notes ?? "").replace(/,/g, ";").replace(/\n/g, " ");
    return `${date},${techName},${e.entryType},${clockIn},${clockOut},${duration},${status},${notes}`;
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `time-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Status badge (read-only variant)
// ---------------------------------------------------------------------------
function ApprovalBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") {
    return (
      <Badge className="border-0 bg-green-500/15 text-green-600 dark:text-green-400 text-[10px]">
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="border-0 bg-red-500/10 text-red-400 text-[10px]">
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px]">
      Pending
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TimeExportTab({
  entries,
  technicians,
  techMap,
}: TimeManagementTabProps) {
  // ---- Week selector ----
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const base = getWeekStart(Date.now());
    return new Date(base.getTime() + weekOffset * 7 * MS_PER_DAY);
  }, [weekOffset]);
  const weekEnd = useMemo(
    () => new Date(weekStart.getTime() + 7 * MS_PER_DAY),
    [weekStart],
  );

  // ---- Technician filter ----
  const [techFilter, setTechFilter] = useState<string>("all");

  // ---- Filtered + sorted entries ----
  const filteredEntries = useMemo(() => {
    let result = entries.filter(
      (e) =>
        e.clockInAt >= weekStart.getTime() && e.clockInAt < weekEnd.getTime(),
    );
    if (techFilter !== "all") {
      result = result.filter((e) => (e.technicianId as string) === techFilter);
    }
    return result.sort((a, b) => b.clockInAt - a.clockInAt);
  }, [entries, weekStart, weekEnd, techFilter]);

  // ---- Export handler ----
  const handleExport = useCallback(() => {
    if (filteredEntries.length === 0) {
      toast.error("No entries to export");
      return;
    }
    exportCSV(filteredEntries, techMap);
    toast.success(`Exported ${filteredEntries.length} entries`);
  }, [filteredEntries, techMap]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="border-border/60">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          {/* Technician filter */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Technician</Label>
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t._id as string} value={t._id as string}>
                    {t.legalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Week selector */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium">{weekLabel(weekStart)}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setWeekOffset((o) => o + 1)}
              disabled={weekOffset >= 0}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex-1" />

          {/* Export button */}
          <Button size="sm" className="h-8" onClick={handleExport}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Preview table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            Export Preview
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {filteredEntries.length} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Clock className="h-8 w-8 opacity-30" />
              <p className="text-xs">No entries to preview for this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Technician</TableHead>
                  <TableHead className="text-xs">Entry Type</TableHead>
                  <TableHead className="text-xs">Clock In</TableHead>
                  <TableHead className="text-xs">Clock Out</TableHead>
                  <TableHead className="text-xs">Duration</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const status = normalizeApprovalStatus(entry);
                  return (
                    <TableRow key={entry._id as string} className="border-border/40">
                      <TableCell className="text-xs">
                        {formatDateShort(entry.clockInAt)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {techMap.get(entry.technicianId as string) ?? "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {entry.entryType.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {formatTimestamp(entry.clockInAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {entry.clockOutAt
                          ? formatTimestamp(entry.clockOutAt)
                          : "Active"}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {formatDuration(entry.durationMinutes)}
                      </TableCell>
                      <TableCell>
                        <ApprovalBadge status={status} />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {entry.notes ?? "\u2014"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
