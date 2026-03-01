"use client";

/**
 * components/OrgContextProvider.tsx
 * Athelon — React context provider for org/technician context.
 *
 * Fires api.technicians.getMyContext ONCE at mount for the whole (app) layout
 * session, eliminating the per-page waterfall introduced by calling useCurrentOrg()
 * in every page. All child pages read from this context via useOrgContext().
 *
 * TD-007 fix.
 */

import React, { createContext, useContext } from "react";
import { useQuery } from "convex/react";
import { useOrganization } from "@clerk/clerk-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Re-export the OrgContext shape so it can be used by the hook and other consumers.
export interface OrgContextValue {
  orgId: Id<"organizations"> | undefined;
  techId: Id<"technicians"> | undefined;
  isLoaded: boolean;
  bootstrapStatus: "loading" | "needs_bootstrap" | "ready";
  needsBootstrap: boolean;
  tech: NonNullable<ReturnType<typeof useQuery<typeof api.technicians.getMyContext>>>["tech"] | null;
  org: NonNullable<ReturnType<typeof useQuery<typeof api.technicians.getMyContext>>>["org"] | null;
}

const OrgContext = createContext<OrgContextValue | null>(null);

/**
 * useOrgContext — reads the org context seeded by OrgContextProvider.
 * Throws if called outside the provider tree (programming error).
 */
export function useOrgContext(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (ctx === null) {
    throw new Error("useOrgContext must be used within OrgContextProvider");
  }
  return ctx;
}

/**
 * OrgContextProvider — wrap this around the (app) layout so all child pages
 * share a single getMyContext subscription.
 */
export function OrgContextProvider({ children }: { children: React.ReactNode }) {
  const { organization } = useOrganization();
  const preferredClerkOrganizationId = organization?.id ?? undefined;
  const preferredOrganizationName = organization?.name ?? undefined;
  const bootstrap = useQuery(api.onboarding.getBootstrapStatus, {
    preferredClerkOrganizationId,
    preferredOrganizationName,
  });
  const ctx = useQuery(api.technicians.getMyContext, {
    preferredClerkOrganizationId,
    preferredOrganizationName,
  });

  const bootstrapStatus = bootstrap?.status ?? "loading";
  const needsBootstrap = bootstrapStatus === "needs_bootstrap";
  const isLoaded =
    bootstrap !== undefined &&
    (bootstrapStatus !== "ready" || ctx !== undefined);

  const value: OrgContextValue = {
    orgId: bootstrap?.orgId ?? ctx?.tech.organizationId,
    techId: bootstrap?.techId ?? ctx?.tech._id,
    isLoaded,
    bootstrapStatus,
    needsBootstrap,
    tech: ctx?.tech ?? null,
    org: ctx?.org ?? null,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
