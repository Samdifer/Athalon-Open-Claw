import type { Id } from "../../_generated/dataModel";

export const SCHEDULING_MANAGER_ROLES = new Set([
  "admin",
  "shop_manager",
  "lead_technician",
]);

export function hasSchedulingManagerRole(role?: string): boolean {
  return !!role && SCHEDULING_MANAGER_ROLES.has(role);
}

export async function requireSchedulingManager(
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    operation?: string;
  },
): Promise<{ userId: string; technicianId: Id<"technicians">; role?: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const technician = await ctx.db
    .query("technicians")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
    .filter((q: any) => q.eq(q.field("userId"), identity.subject))
    .first();

  if (!technician) {
    throw new Error("No technician profile found for this organization");
  }

  if (!hasSchedulingManagerRole(technician.role)) {
    const context = args.operation ? ` to ${args.operation}` : "";
    throw new Error(`Insufficient permissions${context}`);
  }

  return {
    userId: identity.subject,
    technicianId: technician._id,
    role: technician.role,
  };
}
