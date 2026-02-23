import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const demoRequests = [
  {
    id: "pr-1",
    partNumber: "MIL-PRF-5606-QT",
    name: "Hydraulic Fluid MIL-PRF-5606 — 1qt",
    qty: "1 qt",
    wo: "WO-2026-0041",
    aircraft: "N192AK",
    requestedBy: "Ray Kowalski",
    requestedDate: "Feb 22, 2026",
    status: "pending",
    statusLabel: "Pending",
    urgency: "normal",
  },
  {
    id: "pr-2",
    partNumber: "206-015-191-013",
    name: "Main Rotor Blade Assembly — Bell 206B",
    qty: "1 ea",
    wo: "WO-2026-0039",
    aircraft: "N76LS",
    requestedBy: "Ray Kowalski",
    requestedDate: "Feb 16, 2026",
    status: "ordered",
    statusLabel: "Ordered — ETA 5 days",
    urgency: "aog",
  },
  {
    id: "pr-3",
    partNumber: "9924721-1",
    name: "Fuel Selector Valve — Cessna 208B",
    qty: "1 ea",
    wo: "WO-2026-0042",
    aircraft: "N416AB",
    requestedBy: "Sandra Mercado",
    requestedDate: "Feb 23, 2026",
    status: "pending",
    statusLabel: "Pending",
    urgency: "normal",
  },
];

export default function PartsRequestsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Parts Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {demoRequests.length} outstanding requests
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Request Part
        </Button>
      </div>

      <div className="space-y-2">
        {demoRequests.map((req) => (
          <Card
            key={req.id}
            className={`border-border/60 ${req.urgency === "aog" ? "border-l-4 border-l-red-500" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      P/N: {req.partNumber}
                    </span>
                    {req.urgency === "aog" && (
                      <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-semibold">
                        AOG
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] border ${
                        req.status === "ordered"
                          ? "text-sky-400 border-sky-500/30 bg-sky-500/10"
                          : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                      }`}
                    >
                      {req.statusLabel}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{req.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Qty: {req.qty}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {req.wo}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {req.aircraft}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[11px] text-muted-foreground">
                      {req.requestedBy}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {req.status === "pending" && (
                    <>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        Mark Ordered
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        Pull from Storeroom
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
