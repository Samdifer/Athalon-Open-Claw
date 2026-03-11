"use client";

import { useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { QuoteWorkspaceWorkOrder } from "./types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, SlidersHorizontal, X } from "lucide-react";

type QuoteStatusFilter =
  | "all"
  | "DRAFT"
  | "SENT"
  | "APPROVED"
  | "CONVERTED"
  | "DECLINED";
type LinkageFilter = "all" | "linked" | "unlinked";
type PriorityFilter = "all" | "aog" | "urgent" | "routine";

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

export interface WORailPanelProps {
  workOrders: QuoteWorkspaceWorkOrder[];
  selectedWorkOrderId?: string;
  onSelectWorkOrder: (workOrderId: string) => void;
}

export function WORailPanel({
  workOrders,
  selectedWorkOrderId,
  onSelectWorkOrder,
}: WORailPanelProps) {
  const [search, setSearch] = useState("");
  const [linkageFilter, setLinkageFilter] = useState<LinkageFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [quoteStatusFilter, setQuoteStatusFilter] =
    useState<QuoteStatusFilter>("all");

  const filteredWorkOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workOrders.filter((wo) => {
      if (linkageFilter === "linked" && !wo.sourceQuoteId) return false;
      if (linkageFilter === "unlinked" && wo.sourceQuoteId) return false;
      if (priorityFilter !== "all" && wo.priority !== priorityFilter)
        return false;
      if (quoteStatusFilter !== "all" && wo.quoteStatus !== quoteStatusFilter)
        return false;

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

  const hasActiveFilters =
    linkageFilter !== "all" ||
    priorityFilter !== "all" ||
    quoteStatusFilter !== "all";

  const activeFilterChips: Array<{
    label: string;
    onClear: () => void;
  }> = [];

  if (linkageFilter !== "all") {
    activeFilterChips.push({
      label: linkageFilter === "linked" ? "Linked" : "Unlinked",
      onClear: () => setLinkageFilter("all"),
    });
  }
  if (priorityFilter !== "all") {
    activeFilterChips.push({
      label: priorityFilter.toUpperCase(),
      onClear: () => setPriorityFilter("all"),
    });
  }
  if (quoteStatusFilter !== "all") {
    activeFilterChips.push({
      label: quoteStatusFilter,
      onClear: () => setQuoteStatusFilter("all"),
    });
  }

  const clearAllFilters = () => {
    setLinkageFilter("all");
    setPriorityFilter("all");
    setQuoteStatusFilter("all");
  };

  return (
    <div className="min-h-0 flex h-full flex-col rounded-2xl border border-border/50 bg-gradient-to-b from-slate-100/70 to-background dark:from-slate-900/40">
      <div className="border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Work Orders</p>
          <Badge variant="outline" className="text-[10px]">
            {filteredWorkOrders.length} visible
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search WO, tail, quote..."
              className="h-8 border-border/60 bg-background pl-8 text-xs"
              aria-label="Search quote workspace work orders"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={hasActiveFilters ? "secondary" : "outline"}
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3 space-y-3">
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  Link Status
                </p>
                <div className="flex flex-wrap gap-1">
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
                        ? "All"
                        : value === "linked"
                          ? "Linked"
                          : "Unlinked"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  Priority
                </p>
                <div className="flex flex-wrap gap-1">
                  {(["all", "aog", "urgent", "routine"] as const).map(
                    (value) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={
                          priorityFilter === value ? "secondary" : "outline"
                        }
                        className="h-7 text-[11px]"
                        onClick={() => setPriorityFilter(value)}
                      >
                        {value === "all" ? "Any" : value.toUpperCase()}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  Quote Status
                </p>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      "all",
                      "DRAFT",
                      "SENT",
                      "APPROVED",
                      "CONVERTED",
                      "DECLINED",
                    ] as const
                  ).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={
                        quoteStatusFilter === value ? "secondary" : "outline"
                      }
                      className="h-7 text-[11px]"
                      onClick={() => setQuoteStatusFilter(value)}
                    >
                      {value === "all" ? "Any" : value}
                    </Button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs text-muted-foreground"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Active filter chips */}
        {activeFilterChips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {activeFilterChips.map((chip) => (
              <Badge
                key={chip.label}
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[10px] cursor-pointer hover:bg-muted"
                onClick={chip.onClear}
              >
                {chip.label}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredWorkOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
            No work orders match current filters.
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredWorkOrders.map((wo) => {
              const selected = String(wo._id) === selectedWorkOrderId;
              return (
                <li key={String(wo._id)}>
                  <button
                    type="button"
                    onClick={() => onSelectWorkOrder(String(wo._id))}
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
                      {wo.aircraft?.currentRegistration ?? "No aircraft"} •{" "}
                      {wo.description}
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
}
