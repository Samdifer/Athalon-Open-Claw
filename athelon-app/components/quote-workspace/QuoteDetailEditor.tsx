"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/hooks/useRouter";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
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
  Plus,
  Package,
  Wrench,
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
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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

type QuoteLineDecision = "approved" | "declined" | "deferred";
type QuoteLineCategory = "airworthiness" | "recommended" | "customer_info" | "uncategorized";

const DECISION_BADGE_STYLES: Record<QuoteLineDecision, string> = {
  approved: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  declined: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  deferred: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

const CATEGORY_BADGE_STYLES: Record<QuoteLineCategory, string> = {
  airworthiness: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  recommended: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  customer_info: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  uncategorized: "bg-muted text-muted-foreground border-border/50",
};

function mapDiscrepancyTypeToCategory(
  discrepancyType?: "mandatory" | "recommended" | "customer_information" | "ops_check",
): { key: QuoteLineCategory; label: string } {
  if (discrepancyType === "mandatory") return { key: "airworthiness", label: "Airworthiness" };
  if (discrepancyType === "recommended") return { key: "recommended", label: "Recommended" };
  if (discrepancyType === "customer_information") return { key: "customer_info", label: "Customer Info" };
  if (discrepancyType === "ops_check") return { key: "recommended", label: "Operational Check" };
  return { key: "uncategorized", label: "Uncategorized" };
}

function lineDecisionLabel(decision: QuoteLineDecision): string {
  switch (decision) {
    case "approved":
      return "Accepted";
    case "declined":
      return "Declined";
    case "deferred":
      return "Deferred";
  }
}

type LineItemType = "labor" | "part" | "external_service";

interface DraftAddLineItem {
  type: LineItemType;
  description: string;
  qty: string;
  unitPrice: string;
}

interface LaborKitLaborItem {
  description: string;
  estimatedHours: number;
}

interface LaborKitPartItem {
  partNumber: string;
  description: string;
  quantity: number;
  unitCost?: number;
}

interface LaborKitExternalServiceItem {
  vendorName?: string;
  description: string;
  estimatedCost: number;
}

interface LaborKitForQuote {
  _id: string;
  name: string;
  aircraftType?: string;
  ataChapter?: string;
  laborRate?: number;
  laborItems: LaborKitLaborItem[];
  requiredParts: LaborKitPartItem[];
  externalServices?: LaborKitExternalServiceItem[];
  isActive: boolean;
}

function numberToInputString(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "0";
  return String(Math.round(value * 100) / 100);
}

function buildLineItemsFromLaborKit(kit: LaborKitForQuote): DraftAddLineItem[] {
  const lines: DraftAddLineItem[] = [];

  for (const labor of kit.laborItems ?? []) {
    if (!labor.description.trim() || labor.estimatedHours <= 0) continue;
    lines.push({
      type: "labor",
      description: `${kit.name} · ${labor.description.trim()}`,
      qty: numberToInputString(labor.estimatedHours),
      unitPrice: numberToInputString(kit.laborRate),
    });
  }

  for (const part of kit.requiredParts ?? []) {
    if (!part.partNumber.trim() || part.quantity <= 0) continue;
    lines.push({
      type: "part",
      description: `${kit.name} · ${part.partNumber.trim()} — ${part.description?.trim() || "Part"}`,
      qty: numberToInputString(part.quantity),
      unitPrice: numberToInputString(part.unitCost),
    });
  }

  for (const svc of kit.externalServices ?? []) {
    if (!svc.description.trim()) continue;
    lines.push({
      type: "external_service",
      description: `${kit.name} · ${svc.description.trim()}${svc.vendorName ? ` (${svc.vendorName})` : ""}`,
      qty: "1",
      unitPrice: numberToInputString(svc.estimatedCost),
    });
  }

  return lines;
}

/** Convert a Unix ms timestamp to a date input value (YYYY-MM-DD). */
function toDateInputValue(ts: number): string {
  return new Date(ts).toISOString().split("T")[0];
}

/** Convert a date input value (YYYY-MM-DD) to a Unix ms timestamp. */
function fromDateInputValue(val: string): number {
  return new Date(val).getTime();
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type QuoteDetailEditorProps = {
  quoteId?: Id<"quotes">;
  hideBackButton?: boolean;
  fullWidth?: boolean;
  onBack?: () => void;
  onQuoteNavigate?: (quoteId: Id<"quotes">) => void;
};

export function QuoteDetailEditor({
  quoteId: quoteIdOverride,
  hideBackButton = false,
  fullWidth = false,
  onBack,
  onQuoteNavigate,
}: QuoteDetailEditorProps = {}) {
  const params = useParams();
  const router = useRouter();
  const quoteId = (quoteIdOverride ??
    (params.id as Id<"quotes"> | undefined)) as Id<"quotes">;
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const quote = useQuery(
    api.billing.getQuote,
    orgId && quoteId ? { orgId, quoteId } : "skip",
  );
  const aircraft = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const laborKits = useQuery(
    api.laborKits.listLaborKits,
    orgId ? { orgId } : "skip",
  );

  const sendQuote = useMutation(api.billing.sendQuote);
  const approveQuote = useMutation(api.billing.approveQuote);
  const declineQuote = useMutation(api.billing.declineQuote);
  const convertQuote = useMutation(api.billing.convertQuoteToWorkOrder);
  const decideQuoteLineItem = useMutation(api.gapFixes.decideQuoteLineItem);
  const addQuoteLineItem = useMutation(api.billing.addQuoteLineItem);
  // GAP-08: Create revision
  const createQuoteRevision = useMutation(api.billingV4.createQuoteRevision);
  // GAP-13: Create invoice from quote
  const createInvoiceFromQuote = useMutation(api.billingV4.createInvoiceFromQuote);
  // GAP-06: Edit/remove line items
  const updateQuoteLineItem = useMutation(api.billingV4.updateQuoteLineItem);
  const removeQuoteLineItem = useMutation(api.billingV4.removeQuoteLineItem);
  const computePrice = useAction(api.pricing.computePrice);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Decline dialog
  const [declineDialog, setDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Convert to WO dialog
  const [convertDialog, setConvertDialog] = useState(false);
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
  const [lineDecisionDialog, setLineDecisionDialog] = useState(false);
  const [lineDecisionItemId, setLineDecisionItemId] = useState<Id<"quoteLineItems"> | null>(null);
  const [lineDecisionValue, setLineDecisionValue] = useState<QuoteLineDecision>("approved");
  const [lineDecisionNotes, setLineDecisionNotes] = useState("");
  const [lineDecisionItemLabel, setLineDecisionItemLabel] = useState("");
  const [kitSearch, setKitSearch] = useState("");
  const [addLineItemDraft, setAddLineItemDraft] = useState<DraftAddLineItem>({
    type: "labor",
    description: "",
    qty: "1",
    unitPrice: "0",
  });
  const [pricingLoading, setPricingLoading] = useState(false);

  const isLoading =
    !isLoaded ||
    (quoteId ? quote === undefined : false) ||
    aircraft === undefined ||
    laborKits === undefined;

  // PDF Download
  const handleDownloadPDF = async () => {
    setActionLoading("pdf"); setError(null);
    try {
      const { QuotePDF } = await import("@/lib/pdf/QuotePDF");
      const { downloadPDF } = await import("@/lib/pdf/download");
      const el = QuotePDF({
        orgName: "Athelon Aviation",
        quoteNumber: quote!.quoteNumber,
        createdAt: quote!.createdAt,
        expiresAt: quote!.expiresAt ?? undefined,
        status: quote!.status,
        validityDays: quote!.expiresAt
          ? Math.ceil((quote!.expiresAt - quote!.createdAt) / (1000 * 60 * 60 * 24))
          : undefined,
        lineItems: quote!.lineItems.map((li) => ({
          description: li.description,
          type: li.type,
          qty: li.qty,
          unitPrice: li.unitPrice,
          discountPercent: li.discountPercent,
          total: li.total,
        })),
        subtotal: quote!.subtotal,
        tax: quote!.tax,
        total: quote!.total,
      });
      await downloadPDF(el, `Quote-${quote!.quoteNumber}.pdf`);
      toast.success("Quote PDF downloaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PDF.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async () => {
    if (!orgId || !quoteId) return;
    // Guard: cannot send a quote with no line items — blank $0 quote is invalid
    if (!quote || quote.lineItems.length === 0) {
      setError("Cannot send a quote with no line items. Add at least one item before sending.");
      return;
    }
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
    if (!orgId || !quoteId) return;
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
    if (!orgId || !quoteId || !declineReason.trim()) return;
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

  const openLineDecisionDialog = (
    item: {
      _id: Id<"quoteLineItems">;
      description: string;
      customerDecision?: QuoteLineDecision;
      customerDecisionNotes?: string;
    },
    decision: QuoteLineDecision,
  ) => {
    setLineDecisionItemId(item._id);
    setLineDecisionItemLabel(item.description);
    setLineDecisionValue(decision);
    setLineDecisionNotes(item.customerDecisionNotes ?? "");
    setError(null);
    setLineDecisionDialog(true);
  };

  const handleLineDecision = async () => {
    if (!orgId || !lineDecisionItemId) return;
    setActionLoading(`decision:${lineDecisionItemId}`);
    setError(null);
    try {
      await decideQuoteLineItem({
        orgId,
        lineItemId: lineDecisionItemId,
        decision: lineDecisionValue,
        decisionNotes: lineDecisionNotes.trim() || undefined,
      });
      setLineDecisionDialog(false);
      toast.success(`Line item ${lineDecisionLabel(lineDecisionValue).toLowerCase()}.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to apply line item decision.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvert = async () => {
    if (!orgId || !quoteId) return;
    setActionLoading("convert"); setError(null);
    try {
      const newWoId = await convertQuote({
        orgId,
        quoteId,
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
    if (!orgId || !techId || !quoteId) return;
    setActionLoading("revision"); setError(null);
    try {
      const newQuoteId = await createQuoteRevision({
        orgId,
        originalQuoteId: quoteId,
        createdByTechId: techId as Id<"technicians">,
      });
      if (onQuoteNavigate) {
        onQuoteNavigate(newQuoteId);
      } else {
        router.push(`/billing/quotes/${newQuoteId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create revision.");
    } finally {
      setActionLoading(null);
    }
  };

  // GAP-13: Create invoice from quote
  const handleCreateInvoice = async () => {
    if (!orgId || !techId || !quoteId) return;
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
    setError(null); // Clear any stale page-level error when opening this dialog
    setEditItemDialog(true);
  };

  const handleEditItem = async () => {
    if (!orgId || !editItemId) return;
    // Validate qty > 0 — zero-qty line items are zombie entries on the quote
    if (editQty !== "" && parseFloat(editQty) <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    // Validate unitPrice >= 0
    if (editUnitPrice !== "" && parseFloat(editUnitPrice) < 0) {
      setError("Unit price cannot be negative.");
      return;
    }
    // Validate discount 0–100%
    if (editDiscountPct !== "") {
      const disc = parseFloat(editDiscountPct);
      if (disc < 0 || disc > 100) {
        setError("Discount must be between 0 and 100%.");
        return;
      }
    }
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

  const updateAddLineDraft = (field: keyof DraftAddLineItem, value: string) => {
    setAddLineItemDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleComputeDraftPrice = async () => {
    if (!orgId) return;
    const qty = parseFloat(addLineItemDraft.qty);
    const baseCost = parseFloat(addLineItemDraft.unitPrice);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Draft line quantity must be greater than zero before pricing.");
      return;
    }
    if (Number.isNaN(baseCost) || baseCost < 0) {
      setError("Draft line base unit price must be zero or higher.");
      return;
    }

    setPricingLoading(true);
    setError(null);
    try {
      const priced = await computePrice({
        orgId,
        customerId: quote?.customerId as Id<"customers"> | undefined,
        itemType: addLineItemDraft.type,
        qty,
        baseCost,
      });
      setAddLineItemDraft((prev) => ({
        ...prev,
        unitPrice: numberToInputString(priced.unitPrice),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compute pricing.");
    } finally {
      setPricingLoading(false);
    }
  };

  const handleAddDraftLineItem = async () => {
    if (!orgId || !quote || !quoteId) return;
    if (quote.status !== "DRAFT") {
      setError("Line items can only be added while quote status is DRAFT.");
      return;
    }

    const qty = parseFloat(addLineItemDraft.qty);
    const unitPrice = parseFloat(addLineItemDraft.unitPrice);
    if (!addLineItemDraft.description.trim()) {
      setError("Line item description is required.");
      return;
    }
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Line item quantity must be greater than zero.");
      return;
    }
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      setError("Line item unit price must be zero or higher.");
      return;
    }

    setActionLoading("addItem");
    setError(null);
    try {
      await addQuoteLineItem({
        orgId,
        quoteId,
        type: addLineItemDraft.type,
        description: addLineItemDraft.description.trim(),
        qty,
        unitPrice,
      });
      setAddLineItemDraft({
        type: addLineItemDraft.type,
        description: "",
        qty: "1",
        unitPrice: "0",
      });
      toast.success("Line item added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add line item.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddLaborKitToDraftQuote = async (kit: LaborKitForQuote) => {
    if (!orgId || !quote || !quoteId) return;
    if (quote.status !== "DRAFT") {
      setError("Labor kits can only be applied while quote status is DRAFT.");
      return;
    }

    const generatedLines = buildLineItemsFromLaborKit(kit);
    if (generatedLines.length === 0) {
      setError(`"${kit.name}" has no valid labor/parts/service rows to apply.`);
      return;
    }

    setActionLoading(`kit:${kit._id}`);
    setError(null);
    try {
      for (const line of generatedLines) {
        await addQuoteLineItem({
          orgId,
          quoteId,
          type: line.type,
          description: line.description,
          qty: parseFloat(line.qty),
          unitPrice: parseFloat(line.unitPrice),
        });
      }
      toast.success(`Added ${generatedLines.length} line items from ${kit.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply labor kit.");
    } finally {
      setActionLoading(null);
    }
  };

  const matchingLaborKits = useMemo(() => {
    const activeKits = ((laborKits ?? []) as LaborKitForQuote[]).filter((kit) => kit.isActive);
    const query = kitSearch.trim().toLowerCase();
    const selectedAircraft = (aircraft ?? []).find((ac) => ac._id === quote?.aircraftId);
    const aircraftTokens = selectedAircraft
      ? [selectedAircraft.make, selectedAircraft.model]
          .map((v) => v?.toLowerCase().trim())
          .filter((v): v is string => !!v)
      : [];

    return activeKits.filter((kit) => {
      const kitAircraft = (kit.aircraftType ?? "").toLowerCase().trim();
      const searchHit =
        query.length === 0 ||
        kit.name.toLowerCase().includes(query) ||
        (kit.ataChapter ?? "").toLowerCase().includes(query) ||
        kitAircraft.includes(query);
      if (!searchHit) return false;
      if (!kitAircraft || aircraftTokens.length === 0) return true;
      return aircraftTokens.some(
        (token) => token.includes(kitAircraft) || kitAircraft.includes(token),
      );
    });
  }, [laborKits, kitSearch, aircraft, quote?.aircraftId]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!quoteId) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Quote reference is missing.</p>
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

  if (!quote) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Quote not found.</p>
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

  const canSend = quote.status === "DRAFT";
  const canApprove = quote.status === "SENT";
  const canDecline = quote.status === "SENT";
  const canConvert = quote.status === "APPROVED";
  // GAP-08: Revision allowed on SENT or DECLINED quotes
  const canRevise = quote.status === "SENT" || quote.status === "DECLINED";
  // GAP-13: Create invoice on APPROVED quotes
  const canCreateInvoice = quote.status === "APPROVED";
  const isDraft = quote.status === "DRAFT";
  const canDecideLineItems =
    quote.status === "DRAFT" || quote.status === "SENT" || quote.status === "APPROVED";

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
    <div
      className={cn("space-y-5", fullWidth ? "max-w-none" : "max-w-3xl")}
      data-testid="quote-detail-editor"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!hideBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (onBack ? onBack() : router.back())}
              className="h-8 gap-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          )}
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={actionLoading === "pdf"}
            className="h-8 gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {actionLoading === "pdf" ? "Generating..." : "Download PDF"}
          </Button>
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

      {/* Draft Composer */}
      {isDraft && (
        <Card className="border-border/60" data-testid="quote-draft-composer">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Draft Composer</CardTitle>
            <p className="text-xs text-muted-foreground">
              Add manual quote lines or apply labor kit templates before sending.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
              <div className="rounded-md border border-border/60 p-3 space-y-3">
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Add Line Item
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr_90px_110px] gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Type</Label>
                    <select
                      value={addLineItemDraft.type}
                      onChange={(e) =>
                        updateAddLineDraft(
                          "type",
                          e.target.value as DraftAddLineItem["type"],
                        )
                      }
                      className="h-8 w-full rounded-md border border-border/60 bg-background px-2 text-xs"
                    >
                      {(Object.entries(LINE_TYPE_LABELS) as [LineItemType, string][]).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Description</Label>
                    <Input
                      value={addLineItemDraft.description}
                      onChange={(e) => updateAddLineDraft("description", e.target.value)}
                      placeholder="Describe labor, parts, or external service..."
                      className="h-8 text-xs border-border/60"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground text-right block">Qty</Label>
                    <Input
                      value={addLineItemDraft.qty}
                      onChange={(e) => updateAddLineDraft("qty", e.target.value)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="h-8 text-xs border-border/60 text-right"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground text-right block">
                      Unit Price
                    </Label>
                    <Input
                      value={addLineItemDraft.unitPrice}
                      onChange={(e) => updateAddLineDraft("unitPrice", e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8 text-xs border-border/60 text-right"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Extended: $
                    {(
                      (parseFloat(addLineItemDraft.qty) || 0) *
                      (parseFloat(addLineItemDraft.unitPrice) || 0)
                    ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={handleComputeDraftPrice}
                      disabled={pricingLoading || actionLoading === "addItem"}
                    >
                      {pricingLoading ? "Computing..." : "Apply Pricing Rule"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={handleAddDraftLineItem}
                      disabled={actionLoading === "addItem" || pricingLoading}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {actionLoading === "addItem" ? "Adding..." : "Add Line"}
                    </Button>
                  </div>
                </div>
              </div>

              <div
                className="rounded-md border border-border/60 p-3 space-y-3"
                data-testid="draft-labor-kit-panel"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                      Labor Kits
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Apply scheduler templates into this quote.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" asChild className="h-7 text-xs">
                    <Link to="/billing/labor-kits">
                      <Wrench className="w-3.5 h-3.5" />
                      Manage
                    </Link>
                  </Button>
                </div>

                <Input
                  value={kitSearch}
                  onChange={(e) => setKitSearch(e.target.value)}
                  placeholder="Search kits..."
                  className="h-8 text-xs border-border/60"
                />

                {matchingLaborKits.length === 0 ? (
                  <div className="rounded border border-dashed border-border/60 p-3 text-[11px] text-muted-foreground">
                    No active kits match this quote.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {matchingLaborKits.map((kit) => {
                      const itemCount =
                        (kit.laborItems?.length ?? 0) +
                        (kit.requiredParts?.length ?? 0) +
                        (kit.externalServices?.length ?? 0);

                      return (
                        <div
                          key={kit._id}
                          className="rounded-md border border-border/60 px-2.5 py-2 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium truncate">{kit.name}</p>
                              {kit.aircraftType && (
                                <Badge variant="outline" className="text-[10px]">
                                  {kit.aircraftType}
                                </Badge>
                              )}
                              {kit.ataChapter && (
                                <Badge variant="outline" className="text-[10px]">
                                  ATA {kit.ataChapter}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {itemCount} template line{itemCount === 1 ? "" : "s"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleAddLaborKitToDraftQuote(kit)}
                            disabled={actionLoading === `kit:${kit._id}` || actionLoading === "addItem"}
                            data-testid={`apply-kit-${kit._id}`}
                          >
                            <Package className="w-3.5 h-3.5" />
                            {actionLoading === `kit:${kit._id}` ? "Applying..." : "Apply"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right">Unit $</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs">Customer Decision</TableHead>
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
                      {(() => {
                        const category = mapDiscrepancyTypeToCategory(
                          item.discrepancyType as
                            | "mandatory"
                            | "recommended"
                            | "customer_information"
                            | "ops_check"
                            | undefined,
                        );
                        return (
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] border ${CATEGORY_BADGE_STYLES[category.key]}`}
                            >
                              {category.label}
                            </Badge>
                            {item.discrepancyNumber ? (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {item.discrepancyNumber}
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-border/50">
                        {LINE_TYPE_LABELS[item.type] ?? item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right">{item.qty}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-sm font-medium text-right tabular-nums">${item.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        {item.customerDecision ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] border ${DECISION_BADGE_STYLES[item.customerDecision as QuoteLineDecision]}`}
                          >
                            {lineDecisionLabel(item.customerDecision as QuoteLineDecision)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">
                            Pending
                          </Badge>
                        )}
                        {item.customerDecisionAt ? (
                          <div className="text-[10px] text-muted-foreground">
                            {formatDate(item.customerDecisionAt)}
                          </div>
                        ) : null}
                        {item.customerDecisionByName ? (
                          <div className="text-[10px] text-muted-foreground">
                            by {item.customerDecisionByName}
                          </div>
                        ) : null}
                        {canDecideLineItems && (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              onClick={() =>
                                openLineDecisionDialog(
                                  {
                                    _id: item._id as Id<"quoteLineItems">,
                                    description: item.description,
                                    customerDecision: item.customerDecision as QuoteLineDecision | undefined,
                                    customerDecisionNotes: item.customerDecisionNotes,
                                  },
                                  "approved",
                                )
                              }
                            >
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400"
                              onClick={() =>
                                openLineDecisionDialog(
                                  {
                                    _id: item._id as Id<"quoteLineItems">,
                                    description: item.description,
                                    customerDecision: item.customerDecision as QuoteLineDecision | undefined,
                                    customerDecisionNotes: item.customerDecisionNotes,
                                  },
                                  "deferred",
                                )
                              }
                            >
                              Defer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px] border-red-500/40 text-red-600 dark:text-red-400"
                              onClick={() =>
                                openLineDecisionDialog(
                                  {
                                    _id: item._id as Id<"quoteLineItems">,
                                    description: item.description,
                                    customerDecision: item.customerDecision as QuoteLineDecision | undefined,
                                    customerDecisionNotes: item.customerDecisionNotes,
                                  },
                                  "declined",
                                )
                              }
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
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

      {/* Line Item Decision Dialog */}
      <Dialog open={lineDecisionDialog} onOpenChange={setLineDecisionDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Line Item Decision</DialogTitle>
            <DialogDescription>
              Set customer decision for this quote line item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Line Item</Label>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-foreground">
                {lineDecisionItemLabel || "—"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Decision *</Label>
              <select
                value={lineDecisionValue}
                onChange={(e) => setLineDecisionValue(e.target.value as QuoteLineDecision)}
                className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
              >
                <option value="approved">Accepted</option>
                <option value="deferred">Deferred</option>
                <option value="declined">Declined</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={lineDecisionNotes}
                onChange={(e) => setLineDecisionNotes(e.target.value)}
                placeholder="Decision notes…"
                className="text-sm resize-none h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLineDecisionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleLineDecision}
              disabled={!lineDecisionItemId || actionLoading?.startsWith("decision:")}
            >
              {actionLoading?.startsWith("decision:")
                ? "Saving..."
                : `Set ${lineDecisionLabel(lineDecisionValue)}`}
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
              <Label className="text-xs">Work Order Number</Label>
              <div className="h-9 rounded-md border border-border/60 bg-muted/30 px-3 text-sm font-mono text-muted-foreground flex items-center">
                Auto-generated on conversion
              </div>
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
              disabled={actionLoading === "convert"}
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
            {/* Show validation errors inside the dialog so user sees them without closing */}
            {editItemDialog && error && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setEditItemDialog(false); setError(null); }}>Cancel</Button>
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
