"use node";

import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type AdminDirectoryTechnician = {
  _id: Id<"technicians">;
  legalName: string;
  status: "active" | "inactive" | "terminated";
  role?: string;
  userId?: string;
  accessAuthorizations?: string[];
};

type AdminDirectoryResult = {
  organization: {
    _id: Id<"organizations">;
    name: string;
    clerkOrganizationId: string | null;
  };
  technicians: AdminDirectoryTechnician[];
};

type OrganizationAccountsResult = {
  organization: AdminDirectoryResult["organization"];
  mappingRequired: boolean;
  members: Array<{
    membershipId: string;
    userId: string | null;
    clerkRole: string;
    emailAddress: string | null;
    fullName: string;
    linkedProfile: {
      technicianId: Id<"technicians">;
      legalName: string;
      status: "active" | "inactive" | "terminated";
      role: string | null;
      accessAuthorizations: string[];
    } | null;
  }>;
  invitations: Array<{
    invitationId: string;
    emailAddress: string;
    status: string;
    role: string;
    createdAt: number | null;
    updatedAt: number | null;
    expiresAt: number | null;
    url: string | null;
  }>;
};

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required for organization account management.");
  }

  return createClerkClient({ secretKey });
}

async function requireAdminActor(
  ctx: any,
  organizationId: any,
): Promise<{ userId: string; technicianId: Id<"technicians"> }> {
  const [role, technician] = await Promise.all([
    ctx.runQuery(api.roles.getMyRole, { organizationId: organizationId as any }),
    ctx.runQuery(api.technicians.getSelf, { organizationId: organizationId as any }),
  ]);

  if (role !== "admin" || !technician || technician.status !== "active" || !technician.userId) {
    throw new Error("ACCESS_DENIED: admin role required.");
  }

  return {
    userId: technician.userId,
    technicianId: technician._id,
  };
}

export const listOrganizationAccounts = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<OrganizationAccountsResult> => {
    await requireAdminActor(ctx, args.organizationId);

    const directory = await ctx.runQuery(api.userManagement.getAdminDirectory, {
      organizationId: args.organizationId,
    }) as AdminDirectoryResult;

    if (!directory.organization.clerkOrganizationId) {
      return {
        organization: directory.organization,
        mappingRequired: true as const,
        members: [],
        invitations: [],
      };
    }

    const clerkClient = getClerkClient();
    const [membersResponse, invitationsResponse] = await Promise.all([
      clerkClient.organizations.getOrganizationMembershipList({
        organizationId: directory.organization.clerkOrganizationId,
        limit: 100,
      }),
      clerkClient.organizations.getOrganizationInvitationList({
        organizationId: directory.organization.clerkOrganizationId,
        limit: 100,
      }),
    ]);

    const technicianByUserId = new Map<string, AdminDirectoryTechnician>(
      directory.technicians
        .filter((technician: AdminDirectoryTechnician) => Boolean(technician.userId))
        .map((technician: AdminDirectoryTechnician) => [technician.userId as string, technician]),
    );

    return {
      organization: directory.organization,
      mappingRequired: false as const,
      members: membersResponse.data.map((membership: any) => {
        const userId = membership.publicUserData?.userId ?? null;
        const linkedProfile = userId ? technicianByUserId.get(userId) ?? null : null;
        const fullName = [
          membership.publicUserData?.firstName ?? "",
          membership.publicUserData?.lastName ?? "",
        ]
          .join(" ")
          .trim();

        return {
          membershipId: membership.id,
          userId,
          clerkRole: membership.role,
          emailAddress: membership.publicUserData?.identifier ?? null,
          fullName: fullName || linkedProfile?.legalName || membership.publicUserData?.identifier || "Unnamed member",
          linkedProfile: linkedProfile
            ? {
                technicianId: linkedProfile._id,
                legalName: linkedProfile.legalName,
                status: linkedProfile.status,
                role: linkedProfile.role ?? null,
                accessAuthorizations: linkedProfile.accessAuthorizations ?? [],
              }
            : null,
        };
      }),
      invitations: invitationsResponse.data.map((invitation: any) => ({
        invitationId: invitation.id,
        emailAddress: invitation.emailAddress,
        status: invitation.status ?? "pending",
        role: invitation.role,
        createdAt: invitation.createdAt,
        updatedAt: invitation.updatedAt,
        expiresAt: invitation.expiresAt,
        url: invitation.url,
      })),
    };
  },
});

export const sendOrganizationInvite = action({
  args: {
    organizationId: v.id("organizations"),
    emailAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdminActor(ctx, args.organizationId);
    const directory = await ctx.runQuery(api.userManagement.getAdminDirectory, {
      organizationId: args.organizationId,
    });

    if (!directory.organization.clerkOrganizationId) {
      throw new Error("Map this organization to a Clerk organization before sending invites.");
    }

    const clerkClient = getClerkClient();
    const invitation = await clerkClient.organizations.createOrganizationInvitation({
      organizationId: directory.organization.clerkOrganizationId,
      emailAddress: args.emailAddress.trim().toLowerCase(),
      role: "org:member",
      inviterUserId: actor.userId,
    });

    await ctx.runMutation(internal.userManagement.logOrganizationAccountAuditEvent, {
      organizationId: args.organizationId,
      recordId: invitation.id,
      userId: actor.userId,
      technicianId: actor.technicianId,
      eventType: "record_created",
      fieldName: "organization_invitation",
      newValue: JSON.stringify({
        emailAddress: invitation.emailAddress,
        role: invitation.role,
        status: invitation.status ?? "pending",
      }),
      notes: `Sent organization invite to ${invitation.emailAddress}.`,
    });

    return {
      invitationId: invitation.id,
      emailAddress: invitation.emailAddress,
      status: invitation.status ?? "pending",
    };
  },
});

export const revokeOrganizationInvite = action({
  args: {
    organizationId: v.id("organizations"),
    invitationId: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdminActor(ctx, args.organizationId);
    const directory = await ctx.runQuery(api.userManagement.getAdminDirectory, {
      organizationId: args.organizationId,
    });

    if (!directory.organization.clerkOrganizationId) {
      throw new Error("Map this organization to a Clerk organization before revoking invites.");
    }

    const clerkClient = getClerkClient();
    const invitation = await clerkClient.organizations.revokeOrganizationInvitation({
      organizationId: directory.organization.clerkOrganizationId,
      invitationId: args.invitationId,
      requestingUserId: actor.userId,
    });

    await ctx.runMutation(internal.userManagement.logOrganizationAccountAuditEvent, {
      organizationId: args.organizationId,
      recordId: invitation.id,
      userId: actor.userId,
      technicianId: actor.technicianId,
      eventType: "status_changed",
      fieldName: "organization_invitation",
      oldValue: JSON.stringify({ status: "pending" }),
      newValue: JSON.stringify({ status: invitation.status ?? "revoked" }),
      notes: `Revoked organization invite for ${invitation.emailAddress}.`,
    });

    return {
      invitationId: invitation.id,
      status: invitation.status ?? "revoked",
    };
  },
});

export const removeOrganizationMember = action({
  args: {
    organizationId: v.id("organizations"),
    userId: v.string(),
    technicianId: v.optional(v.id("technicians")),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdminActor(ctx, args.organizationId);
    const directory = await ctx.runQuery(api.userManagement.getAdminDirectory, {
      organizationId: args.organizationId,
    });

    if (!directory.organization.clerkOrganizationId) {
      throw new Error("Map this organization to a Clerk organization before removing members.");
    }

    if (args.technicianId) {
      await ctx.runMutation(api.userManagement.offboardLinkedProfile, {
        technicianId: args.technicianId,
        expectedUserId: args.userId,
      });
    }

    const clerkClient = getClerkClient();
    await clerkClient.organizations.deleteOrganizationMembership({
      organizationId: directory.organization.clerkOrganizationId,
      userId: args.userId,
    });

    await ctx.runMutation(internal.userManagement.logOrganizationAccountAuditEvent, {
      organizationId: args.organizationId,
      recordId: args.userId,
      userId: actor.userId,
      technicianId: actor.technicianId,
      eventType: "status_changed",
      fieldName: "organization_membership",
      oldValue: JSON.stringify({ userId: args.userId, linkedProfileId: args.technicianId ?? null }),
      newValue: JSON.stringify({ removed: true }),
      notes: `Removed organization member ${args.userId}.`,
    });

    return { userId: args.userId, removed: true as const };
  },
});
