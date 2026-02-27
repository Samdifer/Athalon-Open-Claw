"use client";

import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Package,
  ShieldAlert,
  Wrench,
  TrendingUp,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FleetAircraft {
  _id: string;
  currentRegistration?: string;
  make: string;
  model: string;
  status: string;
  openWorkOrderCount: number;
}

interface QuickActionsProps {
  fleet: FleetAircraft[] | undefined;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getAircraftStatusDot(status: string): string {
  const map: Record<string, string> = {
    airworthy: "bg-green-400",
    airworthy_with_limitations: "bg-amber-400",
    grounded_airworthiness: "bg-red-500",
    in_maintenance: "bg-sky-400",
    aog: "bg-red-500",
  };
  return map[status] ?? "bg-muted-foreground";
}

function getAircraftStatusColor(status: string): string {
  const map: Record<string, string> = {
    airworthy: "text-green-600 dark:text-green-400",
    airworthy_with_limitations: "text-amber-600 dark:text-amber-400",
    grounded_airworthiness: "text-red-600 dark:text-red-400",
    in_maintenance: "text-sky-600 dark:text-sky-400",
    aog: "text-red-600 dark:text-red-400",
  };
  return map[status] ?? "text-muted-foreground";
}

function getAircraftStatusLabel(status: string): string {
  const map: Record<string, string> = {
    airworthy: "Airworthy",
    airworthy_with_limitations: "Airworthy w/ Limits",
    grounded_airworthiness: "Grounded",
    in_maintenance: "In Maintenance",
    aog: "AOG",
  };
  return map[status] ?? status;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function QuickActions({ fleet }: QuickActionsProps) {
  return (
    <div className="space-y-6">
      {/* Fleet Status */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Fleet Status
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/fleet" className="flex items-center gap-1">
                View All
                <ChevronRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          {fleet === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : fleet.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No aircraft
            </p>
          ) : (
            fleet.map((aircraft, i) => (
              <div key={aircraft._id}>
                {i > 0 && <Separator className="my-1 opacity-40" />}
                <Link
                  to={`/fleet/${aircraft.currentRegistration}`}
                >
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${getAircraftStatusDot(aircraft.status)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-sm text-foreground">
                          {aircraft.currentRegistration}
                        </span>
                        {aircraft.openWorkOrderCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1 bg-muted"
                          >
                            {aircraft.openWorkOrderCount} WO
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {aircraft.make} {aircraft.model}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-medium flex-shrink-0 ${getAircraftStatusColor(aircraft.status)}`}
                    >
                      {getAircraftStatusLabel(aircraft.status)}
                    </span>
                  </div>
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Button
            asChild
            variant="outline"
            className="w-full justify-start h-9 text-xs gap-2 border-border/60"
            size="sm"
          >
            <Link to="/work-orders/new">
              <Wrench className="w-3.5 h-3.5" />
              New Work Order
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full justify-start h-9 text-xs gap-2 border-border/60"
            size="sm"
          >
            <Link to="/squawks">
              <AlertTriangle className="w-3.5 h-3.5" />
              Log Squawk
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full justify-start h-9 text-xs gap-2 border-border/60"
            size="sm"
          >
            <Link to="/parts/requests">
              <Package className="w-3.5 h-3.5" />
              View Parts Queue
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full justify-start h-9 text-xs gap-2 border-border/60"
            size="sm"
          >
            <Link to="/compliance/audit-trail">
              <ShieldAlert className="w-3.5 h-3.5" />
              Audit Trail
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
