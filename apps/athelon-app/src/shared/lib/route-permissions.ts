import { matchPath } from "react-router-dom";
import { MRO_ROLES, type MroRole } from "@/lib/mro-constants";

export const ALL_ROLES: ReadonlyArray<MroRole> = [...MRO_ROLES];

export const ROUTE_PERMISSION_MAP: ReadonlyArray<{
  pattern: string;
  allowedRoles: ReadonlyArray<MroRole>;
}> = [
  { pattern: "/settings/*", allowedRoles: ["admin"] },
  {
    pattern: "/billing/*",
    allowedRoles: ["admin", "shop_manager", "billing_manager"],
  },
  {
    pattern: "/crm/*",
    allowedRoles: ["admin", "shop_manager", "billing_manager"],
  },
  {
    pattern: "/sales/*",
    allowedRoles: ["admin", "shop_manager", "billing_manager", "parts_clerk"],
  },
  {
    pattern: "/compliance/*",
    allowedRoles: ["admin", "shop_manager", "qcm_inspector"],
  },
  {
    pattern: "/scheduling/*",
    allowedRoles: ["admin", "shop_manager", "lead_technician"],
  },
  {
    pattern: "/personnel/time-management",
    allowedRoles: ["admin", "shop_manager", "lead_technician"],
  },
  { pattern: "/personnel/*", allowedRoles: ["admin", "shop_manager"] },
  { pattern: "/my-work/*", allowedRoles: ALL_ROLES },
  { pattern: "/lead", allowedRoles: ["admin", "shop_manager", "lead_technician"] },
  {
    pattern: "/work-orders/lead",
    allowedRoles: ["admin", "shop_manager", "lead_technician"],
  },
  {
    pattern: "/parts/*",
    allowedRoles: ["admin", "shop_manager", "parts_clerk", "lead_technician"],
  },
  { pattern: "/fleet/*", allowedRoles: ALL_ROLES },
  { pattern: "/work-orders/*", allowedRoles: ALL_ROLES },
  { pattern: "/dashboard", allowedRoles: ALL_ROLES },
  {
    pattern: "/reports/*",
    allowedRoles: ["admin", "shop_manager", "billing_manager", "qcm_inspector"],
  },
];

export function getAllowedRolesForPath(pathname: string): ReadonlyArray<MroRole> | undefined {
  for (const entry of ROUTE_PERMISSION_MAP) {
    if (matchPath({ path: entry.pattern, end: false }, pathname)) {
      return entry.allowedRoles;
    }
  }

  return undefined;
}

export function canRoleAccessPath(
  role: string | null | undefined,
  pathname: string,
): boolean {
  if (!role) return true;

  const allowedRoles = getAllowedRolesForPath(pathname);
  if (!allowedRoles || allowedRoles.length === 0) return true;

  return allowedRoles.includes(role as MroRole);
}
