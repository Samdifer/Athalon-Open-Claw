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

/**
 * Print a lot-level label with barcode.
 */
export function printLotLabel(lot: {
  lotNumber: string;
  partNumber: string;
  partName: string;
  remainingQuantity: number;
  shelfLifeExpiryDate?: number;
}) {
  const barcodeSvg = generateBarcodeSVG(lot.lotNumber);
  const expiryLine = lot.shelfLifeExpiryDate
    ? `<div class="detail">Shelf Life: ${new Date(lot.shelfLifeExpiryDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Lot Label — ${lot.lotNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
    .label { border: 2px solid #000; padding: 16px; display: inline-block; max-width: 400px; }
    .lot-title { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .part-name { font-size: 14px; font-weight: bold; margin: 4px 0; }
    .detail { font-size: 12px; color: #333; margin: 2px 0; }
    .barcode svg { max-width: 100%; }
    @media print { body { padding: 0; } .label { border: 1px solid #000; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="lot-title">Lot Label</div>
    <div class="part-name">${lot.partName}</div>
    <div class="detail">P/N: ${lot.partNumber}</div>
    <div class="detail">Qty: ${lot.remainingQuantity}</div>
    ${expiryLine}
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

/**
 * Print a bin location label with barcode.
 */
export function printBinLabel(bin: {
  binLocation: string;
  warehouseZone?: string;
  aisle?: string;
  shelf?: string;
  binNumber?: string;
}) {
  const barcodeSvg = generateBarcodeSVG(bin.binLocation);

  const breakdownLines: Array<string> = [];
  if (bin.warehouseZone) breakdownLines.push(`Zone: ${bin.warehouseZone}`);
  if (bin.aisle) breakdownLines.push(`Aisle: ${bin.aisle}`);
  if (bin.shelf) breakdownLines.push(`Shelf: ${bin.shelf}`);
  if (bin.binNumber) breakdownLines.push(`Bin: ${bin.binNumber}`);

  const breakdownHtml = breakdownLines.length > 0
    ? `<div class="breakdown">${breakdownLines.join(" &bull; ")}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Bin Label — ${bin.binLocation}</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
    .label { border: 2px solid #000; padding: 16px; display: inline-block; max-width: 400px; }
    .bin-title { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .location { font-size: 18px; font-weight: bold; margin: 8px 0; letter-spacing: 2px; }
    .breakdown { font-size: 11px; color: #333; margin: 6px 0; }
    .barcode svg { max-width: 100%; }
    @media print { body { padding: 0; } .label { border: 1px solid #000; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="bin-title">Bin Location</div>
    <div class="location">${bin.binLocation}</div>
    ${breakdownHtml}
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
