"use client";

/**
 * hooks/useCurrentOrg.ts
 * Athelon — Bootstrap hook that resolves the current user's org context.
 *
 * TD-007: Reads from OrgContextProvider (seeded once in (app)/layout.tsx) instead
 * of firing a per-page Convex query. All existing consumers continue to work
 * unchanged because the exported interface is identical.
 *
 * Returns:
 *   - orgId: Id<"organizations"> | undefined  — undefined while loading or if not found
 *   - techId: Id<"technicians"> | undefined
 *   - isLoaded: boolean
 *   - tech: technician record | null
 *   - org: organization record | null
 */

import { useOrgContext, type OrgContextValue } from "@/components/OrgContextProvider";

// Re-export the interface so existing consumers that import it from here continue to work.
export type { OrgContextValue as OrgContext };

export function useCurrentOrg(): OrgContextValue {
  return useOrgContext();
}
