"use client";

import { useCallback, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LineItem {
  id: string;
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

interface MarkupTier {
  maxCostThreshold: number;
  markupMultiplier: number;
}

export interface QuoteBuilderCenterProps {
  lineItems: LineItem[];
  shopRate: number;
  partMarkupTiers: MarkupTier[];
  serviceMarkupTiers: MarkupTier[];
  isDraft: boolean;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (
    id: string,
    updates: Partial<LineItem>,
  ) => void;
  onReorder: (orderedIds: string[]) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getAutoMarkup(
  cost: number,
  type: "part" | "external_service",
  partTiers: MarkupTier[],
  serviceTiers: MarkupTier[],
): number {
  const tiers = type === "part" ? partTiers : serviceTiers;
  const sorted = [...tiers].sort(
    (a, b) => a.maxCostThreshold - b.maxCostThreshold,
  );
  for (const tier of sorted) {
    if (cost <= tier.maxCostThreshold) return tier.markupMultiplier;
  }
  return 1.0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

const TYPE_BADGE_STYLES: Record<
  LineItem["type"],
  { label: string; className: string }
> = {
  labor: {
    label: "Labor",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  part: {
    label: "Part",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  external_service: {
    label: "Service",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
};

/* ------------------------------------------------------------------ */
/*  Line Item Card                                                     */
/* ------------------------------------------------------------------ */

interface LineItemCardProps {
  item: LineItem;
  index: number;
  isDraft: boolean;
  shopRate: number;
  partMarkupTiers: MarkupTier[];
  serviceMarkupTiers: MarkupTier[];
  dragIndex: number | null;
  overIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  onRemove: (id: string) => void;
}

function LineItemCard({
  item,
  index,
  isDraft,
  shopRate,
  partMarkupTiers,
  serviceMarkupTiers,
  dragIndex,
  overIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onUpdate,
  onRemove,
}: LineItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const badgeInfo = TYPE_BADGE_STYLES[item.type];
  const isDragTarget = overIndex === index && dragIndex !== index;

  const handleDirectCostChange = useCallback(
    (newCost: number) => {
      const updates: Partial<LineItem> = { directCost: newCost };
      if (!item.isMarkupOverride && item.type !== "labor") {
        updates.markupMultiplier = getAutoMarkup(
          newCost,
          item.type,
          partMarkupTiers,
          serviceMarkupTiers,
        );
      }
      onUpdate(item.id, updates);
    },
    [item.id, item.type, item.isMarkupOverride, partMarkupTiers, serviceMarkupTiers, onUpdate],
  );

  const handleMarkupChange = useCallback(
    (newMarkup: number) => {
      onUpdate(item.id, {
        markupMultiplier: newMarkup,
        isMarkupOverride: true,
      });
    },
    [item.id, onUpdate],
  );

  const quickSummary =
    item.type === "labor"
      ? `${item.qty.toFixed(1)} hrs`
      : `Qty ${item.qty}`;

  const autoMarkup =
    item.type !== "labor" && item.directCost !== undefined
      ? getAutoMarkup(item.directCost, item.type, partMarkupTiers, serviceMarkupTiers)
      : undefined;

  const isAutoMatch =
    autoMarkup !== undefined && item.markupMultiplier === autoMarkup;

  return (
    <div
      draggable={isDraft}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(index);
      }}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className={cn(
        "rounded-lg border bg-card text-card-foreground transition-colors",
        isDragTarget && "border-cyan-500",
        dragIndex === index && "opacity-50",
        !isDragTarget && "border-border hover:border-muted-foreground/40",
      )}
    >
      {/* Collapsed row */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {isDraft && (
          <span
            className="cursor-grab active:cursor-grabbing text-muted-foreground"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </span>
        )}

        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <span className="flex-1 truncate text-sm font-medium">
          {item.description || "Untitled item"}
        </span>

        <Badge
          variant="secondary"
          className={cn("text-[10px] px-1.5 py-0 leading-5", badgeInfo.className)}
        >
          {badgeInfo.label}
        </Badge>

        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {quickSummary}
        </span>

        <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
          {formatCurrency(item.total)}
        </span>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Description
            </label>
            <Input
              value={item.description}
              disabled={!isDraft}
              onChange={(e) =>
                onUpdate(item.id, { description: e.target.value })
              }
              placeholder="Line item description"
            />
          </div>

          {item.type === "labor" ? (
            /* ---- Labor editor ---- */
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Hours
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={item.qty}
                  disabled={!isDraft}
                  onChange={(e) =>
                    onUpdate(item.id, { qty: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Rate
                </label>
                {item.unitPrice ? (
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    disabled={!isDraft}
                    onChange={(e) =>
                      onUpdate(item.id, {
                        unitPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50">
                    <span className="text-sm italic text-muted-foreground">
                      {formatCurrency(shopRate)}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 leading-5"
                    >
                      Inherited from Shop Rate
                    </Badge>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Labor Subtotal
                </label>
                <div className="flex items-center h-9 px-3 text-sm font-semibold tabular-nums">
                  {formatCurrency(item.total)}
                </div>
              </div>
            </div>
          ) : (
            /* ---- Part / Service editor ---- */
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Qty
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={item.qty}
                    disabled={!isDraft}
                    onChange={(e) =>
                      onUpdate(item.id, {
                        qty: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Direct Cost
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.directCost ?? 0}
                    disabled={!isDraft}
                    onChange={(e) =>
                      handleDirectCostChange(
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Markup Multiplier
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.markupMultiplier ?? 1}
                      disabled={!isDraft}
                      onChange={(e) =>
                        handleMarkupChange(
                          parseFloat(e.target.value) || 1,
                        )
                      }
                      className="flex-1"
                    />
                    {item.isMarkupOverride ? (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] px-1.5 py-0 leading-5 shrink-0">
                        OVERRIDE
                      </Badge>
                    ) : isAutoMatch ? (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 shrink-0">
                        Auto
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Pricing mode toggle + fixed price override */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Pricing Mode
                  </label>
                  <Select
                    value={item.pricingMode ?? "derived"}
                    disabled={!isDraft}
                    onValueChange={(val: "derived" | "override") =>
                      onUpdate(item.id, { pricingMode: val })
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="derived">Derived</SelectItem>
                      <SelectItem value="override">Override</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {item.pricingMode === "override" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Fixed Price Override
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.fixedPriceOverride ?? 0}
                      disabled={!isDraft}
                      onChange={(e) =>
                        onUpdate(item.id, {
                          fixedPriceOverride:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-[160px]"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Delete button */}
          {isDraft && (
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remove
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function QuoteBuilderCenter({
  lineItems,
  shopRate,
  partMarkupTiers,
  serviceMarkupTiers,
  isDraft,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onReorder,
}: QuoteBuilderCenterProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOverIndex(index);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) {
        handleDragEnd();
        return;
      }

      const ordered = lineItems.map((li) => li.id);
      const [moved] = ordered.splice(dragIndex, 1);
      ordered.splice(dropIndex, 0, moved);
      onReorder(ordered);
      handleDragEnd();
    },
    [dragIndex, lineItems, onReorder, handleDragEnd],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Scope of Work</h2>
          <Badge variant="secondary" className="text-xs tabular-nums">
            {lineItems.length}
          </Badge>
        </div>

        {isDraft && (
          <Button variant="outline" size="sm" onClick={onAddItem}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Custom Item
          </Button>
        )}
      </div>

      {/* Line items list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {lineItems.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-16 px-6 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No line items yet. Click &ldquo;Add Custom Item&rdquo; or add from
              the service library.
            </p>
          </div>
        ) : (
          lineItems.map((item, idx) => (
            <LineItemCard
              key={item.id}
              item={item}
              index={idx}
              isDraft={isDraft}
              shopRate={shopRate}
              partMarkupTiers={partMarkupTiers}
              serviceMarkupTiers={serviceMarkupTiers}
              dragIndex={dragIndex}
              overIndex={overIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              onUpdate={onUpdateItem}
              onRemove={onRemoveItem}
            />
          ))
        )}
      </div>
    </div>
  );
}
