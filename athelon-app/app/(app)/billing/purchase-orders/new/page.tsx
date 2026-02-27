"use client";

import { useState, useCallback } from "react";
import { useRouter } from "@/hooks/useRouter";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { Plus, Trash2, ArrowLeft, AlertCircle, ShoppingCart } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface DraftLineItem {
  id: string;
  description: string;
  qty: string;
  unitPrice: string;
}

function calcTotal(qty: string, unitPrice: string): number {
  const q = parseFloat(qty);
  const p = parseFloat(unitPrice);
  if (isNaN(q) || isNaN(p)) return 0;
  return Math.round(q * p * 100) / 100;
}

export default function NewPOPage() {
  const router = useRouter();
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const vendors = useQuery(
    api.vendors.listVendors,
    orgId ? { orgId, isApproved: true } : "skip",
  );

  const createPO = useMutation(api.billing.createPurchaseOrder);
  const addPOLineItem = useMutation(api.billing.addPOLineItem);

  const [vendorId, setVendorId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([
    { id: crypto.randomUUID(), description: "", qty: "1", unitPrice: "0" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = !isLoaded || vendors === undefined;

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, { id: crypto.randomUUID(), description: "", qty: "1", unitPrice: "0" }]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateLineItem = useCallback((id: string, field: keyof DraftLineItem, value: string) => {
    setLineItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  const subtotal = lineItems.reduce((sum, item) => sum + calcTotal(item.qty, item.unitPrice), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!orgId || !techId) { setError("Organization not loaded."); return; }
    if (!vendorId) { setError("Please select a vendor."); return; }
    if (lineItems.length === 0) { setError("Add at least one line item."); return; }

    for (const item of lineItems) {
      if (!item.description.trim()) { setError("All line items require a description."); return; }
      if (isNaN(parseFloat(item.qty)) || parseFloat(item.qty) <= 0) { setError("All quantities must be positive."); return; }
      if (isNaN(parseFloat(item.unitPrice)) || parseFloat(item.unitPrice) < 0) { setError("Unit prices must be non-negative."); return; }
    }

    setSubmitting(true);
    try {
      const poId = await createPO({
        orgId,
        vendorId: vendorId as Id<"vendors">,
        requestedByTechId: techId as Id<"technicians">,
        notes: notes.trim() || undefined,
      });

      for (const item of lineItems) {
        await addPOLineItem({
          orgId,
          purchaseOrderId: poId,
          description: item.description.trim(),
          qty: parseFloat(item.qty),
          unitPrice: parseFloat(item.unitPrice),
        });
      }

      router.push(`/billing/purchase-orders/${poId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create PO.");
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Card className="border-border/60"><CardContent className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 gap-1.5 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Purchase Order</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Create a PO for an approved vendor</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {(vendors ?? []).length === 0 && !isLoading && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          No approved vendors found. Approve a vendor before creating a PO.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">PO Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Approved Vendor *</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger className="h-9 text-sm border-border/60">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {(vendors ?? []).map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name}
                      <span className="text-xs text-muted-foreground ml-2 capitalize">({v.type.replace("_", " ")})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="text-sm border-border/60 resize-none h-16"
              />
            </div>
          </CardContent>
        </Card>

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
              <p className="text-xs text-muted-foreground text-center py-4">No line items. Add one above.</p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_100px_100px_36px] gap-2 px-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Description / Part</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase text-right">Qty</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase text-right">Unit $</span>
                  <span />
                </div>
                {lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_100px_100px_36px] gap-2 items-center">
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      placeholder="Part number / description"
                      className="h-8 text-xs border-border/60"
                    />
                    <Input
                      value={item.qty}
                      onChange={(e) => updateLineItem(item.id, "qty", e.target.value)}
                      type="number" min="1" step="1"
                      className="h-8 text-xs border-border/60 text-right"
                    />
                    <Input
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, "unitPrice", e.target.value)}
                      type="number" min="0" step="0.01"
                      className="h-8 text-xs border-border/60 text-right"
                    />
                    <Button
                      type="button" variant="ghost" size="icon"
                      onClick={() => removeLineItem(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-end pt-2 border-t border-border/40">
                  <div className="flex items-center gap-8 text-xs">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold w-24 text-right">
                      ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">PO will be saved as</span>
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-muted-foreground/30">DRAFT</Badge>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Creating..." : "Create PO"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
