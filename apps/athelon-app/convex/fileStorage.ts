// convex/fileStorage.ts
// Athelon — Aviation MRO SaaS Platform
//
// File Storage Integration — MBP-0063
//
// Provides org-scoped file upload, retrieval, listing, and deletion
// with entity-level linking. Files can be attached to any entity type
// (taskCardStep, discrepancy, workOrder, etc.) via linkedEntityType
// and linkedEntityId.
//
// Uses the Convex built-in file storage for bytes; this module manages
// metadata in the `files` table.
//
// Flow:
//   1. Client calls generateUploadUrl → short-lived upload URL
//   2. Client POSTs file bytes to that URL → receives { storageId }
//   3. Client calls storeFileMetadata with storageId + metadata
//   4. To serve: call getFileUrl(storageId)
//   5. To list: call listFiles({ linkedEntityType, linkedEntityId })

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL: Require authenticated user
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "UNAUTHENTICATED: This operation requires a valid Clerk session.",
    );
  }
  return identity.subject;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: generateUploadUrl
//
// Returns a short-lived URL for direct file upload. Org-scoped by requiring
// authentication. The URL is single-use and expires in ~1 minute.
// ─────────────────────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: storeFileMetadata
//
// Persists file metadata after successful upload. Links the file to an
// entity via linkedEntityType + linkedEntityId for retrieval.
// ─────────────────────────────────────────────────────────────────────────────

export const storeFileMetadata = mutation({
  args: {
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    storageId: v.id("_storage"),
    organizationId: v.id("organizations"),
    linkedEntityType: v.string(),
    linkedEntityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (!args.fileName.trim()) {
      throw new Error("FILE_NAME_EMPTY: fileName must be non-empty.");
    }
    if (args.fileSize <= 0) {
      throw new Error(
        `FILE_SIZE_INVALID: fileSize must be > 0. Received: ${args.fileSize}.`,
      );
    }

    const fileId = await ctx.db.insert("files", {
      fileName: args.fileName.trim(),
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      storageId: args.storageId,
      organizationId: args.organizationId,
      linkedEntityType: args.linkedEntityType,
      linkedEntityId: args.linkedEntityId,
      uploadedByUserId: userId,
      uploadedAt: Date.now(),
    });

    return fileId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getFileUrl
//
// Returns the serving URL for a file by its storageId.
// ─────────────────────────────────────────────────────────────────────────────

export const getFileUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<string | null> => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listFiles
//
// Returns all files linked to a specific entity.
// ─────────────────────────────────────────────────────────────────────────────

export const listFiles = query({
  args: {
    linkedEntityType: v.string(),
    linkedEntityId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_entity", (q) =>
        q
          .eq("linkedEntityType", args.linkedEntityType)
          .eq("linkedEntityId", args.linkedEntityId),
      )
      .order("asc")
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: deleteFile
//
// Removes a file record and deletes the underlying storage bytes.
// ─────────────────────────────────────────────────────────────────────────────

export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<void> => {
    await requireAuth(ctx);

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error(`File ${args.fileId} not found.`);
    }
    if (file.organizationId !== args.organizationId) {
      throw new Error(
        `File ${args.fileId} does not belong to organization ${args.organizationId}.`,
      );
    }

    // Delete file bytes from Convex storage
    await ctx.storage.delete(file.storageId);

    // Delete metadata record
    await ctx.db.delete(args.fileId);
  },
});
