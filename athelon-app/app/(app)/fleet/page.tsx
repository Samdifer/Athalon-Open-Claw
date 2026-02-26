import { Link } from "react-router-dom";
import { Plus, Search, PlaneTakeoff, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const demoFleet = [
  {
    tail: "N192AK",
    make: "Cessna",
    model: "172S",
    serialNumber: "172S11234",
    year: 2008,
    totalTime: 3847.2,
    status: "in_maintenance",
    statusLabel: "In Maintenance",
    statusColor: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    statusDot: "bg-sky-400",
    customer: "High Country Charter LLC",
    openWos: 1,
    lastMaint: "Feb 20, 2026",
    href: "/fleet/N192AK",
  },
  {
    tail: "N76LS",
    make: "Bell",
    model: "206B-III",
    serialNumber: "4089",
    year: 1991,
    totalTime: 9124.4,
    status: "in_maintenance",
    statusLabel: "AOG / On Hold",
    statusColor: "bg-red-500/15 text-red-400 border-red-500/30",
    statusDot: "bg-red-500",
    customer: "Summit Helicopters Inc.",
    openWos: 1,
    lastMaint: "Feb 16, 2026",
    href: "/fleet/N76LS",
  },
  {
    tail: "N416AB",
    make: "Cessna",
    model: "208B Grand Caravan",
    serialNumber: "208B0947",
    year: 2001,
    totalTime: 18402.1,
    status: "in_maintenance",
    statusLabel: "In Maintenance",
    statusColor: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    statusDot: "bg-sky-400",
    customer: "High Country Charter LLC",
    openWos: 2,
    lastMaint: "Feb 18, 2026",
    href: "/fleet/N416AB",
  },
];

export default function FleetPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Fleet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {demoFleet.length} aircraft registered
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Aircraft
        </Button>
      </div>

      <div className="grid gap-3">
        {demoFleet.map((ac) => (
          <Link key={ac.tail} to={ac.href}>
            <Card className="border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${ac.statusDot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-0.5">
                      <span className="font-mono font-bold text-xl text-foreground">
                        {ac.tail}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${ac.statusColor}`}
                      >
                        {ac.statusLabel}
                      </Badge>
                      {ac.openWos > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-muted"
                        >
                          {ac.openWos} open WO{ac.openWos > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-foreground font-medium">
                        {ac.year} {ac.make} {ac.model}
                      </span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        S/N {ac.serialNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {ac.customer}
                      </span>
                      <span className="text-muted-foreground/40 text-[11px]">·</span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {ac.totalTime.toFixed(1)} TTAF
                      </span>
                      <span className="text-muted-foreground/40 text-[11px]">·</span>
                      <span className="text-[11px] text-muted-foreground">
                        Last maint: {ac.lastMaint}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
