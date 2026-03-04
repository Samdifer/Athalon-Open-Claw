"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";
import type { DiamondTier } from "./DiamondAwardProgress";

export type AMTAwardExportRow = {
  id: string;
  employeeName: string;
  certificateNumber?: string;
  trainingHours: number;
  tier: DiamondTier;
};

const tierLabel: Record<DiamondTier, string> = {
  none: "None",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

function toCsv(rows: AMTAwardExportRow[]) {
  const header = ["Employee Name", "Certificate Number", "Training Hours", "Tier Achieved"];
  const body = rows.map((r) => [
    `"${r.employeeName.replace(/"/g, '""')}"`,
    `"${(r.certificateNumber ?? "—").replace(/"/g, '""')}"`,
    r.trainingHours.toFixed(1),
    tierLabel[r.tier],
  ]);
  return [header, ...body].map((line) => line.join(",")).join("\n");
}

export function AMTAwardExport({ rows, year }: { rows: AMTAwardExportRow[]; year: number }) {
  const csv = useMemo(() => toCsv(rows), [rows]);

  function handleDownload() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faa-diamond-award-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">FAASafety.gov Submission Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Printable/downloadable supporting documentation with technician, certificate number, total qualifying hours, and tier achieved.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5 mr-1" /> Download CSV
          </Button>
        </div>

        <div className="border rounded-md overflow-auto max-h-56">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-2 py-1.5">Employee</th>
                <th className="text-left px-2 py-1.5">Certificate #</th>
                <th className="text-right px-2 py-1.5">Hours</th>
                <th className="text-left px-2 py-1.5">Tier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-2 py-1.5">{row.employeeName}</td>
                  <td className="px-2 py-1.5">{row.certificateNumber ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right">{row.trainingHours.toFixed(1)}</td>
                  <td className="px-2 py-1.5">{tierLabel[row.tier]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
