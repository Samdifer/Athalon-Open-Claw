"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Briefcase,
  Check,
  Clock,
  Edit2,
  Flag,
  Plus,
  Trash2,
  Users,
  X,
  Archive,
} from "lucide-react";

const TEAM_COLORS = [
  { token: "bg-slate-500", label: "Slate" },
  { token: "bg-red-500", label: "Red" },
  { token: "bg-amber-500", label: "Amber" },
  { token: "bg-emerald-500", label: "Emerald" },
  { token: "bg-cyan-500", label: "Cyan" },
  { token: "bg-blue-500", label: "Blue" },
  { token: "bg-violet-500", label: "Violet" },
  { token: "bg-rose-500", label: "Rose" },
] as const;

type TeamColorToken = (typeof TEAM_COLORS)[number]["token"];

function normalizeTeamColorToken(token: string): TeamColorToken {
  if (TEAM_COLORS.some((entry) => entry.token === token)) {
    return token as TeamColorToken;
  }
  return TEAM_COLORS[0].token;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const START_HOURS = [6, 7, 8, 9] as const;
const END_HOURS = [15, 16, 17, 18] as const;
const EFFICIENCY_OPTIONS = [
  { value: 0.7, label: "70%" },
  { value: 0.75, label: "75%" },
  { value: 0.8, label: "80%" },
  { value: 0.85, label: "85%" },
  { value: 0.9, label: "90%" },
  { value: 0.95, label: "95%" },
  { value: 1.0, label: "100%" },
  { value: 1.05, label: "105%" },
  { value: 1.1, label: "110%" },
  { value: 1.15, label: "115%" },
  { value: 1.2, label: "120%" },
  { value: 1.25, label: "125%" },
  { value: 1.3, label: "130%" },
  { value: 1.35, label: "135%" },
  { value: 1.4, label: "140%" },
] as const;

function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return "12 AM";
  if (normalized === 12) return "12 PM";
  return normalized < 12 ? `${normalized} AM` : `${normalized - 12} PM`;
}

interface PersonnelTeamsShiftsTabProps {
  teams: Array<{
    teamId: string;
    name: string;
    colorToken: string;
    shiftId: string;
    shiftName?: string;
    memberCount: number;
    onShiftCount: number;
    hasSupervisorCoverage: boolean;
    isUnsupervised: boolean;
  }>;
  shifts: Array<{
    shiftId: string;
    name: string;
    daysOfWeek: number[];
    startHour: number;
    endHour: number;
    efficiencyMultiplier: number;
    teamCount: number;
    sortOrder: number;
  }>;
  rosterWorkspaceEnabled: boolean;
  canManage: boolean;
  orgId: string | null;
}

type ShiftFormState = {
  name: string;
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
};

function getDefaultShiftForm(): ShiftFormState {
  return {
    name: "",
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: 7,
    endHour: 17,
    efficiencyMultiplier: 1.0,
  };
}

export function PersonnelTeamsShiftsTab({
  teams,
  shifts,
  rosterWorkspaceEnabled,
  canManage,
  orgId,
}: PersonnelTeamsShiftsTabProps) {
  const organizationId = orgId as Id<"organizations"> | null;

  // --- Team form state ---
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState<TeamColorToken>(TEAM_COLORS[0].token);
  const [newTeamShiftId, setNewTeamShiftId] = useState<string>("");
  const [teamEditingId, setTeamEditingId] = useState<string | null>(null);
  const [teamEditName, setTeamEditName] = useState("");
  const [teamEditColor, setTeamEditColor] = useState<TeamColorToken>(TEAM_COLORS[0].token);
  const [teamEditShiftId, setTeamEditShiftId] = useState<string>("");
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null);

  // --- Shift form state ---
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [shiftForm, setShiftForm] = useState<ShiftFormState>(getDefaultShiftForm());
  const [shiftEditingId, setShiftEditingId] = useState<string | null>(null);
  const [confirmDeleteShiftId, setConfirmDeleteShiftId] = useState<string | null>(null);

  // --- Mutations ---
  const setWorkspaceEnabled = useMutation(api.schedulerRoster.setRosterWorkspaceEnabled);
  const ensureBootstrap = useMutation(api.schedulerRoster.ensureRosterWorkspaceBootstrap);
  const createTeam = useMutation(api.schedulerRoster.createRosterTeam);
  const updateTeam = useMutation(api.schedulerRoster.updateRosterTeam);
  const archiveTeam = useMutation(api.schedulerRoster.archiveRosterTeam);
  const deleteTeam = useMutation(api.schedulerRoster.deleteRosterTeam);
  const createShift = useMutation(api.schedulerRoster.createRosterShift);
  const updateShift = useMutation(api.schedulerRoster.updateRosterShift);
  const archiveShift = useMutation(api.schedulerRoster.archiveRosterShift);
  const deleteShift = useMutation(api.schedulerRoster.deleteRosterShift);

  // Default new team shift to first available shift
  const effectiveNewTeamShiftId = newTeamShiftId || (shifts[0]?.shiftId ?? "");

  // --- Bootstrap guard ---
  if (!rosterWorkspaceEnabled) {
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
                if (!organizationId) return;
                try {
                  await setWorkspaceEnabled({ organizationId, enabled: true });
                  await ensureBootstrap({ organizationId });
                  toast.success("Roster workspace enabled");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to enable roster workspace");
                }
              }}
              disabled={!canManage || !organizationId}
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

  // --- Handlers: Teams ---
  async function handleCreateTeam() {
    if (!newTeamName.trim() || !effectiveNewTeamShiftId || !organizationId) return;
    try {
      await createTeam({
        organizationId,
        name: newTeamName,
        colorToken: newTeamColor,
        shiftId: effectiveNewTeamShiftId as Id<"rosterShifts">,
      });
      setNewTeamName("");
      setNewTeamColor(TEAM_COLORS[0].token);
      setNewTeamShiftId("");
      setShowCreateTeam(false);
      toast.success("Team created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create team");
    }
  }

  function beginEditTeam(team: PersonnelTeamsShiftsTabProps["teams"][number]) {
    setTeamEditingId(team.teamId);
    setTeamEditName(team.name);
    setTeamEditColor(normalizeTeamColorToken(team.colorToken));
    setTeamEditShiftId(team.shiftId);
  }

  async function handleSaveTeam(teamId: string) {
    if (!organizationId) return;
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

  async function handleArchiveTeam(teamId: string) {
    if (!organizationId) return;
    try {
      await archiveTeam({ teamId: teamId as Id<"rosterTeams">, organizationId });
      toast.success("Team archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive team");
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if (!organizationId) return;
    try {
      await deleteTeam({ teamId: teamId as Id<"rosterTeams">, organizationId });
      setConfirmDeleteTeamId(null);
      toast.success("Team deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete team");
    }
  }

  // --- Handlers: Shifts ---
  async function handleCreateShift() {
    if (!shiftForm.name.trim() || !organizationId) return;
    try {
      await createShift({
        organizationId,
        name: shiftForm.name,
        daysOfWeek: shiftForm.daysOfWeek,
        startHour: shiftForm.startHour,
        endHour: shiftForm.endHour,
        efficiencyMultiplier: shiftForm.efficiencyMultiplier,
      });
      setShiftForm(getDefaultShiftForm());
      setShowCreateShift(false);
      toast.success("Shift created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create shift");
    }
  }

  function beginEditShift(shift: PersonnelTeamsShiftsTabProps["shifts"][number]) {
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
    if (!organizationId) return;
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

  async function handleArchiveShift(shiftId: string) {
    if (!organizationId) return;
    try {
      await archiveShift({ shiftId: shiftId as Id<"rosterShifts">, organizationId });
      toast.success("Shift archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive shift");
    }
  }

  async function handleDeleteShift(shiftId: string) {
    if (!organizationId) return;
    try {
      await deleteShift({ shiftId: shiftId as Id<"rosterShifts">, organizationId });
      setConfirmDeleteShiftId(null);
      toast.success("Shift deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete shift");
    }
  }

  function toggleDay(day: number) {
    setShiftForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ---- LEFT COLUMN: Teams ---- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teams
            <Badge variant="secondary" className="ml-1">{teams.length}</Badge>
          </h3>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateTeam(!showCreateTeam)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Team
            </Button>
          )}
        </div>

        {/* Create Team Form */}
        {showCreateTeam && canManage && (
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
              <Select
                value={effectiveNewTeamShiftId}
                onValueChange={(v) => setNewTeamShiftId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.shiftId} value={shift.shiftId}>
                      {shift.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Color</p>
                <div className="flex gap-1.5 flex-wrap">
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c.token}
                      type="button"
                      title={c.label}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${c.token} ${
                        newTeamColor === c.token
                          ? "border-foreground ring-2 ring-primary/40 scale-110"
                          : "border-transparent hover:border-border"
                      }`}
                      onClick={() => setNewTeamColor(c.token)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShowCreateTeam(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim() || !effectiveNewTeamShiftId}
                >
                  Create Team
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team List */}
        {teams.length === 0 && (
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No teams configured yet.
            </CardContent>
          </Card>
        )}

        {teams.map((team) => {
          const isEditing = teamEditingId === team.teamId;
          const isConfirmingDelete = confirmDeleteTeamId === team.teamId;

          return (
            <Card key={team.teamId} className="border-border/60">
              <CardContent className="p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={teamEditName}
                      onChange={(e) => setTeamEditName(e.target.value)}
                    />
                    <Select
                      value={teamEditShiftId}
                      onValueChange={(v) => setTeamEditShiftId(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts.map((shift) => (
                          <SelectItem key={shift.shiftId} value={shift.shiftId}>
                            {shift.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Color</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {TEAM_COLORS.map((c) => (
                          <button
                            key={c.token}
                            type="button"
                            title={c.label}
                            className={`h-7 w-7 rounded-full border-2 transition-all ${c.token} ${
                              teamEditColor === c.token
                                ? "border-foreground ring-2 ring-primary/40 scale-110"
                                : "border-transparent hover:border-border"
                            }`}
                            onClick={() => setTeamEditColor(c.token)}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTeamEditingId(null)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleSaveTeam(team.teamId)}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`h-3.5 w-3.5 rounded-full flex-shrink-0 ${team.colorToken}`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {team.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {team.shiftName && (
                            <Badge variant="outline" className="text-[10px]">
                              {team.shiftName}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {team.isUnsupervised ? (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          UNSUP
                        </Badge>
                      ) : team.memberCount > 0 ? (
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 text-[10px]">
                          <Check className="h-3 w-3 mr-1" />
                          Covered
                        </Badge>
                      ) : null}

                      {canManage && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => beginEditTeam(team)}
                            title="Edit team"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleArchiveTeam(team.teamId)}
                            title="Archive team"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                          {isConfirmingDelete ? (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="destructive"
                                className="h-7 w-7"
                                onClick={() => handleDeleteTeam(team.teamId)}
                                title="Confirm delete"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => setConfirmDeleteTeamId(null)}
                                title="Cancel delete"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => setConfirmDeleteTeamId(team.teamId)}
                              title="Delete team"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ---- RIGHT COLUMN: Shifts ---- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Shift Profiles
            <Badge variant="secondary" className="ml-1">{shifts.length}</Badge>
          </h3>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShiftForm(getDefaultShiftForm());
                setShowCreateShift(!showCreateShift);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Shift
            </Button>
          )}
        </div>

        {/* Create Shift Form */}
        {showCreateShift && canManage && (
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Shift name"
                value={shiftForm.name}
                onChange={(e) =>
                  setShiftForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Work Days</p>
                <div className="flex gap-1">
                  {DAY_LABELS.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                        shiftForm.daysOfWeek.includes(idx)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => toggleDay(idx)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Start</p>
                  <Select
                    value={String(shiftForm.startHour)}
                    onValueChange={(v) =>
                      setShiftForm((prev) => ({ ...prev, startHour: Number(v) }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {START_HOURS.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {formatHour(h)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">End</p>
                  <Select
                    value={String(shiftForm.endHour)}
                    onValueChange={(v) =>
                      setShiftForm((prev) => ({ ...prev, endHour: Number(v) }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {END_HOURS.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {formatHour(h)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
                  <Select
                    value={String(shiftForm.efficiencyMultiplier)}
                    onValueChange={(v) =>
                      setShiftForm((prev) => ({
                        ...prev,
                        efficiencyMultiplier: Number(v),
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EFFICIENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShowCreateShift(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateShift}
                  disabled={!shiftForm.name.trim() || shiftForm.daysOfWeek.length === 0}
                >
                  Create Shift
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shift List */}
        {shifts.length === 0 && (
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No shift profiles configured yet.
            </CardContent>
          </Card>
        )}

        {shifts.map((shift) => {
          const isEditing = shiftEditingId === shift.shiftId;
          const isConfirmingDelete = confirmDeleteShiftId === shift.shiftId;

          return (
            <Card key={shift.shiftId} className="border-border/60">
              <CardContent className="p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={shiftForm.name}
                      onChange={(e) =>
                        setShiftForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Work Days</p>
                      <div className="flex gap-1">
                        {DAY_LABELS.map((label, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                              shiftForm.daysOfWeek.includes(idx)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/40 text-muted-foreground hover:bg-muted"
                            }`}
                            onClick={() => toggleDay(idx)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Start</p>
                        <Select
                          value={String(shiftForm.startHour)}
                          onValueChange={(v) =>
                            setShiftForm((prev) => ({ ...prev, startHour: Number(v) }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {START_HOURS.map((h) => (
                              <SelectItem key={h} value={String(h)}>
                                {formatHour(h)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">End</p>
                        <Select
                          value={String(shiftForm.endHour)}
                          onValueChange={(v) =>
                            setShiftForm((prev) => ({ ...prev, endHour: Number(v) }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {END_HOURS.map((h) => (
                              <SelectItem key={h} value={String(h)}>
                                {formatHour(h)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
                        <Select
                          value={String(shiftForm.efficiencyMultiplier)}
                          onValueChange={(v) =>
                            setShiftForm((prev) => ({
                              ...prev,
                              efficiencyMultiplier: Number(v),
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EFFICIENCY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShiftEditingId(null);
                          setShiftForm(getDefaultShiftForm());
                        }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleSaveShift(shift.shiftId)}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {shift.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatHour(shift.startHour)} - {formatHour(shift.endHour)}
                          {" | "}
                          {Math.round(shift.efficiencyMultiplier * 100)}% efficiency
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {shift.teamCount} team{shift.teamCount !== 1 ? "s" : ""}
                        </Badge>
                        {canManage && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => beginEditShift(shift)}
                              title="Edit shift"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleArchiveShift(shift.shiftId)}
                              title="Archive shift"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                            {isConfirmingDelete ? (
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="h-7 w-7"
                                  onClick={() => handleDeleteShift(shift.shiftId)}
                                  title="Confirm delete"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => setConfirmDeleteShiftId(null)}
                                  title="Cancel delete"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => setConfirmDeleteShiftId(shift.shiftId)}
                                title="Delete shift"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Day-of-week display */}
                    <div className="flex gap-1 mt-2">
                      {DAY_LABELS.map((label, idx) => (
                        <span
                          key={idx}
                          className={`h-6 w-6 rounded text-[10px] font-medium flex items-center justify-center ${
                            shift.daysOfWeek.includes(idx)
                              ? "bg-primary/15 text-primary"
                              : "bg-muted/30 text-muted-foreground/40"
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
