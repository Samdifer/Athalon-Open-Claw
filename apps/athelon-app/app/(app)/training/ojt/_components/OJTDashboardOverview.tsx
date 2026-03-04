"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type OJTDashboardOverviewProps = {
  curriculumId: Id<"ojtCurricula">;
};

type StageEvent = Doc<"ojtStageEvents">;

type CollectorProps = {
  jacketId: Id<"ojtJackets">;
  onReady: (jacketId: Id<"ojtJackets">, events: StageEvent[]) => void;
};

function JacketEventsCollector({ jacketId, onReady }: CollectorProps) {
  const events = useQuery(api.ojt.listStageEvents, { jacketId });

  useEffect(() => {
    if (events) onReady(jacketId, events);
  }, [events, jacketId, onReady]);

  return null;
}

export function OJTDashboardOverview({ curriculumId }: OJTDashboardOverviewProps) {
  const { orgId } = useCurrentOrg();
  const jackets = useQuery(api.ojt.listJacketsByCurriculum, { curriculumId });
  const technicians = useQuery(api.technicians.list, orgId ? { organizationId: orgId } : "skip");
  const [eventsByJacket, setEventsByJacket] = useState<Record<string, StageEvent[]>>({});

  const onEventsReady = useCallback((jacketId: Id<"ojtJackets">, events: StageEvent[]) => {
    setEventsByJacket((prev) => {
      const key = String(jacketId);
      if (prev[key] === events) return prev;
      return { ...prev, [key]: events };
    });
  }, []);

  const techNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of technicians ?? []) map.set(String(t._id), t.legalName);
    return map;
  }, [technicians]);

  const stats = useMemo(() => {
    if (!jackets) return null;

    const total = jackets.length;
    const fullyQualified = jackets.filter((j) => j.status === "fully_qualified").length;

    const allRadar = Object.values(eventsByJacket);
    const lastProgressByJacket = new Map<string, number>();

    for (const jacket of jackets) {
      const events = eventsByJacket[String(jacket._id)] ?? [];
      const latest = events.reduce((max, e) => Math.max(max, e.createdAt), 0);
      lastProgressByJacket.set(String(jacket._id), latest || jacket.updatedAt || jacket.createdAt);
    }

    const stalledThreshold = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const stalled = jackets.filter((j) => {
      const ts = lastProgressByJacket.get(String(j._id)) ?? j.updatedAt;
      return j.status !== "fully_qualified" && ts < stalledThreshold;
    });

    const allEvents = allRadar.flat().sort((a, b) => b.createdAt - a.createdAt);
    const recent = allEvents.slice(0, 20);

    return {
      total,
      fullyQualified,
      avgCompletion: total === 0 ? 0 : Math.round((fullyQualified / total) * 100),
      stalled,
      recent,
    };
  }, [jackets, eventsByJacket]);

  const sectionHeat = useMemo(() => {
    if (!jackets) return [];

    const sectionMap = new Map<string, { section: string; trainedCount: number; totalEvents: number }>();
    for (const jacket of jackets) {
      const events = eventsByJacket[String(jacket._id)] ?? [];
      const trainedSections = new Set<string>();
      for (const e of events) {
        const sectionGuess = e.approvedDataRef ?? "General";
        trainedSections.add(sectionGuess);
        const entry = sectionMap.get(sectionGuess) ?? { section: sectionGuess, trainedCount: 0, totalEvents: 0 };
        entry.totalEvents += 1;
        sectionMap.set(sectionGuess, entry);
      }
      for (const s of trainedSections) {
        const entry = sectionMap.get(s) ?? { section: s, trainedCount: 0, totalEvents: 0 };
        entry.trainedCount += 1;
        sectionMap.set(s, entry);
      }
    }

    return Array.from(sectionMap.values()).sort((a, b) => b.trainedCount - a.trainedCount);
  }, [jackets, eventsByJacket]);

  if (!jackets || !technicians || !stats) {
    return <Skeleton className="h-[520px] w-full" />;
  }

  return (
    <div className="space-y-4">
      {jackets.map((j) => (
        <JacketEventsCollector key={j._id} jacketId={j._id} onReady={onEventsReady} />
      ))}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Technicians in Training" value={stats.total} />
        <StatCard label="Fully Qualified" value={stats.fullyQualified} />
        <StatCard label="Avg Completion" value={`${stats.avgCompletion}%`} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Needs Attention (14+ days stalled)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.stalled.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stalled jackets right now.</p>
          ) : (
            <div className="space-y-2">
              {stats.stalled.map((j) => (
                <div key={j._id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{techNameById.get(String(j.technicianId)) ?? "Unknown technician"}</p>
                    <p className="text-xs text-muted-foreground">Jacket {String(j._id).slice(-8)}</p>
                  </div>
                  <Badge variant="outline">{j.status.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Sign-Off Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stage events yet.</p>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                {stats.recent.map((e) => (
                  <div key={e._id} className="border rounded-md px-3 py-2">
                    <p className="text-sm font-medium">
                      {techNameById.get(String(e.technicianId)) ?? "Unknown"} · {e.stage}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString("en-US", { timeZone: "UTC" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Section Heatmap (Most/Least Trained)</CardTitle>
          </CardHeader>
          <CardContent>
            {sectionHeat.length === 0 ? (
              <p className="text-sm text-muted-foreground">No section activity yet.</p>
            ) : (
              <div className="space-y-2">
                {sectionHeat.slice(0, 10).map((row) => {
                  const intensity = Math.min(100, row.trainedCount * 20);
                  return (
                    <div key={row.section} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate">{row.section}</span>
                        <span className="text-muted-foreground">{row.trainedCount} techs</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${intensity}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
