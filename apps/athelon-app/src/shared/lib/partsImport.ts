/**
 * partsImport.ts
 *
 * Pure TypeScript utility module for the Parts Bulk Upload wizard.
 * No React, no Convex imports — safe for use in workers and tests.
 *
 * Handles: CSV/XLSX parsing, auto column mapping, client-side validation
 * (mirroring the server-side guards in convex/parts.ts receivePart), and
 * XLSX template generation.
 */

import * as XLSX from "xlsx";

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface MappedPartRow {
  // Required
  partNumber: string;
  partName: string;
  condition: string;
  isSerialized: boolean;
  isOwnerSupplied: boolean;
  isLifeLimited: boolean;
  hasShelfLifeLimit: boolean;
  receivingDate: number; // epoch ms

  // Optional
  description?: string;
  partCategory?: string;
  serialNumber?: string;
  supplier?: string;
  purchaseOrderNumber?: string;
  lifeLimitHours?: number;
  lifeLimitCycles?: number;
  hoursAccumulatedBeforeInstall?: number;
  cyclesAccumulatedBeforeInstall?: number;
  shelfLifeLimitDate?: number; // epoch ms
  unitCost?: number;
  minStockLevel?: number;
  reorderPoint?: number;
  quantityOnHand?: number;
  lotNumber?: string;
  batchNumber?: string;
  warehouseZone?: string;
  aisle?: string;
  shelf?: string;
  binNumber?: string;
  binLocation?: string;
  typicalLeadTimeDays?: number;
  notes?: string;
}

export type RowStatus = "valid" | "warning" | "error";

export interface RowValidationResult {
  rowIndex: number;
  status: RowStatus;
  errors: ValidationIssue[]; // blocking issues
  warnings: ValidationIssue[]; // non-blocking issues (go to queue)
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export type ColumnMapping = Record<string, string>; // csvHeader → fieldName

export interface DuplicateResolution {
  action: "skip" | "update_quantity" | "keep_separate";
  quantityDelta?: number;
  existingPartId?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const VALID_CONDITIONS = [
  "new",
  "serviceable",
  "overhauled",
  "repaired",
  "unserviceable",
  "quarantine",
  "scrapped",
] as const;

export const VALID_CATEGORIES = [
  "consumable",
  "standard",
  "rotable",
  "expendable",
  "repairable",
] as const;

export const VALID_LOCATIONS = [
  "pending_inspection",
  "inventory",
  "installed",
  "removed_pending_disposition",
  "quarantine",
  "scrapped",
  "returned_to_vendor",
] as const;

// ─── Field Definitions ───────────────────────────────────────────────────────

export const PART_FIELDS = [
  { key: "partNumber", label: "Part Number", required: true, group: "required" },
  { key: "partName", label: "Part Name", required: true, group: "required" },
  { key: "condition", label: "Condition", required: true, group: "required" },
  { key: "description", label: "Description", required: false, group: "required" },
  { key: "partCategory", label: "Part Category", required: false, group: "classification", important: true },
  { key: "isSerialized", label: "Is Serialized", required: false, group: "classification" },
  { key: "serialNumber", label: "Serial Number", required: false, group: "classification" },
  { key: "isOwnerSupplied", label: "Is Owner Supplied", required: false, group: "classification" },
  { key: "isLifeLimited", label: "Is Life Limited", required: false, group: "lifeLimits" },
  { key: "lifeLimitHours", label: "Life Limit Hours", required: false, group: "lifeLimits" },
  { key: "lifeLimitCycles", label: "Life Limit Cycles", required: false, group: "lifeLimits" },
  { key: "hoursAccumulatedBeforeInstall", label: "Hours Accumulated (TSN)", required: false, group: "lifeLimits" },
  { key: "cyclesAccumulatedBeforeInstall", label: "Cycles Accumulated", required: false, group: "lifeLimits" },
  { key: "hasShelfLifeLimit", label: "Has Shelf Life", required: false, group: "lifeLimits" },
  { key: "shelfLifeLimitDate", label: "Shelf Life Expiry", required: false, group: "lifeLimits" },
  { key: "supplier", label: "Supplier", required: false, group: "sourcing", important: true },
  { key: "purchaseOrderNumber", label: "PO Number", required: false, group: "sourcing" },
  { key: "receivingDate", label: "Receiving Date", required: false, group: "sourcing" },
  { key: "unitCost", label: "Unit Cost ($)", required: false, group: "costing" },
  { key: "minStockLevel", label: "Min Stock Level", required: false, group: "costing" },
  { key: "reorderPoint", label: "Reorder Point", required: false, group: "costing" },
  { key: "quantityOnHand", label: "Qty On Hand", required: false, group: "costing" },
  { key: "lotNumber", label: "Lot Number", required: false, group: "lotBatch" },
  { key: "batchNumber", label: "Batch Number", required: false, group: "lotBatch" },
  { key: "warehouseZone", label: "Warehouse Zone", required: false, group: "location" },
  { key: "aisle", label: "Aisle", required: false, group: "location" },
  { key: "shelf", label: "Shelf", required: false, group: "location" },
  { key: "binNumber", label: "Bin Number", required: false, group: "location" },
  { key: "binLocation", label: "Bin Location", required: false, group: "location" },
  { key: "typicalLeadTimeDays", label: "Lead Time (Days)", required: false, group: "costing" },
  { key: "notes", label: "Notes", required: false, group: "notes" },
] as const;

// ─── Column Alias Map ─────────────────────────────────────────────────────────

/** Common CSV header aliases → canonical PART_FIELDS key */
const COLUMN_ALIASES: Record<string, string> = {
  "p/n": "partNumber",
  "part #": "partNumber",
  "part#": "partNumber",
  "pn": "partNumber",
  "part no": "partNumber",
  "part no.": "partNumber",
  "partno": "partNumber",
  "s/n": "serialNumber",
  "serial": "serialNumber",
  "serial #": "serialNumber",
  "serial#": "serialNumber",
  "sn": "serialNumber",
  "desc": "description",
  "descr": "description",
  "details": "description",
  "qty": "quantityOnHand",
  "quantity": "quantityOnHand",
  "qty on hand": "quantityOnHand",
  "on hand": "quantityOnHand",
  "cost": "unitCost",
  "unit cost": "unitCost",
  "price": "unitCost",
  "unit price": "unitCost",
  "po": "purchaseOrderNumber",
  "po number": "purchaseOrderNumber",
  "po #": "purchaseOrderNumber",
  "po#": "purchaseOrderNumber",
  "purchase order": "purchaseOrderNumber",
  "vendor": "supplier",
  "mfg": "supplier",
  "manufacturer": "supplier",
  "date received": "receivingDate",
  "receive date": "receivingDate",
  "receipt date": "receivingDate",
  "shelf life": "shelfLifeLimitDate",
  "shelf life expiry": "shelfLifeLimitDate",
  "expiry date": "shelfLifeLimitDate",
  "expiry": "shelfLifeLimitDate",
  "expiration": "shelfLifeLimitDate",
  "expiration date": "shelfLifeLimitDate",
  "life limit (hrs)": "lifeLimitHours",
  "life limit hrs": "lifeLimitHours",
  "llp hours": "lifeLimitHours",
  "llp hrs": "lifeLimitHours",
  "life limit (cyc)": "lifeLimitCycles",
  "life limit cycles": "lifeLimitCycles",
  "llp cycles": "lifeLimitCycles",
  "tsn": "hoursAccumulatedBeforeInstall",
  "hours tsn": "hoursAccumulatedBeforeInstall",
  "hours accumulated": "hoursAccumulatedBeforeInstall",
  "cycles accumulated": "cyclesAccumulatedBeforeInstall",
  "csn": "cyclesAccumulatedBeforeInstall",
  "lead time": "typicalLeadTimeDays",
  "lead time (days)": "typicalLeadTimeDays",
  "lead time days": "typicalLeadTimeDays",
  "bin": "binNumber",
  "bin #": "binNumber",
  "bin#": "binNumber",
  "bin loc": "binLocation",
  "location": "binLocation",
  "zone": "warehouseZone",
  "warehouse": "warehouseZone",
  "lot": "lotNumber",
  "lot #": "lotNumber",
  "lot#": "lotNumber",
  "batch": "batchNumber",
  "batch #": "batchNumber",
  "batch#": "batchNumber",
  "serialized": "isSerialized",
  "is serial": "isSerialized",
  "life limited": "isLifeLimited",
  "llp": "isLifeLimited",
  "owner supplied": "isOwnerSupplied",
  "customer supplied": "isOwnerSupplied",
  "has shelf life": "hasShelfLifeLimit",
  "shelf life limit": "hasShelfLifeLimit",
  "category": "partCategory",
  "part type": "partCategory",
  "type": "partCategory",
  "min stock": "minStockLevel",
  "minimum stock": "minStockLevel",
  "reorder": "reorderPoint",
  "reorder qty": "reorderPoint",
  "reorder quantity": "reorderPoint",
  "name": "partName",
  "part name": "partName",
  "comment": "notes",
  "comments": "notes",
  "remarks": "notes",
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

function toNumber(val: string | undefined): number | undefined {
  if (val === undefined || val === null || val.trim() === "") return undefined;
  const n = Number(val.trim());
  return Number.isFinite(n) ? n : undefined;
}

function toBoolean(val: string | undefined): boolean {
  if (val === undefined || val === null) return false;
  const normalized = val.trim().toUpperCase();
  return normalized === "TRUE" || normalized === "YES" || normalized === "1";
}

/**
 * Parse a date string (YYYY-MM-DD or MM/DD/YYYY) to epoch milliseconds.
 * Returns undefined for empty or unparseable values.
 */
function parseDate(val: string | undefined): number | undefined {
  if (val === undefined || val === null || val.trim() === "") return undefined;
  const s = val.trim();

  // YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (isoMatch) {
    const d = new Date(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10) - 1,
      parseInt(isoMatch[3], 10),
    );
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // MM/DD/YYYY
  const mdyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (mdyMatch) {
    const d = new Date(
      parseInt(mdyMatch[3], 10),
      parseInt(mdyMatch[1], 10) - 1,
      parseInt(mdyMatch[2], 10),
    );
    if (!isNaN(d.getTime())) return d.getTime();
  }

  return undefined;
}

function trimUpper(val: string): string {
  return val.trim().toUpperCase();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into headers and data rows.
 * Handles quoted fields, escaped double-quotes, and CRLF/LF line endings.
 * Empty rows are filtered out.
 */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim());
      cell = "";

      const hasContent = row.some((c) => c.trim().length > 0);
      if (hasContent) rows.push(row.map((c) => c.replace(/^"|"$/g, "")));
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    const hasContent = row.some((c) => c.trim().length > 0);
    if (hasContent) rows.push(row.map((c) => c.replace(/^"|"$/g, "")));
  }

  if (rows.length === 0) return { headers: [], rows: [] };
  const [headers, ...dataRows] = rows;
  return { headers, rows: dataRows };
}

/**
 * Parse an XLSX/XLS/ODS ArrayBuffer into headers and data rows.
 * Reads the first sheet; filters completely empty rows.
 */
export function parseXlsx(buffer: ArrayBuffer): { headers: string[]; rows: string[][] } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (raw.length === 0) return { headers: [], rows: [] };

  // Normalize every cell to string
  const normalized = raw.map((row) =>
    row.map((cell) => (cell === undefined || cell === null ? "" : String(cell))),
  );

  // Filter out completely empty rows (all cells blank)
  const nonEmpty = normalized.filter((row) => row.some((c) => c.trim().length > 0));

  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const [headerRow, ...dataRows] = nonEmpty;
  return { headers: headerRow, rows: dataRows };
}

/**
 * Attempt to automatically map CSV headers to PART_FIELDS keys.
 * Uses case-insensitive exact match against field key and label,
 * then falls back to the alias table.
 *
 * Returns a Record of csvHeader → fieldKey.
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  // Build a lookup: normalized label/key → field key
  const labelLookup = new Map<string, string>();
  for (const field of PART_FIELDS) {
    labelLookup.set(field.key.toLowerCase(), field.key);
    labelLookup.set(field.label.toLowerCase(), field.key);
  }

  for (const header of headers) {
    const normalized = header.trim().toLowerCase();

    // 1. Direct key/label match
    const directMatch = labelLookup.get(normalized);
    if (directMatch) {
      mapping[header] = directMatch;
      continue;
    }

    // 2. Alias match
    const aliasMatch = COLUMN_ALIASES[normalized];
    if (aliasMatch) {
      mapping[header] = aliasMatch;
    }
  }

  return mapping;
}

/**
 * Apply the column mapping to a single raw CSV row and produce a typed MappedPartRow.
 *
 * - Booleans: "TRUE"/"YES"/"1" → true; everything else → false
 * - Numbers: empty/NaN → undefined
 * - Dates: "YYYY-MM-DD" or "MM/DD/YYYY" → epoch ms
 * - partNumber is trimmed and uppercased
 * - receivingDate defaults to Date.now() if absent
 * - isSerialized defaults to !!serialNumber if not explicitly set
 * - isOwnerSupplied, isLifeLimited, hasShelfLifeLimit default to false
 * - condition defaults to "new" if absent
 */
export function mapRowToPartArgs(
  cells: string[],
  headers: string[],
  mapping: ColumnMapping,
): MappedPartRow {
  /** Get the raw cell value for a given field key via the mapping. */
  function cell(fieldKey: string): string | undefined {
    // mapping is csvHeader → fieldKey; we need to reverse: fieldKey → csvHeader
    const header = Object.entries(mapping).find(([, v]) => v === fieldKey)?.[0];
    if (!header) return undefined;
    const idx = headers.indexOf(header);
    if (idx < 0) return undefined;
    return cells[idx];
  }

  const rawPartNumber = cell("partNumber") ?? "";
  const rawSerialNumber = cell("serialNumber");
  const rawIsSerialized = cell("isSerialized");
  const rawCondition = cell("condition");

  const serialNumber = rawSerialNumber?.trim() || undefined;

  // isSerialized: explicit value takes priority; otherwise infer from serialNumber presence
  const isSerializedExplicit =
    rawIsSerialized !== undefined && rawIsSerialized.trim() !== ""
      ? toBoolean(rawIsSerialized)
      : undefined;
  const isSerialized = isSerializedExplicit !== undefined ? isSerializedExplicit : !!serialNumber;

  const row: MappedPartRow = {
    partNumber: trimUpper(rawPartNumber),
    partName: (cell("partName") ?? "").trim(),
    condition: rawCondition?.trim() || "new",
    isSerialized,
    isOwnerSupplied: toBoolean(cell("isOwnerSupplied")),
    isLifeLimited: toBoolean(cell("isLifeLimited")),
    hasShelfLifeLimit: toBoolean(cell("hasShelfLifeLimit")),
    receivingDate: parseDate(cell("receivingDate")) ?? Date.now(),
  };

  // Optional string fields
  const descriptionVal = cell("description")?.trim();
  if (descriptionVal) row.description = descriptionVal;

  const partCategoryVal = cell("partCategory")?.trim();
  if (partCategoryVal) row.partCategory = partCategoryVal;

  if (serialNumber) row.serialNumber = serialNumber;

  const supplierVal = cell("supplier")?.trim();
  if (supplierVal) row.supplier = supplierVal;

  const poVal = cell("purchaseOrderNumber")?.trim();
  if (poVal) row.purchaseOrderNumber = poVal;

  const lotVal = cell("lotNumber")?.trim();
  if (lotVal) row.lotNumber = lotVal;

  const batchVal = cell("batchNumber")?.trim();
  if (batchVal) row.batchNumber = batchVal;

  const warehouseZoneVal = cell("warehouseZone")?.trim();
  if (warehouseZoneVal) row.warehouseZone = warehouseZoneVal;

  const aisleVal = cell("aisle")?.trim();
  if (aisleVal) row.aisle = aisleVal;

  const shelfVal = cell("shelf")?.trim();
  if (shelfVal) row.shelf = shelfVal;

  const binNumberVal = cell("binNumber")?.trim();
  if (binNumberVal) row.binNumber = binNumberVal;

  const binLocationVal = cell("binLocation")?.trim();
  if (binLocationVal) row.binLocation = binLocationVal;

  const notesVal = cell("notes")?.trim();
  if (notesVal) row.notes = notesVal;

  // Optional numeric fields
  const lifeLimitHours = toNumber(cell("lifeLimitHours"));
  if (lifeLimitHours !== undefined) row.lifeLimitHours = lifeLimitHours;

  const lifeLimitCycles = toNumber(cell("lifeLimitCycles"));
  if (lifeLimitCycles !== undefined) row.lifeLimitCycles = lifeLimitCycles;

  const hoursAccum = toNumber(cell("hoursAccumulatedBeforeInstall"));
  if (hoursAccum !== undefined) row.hoursAccumulatedBeforeInstall = hoursAccum;

  const cyclesAccum = toNumber(cell("cyclesAccumulatedBeforeInstall"));
  if (cyclesAccum !== undefined) row.cyclesAccumulatedBeforeInstall = cyclesAccum;

  const unitCost = toNumber(cell("unitCost"));
  if (unitCost !== undefined) row.unitCost = unitCost;

  const minStockLevel = toNumber(cell("minStockLevel"));
  if (minStockLevel !== undefined) row.minStockLevel = minStockLevel;

  const reorderPoint = toNumber(cell("reorderPoint"));
  if (reorderPoint !== undefined) row.reorderPoint = reorderPoint;

  const quantityOnHand = toNumber(cell("quantityOnHand"));
  if (quantityOnHand !== undefined) row.quantityOnHand = quantityOnHand;

  const typicalLeadTimeDays = toNumber(cell("typicalLeadTimeDays"));
  if (typicalLeadTimeDays !== undefined) row.typicalLeadTimeDays = typicalLeadTimeDays;

  // Optional date field
  const shelfLifeLimitDate = parseDate(cell("shelfLifeLimitDate"));
  if (shelfLifeLimitDate !== undefined) row.shelfLifeLimitDate = shelfLifeLimitDate;

  return row;
}

/**
 * Validate a single mapped part row, mirroring the server-side guards
 * in convex/parts.ts `receivePart` (G1–G7, minus org-level checks).
 *
 * Returns a RowValidationResult with status "valid" | "warning" | "error".
 * Errors are blocking; warnings are non-blocking (row goes to review queue).
 */
export function validatePartRow(row: MappedPartRow, rowIndex: number): RowValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // ── ERROR: partNumber required ────────────────────────────────────────────
  if (!row.partNumber || row.partNumber.trim() === "") {
    errors.push({ field: "partNumber", message: "Part number is required." });
  }

  // ── ERROR: partName required ──────────────────────────────────────────────
  if (!row.partName || row.partName.trim() === "") {
    errors.push({ field: "partName", message: "Part name is required." });
  }

  // ── ERROR: condition must be a valid value ────────────────────────────────
  if (!row.condition || !(VALID_CONDITIONS as readonly string[]).includes(row.condition)) {
    errors.push({
      field: "condition",
      message: `Condition "${row.condition}" is not valid. Must be one of: ${VALID_CONDITIONS.join(", ")}.`,
    });
  }

  // ── ERROR (G6): Serialized parts must have a serial number ───────────────
  if (row.isSerialized && (!row.serialNumber || row.serialNumber.trim() === "")) {
    errors.push({
      field: "serialNumber",
      message: "Serialized part (isSerialized = true) requires a serial number.",
    });
  }

  // ── ERROR (G2): Life-limited part must declare its limit ─────────────────
  if (row.isLifeLimited && row.lifeLimitHours == null && row.lifeLimitCycles == null) {
    errors.push({
      field: "lifeLimitHours",
      message:
        "INV-11: Life-limited part requires at least one of lifeLimitHours or lifeLimitCycles.",
    });
  }

  // ── ERROR (G3): Shelf-life part must have a date ─────────────────────────
  if (row.hasShelfLifeLimit && row.shelfLifeLimitDate == null) {
    errors.push({
      field: "shelfLifeLimitDate",
      message: "INV-12: Part with shelf life requires a shelf life expiry date.",
    });
  }

  // ── ERROR (G4): Accumulated hours must be non-negative ───────────────────
  if (row.hoursAccumulatedBeforeInstall != null && row.hoursAccumulatedBeforeInstall < 0) {
    errors.push({
      field: "hoursAccumulatedBeforeInstall",
      message: "Hours accumulated before install must be >= 0.",
    });
  }

  // ── ERROR: partCategory must be a valid value if provided ────────────────
  if (row.partCategory && !(VALID_CATEGORIES as readonly string[]).includes(row.partCategory)) {
    errors.push({
      field: "partCategory",
      message: `Part category "${row.partCategory}" is not valid. Must be one of: ${VALID_CATEGORIES.join(", ")}.`,
    });
  }

  // ── WARNING: partCategory not provided (important optional field) ─────────
  if (!row.partCategory) {
    warnings.push({
      field: "partCategory",
      message: "Part category is recommended for proper inventory classification.",
    });
  }

  // ── WARNING: supplier not provided (important optional field) ─────────────
  if (!row.supplier) {
    warnings.push({
      field: "supplier",
      message: "Supplier is recommended for traceability.",
    });
  }

  // ── WARNING: serialized with no unit cost ─────────────────────────────────
  if (row.isSerialized && row.unitCost == null) {
    warnings.push({
      field: "unitCost",
      message: "Serialized parts typically have a unit cost for asset tracking.",
    });
  }

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const status: RowStatus = hasErrors ? "error" : hasWarnings ? "warning" : "valid";

  return { rowIndex, status, errors, warnings };
}

/**
 * Generate an XLSX workbook with the parts import template as a Blob.
 * Row 1 = column headers (PART_FIELDS labels), Row 2 = example data.
 */
export function generateDownloadTemplate(): Blob {
  const headers = PART_FIELDS.map((f) => f.label);

  const exampleRow = [
    /* Part Number             */ "CH48108-1",
    /* Part Name               */ "Spark Plug",
    /* Condition               */ "new",
    /* Description             */ "Massive electrode spark plug for TCM engines",
    /* Part Category           */ "consumable",
    /* Is Serialized           */ "FALSE",
    /* Serial Number           */ "",
    /* Is Owner Supplied       */ "FALSE",
    /* Is Life Limited         */ "FALSE",
    /* Life Limit Hours        */ "",
    /* Life Limit Cycles       */ "",
    /* Hours Accumulated (TSN) */ "",
    /* Cycles Accumulated      */ "",
    /* Has Shelf Life          */ "FALSE",
    /* Shelf Life Expiry       */ "",
    /* Supplier                */ "Champion Aerospace",
    /* PO Number               */ "PO-2024-001",
    /* Receiving Date          */ "2024-01-15",
    /* Unit Cost ($)           */ "18.50",
    /* Min Stock Level         */ "10",
    /* Reorder Point           */ "5",
    /* Qty On Hand             */ "24",
    /* Lot Number              */ "LOT-2024-Q1",
    /* Batch Number            */ "",
    /* Warehouse Zone          */ "A",
    /* Aisle                   */ "3",
    /* Shelf                   */ "B",
    /* Bin Number              */ "B-12",
    /* Bin Location            */ "A3-B-12",
    /* Lead Time (Days)        */ "7",
    /* Notes                   */ "Champion REM38E equivalent",
  ];

  const worksheetData = [headers, exampleRow];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for readability
  worksheet["!cols"] = headers.map(() => ({ wch: 22 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Parts Import");

  const xlsxBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([xlsxBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
