import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { ShieldAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRemainingLifeMetrics } from "../_components/RemainingLifeBar";

type PartDoc = {
  _id: string;
  partNumber: string;
  partName?: string;
  partCategory?: string;
  isLifeLimited?: boolean;
  lifeLimitHours?: number;
  lifeLimitCycles?: number;
  hoursAccumulatedBeforeInstall?: number;
  cyclesAccumulatedBeforeInstall?: number;
  currentAircraftId?: string;
  installedOnAircraftId?: string;
};

type AircraftDoc = {
  _id: string;
  currentRegistration?: string;
  serialNumber?: string;
};

function cellColor(percentRemaining: number) {
  if (percentRemaining <= 0) return "bg-black text-white";
  if (percentRemaining <= 10) return "bg-red-500 text-white";
  if (percentRemaining <= 20) return "bg-amber-500 text-black";
  return "bg-emerald-500 text-white";
}

function worstRemainingPercent(part: PartDoc) {
  const hourPercent = part.lifeLimitHours != null
    ? getRemainingLifeMetrics(part.hoursAccumulatedBeforeInstall ?? 0, part.lifeLimitHours).percentRemaining
    : Number.POSITIVE_INFINITY;
  const cyclePercent = part.lifeLimitCycles != null
    ? getRemainingLifeMetrics(part.cyclesAccumulatedBeforeInstall ?? 0, part.lifeLimitCycles).percentRemaining
    : Number.POSITIVE_INFINITY;
  return Math.min(hourPercent, cyclePercent);
}

export default function LLPDashboardPage() {
  const { orgId } = useCurrentOrg();
  const aircraft = useQuery(api.aircraft.list, orgId ? { organizationId: orgId } : "skip") as AircraftDoc[] | undefined;
  const parts = useQuery(api.parts.listParts, orgId ? { organizationId: orgId } : "skip") as PartDoc[] | undefined;

  const model = useMemo(() => {
    const llpParts = (parts ?? []).filter((p) => p.isLifeLimited);
    const aircraftRows = aircraft ?? [];

    const categorySet = new Set<string>();
    const byAircraftCategory = new Map<string, Map<string, PartDoc[]>>();

    let criticalAlerts = 0;
    let upcomingReplacements = 0;
    // BUG-DOM-112: totalTracked previously used llpParts.length which counted ALL
    // life-limited parts including uninstalled warehouse stock. The stoplight grid
    // only renders parts with an aircraft assignment (currentAircraftId /
    // installedOnAircraftId), so the KPI "Total LLPs Tracked" would show a higher
    // number than the grid contained. A DOM comparing the card to the grid rows
    // would see a mismatch and lose trust in the data. Fix: count only installed parts.
    let trackedInstalled = 0;

    for (const part of llpParts) {
      const aircraftId = part.currentAircraftId ?? part.installedOnAircraftId;
      if (!aircraftId) continue;
      trackedInstalled++;
      const category = part.partCategory ?? "Uncategorized";
      categorySet.add(category);

      const percentRemaining = worstRemainingPercent(part);
      if (Number.isFinite(percentRemaining)) {
        if (percentRemaining <= 10) criticalAlerts += 1;
        else if (percentRemaining <= 20) upcomingReplacements += 1;
      }

      if (!byAircraftCategory.has(aircraftId)) byAircraftCategory.set(aircraftId, new Map());
      const catMap = byAircraftCategory.get(aircraftId)!;
      if (!catMap.has(category)) catMap.set(category, []);
      catMap.get(category)!.push(part);
    }

    return {
      categories: [...categorySet].sort((a, b) => a.localeCompare(b)),
      byAircraftCategory,
      totalTracked: trackedInstalled,
      criticalAlerts,
      upcomingReplacements,
      aircraftRows,
    };
  }, [aircraft, parts]);

  const isLoading = aircraft === undefined || parts === undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Life-Limited Parts Dashboard</h1>
        <p className="text-sm text-muted-foreground">Fleet stoplight view by aircraft and LLP category.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-border/60"><CardContent className="py-4"><p className="text-xs text-muted-foreground">Total LLPs Tracked</p><p className="text-2xl font-semibold">{model.totalTracked}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="py-4"><p className="text-xs text-muted-foreground">Critical Alerts (≤10%)</p><p className="text-2xl font-semibold text-red-500">{model.criticalAlerts}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="py-4"><p className="text-xs text-muted-foreground">Upcoming Replacements (10–20%)</p><p className="text-2xl font-semibold text-amber-500">{model.upcomingReplacements}</p></CardContent></Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Fleet LLP Stoplight Grid</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading fleet LLP data…</div>
          ) : model.totalTracked === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No life-limited parts tracked yet. Add parts with life limits to see the stoplight grid.
            </div>
          ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-2 pr-3 font-medium">Aircraft</th>
                {model.categories.map((category) => (
                  <th key={category} className="text-left py-2 px-2 font-medium">{category}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.aircraftRows.map((ac) => {
                const reg = ac.currentRegistration ?? ac.serialNumber ?? "Unknown";
                const tail = encodeURIComponent(reg);
                return (
                  <tr key={ac._id} className="border-b border-border/20 last:border-0">
                    <td className="py-2 pr-3 font-mono">{reg}</td>
                    {model.categories.map((category) => {
                      const rows = model.byAircraftCategory.get(ac._id)?.get(category) ?? [];
                      if (rows.length === 0) {
                        return <td key={`${ac._id}-${category}`} className="py-2 px-2"><div className="h-7 rounded bg-muted/40" /></td>;
                      }

                      const worst = Math.min(...rows.map((p) => worstRemainingPercent(p)));
                      const displayPercent = Number.isFinite(worst) ? `${worst.toFixed(1)}%` : "N/A";
                      return (
                        <td key={`${ac._id}-${category}`} className="py-2 px-2">
                          <Link to={`/fleet/${tail}/llp`}>
                            <div className={`h-7 rounded px-2 flex items-center justify-between ${Number.isFinite(worst) ? cellColor(worst) : "bg-muted text-muted-foreground"}`}>
                              <span className="text-[11px]">{rows.length} parts</span>
                              <Badge variant="secondary" className="text-[10px]">{displayPercent}</Badge>
                            </div>
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5" /> Green &gt;20%, Yellow 10–20%, Red &lt;10%, Black overdue.
      </div>
    </div>
  );
}
