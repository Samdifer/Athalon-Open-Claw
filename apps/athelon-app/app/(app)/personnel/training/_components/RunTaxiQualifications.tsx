import { useEffect, useMemo, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  orgId: Id<"organizations">;
};

type AircraftStatus = "qualified" | "in-training" | "not-started";

type JacketRow = {
  technicianId: string;
  aircraftType: string;
  jacketStatus: string;
  hasInstructorSignoff: boolean;
};

function statusBadge(status: AircraftStatus) {
  if (status === "qualified") {
    return <Badge className="bg-green-500/15 text-green-700 border-green-500/30">Qualified</Badge>;
  }
  if (status === "in-training") {
    return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">In-Training</Badge>;
  }
  return <Badge variant="outline">Not Started</Badge>;
}

export function RunTaxiQualifications({ orgId }: Props) {
  const convex = useConvex();
  const technicians = useQuery(api.technicians.list, { organizationId: orgId });
  const trainingRecords = useQuery(api.training.listOrgTraining, { orgId });
  const curricula = useQuery(api.ojt.listCurricula, { organizationId: orgId });

  const [jacketRows, setJacketRows] = useState<JacketRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadJackets() {
      if (!curricula || curricula.length === 0) {
        setJacketRows([]);
        return;
      }

      const jacketsByCurriculum = await Promise.all(
        curricula.map((c) => convex.query(api.ojt.listJacketsByCurriculum, { curriculumId: c._id })),
      );

      const rows: JacketRow[] = [];
      for (let i = 0; i < curricula.length; i += 1) {
        const curriculum = curricula[i];
        const jackets = jacketsByCurriculum[i];

        const eventSets = await Promise.all(
          jackets.map((j) => convex.query(api.ojt.listStageEvents, { jacketId: j._id })),
        );

        jackets.forEach((jacket, idx) => {
          const hasInstructorSignoff = eventSets[idx].some((event) => !!event.trainerSignedAt);
          rows.push({
            technicianId: jacket.technicianId as string,
            aircraftType: curriculum.aircraftType,
            jacketStatus: String(jacket.status),
            hasInstructorSignoff,
          });
        });
      }

      if (!cancelled) setJacketRows(rows);
    }

    void loadJackets();
    return () => {
      cancelled = true;
    };
  }, [convex, curricula]);

  const tableRows = useMemo(() => {
    if (!technicians || !trainingRecords) return [];

    const safetyByTech = new Map<string, boolean>();
    for (const rec of trainingRecords) {
      const isSafetyCourse =
        rec.courseType === "safety" ||
        rec.courseName.toLowerCase().includes("safety") ||
        rec.courseName.toLowerCase().includes("run") ||
        rec.courseName.toLowerCase().includes("taxi");
      if (isSafetyCourse && rec.status !== "expired") {
        safetyByTech.set(rec.technicianId, true);
      }
    }

    return technicians.map((tech) => {
      const entries = jacketRows.filter((row) => row.technicianId === (tech._id as string));
      const byAircraft = new Map<string, { status: AircraftStatus; signoff: boolean }>();

      for (const entry of entries) {
        const status: AircraftStatus =
          entry.jacketStatus === "fully_qualified"
            ? "qualified"
            : entry.jacketStatus === "in_progress"
              ? "in-training"
              : "not-started";

        const prev = byAircraft.get(entry.aircraftType);
        if (!prev) {
          byAircraft.set(entry.aircraftType, { status, signoff: entry.hasInstructorSignoff });
          continue;
        }

        const rank = { "not-started": 0, "in-training": 1, qualified: 2 } as const;
        const chosen = rank[status] > rank[prev.status] ? status : prev.status;
        byAircraft.set(entry.aircraftType, { status: chosen, signoff: prev.signoff || entry.hasInstructorSignoff });
      }

      return {
        technicianId: tech._id,
        technicianName: tech.legalName,
        safetyTrainingComplete: safetyByTech.get(tech._id as string) ?? false,
        aircraft: Array.from(byAircraft.entries()).map(([aircraftType, v]) => ({
          aircraftType,
          status: v.status,
          instructorSigned: v.signoff,
        })),
      };
    });
  }, [technicians, trainingRecords, jacketRows]);

  const loading = technicians === undefined || trainingRecords === undefined || curricula === undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Run & Taxi Qualifications</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading run/taxi qualification matrix…</p>
        ) : tableRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No technician data available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Technician</th>
                  <th className="py-2 pr-3">Safety Training</th>
                  <th className="py-2 pr-3">Aircraft-Specific Qualification</th>
                  <th className="py-2">Instructor Sign-Off</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.technicianId} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 font-medium">{row.technicianName}</td>
                    <td className="py-2 pr-3">
                      {row.safetyTrainingComplete ? (
                        <Badge className="bg-green-500/15 text-green-700 border-green-500/30">Complete</Badge>
                      ) : (
                        <Badge className="bg-red-500/15 text-red-700 border-red-500/30">Required</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 space-y-1">
                      {row.aircraft.length === 0 ? (
                        <span className="text-muted-foreground">No OJT jacket</span>
                      ) : (
                        row.aircraft.map((a) => (
                          <div key={`${row.technicianId}-${a.aircraftType}`} className="flex items-center gap-2">
                            <span className="font-mono text-xs">{a.aircraftType}</span>
                            {statusBadge(a.status)}
                          </div>
                        ))
                      )}
                    </td>
                    <td className="py-2">
                      {row.aircraft.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="space-y-1">
                          {row.aircraft.map((a) => (
                            <div key={`${row.technicianId}-${a.aircraftType}-sign`}>
                              {a.instructorSigned ? (
                                <Badge variant="outline" className="border-green-500/30 text-green-700">
                                  {a.aircraftType}: Signed
                                </Badge>
                              ) : (
                                <Badge variant="outline">{a.aircraftType}: Pending</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
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
