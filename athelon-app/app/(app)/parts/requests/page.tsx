"use client";

import { Link } from "react-router-dom";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "convex/react";
import { useOrganization } from "@clerk/clerk-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLocationStyle(location: string): {
  label: string;
  color: string;
} {
  const map: Record<string, { label: string; color: string }> = {
    pending_inspection: {
      label: "Pending Inspection",
      color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
    },
    inventory: {
      label: "In Stock",
      color: "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10",
    },
    installed: {
      label: "Installed",
      color: "text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/10",
    },
    removed_pending_disposition: {
      label: "Removed — Pending",
      color: "text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/10",
    },
    quarantine: {
      label: "Quarantine",
      color: "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10",
    },
    scrapped: {
      label: "Scrapped",
      color: "text-slate-500 dark:text-slate-400 border-slate-500/30 bg-slate-500/10",
    },
    returned_to_vendor: {
      label: "Returned to Vendor",
      color: "text-muted-foreground border-border/30 bg-muted",
    },
  };
  return (
    map[location] ?? {
      label: location,
      color: "text-muted-foreground border-border/30 bg-muted",
    }
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PartsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-4 h-4 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartsRequestsPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id as Id<"organizations"> | undefined;

  // Show parts in pending_inspection (received, awaiting inspection) and
  // removed_pending_disposition (removed from aircraft, awaiting decision)
  const pendingParts = useQuery(
    api.parts.listParts,
    orgId ? { organizationId: orgId, location: "pending_inspection" } : "skip",
  );

  const removedParts = useQuery(
    api.parts.listParts,
    orgId
      ? { organizationId: orgId, location: "removed_pending_disposition" }
      : "skip",
  );

  const isLoading = pendingParts === undefined || removedParts === undefined;

  const allParts = [...(pendingParts ?? []), ...(removedParts ?? [])];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
            Parts Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? (
              <Skeleton className="h-3 w-32 inline-block" />
            ) : (
              `${allParts.length} part${allParts.length !== 1 ? "s" : ""} pending`
            )}
          </p>
        </div>
        <Button size="sm" asChild className="w-full sm:w-auto">
          <Link to="/parts/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Receive Part
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div role="status" aria-label="Loading parts queue"><PartsSkeleton /></div>
      ) : allParts.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No pending parts</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Parts pending inspection or disposition will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" aria-live="polite" aria-label={`Parts queue, ${allParts.length} part${allParts.length !== 1 ? "s" : ""}`}>
          {allParts.map((part) => {
            const locationStyle = getLocationStyle(part.location);
            const isRemoved = part.location === "removed_pending_disposition";

            return (
              <Card
                key={part._id}
                className={`border-border/60 ${isRemoved ? "border-l-4 border-l-orange-500" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          P/N: {part.partNumber}
                        </span>
                        {part.condition === "unserviceable" ||
                        part.location === "quarantine" ? (
                          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px] font-semibold">
                            UNSERVICEABLE
                          </Badge>
                        ) : null}
                        <Badge
                          variant="outline"
                          className={`text-[10px] border ${locationStyle.color}`}
                        >
                          {locationStyle.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {part.partName}
                        {part.description ? ` — ${part.description}` : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {part.serialNumber && (
                          <>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              S/N: {part.serialNumber}
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                          </>
                        )}
                        <span className="text-[11px] text-muted-foreground capitalize">
                          Cond: {part.condition}
                        </span>
                        {part.supplier && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">
                              {part.supplier}
                            </span>
                          </>
                        )}
                        {part.receivingDate && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">
                              Received{" "}
                              {new Date(
                                part.receivingDate,
                              ).toLocaleDateString()}
                            </span>
                          </>
                        )}
                        {part.isOwnerSupplied && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground border-border/40"
                            >
                              OSP
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
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
