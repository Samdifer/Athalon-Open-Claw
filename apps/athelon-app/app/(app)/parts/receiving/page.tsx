"use client";

import { Package } from "lucide-react";
import { ReceivingInspection } from "../_components/ReceivingInspection";

export default function PartsReceivingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          Parts Receiving Inspection
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Complete checklist-driven receiving inspections before parts enter inventory.
        </p>
      </div>

      <ReceivingInspection />
    </div>
  );
}
