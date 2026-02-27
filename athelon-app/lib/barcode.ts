/**
 * lib/barcode.ts — Barcode generation for part labels using JsBarcode.
 */
import JsBarcode from "jsbarcode";

/**
 * Generate a barcode SVG string for a given value (Code128).
 */
export function generateBarcodeSVG(value: string, options?: { width?: number; height?: number }): string {
  // Create a temporary SVG element in memory
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");

  JsBarcode(svg, value, {
    format: "CODE128",
    width: options?.width ?? 2,
    height: options?.height ?? 50,
    displayValue: true,
    fontSize: 14,
    margin: 10,
  });

  return svg.outerHTML;
}

/**
 * Open a printable barcode label in a new window.
 */
export function printBarcodeLabel(partNumber: string, partName: string, serialNumber?: string) {
  const barcodeSvg = generateBarcodeSVG(partNumber);

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Part Label — ${partNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
    .label { border: 2px solid #000; padding: 16px; display: inline-block; max-width: 400px; }
    .part-name { font-size: 14px; margin: 8px 0 4px; font-weight: bold; }
    .serial { font-size: 12px; color: #555; margin-bottom: 8px; }
    .barcode svg { max-width: 100%; }
    @media print { body { padding: 0; } .label { border: 1px solid #000; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="part-name">${partName}</div>
    ${serialNumber ? `<div class="serial">S/N: ${serialNumber}</div>` : ""}
    <div class="barcode">${barcodeSvg}</div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
