import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { organizationId: v.id("organizations"), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("loanerItems").withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId)).collect();
    if (args.status) return all.filter((i) => i.status === args.status);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("loanerItems") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const getHistory = query({
  args: { loanerItemId: v.id("loanerItems") },
  handler: async (ctx, args) => {
    return await ctx.db.query("loanerHistory").withIndex("by_item", (q) => q.eq("loanerItemId", args.loanerItemId)).collect();
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    partNumber: v.string(),
    serialNumber: v.optional(v.string()),
    description: v.string(),
    dailyRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("loanerItems", { ...args, status: "available", createdAt: Date.now() });
  },
});

export const loanOut = mutation({
  args: {
    id: v.id("loanerItems"),
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    workOrderId: v.optional(v.id("workOrders")),
    expectedReturnDate: v.optional(v.number()),
    conditionOut: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "loaned_out",
      loanedToCustomerId: args.customerId,
      loanedToWorkOrderId: args.workOrderId,
      loanedDate: now,
      expectedReturnDate: args.expectedReturnDate,
      conditionOut: args.conditionOut,
      updatedAt: now,
    });
    await ctx.db.insert("loanerHistory", {
      loanerItemId: args.id,
      organizationId: args.organizationId,
      action: "loaned",
      customerId: args.customerId,
      workOrderId: args.workOrderId,
      notes: args.notes,
      createdAt: now,
    });
  },
});

export const returnItem = mutation({
  args: {
    id: v.id("loanerItems"),
    organizationId: v.id("organizations"),
    conditionIn: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Loaner item not found.");
    // BUG-PC-06 fix: Guard against returning an item that is not currently
    // loaned out. Previously there was no status check — a race condition
    // (two clerks both clicking "Return" simultaneously) or an accidentally
    // triggered mutation could reset a maintenance/retired item to "available"
    // and corrupt the loan history. The UI already prevents the button from
    // appearing for non-loaned-out items, but the backend must also enforce
    // this invariant for correctness and audit trail integrity.
    if (item.status !== "loaned_out") {
      throw new Error(
        `Cannot return loaner item — current status is "${item.status}", expected "loaned_out". ` +
        "The item may have already been returned."
      );
    }
    if (item.organizationId !== args.organizationId) {
      throw new Error("ORG_MISMATCH: loaner item does not belong to the requesting organization.");
    }
    await ctx.db.patch(args.id, {
      status: "available",
      actualReturnDate: now,
      conditionIn: args.conditionIn,
      loanedToCustomerId: undefined,
      loanedToWorkOrderId: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("loanerHistory", {
      loanerItemId: args.id,
      organizationId: args.organizationId,
      action: "returned",
      customerId: item.loanedToCustomerId,
      notes: args.notes,
      createdAt: now,
    });
  },
});
