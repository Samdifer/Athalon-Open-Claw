import { Link } from "react-router-dom";
import { AlertTriangle, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const demoSquawks = [
  {
    id: "sq-1",
    number: "SQ-2026-041-001",
    aircraft: "N192AK",
    wo: "WO-2026-0041",
    description:
      "Right main gear shimmy dampener shows intermittent hesitation on taxi. Suspect worn piston seal. Requires evaluation before RTS.",
    severity: "airworthiness",
    severityLabel: "Airworthiness",
    status: "open",
    statusLabel: "Open",
    foundBy: "Ray Kowalski",
    foundDate: "Feb 22, 2026",
    requiresCustomerAuth: true,
    daysOpen: 1,
    href: "/squawks/sq-1",
  },
];

export default function SquawksPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Squawks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {demoSquawks.filter((s) => s.status === "open").length} open ·{" "}
            {demoSquawks.length} total
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Log Squawk
        </Button>
      </div>

      <div className="space-y-2">
        {demoSquawks.map((sq) => (
          <Link key={sq.id} to={sq.href}>
            <Card className="border-l-4 border-l-red-500 border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground font-medium">
                        {sq.number}
                      </span>
                      <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px]">
                        Open
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-400 border-amber-500/30"
                      >
                        {sq.severityLabel}
                      </Badge>
                      {sq.requiresCustomerAuth && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground border-border/40"
                        >
                          Auth Required
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono font-semibold text-sm text-foreground">
                        {sq.aircraft}
                      </span>
                      <span className="text-muted-foreground/50 text-xs">·</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {sq.wo}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {sq.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Found by {sq.foundBy} · {sq.foundDate} · {sq.daysOpen}d open
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {demoSquawks.length === 0 && (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center">
              <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No open squawks</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
