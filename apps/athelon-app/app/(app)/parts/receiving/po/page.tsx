"use client";

// PO Receiving Wizard — Phase 4 Inventory System
//
// Multi-step wizard for receiving parts against a purchase order.
// Steps: Select PO -> Enter Receiving Data -> Review -> Success
//
// Parts are created in "pending_inspection" status per INV-23 and must
// pass receiving inspection before becoming issuable inventory.

import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useUser } from "@clerk/clerk-react";
import {
  Package,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ArrowRight,
  ClipboardList,
  Truck,
  Eye,
  PartyPopper,
  AlertCircle,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PartCondition = "new" | "serviceable" | "overhauled" | "repaired" | "unserviceable" | "quarantine" | "scrapped";
type PartCategory = "consumable" | "standard" | "rotable" | "expendable" | "repairable";

interface LineItemReceivingData {
  lineItemId: string;
  description: string;
  orderedQty: number;
  alreadyReceivedQty: number;
  remainingQty: number;
  // User-entered fields
  receivedQty: number;
  isSerialized: boolean;
  serialNumbers: string[];
  condition: PartCondition;
  partCategory: PartCategory | "";
  partNumber: string;
  partName: string;
  lotNumber: string;
  batchNumber: string;
  unitCost: number;
  hasShelfLifeLimit: boolean;
  shelfLifeLimitDate: string; // ISO date string for input
  isLifeLimited: boolean;
  lifeLimitHours: string;
  lifeLimitCycles: string;
  binLocation: string;
  notes: string;
  conformityDocumentIdsRaw: string;
  // Track if user wants to receive this item
  isSelected: boolean;
}

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<WizardStep, { label: string; icon: typeof ClipboardList }> = {
  1: { label: "Select PO", icon: ClipboardList },
  2: { label: "Enter Data", icon: Truck },
  3: { label: "Review", icon: Eye },
  4: { label: "Complete", icon: PartyPopper },
};

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PARTIAL: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

const CONDITION_OPTIONS: { value: PartCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "serviceable", label: "Serviceable" },
  { value: "overhauled", label: "Overhauled" },
  { value: "repaired", label: "Repaired" },
  { value: "unserviceable", label: "Unserviceable" },
];

const CATEGORY_OPTIONS: { value: PartCategory; label: string }[] = [
  { value: "consumable", label: "Consumable" },
  { value: "standard", label: "Standard" },
  { value: "rotable", label: "Rotable" },
  { value: "expendable", label: "Expendable" },
  { value: "repairable", label: "Repairable" },
];

function parseDateInputToUtcMs(dateInput: string): number | undefined {
  if (!dateInput) return undefined;
  const [y, m, d] = dateInput.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  return Date.UTC(y, m - 1, d);
}

function parseDocumentIdList(raw: string): string[] {
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step Progress Indicator
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const steps = [1, 2, 3, 4] as WizardStep[];
  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-6">
      {steps.map((step, idx) => {
        const StepIcon = STEP_LABELS[step].icon;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        return (
          <div key={step} className="flex items-center gap-1 sm:gap-2">
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isCompleted
                    ? "bg-green-500/15 text-green-600 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <StepIcon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{STEP_LABELS[step].label}</span>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Select PO
// ─────────────────────────────────────────────────────────────────────────────

function Step1SelectPO({
  orgId,
  onSelect,
}: {
  orgId: Id<"organizations">;
  onSelect: (poId: Id<"purchaseOrders">) => void;
}) {
  const pos = useQuery(api.poReceiving.listPOsAwaitingReceiving, {
    organizationId: orgId,
  });
  const vendors = useQuery(api.vendors.listVendors, { orgId });

  const vendorMap = useMemo<Record<string, string>>(() => {
    if (!vendors) return {};
    return Object.fromEntries(vendors.map((v) => [v._id, v.name]));
  }, [vendors]);

  const isLoading = pos === undefined;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (pos.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-8 text-center">
          <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No purchase orders awaiting receiving.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Submit a PO from the{" "}
            <Link to="/billing/purchase-orders" className="text-primary underline">
              Purchase Orders
            </Link>{" "}
            page to begin receiving.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select a purchase order to receive items against.
      </p>
      {pos.map((po) => (
        <Card
          key={po._id}
          className="border-border/60 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
          onClick={() => onSelect(po._id as Id<"purchaseOrders">)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{po.poNumber}</span>
                  <Badge
                    variant="outline"
                    className={STATUS_STYLES[po.status] ?? ""}
                  >
                    {po.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vendor: {vendorMap[po.vendorId] ?? "Unknown"} | Created:{" "}
                  {formatDate(po.createdAt)} | Total: {formatCurrency(po.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {po.lineItemCount} line item{po.lineItemCount !== 1 ? "s" : ""} |{" "}
                  {po.pendingItemCount} pending | {po.receivedItemCount} received
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Enter Receiving Data
// ─────────────────────────────────────────────────────────────────────────────

function Step2EnterData({
  purchaseOrderId,
  lineItemsData,
  onUpdateLineItem,
  onNext,
  onBack,
}: {
  purchaseOrderId: Id<"purchaseOrders">;
  lineItemsData: LineItemReceivingData[];
  onUpdateLineItem: (index: number, updates: Partial<LineItemReceivingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const poDetail = useQuery(api.poReceiving.getPOReceivingDetail, {
    purchaseOrderId,
  });

  if (!poDetail) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasSelectedItems = lineItemsData.some(
    (item) => item.isSelected && item.receivedQty > 0,
  );

  // Validate serialized items have serial numbers filled
  const hasSerialErrors = lineItemsData.some(
    (item) =>
      item.isSelected &&
      item.receivedQty > 0 &&
      item.isSerialized &&
      item.serialNumbers.some((s) => !s.trim()),
  );

  // BUG-PC-HUNT-104: Prevent advancing with incomplete receiving metadata.
  // Previously the wizard allowed blank part number/name (and missing shelf date)
  // then failed only at final submit with a generic error.
  const hasRequiredFieldErrors = lineItemsData.some(
    (item) =>
      item.isSelected &&
      item.receivedQty > 0 &&
      (!item.partNumber.trim() ||
        !item.partName.trim() ||
        (item.hasShelfLifeLimit && !item.shelfLifeLimitDate)),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">PO: {poDetail.poNumber}</p>
          <p className="text-xs text-muted-foreground">
            Enter receiving data for each line item you are receiving.
          </p>
        </div>
        <Badge variant="outline" className={STATUS_STYLES[poDetail.status] ?? ""}>
          {poDetail.status}
        </Badge>
      </div>

      <div className="space-y-4">
        {lineItemsData.map((item, index) => {
          if (item.remainingQty <= 0) return null; // Skip fully received items

          return (
            <Card
              key={item.lineItemId}
              className={`border-border/60 ${item.isSelected ? "ring-1 ring-primary/30" : "opacity-70"}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{item.description}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Ordered: {item.orderedQty} | Received: {item.alreadyReceivedQty} |{" "}
                      Remaining: {item.remainingQty}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={item.isSelected}
                    onCheckedChange={(checked) =>
                      onUpdateLineItem(index, { isSelected: checked })
                    }
                  />
                </div>
              </CardHeader>

              {item.isSelected && (
                <CardContent className="pt-0 space-y-4">
                  <Separator />

                  {/* Row 1: Part Number, Part Name, Received Qty */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Part Number</Label>
                      <Input
                        value={item.partNumber}
                        onChange={(e) =>
                          onUpdateLineItem(index, { partNumber: e.target.value })
                        }
                        placeholder="P/N"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Part Name</Label>
                      <Input
                        value={item.partName}
                        onChange={(e) =>
                          onUpdateLineItem(index, { partName: e.target.value })
                        }
                        placeholder="Part description"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Received Qty (max {item.remainingQty})
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={item.remainingQty}
                        value={item.receivedQty || ""}
                        onChange={(e) => {
                          const val = Math.min(
                            parseInt(e.target.value) || 0,
                            item.remainingQty,
                          );
                          const newSerials = item.isSerialized
                            ? Array.from({ length: val }, (_, i) => item.serialNumbers[i] ?? "")
                            : [];
                          onUpdateLineItem(index, {
                            receivedQty: val,
                            serialNumbers: newSerials,
                          });
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 2: Condition, Category, Serialized toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Condition</Label>
                      <Select
                        value={item.condition}
                        onValueChange={(val) =>
                          onUpdateLineItem(index, {
                            condition: val as PartCondition,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Part Category</Label>
                      <Select
                        value={item.partCategory || "none"}
                        onValueChange={(val) =>
                          onUpdateLineItem(index, {
                            partCategory: val === "none" ? "" : (val as PartCategory),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {CATEGORY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Serialized</Label>
                      <div className="flex items-center gap-2 h-8">
                        <Switch
                          checked={item.isSerialized}
                          onCheckedChange={(checked) => {
                            const newSerials = checked
                              ? Array.from({ length: item.receivedQty }, () => "")
                              : [];
                            onUpdateLineItem(index, {
                              isSerialized: checked,
                              serialNumbers: newSerials,
                            });
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {item.isSerialized ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Serial Numbers (if serialized) */}
                  {item.isSerialized && item.receivedQty > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Serial Numbers ({item.serialNumbers.length})
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.serialNumbers.map((sn, snIdx) => (
                          <Input
                            key={snIdx}
                            value={sn}
                            onChange={(e) => {
                              const updated = [...item.serialNumbers];
                              updated[snIdx] = e.target.value;
                              onUpdateLineItem(index, {
                                serialNumbers: updated,
                              });
                            }}
                            placeholder={`S/N ${snIdx + 1}`}
                            className="h-8 text-sm"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row 3: Lot, Batch, Unit Cost */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Lot Number</Label>
                      <Input
                        value={item.lotNumber}
                        onChange={(e) =>
                          onUpdateLineItem(index, { lotNumber: e.target.value })
                        }
                        placeholder="Optional"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Batch Number</Label>
                      <Input
                        value={item.batchNumber}
                        onChange={(e) =>
                          onUpdateLineItem(index, {
                            batchNumber: e.target.value,
                          })
                        }
                        placeholder="Optional"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit Cost ($)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitCost || ""}
                        onChange={(e) =>
                          onUpdateLineItem(index, {
                            unitCost: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 4: Shelf Life + Life Limited toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.hasShelfLifeLimit}
                          onCheckedChange={(checked) =>
                            onUpdateLineItem(index, {
                              hasShelfLifeLimit: checked,
                            })
                          }
                        />
                        <Label className="text-xs">Has Shelf Life Limit</Label>
                      </div>
                      {item.hasShelfLifeLimit && (
                        <Input
                          type="date"
                          value={item.shelfLifeLimitDate}
                          onChange={(e) =>
                            onUpdateLineItem(index, {
                              shelfLifeLimitDate: e.target.value,
                            })
                          }
                          className="h-8 text-sm"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.isLifeLimited}
                          onCheckedChange={(checked) =>
                            onUpdateLineItem(index, { isLifeLimited: checked })
                          }
                        />
                        <Label className="text-xs">Life Limited</Label>
                      </div>
                      {item.isLifeLimited && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">
                              Limit Hours
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              value={item.lifeLimitHours}
                              onChange={(e) =>
                                onUpdateLineItem(index, {
                                  lifeLimitHours: e.target.value,
                                })
                              }
                              placeholder="Hours"
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">
                              Limit Cycles
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              value={item.lifeLimitCycles}
                              onChange={(e) =>
                                onUpdateLineItem(index, {
                                  lifeLimitCycles: e.target.value,
                                })
                              }
                              placeholder="Cycles"
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 5: Bin Location + Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bin Location</Label>
                      <Input
                        value={item.binLocation}
                        onChange={(e) =>
                          onUpdateLineItem(index, {
                            binLocation: e.target.value,
                          })
                        }
                        placeholder="e.g. A-01-03"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes</Label>
                      <Input
                        value={item.notes}
                        onChange={(e) =>
                          onUpdateLineItem(index, { notes: e.target.value })
                        }
                        placeholder="Optional notes"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 6: Conformity Evidence */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Conformity Document IDs</Label>
                    <Input
                      value={item.conformityDocumentIdsRaw}
                      onChange={(e) =>
                        onUpdateLineItem(index, { conformityDocumentIdsRaw: e.target.value })
                      }
                      placeholder="Optional: comma-separated Convex document IDs"
                      className="h-8 text-sm"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="space-y-2 pt-2">
        {hasRequiredFieldErrors && (
          <p className="text-xs text-destructive">
            Complete Part Number, Part Name, and shelf-life date (when required) for all selected lines before review.
          </p>
        )}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Button>
          <Button
            size="sm"
            onClick={onNext}
            disabled={!hasSelectedItems || hasSerialErrors || hasRequiredFieldErrors}
          >
            Next: Review
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Review
// ─────────────────────────────────────────────────────────────────────────────

function Step3Review({
  poNumber,
  lineItemsData,
  isSubmitting,
  onConfirm,
  onBack,
}: {
  poNumber: string;
  lineItemsData: LineItemReceivingData[];
  isSubmitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const selectedItems = lineItemsData.filter(
    (item) => item.isSelected && item.receivedQty > 0,
  );
  const totalParts = selectedItems.reduce(
    (sum, item) => sum + item.receivedQty,
    0,
  );
  const totalCost = selectedItems.reduce(
    (sum, item) => sum + item.receivedQty * item.unitCost,
    0,
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Review Receiving - {poNumber}</p>
        <p className="text-xs text-muted-foreground">
          Confirm the receiving data below. Parts will be created in
          &quot;Pending Inspection&quot; status.
        </p>
      </div>

      {/* Summary */}
      <Card className="border-border/60 bg-accent/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold">{selectedItems.length}</p>
              <p className="text-xs text-muted-foreground">Line Items</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{totalParts}</p>
              <p className="text-xs text-muted-foreground">Total Parts</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{formatCurrency(totalCost)}</p>
              <p className="text-xs text-muted-foreground">Total Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail cards */}
      <div className="space-y-3">
        {selectedItems.map((item) => (
          <Card key={item.lineItemId} className="border-border/60">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{item.description}</p>
                <Badge variant="outline" className="text-xs">
                  Qty: {item.receivedQty}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">P/N:</span>{" "}
                  {item.partNumber || "-"}
                </div>
                <div>
                  <span className="font-medium text-foreground">Name:</span>{" "}
                  {item.partName || "-"}
                </div>
                <div>
                  <span className="font-medium text-foreground">Condition:</span>{" "}
                  {item.condition}
                </div>
                <div>
                  <span className="font-medium text-foreground">Unit Cost:</span>{" "}
                  {formatCurrency(item.unitCost)}
                </div>
                {item.isSerialized && (
                  <div className="col-span-2 sm:col-span-4">
                    <span className="font-medium text-foreground">S/N:</span>{" "}
                    {item.serialNumbers.join(", ")}
                  </div>
                )}
                {item.lotNumber && (
                  <div>
                    <span className="font-medium text-foreground">Lot:</span>{" "}
                    {item.lotNumber}
                  </div>
                )}
                {item.batchNumber && (
                  <div>
                    <span className="font-medium text-foreground">Batch:</span>{" "}
                    {item.batchNumber}
                  </div>
                )}
                {item.partCategory && (
                  <div>
                    <span className="font-medium text-foreground">Category:</span>{" "}
                    {item.partCategory}
                  </div>
                )}
                {item.binLocation && (
                  <div>
                    <span className="font-medium text-foreground">Bin:</span>{" "}
                    {item.binLocation}
                  </div>
                )}
                {item.hasShelfLifeLimit && (
                  <div>
                    <span className="font-medium text-foreground">
                      Shelf Life:
                    </span>{" "}
                    {item.shelfLifeLimitDate}
                  </div>
                )}
                {item.isLifeLimited && (
                  <div>
                    <span className="font-medium text-foreground">
                      Life Limit:
                    </span>{" "}
                    {item.lifeLimitHours ? `${item.lifeLimitHours}h` : ""}{" "}
                    {item.lifeLimitCycles ? `${item.lifeLimitCycles}c` : ""}
                  </div>
                )}
                {item.notes && (
                  <div className="col-span-2 sm:col-span-4">
                    <span className="font-medium text-foreground">Notes:</span>{" "}
                    {item.notes}
                  </div>
                )}
                {item.conformityDocumentIdsRaw && (
                  <div className="col-span-2 sm:col-span-4">
                    <span className="font-medium text-foreground">Conformity Docs:</span>{" "}
                    {parseDocumentIdList(item.conformityDocumentIdsRaw).length}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          Back
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? "Receiving..." : "Confirm & Receive"}
          {!isSubmitting && <CheckCircle2 className="w-3.5 h-3.5 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Success
// ─────────────────────────────────────────────────────────────────────────────

function Step4Success({
  poNumber,
  totalPartsCreated,
  totalLineItems,
  onReset,
}: {
  poNumber: string;
  totalPartsCreated: number;
  totalLineItems: number;
  onReset: () => void;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Receiving Complete</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {totalPartsCreated} part record{totalPartsCreated !== 1 ? "s" : ""} created
            from {totalLineItems} line item{totalLineItems !== 1 ? "s" : ""} on{" "}
            {poNumber}.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Parts have been placed in <strong>Pending Inspection</strong> status.
            Complete receiving inspection before issuing to work orders.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button size="sm" asChild>
            <Link to="/parts/receiving">
              Go to Receiving Inspection
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            Receive More
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/billing/purchase-orders">Back to POs</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function POReceivingPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const { user } = useUser();

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedPOId, setSelectedPOId] = useState<Id<"purchaseOrders"> | null>(null);
  const [lineItemsData, setLineItemsData] = useState<LineItemReceivingData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state for Step 4
  const [resultPoNumber, setResultPoNumber] = useState("");
  const [resultPartsCreated, setResultPartsCreated] = useState(0);
  const [resultLineItems, setResultLineItems] = useState(0);

  const receiveAgainstPO = useMutation(api.poReceiving.receiveAgainstPO);

  // Fetch PO detail when a PO is selected (for step 2 initialization)
  const poDetail = useQuery(
    api.poReceiving.getPOReceivingDetail,
    selectedPOId ? { purchaseOrderId: selectedPOId } : "skip",
  );

  // Initialize line items data when PO detail loads
  const initializeLineItems = useCallback(() => {
    if (!poDetail) return;
    const items: LineItemReceivingData[] = poDetail.lineItems
      .filter((item) => !item.isFullyReceived)
      .map((item) => ({
        lineItemId: item._id,
        description: item.description,
        orderedQty: item.qty,
        alreadyReceivedQty: item.receivedQty,
        remainingQty: item.remainingQty,
        receivedQty: 0,
        isSerialized: false,
        serialNumbers: [],
        condition: "new" as PartCondition,
        partCategory: "" as PartCategory | "",
        partNumber: "",
        partName: item.description,
        lotNumber: "",
        batchNumber: "",
        unitCost: item.unitPrice,
        hasShelfLifeLimit: false,
        shelfLifeLimitDate: "",
        isLifeLimited: false,
        lifeLimitHours: "",
        lifeLimitCycles: "",
        binLocation: "",
        notes: "",
        conformityDocumentIdsRaw: "",
        isSelected: true,
      }));
    setLineItemsData(items);
  }, [poDetail]);

  // Handle PO selection
  const handleSelectPO = useCallback(
    (poId: Id<"purchaseOrders">) => {
      setSelectedPOId(poId);
      setStep(2);
      setError(null);
    },
    [],
  );

  // BUG-PC-HUNT-103: Avoid state updates during render.
  // Initialize step data via effect so React doesn't hit setState-in-render
  // warnings or duplicate initialization under strict/concurrent rendering.
  useEffect(() => {
    if (step === 2 && poDetail && lineItemsData.length === 0) {
      initializeLineItems();
    }
  }, [step, poDetail, lineItemsData.length, initializeLineItems]);

  const handleUpdateLineItem = useCallback(
    (index: number, updates: Partial<LineItemReceivingData>) => {
      setLineItemsData((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...updates };
        return next;
      });
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!orgId || !selectedPOId || !user) return;

    const selectedItems = lineItemsData.filter(
      (item) => item.isSelected && item.receivedQty > 0,
    );

    if (selectedItems.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    let totalPartsCreated = 0;
    const poNumber = poDetail?.poNumber ?? "";

    try {
      for (const item of selectedItems) {
        const result = await receiveAgainstPO({
          organizationId: orgId,
          purchaseOrderId: selectedPOId,
          lineItemId: item.lineItemId as Id<"poLineItems">,
          receivedQty: item.receivedQty,
          partNumber: item.partNumber,
          partName: item.partName,
          serialNumbers: item.isSerialized ? item.serialNumbers : undefined,
          isSerialized: item.isSerialized,
          condition: item.condition,
          partCategory: item.partCategory || undefined,
          lotNumber: item.lotNumber || undefined,
          batchNumber: item.batchNumber || undefined,
          unitCost: item.unitCost,
          hasShelfLifeLimit: item.hasShelfLifeLimit,
          shelfLifeLimitDate:
            item.hasShelfLifeLimit && item.shelfLifeLimitDate
              ? parseDateInputToUtcMs(item.shelfLifeLimitDate)
              : undefined,
          isLifeLimited: item.isLifeLimited,
          lifeLimitHours: item.isLifeLimited && item.lifeLimitHours
            ? parseFloat(item.lifeLimitHours)
            : undefined,
          lifeLimitCycles: item.isLifeLimited && item.lifeLimitCycles
            ? parseFloat(item.lifeLimitCycles)
            : undefined,
          binLocation: item.binLocation || undefined,
          notes: item.notes || undefined,
          conformityDocumentIds: (() => {
            const ids = parseDocumentIdList(item.conformityDocumentIdsRaw);
            return ids.length > 0 ? (ids as Id<"documents">[]) : undefined;
          })(),
          receivedByUserId: user.id,
        });

        totalPartsCreated += result.partIds.length;
      }

      setResultPoNumber(poNumber);
      setResultPartsCreated(totalPartsCreated);
      setResultLineItems(selectedItems.length);
      setStep(4);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during receiving.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [orgId, selectedPOId, user, lineItemsData, poDetail, receiveAgainstPO]);

  const handleReset = useCallback(() => {
    setStep(1);
    setSelectedPOId(null);
    setLineItemsData([]);
    setError(null);
    setResultPoNumber("");
    setResultPartsCreated(0);
    setResultLineItems(0);
  }, []);

  if (!isLoaded || !orgId) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          Receive Against Purchase Order
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Receive parts from a submitted purchase order into pending inspection.
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={step} />

      {/* Error Banner */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      {step === 1 && (
        <Step1SelectPO orgId={orgId} onSelect={handleSelectPO} />
      )}

      {step === 2 && selectedPOId && (
        <Step2EnterData
          purchaseOrderId={selectedPOId}
          lineItemsData={lineItemsData}
          onUpdateLineItem={handleUpdateLineItem}
          onNext={() => {
            setError(null);
            setStep(3);
          }}
          onBack={() => {
            setStep(1);
            setSelectedPOId(null);
            setLineItemsData([]);
          }}
        />
      )}

      {step === 3 && (
        <Step3Review
          poNumber={poDetail?.poNumber ?? ""}
          lineItemsData={lineItemsData}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirm}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <Step4Success
          poNumber={resultPoNumber}
          totalPartsCreated={resultPartsCreated}
          totalLineItems={resultLineItems}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
