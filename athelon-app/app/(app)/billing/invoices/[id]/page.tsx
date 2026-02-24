"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Send,
  DollarSign,
  XCircle,
  Printer,
  AlertCircle,
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

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SENT: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PARTIAL: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PAID: "bg-green-500/15 text-green-400 border-green-500/30",
  VOID: "bg-red-500/15 text-red-400 border-red-500/30",
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as Id<"invoices">;
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const invoice = useQuery(
    api.billing.getInvoice,
    orgId && invoiceId ? { orgId, invoiceId } : "skip",
  );

  const sendInvoice = useMutation(api.billing.sendInvoice);
  const recordPayment = useMutation(api.billing.recordPayment);
  const voidInvoice = useMutation(api.billing.voidInvoice);

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

  const isLoading = !isLoaded || invoice === undefined;

  const handleSend = async () => {
    if (!orgId) return;
    setActionLoading("send"); setError(null);
    try { await sendInvoice({ orgId, invoiceId }); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to send."); }
    finally { setActionLoading(null); }
  };

  const handlePayment = async () => {
    if (!orgId || !techId) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { setError("Enter a valid payment amount."); return; }
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
  const canPayment = invoice.status === "SENT" || invoice.status === "PAID";
  const canVoid = invoice.status === "DRAFT" || invoice.status === "SENT";

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
        <div className="flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold font-mono">{invoice.invoiceNumber}</h1>
                <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_STYLES[invoice.status] ?? ""}`}>
                  {invoice.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created {formatDate(invoice.createdAt)}
                {invoice.sentAt ? ` · Sent ${formatDate(invoice.sentAt)}` : ""}
                {invoice.paidAt ? ` · Paid ${formatDate(invoice.paidAt)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8 gap-1.5 text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
            {canSend && (
              <Button size="sm" onClick={handleSend} disabled={actionLoading === "send"} className="h-8 gap-1.5 text-xs">
                <Send className="w-3.5 h-3.5" />
                {actionLoading === "send" ? "Sending..." : "Send"}
              </Button>
            )}
            {canPayment && (
              <Button size="sm" onClick={() => setPaymentDialog(true)} className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700">
                <DollarSign className="w-3.5 h-3.5" />
                Record Payment
              </Button>
            )}
            {canVoid && (
              <Button size="sm" variant="outline" onClick={() => setVoidDialog(true)} className="h-8 gap-1.5 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10">
                <XCircle className="w-3.5 h-3.5" />
                Void
              </Button>
            )}
          </div>
        </div>

        {/* Print Header (visible only when printing) */}
        <div className="print-only mb-6">
          <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber}</h1>
          <p className="text-sm text-gray-500">Status: {invoice.status} · {formatDate(invoice.createdAt)}</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400 no-print">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Totals Summary */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Invoice Summary</CardTitle>
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
              <p className={`text-base font-bold ${invoice.balance > 0 ? "text-amber-400" : "text-green-400"}`}>
                ${invoice.balance.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {invoice.lineItems.length === 0 ? (
              <div className="py-10 text-center">
                <Receipt className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No line items on this invoice.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs text-right">Unit $</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((item) => (
                    <TableRow key={item._id} className="border-border/40">
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] border-border/50 capitalize">
                          {item.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-right">{item.qty}</TableCell>
                      <TableCell className="text-sm text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-sm font-medium text-right">${item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {invoice.payments.length === 0 ? (
              <div className="py-8 text-center">
                <DollarSign className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No payments recorded.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((pay) => (
                    <TableRow key={pay._id} className="border-border/40">
                      <TableCell className="text-sm">{formatDate(pay.recordedAt)}</TableCell>
                      <TableCell className="text-sm capitalize">{pay.method.replace("_", " ")}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{pay.referenceNumber ?? "—"}</TableCell>
                      <TableCell className="text-sm font-medium text-right text-green-400">${pay.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Totals Footer */}
        <div className="flex justify-end pr-1">
          <div className="space-y-1.5 min-w-[200px]">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span><span>${invoice.subtotal.toFixed(2)}</span>
            </div>
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
              <span>Paid</span><span className="text-green-400">${invoice.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Balance Due</span>
              <span className={invoice.balance > 0 ? "text-amber-400" : "text-green-400"}>
                ${invoice.balance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Record Payment Dialog */}
        <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment against {invoice.invoiceNumber}. Balance: ${invoice.balance.toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount *</Label>
                  <Input
                    type="number"
                    min="0.01"
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
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setPaymentDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={handlePayment} disabled={actionLoading === "payment"} className="bg-green-600 hover:bg-green-700">
                {actionLoading === "payment" ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Void Dialog */}
        <Dialog open={voidDialog} onOpenChange={setVoidDialog}>
          <DialogContent>
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
      </div>
    </>
  );
}
