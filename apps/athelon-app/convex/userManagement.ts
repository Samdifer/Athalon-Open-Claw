import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  getOrgScopedTechnicianByUserId,
  requireAuthIdentity,
} from "./shared/helpers/accessControl";
import {
  accessAuthorizationArrayValidator,
  mroRoleValidator,
  type AccessAuthorization,
  type MroRole,
} from "./lib/mroAccessValidators";
import { normalizeAccessAuthorizations } from "../lib/mro-access";

type CallerContext = {
  _id: Id<"technicians">;
  role?: string;
  status: "active" | "inactive" | "terminated";
};

function trimOptional(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEmail(value: string | null | undefined): string | undefined {
  const trimmed = trimOptional(value);
  return trimmed?.toLowerCase();
}

function sortTechnicians<T extends { legalName: string }>(technicians: T[]): T[] {
  return technicians.slice().sort((left, right) => left.legalName.localeCompare(right.legalName));
}

async function countActiveAdminsInOrg(
  ctx: { db: any },
  organizationId: Id<"organizations">,
): Promise<number> {
  const activeTechnicians = await ctx.db
    .query("technicians")
    .withIndex("by_status", (q: any) =>
      q.eq("organizationId", organizationId).eq("status", "active"),
    )
    .collect();

  return activeTechnicians.filter((technician: { role?: string }) => technician.role === "admin").length;
}

async function requireOrgRoles(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: any },
  organizationId: Id<"organizations">,
  allowedRoles: readonly MroRole[],
): Promise<{ caller: CallerContext; identity: { subject: string } }> {
  const identity = await requireAuthIdentity(ctx);
  const caller = await getOrgScopedTechnicianByUserId(ctx, organizationId, identity.subject);

  if (!caller) {
    throw new Error("No technician profile found for this organization");
  }
  if (caller.status !== "active") {
    throw new Error("Inactive technicians cannot manage personnel");
  }
  if (!caller.role || !allowedRoles.includes(caller.role as MroRole)) {
    throw new Error(
      `ACCESS_DENIED: requires one of roles [${allowedRoles.join(", ")}].`,
    );
  }

  return { caller, identity };
}

async function requireAdminRole(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: any },
  organizationId: Id<"organizations">,
) {
  return requireOrgRoles(ctx, organizationId, ["admin"]);
}

async function writeAuditEvent(
  ctx: { db: any },
  args: {
    organizationId: Id<"organizations">;
    eventType: "record_created" | "record_updated" | "status_changed";
    fieldName?: string;
    recordId: Id<"technicians">;
    callerTechnicianId: Id<"technicians">;
    userId: string;
    oldValue?: unknown;
    newValue?: unknown;
    notes: string;
  },
) {
  await ctx.db.insert("auditLog", {
    organizationId: args.organizationId,
    eventType: args.eventType,
    tableName: "technicians",
    recordId: String(args.recordId),
    userId: args.userId,
    technicianId: args.callerTechnicianId,
    fieldName: args.fieldName,
    oldValue: args.oldValue === undefined ? undefined : JSON.stringify(args.oldValue),
    newValue: args.newValue === undefined ? undefined : JSON.stringify(args.newValue),
    notes: args.notes,
    timestamp: Date.now(),
  });
}

async function assertEmployeeIdAvailable(
  ctx: { db: any },
  args: {
    organizationId: Id<"organizations">;
    employeeId?: string;
    excludeTechnicianId?: Id<"technicians">;
  },
) {
  if (!args.employeeId) return;

  const technicians = await ctx.db
    .query("technicians")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
    .collect();

  const duplicate = technicians.find((technician: { _id: Id<"technicians">; employeeId?: string }) =>
    technician._id !== args.excludeTechnicianId &&
    technician.employeeId?.trim().toLowerCase() === args.employeeId?.trim().toLowerCase(),
  );

  if (duplicate) {
    throw new Error(`Employee ID ${args.employeeId} is already assigned to another personnel profile.`);
  }
}

function buildProfileSnapshot(technician: {
  legalName: string;
  employeeId?: string;
  email?: string;
  phone?: string;
  status: "active" | "inactive" | "terminated";
  userId?: string;
}) {
  return {
    legalName: technician.legalName,
    employeeId: technician.employeeId ?? null,
    email: technician.email ?? null,
    phone: technician.phone ?? null,
    status: technician.status,
    userId: technician.userId ?? null,
  };
}

export const listProfilesForRoster = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgRoles(ctx, args.organizationId, ["admin", "shop_manager"]);
    const technicians = await ctx.db
      .query("technicians")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    return sortTechnicians(technicians);
  },
});

export const getAdminDirectory = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireAdminRole(ctx, args.organizationId);

    const [organization, technicians] = await Promise.all([
      ctx.db.get(args.organizationId),
      ctx.db
        .query("technicians")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
        .collect(),
    ]);

    if (!organization) {
      throw new Error("Organization not found");
    }

    return {
      organization: {
        _id: organization._id,
        name: organization.name,
        clerkOrganizationId: organization.clerkOrganizationId ?? null,
      },
      technicians: sortTechnicians(technicians),
    };
  },
});

export const createProfile = mutation({
  args: {
    organizationId: v.id("organizations"),
    legalName: v.string(),
    employeeId: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { caller, identity } = await requireOrgRoles(ctx, args.organizationId, [
      "admin",
      "shop_manager",
    ]);

    const legalName = args.legalName.trim();
    if (!legalName) {
      throw new Error("Legal name is required.");
    }

    const employeeId = trimOptional(args.employeeId);
    await assertEmployeeIdAvailable(ctx, {
      organizationId: args.organizationId,
      employeeId,
    });

    const now = Date.now();
    const technicianId = await ctx.db.insert("technicians", {
      organizationId: args.organizationId,
      legalName,
      employeeId,
      email: normalizeEmail(args.email),
      phone: trimOptional(args.phone),
      status: "active",
      accessAuthorizations: [],
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditEvent(ctx, {
      organizationId: args.organizationId,
      eventType: "record_created",
      fieldName: "profile",
      recordId: technicianId,
      callerTechnicianId: caller._id,
      userId: identity.subject,
      newValue: {
        legalName,
        employeeId: employeeId ?? null,
        email: normalizeEmail(args.email) ?? null,
        phone: trimOptional(args.phone) ?? null,
      },
      notes: `Created personnel profile for ${legalName}.`,
    });

    return { technicianId };
  },
});

export const updateProfile = mutation({
  args: {
    technicianId: v.id("technicians"),
    legalName: v.string(),
    employeeId: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    ampCertificateNumber: v.optional(v.union(v.string(), v.null())),
    iaCertificateNumber: v.optional(v.union(v.string(), v.null())),
    ampExpiry: v.optional(v.union(v.number(), v.null())),
    iaExpiry: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const technician = await ctx.db.get(args.technicianId);
    if (!technician) {
      throw new Error("Personnel profile not found.");
    }

    const { caller, identity } = await requireOrgRoles(ctx, technician.organizationId, [
      "admin",
      "shop_manager",
    ]);

    const legalName = args.legalName.trim();
    if (!legalName) {
      throw new Error("Legal name is required.");
    }

    const employeeId = trimOptional(args.employeeId ?? undefined);
    await assertEmployeeIdAvailable(ctx, {
      organizationId: technician.organizationId,
      employeeId,
      excludeTechnicianId: technician._id,
    });

    const previous = buildProfileSnapshot(technician);

    const ampCertificateNumber =
      args.ampCertificateNumber === null
        ? undefined
        : (args.ampCertificateNumber?.trim() || undefined);
    const iaCertificateNumber =
      args.iaCertificateNumber === null
        ? undefined
        : (args.iaCertificateNumber?.trim() || undefined);
    const ampExpiry = args.ampExpiry === null ? undefined : args.ampExpiry;
    const iaExpiry = args.iaExpiry === null ? undefined : args.iaExpiry;

    const next = {
      legalName,
      employeeId,
      email: normalizeEmail(args.email ?? undefined),
      phone: trimOptional(args.phone ?? undefined),
      ampCertificateNumber,
      iaCertificateNumber,
      ampExpiry,
      iaExpiry,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.technicianId, next);

    await writeAuditEvent(ctx, {
      organizationId: technician.organizationId,
      eventType: "record_updated",
      fieldName: "profile",
      recordId: technician._id,
      callerTechnicianId: caller._id,
      userId: identity.subject,
      oldValue: previous,
      newValue: {
        ...previous,
        legalName,
        employeeId: employeeId ?? null,
        email: next.email ?? null,
        phone: next.phone ?? null,
      },
      notes: `Updated personnel profile for ${legalName}.`,
    });

    return { technicianId: technician._id };
  },
});

export const archiveProfile = mutation({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    const technician = await ctx.db.get(args.technicianId);
    if (!technician) {
      throw new Error("Personnel profile not found.");
    }

    const { caller, identity } = await requireAdminRole(ctx, technician.organizationId);

    if (technician.userId) {
      throw new Error(
        "Linked user accounts must be removed from Settings > Users before archiving this profile.",
      );
    }
    if (technician.status === "terminated") {
      return { technicianId: technician._id, status: technician.status };
    }
    if (technician.role === "admin" && technician.status === "active") {
      const activeAdminCount = await countActiveAdminsInOrg(ctx, technician.organizationId);
      if (activeAdminCount <= 1) {
        throw new Error("Cannot archive the last active admin profile in this organization.");
      }
    }

    await ctx.db.patch(args.technicianId, {
      status: "terminated",
      updatedAt: Date.now(),
    });

    await writeAuditEvent(ctx, {
      organizationId: technician.organizationId,
      eventType: "status_changed",
      fieldName: "status",
      recordId: technician._id,
      callerTechnicianId: caller._id,
      userId: identity.subject,
      oldValue: technician.status,
      newValue: "terminated",
      notes: `Archived personnel profile for ${technician.legalName}.`,
    });

    return { technicianId: technician._id, status: "terminated" as const };
  },
});

export const restoreProfile = mutation({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    const technician = await ctx.db.get(args.technicianId);
    if (!technician) {
      throw new Error("Personnel profile not found.");
    }

    const { caller, identity } = await requireAdminRole(ctx, technician.organizationId);
    if (technician.status !== "terminated") {
      return { technicianId: technician._id, status: technician.status };
    }

    await ctx.db.patch(args.technicianId, {
      status: "inactive",
      updatedAt: Date.now(),
    });

    await writeAuditEvent(ctx, {
      organizationId: technician.organizationId,
      eventType: "status_changed",
      fieldName: "status",
      recordId: technician._id,
      callerTechnicianId: caller._id,
      userId: identity.subject,
      oldValue: technician.status,
      newValue: "inactive",
      notes: `Restored personnel profile for ${technician.legalName} to inactive status.`,
    });

    return { technicianId: technician._id, status: "inactive" as const };
  },
});

export const linkMemberToProfile = mutation({
  args: {
    organizationId: v.id("organizations"),
    technicianId: v.id("technicians"),
    userId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const technician = await ctx.db.get(args.technicianId);
    if (!technician || technician.organizationId !== args.organizationId) {
      throw new Error("Personnel profile not found in this organization.");
    }

    const { caller, identity } = await requireAdminRole(ctx, args.organizationId);
    if (technician.status === "terminated") {
      throw new Error("Archived personnel profiles cannot be linked to user accounts.");
    }

    const existingLink = await ctx.db
      .query("technicians")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId),
      )
      .first();

    if (existingLink && existingLink._id !== technician._id) {
      throw new Error("That organization member is already linked to another personnel profile.");
    }

    const updates: {
      userId: string;
      updatedAt: number;
      email?: string;
    } = {
      userId: args.userId,
      updatedAt: Date.now(),
    };

    if (!technician.email && args.email?.trim()) {
      updates.email = args.email.trim().toLowerCase();
    }

    await ctx.db.patch(args.technicianId, updates);

    await writeAuditEvent(ctx, {
      organizationId: technician.organizationId,
      eventType: "record_updated",
      fieldName: "userId",
      recordId: technician._id,
      callerTechnicianId: caller._id,
      userId: identity.subject,
      oldValue: technician.userId ?? null,
      newValue: args.userId,
      notes: `Linked Clerk member ${args.userId} to ${technician.legalName}.`,
    });

    return { technicianId: technician._id, userId: args.userId };
  },
});

export const unlinkMemberFromProfile = mutation({
  args: {
    organizationId: v.id("organizations"),
    technicianId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    const technician = await ctx.db.get(args.technicianId);
    if (!technician || technician.organizationId !== args.organizationId) {
      throw new Error("Personnel profile not found in this organization.");
    }

    const { caller, identity } = await requireAdminRole(ctx, args.organizationId);

    if (!technician.userId) {
      return { technicianId: technician._id, userId: null };
    }

    await ctx.db.patch(args.technicianId, {
      userId: undefined,
      updatedAt: Date.now(),
    });

    await writeAuditEvent(ctx, {
      organizationId: technician.organizationId,
      eventType: "record_updated",
      fieldName: "userId",
      recordId: technician._id,
      callerTechnicianId: caller._id,
      userId: identity.subject,
      oldValue: technician.userId,
      newValue: null,
      notes: `Unlinked Clerk member from ${technician.legalName}.`,
    });

    return { technicianId: technician._id, userId: null };
  },
});

export const updateAccessControl = mutation({
  args: {
    technicianId: v.id("technicians"),
    role: mroRoleValidator,
    accessAuthorizations: accessAuthorizationArrayValidator,
  },
  handler: async (ctx, args) => {
    const technician = await ctx.db.get(args.technicianId);
    if (!technician) {
      throw new Error("Personnel profile not found.");
    }

    const { caller, identity } = await requireAdminRole(ctx, technician.organizationId);
    if (!technician.userId) {
      throw new Error("Map this account to a user profile before assigning access.");
    }

    if (technician.role === "admin" && technician.status === "active" && args.role !== "admin") {
      const activeAdminCount = await countActiveAdminsInOrg(ctx, technician.organizationId);
      if (activeAdminCount <= 1) {
        throw new Error("Cannot remove the last active admin from this organization.");
      }
    }

    const normalizedAuthorizations = normalizeAccessAuthorizations(
      args.accessAuthorizations as AccessAuthorization[],
    );

    await ctx.db.patch(args.technicianId, {
      role: args.role,
      accessAuthorizations: normalizedAuthorizations,
      updatedAt: Date.now(),
    });

    await writeAuditEvent(ctx, {
      organizationId: technician.organizationId,
      eventType: "record_updated",
      fieldName: "access_control",
      recordId: technician._id,
      callerTechnicianId: caller._id,
      userId: identity.subject,
      oldValue: {
        role: technician.role ?? null,
        accessAuthorizations: technician.accessAuthorizations ?? [],
      },
      newValue: {
        role: args.role,
        accessAuthorizations: normalizedAuthorizations,
      },
      notes: `Updated role and authorizations for ${technician.legalName}.`,
    });

    return {
      technicianId: technician._id,
      role: args.role,
      accessAuthorizations: normalizedAuthorizations,
    };
  },
});

export const offboardLinkedProfile = mutation({
  args: {
    technicianId: v.id("technicians"),
    expectedUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const technician = await ctx.db.get(args.technicianId);
    if (!technician) {
      throw new Error("Personnel profile not found.");
    }

    const { caller, identity } = await requireAdminRole(ctx, technician.organizationId);

    if (!technician.userId) {
      throw new Error("Personnel profile is not linked to an organization member.");
    }
    if (args.expectedUserId && technician.userId !== args.expectedUserId) {
      throw new Error("Linked organization member changed before offboarding could complete.");
    }
    if (technician.role === "admin" && technician.status === "active") {
      const activeAdminCount = await countActiveAdminsInOrg(ctx, technician.organizationId);
      if (activeAdminCount <= 1) {
        throw new Error("Cannot offboard the last active admin in this organization.");
      }
    }

    await ctx.db.patch(args.technicianId, {
      userId: undefined,
      status: "terminated",
      updatedAt: Date.now(),
    });

    await writeAuditEvent(ctx, {
      organizationId: technician.organizationId,
      eventType: "record_updated",
      fieldName: "userId",
      recordId: technician._id,
      callerTechnicianId: caller._id,
      userId: identity.subject,
      oldValue: technician.userId,
      newValue: null,
      notes: `Cleared linked Clerk member during offboarding for ${technician.legalName}.`,
    });

    await writeAuditEvent(ctx, {
      organizationId: technician.organizationId,
      eventType: "status_changed",
      fieldName: "status",
      recordId: technician._id,
      callerTechnicianId: caller._id,
      userId: identity.subject,
      oldValue: technician.status,
      newValue: "terminated",
      notes: `Offboarded ${technician.legalName} and archived the linked profile.`,
    });

    return { technicianId: technician._id, status: "terminated" as const };
  },
});

export const logOrganizationAccountAuditEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    recordId: v.string(),
    userId: v.string(),
    technicianId: v.id("technicians"),
    eventType: v.union(v.literal("record_created"), v.literal("record_updated"), v.literal("status_changed")),
    fieldName: v.optional(v.string()),
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: args.eventType,
      tableName: "organizations",
      recordId: args.recordId,
      userId: args.userId,
      technicianId: args.technicianId,
      fieldName: args.fieldName,
      oldValue: args.oldValue,
      newValue: args.newValue,
      notes: args.notes,
      timestamp: Date.now(),
    });

    return null;
  },
});

export const syncLinkedMemberMetadata = internalMutation({
  args: {
    technicianId: v.id("technicians"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const technician = await ctx.db.get(args.technicianId);
    if (!technician || technician.email || !args.email?.trim()) {
      return null;
    }

    await ctx.db.patch(args.technicianId, {
      email: args.email.trim().toLowerCase(),
      updatedAt: Date.now(),
    });

    return { technicianId: technician._id };
  },
});
