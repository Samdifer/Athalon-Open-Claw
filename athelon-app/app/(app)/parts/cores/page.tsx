"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { toast } from "sonner";
import {
  RotateCcw,
  Plus,
  PackageCheck,
  Search,
  CreditCard,
  Trash2,
  AlertTriangle,
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDate, formatCurrency } from "@/lib/format";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

type CoreStatus = "awaiting_return" | "received" | "inspected" | "credit_issued" | "scrapped" | "overdue";

const STATUS_TABS: Array<{ label: string; value: CoreStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Overdue", value: "overdue" },
  { label: "Awaiting Return", value: "awaiting_return" },
  { label: "Received", value: "received" },
  { label: "Inspected", value: "inspected" },
  { label: "Credit Issued", value: "credit_issued" },
  { label: "Scrapped", value: "scrapped" },
];

const STATUS_STYLES: Record<string, string> = {
  awaiting_return: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  received: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  inspected: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  credit_issued: "bg-green-500/15 text-green-400 border-green-500/30",
  scrapped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  overdue: "bg-red-500/15 text-red-400 border-red-500/30",
};

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Create Core Dialog ──────────────────────────────────────────────────────

function CreateCoreDialog({
  open,
  onClose,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
}) {
  const create = useMutation(api.cores.createCoreReturn);
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [coreValue, setCoreValue] = useState("");
  const [returnDueDate, setReturnDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPartNumber("");
    setDescription("");
    setSerialNumber("");
    setCoreValue("");
    setReturnDueDate("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!partNumber || !description || !coreValue) return;
    setSaving(true);
    try {
      await create({
        organizationId: orgId,
        partId: "" as Id<"parts">, // Will be linked properly in production
        partNumber,
        description,
        serialNumber: serialNumber || undefined,
        coreValue: parseFloat(coreValue),
        returnDueDate: returnDueDate ? new Date(returnDueDate).getTime() : undefined,
        notes: notes || undefined,
      });
      toast.success("Core return created");
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create core return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Core Return</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Part Number *</Label>
              <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Core Value ($) *</Label>
              <Input type="number" min="0" step="0.01" value={coreValue} onChange={(e) => setCoreValue(e.target.value)} />
            </div>
            <div>
              <Label>Return Due Date</Label>
              <Input type="date" value={returnDueDate} onChange={(e) => setReturnDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !partNumber || !description || !coreValue}>
            {saving ? "Creating…" : "Create Core Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Core Detail Dialog ──────────────────────────────────────────────────────

function CoreDetailDialog({
  coreId,
  onClose,
}: {
  coreId: Id<"coreTracking"> | null;
  onClose: () => void;
}) {
  const core = useQuery(api.cores.getCoreDetail, coreId ? { coreId } : "skip");
  const markReceived = useMutation(api.cores.markCoreReceived);
  const markInspected = useMutation(api.cores.markCoreInspected);
  const issueCredit = useMutation(api.cores.issueCoreCredit);
  const scrap = useMutation(api.cores.scrapCore);
  const [creditAmount, setCreditAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [scrapAlertOpen, setScrapAlertOpen] = useState(false);

  if (!coreId) return null;

  const handleAction = async (fn: () => Promise<unknown>, successMsg?: string) => {
    setActionLoading(true);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed — please try again");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Dialog open={!!coreId} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Core {core?.coreNumber ?? "…"}</DialogTitle>
          </DialogHeader>
          {!core ? (
            <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant="outline" className={STATUS_STYLES[core.status]}>{statusLabel(core.status)}</Badge>
              </div>
              <div><span className="font-medium">Part #:</span> {core.partNumber}</div>
              {core.serialNumber && <div><span className="font-medium">Serial #:</span> {core.serialNumber}</div>}
              <div><span className="font-medium">Description:</span> {core.description}</div>
              <div><span className="font-medium">Core Value:</span> {formatCurrency(core.coreValue)}</div>
              {core.creditAmount !== undefined && (
                <div><span className="font-medium">Credit Amount:</span> {formatCurrency(core.creditAmount)}</div>
              )}
              {core.returnDueDate && <div><span className="font-medium">Return Due:</span> {formatDate(core.returnDueDate)}</div>}
              {core.returnedAt && <div><span className="font-medium">Returned:</span> {formatDate(core.returnedAt)}</div>}
              {core.inspectedAt && <div><span className="font-medium">Inspected:</span> {formatDate(core.inspectedAt)}</div>}
              {core.creditIssuedAt && <div><span className="font-medium">Credit Issued:</span> {formatDate(core.creditIssuedAt)}</div>}
              {core.notes && <div><span className="font-medium">Notes:</span> {core.notes}</div>}
              <div><span className="font-medium">Created:</span> {formatDate(core.createdAt)}</div>

              {/* Status progression actions */}
              <div className="flex gap-2 flex-wrap border-t pt-2">
                {core.status === "awaiting_return" && (
                  <Button size="sm"
                    onClick={() => handleAction(
                      () => markReceived({ coreId }),
                      `Core ${core.coreNumber} marked received`,
                    )}
                    disabled={actionLoading}>
                    <PackageCheck className="h-3.5 w-3.5 mr-1" /> Mark Received
                  </Button>
                )}
                {core.status === "received" && (
                  <Button size="sm"
                    onClick={() => handleAction(
                      () => markInspected({ coreId }),
                      `Core ${core.coreNumber} marked inspected`,
                    )}
                    disabled={actionLoading}>
                    <Search className="h-3.5 w-3.5 mr-1" /> Mark Inspected
                  </Button>
                )}
                {core.status === "inspected" && (
                  <div className="flex gap-2 items-end w-full">
                    <div className="flex-1">
                      <Label>Credit Amount ($)</Label>
                      <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
                    </div>
                    <Button size="sm" disabled={actionLoading || !creditAmount}
                      onClick={() => handleAction(
                        () => issueCredit({ coreId, creditAmount: parseFloat(creditAmount) }),
                        `Credit issued for core ${core.coreNumber}`,
                      )}>
                      <CreditCard className="h-3.5 w-3.5 mr-1" /> Issue Credit
                    </Button>
                  </div>
                )}
                {["awaiting_return", "received", "inspected"].includes(core.status) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setScrapAlertOpen(true)}
                    disabled={actionLoading}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Scrap
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scrap Confirmation Alert */}
      <AlertDialog open={scrapAlertOpen} onOpenChange={setScrapAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Scrap Core Return?</AlertDialogTitle>
            <AlertDialogDescription>
              {core ? (
                <>
                  You are about to scrap core <strong>{core.partNumber}</strong> (Core {core.coreNumber})
                  with a value of <strong>{formatCurrency(core.coreValue)}</strong>. This action cannot be undone.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setScrapAlertOpen(false);
                handleAction(
                  () => scrap({ coreId }),
                  `Core ${core?.coreNumber ?? ""} scrapped`,
                ).catch(() => {/* handled inside handleAction */});
              }}
            >
              Scrap Core
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CoresPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [tab, setTab] = useState<CoreStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCore, setSelectedCore] = useState<Id<"coreTracking"> | null>(null);

  const cores = useQuery(
    api.cores.listCores,
    orgId ? { organizationId: orgId, status: tab === "all" ? undefined : tab } : "skip",
  );
  const overdueCores = useQuery(
    api.cores.listOverdueCores,
    orgId ? { organizationId: orgId } : "skip",
  );
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || cores === undefined || overdueCores === undefined,
  });

  const stats = useMemo(() => {
    if (!cores) return { totalOut: 0, valueOutstanding: 0, overdueCount: 0 };
    const awaitingCores = cores.filter((c) => c.status === "awaiting_return");
    return {
      totalOut: awaitingCores.length,
      valueOutstanding: awaitingCores.reduce((s, c) => s + c.coreValue, 0),
      overdueCount: overdueCores?.length ?? 0,
    };
  }, [cores, overdueCores]);
  const coreRows = cores ?? [];

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="p-6 space-y-3" data-testid="page-loading-state">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Core tracking requires organization setup"
        missingInfo="Complete onboarding to track core returns, inspections, and credits."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="h-6 w-6" /> Core Tracking
          </h1>
          <p className="text-muted-foreground text-sm">Track core exchanges, returns, and credits</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Core Return
        </Button>
      </div>

      {/* Overdue Alert */}
      {(overdueCores?.length ?? 0) > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="font-medium text-red-400">{overdueCores!.length} overdue core return{overdueCores!.length > 1 ? "s" : ""}</span>
            <span className="text-muted-foreground text-sm">— total value: {formatCurrency(overdueCores!.reduce((s, c) => s + c.coreValue, 0))}</span>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Cores Out</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalOut}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Value Outstanding</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(stats.valueOutstanding)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-400">{stats.overdueCount}</div></CardContent></Card>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b pb-1">
        {STATUS_TABS.map((t) => (
          <Button key={t.value} variant={tab === t.value ? "default" : "ghost"} size="sm"
            onClick={() => setTab(t.value as CoreStatus | "all")}>
            {t.label}
          </Button>
        ))}
      </div>

      {/* Cores Table */}
      {coreRows.length === 0 ? (
        <ActionableEmptyState
          title="No core returns found"
          missingInfo="Create your first core return to track due dates and supplier credits."
          primaryActionLabel="New Core Return"
          primaryActionType="button"
          primaryActionTarget={() => setCreateOpen(true)}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Core #</TableHead>
              <TableHead>Part #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Core Value</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coreRows.map((core) => (
              <TableRow key={core._id} className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedCore(core._id)}>
                <TableCell className="font-mono text-sm">{core.coreNumber}</TableCell>
                <TableCell className="font-mono text-sm">{core.partNumber}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_STYLES[core.status]}>
                    {statusLabel(core.status)}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{core.description}</TableCell>
                <TableCell className="text-right">{formatCurrency(core.coreValue)}</TableCell>
                <TableCell className="text-right">{core.creditAmount !== undefined ? formatCurrency(core.creditAmount) : "—"}</TableCell>
                <TableCell>{core.returnDueDate ? formatDate(core.returnDueDate) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateCoreDialog open={createOpen} onClose={() => setCreateOpen(false)} orgId={orgId} />
      <CoreDetailDialog coreId={selectedCore} onClose={() => setSelectedCore(null)} />
    </div>
  );
}
