"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  AlertCircle,
  Receipt,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function NewInvoicePage() {
  const router = useRouter();
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const { results: workOrders, status: woStatus } = usePaginatedQuery(
    api.workOrders.listWorkOrders,
    orgId ? { organizationId: orgId } : "skip",
    { initialNumItems: 100 },
  );

  const customers = useQuery(
    api.customers.listCustomers,
    orgId ? { orgId } : "skip",
  );

  const createInvoiceFromWorkOrder = useMutation(api.billing.createInvoiceFromWorkOrder);
  const createInvoiceManual = useMutation(api.billing.createInvoiceManual);

  const [mode, setMode] = useState<"from_wo" | "manual">("from_wo");
  const [workOrderId, setWorkOrderId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = !isLoaded || woStatus === "LoadingFirstPage" || customers === undefined;

  const closedWorkOrders = (workOrders ?? []).filter((wo) => wo.status === "closed");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!orgId || !techId) { setError("Organization not loaded."); return; }

    setSubmitting(true);
    try {
      let invoiceId: Id<"invoices">;

      if (mode === "from_wo") {
        if (!workOrderId) { setError("Please select a work order."); setSubmitting(false); return; }
        const wo = closedWorkOrders.find((w) => w._id === workOrderId);
        if (!wo?.customerId) { setError("Selected work order has no customer assigned."); setSubmitting(false); return; }
        invoiceId = await createInvoiceFromWorkOrder({
          orgId,
          workOrderId: workOrderId as Id<"workOrders">,
          customerId: wo.customerId as Id<"customers">,
          createdByTechId: techId as Id<"technicians">,
        });
      } else {
        if (!customerId) { setError("Please select a customer."); setSubmitting(false); return; }
        invoiceId = await createInvoiceManual({
          orgId,
          customerId: customerId as Id<"customers">,
          createdByTechId: techId as Id<"technicians">,
        });
      }

      router.push(`/billing/invoices/${invoiceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
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
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 gap-1.5 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Invoice</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Generate from a closed work order or create manually</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mode selector */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Invoice Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("from_wo")}
                className={`p-4 rounded-lg border text-left transition-all ${
                  mode === "from_wo"
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">From Work Order</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-populate labor from time entries
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`p-4 rounded-lg border text-left transition-all ${
                  mode === "manual"
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Manual Invoice</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Start blank — add line items manually
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Work Order Selection */}
        {mode === "from_wo" && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Select Work Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {closedWorkOrders.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No closed work orders found.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    A work order must be closed before an invoice can be generated.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Closed Work Order *</Label>
                  <Select value={workOrderId} onValueChange={setWorkOrderId}>
                    <SelectTrigger className="h-9 text-sm border-border/60">
                      <SelectValue placeholder="Select work order" />
                    </SelectTrigger>
                    <SelectContent>
                      {closedWorkOrders.map((wo) => (
                        <SelectItem key={wo._id} value={wo._id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{wo.workOrderNumber}</span>
                            <span className="text-xs text-muted-foreground">—</span>
                            <span className="text-xs">{wo.description.slice(0, 40)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Labor line items will be auto-populated from time clock entries.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual Customer Selection */}
        {mode === "manual" && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        <Card className="border-border/60 bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Invoice will be created as{" "}
                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-muted-foreground/30 mx-1">
                  DRAFT
                </Badge>
                — you can add line items and send later.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
