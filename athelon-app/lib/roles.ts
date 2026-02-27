// lib/roles.ts — MRO Role Definitions & Permissions

export const MRO_ROLES = {
  admin: { label: "Administrator", description: "Full access to all features", level: 100 },
  shop_manager: { label: "Shop Manager", description: "Manage work orders, personnel, scheduling", level: 80 },
  qcm_inspector: { label: "QCM / Inspector", description: "Quality control, inspections, compliance", level: 70 },
  billing_manager: { label: "Billing Manager", description: "Invoices, quotes, POs, financial reports", level: 60 },
  lead_technician: { label: "Lead Technician", description: "Execute work, sign off steps, manage task cards", level: 50 },
  technician: { label: "Technician", description: "Execute assigned work, sign off own steps", level: 30 },
  parts_clerk: { label: "Parts Clerk", description: "Parts inventory, receiving, requests", level: 20 },
  read_only: { label: "Read Only", description: "View all data, no modifications", level: 10 },
} as const;

export type MRORole = keyof typeof MRO_ROLES;

/** Nav section keys used by sidebar */
export type NavSection =
  | "dashboard"
  | "fleet"
  | "work-orders"
  | "scheduling"
  | "parts"
  | "billing"
  | "compliance"
  | "squawks"
  | "personnel"
  | "my-work"
  | "customers"
  | "reports"
  | "settings";

/** Which nav sections each role can see */
export const ROLE_NAV_ACCESS: Record<MRORole, NavSection[]> = {
  admin: [
    "dashboard", "fleet", "work-orders", "scheduling", "parts",
    "billing", "compliance", "squawks", "personnel", "my-work",
    "customers", "reports", "settings",
  ],
  shop_manager: [
    "dashboard", "fleet", "work-orders", "scheduling", "parts",
    "billing", "compliance", "squawks", "personnel", "my-work",
    "customers", "reports", "settings",
  ],
  qcm_inspector: [
    "dashboard", "work-orders", "compliance", "fleet", "squawks",
  ],
  billing_manager: [
    "dashboard", "billing", "customers", "reports",
  ],
  lead_technician: [
    "dashboard", "my-work", "work-orders", "parts", "squawks",
  ],
  technician: [
    "dashboard", "my-work", "work-orders", "parts", "squawks",
  ],
  parts_clerk: [
    "dashboard", "parts", "work-orders",
  ],
  read_only: [
    "dashboard", "fleet", "work-orders", "scheduling", "parts",
    "billing", "compliance", "squawks", "personnel", "my-work",
    "customers", "reports",
  ],
};

/** Check if a role can see a given nav section */
export function canAccessNav(role: MRORole | undefined, section: NavSection): boolean {
  if (!role) return true; // No role assigned = show everything (legacy/migration)
  return ROLE_NAV_ACCESS[role].includes(section);
}
