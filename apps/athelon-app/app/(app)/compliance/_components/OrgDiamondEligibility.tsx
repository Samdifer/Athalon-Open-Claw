"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export type OrgDiamondEmployee = {
  id: string;
  name: string;
  eligibleHours: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function OrgDiamondEligibility({
  employees,
  certificateThresholdHours = 16,
}: {
  employees: OrgDiamondEmployee[];
  certificateThresholdHours?: number;
}) {
  const eligibleTotal = employees.length;
  const certified = employees.filter((e) => e.eligibleHours >= certificateThresholdHours);
  const notYet = employees.filter((e) => e.eligibleHours < certificateThresholdHours);
  const progressPct = eligibleTotal === 0 ? 0 : (certified.length / eligibleTotal) * 100;
  const remainingHours = notYet.reduce(
    (sum, e) => sum + Math.max(0, certificateThresholdHours - e.eligibleHours),
    0,
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Organization Diamond Eligibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Progress: {certified.length} of {eligibleTotal} certified
          </span>
          {notYet.length === 0 && eligibleTotal > 0 ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Eligible
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-500/40">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Not Yet
            </Badge>
          )}
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }} />
        </div>

        {notYet.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {notYet.length} employee{notYet.length === 1 ? "" : "s"} need {remainingHours.toFixed(1)} more combined eligible hours.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">All eligible employees meet individual AMT certificate-hour threshold.</p>
        )}

        <div className="space-y-1.5 max-h-44 overflow-auto pr-1">
          {employees.map((employee) => {
            const done = employee.eligibleHours >= certificateThresholdHours;
            return (
              <div key={employee.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">{initials(employee.name)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{employee.name}</span>
                </div>
                <span className={done ? "text-emerald-600" : "text-muted-foreground"}>
                  {employee.eligibleHours.toFixed(1)}h
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
