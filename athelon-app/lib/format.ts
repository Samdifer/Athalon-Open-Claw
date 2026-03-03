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

// UTC-pinned formatter for date-only fields stored as UTC midnight timestamps.
// Use this (not DATE_FORMATTER) for fields like completionDate, scheduledDate,
// and other calendar-day-only values where the stored timestamp is always
// UTC midnight and local-timezone offset would produce the wrong calendar day.
const DATE_FORMATTER_UTC = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
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
 * Format a Unix timestamp (ms) as a short date string (local timezone).
 * Use for event timestamps that include time-of-day context (e.g. clock-in, created_at).
 *
 * @example formatDate(1740355200000) → "Feb 24, 2026"
 */
export function formatDate(ms: number): string {
  return DATE_FORMATTER.format(new Date(ms));
}

/**
 * Format a Unix timestamp (ms) as a short date string, always in UTC.
 * Use for date-only fields stored as UTC midnight (e.g. completionDate, scheduledDate,
 * certExpiry). Prevents off-by-one-day display errors in UTC-negative timezones.
 *
 * @example formatDateUTC(1740355200000) → "Feb 24, 2026"
 */
export function formatDateUTC(ms: number): string {
  return DATE_FORMATTER_UTC.format(new Date(ms));
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

// ─── Currency formatting ──────────────────────────────────────────────────────

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Format a numeric amount with a currency symbol.
 *
 * @example formatCurrency(1234.5, "USD") → "$1,234.50"
 * @example formatCurrency(1234.5, "EUR") → "€1,234.50"
 * @example formatCurrency(1234.5)        → "$1,234.50"  (defaults to USD)
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  const code = currency.toUpperCase();
  let formatter = currencyFormatterCache.get(code);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      // Fallback for unknown currency codes
      formatter = new Intl.NumberFormat("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    currencyFormatterCache.set(code, formatter);
  }
  return formatter.format(amount);
}

/**
 * Common currency options for selectors.
 */
export const CURRENCY_OPTIONS = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "MXN", label: "Mexican Peso", symbol: "MX$" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
] as const;
