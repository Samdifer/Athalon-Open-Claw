"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useOrganization } from "@clerk/clerk-react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  RefreshCw,
  ShieldCheck,
  Link2,
  Unlink2,
  Mail,
  UserRoundMinus,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { RoleGuard } from "@/components/RoleGuard";
import { RoleBadge } from "@/src/shared/components/RoleBadge";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  ACCESS_AUTHORIZATION_DESCRIPTIONS,
  ACCESS_AUTHORIZATION_LABELS,
  MRO_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  normalizeRole,
  type MroRole,
} from "@/lib/mro-access";

type DirectoryTechnician = {
  _id: string;
  legalName: string;
  status: "active" | "inactive" | "terminated";
  employeeId?: string;
  email?: string;
  phone?: string;
  role?: string;
  userId?: string;
  accessAuthorizations?: string[];
};

type OrganizationInvitation = {
  invitationId: string;
  emailAddress: string;
  status: string;
  role: string;
  createdAt?: number | null;
  updatedAt?: number | null;
  expiresAt?: number | null;
  url?: string | null;
};

type OrganizationMember = {
  membershipId: string;
  userId: string | null;
  clerkRole: string;
  emailAddress: string | null;
  fullName: string;
  linkedProfile: {
    technicianId: string;
    legalName: string;
    status: string;
    role: string | null;
    accessAuthorizations: string[];
  } | null;
};

type OrganizationAccountsResult = {
  organization: {
    _id: string;
    name: string;
    clerkOrganizationId: string | null;
  };
  mappingRequired: boolean;
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
};

type AccessDraft = {
  role: MroRole;
  hasRii: boolean;
};

function formatDateTime(value: number | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function getStatusBadgeClass(status: DirectoryTechnician["status"]) {
  if (status === "active") {
    return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30";
  }
  if (status === "inactive") {
    return "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30";
  }
  return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
}

function buildAccessDraft(technician: DirectoryTechnician): AccessDraft {
  return {
    role: normalizeRole(technician.role),
    hasRii: (technician.accessAuthorizations ?? []).includes("rii"),
  };
}

function LoadingGrid() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[360px] w-full" />
    </div>
  );
}

const roleOptions = MRO_ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
  description: ROLE_DESCRIPTIONS[role],
}));

export default function UsersSettingsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <UsersSettingsContent />
    </RoleGuard>
  );
}

function UsersSettingsContent() {
  const { orgId } = useCurrentOrg();
  const { organization: clerkOrganization } = useOrganization();
  const directory = useQuery(
    api.userManagement.getAdminDirectory,
    orgId ? { organizationId: orgId } : "skip",
  );
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: directory === undefined,
  });

  const listOrganizationAccounts = useAction(
    api.userManagementActions.listOrganizationAccounts,
  );
  const sendOrganizationInvite = useAction(
    api.userManagementActions.sendOrganizationInvite,
  );
  const revokeOrganizationInvite = useAction(
    api.userManagementActions.revokeOrganizationInvite,
  );
  const removeOrganizationMember = useAction(
    api.userManagementActions.removeOrganizationMember,
  );

  const setClerkOrganizationMapping = useMutation(
    api.gapFixes.setClerkOrganizationMapping,
  );
  const linkMemberToProfile = useMutation(api.userManagement.linkMemberToProfile);
  const unlinkMemberFromProfile = useMutation(api.userManagement.unlinkMemberFromProfile);
  const updateAccessControl = useMutation(api.userManagement.updateAccessControl);

  const [activeTab, setActiveTab] = useState("accounts");
  const [inviteEmail, setInviteEmail] = useState("");
  const [accountsRefreshKey, setAccountsRefreshKey] = useState(0);
  const [accountsDirectory, setAccountsDirectory] = useState<OrganizationAccountsResult | null>(
    null,
  );
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({});
  const [linkingMemberKey, setLinkingMemberKey] = useState<string | null>(null);
  const [unlinkingTechnicianId, setUnlinkingTechnicianId] = useState<string | null>(null);
  const [mappingCurrentClerkOrg, setMappingCurrentClerkOrg] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<OrganizationMember | null>(null);
  const [removingMemberUserId, setRemovingMemberUserId] = useState<string | null>(null);
  const [accessDrafts, setAccessDrafts] = useState<Record<string, AccessDraft>>({});
  const [savingAccessTechnicianId, setSavingAccessTechnicianId] = useState<string | null>(null);

  useEffect(() => {
    if (prereq.state !== "ready" || !orgId) return;

    let cancelled = false;
    setAccountsLoading(true);
    setAccountsError(null);

    void (async () => {
      try {
        const result = await listOrganizationAccounts({
          organizationId: orgId as Id<"organizations">,
        });
        if (!cancelled) {
          setAccountsDirectory(result as OrganizationAccountsResult);
        }
      } catch (error) {
        if (!cancelled) {
          setAccountsError(
            error instanceof Error
              ? error.message
              : "Failed to load organization account data.",
          );
        }
      } finally {
        if (!cancelled) {
          setAccountsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listOrganizationAccounts, orgId, prereq.state, accountsRefreshKey]);

  useEffect(() => {
    if (!directory) return;

    const nextDrafts: Record<string, AccessDraft> = {};
    for (const technician of directory.technicians as DirectoryTechnician[]) {
      if (technician.userId && technician.status !== "terminated") {
        nextDrafts[technician._id] = buildAccessDraft(technician);
      }
    }
    setAccessDrafts(nextDrafts);
  }, [directory]);

  const technicians = (directory?.technicians ?? []) as DirectoryTechnician[];
  const accounts = accountsDirectory;
  const mappingRequired = accounts?.mappingRequired ?? false;

  const memberByUserId = useMemo(
    () =>
      new Map(
        (accounts?.members ?? [])
          .filter((member) => Boolean(member.userId))
          .map((member) => [member.userId as string, member]),
      ),
    [accounts],
  );

  const unlinkedProfiles = useMemo(
    () =>
      technicians.filter(
        (technician) => !technician.userId && technician.status !== "terminated",
      ),
    [technicians],
  );

  const unmappedMembers = useMemo(
    () => (accounts?.members ?? []).filter((member) => !member.linkedProfile),
    [accounts],
  );

  const mappedMembers = useMemo(
    () => (accounts?.members ?? []).filter((member) => Boolean(member.linkedProfile)),
    [accounts],
  );

  const mappedProfiles = useMemo(
    () =>
      technicians.filter(
        (technician) => Boolean(technician.userId) && technician.status !== "terminated",
      ),
    [technicians],
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "Linked accounts",
        value:
          accounts?.members.filter((member) => Boolean(member.linkedProfile)).length ??
          technicians.filter((technician) => Boolean(technician.userId)).length,
        tone: "text-foreground",
      },
      {
        label: "Pending invites",
        value: accounts?.invitations.length ?? 0,
        tone: "text-blue-600 dark:text-blue-400",
      },
      {
        label: "Profiles awaiting link",
        value: unlinkedProfiles.length,
        tone: "text-amber-600 dark:text-amber-400",
      },
      {
        label: "Access-controlled profiles",
        value: mappedProfiles.length,
        tone: "text-emerald-600 dark:text-emerald-400",
      },
    ],
    [accounts, technicians, unlinkedProfiles.length, mappedProfiles.length],
  );

  function refreshAccountsDirectory() {
    setAccountsRefreshKey((current) => current + 1);
  }

  async function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!orgId) return;

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Email address is required.");
      return;
    }

    setIsSendingInvite(true);
    try {
      await sendOrganizationInvite({
        organizationId: orgId as Id<"organizations">,
        emailAddress: email,
      });
      toast.success(`Invite sent to ${email}`);
      setInviteEmail("");
      refreshAccountsDirectory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setIsSendingInvite(false);
    }
  }

  async function handleRevokeInvite(invitation: OrganizationInvitation) {
    if (!orgId) return;

    setRevokingInvitationId(invitation.invitationId);
    try {
      await revokeOrganizationInvite({
        organizationId: orgId as Id<"organizations">,
        invitationId: invitation.invitationId,
      });
      toast.success(`Revoked invite for ${invitation.emailAddress}`);
      refreshAccountsDirectory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke invite");
    } finally {
      setRevokingInvitationId(null);
    }
  }

  async function handleMapCurrentClerkOrg() {
    if (!orgId || !clerkOrganization?.id) return;

    setMappingCurrentClerkOrg(true);
    try {
      await setClerkOrganizationMapping({
        organizationId: orgId as Id<"organizations">,
        clerkOrganizationId: clerkOrganization.id,
      });
      toast.success("Organization mapping updated");
      refreshAccountsDirectory();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to map the current Clerk organization",
      );
    } finally {
      setMappingCurrentClerkOrg(false);
    }
  }

  async function handleLinkMember(member: OrganizationMember) {
    if (!orgId || !member.userId) {
      toast.error("This organization member is missing a user ID.");
      return;
    }

    const selectionKey = member.userId ?? member.membershipId;
    const technicianId = linkSelections[selectionKey];
    if (!technicianId) {
      toast.error("Select a personnel profile to link.");
      return;
    }

    setLinkingMemberKey(selectionKey);
    try {
      await linkMemberToProfile({
        organizationId: orgId as Id<"organizations">,
        technicianId: technicianId as Id<"technicians">,
        userId: member.userId,
        email: member.emailAddress ?? undefined,
      });
      toast.success(`Linked ${member.fullName} to the selected profile`);
      setLinkSelections((current) => {
        const next = { ...current };
        delete next[selectionKey];
        return next;
      });
      refreshAccountsDirectory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to link member");
    } finally {
      setLinkingMemberKey(null);
    }
  }

  async function handleUnlinkMember(member: OrganizationMember) {
    if (!orgId || !member.linkedProfile) return;

    setUnlinkingTechnicianId(member.linkedProfile.technicianId);
    try {
      await unlinkMemberFromProfile({
        organizationId: orgId as Id<"organizations">,
        technicianId: member.linkedProfile.technicianId as Id<"technicians">,
      });
      toast.success(`Unlinked ${member.fullName} from ${member.linkedProfile.legalName}`);
      refreshAccountsDirectory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unlink member");
    } finally {
      setUnlinkingTechnicianId(null);
    }
  }

  async function handleRemoveMember() {
    if (!orgId || !removeTarget?.userId) return;

    setRemovingMemberUserId(removeTarget.userId);
    try {
      await removeOrganizationMember({
        organizationId: orgId as Id<"organizations">,
        userId: removeTarget.userId,
        technicianId: removeTarget.linkedProfile?.technicianId
          ? (removeTarget.linkedProfile.technicianId as Id<"technicians">)
          : undefined,
      });
      toast.success(`Removed ${removeTarget.fullName} from the organization`);
      setRemoveTarget(null);
      refreshAccountsDirectory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setRemovingMemberUserId(null);
    }
  }

  async function handleSaveAccess(technician: DirectoryTechnician) {
    const draft = accessDrafts[technician._id];
    if (!draft) return;

    setSavingAccessTechnicianId(technician._id);
    try {
      await updateAccessControl({
        technicianId: technician._id as Id<"technicians">,
        role: draft.role,
        accessAuthorizations: draft.hasRii ? ["rii"] : [],
      });
      toast.success(`Updated access for ${technician.legalName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update access");
    } finally {
      setSavingAccessTechnicianId(null);
    }
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="User management requires organization setup"
        missingInfo="Complete onboarding before managing user accounts, profile mapping, and access privileges."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data" || !directory) {
    return <LoadingGrid />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Users & Access
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Separate personnel profiles from login accounts, map accepted members manually, and manage app access in one admin console.
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2 self-start"
          onClick={refreshAccountsDirectory}
          disabled={accountsLoading}
        >
          <RefreshCw className={`w-4 h-4 ${accountsLoading ? "animate-spin" : ""}`} />
          Refresh Directory
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-border/60">
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {card.label}
              </div>
              <div className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!directory.organization.clerkOrganizationId && (
        <Card className="border-amber-500/40 bg-amber-500/8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              Clerk Organization Mapping Required
            </CardTitle>
            <CardDescription className="text-amber-900/80 dark:text-amber-100/80">
              This organization has personnel data, but it is not yet mapped to a Clerk organization ID. Account invites and member sync stay disabled until that mapping is set.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-amber-900/80 dark:text-amber-100/80">
              {clerkOrganization?.id
                ? `Current Clerk org: ${clerkOrganization.name ?? "Unnamed organization"} (${clerkOrganization.id})`
                : "Select the correct Clerk organization in the current session, then map it here."}
            </div>
            <Button
              className="self-start"
              onClick={handleMapCurrentClerkOrg}
              disabled={!clerkOrganization?.id || mappingCurrentClerkOrg}
            >
              {mappingCurrentClerkOrg ? "Mapping..." : "Map Current Clerk Organization"}
            </Button>
          </CardContent>
        </Card>
      )}

      {accountsError && (
        <Card className="border-red-500/40 bg-red-500/8">
          <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-medium text-red-600 dark:text-red-400">
                Failed to load Clerk organization data
              </div>
              <div className="text-xs text-muted-foreground mt-1">{accountsError}</div>
            </div>
            <Button variant="outline" onClick={refreshAccountsDirectory}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 bg-muted/40 p-0.5 flex-wrap">
          <TabsTrigger value="accounts" className="h-8 px-3 text-xs data-[state=active]:bg-background">
            Accounts
          </TabsTrigger>
          <TabsTrigger value="mapping" className="h-8 px-3 text-xs data-[state=active]:bg-background">
            Profile Mapping
          </TabsTrigger>
          <TabsTrigger value="access" className="h-8 px-3 text-xs data-[state=active]:bg-background">
            Access Control
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Invite Account
                </CardTitle>
                <CardDescription>
                  Send Clerk organization invites here. Accepted members remain in a waiting state until you map them to an existing personnel profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form className="space-y-3" onSubmit={handleInviteSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="new.user@repairstation.com"
                      disabled={mappingRequired || isSendingInvite}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="gap-2"
                    disabled={mappingRequired || isSendingInvite}
                  >
                    <UserPlus className="w-4 h-4" />
                    {isSendingInvite ? "Sending..." : "Send Invite"}
                  </Button>
                </form>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">
                        Pending invitations
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Revoke stale invitations before they are accepted.
                      </p>
                    </div>
                    <Badge variant="outline">{accounts?.invitations.length ?? 0}</Badge>
                  </div>

                  {accountsLoading && !accounts ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((index) => (
                        <Skeleton key={index} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (accounts?.invitations.length ?? 0) === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                      No pending invitations.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(accounts?.invitations ?? []).map((invitation) => (
                        <div
                          key={invitation.invitationId}
                          className="rounded-lg border border-border/60 p-3 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {invitation.emailAddress}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Sent {formatDateTime(invitation.createdAt)} · Expires {formatDateTime(invitation.expiresAt)}
                              </div>
                            </div>
                            <Badge variant="outline">{invitation.status}</Badge>
                          </div>

                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] text-muted-foreground">
                              Clerk role: {invitation.role}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => handleRevokeInvite(invitation)}
                              disabled={revokingInvitationId === invitation.invitationId}
                            >
                              {revokingInvitationId === invitation.invitationId
                                ? "Revoking..."
                                : "Revoke Invite"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Current Organization Members
                </CardTitle>
                <CardDescription>
                  Removing a linked member offboards their account, clears the profile link, and archives the personnel record instead of deleting history.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {accountsLoading && !accounts ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((index) => (
                      <Skeleton key={index} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (accounts?.members.length ?? 0) === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                    No organization members found.
                  </div>
                ) : (
                  (accounts?.members ?? []).map((member) => (
                    <div
                      key={member.membershipId}
                      className="rounded-lg border border-border/60 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {member.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {member.emailAddress ?? "No email available"} · {member.clerkRole}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            member.linkedProfile
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-border/60 bg-muted/30 text-muted-foreground"
                          }
                        >
                          {member.linkedProfile ? "Mapped" : "Awaiting map"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {member.linkedProfile ? (
                          <>
                            <Badge variant="outline" className="text-[10px] border-border/60 bg-muted/20">
                              <Link2 className="w-3 h-3 mr-1" />
                              {member.linkedProfile.legalName}
                            </Badge>
                            {member.linkedProfile.role && (
                              <RoleBadge role={member.linkedProfile.role} />
                            )}
                            {(member.linkedProfile.accessAuthorizations ?? []).includes("rii") && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              >
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                {ACCESS_AUTHORIZATION_LABELS.rii}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            This account will see the waiting-for-profile-link gate until you map it.
                          </span>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-red-500/30 text-red-600 hover:text-red-600 dark:text-red-400"
                          disabled={!member.userId}
                          onClick={() => setRemoveTarget(member)}
                        >
                          <UserRoundMinus className="w-3 h-3 mr-1" />
                          Remove Member
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mapping" className="mt-4 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Manual Profile Mapping
              </CardTitle>
              <CardDescription>
                Accepted Clerk members never auto-link by email. Map each user deliberately to a single active or inactive personnel profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      Members awaiting profile link
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      These users can authenticate but cannot enter the app until linked.
                    </p>
                  </div>
                  <Badge variant="outline">{unmappedMembers.length}</Badge>
                </div>

                {mappingRequired ? (
                  <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/8 p-5 text-sm text-muted-foreground">
                    Finish the Clerk organization mapping first, then member records will appear here for manual linking.
                  </div>
                ) : unmappedMembers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                    No accepted members are waiting for a profile link.
                  </div>
                ) : (
                  unmappedMembers.map((member) => {
                    const selectionKey = member.userId ?? member.membershipId;
                    return (
                      <div
                        key={member.membershipId}
                        className="rounded-lg border border-border/60 p-4 space-y-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {member.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {member.emailAddress ?? "No email available"}
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <Select
                            value={linkSelections[selectionKey]}
                            onValueChange={(value) =>
                              setLinkSelections((current) => ({
                                ...current,
                                [selectionKey]: value,
                              }))
                            }
                            disabled={!member.userId || linkingMemberKey === selectionKey}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a personnel profile" />
                            </SelectTrigger>
                            <SelectContent>
                              {unlinkedProfiles.map((technician) => (
                                <SelectItem key={technician._id} value={technician._id}>
                                  {technician.legalName}
                                  {technician.employeeId ? ` · #${technician.employeeId}` : ""}
                                  {technician.status === "inactive" ? " · inactive" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            onClick={() => handleLinkMember(member)}
                            disabled={
                              !member.userId ||
                              !linkSelections[selectionKey] ||
                              linkingMemberKey === selectionKey
                            }
                          >
                            {linkingMemberKey === selectionKey ? "Linking..." : "Link Profile"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      Active mappings
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unlinking keeps the organization member but returns them to the waiting-for-profile-link state.
                    </p>
                  </div>
                  <Badge variant="outline">{mappedMembers.length}</Badge>
                </div>

                {mappingRequired ? (
                  <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/8 p-5 text-sm text-muted-foreground">
                    This view will populate after the organization mapping is fixed and the Clerk member directory can be read.
                  </div>
                ) : mappedMembers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                    No organization members are linked to personnel profiles yet.
                  </div>
                ) : (
                  mappedMembers.map((member) => (
                    <div
                      key={member.membershipId}
                      className="rounded-lg border border-border/60 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {member.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {member.emailAddress ?? "No email available"}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        >
                          Linked
                        </Badge>
                      </div>

                      {member.linkedProfile && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] border-border/60 bg-muted/20">
                            <Link2 className="w-3 h-3 mr-1" />
                            {member.linkedProfile.legalName}
                          </Badge>
                          {member.linkedProfile.role && (
                            <RoleBadge role={member.linkedProfile.role} />
                          )}
                          {(member.linkedProfile.accessAuthorizations ?? []).includes("rii") && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              {ACCESS_AUTHORIZATION_LABELS.rii}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={
                            !member.linkedProfile ||
                            unlinkingTechnicianId === member.linkedProfile.technicianId
                          }
                          onClick={() => handleUnlinkMember(member)}
                        >
                          <Unlink2 className="w-3 h-3 mr-1" />
                          {member.linkedProfile &&
                          unlinkingTechnicianId === member.linkedProfile.technicianId
                            ? "Unlinking..."
                            : "Unlink"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-4 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Access Catalog
              </CardTitle>
              <CardDescription>
                Each mapped profile gets one primary app role plus optional supplemental authorization. In v1, the only extra authorization is {ACCESS_AUTHORIZATION_LABELS.rii}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              {roleOptions.map((role) => (
                <div
                  key={role.value}
                  className="rounded-lg border border-border/60 bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-2">
                    <RoleBadge role={role.value} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {role.description}
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  >
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {ACCESS_AUTHORIZATION_LABELS.rii}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {ACCESS_AUTHORIZATION_DESCRIPTIONS.rii}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mapped Profiles</CardTitle>
              <CardDescription>
                Access can only be assigned after an organization member is linked to a personnel profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mappedProfiles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No mapped profiles are available yet. Link a Clerk member to a personnel profile in the Profile Mapping tab first.
                </div>
              ) : (
                mappedProfiles.map((technician) => {
                  const draft = accessDrafts[technician._id] ?? buildAccessDraft(technician);
                  const currentDraft = buildAccessDraft(technician);
                  const hasChanges =
                    draft.role !== currentDraft.role || draft.hasRii !== currentDraft.hasRii;
                  const linkedMember = technician.userId
                    ? memberByUserId.get(technician.userId)
                    : null;

                  return (
                    <div
                      key={technician._id}
                      className="rounded-lg border border-border/60 p-4 space-y-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {technician.legalName}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] border ${getStatusBadgeClass(technician.status)}`}
                            >
                              {technician.status}
                            </Badge>
                            {technician.role && <RoleBadge role={technician.role} />}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            {technician.employeeId && <span>#{technician.employeeId}</span>}
                            {linkedMember?.emailAddress && (
                              <>
                                {technician.employeeId && <span>·</span>}
                                <span>{linkedMember.emailAddress}</span>
                              </>
                            )}
                            {!linkedMember?.emailAddress && technician.email && (
                              <>
                                {technician.employeeId && <span>·</span>}
                                <span>{technician.email}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        >
                          <Link2 className="w-3 h-3 mr-1" />
                          {linkedMember?.fullName ?? "Linked member"}
                        </Badge>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto] xl:items-end">
                        <div className="space-y-2">
                          <Label htmlFor={`access-role-${technician._id}`}>Primary role</Label>
                          <Select
                            value={draft.role}
                            onValueChange={(value) =>
                              setAccessDrafts((current) => ({
                                ...current,
                                [technician._id]: {
                                  ...draft,
                                  role: value as MroRole,
                                },
                              }))
                            }
                          >
                            <SelectTrigger id={`access-role-${technician._id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="rounded-lg border border-border/60 p-3">
                          <Label
                            htmlFor={`access-rii-${technician._id}`}
                            className="items-start"
                          >
                            <Checkbox
                              id={`access-rii-${technician._id}`}
                              checked={draft.hasRii}
                              onCheckedChange={(checked) =>
                                setAccessDrafts((current) => ({
                                  ...current,
                                  [technician._id]: {
                                    ...draft,
                                    hasRii: Boolean(checked),
                                  },
                                }))
                              }
                            />
                            <span className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-foreground">
                                {ACCESS_AUTHORIZATION_LABELS.rii}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {ACCESS_AUTHORIZATION_DESCRIPTIONS.rii}
                              </span>
                            </span>
                          </Label>
                        </div>

                        <Button
                          onClick={() => handleSaveAccess(technician)}
                          disabled={
                            savingAccessTechnicianId === technician._id || !hasChanges
                          }
                        >
                          {savingAccessTechnicianId === technician._id
                            ? "Saving..."
                            : "Save Access"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={removeTarget !== null} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove Organization Member</DialogTitle>
            <DialogDescription>
              {removeTarget?.linkedProfile
                ? `Removing ${removeTarget.fullName} will revoke organization access, clear the profile link, and archive ${removeTarget.linkedProfile.legalName}. Historical records stay intact.`
                : `Removing ${removeTarget?.fullName} will revoke organization access. No personnel profile is currently linked to this account.`}
            </DialogDescription>
          </DialogHeader>

          {removeTarget?.linkedProfile && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/8 p-3 text-xs text-muted-foreground">
              Offboarding follows the standard disable-and-archive workflow. The linked personnel profile is preserved for audit history and becomes archived after the account is removed.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={
                !removeTarget?.userId || removingMemberUserId === removeTarget?.userId
              }
            >
              {removeTarget?.userId && removingMemberUserId === removeTarget.userId
                ? "Removing..."
                : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
