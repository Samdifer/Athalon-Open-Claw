import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DueDateProjection } from "@/app/(app)/fleet/_components/DueDateProjection";
import { LevelLoadingChart } from "@/app/(app)/fleet/_components/LevelLoadingChart";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function MaintenanceProgramDetailPage() {
  const { id } = useParams();
  const { orgId } = useCurrentOrg();
  const program = useQuery(
    api.maintenancePrograms.get,
    id ? { id: id as Id<"maintenancePrograms"> } : "skip",
  );

  if (!program) {
    return (
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm"><Link to="/fleet/maintenance-programs"><ArrowLeft className="w-4 h-4 mr-1" />Back</Link></Button>
        <Card><CardContent className="py-10 text-sm text-muted-foreground">Program not found.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/fleet/maintenance-programs"><ArrowLeft className="w-4 h-4 mr-1" />Maintenance Programs</Link></Button>
          <h1 className="text-2xl font-semibold">{program.taskName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ATA {program.ataChapter} · {program.aircraftType}</p>
        </div>
        <Badge variant={program.isActive ? "default" : "secondary"}>{program.isActive ? "Active" : "Inactive"}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Interval Dimensions</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Calendar</span><span>{program.calendarIntervalDays ? `${program.calendarIntervalDays} days` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Hours</span><span>{program.hourInterval ? `${program.hourInterval} hours` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cycles</span><span>{program.cycleInterval ? `${program.cycleInterval} cycles` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Trigger Logic</span><span>{program.triggerLogic === "first" ? "First due" : "Greatest interval"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phase Inspection</span><span>{program.isPhaseInspection ? `Yes (Phase ${program.phaseNumber ?? "?"})` : "No"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Estimated Labor</span><span>{program.estimatedLaborHours ? `${program.estimatedLaborHours} hours` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Approved Data</span><span>{program.approvedDataRef ?? "—"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Scope & Parts Template</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Serial Number Scope</p>
              <p>{program.serialNumberScope === "all" ? "All serial numbers" : "Specific serials"}</p>
              {program.serialNumberScope === "specific" && (program.specificSerials?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(program.specificSerials ?? []).map((sn) => <Badge key={sn} variant="outline">{sn}</Badge>)}
                </div>
              )}
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Required Parts Template</p>
              {(program.requiredPartsTemplate?.length ?? 0) === 0 ? (
                <p>—</p>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {(program.requiredPartsTemplate ?? []).map((part) => <li key={part}>{part}</li>)}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {orgId && (
        <DueDateProjection
          organizationId={orgId}
          aircraftType={program.aircraftType}
          currentTotalTime={0}
          currentCycles={0}
          averageMonthlyHours={35}
          averageMonthlyCycles={25}
          focusProgramId={program._id}
        />
      )}

      {orgId && (
        <LevelLoadingChart
          organizationId={orgId}
          aircraftType={program.aircraftType}
        />
      )}
    </div>
  );
}
