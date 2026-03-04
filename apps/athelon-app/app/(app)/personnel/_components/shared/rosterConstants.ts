// ─── Roster Constants & Helpers ──────────────────────────────────────────────
// Shared across Personnel Command components.

// ─── Workload entry type ────────────────────────────────────────────────────

export interface WorkloadEntry {
  technicianId: string;
  name: string;
  employeeId?: string;
  role?: string;
  teamId?: string;
  teamName?: string;
  teamColorToken?: string;
  shiftSource?: "technician_override" | "team_shift" | "org_default";
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
  usingDefaultShift: boolean;
  usingTeamShift?: boolean;
  assignedActiveCards: number;
  estimatedRemainingHours: number;
}

// ─── Day helpers ────────────────────────────────────────────────────────────

export const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

/** Mon–Sun display order */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

// ─── Formatting helpers ─────────────────────────────────────────────────────

export function formatHour(hour: number): string {
  if (hour === 12) return "12pm";
  if (hour > 12) return `${hour - 12}pm`;
  if (hour === 0) return "12am";
  return `${hour}am`;
}

export function formatDayRange(days: number[]): string {
  if (days.length === 0) return "No days";

  const sorted = [...days].sort((a, b) => {
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.indexOf(a) - order.indexOf(b);
  });

  const monFri = [1, 2, 3, 4, 5];
  const monSat = [1, 2, 3, 4, 5, 6];
  const arrStr = sorted.join(",");

  if (arrStr === monFri.join(",")) return "Mon–Fri";
  if (arrStr === monSat.join(",")) return "Mon–Sat";
  if (arrStr === [1, 2, 3, 4, 5, 6, 0].join(",")) return "Mon–Sun";

  const labels = sorted.map((d) => DAY_LABELS[d] ?? String(d));
  return labels.join(", ");
}

// ─── Name / role helpers ────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getRoleBadge(role: string): string {
  const map: Record<string, string> = {
    dom: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    inspector:
      "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    amt: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
    supervisor:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    active:
      "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    inactive:
      "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
  };
  return map[role] ?? "bg-muted text-muted-foreground border-border/30";
}

// ─── Team color tokens ──────────────────────────────────────────────────────

export const TEAM_COLORS = [
  { name: "Slate", class: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30" },
  { name: "Red", class: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  { name: "Amber", class: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { name: "Emerald", class: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  { name: "Cyan", class: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
  { name: "Blue", class: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  { name: "Violet", class: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" },
  { name: "Rose", class: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
] as const;

// ─── Dropdown option arrays ─────────────────────────────────────────────────

export const START_HOUR_OPTIONS = [
  { value: 6, label: "6am" },
  { value: 7, label: "7am" },
  { value: 8, label: "8am" },
  { value: 9, label: "9am" },
] as const;

export const END_HOUR_OPTIONS = [
  { value: 15, label: "3pm" },
  { value: 16, label: "4pm" },
  { value: 17, label: "5pm" },
  { value: 18, label: "6pm" },
] as const;

export const EFFICIENCY_OPTIONS = [
  { value: 0.7, label: "70%" },
  { value: 0.8, label: "80%" },
  { value: 0.9, label: "90%" },
  { value: 1.0, label: "100% (standard)" },
  { value: 1.1, label: "110%" },
  { value: 1.2, label: "120%" },
  { value: 1.3, label: "130%" },
  { value: 1.4, label: "140%" },
] as const;
