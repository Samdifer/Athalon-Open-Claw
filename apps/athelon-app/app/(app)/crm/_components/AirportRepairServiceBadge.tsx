"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plane } from "lucide-react";
import type { FaaAirportRecord } from "@/src/shared/data/faaAirportTypes";
import { getAirport } from "@/src/shared/data/faaAirportIndex";

interface AirportRepairServiceBadgeProps {
  /** ICAO or FAA Loc Id to look up */
  airportCode: string | null | undefined;
  /** Show compact inline badge or full detail card */
  variant?: "badge" | "detail";
}

function repairColor(level: string | null) {
  if (level === "MAJOR") return "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10";
  if (level === "MINOR") return "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-muted-foreground border-border/40 bg-muted/20";
}

export function AirportRepairServiceBadge({
  airportCode,
  variant = "badge",
}: AirportRepairServiceBadgeProps) {
  const [airport, setAirport] = useState<FaaAirportRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!airportCode) {
      setAirport(null);
      setLoaded(true);
      return;
    }
    getAirport(airportCode).then((record) => {
      setAirport(record ?? null);
      setLoaded(true);
    });
  }, [airportCode]);

  if (!loaded) return null;
  if (!airport) {
    if (!airportCode) return null;
    return (
      <Badge variant="outline" className="text-[9px] text-muted-foreground">
        Airport not found
      </Badge>
    );
  }

  if (variant === "badge") {
    return (
      <span className="inline-flex items-center gap-1">
        {airport.airframeRepair && airport.airframeRepair !== "NONE" && (
          <Badge variant="outline" className={`text-[9px] ${repairColor(airport.airframeRepair)}`}>
            <Wrench className="h-2.5 w-2.5 mr-0.5" />
            AF {airport.airframeRepair}
          </Badge>
        )}
        {airport.powerPlantRepair && airport.powerPlantRepair !== "NONE" && (
          <Badge variant="outline" className={`text-[9px] ${repairColor(airport.powerPlantRepair)}`}>
            PP {airport.powerPlantRepair}
          </Badge>
        )}
        {(!airport.airframeRepair || airport.airframeRepair === "NONE") &&
         (!airport.powerPlantRepair || airport.powerPlantRepair === "NONE") && (
          <Badge variant="outline" className="text-[9px] text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10">
            No on-airport repair
          </Badge>
        )}
      </span>
    );
  }

  // Detail variant — a small card with full airport info
  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Plane className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-xs font-semibold">
          {airport.icaoId ?? airport.faaLocId}
        </span>
        <span className="text-xs text-muted-foreground">
          {airport.facilityName}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Airframe: </span>
          <span className={airport.airframeRepair === "MAJOR" ? "text-green-600 dark:text-green-400 font-medium" : airport.airframeRepair === "MINOR" ? "text-amber-600 dark:text-amber-400 font-medium" : "text-red-500 font-medium"}>
            {airport.airframeRepair ?? "N/A"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Powerplant: </span>
          <span className={airport.powerPlantRepair === "MAJOR" ? "text-green-600 dark:text-green-400 font-medium" : airport.powerPlantRepair === "MINOR" ? "text-amber-600 dark:text-amber-400 font-medium" : "text-red-500 font-medium"}>
            {airport.powerPlantRepair ?? "N/A"}
          </span>
        </div>
        {airport.basedAircraftTotal != null && (
          <div>
            <span className="text-muted-foreground">Based aircraft: </span>
            <span className="font-medium">{airport.basedAircraftTotal.toLocaleString()}</span>
          </div>
        )}
        {airport.annualOpsTotal != null && (
          <div>
            <span className="text-muted-foreground">Annual ops: </span>
            <span className="font-medium">{airport.annualOpsTotal.toLocaleString()}</span>
          </div>
        )}
      </div>
      {airport.npiasHubClass && airport.npiasHubClass !== "N/A" && (
        <Badge variant="secondary" className="text-[9px]">
          {airport.npiasHubClass} Hub
        </Badge>
      )}
    </div>
  );
}
