"use client";

import { useState } from "react";
import { useRouter } from "@/hooks/useRouter";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Send,
  DollarSign,
  XCircle,
  AlertCircle,
  Receipt,
  Pencil,
  Trash2,
  CalendarDays,
  Plus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { DownloadPDFButton } from "@/src/shared/components/pdf/DownloadPDFButton";
import { InvoicePDF } from "@/src/shared/components/pdf/InvoicePDF";
import { PrintButton } from "@/src/shared/components/PrintButton";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SENT: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PARTIAL: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PAID: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  VOID: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "credit_card", label: "Credit Card" },
  { value: "wire", label: "Wire Transfer" },
  { value: "ach", label: "ACH" },
  { value: "other", label: "Other" },
] as const;

type PaymentMethod = typeof PAYMENT_METHODS[number]["value"];

/** Convert a Unix ms timestamp to a date input value (YYYY-MM-DD). */
function toDateInputValue(ts: number): string {
  return new Date(ts).toISOString().split("T")[0];
}

/** Convert a date input value (YYYY-MM-DD) to a Unix ms timestamp. */
function fromDateInputValue(val: string): number {
  return new Date(val).getTime();
}

function parseFiniteNumber(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as Id<"invoices">;
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const invoice = useQuery(
    api.billing.getInvoice,
    orgId && invoiceId ? { orgId, invoiceId } : "skip",
  );

  // GAP-05: Rich payment history from billingV4
  const paymentsV4 = useQuery(
    api.billingV4.listPaymentsForInvoice,
    invoiceId ? { invoiceId } : "skip",
  );

  // BUG-BM-002: Load customer so billing manager knows who this invoice is for
  const customer = useQuery(
    api.customers.getCustomer,
    invoice?.customerId ? { customerId: invoice.customerId } : "skip",
  );

  const sendInvoice = useMutation(api.billing.sendInvoice);
  const recordPayment = useMutation(api.billing.recordPayment);
  const voidInvoice = useMutation(api.billing.voidInvoice);
  // GAP-04: Due date mutation
  const setInvoiceDueDateMutation = useMutation(api.billingV4.setInvoiceDueDate);
  // GAP-06: Line item mutations
  const updateInvoiceLineItem = useMutation(api.billingV4.updateInvoiceLineItem);
  const removeInvoiceLineItem = useMutation(api.billingV4.removeInvoiceLineItem);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Payment dialog
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("check");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Void dialog
  const [voidDialog, setVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  // GAP-04: Due date dialog
  const [dueDateDialog, setDueDateDialog] = useState(false);
  const [dueDateValue, setDueDateValue] = useState("");
  const [paymentTermsValue, setPaymentTermsValue] = useState("");

  // GAP-06: Edit line item dialog
  const [editItemDialog, setEditItemDialog] = useState(false);
  const [editItemId, setEditItemId] = useState<Id<"invoiceLineItems"> | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnitPrice, setEditUnitPrice] = useState("");
  const [editDiscountPct, setEditDiscountPct] = useState("");

  // GAP-06: Delete line item confirm
  const [deleteItemDialog, setDeleteItemDialog] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<Id<"invoiceLineItems"> | null>(null);

  // BUG-BM-096: Add line item to DRAFT invoice
  const addInvoiceLineItem = useMutation(api.billing.addInvoiceLineItem);
  const [addLineDialog, setAddLineDialog] = useState(false);
  const [addLineType, setAddLineType] = useState<"labor" | "part" | "external_service">("labor");
  const [addLineDesc, setAddLineDesc] = useState("");
  const [addLineQty, setAddLineQty] = useState("1");
  const [addLineUnitPrice, setAddLineUnitPrice] = useState("");
  const [addLineLoading, setAddLineLoading] = useState(false);
  const [addLineError, setAddLineError] = useState<string | null>(null);

  const handleAddLine = async () => {
    if (!orgId) return;
    const qty = parseFiniteNumber(addLineQty);
    const unitPrice = parseFiniteNumber(addLineUnitPrice);
    if (!addLineDesc.trim()) { setAddLineError("Description is required."); return; }
    if (qty == null || qty <= 0) { setAddLineError("Quantity must be a finite number greater than zero."); return; }
    if (unitPrice == null || unitPrice < 0) { setAddLineError("Enter a valid finite unit price."); return; }
    setAddLineLoading(true); setAddLineError(null);
    try {
      await addInvoiceLineItem({ orgId, invoiceId, type: addLineType, description: addLineDesc.trim(), qty, unitPrice });
      toast.success("Line item added.");
      setAddLineDesc(""); setAddLineQty("1"); setAddLineUnitPrice(""); setAddLineType("labor");
      setAddLineDialog(false);
    } catch (err) {
      setAddLineError(err instanceof Error ? err.message : "Failed to add line item.");
    } finally {
      setAddLineLoading(false);
    }
  };

  const isLoading = !isLoaded || invoice === undefined;

  const handleSend = async () => {
    if (!orgId) return;
    setActionLoading("send"); setError(null);
    try {
      await sendInvoice({ orgId, invoiceId });
      toast.success("Invoice sent successfully.");
    }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to send."); }
    finally { setActionLoading(null); }
  };

  const handlePayment = async () => {
    if (!orgId || !invoice) return;
    if (!techId) {
      setError("A technician profile is required to record payments. Go to Personnel and create your profile first.");
      return;
    }
    const amount = parseFiniteNumber(payAmount);
    if (amount == null || amount <= 0) { setError("Enter a valid finite payment amount."); return; }
    // Guard against overpayment — prevent recording more than the outstanding balance
    if (amount > invoice.balance + 0.005) {
      setError(
        `Payment amount ($${amount.toFixed(2)}) exceeds the remaining balance ($${invoice.balance.toFixed(2)}). ` +
        `Reduce the amount or contact billing to split the payment.`,
      );
      return;
    }
    setActionLoading("payment"); setError(null);
    try {
      await recordPayment({
        orgId,
        invoiceId,
        amount,
        method: payMethod,
        recordedAt: Date.now(),
        recordedByTechId: techId as Id<"technicians">,
        referenceNumber: payReference.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      setPaymentDialog(false);
      setPayAmount(""); setPayReference(""); setPayNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVoid = async () => {
    if (!orgId || !voidReason.trim()) return;
    setActionLoading("void"); setError(null);
    try {
      await voidInvoice({ orgId, invoiceId, voidReason: voidReason.trim() });
      setVoidDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void invoice.");
    } finally {
      setActionLoading(null);
    }
  };

  // GAP-04: Set due date
  const handleSetDueDate = async () => {
    if (!orgId || !dueDateValue) return;
    const dueDateTs = fromDateInputValue(dueDateValue);
    if (!Number.isFinite(dueDateTs)) {
      setError("Enter a valid due date.");
      return;
    }
    setActionLoading("dueDate"); setError(null);
    try {
      await setInvoiceDueDateMutation({
        orgId,
        invoiceId,
        dueDate: dueDateTs,
        paymentTerms: paymentTermsValue.trim() || undefined,
      });
      setDueDateDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set due date.");
    } finally {
      setActionLoading(null);
    }
  };

  // GAP-06: Open edit dialog for a line item
  const openEditItem = (item: {
    _id: Id<"invoiceLineItems">;
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
    // Validate numeric fields before firing mutation
    const parsedQty = editQty !== "" ? parseFiniteNumber(editQty) : undefined;
    const parsedPrice = editUnitPrice !== "" ? parseFiniteNumber(editUnitPrice) : undefined;
    const parsedDiscount = editDiscountPct !== "" ? parseFiniteNumber(editDiscountPct) : undefined;
    if (parsedQty !== undefined && (parsedQty == null || parsedQty <= 0)) {
      setError("Quantity must be a finite number greater than zero.");
      return;
    }
    if (parsedPrice !== undefined && (parsedPrice == null || parsedPrice < 0)) {
      setError("Unit price must be a finite non-negative number.");
      return;
    }
    if (parsedDiscount !== undefined && (parsedDiscount == null || parsedDiscount < 0 || parsedDiscount > 100)) {
      setError("Discount must be between 0 and 100.");
      return;
    }
    setActionLoading("editItem"); setError(null);
    try {
      await updateInvoiceLineItem({
        orgId,
        lineItemId: editItemId,
        description: editDesc.trim() || undefined,
        qty: parsedQty,
        unitPrice: parsedPrice,
        discountPercent: parsedDiscount,
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
      await removeInvoiceLineItem({ orgId, lineItemId: deleteItemId });
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

  if (!invoice) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Invoice not found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  const canSend = invoice.status === "DRAFT";
  // PAID invoices have balance=0 — showing "Record Payment" on them is confusing and serves no purpose.
  // The overpayment guard (AI-039) would block entry anyway, but the button should not be visible.
  const canPayment = invoice.status === "SENT" || invoice.status === "PARTIAL";
  const canVoid = invoice.status === "DRAFT" || invoice.status === "SENT" || invoice.status === "PARTIAL";
  const isDraft = invoice.status === "DRAFT";

  // GAP-04: Overdue logic
  const isOverdue =
    invoice.dueDate != null &&
    invoice.dueDate < Date.now() &&
    (invoice.status === "SENT" || invoice.status === "PARTIAL");

  // GAP-05: Payment subtotal
  const paymentsData = paymentsV4 ?? [];
  const paymentSubtotal = paymentsData.reduce((sum, p) => sum + p.amount, 0);

  const invoicePdfDocument = (
    <InvoicePDF
      orgName="Athelon Aviation"
      invoice={{
        invoiceNumber: invoice.invoiceNumber,
        createdAt: invoice.createdAt,
        dueDate: invoice.dueDate ?? undefined,
        paymentTerms: invoice.paymentTerms ?? undefined,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
      }}
      lineItems={invoice.lineItems.map((li) => ({
        description: li.description,
        qty: li.qty,
        unitPrice: li.unitPrice,
        total: li.total,
      }))}
      customer={customer ?? undefined}
    />
  );

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; color: black; }
          .print-invoice { max-width: 100%; margin: 0; padding: 20px; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="space-y-5 max-w-3xl print-invoice">
        {/* Header — no-print wrapper for actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-semibold font-mono">{invoice.invoiceNumber}</h1>
                <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_STYLES[invoice.status] ?? ""}`}>
                  {invoice.status}
                </Badge>
                {/* GAP-04: Overdue badge */}
                {isOverdue && (
                  <Badge variant="outline" className="text-[10px] font-medium border bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">
                    OVERDUE
                  </Badge>
                )}
              </div>
              {/* BUG-BM-002: Show customer name in detail header */}
              {/* BUG-FD-003: Customer name was plain text — front desk couldn't click
                  through to the customer profile from an invoice. Now a link. */}
              {customer && (
                <Link
                  to={`/billing/customers/${customer._id}`}
                  className="text-sm font-medium text-primary hover:underline mt-0.5 inline-block"
                >
                  {customer.name}
                </Link>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                Created {formatDate(invoice.createdAt)}
                {invoice.sentAt ? ` · Sent ${formatDate(invoice.sentAt)}` : ""}
                {invoice.paidAt ? ` · Paid ${formatDate(invoice.paidAt)}` : ""}
              </p>
              {/* GAP-04: Due date row with set-due-date button */}
              <div className="flex items-center gap-1.5 mt-0.5">
                {invoice.dueDate ? (
                  <span className={`text-xs ${isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    Due {formatDate(invoice.dueDate)}
                    {invoice.paymentTerms ? ` · ${invoice.paymentTerms}` : ""}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">No due date set</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  title="Set Due Date"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setError(null);
                    setDueDateValue(invoice.dueDate ? toDateInputValue(invoice.dueDate) : "");
                    setPaymentTermsValue(invoice.paymentTerms ?? "");
                    setDueDateDialog(true);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DownloadPDFButton
              document={invoicePdfDocument}
              fileName={`Invoice-${invoice.invoiceNumber}.pdf`}
              label="Download PDF"
            />
            <PrintButton />
            {canSend && (
              <Button size="sm" onClick={handleSend} disabled={actionLoading === "send"} className="h-8 gap-1.5 text-xs">
                <Send className="w-3.5 h-3.5" />
                {actionLoading === "send" ? "Sending..." : "Send"}
              </Button>
            )}
            {canPayment && (
              <Button size="sm" onClick={() => { setError(null); setPaymentDialog(true); }} className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700">
                <DollarSign className="w-3.5 h-3.5" />
                Record Payment
              </Button>
            )}
            {canVoid && (
              <Button size="sm" variant="outline" onClick={() => { setError(null); setVoidDialog(true); }} className="h-8 gap-1.5 text-xs border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10">
                <XCircle className="w-3.5 h-3.5" />
                Void
              </Button>
            )}
          </div>
        </div>

        {/* Print Header (visible only when printing) */}
        <div className="print-only mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Invoice {invoice.invoiceNumber}</h1>
          <p className="text-sm text-gray-500">Status: {invoice.status} · {formatDate(invoice.createdAt)}</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400 no-print">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Totals Summary */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-medium">Invoice Summary</CardTitle>
              {customer && (
                <span className="text-xs text-muted-foreground">{customer.name}</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Labor</p>
              <p className="text-sm font-semibold">${invoice.laborTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Parts</p>
              <p className="text-sm font-semibold">${invoice.partsTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Total</p>
              <p className="text-base font-bold">${invoice.total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Balance</p>
              <p className={`text-base font-bold ${invoice.balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                ${invoice.balance.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Line Items — GAP-06: edit/delete on DRAFT; BUG-BM-096: add on DRAFT */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Line Items</CardTitle>
            {isDraft && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setAddLineError(null); setAddLineDialog(true); }}>
                <Plus className="w-3 h-3" />
                Add Line
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {invoice.lineItems.length === 0 ? (
              <div className="py-10 text-center">
                <Receipt className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No line items on this invoice.</p>
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
                  {invoice.lineItems.map((item) => (
                    <TableRow key={item._id} className="border-border/40">
                      <TableCell className="text-sm">
                        <div>{item.description}</div>
                        {/* GAP-06: Show discount info */}
                        {(item.discountPercent || item.discountAmount) && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                            {item.discountPercent ? `- ${item.discountPercent}% discount` : ""}
                            {item.discountAmount ? `- $${item.discountAmount.toFixed(2)} discount` : ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] border-border/50 capitalize">
                          {item.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-right">{item.qty}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-sm font-medium text-right tabular-nums">${item.total.toFixed(2)}</TableCell>
                      {isDraft && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit line item"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => { setError(null); openEditItem({
                                _id: item._id as Id<"invoiceLineItems">,
                                description: item.description,
                                qty: item.qty,
                                unitPrice: item.unitPrice,
                                discountPercent: item.discountPercent,
                              }); }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Remove line item"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                              onClick={() => {
                                setDeleteItemId(item._id as Id<"invoiceLineItems">);
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

        {/* Payment History — GAP-05 */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paymentsData.length === 0 ? (
              <div className="py-8 text-center">
                <DollarSign className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No payments recorded.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Method</TableHead>
                      <TableHead className="text-xs">Reference #</TableHead>
                      <TableHead className="text-xs">Notes</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsData.map((pay) => (
                      <TableRow key={pay._id} className="border-border/40">
                        <TableCell className="text-sm">{formatDate(pay.recordedAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] border-border/50 capitalize">
                            {pay.method.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{pay.referenceNumber ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{pay.notes ?? "—"}</TableCell>
                        <TableCell className="text-sm font-medium text-right text-green-600 dark:text-green-400">${pay.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                {/* Payments subtotal */}
                <div className="flex items-center justify-end gap-4 px-4 py-2 border-t border-border/40">
                  <span className="text-xs text-muted-foreground">Total Paid</span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">${paymentSubtotal.toFixed(2)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Totals Footer */}
        <div className="flex justify-end pr-1">
          <div className="space-y-1.5 min-w-[200px]">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span><span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            {/* GAP: Tax display */}
            {invoice.tax > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tax</span><span>${invoice.tax.toFixed(2)}</span>
              </div>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span><span>${invoice.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paid</span><span className="text-green-600 dark:text-green-400">${invoice.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Balance Due</span>
              <span className={invoice.balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}>
                ${invoice.balance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* GAP-04: Set Due Date Dialog */}
        <Dialog open={dueDateDialog} onOpenChange={setDueDateDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Set Due Date
              </DialogTitle>
              <DialogDescription>
                Set a due date and optional payment terms for {invoice.invoiceNumber}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Due Date *</Label>
                <Input
                  type="date"
                  value={dueDateValue}
                  onChange={(e) => setDueDateValue(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Terms</Label>
                <Input
                  value={paymentTermsValue}
                  onChange={(e) => setPaymentTermsValue(e.target.value)}
                  placeholder="e.g. Net 30, Due on receipt"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDueDateDialog(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSetDueDate}
                disabled={!dueDateValue || actionLoading === "dueDate"}
              >
                {actionLoading === "dueDate" ? "Saving..." : "Save Due Date"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GAP-06: Edit Line Item Dialog */}
        <Dialog open={editItemDialog} onOpenChange={setEditItemDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Line Item</DialogTitle>
              <DialogDescription>Update the details for this line item. Leave fields blank to keep existing values.</DialogDescription>
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

        {/* Record Payment Dialog */}
        <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment against {invoice.invoiceNumber}. Balance: ${invoice.balance.toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {/* Balance summary */}
              <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40 border border-border/50">
                <span className="text-xs text-muted-foreground">Outstanding balance</span>
                <span className={`text-sm font-semibold tabular-nums ${invoice!.balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                  ${invoice!.balance.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount * <span className="text-muted-foreground font-normal">(max ${invoice!.balance.toFixed(2)})</span></Label>
                  <Input
                    type="number"
                    min="0.01"
                    max={invoice!.balance}
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Method *</Label>
                  <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reference Number</Label>
                <Input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="Check #, wire ref, etc." className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className="resize-none h-20 text-sm" />
              </div>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setPayAmount(invoice!.balance.toFixed(2))}
                className="text-xs text-muted-foreground"
              >
                Pay Full Balance
              </Button>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => setPaymentDialog(false)}>Cancel</Button>
                <Button size="sm" onClick={handlePayment} disabled={actionLoading === "payment"} className="bg-green-600 hover:bg-green-700">
                  {actionLoading === "payment" ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Void Dialog */}
        <Dialog open={voidDialog} onOpenChange={setVoidDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Void Invoice</DialogTitle>
              <DialogDescription>
                Voiding {invoice.invoiceNumber} is irreversible. Provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Void Reason *</Label>
                <Textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Enter reason for voiding..."
                  className="resize-none h-24 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setVoidDialog(false)}>Cancel</Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleVoid}
                disabled={!voidReason.trim() || actionLoading === "void"}
              >
                {actionLoading === "void" ? "Voiding..." : "Void Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* BUG-BM-096: Add Line Item Dialog (DRAFT only) */}
        <Dialog open={addLineDialog} onOpenChange={(v) => { if (!v && !addLineLoading) setAddLineDialog(false); }}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Line Item</DialogTitle>
              <DialogDescription>
                Add a labor, part, or external service charge to this draft invoice.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={addLineType} onValueChange={(v) => setAddLineType(v as typeof addLineType)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor" className="text-xs">Labor</SelectItem>
                    <SelectItem value="part" className="text-xs">Part</SelectItem>
                    <SelectItem value="external_service" className="text-xs">External Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description *</Label>
                <Input
                  value={addLineDesc}
                  onChange={(e) => setAddLineDesc(e.target.value.slice(0, 300))}
                  placeholder="e.g. 100hr inspection labor — N12345"
                  className="h-8 text-sm"
                  maxLength={300}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={addLineQty}
                    onChange={(e) => setAddLineQty(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Unit Price ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addLineUnitPrice}
                    onChange={(e) => setAddLineUnitPrice(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {addLineDesc && addLineQty && addLineUnitPrice && (() => {
                const qty = parseFiniteNumber(addLineQty || "0");
                const unitPrice = parseFiniteNumber(addLineUnitPrice || "0");
                const lineTotal = qty != null && unitPrice != null
                  ? qty * unitPrice
                  : 0;
                return (
                  <p className="text-xs text-muted-foreground">
                    Line total: <span className="font-semibold text-foreground">${lineTotal.toFixed(2)}</span>
                  </p>
                );
              })()}
              {addLineError && <p className="text-xs text-red-600 dark:text-red-400">{addLineError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setAddLineDialog(false)} disabled={addLineLoading}>Cancel</Button>
              <Button size="sm" onClick={handleAddLine} disabled={addLineLoading || !addLineDesc.trim()}>
                {addLineLoading ? "Adding..." : "Add Line Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
