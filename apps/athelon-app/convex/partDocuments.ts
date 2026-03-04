// convex/partDocuments.ts
// Athelon — Aviation MRO SaaS Platform
//
// Part Document Linkage — Inventory System v10
//
// Junction table connecting conformity documents (CoC, CoA, 8130-3, test reports)
// to individual parts and/or lots. Supports the FAA traceability chain required
// by 14 CFR 43.9, 14 CFR 145.201(c), and AC 20-62E.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATOR: documentRole
//
// Classifies the conformity role a document plays for the linked part or lot.
// Mirrors the union defined in the schema for the partDocuments table.
// ─────────────────────────────────────────────────────────────────────────────

const documentRoleValidator = v.union(
  v.literal("certificate_of_conformity"),
  v.literal("certificate_of_airworthiness"),
  v.literal("test_report"),
  v.literal("8130_3_tag"),
  v.literal("receiving_inspection_report"),
  v.literal("vendor_invoice"),
  v.literal("packing_slip"),
  v.literal("material_certification"),
  v.literal("spec_sheet"),
  v.literal("photo"),
  v.literal("other"),
);

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: linkDocument
//
// Links an existing document (from the documents table) to a part and/or lot,
// assigning a conformity role that classifies what kind of evidence the
// document provides.
//
// At least one of partId or lotId must be provided. Both may be provided when
// a document applies to a specific part within a specific lot.
// ─────────────────────────────────────────────────────────────────────────────

export const linkDocument = mutation({
  args: {
    organizationId: v.id("organizations"),
    partId: v.optional(v.id("parts")),
    lotId: v.optional(v.id("lots")),
    documentId: v.id("documents"),
    documentRole: documentRoleValidator,
    description: v.optional(v.string()),
    linkedByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate that at least one of partId or lotId is provided
    if (args.partId === undefined && args.lotId === undefined) {
      throw new Error(
        "PART_DOC_LINK_INVALID: At least one of partId or lotId must be provided.",
      );
    }

    const partDocumentId = await ctx.db.insert("partDocuments", {
      organizationId: args.organizationId,
      partId: args.partId,
      lotId: args.lotId,
      documentId: args.documentId,
      documentRole: args.documentRole,
      description: args.description?.trim(),
      linkedByUserId: args.linkedByUserId,
      linkedAt: Date.now(),
    });

    return partDocumentId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: unlinkDocument
//
// Removes the linkage between a document and a part/lot by deleting the
// junction record. Does NOT delete the underlying document from the documents
// table — that document may be linked to other parts or lots.
// ─────────────────────────────────────────────────────────────────────────────

export const unlinkDocument = mutation({
  args: {
    partDocumentId: v.id("partDocuments"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.partDocumentId);
    if (!record) {
      throw new Error(
        `PART_DOC_NOT_FOUND: Part document linkage ${args.partDocumentId} not found.`,
      );
    }

    await ctx.db.delete(args.partDocumentId);
    return null;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listForPart
//
// Returns all documents linked to a specific part, enriched with the actual
// document record from the documents table. Uses the by_part index.
//
// The returned array contains objects with:
//   - linkage: the partDocuments junction record
//   - document: the full document record (or null if the document was deleted)
// ─────────────────────────────────────────────────────────────────────────────

export const listForPart = query({
  args: {
    partId: v.id("parts"),
  },
  handler: async (ctx, args) => {
    const linkages = await ctx.db
      .query("partDocuments")
      .withIndex("by_part", (q) => q.eq("partId", args.partId))
      .collect();

    const results: Array<{
      linkage: typeof linkages[number];
      document: Awaited<ReturnType<typeof ctx.db.get>> | null;
    }> = [];

    for (const linkage of linkages) {
      const document = await ctx.db.get(linkage.documentId);
      results.push({ linkage, document });
    }

    return results;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listForLot
//
// Returns all documents linked to a specific lot, enriched with the actual
// document record from the documents table. Uses the by_lot index.
//
// Same return shape as listForPart.
// ─────────────────────────────────────────────────────────────────────────────

export const listForLot = query({
  args: {
    lotId: v.id("lots"),
  },
  handler: async (ctx, args) => {
    const linkages = await ctx.db
      .query("partDocuments")
      .withIndex("by_lot", (q) => q.eq("lotId", args.lotId))
      .collect();

    const results: Array<{
      linkage: typeof linkages[number];
      document: Awaited<ReturnType<typeof ctx.db.get>> | null;
    }> = [];

    for (const linkage of linkages) {
      const document = await ctx.db.get(linkage.documentId);
      results.push({ linkage, document });
    }

    return results;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getConformityStatus
//
// Summarizes the conformity documentation status for a part or lot.
// Queries all linked documents and checks which conformity document roles
// are present. Used by the UI to show green/amber/red conformity indicators
// and by RTS readiness checks to verify traceability requirements.
//
// At least one of partId or lotId must be provided.
// ─────────────────────────────────────────────────────────────────────────────

export const getConformityStatus = query({
  args: {
    partId: v.optional(v.id("parts")),
    lotId: v.optional(v.id("lots")),
  },
  handler: async (ctx, args) => {
    if (args.partId === undefined && args.lotId === undefined) {
      throw new Error(
        "CONFORMITY_STATUS_INVALID: At least one of partId or lotId must be provided.",
      );
    }

    // Collect all linkage records for the given part and/or lot
    const allLinkages: Array<{
      documentRole: string;
    }> = [];

    if (args.partId !== undefined) {
      const partLinkages = await ctx.db
        .query("partDocuments")
        .withIndex("by_part", (q) => q.eq("partId", args.partId))
        .collect();
      for (const link of partLinkages) {
        allLinkages.push(link);
      }
    }

    if (args.lotId !== undefined) {
      const lotLinkages = await ctx.db
        .query("partDocuments")
        .withIndex("by_lot", (q) => q.eq("lotId", args.lotId))
        .collect();
      for (const link of lotLinkages) {
        // Avoid duplicates if both partId and lotId were provided and a
        // linkage record references both
        const isDuplicate = allLinkages.some(
          (existing) =>
            "_id" in existing &&
            "_id" in link &&
            (existing as Record<string, unknown>)["_id"] ===
              (link as Record<string, unknown>)["_id"],
        );
        if (!isDuplicate) {
          allLinkages.push(link);
        }
      }
    }

    // Build the role set for O(1) lookups
    const roles = new Set(allLinkages.map((l) => l.documentRole));

    return {
      hasCertificateOfConformity: roles.has("certificate_of_conformity"),
      hasCertificateOfAirworthiness: roles.has("certificate_of_airworthiness"),
      has8130Tag: roles.has("8130_3_tag"),
      hasTestReport: roles.has("test_report"),
      hasReceivingInspectionReport: roles.has("receiving_inspection_report"),
      hasMaterialCertification: roles.has("material_certification"),
      totalDocuments: allLinkages.length,
    };
  },
});
