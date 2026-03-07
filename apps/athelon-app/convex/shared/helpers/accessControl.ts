import type { Id } from "../../_generated/dataModel";

type AuthIdentity = { subject: string };

type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<AuthIdentity | null>;
  };
};

type TechnicianLookupCtx = {
  db: {
    query: (table: "technicians") => any;
  };
};

export type OrgScopedTechnician = {
  _id: Id<"technicians">;
  organizationId: Id<"organizations">;
  status: "active" | "inactive" | "terminated";
  role?: string;
  userId?: string;
};

export async function requireAuthIdentity(ctx: AuthCtx): Promise<AuthIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export async function getOrgScopedTechnicianByUserId(
  ctx: TechnicianLookupCtx,
  organizationId: Id<"organizations">,
  userId: string,
): Promise<OrgScopedTechnician | null> {
  const technician = await ctx.db
    .query("technicians")
    .withIndex("by_org_user", (q: any) =>
      q.eq("organizationId", organizationId).eq("userId", userId),
    )
    .first();

  if (!technician) {
    return null;
  }

  return technician as OrgScopedTechnician;
}

export async function requireOrgScopedTechnician(
  ctx: AuthCtx & TechnicianLookupCtx,
  args: {
    organizationId: Id<"organizations">;
    requireActive?: boolean;
    operation?: string;
  },
): Promise<{ identity: AuthIdentity; technician: OrgScopedTechnician }> {
  const identity = await requireAuthIdentity(ctx);
  const technician = await getOrgScopedTechnicianByUserId(
    ctx,
    args.organizationId,
    identity.subject,
  );

  if (!technician) {
    throw new Error("No technician profile found for this organization");
  }

  if (args.requireActive && technician.status !== "active") {
    const context = args.operation ? ` for ${args.operation}` : "";
    throw new Error(`Inactive technician profiles cannot perform this action${context}`);
  }

  return { identity, technician };
}
