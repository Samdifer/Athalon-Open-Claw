"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type PrintRating = {
  id: string;
  ratingClass: 1 | 2 | 3 | 4;
  rating: string;
  limitation?: string;
};

type PrintSection = {
  key: string;
  title: string;
  rows: PrintRating[];
};

type CapabilitiesListPrintProps = {
  certificateNumber: string;
  stationName: string;
  stationAddress: string;
  sections: PrintSection[];
};

export function CapabilitiesListPrint({
  certificateNumber,
  stationName,
  stationAddress,
  sections,
}: CapabilitiesListPrintProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end print:hidden">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5 mr-1" />
          Print OpSpecs Attachment
        </Button>
      </div>

      <div className="rounded-md border p-4 bg-card print:border-0 print:p-0 print:bg-white">
        <div className="text-center border-b pb-3 mb-3">
          <p className="text-sm font-semibold">REPAIR STATION CAPABILITIES LIST</p>
          <p className="text-xs text-muted-foreground mt-1">FAA OpSpecs Attachment Format</p>
          <div className="mt-2 space-y-0.5 text-xs">
            <p><span className="font-medium">Certificate:</span> {certificateNumber}</p>
            <p><span className="font-medium">Station:</span> {stationName}</p>
            <p><span className="font-medium">Address:</span> {stationAddress}</p>
            <p><span className="font-medium">Generated:</span> {new Date().toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" })} (UTC)</p>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.key} className="mb-4 last:mb-0">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1">{section.title}</p>
            <table className="w-full border text-xs">
              <thead>
                <tr className="bg-muted/40 print:bg-transparent">
                  <th className="border px-2 py-1 text-left">Class</th>
                  <th className="border px-2 py-1 text-left">Rating</th>
                  <th className="border px-2 py-1 text-left">Limitation</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border px-2 py-1.5 text-muted-foreground">No ratings listed</td>
                  </tr>
                ) : (
                  section.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="border px-2 py-1">{row.ratingClass}</td>
                      <td className="border px-2 py-1">{row.rating}</td>
                      <td className="border px-2 py-1">{row.limitation?.trim() || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
