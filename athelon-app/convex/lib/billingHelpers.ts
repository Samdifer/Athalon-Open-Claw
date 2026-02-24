// convex/lib/billingHelpers.ts
// Athelon — Aviation MRO SaaS Platform
//
// Typed query helpers for billing.ts — replaces `(ctx.db.query(table) as any)`
// casts with properly-typed per-table functions that satisfy the TypeScript
// compiler without requiring `any`.

import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// NUMBER-UNIQUENESS CHECKERS
// Used by generateUniqueNumber (legacy) — now replaced by getNextNumber, but
// kept here in case a uniqueness check is ever needed independently.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the first invoice in `orgId` with `invoiceNumber === candidate`,
 * or null if no such invoice exists.
 */
export async function queryInvoiceByNumber(
  ctx: MutationCtx,
  orgId: Id<"organizations">,
  invoiceNumber: string,
) {
  return ctx.db
    .query("invoices")
    .withIndex("by_org_invoice_number", (q) =>
      q.eq("orgId", orgId).eq("invoiceNumber", invoiceNumber),
    )
    .first();
}

/**
 * Returns the first quote in `orgId` with `quoteNumber === candidate`,
 * or null if no such quote exists.
 */
export async function queryQuoteByNumber(
  ctx: MutationCtx,
  orgId: Id<"organizations">,
  quoteNumber: string,
) {
  return ctx.db
    .query("quotes")
    .withIndex("by_org_quote_number", (q) =>
      q.eq("orgId", orgId).eq("quoteNumber", quoteNumber),
    )
    .first();
}

/**
 * Returns the first purchaseOrder in `orgId` with `poNumber === candidate`,
 * or null if no such PO exists.
 */
export async function queryPOByNumber(
  ctx: MutationCtx,
  orgId: Id<"organizations">,
  poNumber: string,
) {
  return ctx.db
    .query("purchaseOrders")
    .withIndex("by_org_po_number", (q) =>
      q.eq("orgId", orgId).eq("poNumber", poNumber),
    )
    .first();
}

// ─────────────────────────────────────────────────────────────────────────────
// LINE ITEM COLLECTORS
// Used by recomputeQuoteTotals, recomputeInvoiceTotals, recomputePOTotals.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all quoteLineItems for the given orgId + quoteId.
 * Typed to satisfy the compiler without `any`.
 */
export async function getQuoteLineItems(
  ctx: MutationCtx,
  orgId: Id<"organizations">,
  quoteId: Id<"quotes">,
) {
  return ctx.db
    .query("quoteLineItems")
    .withIndex("by_org_quote", (q) =>
      q.eq("orgId", orgId).eq("quoteId", quoteId),
    )
    .collect();
}

/**
 * Returns all invoiceLineItems for the given orgId + invoiceId.
 * Typed to satisfy the compiler without `any`.
 */
export async function getInvoiceLineItems(
  ctx: MutationCtx,
  orgId: Id<"organizations">,
  invoiceId: Id<"invoices">,
) {
  return ctx.db
    .query("invoiceLineItems")
    .withIndex("by_org_invoice", (q) =>
      q.eq("orgId", orgId).eq("invoiceId", invoiceId),
    )
    .collect();
}

/**
 * Returns all poLineItems for the given purchaseOrderId.
 * Typed to satisfy the compiler without `any`.
 */
export async function getPOLineItems(
  ctx: MutationCtx,
  purchaseOrderId: Id<"purchaseOrders">,
) {
  return ctx.db
    .query("poLineItems")
    .withIndex("by_po", (q) => q.eq("purchaseOrderId", purchaseOrderId))
    .collect();
}
