"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ClipboardList,
  AlertTriangle,
  Package,
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Demo data ─────────────────────────────────────────────────────────────────

const demoWorkOrders = [
  {
    id: "wo-1",
    number: "WO-2026-0041",
    aircraft: "N192AK",
    aircraftType: "Cessna 172S",
    customer: "High Country Charter LLC",
    description: "100-hour Inspection",
    type: "100_hour",
    typeLabel: "100-Hour",
    status: "in_progress",
    statusLabel: "In Progress",
    priority: "normal",
    tasksComplete: 2,
    tasksTotal: 4,
    openSquawks: 1,
    partsOnOrder: 1,
    daysOpen: 3,
    openedDate: "Feb 20, 2026",
    assignedTo: "Ray Kowalski, Sandra Mercado",
    href: "/work-orders/WO-2026-0041",
  },
  {
    id: "wo-2",
    number: "WO-2026-0040",
    aircraft: "N416AB",
    aircraftType: "Cessna 208B",
    customer: "High Country Charter LLC",
    description: "Oil Change & Engine Trend Monitoring",
    type: "routine",
    typeLabel: "Routine",
    status: "pending_signoff",
    statusLabel: "Pending Sign-Off",
    priority: "normal",
    tasksComplete: 3,
    tasksTotal: 3,
    openSquawks: 0,
    partsOnOrder: 0,
    daysOpen: 5,
    openedDate: "Feb 18, 2026",
    assignedTo: "Ray Kowalski",
    href: "/work-orders/WO-2026-0040",
  },
  {
    id: "wo-3",
    number: "WO-2026-0039",
    aircraft: "N76LS",
    aircraftType: "Bell 206B-III",
    customer: "Summit Helicopters Inc.",
    description: "AOG: Main Rotor Blade Crack",
    type: "aog",
    typeLabel: "AOG",
    status: "on_hold",
    statusLabel: "On Hold",
    priority: "aog",
    tasksComplete: 0,
    tasksTotal: 2,
    openSquawks: 0,
    partsOnOrder: 1,
    daysOpen: 7,
    openedDate: "Feb 16, 2026",
    assignedTo: "Ray Kowalski",
    href: "/work-orders/WO-2026-0039",
  },
  {
    id: "wo-4",
    number: "WO-2026-0042",
    aircraft: "N416AB",
    aircraftType: "Cessna 208B",
    customer: "High Country Charter LLC",
    description: "Fuel Selector Valve ALS Replacement",
    type: "routine",
    typeLabel: "Routine",
    status: "draft",
    statusLabel: "Draft",
    priority: "normal",
    tasksComplete: 0,
    tasksTotal: 0,
    openSquawks: 0,
    partsOnOrder: 0,
    daysOpen: 0,
    openedDate: "—",
    assignedTo: "Unassigned",
    href: "/work-orders/WO-2026-0042",
  },
  {
    id: "wo-5",
    number: "WO-2026-0037",
    aircraft: "N76LS",
    aircraftType: "Bell 206B-III",
    customer: "Summit Helicopters Inc.",
    description: "Annual Inspection — ALS Review",
    type: "annual",
    typeLabel: "Annual",
    status: "closed",
    statusLabel: "Closed",
    priority: "normal",
    tasksComplete: 8,
    tasksTotal: 8,
    openSquawks: 0,
    partsOnOrder: 0,
    daysOpen: 13,
    openedDate: "Feb 2, 2026",
    assignedTo: "Ray Kowalski, Mia Chen",
    href: "/work-orders/WO-2026-0037",
  },
];

type FilterTab =
  | "active"
  | "on_hold"
  | "pending"
  | "awaiting_parts"
  | "complete"
  | "all";

function filterWorkOrders(wos: typeof demoWorkOrders, tab: FilterTab) {
  switch (tab) {
    case "active":
      return wos.filter((w) =>
        ["open", "in_progress", "open_discrepancies"].includes(w.status)
      );
    case "on_hold":
      return wos.filter((w) => w.status === "on_hold");
    case "pending":
      return wos.filter((w) =>
        ["pending_inspection", "pending_signoff"].includes(w.status)
      );
    case "awaiting_parts":
      return wos.filter((w) => w.partsOnOrder > 0);
    case "complete":
      return wos.filter((w) => ["closed", "cancelled"].includes(w.status));
    default:
      return wos;
  }
}

function getStatusStyles(status: string) {
  const map: Record<string, string> = {
    in_progress: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    pending_signoff: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    pending_inspection: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    on_hold: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    draft: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    closed: "bg-green-500/15 text-green-400 border-green-500/30",
    cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

export default function WorkOrdersPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("active");
  const [search, setSearch] = useState("");

  const filtered = filterWorkOrders(demoWorkOrders, activeTab).filter(
    (wo) =>
      search === "" ||
      wo.number.toLowerCase().includes(search.toLowerCase()) ||
      wo.aircraft.toLowerCase().includes(search.toLowerCase()) ||
      wo.description.toLowerCase().includes(search.toLowerCase())
  );

  // Count per tab for badges
  const counts = {
    active: filterWorkOrders(demoWorkOrders, "active").length,
    on_hold: filterWorkOrders(demoWorkOrders, "on_hold").length,
    pending: filterWorkOrders(demoWorkOrders, "pending").length,
    awaiting_parts: filterWorkOrders(demoWorkOrders, "awaiting_parts").length,
    complete: filterWorkOrders(demoWorkOrders, "complete").length,
    all: demoWorkOrders.length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Work Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {demoWorkOrders.length} total ·{" "}
            {demoWorkOrders.filter((w) => w.status === "in_progress").length}{" "}
            in progress
          </p>
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

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search WO#, aircraft, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-64 bg-muted/30 border-border/60"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border/60">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </Button>
        </div>
      </div>

      {/* Work Orders List */}
      {filtered.length === 0 ? (
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
        <div className="space-y-2">
          {filtered.map((wo) => (
            <Link key={wo.id} href={wo.href}>
              <Card
                className={`border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer ${
                  wo.priority === "aog" ? "border-l-4 border-l-red-500" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Row 1: WO# + Status + Badges */}
                      <div className="flex items-center gap-2 mb-1">
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
                            className={`text-[10px] font-medium border ${getStatusStyles(wo.status)}`}
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
                            {wo.partsOnOrder} on order
                          </Badge>
                        )}
                      </div>

                      {/* Row 2: Aircraft + Description */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-foreground">
                          {wo.aircraft}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {wo.aircraftType}
                        </span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="text-sm text-foreground truncate">
                          {wo.description}
                        </span>
                      </div>

                      {/* Row 3: Meta */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          {wo.customer}
                        </span>
                        <span className="text-muted-foreground/40 text-[11px]">
                          ·
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {wo.assignedTo}
                        </span>
                        {wo.openedDate !== "—" && (
                          <>
                            <span className="text-muted-foreground/40 text-[11px]">
                              ·
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              Opened {wo.openedDate}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Progress + Arrow */}
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
