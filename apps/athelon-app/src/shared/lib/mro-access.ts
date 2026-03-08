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

export type MroRole = (typeof MRO_ROLES)[number];
export type MRORole = MroRole;

export const ACCESS_AUTHORIZATIONS = ["rii"] as const;

export type AccessAuthorization = (typeof ACCESS_AUTHORIZATIONS)[number];

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

export const ROLE_LEVELS: Record<MroRole, number> = {
  admin: 100,
  shop_manager: 80,
  qcm_inspector: 70,
  billing_manager: 60,
  lead_technician: 50,
  technician: 30,
  parts_clerk: 20,
  sales_rep: 25,
  sales_manager: 40,
  read_only: 10,
};

export const ROLE_HIERARCHY: Record<MroRole, number> = {
  admin: 0,
  shop_manager: 1,
  qcm_inspector: 2,
  billing_manager: 3,
  lead_technician: 4,
  sales_manager: 5,
  sales_rep: 6,
  technician: 7,
  parts_clerk: 8,
  read_only: 9,
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

export const ACCESS_AUTHORIZATION_LABELS: Record<AccessAuthorization, string> = {
  rii: "RII",
};

export const ACCESS_AUTHORIZATION_DESCRIPTIONS: Record<AccessAuthorization, string> = {
  rii: "Required Inspection Item authority for independent IA/RIII inspector sign-off.",
};

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

export type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "manage"
  | "*";

export type Permission = `${PermissionCategory}.${PermissionAction}`;
type PermissionPattern = Permission | `${PermissionCategory}.*` | "*";

export const ROLE_PERMISSION_GRANTS: Record<MroRole, PermissionPattern[]> = {
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
  sales_rep: [
    "billing.view",
    "billing.create",
    "billing.update",
    "fleet.view",
    "reports.view",
  ],
  sales_manager: [
    "billing.*",
    "fleet.view",
    "reports.*",
  ],
  read_only: [
    "billing.view",
    "parts.view",
    "fleet.view",
    "work_orders.view",
    "compliance.view",
    "scheduling.view",
    "settings.view",
    "reports.view",
  ],
};

export type RoutePermissionRule = {
  prefix: string;
  permission: Permission;
};

export const ROUTE_PERMISSION_RULES: ReadonlyArray<RoutePermissionRule> = [
  { prefix: "/billing", permission: "billing.view" },
  { prefix: "/sales", permission: "billing.view" },
  { prefix: "/crm", permission: "billing.view" },
  { prefix: "/parts", permission: "parts.view" },
  { prefix: "/fleet", permission: "fleet.view" },
  { prefix: "/work-orders", permission: "work_orders.view" },
  { prefix: "/my-work", permission: "work_orders.view" },
  { prefix: "/compliance", permission: "compliance.view" },
  { prefix: "/personnel", permission: "personnel.view" },
  { prefix: "/lead", permission: "reports.view" },
  { prefix: "/scheduling", permission: "scheduling.view" },
  { prefix: "/settings", permission: "settings.view" },
  { prefix: "/reports", permission: "reports.view" },
  { prefix: "/dashboard", permission: "reports.view" },
];

export type NavSection =
  | "dashboard"
  | "fleet"
  | "work-orders"
  | "scheduling"
  | "parts"
  | "billing"
  | "compliance"
  | "findings"
  | "personnel"
  | "my-work"
  | "customers"
  | "reports"
  | "settings";

export const ROLE_NAV_ACCESS: Record<MroRole, NavSection[]> = {
  admin: [
    "dashboard",
    "fleet",
    "work-orders",
    "scheduling",
    "parts",
    "billing",
    "compliance",
    "findings",
    "personnel",
    "my-work",
    "customers",
    "reports",
    "settings",
  ],
  shop_manager: [
    "dashboard",
    "fleet",
    "work-orders",
    "scheduling",
    "parts",
    "billing",
    "compliance",
    "findings",
    "personnel",
    "my-work",
    "customers",
    "reports",
    "settings",
  ],
  qcm_inspector: ["dashboard", "work-orders", "compliance", "fleet", "findings"],
  billing_manager: ["dashboard", "billing", "customers", "reports"],
  lead_technician: ["dashboard", "my-work", "work-orders", "parts", "findings"],
  technician: ["dashboard", "my-work", "work-orders", "parts", "findings"],
  parts_clerk: ["dashboard", "parts", "work-orders"],
  sales_rep: ["dashboard", "customers", "reports"],
  sales_manager: ["dashboard", "customers", "reports"],
  read_only: [
    "dashboard",
    "fleet",
    "work-orders",
    "scheduling",
    "parts",
    "billing",
    "compliance",
    "findings",
    "my-work",
    "customers",
    "reports",
  ],
};

export function isMroRole(value: string | null | undefined): value is MroRole {
  return value !== undefined && value !== null && (MRO_ROLES as readonly string[]).includes(value);
}

export function isAccessAuthorization(
  value: string | null | undefined,
): value is AccessAuthorization {
  return value !== undefined &&
    value !== null &&
    (ACCESS_AUTHORIZATIONS as readonly string[]).includes(value);
}

export function normalizeRole(role: string | null | undefined): MroRole {
  return isMroRole(role) ? role : "read_only";
}

export function normalizeAccessAuthorizations(
  values: ReadonlyArray<string | null | undefined> | null | undefined,
): AccessAuthorization[] {
  if (!values || values.length === 0) return [];
  return Array.from(
    new Set(values.filter((value): value is AccessAuthorization => isAccessAuthorization(value))),
  ).sort((left, right) => ACCESS_AUTHORIZATIONS.indexOf(left) - ACCESS_AUTHORIZATIONS.indexOf(right));
}

export function hasPermission(role: string | null | undefined, permission: string): boolean {
  const normalizedRole = normalizeRole(role);
  const grants = ROLE_PERMISSION_GRANTS[normalizedRole];

  if (grants.includes("*")) return true;
  if (grants.includes(permission as PermissionPattern)) return true;

  const [category] = permission.split(".");
  if (!category) return false;

  return grants.includes(`${category}.*` as PermissionPattern);
}

export function canAccessRoute(role: string | null | undefined, route: string): boolean {
  if (!route || route === "/") return true;

  const match = ROUTE_PERMISSION_RULES
    .slice()
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find((entry) => route.startsWith(entry.prefix));

  if (!match) return true;
  return hasPermission(role, match.permission);
}

export function canAccessNav(role: string | null | undefined, section: NavSection): boolean {
  return ROLE_NAV_ACCESS[normalizeRole(role)].includes(section);
}
