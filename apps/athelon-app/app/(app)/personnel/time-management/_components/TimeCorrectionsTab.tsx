"use client";

import { useState, useMemo, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
// Datetime-local conversion helpers
// ---------------------------------------------------------------------------
function toDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): number {
  return new Date(value).getTime();
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MS_PER_DAY = 86_400_000;

const ENTRY_TYPES = [
  { value: "work_order", label: "Work Order" },
  { value: "task", label: "Task" },
  { value: "step", label: "Step" },
  { value: "shop", label: "Shop Activity" },
] as const;

const BILLING_CLASSES = [
  { value: "billable", label: "Billable" },
  { value: "non_billable", label: "Non-Billable" },
  { value: "warranty", label: "Warranty" },
  { value: "internal", label: "Internal" },
  { value: "absorbed", label: "Absorbed" },
] as const;

// ---------------------------------------------------------------------------
// Status badge component
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
export function TimeCorrectionsTab({
  orgId,
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

  // ---- Mutations ----
  const updateMut = useMutation(api.timeClock.updateTimeEntry);
  const createMut = useMutation(api.timeClock.createManualTimeEntry);
  const deleteMut = useMutation(api.timeClock.deleteTimeEntry);

  // ---- Edit dialog state ----
  const [editEntry, setEditEntry] = useState<TimeManagementTabProps["entries"][number] | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editEntryType, setEditEntryType] = useState("work_order");
  const [editNotes, setEditNotes] = useState("");
  const [editBillingClass, setEditBillingClass] = useState("billable");
  const [editSaving, setEditSaving] = useState(false);

  const openEditDialog = useCallback(
    (entry: TimeManagementTabProps["entries"][number]) => {
      setEditEntry(entry);
      setEditClockIn(toDatetimeLocal(entry.clockInAt));
      setEditClockOut(entry.clockOutAt ? toDatetimeLocal(entry.clockOutAt) : "");
      setEditEntryType(entry.entryType);
      setEditNotes(entry.notes ?? "");
      setEditBillingClass(entry.billingClass ?? "billable");
    },
    [],
  );

  const handleEditSave = useCallback(async () => {
    if (!editEntry) return;
    setEditSaving(true);
    try {
      await updateMut({
        orgId,
        timeEntryId: editEntry._id,
        clockInAt: fromDatetimeLocal(editClockIn),
        clockOutAt: editClockOut ? fromDatetimeLocal(editClockOut) : undefined,
        entryType: editEntryType as "work_order" | "task" | "step" | "shop",
        notes: editNotes || undefined,
        billingClass: editBillingClass as "billable" | "non_billable" | "warranty" | "internal" | "absorbed",
        allowApprovedEdit: true,
      });
      toast.success("Time entry updated");
      setEditEntry(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update entry");
    } finally {
      setEditSaving(false);
    }
  }, [editEntry, updateMut, orgId, editClockIn, editClockOut, editEntryType, editNotes, editBillingClass]);

  // ---- Add manual entry dialog state ----
  const [addOpen, setAddOpen] = useState(false);
  const [addTechId, setAddTechId] = useState<string>("");
  const [addEntryType, setAddEntryType] = useState("work_order");
  const [addClockIn, setAddClockIn] = useState("");
  const [addClockOut, setAddClockOut] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addBillingClass, setAddBillingClass] = useState("billable");
  const [addSaving, setAddSaving] = useState(false);

  const openAddDialog = useCallback(() => {
    setAddTechId(technicians.length > 0 ? (technicians[0]._id as string) : "");
    setAddEntryType("work_order");
    setAddClockIn(toDatetimeLocal(Date.now() - 3_600_000)); // 1 hour ago
    setAddClockOut(toDatetimeLocal(Date.now()));
    setAddNotes("");
    setAddBillingClass("billable");
    setAddOpen(true);
  }, [technicians]);

  const handleAddSave = useCallback(async () => {
    if (!addTechId || !addClockIn || !addClockOut) {
      toast.error("Please fill in all required fields");
      return;
    }
    setAddSaving(true);
    try {
      await createMut({
        orgId,
        technicianId: addTechId as Id<"technicians">,
        entryType: addEntryType as "work_order" | "task" | "step" | "shop",
        clockInAt: fromDatetimeLocal(addClockIn),
        clockOutAt: fromDatetimeLocal(addClockOut),
        notes: addNotes || undefined,
        billingClass: addBillingClass as "billable" | "non_billable" | "warranty" | "internal" | "absorbed",
        source: "manual_entry",
      });
      toast.success("Manual entry created");
      setAddOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create entry");
    } finally {
      setAddSaving(false);
    }
  }, [createMut, orgId, addTechId, addEntryType, addClockIn, addClockOut, addNotes, addBillingClass]);

  // ---- Delete dialog state ----
  const [deleteEntry, setDeleteEntry] = useState<TimeManagementTabProps["entries"][number] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    try {
      await deleteMut({
        orgId,
        timeEntryId: deleteEntry._id,
        forceApprovedDelete: true,
      });
      toast.success("Time entry deleted");
      setDeleteEntry(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete entry");
    } finally {
      setDeleting(false);
    }
  }, [deleteEntry, deleteMut, orgId]);

  // ---- Week label ----
  function weekLabel(ws: Date): string {
    const we = new Date(ws.getTime() + 6 * MS_PER_DAY);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(ws)} - ${fmt(we)}`;
  }

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

          {/* Add manual entry */}
          <Button size="sm" className="h-8" onClick={openAddDialog}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Manual Entry
          </Button>
        </CardContent>
      </Card>

      {/* Entries table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Time Entries
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {filteredEntries.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Clock className="h-8 w-8 opacity-30" />
              <p className="text-xs">No time entries for this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Technician</TableHead>
                  <TableHead className="text-xs">Context</TableHead>
                  <TableHead className="text-xs">Clock In</TableHead>
                  <TableHead className="text-xs">Clock Out</TableHead>
                  <TableHead className="text-xs">Duration</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditDialog(entry)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-500"
                            onClick={() => setDeleteEntry(entry)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ---- Edit Dialog ---- */}
      <Dialog open={editEntry !== null} onOpenChange={(o) => !o && setEditEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Clock In</Label>
              <Input
                type="datetime-local"
                className="h-8 text-xs"
                value={editClockIn}
                onChange={(e) => setEditClockIn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Clock Out</Label>
              <Input
                type="datetime-local"
                className="h-8 text-xs"
                value={editClockOut}
                onChange={(e) => setEditClockOut(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Entry Type</Label>
              <Select value={editEntryType} onValueChange={setEditEntryType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Billing Class</Label>
              <Select value={editBillingClass} onValueChange={setEditBillingClass}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CLASSES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                className="min-h-[60px] text-xs"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setEditEntry(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8"
              onClick={handleEditSave}
              disabled={editSaving}
            >
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Add Manual Entry Dialog ---- */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Manual Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Technician</Label>
              <Select value={addTechId} onValueChange={setAddTechId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t._id as string} value={t._id as string}>
                      {t.legalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Entry Type</Label>
              <Select value={addEntryType} onValueChange={setAddEntryType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Clock In</Label>
              <Input
                type="datetime-local"
                className="h-8 text-xs"
                value={addClockIn}
                onChange={(e) => setAddClockIn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Clock Out</Label>
              <Input
                type="datetime-local"
                className="h-8 text-xs"
                value={addClockOut}
                onChange={(e) => setAddClockOut(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Billing Class</Label>
              <Select value={addBillingClass} onValueChange={setAddBillingClass}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CLASSES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                className="min-h-[60px] text-xs"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8"
              onClick={handleAddSave}
              disabled={addSaving}
            >
              {addSaving ? "Creating..." : "Create Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog open={deleteEntry !== null} onOpenChange={(o) => !o && setDeleteEntry(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete Time Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure? This cannot be undone.
          </p>
          {deleteEntry && (
            <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs">
              <p>
                <span className="font-medium">
                  {techMap.get(deleteEntry.technicianId as string) ?? "Unknown"}
                </span>{" "}
                &mdash; {formatDateShort(deleteEntry.clockInAt)}
              </p>
              <p className="text-muted-foreground">
                {formatDuration(deleteEntry.durationMinutes)} &middot;{" "}
                {deleteEntry.entryType.replace(/_/g, " ")}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setDeleteEntry(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
