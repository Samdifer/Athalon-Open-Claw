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
  GraduationCap,
  Search,
  UserPlus,
  Link2,
  ShieldCheck,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportCSVButton } from "@/src/shared/components/ExportCSVButton";
import { RoleBadge } from "@/src/shared/components/RoleBadge";
import { ACCESS_AUTHORIZATION_LABELS } from "@/lib/mro-access";
import {
  getInitials,
  formatDayRange,
  formatHour,
} from "../shared/rosterConstants";
import type { WorkloadEntry } from "../shared/rosterConstants";
import { ShiftEditor } from "../shared/ShiftEditor";
import { isTechnicalRole } from "@/src/shared/lib/personnelRoles";

type PersonnelProfile = {
  _id: string;
  legalName: string;
  status: "active" | "inactive" | "terminated";
  employeeId?: string;
  email?: string;
  phone?: string;
  role?: string;
  userId?: string;
  accessAuthorizations?: string[];
  ampCertificateNumber?: string;
  iaCertificateNumber?: string;
  ampExpiry?: number;
  iaExpiry?: number;
};

interface PersonnelRosterTabProps {
  profiles: PersonnelProfile[];
  expiringCerts: Array<{
    technician: { _id: string; legalName: string; role?: string } | null;
    cert: { _id: string; iaExpiryDate?: number; certificateNumber?: string };
  }>;
  workloadMap: Map<string, WorkloadEntry>;
  rosterTeams: Array<{ teamId: string; name: string }>;
  canManageRoster: boolean;
  canManageProfiles: boolean;
  canArchiveProfiles: boolean;
  orgId: string | null;
}

type StatusFilter = "all" | "active" | "inactive" | "archived";
type ProfileDialogMode = "create" | "edit";
type ConfirmAction =
  | { type: "archive"; profileId: string; profileName: string }
  | { type: "restore"; profileId: string; profileName: string }
  | null;

type ProfileDraft = {
  legalName: string;
  employeeId: string;
  email: string;
  phone: string;
  ampCertificateNumber: string;
  iaCertificateNumber: string;
  ampExpiry: string;
  iaExpiry: string;
};

const EMPTY_PROFILE_DRAFT: ProfileDraft = {
  legalName: "",
  employeeId: "",
  email: "",
  phone: "",
  ampCertificateNumber: "",
  iaCertificateNumber: "",
  ampExpiry: "",
  iaExpiry: "",
};

function getProfileStatusClass(status: PersonnelProfile["status"]) {
  if (status === "active") {
    return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30";
  }
  if (status === "inactive") {
    return "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30";
  }
  return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
}

function tsToDateInput(ts: number | undefined): string {
  if (!ts) return "";
  return new Date(ts).toISOString().slice(0, 10);
}

function dateInputToTs(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function buildDraftFromProfile(profile: PersonnelProfile): ProfileDraft {
  return {
    legalName: profile.legalName,
    employeeId: profile.employeeId ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    ampCertificateNumber: profile.ampCertificateNumber ?? "",
    iaCertificateNumber: profile.iaCertificateNumber ?? "",
    ampExpiry: tsToDateInput(profile.ampExpiry),
    iaExpiry: tsToDateInput(profile.iaExpiry),
  };
}

export function PersonnelRosterTab({
  profiles,
  expiringCerts,
  workloadMap,
  rosterTeams,
  canManageRoster,
  canManageProfiles,
  canArchiveProfiles,
  orgId,
}: PersonnelRosterTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [teamDraftByTechId, setTeamDraftByTechId] = useState<Record<string, string>>({});
  const [mutatingTeamTechId, setMutatingTeamTechId] = useState<string | null>(null);
  const [profileDialogMode, setProfileDialogMode] = useState<ProfileDialogMode | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PersonnelProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(EMPTY_PROFILE_DRAFT);
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [statusMutatingProfileId, setStatusMutatingProfileId] = useState<string | null>(null);

  const assignTechnicianToRosterTeam = useMutation(
    api.schedulerRoster.assignTechnicianToRosterTeam,
  );
  const clearTechnicianRosterTeam = useMutation(
    api.schedulerRoster.clearTechnicianRosterTeam,
  );
  const createProfile = useMutation(api.userManagement.createProfile);
  const updateProfile = useMutation(api.userManagement.updateProfile);
  const archiveProfile = useMutation(api.userManagement.archiveProfile);
  const restoreProfile = useMutation(api.userManagement.restoreProfile);

  const technicalExpiringCerts = expiringCerts.filter((entry) =>
    isTechnicalRole(entry.technician?.role),
  );

  const expiringTechIds = new Set(
    technicalExpiringCerts.map((entry) => entry.technician?._id).filter(Boolean),
  );

  const expiringCertMap = new Map(
    technicalExpiringCerts.map((entry) => [
      entry.technician?._id,
      {
        iaExpiryDate: entry.cert.iaExpiryDate,
        certNumber: entry.cert.certificateNumber,
        daysUntilExpiry: entry.cert.iaExpiryDate
          ? Math.ceil((entry.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      },
    ]),
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return profiles.filter((profile) => {
      if (statusFilter === "archived" && profile.status !== "terminated") return false;
      if (
        statusFilter !== "all" &&
        statusFilter !== "archived" &&
        profile.status !== statusFilter
      ) {
        return false;
      }

      if (!query) return true;

      return (
        profile.legalName.toLowerCase().includes(query) ||
        (profile.employeeId?.toLowerCase().includes(query) ?? false) ||
        (profile.email?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [profiles, searchQuery, statusFilter]);

  const exportRows = useMemo(
    () =>
      filtered.map((profile) => ({
        name: profile.legalName,
        role: profile.role ?? "",
        status: profile.status,
        linkedAccount: profile.userId ? "Linked" : "Profile only",
        certifications: expiringCertMap.get(profile._id)?.certNumber ?? "",
      })),
    [filtered, expiringCertMap],
  );

  function resetProfileDialog() {
    setProfileDialogMode(null);
    setSelectedProfile(null);
    setProfileDraft(EMPTY_PROFILE_DRAFT);
    setSavingProfile(false);
  }

  function openCreateDialog() {
    setSelectedProfile(null);
    setProfileDraft(EMPTY_PROFILE_DRAFT);
    setProfileDialogMode("create");
  }

  function openEditDialog(profile: PersonnelProfile) {
    setSelectedProfile(profile);
    setProfileDraft(buildDraftFromProfile(profile));
    setProfileDialogMode("edit");
  }

  async function handleSaveProfile() {
    if (!orgId) {
      toast.error("Organization context is required before managing profiles.");
      return;
    }

    const legalName = profileDraft.legalName.trim();
    if (!legalName) {
      toast.error("Legal name is required.");
      return;
    }

    setSavingProfile(true);

    try {
      if (profileDialogMode === "create") {
        await createProfile({
          organizationId: orgId as Id<"organizations">,
          legalName,
          employeeId: profileDraft.employeeId.trim() || undefined,
          email: profileDraft.email.trim() || undefined,
          phone: profileDraft.phone.trim() || undefined,
        });
        toast.success(`Created profile for ${legalName}`);
      } else if (profileDialogMode === "edit" && selectedProfile) {
        await updateProfile({
          technicianId: selectedProfile._id as Id<"technicians">,
          legalName,
          employeeId: profileDraft.employeeId.trim() || null,
          email: profileDraft.email.trim() || null,
          phone: profileDraft.phone.trim() || null,
          ampCertificateNumber: profileDraft.ampCertificateNumber.trim() || null,
          iaCertificateNumber: profileDraft.iaCertificateNumber.trim() || null,
          ampExpiry: dateInputToTs(profileDraft.ampExpiry) ?? null,
          iaExpiry: dateInputToTs(profileDraft.iaExpiry) ?? null,
        });
        toast.success(`Updated profile for ${legalName}`);
      }

      resetProfileDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
      setSavingProfile(false);
    }
  }

  async function handleConfirmProfileStatus() {
    if (!confirmAction) return;

    setStatusMutatingProfileId(confirmAction.profileId);

    try {
      if (confirmAction.type === "archive") {
        await archiveProfile({
          technicianId: confirmAction.profileId as Id<"technicians">,
        });
        toast.success(`Archived ${confirmAction.profileName}`);
      } else {
        await restoreProfile({
          technicianId: confirmAction.profileId as Id<"technicians">,
        });
        toast.success(`Restored ${confirmAction.profileName} to inactive status`);
      }
      setConfirmAction(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile status",
      );
    } finally {
      setStatusMutatingProfileId(null);
    }
  }

  return (
    <div className="space-y-4">
      {technicalExpiringCerts.length > 0 &&
        (() => {
          const hasExpired = technicalExpiringCerts.some(
            (entry) =>
              entry.cert.iaExpiryDate !== undefined &&
              entry.cert.iaExpiryDate < Date.now(),
          );
          const hasCritical = technicalExpiringCerts.some(
            (entry) =>
              entry.cert.iaExpiryDate !== undefined &&
              Math.ceil(
                (entry.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24),
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
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${iconClass}`} />
                <span className={`text-sm font-semibold ${titleClass}`}>
                  {hasExpired
                    ? "IA Certificate Expired — Immediate Action Required"
                    : "IA Certificate Expiry Alert"}
                </span>
              </div>
              <div className="space-y-2">
                {technicalExpiringCerts.map((entry) => {
                  const days =
                    entry.cert.iaExpiryDate !== undefined
                      ? Math.ceil(
                          (entry.cert.iaExpiryDate - Date.now()) /
                            (1000 * 60 * 60 * 24),
                        )
                      : null;
                  const isExpired = days !== null && days <= 0;
                  const isCritical = days !== null && days > 0 && days <= 14;
                  const rowClass = isExpired
                    ? "text-red-600 dark:text-red-400"
                    : isCritical
                      ? "text-red-500 dark:text-red-300"
                      : "text-amber-600 dark:text-amber-300";

                  return (
                    <div
                      key={entry.cert._id}
                      className={`flex items-center justify-between gap-4 text-xs ${rowClass}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium truncate">
                          {entry.technician?.legalName ?? "Unknown Technician"}
                        </span>
                        {entry.cert.certificateNumber && (
                          <span className="font-mono text-[10px] opacity-80">
                            #{entry.cert.certificateNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-semibold">
                          {days === null
                            ? "No expiry date"
                            : isExpired
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

      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Personnel Profiles
                </h2>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Create and maintain personnel records here. Account invites,
                profile linking, and access assignment now live in Settings &gt; Users.
              </p>
            </div>

            {canManageProfiles && (
              <Button className="gap-2 self-start" onClick={openCreateDialog}>
                <UserPlus className="w-4 h-4" />
                New Profile
              </Button>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, employee ID, or email..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger size="sm" className="w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Profiles</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground">
              {filtered.length} profile{filtered.length !== 1 ? "s" : ""}
            </span>

            <ExportCSVButton
              data={exportRows}
              columns={[
                { key: "name", header: "Name" },
                { key: "role", header: "Role" },
                { key: "status", header: "Status" },
                { key: "linkedAccount", header: "Account" },
                { key: "certifications", header: "Certifications" },
              ]}
              fileName="personnel.csv"
              className="h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "No personnel profiles match this filter"
                : "No personnel profiles found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((profile) => {
            const hasExpiringCert = expiringTechIds.has(profile._id);
            const certInfo = expiringCertMap.get(profile._id);
            const hasMissingCerts =
              isTechnicalRole(profile.role) &&
              (!profile.ampCertificateNumber || !profile.iaCertificateNumber);
            const isCritical =
              certInfo?.daysUntilExpiry !== null &&
              certInfo?.daysUntilExpiry !== undefined &&
              certInfo.daysUntilExpiry <= 14;
            const workload = workloadMap.get(profile._id);
            const isEditing = editingTechId === profile._id;
            const isArchived = profile.status === "terminated";
            const isStatusMutationPending = statusMutatingProfileId === profile._id;
            const hasRiiAuthorization = (profile.accessAuthorizations ?? []).includes("rii");

            return (
              <Card
                key={profile._id}
                className={`border-border/60 ${
                  hasExpiringCert
                    ? isCritical
                      ? "border-l-4 border-l-red-500"
                      : "border-l-4 border-l-amber-500"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback className="text-xs font-semibold bg-muted">
                          {getInitials(profile.legalName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium text-sm text-foreground">
                            {profile.legalName}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] border ${getProfileStatusClass(profile.status)}`}
                          >
                            {profile.status === "terminated" ? "archived" : profile.status}
                          </Badge>
                          {profile.employeeId && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              #{profile.employeeId}
                            </span>
                          )}
                          {profile.role && <RoleBadge role={profile.role} />}
                          {hasRiiAuthorization && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              {ACCESS_AUTHORIZATION_LABELS.rii}
                            </Badge>
                          )}
                          {hasMissingCerts && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                            >
                              Incomplete Profile
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <Badge
                            variant="outline"
                            className={`border ${
                              profile.userId
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-border/60 bg-muted/30 text-muted-foreground"
                            }`}
                          >
                            <Link2 className="w-3 h-3 mr-1" />
                            {profile.userId ? "Linked account" : "Profile only"}
                          </Badge>
                          {!profile.role && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border/60 bg-muted/30 text-muted-foreground"
                            >
                              Access assigned in Settings &gt; Users
                            </Badge>
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
                              {certInfo.certNumber ? ` (${certInfo.certNumber})` : ""}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {profile.email && (
                              <span className="text-[11px] text-muted-foreground">
                                {profile.email}
                              </span>
                            )}
                            {profile.phone && (
                              <>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {profile.phone}
                                </span>
                              </>
                            )}
                            {!profile.email && !profile.phone && (
                              <span className="text-[11px] text-muted-foreground">
                                No contact info
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-stretch gap-2 sm:min-w-[148px]">
                        {canManageProfiles && !isArchived && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => openEditDialog(profile)}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit Profile
                          </Button>
                        )}

                        {canArchiveProfiles && !isArchived && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-red-500/30 text-red-600 hover:text-red-600 dark:text-red-400"
                            disabled={isStatusMutationPending}
                            onClick={() => {
                              if (profile.userId) {
                                toast.error(
                                  "Remove the linked account from Settings > Users before archiving this profile.",
                                );
                                return;
                              }
                              setConfirmAction({
                                type: "archive",
                                profileId: profile._id,
                                profileName: profile.legalName,
                              });
                            }}
                          >
                            <Archive className="w-3 h-3 mr-1" />
                            Archive
                          </Button>
                        )}

                        {canArchiveProfiles && isArchived && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={isStatusMutationPending}
                            onClick={() =>
                              setConfirmAction({
                                type: "restore",
                                profileId: profile._id,
                                profileName: profile.legalName,
                              })
                            }
                          >
                            <ArchiveRestore className="w-3 h-3 mr-1" />
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>

                    {workload && (
                      <div className="pt-2.5 border-t border-border/40">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                            <span className="font-medium text-foreground/80">
                              {formatDayRange(workload.daysOfWeek)}
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                            <span>
                              {formatHour(workload.startHour)}–{formatHour(workload.endHour)}
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                            <span>&times;{workload.efficiencyMultiplier.toFixed(1)}</span>
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
                              {workload.estimatedRemainingHours.toFixed(1)}h remaining
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                              asChild
                            >
                              <Link to={`/personnel/${profile._id}/training`}>
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
                              <Link to={`/personnel/${profile._id}/career`}>
                                Career
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setEditingTechId(isEditing ? null : profile._id)
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

                        {isEditing && orgId && (
                          <ShiftEditor
                            technicianId={profile._id as Id<"technicians">}
                            orgId={orgId as Id<"organizations">}
                            initial={workload}
                            onClose={() => setEditingTechId(null)}
                          />
                        )}

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
                                  teamDraftByTechId[profile._id] ??
                                  workload.teamId ??
                                  "__unassigned__"
                                }
                                onValueChange={(value) =>
                                  setTeamDraftByTechId((previous) => ({
                                    ...previous,
                                    [profile._id]: value,
                                  }))
                                }
                                disabled={
                                  !canManageRoster || mutatingTeamTechId === profile._id
                                }
                              >
                                <SelectTrigger size="sm" className="w-[240px] text-xs">
                                  <SelectValue placeholder="Select roster team" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__unassigned__">
                                    Unassigned
                                  </SelectItem>
                                  {rosterTeams.map((team) => (
                                    <SelectItem key={team.teamId} value={team.teamId}>
                                      {team.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                className="h-7 text-xs px-3"
                                disabled={
                                  !canManageRoster || mutatingTeamTechId === profile._id
                                }
                                onClick={async () => {
                                  if (!orgId) return;
                                  const selectedTeamId =
                                    teamDraftByTechId[profile._id] ??
                                    workload.teamId ??
                                    "__unassigned__";
                                  setMutatingTeamTechId(profile._id);
                                  try {
                                    if (selectedTeamId === "__unassigned__") {
                                      await clearTechnicianRosterTeam({
                                        organizationId: orgId as Id<"organizations">,
                                        technicianId: profile._id as Id<"technicians">,
                                      });
                                    } else {
                                      await assignTechnicianToRosterTeam({
                                        organizationId: orgId as Id<"organizations">,
                                        technicianId: profile._id as Id<"technicians">,
                                        teamId: selectedTeamId as Id<"rosterTeams">,
                                      });
                                    }
                                    toast.success("Roster team updated");
                                  } catch (error) {
                                    toast.error(
                                      error instanceof Error
                                        ? error.message
                                        : "Failed to update roster team",
                                    );
                                  } finally {
                                    setMutatingTeamTechId(null);
                                  }
                                }}
                              >
                                {mutatingTeamTechId === profile._id
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={profileDialogMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            resetProfileDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {profileDialogMode === "create" ? "Create Personnel Profile" : "Edit Personnel Profile"}
            </DialogTitle>
            <DialogDescription>
              {profileDialogMode === "create"
                ? "Create the personnel record first. Account invites, profile mapping, and access privileges are managed separately in Settings > Users."
                : "Update the personnel profile details here. Account mapping and access privileges remain in Settings > Users."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="profile-legal-name">Legal name</Label>
              <Input
                id="profile-legal-name"
                value={profileDraft.legalName}
                onChange={(event) =>
                  setProfileDraft((previous) => ({
                    ...previous,
                    legalName: event.target.value,
                  }))
                }
                placeholder="Taylor Morgan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-employee-id">Employee ID</Label>
              <Input
                id="profile-employee-id"
                value={profileDraft.employeeId}
                onChange={(event) =>
                  setProfileDraft((previous) => ({
                    ...previous,
                    employeeId: event.target.value,
                  }))
                }
                placeholder="A-1042"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                value={profileDraft.phone}
                onChange={(event) =>
                  setProfileDraft((previous) => ({
                    ...previous,
                    phone: event.target.value,
                  }))
                }
                placeholder="(555) 555-0182"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileDraft.email}
                onChange={(event) =>
                  setProfileDraft((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                placeholder="taylor@repairstation.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-amp-cert">A&amp;P Certificate #</Label>
              <Input
                id="profile-amp-cert"
                value={profileDraft.ampCertificateNumber}
                onChange={(event) =>
                  setProfileDraft((previous) => ({
                    ...previous,
                    ampCertificateNumber: event.target.value,
                  }))
                }
                placeholder="e.g. 4135901"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-amp-expiry">A&amp;P Expiry</Label>
              <Input
                id="profile-amp-expiry"
                type="date"
                value={profileDraft.ampExpiry}
                onChange={(event) =>
                  setProfileDraft((previous) => ({
                    ...previous,
                    ampExpiry: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-ia-cert">IA Certificate #</Label>
              <Input
                id="profile-ia-cert"
                value={profileDraft.iaCertificateNumber}
                onChange={(event) =>
                  setProfileDraft((previous) => ({
                    ...previous,
                    iaCertificateNumber: event.target.value,
                  }))
                }
                placeholder="e.g. IA-7291"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-ia-expiry">IA Expiry</Label>
              <Input
                id="profile-ia-expiry"
                type="date"
                value={profileDraft.iaExpiry}
                onChange={(event) =>
                  setProfileDraft((previous) => ({
                    ...previous,
                    iaExpiry: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetProfileDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile
                ? profileDialogMode === "create"
                  ? "Creating..."
                  : "Saving..."
                : profileDialogMode === "create"
                  ? "Create Profile"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "archive"
                ? "Archive Personnel Profile"
                : "Restore Personnel Profile"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "archive"
                ? `Archive ${confirmAction.profileName} and retain their historical records. Linked user accounts must already be removed from Settings > Users before archiving.`
                : `Restore ${confirmAction?.profileName} as inactive so the profile can be reviewed and reactivated later if needed.`}
            </DialogDescription>
          </DialogHeader>

          {confirmAction?.type === "archive" && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/8 p-3 text-xs text-muted-foreground">
              Offboarding follows a disable-and-archive workflow. This action preserves contact, audit, and work history while removing the profile from the active roster.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === "archive" ? "destructive" : "default"}
              onClick={handleConfirmProfileStatus}
              disabled={
                !!confirmAction &&
                statusMutatingProfileId === confirmAction.profileId
              }
            >
              {confirmAction &&
              statusMutatingProfileId === confirmAction.profileId
                ? confirmAction.type === "archive"
                  ? "Archiving..."
                  : "Restoring..."
                : confirmAction?.type === "archive"
                  ? "Archive Profile"
                  : "Restore Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
