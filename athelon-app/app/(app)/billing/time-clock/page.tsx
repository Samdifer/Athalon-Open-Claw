"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Clock,
  Play,
  Square,
  AlertCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function formatDuration(minutes: number | undefined): string {
  if (minutes === undefined) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TimeClockPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const entries = useQuery(
    api.timeClock.listTimeEntries,
    orgId ? { orgId } : "skip",
  );

  const { results: workOrders, status: woQueryStatus } = usePaginatedQuery(
    api.workOrders.listWorkOrders,
    orgId ? { organizationId: orgId } : "skip",
    { initialNumItems: 100 },
  );

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const clockIn = useMutation(api.timeClock.clockIn);
  const clockOut = useMutation(api.timeClock.clockOut);

  const [searchTech, setSearchTech] = useState("");
  const [filterTech, setFilterTech] = useState<string>("all");
  const [filterWO, setFilterWO] = useState<string>("all");

  const [clockInDialog, setClockInDialog] = useState(false);
  const [clockInWO, setClockInWO] = useState<string>("");
  const [clockInTech, setClockInTech] = useState<string>(techId ?? "");
  const [clockInNotes, setClockInNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = !isLoaded || entries === undefined || woQueryStatus === "LoadingFirstPage";

  const activeEntries = useMemo(
    () => (entries ?? []).filter((e) => e.clockOutAt === undefined),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    let result = entries ?? [];
    if (filterTech !== "all") result = result.filter((e) => e.technicianId === filterTech);
    if (filterWO !== "all") result = result.filter((e) => e.workOrderId === filterWO);
    // Wire the search box — previously collected input but never applied it
    if (searchTech.trim()) {
      const lower = searchTech.trim().toLowerCase();
      const matchingIds = new Set(
        (technicians ?? [])
          .filter((t) => t.legalName.toLowerCase().includes(lower))
          .map((t) => t._id as string),
      );
      result = result.filter((e) => matchingIds.has(e.technicianId as string));
    }
    return result;
  }, [entries, filterTech, filterWO, searchTech, technicians]);

  // Daily summary — group by technician
  const dailySummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const todayEntries = (entries ?? []).filter((e) => e.clockInAt >= todayMs);
    const byTech = new Map<string, { techId: Id<"technicians">; totalMinutes: number }>();

    for (const entry of todayEntries) {
      const key = entry.technicianId as string;
      if (!byTech.has(key)) byTech.set(key, { techId: entry.technicianId, totalMinutes: 0 });
      const dur = entry.durationMinutes ?? Math.round((Date.now() - entry.clockInAt) / 60_000);
      byTech.get(key)!.totalMinutes += dur;
    }

    return Array.from(byTech.values());
  }, [entries]);

  // O(1) Map lookups — replaces O(n) .find() called per-row in active entries, daily summary, and full table
  const techMap = useMemo(
    () => new Map((technicians ?? []).map((t) => [t._id as string, t.legalName])),
    [technicians],
  );
  const woMap = useMemo(
    () => new Map((workOrders ?? []).map((w) => [w._id as string, w.workOrderNumber])),
    [workOrders],
  );

  const getTechName = (tId: Id<"technicians">) => techMap.get(tId as string) ?? (tId as string);
  const getWONumber = (woId: Id<"workOrders">) => woMap.get(woId as string) ?? (woId as string);

  // Memoized — was an inline filter in the render body after the loading guard (violated hook ordering)
  const openWorkOrders = useMemo(
    () => (workOrders ?? []).filter((wo) =>
      ["open", "in_progress", "pending_inspection", "pending_signoff", "on_hold"].includes(wo.status),
    ),
    [workOrders],
  );

  const handleClockIn = async () => {
    if (!orgId) return;
    if (!clockInTech) { setError("Select a technician."); return; }
    if (!clockInWO) { setError("Select a work order."); return; }
    setActionLoading("clockIn"); setError(null);
    try {
      await clockIn({
        orgId,
        technicianId: clockInTech as Id<"technicians">,
        workOrderId: clockInWO as Id<"workOrders">,
        notes: clockInNotes.trim() || undefined,
      });
      setClockInDialog(false);
      setClockInWO(""); setClockInNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clock in.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClockOut = async (timeEntryId: Id<"timeEntries">) => {
    if (!orgId) return;
    setActionLoading(timeEntryId); setError(null);
    try {
      await clockOut({ orgId, timeEntryId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clock out.");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Time Clock</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeEntries.length} active · {(entries ?? []).length} total entries
          </p>
        </div>
        <Button size="sm" onClick={() => { setClockInTech(techId ?? ""); setClockInDialog(true); }} className="h-8 gap-1.5 text-xs">
          <Play className="w-3.5 h-3.5" />
          Clock In
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Active Entries */}
      {activeEntries.length > 0 && (
        <Card className="border-border/60 border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Currently Clocked In ({activeEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeEntries.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50">
                <div>
                  <p className="text-sm font-medium">{getTechName(entry.technicianId)}</p>
                  <p className="text-xs text-muted-foreground">
                    WO: {getWONumber(entry.workOrderId)} · Clocked in {formatTime(entry.clockInAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px]">
                    ACTIVE · {formatDuration(Math.round((Date.now() - entry.clockInAt) / 60_000))}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClockOut(entry._id)}
                    disabled={actionLoading === entry._id}
                    className="h-7 gap-1 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                  >
                    <Square className="w-3 h-3" />
                    {actionLoading === entry._id ? "..." : "Clock Out"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily Summary */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today&apos;s Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dailySummary.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No entries today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Technician</TableHead>
                    <TableHead className="text-xs text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySummary.map((row) => (
                    <TableRow key={row.techId as string} className="border-border/40">
                      <TableCell className="text-sm">{getTechName(row.techId)}</TableCell>
                      <TableCell className="text-sm font-medium text-right">
                        {formatDuration(row.totalMinutes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Entries */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search technician..."
                value={searchTech}
                onChange={(e) => setSearchTech(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30 border-border/60"
              />
            </div>
            <Select value={filterTech} onValueChange={setFilterTech}>
              <SelectTrigger className="h-8 w-40 text-xs border-border/60">
                <SelectValue placeholder="All technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {(technicians ?? []).map((t) => (
                  <SelectItem key={t._id} value={t._id}>{t.legalName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterWO} onValueChange={setFilterWO}>
              <SelectTrigger className="h-8 w-36 text-xs border-border/60">
                <SelectValue placeholder="All WOs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Work Orders</SelectItem>
                {(workOrders ?? []).slice(0, 20).map((w) => (
                  <SelectItem key={w._id} value={w._id}>{w.workOrderNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-border/60">
            <CardContent className="p-0">
              {filteredEntries.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No time entries found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-xs">Technician</TableHead>
                      <TableHead className="text-xs">Work Order</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">In</TableHead>
                      <TableHead className="text-xs">Out</TableHead>
                      <TableHead className="text-xs text-right">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.slice(0, 50).map((entry) => (
                      <TableRow key={entry._id} className="border-border/40">
                        <TableCell className="text-sm">{getTechName(entry.technicianId)}</TableCell>
                        <TableCell className="text-sm font-mono">{getWONumber(entry.workOrderId)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDateShort(entry.clockInAt)}</TableCell>
                        <TableCell className="text-sm">{formatTime(entry.clockInAt)}</TableCell>
                        <TableCell className="text-sm">
                          {entry.clockOutAt ? formatTime(entry.clockOutAt) : (
                            <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px]">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-right">
                          {entry.clockOutAt ? formatDuration(entry.durationMinutes) : "—"}
                        </TableCell>
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

      {/* Clock In Dialog */}
      <Dialog open={clockInDialog} onOpenChange={setClockInDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Clock In</DialogTitle>
            <DialogDescription>Select technician and work order to clock in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Technician *</Label>
              <Select value={clockInTech} onValueChange={setClockInTech}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {(technicians ?? []).map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.legalName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Double clock-in guard: warn if selected tech already has an active entry */}
            {clockInTech && (() => {
              const existingEntry = activeEntries.find(
                (e) => (e.technicianId as string) === clockInTech,
              );
              if (!existingEntry) return null;
              return (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Already clocked in!</span>
                    {" "}This technician is currently active on{" "}
                    <span className="font-mono font-semibold">
                      {getWONumber(existingEntry.workOrderId)}
                    </span>{" "}
                    since {formatTime(existingEntry.clockInAt)}.{" "}
                    Clock them out before starting a new entry, or proceed to create a concurrent entry.
                  </div>
                </div>
              );
            })()}
            <div className="space-y-1.5">
              <Label className="text-xs">Work Order *</Label>
              <Select value={clockInWO} onValueChange={setClockInWO}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select work order" />
                </SelectTrigger>
                <SelectContent>
                  {openWorkOrders.map((wo) => (
                    <SelectItem key={wo._id} value={wo._id}>
                      {wo.workOrderNumber} — {wo.description.slice(0, 40)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={clockInNotes}
                onChange={(e) => setClockInNotes(e.target.value)}
                placeholder="Task notes..."
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setClockInDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleClockIn} disabled={actionLoading === "clockIn"} className="bg-green-600 hover:bg-green-700 gap-1.5">
              <Play className="w-3.5 h-3.5" />
              {actionLoading === "clockIn" ? "Clocking in..." : "Clock In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
