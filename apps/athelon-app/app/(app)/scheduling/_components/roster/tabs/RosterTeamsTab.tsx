"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type {
  RosterShiftRow,
  RosterTeamRow,
  RosterTechnicianRow,
} from "../types";

// ─── Team color swatch definitions ──────────────────────────────────────────

const TEAM_COLORS = [
  { token: "bg-slate-500", label: "Slate" },
  { token: "bg-red-500", label: "Red" },
  { token: "bg-amber-500", label: "Amber" },
  { token: "bg-emerald-500", label: "Emerald" },
  { token: "bg-cyan-500", label: "Cyan" },
  { token: "bg-blue-500", label: "Blue" },
  { token: "bg-violet-500", label: "Violet" },
  { token: "bg-rose-500", label: "Rose" },
  { token: "bg-indigo-500", label: "Indigo" },
  { token: "bg-orange-500", label: "Orange" },
  { token: "bg-sky-500", label: "Sky" },
] as const;

type TeamColorToken = (typeof TEAM_COLORS)[number]["token"];

function normalizeTeamColorToken(token: string): TeamColorToken {
  if (TEAM_COLORS.some((entry) => entry.token === token)) {
    return token as TeamColorToken;
  }
  return TEAM_COLORS[0].token;
}

function getShiftLabel(shift: RosterShiftRow): string {
  return shift.name;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface RosterTeamsTabProps {
  teams: RosterTeamRow[];
  shifts: RosterShiftRow[];
  technicians: RosterTechnicianRow[];
  canManage: boolean;
  organizationId: Id<"organizations">;
  shopLocationId?: Id<"shopLocations"> | "all";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RosterTeamsTab({
  teams,
  shifts,
  technicians,
  canManage,
  organizationId,
  shopLocationId,
}: RosterTeamsTabProps) {
  // --- Team form state ---
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState<TeamColorToken>(TEAM_COLORS[4].token);
  const [newTeamShiftId, setNewTeamShiftId] = useState<string>("");

  const [teamEditingId, setTeamEditingId] = useState<string | null>(null);
  const [teamEditName, setTeamEditName] = useState("");
  const [teamEditColor, setTeamEditColor] = useState<TeamColorToken>(TEAM_COLORS[0].token);
  const [teamEditShiftId, setTeamEditShiftId] = useState<string>("");

  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null);

  // --- Assign technician state ---
  const [assignTechId, setAssignTechId] = useState<string>("");
  const [assignTeamId, setAssignTeamId] = useState<string>("");

  // --- Mutations ---
  const createTeam = useMutation(api.schedulerRoster.createRosterTeam);
  const updateTeam = useMutation(api.schedulerRoster.updateRosterTeam);
  const archiveTeam = useMutation(api.schedulerRoster.archiveRosterTeam);
  const deleteTeam = useMutation(api.schedulerRoster.deleteRosterTeam);
  const assignTechToTeam = useMutation(api.schedulerRoster.assignTechnicianToRosterTeam);
  const clearTechTeam = useMutation(api.schedulerRoster.clearTechnicianRosterTeam);

  const effectiveNewTeamShiftId = newTeamShiftId || (shifts[0]?.shiftId ?? "");

  // --- Handlers ---
  async function handleCreateTeam() {
    if (!newTeamName.trim() || !effectiveNewTeamShiftId) return;
    try {
      await createTeam({
        organizationId,
        shopLocationId: shopLocationId === "all" ? undefined : shopLocationId,
        name: newTeamName,
        colorToken: newTeamColor,
        shiftId: effectiveNewTeamShiftId as Id<"rosterShifts">,
      });
      setNewTeamName("");
      setNewTeamColor(TEAM_COLORS[4].token);
      setNewTeamShiftId("");
      setShowCreateTeam(false);
      toast.success("Roster team created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create team");
    }
  }

  function beginEditTeam(team: RosterTeamRow) {
    setTeamEditingId(team.teamId);
    setTeamEditName(team.name);
    setTeamEditColor(normalizeTeamColorToken(team.colorToken));
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

  async function handleArchiveTeam(teamId: string) {
    try {
      await archiveTeam({ teamId: teamId as Id<"rosterTeams">, organizationId });
      toast.success("Team archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive team");
    }
  }

  async function handleDeleteTeam(teamId: string) {
    try {
      await deleteTeam({ teamId: teamId as Id<"rosterTeams">, organizationId });
      setConfirmDeleteTeamId(null);
      toast.success("Team deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete team");
    }
  }

  async function handleMoveTeam(teamId: string, direction: "up" | "down") {
    const index = teams.findIndex((team) => team.teamId === teamId);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= teams.length) return;

    const current = teams[index];
    const target = teams[targetIndex];
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

  async function handleClearAssignment() {
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
  }

  return (
    <div className="space-y-6">
      {/* ── Header + Add button ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          Teams
          <Badge variant="secondary" className="ml-1">{teams.length}</Badge>
        </h3>
        <div className="flex items-center gap-2">
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
      </div>

      {/* ── Create Team Form ──────────────────────────────────────────── */}
      {showCreateTeam && canManage && (
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              data-testid="roster-team-name-input"
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
                    {getShiftLabel(shift)}
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
                data-testid="roster-team-create-button"
              >
                Create Team
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Assign Technician ─────────────────────────────────────────── */}
      {canManage && teams.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Assign Technician to Team
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Select value={assignTechId} onValueChange={setAssignTechId}>
                <SelectTrigger>
                  <SelectValue placeholder="Technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
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
                  {teams.map((team) => (
                    <SelectItem key={team.teamId} value={team.teamId}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleAssignTechnician}
                  disabled={!assignTechId || !assignTeamId}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Assign
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearAssignment}
                  disabled={!assignTechId}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Team List ─────────────────────────────────────────────────── */}
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
          <Card
            key={team.teamId}
            className="border-border/60"
            data-testid={`roster-team-row-${team.teamId}`}
          >
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
                          {getShiftLabel(shift)}
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
                    <Button size="sm" variant="ghost" onClick={() => setTeamEditingId(null)}>
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
                    <span className={`h-3.5 w-3.5 rounded-full flex-shrink-0 ${team.colorToken}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{team.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {team.shiftName && (
                          <Badge variant="outline" className="text-[10px]">
                            {team.shiftName}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {team.memberCount} member{team.memberCount !== 1 ? "s" : ""} · {team.onShiftCount} on shift
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
                          onClick={() => handleMoveTeam(team.teamId, "up")}
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleMoveTeam(team.teamId, "down")}
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
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
  );
}
