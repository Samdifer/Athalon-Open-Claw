import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { useOrganization } from "@clerk/clerk-react";
import { api } from "../../../athelon-app/convex/_generated/api";
import { Id } from "../../../athelon-app/convex/_generated/dataModel";

export interface OrgContextValue {
  orgId: Id<"organizations"> | undefined;
  techId: Id<"technicians"> | undefined;
  isLoaded: boolean;
  tech: any | null;
  org: any | null;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrgContext(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (ctx === null) {
    throw new Error("useOrgContext must be used within OrgContextProvider");
  }
  return ctx;
}

export function OrgContextProvider({ children }: { children: ReactNode }) {
  const { organization, isLoaded: clerkLoaded } = useOrganization();
  const preferredClerkOrganizationId = organization?.id ?? undefined;
  const preferredOrganizationName = organization?.name ?? undefined;

  const ctx = useQuery(api.technicians.getMyContext, clerkLoaded ? {
    preferredClerkOrganizationId,
    preferredOrganizationName,
  } : "skip");

  const isLoaded = clerkLoaded && ctx !== undefined;

  const value: OrgContextValue = {
    orgId: ctx?.tech?.organizationId,
    techId: ctx?.tech?._id,
    isLoaded,
    tech: ctx?.tech ?? null,
    org: ctx?.org ?? null,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useCurrentOrg(): OrgContextValue {
  return useOrgContext();
}
