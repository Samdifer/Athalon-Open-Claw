"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Archive,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { RosterShiftRow } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const START_HOURS = [5, 6, 7, 8, 9, 10] as const;
const END_HOURS = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23] as const;

const EFFICIENCY_OPTIONS = [
  { value: 0.7, label: "70%" },
  { value: 0.75, label: "75%" },
  { value: 0.8, label: "80%" },
  { value: 0.85, label: "85%" },
  { value: 0.9, label: "90%" },
  { value: 0.95, label: "95%" },
  { value: 1.0, label: "100%" },
  { value: 1.05, label: "105%" },
  { value: 1.1, label: "110%" },
  { value: 1.15, label: "115%" },
  { value: 1.2, label: "120%" },
  { value: 1.3, label: "130%" },
  { value: 1.4, label: "140%" },
] as const;

function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return "12 AM";
  if (normalized === 12) return "12 PM";
  return normalized < 12 ? `${normalized} AM` : `${normalized - 12} PM`;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type ShiftFormState = {
  name: string;
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
};

function getDefaultShiftForm(): ShiftFormState {
  return {
    name: "",
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: 7,
    endHour: 17,
    efficiencyMultiplier: 1.0,
  };
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface RosterShiftsTabProps {
  shifts: RosterShiftRow[];
  canManage: boolean;
  organizationId: Id<"organizations">;
  shopLocationId?: Id<"shopLocations"> | "all";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RosterShiftsTab({
  shifts,
  canManage,
  organizationId,
  shopLocationId,
}: RosterShiftsTabProps) {
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [shiftForm, setShiftForm] = useState<ShiftFormState>(getDefaultShiftForm());
  const [shiftEditingId, setShiftEditingId] = useState<string | null>(null);
  const [confirmDeleteShiftId, setConfirmDeleteShiftId] = useState<string | null>(null);

  // --- Mutations ---
  const createShift = useMutation(api.schedulerRoster.createRosterShift);
  const updateShift = useMutation(api.schedulerRoster.updateRosterShift);
  const archiveShift = useMutation(api.schedulerRoster.archiveRosterShift);
  const deleteShift = useMutation(api.schedulerRoster.deleteRosterShift);

  // --- Handlers ---
  async function handleCreateShift() {
    if (!shiftForm.name.trim()) return;
    try {
      await createShift({
        organizationId,
        shopLocationId: shopLocationId === "all" ? undefined : shopLocationId,
        name: shiftForm.name,
        daysOfWeek: shiftForm.daysOfWeek,
        startHour: shiftForm.startHour,
        endHour: shiftForm.endHour,
        efficiencyMultiplier: shiftForm.efficiencyMultiplier,
      });
      setShiftForm(getDefaultShiftForm());
      setShowCreateShift(false);
      toast.success("Shift created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create shift");
    }
  }

  function beginEditShift(shift: RosterShiftRow) {
    setShiftEditingId(shift.shiftId);
    setShiftForm({
      name: shift.name,
      daysOfWeek: shift.daysOfWeek,
      startHour: shift.startHour,
      endHour: shift.endHour,
      efficiencyMultiplier: shift.efficiencyMultiplier,
    });
  }

  async function handleSaveShift(shiftId: string) {
    try {
      await updateShift({
        shiftId: shiftId as Id<"rosterShifts">,
        organizationId,
        name: shiftForm.name,
        daysOfWeek: shiftForm.daysOfWeek,
        startHour: shiftForm.startHour,
        endHour: shiftForm.endHour,
        efficiencyMultiplier: shiftForm.efficiencyMultiplier,
      });
      setShiftEditingId(null);
      setShiftForm(getDefaultShiftForm());
      toast.success("Shift updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update shift");
    }
  }

  async function handleArchiveShift(shiftId: string) {
    try {
      await archiveShift({ shiftId: shiftId as Id<"rosterShifts">, organizationId });
      toast.success("Shift archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive shift");
    }
  }

  async function handleDeleteShift(shiftId: string) {
    try {
      await deleteShift({ shiftId: shiftId as Id<"rosterShifts">, organizationId });
      setConfirmDeleteShiftId(null);
      toast.success("Shift deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete shift");
    }
  }

  async function handleMoveShift(shiftId: string, direction: "up" | "down") {
    const index = shifts.findIndex((s) => s.shiftId === shiftId);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= shifts.length) return;

    const current = shifts[index];
    const target = shifts[targetIndex];
    try {
      await Promise.all([
        updateShift({
          shiftId: current.shiftId as Id<"rosterShifts">,
          organizationId,
          sortOrder: targetIndex,
        }),
        updateShift({
          shiftId: target.shiftId as Id<"rosterShifts">,
          organizationId,
          sortOrder: index,
        }),
      ]);
      toast.success("Shift order updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder shift");
    }
  }

  function toggleDay(day: number) {
    setShiftForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }));
  }

  // --- Shift form (shared between create and edit) ---
  function renderShiftForm(isEdit: boolean, shiftId?: string) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <Input
            placeholder="Shift name"
            value={shiftForm.name}
            onChange={(e) => setShiftForm((prev) => ({ ...prev, name: e.target.value }))}
            disabled={!canManage}
            data-testid={isEdit ? undefined : "roster-shift-name-input"}
          />
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Work Days</p>
            <div className="flex gap-1">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                    shiftForm.daysOfWeek.includes(idx)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => toggleDay(idx)}
                  disabled={!canManage}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Start</p>
              <Select
                value={String(shiftForm.startHour)}
                onValueChange={(v) => setShiftForm((prev) => ({ ...prev, startHour: Number(v) }))}
                disabled={!canManage}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {START_HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {formatHour(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">End</p>
              <Select
                value={String(shiftForm.endHour)}
                onValueChange={(v) => setShiftForm((prev) => ({ ...prev, endHour: Number(v) }))}
                disabled={!canManage}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {END_HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {formatHour(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
              <Select
                value={String(shiftForm.efficiencyMultiplier)}
                onValueChange={(v) => setShiftForm((prev) => ({ ...prev, efficiencyMultiplier: Number(v) }))}
                disabled={!canManage}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EFFICIENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (isEdit) {
                  setShiftEditingId(null);
                } else {
                  setShowCreateShift(false);
                }
                setShiftForm(getDefaultShiftForm());
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={isEdit && shiftId ? () => handleSaveShift(shiftId) : handleCreateShift}
              disabled={!canManage || !shiftForm.name.trim() || shiftForm.daysOfWeek.length === 0}
              data-testid={isEdit ? undefined : "roster-shift-create-button"}
            >
              {isEdit ? "Save Shift" : "Create Shift"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header + Add button ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Shift Profiles
          <Badge variant="secondary" className="ml-1">{shifts.length}</Badge>
        </h3>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShiftForm(getDefaultShiftForm());
              setShowCreateShift(!showCreateShift);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Shift
          </Button>
        )}
      </div>

      {/* ── Create Shift Form ───────────────────────────────────────── */}
      {showCreateShift && canManage && renderShiftForm(false)}

      {/* ── Shift List ──────────────────────────────────────────────── */}
      {shifts.length === 0 && (
        <Card className="border-border/60 bg-muted/20">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No shift profiles configured yet.
          </CardContent>
        </Card>
      )}

      {shifts.map((shift) => {
        const isEditing = shiftEditingId === shift.shiftId;
        const isConfirmingDelete = confirmDeleteShiftId === shift.shiftId;

        if (isEditing) {
          return (
            <div key={shift.shiftId} data-testid={`roster-shift-row-${shift.shiftId}`}>
              {renderShiftForm(true, shift.shiftId)}
            </div>
          );
        }

        return (
          <Card
            key={shift.shiftId}
            className="border-border/60"
            data-testid={`roster-shift-row-${shift.shiftId}`}
          >
            <CardContent className="p-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{shift.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatHour(shift.startHour)} – {formatHour(shift.endHour)}
                      {" | "}
                      {Math.round(shift.efficiencyMultiplier * 100)}% efficiency
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {shift.teamCount} team{shift.teamCount !== 1 ? "s" : ""}
                    </Badge>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleMoveShift(shift.shiftId, "up")}
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleMoveShift(shift.shiftId, "down")}
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => beginEditShift(shift)}
                          title="Edit shift"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleArchiveShift(shift.shiftId)}
                          title="Archive shift"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                        {isConfirmingDelete ? (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-7 w-7"
                              onClick={() => handleDeleteShift(shift.shiftId)}
                              title="Confirm delete"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setConfirmDeleteShiftId(null)}
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
                            onClick={() => setConfirmDeleteShiftId(shift.shiftId)}
                            title="Delete shift"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Day-of-week indicator */}
                <div className="flex gap-1 mt-2">
                  {DAY_LABELS.map((label, idx) => (
                    <span
                      key={idx}
                      className={`h-6 w-6 rounded text-[10px] font-medium flex items-center justify-center ${
                        shift.daysOfWeek.includes(idx)
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/30 text-muted-foreground/40"
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
