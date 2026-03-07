// convex/roles.ts — Role Management Mutations & Queries

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  getOrgScopedTechnicianByUserId,
  requireAuthIdentity,
} from "./shared/helpers/accessControl";

const roleValidator = v.union(
  v.literal("admin"),
  v.literal("shop_manager"),
  v.literal("qcm_inspector"),
  v.literal("billing_manager"),
  v.literal("lead_technician"),
  v.literal("technician"),
  v.literal("parts_clerk"),
  v.literal("read_only"),
);

type TechnicianRole =
  | "admin"
  | "shop_manager"
  | "qcm_inspector"
  | "billing_manager"
  | "lead_technician"
  | "technician"
  | "parts_clerk"
  | "read_only";

async function countActiveAdminsInOrg(
  ctx: any,
  organizationId: Id<"organizations">,
): Promise<number> {
  const activeTechs = await ctx.db
    .query("technicians")
    .withIndex("by_status", (q: any) =>
      q.eq("organizationId", organizationId).eq("status", "active"),
    )
    .collect();
  return activeTechs.filter((tech: any) => tech.role === "admin").length;
}

async function requireRoleAdminForTargetOrg(
  ctx: any,
  targetTech: any,
  options?: { allowBootstrap?: boolean },
) {
  const identity = await requireAuthIdentity(ctx);
  const caller = await getOrgScopedTechnicianByUserId(
    ctx,
    targetTech.organizationId,
    identity.subject,
  );

  if (!caller) {
    throw new Error("No technician profile found for this organization");
  }

  if (caller.status !== "active") {
    throw new Error("Inactive technicians cannot manage roles");
  }

  if (caller.role === "admin") {
    return { caller, identity };
  }

  if (options?.allowBootstrap) {
    const activeAdminCount = await countActiveAdminsInOrg(ctx, targetTech.organizationId);
    const isBootstrapCaller = caller.role === undefined && activeAdminCount === 0;
    if (isBootstrapCaller) {
      return { caller, identity, bootstrapMode: true as const };
    }
  }

  throw new Error("ACCESS_DENIED: admin role required");
}

async function writeRoleAuditEvent(
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    eventType:
      | "record_updated"
      | "status_changed";
    fieldName: "role" | "status";
    userId: string;
    technicianId: Id<"technicians">;
    recordId: Id<"technicians">;
    oldValue: string | undefined;
    newValue: string | undefined;
    notes: string;
  },
) {
  await ctx.db.insert("auditLog", {
    organizationId: args.organizationId,
    eventType: args.eventType,
    tableName: "technicians",
    recordId: String(args.recordId),
    userId: args.userId,
    technicianId: args.technicianId,
    fieldName: args.fieldName,
    oldValue: JSON.stringify(args.oldValue ?? null),
    newValue: JSON.stringify(args.newValue ?? null),
    notes: args.notes,
    timestamp: Date.now(),
  });
}

/**
 * Get the current user's MRO role.
 */
export const getMyRole = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const tech = await getOrgScopedTechnicianByUserId(
      ctx,
      args.organizationId,
      identity.subject,
    );

    return tech?.role ?? null;
  },
});

/**
 * List all technicians with their roles (for admin page).
 */
export const listRoles = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await requireAuthIdentity(ctx);
    const caller = await getOrgScopedTechnicianByUserId(
      ctx,
      args.organizationId,
      identity.subject,
    );
    if (!caller) {
      throw new Error("No technician profile found for this organization");
    }
    if (caller.status !== "active") {
      throw new Error("Inactive technicians cannot view role roster");
    }
    if (caller.role !== "admin") {
      throw new Error("ACCESS_DENIED: admin role required");
    }

    return ctx.db
      .query("technicians")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

/**
 * Assign a role to a technician.
 */
export const assignRole = mutation({
  args: {
    technicianId: v.id("technicians"),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const tech = await ctx.db.get(args.technicianId);
    if (!tech) throw new Error("Technician not found");

    const { caller, identity, bootstrapMode } = await requireRoleAdminForTargetOrg(
      ctx,
      tech,
      { allowBootstrap: true },
    );

    if (bootstrapMode && args.role !== "admin") {
      throw new Error("Bootstrap role assignment can only assign admin");
    }

    if (
      tech.status === "active" &&
      tech.role === "admin" &&
      (args.role as TechnicianRole) !== "admin"
    ) {
      const activeAdminCount = await countActiveAdminsInOrg(ctx, tech.organizationId);
      if (activeAdminCount <= 1) {
        throw new Error("Cannot remove the last active admin from this organization");
      }
    }

    const now = Date.now();

    await ctx.db.patch(args.technicianId, {
      role: args.role,
      updatedAt: now,
    });

    await writeRoleAuditEvent(ctx, {
      organizationId: tech.organizationId,
      eventType: "record_updated",
      fieldName: "role",
      userId: identity.subject,
      technicianId: caller._id,
      recordId: tech._id,
      oldValue: tech.role,
      newValue: args.role as TechnicianRole,
      notes: bootstrapMode
        ? "Bootstrap role assignment"
        : "Technician role updated",
    });
  },
});

/**
 * Remove a role from a technician (set to undefined).
 */
export const removeRole = mutation({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    const tech = await ctx.db.get(args.technicianId);
    if (!tech) throw new Error("Technician not found");

    const { caller, identity } = await requireRoleAdminForTargetOrg(ctx, tech);

    if (tech.status === "active" && tech.role === "admin") {
      const activeAdminCount = await countActiveAdminsInOrg(ctx, tech.organizationId);
      if (activeAdminCount <= 1) {
        throw new Error("Cannot remove the last active admin from this organization");
      }
    }

    const now = Date.now();

    await ctx.db.patch(args.technicianId, {
      role: undefined,
      updatedAt: now,
    });

    await writeRoleAuditEvent(ctx, {
      organizationId: tech.organizationId,
      eventType: "record_updated",
      fieldName: "role",
      userId: identity.subject,
      technicianId: caller._id,
      recordId: tech._id,
      oldValue: tech.role,
      newValue: undefined,
      notes: "Technician role removed",
    });
  },
});

/**
 * Toggle technician active/inactive status.
 */
export const toggleStatus = mutation({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    const tech = await ctx.db.get(args.technicianId);
    if (!tech) throw new Error("Technician not found");

    const { caller, identity } = await requireRoleAdminForTargetOrg(ctx, tech);
    const newStatus = tech.status === "active" ? "inactive" : "active";

    if (tech.role === "admin" && tech.status === "active" && newStatus !== "active") {
      const activeAdminCount = await countActiveAdminsInOrg(ctx, tech.organizationId);
      if (activeAdminCount <= 1) {
        throw new Error("Cannot deactivate the last active admin in this organization");
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.technicianId, {
      status: newStatus,
      updatedAt: now,
    });

    await writeRoleAuditEvent(ctx, {
      organizationId: tech.organizationId,
      eventType: "status_changed",
      fieldName: "status",
      userId: identity.subject,
      technicianId: caller._id,
      recordId: tech._id,
      oldValue: tech.status,
      newValue: newStatus,
      notes: "Technician status toggled",
    });
  },
});
