"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ExportColumn = { key: string; header: string };

export type ExportCSVButtonProps = {
  data: Record<string, any>[];
  columns: ExportColumn[];
  fileName: string;
  dateRange?: { from?: string; to?: string };
  showDateFilter?: boolean;
  dateFieldKey?: string;
  className?: string;
};

function toUtcString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  const maybeDate = new Date(String(value));
  if (!Number.isNaN(maybeDate.getTime())) return maybeDate.toISOString();
  return String(value);
}

function escapeCsv(value: unknown): string {
  const raw = toUtcString(value);
  if (/[,"\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function rowDateMs(row: Record<string, any>, dateFieldKey?: string): number | null {
  const keys = dateFieldKey
    ? [dateFieldKey]
    : ["date", "created", "createdAt", "timestamp", "promiseDate", "nextScheduled"];

  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    if (typeof value === "number") return value;
    const parsed = new Date(String(value)).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  return null;
}

export function ExportCSVButton({
  data,
  columns,
  fileName,
  dateRange,
  showDateFilter = false,
  dateFieldKey,
  className,
}: ExportCSVButtonProps) {
  const [from, setFrom] = useState(dateRange?.from ?? "");
  const [to, setTo] = useState(dateRange?.to ?? "");

  const filteredRows = useMemo(() => {
    if (!showDateFilter || (!from && !to)) return data;
    const fromMs = from ? new Date(`${from}T00:00:00.000Z`).getTime() : null;
    const toMs = to ? new Date(`${to}T23:59:59.999Z`).getTime() : null;

    return data.filter((row) => {
      const rowMs = rowDateMs(row, dateFieldKey);
      if (rowMs == null) return false;
      if (fromMs != null && rowMs < fromMs) return false;
      if (toMs != null && rowMs > toMs) return false;
      return true;
    });
  }, [data, showDateFilter, from, to, dateFieldKey]);

  const handleExport = () => {
    if (!filteredRows.length) {
      toast.error("No rows match the current export filters.");
      return;
    }

    const headerRow = columns.map((c) => escapeCsv(c.header)).join(",");
    const bodyRows = filteredRows.map((row) =>
      columns.map((column) => escapeCsv(row[column.key])).join(","),
    );

    const csv = [headerRow, ...bodyRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredRows.length} rows`);
  };

  if (!showDateFilter) {
    return (
      <Button variant="outline" size="sm" className={className} onClick={handleExport}>
        <Download className="w-3.5 h-3.5" />
        Export CSV
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-medium">Date range (UTC)</p>
          <p className="text-[11px] text-muted-foreground">Optional filter applied before export.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFrom(""); setTo(""); }}>
            Clear
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleExport}>
            Export {filteredRows.length}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
