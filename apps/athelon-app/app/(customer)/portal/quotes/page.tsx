import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check, X, AlertCircle } from "lucide-react";
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

const ALL_STATUSES = ["ALL", "SENT", "APPROVED", "DECLINED", "CONVERTED"] as const;
type StatusFilter = (typeof ALL_STATUSES)[number];

function QuoteDetail({
  quote,
  customerId,
  onBack,
}: {
  quote: Record<string, unknown> & {
    _id: Id<"quotes">;
    quoteNumber: string;
    status: string;
    aircraftRegistration: string;
    createdAt: number;
    expiresAt?: number;
    laborTotal: number;
    partsTotal: number;
    tax: number;
    total: number;
    lineItems: Array<{
      _id: Id<"quoteLineItems">;
      description: string;
      type: string;
      qty: number;
      unitPrice: number;
      total: number;
      discrepancyId?: string;
      discrepancyNumber?: string;
      customerDecision?: string;
      decisionHistory?: Array<{ decision: string; actorName?: string; decidedAt: number }>;
    }>;
    departments?: unknown[];
  };
  customerId: Id<"customers">;
  onBack: () => void;
}) {
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [lineItemPendingId, setLineItemPendingId] = useState<Id<"quoteLineItems"> | null>(null);

  const approveQuote = useMutation(api.customerPortal.customerApproveQuote);
  const declineQuote = useMutation(api.customerPortal.customerDeclineQuote);
  const decideLineItem = useMutation(api.customerPortal.customerDecideQuoteLineItem);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approveQuote({ customerId, quoteId: quote._id });
      toast.success("Quote approved successfully.");
      onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve quote.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining.");
      return;
    }

    setIsDeclining(true);
    try {
      await declineQuote({ customerId, quoteId: quote._id, declineReason: declineReason.trim() });
      toast.success("Quote declined.");
      onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to decline quote.");
    } finally {
      setIsDeclining(false);
    }
  };

  const handleLineItemDecision = async (
    lineItemId: Id<"quoteLineItems">,
    decision: "approved" | "declined" | "deferred",
  ) => {
    setLineItemPendingId(lineItemId);
    try {
      await decideLineItem({
        customerId,
        quoteId: quote._id,
        lineItemId,
        decision,
      });
      toast.success(`Line item ${decision}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update line item.");
    } finally {
      setLineItemPendingId(null);
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
                    quote={{
                      quoteNumber: quote.quoteNumber,
                      createdAt: quote.createdAt,
                      expiresAt: quote.expiresAt,
                      status: quote.status,
                      subtotal: quote.laborTotal + quote.partsTotal,
                      tax: quote.taxTotal as number,
                      total: quote.grandTotal as number,
                    }}
                    lineItems={(quote.lineItems ?? []).map((li) => ({
                      _id: li._id,
                      description: li.description,
                      qty: li.qty,
                      unitPrice: li.unitPrice,
                      total: li.total,
                      departmentSection: undefined,
                      customerDecision: li.customerDecision as import("@/components/pdf/QuotePDF").QuotePDFLineItem["customerDecision"],
                    }))}
                    departments={((quote.departments ?? []) as Array<Record<string, unknown>>).map((d) => ({
                      _id: String(d._id ?? ""),
                      sectionName: String(d.sectionName ?? ""),
                    }))}
                    customer={null}
                  />
                )}
              />
              <Badge className={STATUS_COLORS[quote.status] ?? ""}>{quote.status}</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {quote.aircraftRegistration} · Created {new Date(quote.createdAt).toLocaleDateString()}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Line Items</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Unit Price</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">Total</th>
                    {quote.status === "SENT" && quote.lineItems.some((li) => li.discrepancyId) && (
                      <th className="text-center p-2 font-medium text-muted-foreground">Decision</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {quote.lineItems.map((li) => (
                    <tr key={li._id} className="border-t">
                      <td className="p-2">
                        <div>
                          <p>{li.description}</p>
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {li.type}
                          </Badge>
                          {li.discrepancyNumber && (
                            <Badge variant="outline" className="ml-1 text-xs mt-0.5 font-mono">
                              {li.discrepancyNumber}
                            </Badge>
                          )}
                          {li.customerDecision && (
                            <Badge className="ml-1 text-xs" variant="secondary">
                              {li.customerDecision}
                            </Badge>
                          )}
                          {Array.isArray(li.decisionHistory) && li.decisionHistory.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {li.decisionHistory.slice(0, 2).map((event, idx) => (
                                <p key={idx} className="text-[11px] text-muted-foreground">
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
                              disabled={lineItemPendingId === li._id || isApproving || isDeclining}
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-600"
                              onClick={() => handleLineItemDecision(li._id, "declined")}
                              disabled={lineItemPendingId === li._id || isApproving || isDeclining}
                            >
                              ✗
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleLineItemDecision(li._id, "deferred")}
                              disabled={lineItemPendingId === li._id || isApproving || isDeclining}
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

          <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Labor</span>
              <span>${quote.laborTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parts</span>
              <span>${quote.partsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
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
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    disabled={isApproving || isDeclining || !!lineItemPendingId}
                  >
                    <Check className="w-4 h-4 mr-1" /> {isApproving ? "Approving..." : "Approve Quote"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setDeclining(true)}
                    disabled={isApproving || isDeclining || !!lineItemPendingId}
                  >
                    <X className="w-4 h-4 mr-1" /> Decline
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    className="w-full border rounded-lg p-2 text-sm bg-background text-foreground"
                    placeholder="Reason for declining..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    disabled={isDeclining}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDecline}
                      disabled={isDeclining || isApproving || !!lineItemPendingId}
                    >
                      {isDeclining ? "Declining..." : "Confirm Decline"}
                    </Button>
                    <Button variant="outline" onClick={() => setDeclining(false)} disabled={isDeclining}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {quote.expiresAt && (
            <p className="text-xs text-muted-foreground text-center">
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const quotes = useQuery(api.customerPortal.listCustomerQuotes, customerId ? { customerId } : "skip");

  const selectedQuote = useMemo(
    () => quotes?.find((q) => q._id === selectedQuoteId) ?? null,
    [quotes, selectedQuoteId],
  );

  const pendingQuotes = useMemo(
    () => quotes?.filter((q) => q.status === "SENT") ?? [],
    [quotes],
  );

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    if (statusFilter === "ALL") return quotes;
    return quotes.filter((q) => q.status === statusFilter);
  }, [quotes, statusFilter]);

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SENT">Pending Approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="DECLINED">Declined</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pendingQuotes.length > 0 && statusFilter === "ALL" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            {pendingQuotes.length} quote{pendingQuotes.length > 1 ? "s" : ""} pending your approval
          </p>
          <div className="space-y-2">
            {pendingQuotes.map((quote) => (
              <button
                key={quote._id}
                type="button"
                className="w-full text-left rounded-md border border-amber-200 bg-white px-3 py-2 text-sm hover:bg-amber-50 transition-colors"
                onClick={() => setSelectedQuoteId(quote._id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{quote.quoteNumber}</span>
                  <span className="text-muted-foreground">${(quote.total as number).toFixed(2)}</span>
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">{quote.aircraftRegistration as string}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {statusFilter === "ALL" ? "No quotes found." : `No ${statusFilter.toLowerCase()} quotes.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((quote) => (
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
                    <p className="text-sm text-muted-foreground mt-1">{quote.aircraftRegistration as string}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(quote.createdAt).toLocaleDateString()} · ${(quote.total as number).toFixed(2)}
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
