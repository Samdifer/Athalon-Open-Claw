// convex/bulkImport.ts
// Athelon — Bulk CSV Import Mutations

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/authHelpers";

export const importAircraft = mutation({
  args: {
    organizationId: v.id("organizations"),
    rows: v.array(
      v.object({
        tailNumber: v.string(),
        make: v.string(),
        model: v.string(),
        serialNumber: v.string(),
        year: v.optional(v.number()),
        totalTimeHours: v.optional(v.number()),
        totalCycles: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const results: { row: number; success: boolean; error?: string }[] = [];
    for (let i = 0; i < args.rows.length; i++) {
      const row = args.rows[i];
      try {
        // Check for duplicate registration
        const existing = await ctx.db
          .query("aircraft")
          .withIndex("by_registration", (q) => q.eq("currentRegistration", row.tailNumber))
          .first();
        if (existing) {
          results.push({ row: i, success: false, error: `Duplicate tail: ${row.tailNumber}` });
          continue;
        }
        const now = Date.now();
        await ctx.db.insert("aircraft", {
          currentRegistration: row.tailNumber,
          make: row.make,
          model: row.model,
          serialNumber: row.serialNumber,
          yearOfManufacture: row.year,
          status: "airworthy",
          operatingOrganizationId: args.organizationId,
          totalTimeAirframeHours: row.totalTimeHours ?? 0,
          totalTimeAirframeAsOfDate: now,
          totalLandingCycles: row.totalCycles,
          experimental: false,
          aircraftCategory: "normal",
          engineCount: 1,
          createdAt: now,
          updatedAt: now,
        });
        results.push({ row: i, success: true });
      } catch (e: unknown) {
        results.push({ row: i, success: false, error: e instanceof Error ? e.message : "Unknown error" });
      }
    }
    return results;
  },
});

export const importParts = mutation({
  args: {
    organizationId: v.id("organizations"),
    rows: v.array(
      v.object({
        partNumber: v.string(),
        partName: v.string(),
        description: v.optional(v.string()),
        serialNumber: v.optional(v.string()),
        condition: v.optional(v.string()),
        location: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const results: { row: number; success: boolean; error?: string }[] = [];
    for (let i = 0; i < args.rows.length; i++) {
      const row = args.rows[i];
      try {
        const now = Date.now();
        const condition = (["new", "overhauled", "serviceable", "unserviceable", "scrap", "prototype"].includes(row.condition ?? ""))
          ? (row.condition as "new" | "overhauled" | "serviceable" | "unserviceable" | "scrap" | "prototype")
          : "new";
        const location = (["inventory", "installed", "quarantine", "scrapped", "pending_inspection", "removed_pending_disposition", "returned_to_vendor"].includes(row.location ?? ""))
          ? (row.location as "inventory" | "installed" | "quarantine" | "scrapped" | "pending_inspection" | "removed_pending_disposition" | "returned_to_vendor")
          : "inventory";
        await ctx.db.insert("parts", {
          partNumber: row.partNumber,
          partName: row.partName,
          description: row.description,
          serialNumber: row.serialNumber,
          isSerialized: !!row.serialNumber,
          isLifeLimited: false,
          hasShelfLifeLimit: false,
          condition,
          location,
          isOwnerSupplied: false,
          organizationId: args.organizationId,
          createdAt: now,
          updatedAt: now,
        });
        results.push({ row: i, success: true });
      } catch (e: unknown) {
        results.push({ row: i, success: false, error: e instanceof Error ? e.message : "Unknown error" });
      }
    }
    return results;
  },
});

export const importCustomers = mutation({
  args: {
    organizationId: v.id("organizations"),
    rows: v.array(
      v.object({
        name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const results: { row: number; success: boolean; error?: string }[] = [];
    for (let i = 0; i < args.rows.length; i++) {
      const row = args.rows[i];
      try {
        const now = Date.now();
        await ctx.db.insert("customers", {
          organizationId: args.organizationId,
          name: row.name,
          email: row.email,
          phone: row.phone,
          address: row.address,
          notes: row.notes,
          customerType: "company",
          active: true,
          createdAt: now,
          updatedAt: now,
        });
        results.push({ row: i, success: true });
      } catch (e: unknown) {
        results.push({ row: i, success: false, error: e instanceof Error ? e.message : "Unknown error" });
      }
    }
    return results;
  },
});
