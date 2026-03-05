// Shared time-tracking utility functions used by My Time, Lead Time Management,
// billing time-clock, and billing time-approval pages.

export type TimerContextType = "shop" | "work_order" | "task" | "step";

export function formatDuration(minutes: number | undefined): string {
  if (minutes === undefined) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 6)}…` : value;
}

export function getOpenEntryElapsedMinutes(entry: {
  clockInAt: number;
  totalPausedMinutes?: number;
  pausedAt?: number;
}): number {
  const now = Date.now();
  const elapsedMs = now - entry.clockInAt;
  const accruedPauseMs = (entry.totalPausedMinutes ?? 0) * 60_000;
  const activePauseMs = entry.pausedAt ? Math.max(0, now - entry.pausedAt) : 0;
  const activeMs = Math.max(0, elapsedMs - accruedPauseMs - activePauseMs);
  return Math.round(activeMs / 60_000);
}

/** Returns active elapsed time in milliseconds (no rounding) for live count-up displays. */
export function getOpenEntryElapsedMs(entry: {
  clockInAt: number;
  totalPausedMinutes?: number;
  pausedAt?: number;
}): number {
  const now = Date.now();
  const elapsedMs = now - entry.clockInAt;
  const accruedPauseMs = (entry.totalPausedMinutes ?? 0) * 60_000;
  const activePauseMs = entry.pausedAt ? Math.max(0, now - entry.pausedAt) : 0;
  return Math.max(0, elapsedMs - accruedPauseMs - activePauseMs);
}

/** Formats milliseconds as "1h 23m 45s" or "23m 45s" or "0m 12s". */
export function formatDurationWithSeconds(ms: number): string {
  const totalSeconds = Math.floor(ms / 1_000);
  const h = Math.floor(totalSeconds / 3_600);
  const m = Math.floor((totalSeconds % 3_600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export function normalizeApprovalStatus(entry: {
  approvalStatus?: string;
  approved?: boolean;
}): "pending" | "approved" | "rejected" {
  if (entry.approvalStatus === "approved" || entry.approved === true) return "approved";
  if (entry.approvalStatus === "rejected" || entry.approved === false) return "rejected";
  return "pending";
}

/** Returns the Monday 00:00:00 of the week containing the given timestamp. */
export function getWeekStart(ts: number): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
  d.setDate(d.getDate() - diff);
  return d;
}

/** Day-of-week labels starting from Monday. */
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const DAILY_THRESHOLD_MINUTES = 8 * 60;
export const WEEKLY_THRESHOLD_MINUTES = 40 * 60;

export function getOvertimeStatus(
  dailyMinutes: number,
  weeklyMinutes: number,
): "normal" | "approaching" | "exceeded" {
  if (weeklyMinutes >= WEEKLY_THRESHOLD_MINUTES || dailyMinutes >= DAILY_THRESHOLD_MINUTES)
    return "exceeded";
  if (
    weeklyMinutes >= WEEKLY_THRESHOLD_MINUTES * 0.9 ||
    dailyMinutes >= DAILY_THRESHOLD_MINUTES * 0.9
  )
    return "approaching";
  return "normal";
}
