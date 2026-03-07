// convex/bulkImport.ts
// Athelon — Bulk CSV Import Mutations

import { mutation, query } from "./_generated/server";
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

function normalizeTail(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : undefined;
}

function normalizeSerial(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : undefined;
}

export const previewCampAircraftMappings = query({
  args: {
    organizationId: v.id("organizations"),
    rows: v.array(
      v.object({
        campAircraftId: v.string(),
        campTailNumber: v.optional(v.string()),
        serialNumber: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const aircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_organization", (q: any) => q.eq("operatingOrganizationId", args.organizationId))
      .collect();

    return args.rows.map((row) => {
      const normalizedTail = normalizeTail(row.campTailNumber);
      const normalizedSerial = normalizeSerial(row.serialNumber);
      const candidates = aircraft.filter((ac) => {
        const tailMatch = normalizedTail && normalizeTail(ac.currentRegistration) === normalizedTail;
        const serialMatch = normalizedSerial && normalizeSerial(ac.serialNumber) === normalizedSerial;
        return Boolean(tailMatch || serialMatch);
      });

      const strongest = candidates.find(
        (ac) => normalizedTail && normalizeTail(ac.currentRegistration) === normalizedTail && normalizedSerial && normalizeSerial(ac.serialNumber) === normalizedSerial,
      );
      const selected = strongest ?? candidates[0];
      const ambiguous = candidates.length > 1 && !strongest;

      return {
        campAircraftId: row.campAircraftId,
        campTailNumber: normalizedTail,
        serialNumber: normalizedSerial,
        candidateAircraftIds: candidates.map((c) => c._id),
        selectedAircraftId: ambiguous ? undefined : selected?._id,
        ambiguous,
        linkageConfidence: strongest ? 0.98 : selected ? 0.75 : 0,
      };
    });
  },
});

export const applyCampAircraftMappings = mutation({
  args: {
    organizationId: v.id("organizations"),
    mappings: v.array(
      v.object({
        aircraftId: v.id("aircraft"),
        campAircraftId: v.string(),
        campTailNumber: v.optional(v.string()),
        linkageConfidence: v.optional(v.number()),
        confirmRelink: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const results: { aircraftId: Id<"aircraft">; success: boolean; error?: string }[] = [];

    for (const mapping of args.mappings) {
      try {
        const aircraft = await ctx.db.get(mapping.aircraftId);
        if (!aircraft) throw new Error("Aircraft not found.");
        if (aircraft.operatingOrganizationId !== args.organizationId) {
          throw new Error("Aircraft organization mismatch.");
        }

        const campAircraftId = trimOrUndefined(mapping.campAircraftId);
        if (!campAircraftId) throw new Error("Missing CAMP aircraft ID.");

        const orgConflict = await ctx.db
          .query("aircraft")
          .withIndex("by_org_camp_aircraft_id", (q: any) =>
            q.eq("operatingOrganizationId", args.organizationId).eq("campAircraftId", campAircraftId)
          )
          .first();
        if (orgConflict && orgConflict._id !== mapping.aircraftId) {
          throw new Error("CAMP aircraft ID already linked to another aircraft in this org.");
        }

        if (aircraft.campAircraftId && aircraft.campAircraftId !== campAircraftId && !mapping.confirmRelink) {
          throw new Error("Relink requires confirmRelink=true.");
        }

        const before = {
          campAircraftId: aircraft.campAircraftId,
          campTailNumber: aircraft.campTailNumber,
          campStatus: aircraft.campStatus,
          campLastSyncAt: aircraft.campLastSyncAt,
          campSyncHealth: aircraft.campSyncHealth,
          campLinkageConfidence: aircraft.campLinkageConfidence,
          campLinkageMethod: aircraft.campLinkageMethod,
        };

        await ctx.db.patch(mapping.aircraftId, {
          campAircraftId,
          campTailNumber: normalizeTail(mapping.campTailNumber),
          campStatus: "linked",
          campLastSyncAt: now,
          campSyncHealth: "healthy",
          campLinkageConfidence: mapping.linkageConfidence,
          campLinkageMethod: "import",
          updatedAt: now,
        });

        const afterDoc = await ctx.db.get(mapping.aircraftId);
        await ctx.db.insert("campLinkAudit", {
          organizationId: args.organizationId,
          aircraftId: mapping.aircraftId,
          action: aircraft.campAircraftId && aircraft.campAircraftId !== campAircraftId ? "relink" : "link",
          actorUserId: userId,
          linkageMethod: "import",
          before,
          after: afterDoc
            ? {
                campAircraftId: afterDoc.campAircraftId,
                campTailNumber: afterDoc.campTailNumber,
                campStatus: afterDoc.campStatus,
                campLastSyncAt: afterDoc.campLastSyncAt,
                campSyncHealth: afterDoc.campSyncHealth,
                campLinkageConfidence: afterDoc.campLinkageConfidence,
                campLinkageMethod: afterDoc.campLinkageMethod,
              }
            : undefined,
          reason: "Bulk import CAMP mapping helper",
          createdAt: now,
        });

        results.push({ aircraftId: mapping.aircraftId, success: true });
      } catch (error) {
        results.push({
          aircraftId: mapping.aircraftId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  },
});

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
        campAircraftId: v.optional(v.string()),
        campTailNumber: v.optional(v.string()),
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

        const campAircraftId = trimOrUndefined(row.campAircraftId);
        if (campAircraftId) {
          const campConflict = await ctx.db
            .query("aircraft")
            .withIndex("by_org_camp_aircraft_id", (q: any) =>
              q.eq("operatingOrganizationId", args.organizationId).eq("campAircraftId", campAircraftId)
            )
            .first();
          if (campConflict) {
            results.push({ row: i, success: false, error: `Duplicate CAMP aircraft ID in org: ${campAircraftId}` });
            continue;
          }
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
          campAircraftId,
          campTailNumber: normalizeTail(row.campTailNumber),
          campStatus: campAircraftId ? "linked" : "unlinked",
          campLastSyncAt: campAircraftId ? now : undefined,
          campSyncHealth: campAircraftId ? "healthy" : "unknown",
          campLinkageConfidence: campAircraftId ? 0.8 : undefined,
          campLinkageMethod: campAircraftId ? "import" : undefined,
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

        if (campAircraftId) {
          await ctx.db.insert("campLinkAudit", {
            organizationId: args.organizationId,
            aircraftId: createdId,
            action: "link",
            actorUserId: userId,
            linkageMethod: "import",
            after: {
              campAircraftId,
              campTailNumber: normalizeTail(row.campTailNumber),
              campStatus: "linked",
              campLastSyncAt: now,
              campSyncHealth: "healthy",
              campLinkageConfidence: 0.8,
              campLinkageMethod: "import",
            },
            reason: "Bulk aircraft import with CAMP linkage",
            createdAt: now,
          });
        }

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
