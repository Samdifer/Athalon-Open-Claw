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
import { QuoteBuilderLayout } from "@/components/quote-workspace/QuoteBuilderLayout";
import { QuoteDocumentView } from "@/components/quote-workspace/QuoteDocumentView";
import QuoteListPanel from "@/components/quote-workspace/QuoteListPanel";
import { WORailPanel } from "@/components/quote-workspace/WORailPanel";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRightLeft,
  FileSpreadsheet,
  Sparkles,
  Target,
  Warehouse,
} from "lucide-react";
import { ExportCSVButton } from "@/src/shared/components/ExportCSVButton";

export type QuoteWorkspaceShellProps = {
  surface: "billing" | "scheduling";
  forceMode?: "auto" | "new";
  forceQuoteId?: Id<"quotes">;
};

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
  const selectedWorkOrderIdFromQuery =
    searchParams.get("workOrderId") ?? undefined;
  const prefillCustomerIdFromQuery =
    searchParams.get("customerId") ?? undefined;

  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [workspaceQuoteId, setWorkspaceQuoteId] = useState<
    Id<"quotes"> | undefined
  >(forceQuoteId);
  const [workspaceQuoteOwnerWorkOrderId, setWorkspaceQuoteOwnerWorkOrderId] =
    useState<string | undefined>(undefined);

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
      .sort(
        (a, b) =>
          priorityWeight(a.priority) - priorityWeight(b.priority) ||
          a.workOrderNumber.localeCompare(b.workOrderNumber),
      );
  }, [workOrdersData]);

  const selectedWorkOrder = useMemo(
    () =>
      workOrders.find(
        (wo) => String(wo._id) === selectedWorkOrderIdFromQuery,
      ) ?? null,
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
  }, [selectedWorkOrderIdFromQuery, workspaceQuoteOwnerWorkOrderId]);

  const shouldAutoSelectFallback =
    surface === "scheduling" || forceMode === "new" || !!forceQuoteId;

  useEffect(() => {
    if (!shouldAutoSelectFallback) return;
    const selectedStillExists =
      !!selectedWorkOrderIdFromQuery &&
      workOrders.some(
        (wo) => String(wo._id) === selectedWorkOrderIdFromQuery,
      );
    if (selectedStillExists) return;
    const quoteMatchedWoId = forceQuoteId
      ? workOrders.find((wo) => wo.sourceQuoteId === forceQuoteId)?._id
      : undefined;
    const fallbackId =
      quoteMatchedWoId ?? workOrders[0]?._id;
    if (!fallbackId) return;
    const next = new URLSearchParams(searchParamsString);
    next.set("workOrderId", String(fallbackId));
    setSearchParams(next, { replace: true });
  }, [
    shouldAutoSelectFallback,
    selectedWorkOrderIdFromQuery,
    workOrders,
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

  // Stats
  const linkedCount = useMemo(
    () => workOrders.filter((wo) => !!wo.sourceQuoteId).length,
    [workOrders],
  );
  const unlinkedCount = workOrders.length - linkedCount;
  const attentionCount = useMemo(
    () =>
      workOrders.filter(
        (wo) => wo.priority === "aog" || wo.quoteStatus === "SENT",
      ).length,
    [workOrders],
  );
  const aogCount = useMemo(
    () => workOrders.filter((wo) => wo.priority === "aog").length,
    [workOrders],
  );
  const sentCount = useMemo(
    () => workOrders.filter((wo) => wo.quoteStatus === "SENT").length,
    [workOrders],
  );

  const exportRows = useMemo(
    () =>
      workOrders.map((wo) => ({
        quoteNumber: wo.quoteNumber ?? "",
        workOrder: wo.workOrderNumber,
        aircraft: wo.aircraft?.currentRegistration ?? "",
        status: wo.quoteStatus ?? "UNLINKED",
        priority: wo.priority,
      })),
    [workOrders],
  );

  // Mode resolution
  const linkedQuoteId =
    forceMode === "new" ? undefined : selectedWorkOrder?.sourceQuoteId;
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
        secondaryActionLabel={
          surface === "scheduling"
            ? "Open Gantt Board"
            : "Open Quotes List"
        }
        secondaryActionTarget={
          surface === "scheduling" ? "/scheduling" : "/sales/quotes"
        }
      />
    );
  }

  // Right panel content based on mode
  const rightPanel =
    mode === "list" ? (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card p-4">
        <QuoteListPanel />
      </div>
    ) : mode === "detail" ? (
      <QuoteDocumentView
        quoteId={activeQuoteId}
        hideBackButton
        onBack={clearSelection}
        onQuoteNavigate={handleQuoteNavigated}
      />
    ) : (
      <QuoteBuilderLayout
        mode="new"
        quoteId={undefined}
        prefillWorkOrderId={selectedWorkOrder?._id}
        prefillCustomerId={prefillCustomerIdFromQuery}
        onBack={clearSelection}
        onQuoteCreated={handleQuoteCreated}
      />
    );

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
            <Link to="/scheduling/financial-planning">
              Financial Planning
            </Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="text-xs h-7"
            asChild
          >
            <Link to="/scheduling/quotes">Quote Workspace</Link>
          </Button>
        </div>
      )}

      {/* Stats bar */}
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

      {/* Workspace panel */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-slate-100/40 p-3 dark:to-slate-900/30">
        {/* Header bar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              {surface === "scheduling"
                ? "Scheduling Quote Workspace"
                : "Quote Workspace"}
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

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className="hidden lg:block min-h-[620px]"
            data-testid="quote-workspace-rail"
          >
            <WORailPanel
              workOrders={workOrders}
              selectedWorkOrderId={selectedWorkOrderIdFromQuery}
              onSelectWorkOrder={setSelectedWorkOrder}
            />
          </aside>
          <section className="min-w-0" data-testid="quote-workspace-editor">
            {rightPanel}
          </section>
        </div>
      </div>

      {/* Mobile bottom bar */}
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
              if (
                String(selectedWorkOrder._id) !== selectedWorkOrderIdFromQuery
              ) {
                setSelectedWorkOrder(String(selectedWorkOrder._id));
              }
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Compose
          </Button>
        </div>
      </div>

      {/* Mobile WO rail sheet */}
      <Sheet open={mobileRailOpen} onOpenChange={setMobileRailOpen}>
        <SheetContent side="left" className="w-[88vw] sm:max-w-md p-0" showCloseButton>
          <SheetHeader className="border-b border-border/40">
            <SheetTitle>Work Orders</SheetTitle>
            <SheetDescription>
              Choose a work order to open quote workflow.
            </SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100%-74px)] p-3">
            <WORailPanel
              workOrders={workOrders}
              selectedWorkOrderId={selectedWorkOrderIdFromQuery}
              onSelectWorkOrder={setSelectedWorkOrder}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
