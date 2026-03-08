import {
  MRO_ROLES,
  normalizeRole,
  ROLE_PERMISSION_GRANTS,
  ROLE_BADGE_STYLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  canAccessRoute,
  hasPermission,
  type MroRole,
  type Permission,
  type PermissionAction,
  type PermissionCategory,
} from "@/src/shared/lib/mro-access";

export {
  MRO_ROLES,
  ROLE_DESCRIPTIONS,
  canAccessRoute,
  hasPermission,
  type MroRole,
  type Permission,
  type PermissionAction,
  type PermissionCategory,
};
export const ROLE_DISPLAY_NAMES: Record<MroRole, string> = ROLE_LABELS;
export const ROLE_BADGE_COLORS: Record<MroRole, string> = ROLE_BADGE_STYLES;

export function getPermissions(role: string): string[] {
  return [...ROLE_PERMISSION_GRANTS[normalizeRole(role)]];
}
