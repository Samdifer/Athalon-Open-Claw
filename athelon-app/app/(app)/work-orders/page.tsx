"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Plus,
  Search,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Timer,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type WoStatus,
  type WoType,
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  WO_TYPE_LABEL,
} from "@/lib/mro-constants";
import { formatDate } from "@/lib/format";

// ─── Types ──────────────────────────────────────────────────────────────────

type FilterTab = "active" | "on_hold" | "pending" | "complete" | "all";

function filterByTab(
  wos: Array<{ status: string }>,
  tab: FilterTab,
): Array<{ status: string }> {
  switch (tab) {
    case "active":
      return wos.filter((w) =>
        ["open", "in_progress", "open_discrepancies", "draft"].includes(w.status),
      );
    case "on_hold":
      return wos.filter((w) => w.status === "on_hold");
    case "pending":
      return wos.filter((w) =>
        ["pending_inspection", "pending_signoff"].includes(w.status),
      );
    case "complete":
      return wos.filter((w) => ["closed", "cancelled"].includes(w.status));
    default:
      return wos;
  }
}

// ─── Loading skeletons ───────────────────────────────────────────────────────

function WorkOrderSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("active");
  const [search, setSearch] = useState("");
  const { orgId, isLoaded: orgLoaded } = useCurrentOrg();

  const { results, status: queryStatus } = usePaginatedQuery(
    api.workOrders.listWorkOrders,
    orgId ? { organizationId: orgId } : "skip",
    { initialNumItems: 100 },
  );

  const isLoading = !orgLoaded || queryStatus === "LoadingFirstPage";

  // Filter and search client-side
  const filtered = useMemo(() => {
    const all = results ?? [];
    const byTab = filterByTab(all, activeTab) as typeof results;
    if (!search.trim()) return byTab;
    const q = search.toLowerCase();
    return byTab.filter(
      (wo) =>
        wo.workOrderNumber.toLowerCase().includes(q) ||
        (wo.aircraft?.currentRegistration ?? "").toLowerCase().includes(q) ||
        wo.description.toLowerCase().includes(q),
    );
  }, [results, activeTab, search]);

  // Count per tab
  const all = results ?? [];
  const counts: Record<FilterTab, number> = {
    active: filterByTab(all, "active").length,
    on_hold: filterByTab(all, "on_hold").length,
    pending: filterByTab(all, "pending").length,
    complete: filterByTab(all, "complete").length,
    all: all.length,
  };

  const totalInProgress = all.filter((w) => w.status === "in_progress").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Work Orders</h1>
          {isLoading ? (
            <Skeleton className="h-4 w-40 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {all.length} total · {totalInProgress} in progress
            </p>
          )}
        </div>
        <Button asChild size="sm">
          <Link href="/work-orders/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Work Order
          </Link>
        </Button>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-8 bg-muted/40 p-0.5">
            {(
              [
                ["active", "Active"],
                ["on_hold", "On Hold"],
                ["pending", "Pending"],
                ["complete", "Complete"],
                ["all", "All"],
              ] as const
            ).map(([tab, label]) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-7 px-3 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                {label}
                {!isLoading && counts[tab] > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 h-4 min-w-[16px] px-1 text-[9px] ${
                      activeTab === tab
                        ? "bg-primary/15 text-primary"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}
                  >
                    {counts[tab]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              placeholder="Search WO#, aircraft, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-64 bg-muted/30 border-border/60"
              aria-label="Search work orders by number, aircraft, or description"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/60"
            aria-label="Filter work orders"
          >
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            Filter
          </Button>
        </div>
      </div>

      {/* Work Orders List */}
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading work orders">
          {Array.from({ length: 4 }).map((_, i) => (
            <WorkOrderSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No work orders found
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {activeTab === "active"
                ? "No active work orders. Create one to get started."
                : "No work orders match the current filter."}
            </p>
            {activeTab === "active" && (
              <Button asChild size="sm" className="mt-4">
                <Link href="/work-orders/new">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Work Order
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" aria-live="polite" aria-label={`Work orders list, ${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}>
          {filtered.map((wo) => {
            const tailNumber = wo.aircraft?.currentRegistration ?? "—";
            const aircraftLabel =
              wo.aircraft
                ? `${wo.aircraft.make} ${wo.aircraft.model}`
                : "Unknown Aircraft";
            const statusLabel =
              WO_STATUS_LABEL[wo.status as WoStatus] ?? wo.status;
            const typeLabel =
              WO_TYPE_LABEL[wo.workOrderType as WoType] ?? wo.workOrderType;
            const openedDate = wo.openedAt ? formatDate(wo.openedAt) : "—";
            const isAog = wo.priority === "aog";

            return (
              <Link key={wo._id} href={`/work-orders/${wo._id}`} aria-label={`Work order ${wo.workOrderNumber}: ${tailNumber} — ${wo.description} (${statusLabel})`}>
                <Card
                  className={`border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer ${
                    isAog ? "border-l-4 border-l-red-500" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Row 1: WO# + Status + Badges */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground font-medium">
                            {wo.workOrderNumber}
                          </span>
                          {isAog ? (
                            <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-semibold">
                              AOG
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium border ${WO_STATUS_STYLES[wo.status as WoStatus] ?? "bg-muted text-muted-foreground"}`}
                            >
                              {wo.status === "in_progress" && (
                                <Circle className="w-2 h-2 mr-1 fill-current" />
                              )}
                              {wo.status === "closed" && (
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                              )}
                              {statusLabel}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground border-border/40"
                          >
                            {typeLabel}
                          </Badge>
                          {wo.priority === "urgent" && (
                            <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/30 text-[10px]">
                              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                              Urgent
                            </Badge>
                          )}
                        </div>

                        {/* Row 2: Aircraft + Description */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-base text-foreground">
                            {tailNumber}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {aircraftLabel}
                          </span>
                          <span className="text-muted-foreground/50">·</span>
                          <span className="text-sm text-foreground truncate">
                            {wo.description}
                          </span>
                        </div>

                        {/* Row 3: Meta */}
                        {wo.openedAt ? (
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              Opened {openedDate}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1.5">
                            <span className="text-[11px] text-muted-foreground">
                              Draft — not yet opened
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Arrow */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {/* Load more */}
          {queryStatus === "CanLoadMore" && (
            <p className="text-center text-xs text-muted-foreground py-2">
              Showing first 100 work orders
            </p>
          )}
        </div>
      )}
    </div>
  );
}
