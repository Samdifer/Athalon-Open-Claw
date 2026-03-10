import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string; name?: string } | null> };
}): Promise<{ userId: string; name: string | undefined }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED: Valid session required.");
  return { userId: identity.subject, name: identity.name };
}

async function requireOrgMembership(
  ctx: { db: any },
  userId: string,
  organizationId: Id<"organizations">,
) {
  const membership = await ctx.db
    .query("technicians")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .first();

  if (!membership) {
    throw new Error(
      `FORBIDDEN_ORG_ACCESS: user ${userId} is not a member of organization ${organizationId}.`,
    );
  }
  if (membership.status === "terminated") {
    throw new Error("FORBIDDEN_ORG_ACCESS: technician membership is terminated.");
  }
  return membership;
}

function normalizeCampaignKey(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "general-qualification";
}

function normalizeOptional(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function buildProspectAddress(args: {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}) {
  const lineOne = args.street?.trim();
  const cityStateZip = [args.city?.trim(), args.state?.trim(), args.zip?.trim()]
    .filter(Boolean)
    .join(" ");
  const address = [lineOne, cityStateZip].filter(Boolean).join(", ");
  return address || undefined;
}

function buildPromotionNotes(args: {
  certNo?: string;
  certificateDesignator?: string;
  nearestAirportName?: string;
  nearestAirportIcao?: string;
  faaDistrictOffice?: string;
  selectedOutreachTier?: "A" | "B" | "C";
  profileArchetype?: string;
  fleetSize?: number;
  campaignName: string;
  sourceRefs: string[];
}) {
  const lines = [
    `Prospect promoted from CRM Prospect Intelligence.`,
    args.certNo ? `Repair station certificate: ${args.certNo}.` : null,
    args.certificateDesignator ? `Part 135 certificate designator: ${args.certificateDesignator}.` : null,
    args.fleetSize ? `Fleet size: ${args.fleetSize} aircraft.` : null,
    args.faaDistrictOffice ? `FAA district office: ${args.faaDistrictOffice}.` : null,
    args.selectedOutreachTier ? `Research outreach tier: ${args.selectedOutreachTier}.` : null,
    args.profileArchetype ? `Profile archetype: ${args.profileArchetype}.` : null,
    args.nearestAirportIcao || args.nearestAirportName
      ? `Nearest airport: ${[args.nearestAirportIcao, args.nearestAirportName].filter(Boolean).join(" - ")}.`
      : null,
    `Campaign: ${args.campaignName}.`,
    args.sourceRefs.length > 0
      ? `Source refs: ${args.sourceRefs.slice(0, 3).join(" | ")}`
      : null,
  ].filter(Boolean);

  return lines.join(" ");
}

const campaignFitValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("unknown"),
);

const qualificationStatusValidator = v.union(
  v.literal("unreviewed"),
  v.literal("qualified"),
  v.literal("nurture"),
  v.literal("research"),
  v.literal("disqualified"),
);

const contactStrategyValidator = v.optional(v.union(
  v.literal("call_first"),
  v.literal("email_first"),
  v.literal("multi_touch"),
  v.literal("warm_intro"),
  v.literal("research_first"),
  v.literal("site_visit"),
  v.literal("other"),
));

const outreachTierValidator = v.optional(v.union(
  v.literal("A"),
  v.literal("B"),
  v.literal("C"),
));

export const listCampaignAssessments = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("crmProspectCampaignAssessments")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    return assessments.sort((a: any, b: any) => b.updatedAt - a.updatedAt);
  },
});

export const upsertCampaignAssessment = mutation({
  args: {
    organizationId: v.id("organizations"),
    prospectEntityId: v.string(),
    prospectLegalName: v.string(),
    campaignName: v.string(),
    campaignFit: campaignFitValidator,
    qualificationStatus: qualificationStatusValidator,
    fitScore: v.optional(v.number()),
    contactStrategy: contactStrategyValidator,
    notes: v.optional(v.string()),
    nextStep: v.optional(v.string()),
    selectedOutreachTier: outreachTierValidator,
  },
  handler: async (ctx, args) => {
    const { userId, name } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const campaignName = args.campaignName.trim() || "Prospect Outreach";
    const campaignKey = normalizeCampaignKey(campaignName);
    const prospectLegalName = args.prospectLegalName.trim();

    if (!prospectLegalName) {
      throw new Error("Prospect legal name is required.");
    }
    if (args.fitScore !== undefined && (args.fitScore < 1 || args.fitScore > 5)) {
      throw new Error("Fit score must be between 1 and 5.");
    }

    const existing = await ctx.db
      .query("crmProspectCampaignAssessments")
      .withIndex("by_org_prospect_campaign", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("prospectEntityId", args.prospectEntityId)
          .eq("campaignKey", campaignKey),
      )
      .first();

    const now = Date.now();
    const patch = {
      prospectLegalName,
      campaignKey,
      campaignName,
      campaignFit: args.campaignFit,
      qualificationStatus: args.qualificationStatus,
      fitScore: args.fitScore,
      contactStrategy: args.contactStrategy,
      notes: args.notes?.trim() || undefined,
      nextStep: args.nextStep?.trim() || undefined,
      selectedOutreachTier: args.selectedOutreachTier,
      lastReviewedAt: now,
      reviewedByUserId: userId,
      reviewedByName: name,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "record_updated",
        tableName: "crmProspectCampaignAssessments",
        recordId: existing._id,
        userId,
        notes: `Prospect assessment updated for ${prospectLegalName} (${campaignName}).`,
        timestamp: now,
      });
      return existing._id;
    }

    const assessmentId = await ctx.db.insert("crmProspectCampaignAssessments", {
      organizationId: args.organizationId,
      prospectEntityId: args.prospectEntityId,
      ...patch,
      createdAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "crmProspectCampaignAssessments",
      recordId: assessmentId,
      userId,
      notes: `Prospect assessment created for ${prospectLegalName} (${campaignName}).`,
      timestamp: now,
    });

    return assessmentId;
  },
});

export const promoteProspectToCustomer = mutation({
  args: {
    organizationId: v.id("organizations"),
    prospectEntityId: v.string(),
    legalName: v.string(),
    dbaName: v.optional(v.string()),
    campaignName: v.string(),
    street: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    certNo: v.optional(v.string()),
    nearestAirportName: v.optional(v.string()),
    nearestAirportIcao: v.optional(v.string()),
    profileArchetype: v.optional(v.string()),
    customerType: v.optional(v.union(
      v.literal("company"),
      v.literal("charter_operator"),
      v.literal("flight_school"),
      v.literal("government"),
      v.literal("individual"),
    )),
    certificateDesignator: v.optional(v.string()),
    faaDistrictOffice: v.optional(v.string()),
    fleetSize: v.optional(v.number()),
    selectedOutreachTier: outreachTierValidator,
    sourceRefs: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, name } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const legalName = args.legalName.trim();
    if (!legalName) {
      throw new Error("Prospect legal name is required.");
    }

    const normalizedName = normalizeOptional(legalName);
    const normalizedCompany = normalizeOptional(args.dbaName);
    const normalizedEmail = normalizeOptional(args.email);

    const existingCustomers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const duplicate = existingCustomers.find((customer: any) => {
      const sameName = normalizeOptional(customer.name) === normalizedName;
      if (!sameName) return false;

      const sameCompany =
        normalizedCompany !== null &&
        normalizeOptional(customer.companyName) === normalizedCompany;
      const sameEmail =
        normalizedEmail !== null && normalizeOptional(customer.email) === normalizedEmail;

      if (normalizedCompany === null && normalizedEmail === null) {
        return (
          normalizeOptional(customer.companyName) === null &&
          normalizeOptional(customer.email) === null
        );
      }

      return sameCompany || sameEmail;
    });

    const now = Date.now();
    let customerId = duplicate?._id as Id<"customers"> | undefined;

    if (!customerId) {
      customerId = await ctx.db.insert("customers", {
        organizationId: args.organizationId,
        name: legalName,
        companyName: args.dbaName?.trim() || undefined,
        customerType: args.customerType ?? "company",
        address: buildProspectAddress(args),
        phone: args.phone?.trim() || undefined,
        email: args.email?.trim().toLowerCase() || undefined,
        notes: buildPromotionNotes({
          certNo: args.certNo,
          certificateDesignator: args.certificateDesignator,
          nearestAirportName: args.nearestAirportName,
          nearestAirportIcao: args.nearestAirportIcao,
          faaDistrictOffice: args.faaDistrictOffice,
          selectedOutreachTier: args.selectedOutreachTier,
          profileArchetype: args.profileArchetype,
          fleetSize: args.fleetSize,
          campaignName: args.campaignName.trim() || "Prospect Outreach",
          sourceRefs: args.sourceRefs,
        }),
        active: true,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "record_created",
        tableName: "customers",
        recordId: customerId,
        userId,
        notes: `Customer profile created from prospect research for ${legalName}.`,
        timestamp: now,
      });
    }

    const campaignName = args.campaignName.trim() || "Prospect Outreach";
    const campaignKey = normalizeCampaignKey(campaignName);
    const existingAssessment = await ctx.db
      .query("crmProspectCampaignAssessments")
      .withIndex("by_org_prospect_campaign", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("prospectEntityId", args.prospectEntityId)
          .eq("campaignKey", campaignKey),
      )
      .first();

    let assessmentId: string;

    if (existingAssessment) {
      await ctx.db.patch(existingAssessment._id, {
        promotedCustomerId: customerId,
        promotedAt: now,
        qualificationStatus:
          existingAssessment.qualificationStatus === "disqualified"
            ? existingAssessment.qualificationStatus
            : "qualified",
        lastReviewedAt: now,
        reviewedByUserId: userId,
        reviewedByName: name,
        updatedAt: now,
      });
      assessmentId = existingAssessment._id;
    } else {
      assessmentId = await ctx.db.insert("crmProspectCampaignAssessments", {
        organizationId: args.organizationId,
        prospectEntityId: args.prospectEntityId,
        prospectLegalName: legalName,
        campaignKey,
        campaignName,
        campaignFit: "unknown",
        qualificationStatus: "qualified",
        selectedOutreachTier: args.selectedOutreachTier,
        promotedCustomerId: customerId,
        promotedAt: now,
        lastReviewedAt: now,
        reviewedByUserId: userId,
        reviewedByName: name,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "crmProspectCampaignAssessments",
      recordId: assessmentId,
      userId,
      notes: `Prospect ${legalName} linked to customer ${customerId} for ${campaignName}.`,
      timestamp: now,
    });

    return {
      customerId,
      existed: Boolean(duplicate),
    };
  },
});

export const listProspectNotes = query({
  args: {
    organizationId: v.id("organizations"),
    prospectEntityId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const notes = await ctx.db
      .query("prospectNotes")
      .withIndex("by_org_prospect", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("prospectEntityId", args.prospectEntityId),
      )
      .collect();
    return notes.sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

export const addProspectNote = mutation({
  args: {
    organizationId: v.id("organizations"),
    prospectEntityId: v.string(),
    campaignKey: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, name } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const content = args.content.trim();
    if (!content) throw new Error("Note content is required.");

    const now = Date.now();
    const noteId = await ctx.db.insert("prospectNotes", {
      prospectEntityId: args.prospectEntityId,
      organizationId: args.organizationId,
      campaignKey: args.campaignKey,
      content,
      createdByUserId: userId,
      createdByName: name,
      createdAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "prospectNotes",
      recordId: noteId,
      userId,
      notes: `Prospect note added for entity ${args.prospectEntityId}.`,
      timestamp: now,
    });

    return noteId;
  },
});
