"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Plus,
  Search,
  Receipt,
  ChevronRight,
  AlertTriangle,
  Send,
  Ban,
  CreditCard,
  CheckSquare2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateUTC } from "@/lib/format";
import { ExportCSVButton } from "@/src/shared/components/ExportCSVButton";
import {
  INVOICE_CSV_COLUMNS,
  mapInvoicesForCSV,
} from "@/src/shared/utils/csvExport";
import { toast } from "sonner";

type InvoiceStatus = "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "VOID" | "all";
type PaymentMethod = "cash" | "check" | "credit_card" | "wire" | "ach" | "other";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SENT: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PARTIAL: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PAID: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  VOID: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIAL: "Partial",
  PAID: "Paid",
  VOID: "Void",
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "credit_card", label: "Credit Card" },
  { value: "wire", label: "Wire Transfer" },
  { value: "ach", label: "ACH" },
  { value: "other", label: "Other" },
];

function agingDays(sentAt: number | undefined): number | null {
  if (!sentAt) return null;
  return Math.floor((Date.now() - sentAt) / (1000 * 60 * 60 * 24));
}

function AgingBadge({ days }: { days: number }) {
  if (days <= 30) return null;
  const cls =
    days > 90
      ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
      : days > 60
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
        : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
  return (
    <Badge
      variant="outline"
      className={`text-[10px] border ${cls} gap-0.5`}
      aria-label={`Invoice ${days} days overdue`}
    >
      <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
      {days}d
    </Badge>
  );
}

function OverdueBadge() {
  return (
    <Badge
      variant="outline"
      className="text-[10px] border bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 gap-0.5"
      aria-label="Invoice overdue"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
      Overdue
    </Badge>
  );
}

function InvoiceSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-4 w-4 mt-0.5 rounded" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Void Batch Dialog ─────────────────────────────────────────────────────────

interface VoidDialogProps {
  open: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

function VoidBatchDialog({ open, count, onClose, onConfirm }: VoidDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!reason.trim()) { setError("Void reason is required."); return; }
    setLoading(true); setError(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void invoices.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setReason(""); setError(null); onClose(); } }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Void {count} Invoice{count !== 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>
            Provide a reason for voiding. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label className="text-xs">Void Reason</Label>
          <Textarea
            placeholder="e.g. Duplicate invoice, customer request..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { setReason(""); setError(null); onClose(); }} disabled={loading}>Cancel</Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
          >
            {loading ? "Voiding..." : `Void ${count}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Batch Payment Dialog ──────────────────────────────────────────────────────

interface BatchPaymentInvoice {
  _id: Id<"invoices">;
  invoiceNumber: string;
  balance: number;
  total: number;
}

interface BatchPaymentDialogProps {
  open: boolean;
  invoices: BatchPaymentInvoice[];
  orgId: Id<"organizations">;
  currentTechId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function BatchPaymentDialog({
  open,
  invoices,
  orgId,
  currentTechId,
  onClose,
  onSuccess,
}: BatchPaymentDialogProps) {
  const batchRecordPayments = useMutation(api.billingV4b.batchRecordPayments);
  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<Record<string, PaymentMethod>>({});
  // Pre-populate with the current user's tech ID so they don't have to select themselves
  const [techId, setTechId] = useState<string>(currentTechId ?? "");
  const [loading, setLoading] = useState(false);

  // Sync pre-populated techId when auth finishes loading after first render
  useEffect(() => {
    if (currentTechId && !techId) setTechId(currentTechId);
  }, [currentTechId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ recorded: number; errors: string[] } | null>(null);

  const handlePayAll = () => {
    const newAmounts: Record<string, string> = {};
    for (const inv of invoices) {
      newAmounts[inv._id] = inv.balance.toFixed(2);
    }
    setAmounts(newAmounts);
  };

  const handleSubmit = async () => {
    if (!techId) { setError("Please select the technician recording these payments."); return; }

    const validationErrors: string[] = [];
    const payments = invoices
      .map((inv) => {
        const amountRaw = amounts[inv._id] ?? "0";
        const amount = Number.parseFloat(amountRaw);

        if (!Number.isFinite(amount) || amount <= 0) return null;
        if (amount > inv.balance) {
          validationErrors.push(`${inv.invoiceNumber}: payment exceeds balance ($${inv.balance.toFixed(2)}).`);
        }

        return {
          invoiceId: inv._id,
          amount,
          method: (methods[inv._id] ?? "cash") as PaymentMethod,
        };
      })
      .filter((p): p is { invoiceId: Id<"invoices">; amount: number; method: PaymentMethod } => p !== null);

    if (payments.length === 0) { setError("Enter at least one payment amount."); return; }
    if (validationErrors.length > 0) { setError(validationErrors[0]); return; }

    setLoading(true); setError(null);
    try {
      const res = await batchRecordPayments({
        orgId,
        payments,
        recordedByTechId: techId as Id<"technicians">,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payments.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmounts({});
    setMethods({});
    // BUG-BM-HUNT-004: Preserve current user prefill when closing/reopening dialog.
    setTechId(currentTechId ?? "");
    setError(null);
    setResult(null);
    onClose();
    if (result && result.recorded > 0) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Batch Payments</DialogTitle>
          <DialogDescription>
            Enter payment amounts for each invoice. Leave blank to skip.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-md bg-green-500/10 border border-green-500/30 text-sm text-green-600 dark:text-green-400">
              ✓ {result.recorded} payment{result.recorded !== 1 ? "s" : ""} recorded successfully.
            </div>
            {result.errors.length > 0 && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30">
                <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Errors:</p>
                <ul className="space-y-0.5">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600 dark:text-red-400">• {e}</li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button size="sm" onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-3 py-2 max-h-[380px] overflow-y-auto">
              {/* Tech selector */}
              <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">Recorded By</Label>
                  <Select value={techId} onValueChange={setTechId}>
                    <SelectTrigger className="h-8 text-xs mt-0.5">
                      <SelectValue placeholder="Select technician..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(technicians ?? []).map((t) => (
                        <SelectItem key={t._id} value={t._id} className="text-xs">
                          {t.legalName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs self-end"
                  onClick={handlePayAll}
                >
                  Pay All (Full Balance)
                </Button>
              </div>

              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[10px] uppercase text-muted-foreground font-medium px-0.5">
                <span>Invoice</span>
                <span className="w-28 text-right">Balance</span>
                <span className="w-28">Amount</span>
                <span className="w-28">Method</span>
              </div>

              {/* Invoice rows */}
              {invoices.map((inv) => (
                <div key={inv._id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                  <div>
                    <p className="text-xs font-mono font-medium">{inv.invoiceNumber}</p>
                    <p className="text-[10px] text-muted-foreground">Total: ${inv.total.toFixed(2)}</p>
                  </div>
                  <span className="text-xs font-medium w-28 text-right">
                    ${inv.balance.toFixed(2)}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    max={inv.balance}
                    step="0.01"
                    placeholder="0.00"
                    value={amounts[inv._id] ?? ""}
                    onChange={(e) =>
                      setAmounts((prev) => ({ ...prev, [inv._id]: e.target.value }))
                    }
                    className="h-8 text-xs w-28"
                  />
                  <Select
                    value={methods[inv._id] ?? "cash"}
                    onValueChange={(v) =>
                      setMethods((prev) => ({ ...prev, [inv._id]: v as PaymentMethod }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-xs">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 pt-1">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={loading || !techId}>
                {loading ? "Recording..." : "Submit Payments"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<InvoiceStatus>("all");
  const [search, setSearch] = useState("");
  // BUG-BM-101: Sort state — billing managers need to sort by amount or date to prioritize collections
  const [sortBy, setSortBy] = useState<"date" | "amount" | "balance">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const { orgId, techId: currentTechId, isLoaded } = useCurrentOrg();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch action dialogs
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [batchSending, setBatchSending] = useState(false);

  // Mutations
  const batchSendInvoices = useMutation(api.billingV4b.batchSendInvoices);
  const batchVoidInvoices = useMutation(api.billingV4b.batchVoidInvoices);

  const invoices = useQuery(
    api.billing.listInvoices,
    orgId ? { orgId } : "skip",
  );

  const customers = useQuery(
    api.customers.listCustomers,
    orgId ? { orgId } : "skip",
  );

  const customerMap = useMemo(() => {
    if (!customers) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const c of customers) m.set(c._id as string, c.name);
    return m;
  }, [customers]);

  const isLoading = !isLoaded || invoices === undefined || customers === undefined;

  const filtered = useMemo(() => {
    if (!invoices) return [];
    const byStatus = activeTab === "all" ? invoices : invoices.filter((inv) => inv.status === activeTab);
    const searched = !search.trim() ? byStatus : byStatus.filter((inv) => {
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (customerMap.get(inv.customerId as string) ?? "").toLowerCase().includes(q)
      );
    });
    // BUG-BM-101: Apply sort so billing manager can prioritize by largest balance, newest, etc.
    return [...searched].sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortBy === "amount") { aVal = a.total; bVal = b.total; }
      else if (sortBy === "balance") { aVal = a.balance; bVal = b.balance; }
      else { aVal = a._creationTime; bVal = b._creationTime; }
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [invoices, search, activeTab, sortBy, sortDir, customerMap]);

  const all = invoices ?? [];

  // Single-pass counter — O(n) instead of O(5n) separate .filter() calls.
  // Recomputes only when the invoices array reference changes (not on selection or search keystrokes).
  const counts = useMemo<Record<InvoiceStatus, number>>(() => {
    const acc: Record<InvoiceStatus, number> = { all: 0, DRAFT: 0, SENT: 0, PARTIAL: 0, PAID: 0, VOID: 0 };
    for (const inv of all) {
      acc.all++;
      if (inv.status in acc) acc[inv.status as InvoiceStatus]++;
    }
    return acc;
  // invoices reference is the stable identity — all is derived from it inline
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

  const tabs: { value: InvoiceStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "DRAFT", label: "Draft" },
    { value: "SENT", label: "Sent" },
    { value: "PARTIAL", label: "Partial" },
    { value: "PAID", label: "Paid" },
    { value: "VOID", label: "Void" },
  ];

  // Memoize ID list so selection helpers only recompute when filtered list changes.
  const allFilteredIds = useMemo(() => filtered.map((inv) => inv._id), [filtered]);

  // Selection state derived from memoized IDs — only recomputes when the list or
  // selection set changes, not on unrelated state updates.
  const { allSelected, someSelected } = useMemo(() => {
    if (allFilteredIds.length === 0) return { allSelected: false, someSelected: false };
    return {
      allSelected: allFilteredIds.every((id) => selectedIds.has(id)),
      someSelected: allFilteredIds.some((id) => selectedIds.has(id)),
    };
  }, [allFilteredIds, selectedIds]);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allSelected, allFilteredIds]);

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  // Selected invoice objects + draft-only subset — memoized so batch action buttons
  // don't trigger O(n) passes on every checkbox toggle or search keystroke.
  const { selectedInvoices, selectedDraftIds, selectedVoidableIds } = useMemo(() => {
    // BUG-BH-013: Batch actions must operate on all selected invoices, even when search/filter hides some rows.
    const selected = all.filter((inv) => selectedIds.has(inv._id));
    const drafts = selected.filter((inv) => inv.status === "DRAFT").map((inv) => inv._id);
    // BUG-BM-HUNT-105: Only DRAFT, SENT, and PARTIAL invoices can be voided.
    // PAID and already-VOID invoices must be excluded from the void batch to prevent
    // confusing error messages or accidental data corruption.
    const voidable = selected
      .filter((inv) => inv.status === "DRAFT" || inv.status === "SENT" || inv.status === "PARTIAL")
      .map((inv) => inv._id);
    return { selectedInvoices: selected, selectedDraftIds: drafts, selectedVoidableIds: voidable };
  }, [all, selectedIds]);

  // Overdue check helper
  const isOverdue = (inv: { dueDate?: number; status: string }) =>
    inv.dueDate != null &&
    inv.dueDate < Date.now() &&
    (inv.status === "SENT" || inv.status === "PARTIAL");

  // Batch send
  const handleBatchSend = async () => {
    if (!orgId || selectedDraftIds.length === 0) return;
    setBatchSending(true);
    try {
      await batchSendInvoices({ orgId, invoiceIds: selectedDraftIds as Id<"invoices">[] });
      toast.success(`${selectedDraftIds.length} invoice${selectedDraftIds.length !== 1 ? "s" : ""} sent.`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invoices.");
    } finally {
      setBatchSending(false);
    }
  };

  // Batch void — only voidable invoices (DRAFT, SENT, PARTIAL)
  const handleBatchVoid = async (reason: string) => {
    if (!orgId || selectedVoidableIds.length === 0) return;
    await batchVoidInvoices({
      orgId,
      invoiceIds: selectedVoidableIds as Id<"invoices">[],
      voidReason: reason,
    });
    toast.success(`${selectedVoidableIds.length} invoice${selectedVoidableIds.length !== 1 ? "s" : ""} voided.`);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Invoices</h1>
          {isLoading ? (
            <Skeleton className="h-4 w-40 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {all.length} total · {counts.SENT + counts.PARTIAL} outstanding
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <ExportCSVButton
            data={mapInvoicesForCSV(filtered, customerMap)}
            columns={INVOICE_CSV_COLUMNS}
            fileName="invoices.csv"
            showDateFilter
            dateFieldKey="createdAt"
            className="gap-1.5 text-xs"
          />
          <Button asChild size="sm">
            <Link to="/billing/invoices/new">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as InvoiceStatus);
            setSelectedIds(new Set());
          }}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-8 bg-muted/40 p-0.5">
            {tabs.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-7 px-3 text-xs data-[state=active]:bg-background"
              >
                {label}
                {!isLoading && counts[value] > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 h-4 min-w-[16px] px-1 text-[9px] ${
                      activeTab === value
                        ? "bg-primary/15 text-primary"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}
                  >
                    {counts[value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {/* BUG-BM-101: Sort controls — billing manager needs to sort by amount/balance/date */}
        <div className="flex items-center gap-2 ml-auto">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "amount" | "balance")}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="amount">Total</SelectItem>
              <SelectItem value="balance">Balance</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2"
            onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
            aria-label={`Sort direction: ${sortDir === "desc" ? "descending" : "ascending"}`}
          >
            {sortDir === "desc" ? "↓" : "↑"}
          </Button>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              placeholder="Search invoice # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-56 bg-muted/30 border-border/60"
              aria-label="Search invoices by number or customer name"
            />
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading invoices">
          {Array.from({ length: 4 }).map((_, i) => (
            <InvoiceSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Receipt className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No invoices found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {activeTab === "all"
                ? "No invoices yet. Create one from a closed work order."
                : `No ${activeTab.toLowerCase()} invoices.`}
            </p>
            {activeTab === "all" && (
              <Button asChild size="sm" className="mt-4">
                <Link to="/billing/invoices/new">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Invoice
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className="space-y-2"
          aria-live="polite"
          aria-label={`Invoices list, ${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
        >
          {/* Select all row */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 px-1 pb-1">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all invoices"
                className="data-[state=indeterminate]:bg-primary/30"
                data-state={allSelected ? "checked" : someSelected ? "indeterminate" : "unchecked"}
              />
              <span className="text-xs text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : "Select all"}
              </span>
            </div>
          )}

          {filtered.map((inv) => {
            const aging = inv.status === "SENT" ? agingDays(inv.sentAt) : null;
            const overdue = isOverdue(inv);
            const isSelected = selectedIds.has(inv._id);

            return (
              <div key={inv._id} className="flex items-center gap-2">
                {/* Checkbox */}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => toggleSelect(inv._id, !!checked)}
                  aria-label={`Select invoice ${inv.invoiceNumber}`}
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Invoice card — full width, clickable */}
                <Link
                  to={`/billing/invoices/${inv._id}`}
                  className="flex-1 min-w-0"
                  aria-label={`Invoice ${inv.invoiceNumber} — ${inv.status} — $${inv.total.toFixed(2)}`}
                >
                  <Card
                    className={`border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer ${
                      isSelected ? "border-primary/40 bg-primary/5" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground font-medium">
                              {inv.invoiceNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium border ${STATUS_STYLES[inv.status] ?? ""}`}
                            >
                              {STATUS_LABELS[inv.status] ?? inv.status}
                            </Badge>
                            {overdue && <OverdueBadge />}
                            {aging !== null && aging > 30 && <AgingBadge days={aging} />}
                          </div>
                          {/* BUG-BM-001: Show customer name so billing manager can identify invoices at a glance */}
                          <p className="text-sm font-medium text-foreground mb-0.5">
                            {customerMap.get(inv.customerId as string) ?? <span className="text-muted-foreground italic">Unknown Customer</span>}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Created {formatDate(inv.createdAt)}
                            </span>
                            {inv.sentAt && (
                              <span className="text-xs text-muted-foreground">
                                · Sent {formatDate(inv.sentAt)}
                              </span>
                            )}
                            {inv.dueDate && (
                              <span className={`text-xs ${overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                                · Due {formatDateUTC(inv.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold">${inv.total.toFixed(2)}</p>
                            {inv.status === "SENT" && inv.balance > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                Balance: ${inv.balance.toFixed(2)}
                              </p>
                            )}
                            {inv.status === "PARTIAL" && inv.balance > 0 && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                Balance: ${inv.balance.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <ChevronRight
                            className="w-4 h-4 text-muted-foreground/50"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && orgId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 rounded-2xl sm:rounded-full bg-card border border-border shadow-2xl shadow-black/30 backdrop-blur-sm max-w-[95vw]">
          <span className="text-xs text-muted-foreground font-medium mr-1">
            <CheckSquare2 className="w-3.5 h-3.5 inline mr-1 text-primary" />
            {selectedIds.size} selected
          </span>

          {/* Send — only for drafts */}
          {selectedDraftIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={handleBatchSend}
              disabled={batchSending}
            >
              <Send className="w-3 h-3" />
              {batchSending ? "Sending…" : `Send (${selectedDraftIds.length})`}
            </Button>
          )}

          {/* Void — only voidable invoices (DRAFT/SENT/PARTIAL) */}
          {selectedVoidableIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={() => setVoidDialogOpen(true)}
            >
              <Ban className="w-3 h-3" />
              Void ({selectedVoidableIds.length})
            </Button>
          )}

          {/* Record Payments — only show when at least one selected invoice has a balance */}
          {selectedInvoices.some((inv) => (inv.balance ?? inv.total) > 0) && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <CreditCard className="w-3 h-3" />
              Record Payments
            </Button>
          )}

          {/* Deselect */}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Void Dialog */}
      <VoidBatchDialog
        open={voidDialogOpen}
        count={selectedVoidableIds.length}
        onClose={() => setVoidDialogOpen(false)}
        onConfirm={handleBatchVoid}
      />

      {/* Batch Payment Dialog */}
      {orgId && (
        <BatchPaymentDialog
          open={paymentDialogOpen}
          invoices={selectedInvoices
            .filter((inv) => (inv.balance ?? inv.total) > 0)
            .map((inv) => ({
              _id: inv._id,
              invoiceNumber: inv.invoiceNumber,
              balance: inv.balance ?? inv.total,
              total: inv.total,
            }))}
          orgId={orgId}
          currentTechId={currentTechId ?? undefined}
          onClose={() => setPaymentDialogOpen(false)}
          onSuccess={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
