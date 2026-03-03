"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/useRouter";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Trash2,
  ArrowLeft,
  FileText,
  AlertCircle,
  Package,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

type LineItemType = "labor" | "part" | "external_service";

interface DraftLineItem {
  id: string;
  type: LineItemType;
  description: string;
  qty: string;
  unitPrice: string;
}

interface LaborKitLaborItem {
  description: string;
  estimatedHours: number;
}

interface LaborKitPartItem {
  partNumber: string;
  description: string;
  quantity: number;
  unitCost?: number;
}

interface LaborKitExternalServiceItem {
  vendorName?: string;
  description: string;
  estimatedCost: number;
}

interface LaborKitForQuote {
  _id: string;
  name: string;
  aircraftType?: string;
  ataChapter?: string;
  laborRate?: number;
  laborItems: LaborKitLaborItem[];
  requiredParts: LaborKitPartItem[];
  externalServices?: LaborKitExternalServiceItem[];
  isActive: boolean;
}

const LINE_TYPE_LABELS: Record<LineItemType, string> = {
  labor: "Labor",
  part: "Part",
  external_service: "External Service",
};

function calcTotal(qty: string, unitPrice: string): number {
  const q = parseFloat(qty);
  const p = parseFloat(unitPrice);
  if (isNaN(q) || isNaN(p)) return 0;
  return Math.round(q * p * 100) / 100;
}

function numberToInputString(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "0";
  return String(Math.round(value * 100) / 100);
}

function buildLineItemsFromLaborKit(kit: LaborKitForQuote): DraftLineItem[] {
  const lines: DraftLineItem[] = [];

  for (const labor of kit.laborItems ?? []) {
    if (!labor.description.trim() || labor.estimatedHours <= 0) continue;
    lines.push({
      id: crypto.randomUUID(),
      type: "labor",
      description: `${kit.name} · ${labor.description.trim()}`,
      qty: numberToInputString(labor.estimatedHours),
      unitPrice: numberToInputString(kit.laborRate),
    });
  }

  for (const part of kit.requiredParts ?? []) {
    if (!part.partNumber.trim() || part.quantity <= 0) continue;
    const partDesc = part.description?.trim() || "Part";
    lines.push({
      id: crypto.randomUUID(),
      type: "part",
      description: `${kit.name} · ${part.partNumber.trim()} — ${partDesc}`,
      qty: numberToInputString(part.quantity),
      unitPrice: numberToInputString(part.unitCost),
    });
  }

  for (const svc of kit.externalServices ?? []) {
    if (!svc.description.trim()) continue;
    const vendor = svc.vendorName?.trim();
    lines.push({
      id: crypto.randomUUID(),
      type: "external_service",
      description: `${kit.name} · ${svc.description.trim()}${vendor ? ` (${vendor})` : ""}`,
      qty: "1",
      unitPrice: numberToInputString(svc.estimatedCost),
    });
  }

  return lines;
}

export type QuoteNewEditorProps = {
  prefillWorkOrderId?: Id<"workOrders">;
  hideBackButton?: boolean;
  fullWidth?: boolean;
  onCancel?: () => void;
  onQuoteCreated?: (quoteId: Id<"quotes">) => void;
};

export function QuoteNewEditor({
  prefillWorkOrderId: prefillWorkOrderIdOverride,
  hideBackButton = false,
  fullWidth = false,
  onCancel,
  onQuoteCreated,
}: QuoteNewEditorProps = {}) {
  const router = useRouter();
  const { orgId, techId, isLoaded } = useCurrentOrg();
  const [searchParams] = useSearchParams();
  const prefillWorkOrderId = useMemo(() => {
    if (prefillWorkOrderIdOverride) return prefillWorkOrderIdOverride;
    const prefillWorkOrderIdParam = searchParams.get("workOrderId");
    return prefillWorkOrderIdParam
      ? (prefillWorkOrderIdParam as Id<"workOrders">)
      : undefined;
  }, [prefillWorkOrderIdOverride, searchParams]);

  const customers = useQuery(
    api.customers.listCustomers,
    orgId ? { orgId } : "skip",
  );
  const aircraft = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const laborKits = useQuery(
    api.laborKits.listLaborKits,
    orgId ? { orgId } : "skip",
  );
  const prefillWorkOrder = useQuery(
    api.workOrders.getWorkOrder,
    orgId && prefillWorkOrderId
      ? {
          workOrderId: prefillWorkOrderId,
          organizationId: orgId,
        }
      : "skip",
  );

  const createQuote = useMutation(api.billing.createQuote);
  const addQuoteLineItem = useMutation(api.billing.addQuoteLineItem);
  const computePrice = useAction(api.pricing.computePrice);

  const [customerId, setCustomerId] = useState<string>("");
  const [pricingLoading, setPricingLoading] = useState<string | null>(null);
  const [aircraftId, setAircraftId] = useState<string>("");
  const [kitSearch, setKitSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([
    { id: crypto.randomUUID(), type: "labor", description: "", qty: "1", unitPrice: "0" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading =
    !isLoaded ||
    customers === undefined ||
    aircraft === undefined ||
    laborKits === undefined ||
    (prefillWorkOrderId ? prefillWorkOrder === undefined : false);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "labor", description: "", qty: "1", unitPrice: "0" },
    ]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateLineItem = useCallback((id: string, field: keyof DraftLineItem, value: string) => {
    setLineItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, [field]: value } : item),
    );
  }, []);

  const addLaborKitLines = useCallback((kit: LaborKitForQuote) => {
    const generated = buildLineItemsFromLaborKit(kit);
    if (generated.length === 0) {
      setError(`"${kit.name}" has no valid labor/parts/service entries to add.`);
      return;
    }
    setError(null);
    setLineItems((prev) => [...prev, ...generated]);
  }, []);

  const lookupPrice = useCallback(async (itemId: string) => {
    if (!orgId) return;
    const item = lineItems.find((li) => li.id === itemId);
    if (!item) return;
    setPricingLoading(itemId);
    try {
      const result = await computePrice({
        orgId,
        customerId: customerId ? (customerId as Id<"customers">) : undefined,
        itemType: item.type,
        qty: parseFloat(item.qty) || 1,
        baseCost: parseFloat(item.unitPrice) || 0,
      });
      setLineItems((prev) =>
        prev.map((li) =>
          li.id === itemId ? { ...li, unitPrice: result.unitPrice.toString() } : li,
        ),
      );
    } catch {
      setError("Failed to compute price. Check pricing rules are configured.");
    } finally {
      setPricingLoading(null);
    }
  }, [orgId, customerId, lineItems, computePrice]);

  const lookupAllPrices = useCallback(async () => {
    if (!orgId) return;
    setPricingLoading("all");
    try {
      const updated = await Promise.all(
        lineItems.map(async (item) => {
          try {
            const result = await computePrice({
              orgId,
              customerId: customerId ? (customerId as Id<"customers">) : undefined,
              itemType: item.type,
              qty: parseFloat(item.qty) || 1,
              baseCost: parseFloat(item.unitPrice) || 0,
            });
            return { ...item, unitPrice: result.unitPrice.toString() };
          } catch {
            return item;
          }
        }),
      );
      setLineItems(updated);
    } finally {
      setPricingLoading(null);
    }
  }, [orgId, customerId, lineItems, computePrice]);

  const subtotal = lineItems.reduce((sum, item) => sum + calcTotal(item.qty, item.unitPrice), 0);

  const selectedAircraft = useMemo(
    () => (aircraft ?? []).find((ac) => ac._id === aircraftId),
    [aircraft, aircraftId],
  );

  useEffect(() => {
    if (!prefillWorkOrderId || !prefillWorkOrder?.workOrder) return;
    const wo = prefillWorkOrder.workOrder;
    if (!customerId && wo.customerId) {
      setCustomerId(String(wo.customerId));
    }
    if (!aircraftId && wo.aircraftId) {
      setAircraftId(String(wo.aircraftId));
    }
    if (!notes.trim()) {
      setNotes(`Quote started from scheduling for ${wo.workOrderNumber}.`);
    }
  }, [prefillWorkOrderId, prefillWorkOrder, customerId, aircraftId, notes]);

  useEffect(() => {
    if (!prefillWorkOrderId) return;
    if (prefillWorkOrder === null) {
      setError("Referenced work order was not found. Continue by selecting customer and aircraft.");
    }
  }, [prefillWorkOrderId, prefillWorkOrder]);

  const matchingLaborKits = useMemo(() => {
    const kits = ((laborKits ?? []) as LaborKitForQuote[]).filter((kit) => kit.isActive);
    const normalizedSearch = kitSearch.trim().toLowerCase();
    const aircraftTerms = selectedAircraft
      ? [selectedAircraft.make, selectedAircraft.model]
          .map((v) => v?.toLowerCase().trim())
          .filter((v): v is string => !!v)
      : [];

    return kits.filter((kit) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        kit.name.toLowerCase().includes(normalizedSearch) ||
        (kit.ataChapter ?? "").toLowerCase().includes(normalizedSearch) ||
        (kit.aircraftType ?? "").toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;

      const kitAircraft = (kit.aircraftType ?? "").toLowerCase().trim();
      if (!kitAircraft || aircraftTerms.length === 0) return true;

      return aircraftTerms.some(
        (term) => kitAircraft.includes(term) || term.includes(kitAircraft),
      );
    });
  }, [laborKits, kitSearch, selectedAircraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgId || !techId) { setError("Organization or technician not loaded."); return; }
    if (!customerId) { setError("Please select a customer."); return; }
    if (!aircraftId) { setError("Please select an aircraft."); return; }
    if (lineItems.length === 0) { setError("Add at least one line item."); return; }

    for (const item of lineItems) {
      if (!item.description.trim()) { setError("All line items require a description."); return; }
      if (isNaN(parseFloat(item.qty)) || parseFloat(item.qty) <= 0) {
        setError("All quantities must be positive numbers."); return;
      }
      if (isNaN(parseFloat(item.unitPrice)) || parseFloat(item.unitPrice) < 0) {
        setError("All unit prices must be non-negative."); return;
      }
    }

    setSubmitting(true);
    try {
      const quoteId = await createQuote({
        orgId,
        customerId: customerId as Id<"customers">,
        aircraftId: aircraftId as Id<"aircraft">,
        workOrderId: prefillWorkOrderId,
        createdByTechId: techId as Id<"technicians">,
        notes: notes.trim() || undefined,
      });

      for (const item of lineItems) {
        await addQuoteLineItem({
          orgId,
          quoteId,
          type: item.type,
          description: item.description.trim(),
          qty: parseFloat(item.qty),
          unitPrice: parseFloat(item.unitPrice),
        });
      }

      if (onQuoteCreated) {
        onQuoteCreated(quoteId);
      } else {
        router.push(`/billing/quotes/${quoteId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quote.");
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Card className="border-border/60">
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-5", fullWidth ? "max-w-none" : "max-w-3xl")}
      data-testid="quote-new-editor"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {!hideBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (onCancel ? onCancel() : router.back())}
            className="h-8 gap-1.5 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
        )}
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">New Quote</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {prefillWorkOrder?.workOrder
              ? `Create a DRAFT quote for ${prefillWorkOrder.workOrder.workOrderNumber}`
              : "Create a quote in DRAFT status"}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer & Aircraft */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quote Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-9 text-sm border-border/60">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers ?? []).map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}{c.companyName ? ` — ${c.companyName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Aircraft *</Label>
                <Select value={aircraftId} onValueChange={setAircraftId}>
                  <SelectTrigger className="h-9 text-sm border-border/60">
                    <SelectValue placeholder="Select aircraft" />
                  </SelectTrigger>
                  <SelectContent>
                    {(aircraft ?? []).map((ac) => (
                      <SelectItem key={ac._id} value={ac._id}>
                        {ac.currentRegistration} — {ac.make} {ac.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this quote..."
                className="text-sm border-border/60 resize-none h-20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Labor Kits */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                Labor Kits
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Reuse scheduler-style templates for labor, parts, and external services.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" asChild className="h-7 text-xs">
              <Link to="/billing/labor-kits">
                <Wrench className="w-3.5 h-3.5" />
                Manage Kits
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={kitSearch}
              onChange={(e) => setKitSearch(e.target.value)}
              placeholder="Search kits by name, ATA chapter, or aircraft type"
              className="h-8 text-xs border-border/60"
            />

            {matchingLaborKits.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
                No active labor kits match your filters.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-auto pr-1">
                {matchingLaborKits.map((kit) => {
                  const laborLines = kit.laborItems?.length ?? 0;
                  const partLines = kit.requiredParts?.length ?? 0;
                  const serviceLines = kit.externalServices?.length ?? 0;
                  const totalTemplateLines = laborLines + partLines + serviceLines;
                  return (
                    <div
                      key={kit._id}
                      className="rounded-md border border-border/60 px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground truncate">{kit.name}</p>
                          {kit.aircraftType && (
                            <Badge variant="outline" className="text-[10px]">
                              {kit.aircraftType}
                            </Badge>
                          )}
                          {kit.ataChapter && (
                            <Badge variant="outline" className="text-[10px]">
                              ATA {kit.ataChapter}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {totalTemplateLines} template line{totalTemplateLines === 1 ? "" : "s"} •{" "}
                          {kit.laborItems.reduce((sum, item) => sum + (item.estimatedHours || 0), 0).toFixed(1)}h
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addLaborKitLines(kit)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Kit Lines
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Line Items</CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={lookupAllPrices}
                disabled={pricingLoading !== null || lineItems.length === 0 || !orgId}
                className="h-7 text-xs gap-1.5"
              >
                {pricingLoading === "all" ? "Computing…" : "Apply Pricing Rules"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="h-7 text-xs gap-1.5">
                <Plus className="w-3 h-3" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lineItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No line items yet. Add one above.</p>
            ) : (
              <>
                {/* Header */}
                <div className="overflow-x-auto"><div className="min-w-[600px]"><div className="grid grid-cols-[1fr_120px_90px_100px_72px_36px] gap-2 px-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Description</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Type</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase text-right">Qty</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase text-right">Unit $</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase text-center">Rule</span>
                  <span />
                </div>

                {lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_120px_90px_100px_72px_36px] gap-2 items-center">
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      placeholder="Description"
                      className="h-8 text-xs border-border/60"
                    />
                    <Select
                      value={item.type}
                      onValueChange={(v) => updateLineItem(item.id, "type", v)}
                    >
                      <SelectTrigger className="h-8 text-xs border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(LINE_TYPE_LABELS) as [LineItemType, string][]).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={item.qty}
                      onChange={(e) => updateLineItem(item.id, "qty", e.target.value)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="h-8 text-xs border-border/60 text-right"
                    />
                    <Input
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, "unitPrice", e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8 text-xs border-border/60 text-right"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[10px]"
                      onClick={() => lookupPrice(item.id)}
                      disabled={pricingLoading === item.id || pricingLoading === "all" || !orgId}
                    >
                      {pricingLoading === item.id ? "..." : "Rule"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                </div></div>

                {/* Subtotal */}
                <div className="flex justify-end pt-2 border-t border-border/40">
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-8 text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-medium text-foreground w-24 text-right">
                        ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Quote will be saved as DRAFT</span>
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-muted-foreground/30">
              DRAFT
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (onCancel ? onCancel() : router.back())}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Creating..." : "Create Quote"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
