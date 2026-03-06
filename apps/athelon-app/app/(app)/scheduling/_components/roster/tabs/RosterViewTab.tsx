"use client";

import { useMemo, useState } from "react";
import { Search, Clock3, Shield, AlertTriangle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatHour } from "@/app/(app)/personnel/_components/shared/rosterConstants";
import type { RosterTechnicianRow, RosterFocus } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GroupedShiftRow {
  shiftId: string;
  name: string;
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
  teams: Array<{
    teamId: string;
    name: string;
    colorToken: string;
    memberCount: number;
    onShiftCount: number;
    isUnsupervised: boolean;
    technicians: RosterTechnicianRow[];
  }>;
}

interface RosterViewTabProps {
  groupedShiftRows: GroupedShiftRow[];
  unassignedTechs: RosterTechnicianRow[];
  observedHoliday: RosterFocus["observedHoliday"];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RosterViewTab({
  groupedShiftRows,
  unassignedTechs,
  observedHoliday,
}: RosterViewTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "on_shift" | "off_shift">("all");

  // Filter technicians within each group
  const filteredShiftRows = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return groupedShiftRows.map((shift) => ({
      ...shift,
      teams: shift.teams.map((team) => ({
        ...team,
        technicians: team.technicians.filter((tech) => {
          // Search filter
          if (query) {
            const nameMatch = tech.name.toLowerCase().includes(query);
            const idMatch = tech.employeeId?.toLowerCase().includes(query);
            if (!nameMatch && !idMatch) return false;
          }
          // Status filter
          if (statusFilter === "on_shift" && !tech.isOnShiftToday) return false;
          if (statusFilter === "off_shift" && tech.isOnShiftToday) return false;
          return true;
        }),
      })),
    }));
  }, [groupedShiftRows, searchQuery, statusFilter]);

  const filteredUnassigned = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return unassignedTechs.filter((tech) => {
      if (query) {
        const nameMatch = tech.name.toLowerCase().includes(query);
        const idMatch = tech.employeeId?.toLowerCase().includes(query);
        if (!nameMatch && !idMatch) return false;
      }
      if (statusFilter === "on_shift" && !tech.isOnShiftToday) return false;
      if (statusFilter === "off_shift" && tech.isOnShiftToday) return false;
      return true;
    });
  }, [unassignedTechs, searchQuery, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "on_shift" | "off_shift")}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="on_shift">On Shift</SelectItem>
            <SelectItem value="off_shift">Off Shift</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Holiday Alert */}
      {observedHoliday && (
        <Card className="border-amber-500/40">
          <CardContent className="p-3 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Holiday observed: {observedHoliday.name}. No shifts are considered active.
          </CardContent>
        </Card>
      )}

      {/* Shift-Grouped Roster */}
      {filteredShiftRows.map((shift) => (
        <Card key={shift.shiftId} className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                {shift.name}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {formatHour(shift.startHour)}–{formatHour(shift.endHour)} | {Math.round(shift.efficiencyMultiplier * 100)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {shift.teams.length === 0 && (
              <p className="text-xs text-muted-foreground">No teams linked to this shift.</p>
            )}
            {shift.teams.map((team) => (
              <div key={team.teamId} className="rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-3 w-3 rounded-full flex-shrink-0 ${team.colorToken}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">{team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {team.onShiftCount}/{team.memberCount} on shift
                      </p>
                    </div>
                  </div>
                  {team.isUnsupervised ? (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px]">
                      <Shield className="h-3 w-3 mr-1" />
                      UNSUPERVISED
                    </Badge>
                  ) : team.memberCount > 0 ? (
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 text-[10px]">
                      Covered
                    </Badge>
                  ) : null}
                </div>

                {team.technicians.length > 0 && (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {team.technicians.map((tech) => (
                      <div
                        key={tech.technicianId}
                        className="rounded-md border border-border/40 px-2.5 py-2 flex items-center gap-2.5"
                      >
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback className="text-[10px] bg-muted">
                            {getInitials(tech.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-foreground font-medium truncate">{tech.name}</p>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {tech.assignedActiveCards} cards
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {tech.employeeId ? `#${tech.employeeId} · ` : ""}
                            {Math.round(tech.estimatedRemainingHours)}h remaining
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Unassigned Technicians */}
      {filteredUnassigned.length > 0 && (
        <Card className="border-red-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Unassigned Technicians
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {filteredUnassigned.map((tech) => (
              <div key={tech.technicianId} className="flex items-center gap-2.5 py-1">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarFallback className="text-[9px] bg-muted">
                    {getInitials(tech.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground">{tech.name}</span>
                {tech.employeeId && (
                  <span className="text-[10px] text-muted-foreground font-mono">#{tech.employeeId}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
