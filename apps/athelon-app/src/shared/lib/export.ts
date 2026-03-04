/**
 * CSV Export Utility
 * Converts an array of objects to CSV and triggers a browser download.
 */

function escapeCSV(value: unknown): string {
  if (value == null) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  // If the value contains commas, quotes, or newlines, wrap in quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;

  // Collect all unique headers
  const headers = Array.from(new Set(data.flatMap((row) => Object.keys(row))));

  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map(escapeCSV).join(","));

  // Data rows
  for (const row of data) {
    csvRows.push(headers.map((h) => escapeCSV(row[h])).join(","));
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
