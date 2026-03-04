// convex/technicianTraining.ts
// Wave 3: CRUD for technician training records.
// Training types: "91.411", "91.413", "borescope", "ndt", or custom strings.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listByTechnician = query({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("technicianTraining")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.technicianId))
      .collect();
  },
});

export const listByOrg = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("technicianTraining")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const addTraining = mutation({
  args: {
    technicianId: v.id("technicians"),
    organizationId: v.string(),
    trainingType: v.string(),
    completedAt: v.number(),
    expiresAt: v.optional(v.number()),
    certificateRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const nowMs = Date.now();
    return ctx.db.insert("technicianTraining", {
      technicianId: args.technicianId,
      organizationId: args.organizationId,
      trainingType: args.trainingType,
      completedAt: args.completedAt,
      expiresAt: args.expiresAt,
      certificateRef: args.certificateRef,
      createdAt: nowMs,
    });
  },
});

export const removeTraining = mutation({
  args: { trainingId: v.id("technicianTraining") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.trainingId);
    if (!record) throw new Error("Training record not found");
    await ctx.db.delete(args.trainingId);
  },
});
