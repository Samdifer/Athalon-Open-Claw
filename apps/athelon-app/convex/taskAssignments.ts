// convex/taskAssignments.ts
// Wave 6: WO-Level Tech-to-Task Execution Gantt — backend mutations & queries

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireSchedulingManager } from "./shared/helpers/schedulingPermissions";

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
    if (args.scheduledEnd <= args.scheduledStart) {
      throw new Error("scheduledEnd must be after scheduledStart");
    }

    const now = Date.now();

    const [workOrder, tech, taskCard] = await Promise.all([
      ctx.db.get(args.workOrderId),
      ctx.db.get(args.technicianId),
      ctx.db.get(args.taskCardId),
    ]);

    if (!workOrder) throw new Error("Work order not found");
    if (!tech) throw new Error("Technician not found");
    if (!taskCard) throw new Error("Task card not found");

    if (String(workOrder.organizationId) !== args.organizationId) {
      throw new Error("organizationId does not match work order organization");
    }

    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: workOrder.organizationId,
      operation: "task assignment create",
    });

    const assignmentId = await ctx.db.insert("taskAssignments", {
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

    await ctx.db.insert("auditLog", {
      organizationId: workOrder.organizationId,
      eventType: "record_created",
      tableName: "taskAssignments",
      recordId: String(assignmentId),
      userId,
      newValue: JSON.stringify({
        workOrderId: args.workOrderId,
        taskCardId: args.taskCardId,
        technicianId: args.technicianId,
        shopLocationId: args.shopLocationId,
        scheduledStart: args.scheduledStart,
        scheduledEnd: args.scheduledEnd,
        status: "scheduled",
      }),
      notes: `Task assignment created for taskCard ${args.taskCardId}`,
      timestamp: now,
    });

    return assignmentId;
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

    const workOrder = await ctx.db.get(existing.workOrderId);
    if (!workOrder) throw new Error("Linked work order not found");

    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: workOrder.organizationId,
      operation: "task assignment move",
    });

    const nextStart = newStart ?? existing.scheduledStart;
    const nextEnd = newEnd ?? existing.scheduledEnd;
    if (nextEnd <= nextStart) {
      throw new Error("scheduledEnd must be after scheduledStart");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (newTechId !== undefined) patch.technicianId = newTechId;
    if (newStart !== undefined) patch.scheduledStart = newStart;
    if (newEnd !== undefined) patch.scheduledEnd = newEnd;

    await ctx.db.patch(assignmentId, patch);

    await ctx.db.insert("auditLog", {
      organizationId: workOrder.organizationId,
      eventType: "record_updated",
      tableName: "taskAssignments",
      recordId: String(assignmentId),
      userId,
      oldValue: JSON.stringify({
        technicianId: existing.technicianId,
        scheduledStart: existing.scheduledStart,
        scheduledEnd: existing.scheduledEnd,
      }),
      newValue: JSON.stringify({
        technicianId: newTechId ?? existing.technicianId,
        scheduledStart: nextStart,
        scheduledEnd: nextEnd,
      }),
      notes: "Task assignment moved/updated",
      timestamp: Date.now(),
    });
  },
});

export const removeAssignment = mutation({
  args: { assignmentId: v.id("taskAssignments") },
  handler: async (ctx, { assignmentId }) => {
    const existing = await ctx.db.get(assignmentId);
    if (!existing) throw new Error("Assignment not found");

    const workOrder = await ctx.db.get(existing.workOrderId);
    if (!workOrder) throw new Error("Linked work order not found");

    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: workOrder.organizationId,
      operation: "task assignment remove",
    });

    await ctx.db.delete(assignmentId);

    await ctx.db.insert("auditLog", {
      organizationId: workOrder.organizationId,
      eventType: "record_updated",
      tableName: "taskAssignments",
      recordId: String(assignmentId),
      userId,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify({ deleted: true }),
      notes: "Task assignment removed",
      timestamp: Date.now(),
    });
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

    const workOrder = await ctx.db.get(existing.workOrderId);
    if (!workOrder) throw new Error("Linked work order not found");

    const { userId } = await requireSchedulingManager(ctx, {
      organizationId: workOrder.organizationId,
      operation: "task assignment progress update",
    });

    const newStatus =
      percentComplete >= 100
        ? ("complete" as const)
        : percentComplete > 0
          ? ("in_progress" as const)
          : existing.status;

    const updatedHours = (existing.actualHoursLogged ?? 0) + hoursWorked;
    const now = Date.now();

    await ctx.db.patch(assignmentId, {
      actualHoursLogged: updatedHours,
      percentComplete,
      status: newStatus,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: workOrder.organizationId,
      eventType: "record_updated",
      tableName: "taskAssignments",
      recordId: String(assignmentId),
      userId,
      oldValue: JSON.stringify({
        actualHoursLogged: existing.actualHoursLogged ?? 0,
        percentComplete: existing.percentComplete ?? 0,
        status: existing.status,
      }),
      newValue: JSON.stringify({
        actualHoursLogged: updatedHours,
        percentComplete,
        status: newStatus,
      }),
      notes: "Task assignment progress logged",
      timestamp: now,
    });
  },
});
