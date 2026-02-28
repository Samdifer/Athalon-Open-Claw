"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users, ShieldAlert, AlertTriangle, ExternalLink, Pencil, X, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "convex/react";
import { useOrganization } from "@clerk/clerk-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadge(role: string): string {
  const map: Record<string, string> = {
    dom: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    inspector: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    amt: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
    supervisor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    active: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    inactive: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
  };
  return map[role] ?? "bg-muted text-muted-foreground border-border/30";
}

const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun display order

function formatHour(hour: number): string {
  if (hour === 12) return "12pm";
  if (hour > 12) return `${hour - 12}pm`;
  if (hour === 0) return "12am";
  return `${hour}am`;
}

function formatDayRange(days: number[]): string {
  if (days.length === 0) return "No days";

  const sorted = [...days].sort((a, b) => {
    // Sort Mon-Sun (1-6 then 0)
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.indexOf(a) - order.indexOf(b);
  });

  // Check for common ranges
  const monFri = [1, 2, 3, 4, 5];
  const monSat = [1, 2, 3, 4, 5, 6];
  const arrStr = sorted.join(",");

  if (arrStr === monFri.join(",")) return "Mon–Fri";
  if (arrStr === monSat.join(",")) return "Mon–Sat";
  if (arrStr === [1, 2, 3, 4, 5, 6, 0].join(",")) return "Mon–Sun";

  // Try to detect contiguous ranges
  const labels = sorted.map((d) => DAY_LABELS[d] ?? String(d));
  return labels.join(", ");
}

// ─── Workload entry type ───────────────────────────────────────────────────────

interface WorkloadEntry {
  technicianId: string;
  name: string;
  employeeId?: string;
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
  usingDefaultShift: boolean;
  assignedActiveCards: number;
  estimatedRemainingHours: number;
}

// ─── Shift Editor ─────────────────────────────────────────────────────────────

const START_HOUR_OPTIONS = [
  { value: 6, label: "6am" },
  { value: 7, label: "7am" },
  { value: 8, label: "8am" },
  { value: 9, label: "9am" },
];

const END_HOUR_OPTIONS = [
  { value: 15, label: "3pm" },
  { value: 16, label: "4pm" },
  { value: 17, label: "5pm" },
  { value: 18, label: "6pm" },
];

const EFFICIENCY_OPTIONS = [
  { value: 0.7, label: "70%" },
  { value: 0.8, label: "80%" },
  { value: 0.9, label: "90%" },
  { value: 1.0, label: "100% (standard)" },
  { value: 1.1, label: "110%" },
  { value: 1.2, label: "120%" },
  { value: 1.3, label: "130%" },
  { value: 1.4, label: "140%" },
];

interface ShiftEditorProps {
  technicianId: Id<"technicians">;
  orgId: Id<"organizations">;
  initial: WorkloadEntry;
  onClose: () => void;
}

function ShiftEditor({ technicianId, orgId, initial, onClose }: ShiftEditorProps) {
  const [editDays, setEditDays] = useState<number[]>(initial.daysOfWeek);
  const [editStartHour, setEditStartHour] = useState<number>(initial.startHour);
  const [editEndHour, setEditEndHour] = useState<number>(initial.endHour);
  const [editEfficiency, setEditEfficiency] = useState<number>(initial.efficiencyMultiplier);
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
          <p className="text-[10px] text-red-500 mt-1">Select at least one day.</p>
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
          {saving ? "Saving…" : "Save"}
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PersonnelSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PersonnelPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id as Id<"organizations"> | undefined;

  const [editingTechId, setEditingTechId] = useState<string | null>(null);

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  // Certs expiring within 30 days
  const expiringCerts = useQuery(
    api.technicians.listWithExpiringCerts,
    orgId ? { organizationId: orgId, withinDays: 30 } : "skip",
  );

  // Workload + shift data for all active techs
  const workloadList = useQuery(
    api.capacity.getTechnicianWorkload,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isLoading = technicians === undefined;

  // Build a set of technicianIds with expiring certs for quick lookup
  const expiringTechIds = new Set(
    (expiringCerts ?? []).map((e) => e.technician?._id).filter(Boolean),
  );

  // Build a map of technicianId → cert expiry info for display
  const expiringCertMap = new Map(
    (expiringCerts ?? []).map((e) => [
      e.technician?._id,
      {
        iaExpiryDate: e.cert.iaExpiryDate,
        certNumber: e.cert.certificateNumber,
        daysUntilExpiry: e.cert.iaExpiryDate
          ? Math.ceil((e.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      },
    ]),
  );

  // Build a map of technicianId → workload entry
  const workloadMap = new Map<string, WorkloadEntry>(
    (workloadList ?? []).map((w) => [w.technicianId, w]),
  );

  const expiringCount = expiringTechIds.size;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          Personnel
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? (
            <Skeleton className="h-3 w-48 inline-block" />
          ) : (
            <>
              {technicians.length} team member
              {technicians.length !== 1 ? "s" : ""}
              {expiringCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {" "}
                  · {expiringCount} certificate
                  {expiringCount !== 1 ? "s" : ""} expiring soon
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* ── FEAT-018: IA Currency Expiry Banner ──────────────────────────────── */}
      {!isLoading && expiringCerts && expiringCerts.length > 0 && (() => {
        const hasExpired = expiringCerts.some(
          (e) =>
            e.cert.iaExpiryDate !== undefined &&
            e.cert.iaExpiryDate < Date.now(),
        );
        const hasCritical = expiringCerts.some(
          (e) =>
            e.cert.iaExpiryDate !== undefined &&
            Math.ceil((e.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24)) <= 14,
        );
        const bannerClass = hasExpired || hasCritical
          ? "border-red-500/40 bg-red-500/8"
          : "border-amber-500/40 bg-amber-500/8";
        const iconClass = hasExpired || hasCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400";
        const titleClass = hasExpired || hasCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400";

        return (
          <div
            className={`rounded-lg border p-4 space-y-3 ${bannerClass}`}
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${iconClass}`} />
              <span className={`text-sm font-semibold ${titleClass}`}>
                {hasExpired
                  ? "IA Certificate Expired — Immediate Action Required"
                  : "IA Certificate Expiry Alert"}
              </span>
            </div>
            <div className="space-y-2">
              {expiringCerts.map((e) => {
                const days = e.cert.iaExpiryDate !== undefined
                  ? Math.ceil((e.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                const isExp = days !== null && days <= 0;
                const isCrit = days !== null && days > 0 && days <= 14;
                const rowClass = isExp ? "text-red-600 dark:text-red-400" : isCrit ? "text-red-500 dark:text-red-300" : "text-amber-600 dark:text-amber-300";
                return (
                  <div
                    key={e.cert._id}
                    className={`flex items-center justify-between gap-4 text-xs ${rowClass}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-medium truncate">
                        {e.technician?.legalName ?? "Unknown Technician"}
                      </span>
                      {e.cert.certificateNumber && (
                        <span className="font-mono text-[10px] opacity-80">
                          #{e.cert.certificateNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-semibold">
                        {days === null
                          ? "No expiry date"
                          : isExp
                          ? `Expired ${Math.abs(days)}d ago`
                          : `${days}d remaining`}
                      </span>
                      <Link
                        to={`/settings/shop`}
                        className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 transition-opacity"
                      >
                        Take Action
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/70">
              Technicians with expired IA certificates may not perform inspection-level
              sign-offs. Per 14 CFR 65.93, renewal must be completed before the next
              inspection sign-off.
            </p>
          </div>
        );
      })()}

      {isLoading ? (
        <PersonnelSkeleton />
      ) : technicians.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No technicians found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {technicians.map((tech) => {
            const hasExpiringCert = expiringTechIds.has(tech._id);
            const certInfo = expiringCertMap.get(tech._id);
            const isCritical =
              certInfo?.daysUntilExpiry !== null &&
              certInfo?.daysUntilExpiry !== undefined &&
              certInfo.daysUntilExpiry <= 14;

            const workload = workloadMap.get(tech._id);
            const isEditing = editingTechId === tech._id;

            return (
              <Card
                key={tech._id}
                className={`border-border/60 ${
                  hasExpiringCert
                    ? isCritical
                      ? "border-l-4 border-l-red-500"
                      : "border-l-4 border-l-amber-500"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="text-xs font-semibold bg-muted">
                        {getInitials(tech.legalName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-sm text-foreground">
                          {tech.legalName}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] border ${getRoleBadge(tech.status)}`}
                        >
                          {tech.status}
                        </Badge>
                        {tech.employeeId && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            #{tech.employeeId}
                          </span>
                        )}
                      </div>

                      {hasExpiringCert && certInfo ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <ShieldAlert
                            className={`w-3 h-3 flex-shrink-0 ${isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
                          />
                          <span
                            className={`text-[11px] font-medium ${isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
                          >
                            IA cert expires in {certInfo.daysUntilExpiry}d
                            {certInfo.certNumber
                              ? ` (${certInfo.certNumber})`
                              : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 mt-0.5">
                          {tech.email && (
                            <span className="text-[11px] text-muted-foreground">
                              {tech.email}
                            </span>
                          )}
                          {tech.phone && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {tech.phone}
                              </span>
                            </>
                          )}
                          {!tech.email && !tech.phone && (
                            <span className="text-[11px] text-muted-foreground">
                              No contact info
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Shift summary row ─────────────────────────────────── */}
                  {workload && (
                    <div className="mt-2.5 pt-2.5 border-t border-border/40">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                          <span className="font-medium text-foreground/80">
                            {formatDayRange(workload.daysOfWeek)}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span>
                            {formatHour(workload.startHour)}–{formatHour(workload.endHour)}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span>
                            &times;{workload.efficiencyMultiplier.toFixed(1)}
                          </span>
                          {workload.usingDefaultShift && (
                            <span className="text-muted-foreground/60 italic">(default)</span>
                          )}
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-muted-foreground/70">
                            {workload.assignedActiveCards} card
                            {workload.assignedActiveCards !== 1 ? "s" : ""}
                            {" · "}
                            {workload.estimatedRemainingHours.toFixed(1)}h remaining
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setEditingTechId(isEditing ? null : tech._id)
                          }
                        >
                          {isEditing ? (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              Close
                            </>
                          ) : (
                            <>
                              <Pencil className="w-3 h-3 mr-1" />
                              Edit Shift
                            </>
                          )}
                        </Button>
                      </div>

                      {/* ── Inline shift editor ───────────────────────────── */}
                      {isEditing && orgId && (
                        <ShiftEditor
                          technicianId={tech._id as Id<"technicians">}
                          orgId={orgId}
                          initial={workload}
                          onClose={() => setEditingTechId(null)}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
