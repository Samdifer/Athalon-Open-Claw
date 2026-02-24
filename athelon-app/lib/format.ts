/**
 * lib/format.ts — Shared date/time formatting utilities for Athelon.
 *
 * Uses Intl.DateTimeFormat with a fixed locale and explicit options to ensure
 * consistent output regardless of the user's system locale. All dates are
 * rendered in the browser's local time zone (no UTC forcing) so that
 * maintenance event times align with the technician's wall clock.
 *
 * Formatters are module-level singletons to avoid repeated object construction
 * on every render call.
 *
 * TD-013 fix — Team A debt remediation 2026-02-24.
 */

// ─── Module-level formatter instances ────────────────────────────────────────

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// ─── Exported utilities ───────────────────────────────────────────────────────

/**
 * Format a Unix timestamp (ms) as a short date string.
 *
 * @example formatDate(1740355200000) → "Feb 24, 2026"
 */
export function formatDate(ms: number): string {
  return DATE_FORMATTER.format(new Date(ms));
}

/**
 * Format a Unix timestamp (ms) as a date + time string.
 *
 * @example formatDateTime(1740355200000) → "Feb 24, 2026, 02:30 AM"
 */
export function formatDateTime(ms: number): string {
  return DATETIME_FORMATTER.format(new Date(ms));
}

/**
 * Format a Unix timestamp (ms) as a human-readable relative day label.
 * Uses midnight-to-midnight calendar day comparisons, not 24h rolling windows.
 *
 * @example
 *   formatRelativeDay(todayMs)       → "Today"
 *   formatRelativeDay(yesterdayMs)   → "Yesterday"
 *   formatRelativeDay(threeDaysAgo)  → "3 days ago"
 *   formatRelativeDay(tomorrowMs)    → "Tomorrow"
 *   formatRelativeDay(inFiveDays)    → "In 5 days"
 */
export function formatRelativeDay(ms: number): string {
  const now = new Date();
  const target = new Date(ms);

  // Normalise both to midnight in local time for calendar-day comparison
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );

  const diffMs = nowMidnight.getTime() - targetMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1) return `${diffDays} days ago`;

  // Future dates
  const futureDays = Math.abs(diffDays);
  if (futureDays === 1) return "Tomorrow";
  return `In ${futureDays} days`;
}
