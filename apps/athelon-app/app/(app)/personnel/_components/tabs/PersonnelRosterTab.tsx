"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  Pencil,
  X,
  Check,
  GraduationCap,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getInitials,
  getRoleBadge,
  formatDayRange,
  formatHour,
  DAY_LABELS,
} from "../shared/rosterConstants";
import type { WorkloadEntry } from "../shared/rosterConstants";
import { ShiftEditor } from "../shared/ShiftEditor";
import { ExportCSVButton } from "@/src/shared/components/ExportCSVButton";

// ─── Props ──────────────────────────────────────────────────────────────────

interface PersonnelRosterTabProps {
  technicians: Array<{
    _id: string;
    legalName: string;
    status: string;
    employeeId?: string;
    email?: string;
    phone?: string;
    role?: string;
  }>;
  expiringCerts: Array<{
    technician: { _id: string; legalName: string } | null;
    cert: { _id: string; iaExpiryDate?: number; certificateNumber?: string };
  }>;
  workloadMap: Map<string, WorkloadEntry>;
  rosterTeams: Array<{ teamId: string; name: string }>;
  canManageRoster: boolean;
  orgId: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PersonnelRosterTab({
  technicians,
  expiringCerts,
  workloadMap,
  rosterTeams,
  canManageRoster,
  orgId,
}: PersonnelRosterTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [teamDraftByTechId, setTeamDraftByTechId] = useState<Record<string, string>>({});
  const [mutatingTeamTechId, setMutatingTeamTechId] = useState<string | null>(null);

  const assignTechnicianToRosterTeam = useMutation(
    api.schedulerRoster.assignTechnicianToRosterTeam,
  );
  const clearTechnicianRosterTeam = useMutation(
    api.schedulerRoster.clearTechnicianRosterTeam,
  );

  // Build lookup sets for expiring certs
  const expiringTechIds = new Set(
    expiringCerts.map((e) => e.technician?._id).filter(Boolean),
  );

  const expiringCertMap = new Map(
    expiringCerts.map((e) => [
      e.technician?._id,
      {
        iaExpiryDate: e.cert.iaExpiryDate,
        certNumber: e.cert.certificateNumber,
        daysUntilExpiry: e.cert.iaExpiryDate
          ? Math.ceil((e.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      },
    ]),
  );

  // Filter technicians
  const filtered = technicians.filter((tech) => {
    // Status filter
    if (statusFilter !== "all" && tech.status !== statusFilter) return false;
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = tech.legalName.toLowerCase().includes(q);
      const idMatch = tech.employeeId?.toLowerCase().includes(q) ?? false;
      if (!nameMatch && !idMatch) return false;
    }
    return true;
  });

  const exportRows = useMemo(
    () =>
      filtered.map((tech) => ({
        name: tech.legalName,
        role: tech.role ?? "",
        status: tech.status,
        certifications: expiringCertMap.get(tech._id)?.certNumber ?? "",
      })),
    [filtered, expiringCertMap],
  );

  return (
    <div className="space-y-4">
      {/* ── IA Cert Expiry Banner ──────────────────────────────────────────── */}
      {expiringCerts.length > 0 &&
        (() => {
          const hasExpired = expiringCerts.some(
            (e) =>
              e.cert.iaExpiryDate !== undefined &&
              e.cert.iaExpiryDate < Date.now(),
          );
          const hasCritical = expiringCerts.some(
            (e) =>
              e.cert.iaExpiryDate !== undefined &&
              Math.ceil(
                (e.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24),
              ) <= 14,
          );
          const bannerClass =
            hasExpired || hasCritical
              ? "border-red-500/40 bg-red-500/8"
              : "border-amber-500/40 bg-amber-500/8";
          const iconClass =
            hasExpired || hasCritical
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400";
          const titleClass =
            hasExpired || hasCritical
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400";

          return (
            <div
              className={`rounded-lg border p-4 space-y-3 ${bannerClass}`}
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`w-4 h-4 flex-shrink-0 ${iconClass}`}
                />
                <span className={`text-sm font-semibold ${titleClass}`}>
                  {hasExpired
                    ? "IA Certificate Expired — Immediate Action Required"
                    : "IA Certificate Expiry Alert"}
                </span>
              </div>
              <div className="space-y-2">
                {expiringCerts.map((e) => {
                  const days =
                    e.cert.iaExpiryDate !== undefined
                      ? Math.ceil(
                          (e.cert.iaExpiryDate - Date.now()) /
                            (1000 * 60 * 60 * 24),
                        )
                      : null;
                  const isExp = days !== null && days <= 0;
                  const isCrit = days !== null && days > 0 && days <= 14;
                  const rowClass = isExp
                    ? "text-red-600 dark:text-red-400"
                    : isCrit
                      ? "text-red-500 dark:text-red-300"
                      : "text-amber-600 dark:text-amber-300";
                  return (
                    <div
                      key={e.cert._id}
                      className={`flex items-center justify-between gap-4 text-xs ${rowClass}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium truncate">
                          {e.technician?.legalName ?? "Unknown Technician"}
                        </span>
                        {e.cert.certificateNumber && (
                          <span className="font-mono text-[10px] opacity-80">
                            #{e.cert.certificateNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-semibold">
                          {days === null
                            ? "No expiry date"
                            : isExp
                              ? `Expired ${Math.abs(days)}d ago`
                              : `${days}d remaining`}
                        </span>
                        <Link
                          to="/settings/shop"
                          className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 transition-opacity"
                        >
                          Take Action
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                Technicians with expired IA certificates may not perform
                inspection-level sign-offs. Per 14 CFR 65.93, renewal must be
                completed before the next inspection sign-off.
              </p>
            </div>
          );
        })()}

      {/* ── Search + Status Filter ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}
        >
          <SelectTrigger size="sm" className="w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} technician{filtered.length !== 1 ? "s" : ""}
        </span>
        <ExportCSVButton
          data={exportRows}
          columns={[
            { key: "name", header: "Name" },
            { key: "role", header: "Role" },
            { key: "status", header: "Status" },
            { key: "certifications", header: "Certifications" },
          ]}
          fileName="personnel.csv"
          className="h-8 text-xs"
        />
      </div>

      {/* ── Technician Card List ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "No technicians match your search"
                : "No technicians found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((tech) => {
            const hasExpiringCert = expiringTechIds.has(tech._id);
            const certInfo = expiringCertMap.get(tech._id);
            const isCritical =
              certInfo?.daysUntilExpiry !== null &&
              certInfo?.daysUntilExpiry !== undefined &&
              certInfo.daysUntilExpiry <= 14;

            const workload = workloadMap.get(tech._id);
            const isEditing = editingTechId === tech._id;

            return (
              <Card
                key={tech._id}
                className={`border-border/60 ${
                  hasExpiringCert
                    ? isCritical
                      ? "border-l-4 border-l-red-500"
                      : "border-l-4 border-l-amber-500"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="text-xs font-semibold bg-muted">
                        {getInitials(tech.legalName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-sm text-foreground">
                          {tech.legalName}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] border ${getRoleBadge(tech.status)}`}
                        >
                          {tech.status}
                        </Badge>
                        {tech.employeeId && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            #{tech.employeeId}
                          </span>
                        )}
                      </div>

                      {hasExpiringCert && certInfo ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <ShieldAlert
                            className={`w-3 h-3 flex-shrink-0 ${
                              isCritical
                                ? "text-red-600 dark:text-red-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          />
                          <span
                            className={`text-[11px] font-medium ${
                              isCritical
                                ? "text-red-600 dark:text-red-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            IA cert expires in {certInfo.daysUntilExpiry}d
                            {certInfo.certNumber
                              ? ` (${certInfo.certNumber})`
                              : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 mt-0.5">
                          {tech.email && (
                            <span className="text-[11px] text-muted-foreground">
                              {tech.email}
                            </span>
                          )}
                          {tech.phone && (
                            <>
                              <span className="text-muted-foreground/40">
                                ·
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {tech.phone}
                              </span>
                            </>
                          )}
                          {!tech.email && !tech.phone && (
                            <span className="text-[11px] text-muted-foreground">
                              No contact info
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Shift summary row ──────────────────────────────── */}
                  {workload && (
                    <div className="mt-2.5 pt-2.5 border-t border-border/40">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                          <span className="font-medium text-foreground/80">
                            {formatDayRange(workload.daysOfWeek)}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span>
                            {formatHour(workload.startHour)}–
                            {formatHour(workload.endHour)}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span>
                            &times;{workload.efficiencyMultiplier.toFixed(1)}
                          </span>
                          {workload.usingDefaultShift && (
                            <span className="text-muted-foreground/60 italic">
                              (default)
                            </span>
                          )}
                          {workload.usingTeamShift && (
                            <span className="text-muted-foreground/60 italic">
                              (team shift)
                            </span>
                          )}
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-muted-foreground/70">
                            {workload.assignedActiveCards} card
                            {workload.assignedActiveCards !== 1 ? "s" : ""}
                            {" · "}
                            {workload.estimatedRemainingHours.toFixed(1)}h
                            remaining
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                            asChild
                          >
                            <Link to="/personnel/training">
                              <GraduationCap className="w-3 h-3 mr-1" />
                              Training
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                            asChild
                          >
                            <Link to={`/personnel/${tech._id}/career`}>
                              Career
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setEditingTechId(isEditing ? null : tech._id)
                            }
                          >
                            {isEditing ? (
                              <>
                                <X className="w-3 h-3 mr-1" />
                                Close
                              </>
                            ) : (
                              <>
                                <Pencil className="w-3 h-3 mr-1" />
                                Edit Shift
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* ── Inline shift editor ──────────────────────── */}
                      {isEditing && orgId && (
                        <ShiftEditor
                          technicianId={tech._id as Id<"technicians">}
                          orgId={orgId as Id<"organizations">}
                          initial={workload}
                          onClose={() => setEditingTechId(null)}
                        />
                      )}

                      {/* ── Roster team assignment ───────────────────── */}
                      {rosterTeams.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-border/40 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Roster Team
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] border-border/50 ${
                                  workload.teamColorToken ?? "bg-muted/20"
                                }`}
                              >
                                {workload.teamName ?? "Unassigned"}
                              </Badge>
                            </div>
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                            >
                              <Link to="/scheduling/roster">
                                Open Roster Workspace
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Link>
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Select
                              value={
                                teamDraftByTechId[tech._id] ??
                                workload.teamId ??
                                "__unassigned__"
                              }
                              onValueChange={(value) =>
                                setTeamDraftByTechId((prev) => ({
                                  ...prev,
                                  [tech._id]: value,
                                }))
                              }
                              disabled={
                                !canManageRoster ||
                                mutatingTeamTechId === tech._id
                              }
                            >
                              <SelectTrigger
                                size="sm"
                                className="w-[240px] text-xs"
                              >
                                <SelectValue placeholder="Select roster team" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__unassigned__">
                                  Unassigned
                                </SelectItem>
                                {rosterTeams.map((team) => (
                                  <SelectItem
                                    key={team.teamId}
                                    value={team.teamId}
                                  >
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-7 text-xs px-3"
                              disabled={
                                !canManageRoster ||
                                mutatingTeamTechId === tech._id
                              }
                              onClick={async () => {
                                if (!orgId) return;
                                const selectedTeamId =
                                  teamDraftByTechId[tech._id] ??
                                  workload.teamId ??
                                  "__unassigned__";
                                setMutatingTeamTechId(tech._id);
                                try {
                                  if (selectedTeamId === "__unassigned__") {
                                    await clearTechnicianRosterTeam({
                                      organizationId:
                                        orgId as Id<"organizations">,
                                      technicianId:
                                        tech._id as Id<"technicians">,
                                    });
                                  } else {
                                    await assignTechnicianToRosterTeam({
                                      organizationId:
                                        orgId as Id<"organizations">,
                                      technicianId:
                                        tech._id as Id<"technicians">,
                                      teamId:
                                        selectedTeamId as Id<"rosterTeams">,
                                    });
                                  }
                                  toast.success("Roster team updated");
                                } catch (err) {
                                  toast.error(
                                    err instanceof Error
                                      ? err.message
                                      : "Failed to update roster team",
                                  );
                                } finally {
                                  setMutatingTeamTechId(null);
                                }
                              }}
                            >
                              {mutatingTeamTechId === tech._id
                                ? "Saving..."
                                : "Apply Team"}
                            </Button>
                          </div>
                          {!canManageRoster && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">
                              Admin, shop manager, or lead technician role
                              required to change team assignments.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
