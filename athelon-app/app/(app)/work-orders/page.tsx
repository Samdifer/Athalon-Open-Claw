"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  Plus,
  Search,
  ClipboardList,
  AlertTriangle,
  Package,
  CheckCircle2,
  Circle,
  ChevronRight,
  Filter,
  Calendar,
  TrendingUp,
  Download,
  LayoutGrid,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { formatDate } from "@/lib/format";
import {
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  WO_TYPE_LABEL,
  WO_TYPES,
  type WoStatus,
  type WoType,
  type WoPriority,
} from "@/lib/mro-constants";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { downloadCSV } from "@/lib/export";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { QRCodeBadge } from "@/components/QRCodeBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCode } from "lucide-react";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

type FilterTab =
  | "active"
  | "on_hold"
  | "pending"
  | "awaiting_parts"
  | "complete"
  | "all";

type RiskLevel = "overdue" | "at_risk" | "on_track" | "no_date";

type WorkOrderRow = {
  id: string;
  href: string;
  number: string;
  status: string;
  statusLabel: string;
  typeLabel: string;
  rawType: string;
  priority: string;
  description: string;
  customer: string;
  aircraft: string;
  aircraftType: string;
  promisedDeliveryDate: number | null;
  tasksComplete: number;
  tasksTotal: number;
  openSquawks: number;
  partsOnOrder: number;
  openedAt: number;
};

function getScheduleRisk(promisedDeliveryMs: number | null | undefined): RiskLevel {
  if (!promisedDeliveryMs) return "no_date";
  const now = Date.now();
  if (promisedDeliveryMs < now) return "overdue";
  const daysLeft = (promisedDeliveryMs - now) / (1000 * 60 * 60 * 24);
  return daysLeft <= 2 ? "at_risk" : "on_track";
}

function RiskIcon({ risk }: { risk: RiskLevel }) {
  if (risk === "no_date") return null;
  if (risk === "overdue") return <TrendingUp className="w-3 h-3 text-red-400 flex-shrink-0" />;
  if (risk === "at_risk") return <TrendingUp className="w-3 h-3 text-amber-400 flex-shrink-0" />;
  return <TrendingUp className="w-3 h-3 text-green-400 flex-shrink-0" />;
}

function filterWorkOrders(rows: WorkOrderRow[], tab: FilterTab) {
  switch (tab) {
    case "active":
      return rows.filter((w) => ["open", "in_progress", "open_discrepancies"].includes(w.status));
    case "on_hold":
      return rows.filter((w) => w.status === "on_hold");
    case "pending":
      return rows.filter((w) => ["pending_inspection", "pending_signoff"].includes(w.status));
    case "awaiting_parts":
      return rows.filter((w) => w.partsOnOrder > 0);
    case "complete":
      return rows.filter((w) => ["closed", "cancelled", "voided"].includes(w.status));
    default:
      return rows;
  }
}

export default function WorkOrdersPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const raw = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId ? { organizationId: orgId } : "skip",
  );
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || raw === undefined,
  });

  const [activeTab, setActiveTab] = useState<FilterTab>("active");
  const [search, setSearch] = useState("");
  const [qrWoNumber, setQrWoNumber] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<WoPriority | "">("");
  const [filterType, setFilterType] = useState<WoType | "">("");
  const [filterOpen, setFilterOpen] = useState(false);

  const workOrders = useMemo<WorkOrderRow[]>(() => {
    const rows = raw ?? [];
    return rows.map((wo) => ({
      id: String(wo._id),
      href: `/work-orders/${wo._id}`,
      number: wo.workOrderNumber,
      status: wo.status,
      statusLabel: WO_STATUS_LABEL[wo.status as WoStatus] ?? wo.status,
      typeLabel: WO_TYPE_LABEL[wo.workOrderType as WoType] ?? wo.workOrderType,
      rawType: wo.workOrderType,
      priority: wo.priority,
      description: wo.description,
      customer: wo.customerName ?? "No customer",
      aircraft: wo.aircraft?.currentRegistration ?? "—",
      aircraftType: wo.aircraft
        ? `${wo.aircraft.make} ${wo.aircraft.model}`.trim()
        : "Aircraft unavailable",
      promisedDeliveryDate: wo.promisedDeliveryDate ?? null,
      tasksComplete: wo.completedTaskCardCount ?? 0,
      tasksTotal: wo.taskCardCount ?? 0,
      openSquawks: wo.openDiscrepancyCount ?? 0,
      partsOnOrder: wo.pendingPartCount ?? 0,
      openedAt: wo.openedAt,
    }));
  }, [raw]);

  const filtered = useMemo(
    () =>
      filterWorkOrders(workOrders, activeTab).filter((wo) => {
        if (filterPriority && wo.priority !== filterPriority) return false;
        if (filterType && wo.rawType !== filterType) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          wo.number.toLowerCase().includes(q) ||
          wo.aircraft.toLowerCase().includes(q) ||
          wo.description.toLowerCase().includes(q) ||
          wo.customer.toLowerCase().includes(q)
        );
      }),
    [activeTab, search, workOrders, filterPriority, filterType],
  );

  const activeFilterCount = (filterPriority ? 1 : 0) + (filterType ? 1 : 0);

  // Single-pass counter — O(n) instead of the previous O(6n) from 6 separate
  // filterWorkOrders() calls each iterating the full array.
  const counts = useMemo(() => {
    const c = {
      active: 0,
      on_hold: 0,
      pending: 0,
      awaiting_parts: 0,
      complete: 0,
      all: workOrders.length,
    };
    for (const wo of workOrders) {
      if (["open", "in_progress", "open_discrepancies"].includes(wo.status)) c.active++;
      if (wo.status === "on_hold") c.on_hold++;
      if (["pending_inspection", "pending_signoff"].includes(wo.status)) c.pending++;
      if (wo.partsOnOrder > 0) c.awaiting_parts++;
      if (["closed", "cancelled", "voided"].includes(wo.status)) c.complete++;
    }
    return c;
  }, [workOrders]);

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4" data-testid="page-loading-state">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (prereq.state === "missing_context" || !orgId) {
    return (
      <ActionableEmptyState
        title="Work orders are unavailable until setup is complete"
        missingInfo="Your account is missing organization context. Complete onboarding to create and manage work orders."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
        secondaryActionLabel="Go to Dashboard"
        secondaryActionTarget="/dashboard"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Work Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {workOrders.length} total ·{" "}
            {workOrders.filter((w) => w.status === "in_progress").length} in progress
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            asChild
          >
            <Link to="/work-orders/kanban">
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              if (filtered.length) {
                downloadCSV(
                  filtered.map((wo) => ({
                    "WO Number": wo.number,
                    Status: wo.statusLabel,
                    Type: wo.typeLabel,
                    Priority: wo.priority,
                    Customer: wo.customer,
                    Aircraft: wo.aircraft ?? "",
                    Description: wo.description,
                    Created: new Date(wo.openedAt).toLocaleDateString(),
                    "Promise Date": wo.promisedDeliveryDate
                      ? new Date(wo.promisedDeliveryDate).toLocaleDateString()
                      : "",
                    "Tasks Done": `${wo.tasksComplete}/${wo.tasksTotal}`,
                    "Open Squawks": wo.openSquawks,
                  })),
                  "work-orders.csv",
                );
                toast.success("Work orders exported");
              }
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button asChild size="sm" className="flex-1 sm:flex-initial">
            <Link to="/work-orders/new">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Work Order
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-8 bg-muted/40 p-0.5 overflow-x-auto max-w-full">
            {(
              [
                ["active", "Active", counts.active],
                ["on_hold", "On Hold", counts.on_hold],
                ["pending", "Pending", counts.pending],
                ["awaiting_parts", "Awaiting Parts", counts.awaiting_parts],
                ["complete", "Complete", counts.complete],
                ["all", "All", counts.all],
              ] as const
            ).map(([tab, label, count]) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-7 px-3 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                {label}
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 h-4 min-w-[16px] px-1 text-[9px] ${
                      activeTab === tab
                        ? "bg-primary/15 text-primary"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}
                  >
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search WO#, aircraft, customer, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-full sm:w-64 bg-muted/30 border-border/60"
            />
          </div>
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 gap-1.5 text-xs border-border/60 ${activeFilterCount > 0 ? "border-primary/50 text-primary" : ""}`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground ml-0.5">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Priority</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["", "routine", "urgent", "aog"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFilterPriority(p)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        filterPriority === p
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {p === "" ? "Any" : p === "aog" ? "AOG" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <Separator className="opacity-50" />
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Type</p>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setFilterType("")}
                    className={`text-left text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      filterType === ""
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    Any type
                  </button>
                  {WO_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setFilterType(t.value)}
                      className={`text-left text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        filterType === t.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {activeFilterCount > 0 && (
                <>
                  <Separator className="opacity-50" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => { setFilterPriority(""); setFilterType(""); setFilterOpen(false); }}
                  >
                    Clear All Filters
                  </Button>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {filtered.length === 0 ? (
        workOrders.length === 0 ? (
          <ActionableEmptyState
            title="No work orders yet"
            missingInfo="Create your first work order to start tracking aircraft maintenance, inspections, and repair tasks."
            primaryActionLabel="New Work Order"
            primaryActionType="link"
            primaryActionTarget="/work-orders/new"
          />
        ) : (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center">
              <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No work orders match this filter</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try a different tab or clear your search to see all {workOrders.length} work order{workOrders.length !== 1 ? "s" : ""}.
              </p>
              {search.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSearch("")}
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-2">
          {filtered.map((wo) => (
            <Link key={wo.id} to={wo.href}>
              <Card
                className={`border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer ${
                  wo.priority === "aog" ? "border-l-4 border-l-red-500" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          {wo.number}
                        </span>
                        {wo.priority === "aog" ? (
                          <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-semibold">
                            AOG
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium border ${
                              WO_STATUS_STYLES[wo.status as WoStatus] ?? "bg-muted text-muted-foreground"
                            }`}
                          >
                            {wo.statusLabel}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground border-border/40"
                        >
                          {wo.typeLabel}
                        </Badge>
                        {wo.openSquawks > 0 && (
                          <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[9px] gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {wo.openSquawks} squawk
                          </Badge>
                        )}
                        {wo.partsOnOrder > 0 && (
                          <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] gap-0.5">
                            <Package className="w-2.5 h-2.5" />
                            {wo.partsOnOrder} awaiting
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-foreground">
                          {wo.aircraft}
                        </span>
                        <span className="text-sm text-muted-foreground">{wo.aircraftType}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="text-sm text-foreground truncate">{wo.description}</span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">{wo.customer}</span>
                        <span className="text-muted-foreground/40 text-[11px]">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          Opened {formatDate(wo.openedAt)}
                        </span>
                        {wo.promisedDeliveryDate && (() => {
                          const risk = getScheduleRisk(wo.promisedDeliveryDate);
                          const dueDateColor =
                            risk === "overdue"
                              ? "text-red-400"
                              : risk === "at_risk"
                                ? "text-amber-400"
                                : "text-muted-foreground";
                          return (
                            <>
                              <span className="text-muted-foreground/40 text-[11px]">·</span>
                              <span className={`text-[11px] flex items-center gap-1 ${dueDateColor}`}>
                                <RiskIcon risk={risk} />
                                <Calendar className="w-3 h-3" />
                                Due {formatDate(wo.promisedDeliveryDate)}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {wo.tasksTotal > 0 && (
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 mb-1 justify-end">
                            {wo.tasksComplete === wo.tasksTotal ? (
                              <CheckCircle2 className="w-3 h-3 text-green-400" />
                            ) : (
                              <Circle className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {wo.tasksComplete}/{wo.tasksTotal}
                            </span>
                          </div>
                          <Progress
                            value={(wo.tasksComplete / wo.tasksTotal) * 100}
                            className="h-1 w-16"
                          />
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        title="Show QR Code"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setQrWoNumber(wo.number);
                        }}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {/* QR Code Dialog */}
      <Dialog open={!!qrWoNumber} onOpenChange={(v) => !v && setQrWoNumber(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Work Order QR Code</DialogTitle>
            <DialogDescription className="text-xs">
              Scan this code to quickly look up the work order.
            </DialogDescription>
          </DialogHeader>
          {qrWoNumber && (
            <div className="flex justify-center py-4">
              <QRCodeBadge
                value={`WO:${qrWoNumber}`}
                label={qrWoNumber}
                size={160}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
