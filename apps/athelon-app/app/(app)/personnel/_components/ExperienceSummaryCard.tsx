"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  totalAircraftTypes: number;
  totalHours: number;
  certificationsHeld: number;
  ojtCompletionPercent: number;
  title?: string;
};

export function ExperienceSummaryCard({
  totalAircraftTypes,
  totalHours,
  certificationsHeld,
  ojtCompletionPercent,
  title = "Career Snapshot",
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Aircraft Types</p>
            <p className="text-2xl font-semibold">{totalAircraftTypes}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Total Hours Logged</p>
            <p className="text-2xl font-semibold">{totalHours.toFixed(1)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Certifications Held</p>
            <p className="text-2xl font-semibold">{certificationsHeld}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">OJT Completion</p>
            <p className="text-2xl font-semibold">{ojtCompletionPercent}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
