/**
 * lib/mro-constants.ts — Shared MRO display constants for Athelon.
 *
 * Single source of truth for WO/task status labels, Tailwind badge styles,
 * work order type lists, and priority options. Previously duplicated inline
 * across work-orders/page.tsx, work-orders/[id]/page.tsx, work-orders/new/page.tsx,
 * and work-orders/[id]/tasks/[cardId]/page.tsx.
 *
 * TD-004 + TD-008 fix — Team A debt remediation 2026-02-24.
 */

// ─── Domain string-literal union types ───────────────────────────────────────
// Derived from convex/schema.ts workOrderStatus / workOrderType / taskCard.status.
// These are duplicated here (rather than imported from schema validators) because
// schema validators are Convex server-side objects — they cannot be tree-shaken
// out of client bundles. These plain TS types carry zero runtime cost.

export type WoStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "on_hold"
  | "pending_inspection"
  | "pending_signoff"
  | "open_discrepancies"
  | "closed"
  | "cancelled"
  | "voided";

export type WoType =
  | "routine"
  | "unscheduled"
  | "annual_inspection"
  | "100hr_inspection"
  | "progressive_inspection"
  | "ad_compliance"
  | "major_repair"
  | "major_alteration"
  | "field_approval"
  | "ferry_permit";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "incomplete_na_steps"
  | "complete"
  | "voided";

// ─── MRO role definitions ────────────────────────────────────────────────────

export const MRO_ROLES = [
  "admin",
  "shop_manager",
  "qcm_inspector",
  "billing_manager",
  "lead_technician",
  "technician",
  "parts_clerk",
  "sales_rep",
  "sales_manager",
  "read_only",
] as const;

export type MroRole = typeof MRO_ROLES[number];

export const ROLE_LABELS: Record<MroRole, string> = {
  admin: "Administrator",
  shop_manager: "Shop Manager",
  qcm_inspector: "QCM Inspector",
  billing_manager: "Billing Manager",
  lead_technician: "Lead Technician",
  technician: "Technician",
  parts_clerk: "Parts Clerk",
  sales_rep: "Sales Representative",
  sales_manager: "Sales Manager",
  read_only: "Read Only",
};

export const ROLE_DESCRIPTIONS: Record<MroRole, string> = {
  admin: "Full system access across all modules and settings.",
  shop_manager: "Oversees shop operations, staffing, and work order flow.",
  qcm_inspector: "Manages quality control inspections and compliance signoff.",
  billing_manager: "Handles quotes, invoicing, and billing workflows.",
  lead_technician: "Leads execution teams and coordinates technical work.",
  technician: "Performs assigned maintenance tasks and record sign-offs.",
  parts_clerk: "Manages parts receiving, inventory, and issue control.",
  sales_rep: "Owns quoting pipeline and customer sales execution.",
  sales_manager: "Leads sales execution, pricing strategy, and deal ownership.",
  read_only: "View-only access for oversight without edit permissions.",
};

export const ROLE_BADGE_STYLES: Record<MroRole, string> = {
  admin: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  shop_manager: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  qcm_inspector: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  billing_manager: "bg-green-500/15 text-green-400 border-green-500/30",
  lead_technician: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  technician: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  parts_clerk: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  sales_rep: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  sales_manager: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  read_only: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

export const ROLE_HIERARCHY: Record<MroRole, number> = {
  admin: 0,
  shop_manager: 1,
  qcm_inspector: 2,
  billing_manager: 3,
  lead_technician: 4,
  technician: 5,
  parts_clerk: 6,
  sales_rep: 7,
  sales_manager: 8,
  read_only: 9,
};

// ─── Work Order status → display label ───────────────────────────────────────

export const WO_STATUS_LABEL: Record<WoStatus, string> = {
  draft: "Draft",
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  pending_inspection: "Pending Inspection",
  pending_signoff: "Pending Sign-Off",
  open_discrepancies: "Open Discrepancies",
  closed: "Closed",
  cancelled: "Cancelled",
  voided: "Voided",
};

// ─── Work Order type → display label ─────────────────────────────────────────

export const WO_TYPE_LABEL: Record<WoType, string> = {
  routine: "Routine",
  unscheduled: "Unscheduled",
  annual_inspection: "Annual Inspection",
  "100hr_inspection": "100-Hour Inspection",
  progressive_inspection: "Progressive Inspection",
  ad_compliance: "AD Compliance",
  major_repair: "Major Repair",
  major_alteration: "Major Alteration",
  field_approval: "Field Approval",
  ferry_permit: "Ferry Permit",
};

// ─── Task card status → display label ────────────────────────────────────────

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  incomplete_na_steps: "Needs IA Review",
  complete: "Complete",
  voided: "Voided",
};

// ─── Work Order status → Tailwind badge class string ─────────────────────────
// Applied to <Badge variant="outline" className={`... ${WO_STATUS_STYLES[status]}`} />.
// Fallback: "bg-muted text-muted-foreground" (handle unknown statuses at runtime).

export const WO_STATUS_STYLES: Record<WoStatus, string> = {
  draft: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  on_hold: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  pending_inspection: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pending_signoff: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  open_discrepancies: "bg-red-500/15 text-red-400 border-red-500/30",
  closed: "bg-green-500/15 text-green-400 border-green-500/30",
  cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  voided: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

// ─── Task card status → Tailwind badge class string ──────────────────────────

export const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  not_started: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  in_progress: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  incomplete_na_steps: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  complete: "bg-green-500/15 text-green-400 border-green-500/30",
  voided: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

// ─── WO Types list — for <Select> dropdowns ───────────────────────────────────

export const WO_TYPES: ReadonlyArray<{ value: WoType; label: string }> = [
  { value: "routine", label: "Routine Maintenance" },
  { value: "unscheduled", label: "Unscheduled Maintenance" },
  { value: "annual_inspection", label: "Annual Inspection" },
  { value: "100hr_inspection", label: "100-Hour Inspection" },
  { value: "progressive_inspection", label: "Progressive Inspection" },
  { value: "ad_compliance", label: "AD Compliance" },
  { value: "major_repair", label: "Major Repair" },
  { value: "major_alteration", label: "Major Alteration" },
  { value: "field_approval", label: "Field Approval" },
  { value: "ferry_permit", label: "Ferry Permit" },
];

// ─── Priority options — for priority selector UI ─────────────────────────────

export type WoPriority = "routine" | "urgent" | "aog";

export const PRIORITY_OPTIONS: ReadonlyArray<{
  value: WoPriority;
  label: string;
  description: string;
  color: string;
}> = [
  {
    value: "routine",
    label: "Routine",
    description: "Standard scheduling",
    color: "text-muted-foreground",
  },
  {
    value: "urgent",
    label: "Urgent",
    description: "Expedited — complete within 24–48h",
    color: "text-orange-400",
  },
  {
    value: "aog",
    label: "AOG — Aircraft on Ground",
    description: "Highest priority — aircraft grounded",
    color: "text-red-400",
  },
];
