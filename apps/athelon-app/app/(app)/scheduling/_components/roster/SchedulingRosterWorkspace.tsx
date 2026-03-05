"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Calendar,
  Clock,
  Flag,
  Shield,
  Users,
} from "lucide-react";
import type { RosterWorkspaceViewModel } from "./types";
import { RosterStatCard } from "./shared/RosterStatCard";
import { RosterViewTab } from "./tabs/RosterViewTab";
import { RosterTeamsTab } from "./tabs/RosterTeamsTab";
import { RosterShiftsTab } from "./tabs/RosterShiftsTab";
import { RosterHolidaysTab } from "./tabs/RosterHolidaysTab";
import { RosterAnalysisTab } from "./tabs/RosterAnalysisTab";

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_CAN_MANAGE = new Set(["admin", "shop_manager", "lead_technician"]);

// ─── Props ──────────────────────────────────────────────────────────────────

interface SchedulingRosterWorkspaceProps {
  organizationId: Id<"organizations">;
  shopLocationId?: Id<"shopLocations"> | "all";
  focusDateMs?: number;
  embedded?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SchedulingRosterWorkspace({
  organizationId,
  shopLocationId,
  focusDateMs,
  embedded = false,
}: SchedulingRosterWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("roster");
  const [dateMode, setDateMode] = useState<"today" | "focus">(
    focusDateMs ? "focus" : "today",
  );

  const bootstrapRequested = useRef(false);

  // ── Queries ────────────────────────────────────────────────────────────

  const workspace = useQuery(
    api.schedulerRoster.getRosterWorkspace,
    organizationId
      ? {
          organizationId,
          shopLocationId,
          focusDateMs,
          dateMode,
        }
      : "skip",
  ) as RosterWorkspaceViewModel | undefined;

  const myRole = useQuery(
    api.roles.getMyRole,
    organizationId ? { organizationId } : "skip",
  );

  // ── Mutations ──────────────────────────────────────────────────────────

  const ensureBootstrap = useMutation(api.schedulerRoster.ensureRosterWorkspaceBootstrap);
  const setWorkspaceEnabled = useMutation(api.schedulerRoster.setRosterWorkspaceEnabled);

  const canManage = ROLE_CAN_MANAGE.has(myRole ?? "");

  // ── Bootstrap effect ───────────────────────────────────────────────────

  useEffect(() => {
    if (!workspace?.feature.rosterWorkspaceEnabled) return;
    if (workspace.feature.rosterWorkspaceBootstrappedAt) return;
    if (bootstrapRequested.current) return;

    bootstrapRequested.current = true;
    ensureBootstrap({ organizationId, shopLocationId })
      .then(() => {
        toast.success("Roster workspace bootstrapped");
      })
      .catch((err) => {
        bootstrapRequested.current = false;
        toast.error(err instanceof Error ? err.message : "Roster bootstrap failed");
      });
  }, [workspace, ensureBootstrap, organizationId, shopLocationId]);

  // ── Derived data ───────────────────────────────────────────────────────

  const groupedShiftRows = useMemo(() => {
    if (!workspace) return [];
    return workspace.shifts.map((shift) => {
      const teams = workspace.teams.filter((team) => team.shiftId === shift.shiftId);
      return {
        ...shift,
        teams: teams.map((team) => ({
          ...team,
          technicians: workspace.technicians.filter((tech) => tech.teamId === team.teamId),
        })),
      };
    });
  }, [workspace]);

  const unassignedTechs = useMemo(
    () => (workspace?.technicians ?? []).filter((tech) => !tech.teamId),
    [workspace?.technicians],
  );

  // ── Loading state ──────────────────────────────────────────────────────

  if (!workspace) {
    return (
      <div className="space-y-4" data-testid="roster-workspace-loading">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded border border-border/60 p-3">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-6 w-12 bg-muted rounded animate-pulse mt-2" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ── Workspace disabled state ───────────────────────────────────────────

  if (!workspace.feature.rosterWorkspaceEnabled) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Flag className="h-4 w-4 text-primary" />
            Roster Workspace Disabled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enable the roster and teams workspace for this organization to use shift-grouped
            team planning, holiday-aware coverage, and supervisor alerts.
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={async () => {
                try {
                  await setWorkspaceEnabled({ organizationId, enabled: true });
                  toast.success("Roster workspace enabled");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to enable roster workspace");
                }
              }}
              disabled={!canManage}
            >
              Enable Workspace
            </Button>
            {!canManage && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Admin, shop manager, or lead technician required.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <div className={`space-y-5 ${embedded ? "p-2" : ""}`} data-testid="roster-workspace">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Roster & Teams
          </h1>
          <span className="block text-sm text-muted-foreground mt-0.5">
            {workspace.focus.focusDateKey}
            {workspace.focus.observedHoliday
              ? ` · Holiday: ${workspace.focus.observedHoliday.name}`
              : ""}
            {" · "}
            {workspace.analysis.activeTechnicians} technician{workspace.analysis.activeTechnicians !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={dateMode === "today" ? "secondary" : "outline"}
            onClick={() => setDateMode("today")}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant={dateMode === "focus" ? "secondary" : "outline"}
            onClick={() => setDateMode("focus")}
            disabled={!focusDateMs}
          >
            Timeline Focus
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <RosterStatCard
          label="Active Techs"
          value={workspace.analysis.activeTechnicians}
          icon={<Users className="h-3 w-3" />}
        />
        <RosterStatCard
          label="Active Teams"
          value={workspace.analysis.activeTeams}
          icon={<Briefcase className="h-3 w-3" />}
        />
        <RosterStatCard
          label="On Shift"
          value={workspace.analysis.onShiftTechnicians}
          icon={<Clock className="h-3 w-3" />}
        />
        <RosterStatCard
          label="Unsupervised"
          value={workspace.analysis.unsupervisedTeams}
          icon={<AlertTriangle className="h-3 w-3" />}
          tone={workspace.analysis.unsupervisedTeams > 0 ? "amber" : "default"}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="roster">
            <Users className="h-3.5 w-3.5" />
            Roster
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Briefcase className="h-3.5 w-3.5" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="shifts">
            <Clock className="h-3.5 w-3.5" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <Calendar className="h-3.5 w-3.5" />
            Holidays
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <BarChart3 className="h-3.5 w-3.5" />
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="mt-4">
          <RosterViewTab
            groupedShiftRows={groupedShiftRows}
            unassignedTechs={unassignedTechs}
            observedHoliday={workspace.focus.observedHoliday}
          />
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <RosterTeamsTab
            teams={workspace.teams}
            shifts={workspace.shifts}
            technicians={workspace.technicians}
            canManage={canManage}
            organizationId={organizationId}
            shopLocationId={shopLocationId}
          />
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <RosterShiftsTab
            shifts={workspace.shifts}
            canManage={canManage}
            organizationId={organizationId}
            shopLocationId={shopLocationId}
          />
        </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <RosterHolidaysTab
            holidays={workspace.holidays}
            canManage={canManage}
            organizationId={organizationId}
            shopLocationId={shopLocationId}
          />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <RosterAnalysisTab
            analysis={workspace.analysis}
            teams={workspace.teams}
            technicians={workspace.technicians}
          />
        </TabsContent>
      </Tabs>

      {/* Read-only notice */}
      {!canManage && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Read-only mode. Admin, shop manager, or lead technician required for mutations.
        </p>
      )}
    </div>
  );
}
