// convex/partHistory.ts
// Athelon — Aviation MRO SaaS Platform
//
// Part History Event Log — Inventory System v10
//
// Append-only event log for part lifecycle transitions. Every time a part
// changes state — received, inspected, moved, installed, removed, scrapped,
// etc. — a new record is appended here. Records are NEVER updated or deleted.
//
// This is the "provenance chain" required for FAA traceability per
// 14 CFR 43.9 and AC 20-62E. Any auditor should be able to reconstruct
// the complete lifecycle of any part from this table alone.
//
// Cross-references:
//   convex/schema.ts — partHistory table definition + indexes
//   convex/parts.ts  — part traceability mutations (call recordEvent)
//
// ─────────────────────────────────────────────────────────────────────────────

import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

const eventTypeValidator = v.union(
  v.literal("received"),
  v.literal("inspected"),
  v.literal("stocked"),
  v.literal("moved"),
  v.literal("reserved"),
  v.literal("reservation_released"),
  v.literal("issued_to_wo"),
  v.literal("returned_from_wo"),
  v.literal("installed"),
  v.literal("removed"),
  v.literal("sent_to_vendor"),
  v.literal("received_from_vendor"),
  v.literal("quarantined"),
  v.literal("scrapped"),
  v.literal("condition_changed"),
  v.literal("cost_updated"),
  v.literal("document_attached"),
  v.literal("shelf_life_alert"),
);

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL MUTATION: recordEvent
//
// Called by other mutations (e.g., parts.ts, shipping.ts) to log a lifecycle
// event. This is an internalMutation so it cannot be called from the client.
//
// createdAt defaults to Date.now() if not provided.
// ─────────────────────────────────────────────────────────────────────────────

export const recordEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    partId: v.id("parts"),
    eventType: eventTypeValidator,

    // Context references (all optional — depends on event type)
    workOrderId: v.optional(v.id("workOrders")),
    aircraftId: v.optional(v.id("aircraft")),
    vendorId: v.optional(v.id("vendors")),
    shipmentId: v.optional(v.id("shipments")),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    lotId: v.optional(v.id("lots")),

    // Change tracking
    fromLocation: v.optional(v.string()),
    toLocation: v.optional(v.string()),
    fromCondition: v.optional(v.string()),
    toCondition: v.optional(v.string()),

    // Who and when
    performedByUserId: v.string(),
    performedByTechnicianId: v.optional(v.id("technicians")),
    notes: v.optional(v.string()),

    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { createdAt, ...rest } = args;
    await ctx.db.insert("partHistory", {
      ...rest,
      createdAt: createdAt ?? Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listHistoryForPart
//
// Returns all history records for a given part, ordered by createdAt desc
// (most recent events first). Uses the by_part index.
// ─────────────────────────────────────────────────────────────────────────────

export const listHistoryForPart = query({
  args: {
    partId: v.id("parts"),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("partHistory")
      .withIndex("by_part", (q) => q.eq("partId", args.partId))
      .collect();

    // Sort by createdAt descending (most recent first)
    records.sort((a, b) => b.createdAt - a.createdAt);

    return records;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listHistoryForWorkOrder
//
// Returns all history records associated with a given work order.
// Uses the by_work_order index.
// ─────────────────────────────────────────────────────────────────────────────

export const listHistoryForWorkOrder = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("partHistory")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    // Sort by createdAt descending (most recent first)
    records.sort((a, b) => b.createdAt - a.createdAt);

    return records;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listRecentActivity
//
// Returns the most recent part history events across the entire organization.
// Uses the by_org index. Default limit is 50 records.
// ─────────────────────────────────────────────────────────────────────────────

export const listRecentActivity = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxResults = args.limit ?? 50;

    const records = await ctx.db
      .query("partHistory")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Sort by createdAt descending and take the requested limit
    records.sort((a, b) => b.createdAt - a.createdAt);

    return records.slice(0, maxResults);
  },
});
