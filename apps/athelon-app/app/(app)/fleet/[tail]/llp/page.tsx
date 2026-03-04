import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RemainingLifeBar, getRemainingLifeMetrics } from "../../_components/RemainingLifeBar";

type AircraftDoc = {
  _id: string;
  currentRegistration?: string;
  serialNumber?: string;
  totalTimeAirframeHours?: number;
  totalLandingCycles?: number;
};

type PartDoc = {
  _id: string;
  partNumber: string;
  partName?: string;
  description?: string;
  lifeLimitHours?: number;
  lifeLimitCycles?: number;
  hoursAccumulatedBeforeInstall?: number;
  cyclesAccumulatedBeforeInstall?: number;
  hoursAtInstallation?: number;
  cyclesAtInstallation?: number;
  currentAircraftId?: string;
  installedOnAircraftId?: string;
  currentEngineId?: string;
  isLifeLimited?: boolean;
};

type EngineDoc = {
  _id: string;
  serialNumber?: string;
  position?: string;
  totalCycles?: number;
  cycleBetweenOverhaulLimit?: number;
};

function calcCurrentAccumulated(part: PartDoc, aircraft: AircraftDoc) {
  const currentHours = (part.hoursAccumulatedBeforeInstall ?? 0)
    + Math.max(0, (aircraft.totalTimeAirframeHours ?? 0) - (part.hoursAtInstallation ?? aircraft.totalTimeAirframeHours ?? 0));
  const currentCycles = (part.cyclesAccumulatedBeforeInstall ?? 0)
    + Math.max(0, (aircraft.totalLandingCycles ?? 0) - (part.cyclesAtInstallation ?? aircraft.totalLandingCycles ?? 0));
  return { currentHours, currentCycles };
}

export default function AircraftLLPDetailPage() {
  const { tail = "" } = useParams<{ tail: string }>();
  const tailNumber = decodeURIComponent(tail);
  const { orgId } = useCurrentOrg();

  const aircraft = useQuery(
    api.aircraft.getByTailNumber,
    orgId ? { organizationId: orgId, tailNumber } : "skip",
  ) as AircraftDoc | null | undefined;

  const parts = useQuery(api.parts.listParts, orgId ? { organizationId: orgId } : "skip") as PartDoc[] | undefined;

  const engines = useQuery(
    api.aircraft.listEnginesForAircraft,
    orgId && aircraft?._id ? { organizationId: orgId, aircraftId: aircraft._id } : "skip",
  ) as EngineDoc[] | undefined;

  const llpRows = useMemo(() => {
    if (!aircraft || !parts) return [];
    return parts
      .filter((p) => p.isLifeLimited && (p.currentAircraftId === aircraft._id || p.installedOnAircraftId === aircraft._id))
      .map((p) => {
        const accum = calcCurrentAccumulated(p, aircraft);
        const hourMetrics = p.lifeLimitHours != null ? getRemainingLifeMetrics(accum.currentHours, p.lifeLimitHours) : null;
        const cycleMetrics = p.lifeLimitCycles != null ? getRemainingLifeMetrics(accum.currentCycles, p.lifeLimitCycles) : null;

        const driving = (hourMetrics && cycleMetrics)
          ? (hourMetrics.percentRemaining <= cycleMetrics.percentRemaining ? "hours" : "cycles")
          : hourMetrics
            ? "hours"
            : "cycles";

        const current = driving === "hours" ? accum.currentHours : accum.currentCycles;
        const limit = driving === "hours" ? (p.lifeLimitHours ?? 0) : (p.lifeLimitCycles ?? 0);
        const metrics = getRemainingLifeMetrics(current, limit);

        return {
          ...p,
          driving,
          current,
          limit,
          remaining: metrics.remaining,
          percentRemaining: metrics.percentRemaining,
          status: metrics.status,
        };
      })
      .sort((a, b) => a.percentRemaining - b.percentRemaining);
  }, [aircraft, parts]);

  const isLoading = aircraft === undefined || parts === undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{tailNumber} — Life-Limited Parts</h1>
            <p className="text-sm text-muted-foreground">Loading LLP data…</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/fleet/llp"><ArrowLeft className="w-4 h-4 mr-1" />Fleet LLP Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{tailNumber} — Life-Limited Parts</h1>
            <p className="text-sm text-muted-foreground">Aircraft not found.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/fleet/llp"><ArrowLeft className="w-4 h-4 mr-1" />Fleet LLP Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const stackLeader = llpRows[0];

  const byEngine = useMemo(() => {
    const groups = new Map<string, typeof llpRows>();
    for (const row of llpRows) {
      const key = row.currentEngineId ?? "unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return groups;
  }, [llpRows]);

  const engineName = (engineId: string) => {
    if (engineId === "unassigned") return "Unassigned / Airframe";
    const eng = (engines ?? []).find((e) => e._id === engineId);
    return eng ? `${eng.position ?? "Engine"} • ${eng.serialNumber ?? eng._id}` : `Engine ${engineId}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{tailNumber} — Life-Limited Parts</h1>
          <p className="text-sm text-muted-foreground">Installed LLP detail, stack leader, and engine grouping.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/fleet/llp"><ArrowLeft className="w-4 h-4 mr-1" />Fleet LLP Dashboard</Link>
        </Button>
      </div>

      {stackLeader && (
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Stack Leader (Next Removal Driver)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-sm">{stackLeader.partNumber} — {stackLeader.partName ?? stackLeader.description ?? "LLP"}</p>
            <RemainingLifeBar currentValue={stackLeader.current} limitValue={stackLeader.limit} />
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-sm">All Installed LLPs ({llpRows.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-2 pr-3">Part Number</th>
                <th className="text-left py-2 pr-3">Description</th>
                <th className="text-right py-2 pr-3">Life Limit</th>
                <th className="text-right py-2 pr-3">Accumulated</th>
                <th className="text-right py-2 pr-3">Remaining</th>
                <th className="text-right py-2 pr-3">% Remaining</th>
                <th className="text-left py-2">Health</th>
              </tr>
            </thead>
            <tbody>
              {llpRows.map((row) => (
                <tr key={row._id} className="border-b border-border/20 last:border-0">
                  <td className="py-2 pr-3 font-mono">{row.partNumber}</td>
                  <td className="py-2 pr-3">{row.partName ?? row.description ?? "—"}</td>
                  <td className="py-2 pr-3 text-right">{row.limit.toFixed(1)} {row.driving === "hours" ? "hrs" : "cyc"}</td>
                  <td className="py-2 pr-3 text-right">{row.current.toFixed(1)} {row.driving === "hours" ? "hrs" : "cyc"}</td>
                  <td className="py-2 pr-3 text-right">{row.remaining.toFixed(1)}</td>
                  <td className="py-2 pr-3 text-right">{row.percentRemaining.toFixed(1)}%</td>
                  <td className="py-2 min-w-52"><RemainingLifeBar currentValue={row.current} limitValue={row.limit} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Engine Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from(byEngine.entries()).map(([engineId, rows]) => (
            <div key={engineId} className="rounded border border-border/50 p-3">
              <p className="text-sm font-medium">{engineName(engineId)}</p>
              <p className="text-xs text-muted-foreground">{rows.length} LLPs tracked</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
