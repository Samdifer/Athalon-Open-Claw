"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Plus, Search, Package, ChevronDown, ChevronRight, AlertCircle,
  ArrowLeftRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/format";

type LoanerFilter = "all" | "available" | "loaned_out" | "maintenance" | "retired";

const STATUS_STYLES: Record<string, string> = {
  available: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  loaned_out: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  maintenance: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  retired: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  loaned_out: "On Loan",
  maintenance: "Maintenance",
  retired: "Retired",
};

function isOverdue(item: { expectedReturnDate?: number; status: string }): boolean {
  return item.status === "loaned_out" && !!item.expectedReturnDate && item.expectedReturnDate < Date.now();
}

function LoanerHistory({ loanerItemId }: { loanerItemId: Id<"loanerItems"> }) {
  const history = useQuery(api.loaners.getHistory, { loanerItemId });
  if (history === undefined) return <Skeleton className="h-20 w-full" />;

  const ACTION_LABELS: Record<string, string> = { loaned: "Loaned Out", returned: "Returned", extended: "Extended", damaged: "Damaged" };

  return (
    <div className="mt-3 space-y-2 pl-4 border-l-2 border-border/40">
      <span className="text-xs font-medium text-muted-foreground">History ({history.length})</span>
      {history.sort((a, b) => b.createdAt - a.createdAt).map((h) => (
        <div key={h._id} className="bg-muted/30 rounded p-2 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px]">{ACTION_LABELS[h.action] ?? h.action}</Badge>
            <span className="text-muted-foreground">{formatDate(h.createdAt)}</span>
          </div>
          {h.notes && <p className="text-muted-foreground mt-1">{h.notes}</p>}
        </div>
      ))}
      {history.length === 0 && <p className="text-xs text-muted-foreground">No history yet</p>}
    </div>
  );
}

function LoanerSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-64" /></div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoanersPage() {
  const [activeTab, setActiveTab] = useState<LoanerFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isLoaning, setIsLoaning] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [loanDialogId, setLoanDialogId] = useState<Id<"loanerItems"> | null>(null);
  const [returnDialogId, setReturnDialogId] = useState<Id<"loanerItems"> | null>(null);
  const { orgId, isLoaded } = useCurrentOrg();

  // Always fetch all loaners — filter client-side so summary cards stay accurate across tab changes
  const loaners = useQuery(
    api.loaners.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const customers = useQuery(
    api.customers.listCustomers,
    orgId ? { orgId } : "skip",
  );
  const createLoaner = useMutation(api.loaners.create);
  const loanOut = useMutation(api.loaners.loanOut);
  const returnItem = useMutation(api.loaners.returnItem);

  const [createForm, setCreateForm] = useState({ partNumber: "", serialNumber: "", description: "", dailyRate: "", notes: "" });
  const [loanForm, setLoanForm] = useState({ customerId: "", expectedReturnDate: "", conditionOut: "", notes: "" });
  const [returnForm, setReturnForm] = useState({ conditionIn: "", notes: "" });

  const isLoading = !isLoaded || loaners === undefined;

  const filtered = useMemo(() => {
    if (!loaners) return [];
    let result = loaners;
    // Client-side status filter so summary cards always show global counts
    if (activeTab !== "all") {
      result = result.filter((l) => l.status === activeTab);
    }
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (l) =>
        l.partNumber.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        (l.serialNumber ?? "").toLowerCase().includes(q),
    );
  }, [loaners, activeTab, search]);

  const all = loaners ?? [];
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const l of all) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [all]);

  const overdueCount = all.filter(isOverdue).length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setIsCreatingItem(true);
    try {
      await createLoaner({
        organizationId: orgId,
        partNumber: createForm.partNumber,
        description: createForm.description,
        serialNumber: createForm.serialNumber || undefined,
        dailyRate: createForm.dailyRate ? parseFloat(createForm.dailyRate) : undefined,
        notes: createForm.notes || undefined,
      });
      setCreateOpen(false);
      setCreateForm({ partNumber: "", serialNumber: "", description: "", dailyRate: "", notes: "" });
      toast.success("Loaner item created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create loaner item");
    } finally {
      setIsCreatingItem(false);
    }
  }

  async function handleLoanOut(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !loanDialogId) return;
    if (!loanForm.customerId) {
      toast.error("Please select a customer before loaning out this item.");
      return;
    }
    if (!loanForm.conditionOut.trim()) {
      toast.error("Condition at time of loan-out is required — needed as baseline for return inspection.");
      return;
    }
    setIsLoaning(true);
    try {
      await loanOut({
        id: loanDialogId,
        organizationId: orgId,
        customerId: loanForm.customerId as Id<"customers">,
        expectedReturnDate: loanForm.expectedReturnDate ? new Date(loanForm.expectedReturnDate).getTime() : undefined,
        conditionOut: loanForm.conditionOut || undefined,
        notes: loanForm.notes || undefined,
      });
      setLoanDialogId(null);
      setLoanForm({ customerId: "", expectedReturnDate: "", conditionOut: "", notes: "" });
      toast.success("Item loaned out");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to loan out item");
    } finally {
      setIsLoaning(false);
    }
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !returnDialogId) return;
    if (!returnForm.conditionIn.trim()) {
      toast.error("Condition notes are required — document the item's condition on return for damage assessment.");
      return;
    }
    setIsReturning(true);
    try {
      await returnItem({
        id: returnDialogId,
        organizationId: orgId,
        conditionIn: returnForm.conditionIn.trim(),
        notes: returnForm.notes || undefined,
      });
      setReturnDialogId(null);
      setReturnForm({ conditionIn: "", notes: "" });
      toast.success("Item returned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to return item");
    } finally {
      setIsReturning(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Rental / Loaner Tracking</h1>
          {isLoading ? <Skeleton className="h-4 w-40 mt-1" /> : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {all.length} items · {statusCounts.available ?? 0} available · {statusCounts.loaned_out ?? 0} on loan
              {overdueCount > 0 && (
                <span className="text-red-600 dark:text-red-400 ml-2">· {overdueCount} overdue</span>
              )}
            </p>
          )}
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { if (!isCreatingItem) setCreateOpen(v); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />New Loaner Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Loaner Item</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Part Number *</Label><Input value={createForm.partNumber} onChange={(e) => setCreateForm({ ...createForm, partNumber: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Serial Number</Label><Input value={createForm.serialNumber} onChange={(e) => setCreateForm({ ...createForm, serialNumber: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Description *</Label><Input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Daily Rate ($)</Label><Input type="number" step="0.01" value={createForm.dailyRate} onChange={(e) => setCreateForm({ ...createForm, dailyRate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={isCreatingItem}>Cancel</Button>
                <Button type="submit" disabled={isCreatingItem} className="min-w-[80px] gap-1.5">
                  {isCreatingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {isCreatingItem ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {!isLoading && (
        <div className="grid grid-cols-4 gap-3">
          <Card className="border-border/60"><CardContent className="p-3 text-center"><p className="text-lg font-semibold">{all.length}</p><p className="text-[10px] text-muted-foreground">Total Items</p></CardContent></Card>
          <Card className="border-border/60"><CardContent className="p-3 text-center"><p className="text-lg font-semibold text-green-600">{statusCounts.available ?? 0}</p><p className="text-[10px] text-muted-foreground">Available</p></CardContent></Card>
          <Card className="border-border/60"><CardContent className="p-3 text-center"><p className="text-lg font-semibold text-blue-600">{statusCounts.loaned_out ?? 0}</p><p className="text-[10px] text-muted-foreground">On Loan</p></CardContent></Card>
          <Card className="border-border/60"><CardContent className="p-3 text-center"><p className={`text-lg font-semibold ${overdueCount > 0 ? "text-red-600" : ""}`}>{overdueCount}</p><p className="text-[10px] text-muted-foreground">Overdue</p></CardContent></Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LoanerFilter)} className="w-full sm:w-auto">
          <TabsList className="h-8 bg-muted/40 p-0.5">
            {([["all", "All"], ["available", "Available"], ["loaned_out", "On Loan"], ["maintenance", "Maintenance"], ["retired", "Retired"]] as const).map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="h-7 px-3 text-xs data-[state=active]:bg-background">
                {label}
                {!isLoading && (statusCounts[value] ?? 0) > 0 && (
                  <Badge variant="secondary" className={`ml-1.5 h-4 min-w-[16px] px-1 text-[9px] ${activeTab === value ? "bg-primary/15 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                    {statusCounts[value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search loaners..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 pr-3 text-xs w-56 bg-muted/30 border-border/60" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <LoanerSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No loaner items found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isExpanded = expandedId === item._id;
            const overdue = isOverdue(item);
            return (
              <Card key={item._id} className={`border-border/60 ${overdue ? "border-l-4 border-l-red-500" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : item._id)}>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{item.partNumber}</span>
                        {item.serialNumber && <span className="text-xs text-muted-foreground">S/N: {item.serialNumber}</span>}
                        <Badge variant="outline" className={`text-[10px] border ${STATUS_STYLES[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                        {overdue && (
                          <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-600 border-red-500/30 gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />OVERDUE
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {item.dailyRate != null && <span>{formatCurrency(item.dailyRate)}/day</span>}
                        {item.status === "loaned_out" && item.loanedToCustomerId && (() => {
                          const customer = (customers ?? []).find((c) => c._id === item.loanedToCustomerId);
                          return customer ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              → {customer.companyName ?? customer.name}
                            </span>
                          ) : null;
                        })()}
                        {item.loanedDate && <span>Loaned: {formatDate(item.loanedDate)}</span>}
                        {item.expectedReturnDate && <span>Due: {formatDate(item.expectedReturnDate)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {item.status === "available" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setLoanDialogId(item._id); }}>
                          <ArrowLeftRight className="w-3 h-3 mr-1" />Loan Out
                        </Button>
                      )}
                      {item.status === "loaned_out" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setReturnDialogId(item._id); }}>
                          Return
                        </Button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <LoanerHistory loanerItemId={item._id} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Loan Out Dialog */}
      <Dialog open={loanDialogId !== null} onOpenChange={(open) => { if (!open && !isLoaning) { setLoanDialogId(null); setLoanForm({ customerId: "", expectedReturnDate: "", conditionOut: "", notes: "" }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Loan Out Item</DialogTitle></DialogHeader>
          {loanDialogId && (() => {
            const loanItem = all.find((i) => i._id === loanDialogId);
            if (!loanItem) return null;
            return (
              <div className="px-1 pb-1 -mt-1">
                <div className="rounded-md bg-muted/30 border border-border/40 px-3 py-2 space-y-0.5">
                  <p className="font-mono text-sm font-semibold text-foreground">{loanItem.partNumber}</p>
                  {loanItem.serialNumber && (
                    <p className="text-xs text-muted-foreground">S/N: {loanItem.serialNumber}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{loanItem.description}</p>
                </div>
              </div>
            );
          })()}
          <form onSubmit={handleLoanOut} className="space-y-4">
            <div className="space-y-2">
              <Label>Customer <span className="text-red-500">*</span></Label>
              {customers === undefined ? (
                <div className="h-9 bg-muted/30 rounded-md border border-border/60 animate-pulse" />
              ) : customers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No customers found.{" "}
                  <Link to="/billing/customers" className="text-primary underline underline-offset-2">
                    Add a customer
                  </Link>{" "}
                  before loaning out an item.
                </p>
              ) : (
                <Select
                  value={loanForm.customerId}
                  onValueChange={(v) => setLoanForm({ ...loanForm, customerId: v })}
                >
                  <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/60">
                    <SelectValue placeholder="Select a customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.companyName ?? c.name}
                        {c.companyName && c.name !== c.companyName && (
                          <span className="text-muted-foreground ml-1.5 text-xs">— {c.name}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Expected Return Date</Label>
              <Input type="date" min={new Date().toISOString().slice(0, 10)} value={loanForm.expectedReturnDate} onChange={(e) => setLoanForm({ ...loanForm, expectedReturnDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Condition at Loan-Out <span className="text-destructive">*</span></Label>
              <Textarea
                value={loanForm.conditionOut}
                onChange={(e) => setLoanForm({ ...loanForm, conditionOut: e.target.value.slice(0, 250) })}
                rows={2}
                placeholder="Document visible condition before releasing (e.g. 'Serviceable, clean, no visible damage')"
                maxLength={250}
                required
              />
              {loanForm.conditionOut.length >= 220 && (
                <p className={`text-xs ${loanForm.conditionOut.length >= 250 ? "text-red-500" : "text-amber-500"}`}>{loanForm.conditionOut.length}/250</p>
              )}
              <p className="text-[10px] text-muted-foreground">Required — used as baseline for return inspection and any damage disputes.</p>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={loanForm.notes} onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value.slice(0, 500) })} rows={2} maxLength={500} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setLoanDialogId(null)} disabled={isLoaning}>Cancel</Button>
              <Button type="submit" disabled={!loanForm.customerId || !loanForm.conditionOut.trim() || isLoaning} className="min-w-[90px] gap-1.5">
                {isLoaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {isLoaning ? "Saving…" : "Loan Out"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogId !== null} onOpenChange={(open) => { if (!open && !isReturning) { setReturnDialogId(null); setReturnForm({ conditionIn: "", notes: "" }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return Item</DialogTitle></DialogHeader>
          {returnDialogId && (() => {
            const returnLoanerItem = all.find((i) => i._id === returnDialogId);
            if (!returnLoanerItem) return null;
            return (
              <div className="px-1 pb-1 -mt-1">
                <div className="rounded-md bg-muted/30 border border-border/40 px-3 py-2 space-y-0.5">
                  <p className="font-mono text-sm font-semibold text-foreground">{returnLoanerItem.partNumber}</p>
                  {returnLoanerItem.serialNumber && (
                    <p className="text-xs text-muted-foreground">S/N: {returnLoanerItem.serialNumber}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{returnLoanerItem.description}</p>
                </div>
              </div>
            );
          })()}
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="space-y-2">
              <Label>Condition Notes <span className="text-red-600 dark:text-red-400">*</span></Label>
              <Textarea value={returnForm.conditionIn} onChange={(e) => setReturnForm({ ...returnForm, conditionIn: e.target.value.slice(0, 250) })} rows={2} placeholder="Condition upon return" maxLength={250} />
              {returnForm.conditionIn.length >= 220 && (
                <p className={`text-xs ${returnForm.conditionIn.length >= 250 ? "text-red-500" : "text-amber-500"}`}>{returnForm.conditionIn.length}/250</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value.slice(0, 500) })} rows={2} maxLength={500} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setReturnDialogId(null); setReturnForm({ conditionIn: "", notes: "" }); }} disabled={isReturning}>Cancel</Button>
              <Button type="submit" disabled={isReturning || !returnForm.conditionIn.trim()} className="min-w-[80px] gap-1.5">
                {isReturning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {isReturning ? "Saving…" : "Return"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
