// convex/taskAssignmentDependencies.ts
// Dependency links between task assignments within a work order.
// Supports FS/SS/FF/SF types with circular dependency detection.

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireSchedulingManager } from "./shared/helpers/schedulingPermissions";

const dependencyTypeValidator = v.union(
  v.literal("FS"),
  v.literal("SS"),
  v.literal("FF"),
  v.literal("SF"),
);

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listByWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, { workOrderId }) => {
    return await ctx.db
      .query("taskAssignmentDependencies")
      .withIndex("by_workOrder", (q) => q.eq("workOrderId", workOrderId))
      .collect();
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const createDependency = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.string(),
    predecessorId: v.id("taskAssignments"),
    successorId: v.id("taskAssignments"),
    type: dependencyTypeValidator,
    lagMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate entities exist
    const [workOrder, predecessor, successor] = await Promise.all([
      ctx.db.get(args.workOrderId),
      ctx.db.get(args.predecessorId),
      ctx.db.get(args.successorId),
    ]);

    if (!workOrder) throw new Error("Work order not found");
    if (!predecessor) throw new Error("Predecessor assignment not found");
    if (!successor) throw new Error("Successor assignment not found");

    if (String(workOrder.organizationId) !== args.organizationId) {
      throw new Error("organizationId does not match work order organization");
    }
    if (predecessor.workOrderId !== args.workOrderId) {
      throw new Error("Predecessor does not belong to this work order");
    }
    if (successor.workOrderId !== args.workOrderId) {
      throw new Error("Successor does not belong to this work order");
    }

    // Self-link check
    if (args.predecessorId === args.successorId) {
      throw new Error("A task cannot depend on itself");
    }

    // Duplicate check
    const existing = await ctx.db
      .query("taskAssignmentDependencies")
      .withIndex("by_workOrder", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const isDuplicate = existing.some(
      (dep) =>
        dep.predecessorId === args.predecessorId &&
        dep.successorId === args.successorId,
    );
    if (isDuplicate) {
      throw new Error("This dependency already exists");
    }

    // Circular dependency detection (DFS from successor through existing links)
    const adjacency = new Map<string, Array<string>>();
    for (const dep of existing) {
      const list = adjacency.get(dep.predecessorId) ?? [];
      list.push(dep.successorId);
      adjacency.set(dep.predecessorId, list);
    }
    // Add the proposed link
    const proposed = adjacency.get(args.predecessorId) ?? [];
    proposed.push(args.successorId);
    adjacency.set(args.predecessorId, proposed);

    // Check if successorId can reach predecessorId (which would create a cycle)
    const visited = new Set<string>();
    const stack: Array<string> = [args.successorId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === args.predecessorId) {
        throw new Error(
          "Cannot create dependency: it would create a circular dependency chain",
        );
      }
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = adjacency.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }

    // Auth check
    await requireSchedulingManager(ctx, {
      organizationId: workOrder.organizationId,
      operation: "task dependency create",
    });

    const depId = await ctx.db.insert("taskAssignmentDependencies", {
      workOrderId: args.workOrderId,
      organizationId: args.organizationId,
      predecessorId: args.predecessorId,
      successorId: args.successorId,
      type: args.type,
      lagMinutes: args.lagMinutes,
      createdAt: Date.now(),
    });

    return depId;
  },
});

export const updateDependency = mutation({
  args: {
    dependencyId: v.id("taskAssignmentDependencies"),
    type: v.optional(dependencyTypeValidator),
    lagMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dep = await ctx.db.get(args.dependencyId);
    if (!dep) throw new Error("Dependency not found");

    const workOrder = await ctx.db.get(dep.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    await requireSchedulingManager(ctx, {
      organizationId: workOrder.organizationId,
      operation: "task dependency update",
    });

    const patch: Record<string, unknown> = {};
    if (args.type !== undefined) patch.type = args.type;
    if (args.lagMinutes !== undefined) patch.lagMinutes = args.lagMinutes;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.dependencyId, patch);
    }
  },
});

export const removeDependency = mutation({
  args: {
    dependencyId: v.id("taskAssignmentDependencies"),
  },
  handler: async (ctx, { dependencyId }) => {
    const dep = await ctx.db.get(dependencyId);
    if (!dep) throw new Error("Dependency not found");

    const workOrder = await ctx.db.get(dep.workOrderId);
    if (!workOrder) throw new Error("Work order not found");

    await requireSchedulingManager(ctx, {
      organizationId: workOrder.organizationId,
      operation: "task dependency remove",
    });

    await ctx.db.delete(dependencyId);
  },
});
