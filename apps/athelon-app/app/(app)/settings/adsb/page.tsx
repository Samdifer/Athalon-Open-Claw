import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Plane, Radio } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DataSource = "FlightAware" | "ADS-B Exchange" | "OpenSky";

type Config = {
  enabled: boolean;
  correctionFactor: number;
  dataSource: DataSource;
};

const SOURCES: DataSource[] = ["FlightAware", "ADS-B Exchange", "OpenSky"];

export default function AdsbSettingsPage() {
  const { orgId } = useCurrentOrg();
  const fleet = useQuery(api.aircraft.list, orgId ? { organizationId: orgId } : "skip");

  const defaults = useMemo(() => {
    const map: Record<string, Config> = {};
    for (const aircraft of fleet ?? []) {
      const correctionFactor = aircraft.aircraftCategory === "jet" ? 0.98 : 0.92;
      map[aircraft._id] = {
        enabled: false,
        correctionFactor,
        dataSource: "FlightAware",
      };
    }
    return map;
  }, [fleet]);

  const [configByAircraft, setConfigByAircraft] = useState<Record<string, Config>>({});

  const getConfig = (aircraftId: string): Config => configByAircraft[aircraftId] ?? defaults[aircraftId] ?? {
    enabled: false,
    correctionFactor: 0.92,
    dataSource: "FlightAware",
  };

  const updateConfig = (aircraftId: string, patch: Partial<Config>) => {
    const current = getConfig(aircraftId);
    setConfigByAircraft((prev) => ({
      ...prev,
      [aircraftId]: {
        ...current,
        ...patch,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">ADS-B Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configure per-aircraft ADS-B sync and tach estimation behavior.
        </p>
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            API integration coming soon — currently accepts manual flight session entry.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(fleet ?? []).map((aircraft) => {
          const cfg = getConfig(aircraft._id);
          return (
            <Card key={aircraft._id} className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Plane className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono">{aircraft.currentRegistration}</span>
                  <span className="text-muted-foreground font-normal">{aircraft.make} {aircraft.model}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs">Enable Sync</Label>
                    <div className="h-9 flex items-center">
                      <Switch
                        checked={cfg.enabled}
                        onCheckedChange={(enabled) => updateConfig(aircraft._id, { enabled })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Correction Factor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="1.2"
                      value={cfg.correctionFactor}
                      onChange={(e) => updateConfig(aircraft._id, { correctionFactor: Number(e.target.value || 0) })}
                      className="font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Default {aircraft.aircraftCategory === "jet" ? "0.98 (turbine)" : "0.92 (piston)"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Data Source</Label>
                    <Select
                      value={cfg.dataSource}
                      onValueChange={(value) => updateConfig(aircraft._id, { dataSource: value as DataSource })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCES.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-xs text-muted-foreground rounded-md border border-border/60 p-2 bg-muted/30">
                    ICAO tracking is tied to aircraft tail mapping. Sync status and errors are shown in the Fleet ADS-B view.
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {fleet !== undefined && fleet.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No aircraft found. Add aircraft in Fleet to configure ADS-B settings.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
