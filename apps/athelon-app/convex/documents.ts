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
import type { Id } from "./_generated/dataModel";

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

function workOrderIdFromEvidenceAttachment(attachedToId: string): Id<"workOrders"> | null {
  const [workOrderId] = attachedToId.split(":");
  return workOrderId ? (workOrderId as Id<"workOrders">) : null;
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
    await requireAuth(ctx);
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
    await requireAuth(ctx);
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

    if (doc.attachedToTable === "taskCards") {
      const taskCard = await ctx.db.get(doc.attachedToId as Id<"taskCards">);
      if (taskCard && (taskCard.status === "complete" || taskCard.status === "voided" || !!taskCard.signedAt)) {
        throw new Error("Task card is signed/locked. Attached documents are immutable.");
      }
    }

    if (doc.attachedToTable === "taskCardSteps") {
      const step = await ctx.db.get(doc.attachedToId as Id<"taskCardSteps">);
      if (step) {
        const taskCard = await ctx.db.get(step.taskCardId);
        if (taskCard && (taskCard.status === "complete" || taskCard.status === "voided" || !!taskCard.signedAt)) {
          throw new Error("Parent task card is signed/locked. Step documents are immutable.");
        }
      }
    }

    const isWorkOrderAttachment = doc.attachedToTable === "workOrders";
    const isWorkOrderEvidenceAttachment = doc.attachedToTable === "workOrderEvidence";
    if (isWorkOrderAttachment || isWorkOrderEvidenceAttachment) {
      const workOrderId = isWorkOrderAttachment
        ? (doc.attachedToId as Id<"workOrders">)
        : workOrderIdFromEvidenceAttachment(doc.attachedToId);
      if (workOrderId) {
        const workOrder = await ctx.db.get(workOrderId);
        if (workOrder && (workOrder.status === "closed" || workOrder.status === "voided")) {
          throw new Error("Work order is closed/voided. Evidence documents are immutable.");
        }
      }
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
// MUTATION: markAircraftPhotoFeatured
//
// Sets one aircraft image document as featured by adding a "[featured]" token
// to its description and removing that token from sibling aircraft image docs.
// ─────────────────────────────────────────────────────────────────────────────

export const markAircraftPhotoFeatured = mutation({
  args: {
    organizationId: v.id("organizations"),
    aircraftId: v.string(),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const candidate = await ctx.db.get(args.documentId);
    if (!candidate) throw new Error("Document not found.");
    if (candidate.organizationId !== args.organizationId) {
      throw new Error("ORG_MISMATCH: document does not belong to this organization.");
    }
    if (candidate.attachedToTable !== "aircraft" || candidate.attachedToId !== args.aircraftId) {
      throw new Error("Document is not attached to the requested aircraft.");
    }
    if (!candidate.mimeType.startsWith("image/")) {
      throw new Error("Only image documents can be marked as featured.");
    }

    const siblings = await ctx.db
      .query("documents")
      .withIndex("by_attachment", (q) =>
        q.eq("attachedToTable", "aircraft").eq("attachedToId", args.aircraftId),
      )
      .collect();

    for (const doc of siblings) {
      if (!doc.mimeType.startsWith("image/")) continue;
      const existing = doc.description ?? "";
      const withoutFeatured = existing.replace(/\[featured\]\s*/gi, "").trim();
      if (doc._id === args.documentId) {
        await ctx.db.patch(doc._id, {
          description: `[featured] ${withoutFeatured}`.trim(),
        });
      } else if (existing.toLowerCase().includes("[featured]")) {
        await ctx.db.patch(doc._id, {
          description: withoutFeatured || undefined,
        });
      }
    }

    return { success: true };
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
    await requireAuth(ctx);
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

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getPhotoThumbnailsForParts
//
// Batch query that returns a featured/first photo CDN URL for each part ID.
// Used by the tile view to render thumbnails without N+1 queries.
// ─────────────────────────────────────────────────────────────────────────────

export const getPhotoThumbnailsForParts = query({
  args: {
    partIds: v.array(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Record<string, string | null>> => {
    const result: Record<string, string | null> = {};

    for (const partId of args.partIds) {
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_attachment", (q) =>
          q
            .eq("attachedToTable", "parts")
            .eq("attachedToId", partId),
        )
        .collect();

      const photos = docs.filter(
        (d) =>
          d.documentType === "photo" &&
          d.mimeType.startsWith("image/"),
      );

      if (photos.length === 0) {
        result[partId] = null;
        continue;
      }

      const featured = photos.find((d) =>
        (d.description ?? "").toLowerCase().includes("[featured]"),
      );
      const pick = featured ?? photos[0];
      const url = await ctx.storage.getUrl(pick.storageId);
      result[partId] = url;
    }

    return result;
  },
});
