"use client";

import { Badge } from "@/components/ui/badge";
import type { ConfidenceLevel } from "@/src/shared/lib/documentIntelligence";

const CONFIDENCE_STYLES: Record<ConfidenceLevel, { className: string; label: string }> = {
  high: { className: "bg-green-100 text-green-800 border-green-200", label: "High" },
  medium: { className: "bg-amber-100 text-amber-800 border-amber-200", label: "Medium" },
  low: { className: "bg-red-100 text-red-800 border-red-200", label: "Low" },
};

export function ExtractionFieldConfidenceBadge({
  confidence,
}: {
  confidence: ConfidenceLevel;
}) {
  const style = CONFIDENCE_STYLES[confidence];
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${style.className}`}>
      {style.label}
    </Badge>
  );
}
