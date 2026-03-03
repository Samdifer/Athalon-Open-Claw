// ─── ShiftEditor ────────────────────────────────────────────────────────────
// Inline shift editing form extracted from the Personnel page.

import { useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DAY_ORDER,
  DAY_LABELS,
  START_HOUR_OPTIONS,
  END_HOUR_OPTIONS,
  EFFICIENCY_OPTIONS,
  type WorkloadEntry,
} from "./rosterConstants";

interface ShiftEditorProps {
  technicianId: Id<"technicians">;
  orgId: Id<"organizations">;
  initial: WorkloadEntry;
  onClose: () => void;
}

export function ShiftEditor({
  technicianId,
  orgId,
  initial,
  onClose,
}: ShiftEditorProps) {
  const [editDays, setEditDays] = useState<number[]>(initial.daysOfWeek);
  const [editStartHour, setEditStartHour] = useState<number>(initial.startHour);
  const [editEndHour, setEditEndHour] = useState<number>(initial.endHour);
  const [editEfficiency, setEditEfficiency] = useState<number>(
    initial.efficiencyMultiplier,
  );
  const [saving, setSaving] = useState(false);

  const upsertShift = useMutation(api.capacity.upsertTechnicianShift);

  function toggleDay(day: number) {
    setEditDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function handleSave() {
    if (editDays.length === 0) return;
    setSaving(true);
    try {
      await upsertShift({
        technicianId,
        organizationId: orgId,
        daysOfWeek: editDays,
        startHour: editStartHour,
        endHour: editEndHour,
        efficiencyMultiplier: editEfficiency,
      });
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save shift — please try again",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
      {/* Day checkboxes */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Work Days
        </p>
        <div className="flex flex-wrap gap-2">
          {DAY_ORDER.map((day) => (
            <label
              key={day}
              className="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <Checkbox
                checked={editDays.includes(day)}
                onCheckedChange={() => toggleDay(day)}
                className="h-3.5 w-3.5"
              />
              <span className="text-xs text-foreground">{DAY_LABELS[day]}</span>
            </label>
          ))}
        </div>
        {editDays.length === 0 && (
          <p className="text-[10px] text-red-500 mt-1">
            Select at least one day.
          </p>
        )}
      </div>

      {/* Start / End hours + Efficiency */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Start
          </p>
          <Select
            value={String(editStartHour)}
            onValueChange={(v) => setEditStartHour(Number(v))}
          >
            <SelectTrigger size="sm" className="w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {START_HOUR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            End
          </p>
          <Select
            value={String(editEndHour)}
            onValueChange={(v) => setEditEndHour(Number(v))}
          >
            <SelectTrigger size="sm" className="w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {END_HOUR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Efficiency
          </p>
          <Select
            value={String(editEfficiency)}
            onValueChange={(v) => setEditEfficiency(Number(v))}
          >
            <SelectTrigger size="sm" className="w-36 text-xs">
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

      {/* Save / Cancel */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || editDays.length === 0}
          className="h-7 text-xs px-3"
        >
          <Check className="w-3 h-3 mr-1" />
          {saving ? "Saving\u2026" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          disabled={saving}
          className="h-7 text-xs px-3"
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
