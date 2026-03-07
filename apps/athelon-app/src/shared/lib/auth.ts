/**
 * lib/auth.ts
 * Athelon — MRO Role & Permission Utilities
 *
 * Chloe Park, 2026-02-22
 *
 * Reads the `athelon_role` custom claim from the Clerk JWT (baked in via the
 * Convex JWT template in the Clerk dashboard). This gives us synchronous role
 * access without an extra Convex round-trip on every render.
 *
 * IMPORTANT: This is a UX gate, not a security gate. Every sensitive action is
 * re-checked server-side in Convex via requireOrgContext() + requireOrgMembership().
 * Never trust this client-side role for security decisions — only for show/hide.
 */

import { useAuth } from "@clerk/clerk-react";

// ---------------------------------------------------------------------------
// Role types — must stay in sync with convex/lib/permissions.ts
// Jonas: if you rename these, ping me first. They're baked into component props.
// ---------------------------------------------------------------------------

export type MroRole = "dom" | "supervisor" | "inspector" | "amt" | "viewer";

/** Maps roles to numeric authority levels for ordering comparisons. */
export const ROLE_LEVEL: Record<MroRole, number> = {
  viewer: 1,
  amt: 2,
  inspector: 3,
  supervisor: 4,
  dom: 5,
} as const;

/** Human-readable display names for each role. */
export const ROLE_DISPLAY_NAME: Record<MroRole, string> = {
  dom: "Director of Maintenance",
  supervisor: "Maintenance Supervisor",
  inspector: "QC Inspector",
  amt: "Aviation Maintenance Technician",
  viewer: "Viewer",
} as const;

// ---------------------------------------------------------------------------
// Permission map — what actions each role can perform
// Mirrors the table in clerk-convex-auth-design.md §3.3
// ---------------------------------------------------------------------------

const PERMISSION_ROLES = {
  /** Create a new work order */
  createWorkOrder: ["dom", "supervisor", "inspector", "amt"],
  /** Edit an open work order (AMTs can only edit their own assignments) */
  editWorkOrder: ["dom", "supervisor", "inspector", "amt"],
  /** Certifying sign-off on a task card */
  signTaskCard: ["dom", "supervisor", "inspector", "amt"],
  /** Approve Return-to-Service — DOM and Inspector only (14 CFR 145) */
  approveRts: ["dom", "inspector"],
  /** Request a part for a work order */
  requestParts: ["dom", "supervisor", "inspector", "amt"],
  /** Issue a part from inventory to a work order */
  issueParts: ["dom", "supervisor"],
  /** Manage org users and roles — DOM only */
  manageUsers: ["dom"],
  /** View compliance reports and audit trail */
  viewCompliance: ["dom", "supervisor", "inspector"],
  /** Archive records — DOM only */
  archiveRecords: ["dom"],
  /** Export org data — DOM only */
  exportData: ["dom"],
  /** Authorize a finding for repair — DOM only */
  authorizeSquawk: ["dom"],
  /** Add work cards to a work order */
  addTaskCard: ["dom", "supervisor", "inspector", "amt"],
  /** View personnel records of other users */
  viewPersonnel: ["dom", "supervisor", "inspector"],
} as const satisfies Record<string, readonly MroRole[]>;

export type Permission = keyof typeof PERMISSION_ROLES;

// ---------------------------------------------------------------------------
// Utility helpers (usable without hooks — safe in Server Components too)
// ---------------------------------------------------------------------------

/** Type guard: check if a string is a valid MroRole. */
export function isValidRole(role: string | undefined | null): role is MroRole {
  return role !== undefined && role !== null && role in ROLE_LEVEL;
}

/**
 * Pure function — determine if userRole meets or exceeds the minimum.
 * Safe to call in Convex functions, server components, and client code.
 */
export function hasMinimumRole(userRole: MroRole, minimum: MroRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minimum];
}

/**
 * Pure function — check if a role has a specific permission.
 * Mirrors server-side enforcement in convex/lib/permissions.ts.
 */
export function roleCanDo(role: MroRole, permission: Permission): boolean {
  return (PERMISSION_ROLES[permission] as readonly MroRole[]).includes(role);
}

// ---------------------------------------------------------------------------
// useOrgRole hook — the primary client-side auth utility
// ---------------------------------------------------------------------------

export interface OrgRoleContext {
  /** The user's MRO role in the active org. Defaults to "viewer" while loading. */
  role: MroRole;
  /** Whether the Clerk session has finished loading. */
  isLoaded: boolean;
  /** Check if the user has a specific named permission. */
  can: (permission: Permission) => boolean;
  /** Check if the user's role is at least the given minimum level. */
  isAtLeast: (minimum: MroRole) => boolean;
  /** Human-readable display name for this role. */
  displayName: string;
  /** Raw Clerk session claims (useful for debugging, not for gating). */
  rawClaims: Record<string, unknown> | null;
}

/**
 * useOrgRole — reads the `athelon_role` JWT claim from the active Clerk session.
 *
 * Usage:
 *   const { can, isAtLeast } = useOrgRole();
 *   {isAtLeast("inspector") && <RTSSignOffButton />}
 *   {can("authorizeSquawk") && <AuthorizeButton />}
 *
 * Falls back to "viewer" if the claim is absent or unrecognized.
 * Must be used in a Client Component (uses Clerk hooks internally).
 */
export function useOrgRole(): OrgRoleContext {
  const { sessionClaims, isLoaded } = useAuth();

  const rawRole = sessionClaims?.athelon_role as string | undefined;
  const role: MroRole = isValidRole(rawRole) ? rawRole : "viewer";

  return {
    role,
    isLoaded,
    can: (permission) => roleCanDo(role, permission),
    isAtLeast: (minimum) => hasMinimumRole(role, minimum),
    displayName: ROLE_DISPLAY_NAME[role],
    rawClaims: sessionClaims as Record<string, unknown> | null,
  };
}
