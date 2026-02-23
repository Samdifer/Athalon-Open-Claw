import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const demoAuditEvents = [
  {
    id: "ev-1",
    eventType: "status_changed",
    description: "Status changed: draft → open — WO-2026-0041",
    tableName: "workOrders",
    user: "Sandra Mercado",
    timestamp: "2026-02-20T18:33:00Z",
    displayTime: "Feb 20, 2026 18:33Z",
  },
  {
    id: "ev-2",
    eventType: "status_changed",
    description: "Status changed: open → in_progress — WO-2026-0041",
    tableName: "workOrders",
    user: "Ray Kowalski",
    timestamp: "2026-02-21T13:47:00Z",
    displayTime: "Feb 21, 2026 13:47Z",
  },
  {
    id: "ev-3",
    eventType: "technician_signed",
    description: "TC-001 signed — Engine compression check. Cert #AP-2002-081345",
    tableName: "taskCardSteps",
    user: "Ray Kowalski",
    timestamp: "2026-02-21T14:22:00Z",
    displayTime: "Feb 21, 2026 14:22Z",
  },
  {
    id: "ev-4",
    eventType: "technician_signed",
    description: "TC-002 signed — Oil change complete. Cert #AP-2002-081345",
    tableName: "taskCardSteps",
    user: "Ray Kowalski",
    timestamp: "2026-02-21T16:05:00Z",
    displayTime: "Feb 21, 2026 16:05Z",
  },
  {
    id: "ev-5",
    eventType: "record_created",
    description: "Discrepancy SQ-2026-041-001 created — shimmy dampener finding",
    tableName: "discrepancies",
    user: "Ray Kowalski",
    timestamp: "2026-02-22T09:14:00Z",
    displayTime: "Feb 22, 2026 09:14Z",
  },
];

function getEventBadge(eventType: string) {
  const map: Record<string, { label: string; className: string }> = {
    technician_signed: {
      label: "Signed",
      className: "bg-green-500/15 text-green-400 border-green-500/30",
    },
    status_changed: {
      label: "Status",
      className: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    },
    record_created: {
      label: "Created",
      className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    },
  };
  const e = map[eventType] ?? { label: eventType, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`text-[10px] border ${e.className}`}>
      {e.label}
    </Badge>
  );
}

export default function AuditTrailPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Immutable compliance log · All times in Zulu (UTC)
          </p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Events — Rocky Mountain Turbine Service
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {demoAuditEvents
              .slice()
              .reverse()
              .map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getEventBadge(ev.eventType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">{ev.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {ev.user}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground/70 flex-shrink-0">
                    {ev.displayTime}
                  </span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
