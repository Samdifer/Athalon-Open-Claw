// convex/documentIntelligence.ts
// Athelon — Document Intelligence OCR Action
//
// Uses OpenAI GPT-4o Vision API to extract structured part data from
// uploaded conformity documents, certificates, and photos.

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import OpenAI from "openai";

// ─── RBAC ─────────────────────────────────────────────────────────────────────

type ExtractionRole = "admin" | "shop_manager" | "lead_technician" | "parts_clerk";

const EXTRACTION_ROLES: ExtractionRole[] = [
  "admin",
  "shop_manager",
  "lead_technician",
  "parts_clerk",
];

// ─── Document Role Validator ──────────────────────────────────────────────────

const documentRoleValidator = v.union(
  v.literal("certificate_of_conformity"),
  v.literal("8130_3_tag"),
  v.literal("vendor_invoice"),
  v.literal("packing_slip"),
  v.literal("material_certification"),
  v.literal("spec_sheet"),
  v.literal("photo"),
  v.literal("other"),
);

// ─── Prompt Templates ─────────────────────────────────────────────────────────

const BASE_SCHEMA = `{
  "partNumber": "string or null",
  "partName": "string or null",
  "description": "string or null",
  "serialNumber": "string or null",
  "partCategory": "consumable|standard|rotable|expendable|repairable or null",
  "condition": "new|serviceable|overhauled|repaired or null",
  "supplier": "string or null",
  "purchaseOrderNumber": "string or null",
  "isLifeLimited": "boolean or null",
  "lifeLimitHours": "number or null",
  "lifeLimitCycles": "number or null",
  "hoursAccumulatedBeforeInstall": "number or null",
  "cyclesAccumulatedBeforeInstall": "number or null",
  "hasShelfLifeLimit": "boolean or null",
  "shelfLifeLimitDate": "ISO date string or null",
  "unitCost": "number or null",
  "lotNumber": "string or null",
  "batchNumber": "string or null",
  "quantityOnHand": "number or null",
  "eightOneThirty": {
    "formTrackingNumber": "string or null",
    "approvalCertificateNumber": "string or null",
    "approvingAuthority": "string or null",
    "applicantName": "string or null",
    "organizationName": "string or null",
    "workOrderReference": "string or null",
    "itemNumber": "string or null",
    "partDescription": "string or null",
    "partNumber": "string or null",
    "partEligibility": "string or null",
    "quantity": "number or null",
    "serialBatchNumber": "string or null",
    "statusWork": "new|overhauled|repaired|inspected|modified or null",
    "remarks": "string or null",
    "certifyingStatement": "string or null",
    "authorizedSignatoryName": "string or null",
    "signatureDate": "ISO date string or null",
    "approvalNumber": "string or null"
  },
  "fieldConfidences": {
    "<fieldName>": { "value": "<extracted value>", "confidence": "high|medium|low", "sourceText": "<raw text from document>" }
  },
  "documentTypeDetected": "string describing what type of document this is"
}`;

function buildPrompt(documentRole: string): string {
  const base = `You are an aviation parts data extraction specialist for an FAA Part 145 repair station.
Extract ALL available part and component data from this document.
Return ONLY valid JSON matching this exact schema (omit fields with null values):

${BASE_SCHEMA}

IMPORTANT RULES:
- For each extracted field, include a corresponding entry in "fieldConfidences" with the raw source text and your confidence level.
- "high" confidence: clearly readable, unambiguous value.
- "medium" confidence: somewhat readable or requires interpretation.
- "low" confidence: partially illegible, inferred, or uncertain.
- If a field is not present or completely illegible, omit it entirely rather than guessing.
- Part numbers and serial numbers should be extracted EXACTLY as printed (preserve dashes, slashes, spaces).
- Dates should be in ISO 8601 format (YYYY-MM-DD).
- Costs/prices should be numbers without currency symbols.
- Do NOT wrap the JSON in markdown code fences.`;

  const roleSpecific: Record<string, string> = {
    "8130_3_tag": `\n\nThis is an FAA Form 8130-3 (Authorized Release Certificate / Airworthiness Approval Tag).
Extract ALL block fields:
- Block 1: Approving Civil Aviation Authority / Country
- Block 2: Authorized Release Certificate / Airworthiness Approval Tag
- Block 3: Form Tracking Number
- Block 4: Organization Name & Address
- Block 5: Work Order / Contract / Invoice Number
- Block 6: Item (line number)
- Block 7: Description (part description)
- Block 8: Part Number
- Block 9: Eligibility / Quantity
- Block 10: Serial Number / Lot-Batch Number
- Block 11: Status / Work (new, overhauled, repaired, inspected, modified)
- Block 12: Remarks (life limits, accumulated hours/cycles, shelf life, etc.)
- Block 13: Certifying Statement + Authorized Signatory + Date + Approval/Certificate Number
Pay special attention to Block 12 for life limit data (TSN, TSO, CSN, CSO hours/cycles).`,

    certificate_of_conformity: `\n\nThis is a Certificate of Conformity (CoC) or Certificate of Conformance.
Extract: manufacturer/supplier name, part number, part description, quantity, batch/lot number, serial numbers, customer PO number, issue date, authorized signatory, and any specification references (AMS, MIL-SPEC, etc.).`,

    vendor_invoice: `\n\nThis is a vendor invoice.
Extract: vendor/supplier name, invoice number, PO number, all line items with part numbers, descriptions, quantities, and unit prices. Map the primary/first line item to the top-level fields.`,

    packing_slip: `\n\nThis is a packing slip or shipping document.
Extract: shipper/vendor name, recipient, packing slip number, PO number, all part numbers, descriptions, quantities, and any serial/lot numbers listed.`,

    material_certification: `\n\nThis is a Material Certification or Mill Test Report.
Extract: material specification (e.g., AMS 4928, MIL-S-5000), heat/lot number, quantities, chemical composition if listed, mechanical properties if listed, certifying laboratory, and test date.`,

    spec_sheet: `\n\nThis is a specification sheet or technical data sheet.
Extract: part number, part name/description, manufacturer, key specifications, material callouts, and any regulatory references.`,

    photo: `\n\nThis is a photo of a physical part, label, or nameplate.
Extract any visible text: part numbers, serial numbers, manufacturer names, date codes, lot/batch numbers, specification markings, and any other identifying information stamped, engraved, or labeled on the part.`,
  };

  return base + (roleSpecific[documentRole] ?? "\n\nExtract all available aviation parts data from this document.");
}

// ─── Main Extraction Action ───────────────────────────────────────────────────

export const extractDocuments = action({
  args: {
    organizationId: v.id("organizations"),
    documents: v.array(
      v.object({
        storageId: v.id("_storage"),
        fileName: v.string(),
        mimeType: v.string(),
        documentRole: documentRoleValidator,
        documentId: v.optional(v.id("documents")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED: This operation requires a valid Clerk session.");
    }
    const userId = identity.subject;

    // RBAC check
    const technician = await ctx.runQuery(internal.documentIntelligence_helpers.getTechnicianForUser, {
      userId,
      organizationId: args.organizationId,
    });
    if (!technician) {
      throw new Error("ACCESS_DENIED: technician profile required for this organization.");
    }
    if (!EXTRACTION_ROLES.includes(technician.role as ExtractionRole)) {
      throw new Error(
        `ACCESS_DENIED: requires one of roles [${EXTRACTION_ROLES.join(", ")}].`,
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured. Set it via `convex env set OPENAI_API_KEY <key>`.");
    }

    const openai = new OpenAI({ apiKey });

    const results: Array<{
      documentIndex: number;
      storageId: string;
      fileName: string;
      status: "success" | "partial" | "failed";
      error?: string;
      pagesProcessed: number;
      documentTypeDetected: string;
      extractedData: Record<string, unknown>;
      fieldConfidences: Record<string, unknown>;
    }> = [];

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < args.documents.length; i++) {
      const doc = args.documents[i];

      // Create audit job record
      const jobId = await ctx.runMutation(internal.documentExtractionJobs.createExtractionJob, {
        organizationId: args.organizationId,
        documentId: doc.documentId,
        storageId: doc.storageId,
        triggeredByUserId: userId,
      });

      try {
        // Fetch file bytes from Convex storage
        const fileUrl = await ctx.storage.getUrl(doc.storageId);
        if (!fileUrl) {
          throw new Error(`Storage file not found for storageId ${doc.storageId}`);
        }

        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        const fileBytes = await response.arrayBuffer();
        const base64Data = Buffer.from(fileBytes).toString("base64");

        // Build the GPT-4o Vision message
        const prompt = buildPrompt(doc.documentRole);
        const isPdf = doc.mimeType === "application/pdf";

        const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

        if (isPdf) {
          // GPT-4o supports PDF via file input — use the URL directly
          contentParts.push({
            type: "image_url",
            image_url: {
              url: fileUrl,
              detail: "high",
            },
          });
        } else {
          // Image — send as base64 data URL
          const dataUrl = `data:${doc.mimeType};base64,${base64Data}`;
          contentParts.push({
            type: "image_url",
            image_url: {
              url: dataUrl,
              detail: "high",
            },
          });
        }

        contentParts.push({
          type: "text",
          text: prompt,
        });

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: contentParts,
            },
          ],
          response_format: { type: "json_object" },
        });

        // Extract JSON from response
        const responseText = completion.choices[0]?.message?.content ?? "";

        // Parse JSON — handle potential markdown fencing
        let jsonStr = responseText.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }

        const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

        const extractedData: Record<string, unknown> = {};
        const fieldConfidences: Record<string, unknown> = {};

        // Separate extracted data from confidences
        for (const [key, value] of Object.entries(parsed)) {
          if (key === "fieldConfidences") {
            Object.assign(fieldConfidences, value as Record<string, unknown>);
          } else if (key === "documentTypeDetected") {
            // handled separately
          } else {
            extractedData[key] = value;
          }
        }

        const documentTypeDetected = (parsed.documentTypeDetected as string) ?? doc.documentRole;
        const pagesProcessed = 1;

        results.push({
          documentIndex: i,
          storageId: doc.storageId as string,
          fileName: doc.fileName,
          status: Object.keys(extractedData).length > 0 ? "success" : "partial",
          pagesProcessed,
          documentTypeDetected,
          extractedData,
          fieldConfidences,
        });

        successCount++;

        await ctx.runMutation(internal.documentExtractionJobs.updateExtractionJob, {
          jobId,
          status: "completed",
          extractedDataJson: JSON.stringify({ extractedData, fieldConfidences }),
          pagesProcessed,
          documentTypeDetected,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown extraction error";
        failCount++;

        results.push({
          documentIndex: i,
          storageId: doc.storageId as string,
          fileName: doc.fileName,
          status: "failed",
          error: errorMessage,
          pagesProcessed: 0,
          documentTypeDetected: "unknown",
          extractedData: {},
          fieldConfidences: {},
        });

        await ctx.runMutation(internal.documentExtractionJobs.updateExtractionJob, {
          jobId,
          status: "failed",
          errorMessage,
        });
      }
    }

    return {
      results,
      totalProcessed: args.documents.length,
      successCount,
      failCount,
    };
  },
});
