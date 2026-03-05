/**
 * CSV Export Utility (MBP-0061)
 *
 * Shared helpers for exporting entity lists to CSV with optional date filtering.
 * Reuses the robust ExportCSVButton component for UI; this module provides
 * column definitions and data mapping for each entity type.
 */

import type { ExportCSVButtonProps } from "@/src/shared/components/ExportCSVButton";

// ─── Column Definitions ────────────────────────────────────────────────────────

export type CSVColumn = { key: string; header: string };

export const INVOICE_CSV_COLUMNS: CSVColumn[] = [
  { key: "invoiceNumber", header: "Invoice #" },
  { key: "customer", header: "Customer" },
  { key: "status", header: "Status" },
  { key: "subtotal", header: "Subtotal" },
  { key: "tax", header: "Tax" },
  { key: "total", header: "Total" },
  { key: "amountPaid", header: "Amount Paid" },
  { key: "balance", header: "Balance" },
  { key: "dueDate", header: "Due Date" },
  { key: "createdAt", header: "Created" },
  { key: "sentAt", header: "Sent" },
  { key: "paidAt", header: "Paid" },
];

export const QUOTE_CSV_COLUMNS: CSVColumn[] = [
  { key: "quoteNumber", header: "Quote #" },
  { key: "customer", header: "Customer" },
  { key: "status", header: "Status" },
  { key: "laborTotal", header: "Labor Total" },
  { key: "partsTotal", header: "Parts Total" },
  { key: "subtotal", header: "Subtotal" },
  { key: "tax", header: "Tax" },
  { key: "total", header: "Total" },
  { key: "createdAt", header: "Created" },
  { key: "sentAt", header: "Sent" },
  { key: "expiresAt", header: "Expires" },
];

export const WORK_ORDER_CSV_COLUMNS: CSVColumn[] = [
  { key: "woNumber", header: "WO#" },
  { key: "aircraft", header: "Aircraft" },
  { key: "customer", header: "Customer" },
  { key: "status", header: "Status" },
  { key: "priority", header: "Priority" },
  { key: "created", header: "Created" },
  { key: "promiseDate", header: "Promise Date" },
];

export const FLEET_CSV_COLUMNS: CSVColumn[] = [
  { key: "registration", header: "Registration" },
  { key: "make", header: "Make" },
  { key: "model", header: "Model" },
  { key: "serialNumber", header: "Serial Number" },
  { key: "status", header: "Status" },
  { key: "totalTime", header: "Total Time" },
  { key: "nextScheduled", header: "Next Scheduled" },
];

export const PARTS_CSV_COLUMNS: CSVColumn[] = [
  { key: "partNumber", header: "Part Number" },
  { key: "description", header: "Description" },
  { key: "category", header: "Category" },
  { key: "quantityOnHand", header: "Qty on Hand" },
  { key: "reorderPoint", header: "Reorder Point" },
  { key: "unitCost", header: "Unit Cost" },
  { key: "location", header: "Location" },
  { key: "createdAt", header: "Created" },
];

// ─── Date Formatting Helpers ───────────────────────────────────────────────────

/** Format epoch ms to ISO string, or empty string if null/undefined */
export function epochToISO(epoch: number | undefined | null): string {
  if (epoch == null || !Number.isFinite(epoch)) return "";
  return new Date(epoch).toISOString();
}

/** Format epoch ms to YYYY-MM-DD in UTC */
export function epochToDateUTC(epoch: number | undefined | null): string {
  if (epoch == null || !Number.isFinite(epoch)) return "";
  return new Date(epoch).toISOString().split("T")[0];
}

// ─── Data Mappers ──────────────────────────────────────────────────────────────

/**
 * Map raw invoice records to CSV-friendly rows.
 */
export function mapInvoicesForCSV(
  invoices: Array<Record<string, any>>,
  customerMap: Map<string, string>,
): Record<string, any>[] {
  return invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber ?? "",
    customer: customerMap.get(inv.customerId as string) ?? "Unknown",
    status: inv.status,
    subtotal: inv.subtotal ?? 0,
    tax: inv.tax ?? 0,
    total: inv.total ?? 0,
    amountPaid: inv.amountPaid ?? 0,
    balance: inv.balance ?? inv.total ?? 0,
    dueDate: epochToDateUTC(inv.dueDate),
    createdAt: epochToISO(inv.createdAt ?? inv._creationTime),
    sentAt: epochToISO(inv.sentAt),
    paidAt: epochToISO(inv.paidAt),
  }));
}

/**
 * Map raw quote records to CSV-friendly rows.
 */
export function mapQuotesForCSV(
  quotes: Array<Record<string, any>>,
  customerMap: Map<string, string>,
): Record<string, any>[] {
  return quotes.map((q) => ({
    quoteNumber: q.quoteNumber ?? "",
    customer: customerMap.get(q.customerId as string) ?? "Unknown",
    status: q.status,
    laborTotal: q.laborTotal ?? 0,
    partsTotal: q.partsTotal ?? 0,
    subtotal: q.subtotal ?? 0,
    tax: q.tax ?? 0,
    total: q.total ?? 0,
    createdAt: epochToISO(q.createdAt ?? q._creationTime),
    sentAt: epochToISO(q.sentAt),
    expiresAt: epochToISO(q.expiresAt),
  }));
}
