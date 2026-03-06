"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquareText, AlertTriangle, Clock3, Users } from "lucide-react";

export default function ShiftHandoffDashboardPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState<"all" | "day" | "swing" | "night">("all");
  const [teamName, setTeamName] = useState("");
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);

  const dashboard = useQuery(
    api.taskCards.getShiftHandoffDashboard,
    orgId
      ? {
          organizationId: orgId,
          reportDate,
          shift,
          teamName: teamName.trim() || undefined,
          unresolvedOnly,
        }
      : "skip",
  );

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || dashboard === undefined,
  });

  const teamTop = useMemo(() => (dashboard?.teamBreakdown ?? []).slice(0, 5), [dashboard]);

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!orgId || !dashboard) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquareText className="h-6 w-6" /> Shift Handoff Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Consolidated handoff notes by shift, technician, and team with unresolved visibility.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="handoff-report-date" className="text-xs">Report Date (UTC)</Label>
            <Input
              id="handoff-report-date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Shift</Label>
            <Select value={shift} onValueChange={(v) => setShift(v as "all" | "day" | "swing" | "night")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shifts</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="swing">Swing</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="handoff-team" className="text-xs">Team Name</Label>
            <Input
              id="handoff-team"
              placeholder="e.g. Airframe Team"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
          <div className="flex items-end pb-2 gap-2">
            <Checkbox
              id="handoff-unresolved-only"
              checked={unresolvedOnly}
              onCheckedChange={(checked) => setUnresolvedOnly(!!checked)}
            />
            <Label htmlFor="handoff-unresolved-only" className="text-sm">Unresolved only</Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Notes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboard.summary.totalNotes}</div></CardContent>
        </Card>
        <Card className={dashboard.summary.unresolvedCount > 0 ? "border-amber-500/40" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Unresolved</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboard.summary.unresolvedCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Shift Mix</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>Day: {dashboard.summary.shiftBreakdown.day}</p>
            <p>Swing: {dashboard.summary.shiftBreakdown.swing}</p>
            <p>Night: {dashboard.summary.shiftBreakdown.night}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />Teams (top 5)</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            {teamTop.length === 0 ? <p>No team notes</p> : teamTop.map((team) => (
              <p key={team.teamName}>{team.teamName}: {team.notes}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Handoff Note Stream</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dashboard.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No handoff notes match the selected filters.</p>
          ) : (
            dashboard.notes.slice(0, 75).map((row: {
              taskCardId: Id<"taskCards">;
              workOrderId: Id<"workOrders">;
              taskCardNumber: string;
              workOrderNumber: string;
              technicianName: string;
              teamName: string;
              shift: string;
              note: string;
              createdAt: number;
              unresolved: boolean;
            }) => (
              <div key={`${row.taskCardId}-${row.createdAt}`} className="rounded-md border border-border/60 p-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge variant="outline">{row.shift}</Badge>
                  {row.unresolved && <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">Unresolved</Badge>}
                  <span className="text-muted-foreground">{new Date(row.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" })}Z</span>
                  <span className="text-muted-foreground">•</span>
                  <span>{row.technicianName}</span>
                  <span className="text-muted-foreground">• {row.teamName}</span>
                </div>
                <p className="text-sm mt-2">{row.note}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/work-orders/${row.workOrderId}`}>{row.workOrderNumber}</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/work-orders/${row.workOrderId}/tasks/${row.taskCardId}`}>{row.taskCardNumber}</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
