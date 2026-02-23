"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ─────────────────────────────────────────────────────────────────────

type LocationFilter =
  | "all"
  | "inventory"
  | "pending_inspection"
  | "installed"
  | "quarantine"
  | "removed_pending_disposition";

const LOCATION_LABEL: Record<string, string> = {
  pending_inspection: "Pending Inspection",
  inventory: "In Stock",
  installed: "Installed",
  removed_pending_disposition: "Pending Disposition",
  quarantine: "Quarantine",
  scrapped: "Scrapped",
  returned_to_vendor: "Returned to Vendor",
};

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  serviceable: "Serviceable",
  overhauled: "OH",
  repaired: "Repaired",
  unserviceable: "Unserviceable",
  quarantine: "Quarantine",
  scrapped: "Scrapped",
};

function getConditionStyles(condition: string): string {
  const map: Record<string, string> = {
    new: "bg-green-500/15 text-green-400 border-green-500/30",
    serviceable: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    overhauled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    repaired: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    unserviceable: "bg-red-500/15 text-red-400 border-red-500/30",
    quarantine: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    scrapped: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return map[condition] ?? "bg-muted text-muted-foreground";
}

function getLocationIcon(location: string) {
  switch (location) {
    case "pending_inspection":
      return <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
    case "inventory":
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />;
    case "quarantine":
      return <ShieldAlert className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />;
    case "removed_pending_disposition":
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
    default:
      return <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />;
  }
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function PartSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartsPage() {
  const [activeTab, setActiveTab] = useState<LocationFilter>("all");
  const [search, setSearch] = useState("");
  const { orgId, isLoaded } = useCurrentOrg();

  // Load all parts — filtered by location on the server for non-"all" tabs
  const allParts = useQuery(
    api.parts.listParts,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isLoading = !isLoaded || allParts === undefined;
  const parts = allParts ?? [];

  // Filter client-side
  const filtered = useMemo(() => {
    let result = parts;

    // Location filter
    if (activeTab !== "all") {
      result = result.filter((p) => p.location === activeTab);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.partNumber.toLowerCase().includes(q) ||
          p.partName.toLowerCase().includes(q) ||
          (p.serialNumber ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [parts, activeTab, search]);

  // Count per tab
  const counts: Record<LocationFilter, number> = {
    all: parts.length,
    inventory: parts.filter((p) => p.location === "inventory").length,
    pending_inspection: parts.filter(
      (p) => p.location === "pending_inspection",
    ).length,
    installed: parts.filter((p) => p.location === "installed").length,
    quarantine: parts.filter((p) => p.location === "quarantine").length,
    removed_pending_disposition: parts.filter(
      (p) => p.location === "removed_pending_disposition",
    ).length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            Parts Inventory
          </h1>
          {isLoading ? (
            <Skeleton className="h-4 w-40 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {parts.length} parts ·{" "}
              {counts.pending_inspection > 0 && (
                <span className="text-amber-400">
                  {counts.pending_inspection} pending inspection ·{" "}
                </span>
              )}
              {counts.inventory} in stock
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 text-xs border-border/60"
          >
            <Link href="/parts/requests">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Receiving Queue
              {counts.pending_inspection > 0 && (
                <Badge className="ml-1.5 bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] h-4 px-1">
                  {counts.pending_inspection}
                </Badge>
              )}
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs">
            <Link href="/parts/new">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Part
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as LocationFilter)}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-8 bg-muted/40 p-0.5 flex-wrap">
            {(
              [
                ["all", "All"],
                ["inventory", "In Stock"],
                ["pending_inspection", "Pending"],
                ["installed", "Installed"],
                ["quarantine", "Quarantine"],
                ["removed_pending_disposition", "Disposition"],
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
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search P/N, name, S/N…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-56 bg-muted/30 border-border/60"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/60"
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </Button>
        </div>
      </div>

      {/* Parts list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <PartSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No parts found
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {activeTab === "all"
                ? "No parts in inventory. Add a part to get started."
                : "No parts match the current filter."}
            </p>
            {activeTab === "all" && (
              <Button asChild size="sm" className="mt-4">
                <Link href="/parts/new">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Part
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((part) => {
            const isLifeLimited = part.isLifeLimited;
            const isPending = part.location === "pending_inspection";
            const isQuarantine = part.location === "quarantine";

            return (
              <Card
                key={part._id}
                className={`border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer ${
                  isQuarantine ? "border-l-4 border-l-orange-500" : ""
                } ${isPending ? "border-l-4 border-l-amber-500" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="pt-0.5">{getLocationIcon(part.location)}</div>
                    <div className="flex-1 min-w-0">
                      {/* Row 1: P/N + condition + location */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {part.partNumber}
                        </span>
                        {part.serialNumber && (
                          <span className="font-mono text-xs text-muted-foreground">
                            S/N {part.serialNumber}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] border font-medium ${getConditionStyles(part.condition)}`}
                        >
                          {CONDITION_LABEL[part.condition] ?? part.condition}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-border/40 text-muted-foreground"
                        >
                          {LOCATION_LABEL[part.location] ?? part.location}
                        </Badge>
                        {isLifeLimited && (
                          <Badge className="text-[10px] bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            Life Limited
                          </Badge>
                        )}
                        {isQuarantine && (
                          <Badge className="text-[10px] bg-orange-500/15 text-orange-400 border border-orange-500/30">
                            ⚠ Quarantine
                          </Badge>
                        )}
                      </div>

                      {/* Row 2: Name */}
                      <p className="text-sm text-foreground font-medium truncate">
                        {part.partName}
                      </p>

                      {/* Row 3: Additional info */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {part.supplier && (
                          <span className="text-[11px] text-muted-foreground">
                            Supplier: {part.supplier}
                          </span>
                        )}
                        {part.isOwnerSupplied && (
                          <span className="text-[11px] text-sky-400">
                            Owner-Supplied
                          </span>
                        )}
                        {part.receivingDate && (
                          <span className="text-[11px] text-muted-foreground">
                            Received{" "}
                            {new Date(part.receivingDate).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" },
                            )}
                          </span>
                        )}
                        {part.isLifeLimited && part.lifeLimitHours && (
                          <span className="text-[11px] text-purple-400">
                            Life limit: {part.lifeLimitHours} hrs
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
