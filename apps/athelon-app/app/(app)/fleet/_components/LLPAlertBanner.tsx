import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { AlertTriangle, Shield } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent } from "@/components/ui/card";
import { getRemainingLifeMetrics } from "./RemainingLifeBar";

type LLPPart = {
  isLifeLimited?: boolean;
  lifeLimitHours?: number;
  lifeLimitCycles?: number;
  hoursAccumulatedBeforeInstall?: number;
  cyclesAccumulatedBeforeInstall?: number;
};

export function LLPAlertBanner() {
  const { orgId } = useCurrentOrg();
  const parts = useQuery(api.parts.listParts, orgId ? { organizationId: orgId } : "skip") as LLPPart[] | undefined;

  const counts = useMemo(() => {
    const rows = (parts ?? []).filter((p) => p.isLifeLimited);
    let warning = 0;
    let critical = 0;
    let overdue = 0;

    for (const part of rows) {
      const hourMetrics = part.lifeLimitHours != null
        ? getRemainingLifeMetrics(part.hoursAccumulatedBeforeInstall ?? 0, part.lifeLimitHours)
        : null;
      const cycleMetrics = part.lifeLimitCycles != null
        ? getRemainingLifeMetrics(part.cyclesAccumulatedBeforeInstall ?? 0, part.lifeLimitCycles)
        : null;

      const percentRemaining = Math.min(
        hourMetrics?.percentRemaining ?? Number.POSITIVE_INFINITY,
        cycleMetrics?.percentRemaining ?? Number.POSITIVE_INFINITY,
      );

      if (!Number.isFinite(percentRemaining)) continue;
      if (percentRemaining <= 0) overdue += 1;
      else if (percentRemaining <= 10) critical += 1;
      else if (percentRemaining <= 20) warning += 1;
    }

    return { warning, critical, overdue };
  }, [parts]);

  const totalActionable = counts.warning + counts.critical + counts.overdue;
  if (totalActionable === 0) return null;

  return (
    <Link to="/fleet/llp" className="block">
      <Card className="border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-colors">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-amber-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Life-Limited Parts Alerts</p>
              <p className="text-xs text-muted-foreground">
                {counts.overdue} overdue • {counts.critical} critical • {counts.warning} warning
              </p>
            </div>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
