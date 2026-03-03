"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { FileX, Plus, Check, X, Loader2 } from "lucide-react";
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

const CM_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  ISSUED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  APPLIED: "bg-green-500/15 text-green-400 border-green-500/30",
  VOID: "bg-red-500/15 text-red-400 border-red-500/30",
};

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Create Credit Memo Dialog ────────────────────────────────────────────────

interface CreateCreditMemoDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
  techId: Id<"technicians"> | undefined;
  customers: Array<{ _id: Id<"customers">; name: string }>;
  invoices: Array<{ _id: Id<"invoices">; invoiceNumber: string; status: string; customerId: Id<"customers"> }>;
}

function CreateCreditMemoDialog({
  open,
  onClose,
  orgId,
  techId,
  customers,
  invoices,
}: CreateCreditMemoDialogProps) {
  const createCM = useMutation(api.billingV4.createCreditMemo);
  const [customerId, setCustomerId] = useState<string>("");
  const [invoiceId, setInvoiceId] = useState<string>("_none");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleInvoices = useMemo(
    () => invoices.filter(
      (inv) =>
        (inv.status === "SENT" || inv.status === "PARTIAL") &&
        (customerId === "" || inv.customerId === customerId)
    ),
    [invoices, customerId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!techId) { setError("No technician record found for your account."); return; }
    if (!customerId) { setError("Please select a customer."); return; }
    const amtNum = parseFloat(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) { setError("Amount must be a positive number."); return; }
    if (!reason.trim()) { setError("Reason is required."); return; }

    setSaving(true);
    setError(null);
    try {
      await createCM({
        orgId,
        customerId: customerId as Id<"customers">,
        invoiceId: (invoiceId && invoiceId !== "_none") ? invoiceId as Id<"invoices"> : undefined,
        amount: amtNum,
        reason: reason.trim(),
        issuedByTechId: techId,
        notes: notes.trim() || undefined,
      });
      // Reset
      setCustomerId("");
      setInvoiceId("_none");
      setAmount("");
      setReason("");
      setNotes("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create credit memo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Credit Memo</DialogTitle>
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
            <Label className="text-xs">Invoice (optional)</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Link to invoice…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {eligibleInvoices.map((inv) => (
                  <SelectItem key={inv._id} value={inv._id}>
                    {inv.invoiceNumber} ({inv.status})
                  </SelectItem>
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
            <Label className="text-xs">Reason *</Label>
            <Input
              className="text-sm"
              placeholder="Reason for credit memo…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              className="text-sm resize-none"
              placeholder="Additional notes…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {!techId && (
            <p className="text-xs text-amber-400">⚠ No technician record found — credit memos require a technician account.</p>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !techId}>
              {saving ? "Creating…" : "Create Credit Memo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Apply to Invoice Dialog ──────────────────────────────────────────────────

interface ApplyInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
  creditMemoId: Id<"creditMemos">;
  customerId: Id<"customers">;
  invoices: Array<{ _id: Id<"invoices">; invoiceNumber: string; status: string; balance: number; customerId: Id<"customers"> }>;
}

function ApplyInvoiceDialog({
  open,
  onClose,
  orgId,
  creditMemoId,
  customerId,
  invoices,
}: ApplyInvoiceDialogProps) {
  const apply = useMutation(api.billingV4.applyCreditMemoToInvoice);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleInvoices = useMemo(
    () => invoices.filter(
      (inv) =>
        (inv.status === "SENT" || inv.status === "PARTIAL") &&
        inv.customerId === customerId
    ),
    [invoices, customerId],
  );

  async function handleApply() {
    if (!selectedInvoiceId) return;
    setApplying(true);
    setError(null);
    try {
      await apply({
        orgId,
        creditMemoId,
        invoiceId: selectedInvoiceId as Id<"invoices">,
      });
      toast.success("Credit memo applied to invoice.");
      setSelectedInvoiceId("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to apply credit memo.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply Credit Memo to Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Select Invoice</Label>
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Choose invoice…" />
              </SelectTrigger>
              <SelectContent>
                {eligibleInvoices.length === 0 && (
                  <SelectItem value="_empty" disabled>No eligible invoices</SelectItem>
                )}
                {eligibleInvoices.map((inv) => (
                  <SelectItem key={inv._id} value={inv._id}>
                    {inv.invoiceNumber} — {fmt(inv.balance)} due
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              disabled={!selectedInvoiceId || applying}
              onClick={handleApply}
            >
              {applying ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreditMemosPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<{
    creditMemoId: Id<"creditMemos">;
    customerId: Id<"customers">;
  } | null>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);

  const issueMutation = useMutation(api.billingV4.issueCreditMemo);

  const creditMemos = useQuery(
    api.billingV4.listCreditMemos,
    orgId ? { orgId } : "skip",
  );
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId } : "skip",
  );
  const invoices = useQuery(
    api.billing.listInvoices,
    orgId ? { orgId } : "skip",
  );

  const isLoading = !isLoaded || creditMemos === undefined || customers === undefined || invoices === undefined;

  const customerMap = useMemo(() => {
    if (!customers) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const c of customers) m.set(c._id as string, c.name);
    return m;
  }, [customers]);

  const invoiceMap = useMemo(() => {
    if (!invoices) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const inv of invoices) m.set(inv._id as string, inv.invoiceNumber);
    return m;
  }, [invoices]);

  async function handleIssue(creditMemoId: Id<"creditMemos">) {
    if (!orgId || issuingId) return;
    setIssuingId(creditMemoId as string);
    try {
      await issueMutation({ orgId, creditMemoId });
      toast.success("Credit memo issued");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to issue credit memo");
    } finally {
      setIssuingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-56" />
        <Card className="border-border/60">
          <CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  const sortedCMs = [...(creditMemos ?? [])].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Credit Memos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{sortedCMs.length} credit memo{sortedCMs.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Credit Memo
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileX className="w-4 h-4 text-muted-foreground" />
            All Credit Memos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedCMs.length === 0 ? (
            <div className="py-12 text-center">
              <FileX className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No credit memos yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create one using the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">CM #</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Invoice #</TableHead>
                  <TableHead className="text-xs">Reason</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCMs.map((cm) => (
                  <TableRow key={cm._id} className="border-border/40">
                    <TableCell className="font-mono text-xs text-primary">{cm.creditMemoNumber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {customerMap.get(cm.customerId as string) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-right">{fmt(cm.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${CM_STATUS_STYLES[cm.status] ?? ""}`}
                      >
                        {cm.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {cm.invoiceId ? (invoiceMap.get(cm.invoiceId as string) ?? cm.invoiceId) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                      {cm.reason}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(cm.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {cm.status === "DRAFT" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleIssue(cm._id)}
                            disabled={issuingId === (cm._id as string)}
                          >
                            {issuingId === (cm._id as string) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            {issuingId === (cm._id as string) ? "Issuing…" : "Issue"}
                          </Button>
                        )}
                        {cm.status === "ISSUED" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() =>
                                setApplyTarget({
                                  creditMemoId: cm._id,
                                  customerId: cm.customerId,
                                })
                              }
                            >
                              Apply
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground"
                              disabled
                              title="Void not yet available"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Void
                            </Button>
                          </>
                        )}
                      </div>
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
        <CreateCreditMemoDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          orgId={orgId}
          techId={techId}
          customers={customers ?? []}
          invoices={(invoices ?? []) as Array<{ _id: Id<"invoices">; invoiceNumber: string; status: string; customerId: Id<"customers"> }>}
        />
      )}

      {orgId && applyTarget && (
        <ApplyInvoiceDialog
          open={true}
          onClose={() => setApplyTarget(null)}
          orgId={orgId}
          creditMemoId={applyTarget.creditMemoId}
          customerId={applyTarget.customerId}
          invoices={(invoices ?? []) as Array<{ _id: Id<"invoices">; invoiceNumber: string; status: string; balance: number; customerId: Id<"customers"> }>}
        />
      )}
    </div>
  );
}
