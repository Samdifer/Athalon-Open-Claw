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
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { formatDate } from "@/lib/format";
import {
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  WO_TYPE_LABEL,
  type WoStatus,
  type WoType,
} from "@/lib/mro-constants";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { downloadCSV } from "@/lib/export";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

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

  const [activeTab, setActiveTab] = useState<FilterTab>("active");
  const [search, setSearch] = useState("");

  const workOrders = useMemo<WorkOrderRow[]>(() => {
    const rows = raw ?? [];
    return rows.map((wo) => ({
      id: String(wo._id),
      href: `/work-orders/${wo._id}`,
      number: wo.workOrderNumber,
      status: wo.status,
      statusLabel: WO_STATUS_LABEL[wo.status as WoStatus] ?? wo.status,
      typeLabel: WO_TYPE_LABEL[wo.workOrderType as WoType] ?? wo.workOrderType,
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
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          wo.number.toLowerCase().includes(q) ||
          wo.aircraft.toLowerCase().includes(q) ||
          wo.description.toLowerCase().includes(q)
        );
      }),
    [activeTab, search, workOrders],
  );

  const counts = useMemo(
    () => ({
      active: filterWorkOrders(workOrders, "active").length,
      on_hold: filterWorkOrders(workOrders, "on_hold").length,
      pending: filterWorkOrders(workOrders, "pending").length,
      awaiting_parts: filterWorkOrders(workOrders, "awaiting_parts").length,
      complete: filterWorkOrders(workOrders, "complete").length,
      all: workOrders.length,
    }),
    [workOrders],
  );

  if (!isLoaded || raw === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Unable to resolve organization context.
        </CardContent>
      </Card>
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
            onClick={() => {
              if (filtered.length) {
                downloadCSV(
                  filtered.map((wo) => ({
                    "WO Number": wo.number,
                    Status: wo.status,
                    Type: wo.typeLabel,
                    Aircraft: wo.aircraft ?? "",
                    Priority: wo.priority,
                    Created: new Date(wo.openedAt).toLocaleDateString(),
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
              placeholder="Search WO#, aircraft, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-full sm:w-64 bg-muted/30 border-border/60"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border/60">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No work orders found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {activeTab === "active"
                ? "No active work orders. Create one to get started."
                : "No work orders match the current filter."}
            </p>
            {activeTab === "active" && (
              <Button asChild size="sm" className="mt-4">
                <Link to="/work-orders/new">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Work Order
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
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
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
