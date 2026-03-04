"use client";

import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Award, ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  orgId: Id<"organizations">;
};

function parseLimitation(series?: string): string {
  const match = series?.match(/\[LIM:(.*)\]$/);
  return match?.[1]?.trim().toLowerCase() ?? "";
}

export function CapabilitiesOverview({ orgId }: Props) {
  const workspace = useQuery(api.stationConfig.getStationConfigWorkspace, { organizationId: orgId });

  const summary = useMemo(() => {
    const rows = workspace?.supportedAircraft ?? [];
    const aircraftTypeCount = new Set(rows.map((r: any) => `${r.make}:${r.model}:${r.series ?? ""}`)).size;

    let expired = 0;
    let pending = 0;

    rows.forEach((row: any) => {
      const lim = parseLimitation(row.series);
      if (lim.includes("expired")) expired += 1;
      if (lim.includes("pending") || lim.includes("provisional")) pending += 1;
    });

    return {
      totalRatings: rows.length,
      aircraftTypeCount,
      expired,
      pending,
    };
  }, [workspace?.supportedAircraft]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-muted-foreground" />
          Capabilities Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border p-2">
            <p className="text-muted-foreground">Total ratings</p>
            <p className="text-base font-semibold">{summary.totalRatings}</p>
          </div>
          <div className="rounded border p-2">
            <p className="text-muted-foreground">Aircraft types</p>
            <p className="text-base font-semibold">{summary.aircraftTypeCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={summary.expired > 0 ? "destructive" : "outline"} className="text-[11px]">
            Expired: {summary.expired}
          </Badge>
          <Badge variant={summary.pending > 0 ? "secondary" : "outline"} className="text-[11px]">
            Pending: {summary.pending}
          </Badge>
        </div>

        <Button asChild variant="outline" size="sm" className="h-8 text-xs w-full justify-between">
          <Link to="/settings/capabilities">
            Open Capabilities List
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
