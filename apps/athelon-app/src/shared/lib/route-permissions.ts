import { matchPath } from "react-router-dom";
import {
  ALL_ACCESS_ROLES,
  ROUTE_ACCESS_RULES,
} from "./access-policy";
import { type MroRole } from "@/lib/mro-constants";

export const ALL_ROLES: ReadonlyArray<MroRole> = [...ALL_ACCESS_ROLES];

export const ROUTE_PERMISSION_MAP: ReadonlyArray<{
  pattern: string;
  allowedRoles: ReadonlyArray<MroRole>;
}> = ROUTE_ACCESS_RULES;

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
