// convex/partsBulkUpload.ts
// Athelon — Parts Bulk Upload System
//
// Manages multi-row CSV/spreadsheet upload sessions for parts inventory.
// Supports per-batch progress tracking, per-row issue collection, and
// duplicate/near-match detection before commit.

import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/authHelpers";

// ─── RBAC ─────────────────────────────────────────────────────────────────────

type BulkUploadRole = "admin" | "shop_manager" | "lead_technician" | "parts_clerk";

const PARTS_UPLOAD_ROLES: BulkUploadRole[] = [
  "admin",
  "shop_manager",
  "lead_technician",
  "parts_clerk",
];

async function requireUploadPermission(
  ctx: any,
  organizationId: Id<"organizations">,
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
    throw new Error("ACCESS_DENIED: technician must be active to perform bulk uploads.");
  }
  if (!technician.role || !PARTS_UPLOAD_ROLES.includes(technician.role as BulkUploadRole)) {
    throw new Error(
      `ACCESS_DENIED: requires one of roles [${PARTS_UPLOAD_ROLES.join(", ")}].`,
    );
  }

  return { userId, technicianId: technician._id as Id<"technicians">, role: technician.role as BulkUploadRole };
}

// ─── Row validator shape ───────────────────────────────────────────────────────

const rowValidator = v.object({
  partNumber: v.string(),
  partName: v.string(),
  condition: v.string(),
  isSerialized: v.boolean(),
  isOwnerSupplied: v.boolean(),
  isLifeLimited: v.boolean(),
  hasShelfLifeLimit: v.boolean(),
  receivingDate: v.number(),
  // Optional fields from receivePart
  description: v.optional(v.string()),
  serialNumber: v.optional(v.string()),
  supplier: v.optional(v.string()),
  purchaseOrderNumber: v.optional(v.string()),
  lifeLimitHours: v.optional(v.number()),
  lifeLimitCycles: v.optional(v.number()),
  hoursAccumulatedBeforeInstall: v.optional(v.number()),
  cyclesAccumulatedBeforeInstall: v.optional(v.number()),
  shelfLifeLimitDate: v.optional(v.number()),
  notes: v.optional(v.string()),
  partCategory: v.optional(v.string()),
});

// ─── MUTATION: createUploadBatch ──────────────────────────────────────────────

/** Creates a new upload batch record with status "processing". Returns the batch ID. */
export const createUploadBatch = mutation({
  args: {
    organizationId: v.id("organizations"),
    batchLabel: v.string(),
    fileName: v.string(),
    totalRows: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"partUploadBatches">> => {
    const { userId, technicianId } = await requireUploadPermission(ctx, args.organizationId);
    const now = Date.now();

    const batchId = await ctx.db.insert("partUploadBatches", {
      organizationId: args.organizationId,
      createdByUserId: userId,
      createdByTechnicianId: technicianId,
      batchLabel: args.batchLabel.trim(),
      fileName: args.fileName.trim(),
      totalRows: args.totalRows,
      successCount: 0,
      errorCount: 0,
      warningCount: 0,
      status: "processing",
      createdAt: now,
      updatedAt: now,
    });

    return batchId;
  },
});

// ─── ACTION: commitPartsBatch ─────────────────────────────────────────────────

/** Processes a chunk of rows, calling receivePart for each. Collects per-row
 *  results and writes issues for failed rows. Updates batch progress counters. */
export const commitPartsBatch = action({
  args: {
    organizationId: v.id("organizations"),
    batchId: v.id("partUploadBatches"),
    chunkIndex: v.number(),
    rows: v.array(rowValidator),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ rowIndex: number; success: boolean; partId?: string; error?: string }[]> => {
    const results: { rowIndex: number; success: boolean; partId?: string; error?: string }[] = [];
    const failedIssues: {
      rowIndex: number;
      partNumber: string;
      partName: string;
      error: string;
      rawRowJson: string;
    }[] = [];

    for (let i = 0; i < args.rows.length; i++) {
      const row = args.rows[i];
      // Compute absolute row index across chunks (chunkIndex is 0-based chunk number,
      // rows.length may vary per chunk — use position within this chunk)
      const rowIndex = args.chunkIndex * args.rows.length + i;

      try {
        const result = await ctx.runMutation(api.parts.receivePart, {
          organizationId: args.organizationId,
          partNumber: row.partNumber,
          partName: row.partName,
          condition: row.condition as
            | "new"
            | "overhauled"
            | "serviceable"
            | "repaired"
            | "unserviceable"
            | "quarantine"
            | "scrapped",
          isSerialized: row.isSerialized,
          isOwnerSupplied: row.isOwnerSupplied,
          isLifeLimited: row.isLifeLimited,
          hasShelfLifeLimit: row.hasShelfLifeLimit,
          receivingDate: row.receivingDate,
          description: row.description,
          serialNumber: row.serialNumber,
          supplier: row.supplier,
          purchaseOrderNumber: row.purchaseOrderNumber,
          lifeLimitHours: row.lifeLimitHours,
          lifeLimitCycles: row.lifeLimitCycles,
          hoursAccumulatedBeforeInstall: row.hoursAccumulatedBeforeInstall,
          cyclesAccumulatedBeforeInstall: row.cyclesAccumulatedBeforeInstall,
          shelfLifeLimitDate: row.shelfLifeLimitDate,
          notes: row.notes,
        });

        results.push({ rowIndex, success: true, partId: String(result.partId) });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        results.push({ rowIndex, success: false, error: errorMessage });
        failedIssues.push({
          rowIndex,
          partNumber: row.partNumber,
          partName: row.partName,
          error: errorMessage,
          rawRowJson: JSON.stringify(row),
        });
      }
    }

    const successDelta = results.filter((r) => r.success).length;
    const errorDelta = results.filter((r) => !r.success).length;

    // Write issues for failed rows
    if (failedIssues.length > 0) {
      await ctx.runMutation(internal.partsBulkUpload.createBatchIssues, {
        organizationId: args.organizationId,
        batchId: args.batchId,
        issues: failedIssues.map((f) => ({
          rowIndex: f.rowIndex,
          partNumber: f.partNumber,
          partName: f.partName,
          issueType: "create_error" as const,
          severity: "error" as const,
          message: f.error,
          rawRowJson: f.rawRowJson,
        })),
      });
    }

    // Update batch progress counters
    await ctx.runMutation(internal.partsBulkUpload.updateBatchProgress, {
      batchId: args.batchId,
      successDelta,
      errorDelta,
      warningDelta: 0,
    });

    return results;
  },
});

// ─── MUTATION: finalizeBatch ──────────────────────────────────────────────────

/** Patches the batch with final counts and sets its terminal status. */
export const finalizeBatch = mutation({
  args: {
    batchId: v.id("partUploadBatches"),
    successCount: v.number(),
    errorCount: v.number(),
    warningCount: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    await requireAuth(ctx);
    const now = Date.now();

    let status: "complete" | "partial" | "failed";
    if (args.errorCount === 0) {
      status = "complete";
    } else if (args.successCount > 0) {
      status = "partial";
    } else {
      status = "failed";
    }

    await ctx.db.patch(args.batchId, {
      successCount: args.successCount,
      errorCount: args.errorCount,
      warningCount: args.warningCount,
      status,
      completedAt: now,
      updatedAt: now,
    });
  },
});

// ─── QUERY: checkExactDuplicate ───────────────────────────────────────────────

/** Returns existing parts that exactly match the given part number (and
 *  optionally serial number). Used for pre-upload duplicate detection. */
export const checkExactDuplicate = query({
  args: {
    organizationId: v.id("organizations"),
    partNumber: v.string(),
    serialNumber: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    {
      _id: Id<"parts">;
      partNumber: string;
      serialNumber: string | undefined;
      partName: string;
      condition: string;
      quantityOnHand: number | undefined;
      location: string;
    }[]
  > => {
    await requireAuth(ctx);

    if (args.serialNumber) {
      // Exact match on partNumber + serialNumber
      const parts = await ctx.db
        .query("parts")
        .withIndex("by_serial", (q) =>
          q.eq("partNumber", args.partNumber).eq("serialNumber", args.serialNumber!),
        )
        .collect();

      return parts
        .filter((p) => p.organizationId === args.organizationId)
        .map((p) => ({
          _id: p._id,
          partNumber: p.partNumber,
          serialNumber: p.serialNumber,
          partName: p.partName,
          condition: p.condition,
          quantityOnHand: p.quantityOnHand,
          location: p.location,
        }));
    }

    // Match on partNumber only
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_part_number", (q) => q.eq("partNumber", args.partNumber))
      .collect();

    return parts
      .filter((p) => p.organizationId === args.organizationId)
      .map((p) => ({
        _id: p._id,
        partNumber: p.partNumber,
        serialNumber: p.serialNumber,
        partName: p.partName,
        condition: p.condition,
        quantityOnHand: p.quantityOnHand,
        location: p.location,
      }));
  },
});

// ─── QUERY: checkNearMatchCandidates ─────────────────────────────────────────

/** Full-text search for parts with similar part numbers. Used for near-match
 *  detection before committing a bulk upload row. Returns up to 10 matches. */
export const checkNearMatchCandidates = query({
  args: {
    organizationId: v.id("organizations"),
    partNumber: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    {
      _id: Id<"parts">;
      partNumber: string;
      partName: string;
      condition: string;
      quantityOnHand: number | undefined;
    }[]
  > => {
    await requireAuth(ctx);

    const term = args.partNumber.trim();
    if (term.length < 2) return [];

    const candidates = await ctx.db
      .query("parts")
      .withSearchIndex("search_partNumber", (q) =>
        q.search("partNumber", term).eq("organizationId", args.organizationId),
      )
      .take(10);

    return candidates.map((p) => ({
      _id: p._id,
      partNumber: p.partNumber,
      partName: p.partName,
      condition: p.condition,
      quantityOnHand: p.quantityOnHand,
    }));
  },
});

// ─── QUERY: listBatches ───────────────────────────────────────────────────────

/** Returns all upload batches for the org, newest first. */
export const listBatches = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const batches = await ctx.db
      .query("partUploadBatches")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    return batches.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ─── QUERY: getBatch ──────────────────────────────────────────────────────────

/** Returns a single batch record with resolved and unresolved issue counts. */
export const getBatch = query({
  args: {
    batchId: v.id("partUploadBatches"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const batch = await ctx.db.get(args.batchId);
    if (!batch) return null;

    const allIssues = await ctx.db
      .query("partUploadIssues")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();

    const resolvedCount = allIssues.filter((i) => i.resolvedAt !== undefined).length;
    const unresolvedCount = allIssues.length - resolvedCount;

    return {
      ...batch,
      resolvedIssueCount: resolvedCount,
      unresolvedIssueCount: unresolvedCount,
    };
  },
});

// ─── QUERY: listBatchIssues ───────────────────────────────────────────────────

/** Returns all issues for a batch, ordered by row index. */
export const listBatchIssues = query({
  args: {
    batchId: v.id("partUploadBatches"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const issues = await ctx.db
      .query("partUploadIssues")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();

    return issues.sort((a, b) => a.rowIndex - b.rowIndex);
  },
});

// ─── MUTATION: resolveIssue ───────────────────────────────────────────────────

/** Marks an issue as resolved with the given resolution and optional part link. */
export const resolveIssue = mutation({
  args: {
    issueId: v.id("partUploadIssues"),
    resolution: v.union(
      v.literal("skipped"),
      v.literal("created"),
      v.literal("quantity_updated"),
      v.literal("inline_edited_and_created"),
    ),
    resolvedPartId: v.optional(v.id("parts")),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    await ctx.db.patch(args.issueId, {
      resolvedAt: now,
      resolvedByUserId: userId,
      resolution: args.resolution,
      resolvedPartId: args.resolvedPartId,
      updatedAt: now,
    });
  },
});

// ─── INTERNAL MUTATION: createBatchIssues ────────────────────────────────────

/** Bulk-inserts issue records for failed or warned rows. Called from actions only. */
export const createBatchIssues = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    batchId: v.id("partUploadBatches"),
    issues: v.array(
      v.object({
        rowIndex: v.number(),
        partNumber: v.string(),
        partName: v.optional(v.string()),
        issueType: v.union(
          v.literal("missing_optional_field"),
          v.literal("duplicate_detected"),
          v.literal("near_match_detected"),
          v.literal("validation_warning"),
          v.literal("create_error"),
        ),
        severity: v.union(
          v.literal("warning"),
          v.literal("error"),
        ),
        fieldName: v.optional(v.string()),
        message: v.string(),
        rawRowJson: v.string(),
      }),
    ),
  },
  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();

    for (const issue of args.issues) {
      await ctx.db.insert("partUploadIssues", {
        organizationId: args.organizationId,
        batchId: args.batchId,
        rowIndex: issue.rowIndex,
        partNumber: issue.partNumber,
        partName: issue.partName,
        issueType: issue.issueType,
        severity: issue.severity,
        fieldName: issue.fieldName,
        message: issue.message,
        rawRowJson: issue.rawRowJson,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ─── INTERNAL MUTATION: updateBatchProgress ───────────────────────────────────

/** Increments success/error/warning counters on a batch. Called from actions. */
export const updateBatchProgress = internalMutation({
  args: {
    batchId: v.id("partUploadBatches"),
    successDelta: v.number(),
    errorDelta: v.number(),
    warningDelta: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch) throw new Error(`Batch ${args.batchId} not found.`);

    await ctx.db.patch(args.batchId, {
      successCount: batch.successCount + args.successDelta,
      errorCount: batch.errorCount + args.errorDelta,
      warningCount: batch.warningCount + args.warningDelta,
      updatedAt: Date.now(),
    });
  },
});
