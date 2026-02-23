"use client";

/**
 * hooks/useCurrentOrg.ts
 * Athelon — Bootstrap hook that resolves the current user's org context.
 *
 * Since the Convex organizations table doesn't store Clerk org IDs directly,
 * we look up the technician record for the current Clerk user and derive
 * the organizationId from that record.
 *
 * Returns:
 *   - orgId: Id<"organizations"> | undefined  — undefined while loading or if not found
 *   - techId: Id<"technicians"> | undefined
 *   - isLoaded: boolean
 *   - tech: technician record | null
 *   - org: organization record | null
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export interface OrgContext {
  orgId: Id<"organizations"> | undefined;
  techId: Id<"technicians"> | undefined;
  isLoaded: boolean;
  tech: NonNullable<ReturnType<typeof useQuery<typeof api.technicians.getMyContext>>>["tech"] | null;
  org: NonNullable<ReturnType<typeof useQuery<typeof api.technicians.getMyContext>>>["org"] | null;
}

export function useCurrentOrg(): OrgContext {
  const ctx = useQuery(api.technicians.getMyContext);

  // ctx === undefined → still loading
  // ctx === null → loaded but no technician found for this user
  const isLoaded = ctx !== undefined;

  return {
    orgId: ctx?.tech.organizationId,
    techId: ctx?.tech._id,
    isLoaded,
    tech: ctx?.tech ?? null,
    org: ctx?.org ?? null,
  };
}
