"use client";

import { useState } from "react";
import { useRouter } from "@/hooks/useRouter";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Send, Package, CheckSquare, AlertCircle, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SUBMITTED: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PARTIAL: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  RECEIVED: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  CLOSED: "bg-muted text-muted-foreground border-muted-foreground/30",
};

const ITEM_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground border-muted-foreground/30",
  PARTIAL: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  RECEIVED: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
};

export default function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseOrderId = params.id as Id<"purchaseOrders">;
  const { orgId, isLoaded } = useCurrentOrg();

  const po = useQuery(
    api.billing.getPurchaseOrder,
    orgId && purchaseOrderId ? { orgId, purchaseOrderId } : "skip",
  );

  const submitPO = useMutation(api.billing.submitPO);
  const receivePOItems = useMutation(api.billing.receivePOItems);
  const closePO = useMutation(api.billing.closePO);

  // Budget status — only query when PO is loaded and has a workOrderId
  const poWorkOrderId = (po as (typeof po & { workOrderId?: Id<"workOrders"> }) | null | undefined)?.workOrderId;
  const budgetStatus = useQuery(
    api.billingV4b.getWorkOrderBudgetStatus,
    orgId && poWorkOrderId ? { orgId, workOrderId: poWorkOrderId } : "skip",
  );

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Receive dialog
  const [receiveDialog, setReceiveDialog] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});

  const isLoading = !isLoaded || po === undefined;

  const handleSubmit = async () => {
    if (!orgId) return;
    setActionLoading("submit"); setError(null);
    try { await submitPO({ orgId, purchaseOrderId }); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to submit PO."); }
    finally { setActionLoading(null); }
  };

  const handleReceive = async () => {
    if (!orgId || !po) return;
    const receipts = Object.entries(receiveQtys)
      .filter(([, qty]) => parseFloat(qty) > 0)
      .map(([lineItemId, qty]) => ({
        lineItemId: lineItemId as Id<"poLineItems">,
        receivedQty: parseFloat(qty),
      }));
    if (receipts.length === 0) { setError("Enter at least one received quantity."); return; }
    setActionLoading("receive"); setError(null);
    try {
      await receivePOItems({ orgId, purchaseOrderId, receipts });
      setReceiveDialog(false);
      setReceiveQtys({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive items.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async () => {
    if (!orgId) return;
    setActionLoading("close"); setError(null);
    try { await closePO({ orgId, purchaseOrderId }); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to close PO."); }
    finally { setActionLoading(null); }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!po) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Purchase order not found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  const canSubmit = po.status === "DRAFT";
  const canReceive = po.status === "SUBMITTED" || po.status === "PARTIAL";
  const canClose = po.status === "RECEIVED";

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold font-mono">{po.poNumber}</h1>
              <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_STYLES[po.status] ?? ""}`}>
                {po.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Created {formatDate(po.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSubmit && (
            <Button size="sm" onClick={handleSubmit} disabled={actionLoading === "submit"} className="h-8 gap-1.5 text-xs">
              <Send className="w-3.5 h-3.5" />
              {actionLoading === "submit" ? "Submitting..." : "Submit PO"}
            </Button>
          )}
          {canReceive && (
            <Button
              size="sm"
              onClick={() => {
                setReceiveQtys({});
                setReceiveDialog(true);
              }}
              className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700"
            >
              <Package className="w-3.5 h-3.5" />
              Receive Items
            </Button>
          )}
          {canClose && (
            <Button size="sm" onClick={handleClose} disabled={actionLoading === "close"} className="h-8 gap-1.5 text-xs">
              <CheckSquare className="w-3.5 h-3.5" />
              {actionLoading === "close" ? "Closing..." : "Close PO"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">PO Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Subtotal</p>
            <p className="text-sm font-semibold">${po.subtotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Tax</p>
            <p className="text-sm font-semibold">${po.tax.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Total</p>
            <p className="text-base font-bold">${po.total.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Budget Status Card — only when WO is linked */}
      {poWorkOrderId && (
        <>
          {/* Over-budget warning banner */}
          {budgetStatus?.partsOverBudget && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Over Budget!</span>
              <span>
                PO spend exceeds the quoted parts budget by{" "}
                <strong>${budgetStatus.partsOverageAmount.toFixed(2)}</strong> (
                {budgetStatus.partsOveragePercent.toFixed(1)}% over)
              </span>
            </div>
          )}

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Budget Status
                {budgetStatus?.partsOverBudget ? (
                  <Badge variant="outline" className="text-[10px] border bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">
                    Over Budget
                  </Badge>
                ) : (budgetStatus?.quotedParts ?? 0) > 0 ? (
                  <Badge variant="outline" className="text-[10px] border bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30">
                    Within Budget
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {budgetStatus === undefined ? (
                <div className="text-xs text-muted-foreground">Loading budget data...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">
                        Quoted Parts Budget
                      </p>
                      <p className="text-sm font-semibold">
                        {budgetStatus.quotedParts > 0
                          ? `$${budgetStatus.quotedParts.toFixed(2)}`
                          : <span className="text-muted-foreground text-xs">No quote</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">
                        PO Total Spent
                      </p>
                      <p className={`text-sm font-semibold ${budgetStatus.partsOverBudget ? "text-red-600 dark:text-red-400" : ""}`}>
                        ${budgetStatus.poTotal.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{budgetStatus.poCount} PO{budgetStatus.poCount !== 1 ? "s" : ""} for this WO</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">
                        Over / Under
                      </p>
                      {budgetStatus.quotedParts > 0 ? (
                        <div className="flex items-center gap-1">
                          {budgetStatus.partsOverBudget ? (
                            <TrendingUp className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          )}
                          <p className={`text-sm font-semibold ${budgetStatus.partsOverBudget ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                            {budgetStatus.partsOverBudget ? "+" : "-"}$
                            {Math.abs(budgetStatus.partsOverageAmount).toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </div>
                  </div>

                  {budgetStatus.quotedParts > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Budget Used</span>
                        <span className={`font-medium ${budgetStatus.partsOverBudget ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                          {Math.min(
                            Math.round((budgetStatus.poTotal / budgetStatus.quotedParts) * 100),
                            200,
                          )}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(
                          (budgetStatus.poTotal / budgetStatus.quotedParts) * 100,
                          100,
                        )}
                        className={`h-1.5 ${budgetStatus.partsOverBudget ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"}`}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Line Items */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {po.lineItems.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No line items on this PO.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs text-right">Ordered</TableHead>
                  <TableHead className="text-xs text-right">Received</TableHead>
                  <TableHead className="text-xs text-right">Unit $</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.lineItems.map((item) => (
                  <TableRow key={item._id} className="border-border/40">
                    <TableCell className="text-sm">{item.description}</TableCell>
                    <TableCell className="text-sm text-right">{item.qty}</TableCell>
                    <TableCell className="text-sm text-right">{item.receivedQty}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-sm font-medium text-right tabular-nums">${(item.qty * item.unitPrice).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] border ${ITEM_STATUS_STYLES[item.status] ?? ""}`}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receive Items Dialog */}
      <Dialog open={receiveDialog} onOpenChange={setReceiveDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Receive Items</DialogTitle>
            <DialogDescription>
              Enter the quantity received for each line item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
            {po.lineItems
              .filter((item) => item.status !== "RECEIVED")
              .map((item) => (
                <div key={item._id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Ordered: {item.qty} · Received: {item.receivedQty} · Remaining: {item.qty - item.receivedQty}
                    </p>
                  </div>
                  <div className="w-24">
                    <Label className="text-[10px] text-muted-foreground">Qty Received</Label>
                    <Input
                      type="number"
                      min="0"
                      max={item.qty - item.receivedQty}
                      value={receiveQtys[item._id] ?? ""}
                      onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [item._id]: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReceiveDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleReceive} disabled={actionLoading === "receive"} className="bg-green-600 hover:bg-green-700">
              {actionLoading === "receive" ? "Saving..." : "Confirm Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
