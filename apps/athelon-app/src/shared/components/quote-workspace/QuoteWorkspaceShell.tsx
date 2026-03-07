"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Link, useSearchParams } from "react-router-dom";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useSelectedLocation } from "@/components/LocationSwitcher";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { QuoteNewEditor } from "@/components/quote-workspace/QuoteNewEditor";
import { QuoteDetailEditor } from "@/components/quote-workspace/QuoteDetailEditor";
import { QuoteBuilderLayout } from "@/components/quote-workspace/QuoteBuilderLayout";
import QuoteListPanel from "@/components/quote-workspace/QuoteListPanel";
import type {
  QuoteWorkspaceMode,
  QuoteWorkspaceWorkOrder,
} from "@/components/quote-workspace/types";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRightLeft,
  FileSpreadsheet,
  Filter,
  Search,
  Sparkles,
  Target,
  Warehouse,
} from "lucide-react";
import { ExportCSVButton } from "@/src/shared/components/ExportCSVButton";

type QuoteStatusFilter = "all" | "DRAFT" | "SENT" | "APPROVED" | "CONVERTED" | "DECLINED";
type LinkageFilter = "all" | "linked" | "unlinked";
type PriorityFilter = "all" | "aog" | "urgent" | "routine";

export type QuoteWorkspaceShellProps = {
  surface: "billing" | "scheduling" | "sales";
  forceMode?: "auto" | "new";
  forceQuoteId?: Id<"quotes">;
};

function priorityBadge(priority: QuoteWorkspaceWorkOrder["priority"]) {
  if (priority === "aog") {
    return (
      <Badge className="text-[10px] border-red-500/60 bg-red-500/15 text-red-600 dark:text-red-400">
        AOG
      </Badge>
    );
  }
  if (priority === "urgent") {
    return (
      <Badge className="text-[10px] border-amber-500/60 bg-amber-500/15 text-amber-600 dark:text-amber-400">
        URGENT
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      ROUTINE
    </Badge>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-4" data-testid="page-loading-state">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
        <Skeleton className="h-[560px] rounded-xl" />
        <Skeleton className="h-[560px] rounded-xl" />
      </div>
    </div>
  );
}

export function QuoteWorkspaceShell({
  surface,
  forceMode = "auto",
  forceQuoteId,
}: QuoteWorkspaceShellProps) {
  const { orgId, isLoaded } = useCurrentOrg();
  const { selectedLocationId } = useSelectedLocation(orgId);
  const selectedShopLocationFilter = useMemo(
    () =>
      selectedLocationId === "all"
        ? "all"
        : (selectedLocationId as Id<"shopLocations">),
    [selectedLocationId],
  );

  const workOrdersData = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId
      ? { organizationId: orgId, shopLocationId: selectedShopLocationFilter }
      : "skip",
  );

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || workOrdersData === undefined,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const selectedWorkOrderIdFromQuery = searchParams.get("workOrderId") ?? undefined;

  const [search, setSearch] = useState("");
  const [linkageFilter, setLinkageFilter] = useState<LinkageFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<QuoteStatusFilter>("all");
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

  const [workspaceQuoteId, setWorkspaceQuoteId] = useState<Id<"quotes"> | undefined>(
    forceQuoteId,
  );
  const [workspaceQuoteOwnerWorkOrderId, setWorkspaceQuoteOwnerWorkOrderId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    setWorkspaceQuoteId(forceQuoteId);
    setWorkspaceQuoteOwnerWorkOrderId(undefined);
  }, [forceQuoteId]);

  const workOrders = useMemo<QuoteWorkspaceWorkOrder[]>(() => {
    const rows = (workOrdersData ?? []).filter(
      (wo) => !["closed", "cancelled", "voided"].includes(wo.status),
    );

    const priorityWeight = (priority: QuoteWorkspaceWorkOrder["priority"]) => {
      if (priority === "aog") return 0;
      if (priority === "urgent") return 1;
      return 2;
    };

    return rows
      .map((wo) => ({
        _id: wo._id as Id<"workOrders">,
        workOrderNumber: wo.workOrderNumber,
        description: wo.description,
        status: wo.status,
        priority: wo.priority,
        sourceQuoteId: wo.sourceQuoteId as Id<"quotes"> | undefined,
        quoteNumber: wo.quoteNumber,
        quoteStatus: wo.quoteStatus,
        aircraft: wo.aircraft,
      }))
      .sort((a, b) => {
        return (
          priorityWeight(a.priority) - priorityWeight(b.priority) ||
          a.workOrderNumber.localeCompare(b.workOrderNumber)
        );
      });
  }, [workOrdersData]);

  const filteredWorkOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workOrders.filter((wo) => {
      if (linkageFilter === "linked" && !wo.sourceQuoteId) return false;
      if (linkageFilter === "unlinked" && wo.sourceQuoteId) return false;
      if (priorityFilter !== "all" && wo.priority !== priorityFilter) return false;
      if (quoteStatusFilter !== "all" && wo.quoteStatus !== quoteStatusFilter) return false;

      if (!query) return true;
      const haystack = [
        wo.workOrderNumber,
        wo.description,
        wo.aircraft?.currentRegistration,
        wo.aircraft?.make,
        wo.aircraft?.model,
        wo.quoteNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [workOrders, search, linkageFilter, priorityFilter, quoteStatusFilter]);

  const selectedWorkOrder = useMemo(
    () =>
      workOrders.find((wo) => String(wo._id) === selectedWorkOrderIdFromQuery) ??
      null,
    [workOrders, selectedWorkOrderIdFromQuery],
  );

  useEffect(() => {
    if (
      workspaceQuoteOwnerWorkOrderId &&
      workspaceQuoteOwnerWorkOrderId !== selectedWorkOrderIdFromQuery
    ) {
      setWorkspaceQuoteId(undefined);
      setWorkspaceQuoteOwnerWorkOrderId(undefined);
    }
  }, [
    selectedWorkOrderIdFromQuery,
    workspaceQuoteOwnerWorkOrderId,
    setWorkspaceQuoteId,
  ]);

  const shouldAutoSelectFallback =
    surface === "scheduling" || forceMode === "new" || !!forceQuoteId;

  useEffect(() => {
    if (!shouldAutoSelectFallback) return;

    const selectedStillExists =
      !!selectedWorkOrderIdFromQuery &&
      workOrders.some((wo) => String(wo._id) === selectedWorkOrderIdFromQuery);
    if (selectedStillExists) return;

    const quoteMatchedWoId = forceQuoteId
      ? workOrders.find((wo) => wo.sourceQuoteId === forceQuoteId)?._id
      : undefined;
    const fallbackId =
      quoteMatchedWoId ?? filteredWorkOrders[0]?._id ?? workOrders[0]?._id;
    if (!fallbackId) return;

    const next = new URLSearchParams(searchParamsString);
    next.set("workOrderId", String(fallbackId));
    setSearchParams(next, { replace: true });
  }, [
    shouldAutoSelectFallback,
    selectedWorkOrderIdFromQuery,
    workOrders,
    filteredWorkOrders,
    forceQuoteId,
    searchParamsString,
    setSearchParams,
  ]);

  const setSelectedWorkOrder = useCallback(
    (workOrderId: string) => {
      const next = new URLSearchParams(searchParamsString);
      next.set("workOrderId", workOrderId);
      setSearchParams(next, { replace: true });
      setWorkspaceQuoteId(undefined);
      setWorkspaceQuoteOwnerWorkOrderId(undefined);
      setMobileRailOpen(false);
    },
    [searchParamsString, setSearchParams],
  );

  const clearSelection = useCallback(() => {
    const next = new URLSearchParams(searchParamsString);
    next.delete("workOrderId");
    setSearchParams(next, { replace: true });
    setWorkspaceQuoteId(undefined);
    setWorkspaceQuoteOwnerWorkOrderId(undefined);
  }, [searchParamsString, setSearchParams]);

  const linkedCount = useMemo(
    () => workOrders.filter((wo) => !!wo.sourceQuoteId).length,
    [workOrders],
  );
  const unlinkedCount = workOrders.length - linkedCount;
  const aogCount = useMemo(
    () => workOrders.filter((wo) => wo.priority === "aog").length,
    [workOrders],
  );
  const sentCount = useMemo(
    () => workOrders.filter((wo) => wo.quoteStatus === "SENT").length,
    [workOrders],
  );
  // Attention queue: counts WOs that need immediate action — AOG priority OR sent quote awaiting response.
  // Array.filter with OR returns each WO at most once, so no double-counting occurs.
  // (A prior comment incorrectly flagged this as BUG-BH-012; the implementation is correct.)
  const attentionCount = useMemo(
    () => workOrders.filter((wo) => wo.priority === "aog" || wo.quoteStatus === "SENT").length,
    [workOrders],
  );

  const exportRows = useMemo(
    () =>
      filteredWorkOrders.map((wo) => ({
        quoteNumber: wo.quoteNumber ?? "",
        workOrder: wo.workOrderNumber,
        aircraft: wo.aircraft?.currentRegistration ?? "",
        status: wo.quoteStatus ?? "UNLINKED",
        priority: wo.priority,
      })),
    [filteredWorkOrders],
  );

  const linkedQuoteId = forceMode === "new" ? undefined : selectedWorkOrder?.sourceQuoteId;
  const activeQuoteId =
    workspaceQuoteId ??
    linkedQuoteId ??
    (selectedWorkOrder ? undefined : forceQuoteId);

  let mode: QuoteWorkspaceMode = "list";
  if (activeQuoteId) {
    mode = "detail";
  } else if (forceMode === "new") {
    mode = "new";
  } else if (selectedWorkOrder) {
    mode = selectedWorkOrder.sourceQuoteId ? "detail" : "new";
  }

  const handleQuoteCreated = useCallback(
    (quoteId: Id<"quotes">) => {
      setWorkspaceQuoteId(quoteId);
      setWorkspaceQuoteOwnerWorkOrderId(selectedWorkOrderIdFromQuery);
    },
    [selectedWorkOrderIdFromQuery],
  );

  const handleQuoteNavigated = useCallback(
    (quoteId: Id<"quotes">) => {
      setWorkspaceQuoteId(quoteId);
      setWorkspaceQuoteOwnerWorkOrderId(selectedWorkOrderIdFromQuery);
    },
    [selectedWorkOrderIdFromQuery],
  );

  const rail = (
    <div className="min-h-0 flex h-full flex-col rounded-2xl border border-border/50 bg-gradient-to-b from-slate-100/70 to-background dark:from-slate-900/40">
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Work Orders</p>
          <Badge variant="outline" className="text-[10px]">
            {filteredWorkOrders.length} visible
          </Badge>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search WO, tail, quote..."
            className="h-8 border-border/60 bg-background pl-8 text-xs"
            aria-label="Search quote workspace work orders"
          />
        </div>
      </div>

      <div className="border-b border-border/40 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Quick Filters
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "linked", "unlinked"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={linkageFilter === value ? "secondary" : "outline"}
              className="h-7 text-[11px]"
              onClick={() => setLinkageFilter(value)}
            >
              {value === "all"
                ? "All Links"
                : value === "linked"
                  ? "Linked"
                  : "Unlinked"}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "aog", "urgent", "routine"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={priorityFilter === value ? "secondary" : "outline"}
              className="h-7 text-[11px]"
              onClick={() => setPriorityFilter(value)}
            >
              {value === "all" ? "Any Priority" : value.toUpperCase()}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "DRAFT", "SENT", "APPROVED", "CONVERTED", "DECLINED"] as const).map(
            (value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={quoteStatusFilter === value ? "secondary" : "outline"}
                className="h-7 text-[11px]"
                onClick={() => setQuoteStatusFilter(value)}
              >
                {value === "all" ? "Any Quote Status" : value}
              </Button>
            ),
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredWorkOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
            No work orders match current filters.
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredWorkOrders.map((wo) => {
              const selected = String(wo._id) === selectedWorkOrderIdFromQuery;
              return (
                <li key={String(wo._id)}>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkOrder(String(wo._id))}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-all",
                      selected
                        ? "border-cyan-500/60 bg-cyan-500/10 shadow-sm"
                        : "border-border/50 bg-card hover:border-cyan-500/40 hover:bg-muted/40",
                    )}
                    data-testid={`quote-workspace-select-${String(wo._id)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-mono text-xs font-semibold">
                        {wo.workOrderNumber}
                      </p>
                      {priorityBadge(wo.priority)}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {wo.aircraft?.currentRegistration ?? "No aircraft"} • {wo.description}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {wo.quoteNumber
                        ? `${wo.quoteNumber}${wo.quoteStatus ? ` • ${wo.quoteStatus}` : ""}`
                        : "No linked quote"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return <ShellSkeleton />;
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Quote workspace requires organization setup"
        missingInfo="Complete onboarding before running quote workflows from scheduling."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId || !workOrdersData) return null;

  if (surface === "scheduling" && workOrders.length === 0) {
    return (
      <ActionableEmptyState
        title="No active work orders available"
        missingInfo="Create a work order before building or editing quotes in the workspace."
        primaryActionLabel="Create Work Order"
        primaryActionType="link"
        primaryActionTarget="/work-orders/new"
        secondaryActionLabel={surface === "scheduling" ? "Open Gantt Board" : "Open Quotes List"}
        secondaryActionTarget={surface === "scheduling" ? "/scheduling" : "/sales/quotes"}
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="quote-workspace-shell">
      {surface === "scheduling" && (
        <div className="flex items-center gap-1 flex-wrap border-b border-border/30 pb-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
            <Link to="/scheduling">Gantt Board</Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
            <Link to="/scheduling/bays">
              <Warehouse className="w-3.5 h-3.5" />
              Bays
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
            <Link to="/scheduling/capacity">Capacity</Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
            <Link to="/scheduling/financial-planning">Financial Planning</Link>
          </Button>
          <Button variant="secondary" size="sm" className="text-xs h-7" asChild>
            <Link to="/scheduling/quotes">Quote Workspace</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Eligible Work Orders
            </p>
            <p className="mt-1 text-2xl font-semibold">{workOrders.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Linked Quotes
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {linkedCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Unlinked
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-700 dark:text-slate-300">
              {unlinkedCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Attention Queue
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">
              {attentionCount}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {aogCount} AOG · {sentCount} sent quotes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-slate-100/40 p-3 dark:to-slate-900/30">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              {surface === "scheduling"
                ? "Scheduling Quote Workspace"
                : surface === "sales"
                  ? "Sales Quote Workspace"
                  : "Billing Quote Workspace"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {selectedWorkOrder
                ? `${selectedWorkOrder.workOrderNumber} · ${selectedWorkOrder.aircraft?.currentRegistration ?? "No aircraft"}`
                : "Select a work order to open quote workflow."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              <Target className="mr-1 h-3 w-3" />
              {mode.toUpperCase()}
            </Badge>
            <ExportCSVButton
              data={exportRows}
              columns={[
                { key: "quoteNumber", header: "Quote #" },
                { key: "workOrder", header: "Work Order" },
                { key: "aircraft", header: "Aircraft" },
                { key: "status", header: "Status" },
                { key: "priority", header: "Priority" },
              ]}
              fileName="quotes.csv"
              className="h-8 text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="lg:hidden h-8 text-xs"
              onClick={() => setMobileRailOpen(true)}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Work Orders
            </Button>
          </div>
        </div>

        {mode === "list" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="hidden lg:block min-h-[620px]" data-testid="quote-workspace-rail">
              {rail}
            </aside>
            <section className="min-w-0" data-testid="quote-workspace-editor">
              <div className="rounded-2xl border border-dashed border-border/60 bg-card p-4">
                <QuoteListPanel />
              </div>
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="hidden lg:block min-h-[620px]" data-testid="quote-workspace-rail">
              {rail}
            </aside>
            <section className="min-w-0" data-testid="quote-workspace-editor">
              <QuoteBuilderLayout
                mode={mode === "detail" ? "detail" : "new"}
                quoteId={activeQuoteId}
                prefillWorkOrderId={selectedWorkOrder?._id}
                onBack={clearSelection}
                onQuoteCreated={handleQuoteCreated}
              />
            </section>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/95 p-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-screen-sm items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 flex-1 text-xs"
            onClick={() => setMobileRailOpen(true)}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Work Orders
          </Button>
          <Button
            type="button"
            className="h-9 flex-1 text-xs"
            onClick={() => {
              if (!selectedWorkOrder) return;
              setWorkspaceQuoteId(undefined);
              setWorkspaceQuoteOwnerWorkOrderId(undefined);
              if (String(selectedWorkOrder._id) !== selectedWorkOrderIdFromQuery) {
                setSelectedWorkOrder(String(selectedWorkOrder._id));
              }
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Compose
          </Button>
        </div>
      </div>

      <Sheet open={mobileRailOpen} onOpenChange={setMobileRailOpen}>
        <SheetContent side="left" className="w-[88vw] sm:max-w-md p-0" showCloseButton>
          <SheetHeader className="border-b border-border/40">
            <SheetTitle>Work Orders</SheetTitle>
            <SheetDescription>
              Choose a work order to open quote workflow.
            </SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100%-74px)] p-3">{rail}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
