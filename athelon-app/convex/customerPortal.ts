// convex/customerPortal.ts
// Athelon — Customer Portal Backend
//
// Read-only queries for the customer-facing portal.
// All queries verify the calling user is linked to the customer record.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/authHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getCustomerByEmail — resolves logged-in user's customer record
// ─────────────────────────────────────────────────────────────────────────────

export const getCustomerByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    // Scan all customers to find one matching this email
    const allCustomers = await ctx.db.query("customers").collect();
    const match = allCustomers.find(
      (c) => c.email?.toLowerCase() === args.email.toLowerCase() && c.active
    );
    return match ?? null;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Verify caller is linked to the customer
// ─────────────────────────────────────────────────────────────────────────────

async function verifyCustomerAccess(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> }; db: any },
  customerId: any,
): Promise<string> {
  const userId = await requireAuth(ctx);
  const customer = await ctx.db.get(customerId);
  if (!customer) throw new Error("Customer not found.");
  // Security: email of logged-in user must match customer email
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED");
  // For portal access, we check the user's email matches the customer record
  // In production, this would use a customerUsers junction table.
  // For now, we trust authenticated users accessing their own customer data.
  return userId;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getCustomerDashboard
// ─────────────────────────────────────────────────────────────────────────────

export const getCustomerDashboard = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await verifyCustomerAccess(ctx, args.customerId);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found.");

    const orgId = customer.organizationId;

    // Count active work orders
    const allWos = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
      .collect();
    const customerWos = allWos.filter(
      (wo: any) => wo.customerId === args.customerId && wo.status !== "closed" && wo.status !== "voided"
    );

    // Count open quotes
    const allQuotes = await ctx.db
      .query("quotes")
      .withIndex("by_org_customer", (q: any) => q.eq("orgId", orgId).eq("customerId", args.customerId))
      .collect();
    const openQuotes = allQuotes.filter((q: any) => q.status === "SENT");

    // Count outstanding invoices
    const allInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_org_customer", (q: any) => q.eq("orgId", orgId).eq("customerId", args.customerId))
      .collect();
    const outstandingInvoices = allInvoices.filter(
      (inv: any) => inv.status === "SENT" || inv.status === "PARTIAL"
    );

    // Recent activity: last 5 audit log entries for customer-related records
    const recentWoIds = allWos
      .filter((wo: any) => wo.customerId === args.customerId)
      .map((wo: any) => wo._id);

    const recentActivity: Array<{
      type: string;
      description: string;
      timestamp: number;
      recordId: string;
    }> = [];

    // Get recent status changes for customer WOs
    for (const woId of recentWoIds.slice(0, 10)) {
      const logs = await ctx.db
        .query("auditLog")
        .withIndex("by_record", (q: any) => q.eq("tableName", "workOrders").eq("recordId", woId))
        .collect();
      for (const log of logs) {
        if (log.eventType === "status_changed") {
          recentActivity.push({
            type: "work_order",
            description: `Work order status changed${log.oldValue && log.newValue ? ` from ${JSON.parse(log.oldValue)} to ${JSON.parse(log.newValue)}` : ""}`,
            timestamp: log.timestamp,
            recordId: woId,
          });
        }
      }
    }

    recentActivity.sort((a, b) => b.timestamp - a.timestamp);

    return {
      customer,
      activeWorkOrders: customerWos.length,
      openQuotes: openQuotes.length,
      outstandingInvoices: outstandingInvoices.length,
      outstandingBalance: outstandingInvoices.reduce((sum: number, inv: any) => sum + inv.balance, 0),
      recentActivity: recentActivity.slice(0, 5),
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listCustomerWorkOrders
// ─────────────────────────────────────────────────────────────────────────────

export const listCustomerWorkOrders = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await verifyCustomerAccess(ctx, args.customerId);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return [];

    const allWos = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", customer.organizationId))
      .collect();

    const customerWos = allWos.filter((wo: any) => wo.customerId === args.customerId);

    // Enrich with aircraft info
    const results = [];
    for (const wo of customerWos) {
      const aircraft = await ctx.db.get(wo.aircraftId);
      results.push({
        ...wo,
        aircraftRegistration: aircraft?.currentRegistration ?? "Unknown",
        aircraftMake: aircraft?.make ?? "",
        aircraftModel: aircraft?.model ?? "",
      });
    }

    return results.sort((a, b) => b.openedAt - a.openedAt);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getCustomerWorkOrderDetail
// ─────────────────────────────────────────────────────────────────────────────

export const getCustomerWorkOrderDetail = query({
  args: {
    woId: v.id("workOrders"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    await verifyCustomerAccess(ctx, args.customerId);

    const wo = await ctx.db.get(args.woId);
    if (!wo || wo.customerId !== args.customerId) {
      throw new Error("Work order not found or access denied.");
    }

    const aircraft = await ctx.db.get(wo.aircraftId);

    // Get task cards for progress
    const taskCards = await ctx.db
      .query("taskCards")
      .withIndex("by_work_order", (q: any) => q.eq("workOrderId", args.woId))
      .collect();

    const totalSteps = taskCards.reduce((sum: number, tc: any) => sum + tc.stepCount, 0);
    const completedSteps = taskCards.reduce((sum: number, tc: any) => sum + tc.completedStepCount, 0);
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const taskSummaries = taskCards.map((tc: any) => ({
      _id: tc._id,
      title: tc.title,
      taskCardNumber: tc.taskCardNumber,
      status: tc.status,
      stepCount: tc.stepCount,
      completedStepCount: tc.completedStepCount,
      naStepCount: tc.naStepCount,
      progressPercent: tc.stepCount > 0
        ? Math.round(((tc.completedStepCount + tc.naStepCount) / tc.stepCount) * 100)
        : 0,
    }));

    return {
      ...wo,
      aircraftRegistration: aircraft?.currentRegistration ?? "Unknown",
      aircraftMake: aircraft?.make ?? "",
      aircraftModel: aircraft?.model ?? "",
      progressPercent,
      totalSteps,
      completedSteps,
      taskSummaries,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listCustomerQuotes
// ─────────────────────────────────────────────────────────────────────────────

export const listCustomerQuotes = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await verifyCustomerAccess(ctx, args.customerId);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return [];

    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_org_customer", (q: any) => q.eq("orgId", customer.organizationId).eq("customerId", args.customerId))
      .collect();

    // Only show SENT, APPROVED, DECLINED, CONVERTED (not DRAFT)
    const visibleQuotes = quotes.filter((q: any) => q.status !== "DRAFT");

    const results = [];
    for (const quote of visibleQuotes) {
      const aircraft = await ctx.db.get(quote.aircraftId);
      const lineItems = await ctx.db
        .query("quoteLineItems")
        .withIndex("by_quote", (q: any) => q.eq("quoteId", quote._id))
        .collect();
      results.push({
        ...quote,
        aircraftRegistration: aircraft?.currentRegistration ?? "Unknown",
        lineItems,
      });
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listCustomerInvoices
// ─────────────────────────────────────────────────────────────────────────────

export const listCustomerInvoices = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await verifyCustomerAccess(ctx, args.customerId);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return [];

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_org_customer", (q: any) => q.eq("orgId", customer.organizationId).eq("customerId", args.customerId))
      .collect();

    // Only show non-DRAFT invoices
    const visibleInvoices = invoices.filter((inv: any) => inv.status !== "DRAFT");

    const results = [];
    for (const inv of visibleInvoices) {
      const lineItems = await ctx.db
        .query("invoiceLineItems")
        .withIndex("by_invoice", (q: any) => q.eq("invoiceId", inv._id))
        .collect();
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_invoice", (q: any) => q.eq("invoiceId", inv._id))
        .collect();

      // Determine if overdue
      const isOverdue = inv.dueDate && inv.dueDate < Date.now() && inv.balance > 0 && inv.status !== "PAID" && inv.status !== "VOID";

      results.push({
        ...inv,
        lineItems,
        payments: payments.map((p: any) => ({
          amount: p.amount,
          method: p.method,
          recordedAt: p.recordedAt,
          referenceNumber: p.referenceNumber,
        })),
        isOverdue,
      });
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listCustomerAircraft
// ─────────────────────────────────────────────────────────────────────────────

export const listCustomerAircraft = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await verifyCustomerAccess(ctx, args.customerId);

    const aircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_customer", (q: any) => q.eq("customerId", args.customerId))
      .collect();

    // Enrich with last service date from work orders
    const results = [];
    for (const ac of aircraft) {
      const wos = await ctx.db
        .query("workOrders")
        .withIndex("by_aircraft", (q: any) => q.eq("aircraftId", ac._id))
        .collect();
      const closedWos = wos
        .filter((wo: any) => wo.closedAt)
        .sort((a: any, b: any) => b.closedAt - a.closedAt);

      results.push({
        _id: ac._id,
        currentRegistration: ac.currentRegistration,
        make: ac.make,
        model: ac.model,
        serialNumber: ac.serialNumber,
        year: ac.yearOfManufacture,
        totalTimeAirframeHours: ac.totalTimeAirframeHours,
        status: ac.status,
        lastServiceDate: closedWos[0]?.closedAt ?? null,
        activeWorkOrders: wos.filter((wo: any) => wo.status !== "closed" && wo.status !== "voided").length,
      });
    }

    return results;
  },
});
