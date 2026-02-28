// convex/simRunner.ts — Simulation runner for DOM/QCM testing
// Bypasses Clerk auth by inserting directly into DB
// DELETE THIS FILE before production deployment

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Link a Clerk user to an existing technician record ──
export const linkClerkUser = mutation({
  args: {
    technicianId: v.id("technicians"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.technicianId, { userId: args.clerkUserId });
    return { ok: true };
  },
});

// ── Create Task Card (no auth) ──
export const createTaskCard = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    taskCardNumber: v.string(),
    title: v.string(),
    taskType: v.union(
      v.literal("inspection"), v.literal("repair"), v.literal("replacement"),
      v.literal("ad_compliance"), v.literal("functional_check"), v.literal("rigging"),
      v.literal("return_to_service"), v.literal("overhaul"), v.literal("modification")
    ),
    approvedDataSource: v.string(),
    assignedToTechnicianId: v.optional(v.id("technicians")),
    steps: v.array(v.object({
      stepNumber: v.float64(),
      description: v.string(),
      signOffRequired: v.boolean(),
      signOffRequiresIa: v.boolean(),
      requiresSpecialTool: v.boolean(),
      specialToolReference: v.optional(v.string()),
      estimatedDurationMinutes: v.optional(v.float64()),
    })),
  },
  handler: async (ctx, args) => {
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error("WO not found");
    const now = Date.now();

    const tcId = await ctx.db.insert("taskCards", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      aircraftId: wo.aircraftId,
      taskCardNumber: args.taskCardNumber,
      title: args.title,
      taskType: args.taskType,
      approvedDataSource: args.approvedDataSource,
      status: "not_started",
      stepCount: args.steps.length,
      completedStepCount: 0,
      naStepCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    for (const s of args.steps) {
      await ctx.db.insert("taskCardSteps", {
        organizationId: args.organizationId,
        taskCardId: tcId,
        workOrderId: args.workOrderId,
        aircraftId: wo.aircraftId,
        stepNumber: s.stepNumber,
        description: s.description,
        status: "pending",
        signOffRequired: s.signOffRequired,
        signOffRequiresIa: s.signOffRequiresIa,
        requiresSpecialTool: s.requiresSpecialTool,
        specialToolReference: s.specialToolReference,
        estimatedDurationMinutes: s.estimatedDurationMinutes,
        discrepancyIds: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    return { taskCardId: tcId, stepsCreated: args.steps.length };
  },
});

// ── Start Step ──
export const startStep = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    stepNumber: v.float64(),
    technicianId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    const steps = await ctx.db.query("taskCardSteps")
      .filter(q => q.eq(q.field("taskCardId"), args.taskCardId))
      .collect();
    const step = steps.find(s => s.stepNumber === args.stepNumber);
    if (!step) throw new Error(`Step ${args.stepNumber} not found`);

    await ctx.db.patch(step._id, {
      status: "in_progress",
      startedAt: Date.now(),
      startedByTechnicianId: args.technicianId,
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.taskCardId, { status: "in_progress", updatedAt: Date.now() });
    return { stepId: step._id, status: "in_progress" };
  },
});

// ── Complete Step ──
export const completeStep = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    stepNumber: v.float64(),
    technicianId: v.id("technicians"),
    notes: v.optional(v.string()),
    partsInstalled: v.optional(v.array(v.object({
      partNumber: v.string(),
      description: v.string(),
      quantity: v.float64(),
    }))),
    approvedDataReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const steps = await ctx.db.query("taskCardSteps")
      .filter(q => q.eq(q.field("taskCardId"), args.taskCardId))
      .collect();
    const step = steps.find(s => s.stepNumber === args.stepNumber);
    if (!step) throw new Error(`Step ${args.stepNumber} not found`);

    const now = Date.now();
    await ctx.db.patch(step._id, {
      status: "completed",
      signedAt: now,
      signedByTechnicianId: args.technicianId,
      notes: args.notes,
      partsInstalled: args.partsInstalled?.map(p => ({ ...p, serialNumber: undefined, partId: undefined })),
      approvedDataReference: args.approvedDataReference,
      updatedAt: now,
    });

    // Update task card completion count
    const allSteps = await ctx.db.query("taskCardSteps")
      .filter(q => q.eq(q.field("taskCardId"), args.taskCardId))
      .collect();
    const completed = allSteps.filter(s => s._id === step._id ? true : s.status === "completed").length;
    const isComplete = completed === allSteps.length;
    await ctx.db.patch(args.taskCardId, {
      completedStepCount: completed,
      status: isComplete ? "complete" : "in_progress",
      updatedAt: now,
    });

    return { stepId: step._id, status: "completed", taskCardComplete: isComplete };
  },
});

// ── Sign Task Card (Inspector) ──
export const signTaskCard = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    technicianId: v.id("technicians"),
    signatureType: v.union(v.literal("inspector"), v.literal("rts")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.signatureType === "inspector") {
      await ctx.db.patch(args.taskCardId, {
        inspectorTechnicianId: args.technicianId,
        inspectorSignedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.taskCardId, {
        rtsTechnicianId: args.technicianId,
        rtsSignedAt: now,
        updatedAt: now,
      });
    }
    return { signed: true, type: args.signatureType };
  },
});

// ── Clock In ──
export const clockIn = mutation({
  args: {
    organizationId: v.id("organizations"),
    technicianId: v.id("technicians"),
    workOrderId: v.id("workOrders"),
    taskCardId: v.optional(v.id("taskCards")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("timeEntries", {
      orgId: args.organizationId,
      technicianId: args.technicianId,
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      clockInAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { timeEntryId: id, clockedIn: now };
  },
});

// ── Clock Out ──
export const clockOut = mutation({
  args: {
    timeEntryId: v.id("timeEntries"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.timeEntryId);
    if (!entry) throw new Error("Time entry not found");
    const now = Date.now();
    const minutes = (now - entry.clockInAt) / 60000;
    await ctx.db.patch(args.timeEntryId, {
      clockOutAt: now,
      durationMinutes: minutes,
      notes: args.notes,
      updatedAt: now,
    });
    return { clockedOut: now, durationMinutes: Math.round(minutes * 100) / 100 };
  },
});

// ── Open Discrepancy ──
export const openDiscrepancy = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),
    taskCardId: v.optional(v.id("taskCards")),
    description: v.string(),
    severity: v.union(v.literal("minor"), v.literal("major"), v.literal("critical"), v.literal("observation")),
    priority: v.union(v.literal("routine"), v.literal("urgent"), v.literal("aog"), v.literal("deferred")),
    foundByTechnicianId: v.id("technicians"),
    foundDuring: v.union(
      v.literal("annual_inspection"), v.literal("100hr_inspection"),
      v.literal("progressive_inspection"), v.literal("routine_maintenance"),
      v.literal("preflight"), v.literal("pilot_report"),
      v.literal("ad_compliance_check"), v.literal("other")
    ),
    aircraftHours: v.float64(),
    componentAffected: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("discrepancies")
      .filter(q => q.eq(q.field("workOrderId"), args.workOrderId))
      .collect();
    const num = `SQ-DOM-${(existing.length + 1).toString().padStart(3, "0")}`;

    const id = await ctx.db.insert("discrepancies", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      aircraftId: args.aircraftId,
      taskCardId: args.taskCardId,
      discrepancyNumber: num,
      description: args.description,
      severity: args.severity,
      priority: args.priority,
      status: "open",
      foundByTechnicianId: args.foundByTechnicianId,
      foundAt: now,
      foundDuring: args.foundDuring,
      foundAtAircraftHours: args.aircraftHours,
      // adComplianceReviewed and adComplianceReferenceIds are on airworthinessDirectives, not discrepancies
      createdAt: now,
      updatedAt: now,
    });
    return { discrepancyId: id, number: num };
  },
});

// ── Create Quote ──
export const createQuote = mutation({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    aircraftId: v.id("aircraft"),
    workOrderId: v.optional(v.id("workOrders")),
    technicianId: v.id("technicians"),
    laborTotal: v.float64(),
    partsTotal: v.float64(),
    tax: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("quotes")
      .filter(q => q.eq(q.field("orgId"), args.organizationId))
      .collect();
    const num = `Q-DOM-${(existing.length + 1).toString().padStart(3, "0")}`;

    const subtotal = args.laborTotal + args.partsTotal;
    const tax = args.tax ?? 0;

    const id = await ctx.db.insert("quotes", {
      orgId: args.organizationId,
      quoteNumber: num,
      customerId: args.customerId,
      aircraftId: args.aircraftId,
      workOrderId: args.workOrderId,
      createdByTechId: args.technicianId,
      status: "DRAFT",
      laborTotal: args.laborTotal,
      partsTotal: args.partsTotal,
      subtotal,
      tax,
      total: subtotal + tax,
      expiresAt: now + 30 * 86400000,
      createdAt: now,
      updatedAt: now,
    });
    return { quoteId: id, number: num, total: subtotal + tax };
  },
});

// ── Update WO Status ──
export const updateWOStatus = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    status: v.union(
      v.literal("draft"), v.literal("open"), v.literal("in_progress"),
      v.literal("on_hold"), v.literal("pending_inspection"), v.literal("pending_signoff"),
      v.literal("closed"), v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workOrderId, { status: args.status, updatedAt: Date.now() });
    return { updated: true };
  },
});

// ── List all steps for a task card ──
export const listSteps = query({
  args: { taskCardId: v.id("taskCards") },
  handler: async (ctx, args) => {
    return await ctx.db.query("taskCardSteps")
      .filter(q => q.eq(q.field("taskCardId"), args.taskCardId))
      .collect();
  },
});
