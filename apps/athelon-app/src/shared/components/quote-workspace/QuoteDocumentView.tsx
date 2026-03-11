"use client";

import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useRouter } from "@/hooks/useRouter";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DownloadPDFButton } from "@/src/shared/components/pdf/DownloadPDFButton";
import { PrintButton } from "@/src/shared/components/PrintButton";
import { QuotePDF } from "@/components/pdf/QuotePDF";
import { QuoteActionBar } from "./QuoteActionBar";
import { QuoteStatusStepper } from "./QuoteStatusStepper";
import { QuoteFinancialFooter } from "./QuoteFinancialFooter";
import {
  useQuoteProfitabilityMetrics,
  fmtCurrency,
} from "./useQuoteProfitabilityMetrics";
import type { ShopSettingsData } from "./types";
import { DEFAULT_SHOP_SETTINGS } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuoteLineDecision = "approved" | "declined" | "deferred";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SENT: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  APPROVED:
    "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  CONVERTED:
    "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  DECLINED:
    "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

const TYPE_DOT_COLORS: Record<string, string> = {
  labor: "bg-blue-500",
  part: "bg-emerald-500",
  external_service: "bg-amber-500",
};

const TYPE_LABELS: Record<string, string> = {
  labor: "Labor",
  part: "Part",
  external_service: "Service",
};

const DECISION_STYLES: Record<
  QuoteLineDecision,
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  approved: {
    label: "Accepted",
    className:
      "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    icon: CheckCircle,
  },
  declined: {
    label: "Declined",
    className:
      "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    icon: XCircle,
  },
  deferred: {
    label: "Deferred",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    icon: Clock,
  },
};

function parseFiniteNumber(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function fromDateInputValue(val: string): number | undefined {
  const [yearRaw, monthRaw, dayRaw] = val.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day))
    return undefined;
  return Date.UTC(year, month - 1, day);
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Props ────────────────────────────────────────────────────────────────────

export type QuoteDocumentViewProps = {
  quoteId?: Id<"quotes">;
  hideBackButton?: boolean;
  onBack?: () => void;
  onQuoteNavigate?: (quoteId: Id<"quotes">) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function QuoteDocumentView({
  quoteId: quoteIdOverride,
  hideBackButton = false,
  onBack,
  onQuoteNavigate,
}: QuoteDocumentViewProps = {}) {
  const params = useParams();
  const router = useRouter();
  const quoteId = (quoteIdOverride ??
    (params.id as Id<"quotes"> | undefined)) as Id<"quotes">;
  const { orgId, techId, isLoaded, org } = useCurrentOrg();

  // ─── Queries ──────────────────────────────────────────────────────────
  const quote = useQuery(
    api.billing.getQuote,
    orgId && quoteId ? { orgId, quoteId } : "skip",
  );
  const customer = useQuery(
    api.customers.getCustomer,
    quote?.customerId ? { customerId: quote.customerId } : "skip",
  );
  const aircraftList = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const shopSettingsRaw = useQuery(
    api.shopSettings.getShopSettings,
    orgId ? { orgId } : "skip",
  );

  const shopSettings: ShopSettingsData = shopSettingsRaw ?? DEFAULT_SHOP_SETTINGS;

  // ─── Mutations ────────────────────────────────────────────────────────
  const sendQuote = useMutation(api.billing.sendQuote);
  const approveQuote = useMutation(api.billing.approveQuote);
  const declineQuote = useMutation(api.billing.declineQuote);
  const convertQuote = useMutation(api.billing.convertQuoteToWorkOrder);
  const decideQuoteLineItem = useMutation(api.gapFixes.decideQuoteLineItem);
  const addQuoteLineItem = useMutation(api.billing.addQuoteLineItem);
  const createQuoteRevision = useMutation(api.billingV4.createQuoteRevision);
  const createInvoiceFromQuote = useMutation(
    api.billingV4.createInvoiceFromQuote,
  );
  const updateQuoteLineItem = useMutation(api.billingV4.updateQuoteLineItem);
  const removeQuoteLineItem = useMutation(api.billingV4.removeQuoteLineItem);

  // ─── State ────────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);

  // Dialog state
  const [declineDialog, setDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [convertDialog, setConvertDialog] = useState(false);
  const [woDescription, setWoDescription] = useState("");
  const [woType, setWoType] = useState<"routine" | "unscheduled">("routine");
  const [woPriority, setWoPriority] = useState<"routine" | "urgent" | "aog">(
    "routine",
  );
  const [createInvoiceDialog, setCreateInvoiceDialog] = useState(false);
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState("");

  // Edit line item inline state
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnitPrice, setEditUnitPrice] = useState("");
  const [editDiscountPct, setEditDiscountPct] = useState("");

  // Delete confirm
  const [deleteItemId, setDeleteItemId] = useState<Id<"quoteLineItems"> | null>(
    null,
  );
  const [deleteItemDialog, setDeleteItemDialog] = useState(false);

  // Add line item
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addType, setAddType] = useState<"labor" | "part" | "external_service">(
    "labor",
  );
  const [addDesc, setAddDesc] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addUnitPrice, setAddUnitPrice] = useState("0");

  // ─── Derived ──────────────────────────────────────────────────────────
  const isLoading =
    !isLoaded || (quoteId ? quote === undefined : false) || aircraftList === undefined;

  const profitabilityLineItems = useMemo(() => {
    if (!quote) return [];
    return quote.lineItems.map((li) => ({
      type: li.type as "labor" | "part" | "external_service",
      qty: li.qty,
      unitPrice: li.unitPrice,
      total: li.total,
      directCost: (li as { directCost?: number }).directCost,
    }));
  }, [quote]);

  const metrics = useQuoteProfitabilityMetrics(
    profitabilityLineItems,
    shopSettings.averageHourlyCost,
  );

  const aircraft = useMemo(
    () => (aircraftList ?? []).find((a) => a._id === quote?.aircraftId),
    [aircraftList, quote?.aircraftId],
  );

  const convertibleLineCount = useMemo(() => {
    if (!quote) return 0;
    return quote.lineItems.filter((line) => {
      const isBillable =
        Number.isFinite(line.qty) &&
        Number.isFinite(line.unitPrice) &&
        line.qty > 0 &&
        line.unitPrice >= 0;
      const decision = line.customerDecision as
        | QuoteLineDecision
        | undefined;
      return isBillable && (decision === undefined || decision === "approved");
    }).length;
  }, [quote]);

  const isDraft = quote?.status === "DRAFT";
  const canDecideLineItems =
    quote?.status === "DRAFT" ||
    quote?.status === "SENT" ||
    quote?.status === "APPROVED";

  const now = Date.now();
  const isExpired =
    quote?.expiresAt != null &&
    quote.expiresAt < now &&
    quote.status === "SENT";
  const isExpiringSoon =
    quote?.expiresAt != null &&
    !isExpired &&
    quote.expiresAt - now < SEVEN_DAYS_MS &&
    quote.status === "SENT";

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!orgId || !quoteId || !quote) return;
    if (quote.lineItems.length === 0) {
      setError("Cannot send a quote with no line items.");
      return;
    }
    setActionLoading("send");
    setError(null);
    try {
      await sendQuote({ orgId, quoteId });
      toast.success("Quote sent to customer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send quote.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    if (!orgId || !quoteId) return;
    setActionLoading("approve");
    setError(null);
    try {
      await approveQuote({ orgId, quoteId });
      toast.success("Quote approved");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to approve quote.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!orgId || !quoteId || !declineReason.trim()) return;
    setActionLoading("decline");
    setError(null);
    try {
      await declineQuote({
        orgId,
        quoteId,
        declineReason: declineReason.trim(),
      });
      setDeclineDialog(false);
      toast.success("Quote declined");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to decline quote.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvert = async () => {
    if (!orgId || !quoteId || !quote) return;
    setActionLoading("convert");
    setError(null);
    try {
      const newWoId = await convertQuote({
        orgId,
        quoteId,
        workOrderType: woType,
        priority: woPriority,
        description:
          woDescription.trim() ||
          `Work order from quote ${quote.quoteNumber}`,
      });
      setConvertDialog(false);
      router.push(`/work-orders/${newWoId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to convert quote.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateRevision = async () => {
    if (!orgId || !techId || !quoteId) return;
    setActionLoading("revision");
    setError(null);
    try {
      const newQuoteId = await createQuoteRevision({
        orgId,
        originalQuoteId: quoteId,
        createdByTechId: techId as Id<"technicians">,
      });
      if (onQuoteNavigate) {
        onQuoteNavigate(newQuoteId);
      } else {
        router.push(`/sales/quotes/${newQuoteId}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create revision.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateInvoice = async () => {
    if (!orgId || !techId || !quoteId) return;
    const parsedDueDate = invoiceDueDate
      ? fromDateInputValue(invoiceDueDate)
      : undefined;
    if (invoiceDueDate && parsedDueDate === undefined) {
      setError("Invalid due date.");
      return;
    }
    setActionLoading("createInvoice");
    setError(null);
    try {
      const newInvoiceId = await createInvoiceFromQuote({
        orgId,
        quoteId,
        createdByTechId: techId as Id<"technicians">,
        dueDate: parsedDueDate,
        paymentTerms: invoicePaymentTerms.trim() || undefined,
      });
      setCreateInvoiceDialog(false);
      router.push(`/billing/invoices/${newInvoiceId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create invoice.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleLineDecision = async (
    lineItemId: Id<"quoteLineItems">,
    decision: QuoteLineDecision,
  ) => {
    if (!orgId) return;
    setActionLoading(`decision:${lineItemId}`);
    setError(null);
    try {
      await decideQuoteLineItem({
        orgId,
        lineItemId,
        decision,
        decisionNotes: undefined,
      });
      toast.success(
        `Line item ${DECISION_STYLES[decision].label.toLowerCase()}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to apply line item decision.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddLineItem = async () => {
    if (!orgId || !quoteId) return;
    const qty = parseFiniteNumber(addQty);
    const unitPrice = parseFiniteNumber(addUnitPrice);
    if (!addDesc.trim()) {
      setError("Description is required.");
      return;
    }
    if (qty == null || qty <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (unitPrice == null || unitPrice < 0) {
      setError("Unit price must be zero or higher.");
      return;
    }
    setActionLoading("addItem");
    setError(null);
    try {
      await addQuoteLineItem({
        orgId,
        quoteId,
        type: addType,
        description: addDesc.trim(),
        qty,
        unitPrice,
      });
      setAddDesc("");
      setAddQty("1");
      setAddUnitPrice("0");
      setAddItemOpen(false);
      toast.success("Line item added");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add line item.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const startEditLine = (item: {
    _id: string;
    description: string;
    qty: number;
    unitPrice: number;
    discountPercent?: number;
  }) => {
    setEditingLineId(item._id);
    setEditDesc(item.description);
    setEditQty(String(item.qty));
    setEditUnitPrice(String(item.unitPrice));
    setEditDiscountPct(
      item.discountPercent != null ? String(item.discountPercent) : "",
    );
    setExpandedLineId(item._id);
  };

  const handleSaveLineEdit = async () => {
    if (!orgId || !editingLineId) return;
    const parsedQty = editQty !== "" ? parseFiniteNumber(editQty) : undefined;
    const parsedUnitPrice =
      editUnitPrice !== "" ? parseFiniteNumber(editUnitPrice) : undefined;
    const parsedDiscount =
      editDiscountPct !== "" ? parseFiniteNumber(editDiscountPct) : undefined;

    if (parsedQty !== undefined && (parsedQty == null || parsedQty <= 0)) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (
      parsedUnitPrice !== undefined &&
      (parsedUnitPrice == null || parsedUnitPrice < 0)
    ) {
      setError("Unit price must be non-negative.");
      return;
    }
    if (
      parsedDiscount !== undefined &&
      (parsedDiscount == null || parsedDiscount < 0 || parsedDiscount > 100)
    ) {
      setError("Discount must be between 0 and 100%.");
      return;
    }

    setActionLoading("editItem");
    setError(null);
    try {
      await updateQuoteLineItem({
        orgId,
        lineItemId: editingLineId as Id<"quoteLineItems">,
        description: editDesc.trim() || undefined,
        qty: parsedQty,
        unitPrice: parsedUnitPrice,
        discountPercent: parsedDiscount,
      });
      setEditingLineId(null);
      toast.success("Line item updated");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update line item.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteItem = async () => {
    if (!orgId || !deleteItemId) return;
    setActionLoading("deleteItem");
    setError(null);
    try {
      await removeQuoteLineItem({ orgId, lineItemId: deleteItemId });
      setDeleteItemDialog(false);
      toast.success("Line item removed");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove line item.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Loading / Error States ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!quoteId || !quote) {
    return (
      <Card className="border-border/60 max-w-4xl mx-auto">
        <CardContent className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {!quoteId ? "Quote reference is missing." : "Quote not found."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => (onBack ? onBack() : router.back())}
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── PDF document ─────────────────────────────────────────────────────
  const quotePdfDocument = (
    <QuotePDF
      orgName={org?.name ?? "Athelon Aviation"}
      quote={{
        quoteNumber: quote.quoteNumber,
        createdAt: quote.createdAt,
        expiresAt: quote.expiresAt ?? undefined,
        status: quote.status,
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        currency: quote.currency,
      }}
      lineItems={quote.lineItems.map((li) => ({
        _id: String(li._id),
        description: li.description,
        qty: li.qty,
        unitPrice: li.unitPrice,
        total: li.total,
        departmentSection: li.departmentSection,
        customerDecision: li.customerDecision,
      }))}
      departments={quote.departments.map((dept) => ({
        _id: String(dept._id),
        sectionName: dept.sectionName,
      }))}
      customer={customer}
    />
  );

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div
      className="space-y-5 max-w-4xl mx-auto"
      data-testid="quote-document-view"
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {!hideBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (onBack ? onBack() : router.back())}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground font-mono">
                {quote.quoteNumber}
              </h1>
              <Badge
                variant="outline"
                className={`text-[10px] font-medium border ${STATUS_STYLES[quote.status] ?? ""}`}
              >
                {quote.status}
              </Badge>
              {isExpired && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                >
                  EXPIRED
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              {customer && (
                <span className="font-medium text-foreground">
                  {customer.companyName ?? customer.name}
                </span>
              )}
              {aircraft && (
                <>
                  <span>•</span>
                  <span>
                    {aircraft.currentRegistration ?? `${aircraft.make} ${aircraft.model}`}
                  </span>
                </>
              )}
              <span>•</span>
              <span>Created {formatDate(quote.createdAt)}</span>
              {quote.expiresAt && (
                <>
                  <span>•</span>
                  <span>Expires {formatDate(quote.expiresAt)}</span>
                </>
              )}
            </div>
            {quote.projectTitle && (
              <p className="mt-0.5 text-sm text-foreground">
                {quote.projectTitle}
              </p>
            )}
          </div>
        </div>

        <QuoteActionBar
          status={quote.status as "DRAFT" | "SENT" | "APPROVED" | "CONVERTED" | "DECLINED"}
          convertibleLineCount={convertibleLineCount}
          convertedToWorkOrderId={
            quote.convertedToWorkOrderId
              ? String(quote.convertedToWorkOrderId)
              : undefined
          }
          isLoading={actionLoading}
          onSend={handleSend}
          onApprove={handleApprove}
          onDecline={() => setDeclineDialog(true)}
          onCreateRevision={handleCreateRevision}
          onConvertToWO={() => setConvertDialog(true)}
          onCreateInvoice={() => {
            setInvoiceDueDate("");
            setInvoicePaymentTerms("");
            setCreateInvoiceDialog(true);
          }}
          onDownloadPDF={
            <DownloadPDFButton
              document={quotePdfDocument}
              fileName={`Quote-${quote.quoteNumber}.pdf`}
              label="Download PDF"
            />
          }
          onPrint={<PrintButton />}
        />
      </div>

      {/* ── Status Stepper ── */}
      <div className="flex justify-center py-2">
        <QuoteStatusStepper
          status={quote.status as "DRAFT" | "SENT" | "APPROVED" | "CONVERTED" | "DECLINED"}
        />
      </div>

      {/* ── Alerts ── */}
      {isExpiringSoon && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          This quote expires soon ({formatDate(quote.expiresAt!)}). Consider
          sending a revision or obtaining approval before expiry.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Notes (if present) ── */}
      {quote.notes && (
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1">
              Notes
            </p>
            <p className="text-xs text-foreground whitespace-pre-wrap">
              {quote.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Line Items ── */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Scope of Work
              <Badge
                variant="secondary"
                className="ml-2 text-[10px] px-1.5 py-0"
              >
                {quote.lineItems.length}{" "}
                {quote.lineItems.length === 1 ? "item" : "items"}
              </Badge>
            </CardTitle>
            {isDraft && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => setAddItemOpen(!addItemOpen)}
              >
                <Plus className="w-3 h-3" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Add item inline form */}
          {addItemOpen && isDraft && (
            <div className="mx-4 mb-3 rounded-lg border border-dashed border-border/60 p-3 space-y-3 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                New Line Item
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_80px_100px] gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Type
                  </Label>
                  <select
                    value={addType}
                    onChange={(e) =>
                      setAddType(
                        e.target.value as "labor" | "part" | "external_service",
                      )
                    }
                    className="h-8 w-full rounded-md border border-border/60 bg-background px-2 text-xs"
                  >
                    <option value="labor">Labor</option>
                    <option value="part">Part</option>
                    <option value="external_service">Service</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Description
                  </Label>
                  <Input
                    value={addDesc}
                    onChange={(e) => setAddDesc(e.target.value)}
                    placeholder="Describe the item..."
                    className="h-8 text-xs border-border/60"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground text-right block">
                    Qty
                  </Label>
                  <Input
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="h-8 text-xs border-border/60 text-right"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground text-right block">
                    Unit $
                  </Label>
                  <Input
                    value={addUnitPrice}
                    onChange={(e) => setAddUnitPrice(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-8 text-xs border-border/60 text-right"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setAddItemOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleAddLineItem}
                  disabled={actionLoading === "addItem"}
                >
                  <Plus className="w-3 h-3" />
                  {actionLoading === "addItem" ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          )}

          {/* Line items list */}
          {quote.lineItems.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No line items on this quote.
              </p>
              {isDraft && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 h-7 text-xs gap-1.5"
                  onClick={() => setAddItemOpen(true)}
                >
                  <Plus className="w-3 h-3" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {quote.lineItems.map((item) => {
                const isExpanded = expandedLineId === item._id;
                const isEditing = editingLineId === item._id;
                const decision = item.customerDecision as
                  | QuoteLineDecision
                  | undefined;
                const decisionStyle = decision
                  ? DECISION_STYLES[decision]
                  : null;

                return (
                  <div
                    key={item._id}
                    className={cn(
                      "px-4 py-3 transition-colors",
                      isExpanded && "bg-muted/20",
                    )}
                  >
                    {/* Collapsed row */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 text-left"
                      onClick={() =>
                        setExpandedLineId(isExpanded ? null : item._id)
                      }
                    >
                      {/* Type dot */}
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0",
                          TYPE_DOT_COLORS[item.type] ?? "bg-muted-foreground",
                        )}
                        title={TYPE_LABELS[item.type] ?? item.type}
                      />

                      {/* Description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.description}</p>
                        {item.discountPercent ? (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400">
                            -{item.discountPercent}% discount
                          </span>
                        ) : null}
                      </div>

                      {/* Qty × Price */}
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 hidden sm:inline">
                        {item.qty} × ${fmtCurrency(item.unitPrice)}
                      </span>

                      {/* Total */}
                      <span className="text-sm font-semibold tabular-nums shrink-0">
                        ${fmtCurrency(item.total)}
                      </span>

                      {/* Decision badge */}
                      {decisionStyle && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] border shrink-0",
                            decisionStyle.className,
                          )}
                        >
                          {decisionStyle.label}
                        </Badge>
                      )}

                      {/* Expand chevron */}
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 pl-5 space-y-3">
                        {/* Inline editing form (DRAFT only) */}
                        {isEditing && isDraft ? (
                          <div className="space-y-2 rounded-lg border border-border/60 p-3 bg-background">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                Description
                              </Label>
                              <Input
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Qty
                                </Label>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={editQty}
                                  onChange={(e) => setEditQty(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Unit $
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editUnitPrice}
                                  onChange={(e) =>
                                    setEditUnitPrice(e.target.value)
                                  }
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  Discount %
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={editDiscountPct}
                                  onChange={(e) =>
                                    setEditDiscountPct(e.target.value)
                                  }
                                  placeholder="0"
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEditingLineId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleSaveLineEdit}
                                disabled={actionLoading === "editItem"}
                              >
                                {actionLoading === "editItem"
                                  ? "Saving..."
                                  : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Detail info */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge
                                variant="outline"
                                className="text-[10px] border-border/50"
                              >
                                {TYPE_LABELS[item.type] ?? item.type}
                              </Badge>
                              <span className="text-muted-foreground tabular-nums sm:hidden">
                                {item.qty} × ${fmtCurrency(item.unitPrice)}
                              </span>
                            </div>

                            {/* Actions row */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Inline decision buttons */}
                              {canDecideLineItems && (
                                <div className="flex items-center gap-1 rounded-md border border-border/50 p-0.5">
                                  <Button
                                    size="sm"
                                    variant={
                                      decision === "approved"
                                        ? "default"
                                        : "ghost"
                                    }
                                    className={cn(
                                      "h-6 text-[10px] px-2",
                                      decision === "approved" &&
                                        "bg-green-600 hover:bg-green-700 text-white",
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLineDecision(
                                        item._id as Id<"quoteLineItems">,
                                        "approved",
                                      );
                                    }}
                                    disabled={actionLoading?.startsWith(
                                      "decision:",
                                    )}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={
                                      decision === "deferred"
                                        ? "default"
                                        : "ghost"
                                    }
                                    className={cn(
                                      "h-6 text-[10px] px-2",
                                      decision === "deferred" &&
                                        "bg-amber-600 hover:bg-amber-700 text-white",
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLineDecision(
                                        item._id as Id<"quoteLineItems">,
                                        "deferred",
                                      );
                                    }}
                                    disabled={actionLoading?.startsWith(
                                      "decision:",
                                    )}
                                  >
                                    Defer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={
                                      decision === "declined"
                                        ? "default"
                                        : "ghost"
                                    }
                                    className={cn(
                                      "h-6 text-[10px] px-2",
                                      decision === "declined" &&
                                        "bg-red-600 hover:bg-red-700 text-white",
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLineDecision(
                                        item._id as Id<"quoteLineItems">,
                                        "declined",
                                      );
                                    }}
                                    disabled={actionLoading?.startsWith(
                                      "decision:",
                                    )}
                                  >
                                    Decline
                                  </Button>
                                </div>
                              )}

                              {/* Edit / Delete (DRAFT only) */}
                              {isDraft && (
                                <div className="flex items-center gap-1 ml-auto">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditLine({
                                        _id: item._id,
                                        description: item.description,
                                        qty: item.qty,
                                        unitPrice: item.unitPrice,
                                        discountPercent: item.discountPercent,
                                      });
                                    }}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteItemId(
                                        item._id as Id<"quoteLineItems">,
                                      );
                                      setDeleteItemDialog(true);
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Departments (if any) ── */}
      {quote.departments.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Department Sections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quote.departments.map((dept) => (
              <div
                key={dept._id}
                className="flex items-center justify-between p-3 rounded-md bg-muted/30"
              >
                <span className="text-sm">{dept.sectionName}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] border-border/50"
                >
                  {dept.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Financial Footer ── */}
      <QuoteFinancialFooter
        metrics={metrics}
        total={quote.total}
        laborTotal={quote.laborTotal}
        partsTotal={quote.partsTotal}
      />

      {/* ── Dialogs ── */}

      {/* Decline Dialog */}
      <Dialog
        open={declineDialog}
        onOpenChange={(open) => {
          setDeclineDialog(open);
          if (!open) setDeclineReason("");
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Decline Quote</DialogTitle>
            <DialogDescription>
              Provide a reason for declining this quote.
            </DialogDescription>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeclineDialog(false)}
            >
              Cancel
            </Button>
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
            <DialogDescription>
              Create a new work order from this approved quote.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
                  onChange={(e) =>
                    setWoType(
                      e.target.value as "routine" | "unscheduled",
                    )
                  }
                  className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                >
                  <option value="routine">Routine</option>
                  <option value="unscheduled">Unscheduled</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <select
                  value={woPriority}
                  onChange={(e) =>
                    setWoPriority(
                      e.target.value as "routine" | "urgent" | "aog",
                    )
                  }
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConvertDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConvert}
              disabled={actionLoading === "convert"}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading === "convert"
                ? "Converting..."
                : "Create Work Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog
        open={createInvoiceDialog}
        onOpenChange={(open) => {
          setCreateInvoiceDialog(open);
          if (!open) {
            setInvoiceDueDate("");
            setInvoicePaymentTerms("");
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Invoice from Quote</DialogTitle>
            <DialogDescription>
              Create a draft invoice from {quote.quoteNumber}. All line items
              will be copied over.
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateInvoiceDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateInvoice}
              disabled={actionLoading === "createInvoice"}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === "createInvoice"
                ? "Creating..."
                : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Line Item Confirm */}
      <Dialog open={deleteItemDialog} onOpenChange={setDeleteItemDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove Line Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this line item? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteItemDialog(false)}
            >
              Cancel
            </Button>
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
