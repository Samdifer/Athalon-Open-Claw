"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SkillRadarChart } from "./SkillRadarChart";

type TechComparisonViewProps = {
  curriculumId: Id<"ojtCurricula">;
};

type RadarPoint = {
  section: string;
  percentage: number;
  score: number;
  maxScore: number;
};

function RadarCollector({ jacketId, onData }: { jacketId: Id<"ojtJackets">; onData: (jacketId: Id<"ojtJackets">, data: RadarPoint[]) => void }) {
  const data = useQuery(api.ojt.getRadarData, { jacketId });

  useEffect(() => {
    if (data) {
      onData(
        jacketId,
        data.map((d) => ({ section: d.section, percentage: d.percentage, score: d.score, maxScore: d.maxScore })),
      );
    }
  }, [data, jacketId, onData]);

  return null;
}

export function TechComparisonView({ curriculumId }: TechComparisonViewProps) {
  const { orgId } = useCurrentOrg();
  const jackets = useQuery(api.ojt.listJacketsByCurriculum, { curriculumId });
  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip");
  const [selected, setSelected] = useState<Id<"technicians">[]>([]);
  const [radarByJacket, setRadarByJacket] = useState<Record<string, RadarPoint[]>>({});

  const techName = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of technicians ?? []) map.set(String(t._id), t.legalName);
    return map;
  }, [technicians]);

  const selectable = useMemo(() => {
    if (!jackets) return [];
    return jackets.map((j) => ({
      technicianId: j.technicianId,
      jacketId: j._id,
      status: j.status,
      technicianName: techName.get(String(j.technicianId)) ?? "Unknown technician",
    }));
  }, [jackets, techName]);

  const selectedRows = useMemo(
    () => selectable.filter((r) => selected.includes(r.technicianId)).slice(0, 4),
    [selected, selectable],
  );

  const onRadar = useCallback((jacketId: Id<"ojtJackets">, data: RadarPoint[]) => {
    setRadarByJacket((prev) => ({ ...prev, [String(jacketId)]: data }));
  }, []);

  const sectionRows = useMemo(() => {
    const sections = new Set<string>();
    for (const row of selectedRows) {
      const radar = radarByJacket[String(row.jacketId)] ?? [];
      radar.forEach((r) => sections.add(r.section));
    }

    return Array.from(sections).map((section) => {
      const values = selectedRows.map((row) => {
        const r = (radarByJacket[String(row.jacketId)] ?? []).find((x) => x.section === section);
        return {
          technicianId: row.technicianId,
          technicianName: row.technicianName,
          percentage: r?.percentage ?? 0,
          score: r?.score ?? 0,
          maxScore: r?.maxScore ?? 0,
        };
      });
      return { section, values };
    });
  }, [selectedRows, radarByJacket]);

  if (!jackets || !technicians) return <Skeleton className="h-[560px] w-full" />;

  return (
    <div className="space-y-4">
      {selectedRows.map((row) => (
        <RadarCollector key={row.jacketId} jacketId={row.jacketId} onData={onRadar} />
      ))}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Technician Comparison (select 2–4)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {selectable.map((row) => {
              const active = selected.includes(row.technicianId);
              return (
                <Button
                  key={row.technicianId}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => {
                    setSelected((prev) => {
                      if (prev.includes(row.technicianId)) {
                        return prev.filter((id) => id !== row.technicianId);
                      }
                      if (prev.length >= 4) return prev;
                      return [...prev, row.technicianId];
                    });
                  }}
                >
                  {row.technicianName}
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Select at least 2 technicians for side-by-side analysis.</p>
        </CardContent>
      </Card>

      {selectedRows.length < 2 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground text-center">
            Pick 2 to 4 technicians to compare section-level performance.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {selectedRows.map((row) => (
              <div key={row.jacketId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{row.technicianName}</h3>
                  <Badge variant="outline">{row.status.replace("_", " ")}</Badge>
                </div>
                <SkillRadarChart jacketId={row.jacketId} title="" />
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Per-Section Score Table</CardTitle>
            </CardHeader>
            <CardContent>
              {sectionRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No section data available for selected technicians.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">Section</th>
                        {selectedRows.map((s) => (
                          <th key={s.technicianId} className="py-2 pr-4 min-w-[180px]">{s.technicianName}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.map((row) => (
                        <tr key={row.section} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{row.section}</td>
                          {row.values.map((val) => (
                            <td key={val.technicianId} className="py-2 pr-4">
                              {val.percentage}% <span className="text-muted-foreground">({val.score}/{val.maxScore})</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
