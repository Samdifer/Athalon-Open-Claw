// convex/training.ts
// Athelon — Training & Qualifications Management
//
// Queries and mutations for technician training records and
// qualification requirement compliance tracking.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listTrainingRecords = query({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, { technicianId }) => {
    return await ctx.db
      .query("trainingRecords")
      .withIndex("by_technician", (q) => q.eq("technicianId", technicianId))
      .order("desc")
      .collect();
  },
});

export const listExpiringTraining = query({
  args: { orgId: v.id("organizations"), withinDays: v.number() },
  handler: async (ctx, { orgId, withinDays }) => {
    const now = Date.now();
    const cutoff = now + withinDays * 24 * 60 * 60 * 1000;
    const records = await ctx.db
      .query("trainingRecords")
      .withIndex("by_org_expiry", (q) => q.eq("organizationId", orgId))
      .collect();
    return records.filter(
      (r) => r.expiresAt !== undefined && r.expiresAt <= cutoff && r.expiresAt > 0
    );
  },
});

export const listOrgTraining = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("trainingRecords")
      .withIndex("by_org", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .collect();
  },
});

export const listQualificationRequirements = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("qualificationRequirements")
      .withIndex("by_org", (q) => q.eq("organizationId", orgId))
      .collect();
  },
});

export const checkTechnicianCompliance = query({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, { technicianId }) => {
    const tech = await ctx.db.get(technicianId);
    if (!tech) return { met: [], unmet: [], technicianId };

    const requirements = await ctx.db
      .query("qualificationRequirements")
      .withIndex("by_org", (q) => q.eq("organizationId", tech.organizationId))
      .collect();

    const records = await ctx.db
      .query("trainingRecords")
      .withIndex("by_technician", (q) => q.eq("technicianId", technicianId))
      .collect();

    const now = Date.now();
    const currentCourses = new Set(
      records
        .filter((r) => r.status === "current" || (r.expiresAt && r.expiresAt > now))
        .map((r) => r.courseName.toLowerCase())
    );

    const techRole = tech.role ?? "";
    const met: string[] = [];
    const unmet: string[] = [];

    for (const req of requirements) {
      if (
        req.applicableRoles.length > 0 &&
        !req.applicableRoles.includes(techRole)
      ) {
        continue;
      }
      const allMet = req.requiredCourses.every((c) =>
        currentCourses.has(c.toLowerCase())
      );
      if (allMet) {
        met.push(req.name);
      } else {
        unmet.push(req.name);
      }
    }

    return { met, unmet, technicianId };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const addTrainingRecord = mutation({
  args: {
    organizationId: v.id("organizations"),
    technicianId: v.id("technicians"),
    courseName: v.string(),
    courseType: v.union(
      v.literal("initial"),
      v.literal("recurrent"),
      v.literal("oem"),
      v.literal("regulatory"),
      v.literal("safety"),
      v.literal("hazmat"),
      v.literal("custom"),
    ),
    provider: v.optional(v.string()),
    completedAt: v.number(),
    expiresAt: v.optional(v.number()),
    certificateNumber: v.optional(v.string()),
    documentStorageId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let status: "current" | "expiring_soon" | "expired" = "current";
    if (args.expiresAt) {
      if (args.expiresAt <= now) {
        status = "expired";
      } else if (args.expiresAt <= now + 30 * 24 * 60 * 60 * 1000) {
        status = "expiring_soon";
      }
    }
    return await ctx.db.insert("trainingRecords", {
      ...args,
      status,
      createdAt: now,
    });
  },
});

export const createQualificationRequirement = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    requiredCourses: v.array(v.string()),
    recurrencyMonths: v.optional(v.number()),
    applicableRoles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("qualificationRequirements", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateTrainingStatus = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const records = await ctx.db
      .query("trainingRecords")
      .withIndex("by_org", (q) => q.eq("organizationId", orgId))
      .collect();

    let updated = 0;
    for (const record of records) {
      if (!record.expiresAt) continue;
      let newStatus: "current" | "expiring_soon" | "expired";
      if (record.expiresAt <= now) {
        newStatus = "expired";
      } else if (record.expiresAt <= now + thirtyDays) {
        newStatus = "expiring_soon";
      } else {
        newStatus = "current";
      }
      if (newStatus !== record.status) {
        await ctx.db.patch(record._id, { status: newStatus });
        updated++;
      }
    }
    return { updated };
  },
});
