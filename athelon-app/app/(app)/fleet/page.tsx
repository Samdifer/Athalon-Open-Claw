"use client";

import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusStyle(status: string): {
  color: string;
  dot: string;
  label: string;
} {
  const map: Record<string, { color: string; dot: string; label: string }> = {
    airworthy: {
      color: "bg-green-500/15 text-green-400 border-green-500/30",
      dot: "bg-green-400",
      label: "Airworthy",
    },
    airworthy_with_limitations: {
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      dot: "bg-amber-400",
      label: "Airworthy w/ Limitations",
    },
    grounded_airworthiness: {
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      dot: "bg-red-500",
      label: "Grounded",
    },
    in_maintenance: {
      color: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      dot: "bg-sky-400",
      label: "In Maintenance",
    },
    aog: {
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      dot: "bg-red-500",
      label: "AOG",
    },
  };
  return (
    map[status] ?? {
      color: "bg-muted text-muted-foreground border-border/30",
      dot: "bg-muted-foreground",
      label: status,
    }
  );
}

// ─── Skeleton placeholder ─────────────────────────────────────────────────────

function FleetSkeleton() {
  return (
    <div className="grid gap-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-2 h-2 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FleetPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id as Id<"organizations"> | undefined;

  const fleet = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isLoading = fleet === undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Fleet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? (
              <Skeleton className="h-3 w-24 inline-block" />
            ) : (
              `${fleet.length} aircraft registered`
            )}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/fleet/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Aircraft
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <FleetSkeleton />
      ) : fleet.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No aircraft in fleet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {fleet.map((ac) => {
            const style = getStatusStyle(ac.status);
            return (
              <Link key={ac._id} href={`/fleet/${ac.currentRegistration}`}>
                <Card className="border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-0.5">
                          <span className="font-mono font-bold text-xl text-foreground">
                            {ac.currentRegistration}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] border ${style.color}`}
                          >
                            {style.label}
                          </Badge>
                          {ac.openWorkOrderCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-muted"
                            >
                              {ac.openWorkOrderCount} open WO
                              {ac.openWorkOrderCount > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-foreground font-medium">
                            {ac.yearOfManufacture} {ac.make} {ac.model}
                            {ac.series ? ` ${ac.series}` : ""}
                          </span>
                          <span className="text-muted-foreground/50">·</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            S/N {ac.serialNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {ac.totalTimeAirframeHours.toFixed(1)} TTAF
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
