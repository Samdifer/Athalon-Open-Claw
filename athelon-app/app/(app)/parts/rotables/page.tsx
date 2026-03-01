"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import {
  Plus, Search, Cog, ChevronDown, ChevronRight, DollarSign, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/format";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

type RotableFilter = "all" | "installed" | "serviceable" | "in_shop" | "at_vendor" | "condemned" | "loaned_out";

const STATUS_STYLES: Record<string, string> = {
  installed: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  serviceable: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  in_shop: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  at_vendor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  condemned: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  loaned_out: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  installed: "Installed",
  serviceable: "Serviceable",
  in_shop: "In Shop",
  at_vendor: "At Vendor",
  condemned: "Condemned",
  loaned_out: "Loaned Out",
};

const CONDITION_LABELS: Record<string, string> = {
  serviceable: "Serviceable",
  unserviceable: "Unserviceable",
  overhauled: "Overhauled",
  repaired: "Repaired",
  inspected: "Inspected",
};

const ACTION_LABELS: Record<string, string> = {
  installed: "Install",
  removed: "Remove",
  sent_to_vendor: "Send to Vendor",
  received_from_vendor: "Receive from Vendor",
  overhauled: "Overhaul",
  condemned: "Condemn",
  loaned: "Loan Out",
  returned: "Return",
};

function TBOBar({ tsoHours, tboHours }: { tsoHours?: number; tboHours?: number }) {
  if (!tboHours || tboHours === 0) return null;
  const tso = tsoHours ?? 0;
  const remaining = Math.max(0, tboHours - tso);
  const pct = Math.min(100, (remaining / tboHours) * 100);
  const color = pct > 50 ? "bg-green-500" : pct > 20 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[10px] text-muted-foreground w-16 shrink-0">TBO {remaining.toFixed(0)}h left</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RotableHistory({ rotableId, orgId }: { rotableId: Id<"rotables">; orgId: Id<"organizations"> }) {
  const history = useQuery(api.rotables.getHistory, { rotableId });
  const recordAction = useMutation(api.rotables.recordAction);
  const [showForm, setShowForm] = useState(false);
  const [action, setAction] = useState<string>("installed");
  const [notes, setNotes] = useState("");
  const [performedBy, setPerformedBy] = useState("");

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    try {
      await recordAction({
        rotableId,
        organizationId: orgId,
        action: action as "installed" | "removed" | "sent_to_vendor" | "received_from_vendor" | "overhauled" | "condemned" | "loaned" | "returned",
        notes: notes || undefined,
        performedBy: performedBy || undefined,
      });
      setShowForm(false);
      setNotes("");
      setPerformedBy("");
      toast.success("Action recorded");
    } catch {
      toast.error("Failed to record action");
    }
  }

  if (history === undefined) return <Skeleton className="h-20 w-full" />;

  return (
    <div className="mt-3 space-y-2 pl-4 border-l-2 border-border/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">History ({history.length})</span>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3 h-3 mr-1" />Record Action
        </Button>
      </div>
      {history.sort((a, b) => b.createdAt - a.createdAt).map((h) => (
        <div key={h._id} className="bg-muted/30 rounded p-2 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px]">{ACTION_LABELS[h.action] ?? h.action}</Badge>
            <span className="text-muted-foreground">{formatDate(h.createdAt)}</span>
            {h.performedBy && <span className="text-muted-foreground">by {h.performedBy}</span>}
          </div>
          {h.notes && <p className="text-muted-foreground mt-1">{h.notes}</p>}
        </div>
      ))}
      {showForm && (
        <form onSubmit={handleRecord} className="bg-muted/20 rounded p-3 space-y-2">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Performed by" value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} className="h-7 text-xs" />
          <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-7 text-xs">Record</Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function RotableSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

type RotableStatus = "installed" | "serviceable" | "in_shop" | "at_vendor" | "condemned" | "loaned_out";
type RotableCondition = "serviceable" | "unserviceable" | "overhauled" | "repaired" | "inspected";

export default function RotablesPage() {
  const [activeTab, setActiveTab] = useState<RotableFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [condemnTarget, setCondemnTarget] = useState<{ id: Id<"rotables">; partNumber: string; serialNumber: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: Id<"rotables">; partNumber: string; serialNumber: string } | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const { orgId, isLoaded } = useCurrentOrg();

  const rotables = useQuery(
    api.rotables.list,
    orgId ? { organizationId: orgId, status: activeTab === "all" ? undefined : activeTab } : "skip",
  );
  const createRotable = useMutation(api.rotables.create);
  const recordAction = useMutation(api.rotables.recordAction);

  const [form, setForm] = useState({
    partNumber: "", serialNumber: "", description: "",
    status: "serviceable" as RotableStatus,
    condition: "serviceable" as RotableCondition,
    tsnHours: "", tsoHours: "", tboHours: "",
    purchasePrice: "", currentValue: "", coreValue: "", notes: "",
  });

  const isLoading = !isLoaded || rotables === undefined;
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: isLoading,
  });

  const filtered = useMemo(() => {
    if (!rotables) return [];
    if (!search.trim()) return rotables;
    const q = search.toLowerCase();
    return rotables.filter(
      (r) =>
        r.partNumber.toLowerCase().includes(q) ||
        r.serialNumber.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [rotables, search]);

  const all = rotables ?? [];

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const r of all) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [all]);

  const totalValue = all.reduce((s, r) => s + (r.currentValue ?? 0), 0);
  const totalCoreValue = all.reduce((s, r) => s + (r.coreValue ?? 0), 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) {
      toast.error("Organization context is required");
      return;
    }
    try {
      await createRotable({
        organizationId: orgId,
        partNumber: form.partNumber,
        serialNumber: form.serialNumber,
        description: form.description,
        status: form.status,
        condition: form.condition,
        tsnHours: form.tsnHours ? parseFloat(form.tsnHours) : undefined,
        tsoHours: form.tsoHours ? parseFloat(form.tsoHours) : undefined,
        tboHours: form.tboHours ? parseFloat(form.tboHours) : undefined,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined,
        coreValue: form.coreValue ? parseFloat(form.coreValue) : undefined,
        notes: form.notes || undefined,
      });
      setCreateOpen(false);
      setForm({ partNumber: "", serialNumber: "", description: "", status: "serviceable", condition: "serviceable", tsnHours: "", tsoHours: "", tboHours: "", purchasePrice: "", currentValue: "", coreValue: "", notes: "" });
      toast.success("Rotable created");
    } catch {
      toast.error("Failed to create rotable");
    }
  }

  async function handleAction(rotableId: Id<"rotables">, action: "installed" | "removed" | "sent_to_vendor" | "received_from_vendor" | "condemned") {
    if (!orgId) {
      toast.error("Organization context is required");
      return;
    }
    setActioningId(rotableId);
    try {
      await recordAction({ rotableId, organizationId: orgId, action });
      toast.success(`${ACTION_LABELS[action]} recorded`);
    } catch {
      toast.error("Failed to record action");
    } finally {
      setActioningId(null);
    }
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-2" data-testid="page-loading-state">
        {Array.from({ length: 4 }).map((_, i) => <RotableSkeleton key={i} />)}
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Rotable tracking requires organization setup"
        missingInfo="Complete onboarding before managing rotable component lifecycle."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !rotables) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Rotable Components</h1>
          {isLoading ? <Skeleton className="h-4 w-40 mt-1" /> : (
            <p className="text-sm text-muted-foreground mt-0.5">{all.length} components tracked</p>
          )}
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />New Rotable</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Rotable Component</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Part Number *</Label><Input value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Serial Number *</Label><Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} required /></div>
              </div>
              <div className="space-y-2"><Label>Description *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RotableStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v as RotableCondition })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>TSN Hours</Label><Input type="number" value={form.tsnHours} onChange={(e) => setForm({ ...form, tsnHours: e.target.value })} /></div>
                <div className="space-y-2"><Label>TSO Hours</Label><Input type="number" value={form.tsoHours} onChange={(e) => setForm({ ...form, tsoHours: e.target.value })} /></div>
                <div className="space-y-2"><Label>TBO Hours</Label><Input type="number" value={form.tboHours} onChange={(e) => setForm({ ...form, tboHours: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Purchase Price</Label><Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /></div>
                <div className="space-y-2"><Label>Current Value</Label><Input type="number" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} /></div>
                <div className="space-y-2"><Label>Core Value</Label><Input type="number" value={form.coreValue} onChange={(e) => setForm({ ...form, coreValue: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-sm font-semibold">{formatCurrency(totalValue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Core Value</p>
                <p className="text-sm font-semibold">{formatCurrency(totalCoreValue)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RotableFilter)} className="w-full sm:w-auto">
          <TabsList className="h-8 bg-muted/40 p-0.5">
            {([["all", "All"], ["installed", "Installed"], ["serviceable", "Serviceable"], ["in_shop", "In Shop"], ["at_vendor", "At Vendor"], ["condemned", "Condemned"]] as const).map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="h-7 px-2 text-xs data-[state=active]:bg-background">
                {label}
                {!isLoading && (statusCounts[value] ?? 0) > 0 && (
                  <Badge variant="secondary" className={`ml-1 h-4 min-w-[16px] px-1 text-[9px] ${activeTab === value ? "bg-primary/15 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                    {statusCounts[value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search rotables..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 pr-3 text-xs w-56 bg-muted/30 border-border/60" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <ActionableEmptyState
          title="No rotable components found"
          missingInfo="Create your first rotable to track status, TBO, and value."
          primaryActionLabel="New Rotable"
          primaryActionType="button"
          primaryActionTarget={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((rotable) => {
            const isExpanded = expandedId === rotable._id;
            return (
              <Card key={rotable._id} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : rotable._id)}>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">P/N: {rotable.partNumber}</span>
                        <span className="text-xs text-muted-foreground">S/N: {rotable.serialNumber}</span>
                        <Badge variant="outline" className={`text-[10px] border ${STATUS_STYLES[rotable.status]}`}>
                          {STATUS_LABELS[rotable.status]}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {CONDITION_LABELS[rotable.condition] ?? rotable.condition}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{rotable.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {rotable.tsnHours != null && <span>TSN: {rotable.tsnHours}h</span>}
                        {rotable.tsoHours != null && <span>TSO: {rotable.tsoHours}h</span>}
                        {rotable.currentValue != null && <span>{formatCurrency(rotable.currentValue)}</span>}
                      </div>
                      <TBOBar tsoHours={rotable.tsoHours} tboHours={rotable.tboHours} />
                    </div>
                    <div className="flex gap-1 flex-shrink-0 flex-wrap">
                      {rotable.status === "serviceable" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={actioningId === rotable._id} onClick={(e) => { e.stopPropagation(); void handleAction(rotable._id, "installed"); }}>
                          {actioningId === rotable._id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Install
                        </Button>
                      )}
                      {rotable.status === "installed" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={actioningId === rotable._id} onClick={(e) => { e.stopPropagation(); setRemoveTarget({ id: rotable._id, partNumber: rotable.partNumber, serialNumber: rotable.serialNumber }); }}>
                          {actioningId === rotable._id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Remove
                        </Button>
                      )}
                      {(rotable.status === "serviceable" || rotable.status === "in_shop") && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={actioningId === rotable._id} onClick={(e) => { e.stopPropagation(); void handleAction(rotable._id, "sent_to_vendor"); }}>
                          {actioningId === rotable._id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Send to Vendor
                        </Button>
                      )}
                      {rotable.status === "at_vendor" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={actioningId === rotable._id} onClick={(e) => { e.stopPropagation(); void handleAction(rotable._id, "received_from_vendor"); }}>
                          {actioningId === rotable._id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Receive
                        </Button>
                      )}
                      {rotable.status !== "condemned" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" disabled={actioningId === rotable._id} onClick={(e) => { e.stopPropagation(); setCondemnTarget({ id: rotable._id, partNumber: rotable.partNumber, serialNumber: rotable.serialNumber }); }}>Condemn</Button>
                      )}
                    </div>
                  </div>
                  {isExpanded && orgId && (
                    <RotableHistory rotableId={rotable._id} orgId={orgId} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={removeTarget !== null} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Component from Aircraft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will record that{" "}
              <strong className="font-mono">{removeTarget?.partNumber}</strong>
              {removeTarget?.serialNumber ? ` S/N ${removeTarget.serialNumber}` : ""}{" "}
              has been physically removed from the aircraft. A removal record will be added to the component history. Verify the component is actually being removed before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) {
                  void handleAction(removeTarget.id, "removed");
                  setRemoveTarget(null);
                }
              }}
            >
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={condemnTarget !== null} onOpenChange={(v) => !v && setCondemnTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Condemn Component?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently condemn <strong className="font-mono">{condemnTarget?.partNumber}</strong>
              {condemnTarget?.serialNumber ? ` S/N ${condemnTarget.serialNumber}` : ""}. 
              A condemned component cannot be returned to service. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (condemnTarget) {
                  void handleAction(condemnTarget.id, "condemned");
                  setCondemnTarget(null);
                }
              }}
            >
              Condemn Component
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
