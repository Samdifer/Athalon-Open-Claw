"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRCodeBadgeProps {
  value: string;
  label: string;
  size?: number;
}

export function QRCodeBadge({ value, label, size = 128 }: QRCodeBadgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>QR Label — ${label}</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
    .label { border: 2px solid #000; padding: 16px; display: inline-block; }
    .label-text { font-size: 14px; margin-top: 8px; font-weight: bold; }
    .value-text { font-size: 11px; color: #555; margin-top: 4px; word-break: break-all; }
    @media print { body { padding: 0; } .label { border: 1px solid #000; } }
  </style>
</head>
<body>
  <div class="label">
    <div id="qr"></div>
    <div class="label-text">${label}</div>
    <div class="value-text">${value}</div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
  <script>
    QRCode.toCanvas(document.createElement('canvas'), '${value}', { width: ${size} }, function(err, canvas) {
      if (!err) document.getElementById('qr').appendChild(canvas);
      window.print();
    });
  </script>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-2">
      <QRCodeSVG value={value} size={size} level="M" />
      <p className="text-xs text-muted-foreground font-medium text-center max-w-[150px] truncate">
        {label}
      </p>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handlePrint}>
        <Printer className="w-3 h-3" />
        Print
      </Button>
    </div>
  );
}
