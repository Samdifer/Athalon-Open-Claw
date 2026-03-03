// convex/taskAssignments.ts
// Wave 6: WO-Level Tech-to-Task Execution Gantt — backend mutations & queries

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listByWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, { workOrderId }) => {
    return await ctx.db
      .query("taskAssignments")
      .withIndex("by_workOrder", (q) => q.eq("workOrderId", workOrderId))
      .collect();
  },
});

export const listByTechnician = query({
  args: { technicianId: v.id("technicians") },
  handler: async (ctx, { technicianId }) => {
    return await ctx.db
      .query("taskAssignments")
      .withIndex("by_technician", (q) => q.eq("technicianId", technicianId))
      .collect();
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const assignTechToTask = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    technicianId: v.id("technicians"),
    scheduledStart: v.number(),
    scheduledEnd: v.number(),
    organizationId: v.string(),
    shopLocationId: v.optional(v.id("shopLocations")),
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    // Validate technician exists
    const tech = await ctx.db.get(args.technicianId);
    if (!tech) throw new Error("Technician not found");

    // Validate task card exists
    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard) throw new Error("Task card not found");

    // Optional: validate training if technicianTraining table has records
    // We do a best-effort check — if the tech has ANY training records,
    // verify they have one matching the task type
    const trainingRecords = await ctx.db
      .query("technicianTraining")
      .filter((q) => q.eq(q.field("technicianId"), args.technicianId))
      .first();

    // If training records exist for this tech, we could validate — but for now
    // we allow assignment and log a warning pattern (no console in Convex mutations,
    // so we just proceed).

    const now = Date.now();
    return await ctx.db.insert("taskAssignments", {
      workOrderId: args.workOrderId,
      taskCardId: args.taskCardId,
      technicianId: args.technicianId,
      organizationId: args.organizationId,
      shopLocationId: args.shopLocationId,
      scheduledStart: args.scheduledStart,
      scheduledEnd: args.scheduledEnd,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const moveAssignment = mutation({
  args: {
    assignmentId: v.id("taskAssignments"),
    newTechId: v.optional(v.id("technicians")),
    newStart: v.optional(v.number()),
    newEnd: v.optional(v.number()),
  },
  handler: async (ctx, { assignmentId, newTechId, newStart, newEnd }) => {
    const existing = await ctx.db.get(assignmentId);
    if (!existing) throw new Error("Assignment not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (newTechId !== undefined) patch.technicianId = newTechId;
    if (newStart !== undefined) patch.scheduledStart = newStart;
    if (newEnd !== undefined) patch.scheduledEnd = newEnd;

    await ctx.db.patch(assignmentId, patch);
  },
});

export const removeAssignment = mutation({
  args: { assignmentId: v.id("taskAssignments") },
  handler: async (ctx, { assignmentId }) => {
    const existing = await ctx.db.get(assignmentId);
    if (!existing) throw new Error("Assignment not found");
    await ctx.db.delete(assignmentId);
  },
});

export const logProgress = mutation({
  args: {
    assignmentId: v.id("taskAssignments"),
    hoursWorked: v.number(),
    percentComplete: v.number(),
  },
  handler: async (ctx, { assignmentId, hoursWorked, percentComplete }) => {
    const existing = await ctx.db.get(assignmentId);
    if (!existing) throw new Error("Assignment not found");

    const newStatus =
      percentComplete >= 100
        ? ("complete" as const)
        : percentComplete > 0
          ? ("in_progress" as const)
          : existing.status;

    await ctx.db.patch(assignmentId, {
      actualHoursLogged: (existing.actualHoursLogged ?? 0) + hoursWorked,
      percentComplete,
      status: newStatus,
      updatedAt: Date.now(),
    });
  },
});
