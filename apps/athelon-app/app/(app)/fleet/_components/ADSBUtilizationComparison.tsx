import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ADSBUtilizationComparisonProps {
  logbookHours: number;
  adsbEstimatedHours: number;
  correctionFactor: number;
}

export function ADSBUtilizationComparison({
  logbookHours,
  adsbEstimatedHours,
  correctionFactor,
}: ADSBUtilizationComparisonProps) {
  const drift = adsbEstimatedHours - logbookHours;
  const driftSign = drift >= 0 ? "+" : "";
  const maxHours = Math.max(logbookHours, adsbEstimatedHours, 1);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Utilization Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Logbook: <span className="font-semibold text-foreground">{logbookHours.toLocaleString()} hrs</span>
          {" | "}
          ADS-B estimate: <span className="font-semibold text-foreground">{adsbEstimatedHours.toLocaleString()} hrs</span>
          {" | "}
          Drift: <span className={`font-semibold ${drift >= 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>{driftSign}{drift.toFixed(1)} hrs</span>
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Logbook</span>
              <span className="font-mono text-foreground">{logbookHours.toFixed(1)} hrs</span>
            </div>
            <div className="h-2 rounded bg-muted">
              <div
                className="h-2 rounded bg-sky-500"
                style={{ width: `${Math.max((logbookHours / maxHours) * 100, 2)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">ADS-B Estimated</span>
              <span className="font-mono text-foreground">{adsbEstimatedHours.toFixed(1)} hrs</span>
            </div>
            <div className="h-2 rounded bg-muted">
              <div
                className="h-2 rounded bg-violet-500"
                style={{ width: `${Math.max((adsbEstimatedHours / maxHours) * 100, 2)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-muted/30 p-3">
          <p className="text-xs font-medium text-foreground">Tach correction factor: {correctionFactor.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ADS-B block time is adjusted by this factor to estimate tach time. Typical defaults: 0.92 for piston, 0.98 for turbine aircraft.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
