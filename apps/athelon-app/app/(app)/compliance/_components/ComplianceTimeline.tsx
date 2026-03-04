"use client";

import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ComplianceDeadline = {
  id: string;
  category: "AD" | "Training" | "Tool Calibration";
  label: string;
  dueAt: number;
  href: string;
};

function deadlineState(dueAt: number) {
  const now = Date.now();
  const days = Math.ceil((dueAt - now) / 86_400_000);
  if (days < 0) return { kind: "overdue" as const, days };
  if (days <= 30) return { kind: "soon" as const, days };
  return { kind: "future" as const, days };
}

export function ComplianceTimeline({ items }: { items: ComplianceDeadline[] }) {
  const sorted = [...items].sort((a, b) => a.dueAt - b.dueAt);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-muted-foreground" />
          Compliance Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming AD, training, or calibration deadlines detected.</p>
        ) : (
          <div className="space-y-2">
            {sorted.slice(0, 12).map((item) => {
              const state = deadlineState(item.dueAt);
              const color =
                state.kind === "overdue"
                  ? "border-rose-500/30 bg-rose-500/5"
                  : state.kind === "soon"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-emerald-500/30 bg-emerald-500/5";

              return (
                <a key={item.id} href={item.href} className={`block rounded-md border p-3 hover:bg-muted/30 ${color}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.category} · Due {new Date(item.dueAt).toLocaleDateString("en-US", { timeZone: "UTC" })} (UTC)</p>
                    </div>
                    <Badge className={state.kind === "overdue" ? "bg-rose-500/10 text-rose-500" : state.kind === "soon" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}>
                      {state.kind === "overdue" ? (
                        <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {Math.abs(state.days)}d overdue</span>
                      ) : state.kind === "soon" ? (
                        <span>{state.days}d</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> future</span>
                      )}
                    </Badge>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
