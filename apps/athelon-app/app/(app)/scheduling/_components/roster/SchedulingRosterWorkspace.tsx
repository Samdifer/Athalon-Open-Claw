"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Calendar,
  Clock3,
  Flag,
  Layers,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  RosterShiftRow,
  RosterTechnicianRow,
  RosterWorkspaceViewModel,
} from "./types";

const TEAM_COLORS = [
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-indigo-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-orange-500",
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const ROLE_CAN_MANAGE = new Set(["admin", "shop_manager", "lead_technician"]);

function formatHour(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  return `${normalized.toString().padStart(2, "0")}:00`;
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map((v) => Number(v));
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getShiftLabel(shift?: RosterShiftRow) {
  if (!shift) return "No linked shift";
  return `${shift.name} · ${formatHour(shift.startHour)}-${formatHour(shift.endHour)}`;
}

function getDefaultShiftForm() {
  return {
    name: "",
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: 7,
    endHour: 17,
    efficiencyMultiplier: 1,
  };
}

interface SchedulingRosterWorkspaceProps {
  organizationId: Id<"organizations">;
  shopLocationId?: Id<"shopLocations"> | "all";
  focusDateMs?: number;
  embedded?: boolean;
}

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

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0]);
  const [newTeamShiftId, setNewTeamShiftId] = useState<string>("");

  const [teamEditingId, setTeamEditingId] = useState<string | null>(null);
  const [teamEditName, setTeamEditName] = useState("");
  const [teamEditColor, setTeamEditColor] = useState(TEAM_COLORS[0]);
  const [teamEditShiftId, setTeamEditShiftId] = useState<string>("");

  const [shiftForm, setShiftForm] = useState(getDefaultShiftForm());
  const [shiftEditingId, setShiftEditingId] = useState<string | null>(null);

  const [holidayDateKey, setHolidayDateKey] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayNotes, setHolidayNotes] = useState("");

  const [assignTechId, setAssignTechId] = useState<string>("");
  const [assignTeamId, setAssignTeamId] = useState<string>("");

  const bootstrapRequested = useRef(false);

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

  const ensureBootstrap = useMutation(api.schedulerRoster.ensureRosterWorkspaceBootstrap);
  const setWorkspaceEnabled = useMutation(api.schedulerRoster.setRosterWorkspaceEnabled);

  const createTeam = useMutation(api.schedulerRoster.createRosterTeam);
  const updateTeam = useMutation(api.schedulerRoster.updateRosterTeam);
  const archiveTeam = useMutation(api.schedulerRoster.archiveRosterTeam);
  const deleteTeam = useMutation(api.schedulerRoster.deleteRosterTeam);

  const createShift = useMutation(api.schedulerRoster.createRosterShift);
  const updateShift = useMutation(api.schedulerRoster.updateRosterShift);
  const archiveShift = useMutation(api.schedulerRoster.archiveRosterShift);
  const deleteShift = useMutation(api.schedulerRoster.deleteRosterShift);

  const createHoliday = useMutation(api.schedulerRoster.createSchedulingHoliday);
  const updateHoliday = useMutation(api.schedulerRoster.updateSchedulingHoliday);
  const toggleHoliday = useMutation(api.schedulerRoster.toggleSchedulingHoliday);
  const deleteHoliday = useMutation(api.schedulerRoster.deleteSchedulingHoliday);

  const assignTechToTeam = useMutation(api.schedulerRoster.assignTechnicianToRosterTeam);
  const clearTechTeam = useMutation(api.schedulerRoster.clearTechnicianRosterTeam);

  const canManage = ROLE_CAN_MANAGE.has(myRole ?? "");

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

  useEffect(() => {
    if (!workspace || newTeamShiftId) return;
    if (workspace.shifts[0]) {
      setNewTeamShiftId(workspace.shifts[0].shiftId);
    }
  }, [workspace, newTeamShiftId]);

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

  async function handleEnableWorkspace() {
    try {
      await setWorkspaceEnabled({ organizationId, enabled: true });
      toast.success("Roster workspace enabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enable roster workspace");
    }
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim() || !newTeamShiftId) return;
    try {
      await createTeam({
        organizationId,
        shopLocationId: shopLocationId === "all" ? undefined : shopLocationId,
        name: newTeamName,
        colorToken: newTeamColor,
        shiftId: newTeamShiftId as Id<"rosterShifts">,
      });
      setNewTeamName("");
      toast.success("Roster team created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create team");
    }
  }

  function beginEditTeam(team: RosterWorkspaceViewModel["teams"][number]) {
    setTeamEditingId(team.teamId);
    setTeamEditName(team.name);
    setTeamEditColor(team.colorToken);
    setTeamEditShiftId(team.shiftId);
  }

  async function handleSaveTeam(teamId: string) {
    try {
      await updateTeam({
        teamId: teamId as Id<"rosterTeams">,
        organizationId,
        name: teamEditName,
        colorToken: teamEditColor,
        shiftId: teamEditShiftId as Id<"rosterShifts">,
      });
      setTeamEditingId(null);
      toast.success("Team updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update team");
    }
  }

  async function handleCreateShift() {
    if (!shiftForm.name.trim()) return;
    try {
      await createShift({
        organizationId,
        shopLocationId: shopLocationId === "all" ? undefined : shopLocationId,
        name: shiftForm.name,
        daysOfWeek: shiftForm.daysOfWeek,
        startHour: shiftForm.startHour,
        endHour: shiftForm.endHour,
        efficiencyMultiplier: shiftForm.efficiencyMultiplier,
      });
      setShiftForm(getDefaultShiftForm());
      toast.success("Shift created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create shift");
    }
  }

  function beginEditShift(shift: RosterShiftRow) {
    setShiftEditingId(shift.shiftId);
    setShiftForm({
      name: shift.name,
      daysOfWeek: shift.daysOfWeek,
      startHour: shift.startHour,
      endHour: shift.endHour,
      efficiencyMultiplier: shift.efficiencyMultiplier,
    });
  }

  async function handleSaveShift(shiftId: string) {
    try {
      await updateShift({
        shiftId: shiftId as Id<"rosterShifts">,
        organizationId,
        name: shiftForm.name,
        daysOfWeek: shiftForm.daysOfWeek,
        startHour: shiftForm.startHour,
        endHour: shiftForm.endHour,
        efficiencyMultiplier: shiftForm.efficiencyMultiplier,
      });
      setShiftEditingId(null);
      setShiftForm(getDefaultShiftForm());
      toast.success("Shift updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update shift");
    }
  }

  async function handleCreateHoliday() {
    if (!holidayDateKey || !holidayName.trim()) return;
    try {
      await createHoliday({
        organizationId,
        shopLocationId: shopLocationId === "all" ? undefined : shopLocationId,
        dateKey: holidayDateKey,
        name: holidayName,
        notes: holidayNotes || undefined,
      });
      setHolidayDateKey("");
      setHolidayName("");
      setHolidayNotes("");
      toast.success("Holiday added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add holiday");
    }
  }

  async function handleAssignTechnician() {
    if (!assignTechId || !assignTeamId) return;
    try {
      await assignTechToTeam({
        organizationId,
        technicianId: assignTechId as Id<"technicians">,
        teamId: assignTeamId as Id<"rosterTeams">,
      });
      toast.success("Technician assigned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign technician");
    }
  }

  async function handleQuickEditHoliday(holiday: RosterWorkspaceViewModel["holidays"][number]) {
    const nextName = window.prompt("Holiday name", holiday.name);
    if (!nextName || !nextName.trim()) return;
    const nextDateKey = window.prompt("Date (YYYY-MM-DD)", holiday.dateKey);
    if (!nextDateKey || !nextDateKey.trim()) return;
    const nextNotes = window.prompt("Notes (optional)", holiday.notes ?? "");

    try {
      await updateHoliday({
        holidayId: holiday._id as Id<"schedulingHolidays">,
        organizationId,
        name: nextName.trim(),
        dateKey: nextDateKey.trim(),
        notes: nextNotes?.trim() || undefined,
      });
      toast.success("Holiday updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update holiday");
    }
  }

  async function handleMoveTeam(teamId: string, direction: "up" | "down") {
    if (!workspace) return;
    const index = workspace.teams.findIndex((team) => team.teamId === teamId);
    if (index < 0) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workspace.teams.length) return;

    const current = workspace.teams[index];
    const target = workspace.teams[targetIndex];

    try {
      await Promise.all([
        updateTeam({
          teamId: current.teamId as Id<"rosterTeams">,
          organizationId,
          sortOrder: targetIndex,
        }),
        updateTeam({
          teamId: target.teamId as Id<"rosterTeams">,
          organizationId,
          sortOrder: index,
        }),
      ]);
      toast.success("Team order updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder team");
    }
  }

  async function handleMoveShift(shiftId: string, direction: "up" | "down") {
    if (!workspace) return;
    const index = workspace.shifts.findIndex((shift) => shift.shiftId === shiftId);
    if (index < 0) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workspace.shifts.length) return;

    const current = workspace.shifts[index];
    const target = workspace.shifts[targetIndex];

    try {
      await Promise.all([
        updateShift({
          shiftId: current.shiftId as Id<"rosterShifts">,
          organizationId,
          sortOrder: targetIndex,
        }),
        updateShift({
          shiftId: target.shiftId as Id<"rosterShifts">,
          organizationId,
          sortOrder: index,
        }),
      ]);
      toast.success("Shift order updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder shift");
    }
  }

  if (!workspace) {
    return (
      <div className="space-y-3" data-testid="roster-workspace-loading">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!workspace.feature.rosterWorkspaceEnabled) {
    return (
      <Card className="border-cyan-500/30 bg-slate-950/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-slate-100">
            <Flag className="h-4 w-4 text-cyan-400" />
            Roster Workspace Disabled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-300">
            Enable the new roster and teams workspace for this organization to use shift-grouped
            team planning, holiday-aware coverage, and supervisor alerts.
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={handleEnableWorkspace} disabled={!canManage}>
              Enable Workspace
            </Button>
            {!canManage && (
              <span className="text-xs text-amber-300">
                Admin, shop manager, or lead technician required.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${embedded ? "p-2" : ""}`} data-testid="roster-workspace">
      <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            Roster & Teams
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Date context: {workspace.focus.focusDateKey}
            {workspace.focus.observedHoliday
              ? ` · Holiday: ${workspace.focus.observedHoliday.name}`
              : ""}
          </p>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="border-slate-800 bg-slate-950/80">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Active Techs</p>
            <p className="text-lg font-semibold text-slate-100">
              {workspace.analysis.activeTechnicians}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-950/80">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Active Teams</p>
            <p className="text-lg font-semibold text-slate-100">{workspace.analysis.activeTeams}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-950/80">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">On Shift</p>
            <p className="text-lg font-semibold text-slate-100">
              {workspace.analysis.onShiftTechnicians}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-950/80">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Unsupervised</p>
            <p className="text-lg font-semibold text-amber-300">
              {workspace.analysis.unsupervisedTeams}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto bg-slate-900/70 border border-slate-800">
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="mt-3 space-y-3">
          {workspace.focus.observedHoliday && (
            <Card className="border-amber-700/40 bg-amber-900/20">
              {/* BUG-LT-HUNT-119: text-amber-200 unreadable in light mode */}
              <CardContent className="p-3 text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Holiday observed: {workspace.focus.observedHoliday.name}. No shifts are considered
                active.
              </CardContent>
            </Card>
          )}

          {groupedShiftRows.map((shift) => (
            <Card key={shift.shiftId} className="border-slate-800 bg-slate-950/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-cyan-400" />
                    {shift.name}
                  </span>
                  <Badge variant="outline" className="border-slate-700 text-slate-300">
                    {formatHour(shift.startHour)}-{formatHour(shift.endHour)} · {Math.round(
                      shift.efficiencyMultiplier * 100,
                    )}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {shift.teams.length === 0 && (
                  <p className="text-xs text-slate-500">No teams linked to this shift.</p>
                )}
                {shift.teams.map((team) => (
                  <div key={team.teamId} className="rounded border border-slate-800 bg-slate-900/50 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-100 font-medium truncate">{team.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {team.onShiftCount}/{team.memberCount} on shift
                        </p>
                      </div>
                      {team.isUnsupervised ? (
                        <Badge className="bg-amber-600/20 text-amber-300 border border-amber-700/50">
                          <Shield className="h-3 w-3 mr-1" />
                          UNSUPERVISED
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600/20 text-emerald-300 border border-emerald-700/50">
                          Covered
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {team.technicians.map((tech) => (
                        <div
                          key={tech.technicianId}
                          className="rounded border border-slate-800 bg-slate-950/80 px-2 py-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-slate-100 font-medium truncate">{tech.name}</p>
                            <span className="text-[10px] text-slate-400">
                              {tech.assignedActiveCards} cards
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            {tech.employeeId ? `#${tech.employeeId} · ` : ""}
                            {Math.round(tech.estimatedRemainingHours)}h remaining
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {unassignedTechs.length > 0 && (
            <Card className="border-rose-800/50 bg-rose-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-rose-200">Unassigned Technicians</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {unassignedTechs.map((tech) => (
                  <p key={tech.technicianId} className="text-xs text-rose-200/90">
                    {tech.name}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-3 space-y-3">
          <Card className="border-slate-800 bg-slate-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-100">Create Team</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name"
                disabled={!canManage}
                data-testid="roster-team-name-input"
              />
              <Select value={newTeamShiftId} onValueChange={setNewTeamShiftId} disabled={!canManage}>
                <SelectTrigger>
                  <SelectValue placeholder="Shift" />
                </SelectTrigger>
                <SelectContent>
                  {workspace.shifts.map((shift) => (
                    <SelectItem key={shift.shiftId} value={shift.shiftId}>
                      {getShiftLabel(shift)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newTeamColor} onValueChange={setNewTeamColor} disabled={!canManage}>
                <SelectTrigger>
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreateTeam}
                disabled={!canManage || !newTeamName.trim()}
                data-testid="roster-team-create-button"
              >
                Create Team
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-100">Assign Technician</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select value={assignTechId} onValueChange={setAssignTechId}>
                <SelectTrigger>
                  <SelectValue placeholder="Technician" />
                </SelectTrigger>
                <SelectContent>
                  {workspace.technicians.map((tech) => (
                    <SelectItem key={tech.technicianId} value={tech.technicianId}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assignTeamId} onValueChange={setAssignTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  {workspace.teams.map((team) => (
                    <SelectItem key={team.teamId} value={team.teamId}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignTechnician} disabled={!canManage || !assignTechId || !assignTeamId}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Assign
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!assignTechId) return;
                  try {
                    await clearTechTeam({
                      organizationId,
                      technicianId: assignTechId as Id<"technicians">,
                    });
                    toast.success("Technician unassigned");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to clear assignment");
                  }
                }}
                disabled={!canManage || !assignTechId}
              >
                Clear Team
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {workspace.teams.map((team) => {
              const editing = teamEditingId === team.teamId;
              return (
                <Card
                  key={team.teamId}
                  className="border-slate-800 bg-slate-950/80"
                  data-testid={`roster-team-row-${team.teamId}`}
                >
                  <CardContent className="p-3 space-y-2">
                    {editing ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <Input value={teamEditName} onChange={(e) => setTeamEditName(e.target.value)} />
                        <Select value={teamEditShiftId} onValueChange={setTeamEditShiftId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Shift" />
                          </SelectTrigger>
                          <SelectContent>
                            {workspace.shifts.map((shift) => (
                              <SelectItem key={shift.shiftId} value={shift.shiftId}>
                                {getShiftLabel(shift)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={teamEditColor} onValueChange={setTeamEditColor}>
                          <SelectTrigger>
                            <SelectValue placeholder="Color" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEAM_COLORS.map((color) => (
                              <SelectItem key={color} value={color}>
                                {color}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleSaveTeam(team.teamId)} disabled={!canManage}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setTeamEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{team.name}</p>
                          <p className="text-xs text-slate-500">
                            {team.memberCount} members · {team.shiftName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveTeam(team.teamId, "up")}
                            disabled={!canManage}
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveTeam(team.teamId, "down")}
                            disabled={!canManage}
                          >
                            ↓
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => beginEditTeam(team)} disabled={!canManage}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await archiveTeam({
                                  teamId: team.teamId as Id<"rosterTeams">,
                                  organizationId,
                                });
                                toast.success("Team archived");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed to archive team");
                              }
                            }}
                            disabled={!canManage}
                          >
                            Archive
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              try {
                                await deleteTeam({
                                  teamId: team.teamId as Id<"rosterTeams">,
                                  organizationId,
                                });
                                toast.success("Team deleted");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed to delete team");
                              }
                            }}
                            disabled={!canManage}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="shifts" className="mt-3 space-y-3">
          <Card className="border-slate-800 bg-slate-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-100">
                {shiftEditingId ? "Edit Shift" : "Create Shift"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Shift name"
                  disabled={!canManage}
                  data-testid="roster-shift-name-input"
                />
                <Input
                  type="number"
                  value={shiftForm.startHour}
                  onChange={(e) => setShiftForm((prev) => ({ ...prev, startHour: Number(e.target.value) }))}
                  min={0}
                  max={23}
                  disabled={!canManage}
                />
                <Input
                  type="number"
                  value={shiftForm.endHour}
                  onChange={(e) => setShiftForm((prev) => ({ ...prev, endHour: Number(e.target.value) }))}
                  min={0}
                  max={23}
                  disabled={!canManage}
                />
                <Input
                  type="number"
                  value={shiftForm.efficiencyMultiplier}
                  onChange={(e) =>
                    setShiftForm((prev) => ({ ...prev, efficiencyMultiplier: Number(e.target.value) }))
                  }
                  step={0.05}
                  min={0.5}
                  max={2}
                  disabled={!canManage}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {DAY_ORDER.map((day) => (
                  <label key={day} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Checkbox
                      checked={shiftForm.daysOfWeek.includes(day)}
                      onCheckedChange={() => {
                        setShiftForm((prev) => ({
                          ...prev,
                          daysOfWeek: prev.daysOfWeek.includes(day)
                            ? prev.daysOfWeek.filter((d) => d !== day)
                            : [...prev.daysOfWeek, day],
                        }));
                      }}
                      disabled={!canManage}
                    />
                    {DAY_LABELS[day]}
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {shiftEditingId ? (
                  <>
                    <Button onClick={() => handleSaveShift(shiftEditingId)} disabled={!canManage}>
                      Save Shift
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShiftEditingId(null);
                        setShiftForm(getDefaultShiftForm());
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleCreateShift}
                    disabled={!canManage || !shiftForm.name.trim()}
                    data-testid="roster-shift-create-button"
                  >
                    Create Shift
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {workspace.shifts.map((shift) => (
              <Card
                key={shift.shiftId}
                className="border-slate-800 bg-slate-950/80"
                data-testid={`roster-shift-row-${shift.shiftId}`}
              >
                <CardContent className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{shift.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatHour(shift.startHour)}-{formatHour(shift.endHour)} · {Math.round(
                        shift.efficiencyMultiplier * 100,
                      )}% · {shift.teamCount} teams
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMoveShift(shift.shiftId, "up")}
                      disabled={!canManage}
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMoveShift(shift.shiftId, "down")}
                      disabled={!canManage}
                    >
                      ↓
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => beginEditShift(shift)} disabled={!canManage}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await archiveShift({ shiftId: shift.shiftId as Id<"rosterShifts">, organizationId });
                          toast.success("Shift archived");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to archive shift");
                        }
                      }}
                      disabled={!canManage}
                    >
                      Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await deleteShift({ shiftId: shift.shiftId as Id<"rosterShifts">, organizationId });
                          toast.success("Shift deleted");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to delete shift");
                        }
                      }}
                      disabled={!canManage}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="holidays" className="mt-3 space-y-3">
          <Card className="border-slate-800 bg-slate-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-400" />
                Add Holiday
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                type="date"
                value={holidayDateKey}
                onChange={(e) => setHolidayDateKey(e.target.value)}
                data-testid="roster-holiday-date-input"
              />
              <Input
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="Holiday name"
                data-testid="roster-holiday-name-input"
              />
              <Textarea
                value={holidayNotes}
                onChange={(e) => setHolidayNotes(e.target.value)}
                placeholder="Optional notes"
                className="min-h-[40px]"
              />
              <Button
                onClick={handleCreateHoliday}
                disabled={!canManage || !holidayDateKey || !holidayName.trim()}
                data-testid="roster-holiday-create-button"
              >
                Add
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {workspace.holidays.length === 0 && (
              <Card className="border-slate-800 bg-slate-950/80">
                <CardContent className="p-4 text-sm text-slate-500">No holidays configured.</CardContent>
              </Card>
            )}
            {workspace.holidays.map((holiday) => (
              <Card
                key={holiday._id}
                className="border-slate-800 bg-slate-950/80"
                data-testid={`roster-holiday-row-${holiday._id}`}
              >
                <CardContent className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{holiday.name}</p>
                    <p className="text-xs text-slate-500">{formatDateLabel(holiday.dateKey)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickEditHoliday(holiday)}
                      disabled={!canManage}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await toggleHoliday({ holidayId: holiday._id as Id<"schedulingHolidays">, organizationId });
                          toast.success("Holiday toggled");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to toggle holiday");
                        }
                      }}
                      disabled={!canManage}
                    >
                      {holiday.isObserved ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await deleteHoliday({ holidayId: holiday._id as Id<"schedulingHolidays">, organizationId });
                          toast.success("Holiday deleted");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to delete holiday");
                        }
                      }}
                      disabled={!canManage}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            <Card className="border-slate-800 bg-slate-950/80">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Supervisor Coverage</p>
                <p className="text-xl font-semibold text-emerald-300">
                  {workspace.analysis.supervisorCoveragePercent}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-800 bg-slate-950/80">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Average Efficiency</p>
                <p className="text-xl font-semibold text-cyan-300">
                  {Math.round(workspace.analysis.averageEfficiency * 100)}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-800 bg-slate-950/80">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Remaining Hours</p>
                <p className="text-xl font-semibold text-slate-100">
                  {Math.round(workspace.analysis.remainingHours)}h
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-800 bg-slate-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                Team Risk Radar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {workspace.teams.map((team) => {
                const techLoad = workspace.technicians
                  .filter((tech) => tech.teamId === team.teamId)
                  .reduce((sum, tech) => sum + tech.estimatedRemainingHours, 0);
                return (
                  <div
                    key={team.teamId}
                    className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1.5 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-100 truncate">{team.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {team.onShiftCount}/{team.memberCount} on shift · {Math.round(techLoad)}h
                      </p>
                    </div>
                    {team.isUnsupervised && (
                      <Badge className="bg-amber-700/20 text-amber-300 border border-amber-700/50">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Unsupervised
                      </Badge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {!canManage && (
        <p className="text-xs text-amber-300 flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Read-only mode. Admin, shop manager, or lead technician required for mutations.
        </p>
      )}
    </div>
  );
}
