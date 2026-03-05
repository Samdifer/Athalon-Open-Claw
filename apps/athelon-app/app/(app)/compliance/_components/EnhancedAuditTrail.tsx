"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ListFilter, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AuditEventRow = {
  id: string;
  timestamp: number;
  workOrderNumber: string;
  technicianName: string;
  eventType: string;
  summary: string;
  details: string;
};

type GroupBy = "workOrder" | "technician" | "date" | "eventType";

type Props = {
  events: AuditEventRow[];
};

function groupLabelForEvent(event: AuditEventRow, groupBy: GroupBy) {
  if (groupBy === "workOrder") return event.workOrderNumber;
  if (groupBy === "technician") return event.technicianName;
  if (groupBy === "eventType") return event.eventType;
  return new Date(event.timestamp).toLocaleDateString("en-US", { timeZone: "UTC" });
}

export function EnhancedAuditTrail({ events }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>("workOrder");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [timelineMode, setTimelineMode] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00.000Z`).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59.999Z`).getTime() : null;

    return events.filter((event) => {
      if (fromMs != null && event.timestamp < fromMs) return false;
      if (toMs != null && event.timestamp > toMs) return false;
      if (!query) return true;
      const blob = `${event.workOrderNumber} ${event.technicianName} ${event.eventType} ${event.summary} ${event.details}`.toLowerCase();
      return blob.includes(query);
    });
  }, [events, search, fromDate, toDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, AuditEventRow[]>();
    for (const event of filtered) {
      const key = groupLabelForEvent(event, groupBy);
      const bucket = map.get(key) ?? [];
      bucket.push(event);
      map.set(key, bucket);
    }

    // BUG-QCM-HUNT-164: Groups were in Map insertion order (first-seen event per
    // group key). When grouped by "date", entries should be newest-first so the
    // most recent audit events appear at the top. When grouped by "workOrder" or
    // "technician", alphabetical is the natural sort. A QCM auditing by date saw
    // the oldest events first — they'd have to scroll past weeks of history to
    // reach today's entries.
    const entries = [...map.entries()].map(([key, rows]) => ({
      key,
      rows: [...rows].sort((a, b) => b.timestamp - a.timestamp),
    }));

    if (groupBy === "date") {
      // Newest dates first
      entries.sort((a, b) => b.rows[0].timestamp - a.rows[0].timestamp);
    } else {
      // Alphabetical by group key
      entries.sort((a, b) => a.key.localeCompare(b.key));
    }

    return entries;
  }, [filtered, groupBy]);

  const sortedTimeline = useMemo(
    () => [...filtered].sort((a, b) => a.timestamp - b.timestamp),
    [filtered],
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-muted-foreground" />
            Enhanced Audit Trail
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setTimelineMode((prev) => !prev)}
          >
            <Clock className="w-3.5 h-3.5" />
            {timelineMode ? "Grouped View" : "Timeline View"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Search events</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search WO, technician, event type, summary"
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">From (UTC)</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To (UTC)</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {/* BUG-QCM-HUNT-137: Previously used a raw <select> element for the
            "Group by" dropdown — the only unstyled native HTML control in the
            entire compliance section. Every other dropdown across the app uses
            shadcn's Select component. On dark mode, the raw <select> renders
            with platform-default styling (white background on Windows, grey on
            macOS) that clashes with the design system. Replaced with shadcn
            Select for visual consistency and accessible keyboard navigation. */}
        {!timelineMode && (
          <div>
            <Label className="text-xs text-muted-foreground">Group by</Label>
            <Select
              value={groupBy}
              onValueChange={(v) => setGroupBy(v as GroupBy)}
            >
              <SelectTrigger className="mt-1 h-8 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workOrder" className="text-xs">Work Order</SelectItem>
                <SelectItem value="technician" className="text-xs">Technician</SelectItem>
                <SelectItem value="date" className="text-xs">Date</SelectItem>
                <SelectItem value="eventType" className="text-xs">Event Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {timelineMode ? (
          <div className="space-y-2">
            {sortedTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events found for current filters.</p>
            ) : (
              sortedTimeline.map((event) => (
                <div key={event.id} className="rounded-md border border-border/60 p-3 relative">
                  <div className="absolute left-2 top-2 h-[calc(100%-1rem)] w-px bg-border/60" aria-hidden />
                  <div className="pl-3">
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString("en-US", { timeZone: "UTC" })} UTC
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{event.workOrderNumber}</Badge>
                      <Badge variant="outline" className="text-[10px]">{event.eventType}</Badge>
                      <span className="text-xs text-muted-foreground">{event.technicianName}</span>
                    </div>
                    <p className="text-sm mt-1">{event.summary}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events found for current filters.</p>
            ) : (
              grouped.map((group) => {
                const isExpanded = !!expandedRows[group.key];
                return (
                  <div key={group.key} className="rounded-md border border-border/60 overflow-hidden">
                    <button
                      type="button"
                      className="w-full px-3 py-2 bg-muted/30 flex items-center justify-between text-left"
                      onClick={() => setExpandedRows((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                    >
                      <div>
                        <p className="text-sm font-medium">{group.key}</p>
                        <p className="text-[11px] text-muted-foreground">{group.rows.length} event(s)</p>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-border/40">
                        {group.rows.map((event) => (
                          <div key={event.id} className="p-3 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">{event.eventType}</Badge>
                              <span className="text-[11px] text-muted-foreground">{event.technicianName}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(event.timestamp).toLocaleString("en-US", { timeZone: "UTC" })} UTC
                              </span>
                            </div>
                            <p className="text-sm">{event.summary}</p>
                            <p className="text-xs text-muted-foreground">{event.details}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
