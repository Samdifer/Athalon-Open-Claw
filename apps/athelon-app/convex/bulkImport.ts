// convex/bulkImport.ts
// Athelon — Bulk CSV Import Mutations

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/authHelpers";

type ImportRole =
  | "admin"
  | "shop_manager"
  | "lead_technician"
  | "billing_manager"
  | "parts_clerk";

const AIRCRAFT_IMPORT_ROLES: ImportRole[] = ["admin", "shop_manager", "lead_technician"];
const PARTS_IMPORT_ROLES: ImportRole[] = ["admin", "shop_manager", "lead_technician", "parts_clerk"];
const CUSTOMERS_IMPORT_ROLES: ImportRole[] = ["admin", "shop_manager", "lead_technician", "billing_manager"];

const VALID_PART_CONDITIONS = new Set([
  "new",
  "overhauled",
  "serviceable",
  "repaired",
  "unserviceable",
  "quarantine",
  "scrapped",
] as const);

const VALID_PART_LOCATIONS = new Set([
  "inventory",
  "installed",
  "quarantine",
  "scrapped",
  "pending_inspection",
  "removed_pending_disposition",
  "returned_to_vendor",
] as const);

async function requireImportPermission(
  ctx: any,
  organizationId: Id<"organizations">,
  allowedRoles: ImportRole[],
) {
  const userId = await requireAuth(ctx);
  const technician = await ctx.db
    .query("technicians")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.eq(q.field("organizationId"), organizationId))
    .first();

  if (!technician) {
    throw new Error("ACCESS_DENIED: technician profile required for this organization.");
  }
  if (technician.status !== "active") {
    throw new Error("ACCESS_DENIED: technician must be active to perform imports.");
  }
  if (!technician.role || !allowedRoles.includes(technician.role)) {
    throw new Error(
      `ACCESS_DENIED: requires one of roles [${allowedRoles.join(", ")}].`,
    );
  }

  return { userId, technicianId: technician._id, role: technician.role };
}

function trimOrUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

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
    const { userId, technicianId, role } = await requireImportPermission(
      ctx,
      args.organizationId,
      AIRCRAFT_IMPORT_ROLES,
    );

    const results: { row: number; success: boolean; error?: string }[] = [];
    for (let i = 0; i < args.rows.length; i++) {
      const row = args.rows[i];
      try {
        const tailNumber = trimOrUndefined(row.tailNumber)?.toUpperCase();
        const make = trimOrUndefined(row.make);
        const model = trimOrUndefined(row.model);
        const serialNumber = trimOrUndefined(row.serialNumber);

        if (!tailNumber || !make || !model || !serialNumber) {
          results.push({ row: i, success: false, error: "Required fields are missing." });
          continue;
        }

        const existing = await ctx.db
          .query("aircraft")
          .withIndex("by_registration", (q: any) => q.eq("currentRegistration", tailNumber))
          .filter((q: any) => q.eq(q.field("operatingOrganizationId"), args.organizationId))
          .first();

        if (existing) {
          results.push({ row: i, success: false, error: `Duplicate tail: ${tailNumber}` });
          continue;
        }

        const now = Date.now();
        const createdId = await ctx.db.insert("aircraft", {
          currentRegistration: tailNumber,
          make,
          model,
          serialNumber,
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

        await ctx.db.insert("auditLog", {
          organizationId: args.organizationId,
          eventType: "record_created",
          tableName: "aircraft",
          recordId: String(createdId),
          userId,
          technicianId,
          fieldName: "bulkImport",
          newValue: JSON.stringify({
            row: i + 1,
            role,
            tailNumber,
            make,
            model,
            serialNumber,
          }),
          notes: "Bulk CSV import: aircraft row created",
          timestamp: now,
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
    const { userId, technicianId, role } = await requireImportPermission(
      ctx,
      args.organizationId,
      PARTS_IMPORT_ROLES,
    );

    const results: { row: number; success: boolean; error?: string }[] = [];
    for (let i = 0; i < args.rows.length; i++) {
      const row = args.rows[i];
      try {
        const partNumber = trimOrUndefined(row.partNumber);
        const partName = trimOrUndefined(row.partName);
        if (!partNumber || !partName) {
          results.push({ row: i, success: false, error: "Required fields are missing." });
          continue;
        }

        const now = Date.now();
        const normalizedCondition = trimOrUndefined(row.condition)?.toLowerCase() as
          | "new"
          | "overhauled"
          | "serviceable"
          | "repaired"
          | "unserviceable"
          | "quarantine"
          | "scrapped"
          | undefined;
        const condition = normalizedCondition && VALID_PART_CONDITIONS.has(normalizedCondition)
          ? normalizedCondition
          : "new";

        const normalizedLocation = trimOrUndefined(row.location)?.toLowerCase() as
          | "inventory"
          | "installed"
          | "quarantine"
          | "scrapped"
          | "pending_inspection"
          | "removed_pending_disposition"
          | "returned_to_vendor"
          | undefined;
        const location = normalizedLocation && VALID_PART_LOCATIONS.has(normalizedLocation)
          ? normalizedLocation
          : "inventory";

        const createdId = await ctx.db.insert("parts", {
          partNumber,
          partName,
          description: trimOrUndefined(row.description),
          serialNumber: trimOrUndefined(row.serialNumber),
          isSerialized: !!trimOrUndefined(row.serialNumber),
          isLifeLimited: false,
          hasShelfLifeLimit: false,
          condition,
          location,
          isOwnerSupplied: false,
          organizationId: args.organizationId,
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert("auditLog", {
          organizationId: args.organizationId,
          eventType: "record_created",
          tableName: "parts",
          recordId: String(createdId),
          userId,
          technicianId,
          fieldName: "bulkImport",
          newValue: JSON.stringify({
            row: i + 1,
            role,
            partNumber,
            partName,
            condition,
            location,
          }),
          notes: "Bulk CSV import: part row created",
          timestamp: now,
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
    const { userId, technicianId, role } = await requireImportPermission(
      ctx,
      args.organizationId,
      CUSTOMERS_IMPORT_ROLES,
    );

    const results: { row: number; success: boolean; error?: string }[] = [];
    for (let i = 0; i < args.rows.length; i++) {
      const row = args.rows[i];
      try {
        const name = trimOrUndefined(row.name);
        if (!name) {
          results.push({ row: i, success: false, error: "Required field \"name\" is missing." });
          continue;
        }

        const now = Date.now();
        const createdId = await ctx.db.insert("customers", {
          organizationId: args.organizationId,
          name,
          email: trimOrUndefined(row.email),
          phone: trimOrUndefined(row.phone),
          address: trimOrUndefined(row.address),
          notes: trimOrUndefined(row.notes),
          customerType: "company",
          active: true,
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert("auditLog", {
          organizationId: args.organizationId,
          eventType: "record_created",
          tableName: "customers",
          recordId: String(createdId),
          userId,
          technicianId,
          fieldName: "bulkImport",
          newValue: JSON.stringify({
            row: i + 1,
            role,
            name,
            email: trimOrUndefined(row.email),
          }),
          notes: "Bulk CSV import: customer row created",
          timestamp: now,
        });

        results.push({ row: i, success: true });
      } catch (e: unknown) {
        results.push({ row: i, success: false, error: e instanceof Error ? e.message : "Unknown error" });
      }
    }
    return results;
  },
});
