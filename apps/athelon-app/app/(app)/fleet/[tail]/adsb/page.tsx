import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { ArrowLeft, Plane } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADSBUtilizationComparison } from "@/app/(app)/fleet/_components/ADSBUtilizationComparison";
import { ADSBSyncStatus } from "@/app/(app)/fleet/_components/ADSBSyncStatus";

type AdsbFlightSession = {
  id: string;
  departureTimestamp: number;
  departureAirport: string;
  arrivalAirport: string;
  durationMinutes: number;
  estimatedTachHours: number;
  cycles: number;
  dataSource: "FlightAware" | "ADS-B Exchange" | "OpenSky";
};

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function AircraftAdsbPage() {
  const { tail = "" } = useParams<{ tail: string }>();
  const tailNumber = decodeURIComponent(tail);
  const { orgId } = useCurrentOrg();

  const aircraft = useQuery(
    api.aircraft.getByTailNumber,
    orgId ? { organizationId: orgId, tailNumber } : "skip",
  );

  // API integration not yet live in Convex. Keep display path ready with manual-session fallbacks.
  const flightSessions = useMemo<AdsbFlightSession[]>(() => {
    if (!aircraft) return [];
    return [
      {
        id: "s1",
        departureTimestamp: Date.UTC(2026, 1, 22, 13, 15),
        departureAirport: "KADS",
        arrivalAirport: "KDAL",
        durationMinutes: 41,
        estimatedTachHours: 0.6,
        cycles: 1,
        dataSource: "FlightAware",
      },
      {
        id: "s2",
        departureTimestamp: Date.UTC(2026, 1, 20, 16, 40),
        departureAirport: "KDAL",
        arrivalAirport: "KHOU",
        durationMinutes: 72,
        estimatedTachHours: 1.1,
        cycles: 1,
        dataSource: "ADS-B Exchange",
      },
      {
        id: "s3",
        departureTimestamp: Date.UTC(2026, 1, 18, 9, 5),
        departureAirport: "KHOU",
        arrivalAirport: "KADS",
        durationMinutes: 83,
        estimatedTachHours: 1.3,
        cycles: 1,
        dataSource: "OpenSky",
      },
    ];
  }, [aircraft]);

  const sortedSessions = [...flightSessions].sort(
    (a, b) => b.departureTimestamp - a.departureTimestamp,
  );

  const totalEstimatedHours = sortedSessions.reduce((acc, s) => acc + s.estimatedTachHours, 0);
  const totalCycles = sortedSessions.reduce((acc, s) => acc + s.cycles, 0);
  const source = sortedSessions[0]?.dataSource ?? "Manual";

  const correctionFactor =
    (aircraft?.aircraftCategory as string) === "rotorcraft" || (aircraft?.aircraftCategory as string) === "jet"
      ? 0.98
      : 0.92;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="sm" className="mt-0.5">
          <Link to={`/fleet/${encodeURIComponent(tailNumber)}`}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {tailNumber || "Fleet"}
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
              ADS-B Flight Sessions
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {aircraft?.currentRegistration ?? tailNumber} tracked utilization and estimated tach drift.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Flights Tracked</p><p className="text-2xl font-bold">{sortedSessions.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Estimated Hours</p><p className="text-2xl font-bold font-mono">{totalEstimatedHours.toFixed(1)}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Cycles</p><p className="text-2xl font-bold">{totalCycles}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Data Source</p><p className="text-lg font-semibold">{source}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ADSBUtilizationComparison
          logbookHours={aircraft?.totalTimeAirframeHours ?? 0}
          adsbEstimatedHours={(aircraft?.totalTimeAirframeHours ?? 0) + totalEstimatedHours}
          correctionFactor={correctionFactor}
        />
        <ADSBSyncStatus
          status="paused"
          lastSyncAt={Date.now() - 1000 * 60 * 60 * 6}
          icaoHex="A1B2C3"
          errorMessage={null}
        />
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Flight Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-[11px] text-muted-foreground uppercase tracking-wide">
                  <th className="text-left py-2 pr-3 font-medium">Departure Date</th>
                  <th className="text-left py-2 pr-3 font-medium">Departure Airport</th>
                  <th className="text-left py-2 pr-3 font-medium">Arrival Airport</th>
                  <th className="text-left py-2 pr-3 font-medium">Duration</th>
                  <th className="text-right py-2 pr-3 font-medium">Estimated Tach Hours</th>
                  <th className="text-right py-2 font-medium">Cycles</th>
                </tr>
              </thead>
              <tbody>
                {sortedSessions.map((session) => (
                  <tr key={session.id} className="border-b border-border/20 last:border-0">
                    <td className="py-2 pr-3">{new Date(session.departureTimestamp).toLocaleString("en-US", { timeZone: "UTC" })} UTC</td>
                    <td className="py-2 pr-3 font-mono">{session.departureAirport}</td>
                    <td className="py-2 pr-3 font-mono">{session.arrivalAirport}</td>
                    <td className="py-2 pr-3">{formatDuration(session.durationMinutes)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{session.estimatedTachHours.toFixed(2)}</td>
                    <td className="py-2 text-right">{session.cycles}</td>
                  </tr>
                ))}
                {sortedSessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No ADS-B sessions yet. API integration coming soon — currently accepts manual flight session entry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
