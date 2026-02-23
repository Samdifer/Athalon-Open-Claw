"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFoundDuringLabel(foundDuring: string): string {
  const map: Record<string, string> = {
    annual_inspection: "Annual Inspection",
    "100hr_inspection": "100-hr Inspection",
    progressive_inspection: "Progressive Inspection",
    routine_maintenance: "Routine Maintenance",
    preflight: "Preflight",
    pilot_report: "Pilot Report",
    ad_compliance_check: "AD Compliance",
    other: "Other",
  };
  return map[foundDuring] ?? foundDuring;
}

function getDispositionLabel(disposition?: string | null): string {
  if (!disposition) return "";
  const map: Record<string, string> = {
    corrected: "Corrected",
    deferred_mel: "Deferred (MEL)",
    deferred_grounded: "Deferred — Grounded",
    no_fault_found: "No Fault Found",
    no_fault_found_could_not_reproduce: "NFR",
  };
  return map[disposition] ?? disposition;
}

function getDaysOpen(createdAt: number): number {
  return Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SquawksSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-4 h-4 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-80" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SquawksPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id as Id<"organizations"> | undefined;

  // Show only open discrepancies
  const discrepancies = useQuery(
    api.discrepancies.listDiscrepancies,
    orgId ? { organizationId: orgId, status: "open" } : "skip",
  );

  const isLoading = discrepancies === undefined;
  const openCount = discrepancies?.length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Squawks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? (
              <Skeleton className="h-3 w-32 inline-block" />
            ) : (
              `${openCount} open squawk${openCount !== 1 ? "s" : ""}`
            )}
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Log Squawk
        </Button>
      </div>

      {isLoading ? (
        <SquawksSkeleton />
      ) : discrepancies.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No open squawks</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Open discrepancies will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {discrepancies.map((sq) => {
            const daysOpen = getDaysOpen(sq.createdAt);
            return (
              <Card
                key={sq._id}
                className="border-l-4 border-l-red-500 border-border/60"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          {sq.discrepancyNumber}
                        </span>
                        <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px]">
                          Open
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-400 border-amber-500/30"
                        >
                          {getFoundDuringLabel(sq.foundDuring)}
                        </Badge>
                        {sq.disposition && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-sky-400 border-sky-500/30"
                          >
                            {getDispositionLabel(sq.disposition)}
                          </Badge>
                        )}
                        {sq.melCategory && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-orange-400 border-orange-500/30"
                          >
                            MEL Cat {sq.melCategory}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          WO ref:
                        </span>
                        <span className="font-mono font-semibold text-sm text-foreground">
                          {sq.workOrderId}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {sq.description}
                      </p>

                      {sq.componentAffected && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Component:{" "}
                          <span className="font-mono">
                            {sq.componentAffected}
                          </span>
                          {sq.componentPartNumber && (
                            <> · P/N {sq.componentPartNumber}</>
                          )}
                        </p>
                      )}

                      <p className="text-[11px] text-muted-foreground mt-1">
                        Found at {sq.foundAtAircraftHours.toFixed(1)} hrs ·{" "}
                        {daysOpen}d open
                        {sq.melExpiryDate && (
                          <span className="text-amber-400 font-medium">
                            {" "}
                            · MEL expires{" "}
                            {new Date(sq.melExpiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
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
