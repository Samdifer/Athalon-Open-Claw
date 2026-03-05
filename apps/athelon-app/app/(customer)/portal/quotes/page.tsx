import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import type { Id } from "@/convex/_generated/dataModel";
import { DownloadPDFButton } from "@/src/shared/components/pdf/DownloadPDFButton";
import { QuotePDF } from "@/src/shared/components/pdf/QuotePDF";

const STATUS_COLORS: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  CONVERTED: "bg-purple-100 text-purple-700",
};

function QuoteDetail({
  quote,
  customerId,
  onBack,
}: {
  quote: any;
  customerId: Id<"customers">;
  onBack: () => void;
}) {
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const approveQuote = useMutation(api.customerPortal.customerApproveQuote);
  const declineQuote = useMutation(api.customerPortal.customerDeclineQuote);
  const decideLineItem = useMutation(api.customerPortal.customerDecideQuoteLineItem);

  const handleApprove = async () => {
    try {
      await approveQuote({ customerId, quoteId: quote._id });
      toast.success("Quote approved successfully.");
      onBack();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to approve quote.");
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining.");
      return;
    }

    try {
      await declineQuote({ customerId, quoteId: quote._id, declineReason });
      toast.success("Quote declined.");
      onBack();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to decline quote.");
    }
  };

  const handleLineItemDecision = async (
    lineItemId: Id<"quoteLineItems">,
    decision: "approved" | "declined" | "deferred",
  ) => {
    try {
      await decideLineItem({
        customerId,
        quoteId: quote._id,
        lineItemId,
        decision,
      });
      toast.success(`Line item ${decision}.`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update line item.");
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Quotes
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">{quote.quoteNumber}</CardTitle>
            <div className="flex items-center gap-2">
              <DownloadPDFButton
                label="PDF"
                fileName={`${quote.quoteNumber || "quote"}.pdf`}
                document={(
                  <QuotePDF
                    orgName="Athelon MRO"
                    quote={quote}
                    lineItems={quote.lineItems ?? []}
                    departments={quote.departments ?? []}
                    customer={null}
                  />
                )}
              />
              <Badge className={STATUS_COLORS[quote.status] ?? ""}>{quote.status}</Badge>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {quote.aircraftRegistration} · Created {new Date(quote.createdAt).toLocaleDateString()}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Line Items</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-600">Description</th>
                    <th className="text-right p-2 font-medium text-gray-600">Qty</th>
                    <th className="text-right p-2 font-medium text-gray-600">Unit Price</th>
                    <th className="text-right p-2 font-medium text-gray-600">Total</th>
                    {quote.status === "SENT" && quote.lineItems.some((li: any) => li.discrepancyId) && (
                      <th className="text-center p-2 font-medium text-gray-600">Decision</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {quote.lineItems.map((li: any) => (
                    <tr key={li._id} className="border-t">
                      <td className="p-2">
                        <div>
                          <p>{li.description}</p>
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {li.type}
                          </Badge>
                          {li.customerDecision && (
                            <Badge className="ml-1 text-xs" variant="secondary">
                              {li.customerDecision}
                            </Badge>
                          )}
                          {Array.isArray(li.decisionHistory) && li.decisionHistory.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {li.decisionHistory.slice(0, 2).map((event: any, idx: number) => (
                                <p key={idx} className="text-[11px] text-gray-500">
                                  {event.decision} · {event.actorName ?? "Unknown"} · {new Date(event.decidedAt).toLocaleString()}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-right">{li.qty}</td>
                      <td className="p-2 text-right">${li.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-right font-medium">${li.total.toFixed(2)}</td>
                      {quote.status === "SENT" && li.discrepancyId && (
                        <td className="p-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-green-600"
                              onClick={() => handleLineItemDecision(li._id, "approved")}
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-600"
                              onClick={() => handleLineItemDecision(li._id, "declined")}
                            >
                              ✗
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleLineItemDecision(li._id, "deferred")}
                            >
                              Defer
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Labor</span>
              <span>${quote.laborTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Parts</span>
              <span>${quote.partsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax</span>
              <span>${quote.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span>${quote.total.toFixed(2)}</span>
            </div>
          </div>

          {quote.status === "SENT" && (
            <div className="space-y-3 pt-2">
              {!declining ? (
                <div className="flex gap-3">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                    <Check className="w-4 h-4 mr-1" /> Approve Quote
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setDeclining(true)}
                  >
                    <X className="w-4 h-4 mr-1" /> Decline
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    className="w-full border rounded-lg p-2 text-sm"
                    placeholder="Reason for declining..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" className="flex-1" onClick={handleDecline}>
                      Confirm Decline
                    </Button>
                    <Button variant="outline" onClick={() => setDeclining(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {quote.expiresAt && (
            <p className="text-xs text-gray-400 text-center">
              Expires {new Date(quote.expiresAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerQuotesPage() {
  const customerId = usePortalCustomerId();
  const [selectedQuoteId, setSelectedQuoteId] = useState<Id<"quotes"> | null>(null);

  const quotes = useQuery(api.customerPortal.listCustomerQuotes, customerId ? { customerId } : "skip");

  const selectedQuote = useMemo(
    () => quotes?.find((q: any) => q._id === selectedQuoteId) ?? null,
    [quotes, selectedQuoteId],
  );

  if (!customerId) {
    return <p className="text-center text-gray-500 py-16">No customer account linked.</p>;
  }

  if (selectedQuote) {
    return (
      <QuoteDetail
        quote={selectedQuote}
        customerId={customerId}
        onBack={() => setSelectedQuoteId(null)}
      />
    );
  }

  if (!quotes) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No quotes found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote: any) => (
            <Card
              key={quote._id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedQuoteId(quote._id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{quote.quoteNumber}</p>
                      <Badge className={STATUS_COLORS[quote.status] ?? ""}>{quote.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{quote.aircraftRegistration}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(quote.createdAt).toLocaleDateString()} · ${quote.total.toFixed(2)}
                    </p>
                  </div>
                  {quote.status === "SENT" && (
                    <Badge className="bg-amber-100 text-amber-700">Action Required</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
