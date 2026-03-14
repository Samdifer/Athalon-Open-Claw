// src/shared/lib/documentIntelligence.ts
// Athelon — Document Intelligence Types & Utilities
//
// Pure TypeScript — no React or Convex imports.
// Shared between the Convex action and frontend review UI.

// ─── Extracted Data Shape ─────────────────────────────────────────────────────

export interface ExtractedEightOneThirtyData {
  formTrackingNumber?: string;
  approvalCertificateNumber?: string;
  approvingAuthority?: string;
  applicantName?: string;
  organizationName?: string;
  workOrderReference?: string;
  itemNumber?: string;
  partDescription?: string;
  partNumber?: string;
  partEligibility?: string;
  quantity?: number;
  serialBatchNumber?: string;
  statusWork?: "new" | "overhauled" | "repaired" | "inspected" | "modified";
  remarks?: string;
  certifyingStatement?: string;
  authorizedSignatoryName?: string;
  signatureDate?: string; // ISO date string from OCR — converted to epoch on commit
  approvalNumber?: string;
}

export interface ExtractedPartData {
  // Core identification
  partNumber?: string;
  partName?: string;
  description?: string;
  serialNumber?: string;

  // Classification
  partCategory?: "consumable" | "standard" | "rotable" | "expendable" | "repairable";
  condition?: "new" | "serviceable" | "overhauled" | "repaired";

  // Sourcing
  supplier?: string;
  purchaseOrderNumber?: string;

  // Life limits
  isLifeLimited?: boolean;
  lifeLimitHours?: number;
  lifeLimitCycles?: number;
  hoursAccumulatedBeforeInstall?: number;
  cyclesAccumulatedBeforeInstall?: number;

  // Shelf life
  hasShelfLifeLimit?: boolean;
  shelfLifeLimitDate?: string; // ISO date from OCR

  // Costing
  unitCost?: number;

  // Lot/batch
  lotNumber?: string;
  batchNumber?: string;
  quantityOnHand?: number;

  // 8130-3 data
  eightOneThirty?: ExtractedEightOneThirtyData;
}

// ─── Confidence ───────────────────────────────────────────────────────────────

export type ConfidenceLevel = "high" | "medium" | "low";

export interface FieldConfidence {
  value: string | number | boolean;
  confidence: ConfidenceLevel;
  sourceText?: string;
}

// ─── Extraction Result ────────────────────────────────────────────────────────

export interface ExtractionResult {
  documentIndex: number;
  storageId: string;
  fileName: string;
  status: "success" | "partial" | "failed";
  error?: string;
  pagesProcessed: number;
  documentTypeDetected: string;
  extractedData: ExtractedPartData;
  fieldConfidences: Partial<Record<string, FieldConfidence>>;
}

export interface DocumentExtractionBatchResult {
  results: ExtractionResult[];
  totalProcessed: number;
  successCount: number;
  failCount: number;
}

// ─── Document Roles ───────────────────────────────────────────────────────────

export const DOCUMENT_ROLES = [
  "certificate_of_conformity",
  "8130_3_tag",
  "vendor_invoice",
  "packing_slip",
  "material_certification",
  "spec_sheet",
  "photo",
  "other",
] as const;

export type DocumentRole = (typeof DOCUMENT_ROLES)[number];

export const DOCUMENT_ROLE_LABELS: Record<DocumentRole, string> = {
  certificate_of_conformity: "Certificate of Conformity",
  "8130_3_tag": "FAA Form 8130-3",
  vendor_invoice: "Vendor Invoice",
  packing_slip: "Packing Slip",
  material_certification: "Material Certification",
  spec_sheet: "Spec Sheet",
  photo: "Photo",
  other: "Other",
};

// ─── Field Diff Engine ────────────────────────────────────────────────────────

export interface FieldMeta {
  key: string;
  label: string;
  group: "core" | "classification" | "sourcing" | "life_limits" | "shelf_life" | "costing" | "lot_batch" | "8130";
}

export const EXTRACTABLE_FIELDS: FieldMeta[] = [
  { key: "partNumber", label: "Part Number", group: "core" },
  { key: "partName", label: "Part Name", group: "core" },
  { key: "description", label: "Description", group: "core" },
  { key: "serialNumber", label: "Serial Number", group: "core" },
  { key: "partCategory", label: "Part Category", group: "classification" },
  { key: "condition", label: "Condition", group: "classification" },
  { key: "supplier", label: "Supplier", group: "sourcing" },
  { key: "purchaseOrderNumber", label: "PO Number", group: "sourcing" },
  { key: "isLifeLimited", label: "Life Limited", group: "life_limits" },
  { key: "lifeLimitHours", label: "Life Limit (Hours)", group: "life_limits" },
  { key: "lifeLimitCycles", label: "Life Limit (Cycles)", group: "life_limits" },
  { key: "hoursAccumulatedBeforeInstall", label: "Hours Accumulated", group: "life_limits" },
  { key: "cyclesAccumulatedBeforeInstall", label: "Cycles Accumulated", group: "life_limits" },
  { key: "hasShelfLifeLimit", label: "Has Shelf Life", group: "shelf_life" },
  { key: "shelfLifeLimitDate", label: "Shelf Life Date", group: "shelf_life" },
  { key: "unitCost", label: "Unit Cost", group: "costing" },
  { key: "lotNumber", label: "Lot Number", group: "lot_batch" },
  { key: "batchNumber", label: "Batch Number", group: "lot_batch" },
  { key: "quantityOnHand", label: "Quantity", group: "lot_batch" },
];

export interface FieldDiff {
  fieldKey: string;
  fieldLabel: string;
  group: string;
  existingValue: string | number | boolean | null | undefined;
  extractedValue: string | number | boolean | null | undefined;
  confidence: ConfidenceLevel;
  autoApply: boolean;
  requiresApproval: boolean;
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "" || value === 0;
}

export function computeFieldDiff(
  existing: Record<string, unknown>,
  extracted: ExtractedPartData,
  confidences: Partial<Record<string, FieldConfidence>>,
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  for (const field of EXTRACTABLE_FIELDS) {
    const extractedValue = (extracted as Record<string, unknown>)[field.key];
    if (extractedValue === undefined || extractedValue === null) continue;

    const existingValue = existing[field.key] as string | number | boolean | null | undefined;
    const confidence = confidences[field.key]?.confidence ?? "medium";
    const existingIsEmpty = isEmpty(existingValue);
    const valuesMatch = String(existingValue) === String(extractedValue);

    if (valuesMatch) continue;

    diffs.push({
      fieldKey: field.key,
      fieldLabel: field.label,
      group: field.group,
      existingValue,
      extractedValue: extractedValue as string | number | boolean,
      confidence,
      autoApply: existingIsEmpty,
      requiresApproval: !existingIsEmpty,
    });
  }

  return diffs;
}

export function mergeExtractedIntoExisting(
  extracted: ExtractedPartData,
  approvedFieldKeys: string[],
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const approvedSet = new Set(approvedFieldKeys);

  for (const field of EXTRACTABLE_FIELDS) {
    if (!approvedSet.has(field.key)) continue;
    const value = (extracted as Record<string, unknown>)[field.key];
    if (value !== undefined && value !== null) {
      patch[field.key] = value;
    }
  }

  return patch;
}

export function extractedToReceivePartArgs(extracted: ExtractedPartData): Record<string, unknown> {
  const args: Record<string, unknown> = {};

  if (extracted.partNumber) args.partNumber = extracted.partNumber;
  if (extracted.partName) args.partName = extracted.partName;
  if (extracted.description) args.description = extracted.description;
  if (extracted.serialNumber) args.serialNumber = extracted.serialNumber;
  if (extracted.condition) args.condition = extracted.condition;
  if (extracted.supplier) args.supplier = extracted.supplier;
  if (extracted.purchaseOrderNumber) args.purchaseOrderNumber = extracted.purchaseOrderNumber;
  if (extracted.unitCost !== undefined) args.unitCost = extracted.unitCost;
  if (extracted.lotNumber) args.lotNumber = extracted.lotNumber;
  if (extracted.batchNumber) args.batchNumber = extracted.batchNumber;
  if (extracted.quantityOnHand !== undefined) args.quantityOnHand = extracted.quantityOnHand;

  // Boolean fields default to false if not extracted
  args.isSerialized = !!extracted.serialNumber;
  args.isOwnerSupplied = false;
  args.isLifeLimited = extracted.isLifeLimited ?? false;
  args.hasShelfLifeLimit = extracted.hasShelfLifeLimit ?? false;

  if (extracted.isLifeLimited) {
    if (extracted.lifeLimitHours !== undefined) args.lifeLimitHours = extracted.lifeLimitHours;
    if (extracted.lifeLimitCycles !== undefined) args.lifeLimitCycles = extracted.lifeLimitCycles;
    if (extracted.hoursAccumulatedBeforeInstall !== undefined)
      args.hoursAccumulatedBeforeInstall = extracted.hoursAccumulatedBeforeInstall;
    if (extracted.cyclesAccumulatedBeforeInstall !== undefined)
      args.cyclesAccumulatedBeforeInstall = extracted.cyclesAccumulatedBeforeInstall;
  }

  if (extracted.hasShelfLifeLimit && extracted.shelfLifeLimitDate) {
    const parsed = Date.parse(extracted.shelfLifeLimitDate);
    if (!isNaN(parsed)) args.shelfLifeLimitDate = parsed;
  }

  // 8130-3 data
  if (extracted.eightOneThirty) {
    const e = extracted.eightOneThirty;
    if (e.partNumber && e.certifyingStatement && e.authorizedSignatoryName && e.approvalNumber) {
      let signatureDate = Date.now();
      if (e.signatureDate) {
        const parsed = Date.parse(e.signatureDate);
        if (!isNaN(parsed)) signatureDate = parsed;
      }

      args.eightOneThirtyData = {
        approvingAuthority: e.approvingAuthority ?? "FAA",
        applicantName: e.applicantName ?? "",
        formTrackingNumber: e.formTrackingNumber ?? "",
        organizationName: e.organizationName,
        workOrderReference: e.workOrderReference,
        itemNumber: e.itemNumber,
        partDescription: e.partDescription ?? extracted.partName ?? "",
        partNumber: e.partNumber,
        partEligibility: e.partEligibility,
        quantity: e.quantity ?? 1,
        serialBatchNumber: e.serialBatchNumber,
        isLifeLimited: extracted.isLifeLimited ?? false,
        statusWork: e.statusWork ?? "new",
        remarks: e.remarks,
        certifyingStatement: e.certifyingStatement,
        authorizedSignatoryName: e.authorizedSignatoryName,
        signatureDate,
        approvalNumber: e.approvalNumber,
      };
    }
  }

  return args;
}
