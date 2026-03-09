import type { MroRole } from "./mro-access";

export const ALL_ACCESS_ROLES = [
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
] as const satisfies ReadonlyArray<MroRole>;

export const BILLING_ROLES = [
  "admin",
  "shop_manager",
  "billing_manager",
] as const satisfies ReadonlyArray<MroRole>;

export const COMMERCIAL_ROLES = [
  "admin",
  "shop_manager",
  "billing_manager",
  "sales_rep",
  "sales_manager",
] as const satisfies ReadonlyArray<MroRole>;

export const COMPLIANCE_ROLES = [
  "admin",
  "shop_manager",
  "qcm_inspector",
] as const satisfies ReadonlyArray<MroRole>;

export const SCHEDULING_ROLES = [
  "admin",
  "shop_manager",
  "lead_technician",
] as const satisfies ReadonlyArray<MroRole>;

export const PERSONNEL_ROLES = [
  "admin",
  "shop_manager",
] as const satisfies ReadonlyArray<MroRole>;

export const PERSONNEL_TIME_ROLES = [
  "admin",
  "shop_manager",
  "lead_technician",
] as const satisfies ReadonlyArray<MroRole>;

export const LEAD_ROLES = [
  "admin",
  "shop_manager",
  "lead_technician",
] as const satisfies ReadonlyArray<MroRole>;

export const PARTS_ROLES = [
  "admin",
  "shop_manager",
  "lead_technician",
  "technician",
  "parts_clerk",
] as const satisfies ReadonlyArray<MroRole>;

export const WORK_ORDER_ROLES = [
  "admin",
  "shop_manager",
  "qcm_inspector",
  "billing_manager",
  "lead_technician",
  "technician",
  "parts_clerk",
  "read_only",
] as const satisfies ReadonlyArray<MroRole>;

export const MY_WORK_ROLES = [
  "admin",
  "shop_manager",
  "lead_technician",
  "technician",
] as const satisfies ReadonlyArray<MroRole>;

export const REPORTING_ROLES = [
  "admin",
  "shop_manager",
  "qcm_inspector",
  "billing_manager",
  "sales_manager",
  "read_only",
] as const satisfies ReadonlyArray<MroRole>;

export type AccessSection =
  | "dashboard"
  | "fleet"
  | "work-orders"
  | "scheduling"
  | "parts"
  | "billing"
  | "sales"
  | "crm"
  | "compliance"
  | "personnel"
  | "my-work"
  | "reports"
  | "settings";

export type RouteAccessRule = {
  pattern: string;
  allowedRoles: ReadonlyArray<MroRole>;
};

export const ROUTE_ACCESS_RULES: ReadonlyArray<RouteAccessRule> = [
  { pattern: "/settings/*", allowedRoles: ["admin"] },
  { pattern: "/billing/quotes/*", allowedRoles: COMMERCIAL_ROLES },
  { pattern: "/billing/*", allowedRoles: BILLING_ROLES },
  { pattern: "/crm/*", allowedRoles: COMMERCIAL_ROLES },
  { pattern: "/sales/*", allowedRoles: COMMERCIAL_ROLES },
  { pattern: "/compliance/*", allowedRoles: COMPLIANCE_ROLES },
  { pattern: "/scheduling/*", allowedRoles: SCHEDULING_ROLES },
  { pattern: "/personnel/time-management", allowedRoles: PERSONNEL_TIME_ROLES },
  { pattern: "/personnel/*", allowedRoles: PERSONNEL_ROLES },
  { pattern: "/my-work/*", allowedRoles: MY_WORK_ROLES },
  { pattern: "/lead", allowedRoles: LEAD_ROLES },
  { pattern: "/work-orders/lead", allowedRoles: LEAD_ROLES },
  { pattern: "/parts/*", allowedRoles: PARTS_ROLES },
  { pattern: "/fleet/*", allowedRoles: ALL_ACCESS_ROLES },
  { pattern: "/work-orders/*", allowedRoles: WORK_ORDER_ROLES },
  { pattern: "/dashboard", allowedRoles: ALL_ACCESS_ROLES },
  { pattern: "/reports/*", allowedRoles: REPORTING_ROLES },
];

export const ROLE_SECTION_ACCESS: Record<MroRole, ReadonlyArray<AccessSection>> = {
  admin: [
    "dashboard",
    "my-work",
    "fleet",
    "work-orders",
    "scheduling",
    "parts",
    "billing",
    "sales",
    "crm",
    "compliance",
    "reports",
    "personnel",
    "settings",
  ],
  shop_manager: [
    "dashboard",
    "my-work",
    "fleet",
    "work-orders",
    "scheduling",
    "parts",
    "billing",
    "sales",
    "crm",
    "compliance",
    "reports",
    "personnel",
  ],
  qcm_inspector: [
    "compliance",
    "fleet",
    "work-orders",
    "reports",
  ],
  billing_manager: [
    "billing",
    "sales",
    "crm",
    "work-orders",
    "reports",
  ],
  lead_technician: [
    "my-work",
    "work-orders",
    "scheduling",
    "fleet",
    "personnel",
    "parts",
  ],
  technician: [
    "my-work",
    "work-orders",
    "parts",
    "fleet",
  ],
  parts_clerk: ["parts"],
  sales_rep: ["sales", "crm"],
  sales_manager: ["sales", "crm", "reports"],
  read_only: ["dashboard", "fleet", "reports"],
};
