export const MRO_ROLES = [
  "admin",
  "shop_manager",
  "qcm_inspector",
  "billing_manager",
  "lead_technician",
  "technician",
  "parts_clerk",
  "read_only",
] as const;

export type MroRole = (typeof MRO_ROLES)[number];

export type PermissionCategory =
  | "billing"
  | "parts"
  | "fleet"
  | "work_orders"
  | "compliance"
  | "personnel"
  | "scheduling"
  | "settings"
  | "reports";

export type PermissionAction = "view" | "create" | "update" | "delete" | "approve" | "manage" | "*";
export type Permission = `${PermissionCategory}.${PermissionAction}`;

type PermissionPattern = Permission | `${PermissionCategory}.*` | "*";

export const ROLE_DISPLAY_NAMES: Record<MroRole, string> = {
  admin: "Administrator",
  shop_manager: "Shop Manager",
  qcm_inspector: "QCM Inspector",
  billing_manager: "Billing Manager",
  lead_technician: "Lead Technician",
  technician: "Technician",
  parts_clerk: "Parts Clerk",
  read_only: "Read Only",
};

export const ROLE_DESCRIPTIONS: Record<MroRole, string> = {
  admin: "Full platform access and control.",
  shop_manager: "Operational control of shop execution and staffing.",
  qcm_inspector: "Inspection and compliance oversight authority.",
  billing_manager: "Billing, quotes, invoicing, and AR ownership.",
  lead_technician: "Leads execution and coordination of technical work.",
  technician: "Performs assigned work and updates task progress.",
  parts_clerk: "Inventory, receiving, and parts logistics ownership.",
  read_only: "Read-only visibility across all modules.",
};

export const ROLE_BADGE_COLORS: Record<MroRole, string> = {
  admin: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  shop_manager: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  qcm_inspector: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  billing_manager: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  lead_technician: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  technician: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  parts_clerk: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  read_only: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const ROLE_PERMISSIONS: Record<MroRole, PermissionPattern[]> = {
  admin: ["*"],
  shop_manager: [
    "work_orders.*",
    "fleet.*",
    "parts.*",
    "personnel.*",
    "scheduling.*",
    "reports.*",
    "billing.view",
    "billing.approve",
    "compliance.view",
    "settings.view",
  ],
  qcm_inspector: [
    "compliance.*",
    "work_orders.view",
    "work_orders.approve",
    "fleet.view",
    "reports.view",
  ],
  billing_manager: [
    "billing.*",
    "reports.*",
    "work_orders.view",
    "fleet.view",
    "parts.view",
  ],
  lead_technician: [
    "work_orders.view",
    "work_orders.update",
    "work_orders.approve",
    "parts.view",
    "parts.update",
    "fleet.view",
    "scheduling.view",
    "compliance.view",
    "reports.view",
  ],
  technician: [
    "work_orders.view",
    "work_orders.update",
    "parts.view",
    "fleet.view",
    "scheduling.view",
    "compliance.view",
  ],
  parts_clerk: [
    "parts.*",
    "work_orders.view",
    "fleet.view",
    "reports.view",
  ],
  read_only: [
    "billing.view",
    "parts.view",
    "fleet.view",
    "work_orders.view",
    "compliance.view",
    "personnel.view",
    "scheduling.view",
    "settings.view",
    "reports.view",
  ],
};

const ROUTE_PERMISSION_MAP: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/billing", permission: "billing.view" },
  { prefix: "/parts", permission: "parts.view" },
  { prefix: "/fleet", permission: "fleet.view" },
  { prefix: "/work-orders", permission: "work_orders.view" },
  { prefix: "/my-work", permission: "work_orders.view" },
  { prefix: "/compliance", permission: "compliance.view" },
  { prefix: "/personnel", permission: "personnel.view" },
  { prefix: "/scheduling", permission: "scheduling.view" },
  { prefix: "/settings", permission: "settings.view" },
  { prefix: "/reports", permission: "reports.view" },
  { prefix: "/dashboard", permission: "reports.view" },
];

function normalizeRole(role: string | null | undefined): MroRole {
  return (MRO_ROLES as readonly string[]).includes(role ?? "")
    ? (role as MroRole)
    : "read_only";
}

export function getPermissions(role: string): string[] {
  const normalizedRole = normalizeRole(role);
  return [...ROLE_PERMISSIONS[normalizedRole]];
}

export function hasPermission(role: string, permission: string): boolean {
  const normalizedRole = normalizeRole(role);
  const grants = ROLE_PERMISSIONS[normalizedRole];

  if (grants.includes("*")) return true;
  if (grants.includes(permission as PermissionPattern)) return true;

  const [category] = permission.split(".");
  if (!category) return false;

  return grants.includes(`${category}.*` as PermissionPattern);
}

export function canAccessRoute(role: string, route: string): boolean {
  if (!route || route === "/") return true;

  const match = ROUTE_PERMISSION_MAP
    .slice()
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((entry) => route.startsWith(entry.prefix));

  if (!match) return true;
  return hasPermission(role, match.permission);
}
