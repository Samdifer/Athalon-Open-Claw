/**
 * lib/pdf/download.ts — Client-side PDF generation + download trigger.
 */
import { pdf } from "@react-pdf/renderer";

export async function downloadPDF(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document: any,
  filename: string,
): Promise<void> {
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
