// convex/customerPortal.ts
// Athelon — Customer Portal Backend
//
// Customer-facing read-safe queries + customer request messaging.
// All record access is scoped to the authenticated customer's owned records.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/authHelpers";

async function getCallerEmail(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  const email = identity?.email?.toLowerCase().trim();
  if (!email) throw new Error("UNAUTHENTICATED: Email not available on identity.");
  return email;
}

async function verifyCustomerAccess(
  ctx: any,
  customerId: Id<"customers">,
): Promise<any> {
  await requireAuth(ctx);
  const customer = await ctx.db.get(customerId);
  if (!customer || !customer.active) throw new Error("Customer not found.");

  const callerEmail = await getCallerEmail(ctx);
  const customerEmail = customer.email?.toLowerCase().trim();
  if (!customerEmail || callerEmail !== customerEmail) {
    throw new Error("ACCESS_DENIED: Portal access is limited to your customer account records.");
  }

  return customer;
}

async function requireStaffOrgAccess(
  ctx: any,
  organizationId: Id<"organizations">,
): Promise<string> {
  const userId = await requireAuth(ctx);

  const membership = await ctx.db
    .query("technicians")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .first();

  if (!membership) {
    throw new Error(
      `FORBIDDEN_ORG_ACCESS: user ${userId} is not a member of organization ${organizationId}.`,
    );
  }

  if (membership.status !== "active") {
    throw new Error(
      `FORBIDDEN_ORG_ACCESS: technician membership is ${membership.status}.`,
    );
  }

  return userId;
}

function isWorkOrderCustomerOwned(wo: any, customerId: Id<"customers">, aircraft: any | null): boolean {
  return wo.customerId === customerId || aircraft?.customerId === customerId;
}

function safeParseAuditValue(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : String(parsed);
  } catch {
    return null;
  }
}

export const getCustomerByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const callerEmail = await getCallerEmail(ctx);
    const requested = args.email.toLowerCase().trim();
    if (callerEmail !== requested) {
      throw new Error("ACCESS_DENIED: Cannot resolve customer for another email.");
    }

    const allCustomers = await ctx.db.query("customers").collect();
    const match = allCustomers.find(
      (c) => c.active && c.email?.toLowerCase().trim() === requested,
    );
    return match ?? null;
  },
});

export const getCustomerDashboard = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await verifyCustomerAccess(ctx, args.customerId);
    const orgId = customer.organizationId;

    const allWos = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
      .collect();

    const customerWos = [] as any[];
    for (const wo of allWos) {
      const aircraft = await ctx.db.get(wo.aircraftId);
      if (isWorkOrderCustomerOwned(wo, args.customerId, aircraft)) {
        customerWos.push(wo);
      }
    }

    const activeWos = customerWos.filter(
      (wo: any) => wo.status !== "closed" && wo.status !== "voided",
    );

    const allQuotes = await ctx.db
      .query("quotes")
      .withIndex("by_org_customer", (q: any) =>
        q.eq("orgId", orgId).eq("customerId", args.customerId),
      )
      .collect();
    const openQuotes = allQuotes.filter((q: any) => q.status === "SENT");

    const allInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_org_customer", (q: any) =>
        q.eq("orgId", orgId).eq("customerId", args.customerId),
      )
      .collect();
    const outstandingInvoices = allInvoices.filter(
      (inv: any) => inv.status === "SENT" || inv.status === "PARTIAL",
    );

    const recentActivity: Array<{
      type: string;
      description: string;
      timestamp: number;
      recordId: string;
    }> = [];

    for (const wo of customerWos.slice(0, 10)) {
      const logs = await ctx.db
        .query("auditLog")
        .withIndex("by_record", (q: any) =>
          q.eq("tableName", "workOrders").eq("recordId", wo._id),
        )
        .collect();
      for (const log of logs) {
        if (log.eventType === "status_changed") {
          const oldStatus = safeParseAuditValue(log.oldValue);
          const newStatus = safeParseAuditValue(log.newValue);
          const statusDelta = oldStatus && newStatus ? ` from ${oldStatus} to ${newStatus}` : "";

          recentActivity.push({
            type: "work_order",
            description: `Work order status changed${statusDelta}`,
            timestamp: log.timestamp,
            recordId: wo._id,
          });
        }
      }
    }

    recentActivity.sort((a, b) => b.timestamp - a.timestamp);

    return {
      customer,
      activeWorkOrders: activeWos.length,
      openQuotes: openQuotes.length,
      outstandingInvoices: outstandingInvoices.length,
      outstandingBalance: outstandingInvoices.reduce((sum: number, inv: any) => sum + inv.balance, 0),
      recentActivity: recentActivity.slice(0, 5),
    };
  },
});

export const listCustomerWorkOrders = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await verifyCustomerAccess(ctx, args.customerId);

    const allWos = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", customer.organizationId))
      .collect();

    const results = [] as any[];
    for (const wo of allWos) {
      const aircraft = await ctx.db.get(wo.aircraftId);
      if (!isWorkOrderCustomerOwned(wo, args.customerId, aircraft)) continue;

      const rtsRecord = await ctx.db
        .query("returnToService")
        .withIndex("by_work_order", (q: any) => q.eq("workOrderId", wo._id))
        .first();

      results.push({
        ...wo,
        aircraftRegistration: aircraft?.currentRegistration ?? "Unknown",
        aircraftMake: aircraft?.make ?? "",
        aircraftModel: aircraft?.model ?? "",
        hasRts: !!rtsRecord,
        rtsSignedAt: rtsRecord?.returnToServiceDate ?? null,
      });
    }

    return results.sort((a, b) => b.openedAt - a.openedAt);
  },
});

export const getCustomerWorkOrderDetail = query({
  args: {
    woId: v.id("workOrders"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    await verifyCustomerAccess(ctx, args.customerId);

    const wo = await ctx.db.get(args.woId);
    if (!wo) throw new Error("Work order not found.");

    const aircraft = await ctx.db.get(wo.aircraftId);
    if (!isWorkOrderCustomerOwned(wo, args.customerId, aircraft)) {
      throw new Error("Work order not found or access denied.");
    }

    const taskCards = await ctx.db
      .query("taskCards")
      .withIndex("by_work_order", (q: any) => q.eq("workOrderId", args.woId))
      .collect();

    const discrepancies = await ctx.db
      .query("discrepancies")
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

    const rtsRecord = await ctx.db
      .query("returnToService")
      .withIndex("by_work_order", (q: any) => q.eq("workOrderId", args.woId))
      .first();

    const woParts = await ctx.db
      .query("workOrderParts")
      .withIndex("by_work_order", (q: any) => q.eq("workOrderId", args.woId))
      .collect();

    return {
      ...wo,
      aircraftRegistration: aircraft?.currentRegistration ?? "Unknown",
      aircraftMake: aircraft?.make ?? "",
      aircraftModel: aircraft?.model ?? "",
      serialNumber: aircraft?.serialNumber ?? "",
      progressPercent,
      totalSteps,
      completedSteps,
      taskSummaries,
      discrepancies: discrepancies.map((d: any) => ({
        discrepancyNumber: d.discrepancyNumber,
        description: d.description,
        status: d.status,
        disposition: d.disposition,
      })),
      hasRts: !!rtsRecord,
      rtsRecord: rtsRecord
        ? {
            _id: rtsRecord._id,
            returnToServiceStatement: rtsRecord.returnToServiceStatement,
            returnToServiceDate: rtsRecord.returnToServiceDate,
            iaCertificateNumber: rtsRecord.iaCertificateNumber,
          }
        : null,
      partsSummary: woParts.map((p: any) => ({
        partNumber: p.partNumber,
        serialNumber: p.serialNumber,
        partName: p.partName,
        location: p.status,
      })),
    };
  },
});

export const getCustomerWorkOrderTimeline = query({
  args: {
    woId: v.id("workOrders"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    await verifyCustomerAccess(ctx, args.customerId);

    const wo = await ctx.db.get(args.woId);
    if (!wo) throw new Error("Work order not found.");

    const aircraft = await ctx.db.get(wo.aircraftId);
    if (!isWorkOrderCustomerOwned(wo, args.customerId, aircraft)) {
      throw new Error("Work order not found or access denied.");
    }

    const auditEntries = await ctx.db
      .query("auditLog")
      .withIndex("by_record", (q: any) => q.eq("tableName", "workOrders").eq("recordId", wo._id))
      .collect();

    const timeline = auditEntries
      .filter((entry: any) =>
        entry.eventType === "status_changed" ||
        entry.eventType === "record_created" ||
        entry.eventType === "record_updated",
      )
      .map((entry: any) => {
        const oldStatus = safeParseAuditValue(entry.oldValue);
        const newStatus = safeParseAuditValue(entry.newValue);

        if (entry.eventType === "status_changed" && oldStatus && newStatus) {
          return {
            _id: entry._id,
            timestamp: entry.timestamp,
            type: "status_changed",
            title: "Status updated",
            description: `${oldStatus.replace(/_/g, " ")} → ${newStatus.replace(/_/g, " ")}`,
          };
        }

        return {
          _id: entry._id,
          timestamp: entry.timestamp,
          type: entry.eventType,
          title: entry.eventType === "record_created" ? "Work order opened" : "Work order updated",
          description: entry.notes ?? "Work order updated.",
        };
      });

    if (wo.closedAt) {
      timeline.push({
        _id: `wo-closed-${wo._id}`,
        timestamp: wo.closedAt,
        type: "closed",
        title: "Work complete",
        description: "Work order was closed and released.",
      });
    }

    timeline.sort((a: any, b: any) => b.timestamp - a.timestamp);

    return timeline.slice(0, 100);
  },
});

export const listCustomerQuotes = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await verifyCustomerAccess(ctx, args.customerId);

    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_org_customer", (q: any) =>
        q.eq("orgId", customer.organizationId).eq("customerId", args.customerId),
      )
      .collect();

    const visibleQuotes = quotes.filter((q: any) => q.status !== "DRAFT");

    const results = [] as any[];
    for (const quote of visibleQuotes) {
      const aircraft: any = quote.aircraftId ? await ctx.db.get(quote.aircraftId) : null;
      if (aircraft && aircraft.customerId !== args.customerId) continue;

      const lineItems = await ctx.db
        .query("quoteLineItems")
        .withIndex("by_quote", (q: any) => q.eq("quoteId", quote._id))
        .collect();
      const departments = await ctx.db
        .query("quoteDepartments")
        .withIndex("by_quote", (q: any) => q.eq("quoteId", quote._id))
        .collect();

      const enrichedLineItems = await Promise.all(
        lineItems.map(async (lineItem: any) => {
          const events = await ctx.db
            .query("quoteLineItemDecisionEvents")
            .withIndex("by_line_item", (q: any) => q.eq("lineItemId", lineItem._id))
            .collect();

          return {
            ...lineItem,
            decisionHistory: events
              .sort((a: any, b: any) => b.decidedAt - a.decidedAt)
              .map((event: any) => ({
                decision: event.decision,
                decisionNotes: event.decisionNotes,
                decidedAt: event.decidedAt,
                actorName: event.actorName,
              })),
          };
        }),
      );

      results.push({
        ...quote,
        aircraftRegistration: aircraft?.currentRegistration ?? "Unknown",
        lineItems: enrichedLineItems,
        departments,
      });
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const customerApproveQuote = mutation({
  args: {
    customerId: v.id("customers"),
    quoteId: v.id("quotes"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const customer = await verifyCustomerAccess(ctx, args.customerId);
    const userId = await requireAuth(ctx);
    const now = Date.now();

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error("Quote not found.");
    if (quote.customerId !== args.customerId || quote.orgId !== customer.organizationId) {
      throw new Error("ACCESS_DENIED: Quote not found for this customer.");
    }
    if (quote.status !== "SENT") {
      throw new Error(`Quote must be in SENT status to approve. Current: ${quote.status}`);
    }

    await ctx.db.patch(args.quoteId, {
      status: "APPROVED",
      respondedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: quote.orgId,
      eventType: "status_changed",
      tableName: "quotes",
      recordId: String(args.quoteId),
      userId,
      fieldName: "status",
      oldValue: JSON.stringify("SENT"),
      newValue: JSON.stringify("APPROVED"),
      notes: `Quote ${quote.quoteNumber} APPROVED via customer portal. ${args.notes ?? ""}`.trim(),
      timestamp: now,
    });

    return { ok: true };
  },
});

export const customerDeclineQuote = mutation({
  args: {
    customerId: v.id("customers"),
    quoteId: v.id("quotes"),
    declineReason: v.string(),
  },
  handler: async (ctx, args) => {
    const customer = await verifyCustomerAccess(ctx, args.customerId);
    const userId = await requireAuth(ctx);
    const now = Date.now();

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error("Quote not found.");
    if (quote.customerId !== args.customerId || quote.orgId !== customer.organizationId) {
      throw new Error("ACCESS_DENIED: Quote not found for this customer.");
    }
    if (quote.status !== "SENT") {
      throw new Error(`Quote must be in SENT status to decline. Current: ${quote.status}`);
    }

    const reason = args.declineReason.trim();
    if (!reason) throw new Error("Decline reason is required.");

    await ctx.db.patch(args.quoteId, {
      status: "DECLINED",
      declineReason: reason,
      respondedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: quote.orgId,
      eventType: "status_changed",
      tableName: "quotes",
      recordId: String(args.quoteId),
      userId,
      fieldName: "status",
      oldValue: JSON.stringify("SENT"),
      newValue: JSON.stringify("DECLINED"),
      notes: `Quote ${quote.quoteNumber} DECLINED via customer portal. Reason: ${reason}`,
      timestamp: now,
    });

    return { ok: true };
  },
});

export const customerDecideQuoteLineItem = mutation({
  args: {
    customerId: v.id("customers"),
    quoteId: v.id("quotes"),
    lineItemId: v.id("quoteLineItems"),
    decision: v.union(v.literal("approved"), v.literal("declined"), v.literal("deferred")),
    decisionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const customer = await verifyCustomerAccess(ctx, args.customerId);
    const userId = await requireAuth(ctx);
    const now = Date.now();

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error("Quote not found.");

    if (quote.customerId !== args.customerId || quote.orgId !== customer.organizationId) {
      throw new Error("ACCESS_DENIED: Quote not found for this customer.");
    }
    if (quote.status !== "SENT") {
      throw new Error(`Line item decisions are only allowed when quote status is SENT. Current: ${quote.status}`);
    }

    const lineItem = await ctx.db.get(args.lineItemId);
    if (!lineItem || lineItem.quoteId !== args.quoteId) {
      throw new Error("Line item not found on this quote.");
    }

    const trimmedDecisionNotes = args.decisionNotes?.trim();
    if (trimmedDecisionNotes && trimmedDecisionNotes.length > 2000) {
      throw new Error("Decision notes must be 2000 characters or less.");
    }

    await ctx.db.patch(args.lineItemId, {
      customerDecision: args.decision,
      customerDecisionNotes: trimmedDecisionNotes || undefined,
      customerDecisionAt: now,
      customerDecisionByUserId: userId,
      customerDecisionByName: "Customer Portal",
    });

    await ctx.db.insert("auditLog", {
      organizationId: quote.orgId,
      eventType: "record_updated",
      tableName: "quoteLineItems",
      recordId: String(args.lineItemId),
      userId,
      fieldName: "customerDecision",
      oldValue: JSON.stringify(lineItem.customerDecision ?? null),
      newValue: JSON.stringify(args.decision),
      notes: `Line item decision set to ${args.decision} in customer portal.`,
      timestamp: now,
    });

    return { ok: true };
  },
});

export const listCustomerInvoices = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await verifyCustomerAccess(ctx, args.customerId);

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_org_customer", (q: any) =>
        q.eq("orgId", customer.organizationId).eq("customerId", args.customerId),
      )
      .collect();

    const visibleInvoices = invoices.filter((inv: any) => inv.status !== "DRAFT");

    const results = [] as any[];
    for (const inv of visibleInvoices) {
      const lineItems = await ctx.db
        .query("invoiceLineItems")
        .withIndex("by_invoice", (q: any) => q.eq("invoiceId", inv._id))
        .collect();
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_invoice", (q: any) => q.eq("invoiceId", inv._id))
        .collect();

      const isOverdue =
        inv.dueDate &&
        inv.dueDate < Date.now() &&
        inv.balance > 0 &&
        inv.status !== "PAID" &&
        inv.status !== "VOID";

      const paymentStatus =
        inv.status === "PAID"
          ? "paid"
          : isOverdue
            ? "overdue"
            : inv.amountPaid > 0
              ? "partially_paid"
              : "unpaid";

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
        paymentStatus,
      });
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listCustomerAircraft = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await verifyCustomerAccess(ctx, args.customerId);

    const aircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_customer", (q: any) => q.eq("customerId", args.customerId))
      .collect();

    const results = [] as any[];
    for (const ac of aircraft) {
      const wos = await ctx.db
        .query("workOrders")
        .withIndex("by_aircraft", (q: any) => q.eq("aircraftId", ac._id))
        .collect();
      const customerWos = wos.filter((wo: any) => wo.customerId === args.customerId || ac.customerId === args.customerId);
      const closedWos = customerWos
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
        activeWorkOrders: customerWos.filter((wo: any) => wo.status !== "closed" && wo.status !== "voided").length,
      });
    }

    return results;
  },
});

export const submitCustomerRequest = mutation({
  args: {
    customerId: v.id("customers"),
    subject: v.string(),
    message: v.string(),
    category: v.optional(
      v.union(
        v.literal("general"),
        v.literal("invoice"),
        v.literal("quote"),
        v.literal("work_order"),
        v.literal("technical"),
        v.literal("parts"),
      ),
    ),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
    workOrderId: v.optional(v.id("workOrders")),
    aircraftId: v.optional(v.id("aircraft")),
  },
  handler: async (ctx, args) => {
    const customer = await verifyCustomerAccess(ctx, args.customerId);
    const callerUserId = await requireAuth(ctx);
    const callerEmail = await getCallerEmail(ctx);
    const now = Date.now();

    const trimmedSubject = args.subject.trim();
    const trimmedMessage = args.message.trim();
    if (trimmedSubject.length < 3) {
      throw new Error("Subject must be at least 3 characters.");
    }
    if (trimmedMessage.length < 10) {
      throw new Error("Message must be at least 10 characters.");
    }

    if (args.workOrderId) {
      const wo = await ctx.db.get(args.workOrderId);
      if (!wo) throw new Error("Referenced work order not found.");
      const aircraft = await ctx.db.get(wo.aircraftId);
      if (!isWorkOrderCustomerOwned(wo, args.customerId, aircraft)) {
        throw new Error("ACCESS_DENIED: Work order is not linked to this customer.");
      }
    }

    if (args.aircraftId) {
      const aircraft = await ctx.db.get(args.aircraftId);
      if (!aircraft || aircraft.customerId !== args.customerId) {
        throw new Error("ACCESS_DENIED: Aircraft is not linked to this customer.");
      }
    }

    const requestId = await ctx.db.insert("customerRequests", {
      organizationId: customer.organizationId,
      customerId: customer._id,
      customerNameSnapshot: customer.companyName ?? customer.name,
      customerEmailSnapshot: customer.email,
      workOrderId: args.workOrderId,
      aircraftId: args.aircraftId,
      subject: trimmedSubject,
      message: trimmedMessage,
      category: args.category ?? "general",
      priority: args.priority ?? "normal",
      status: "new",
      submittedByUserId: callerUserId,
      submittedByEmail: callerEmail,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: customer.organizationId,
      eventType: "record_created",
      tableName: "customerRequests",
      recordId: requestId,
      userId: callerUserId,
      notes: `Customer portal request submitted: ${trimmedSubject}`,
      timestamp: now,
    });

    return { requestId };
  },
});

export const listCustomerRequests = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await verifyCustomerAccess(ctx, args.customerId);

    const requests = await ctx.db
      .query("customerRequests")
      .withIndex("by_customer", (q: any) => q.eq("customerId", args.customerId))
      .order("desc")
      .take(100);

    return requests;
  },
});

export const listInboundCustomerRequests = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(v.literal("new"), v.literal("in_review"), v.literal("responded"), v.literal("closed")),
    ),
  },
  handler: async (ctx, args) => {
    await requireStaffOrgAccess(ctx, args.organizationId);

    if (args.status) {
      const scoped = await ctx.db
        .query("customerRequests")
        .withIndex("by_org_status", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("status", args.status),
        )
        .order("desc")
        .take(200);
      return scoped;
    }

    const all = await ctx.db
      .query("customerRequests")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(200);
    return all;
  },
});

export const updateInboundCustomerRequest = mutation({
  args: {
    organizationId: v.id("organizations"),
    requestId: v.id("customerRequests"),
    status: v.union(v.literal("new"), v.literal("in_review"), v.literal("responded"), v.literal("closed")),
    internalResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireStaffOrgAccess(ctx, args.organizationId);
    const now = Date.now();

    const request = await ctx.db.get(args.requestId);
    if (!request || request.organizationId !== args.organizationId) {
      throw new Error("Request not found.");
    }

    await ctx.db.patch(args.requestId, {
      status: args.status,
      internalResponse: args.internalResponse?.trim() || undefined,
      respondedByUserId: args.status === "responded" || args.status === "closed" ? userId : undefined,
      respondedAt: args.status === "responded" || args.status === "closed" ? now : undefined,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "customerRequests",
      recordId: args.requestId,
      userId,
      fieldName: "status",
      oldValue: JSON.stringify(request.status),
      newValue: JSON.stringify(args.status),
      notes: args.internalResponse?.trim() ? `Response: ${args.internalResponse.trim().slice(0, 300)}` : undefined,
      timestamp: now,
    });

    return { ok: true };
  },
});
