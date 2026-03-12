"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  ArrowLeft,
  Settings,
  AlertCircle,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuoteBuilderLeftSidebar } from "./QuoteBuilderLeftSidebar";
import { QuoteBuilderCenter } from "./QuoteBuilderCenter";
import { QuoteProfitabilityPanel } from "./QuoteProfitabilityPanel";
import { QuoteBuilderSettingsDialog } from "./QuoteBuilderSettingsDialog";
import type {
  BuilderLineItem,
  ShopSettingsData,
} from "./types";
import { DEFAULT_SHOP_SETTINGS } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISODate(unix: number | undefined): string {
  if (!unix) return "";
  return new Date(unix).toISOString().split("T")[0];
}

function fromISODate(iso: string): number | undefined {
  if (!iso) return undefined;
  return new Date(iso).getTime();
}

function calcDeadline(startDate: string, totalHours: number): string {
  if (!startDate || totalHours <= 0) return "";
  const start = new Date(startDate);
  const workingDays = Math.ceil(totalHours / 8) + 5;
  let added = 0;
  const cursor = new Date(start);
  while (added < workingDays) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return cursor.toISOString().split("T")[0];
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface LaborKitForBuilder {
  _id: string;
  name: string;
  aircraftType?: string;
  ataChapter?: string;
  laborRate?: number;
  laborItems: Array<{ description: string; estimatedHours: number }>;
  requiredParts: Array<{ partNumber: string; description: string; quantity: number; unitCost?: number }>;
  externalServices?: Array<{ vendorName?: string; description: string; estimatedCost: number }>;
  isActive: boolean;
}

export interface QuoteBuilderLayoutProps {
  mode: "new" | "detail";
  quoteId?: Id<"quotes">;
  prefillWorkOrderId?: Id<"workOrders">;
  prefillCustomerId?: string;
  onBack: () => void;
  onQuoteCreated?: (quoteId: Id<"quotes">) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuoteBuilderLayout({
  mode,
  quoteId,
  prefillWorkOrderId,
  prefillCustomerId,
  onBack,
  onQuoteCreated,
}: QuoteBuilderLayoutProps) {
  const { orgId, techId } = useCurrentOrg();

  // ─── Data queries ────────────────────────────────────────────────────────
  const customers = useQuery(api.customers.listCustomers, orgId ? { orgId } : "skip");
  const aircraft = useQuery(api.aircraft.list, orgId ? { organizationId: orgId } : "skip");
  const laborKitsRaw = useQuery(api.laborKits.listLaborKits, orgId ? { orgId } : "skip");
  const templates = useQuery(api.quoteTemplates.list, orgId ? { orgId } : "skip");
  const shopSettingsRaw = useQuery(api.shopSettings.getShopSettings, orgId ? { orgId } : "skip");
  const existingQuote = useQuery(
    api.billing.getQuote,
    orgId && quoteId ? { orgId, quoteId } : "skip",
  );
  const prefillWO = useQuery(
    api.workOrders.getWorkOrder,
    orgId && prefillWorkOrderId
      ? { workOrderId: prefillWorkOrderId, organizationId: orgId }
      : "skip",
  );

  // ─── Mutations ───────────────────────────────────────────────────────────
  const createQuote = useMutation(api.billing.createQuote);
  const addQuoteLineItem = useMutation(api.billing.addQuoteLineItem);
  const removeQuoteLineItemMut = useMutation(api.billing.removeQuoteLineItem);
  const updateMetadata = useMutation(api.billing.updateQuoteMetadata);
  const reorderLineItems = useMutation(api.quoteEnhancements.reorderLineItems);
  const updateLineEconomics = useMutation(api.quoteEnhancements.updateLineEconomics);
  const insertTemplate = useMutation(api.quoteTemplates.insertIntoQuote);

  // ─── Shop settings ──────────────────────────────────────────────────────
  const shopSettings: ShopSettingsData = useMemo(
    () => (shopSettingsRaw ? {
      shopRate: shopSettingsRaw.shopRate,
      averageHourlyCost: shopSettingsRaw.averageHourlyCost,
      partMarkupTiers: shopSettingsRaw.partMarkupTiers,
      serviceMarkupTiers: shopSettingsRaw.serviceMarkupTiers,
    } : DEFAULT_SHOP_SETTINGS),
    [shopSettingsRaw],
  );

  // ─── Draft state ─────────────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState("");
  const [aircraftId, setAircraftId] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [priority, setPriority] = useState<"routine" | "urgent" | "aog">("routine");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<BuilderLineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const initialStateRef = useRef<string>("");

  // ─── Prefill from WO or existing quote ───────────────────────────────────
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;

    if (mode === "detail" && existingQuote) {
      setCustomerId(String(existingQuote.customerId));
      setAircraftId(String(existingQuote.aircraftId));
      setProjectTitle(existingQuote.projectTitle ?? "");
      setPriority(existingQuote.priority ?? "routine");
      setStartDate(toISODate(existingQuote.requestedStartDate));
      setEndDate(toISODate(existingQuote.requestedEndDate));
      setNotes(existingQuote.notes ?? "");
      setLineItems(
        (existingQuote.lineItems ?? []).map((li) => ({
          id: String(li._id),
          type: li.type,
          description: li.description,
          qty: li.qty,
          unitPrice: li.unitPrice,
          total: li.total,
          directCost: li.directCost,
          markupMultiplier: li.markupMultiplier,
          fixedPriceOverride: li.fixedPriceOverride,
          pricingMode: li.pricingMode,
          isMarkupOverride: li.isMarkupOverride,
          sortOrder: li.sortOrder,
        })),
      );
      prefilled.current = true;
    } else if (mode === "new") {
      if (prefillWO?.workOrder) {
        const wo = prefillWO.workOrder;
        if (wo.customerId) setCustomerId(String(wo.customerId));
        if (wo.aircraftId) setAircraftId(String(wo.aircraftId));
        setNotes(`Quote started from ${wo.workOrderNumber}.`);
      } else if (prefillCustomerId) {
        setCustomerId(prefillCustomerId);
      }
      prefilled.current = true;
    }
  }, [mode, existingQuote, prefillWO, prefillCustomerId]);

  // Snapshot initial state for dirty detection
  useEffect(() => {
    if (prefilled.current && !initialStateRef.current) {
      initialStateRef.current = JSON.stringify({
        customerId, aircraftId, projectTitle, priority, startDate, endDate, notes,
        lineItems: lineItems.map((li) => ({ ...li })),
      });
    }
  }, [customerId, aircraftId, projectTitle, priority, startDate, endDate, notes, lineItems]);

  const isDirty = useMemo(() => {
    if (!initialStateRef.current) return false;
    const current = JSON.stringify({
      customerId, aircraftId, projectTitle, priority, startDate, endDate, notes,
      lineItems: lineItems.map((li) => ({ ...li })),
    });
    return current !== initialStateRef.current;
  }, [customerId, aircraftId, projectTitle, priority, startDate, endDate, notes, lineItems]);

  // ─── Line item actions ───────────────────────────────────────────────────
  const handleAddItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "labor",
        description: "",
        qty: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  }, []);

  const handleRemoveItem = useCallback(
    async (id: string) => {
      if (mode === "detail" && quoteId && orgId) {
        try {
          await removeQuoteLineItemMut({ orgId, lineItemId: id as Id<"quoteLineItems"> });
        } catch {
          // Continue with local removal
        }
      }
      setLineItems((prev) => prev.filter((li) => li.id !== id));
    },
    [mode, quoteId, orgId, removeQuoteLineItemMut],
  );

  const handleUpdateItem = useCallback(
    async (id: string, updates: Partial<BuilderLineItem>) => {
      setLineItems((prev) =>
        prev.map((li) => {
          if (li.id !== id) return li;
          const updated = { ...li, ...updates };
          // Recalculate total
          if (updated.pricingMode === "override" && updated.fixedPriceOverride !== undefined) {
            updated.unitPrice = updated.fixedPriceOverride;
          } else if (updated.pricingMode === "derived" && updated.directCost !== undefined && updated.markupMultiplier !== undefined) {
            updated.unitPrice = updated.directCost * updated.markupMultiplier;
          }
          updated.total = Math.round(updated.qty * updated.unitPrice * 100) / 100;
          return updated;
        }),
      );

      // Persist to backend for saved quotes
      if (mode === "detail" && quoteId) {
        const hasEconomics = updates.directCost !== undefined ||
          updates.markupMultiplier !== undefined ||
          updates.fixedPriceOverride !== undefined ||
          updates.pricingMode !== undefined ||
          updates.isMarkupOverride !== undefined;
        if (hasEconomics) {
          try {
            await updateLineEconomics({
              lineItemId: id as Id<"quoteLineItems">,
              directCost: updates.directCost,
              markupMultiplier: updates.markupMultiplier,
              fixedPriceOverride: updates.fixedPriceOverride,
              pricingMode: updates.pricingMode,
              isMarkupOverride: updates.isMarkupOverride,
            });
          } catch {
            // Local state already updated
          }
        }
      }
    },
    [mode, quoteId, updateLineEconomics],
  );

  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      setLineItems((prev) => {
        const map = new Map(prev.map((li) => [li.id, li]));
        return orderedIds.map((id, i) => {
          const item = map.get(id);
          if (!item) return prev[i];
          return { ...item, sortOrder: i + 1 };
        });
      });
      if (mode === "detail" && quoteId) {
        try {
          await reorderLineItems({
            quoteId,
            orderedIds: orderedIds as Id<"quoteLineItems">[],
          });
        } catch {
          // Local state already updated
        }
      }
    },
    [mode, quoteId, reorderLineItems],
  );

  // ─── Template / labor kit insertion ──────────────────────────────────────
  const handleAddTemplate = useCallback(
    async (templateId: string) => {
      if (mode === "detail" && quoteId && orgId) {
        try {
          await insertTemplate({
            orgId,
            quoteId,
            templateId: templateId as Id<"quoteTemplates">,
          });
        } catch {
          setError("Failed to insert template.");
        }
        return;
      }
      // For new quotes, add lines locally
      const tmpl = (templates ?? []).find((t) => String(t._id) === templateId);
      if (!tmpl) return;
      const newLines: BuilderLineItem[] = tmpl.lineItems.map((li) => ({
        id: crypto.randomUUID(),
        type: li.type,
        description: li.description,
        qty: li.qty,
        unitPrice: li.unitPrice,
        total: Math.round(li.qty * li.unitPrice * 100) / 100,
        directCost: li.directCost,
        markupMultiplier: li.markupMultiplier,
        pricingMode: "derived" as const,
      }));
      setLineItems((prev) => [...prev, ...newLines]);
    },
    [mode, quoteId, orgId, templates, insertTemplate],
  );

  const handleAddLaborKit = useCallback(
    (kitId: string) => {
      const kits = (laborKitsRaw ?? []) as LaborKitForBuilder[];
      const kit = kits.find((k) => String(k._id) === kitId);
      if (!kit) return;
      const newLines: BuilderLineItem[] = [];
      for (const labor of kit.laborItems ?? []) {
        if (!labor.description.trim() || labor.estimatedHours <= 0) continue;
        const rate = kit.laborRate ?? shopSettings.shopRate;
        newLines.push({
          id: crypto.randomUUID(),
          type: "labor",
          description: `${kit.name} · ${labor.description.trim()}`,
          qty: labor.estimatedHours,
          unitPrice: rate,
          total: Math.round(labor.estimatedHours * rate * 100) / 100,
        });
      }
      for (const part of kit.requiredParts ?? []) {
        if (!part.partNumber.trim() || part.quantity <= 0) continue;
        newLines.push({
          id: crypto.randomUUID(),
          type: "part",
          description: `${kit.name} · ${part.partNumber.trim()} — ${part.description?.trim() || "Part"}`,
          qty: part.quantity,
          unitPrice: part.unitCost ?? 0,
          total: Math.round(part.quantity * (part.unitCost ?? 0) * 100) / 100,
        });
      }
      for (const svc of kit.externalServices ?? []) {
        if (!svc.description.trim()) continue;
        newLines.push({
          id: crypto.randomUUID(),
          type: "external_service",
          description: `${kit.name} · ${svc.description.trim()}${svc.vendorName ? ` (${svc.vendorName})` : ""}`,
          qty: 1,
          unitPrice: svc.estimatedCost,
          total: svc.estimatedCost,
        });
      }
      if (newLines.length === 0) {
        setError(`"${kit.name}" has no valid line items to add.`);
        return;
      }
      setLineItems((prev) => [...prev, ...newLines]);
    },
    [laborKitsRaw, shopSettings.shopRate],
  );

  // ─── Computed values ─────────────────────────────────────────────────────
  const totalHours = useMemo(
    () => lineItems.filter((li) => li.type === "labor").reduce((s, li) => s + li.qty, 0),
    [lineItems],
  );

  const totalValue = useMemo(
    () => lineItems.reduce((s, li) => s + li.total, 0),
    [lineItems],
  );

  const selectedAircraftModel = useMemo(
    () => (aircraft ?? []).find((a) => String(a._id) === aircraftId)?.model,
    [aircraft, aircraftId],
  );

  // ─── Submit (new quote) ──────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!orgId || !techId) { setError("Organization or technician not loaded."); return; }
    if (!customerId) { setError("Please select a customer."); return; }
    if (!aircraftId) { setError("Please select an aircraft."); return; }
    if (lineItems.length === 0) { setError("Add at least one line item."); return; }

    for (const item of lineItems) {
      if (!item.description.trim()) { setError("All line items require a description."); return; }
      if (item.qty <= 0) { setError("All quantities must be positive."); return; }
      if (item.unitPrice < 0) { setError("Unit prices cannot be negative."); return; }
    }

    setSubmitting(true);
    setError(null);
    try {
      const newQuoteId = await createQuote({
        orgId,
        customerId: customerId as Id<"customers">,
        aircraftId: aircraftId as Id<"aircraft">,
        workOrderId: prefillWorkOrderId,
        createdByTechId: techId as Id<"technicians">,
        notes: notes.trim() || undefined,
        projectTitle: projectTitle.trim() || undefined,
        priority,
        requestedStartDate: fromISODate(startDate),
        requestedEndDate: fromISODate(endDate),
      });

      for (const item of lineItems) {
        await addQuoteLineItem({
          orgId,
          quoteId: newQuoteId,
          type: item.type,
          description: item.description.trim(),
          qty: item.qty,
          unitPrice: item.unitPrice,
        });
      }

      toast.success("Quote created successfully", {
        action: { label: "View Quote", onClick: () => {} },
      });

      if (onQuoteCreated) {
        onQuoteCreated(newQuoteId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quote.");
    } finally {
      setSubmitting(false);
    }
  }, [
    orgId, techId, customerId, aircraftId, lineItems, prefillWorkOrderId,
    notes, projectTitle, priority, startDate, endDate,
    createQuote, addQuoteLineItem, onQuoteCreated,
  ]);

  // ─── Save metadata (detail mode) ────────────────────────────────────────
  const handleSaveMetadata = useCallback(async () => {
    if (!orgId || !quoteId) return;
    try {
      await updateMetadata({
        orgId,
        quoteId,
        projectTitle: projectTitle.trim() || undefined,
        priority,
        requestedStartDate: fromISODate(startDate),
        requestedEndDate: fromISODate(endDate),
        notes: notes.trim() || undefined,
      });
      toast.success("Quote metadata saved.");
      initialStateRef.current = JSON.stringify({
        customerId, aircraftId, projectTitle, priority, startDate, endDate, notes,
        lineItems: lineItems.map((li) => ({ ...li })),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save metadata.");
    }
  }, [orgId, quoteId, projectTitle, priority, startDate, endDate, notes, updateMetadata, customerId, aircraftId, lineItems]);

  // ─── Back with unsaved check ─────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (isDirty) {
      setUnsavedDialogOpen(true);
    } else {
      onBack();
    }
  }, [isDirty, onBack]);

  const handleDeadlineSuggestion = useCallback(
    (dateStr: string) => setEndDate(dateStr),
    [],
  );

  // ─── Loading ─────────────────────────────────────────────────────────────
  const isLoading =
    customers === undefined ||
    aircraft === undefined ||
    laborKitsRaw === undefined ||
    templates === undefined ||
    shopSettingsRaw === undefined ||
    (mode === "detail" && existingQuote === undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-sm text-muted-foreground">
        Loading quote builder...
      </div>
    );
  }

  const quoteNumber = mode === "detail" && existingQuote ? existingQuote.quoteNumber : undefined;
  const quoteStatus = mode === "detail" && existingQuote ? existingQuote.status : "DRAFT";
  const isEditable = quoteStatus === "DRAFT";

  return (
    <div className="flex flex-col h-full min-h-[620px]" data-testid="quote-builder-layout">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">
                {quoteNumber ? `${quoteNumber}` : "New Quote"}
                {projectTitle ? ` — ${projectTitle}` : ""}
              </p>
              <Badge variant="outline" className="text-[10px]">{quoteStatus}</Badge>
              {isDirty && (
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold tabular-nums">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setSettingsDialogOpen(true)}
            title="Template Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setRightPanelOpen((v) => !v)}
            title={rightPanelOpen ? "Hide profitability" : "Show profitability"}
          >
            {rightPanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </Button>
          {mode === "new" ? (
            <Button size="sm" disabled={submitting} onClick={handleSubmit} className="h-8 text-xs">
              {submitting ? "Creating..." : "Create Quote"}
            </Button>
          ) : isEditable ? (
            <Button size="sm" onClick={handleSaveMetadata} className="h-8 text-xs">
              Save
            </Button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 mb-3">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* 3-panel layout */}
      <div className="flex-1 min-h-0 grid gap-3" style={{
        gridTemplateColumns: rightPanelOpen
          ? "280px minmax(0, 1fr) 280px"
          : "280px minmax(0, 1fr)",
      }}>
        {/* Left sidebar */}
        <aside className="min-h-0 overflow-y-auto rounded-xl border border-border/50 bg-card p-3 hidden lg:block">
          <QuoteBuilderLeftSidebar
            customerId={customerId}
            aircraftId={aircraftId}
            onCustomerChange={setCustomerId}
            onAircraftChange={setAircraftId}
            customers={(customers ?? []).map((c) => ({ _id: String(c._id), name: c.name, companyName: c.companyName }))}
            aircraft={(aircraft ?? []).map((a) => ({ _id: String(a._id), currentRegistration: a.currentRegistration, make: a.make, model: a.model }))}
            projectTitle={projectTitle}
            onProjectTitleChange={setProjectTitle}
            priority={priority}
            onPriorityChange={setPriority}
            requestedStartDate={startDate}
            onStartDateChange={setStartDate}
            requestedEndDate={endDate}
            onEndDateChange={setEndDate}
            notes={notes}
            onNotesChange={setNotes}
            totalHours={totalHours}
            onApplyDeadlineSuggestion={handleDeadlineSuggestion}
            templates={(templates ?? []).map((t) => ({
              _id: String(t._id),
              name: t.name,
              aircraftTypeFilter: t.aircraftTypeFilter,
              lineItems: t.lineItems,
              isActive: t.isActive,
            }))}
            laborKits={((laborKitsRaw ?? []) as LaborKitForBuilder[]).filter((k) => k.isActive).map((k) => ({
              _id: String(k._id),
              name: k.name,
              aircraftType: k.aircraftType,
              ataChapter: k.ataChapter,
              laborItems: k.laborItems ?? [],
              requiredParts: k.requiredParts ?? [],
              externalServices: k.externalServices,
              isActive: k.isActive,
            }))}
            selectedAircraftModel={selectedAircraftModel}
            onAddTemplate={handleAddTemplate}
            onAddLaborKit={handleAddLaborKit}
            onOpenTemplateSettings={() => setSettingsDialogOpen(true)}
          />
        </aside>

        {/* Center panel */}
        <section className="min-h-0 overflow-y-auto">
          <QuoteBuilderCenter
            lineItems={lineItems}
            shopRate={shopSettings.shopRate}
            partMarkupTiers={shopSettings.partMarkupTiers}
            serviceMarkupTiers={shopSettings.serviceMarkupTiers}
            isDraft={isEditable}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onUpdateItem={handleUpdateItem}
            onReorder={handleReorder}
          />
        </section>

        {/* Right sidebar — profitability */}
        {rightPanelOpen && (
          <aside className="min-h-0 overflow-y-auto rounded-xl border border-border/50 bg-card p-3 hidden lg:block">
            <QuoteProfitabilityPanel
              lineItems={lineItems}
              shopRate={shopSettings.shopRate}
              averageHourlyCost={shopSettings.averageHourlyCost}
            />
          </aside>
        )}
      </div>

      {/* Template settings dialog */}
      <QuoteBuilderSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />

      {/* Unsaved changes dialog */}
      <Dialog open={unsavedDialogOpen} onOpenChange={setUnsavedDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setUnsavedDialogOpen(false)}>
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setUnsavedDialogOpen(false);
                onBack();
              }}
            >
              Discard
            </Button>
            {mode === "detail" && (
              <Button
                size="sm"
                onClick={async () => {
                  await handleSaveMetadata();
                  setUnsavedDialogOpen(false);
                  onBack();
                }}
              >
                Save & Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
