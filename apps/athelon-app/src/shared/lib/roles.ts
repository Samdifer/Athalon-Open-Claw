// lib/roles.ts — Compatibility wrapper over the shared MRO role catalog.

import {
  MRO_ROLES as SHARED_MRO_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_LEVELS,
  ROLE_NAV_ACCESS,
  canAccessNav,
  type MRORole,
  type NavSection,
} from "@/src/shared/lib/mro-access";

export { canAccessNav, type MRORole, type NavSection };

export const MRO_ROLES = Object.fromEntries(
  SHARED_MRO_ROLES.map((role) => [
    role,
    {
      label: ROLE_LABELS[role],
      description: ROLE_DESCRIPTIONS[role],
      level: ROLE_LEVELS[role],
    },
  ]),
) as Record<MRORole, { label: string; description: string; level: number }>;
export { ROLE_NAV_ACCESS };
