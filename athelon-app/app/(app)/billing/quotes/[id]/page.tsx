"use client";

import { useState } from "react";
import { useRouter } from "@/hooks/useRouter";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Pencil,
  Trash2,
  FileEdit,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SENT: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  APPROVED: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  CONVERTED: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  DECLINED: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

const LINE_TYPE_LABELS: Record<string, string> = {
  labor: "Labor",
  part: "Part",
  external_service: "External Service",
};

/** Convert a Unix ms timestamp to a date input value (YYYY-MM-DD). */
function toDateInputValue(ts: number): string {
  return new Date(ts).toISOString().split("T")[0];
}

/** Convert a date input value (YYYY-MM-DD) to a Unix ms timestamp. */
function fromDateInputValue(val: string): number {
  return new Date(val).getTime();
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as Id<"quotes">;
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const quote = useQuery(
    api.billing.getQuote,
    orgId && quoteId ? { orgId, quoteId } : "skip",
  );

  const sendQuote = useMutation(api.billing.sendQuote);
  const approveQuote = useMutation(api.billing.approveQuote);
  const declineQuote = useMutation(api.billing.declineQuote);
  const convertQuote = useMutation(api.billing.convertQuoteToWorkOrder);
  // GAP-08: Create revision
  const createQuoteRevision = useMutation(api.billingV4.createQuoteRevision);
  // GAP-13: Create invoice from quote
  const createInvoiceFromQuote = useMutation(api.billingV4.createInvoiceFromQuote);
  // GAP-06: Edit/remove line items
  const updateQuoteLineItem = useMutation(api.billingV4.updateQuoteLineItem);
  const removeQuoteLineItem = useMutation(api.billingV4.removeQuoteLineItem);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Decline dialog
  const [declineDialog, setDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Convert to WO dialog
  const [convertDialog, setConvertDialog] = useState(false);
  const [woNumber, setWoNumber] = useState("");
  const [woDescription, setWoDescription] = useState("");
  const [woType, setWoType] = useState<"routine" | "unscheduled">("routine");
  const [woPriority, setWoPriority] = useState<"routine" | "urgent" | "aog">("routine");

  // GAP-13: Create invoice dialog
  const [createInvoiceDialog, setCreateInvoiceDialog] = useState(false);
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState("");

  // GAP-06: Edit line item dialog
  const [editItemDialog, setEditItemDialog] = useState(false);
  const [editItemId, setEditItemId] = useState<Id<"quoteLineItems"> | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnitPrice, setEditUnitPrice] = useState("");
  const [editDiscountPct, setEditDiscountPct] = useState("");

  // GAP-06: Delete line item confirm
  const [deleteItemDialog, setDeleteItemDialog] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<Id<"quoteLineItems"> | null>(null);

  const isLoading = !isLoaded || quote === undefined;

  const handleSend = async () => {
    if (!orgId) return;
    setActionLoading("send"); setError(null);
    try {
      await sendQuote({ orgId, quoteId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send quote.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    if (!orgId) return;
    setActionLoading("approve"); setError(null);
    try {
      await approveQuote({ orgId, quoteId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve quote.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!orgId || !declineReason.trim()) return;
    setActionLoading("decline"); setError(null);
    try {
      await declineQuote({ orgId, quoteId, declineReason: declineReason.trim() });
      setDeclineDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline quote.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvert = async () => {
    if (!orgId || !woNumber.trim()) return;
    setActionLoading("convert"); setError(null);
    try {
      const newWoId = await convertQuote({
        orgId,
        quoteId,
        workOrderNumber: woNumber.trim(),
        workOrderType: woType,
        priority: woPriority,
        description: woDescription.trim() || `Work order from quote ${quote?.quoteNumber ?? ""}`,
      });
      setConvertDialog(false);
      router.push(`/work-orders/${newWoId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert quote.");
    } finally {
      setActionLoading(null);
    }
  };

  // GAP-08: Create revision
  const handleCreateRevision = async () => {
    if (!orgId || !techId) return;
    setActionLoading("revision"); setError(null);
    try {
      const newQuoteId = await createQuoteRevision({
        orgId,
        originalQuoteId: quoteId,
        createdByTechId: techId as Id<"technicians">,
      });
      router.push(`/billing/quotes/${newQuoteId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create revision.");
    } finally {
      setActionLoading(null);
    }
  };

  // GAP-13: Create invoice from quote
  const handleCreateInvoice = async () => {
    if (!orgId || !techId) return;
    setActionLoading("createInvoice"); setError(null);
    try {
      const newInvoiceId = await createInvoiceFromQuote({
        orgId,
        quoteId,
        createdByTechId: techId as Id<"technicians">,
        dueDate: invoiceDueDate ? fromDateInputValue(invoiceDueDate) : undefined,
        paymentTerms: invoicePaymentTerms.trim() || undefined,
      });
      setCreateInvoiceDialog(false);
      router.push(`/billing/invoices/${newInvoiceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setActionLoading(null);
    }
  };

  // GAP-06: Open edit dialog for a quote line item
  const openEditItem = (item: {
    _id: Id<"quoteLineItems">;
    description: string;
    qty: number;
    unitPrice: number;
    discountPercent?: number;
  }) => {
    setEditItemId(item._id);
    setEditDesc(item.description);
    setEditQty(String(item.qty));
    setEditUnitPrice(String(item.unitPrice));
    setEditDiscountPct(item.discountPercent != null ? String(item.discountPercent) : "");
    setEditItemDialog(true);
  };

  const handleEditItem = async () => {
    if (!orgId || !editItemId) return;
    setActionLoading("editItem"); setError(null);
    try {
      await updateQuoteLineItem({
        orgId,
        lineItemId: editItemId,
        description: editDesc.trim() || undefined,
        qty: editQty !== "" ? parseFloat(editQty) : undefined,
        unitPrice: editUnitPrice !== "" ? parseFloat(editUnitPrice) : undefined,
        discountPercent: editDiscountPct !== "" ? parseFloat(editDiscountPct) : undefined,
      });
      setEditItemDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update line item.");
    } finally {
      setActionLoading(null);
    }
  };

  // GAP-06: Delete line item
  const handleDeleteItem = async () => {
    if (!orgId || !deleteItemId) return;
    setActionLoading("deleteItem"); setError(null);
    try {
      await removeQuoteLineItem({ orgId, lineItemId: deleteItemId });
      setDeleteItemDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove line item.");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!quote) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Quote not found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  const canSend = quote.status === "DRAFT";
  const canApprove = quote.status === "SENT";
  const canDecline = quote.status === "SENT";
  const canConvert = quote.status === "APPROVED";
  // GAP-08: Revision allowed on SENT or DECLINED quotes
  const canRevise = quote.status === "SENT" || quote.status === "DECLINED";
  // GAP-13: Create invoice on APPROVED quotes
  const canCreateInvoice = quote.status === "APPROVED";
  const isDraft = quote.status === "DRAFT";

  const now = Date.now();
  // GAP-07: Expiry logic
  const isExpired =
    quote.expiresAt != null && quote.expiresAt < now && quote.status === "SENT";
  const isExpiringSoon =
    quote.expiresAt != null &&
    !isExpired &&
    quote.expiresAt - now < SEVEN_DAYS_MS &&
    quote.status === "SENT";

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground font-mono">{quote.quoteNumber}</h1>
              <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_STYLES[quote.status] ?? ""}`}>
                {quote.status}
              </Badge>
              {/* GAP-07: EXPIRED badge */}
              {isExpired && (
                <Badge variant="outline" className="text-[10px] font-medium border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  EXPIRED
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created {formatDate(quote.createdAt)}
              {quote.expiresAt ? ` · Expires ${formatDate(quote.expiresAt)}` : ""}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canSend && (
            <Button size="sm" onClick={handleSend} disabled={actionLoading === "send"} className="h-8 gap-1.5 text-xs">
              <Send className="w-3.5 h-3.5" />
              {actionLoading === "send" ? "Sending..." : "Send"}
            </Button>
          )}
          {canApprove && (
            <Button size="sm" onClick={handleApprove} disabled={actionLoading === "approve"} className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-3.5 h-3.5" />
              {actionLoading === "approve" ? "Approving..." : "Approve"}
            </Button>
          )}
          {canDecline && (
            <Button size="sm" variant="outline" onClick={() => setDeclineDialog(true)} className="h-8 gap-1.5 text-xs border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10">
              <XCircle className="w-3.5 h-3.5" />
              Decline
            </Button>
          )}
          {/* GAP-08: Create Revision */}
          {canRevise && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateRevision}
              disabled={actionLoading === "revision"}
              className="h-8 gap-1.5 text-xs"
            >
              <FileEdit className="w-3.5 h-3.5" />
              {actionLoading === "revision" ? "Creating..." : "Create Revision"}
            </Button>
          )}
          {canConvert && (
            <Button size="sm" onClick={() => setConvertDialog(true)} className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700">
              <RefreshCw className="w-3.5 h-3.5" />
              Convert to WO
            </Button>
          )}
          {/* GAP-13: Create Invoice */}
          {canCreateInvoice && (
            <Button
              size="sm"
              onClick={() => {
                setInvoiceDueDate("");
                setInvoicePaymentTerms("");
                setCreateInvoiceDialog(true);
              }}
              className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700"
            >
              <Receipt className="w-3.5 h-3.5" />
              Create Invoice
            </Button>
          )}
        </div>
      </div>

      {/* GAP-07: Expires soon warning banner */}
      {isExpiringSoon && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          This quote expires soon ({formatDate(quote.expiresAt!)}). Consider sending a revision or obtaining approval before expiry.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Card */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quote Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Labor Total</p>
            <p className="text-sm font-semibold">${quote.laborTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Parts Total</p>
            <p className="text-sm font-semibold">${quote.partsTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Subtotal</p>
            <p className="text-sm font-semibold">${quote.subtotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Total</p>
            <p className="text-base font-bold text-foreground">${quote.total.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Line Items — GAP-06: edit/delete on DRAFT */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {quote.lineItems.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No line items on this quote.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right">Unit $</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  {isDraft && <TableHead className="text-xs w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.lineItems.map((item) => (
                  <TableRow key={item._id} className="border-border/40">
                    <TableCell className="text-sm">
                      <div>{item.description}</div>
                      {/* GAP-06: Show discount percentage label */}
                      {item.discountPercent ? (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">- {item.discountPercent}%</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-border/50">
                        {LINE_TYPE_LABELS[item.type] ?? item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right">{item.qty}</TableCell>
                    <TableCell className="text-sm text-right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-sm font-medium text-right">${item.total.toFixed(2)}</TableCell>
                    {isDraft && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit line item"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditItem({
                              _id: item._id as Id<"quoteLineItems">,
                              description: item.description,
                              qty: item.qty,
                              unitPrice: item.unitPrice,
                              discountPercent: item.discountPercent,
                            })}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Remove line item"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                            onClick={() => {
                              setDeleteItemId(item._id as Id<"quoteLineItems">);
                              setDeleteItemDialog(true);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Departments (if any) */}
      {quote.departments.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Department Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quote.departments.map((dept) => (
              <div key={dept._id} className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <span className="text-sm">{dept.sectionName}</span>
                <Badge variant="outline" className="text-[10px] border-border/50">{dept.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Decline Dialog */}
      <Dialog open={declineDialog} onOpenChange={setDeclineDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Decline Quote</DialogTitle>
            <DialogDescription>Provide a reason for declining this quote.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Reason *</Label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter decline reason..."
                className="text-sm resize-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeclineDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDecline}
              disabled={!declineReason.trim() || actionLoading === "decline"}
            >
              {actionLoading === "decline" ? "Declining..." : "Confirm Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to WO Dialog */}
      <Dialog open={convertDialog} onOpenChange={setConvertDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Convert to Work Order</DialogTitle>
            <DialogDescription>Create a new work order from this approved quote.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Work Order Number *</Label>
              <Input
                value={woNumber}
                onChange={(e) => setWoNumber(e.target.value)}
                placeholder="e.g. WO-2026-001"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={woDescription}
                onChange={(e) => setWoDescription(e.target.value)}
                placeholder="Work order description..."
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <select
                  value={woType}
                  onChange={(e) => setWoType(e.target.value as "routine" | "unscheduled")}
                  className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                >
                  <option value="routine">Routine</option>
                  <option value="unscheduled">Unscheduled</option>
                  <option value="annual_inspection">Annual Inspection</option>
                  <option value="100hr_inspection">100hr Inspection</option>
                  <option value="major_repair">Major Repair</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <select
                  value={woPriority}
                  onChange={(e) => setWoPriority(e.target.value as "routine" | "urgent" | "aog")}
                  className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="aog">AOG</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConvertDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleConvert}
              disabled={!woNumber.trim() || actionLoading === "convert"}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading === "convert" ? "Converting..." : "Create Work Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GAP-13: Create Invoice from Quote Dialog */}
      <Dialog open={createInvoiceDialog} onOpenChange={setCreateInvoiceDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Invoice from Quote</DialogTitle>
            <DialogDescription>
              Create a draft invoice from {quote.quoteNumber}. All line items will be copied over.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date (optional)</Label>
              <Input
                type="date"
                value={invoiceDueDate}
                onChange={(e) => setInvoiceDueDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Terms (optional)</Label>
              <Input
                value={invoicePaymentTerms}
                onChange={(e) => setInvoicePaymentTerms(e.target.value)}
                placeholder="e.g. Net 30, Due on receipt"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateInvoiceDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleCreateInvoice}
              disabled={actionLoading === "createInvoice"}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === "createInvoice" ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GAP-06: Edit Line Item Dialog */}
      <Dialog open={editItemDialog} onOpenChange={setEditItemDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Line Item</DialogTitle>
            <DialogDescription>Update the details for this line item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editUnitPrice}
                  onChange={(e) => setEditUnitPrice(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Discount %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={editDiscountPct}
                onChange={(e) => setEditDiscountPct(e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditItemDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleEditItem} disabled={actionLoading === "editItem"}>
              {actionLoading === "editItem" ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GAP-06: Delete Line Item Confirm */}
      <Dialog open={deleteItemDialog} onOpenChange={setDeleteItemDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove Line Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this line item? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteItemDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteItem}
              disabled={actionLoading === "deleteItem"}
            >
              {actionLoading === "deleteItem" ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
