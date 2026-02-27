"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/hooks/useRouter";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  AlertCircle,
  Receipt,
  Clock,
  Briefcase,
  CheckCircle2,
  Package,
  Timer,
  Wrench,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";

// ─── Work Summary Panel ───────────────────────────────────────────────────────

function WorkSummaryPanel({
  workOrderId,
  orgId,
}: {
  workOrderId: Id<"workOrders">;
  orgId: Id<"organizations">;
}) {
  const summary = useQuery(api.gapFixes.getWorkOrderSummaryForBilling, {
    workOrderId,
    orgId,
  });

  if (summary === undefined) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            Work Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          Work Summary
          <Badge
            variant="outline"
            className="ml-auto text-[10px] text-primary border-primary/30"
          >
            {summary.workOrder.workOrderNumber}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-md bg-background/60 border border-border/40">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <p className="text-[10px] text-muted-foreground">Task Cards</p>
            </div>
            <p className="text-lg font-bold text-foreground">
              {summary.completedCards}
              <span className="text-xs font-normal text-muted-foreground">
                /{summary.taskCardCount}
              </span>
            </p>
          </div>

          <div className="text-center p-2 rounded-md bg-background/60 border border-border/40">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <p className="text-[10px] text-muted-foreground">Discrepancies</p>
            </div>
            <p className="text-lg font-bold text-foreground">
              {summary.resolvedDiscrepancies}
              <span className="text-xs font-normal text-muted-foreground">
                /{summary.discrepancyCount}
              </span>
            </p>
          </div>

          <div className="text-center p-2 rounded-md bg-background/60 border border-border/40">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Timer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <p className="text-[10px] text-muted-foreground">Labor Hours</p>
            </div>
            <p className="text-lg font-bold text-foreground font-mono">
              {summary.laborHours}h
            </p>
          </div>

          <div className="text-center p-2 rounded-md bg-background/60 border border-border/40">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Package className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <p className="text-[10px] text-muted-foreground">Parts</p>
            </div>
            <p className="text-lg font-bold text-foreground">
              {summary.partsInstalled.length}
            </p>
          </div>
        </div>

        {/* Parts list */}
        {summary.partsInstalled.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Wrench className="w-3 h-3" />
              Parts Installed
            </p>
            <div className="rounded-md border border-border/40 overflow-hidden">
              {summary.partsInstalled.map((p, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="opacity-30" />}
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-muted-foreground truncate flex-1">
                      {p.partNumber} — {p.description}
                    </span>
                    <Badge
                      variant="secondary"
                      className="ml-2 text-[10px] shrink-0"
                    >
                      qty {p.quantity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter();
  const [searchParams] = useSearchParams();
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

  const createInvoiceFromWorkOrder = useMutation(
    api.billing.createInvoiceFromWorkOrder,
  );
  const createInvoiceManual = useMutation(api.billing.createInvoiceManual);
  const createInvoiceEnhanced = useMutation(
    api.gapFixes.createInvoiceFromWorkOrderEnhanced,
  );

  const [mode, setMode] = useState<"from_wo" | "manual">("from_wo");
  const [workOrderId, setWorkOrderId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [laborRate, setLaborRate] = useState<number>(125);
  const [dueDate, setDueDate] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [useEnhanced, setUseEnhanced] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill workOrderId from query param
  useEffect(() => {
    const woParam = searchParams.get("workOrderId");
    if (woParam) {
      setWorkOrderId(woParam);
      setMode("from_wo");
    }
  }, [searchParams]);

  const isLoading =
    !isLoaded || woStatus === "LoadingFirstPage" || customers === undefined;

  const closedWorkOrders = (workOrders ?? []).filter(
    (wo) => wo.status === "closed",
  );
  const allWorkOrders = workOrders ?? [];

  const selectedWo =
    useEnhanced
      ? allWorkOrders.find((w) => w._id === workOrderId)
      : closedWorkOrders.find((w) => w._id === workOrderId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!orgId || !techId) {
      setError("Organization not loaded.");
      return;
    }

    setSubmitting(true);
    try {
      let invoiceId: Id<"invoices">;

      if (mode === "from_wo" && useEnhanced) {
        if (!workOrderId) {
          setError("Please select a work order.");
          setSubmitting(false);
          return;
        }
        invoiceId = await createInvoiceEnhanced({
          orgId,
          workOrderId: workOrderId as Id<"workOrders">,
          createdByTechId: techId as Id<"technicians">,
          laborRatePerHour: laborRate,
          dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
          paymentTerms: paymentTerms || undefined,
        });
      } else if (mode === "from_wo") {
        if (!workOrderId) {
          setError("Please select a work order.");
          setSubmitting(false);
          return;
        }
        const wo = closedWorkOrders.find((w) => w._id === workOrderId);
        if (!wo?.customerId) {
          setError("Selected work order has no customer assigned.");
          setSubmitting(false);
          return;
        }
        invoiceId = await createInvoiceFromWorkOrder({
          orgId,
          workOrderId: workOrderId as Id<"workOrders">,
          customerId: wo.customerId as Id<"customers">,
          createdByTechId: techId as Id<"technicians">,
        });
      } else {
        if (!customerId) {
          setError("Please select a customer.");
          setSubmitting(false);
          return;
        }
        invoiceId = await createInvoiceManual({
          orgId,
          customerId: customerId as Id<"customers">,
          createdByTechId: techId as Id<"technicians">,
        });
      }

      router.push(`/billing/invoices/${invoiceId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create invoice.",
      );
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Card className="border-border/60">
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="h-8 gap-1.5 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">New Invoice</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate from a work order or create manually
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
        {/* Mode selector */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Invoice Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <CardTitle className="text-sm font-medium">
                Select Work Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enhanced toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseEnhanced(!useEnhanced)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    useEnhanced ? "bg-primary" : "bg-muted"
                  }`}
                  aria-checked={useEnhanced}
                  role="switch"
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      useEnhanced ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
                <Label className="text-xs font-medium cursor-pointer" onClick={() => setUseEnhanced(!useEnhanced)}>
                  Use enhanced generation (with labor rate + parts)
                </Label>
              </div>

              {(useEnhanced ? allWorkOrders : closedWorkOrders).length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No {useEnhanced ? "" : "closed "}work orders found.
                  </p>
                  {!useEnhanced && (
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      A work order must be closed before a standard invoice can
                      be generated.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {useEnhanced ? "Work Order" : "Closed Work Order"} *
                  </Label>
                  <Select value={workOrderId} onValueChange={setWorkOrderId}>
                    <SelectTrigger className="h-9 text-sm border-border/60">
                      <SelectValue placeholder="Select work order" />
                    </SelectTrigger>
                    <SelectContent>
                      {(useEnhanced ? allWorkOrders : closedWorkOrders).map(
                        (wo) => (
                          <SelectItem key={wo._id} value={wo._id}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">
                                {wo.workOrderNumber}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                              <span className="text-xs">
                                {wo.description.slice(0, 40)}
                              </span>
                            </div>
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Enhanced fields */}
              {useEnhanced && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  {/* Labor rate */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Labor Rate ($/hr)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={laborRate}
                        onChange={(e) =>
                          setLaborRate(parseFloat(e.target.value) || 0)
                        }
                        className="h-9 text-sm border-border/60 pl-6"
                        placeholder="125.00"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Applied to all labor hours pulled from time clock entries.
                    </p>
                  </div>

                  {/* Due date */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3" />
                      Due Date{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-9 text-sm border-border/60"
                    />
                  </div>

                  {/* Payment terms */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Payment Terms{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Select
                      value={paymentTerms}
                      onValueChange={setPaymentTerms}
                    >
                      <SelectTrigger className="h-9 text-sm border-border/60">
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="due_on_receipt">
                          Due on Receipt
                        </SelectItem>
                        <SelectItem value="net_15">Net 15</SelectItem>
                        <SelectItem value="net_30">Net 30</SelectItem>
                        <SelectItem value="net_60">Net 60</SelectItem>
                        <SelectItem value="net_90">Net 90</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Work Summary Panel */}
        {mode === "from_wo" && workOrderId && orgId && (
          <WorkSummaryPanel
            workOrderId={workOrderId as Id<"workOrders">}
            orgId={orgId}
          />
        )}

        {/* Manual Customer Selection */}
        {mode === "manual" && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Invoice Details
              </CardTitle>
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
                        {c.name}
                        {c.companyName ? ` — ${c.companyName}` : ""}
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
                <Badge
                  variant="outline"
                  className="text-[10px] bg-muted text-muted-foreground border-muted-foreground/30 mx-1"
                >
                  DRAFT
                </Badge>
                — you can add line items and send later.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          {mode === "from_wo" && useEnhanced ? (
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Generating…" : "Generate from Work Order"}
            </Button>
          ) : (
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Creating…" : "Create Invoice"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
