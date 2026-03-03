// hooks/useUserRole.ts — Returns the current user's MRO role

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { MRORole } from "@/lib/roles";

export function useUserRole(): { role: MRORole | null | undefined; isLoading: boolean } {
  const { orgId, isLoaded } = useCurrentOrg();
  const role = useQuery(
    api.roles.getMyRole,
    orgId ? { organizationId: orgId } : "skip",
  );

  if (!isLoaded) {
    return { role: undefined, isLoading: true };
  }

  if (!orgId) {
    // During onboarding bootstrap there is no org-scoped role yet.
    return { role: null, isLoading: false };
  }

  if (role === undefined) {
    return { role: undefined, isLoading: true };
  }

  return { role: role as MRORole | null, isLoading: false };
}
