import type { Id } from "@/convex/_generated/dataModel";

export type QuoteWorkspaceMode = "list" | "new" | "detail";

export type QuoteWorkspaceWorkOrder = {
  _id: Id<"workOrders">;
  workOrderNumber: string;
  description: string;
  status: string;
  priority: "routine" | "urgent" | "aog";
  sourceQuoteId?: Id<"quotes">;
  quoteNumber?: string | null;
  quoteStatus?: string | null;
  aircraft: { currentRegistration?: string; make: string; model: string } | null;
};

// ─── Quote Builder Types ─────────────────────────────────────────────────────

export interface BuilderLineItem {
  id: string; // _id for saved items, local UUID for draft
  type: "labor" | "part" | "external_service";
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  directCost?: number;
  markupMultiplier?: number;
  fixedPriceOverride?: number;
  pricingMode?: "derived" | "override";
  isMarkupOverride?: boolean;
  sortOrder?: number;
}

export interface MarkupTier {
  maxCostThreshold: number;
  markupMultiplier: number;
}

export interface ShopSettingsData {
  shopRate: number;
  averageHourlyCost: number;
  partMarkupTiers: MarkupTier[];
  serviceMarkupTiers: MarkupTier[];
}

export const DEFAULT_SHOP_SETTINGS: ShopSettingsData = {
  shopRate: 135,
  averageHourlyCost: 58,
  partMarkupTiers: [
    { maxCostThreshold: 500, markupMultiplier: 1.3 },
    { maxCostThreshold: 2500, markupMultiplier: 1.2 },
    { maxCostThreshold: 10000, markupMultiplier: 1.12 },
  ],
  serviceMarkupTiers: [
    { maxCostThreshold: 1000, markupMultiplier: 1.25 },
    { maxCostThreshold: 5000, markupMultiplier: 1.15 },
  ],
};
