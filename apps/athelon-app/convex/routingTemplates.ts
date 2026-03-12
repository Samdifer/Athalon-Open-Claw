import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const stepValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  estimatedHours: v.number(),
});

export const createTemplate = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    steps: v.array(stepValidator),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("routingTemplates", {
      organizationId: args.organizationId,
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      steps: args.steps,
      createdBy: args.createdBy,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTemplate = mutation({
  args: {
    templateId: v.id("routingTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    steps: v.optional(v.array(stepValidator)),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.templateId);
    if (!record) {
      throw new Error("Routing template not found.");
    }
    const patch: {
      updatedAt: number;
      name?: string;
      description?: string;
      steps?: Array<{ name: string; description?: string; estimatedHours: number }>;
    } = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined) patch.description = args.description.trim() || undefined;
    if (args.steps !== undefined) patch.steps = args.steps;
    await ctx.db.patch(args.templateId, patch);
  },
});

export const deactivateTemplate = mutation({
  args: {
    templateId: v.id("routingTemplates"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.templateId);
    if (!record) {
      throw new Error("Routing template not found.");
    }
    await ctx.db.patch(args.templateId, { isActive: false, updatedAt: Date.now() });
  },
});

export const listTemplates = query({
  args: {
    organizationId: v.string(),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("routingTemplates")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    const filtered = args.includeInactive
      ? records
      : records.filter((r) => r.isActive);
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const applyTemplateToWorkOrder = mutation({
  args: {
    templateId: v.id("routingTemplates"),
    workOrderId: v.id("workOrders"),
    organizationId: v.string(),
    organizationDbId: v.id("organizations"),
    requestedByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Routing template not found.");
    }
    if (!template.isActive) {
      throw new Error("Cannot apply an inactive routing template.");
    }

    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) {
      throw new Error("Work order not found.");
    }
    if (wo.status !== "open" && wo.status !== "in_progress") {
      throw new Error(
        `Cannot apply template — work order status is "${wo.status}". Must be "open" or "in_progress".`,
      );
    }

    const now = Date.now();
    const createdCardIds: string[] = [];

    for (let i = 0; i < template.steps.length; i++) {
      const step = template.steps[i];
      const cardNumber = `RT-${String(i + 1).padStart(3, "0")}`;

      const taskCardId = await ctx.db.insert("taskCards", {
        workOrderId: args.workOrderId,
        aircraftId: wo.aircraftId,
        organizationId: args.organizationDbId,
        taskCardNumber: cardNumber,
        title: step.name,
        taskType: "inspection",
        approvedDataSource: `Routing Template: ${template.name}`,
        status: "not_started",
        stepCount: 1,
        completedStepCount: 0,
        naStepCount: 0,
        estimatedHours: step.estimatedHours,
        notes: step.description || undefined,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("taskCardSteps", {
        taskCardId,
        workOrderId: args.workOrderId,
        aircraftId: wo.aircraftId,
        organizationId: args.organizationDbId,
        stepNumber: 1,
        description: step.description ?? step.name,
        requiresSpecialTool: false,
        signOffRequired: true,
        signOffRequiresIa: false,
        status: "pending",
        discrepancyIds: [],
        createdAt: now,
        updatedAt: now,
      });

      createdCardIds.push(taskCardId);
    }

    if (wo.status === "open") {
      await ctx.db.patch(args.workOrderId, { status: "in_progress" });
    }

    return { createdCount: createdCardIds.length, taskCardIds: createdCardIds };
  },
});
