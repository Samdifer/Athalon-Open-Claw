import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./shared/helpers/authHelpers";

const evidenceTypeValidator = v.union(v.literal("in_dock"), v.literal("rts"));
const bucketKeyValidator = v.union(
  v.literal("in_dock_checklist"),
  v.literal("in_dock_video"),
  v.literal("rts_checklist"),
  v.literal("rts_video"),
);

const DEFAULT_BUCKET_ITEMS: Record<"in_dock_checklist" | "rts_checklist", string[]> = {
  in_dock_checklist: [
    "Incoming visual inspection completed",
    "Damage map captured and linked",
    "Logbook/records reviewed",
    "Customer squawks reconciled",
  ],
  rts_checklist: [
    "All task cards signed and complete",
    "All deferred discrepancies dispositioned",
    "RTS statement reviewed for 14 CFR 43.9",
    "Final QA release checklist attached",
  ],
};

export const listTemplates = query({
  args: { organizationId: v.id("organizations"), evidenceType: evidenceTypeValidator },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("evidenceChecklistTemplates")
      .withIndex("by_org_type", (q) => q.eq("organizationId", args.organizationId).eq("evidenceType", args.evidenceType))
      .collect();
  },
});

export const upsertTemplate = mutation({
  args: {
    organizationId: v.id("organizations"),
    evidenceType: evidenceTypeValidator,
    templateId: v.optional(v.id("evidenceChecklistTemplates")),
    name: v.string(),
    items: v.array(v.string()),
    isDefault: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Id<"evidenceChecklistTemplates">> => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    if (args.templateId) {
      const existing = await ctx.db.get(args.templateId);
      if (!existing || existing.organizationId !== args.organizationId) throw new Error("Template not found.");
      await ctx.db.patch(args.templateId, {
        name: args.name.trim(),
        items: args.items.map((i) => i.trim()).filter(Boolean),
        isDefault: args.isDefault ?? existing.isDefault,
        isActive: args.isActive ?? existing.isActive,
        updatedAt: now,
      });
      return args.templateId;
    }

    return await ctx.db.insert("evidenceChecklistTemplates", {
      organizationId: args.organizationId,
      evidenceType: args.evidenceType,
      name: args.name.trim(),
      items: args.items.map((i) => i.trim()).filter(Boolean),
      isDefault: args.isDefault ?? false,
      isActive: args.isActive ?? true,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const applyTemplateToWorkOrder = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    evidenceType: evidenceTypeValidator,
    bucketKey: bucketKeyValidator,
    templateId: v.id("evidenceChecklistTemplates"),
  },
  handler: async (ctx, args): Promise<number> => {
    await requireAuth(ctx);
    const now = Date.now();
    const template = await ctx.db.get(args.templateId);
    if (!template || template.organizationId !== args.organizationId || template.evidenceType !== args.evidenceType) {
      throw new Error("Checklist template not found for this evidence type.");
    }

    const existing = await ctx.db
      .query("workOrderEvidenceChecklistItems")
      .withIndex("by_work_order_bucket", (q) => q.eq("workOrderId", args.workOrderId).eq("bucketKey", args.bucketKey))
      .collect();

    if (existing.length > 0) return existing.length;

    for (let i = 0; i < template.items.length; i++) {
      await ctx.db.insert("workOrderEvidenceChecklistItems", {
        organizationId: args.organizationId,
        workOrderId: args.workOrderId,
        templateId: template._id,
        evidenceType: args.evidenceType,
        bucketKey: args.bucketKey,
        label: template.items[i],
        order: i,
        completed: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return template.items.length;
  },
});

export const ensureDefaultChecklistItems = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    bucketKey: v.union(v.literal("in_dock_checklist"), v.literal("rts_checklist")),
  },
  handler: async (ctx, args): Promise<number> => {
    await requireAuth(ctx);

    const existing = await ctx.db
      .query("workOrderEvidenceChecklistItems")
      .withIndex("by_work_order_bucket", (q) => q.eq("workOrderId", args.workOrderId).eq("bucketKey", args.bucketKey))
      .collect();

    if (existing.length > 0) return existing.length;

    const evidenceType = args.bucketKey === "in_dock_checklist" ? "in_dock" : "rts";

    const defaultTemplate = await ctx.db
      .query("evidenceChecklistTemplates")
      .withIndex("by_org_type", (q) => q.eq("organizationId", args.organizationId).eq("evidenceType", evidenceType))
      .filter((q) => q.and(q.eq(q.field("isDefault"), true), q.eq(q.field("isActive"), true)))
      .first();

    const labels =
      defaultTemplate?.items?.map((i) => i.trim()).filter(Boolean) ??
      DEFAULT_BUCKET_ITEMS[args.bucketKey];

    const now = Date.now();
    for (let i = 0; i < labels.length; i++) {
      await ctx.db.insert("workOrderEvidenceChecklistItems", {
        organizationId: args.organizationId,
        workOrderId: args.workOrderId,
        templateId: defaultTemplate?._id,
        evidenceType,
        bucketKey: args.bucketKey,
        label: labels[i],
        order: i,
        completed: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return labels.length;
  },
});

export const listWorkOrderItems = query({
  args: {
    workOrderId: v.id("workOrders"),
    bucketKey: bucketKeyValidator,
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const items = await ctx.db
      .query("workOrderEvidenceChecklistItems")
      .withIndex("by_work_order_bucket", (q) => q.eq("workOrderId", args.workOrderId).eq("bucketKey", args.bucketKey))
      .collect();
    return items.sort((a, b) => a.order - b.order);
  },
});

export const toggleWorkOrderItem = mutation({
  args: {
    itemId: v.id("workOrderEvidenceChecklistItems"),
    completed: v.boolean(),
    technicianId: v.optional(v.id("technicians")),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireAuth(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Checklist item not found.");

    const workOrder = await ctx.db.get(item.workOrderId);
    if (!workOrder) throw new Error("Work order not found for checklist item.");
    if (workOrder.status === "closed" || workOrder.status === "voided") {
      throw new Error("Evidence checklist is locked after work order close/void.");
    }

    const now = Date.now();
    await ctx.db.patch(args.itemId, {
      completed: args.completed,
      completedAt: args.completed ? now : undefined,
      completedByUserId: args.completed ? userId : undefined,
      completedByTechnicianId: args.completed ? args.technicianId : undefined,
      updatedAt: now,
    });
  },
});
