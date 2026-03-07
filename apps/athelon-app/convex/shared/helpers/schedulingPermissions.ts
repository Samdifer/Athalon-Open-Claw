import type { Id } from "../../_generated/dataModel";
import { requireOrgScopedTechnician } from "./accessControl";

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
  const { identity, technician } = await requireOrgScopedTechnician(ctx, {
    organizationId: args.organizationId,
    requireActive: true,
    operation: args.operation,
  });

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
