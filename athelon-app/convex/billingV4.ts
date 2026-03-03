/**
 * billingV4.ts — Billing Gap Fixes (v4)
 *
 * New mutations/queries for gaps identified in billing gap analysis:
 * - GAP-01: Customer CRUD
 * - GAP-04: Invoice due dates & overdue tracking
 * - GAP-05: Payment history
 * - GAP-06: Edit/remove line items
 * - GAP-07: Quote expiration
 * - GAP-09: Credit memos
 * - GAP-11: Discount calculation helper
 * - GAP-13: Quote → Invoice conversion
 * - GAP-25: Billing audit logging
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED: Valid session required.");
  return identity.subject;
}

function normalizeOptional(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function validateTermsDays(value: number | undefined): void {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 0 || value > 365) {
    throw new Error("defaultPaymentTermsDays must be an integer between 0 and 365.");
  }
}

async function requireOrgMembership(
  ctx: { db: any },
  userId: string,
  organizationId: Id<"organizations">,
) {
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

  if (membership.status === "terminated") {
    throw new Error(`FORBIDDEN_ORG_ACCESS: technician membership is terminated.`);
  }

  return membership;
}

async function getCustomerInOrg(
  ctx: { db: any },
  customerId: Id<"customers">,
  organizationId: Id<"organizations">,
) {
  const customer = await ctx.db.get(customerId);
  if (!customer) throw new Error("Customer not found.");
  if (customer.organizationId !== organizationId) throw new Error("ORG_MISMATCH.");
  return customer;
}

// ─── Number generator ─────────────────────────────────────────────────────────
async function getNextNumber(
  ctx: { db: any },
  orgId: string,
  counterType: string,
  prefix: string,
): Promise<string> {
  const counter = await ctx.db
    .query("orgCounters")
    .withIndex("by_org_type", (q: any) => q.eq("orgId", orgId).eq("counterType", counterType))
    .first();
  const next = (counter?.lastValue ?? 0) + 1;
  if (counter) {
    await ctx.db.patch(counter._id, { lastValue: next });
  } else {
    await ctx.db.insert("orgCounters", { orgId, counterType, lastValue: next });
  }
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-01: CUSTOMER CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export const createCustomer = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    companyName: v.optional(v.string()),
    customerType: v.union(
      v.literal("individual"),
      v.literal("company"),
      v.literal("charter_operator"),
      v.literal("flight_school"),
      v.literal("government"),
    ),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    taxExempt: v.optional(v.boolean()),
    defaultPaymentTerms: v.optional(v.string()),
    defaultPaymentTermsDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    await requireOrgMembership(ctx, callerUserId, args.organizationId);

    const trimmedName = args.name.trim();
    if (!trimmedName) throw new Error("Customer name is required.");
    validateTermsDays(args.defaultPaymentTermsDays);

    const normalizedName = normalizeOptional(trimmedName);
    const normalizedCompany = normalizeOptional(args.companyName);
    const normalizedEmail = normalizeOptional(args.email);

    const existingCustomers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const duplicate = existingCustomers.find((customer: any) => {
      const sameName = normalizeOptional(customer.name) === normalizedName;
      if (!sameName) return false;

      const sameCompany =
        normalizedCompany !== null &&
        normalizeOptional(customer.companyName) === normalizedCompany;
      const sameEmail =
        normalizedEmail !== null && normalizeOptional(customer.email) === normalizedEmail;

      // If neither side has company/email, same-name record is treated as duplicate.
      if (normalizedCompany === null && normalizedEmail === null) {
        return (
          normalizeOptional(customer.companyName) === null &&
          normalizeOptional(customer.email) === null
        );
      }

      return sameCompany || sameEmail;
    });

    if (duplicate) {
      const duplicateStatus = duplicate.active === false ? "inactive" : "active";
      throw new Error(
        `DUPLICATE_CUSTOMER: matching ${duplicateStatus} customer already exists (${duplicate._id}).`,
      );
    }

    const now = Date.now();
    const customerId = await ctx.db.insert("customers", {
      organizationId: args.organizationId,
      name: trimmedName,
      companyName: args.companyName?.trim() || undefined,
      customerType: args.customerType,
      address: args.address?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      email: args.email?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      taxExempt: args.taxExempt,
      defaultPaymentTerms: args.defaultPaymentTerms?.trim() || undefined,
      defaultPaymentTermsDays: args.defaultPaymentTermsDays,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "customers",
      recordId: customerId,
      userId: callerUserId,
      notes: `Customer profile created for ${trimmedName}.`,
      timestamp: now,
    });

    return customerId;
  },
});

export const updateCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    companyName: v.optional(v.string()),
    customerType: v.optional(v.union(
      v.literal("individual"),
      v.literal("company"),
      v.literal("charter_operator"),
      v.literal("flight_school"),
      v.literal("government"),
    )),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    active: v.optional(v.boolean()),
    taxExempt: v.optional(v.boolean()),
    defaultPaymentTerms: v.optional(v.string()),
    defaultPaymentTermsDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    await requireOrgMembership(ctx, callerUserId, args.organizationId);
    const customer = await getCustomerInOrg(
      ctx,
      args.customerId,
      args.organizationId,
    );

    validateTermsDays(args.defaultPaymentTermsDays);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    const changedFields: string[] = [];

    if (args.name !== undefined) {
      const trimmedName = args.name.trim();
      if (!trimmedName) throw new Error("Customer name is required.");
      updates.name = trimmedName;
      changedFields.push("name");
    }
    if (args.companyName !== undefined) updates.companyName = args.companyName.trim() || undefined;
    if (args.companyName !== undefined) changedFields.push("companyName");
    if (args.customerType !== undefined) {
      updates.customerType = args.customerType;
      changedFields.push("customerType");
    }
    if (args.address !== undefined) {
      updates.address = args.address.trim() || undefined;
      changedFields.push("address");
    }
    if (args.phone !== undefined) {
      updates.phone = args.phone.trim() || undefined;
      changedFields.push("phone");
    }
    if (args.email !== undefined) {
      updates.email = args.email.trim() || undefined;
      changedFields.push("email");
    }
    if (args.notes !== undefined) {
      updates.notes = args.notes.trim() || undefined;
      changedFields.push("notes");
    }
    if (args.active !== undefined) {
      updates.active = args.active;
      changedFields.push("active");
    }
    if (args.taxExempt !== undefined) {
      updates.taxExempt = args.taxExempt;
      changedFields.push("taxExempt");
    }
    if (args.defaultPaymentTerms !== undefined) {
      updates.defaultPaymentTerms = args.defaultPaymentTerms.trim() || undefined;
      changedFields.push("defaultPaymentTerms");
    }
    if (args.defaultPaymentTermsDays !== undefined) {
      updates.defaultPaymentTermsDays = args.defaultPaymentTermsDays;
      changedFields.push("defaultPaymentTermsDays");
    }

    await ctx.db.patch(args.customerId, updates);

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "customers",
      recordId: args.customerId,
      userId: callerUserId,
      fieldName: changedFields.join(","),
      oldValue: JSON.stringify({
        name: customer.name,
        companyName: customer.companyName,
        customerType: customer.customerType,
        address: customer.address,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes,
        active: customer.active,
        taxExempt: customer.taxExempt,
        defaultPaymentTerms: customer.defaultPaymentTerms,
        defaultPaymentTermsDays: customer.defaultPaymentTermsDays,
      }),
      newValue: JSON.stringify(updates),
      notes: `Customer profile updated for ${customer.name}.`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const listAllCustomers = query({
  args: { organizationId: v.id("organizations"), includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    await requireOrgMembership(ctx, callerUserId, args.organizationId);

    const all = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    if (args.includeInactive) return all;
    return all.filter((c) => c.active);
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-04: INVOICE DUE DATES & OVERDUE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export const setInvoiceDueDate = mutation({
  args: {
    orgId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    dueDate: v.number(),
    paymentTerms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    await ctx.db.patch(args.invoiceId, {
      dueDate: args.dueDate,
      paymentTerms: args.paymentTerms,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const listOverdueInvoices = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId).eq("status", "SENT"))
      .collect();
    const partials = await ctx.db
      .query("invoices")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId).eq("status", "PARTIAL"))
      .collect();
    const all = [...invoices, ...partials];
    return all
      .filter((inv) => inv.dueDate && inv.dueDate < now)
      .map((inv) => ({
        ...inv,
        daysOverdue: Math.floor((now - (inv.dueDate ?? now)) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  },
});

export const getArAgingSummary = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const DAY = 1000 * 60 * 60 * 24;
    const sent = await ctx.db
      .query("invoices")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId).eq("status", "SENT"))
      .collect();
    const partial = await ctx.db
      .query("invoices")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId).eq("status", "PARTIAL"))
      .collect();
    const outstanding = [...sent, ...partial];

    const buckets = { current: 0, over30: 0, over60: 0, over90: 0, total: 0 };
    const customerBalances: Record<string, { customerId: string; balance: number; oldest: number }> = {};

    for (const inv of outstanding) {
      const age = inv.dueDate ? Math.floor((now - inv.dueDate) / DAY) : 0;
      const bal = inv.balance;
      buckets.total += bal;
      if (age <= 0) buckets.current += bal;
      else if (age <= 30) buckets.over30 += bal;
      else if (age <= 60) buckets.over60 += bal;
      else buckets.over90 += bal;

      const cid = inv.customerId as string;
      if (!customerBalances[cid]) customerBalances[cid] = { customerId: cid, balance: 0, oldest: 0 };
      customerBalances[cid].balance += bal;
      if (age > customerBalances[cid].oldest) customerBalances[cid].oldest = age;
    }

    return {
      buckets,
      invoiceCount: outstanding.length,
      customerBalances: Object.values(customerBalances).sort((a, b) => b.balance - a.balance),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-05: PAYMENT HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export const listPaymentsForInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("payments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();
  },
});

export const listPaymentsForCustomer = query({
  args: { orgId: v.id("organizations"), customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    await requireOrgMembership(ctx, callerUserId, args.orgId);
    await getCustomerInOrg(ctx, args.customerId, args.orgId);

    // Get all invoices for this customer
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_org_customer", (q) => q.eq("orgId", args.orgId).eq("customerId", args.customerId))
      .collect();
    // Get payments for each invoice
    const payments = [];
    for (const inv of invoices) {
      const invPayments = await ctx.db
        .query("payments")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", inv._id))
        .collect();
      payments.push(...invPayments.map((p) => ({ ...p, invoiceNumber: inv.invoiceNumber })));
    }
    return payments.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-06: EDIT/REMOVE LINE ITEMS
// ═══════════════════════════════════════════════════════════════════════════════

export const updateQuoteLineItem = mutation({
  args: {
    orgId: v.id("organizations"),
    lineItemId: v.id("quoteLineItems"),
    description: v.optional(v.string()),
    qty: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const item = await ctx.db.get(args.lineItemId);
    if (!item) throw new Error("Line item not found.");
    if (item.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");

    const quote = await ctx.db.get(item.quoteId);
    if (!quote || quote.status !== "DRAFT") throw new Error("Can only edit line items on DRAFT quotes.");

    const qty = args.qty ?? item.qty;
    const unitPrice = args.unitPrice ?? item.unitPrice;
    const discPct = args.discountPercent ?? item.discountPercent ?? 0;
    const discAmt = args.discountAmount ?? item.discountAmount ?? 0;
    const subtotal = qty * unitPrice;
    const total = Math.round((subtotal - (subtotal * discPct / 100) - discAmt) * 100) / 100;

    await ctx.db.patch(args.lineItemId, {
      description: args.description ?? item.description,
      qty,
      unitPrice,
      discountPercent: discPct || undefined,
      discountAmount: discAmt || undefined,
      total: Math.max(0, total),
    });

    // Recalculate quote totals
    await recalcQuoteTotals(ctx, item.quoteId);
    return { success: true };
  },
});

export const removeQuoteLineItem = mutation({
  args: {
    orgId: v.id("organizations"),
    lineItemId: v.id("quoteLineItems"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const item = await ctx.db.get(args.lineItemId);
    if (!item) throw new Error("Line item not found.");
    if (item.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    const quote = await ctx.db.get(item.quoteId);
    if (!quote || quote.status !== "DRAFT") throw new Error("Can only remove from DRAFT quotes.");

    await ctx.db.delete(args.lineItemId);
    await recalcQuoteTotals(ctx, item.quoteId);
    return { success: true };
  },
});

export const updateInvoiceLineItem = mutation({
  args: {
    orgId: v.id("organizations"),
    lineItemId: v.id("invoiceLineItems"),
    description: v.optional(v.string()),
    qty: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const item = await ctx.db.get(args.lineItemId);
    if (!item) throw new Error("Line item not found.");
    if (item.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    const invoice = await ctx.db.get(item.invoiceId);
    if (!invoice || invoice.status !== "DRAFT") throw new Error("Can only edit DRAFT invoices.");

    const qty = args.qty ?? item.qty;
    const unitPrice = args.unitPrice ?? item.unitPrice;
    const discPct = args.discountPercent ?? item.discountPercent ?? 0;
    const discAmt = args.discountAmount ?? item.discountAmount ?? 0;
    const subtotal = qty * unitPrice;
    const total = Math.round((subtotal - (subtotal * discPct / 100) - discAmt) * 100) / 100;

    await ctx.db.patch(args.lineItemId, {
      description: args.description ?? item.description,
      qty,
      unitPrice,
      discountPercent: discPct || undefined,
      discountAmount: discAmt || undefined,
      total: Math.max(0, total),
    });

    await recalcInvoiceTotals(ctx, item.invoiceId);
    return { success: true };
  },
});

export const removeInvoiceLineItem = mutation({
  args: {
    orgId: v.id("organizations"),
    lineItemId: v.id("invoiceLineItems"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const item = await ctx.db.get(args.lineItemId);
    if (!item) throw new Error("Line item not found.");
    if (item.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    const invoice = await ctx.db.get(item.invoiceId);
    if (!invoice || invoice.status !== "DRAFT") throw new Error("Can only remove from DRAFT invoices.");

    await ctx.db.delete(args.lineItemId);
    await recalcInvoiceTotals(ctx, item.invoiceId);
    return { success: true };
  },
});

// ── Recalc helpers ────────────────────────────────────────────────────────────

async function recalcQuoteTotals(ctx: { db: any }, quoteId: Id<"quotes">) {
  const items = await ctx.db
    .query("quoteLineItems")
    .withIndex("by_org_quote", (q: any) => q.eq("orgId", undefined)) // fallback
    .collect()
    .then((all: any[]) => all.filter((i: any) => i.quoteId === quoteId));
  // Simpler: just get all items for this quote
  const allItems = await ctx.db
    .query("quoteLineItems")
    .filter((q: any) => q.eq(q.field("quoteId"), quoteId))
    .collect();

  let laborTotal = 0;
  let partsTotal = 0;
  for (const item of allItems) {
    if (item.type === "labor") laborTotal += item.total;
    else partsTotal += item.total;
  }
  const subtotal = Math.round((laborTotal + partsTotal) * 100) / 100;
  const quote = await ctx.db.get(quoteId);
  const tax = quote?.tax ?? 0;
  const total = Math.round((subtotal + tax) * 100) / 100;

  await ctx.db.patch(quoteId, { laborTotal, partsTotal, subtotal, total, updatedAt: Date.now() });
}

async function recalcInvoiceTotals(ctx: { db: any }, invoiceId: Id<"invoices">) {
  const allItems = await ctx.db
    .query("invoiceLineItems")
    .filter((q: any) => q.eq(q.field("invoiceId"), invoiceId))
    .collect();

  let laborTotal = 0;
  let partsTotal = 0;
  for (const item of allItems) {
    if (item.type === "labor") laborTotal += item.total;
    else if (item.type === "credit" || item.type === "deposit") partsTotal -= Math.abs(item.total);
    else partsTotal += item.total;
  }
  const subtotal = Math.round((laborTotal + partsTotal) * 100) / 100;
  const invoice = await ctx.db.get(invoiceId);
  const tax = invoice?.tax ?? 0;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const balance = Math.round((total - (invoice?.amountPaid ?? 0)) * 100) / 100;

  await ctx.db.patch(invoiceId, { laborTotal, partsTotal, subtotal, total, balance, updatedAt: Date.now() });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-07: QUOTE EXPIRATION
// ═══════════════════════════════════════════════════════════════════════════════

export const expireQuotes = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    const sent = await ctx.db
      .query("quotes")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId).eq("status", "SENT"))
      .collect();
    const expired = sent.filter((q) => q.expiresAt && q.expiresAt < now);
    for (const quote of expired) {
      await ctx.db.patch(quote._id, {
        status: "DECLINED",
        declineReason: "Quote expired (auto-expired by system)",
        respondedAt: now,
        updatedAt: now,
      });
    }
    return { expiredCount: expired.length };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-09: CREDIT MEMOS
// ═══════════════════════════════════════════════════════════════════════════════

export const createCreditMemo = mutation({
  args: {
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    invoiceId: v.optional(v.id("invoices")),
    amount: v.number(),
    reason: v.string(),
    issuedByTechId: v.id("technicians"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.amount <= 0) throw new Error("Credit memo amount must be positive.");
    if (!args.reason.trim()) throw new Error("Reason is required.");

    const now = Date.now();
    const cmNumber = await getNextNumber(ctx, args.orgId as string, "credit_memo", "CM");

    return ctx.db.insert("creditMemos", {
      orgId: args.orgId,
      customerId: args.customerId,
      invoiceId: args.invoiceId,
      creditMemoNumber: cmNumber,
      status: "DRAFT",
      reason: args.reason.trim(),
      amount: args.amount,
      issuedByTechId: args.issuedByTechId,
      notes: args.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const issueCreditMemo = mutation({
  args: { orgId: v.id("organizations"), creditMemoId: v.id("creditMemos") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const cm = await ctx.db.get(args.creditMemoId);
    if (!cm) throw new Error("Credit memo not found.");
    if (cm.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    if (cm.status !== "DRAFT") throw new Error("Can only issue DRAFT credit memos.");
    await ctx.db.patch(args.creditMemoId, { status: "ISSUED", updatedAt: Date.now() });
    return { success: true };
  },
});

export const applyCreditMemoToInvoice = mutation({
  args: {
    orgId: v.id("organizations"),
    creditMemoId: v.id("creditMemos"),
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const cm = await ctx.db.get(args.creditMemoId);
    if (!cm) throw new Error("Credit memo not found.");
    if (cm.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    if (cm.status !== "ISSUED") throw new Error("Only ISSUED credit memos can be applied.");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");

    const now = Date.now();
    // Apply credit as a payment
    const creditAmount = Math.min(cm.amount, invoice.balance);
    const newAmountPaid = Math.round((invoice.amountPaid + creditAmount) * 100) / 100;
    const newBalance = Math.round((invoice.total - newAmountPaid) * 100) / 100;
    const newStatus = newBalance <= 0 ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : invoice.status;

    await ctx.db.patch(args.invoiceId, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
      paidAt: newStatus === "PAID" ? now : invoice.paidAt,
      updatedAt: now,
    });

    await ctx.db.patch(args.creditMemoId, {
      status: "APPLIED",
      appliedToInvoiceId: args.invoiceId,
      appliedAt: now,
      updatedAt: now,
    });

    return { creditApplied: creditAmount, newBalance };
  },
});

export const listCreditMemos = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("creditMemos")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-03: TAX RATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const createTaxRate = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    rate: v.number(),
    appliesTo: v.union(v.literal("parts"), v.literal("labor"), v.literal("all")),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    // If this is default, unset other defaults
    if (args.isDefault) {
      const existing = await ctx.db
        .query("taxRates")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .collect();
      for (const tr of existing.filter((t) => t.isDefault)) {
        await ctx.db.patch(tr._id, { isDefault: false, updatedAt: now });
      }
    }
    return ctx.db.insert("taxRates", {
      orgId: args.orgId,
      name: args.name.trim(),
      rate: args.rate,
      appliesTo: args.appliesTo,
      isDefault: args.isDefault,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listTaxRates = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("taxRates")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("active", true))
      .collect();
  },
});

export const computeTaxForInvoice = query({
  args: { orgId: v.id("organizations"), invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) return { tax: 0, breakdown: [] };

    // Check customer tax exemption
    const exemption = await ctx.db
      .query("customerTaxExemptions")
      .withIndex("by_org_customer", (q) => q.eq("orgId", args.orgId).eq("customerId", invoice.customerId))
      .first();
    if (exemption?.exemptionType === "full") return { tax: 0, breakdown: [{ name: "Tax Exempt", amount: 0 }] };

    const taxRates = await ctx.db
      .query("taxRates")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("active", true))
      .collect();
    if (taxRates.length === 0) return { tax: 0, breakdown: [] };

    const laborExempt = exemption?.exemptionType === "labor_only";
    const partsExempt = exemption?.exemptionType === "parts_only";

    let totalTax = 0;
    const breakdown = [];
    for (const tr of taxRates) {
      let taxableAmount = 0;
      if (tr.appliesTo === "all") {
        taxableAmount = (laborExempt ? 0 : invoice.laborTotal) + (partsExempt ? 0 : invoice.partsTotal);
      } else if (tr.appliesTo === "labor" && !laborExempt) {
        taxableAmount = invoice.laborTotal;
      } else if (tr.appliesTo === "parts" && !partsExempt) {
        taxableAmount = invoice.partsTotal;
      }
      const amount = Math.round(taxableAmount * tr.rate / 100 * 100) / 100;
      totalTax += amount;
      breakdown.push({ name: tr.name, rate: tr.rate, taxableAmount, amount });
    }

    return { tax: Math.round(totalTax * 100) / 100, breakdown };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-13: QUOTE → INVOICE CONVERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const createInvoiceFromQuote = mutation({
  args: {
    orgId: v.id("organizations"),
    quoteId: v.id("quotes"),
    createdByTechId: v.id("technicians"),
    dueDate: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();

    const quote = await ctx.db.get(args.quoteId);
    if (!quote) throw new Error("Quote not found.");
    if (quote.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    if (quote.status !== "APPROVED" && quote.status !== "CONVERTED") {
      throw new Error("Quote must be APPROVED to create an invoice from it.");
    }

    // Get quote line items
    const quoteItems = await ctx.db
      .query("quoteLineItems")
      .filter((q: any) => q.eq(q.field("quoteId"), args.quoteId))
      .collect();

    // Generate invoice number
    const invNumber = await getNextNumber(ctx, args.orgId as string, "invoice", "INV");

    // Create invoice
    const invoiceId = await ctx.db.insert("invoices", {
      orgId: args.orgId,
      workOrderId: quote.workOrderId,
      customerId: quote.customerId,
      quoteId: args.quoteId,
      invoiceNumber: invNumber,
      status: "DRAFT",
      createdByTechId: args.createdByTechId,
      laborTotal: quote.laborTotal,
      partsTotal: quote.partsTotal,
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      amountPaid: 0,
      balance: quote.total,
      dueDate: args.dueDate,
      paymentTerms: args.paymentTerms,
      createdAt: now,
      updatedAt: now,
    });

    // Copy line items
    for (const item of quoteItems) {
      await ctx.db.insert("invoiceLineItems", {
        orgId: args.orgId,
        invoiceId,
        type: item.type as "labor" | "part" | "external_service" | "deposit" | "credit",
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        ...(item.discountPercent != null ? { discountPercent: item.discountPercent } : {}),
        ...(item.discountAmount != null ? { discountAmount: item.discountAmount } : {}),
        total: item.total,
        technicianId: item.technicianId,
        partId: item.partId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return invoiceId;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-08: QUOTE REVISIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const createQuoteRevision = mutation({
  args: {
    orgId: v.id("organizations"),
    originalQuoteId: v.id("quotes"),
    createdByTechId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();

    const original = await ctx.db.get(args.originalQuoteId);
    if (!original) throw new Error("Original quote not found.");
    if (original.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");

    // Decline original if still active
    if (original.status === "SENT") {
      await ctx.db.patch(args.originalQuoteId, {
        status: "DECLINED",
        declineReason: "Superseded by revision",
        respondedAt: now,
        updatedAt: now,
      });
    }

    // Generate new quote number
    const quoteNumber = await getNextNumber(ctx, args.orgId as string, "quote", "Q");

    // Create revised quote
    const newQuoteId = await ctx.db.insert("quotes", {
      orgId: args.orgId,
      customerId: original.customerId,
      aircraftId: original.aircraftId,
      workOrderId: original.workOrderId,
      status: "DRAFT",
      quoteNumber,
      createdByTechId: args.createdByTechId,
      laborTotal: 0,
      partsTotal: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Copy line items from original
    const originalItems = await ctx.db
      .query("quoteLineItems")
      .filter((q: any) => q.eq(q.field("quoteId"), args.originalQuoteId))
      .collect();

    for (const item of originalItems) {
      await ctx.db.insert("quoteLineItems", {
        orgId: args.orgId,
        quoteId: newQuoteId,
        type: item.type,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        ...(item.discountPercent != null ? { discountPercent: item.discountPercent } : {}),
        ...(item.discountAmount != null ? { discountAmount: item.discountAmount } : {}),
        total: item.total,
        technicianId: item.technicianId,
        partId: item.partId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Recalculate totals
    await recalcQuoteTotals(ctx, newQuoteId);

    return newQuoteId;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-16: TIME CLOCK APPROVAL
// ═══════════════════════════════════════════════════════════════════════════════

export const approveTimeEntry = mutation({
  args: {
    orgId: v.id("organizations"),
    timeEntryId: v.id("timeEntries"),
    approvedByTechId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const entry = await ctx.db.get(args.timeEntryId);
    if (!entry) throw new Error("Time entry not found.");
    if (entry.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    if (entry.billingLock || entry.billedInvoiceId || entry.billedAt) {
      throw new Error("Cannot approve a billed/locked time entry.");
    }
    await ctx.db.patch(args.timeEntryId, {
      approvalStatus: "approved",
      approved: true,
      approvedByTechId: args.approvedByTechId,
      approvedAt: Date.now(),
      rejectionReason: undefined,
      rejectedByTechId: undefined,
      rejectedAt: undefined,
    });
    return { success: true };
  },
});

export const rejectTimeEntry = mutation({
  args: {
    orgId: v.id("organizations"),
    timeEntryId: v.id("timeEntries"),
    rejectedByTechId: v.id("technicians"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const entry = await ctx.db.get(args.timeEntryId);
    if (!entry) throw new Error("Time entry not found.");
    if (entry.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    if (entry.billingLock || entry.billedInvoiceId || entry.billedAt) {
      throw new Error("Cannot reject a billed/locked time entry.");
    }
    await ctx.db.patch(args.timeEntryId, {
      approvalStatus: "rejected",
      approved: false,
      approvedByTechId: undefined,
      approvedAt: undefined,
      rejectionReason: args.reason.trim(),
      rejectedByTechId: args.rejectedByTechId,
      rejectedAt: Date.now(),
    });
    return { success: true };
  },
});

export const bulkApproveTimeEntries = mutation({
  args: {
    orgId: v.id("organizations"),
    timeEntryIds: v.array(v.id("timeEntries")),
    approvedByTechId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();

    let approvedCount = 0;
    for (const timeEntryId of args.timeEntryIds) {
      const entry = await ctx.db.get(timeEntryId);
      if (!entry) continue;
      if (entry.orgId !== args.orgId) continue;
      if (entry.billingLock || entry.billedInvoiceId || entry.billedAt) continue;

      await ctx.db.patch(timeEntryId, {
        approvalStatus: "approved",
        approved: true,
        approvedByTechId: args.approvedByTechId,
        approvedAt: now,
        rejectionReason: undefined,
        rejectedByTechId: undefined,
        rejectedAt: undefined,
      });
      approvedCount += 1;
    }

    return { success: true, approvedCount };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER CRM QUERIES (Phase C)
// ═══════════════════════════════════════════════════════════════════════════════

/** List all aircraft belonging to a customer. */
export const listAircraftForCustomer = query({
  args: {
    customerId: v.id("customers"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    await requireOrgMembership(ctx, callerUserId, args.organizationId);
    await getCustomerInOrg(ctx, args.customerId, args.organizationId);

    return await ctx.db
      .query("aircraft")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("operatingOrganizationId"), args.organizationId))
      .collect();
  },
});

/** List all work orders for all aircraft belonging to a customer. */
export const listWorkOrdersForCustomer = query({
  args: {
    customerId: v.id("customers"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    await requireOrgMembership(ctx, callerUserId, args.organizationId);
    await getCustomerInOrg(ctx, args.customerId, args.organizationId);

    const aircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("operatingOrganizationId"), args.organizationId))
      .collect();
    const woArrays = await Promise.all(
      aircraft.map((ac) =>
        ctx.db
          .query("workOrders")
          .withIndex("by_aircraft", (q) => q.eq("aircraftId", ac._id))
          .collect()
      )
    );
    return woArrays.flat().filter((wo) => wo.organizationId === args.organizationId);
  },
});

/** List all quotes for a customer. */
export const listQuotesForCustomer = query({
  args: {
    customerId: v.id("customers"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    await requireOrgMembership(ctx, callerUserId, args.organizationId);
    await getCustomerInOrg(ctx, args.customerId, args.organizationId);

    return await ctx.db
      .query("quotes")
      .withIndex("by_org_customer", (q) =>
        q.eq("orgId", args.organizationId).eq("customerId", args.customerId)
      )
      .collect();
  },
});

/** List all invoices for a customer. */
export const listInvoicesForCustomer = query({
  args: {
    customerId: v.id("customers"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    await requireOrgMembership(ctx, callerUserId, args.organizationId);
    await getCustomerInOrg(ctx, args.customerId, args.organizationId);

    return await ctx.db
      .query("invoices")
      .withIndex("by_org_customer", (q) =>
        q.eq("orgId", args.organizationId).eq("customerId", args.customerId)
      )
      .collect();
  },
});

/** List all notes for a customer (newest first). */
export const listCustomerNotes = query({
  args: {
    customerId: v.id("customers"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    await requireOrgMembership(ctx, callerUserId, args.organizationId);
    await getCustomerInOrg(ctx, args.customerId, args.organizationId);

    const notes = await ctx.db
      .query("customerNotes")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();

    return notes
      .filter((note) => note.organizationId === args.organizationId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Add a note to a customer's activity log. */
export const addCustomerNote = mutation({
  args: {
    customerId: v.id("customers"),
    organizationId: v.id("organizations"),
    content: v.string(),
    createdByUserId: v.optional(v.string()),
    createdByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    await requireOrgMembership(ctx, callerUserId, args.organizationId);
    const customer = await getCustomerInOrg(
      ctx,
      args.customerId,
      args.organizationId,
    );

    const content = args.content.trim();
    if (!content) throw new Error("Customer note content is required.");

    const now = Date.now();
    const noteId = await ctx.db.insert("customerNotes", {
      customerId: args.customerId,
      organizationId: args.organizationId,
      content,
      createdByUserId: callerUserId,
      createdByName: args.createdByName?.trim() || undefined,
      createdAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "customerNotes",
      recordId: noteId,
      userId: callerUserId,
      notes: `Customer note added for ${customer.name}.`,
      timestamp: now,
    });

    return noteId;
  },
});
