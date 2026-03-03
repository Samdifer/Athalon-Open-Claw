"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Check,
  Edit2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

interface PersonnelHolidaysTabProps {
  holidays: Array<{
    _id: string;
    dateKey: string;
    name: string;
    isObserved: boolean;
    notes?: string;
  }>;
  canManage: boolean;
  orgId: string | null;
}

function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function extractYear(dateKey: string): string {
  return dateKey.split("-")[0];
}

export function PersonnelHolidaysTab({
  holidays,
  canManage,
  orgId,
}: PersonnelHolidaysTabProps) {
  const organizationId = orgId as Id<"organizations"> | null;

  // --- Add holiday form ---
  const [holidayDateKey, setHolidayDateKey] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayNotes, setHolidayNotes] = useState("");

  // --- Edit state ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // --- Delete confirmation ---
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // --- Mutations ---
  const createHoliday = useMutation(api.schedulerRoster.createSchedulingHoliday);
  const updateHoliday = useMutation(api.schedulerRoster.updateSchedulingHoliday);
  const toggleHoliday = useMutation(api.schedulerRoster.toggleSchedulingHoliday);
  const deleteHoliday = useMutation(api.schedulerRoster.deleteSchedulingHoliday);

  // --- Year-grouped holidays ---
  const groupedByYear = useMemo(() => {
    const sorted = [...holidays].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const groups = new Map<string, typeof holidays>();
    for (const holiday of sorted) {
      const year = extractYear(holiday.dateKey);
      const existing = groups.get(year);
      if (existing) {
        existing.push(holiday);
      } else {
        groups.set(year, [holiday]);
      }
    }
    // Sort years descending (most recent first)
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [holidays]);

  // --- Handlers ---
  async function handleCreateHoliday() {
    if (!holidayDateKey || !holidayName.trim() || !organizationId) return;
    try {
      await createHoliday({
        organizationId,
        dateKey: holidayDateKey,
        name: holidayName.trim(),
        notes: holidayNotes.trim() || undefined,
      });
      setHolidayDateKey("");
      setHolidayName("");
      setHolidayNotes("");
      toast.success("Holiday added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add holiday");
    }
  }

  async function handleToggleObserved(holidayId: string) {
    if (!organizationId) return;
    try {
      await toggleHoliday({
        holidayId: holidayId as Id<"schedulingHolidays">,
        organizationId,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle holiday");
    }
  }

  function beginEdit(holiday: PersonnelHolidaysTabProps["holidays"][number]) {
    setEditingId(holiday._id);
    setEditName(holiday.name);
    setEditNotes(holiday.notes ?? "");
  }

  async function handleSaveEdit(holidayId: string) {
    if (!organizationId) return;
    try {
      await updateHoliday({
        holidayId: holidayId as Id<"schedulingHolidays">,
        organizationId,
        name: editName.trim(),
        notes: editNotes.trim() || undefined,
      });
      setEditingId(null);
      toast.success("Holiday updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update holiday");
    }
  }

  async function handleDelete(holidayId: string) {
    if (!organizationId) return;
    try {
      await deleteHoliday({
        holidayId: holidayId as Id<"schedulingHolidays">,
        organizationId,
      });
      setConfirmDeleteId(null);
      toast.success("Holiday deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete holiday");
    }
  }

  return (
    <div className="space-y-6">
      {/* --- Add Holiday Form --- */}
      {canManage && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <Plus className="h-4 w-4" />
              Add Holiday
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date</p>
                <Input
                  type="date"
                  value={holidayDateKey}
                  onChange={(e) => setHolidayDateKey(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Holiday Name</p>
                <Input
                  placeholder="e.g., Independence Day"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes (optional)</p>
              <Textarea
                placeholder="Optional notes..."
                value={holidayNotes}
                onChange={(e) => setHolidayNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleCreateHoliday}
                disabled={!holidayDateKey || !holidayName.trim()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Holiday
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- Empty state --- */}
      {holidays.length === 0 && (
        <Card className="border-border/60 bg-muted/20">
          <CardContent className="p-8 text-center">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No holidays configured. Add holidays to manage shop closures and
              scheduling adjustments.
            </p>
          </CardContent>
        </Card>
      )}

      {/* --- Year-grouped holiday cards --- */}
      {groupedByYear.map(([year, yearHolidays]) => {
        const observedCount = yearHolidays.filter((h) => h.isObserved).length;

        return (
          <Card key={year} className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between text-foreground">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {year}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {observedCount} active / {yearHolidays.length} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {yearHolidays.map((holiday) => {
                const isEditing = editingId === holiday._id;
                const isConfirmingDelete = confirmDeleteId === holiday._id;

                return (
                  <div
                    key={holiday._id}
                    className={`rounded-md border p-3 transition-colors ${
                      holiday.isObserved
                        ? "border-border/60 bg-background"
                        : "border-border/30 bg-muted/10 opacity-60"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Holiday name"
                        />
                        <Textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Notes (optional)"
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(holiday._id)}
                            disabled={!editName.trim()}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {holiday.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDateKey(holiday.dateKey)}
                            {holiday.notes && (
                              <span className="ml-2 text-muted-foreground/70">
                                — {holiday.notes}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {canManage && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={holiday.isObserved}
                                  onCheckedChange={() =>
                                    handleToggleObserved(holiday._id)
                                  }
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  {holiday.isObserved ? "Observed" : "Inactive"}
                                </span>
                              </div>

                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => beginEdit(holiday)}
                                title="Edit holiday"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>

                              {isConfirmingDelete ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-7 w-7"
                                    onClick={() => handleDelete(holiday._id)}
                                    title="Confirm delete"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setConfirmDeleteId(null)}
                                    title="Cancel delete"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => setConfirmDeleteId(holiday._id)}
                                  title="Delete holiday"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </>
                          )}

                          {!canManage && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                holiday.isObserved
                                  ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                                  : "border-muted-foreground/30 text-muted-foreground"
                              }`}
                            >
                              {holiday.isObserved ? "Observed" : "Inactive"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
