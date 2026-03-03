"use client";

/**
 * LineEconomicsEditor.tsx
 *
 * BUG-QCM-BLE-001: LineEconomicsEditor component was referenced in
 * billing/quotes/[id]/page.tsx (Wave 4 expanded economics editor row) but
 * the component file was never created. This caused a TypeScript "Cannot find
 * name 'LineEconomicsEditor'" error and a broken runtime render for any user
 * expanding a draft quote line item to edit economics (direct cost, markup,
 * fixed-price override). Billing managers would click the expand chevron and
 * see a blank row with no controls — or a React "LineEconomicsEditor is not
 * defined" runtime error that crashes the quote detail page entirely.
 */

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, TrendingUp } from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LineEconomicsEditorProps {
  lineItemId: Id<"quoteLineItems">;
  directCost?: number;
  markupMultiplier?: number;
  fixedPriceOverride?: number;
  pricingMode: "derived" | "override";
  onSave: (
    lineItemId: Id<"quoteLineItems">,
    data: {
      directCost?: number;
      markupMultiplier?: number;
      fixedPriceOverride?: number;
      pricingMode?: "derived" | "override";
    },
  ) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LineEconomicsEditor({
  lineItemId,
  directCost,
  markupMultiplier,
  fixedPriceOverride,
  pricingMode,
  onSave,
}: LineEconomicsEditorProps) {
  const [mode, setMode] = useState<"derived" | "override">(pricingMode);
  const [cost, setCost] = useState(directCost?.toString() ?? "");
  const [markup, setMarkup] = useState(markupMultiplier?.toString() ?? "");
  const [override, setOverride] = useState(fixedPriceOverride?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  // Derived price preview
  const derivedPrice =
    mode === "derived" && cost && markup
      ? (parseFloat(cost) * parseFloat(markup)).toFixed(2)
      : null;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(lineItemId, {
        pricingMode: mode,
        directCost: cost ? parseFloat(cost) : undefined,
        markupMultiplier: mode === "derived" && markup ? parseFloat(markup) : undefined,
        fixedPriceOverride:
          mode === "override" && override ? parseFloat(override) : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
        <TrendingUp className="w-3 h-3" />
        Line Pricing &amp; Economics
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
        {/* Pricing mode */}
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">
            Pricing Mode
          </Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as "derived" | "override")}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="derived" className="text-xs">
                Cost + Markup
              </SelectItem>
              <SelectItem value="override" className="text-xs">
                Fixed Price Override
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Direct cost */}
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">
            Direct Cost ($)
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            <Input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className="h-8 text-xs pl-6"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Markup or fixed override */}
        {mode === "derived" ? (
          <div>
            <Label className="text-[11px] text-muted-foreground mb-1 block">
              Markup Multiplier
            </Label>
            <Input
              type="number"
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              placeholder="e.g. 1.5"
              className="h-8 text-xs"
              min="1"
              step="0.01"
            />
            {derivedPrice && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                → ${derivedPrice} sell price
              </p>
            )}
          </div>
        ) : (
          <div>
            <Label className="text-[11px] text-muted-foreground mb-1 block">
              Fixed Price ($)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <Input
                type="number"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                placeholder="0.00"
                className="h-8 text-xs pl-6"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex items-end">
          <Button
            size="sm"
            className="h-8 text-xs w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Apply"}
          </Button>
        </div>
      </div>
    </div>
  );
}
