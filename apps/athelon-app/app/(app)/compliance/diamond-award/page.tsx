"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueries } from "convex/react";
import { Trophy } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { DiamondAwardProgress, type DiamondTier } from "../_components/DiamondAwardProgress";
import { OrgDiamondEligibility } from "../_components/OrgDiamondEligibility";
import { AMTAwardExport } from "../_components/AMTAwardExport";

type Row = {
  id: string;
  technicianName: string;
  department: string;
  certificateNumber?: string;
  eligibleHours: number;
  nonEligibleHours: number;
  tier: DiamondTier;
  nextTierTarget: number;
  progressToNext: number;
};

const BRONZE_HOURS = 16;
const SILVER_HOURS = 40;
const GOLD_HOURS = 80;

function isTrainingEligible(record: any) {
  if (typeof record?.isFaaAMTEligible === "boolean") return record.isFaaAMTEligible;
  const type = String(record?.courseType ?? "").toLowerCase();
  const name = String(record?.courseName ?? "").toLowerCase();
  if (["initial", "recurrent", "oem", "regulatory"].includes(type)) return true;
  return /(faa|14 cfr|airframe|powerplant|amt|part 145|maintenance)/.test(name);
}

function tierFromHours(hours: number): DiamondTier {
  if (hours >= GOLD_HOURS) return "gold";
  if (hours >= SILVER_HOURS) return "silver";
  if (hours >= BRONZE_HOURS) return "bronze";
  return "none";
}

function currentTierFloor(hours: number) {
  if (hours >= GOLD_HOURS) return GOLD_HOURS;
  if (hours >= SILVER_HOURS) return SILVER_HOURS;
  if (hours >= BRONZE_HOURS) return BRONZE_HOURS;
  return 0;
}

function nextTierTarget(hours: number) {
  if (hours < BRONZE_HOURS) return BRONZE_HOURS;
  if (hours < SILVER_HOURS) return SILVER_HOURS;
  if (hours < GOLD_HOURS) return GOLD_HOURS;
  return GOLD_HOURS;
}

function fmtTier(tier: DiamondTier) {
  return tier === "none" ? "None" : tier[0].toUpperCase() + tier.slice(1);
}

export default function DiamondAwardPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [department, setDepartment] = useState<string>("all");
  const [selectedTechId, setSelectedTechId] = useState<string>("");

  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip");
  const training = useQuery(api.training.listOrgTraining, orgId ? { orgId } : "skip");

  const jacketQueries = useMemo(
    () =>
      Object.fromEntries(
        (technicians ?? []).map((t) => [
          String(t._id),
          { query: api.ojt.listJacketsByTechnician, args: { technicianId: t._id } },
        ]),
      ),
    [technicians],
  );
  const jacketsByTech = useQueries(jacketQueries);

  const stageQueries = useMemo(() => {
    const entries: Array<[string, { query: any; args: any }]> = [];
    for (const [techId, jackets] of Object.entries(jacketsByTech ?? {})) {
      if (!Array.isArray(jackets)) continue;
      for (const jacket of jackets) {
        entries.push([
          `${techId}:${String(jacket._id)}`,
          { query: api.ojt.listStageEvents, args: { jacketId: jacket._id } },
        ]);
      }
    }
    return Object.fromEntries(entries);
  }, [jacketsByTech]);
  const eventsByJacket = useQueries(stageQueries);

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || technicians === undefined || training === undefined,
  });

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    for (const rec of training ?? []) {
      if (rec?.completedAt) years.add(new Date(rec.completedAt).getUTCFullYear());
    }
    for (const rows of Object.values(eventsByJacket ?? {})) {
      if (!Array.isArray(rows)) continue;
      for (const ev of rows) {
        if (ev?.createdAt) years.add(new Date(ev.createdAt).getUTCFullYear());
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, training, eventsByJacket]);

  const rows = useMemo<Row[]>(() => {
    if (!technicians || !training) return [];

    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);

    const trainingByTech = new Map<string, { eligibleMin: number; nonEligibleMin: number; cert?: string }>();
    for (const t of training) {
      if (!t?.completedAt || t.completedAt < start || t.completedAt >= end) continue;
      const key = String(t.technicianId);
      const entry = trainingByTech.get(key) ?? { eligibleMin: 0, nonEligibleMin: 0, cert: undefined };
      const minutes = Number(t.actualMinutes ?? t.durationMinutes ?? 60);
      if (isTrainingEligible(t)) entry.eligibleMin += Math.max(0, minutes);
      else entry.nonEligibleMin += Math.max(0, minutes);
      if (!entry.cert && t.certificateNumber) entry.cert = t.certificateNumber;
      trainingByTech.set(key, entry);
    }

    const ojtEligibleByTech = new Map<string, number>();
    for (const [compoundId, events] of Object.entries(eventsByJacket ?? {})) {
      if (!Array.isArray(events)) continue;
      const techId = compoundId.split(":")[0];
      for (const event of events) {
        const stamp = event?.trainerSignedAt ?? event?.createdAt;
        if (!stamp || stamp < start || stamp >= end) continue;
        const minutes = Number(event?.actualMinutes ?? 0);
        ojtEligibleByTech.set(techId, (ojtEligibleByTech.get(techId) ?? 0) + Math.max(0, minutes));
      }
    }

    return technicians.map((tech) => {
      const byTraining = trainingByTech.get(String(tech._id));
      const eligibleMinutes = (byTraining?.eligibleMin ?? 0) + (ojtEligibleByTech.get(String(tech._id)) ?? 0);
      const nonEligibleMinutes = byTraining?.nonEligibleMin ?? 0;
      const eligibleHours = eligibleMinutes / 60;
      const tier = tierFromHours(eligibleHours);
      const target = nextTierTarget(eligibleHours);
      const floor = currentTierFloor(eligibleHours);
      const progress = tier === "gold" ? 100 : target === floor ? 100 : Math.max(0, Math.min(100, ((eligibleHours - floor) / (target - floor)) * 100));
      return {
        id: String(tech._id),
        technicianName: tech.legalName,
        department: tech.role ? tech.role.replaceAll("_", " ") : "Unassigned",
        certificateNumber: byTraining?.cert,
        eligibleHours,
        nonEligibleHours: nonEligibleMinutes / 60,
        tier,
        nextTierTarget: target,
        progressToNext: progress,
      };
    });
  }, [technicians, training, eventsByJacket, year]);

  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filteredRows = useMemo(
    () => rows.filter((r) => (department === "all" ? true : r.department === department)),
    [rows, department],
  );

  const selectedRow =
    filteredRows.find((r) => r.id === selectedTechId) ?? filteredRows[0] ?? null;

  const bronzeCount = filteredRows.filter((r) => r.tier === "bronze").length;
  const silverCount = filteredRows.filter((r) => r.tier === "silver").length;
  const goldCount = filteredRows.filter((r) => r.tier === "gold").length;
  const certifiedCount = filteredRows.filter((r) => r.eligibleHours >= BRONZE_HOURS).length;
  const orgEligible = filteredRows.length > 0 && certifiedCount === filteredRows.length;

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Diamond Award tracking requires organization setup"
        missingInfo="Complete onboarding before tracking FAA AMT Diamond Award progress."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!orgId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-muted-foreground" /> FAA AMT Diamond Award
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Per-technician training hour tracking and organization eligibility for FAASafety.gov submissions.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Eligible Techs</p><p className="text-2xl font-bold">{filteredRows.length}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Bronze (16h+)</p><p className="text-2xl font-bold">{bronzeCount}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Silver (40h+)</p><p className="text-2xl font-bold">{silverCount}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Gold (80h+)</p><p className="text-2xl font-bold">{goldCount}</p></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Org Eligibility</p><p className="text-lg font-semibold">{orgEligible ? "Eligible ✅" : "Not Yet"}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2">Technician</th>
                <th className="text-left px-3 py-2">Department</th>
                <th className="text-right px-3 py-2">Eligible Hours ({year})</th>
                <th className="text-left px-3 py-2">Current Tier</th>
                <th className="text-left px-3 py-2 min-w-[220px]">Progress to Next Tier</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-t cursor-pointer hover:bg-muted/30" onClick={() => setSelectedTechId(row.id)}>
                  <td className="px-3 py-2 font-medium">{row.technicianName}</td>
                  <td className="px-3 py-2 text-muted-foreground capitalize">{row.department}</td>
                  <td className="px-3 py-2 text-right">{row.eligibleHours.toFixed(1)}h</td>
                  <td className="px-3 py-2"><Badge variant="outline">{fmtTier(row.tier)}</Badge></td>
                  <td className="px-3 py-2">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${row.progressToNext}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {selectedRow ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1">
            <DiamondAwardProgress
              data={{
                technicianName: selectedRow.technicianName,
                eligibleHours: selectedRow.eligibleHours,
                nonEligibleHours: selectedRow.nonEligibleHours,
                tier: selectedRow.tier,
                nextTierTargetHours: selectedRow.nextTierTarget,
              }}
            />
          </div>
          <div className="xl:col-span-1">
            <OrgDiamondEligibility
              employees={filteredRows.map((r) => ({ id: r.id, name: r.technicianName, eligibleHours: r.eligibleHours }))}
            />
          </div>
          <div className="xl:col-span-1">
            <AMTAwardExport
              year={year}
              rows={filteredRows.map((r) => ({
                id: r.id,
                employeeName: r.technicianName,
                certificateNumber: r.certificateNumber,
                trainingHours: r.eligibleHours,
                tier: r.tier,
              }))}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
