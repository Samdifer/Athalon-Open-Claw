"use client";

import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  PlaneTakeoff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FleetAircraft {
  _id: Id<"aircraft">;
  status: string;
  openWorkOrderCount: number;
}

interface FleetComplianceStatsProps {
  fleet: FleetAircraft[];
  orgId: Id<"organizations">;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function FleetComplianceStats({ fleet }: FleetComplianceStatsProps) {
  const airworthy = fleet.filter((a) => a.status === "airworthy").length;
  const inMaint = fleet.filter((a) => a.status === "in_maintenance").length;
  const totalOpen = fleet.reduce((sum, a) => sum + a.openWorkOrderCount, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Fleet Size
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {fleet.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                aircraft
              </p>
            </div>
            <div className="p-2 rounded-lg bg-muted/40">
              <PlaneTakeoff className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Airworthy
              </p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {airworthy}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                in-service
              </p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                In Maintenance
              </p>
              <p className="text-2xl font-bold text-sky-400 mt-1">{inMaint}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                aircraft
              </p>
            </div>
            <div className="p-2 rounded-lg bg-sky-500/10">
              <AlertTriangle className="w-4 h-4 text-sky-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Open Work Orders
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {totalOpen}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                fleet-wide
              </p>
            </div>
            <div className="p-2 rounded-lg bg-muted/40">
              <FileSearch className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
