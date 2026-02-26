/**
 * billingV4b.ts — Remaining Billing Gap Fixes (P2)
 *
 * - GAP-10: Recurring billing templates
 * - GAP-12: Deposit tracking
 * - GAP-14: Batch operations
 * - GAP-15: Document templates/branding
 * - GAP-16: Time entry approval queries/listing
 * - GAP-17: Auto parts markup
 * - GAP-19: PO budget controls
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED");
  return identity.subject;
}

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
// GAP-10: RECURRING BILLING
// ═══════════════════════════════════════════════════════════════════════════════

export const createRecurringTemplate = mutation({
  args: {
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    name: v.string(),
    description: v.optional(v.string()),
    frequency: v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("annually"),
    ),
    lineItems: v.array(v.object({
      type: v.union(v.literal("labor"), v.literal("part"), v.literal("external_service")),
      description: v.string(),
      qty: v.number(),
      unitPrice: v.number(),
    })),
    paymentTerms: v.optional(v.string()),
    paymentTermsDays: v.optional(v.number()),
    nextGenerateAt: v.number(),
    createdByTechId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (!args.name.trim()) throw new Error("Template name required.");
    if (args.lineItems.length === 0) throw new Error("At least one line item required.");

    const subtotal = args.lineItems.reduce((sum, li) => sum + Math.round(li.qty * li.unitPrice * 100) / 100, 0);
    const now = Date.now();

    return ctx.db.insert("recurringBillingTemplates", {
      orgId: args.orgId,
      customerId: args.customerId,
      name: args.name.trim(),
      description: args.description?.trim(),
      frequency: args.frequency,
      lineItems: args.lineItems,
      subtotal,
      paymentTerms: args.paymentTerms,
      paymentTermsDays: args.paymentTermsDays,
      nextGenerateAt: args.nextGenerateAt,
      active: true,
      createdByTechId: args.createdByTechId,
      lastGeneratedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listRecurringTemplates = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("recurringBillingTemplates")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

export const toggleRecurringTemplate = mutation({
  args: { orgId: v.id("organizations"), templateId: v.id("recurringBillingTemplates"), active: v.boolean() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const t = await ctx.db.get(args.templateId);
    if (!t || t.orgId !== args.orgId) throw new Error("Template not found.");
    await ctx.db.patch(args.templateId, { active: args.active, updatedAt: Date.now() });
    return { success: true };
  },
});

export const generateInvoiceFromTemplate = mutation({
  args: { orgId: v.id("organizations"), templateId: v.id("recurringBillingTemplates") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const template = await ctx.db.get(args.templateId);
    if (!template || template.orgId !== args.orgId) throw new Error("Template not found.");
    if (!template.active) throw new Error("Template is inactive.");

    const now = Date.now();
    const invNumber = await getNextNumber(ctx, args.orgId as string, "invoice", "INV");

    let laborTotal = 0;
    let partsTotal = 0;
    for (const li of template.lineItems) {
      const t = Math.round(li.qty * li.unitPrice * 100) / 100;
      if (li.type === "labor") laborTotal += t;
      else partsTotal += t;
    }
    const subtotal = Math.round((laborTotal + partsTotal) * 100) / 100;

    const dueDate = template.paymentTermsDays
      ? now + template.paymentTermsDays * 24 * 60 * 60 * 1000
      : undefined;

    const invoiceId = await ctx.db.insert("invoices", {
      orgId: args.orgId,
      customerId: template.customerId,
      invoiceNumber: invNumber,
      status: "DRAFT",
      createdByTechId: template.createdByTechId,
      laborTotal,
      partsTotal,
      subtotal,
      tax: 0,
      total: subtotal,
      amountPaid: 0,
      balance: subtotal,
      dueDate,
      paymentTerms: template.paymentTerms,
      createdAt: now,
      updatedAt: now,
    });

    for (const li of template.lineItems) {
      await ctx.db.insert("invoiceLineItems", {
        orgId: args.orgId,
        invoiceId,
        type: li.type as "labor" | "part" | "external_service" | "deposit" | "credit",
        description: li.description,
        qty: li.qty,
        unitPrice: li.unitPrice,
        total: Math.round(li.qty * li.unitPrice * 100) / 100,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Advance next generation date
    const freqMs: Record<string, number> = {
      weekly: 7 * 86400000,
      biweekly: 14 * 86400000,
      monthly: 30 * 86400000,
      quarterly: 91 * 86400000,
      annually: 365 * 86400000,
    };
    await ctx.db.patch(args.templateId, {
      lastGeneratedAt: now,
      nextGenerateAt: now + (freqMs[template.frequency] ?? 30 * 86400000),
      updatedAt: now,
    });

    return invoiceId;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-12: DEPOSIT TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export const recordDeposit = mutation({
  args: {
    orgId: v.id("organizations"),
    customerId: v.id("customers"),
    amount: v.number(),
    method: v.union(
      v.literal("cash"), v.literal("check"), v.literal("credit_card"),
      v.literal("wire"), v.literal("ach"), v.literal("other"),
    ),
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    recordedByTechId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.amount <= 0) throw new Error("Deposit amount must be positive.");
    const now = Date.now();
    return ctx.db.insert("customerDeposits", {
      orgId: args.orgId,
      customerId: args.customerId,
      amount: args.amount,
      appliedAmount: 0,
      remainingAmount: args.amount,
      method: args.method,
      referenceNumber: args.referenceNumber,
      notes: args.notes,
      recordedByTechId: args.recordedByTechId,
      status: "AVAILABLE",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const applyDepositToInvoice = mutation({
  args: {
    orgId: v.id("organizations"),
    depositId: v.id("customerDeposits"),
    invoiceId: v.id("invoices"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const deposit = await ctx.db.get(args.depositId);
    if (!deposit || deposit.orgId !== args.orgId) throw new Error("Deposit not found.");
    if (deposit.status !== "AVAILABLE" && deposit.status !== "PARTIAL") throw new Error("Deposit not available.");
    if (args.amount > deposit.remainingAmount) throw new Error("Amount exceeds remaining deposit.");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.orgId !== args.orgId) throw new Error("Invoice not found.");
    if (args.amount > invoice.balance) throw new Error("Amount exceeds invoice balance.");

    const now = Date.now();
    const newApplied = Math.round((deposit.appliedAmount + args.amount) * 100) / 100;
    const newRemaining = Math.round((deposit.amount - newApplied) * 100) / 100;

    await ctx.db.patch(args.depositId, {
      appliedAmount: newApplied,
      remainingAmount: newRemaining,
      status: newRemaining <= 0 ? "APPLIED" : "PARTIAL",
      updatedAt: now,
    });

    const newAmountPaid = Math.round((invoice.amountPaid + args.amount) * 100) / 100;
    const newBalance = Math.round((invoice.total - newAmountPaid) * 100) / 100;
    await ctx.db.patch(args.invoiceId, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newBalance <= 0 ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : invoice.status,
      paidAt: newBalance <= 0 ? now : invoice.paidAt,
      updatedAt: now,
    });

    return { applied: args.amount, depositRemaining: newRemaining, invoiceBalance: newBalance };
  },
});

export const listCustomerDeposits = query({
  args: { orgId: v.id("organizations"), customerId: v.optional(v.id("customers")) },
  handler: async (ctx, args) => {
    if (args.customerId) {
      return ctx.db
        .query("customerDeposits")
        .withIndex("by_org_customer", (q) => q.eq("orgId", args.orgId).eq("customerId", args.customerId!))
        .collect();
    }
    return ctx.db
      .query("customerDeposits")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-14: BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const batchSendInvoices = mutation({
  args: { orgId: v.id("organizations"), invoiceIds: v.array(v.id("invoices")) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    let sent = 0;
    const errors: string[] = [];
    for (const id of args.invoiceIds) {
      const inv = await ctx.db.get(id);
      if (!inv || inv.orgId !== args.orgId) { errors.push(`${id}: not found`); continue; }
      if (inv.status !== "DRAFT") { errors.push(`${inv.invoiceNumber}: not DRAFT`); continue; }
      await ctx.db.patch(id, { status: "SENT", sentAt: now, updatedAt: now });
      sent++;
    }
    return { sent, errors };
  },
});

export const batchVoidInvoices = mutation({
  args: {
    orgId: v.id("organizations"),
    invoiceIds: v.array(v.id("invoices")),
    voidReason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (!args.voidReason.trim()) throw new Error("Void reason required.");
    const now = Date.now();
    let voided = 0;
    const errors: string[] = [];
    for (const id of args.invoiceIds) {
      const inv = await ctx.db.get(id);
      if (!inv || inv.orgId !== args.orgId) { errors.push(`${id}: not found`); continue; }
      if (inv.status === "VOID") { errors.push(`${inv.invoiceNumber}: already VOID`); continue; }
      if (inv.status === "PAID") { errors.push(`${inv.invoiceNumber}: cannot void PAID`); continue; }
      await ctx.db.patch(id, { status: "VOID", voidReason: args.voidReason.trim(), voidedAt: now, updatedAt: now });
      voided++;
    }
    return { voided, errors };
  },
});

export const batchRecordPayments = mutation({
  args: {
    orgId: v.id("organizations"),
    payments: v.array(v.object({
      invoiceId: v.id("invoices"),
      amount: v.number(),
      method: v.union(
        v.literal("cash"), v.literal("check"), v.literal("credit_card"),
        v.literal("wire"), v.literal("ach"), v.literal("other"),
      ),
      referenceNumber: v.optional(v.string()),
    })),
    recordedByTechId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    let recorded = 0;
    const errors: string[] = [];
    for (const p of args.payments) {
      const inv = await ctx.db.get(p.invoiceId);
      if (!inv || inv.orgId !== args.orgId) { errors.push(`${p.invoiceId}: not found`); continue; }
      if (inv.status === "VOID" || inv.status === "DRAFT") { errors.push(`${inv.invoiceNumber}: ${inv.status}`); continue; }
      if (p.amount <= 0) { errors.push(`${inv.invoiceNumber}: invalid amount`); continue; }

      await ctx.db.insert("payments", {
        orgId: args.orgId,
        invoiceId: p.invoiceId,
        amount: p.amount,
        method: p.method,
        recordedAt: now,
        recordedByTechId: args.recordedByTechId,
        referenceNumber: p.referenceNumber,
        createdAt: now,
      });

      const newPaid = Math.round((inv.amountPaid + p.amount) * 100) / 100;
      const newBal = Math.round((inv.total - newPaid) * 100) / 100;
      await ctx.db.patch(p.invoiceId, {
        amountPaid: newPaid,
        balance: newBal,
        status: newBal <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : inv.status,
        paidAt: newBal <= 0 ? now : inv.paidAt,
        updatedAt: now,
      });
      recorded++;
    }
    return { recorded, errors };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-15: DOCUMENT TEMPLATES / BRANDING
// ═══════════════════════════════════════════════════════════════════════════════

export const saveOrgBillingSettings = mutation({
  args: {
    orgId: v.id("organizations"),
    companyName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyPhone: v.optional(v.string()),
    companyEmail: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    invoiceTerms: v.optional(v.string()),
    invoiceNotes: v.optional(v.string()),
    quoteTerms: v.optional(v.string()),
    quoteNotes: v.optional(v.string()),
    paymentInstructions: v.optional(v.string()),
    defaultPaymentTerms: v.optional(v.string()),
    defaultPaymentTermsDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("orgBillingSettings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const data = {
      orgId: args.orgId,
      companyName: args.companyName?.trim(),
      companyAddress: args.companyAddress?.trim(),
      companyPhone: args.companyPhone?.trim(),
      companyEmail: args.companyEmail?.trim(),
      logoUrl: args.logoUrl?.trim(),
      invoiceTerms: args.invoiceTerms?.trim(),
      invoiceNotes: args.invoiceNotes?.trim(),
      quoteTerms: args.quoteTerms?.trim(),
      quoteNotes: args.quoteNotes?.trim(),
      paymentInstructions: args.paymentInstructions?.trim(),
      defaultPaymentTerms: args.defaultPaymentTerms?.trim(),
      defaultPaymentTermsDays: args.defaultPaymentTermsDays,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return ctx.db.insert("orgBillingSettings", { ...data, createdAt: now });
  },
});

export const getOrgBillingSettings = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("orgBillingSettings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-16: TIME ENTRY APPROVAL LISTING
// ═══════════════════════════════════════════════════════════════════════════════

export const listPendingTimeEntries = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("timeEntries")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return all
      .filter((e) => e.clockOutAt && e.approved === undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listApprovedTimeEntries = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("timeEntries")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return all.filter((e) => e.approved === true).sort((a, b) => b.approvedAt! - a.approvedAt!);
  },
});

export const listRejectedTimeEntries = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("timeEntries")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return all.filter((e) => e.approved === false).sort((a, b) => b.rejectedAt! - a.rejectedAt!);
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-17: AUTO PARTS MARKUP
// ═══════════════════════════════════════════════════════════════════════════════

export const computePartMarkup = query({
  args: {
    orgId: v.id("organizations"),
    partCost: v.number(),
  },
  handler: async (ctx, args) => {
    const defaultResult = () => {
      const markup = Math.round(args.partCost * 1.3 * 100) / 100;
      return { cost: args.partCost, billedPrice: markup, markupPercent: 30, method: "default" as const };
    };

    // Look for a parts pricing rule in this org
    const rules = await ctx.db
      .query("pricingRules")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const partsRule = rules.find((r) => r.appliesTo === "part");
    if (!partsRule) return defaultResult();

    if (partsRule.ruleType === "cost_plus" && partsRule.markupPercent) {
      const billedPrice = Math.round(args.partCost * (1 + partsRule.markupPercent / 100) * 100) / 100;
      return { cost: args.partCost, billedPrice, markupPercent: partsRule.markupPercent, method: "cost_plus" as const };
    }
    if (partsRule.ruleType === "flat_rate" && partsRule.flatRate) {
      return { cost: args.partCost, billedPrice: partsRule.flatRate, markupPercent: 0, method: "flat_rate" as const };
    }
    return defaultResult();
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-19: PO BUDGET CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════

export const getWorkOrderBudgetStatus = query({
  args: { orgId: v.id("organizations"), workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error("Work order not found.");

    // Get all POs for this work order
    const pos = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_org_wo", (q) => q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId))
      .collect();

    const poTotal = pos.reduce((sum, po) => sum + po.total, 0);
    const poCount = pos.length;

    // Get quote total for this WO if exists
    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId).eq("status", "APPROVED"))
      .collect();
    const woQuote = quotes.find((q) => q.workOrderId === args.workOrderId);
    const quotedTotal = woQuote?.total ?? 0;
    const quotedParts = woQuote?.partsTotal ?? 0;

    // Get time entries for labor cost estimate
    const timeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org_wo", (q) => q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId))
      .collect();
    const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    return {
      workOrderId: args.workOrderId,
      poTotal: Math.round(poTotal * 100) / 100,
      poCount,
      quotedTotal,
      quotedParts,
      partsOverBudget: quotedParts > 0 && poTotal > quotedParts,
      partsOverageAmount: quotedParts > 0 ? Math.round((poTotal - quotedParts) * 100) / 100 : 0,
      partsOveragePercent: quotedParts > 0 ? Math.round((poTotal / quotedParts - 1) * 10000) / 100 : 0,
      laborHours: totalHours,
    };
  },
});

export const setApprovalThreshold = mutation({
  args: {
    orgId: v.id("organizations"),
    poApprovalThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("orgBillingSettings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { poApprovalThreshold: args.poApprovalThreshold, updatedAt: now });
    } else {
      await ctx.db.insert("orgBillingSettings", {
        orgId: args.orgId,
        poApprovalThreshold: args.poApprovalThreshold,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { success: true };
  },
});

export const checkPORequiresApproval = query({
  args: { orgId: v.id("organizations"), poTotal: v.number() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("orgBillingSettings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    const threshold = settings?.poApprovalThreshold ?? 5000;
    return { requiresApproval: args.poTotal >= threshold, threshold };
  },
});
