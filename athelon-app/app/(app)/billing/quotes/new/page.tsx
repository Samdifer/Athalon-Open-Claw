"use client";

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Trash2,
  ArrowLeft,
  FileText,
  AlertCircle,
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

type LineItemType = "labor" | "part" | "external_service";

interface DraftLineItem {
  id: string;
  type: LineItemType;
  description: string;
  qty: string;
  unitPrice: string;
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

export default function NewQuotePage() {
  const navigate = useNavigate();
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const customers = useQuery(
    api.customers.listCustomers,
    orgId ? { orgId } : "skip",
  );
  const aircraft = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const createQuote = useMutation(api.billing.createQuote);
  const addQuoteLineItem = useMutation(api.billing.addQuoteLineItem);

  const [customerId, setCustomerId] = useState<string>("");
  const [aircraftId, setAircraftId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([
    { id: crypto.randomUUID(), type: "labor", description: "", qty: "1", unitPrice: "0" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = !isLoaded || customers === undefined || aircraft === undefined;

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

  const subtotal = lineItems.reduce((sum, item) => sum + calcTotal(item.qty, item.unitPrice), 0);

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

      navigate(`/billing/quotes/${quoteId}`);
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
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 gap-1.5 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Quote</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Create a quote in DRAFT status</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
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

        {/* Line Items */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="h-7 text-xs gap-1.5">
              <Plus className="w-3 h-3" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lineItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No line items yet. Add one above.</p>
            ) : (
              <>
                {/* Header */}
                <div className="grid grid-cols-[1fr_120px_100px_100px_36px] gap-2 px-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Description</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Type</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase text-right">Qty</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase text-right">Unit $</span>
                  <span />
                </div>

                {lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_120px_100px_100px_36px] gap-2 items-center">
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
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Quote will be saved as DRAFT</span>
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-muted-foreground/30">
              DRAFT
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(-1)}>
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
