"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AircraftExperienceRow = {
  aircraftType: string;
  totalHours: number;
  lastWorkedAt?: number;
  proficiencyLevel: "not_started" | "developing" | "proficient" | "expert";
};

type SortKey = "aircraftType" | "totalHours" | "lastWorkedAt" | "proficiencyLevel";

const proficiencyRank: Record<AircraftExperienceRow["proficiencyLevel"], number> = {
  not_started: 0,
  developing: 1,
  proficient: 2,
  expert: 3,
};

export function AircraftExperienceTable({ rows }: { rows: AircraftExperienceRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("totalHours");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "aircraftType" ? "asc" : "desc");
  }

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "aircraftType") return a.aircraftType.localeCompare(b.aircraftType) * dir;
      if (sortKey === "totalHours") return (a.totalHours - b.totalHours) * dir;
      if (sortKey === "lastWorkedAt") return ((a.lastWorkedAt ?? 0) - (b.lastWorkedAt ?? 0)) * dir;
      return (proficiencyRank[a.proficiencyLevel] - proficiencyRank[b.proficiencyLevel]) * dir;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {[
              ["aircraftType", "Aircraft Type"],
              ["totalHours", "Total Hours"],
              ["lastWorkedAt", "Last Worked"],
              ["proficiencyLevel", "Proficiency"],
            ].map(([key, label]) => (
              <th key={key} className="py-2 pr-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1"
                  onClick={() => onSort(key as SortKey)}
                >
                  {label}
                  <ArrowUpDown className="w-3.5 h-3.5 ml-1" />
                </Button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.aircraftType} className="border-b last:border-0">
              <td className="py-2 pr-3 font-medium">{row.aircraftType}</td>
              <td className="py-2 pr-3">{row.totalHours.toFixed(1)}</td>
              <td className="py-2 pr-3">
                {row.lastWorkedAt
                  ? new Date(row.lastWorkedAt).toLocaleDateString("en-US", { timeZone: "UTC" })
                  : "—"}
              </td>
              <td className="py-2 pr-3 capitalize">{row.proficiencyLevel.replace("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
