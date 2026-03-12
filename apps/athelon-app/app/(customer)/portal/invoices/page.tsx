import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { DownloadPDFButton } from "@/src/shared/components/pdf/DownloadPDFButton";
import { InvoicePDF } from "@/src/shared/components/pdf/InvoicePDF";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-100 text-blue-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  VOID: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIAL: "Partial",
  PAID: "Paid",
  VOID: "Void",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  partially_paid: "Partially paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  partially_paid: "bg-amber-100 text-amber-700",
  unpaid: "bg-slate-100 text-slate-700",
  overdue: "bg-red-100 text-red-700",
};

function InvoiceDetail({ invoice, onBack }: { invoice: any; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Invoices
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <DownloadPDFButton
                label="PDF"
                fileName={`${invoice.invoiceNumber || "invoice"}.pdf`}
                document={(
                  <InvoicePDF
                    orgName="Athelon MRO"
                    invoice={invoice}
                    lineItems={invoice.lineItems}
                    customer={null}
                  />
                )}
              />
              {invoice.isOverdue && <Badge className="bg-red-100 text-red-700">Overdue</Badge>}
              <Badge className={PAYMENT_STATUS_BADGE[invoice.paymentStatus] ?? "bg-slate-100 text-slate-700"}>
                {PAYMENT_STATUS_LABELS[invoice.paymentStatus] ?? "Unpaid"}
              </Badge>
              <Badge className={STATUS_COLORS[invoice.status] ?? ""}>
                {STATUS_LABELS[invoice.status] ?? invoice.status}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Created {new Date(invoice.createdAt).toLocaleDateString()}
            {invoice.dueDate && ` · Due ${new Date(invoice.dueDate).toLocaleDateString()}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Line Items */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Unit Price</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li: any) => (
                  <tr key={li._id} className="border-t">
                    <td className="p-2">
                      <p>{li.description}</p>
                      <Badge variant="outline" className="text-xs mt-0.5">{li.type}</Badge>
                    </td>
                    <td className="p-2 text-right">{li.qty}</td>
                    <td className="p-2 text-right">${li.unitPrice.toFixed(2)}</td>
                    <td className="p-2 text-right font-medium">${li.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Labor</span>
              <span>${invoice.laborTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parts</span>
              <span>${invoice.partsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>${invoice.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Amount Paid</span>
              <span>${invoice.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 border-t">
              <span>Balance Due</span>
              <span className={invoice.balance > 0 ? "text-red-600" : "text-green-600"}>
                ${invoice.balance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Payment History</p>
              <div className="space-y-2">
                {invoice.payments.map((payment: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium text-green-700">${payment.amount.toFixed(2)}</p>
                      <p className="text-xs text-green-600">
                        {payment.method.replace(/_/g, " ")}
                        {payment.referenceNumber && ` · Ref: ${payment.referenceNumber}`}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(payment.recordedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invoice.paymentTerms && (
            <p className="text-xs text-muted-foreground text-center">Payment Terms: {invoice.paymentTerms}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerInvoicesPage() {
  const customerId = usePortalCustomerId();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const invoices = useQuery(
    api.customerPortal.listCustomerInvoices,
    customerId ? { customerId } : "skip"
  );

  if (!customerId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground text-lg">No customer account linked</p>
          <p className="text-muted-foreground mt-1 max-w-md">
            Your account is not linked to a customer profile. Contact your MRO provider to set up your portal access.
          </p>
        </div>
      </div>
    );
  }

  if (selectedInvoice) {
    return <InvoiceDetail invoice={selectedInvoice} onBack={() => setSelectedInvoice(null)} />;
  }

  if (!invoices) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Invoices</h1>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No invoices found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card
              key={inv._id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedInvoice(inv)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{inv.invoiceNumber}</p>
                      {inv.isOverdue && <Badge className="bg-red-100 text-red-700">Overdue</Badge>}
                      <Badge className={PAYMENT_STATUS_BADGE[inv.paymentStatus] ?? "bg-slate-100 text-slate-700"}>
                        {PAYMENT_STATUS_LABELS[inv.paymentStatus] ?? "Unpaid"}
                      </Badge>
                      <Badge className={STATUS_COLORS[inv.status] ?? ""}>
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(inv.createdAt).toLocaleDateString()}
                      {inv.dueDate && ` · Due ${new Date(inv.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">${inv.total.toFixed(2)}</p>
                    {inv.balance > 0 && (
                      <p className="text-xs text-red-600">Balance: ${inv.balance.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
