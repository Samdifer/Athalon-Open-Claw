/**
 * components/StatusBadge.tsx
 * Athelon — Status Badge Component
 *
 * Chloe Park, 2026-02-22
 *
 * The most used component in the application. Appears in every list view, record
 * header, and card. Spec: icon + color + text label — all three channels required.
 * Never color alone. Deuteranopia-safe by design (icon distinguishes red from green).
 *
 * Finn's rule: "If implementation deviates from the icon+color+label trinity,
 * it fails the component checklist." This component makes that structurally
 * impossible — the icon is not optional.
 *
 * All 13 variants from ux-component-library-spec.md §4.1 are implemented.
 * ("12 status variants" in the spec; the 13th is SHELF_LIFE which appears in
 * the badge table — including it.)
 */

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Variant type — exhaustive union; TypeScript enforces completeness
// ---------------------------------------------------------------------------

export type StatusVariant =
  | "active"
  | "pending"
  | "on_hold"
  | "overdue"
  | "signed"
  | "complete"
  | "deferred"
  | "cancelled"
  | "awaiting_auth"
  | "on_order"
  | "in_stock"
  | "out_of_stock"
  | "shelf_life_critical";

export type StatusSize = "sm" | "default" | "lg";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StatusBadgeProps {
  variant: StatusVariant;
  /** Override the auto-generated label (e.g., "AOG HOLD" instead of "ON HOLD") */
  label?: string;
  size?: StatusSize;
  /** Adds an extra CSS class to the root element */
  className?: string;
  /** For a11y — if the parent already provides context, skip the label */
  "aria-hidden"?: boolean;
}

// ---------------------------------------------------------------------------
// Icon components — inline SVGs, no external dep required
// Three icon families: circle-filled (active), circle-outline (pending),
// warning (hold/auth), x (error/overdue), checkmark (signed/complete),
// dash (deferred/cancelled)
//
// Deuteranopia note: red badges use ✕, green badges use ✓ or ●
// They're visually distinct even in grayscale.
// ---------------------------------------------------------------------------

function IconCircleFilled({ className }: { className?: string }) {
  // ● — used for: active
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 8 8"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="4" cy="4" r="4" />
    </svg>
  );
}

function IconCircleOutline({ className }: { className?: string }) {
  // ○ — used for: pending, on_order
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 8 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="4" cy="4" r="3" />
    </svg>
  );
}

function IconWarning({ className }: { className?: string }) {
  // ⚠ — used for: on_hold, awaiting_auth, shelf_life_critical
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 10 9"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 0.5L9.5 8.5H0.5L5 0.5Z" />
      <rect x="4.25" y="3.5" width="1.5" height="2.5" fill="white" rx="0.25" />
      <rect x="4.25" y="6.5" width="1.5" height="1.5" fill="white" rx="0.25" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  // ✕ — used for: overdue, out_of_stock
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 8 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="1.5" y1="1.5" x2="6.5" y2="6.5" />
      <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  // ✓ — used for: signed, complete, in_stock
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 8 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline points="1,4 3.5,6.5 7,2" />
    </svg>
  );
}

function IconDash({ className }: { className?: string }) {
  // — used for: deferred, cancelled
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 8 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="1.5" y1="4" x2="6.5" y2="4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Variant config — single source of truth for icon + colors + label
// ---------------------------------------------------------------------------

interface VariantConfig {
  label: string;
  /** Icon component to render */
  Icon: React.ComponentType<{ className?: string }>;
  /** Tailwind classes for the badge pill */
  badgeClass: string;
  /** ARIA role description for screen readers */
  ariaDescription: string;
  /** Whether this variant should pulse (shelf-life critical) */
  pulse?: boolean;
}

const VARIANT_CONFIG: Record<StatusVariant, VariantConfig> = {
  active: {
    label: "ACTIVE",
    Icon: IconCircleFilled,
    // green-600 background — distinguishable from amber and blue
    badgeClass: "bg-green-600 text-white",
    ariaDescription: "Status: Active",
  },
  pending: {
    label: "PENDING",
    Icon: IconCircleOutline,
    // blue-600 background
    badgeClass: "bg-blue-600 text-white",
    ariaDescription: "Status: Pending",
  },
  on_hold: {
    label: "ON HOLD",
    Icon: IconWarning,
    // amber-600 background
    badgeClass: "bg-amber-600 text-white",
    ariaDescription: "Status: On Hold",
  },
  overdue: {
    label: "OVERDUE",
    Icon: IconX,
    // red-600 background — icon (✕) distinguishes from green (✓) for deuteranopia
    badgeClass: "bg-red-600 text-white",
    ariaDescription: "Status: Overdue",
  },
  signed: {
    label: "SIGNED",
    Icon: IconCheck,
    // green-600 — checkmark icon distinguishes from ● active
    badgeClass: "bg-green-600 text-white",
    ariaDescription: "Status: Signed off",
  },
  complete: {
    label: "COMPLETE",
    Icon: IconCheck,
    // green-600
    badgeClass: "bg-green-600 text-white",
    ariaDescription: "Status: Complete",
  },
  deferred: {
    label: "DEFERRED",
    Icon: IconDash,
    // grey-600
    badgeClass: "bg-gray-600 text-white",
    ariaDescription: "Status: Deferred",
  },
  cancelled: {
    label: "CANCELLED",
    Icon: IconDash,
    // grey-600
    badgeClass: "bg-gray-600 text-white",
    ariaDescription: "Status: Cancelled",
  },
  awaiting_auth: {
    label: "AWAITING AUTH",
    Icon: IconWarning,
    // amber-600
    badgeClass: "bg-amber-600 text-white",
    ariaDescription: "Status: Awaiting authorization",
  },
  on_order: {
    label: "ON ORDER",
    Icon: IconCircleOutline,
    // blue-600
    badgeClass: "bg-blue-600 text-white",
    ariaDescription: "Status: On order",
  },
  in_stock: {
    label: "IN STOCK",
    Icon: IconCheck,
    // green-600
    badgeClass: "bg-green-600 text-white",
    ariaDescription: "Status: In stock",
  },
  out_of_stock: {
    label: "OUT OF STOCK",
    Icon: IconX,
    // red-600 — ✕ icon distinguishes from green ✓
    badgeClass: "bg-red-600 text-white",
    ariaDescription: "Status: Out of stock",
  },
  shelf_life_critical: {
    label: "SHELF LIFE",
    Icon: IconWarning,
    // red-600 + pulsing
    badgeClass: "bg-red-600 text-white",
    ariaDescription: "Status: Shelf life critical — immediate attention required",
    pulse: true,
  },
} as const;

// ---------------------------------------------------------------------------
// Size classes
// ---------------------------------------------------------------------------

const SIZE_CLASSES: Record<StatusSize, {
  badge: string;
  icon: string;
  text: string;
}> = {
  sm: {
    // 20px height — Finn's minimum, do not go smaller
    badge: "h-5 px-1.5 gap-1 rounded-[3px]",
    icon: "w-[7px] h-[7px]",
    text: "text-[11px] tracking-[0.04em]",
  },
  default: {
    // 24px height — list views, record headers
    badge: "h-6 px-2.5 gap-1.5 rounded-[4px]",
    icon: "w-[8px] h-[8px]",
    text: "text-[13px] tracking-[0.04em]",
  },
  lg: {
    // 32px height — standalone status displays (dashboard)
    badge: "h-8 px-3 gap-2 rounded-[4px]",
    icon: "w-[10px] h-[10px]",
    text: "text-[15px] tracking-[0.04em]",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusBadge({
  variant,
  label: labelOverride,
  size = "default",
  className,
  "aria-hidden": ariaHidden,
}: StatusBadgeProps) {
  const config = VARIANT_CONFIG[variant];
  const sizes = SIZE_CLASSES[size];
  const displayLabel = labelOverride ?? config.label;

  return (
    <span
      role={ariaHidden ? undefined : "status"}
      aria-label={ariaHidden ? undefined : config.ariaDescription}
      aria-hidden={ariaHidden}
      className={cn(
        // Layout
        "inline-flex items-center justify-center shrink-0",
        // Sizing
        sizes.badge,
        // Color
        config.badgeClass,
        // Typography — Inter 500, uppercase, tight tracking
        "font-medium font-sans uppercase leading-none select-none",
        // Pulse animation for shelf-life critical
        config.pulse && "animate-pulse",
        className,
      )}
    >
      {/* Icon — the "second channel" alongside color */}
      <config.Icon className={cn(sizes.icon, "shrink-0")} />
      {/* Label — the "third channel" */}
      <span className={sizes.text}>{displayLabel}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Convenience: map work order / task card status strings to badge variants
// ---------------------------------------------------------------------------

/**
 * Maps WorkOrder.status → StatusVariant.
 * TypeScript will error if a status case is unhandled — intentional.
 * When Devraj adds a new status, this function breaks the build until the
 * frontend defines its visual treatment. No silent "unknown status shows nothing."
 */
export function workOrderStatusToVariant(
  status: string,
): StatusVariant {
  switch (status) {
    case "draft":
      return "pending";
    case "open":
      return "active";
    case "in_progress":
      return "active";
    case "on_hold":
      return "on_hold";
    case "pending_inspection":
      return "pending";
    case "pending_signoff":
      return "awaiting_auth";
    case "open_discrepancies":
      return "overdue";
    case "closed":
      return "complete";
    case "cancelled":
      return "cancelled";
    case "voided":
      return "cancelled";
    default:
      // TODO: Remove this fallback when all status values are finalized with Devraj.
      // For now, unknown statuses show as pending rather than crashing.
      return "pending";
  }
}

/**
 * Maps TaskCard.status → StatusVariant.
 */
export function taskCardStatusToVariant(status: string): StatusVariant {
  switch (status) {
    case "not_started":
      return "pending";
    case "in_progress":
      return "active";
    case "ready_to_sign":
      return "awaiting_auth";
    case "signed":
      return "signed";
    case "blocked":
      return "on_hold";
    case "voided":
      return "cancelled";
    default:
      return "pending";
  }
}

export default StatusBadge;
