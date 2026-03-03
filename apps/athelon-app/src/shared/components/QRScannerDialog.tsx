"use client";

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { toast } from "sonner";

interface QRScannerDialogProps {
  open: boolean;
  onClose: () => void;
}

function parseQRCode(value: string): { path: string; label: string } | null {
  const trimmed = value.trim();

  // WO:{workOrderNumber}
  if (trimmed.startsWith("WO:")) {
    const woNumber = trimmed.slice(3);
    return { path: `/work-orders?search=${encodeURIComponent(woNumber)}`, label: `Work Order ${woNumber}` };
  }

  // PART:{partNumber}:{serialNumber}
  if (trimmed.startsWith("PART:")) {
    const parts = trimmed.slice(5).split(":");
    const partNumber = parts[0];
    return { path: `/parts?search=${encodeURIComponent(partNumber)}`, label: `Part ${partNumber}` };
  }

  // TOOL:{toolId}:{calibrationDue}
  if (trimmed.startsWith("TOOL:")) {
    const parts = trimmed.slice(5).split(":");
    const toolId = parts[0];
    return { path: `/parts/tools?search=${encodeURIComponent(toolId)}`, label: `Tool ${toolId}` };
  }

  return null;
}

export function QRScannerDialog({ open, onClose }: QRScannerDialogProps) {
  const navigate = useNavigate();
  const [manualInput, setManualInput] = useState("");
  const [showCamera, setShowCamera] = useState(false);

  const handleScan = useCallback(
    (value: string) => {
      const result = parseQRCode(value);
      if (result) {
        toast.success(`Navigating to ${result.label}`);
        navigate(result.path);
        onClose();
      } else {
        toast.error("Unrecognized QR code format");
      }
      setShowCamera(false);
    },
    [navigate, onClose],
  );

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    handleScan(manualInput.trim());
    setManualInput("");
  };

  const handleClose = () => {
    setShowCamera(false);
    setManualInput("");
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showCamera} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" />
              Scan QR Code
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              className="w-full gap-2"
              onClick={() => setShowCamera(true)}
            >
              <ScanLine className="w-4 h-4" />
              Open Camera Scanner
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or enter manually
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-qr">QR Code Value</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-qr"
                  placeholder="e.g. WO:WO-2024-001 or PART:PN-123:SN-456"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                />
                <Button variant="secondary" size="icon" onClick={handleManualSubmit}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formats: WO:number, PART:partNum:serial, TOOL:id:calDate
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onScan={handleScan}
        title="Scan QR Code"
      />
    </>
  );
}
