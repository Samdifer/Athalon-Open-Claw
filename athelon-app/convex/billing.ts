// convex/billing.ts
// Athelon — Aviation MRO SaaS Platform
//
// Core billing engine: quotes, invoices, line items, payments, and purchase orders.
//
// Author:      Devraj Anand (Backend Engineer)
// Regulatory:  Marcus Webb
//
// Marcus note: The billing module implements financial controls aligned with
// Part 145 §145.213 (material requisition and control) and internal audit
// requirements. Key invariants enforced here:
//   1. Invoices in SENT or PAID status are immutable — edits throw.
//      This is the billing analog of the maintenance record immutability rule.
//   2. All status transitions produce audit log entries.
//   3. recordPayment updates amountPaid and balance atomically; if balance
//      reaches zero or goes negative, invoice status flips to PAID automatically.
//   4. convertQuoteToWorkOrder creates a new work order from the quote, sets
//      quote.status = CONVERTED, and sets convertedToWorkOrderId. This provides
//      a complete audit trail from customer authorization to maintenance activity.
//
// Number generation: Invoice and quote numbers are org-scoped incrementing
// strings (INV-0001, Q-0001). The counter is derived from the total count of
// existing records for the org, padded to 4 digits. This is a fast approximation;
// uniqueness is enforced via .withIndex lookup before insert.

import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { invoiceSentTemplate, quoteSentTemplate, paymentReceivedTemplate } from "./emailTemplates";
import { requireAuth } from "./lib/authHelpers";
import { getNextNumber } from "./lib/numberGenerator";
import {
  getQuoteLineItems,
  getInvoiceLineItems,
  getPOLineItems,
} from "./lib/billingHelpers";
import { createNotificationHelper } from "./notifications";

// generateUniqueNumber replaced by getNextNumber (convex/lib/numberGenerator.ts)
// which uses an atomic orgCounters document instead of a scan-based loop.

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITY: ASSERT INVOICE IS EDITABLE
//
// Invoices in SENT or PAID status are immutable. This guard is called at the
// top of any mutation that modifies invoice content or line items.
// ─────────────────────────────────────────────────────────────────────────────

function assertInvoiceEditable(status: string, invoiceId: string): void {
  if (status === "SENT" || status === "PARTIAL" || status === "PAID") {
    throw new Error(
      `Invoice ${invoiceId} is in status "${status}" and cannot be edited. ` +
      `Invoices in SENT, PARTIAL, or PAID status are immutable. ` +
      `Issue a credit memo or void and recreate to make corrections.`,
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// QUOTES
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createQuote
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a new quote in DRAFT status for the given customer and aircraft. */
export const createQuote = mutation({
  args: {
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    aircraftId: v.id("aircraft"),
    workOrderId: v.optional(v.id("workOrders")),
    createdByTechId: v.id("technicians"),
    expiresAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"quotes">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const org = await ctx.db.get(args.orgId);
    if (!org || !org.active) throw new Error(`Organization ${args.orgId} not found or inactive.`);

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== args.orgId) {
      throw new Error(`Customer ${args.customerId} not found or does not belong to org.`);
    }

    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) throw new Error(`Aircraft ${args.aircraftId} not found.`);

    const quoteNumber = await getNextNumber(ctx, args.orgId, "quote", "Q");

    const quoteId = await ctx.db.insert("quotes", {
      orgId: args.orgId,
      customerId: args.customerId,
      aircraftId: args.aircraftId,
      workOrderId: args.workOrderId,
      status: "DRAFT",
      quoteNumber,
      createdByTechId: args.createdByTechId,
      expiresAt: args.expiresAt,
      laborTotal: 0,
      partsTotal: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "quotes",
      recordId: quoteId,
      userId: callerUserId,
      notes: `Quote ${quoteNumber} created in DRAFT for customer ${customer.name}, aircraft ${aircraft.make} ${aircraft.model} S/N ${aircraft.serialNumber}.`,
      timestamp: now,
    });

    return quoteId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: addQuoteLineItem
// ─────────────────────────────────────────────────────────────────────────────

/** Adds a labor, part, or external service line item to a DRAFT quote. */
export const addQuoteLineItem = mutation({
  args: {
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
    type: v.union(
      v.literal("labor"),
      v.literal("part"),
      v.literal("external_service"),
    ),
    description: v.string(),
    qty: v.number(),
    unitPrice: v.number(),
    technicianId: v.optional(v.id("technicians")),
    partId: v.optional(v.id("parts")),
    departmentSection: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"quoteLineItems">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error(`Quote ${args.quoteId} not found.`);
    if (quote.orgId !== args.orgId) throw new Error(`Quote ${args.quoteId} does not belong to org ${args.orgId}.`);
    if (quote.status !== "DRAFT") {
      throw new Error(`Quote ${args.quoteId} is in status "${quote.status}". Line items can only be added to DRAFT quotes.`);
    }
    if (args.qty <= 0) throw new Error("qty must be greater than 0.");
    if (args.unitPrice < 0) throw new Error("unitPrice must be >= 0.");

    const total = Math.round(args.qty * args.unitPrice * 100) / 100;

    const lineItemId = await ctx.db.insert("quoteLineItems", {
      orgId: args.orgId,
      quoteId: args.quoteId,
      type: args.type,
      description: args.description,
      qty: args.qty,
      unitPrice: args.unitPrice,
      total,
      technicianId: args.technicianId,
      partId: args.partId,
      departmentSection: args.departmentSection,
      createdAt: now,
      updatedAt: now,
    });

    // Recompute quote totals
    await recomputeQuoteTotals(ctx, args.quoteId, args.orgId, callerUserId, now);

    return lineItemId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: removeQuoteLineItem
// ─────────────────────────────────────────────────────────────────────────────

/** Removes a line item from a DRAFT quote and recomputes quote totals. */
export const removeQuoteLineItem = mutation({
  args: {
    orgId: v.id("organizations"),
    lineItemId: v.id("quoteLineItems"),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const item = await ctx.db.get(args.lineItemId);
    if (!item) throw new Error(`Quote line item ${args.lineItemId} not found.`);
    if (item.orgId !== args.orgId) throw new Error(`Line item does not belong to org ${args.orgId}.`);

    const quote = await ctx.db.get(item.quoteId);
    if (!quote) throw new Error(`Quote ${item.quoteId} not found.`);
    if (quote.status !== "DRAFT") {
      throw new Error(`Quote ${item.quoteId} is in status "${quote.status}". Line items can only be removed from DRAFT quotes.`);
    }

    await ctx.db.delete(args.lineItemId);
    await recomputeQuoteTotals(ctx, item.quoteId, args.orgId, callerUserId, now);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getQuote
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a quote with its line items and department sections. */
export const getQuote = query({
  args: {
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
  },

  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error(`Quote ${args.quoteId} not found.`);
    if (quote.orgId !== args.orgId) throw new Error(`Quote ${args.quoteId} does not belong to org ${args.orgId}.`);

    const lineItems = await ctx.db
      .query("quoteLineItems")
      .withIndex("by_org_quote", (q) => q.eq("orgId", args.orgId).eq("quoteId", args.quoteId))
      .collect();

    const departments = await ctx.db
      .query("quoteDepartments")
      .withIndex("by_org_quote", (q) => q.eq("orgId", args.orgId).eq("quoteId", args.quoteId))
      .collect();

    return { ...quote, lineItems, departments };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listQuotes
// ─────────────────────────────────────────────────────────────────────────────

/** Lists quotes for the org with optional status filter. */
export const listQuotes = query({
  args: {
    orgId: v.id("organizations"),
    status: v.optional(v.union(
      v.literal("DRAFT"),
      v.literal("SENT"),
      v.literal("APPROVED"),
      v.literal("CONVERTED"),
      v.literal("DECLINED"),
    )),
    customerId: v.optional(v.id("customers")),
  },

  handler: async (ctx, args) => {
    if (args.status !== undefined) {
      const results = await ctx.db
        .query("quotes")
        .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId).eq("status", args.status!))
        .order("desc")
        .collect();
      if (args.customerId) return results.filter((q) => q.customerId === args.customerId);
      return results;
    }

    if (args.customerId !== undefined) {
      return ctx.db
        .query("quotes")
        .withIndex("by_org_customer", (q) => q.eq("orgId", args.orgId).eq("customerId", args.customerId!))
        .order("desc")
        .collect();
    }

    return ctx.db
      .query("quotes")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: sendQuote
//
// Transitions quote from DRAFT to SENT. All department sections must be in
// SUBMITTED or APPROVED status before sending (FEAT-140 multi-dept gate).
// ─────────────────────────────────────────────────────────────────────────────

/** Sends a quote to the customer. All department sections must be SUBMITTED or APPROVED first. */
export const sendQuote = mutation({
  args: {
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error(`Quote ${args.quoteId} not found.`);
    if (quote.orgId !== args.orgId) throw new Error(`Quote ${args.quoteId} does not belong to org ${args.orgId}.`);
    if (quote.status !== "DRAFT") {
      throw new Error(`Quote ${args.quoteId} must be in DRAFT status to send. Current: "${quote.status}".`);
    }

    // Marcus (FEAT-140): All department sections must be submitted before the
    // quote can be sent to the customer. Pending sections indicate incomplete
    // scope of work — sending would misrepresent the estimate.
    const pendingDepts = await ctx.db
      .query("quoteDepartments")
      .withIndex("by_org_quote", (q) => q.eq("orgId", args.orgId).eq("quoteId", args.quoteId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    if (pendingDepts.length > 0) {
      const names = pendingDepts.map((d) => d.sectionName).join(", ");
      throw new Error(
        `Cannot send quote ${quote.quoteNumber}: ${pendingDepts.length} department section(s) ` +
        `are still PENDING: ${names}. All sections must be SUBMITTED or APPROVED before sending.`,
      );
    }

    await ctx.db.patch(args.quoteId, {
      status: "SENT",
      sentAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "quotes",
      recordId: args.quoteId,
      userId: callerUserId,
      fieldName: "status",
      oldValue: JSON.stringify("DRAFT"),
      newValue: JSON.stringify("SENT"),
      notes: `Quote ${quote.quoteNumber} sent to customer at ${new Date(now).toISOString()}.`,
      timestamp: now,
    });

    // Send email notification to customer
    const customer = await ctx.db.get(quote.customerId);
    if (customer?.email) {
      const html = quoteSentTemplate(
        quote.quoteNumber,
        customer.name,
        "30 days",
        `${process.env.APP_URL ?? "https://app.athelon.aero"}/portal/quotes/${args.quoteId}`,
      );
      await ctx.scheduler.runAfter(0, internal.email.sendEmailInternal, {
        to: customer.email,
        subject: `Quote ${quote.quoteNumber} — Athelon MRO`,
        html,
        organizationId: args.orgId as string,
        relatedTable: "quotes",
        relatedId: args.quoteId as string,
      });
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: approveQuote
// ─────────────────────────────────────────────────────────────────────────────

/** Marks a SENT quote as APPROVED by the customer. */
export const approveQuote = mutation({
  args: {
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error(`Quote ${args.quoteId} not found.`);
    if (quote.orgId !== args.orgId) throw new Error(`Quote ${args.quoteId} does not belong to org.`);
    if (quote.status !== "SENT") {
      throw new Error(`Quote must be in SENT status to approve. Current: "${quote.status}".`);
    }

    await ctx.db.patch(args.quoteId, {
      status: "APPROVED",
      respondedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "quotes",
      recordId: args.quoteId,
      userId: callerUserId,
      fieldName: "status",
      oldValue: JSON.stringify("SENT"),
      newValue: JSON.stringify("APPROVED"),
      notes: `Quote ${quote.quoteNumber} APPROVED by customer. ${args.notes ?? ""}`.trim(),
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: declineQuote
// ─────────────────────────────────────────────────────────────────────────────

/** Marks a SENT quote as DECLINED with a reason. */
export const declineQuote = mutation({
  args: {
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
    declineReason: v.string(),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error(`Quote ${args.quoteId} not found.`);
    if (quote.orgId !== args.orgId) throw new Error(`Quote ${args.quoteId} does not belong to org.`);
    if (quote.status !== "SENT") {
      throw new Error(`Quote must be in SENT status to decline. Current: "${quote.status}".`);
    }
    if (!args.declineReason.trim()) {
      throw new Error("declineReason must be a non-empty string.");
    }

    await ctx.db.patch(args.quoteId, {
      status: "DECLINED",
      respondedAt: now,
      declineReason: args.declineReason.trim(),
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "quotes",
      recordId: args.quoteId,
      userId: callerUserId,
      fieldName: "status",
      oldValue: JSON.stringify("SENT"),
      newValue: JSON.stringify("DECLINED"),
      notes: `Quote ${quote.quoteNumber} DECLINED. Reason: ${args.declineReason.trim()}`,
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: addQuoteDepartmentSection
//
// Adds a department section to a DRAFT quote. Each section is assigned to a
// technician and starts in PENDING status.
// Marcus: Multi-department quotation (FEAT-140) — each shop (avionics, airframe,
// powerplant) must submit its scope before the quote can be sent to the customer.
// ─────────────────────────────────────────────────────────────────────────────

/** Adds a department section to a DRAFT quote. Starts in PENDING status. */
export const addQuoteDepartmentSection = mutation({
  args: {
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
    sectionName: v.string(),
    assignedTechId: v.id("technicians"),
  },

  handler: async (ctx, args): Promise<Id<"quoteDepartments">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error(`Quote ${args.quoteId} not found.`);
    if (quote.orgId !== args.orgId) throw new Error(`Quote does not belong to org ${args.orgId}.`);
    if (quote.status !== "DRAFT") {
      throw new Error(`Department sections can only be added to DRAFT quotes. Current: "${quote.status}".`);
    }
    if (!args.sectionName.trim()) throw new Error("sectionName must be non-empty.");

    const tech = await ctx.db.get(args.assignedTechId);
    if (!tech) throw new Error(`Technician ${args.assignedTechId} not found.`);

    const deptId = await ctx.db.insert("quoteDepartments", {
      orgId: args.orgId,
      quoteId: args.quoteId,
      sectionName: args.sectionName.trim(),
      assignedTechId: args.assignedTechId,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "quoteDepartments",
      recordId: deptId,
      userId: callerUserId,
      technicianId: args.assignedTechId,
      notes:
        `Department section "${args.sectionName.trim()}" added to quote ${quote.quoteNumber}. ` +
        `Assigned to ${tech.legalName ?? args.assignedTechId}. Status: PENDING.`,
      timestamp: now,
    });

    return deptId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: submitDepartmentSection
//
// Marks a quoteDepartments section as SUBMITTED. Must be called by the assigned
// technician (or admin override). Once all sections are SUBMITTED or APPROVED,
// the quote can be sent via sendQuote.
// Marcus (FEAT-140): Prevents sending a quote that has incomplete scope from
// any department. Each section must be explicitly submitted.
// ─────────────────────────────────────────────────────────────────────────────

/** Submits a department section (PENDING → SUBMITTED). All sections must be submitted before sendQuote. */
export const submitDepartmentSection = mutation({
  args: {
    orgId: v.id("organizations"),
    deptSectionId: v.id("quoteDepartments"),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const section = await ctx.db.get(args.deptSectionId);
    if (!section) throw new Error(`Department section ${args.deptSectionId} not found.`);
    if (section.orgId !== args.orgId) throw new Error(`Section does not belong to org ${args.orgId}.`);
    if (section.status === "SUBMITTED") {
      throw new Error(`Department section "${section.sectionName}" is already SUBMITTED.`);
    }
    if (section.status === "APPROVED") {
      throw new Error(`Department section "${section.sectionName}" is already APPROVED.`);
    }

    await ctx.db.patch(args.deptSectionId, {
      status: "SUBMITTED",
      submittedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "quoteDepartments",
      recordId: args.deptSectionId,
      userId: callerUserId,
      technicianId: section.assignedTechId,
      fieldName: "status",
      oldValue: JSON.stringify("PENDING"),
      newValue: JSON.stringify("SUBMITTED"),
      notes:
        `Department section "${section.sectionName}" SUBMITTED at ${new Date(now).toISOString()}. ` +
        (args.notes ?? ""),
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: convertQuoteToWorkOrder
//
// Converts an APPROVED quote into a new work order. Sets quote.status = CONVERTED
// and quote.convertedToWorkOrderId. The new WO inherits aircraft, customer, and
// description from the quote.
//
// Marcus: convertedToWorkOrderId is the audit link between written customer
// authorization (the quote approval) and the maintenance activity. Required for
// 14 CFR Part 91 Appendix D customer authorization traceability.
// ─────────────────────────────────────────────────────────────────────────────

/** Converts an APPROVED quote to a new work order. Sets quote.status=CONVERTED and links the new WO. */
export const convertQuoteToWorkOrder = mutation({
  args: {
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
    workOrderNumber: v.string(),
    workOrderType: v.union(
      v.literal("routine"),
      v.literal("unscheduled"),
      v.literal("annual_inspection"),
      v.literal("100hr_inspection"),
      v.literal("progressive_inspection"),
      v.literal("ad_compliance"),
      v.literal("major_repair"),
      v.literal("major_alteration"),
      v.literal("field_approval"),
      v.literal("ferry_permit"),
    ),
    priority: v.union(v.literal("routine"), v.literal("urgent"), v.literal("aog")),
    description: v.string(),
    targetCompletionDate: v.optional(v.number()),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"workOrders">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error(`Quote ${args.quoteId} not found.`);
    if (quote.orgId !== args.orgId) throw new Error(`Quote ${args.quoteId} does not belong to org.`);
    if (quote.status !== "APPROVED") {
      throw new Error(
        `Quote must be in APPROVED status to convert to work order. Current: "${quote.status}".`,
      );
    }

    if (!args.workOrderNumber.trim()) throw new Error("workOrderNumber must be non-empty.");

    // Verify WO number uniqueness
    const existingWO = await ctx.db
      .query("workOrders")
      .withIndex("by_number", (q) =>
        q.eq("organizationId", args.orgId).eq("workOrderNumber", args.workOrderNumber.trim()),
      )
      .first();
    if (existingWO !== null) {
      throw new Error(`Work order number "${args.workOrderNumber.trim()}" already exists in this organization.`);
    }

    const workOrderId = await ctx.db.insert("workOrders", {
      workOrderNumber: args.workOrderNumber.trim(),
      organizationId: args.orgId,
      aircraftId: quote.aircraftId,
      status: "draft",
      workOrderType: args.workOrderType,
      description: args.description.trim(),
      priority: args.priority,
      targetCompletionDate: args.targetCompletionDate,
      customerId: quote.customerId,
      openedAt: now,
      openedByUserId: callerUserId,
      aircraftTotalTimeAtOpen: 0,
      returnedToService: false,
      createdAt: now,
      updatedAt: now,
    });

    // Mark quote as CONVERTED
    await ctx.db.patch(args.quoteId, {
      status: "CONVERTED",
      convertedToWorkOrderId: workOrderId,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "quotes",
      recordId: args.quoteId,
      userId: callerUserId,
      fieldName: "status",
      oldValue: JSON.stringify("APPROVED"),
      newValue: JSON.stringify("CONVERTED"),
      notes:
        `Quote ${quote.quoteNumber} converted to work order ${args.workOrderNumber.trim()} (ID: ${workOrderId}). ` +
        `Customer authorization link established.`,
      timestamp: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "workOrders",
      recordId: workOrderId,
      userId: callerUserId,
      ipAddress: args.callerIpAddress,
      notes: `Work order ${args.workOrderNumber.trim()} created from quote ${quote.quoteNumber}.`,
      timestamp: now,
    });

    return workOrderId;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// INVOICES
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createInvoiceFromWorkOrder
//
// Creates an invoice from a closed work order, auto-populating line items from
// time entries (labor) and parts consumed. Sets status = DRAFT.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a DRAFT invoice from a closed work order. Auto-populates labor line items
 * from timeEntries and parts line items from maintenanceRecords consumed parts.
 * Labor rates default to 0 — pricing rules must be applied separately via computePrice.
 */
export const createInvoiceFromWorkOrder = mutation({
  args: {
    orgId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    customerId: v.id("customers"),
    createdByTechId: v.id("technicians"),
    quoteId: v.optional(v.id("quotes")),
    taxRateId: v.optional(v.id("taxRates")),
    isProgressBill: v.optional(v.boolean()),
    depositAmount: v.optional(v.number()),
  },

  handler: async (ctx, args): Promise<Id<"invoices">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error(`Work order ${args.workOrderId} not found.`);
    if (wo.organizationId !== args.orgId) throw new Error(`Work order does not belong to org ${args.orgId}.`);
    if (wo.status !== "closed") {
      throw new Error(
        `Work order ${args.workOrderId} must be in "closed" status to generate an invoice. ` +
        `Current status: "${wo.status}".`,
      );
    }

    // ── Resolve tax rate ──────────────────────────────────────────────────
    let taxRatePercent = 0;
    if (args.taxRateId) {
      const taxRate = await ctx.db.get(args.taxRateId);
      if (!taxRate || taxRate.orgId !== args.orgId || !taxRate.active) {
        throw new Error(`Tax rate ${args.taxRateId} not found, inactive, or does not belong to org.`);
      }
      taxRatePercent = taxRate.rate;

      // Check customer tax exemption
      const exemption = await ctx.db
        .query("customerTaxExemptions")
        .withIndex("by_org_customer", (q) =>
          q.eq("orgId", args.orgId).eq("customerId", args.customerId),
        )
        .first();
      if (exemption) {
        const notExpired = !exemption.expiresAt || exemption.expiresAt > now;
        if (notExpired) {
          if (exemption.exemptionType === "full") {
            taxRatePercent = 0;
          }
          // partial exemptions (parts_only, labor_only) handled at line-item level if needed
        }
      }
    }

    const invoiceNumber = await getNextNumber(ctx, args.orgId, "invoice", "INV");

    const invoiceId = await ctx.db.insert("invoices", {
      orgId: args.orgId,
      workOrderId: args.workOrderId,
      customerId: args.customerId,
      quoteId: args.quoteId,
      invoiceNumber,
      status: "DRAFT",
      createdByTechId: args.createdByTechId,
      laborTotal: 0,
      partsTotal: 0,
      subtotal: 0,
      tax: 0, // Will be recalculated after line items are totaled
      total: 0,
      amountPaid: 0,
      balance: 0,
      isProgressBill: args.isProgressBill,
      depositAmount: args.depositAmount,
      createdAt: now,
      updatedAt: now,
    });

    // ── Look up pricing profile for labor rates ─────────────────────────────
    // Try customer-specific profile first, then org default
    let laborRate = 0;
    const customerProfile = await ctx.db
      .query("pricingProfiles")
      .withIndex("by_org_customer", (q) =>
        q.eq("orgId", args.orgId).eq("customerId", args.customerId),
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("effectiveDate"), now),
          q.or(
            q.eq(q.field("expiryDate"), undefined),
            q.gte(q.field("expiryDate"), now),
          ),
        ),
      )
      .first();

    if (customerProfile?.laborRateOverride !== undefined) {
      laborRate = customerProfile.laborRateOverride;
    } else {
      const defaultProfile = await ctx.db
        .query("pricingProfiles")
        .withIndex("by_org_default", (q) =>
          q.eq("orgId", args.orgId).eq("isDefault", true),
        )
        .filter((q) =>
          q.and(
            q.lte(q.field("effectiveDate"), now),
            q.or(
              q.eq(q.field("expiryDate"), undefined),
              q.gte(q.field("expiryDate"), now),
            ),
          ),
        )
        .first();
      if (defaultProfile?.laborRateOverride !== undefined) {
        laborRate = defaultProfile.laborRateOverride;
      }
    }

    // Auto-populate labor line items from time entries
    const timeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org_wo", (q) =>
        q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId),
      )
      .collect();

    // Aggregate time by technician
    const byTech = new Map<string, { techId: Id<"technicians">; totalMinutes: number }>();
    for (const entry of timeEntries) {
      const key = entry.technicianId as string;
      if (!byTech.has(key)) {
        byTech.set(key, { techId: entry.technicianId, totalMinutes: 0 });
      }
      const minutes = entry.durationMinutes ?? 0;
      byTech.get(key)!.totalMinutes += minutes;
    }

    let laborTotal = 0;
    for (const [, { techId, totalMinutes }] of byTech) {
      if (totalMinutes <= 0) continue;
      const tech = await ctx.db.get(techId);
      const hours = Math.round((totalMinutes / 60) * 100) / 100;
      const unitPrice = laborRate;
      const lineTotal = Math.round(hours * unitPrice * 100) / 100;
      laborTotal += lineTotal;
      const rateNote = laborRate === 0 ? " [WARNING: No pricing profile found — rate defaults to $0]" : "";
      await ctx.db.insert("invoiceLineItems", {
        orgId: args.orgId,
        invoiceId,
        type: "labor",
        description: `Labor — ${tech?.legalName ?? String(techId)} (${hours} hrs)${rateNote}`,
        qty: hours,
        unitPrice,
        total: lineTotal,
        technicianId: techId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // ── Recalculate invoice totals with tax ─────────────────────────────────
    const subtotal = laborTotal;
    const tax = Math.round(subtotal * (taxRatePercent / 100) * 100) / 100;
    const total = subtotal + tax;
    await ctx.db.patch(invoiceId, {
      laborTotal,
      subtotal,
      tax,
      total,
      balance: total,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "invoices",
      recordId: invoiceId,
      userId: callerUserId,
      notes:
        `Invoice ${invoiceNumber} created from work order ${wo.workOrderNumber}. ` +
        `${byTech.size} labor line items auto-populated from time entries.`,
      timestamp: now,
    });

    return invoiceId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createInvoiceManual
//
// Creates a blank DRAFT invoice not tied to a specific work order.
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a blank DRAFT invoice manually (no work order required). */
export const createInvoiceManual = mutation({
  args: {
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    createdByTechId: v.id("technicians"),
    workOrderId: v.optional(v.id("workOrders")),
    quoteId: v.optional(v.id("quotes")),
    taxRateId: v.optional(v.id("taxRates")),
    isProgressBill: v.optional(v.boolean()),
    depositAmount: v.optional(v.number()),
  },

  handler: async (ctx, args): Promise<Id<"invoices">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const org = await ctx.db.get(args.orgId);
    if (!org || !org.active) throw new Error(`Organization ${args.orgId} not found or inactive.`);

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== args.orgId) {
      throw new Error(`Customer ${args.customerId} not found or does not belong to org.`);
    }

    // ── Resolve tax rate ──────────────────────────────────────────────────
    let taxRatePercent = 0;
    if (args.taxRateId) {
      const taxRate = await ctx.db.get(args.taxRateId);
      if (!taxRate || taxRate.orgId !== args.orgId || !taxRate.active) {
        throw new Error(`Tax rate ${args.taxRateId} not found, inactive, or does not belong to org.`);
      }
      taxRatePercent = taxRate.rate;

      // Check customer tax exemption
      const exemption = await ctx.db
        .query("customerTaxExemptions")
        .withIndex("by_org_customer", (q) =>
          q.eq("orgId", args.orgId).eq("customerId", args.customerId),
        )
        .first();
      if (exemption) {
        const notExpired = !exemption.expiresAt || exemption.expiresAt > now;
        if (notExpired && exemption.exemptionType === "full") {
          taxRatePercent = 0;
        }
      }
    }

    const invoiceNumber = await getNextNumber(ctx, args.orgId, "invoice", "INV");

    // Manual invoices start with 0 subtotal; tax will be recalculated when line items are added
    const invoiceId = await ctx.db.insert("invoices", {
      orgId: args.orgId,
      workOrderId: args.workOrderId,
      customerId: args.customerId,
      quoteId: args.quoteId,
      invoiceNumber,
      status: "DRAFT",
      createdByTechId: args.createdByTechId,
      laborTotal: 0,
      partsTotal: 0,
      subtotal: 0,
      tax: 0, // Recalculated when line items are added; taxRateId stored for future recalc
      total: 0,
      amountPaid: 0,
      balance: 0,
      isProgressBill: args.isProgressBill,
      depositAmount: args.depositAmount,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "invoices",
      recordId: invoiceId,
      userId: callerUserId,
      notes: `Invoice ${invoiceNumber} created manually for customer ${customer.name}.`,
      timestamp: now,
    });

    return invoiceId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: addInvoiceLineItem
// ─────────────────────────────────────────────────────────────────────────────

/** Adds a line item to a DRAFT invoice. Throws if invoice is SENT or PAID. */
export const addInvoiceLineItem = mutation({
  args: {
    orgId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    type: v.union(
      v.literal("labor"),
      v.literal("part"),
      v.literal("external_service"),
      v.literal("deposit"),
      v.literal("credit"),
    ),
    description: v.string(),
    qty: v.number(),
    unitPrice: v.number(),
    technicianId: v.optional(v.id("technicians")),
    partId: v.optional(v.id("parts")),
  },

  handler: async (ctx, args): Promise<Id<"invoiceLineItems">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error(`Invoice ${args.invoiceId} not found.`);
    if (invoice.orgId !== args.orgId) throw new Error(`Invoice does not belong to org ${args.orgId}.`);

    // Marcus: Immutability gate — SENT and PAID invoices cannot be modified.
    assertInvoiceEditable(invoice.status, args.invoiceId);

    if (args.qty === 0) throw new Error("qty must not be zero.");
    // Allow negative qty for credits

    const total = Math.round(args.qty * args.unitPrice * 100) / 100;

    const lineItemId = await ctx.db.insert("invoiceLineItems", {
      orgId: args.orgId,
      invoiceId: args.invoiceId,
      type: args.type,
      description: args.description,
      qty: args.qty,
      unitPrice: args.unitPrice,
      total,
      technicianId: args.technicianId,
      partId: args.partId,
      createdAt: now,
      updatedAt: now,
    });

    await recomputeInvoiceTotals(ctx, args.invoiceId, args.orgId, callerUserId, now);

    return lineItemId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getInvoice
// ─────────────────────────────────────────────────────────────────────────────

/** Returns an invoice with its line items and payment history. */
export const getInvoice = query({
  args: {
    orgId: v.id("organizations"),
    invoiceId: v.id("invoices"),
  },

  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error(`Invoice ${args.invoiceId} not found.`);
    if (invoice.orgId !== args.orgId) throw new Error(`Invoice does not belong to org ${args.orgId}.`);

    const lineItems = await ctx.db
      .query("invoiceLineItems")
      .withIndex("by_org_invoice", (q) => q.eq("orgId", args.orgId).eq("invoiceId", args.invoiceId))
      .collect();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_org_invoice", (q) => q.eq("orgId", args.orgId).eq("invoiceId", args.invoiceId))
      .collect();

    return { ...invoice, lineItems, payments };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listInvoices
// ─────────────────────────────────────────────────────────────────────────────

/** Lists invoices for the org with optional status and customer filters. */
export const listInvoices = query({
  args: {
    orgId: v.id("organizations"),
    status: v.optional(v.union(
      v.literal("DRAFT"),
      v.literal("SENT"),
      v.literal("PARTIAL"),
      v.literal("PAID"),
      v.literal("VOID"),
    )),
    customerId: v.optional(v.id("customers")),
  },

  handler: async (ctx, args) => {
    if (args.status !== undefined) {
      const results = await ctx.db
        .query("invoices")
        .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId).eq("status", args.status!))
        .order("desc")
        .collect();
      if (args.customerId) return results.filter((i) => i.customerId === args.customerId);
      return results;
    }

    if (args.customerId !== undefined) {
      return ctx.db
        .query("invoices")
        .withIndex("by_org_customer", (q) => q.eq("orgId", args.orgId).eq("customerId", args.customerId!))
        .order("desc")
        .collect();
    }

    return ctx.db
      .query("invoices")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: sendInvoice
// ─────────────────────────────────────────────────────────────────────────────

/** Transitions a DRAFT invoice to SENT status. SENT invoices are immutable. */
export const sendInvoice = mutation({
  args: {
    orgId: v.id("organizations"),
    invoiceId: v.id("invoices"),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error(`Invoice ${args.invoiceId} not found.`);
    if (invoice.orgId !== args.orgId) throw new Error(`Invoice does not belong to org.`);
    if (invoice.status !== "DRAFT") {
      throw new Error(`Invoice must be DRAFT to send. Current: "${invoice.status}".`);
    }

    await ctx.db.patch(args.invoiceId, {
      status: "SENT",
      sentAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "invoices",
      recordId: args.invoiceId,
      userId: callerUserId,
      fieldName: "status",
      oldValue: JSON.stringify("DRAFT"),
      newValue: JSON.stringify("SENT"),
      notes:
        `Invoice ${invoice.invoiceNumber} sent to customer at ${new Date(now).toISOString()}. ` +
        `Invoice is now immutable. Total: $${invoice.total.toFixed(2)}.`,
      timestamp: now,
    });

    // Notify billing managers about sent invoice
    const techs = await ctx.db
      .query("technicians")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.orgId))
      .filter((q) => q.eq(q.field("role"), "billing_manager"))
      .collect();
    for (const tech of techs) {
      if (tech.userId) {
        await createNotificationHelper(ctx, {
          organizationId: args.orgId,
          recipientUserId: tech.userId,
          type: "system",
          title: "Invoice Sent",
          message: `Invoice ${invoice.invoiceNumber} ($${invoice.total.toFixed(2)}) has been sent.`,
          linkTo: `/billing/invoices/${args.invoiceId}`,
        });
      }
    }

    // Send email notification to customer
    const customer = await ctx.db.get(invoice.customerId);
    if (customer?.email) {
      const dueDate = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "Upon receipt";
      const html = invoiceSentTemplate(
        invoice.invoiceNumber,
        customer.name,
        `$${invoice.total.toFixed(2)}`,
        dueDate,
        `${process.env.APP_URL ?? "https://app.athelon.aero"}/portal/invoices/${args.invoiceId}`,
      );
      await ctx.scheduler.runAfter(0, internal.email.sendEmailInternal, {
        to: customer.email,
        subject: `Invoice ${invoice.invoiceNumber} — $${invoice.total.toFixed(2)} — Athelon MRO`,
        html,
        organizationId: args.orgId as string,
        relatedTable: "invoices",
        relatedId: args.invoiceId as string,
      });
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: recordPayment
//
// Records a payment against an invoice. Updates amountPaid and balance atomically.
// If balance <= 0, sets invoice status to PAID.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records a payment against a SENT or PAID invoice. Updates amountPaid and balance.
 * If balance reaches zero or goes negative, invoice status is set to PAID automatically.
 */
export const recordPayment = mutation({
  args: {
    orgId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    amount: v.number(),
    method: v.union(
      v.literal("cash"),
      v.literal("check"),
      v.literal("credit_card"),
      v.literal("wire"),
      v.literal("ach"),
      v.literal("other"),
    ),
    recordedAt: v.number(),
    recordedByTechId: v.id("technicians"),
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"payments">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error(`Invoice ${args.invoiceId} not found.`);
    if (invoice.orgId !== args.orgId) throw new Error(`Invoice does not belong to org.`);
    if (invoice.status === "VOID") {
      throw new Error(`Cannot record payment on a VOID invoice.`);
    }
    if (invoice.status === "DRAFT") {
      throw new Error(`Cannot record payment on a DRAFT invoice. Send it first.`);
    }
    if (args.amount <= 0) throw new Error("Payment amount must be greater than 0.");

    const paymentId = await ctx.db.insert("payments", {
      orgId: args.orgId,
      invoiceId: args.invoiceId,
      amount: args.amount,
      method: args.method,
      recordedAt: args.recordedAt,
      recordedByTechId: args.recordedByTechId,
      referenceNumber: args.referenceNumber,
      notes: args.notes,
      createdAt: now,
    });

    const newAmountPaid = Math.round((invoice.amountPaid + args.amount) * 100) / 100;
    const newBalance = Math.round((invoice.total - newAmountPaid) * 100) / 100;
    const nowPaid = newBalance <= 0;
    const nowPartial = !nowPaid && newBalance > 0 && newAmountPaid > 0;

    let newStatus: "SENT" | "PARTIAL" | "PAID" = invoice.status as "SENT" | "PARTIAL" | "PAID";
    if (nowPaid) {
      newStatus = "PAID";
    } else if (nowPartial) {
      newStatus = "PARTIAL";
    }

    await ctx.db.patch(args.invoiceId, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
      paidAt: nowPaid ? now : invoice.paidAt,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "payments",
      recordId: paymentId,
      userId: callerUserId,
      technicianId: args.recordedByTechId,
      notes:
        `Payment of $${args.amount.toFixed(2)} (${args.method}) recorded on invoice ` +
        `${invoice.invoiceNumber}. New balance: $${newBalance.toFixed(2)}. ` +
        (nowPaid ? "Invoice marked PAID." : nowPartial ? "Invoice marked PARTIAL." : ""),
      timestamp: now,
    });

    if (nowPaid) {
      await ctx.db.insert("auditLog", {
        organizationId: args.orgId,
        eventType: "status_changed",
        tableName: "invoices",
        recordId: args.invoiceId,
        userId: callerUserId,
        fieldName: "status",
        oldValue: JSON.stringify(invoice.status),
        newValue: JSON.stringify("PAID"),
        notes: `Invoice ${invoice.invoiceNumber} fully paid. Total collected: $${newAmountPaid.toFixed(2)}.`,
        timestamp: now,
      });
    } else if (nowPartial) {
      await ctx.db.insert("auditLog", {
        organizationId: args.orgId,
        eventType: "status_changed",
        tableName: "invoices",
        recordId: args.invoiceId,
        userId: callerUserId,
        fieldName: "status",
        oldValue: JSON.stringify(invoice.status),
        newValue: JSON.stringify("PARTIAL"),
        notes: `Invoice ${invoice.invoiceNumber} partially paid. Paid: $${newAmountPaid.toFixed(2)}, Remaining: $${newBalance.toFixed(2)}.`,
        timestamp: now,
      });
    }

    // Notify billing managers about payment
    if (nowPaid) {
      const billingTechs = await ctx.db
        .query("technicians")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.orgId))
        .filter((q) => q.eq(q.field("role"), "billing_manager"))
        .collect();
      for (const tech of billingTechs) {
        if (tech.userId) {
          await createNotificationHelper(ctx, {
            organizationId: args.orgId,
            recipientUserId: tech.userId,
            type: "invoice_paid",
            title: "Invoice Paid",
            message: `Invoice ${invoice.invoiceNumber} has been fully paid ($${newAmountPaid.toFixed(2)}).`,
            linkTo: `/billing/invoices/${args.invoiceId}`,
          });
        }
      }
    }

    // Send payment confirmation email to customer
    const customer = await ctx.db.get(invoice.customerId);
    if (customer?.email) {
      const html = paymentReceivedTemplate(
        invoice.invoiceNumber,
        `$${args.amount.toFixed(2)}`,
        `$${newBalance.toFixed(2)}`,
      );
      await ctx.scheduler.runAfter(0, internal.email.sendEmailInternal, {
        to: customer.email,
        subject: `Payment Received — Invoice ${invoice.invoiceNumber} — Athelon MRO`,
        html,
        organizationId: args.orgId as string,
        relatedTable: "payments",
        relatedId: paymentId as string,
      });
    }

    return paymentId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: voidInvoice
//
// Voids an invoice with a mandatory reason. PAID invoices may not be voided
// once paid — corrections require credit memo (not in MVP).
// Marcus: Voiding a sent invoice is a regulated action that must be logged
// with the reason for audit trail integrity.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Voids a DRAFT or SENT invoice with a mandatory reason string.
 * PAID invoices cannot be voided; issue a credit memo instead.
 */
export const voidInvoice = mutation({
  args: {
    orgId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    voidReason: v.string(),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error(`Invoice ${args.invoiceId} not found.`);
    if (invoice.orgId !== args.orgId) throw new Error(`Invoice does not belong to org.`);
    if (invoice.status === "PAID") {
      throw new Error(
        `Invoice ${invoice.invoiceNumber} is in PAID status and cannot be voided. ` +
        `Issue a credit memo to reverse a paid invoice.`,
      );
    }
    if (invoice.status === "VOID") {
      throw new Error(`Invoice ${invoice.invoiceNumber} is already VOID.`);
    }
    if (!args.voidReason.trim()) {
      throw new Error("voidReason must be a non-empty string.");
    }

    const oldStatus = invoice.status;

    await ctx.db.patch(args.invoiceId, {
      status: "VOID",
      voidedAt: now,
      voidReason: args.voidReason.trim(),
      updatedAt: now,
    });

    // Marcus: Void of a financial document must produce an audit entry capturing
    // who voided it, when, and why. This is non-negotiable for audit trail integrity.
    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "invoices",
      recordId: args.invoiceId,
      userId: callerUserId,
      fieldName: "status",
      oldValue: JSON.stringify(oldStatus),
      newValue: JSON.stringify("VOID"),
      notes:
        `Invoice ${invoice.invoiceNumber} VOIDED from status "${oldStatus}" ` +
        `at ${new Date(now).toISOString()}. Reason: ${args.voidReason.trim()}`,
      timestamp: now,
    });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createPurchaseOrder
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a new DRAFT purchase order for the organization. */
export const createPurchaseOrder = mutation({
  args: {
    orgId: v.id("organizations"),
    vendorId: v.id("vendors"),
    workOrderId: v.optional(v.id("workOrders")),
    requestedByTechId: v.id("technicians"),
    taxRateId: v.optional(v.id("taxRates")),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"purchaseOrders">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const org = await ctx.db.get(args.orgId);
    if (!org || !org.active) throw new Error(`Organization ${args.orgId} not found or inactive.`);

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || vendor.orgId !== args.orgId) {
      throw new Error(`Vendor ${args.vendorId} not found or does not belong to org.`);
    }
    // Marcus: POs may only be issued to vendors on the Approved Vendor List.
    // §145.217(b) procurement controls.
    if (!vendor.isApproved) {
      throw new Error(
        `Vendor "${vendor.name}" is not on the Approved Vendor List. ` +
        `Purchase orders may only be issued to approved vendors per §145.217(b). ` +
        `Contact DOM/QCM to approve this vendor before creating a PO.`,
      );
    }

    const poNumber = await getNextNumber(ctx, args.orgId, "po", "PO");

    const poId = await ctx.db.insert("purchaseOrders", {
      orgId: args.orgId,
      poNumber,
      vendorId: args.vendorId,
      workOrderId: args.workOrderId,
      status: "DRAFT",
      requestedByTechId: args.requestedByTechId,
      notes: args.notes,
      subtotal: 0,
      tax: 0, // Recalculated when PO line items are added/updated; taxRateId resolved at that time
      total: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "record_created",
      tableName: "purchaseOrders",
      recordId: poId,
      userId: callerUserId,
      notes: `PO ${poNumber} created in DRAFT for vendor "${vendor.name}".`,
      timestamp: now,
    });

    return poId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: addPOLineItem
// ─────────────────────────────────────────────────────────────────────────────

/** Adds a line item to a DRAFT purchase order. */
export const addPOLineItem = mutation({
  args: {
    orgId: v.id("organizations"),
    purchaseOrderId: v.id("purchaseOrders"),
    partId: v.optional(v.id("parts")),
    description: v.string(),
    qty: v.number(),
    unitPrice: v.number(),
  },

  handler: async (ctx, args): Promise<Id<"poLineItems">> => {
    const now = Date.now();
    await requireAuth(ctx);

    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) throw new Error(`PO ${args.purchaseOrderId} not found.`);
    if (po.orgId !== args.orgId) throw new Error(`PO does not belong to org.`);
    if (po.status !== "DRAFT") {
      throw new Error(`PO ${args.purchaseOrderId} is in status "${po.status}". Line items can only be added to DRAFT POs.`);
    }
    if (args.qty <= 0) throw new Error("qty must be > 0.");
    if (args.unitPrice < 0) throw new Error("unitPrice must be >= 0.");

    const lineItemId = await ctx.db.insert("poLineItems", {
      orgId: args.orgId,
      purchaseOrderId: args.purchaseOrderId,
      partId: args.partId,
      description: args.description,
      qty: args.qty,
      unitPrice: args.unitPrice,
      receivedQty: 0,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    await recomputePOTotals(ctx, args.purchaseOrderId, now);
    return lineItemId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: submitPO
// ─────────────────────────────────────────────────────────────────────────────

/** Submits a DRAFT PO to the vendor (status → SUBMITTED). */
export const submitPO = mutation({
  args: {
    orgId: v.id("organizations"),
    purchaseOrderId: v.id("purchaseOrders"),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) throw new Error(`PO ${args.purchaseOrderId} not found.`);
    if (po.orgId !== args.orgId) throw new Error(`PO does not belong to org.`);
    if (po.status !== "DRAFT") {
      throw new Error(`PO must be DRAFT to submit. Current: "${po.status}".`);
    }

    const lineItems = await ctx.db
      .query("poLineItems")
      .withIndex("by_po", (q) => q.eq("purchaseOrderId", args.purchaseOrderId))
      .collect();
    if (lineItems.length === 0) {
      throw new Error(`Cannot submit PO ${po.poNumber} with no line items.`);
    }

    await ctx.db.patch(args.purchaseOrderId, {
      status: "SUBMITTED",
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "purchaseOrders",
      recordId: args.purchaseOrderId,
      userId: callerUserId,
      fieldName: "status",
      oldValue: JSON.stringify("DRAFT"),
      newValue: JSON.stringify("SUBMITTED"),
      notes: `PO ${po.poNumber} submitted to vendor. ${lineItems.length} line item(s). Total: $${po.total.toFixed(2)}.`,
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: receivePOItems
//
// Records receipt of one or more line items. Updates receivedQty and line item
// status. If all line items are fully received, PO status moves to RECEIVED;
// if partially received, status moves to PARTIAL (from SUBMITTED).
// ─────────────────────────────────────────────────────────────────────────────

/** Records receipt of PO line items. Updates line item statuses and PO status (PARTIAL or RECEIVED). */
export const receivePOItems = mutation({
  args: {
    orgId: v.id("organizations"),
    purchaseOrderId: v.id("purchaseOrders"),
    receipts: v.array(v.object({
      lineItemId: v.id("poLineItems"),
      receivedQty: v.number(),
    })),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) throw new Error(`PO ${args.purchaseOrderId} not found.`);
    if (po.orgId !== args.orgId) throw new Error(`PO does not belong to org.`);
    if (po.status === "CLOSED" || po.status === "DRAFT") {
      throw new Error(`Cannot receive items on a PO in status "${po.status}".`);
    }

    for (const receipt of args.receipts) {
      const item = await ctx.db.get(receipt.lineItemId);
      if (!item) throw new Error(`PO line item ${receipt.lineItemId} not found.`);
      if (item.purchaseOrderId !== args.purchaseOrderId) {
        throw new Error(`Line item ${receipt.lineItemId} does not belong to PO ${args.purchaseOrderId}.`);
      }
      if (receipt.receivedQty <= 0) throw new Error("receivedQty must be > 0.");

      const newReceivedQty = item.receivedQty + receipt.receivedQty;
      if (newReceivedQty > item.qty) {
        throw new Error(
          `Received qty ${newReceivedQty} would exceed ordered qty ${item.qty} ` +
          `for line item "${item.description}".`,
        );
      }

      const newItemStatus = newReceivedQty >= item.qty ? "RECEIVED" : "PARTIAL";
      await ctx.db.patch(receipt.lineItemId, {
        receivedQty: newReceivedQty,
        status: newItemStatus,
        updatedAt: now,
      });
    }

    // Re-evaluate PO status from all line items
    const allItems = await ctx.db
      .query("poLineItems")
      .withIndex("by_po", (q) => q.eq("purchaseOrderId", args.purchaseOrderId))
      .collect();

    const allReceived = allItems.every((item) => item.status === "RECEIVED" || item.receivedQty >= item.qty);
    const anyReceived = allItems.some((item) => (item.receivedQty + (args.receipts.find((r) => r.lineItemId === item._id)?.receivedQty ?? 0)) > 0);

    const newPoStatus = allReceived ? "RECEIVED" : (anyReceived || po.status === "PARTIAL" ? "PARTIAL" : po.status);

    await ctx.db.patch(args.purchaseOrderId, {
      status: newPoStatus as "SUBMITTED" | "PARTIAL" | "RECEIVED",
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "purchaseOrders",
      recordId: args.purchaseOrderId,
      userId: callerUserId,
      fieldName: "status",
      oldValue: JSON.stringify(po.status),
      newValue: JSON.stringify(newPoStatus),
      notes: `PO ${po.poNumber} receipt recorded. ${args.receipts.length} line item(s) updated. Status → ${newPoStatus}.`,
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: closePO
// ─────────────────────────────────────────────────────────────────────────────

/** Closes a RECEIVED purchase order (status → CLOSED). */
export const closePO = mutation({
  args: {
    orgId: v.id("organizations"),
    purchaseOrderId: v.id("purchaseOrders"),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) throw new Error(`PO ${args.purchaseOrderId} not found.`);
    if (po.orgId !== args.orgId) throw new Error(`PO does not belong to org.`);
    if (po.status !== "RECEIVED") {
      throw new Error(`PO must be in RECEIVED status to close. Current: "${po.status}".`);
    }

    await ctx.db.patch(args.purchaseOrderId, {
      status: "CLOSED",
      notes: args.notes ?? po.notes,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.orgId,
      eventType: "status_changed",
      tableName: "purchaseOrders",
      recordId: args.purchaseOrderId,
      userId: callerUserId,
      fieldName: "status",
      oldValue: JSON.stringify("RECEIVED"),
      newValue: JSON.stringify("CLOSED"),
      notes: `PO ${po.poNumber} closed. ${args.notes ?? ""}`.trim(),
      timestamp: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getPurchaseOrder
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a purchase order with its line items. */
export const getPurchaseOrder = query({
  args: {
    orgId: v.id("organizations"),
    purchaseOrderId: v.id("purchaseOrders"),
  },

  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) throw new Error(`PO ${args.purchaseOrderId} not found.`);
    if (po.orgId !== args.orgId) throw new Error(`PO does not belong to org ${args.orgId}.`);

    const lineItems = await ctx.db
      .query("poLineItems")
      .withIndex("by_po", (q) => q.eq("purchaseOrderId", args.purchaseOrderId))
      .collect();

    return { ...po, lineItems };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listPurchaseOrders
// ─────────────────────────────────────────────────────────────────────────────

/** Lists purchase orders for the org with optional status filter. */
export const listPurchaseOrders = query({
  args: {
    orgId: v.id("organizations"),
    status: v.optional(v.union(
      v.literal("DRAFT"),
      v.literal("SUBMITTED"),
      v.literal("PARTIAL"),
      v.literal("RECEIVED"),
      v.literal("CLOSED"),
    )),
    vendorId: v.optional(v.id("vendors")),
  },

  handler: async (ctx, args) => {
    if (args.status !== undefined) {
      const results = await ctx.db
        .query("purchaseOrders")
        .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId).eq("status", args.status!))
        .order("desc")
        .collect();
      if (args.vendorId) return results.filter((p) => p.vendorId === args.vendorId);
      return results;
    }

    if (args.vendorId !== undefined) {
      return ctx.db
        .query("purchaseOrders")
        .withIndex("by_org_vendor", (q) => q.eq("orgId", args.orgId).eq("vendorId", args.vendorId!))
        .order("desc")
        .collect();
    }

    return ctx.db
      .query("purchaseOrders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS: TOTAL RECOMPUTATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Recomputes quote totals (laborTotal, partsTotal, subtotal, total) from all
 * line items. Called after any line item add/remove operation.
 */
async function recomputeQuoteTotals(
  ctx: MutationCtx,
  quoteId: Id<"quotes">,
  orgId: Id<"organizations">,
  callerUserId: string,
  now: number,
): Promise<void> {
  const items = await getQuoteLineItems(ctx, orgId, quoteId);

  let laborTotal = 0;
  let partsTotal = 0;
  let externalTotal = 0;

  for (const item of items) {
    if (item.type === "labor") laborTotal += item.total;
    else if (item.type === "part") partsTotal += item.total;
    else externalTotal += item.total;
  }

  const subtotal = Math.round((laborTotal + partsTotal + externalTotal) * 100) / 100;

  await ctx.db.patch(quoteId, {
    laborTotal: Math.round(laborTotal * 100) / 100,
    partsTotal: Math.round(partsTotal * 100) / 100,
    subtotal,
    total: subtotal,  // Tax computed separately if needed
    updatedAt: now,
  });
}

/**
 * Recomputes invoice totals from all line items. Handles credits (negative totals)
 * and deposit lines. Tax is currently passed through from existing invoice.tax.
 */
async function recomputeInvoiceTotals(
  ctx: MutationCtx,
  invoiceId: Id<"invoices">,
  orgId: Id<"organizations">,
  callerUserId: string,
  now: number,
): Promise<void> {
  const items = await getInvoiceLineItems(ctx, orgId, invoiceId);

  let laborTotal = 0;
  let partsTotal = 0;
  let otherTotal = 0;

  for (const item of items) {
    if (item.type === "labor") laborTotal += item.total;
    else if (item.type === "part") partsTotal += item.total;
    else otherTotal += item.total;  // external_service, deposit, credit
  }

  const subtotal = Math.round((laborTotal + partsTotal + otherTotal) * 100) / 100;
  const invoice = await ctx.db.get(invoiceId);
  const tax = invoice?.tax ?? 0;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const amountPaid = invoice?.amountPaid ?? 0;
  const balance = Math.round((total - amountPaid) * 100) / 100;

  await ctx.db.patch(invoiceId, {
    laborTotal: Math.round(laborTotal * 100) / 100,
    partsTotal: Math.round(partsTotal * 100) / 100,
    subtotal,
    total,
    balance,
    updatedAt: now,
  });
}

/**
 * Recomputes PO subtotal and total from line items.
 */
async function recomputePOTotals(
  ctx: MutationCtx,
  purchaseOrderId: Id<"purchaseOrders">,
  now: number,
): Promise<void> {
  const items = await getPOLineItems(ctx, purchaseOrderId);

  let subtotal = 0;
  for (const item of items) {
    subtotal += item.unitPrice * item.qty;
  }
  subtotal = Math.round(subtotal * 100) / 100;

  const po = await ctx.db.get(purchaseOrderId);
  const tax = po?.tax ?? 0;
  const total = Math.round((subtotal + tax) * 100) / 100;

  await ctx.db.patch(purchaseOrderId, {
    subtotal,
    total,
    updatedAt: now,
  });
}
