"use client";

import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

// ─── Schedule Health Widget ────────────────────────────────────────────────────
//
// Displays shop-wide schedule risk summary on the dashboard.
// Uses the real Convex getScheduleStats query.

export function ScheduleHealthWidget() {
  const { orgId, isLoaded } = useCurrentOrg();

  const stats = useQuery(
    api.workOrders.getScheduleStats,
    orgId ? { organizationId: orgId } : "skip",
  );

  const isLoading = !isLoaded || stats === undefined;

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Schedule Health
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = (stats.onTrack + stats.atRisk + stats.overdue + stats.noDate) || 1;
  const atRiskItems = stats.atRiskList ?? [];

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Schedule Health
            {(stats.overdue > 0 || stats.atRisk > 0) && (
              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px]">
                {stats.overdue + stats.atRisk} need attention
              </Badge>
            )}
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/work-orders" className="flex items-center gap-1">
              View All
              <ChevronRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-center">
            <p className={`text-xl font-bold ${stats.overdue > 0 ? "text-red-400" : "text-muted-foreground/50"}`}>
              {stats.overdue}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Overdue</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-center">
            <p className={`text-xl font-bold ${stats.atRisk > 0 ? "text-amber-400" : "text-muted-foreground/50"}`}>
              {stats.atRisk}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">At Risk</p>
          </div>
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2.5 text-center">
            <p className={`text-xl font-bold ${stats.onTrack > 0 ? "text-green-400" : "text-muted-foreground/50"}`}>
              {stats.onTrack}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">On Track</p>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border/40 p-2.5 text-center">
            <p className={`text-xl font-bold ${stats.noDate > 0 ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
              {stats.noDate}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">No Date</p>
          </div>
        </div>

        {/* At-risk WO list */}
        {atRiskItems.length > 0 ? (
          <div className="space-y-1.5">
            {atRiskItems.slice(0, 4).map((item) => (
              <Link key={item._id} to={`/work-orders/${item._id}`}>
                <div className={`flex items-center gap-2.5 p-2 rounded-md border text-xs cursor-pointer hover:bg-muted/30 transition-colors ${
                  item.riskLevel === "overdue"
                    ? "border-red-500/25 bg-red-500/5"
                    : "border-amber-500/25 bg-amber-500/5"
                }`}>
                  {item.riskLevel === "overdue" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  )}
                  <span className="font-mono font-semibold text-foreground">
                    {item.workOrderNumber}
                  </span>
                  {item.riskLevel === "overdue" ? (
                    <Badge className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30 ml-auto">
                      Overdue
                    </Badge>
                  ) : (
                    <Badge className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 ml-auto">
                      At Risk
                    </Badge>
                  )}
                  {item.promisedDeliveryDate && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.promisedDeliveryDate)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
            {atRiskItems.length > 4 && (
              <p className="text-[11px] text-muted-foreground text-center pt-1">
                +{atRiskItems.length - 4} more
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            {total === 1 && stats.noDate === 1
              ? "No work orders open yet"
              : "All work orders with delivery dates are on track"}
          </div>
        )}

        {/* Prompt to set dates if many WOs lack them */}
        {stats.noDate > 2 && (
          <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            {stats.noDate} work order{stats.noDate !== 1 ? "s" : ""} missing a promised delivery date.{" "}
            <Link to="/work-orders" className="text-primary hover:underline">
              Set dates
            </Link>{" "}
            to enable schedule tracking.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
