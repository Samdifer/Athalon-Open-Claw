"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Landmark, Plus, DollarSign, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DEPOSIT_STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-green-500/15 text-green-400 border-green-500/30",
  PARTIAL: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  APPLIED: "bg-muted text-muted-foreground border-muted-foreground/30",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  credit_card: "Credit Card",
  wire: "Wire",
  ach: "ACH",
  other: "Other",
};

// ─── Placeholder tech ID ───────────────────────────────────────────────────────
// Used as fallback when orgId is available but techId is not yet resolved.
const PLACEHOLDER_TECH_ID = "k97abc000000000000000000" as Id<"technicians">;

// ─── Record Deposit Dialog ────────────────────────────────────────────────────

interface RecordDepositDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
  techId: Id<"technicians"> | undefined;
  customers: Array<{ _id: Id<"customers">; name: string }>;
}

type DepositMethod = "cash" | "check" | "credit_card" | "wire" | "ach" | "other";

function RecordDepositDialog({ open, onClose, orgId, techId, customers }: RecordDepositDialogProps) {
  const recordDeposit = useMutation(api.billingV4b.recordDeposit);

  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<DepositMethod>("check");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setCustomerId("");
    setAmount("");
    setMethod("check");
    setReferenceNumber("");
    setNotes("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) { setError("Please select a customer."); return; }
    const amtNum = parseFloat(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) { setError("Amount must be a positive number."); return; }

    const resolvedTechId = techId ?? PLACEHOLDER_TECH_ID;

    setSaving(true);
    setError(null);
    try {
      await recordDeposit({
        orgId,
        customerId: customerId as Id<"customers">,
        amount: amtNum,
        method,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        recordedByTechId: resolvedTechId,
      });
      resetForm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record deposit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Deposit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                className="pl-7 text-sm"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Payment Method *</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as DepositMethod)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METHOD_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reference # (optional)</Label>
            <Input
              className="text-sm"
              placeholder="Check #, wire ref, etc."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              className="text-sm resize-none"
              placeholder="Additional notes…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Recording…" : "Record Deposit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Apply Deposit Dialog ─────────────────────────────────────────────────────

interface ApplyDepositDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
  depositId: Id<"customerDeposits">;
  customerId: Id<"customers">;
  depositRemaining: number;
  invoices: Array<{
    _id: Id<"invoices">;
    invoiceNumber: string;
    status: string;
    balance: number;
    customerId: Id<"customers">;
  }>;
}

function ApplyDepositDialog({
  open,
  onClose,
  orgId,
  depositId,
  customerId,
  depositRemaining,
  invoices,
}: ApplyDepositDialogProps) {
  const applyDeposit = useMutation(api.billingV4b.applyDepositToInvoice);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          (inv.status === "SENT" || inv.status === "PARTIAL") &&
          inv.customerId === customerId
      ),
    [invoices, customerId]
  );

  const selectedInvoice = useMemo(
    () => eligibleInvoices.find((inv) => inv._id === selectedInvoiceId),
    [eligibleInvoices, selectedInvoiceId]
  );

  const maxAmount = selectedInvoice
    ? Math.min(depositRemaining, selectedInvoice.balance)
    : depositRemaining;

  function resetForm() {
    setSelectedInvoiceId("");
    setAmount("");
    setError(null);
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoiceId) { setError("Please select an invoice."); return; }
    const amtNum = parseFloat(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) { setError("Amount must be a positive number."); return; }
    if (amtNum > maxAmount) { setError(`Amount cannot exceed ${fmt(maxAmount)}.`); return; }

    setApplying(true);
    setError(null);
    try {
      await applyDeposit({
        orgId,
        depositId,
        invoiceId: selectedInvoiceId as Id<"invoices">,
        amount: amtNum,
      });
      resetForm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to apply deposit.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Deposit to Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleApply} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice *</Label>
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select invoice…" />
              </SelectTrigger>
              <SelectContent>
                {eligibleInvoices.length === 0 ? (
                  <SelectItem value="_empty" disabled>No eligible invoices for this customer</SelectItem>
                ) : (
                  eligibleInvoices.map((inv) => (
                    <SelectItem key={inv._id} value={inv._id}>
                      {inv.invoiceNumber} — {fmt(inv.balance)} due
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Amount * {selectedInvoice && <span className="text-muted-foreground">(max {fmt(maxAmount)})</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                className="pl-7 text-sm"
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Deposit remaining: <span className="font-medium text-foreground">{fmt(depositRemaining)}</span>
          </p>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={applying || eligibleInvoices.length === 0}>
              {applying ? "Applying…" : "Apply Deposit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DepositsPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();
  const [recordOpen, setRecordOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<{
    depositId: Id<"customerDeposits">;
    customerId: Id<"customers">;
    remaining: number;
  } | null>(null);

  const deposits = useQuery(
    api.billingV4b.listCustomerDeposits,
    orgId ? { orgId } : "skip"
  );
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId } : "skip"
  );
  const invoices = useQuery(
    api.billing.listInvoices,
    orgId ? { orgId } : "skip"
  );

  const isLoading = !isLoaded || deposits === undefined || customers === undefined;

  const customerMap = useMemo(() => {
    if (!customers) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const c of customers) m.set(c._id as string, c.name);
    return m;
  }, [customers]);

  // Summary calculations
  const summary = useMemo(() => {
    if (!deposits) return { total: 0, available: 0, applied: 0 };
    return deposits.reduce(
      (acc, d) => ({
        total: acc.total + d.amount,
        available: acc.available + d.remainingAmount,
        applied: acc.applied + d.appliedAmount,
      }),
      { total: 0, available: 0, applied: 0 }
    );
  }, [deposits]);

  const sortedDeposits = useMemo(
    () => [...(deposits ?? [])].sort((a, b) => b.createdAt - a.createdAt),
    [deposits]
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <Card className="border-border/60">
          <CardContent className="p-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Deposits</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sortedDeposits.length} deposit{sortedDeposits.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setRecordOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Record Deposit
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Deposits</p>
                <p className="text-lg font-semibold text-foreground">{fmt(summary.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-green-500/10 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-lg font-semibold text-foreground">{fmt(summary.available)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                <CheckCircle className="w-4.5 h-4.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Applied Total</p>
                <p className="text-lg font-semibold text-foreground">{fmt(summary.applied)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposits Table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Landmark className="w-4 h-4 text-muted-foreground" />
            All Deposits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedDeposits.length === 0 ? (
            <div className="py-12 text-center">
              <Landmark className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No deposits recorded yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Use the button above to record a customer deposit.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs text-right">Applied</TableHead>
                  <TableHead className="text-xs text-right">Remaining</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Reference #</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDeposits.map((deposit) => (
                  <TableRow key={deposit._id} className="border-border/40">
                    <TableCell className="text-xs font-medium">
                      {customerMap.get(deposit.customerId as string) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-right">
                      {fmt(deposit.amount)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {fmt(deposit.appliedAmount)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-right text-green-400">
                      {fmt(deposit.remainingAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {METHOD_LABELS[deposit.method] ?? deposit.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${DEPOSIT_STATUS_STYLES[deposit.status] ?? ""}`}
                      >
                        {deposit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {deposit.referenceNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(deposit.createdAt)}
                    </TableCell>
                    <TableCell>
                      {(deposit.status === "AVAILABLE" || deposit.status === "PARTIAL") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() =>
                            setApplyTarget({
                              depositId: deposit._id,
                              customerId: deposit.customerId,
                              remaining: deposit.remainingAmount,
                            })
                          }
                        >
                          Apply to Invoice
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {orgId && (
        <RecordDepositDialog
          open={recordOpen}
          onClose={() => setRecordOpen(false)}
          orgId={orgId}
          techId={techId}
          customers={customers ?? []}
        />
      )}

      {orgId && applyTarget && (
        <ApplyDepositDialog
          open={true}
          onClose={() => setApplyTarget(null)}
          orgId={orgId}
          depositId={applyTarget.depositId}
          customerId={applyTarget.customerId}
          depositRemaining={applyTarget.remaining}
          invoices={
            (invoices ?? []) as Array<{
              _id: Id<"invoices">;
              invoiceNumber: string;
              status: string;
              balance: number;
              customerId: Id<"customers">;
            }>
          }
        />
      )}
    </div>
  );
}
