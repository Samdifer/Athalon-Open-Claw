"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export function PrintButton({ label = "Print", className }: PrintButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className={className ?? "h-8 gap-1.5 text-xs"}
    >
      <Printer className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}
