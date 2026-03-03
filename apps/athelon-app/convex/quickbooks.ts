// convex/quickbooks.ts
// Athelon — Aviation MRO SaaS Platform
// QuickBooks Online integration scaffold

import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/authHelpers";

// ─── Actions (stubs — will connect to real QB API when credentials are provided) ───

export const syncInvoiceToQB = action({
  args: { organizationId: v.string(), invoiceId: v.string() },
  handler: async (_ctx, args) => {
    console.log(`[QB Stub] Would sync invoice ${args.invoiceId} for org ${args.organizationId}`);
    return { success: true, stub: true, message: "QuickBooks sync stub — no real connection yet." };
  },
});

export const syncCustomerToQB = action({
  args: { organizationId: v.string(), customerId: v.string() },
  handler: async (_ctx, args) => {
    console.log(`[QB Stub] Would sync customer ${args.customerId} for org ${args.organizationId}`);
    return { success: true, stub: true, message: "QuickBooks sync stub — no real connection yet." };
  },
});

export const syncPaymentToQB = action({
  args: { organizationId: v.string(), paymentId: v.string() },
  handler: async (_ctx, args) => {
    console.log(`[QB Stub] Would sync payment ${args.paymentId} for org ${args.organizationId}`);
    return { success: true, stub: true, message: "QuickBooks sync stub — no real connection yet." };
  },
});

export const testConnection = action({
  args: { organizationId: v.string() },
  handler: async (_ctx, args) => {
    console.log(`[QB Stub] Would test connection for org ${args.organizationId}`);
    return {
      success: true,
      stub: true,
      message: "Connection test stub — provide real QB credentials to enable.",
      mockData: { companyName: "Test Company", realmId: "mock-realm-123" },
    };
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getSyncStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("quickbooksSync")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(100);
    const pending = records.filter((r) => r.syncStatus === "pending").length;
    const synced = records.filter((r) => r.syncStatus === "synced").length;
    const failed = records.filter((r) => r.syncStatus === "failed").length;
    return { total: records.length, pending, synced, failed };
  },
});

export const listSyncLog = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("quickbooksSync")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(50);
  },
});

export const getSettings = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("quickbooksSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();
    return settings ?? {
      organizationId: args.organizationId,
      isConnected: false,
      syncInvoices: false,
      syncPayments: false,
      syncCustomers: false,
      syncVendors: false,
      autoSync: false,
    };
  },
});

export const updateSettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    syncInvoices: v.optional(v.boolean()),
    syncPayments: v.optional(v.boolean()),
    syncCustomers: v.optional(v.boolean()),
    syncVendors: v.optional(v.boolean()),
    autoSync: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const existing = await ctx.db
      .query("quickbooksSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const { organizationId, ...updates } = args;
    // Remove undefined values
    const cleanUpdates: Record<string, boolean> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) cleanUpdates[k] = val;
    }

    if (existing) {
      await ctx.db.patch(existing._id, cleanUpdates);
      return existing._id;
    }
    return ctx.db.insert("quickbooksSettings", {
      organizationId,
      isConnected: false,
      syncInvoices: args.syncInvoices ?? false,
      syncPayments: args.syncPayments ?? false,
      syncCustomers: args.syncCustomers ?? false,
      syncVendors: args.syncVendors ?? false,
      autoSync: args.autoSync ?? false,
    });
  },
});
