// convex/documents.ts
// Athelon — Aviation MRO SaaS Platform
//
// Document Attachment System — Phase E
//
// Provides file upload, retrieval, and deletion for supporting documents
// attached to work orders, discrepancies, task cards, and maintenance records.
//
// File storage architecture:
//   1. Client calls generateUploadUrl → receives a short-lived upload URL
//   2. Client POSTs the file bytes directly to that URL
//   3. Client calls saveDocument with the returned storageId + metadata
//   4. To serve a file: call getDocumentUrl(storageId) → serving URL
//
// Convex storage handles the bytes. This module handles the metadata.
//
// Author:     Phase E Implementation
// Regulatory: Supporting documentation for 14 CFR Part 43.9(a)(4)
//
// KEY REGULATORY NOTE:
//   FAA-approved data references (AMM, SB, CMM pages) must be traceable on
//   each maintenance entry. The documentType == "approved_data" classification
//   is the digital analog of the paper "attach approved data page" annotation.
//   When an FAA inspector asks "what approved data was used?", a technician
//   can point to the attached PDF — the answer is in the record itself.

import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITY: REQUIRE AUTHENTICATED USER
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
// Returns a short-lived URL that the client can POST a file to directly.
// Convex file storage handles S3 under the hood. This URL is single-use
// and expires in ~1 minute (Convex default).
//
// The flow:
//   1. Call generateUploadUrl → get { uploadUrl }
//   2. POST the file bytes to uploadUrl (with correct Content-Type header)
//   3. The server responds with { storageId }
//   4. Call saveDocument with storageId + metadata
// ─────────────────────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: saveDocument
//
// Persists document metadata after the file has been uploaded to Convex storage.
// Called immediately after a successful file upload with the storageId returned
// by the storage server.
//
// attachedToTable and attachedToId are the polymorphic FK pointing to the
// record this document is attached to (e.g., "workOrders", workOrderId).
// ─────────────────────────────────────────────────────────────────────────────

export const saveDocument = mutation({
  args: {
    organizationId: v.id("organizations"),
    attachedToTable: v.string(),
    attachedToId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    documentType: v.union(
      v.literal("approved_data"),
      v.literal("ad_document"),
      v.literal("work_authorization"),
      v.literal("photo"),
      v.literal("parts_8130"),
      v.literal("vendor_invoice"),
      v.literal("other"),
    ),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (!args.fileName.trim()) {
      throw new Error("DOCUMENT_FILENAME_EMPTY: fileName must be non-empty.");
    }
    if (args.fileSize <= 0) {
      throw new Error(
        `DOCUMENT_FILESIZE_INVALID: fileSize must be > 0. Received: ${args.fileSize}.`,
      );
    }

    const documentId = await ctx.db.insert("documents", {
      organizationId: args.organizationId,
      attachedToTable: args.attachedToTable,
      attachedToId: args.attachedToId,
      storageId: args.storageId,
      fileName: args.fileName.trim(),
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      documentType: args.documentType,
      description: args.description?.trim(),
      uploadedByUserId: userId,
      uploadedAt: Date.now(),
    });

    return documentId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listDocuments
//
// Returns all documents attached to a specific record.
// attachedToTable + attachedToId together identify the record.
//
// Does NOT return serving URLs — call getDocumentUrl separately per document
// to avoid N+1 round-trips (URLs expire and shouldn't be cached in list results).
// ─────────────────────────────────────────────────────────────────────────────

export const listDocuments = query({
  args: {
    attachedToTable: v.string(),
    attachedToId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_attachment", (q) =>
        q
          .eq("attachedToTable", args.attachedToTable)
          .eq("attachedToId", args.attachedToId),
      )
      .order("asc")
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getDocumentUrl
//
// Returns the serving URL for a single document by its storageId.
// URLs returned by Convex storage are served from a CDN and have a long TTL.
// This is a query (not mutation) — reading a URL is a safe, cacheable operation.
// ─────────────────────────────────────────────────────────────────────────────

export const getDocumentUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<string | null> => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: deleteDocument
//
// Removes a document record and deletes the underlying file from storage.
// Only the uploader or an org admin may delete a document.
//
// REGULATORY ADVISORY [alpha scope]:
//   Documents attached to closed work orders or signed maintenance records
//   should not be deleted in production. This guard is v1.1 scope.
//   For alpha, the mutation warns via the audit log but does not hard-block.
// ─────────────────────────────────────────────────────────────────────────────

export const deleteDocument = mutation({
  args: {
    documentId: v.id("documents"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireAuth(ctx);

    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error(`Document ${args.documentId} not found.`);
    }
    if (doc.organizationId !== args.organizationId) {
      throw new Error(
        `Document ${args.documentId} does not belong to organization ${args.organizationId}.`,
      );
    }

    // Delete file bytes from Convex storage
    await ctx.storage.delete(doc.storageId);

    // Delete metadata record
    await ctx.db.delete(args.documentId);

    // Audit log
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "documents",
      recordId: args.documentId,
      userId,
      notes:
        `Document "${doc.fileName}" (${doc.documentType}) deleted from ` +
        `${doc.attachedToTable}/${doc.attachedToId}. ` +
        `Storage ID: ${doc.storageId}. ` +
        `ADVISORY: Verify this document was not needed for FAA compliance traceability.`,
      timestamp: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getDocumentCount
//
// Returns the number of documents attached to a record.
// Cheap to call — used to show attachment count badges in list views
// without loading full document metadata.
// ─────────────────────────────────────────────────────────────────────────────

export const getDocumentCount = query({
  args: {
    attachedToTable: v.string(),
    attachedToId: v.string(),
  },
  handler: async (ctx, args): Promise<number> => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_attachment", (q) =>
        q
          .eq("attachedToTable", args.attachedToTable)
          .eq("attachedToId", args.attachedToId),
      )
      .collect();
    return docs.length;
  },
});
