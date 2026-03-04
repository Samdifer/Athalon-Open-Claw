"use client";

import { useMemo, useState } from "react";
import { Download, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrainingRecord = {
  _id: string;
  technicianId: string;
  courseName: string;
  courseType: string;
  provider?: string;
  completedAt: number;
  expiresAt?: number;
};

type Technician = {
  _id: string;
  legalName: string;
};

type Filter = "all" | "green" | "amber" | "red";

function getBand(expiresAt?: number): Filter {
  if (!expiresAt) return "green";
  const days = Math.ceil((expiresAt - Date.now()) / 86400000);
  if (days < 30) return "red";
  if (days <= 90) return "amber";
  return "green";
}

function bandBadge(band: Filter, expiresAt?: number) {
  if (!expiresAt) return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">No Expiry</Badge>;
  const days = Math.ceil((expiresAt - Date.now()) / 86400000);
  if (band === "red") {
    return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">{days < 0 ? "Expired" : `${days}d left`}</Badge>;
  }
  if (band === "amber") {
    return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">{days}d left</Badge>;
  }
  return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">{days}d left</Badge>;
}

export function ComplianceRecords({
  records,
  technicians,
}: {
  records: TrainingRecord[];
  technicians: Technician[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const techMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of technicians) map.set(t._id, t.legalName);
    return map;
  }, [technicians]);

  const prepared = useMemo(() => {
    return records
      .map((r) => ({ ...r, band: getBand(r.expiresAt) }))
      .sort((a, b) => (a.expiresAt ?? Number.MAX_SAFE_INTEGER) - (b.expiresAt ?? Number.MAX_SAFE_INTEGER));
  }, [records]);

  const filtered = useMemo(
    () => (filter === "all" ? prepared : prepared.filter((r) => r.band === filter)),
    [prepared, filter],
  );

  const counts = useMemo(() => ({
    green: prepared.filter((r) => r.band === "green").length,
    amber: prepared.filter((r) => r.band === "amber").length,
    red: prepared.filter((r) => r.band === "red").length,
  }), [prepared]);

  function exportCsv() {
    const header = ["Technician", "Course", "Type", "Completed", "Expires", "Band"];
    const rows = filtered.map((r) => [
      techMap.get(r.technicianId) ?? "Unknown",
      r.courseName,
      r.courseType,
      new Date(r.completedAt).toISOString().slice(0, 10),
      r.expiresAt ? new Date(r.expiresAt).toISOString().slice(0, 10) : "",
      r.band,
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Training Compliance Records
          </CardTitle>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilter("all")}>All ({prepared.length})</Button>
          <Button size="sm" variant={filter === "green" ? "default" : "outline"} className="h-7 text-xs border-green-500/40" onClick={() => setFilter("green")}>Green ({counts.green})</Button>
          <Button size="sm" variant={filter === "amber" ? "default" : "outline"} className="h-7 text-xs border-amber-500/40" onClick={() => setFilter("amber")}>Amber ({counts.amber})</Button>
          <Button size="sm" variant={filter === "red" ? "default" : "outline"} className="h-7 text-xs border-red-500/40" onClick={() => setFilter("red")}>Red ({counts.red})</Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6">No records for the selected filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3">Technician</th>
                  <th className="pb-2 pr-3">Course</th>
                  <th className="pb-2 pr-3">Completed</th>
                  <th className="pb-2 pr-3">Expires</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{techMap.get(r.technicianId) ?? "Unknown"}</td>
                    <td className="py-2 pr-3 font-medium">{r.courseName}</td>
                    <td className="py-2 pr-3">{new Date(r.completedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</td>
                    <td className="py-2 pr-3">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("en-US", { timeZone: "UTC" }) : "—"}</td>
                    <td className="py-2">{bandBadge(r.band, r.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
