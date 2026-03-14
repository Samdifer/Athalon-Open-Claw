"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  title?: string;
}

export function BarcodeScanner({ open, onClose, onScan, title = "Scan Barcode" }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const containerId = "barcode-scanner-container";

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const startScanning = async () => {
      // Wait for the DOM element to be available (Dialog may not have mounted yet)
      if (!document.getElementById(containerId)) {
        return;
      }

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
          } as any,
          (decodedText) => {
            if (!cancelled) {
              onScan(decodedText);
              onClose();
            }
          },
          () => {
            // ignore scan failures
          },
        );

        // Check torch support
        try {
          const track = scanner.getRunningTrackSettings?.();
          if (track && "torch" in (track as any)) {
            setTorchSupported(true);
          }
        } catch {
          // torch detection not available
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to start camera. Please grant camera permissions.",
          );
        }
      }
    };

    // Delay to let Dialog DOM mount; retry once if element isn't ready
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (!document.getElementById(containerId)) {
        // Retry after another frame if Dialog hasn't mounted yet
        setTimeout(() => { if (!cancelled) startScanning(); }, 200);
      } else {
        startScanning();
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      void stopScanner();
    };
  }, [open, onScan, onClose, stopScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: !torchOn } as any],
      });
      setTorchOn(!torchOn);
    } catch {
      // torch toggle failed
    }
  };

  const handleClose = () => {
    void stopScanner();
    setError(null);
    setTorchOn(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="w-4 h-4 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <div
            id={containerId}
            className="w-full min-h-[280px] bg-black"
          />

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}

          {/* Controls overlay */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
            {torchSupported && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5 bg-black/60 hover:bg-black/80 text-white border-0"
                onClick={toggleTorch}
              >
                {torchOn ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                {torchOn ? "Light Off" : "Light On"}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 bg-black/60 hover:bg-black/80 text-white border-0"
              onClick={handleClose}
            >
              <X className="w-3.5 h-3.5" />
              Close
            </Button>
          </div>
        </div>

        <p className="px-4 pb-4 text-xs text-muted-foreground text-center">
          Point camera at a barcode or QR code. Supports Code128, Code39, QR, EAN-13.
        </p>
      </DialogContent>
    </Dialog>
  );
}
