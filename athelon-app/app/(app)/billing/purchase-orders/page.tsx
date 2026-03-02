"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Plus, Search, ShoppingCart, ChevronRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

type POStatus = "DRAFT" | "SUBMITTED" | "PARTIAL" | "RECEIVED" | "CLOSED" | "all";

// Module-level constant — never changes, no need to allocate on every render
const TABS: { value: POStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PARTIAL", label: "Partial" },
  { value: "RECEIVED", label: "Received" },
  { value: "CLOSED", label: "Closed" },
];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SUBMITTED: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PARTIAL: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  RECEIVED: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  CLOSED: "bg-muted text-muted-foreground border-muted-foreground/30",
};

function POSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /></div>
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PurchaseOrdersPage() {
  const [activeTab, setActiveTab] = useState<POStatus>("all");
  const [search, setSearch] = useState("");
  const { orgId, isLoaded } = useCurrentOrg();

  const pos = useQuery(
    api.billing.listPurchaseOrders,
    orgId ? { orgId, status: activeTab === "all" ? undefined : activeTab } : "skip",
  );

  const vendors = useQuery(
    api.vendors.listVendors,
    orgId ? { orgId } : "skip",
  );

  // Build vendor lookup map for fast access by ID
  const vendorMap = useMemo<Record<string, string>>(() => {
    if (!vendors) return {};
    return Object.fromEntries(vendors.map((v) => [v._id, v.name]));
  }, [vendors]);

  const isLoading = !isLoaded || pos === undefined;

  const filtered = useMemo(() => {
    if (!pos) return [];
    if (!search.trim()) return pos;
    const q = search.toLowerCase();
    return pos.filter((p) => {
      if (p.poNumber.toLowerCase().includes(q)) return true;
      const vendorName = vendorMap[(p as unknown as { vendorId: string }).vendorId] ?? "";
      if (vendorName.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [pos, search, vendorMap]);

  const all = pos ?? [];

  // Memoized single-pass counter — only recomputes when Convex data changes,
  // not on every search keystroke or tab selection
  const counts = useMemo<Record<POStatus, number>>(() => {
    const c: Record<POStatus, number> = { all: 0, DRAFT: 0, SUBMITTED: 0, PARTIAL: 0, RECEIVED: 0, CLOSED: 0 };
    for (const p of (pos ?? [])) {
      c.all++;
      if (p.status === "DRAFT") c.DRAFT++;
      else if (p.status === "SUBMITTED") c.SUBMITTED++;
      else if (p.status === "PARTIAL") c.PARTIAL++;
      else if (p.status === "RECEIVED") c.RECEIVED++;
      else if (p.status === "CLOSED") c.CLOSED++;
    }
    return c;
  }, [pos]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Purchase Orders</h1>
          {isLoading ? <Skeleton className="h-4 w-40 mt-1" /> : (
            <p className="text-sm text-muted-foreground mt-0.5">{all.length} total · {counts.SUBMITTED} submitted</p>
          )}
        </div>
        <Button asChild size="sm">
          <Link to="/billing/purchase-orders/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New PO
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as POStatus)} className="w-full sm:w-auto">
          <TabsList className="h-8 bg-muted/40 p-0.5 flex-wrap">
            {TABS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="h-7 px-2.5 text-xs data-[state=active]:bg-background">
                {label}
                {!isLoading && counts[value] > 0 && (
                  <Badge variant="secondary" className={`ml-1 h-4 min-w-[16px] px-1 text-[9px] ${activeTab === value ? "bg-primary/15 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                    {counts[value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <Input
            placeholder="Search PO # or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs w-56 bg-muted/30 border-border/60"
            aria-label="Search purchase orders by number or vendor"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading purchase orders">{Array.from({ length: 3 }).map((_, i) => <POSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <ShoppingCart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No purchase orders found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {activeTab === "all" ? "Create a PO to order parts from approved vendors." : `No ${activeTab.toLowerCase()} POs.`}
            </p>
            {activeTab === "all" && (
              <Button asChild size="sm" className="mt-4">
                <Link to="/billing/purchase-orders/new">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create PO
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" aria-live="polite" aria-label={`Purchase orders list, ${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}>
          {filtered.map((po) => {
            const poWithVendor = po as unknown as { vendorId: Id<"vendors"> };
            const vendorName = vendorMap[poWithVendor.vendorId] ?? null;
            return (
              <Link key={po._id} to={`/billing/purchase-orders/${po._id}`} aria-label={`Purchase order ${po.poNumber} — ${po.status} — $${po.total.toFixed(2)}`}>
                <Card className="border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground font-medium">{po.poNumber}</span>
                          <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_STYLES[po.status] ?? ""}`}>
                            {po.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {vendorName && (
                            <span className="flex items-center gap-1 text-xs text-foreground font-medium">
                              <Building2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              {vendorName}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">Created {formatDate(po.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-semibold">${po.total.toFixed(2)}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
