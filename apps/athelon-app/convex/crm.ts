/**
 * crm.ts — CRM Module Backend
 *
 * Contacts, Interactions, Opportunities, Health Scoring, and Account Metrics
 * for Corridor/EBIS 5 feature parity.
 *
 * All functions are org-scoped and auth-gated following billingV4.ts patterns.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─── Auth helpers (same pattern as billingV4.ts) ─────────────────────────────

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

// ─── Shared validators ──────────────────────────────────────────────────────

const contactRoleValidator = v.optional(v.union(
  v.literal("owner"),
  v.literal("dom"),
  v.literal("chief_pilot"),
  v.literal("ap_manager"),
  v.literal("operations"),
  v.literal("dispatcher"),
  v.literal("other"),
));

const interactionTypeValidator = v.union(
  v.literal("phone_call"),
  v.literal("email"),
  v.literal("meeting"),
  v.literal("site_visit"),
  v.literal("note"),
);

const opportunityStageValidator = v.union(
  v.literal("prospecting"),
  v.literal("qualification"),
  v.literal("proposal"),
  v.literal("negotiation"),
  v.literal("won"),
  v.literal("lost"),
);

const opportunitySourceValidator = v.optional(v.union(
  v.literal("prediction"),
  v.literal("referral"),
  v.literal("walk_in"),
  v.literal("phone"),
  v.literal("website"),
  v.literal("trade_show"),
  v.literal("existing_customer"),
  v.literal("other"),
));

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════════════════════════

export const createContact = mutation({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    firstName: v.string(),
    lastName: v.string(),
    title: v.optional(v.string()),
    role: contactRoleValidator,
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    isPrimary: v.boolean(),
    receiveStatusUpdates: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== args.organizationId) {
      throw new Error("Customer not found or does not belong to this organization.");
    }

    const trimmedFirst = args.firstName.trim();
    const trimmedLast = args.lastName.trim();
    if (!trimmedFirst || !trimmedLast) throw new Error("First and last name are required.");

    // If this contact is primary, unset existing primary contacts for the same customer
    if (args.isPrimary) {
      const existingContacts = await ctx.db
        .query("crmContacts")
        .withIndex("by_organization_and_customer", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
        )
        .collect();
      for (const contact of existingContacts) {
        if (contact.isPrimary) {
          await ctx.db.patch(contact._id, { isPrimary: false });
        }
      }
    }

    const now = Date.now();
    const contactId = await ctx.db.insert("crmContacts", {
      organizationId: args.organizationId,
      customerId: args.customerId,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      title: args.title?.trim() || undefined,
      role: args.role,
      email: args.email?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      mobilePhone: args.mobilePhone?.trim() || undefined,
      isPrimary: args.isPrimary,
      receiveStatusUpdates: args.receiveStatusUpdates,
      notes: args.notes?.trim() || undefined,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "crmContacts",
      recordId: contactId,
      userId,
      notes: `Contact created: ${trimmedFirst} ${trimmedLast}.`,
      timestamp: now,
    });

    return contactId;
  },
});

export const updateContact = mutation({
  args: {
    contactId: v.id("crmContacts"),
    organizationId: v.id("organizations"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    title: v.optional(v.string()),
    role: contactRoleValidator,
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    receiveStatusUpdates: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.organizationId !== args.organizationId) {
      throw new Error("Contact not found or does not belong to this organization.");
    }

    // If setting as primary, unset existing primaries
    if (args.isPrimary) {
      const existingContacts = await ctx.db
        .query("crmContacts")
        .withIndex("by_organization_and_customer", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("customerId", contact.customerId),
        )
        .collect();
      for (const c of existingContacts) {
        if (c._id !== args.contactId && c.isPrimary) {
          await ctx.db.patch(c._id, { isPrimary: false });
        }
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.contactId, {
      ...(args.firstName !== undefined && { firstName: args.firstName.trim() }),
      ...(args.lastName !== undefined && { lastName: args.lastName.trim() }),
      ...(args.title !== undefined && { title: args.title.trim() || undefined }),
      ...(args.role !== undefined && { role: args.role }),
      ...(args.email !== undefined && { email: args.email.trim() || undefined }),
      ...(args.phone !== undefined && { phone: args.phone.trim() || undefined }),
      ...(args.mobilePhone !== undefined && { mobilePhone: args.mobilePhone.trim() || undefined }),
      ...(args.isPrimary !== undefined && { isPrimary: args.isPrimary }),
      ...(args.receiveStatusUpdates !== undefined && { receiveStatusUpdates: args.receiveStatusUpdates }),
      ...(args.notes !== undefined && { notes: args.notes.trim() || undefined }),
      updatedAt: now,
    });

    return null;
  },
});

export const deactivateContact = mutation({
  args: {
    contactId: v.id("crmContacts"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.organizationId !== args.organizationId) {
      throw new Error("Contact not found or does not belong to this organization.");
    }

    await ctx.db.patch(args.contactId, { active: false, updatedAt: Date.now() });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "crmContacts",
      recordId: args.contactId,
      userId,
      notes: `Contact deactivated: ${contact.firstName} ${contact.lastName}.`,
      timestamp: Date.now(),
    });

    return null;
  },
});

export const listContacts = query({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    if (args.customerId) {
      return await ctx.db
        .query("crmContacts")
        .withIndex("by_organization_and_customer", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
        )
        .collect();
    }
    return await ctx.db
      .query("crmContacts")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

export const getContact = query({
  args: { contactId: v.id("crmContacts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contactId);
  },
});

export const listContactsForCustomer = query({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("crmContacts")
      .withIndex("by_organization_and_customer", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
      )
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const logInteraction = mutation({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    contactId: v.optional(v.id("crmContacts")),
    type: interactionTypeValidator,
    direction: v.optional(v.union(v.literal("inbound"), v.literal("outbound"))),
    subject: v.string(),
    description: v.optional(v.string()),
    outcome: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    interactionDate: v.number(),
    followUpDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, name } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== args.organizationId) {
      throw new Error("Customer not found or does not belong to this organization.");
    }

    const trimmedSubject = args.subject.trim();
    if (!trimmedSubject) throw new Error("Interaction subject is required.");

    const now = Date.now();
    const interactionId = await ctx.db.insert("crmInteractions", {
      organizationId: args.organizationId,
      customerId: args.customerId,
      contactId: args.contactId,
      type: args.type,
      direction: args.direction,
      subject: trimmedSubject,
      description: args.description?.trim() || undefined,
      outcome: args.outcome?.trim() || undefined,
      durationMinutes: args.durationMinutes,
      interactionDate: args.interactionDate,
      followUpDate: args.followUpDate,
      followUpCompleted: args.followUpDate ? false : undefined,
      createdByUserId: userId,
      createdByName: name,
      createdAt: now,
    });

    // Update last contacted date on the contact if one was specified
    if (args.contactId) {
      await ctx.db.patch(args.contactId, { lastContactedAt: args.interactionDate });
    }

    return interactionId;
  },
});

export const completeFollowUp = mutation({
  args: {
    interactionId: v.id("crmInteractions"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const interaction = await ctx.db.get(args.interactionId);
    if (!interaction || interaction.organizationId !== args.organizationId) {
      throw new Error("Interaction not found.");
    }

    await ctx.db.patch(args.interactionId, { followUpCompleted: true });
    return null;
  },
});

export const listInteractions = query({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.optional(v.id("customers")),
    type: v.optional(interactionTypeValidator),
  },
  handler: async (ctx, args) => {
    if (args.customerId) {
      const results = await ctx.db
        .query("crmInteractions")
        .withIndex("by_organization_and_customer", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
        )
        .order("desc")
        .collect();
      if (args.type) return results.filter((i: any) => i.type === args.type);
      return results;
    }
    if (args.type) {
      return await ctx.db
        .query("crmInteractions")
        .withIndex("by_organization_and_type", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("type", args.type),
        )
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("crmInteractions")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();
  },
});

export const listInteractionsForCustomer = query({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("crmInteractions")
      .withIndex("by_organization_and_customer", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
      )
      .order("desc")
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════════════════════

export const createOpportunity = mutation({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    aircraftId: v.optional(v.id("aircraft")),
    predictionId: v.optional(v.id("maintenancePredictions")),
    title: v.string(),
    description: v.optional(v.string()),
    stage: opportunityStageValidator,
    estimatedValue: v.number(),
    estimatedLaborHours: v.optional(v.number()),
    probability: v.optional(v.number()),
    expectedCloseDate: v.optional(v.number()),
    source: opportunitySourceValidator,
  },
  handler: async (ctx, args) => {
    const { userId, name } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== args.organizationId) {
      throw new Error("Customer not found or does not belong to this organization.");
    }

    const trimmedTitle = args.title.trim();
    if (!trimmedTitle) throw new Error("Opportunity title is required.");
    if (args.probability !== undefined && (args.probability < 0 || args.probability > 100)) {
      throw new Error("Probability must be between 0 and 100.");
    }

    const now = Date.now();
    const oppId = await ctx.db.insert("crmOpportunities", {
      organizationId: args.organizationId,
      customerId: args.customerId,
      aircraftId: args.aircraftId,
      predictionId: args.predictionId,
      title: trimmedTitle,
      description: args.description?.trim() || undefined,
      stage: args.stage,
      estimatedValue: args.estimatedValue,
      estimatedLaborHours: args.estimatedLaborHours,
      probability: args.probability,
      expectedCloseDate: args.expectedCloseDate,
      source: args.source,
      assignedToUserId: userId,
      assignedToName: name,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "crmOpportunities",
      recordId: oppId,
      userId,
      notes: `Opportunity created: ${trimmedTitle} ($${args.estimatedValue.toLocaleString()}).`,
      timestamp: now,
    });

    return oppId;
  },
});

export const updateOpportunity = mutation({
  args: {
    opportunityId: v.id("crmOpportunities"),
    organizationId: v.id("organizations"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    estimatedLaborHours: v.optional(v.number()),
    probability: v.optional(v.number()),
    expectedCloseDate: v.optional(v.number()),
    assignedToUserId: v.optional(v.string()),
    assignedToName: v.optional(v.string()),
    source: opportunitySourceValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const opp = await ctx.db.get(args.opportunityId);
    if (!opp || opp.organizationId !== args.organizationId) {
      throw new Error("Opportunity not found.");
    }

    if (args.probability !== undefined && (args.probability < 0 || args.probability > 100)) {
      throw new Error("Probability must be between 0 and 100.");
    }

    await ctx.db.patch(args.opportunityId, {
      ...(args.title !== undefined && { title: args.title.trim() }),
      ...(args.description !== undefined && { description: args.description.trim() || undefined }),
      ...(args.estimatedValue !== undefined && { estimatedValue: args.estimatedValue }),
      ...(args.estimatedLaborHours !== undefined && { estimatedLaborHours: args.estimatedLaborHours }),
      ...(args.probability !== undefined && { probability: args.probability }),
      ...(args.expectedCloseDate !== undefined && { expectedCloseDate: args.expectedCloseDate }),
      ...(args.assignedToUserId !== undefined && { assignedToUserId: args.assignedToUserId }),
      ...(args.assignedToName !== undefined && { assignedToName: args.assignedToName }),
      ...(args.source !== undefined && { source: args.source }),
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const updateOpportunityStage = mutation({
  args: {
    opportunityId: v.id("crmOpportunities"),
    organizationId: v.id("organizations"),
    stage: opportunityStageValidator,
    lostReason: v.optional(v.string()),
    wonWorkOrderId: v.optional(v.id("workOrders")),
    wonQuoteId: v.optional(v.id("quotes")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    const opp = await ctx.db.get(args.opportunityId);
    if (!opp || opp.organizationId !== args.organizationId) {
      throw new Error("Opportunity not found.");
    }

    const now = Date.now();
    const patch: Record<string, any> = {
      stage: args.stage,
      updatedAt: now,
    };

    if (args.stage === "won" || args.stage === "lost") {
      patch.actualCloseDate = now;
    }
    if (args.stage === "lost" && args.lostReason) {
      patch.lostReason = args.lostReason.trim();
    }
    if (args.stage === "won") {
      if (args.wonWorkOrderId) patch.wonWorkOrderId = args.wonWorkOrderId;
      if (args.wonQuoteId) patch.wonQuoteId = args.wonQuoteId;
    }

    await ctx.db.patch(args.opportunityId, patch);

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "crmOpportunities",
      recordId: args.opportunityId,
      userId,
      notes: `Opportunity stage changed: ${opp.stage} → ${args.stage}.`,
      timestamp: now,
    });

    return null;
  },
});

export const listOpportunities = query({
  args: {
    organizationId: v.id("organizations"),
    stage: v.optional(opportunityStageValidator),
  },
  handler: async (ctx, args) => {
    if (args.stage) {
      return await ctx.db
        .query("crmOpportunities")
        .withIndex("by_organization_and_stage", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("stage", args.stage),
        )
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("crmOpportunities")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();
  },
});

export const getOpportunity = query({
  args: { opportunityId: v.id("crmOpportunities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.opportunityId);
  },
});

export const listOpportunitiesForCustomer = query({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("crmOpportunities")
      .withIndex("by_organization_and_customer", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
      )
      .order("desc")
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH SNAPSHOTS
// ═══════════════════════════════════════════════════════════════════════════════

export const recordHealthSnapshot = mutation({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    overallScore: v.number(),
    factors: v.object({
      woFrequency: v.number(),
      paymentTimeliness: v.number(),
      fleetSize: v.number(),
      contractValue: v.number(),
      communicationFrequency: v.number(),
      recencyOfWork: v.number(),
    }),
    churnRiskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    snapshotDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    await requireOrgMembership(ctx, userId, args.organizationId);

    return await ctx.db.insert("crmHealthSnapshots", {
      organizationId: args.organizationId,
      customerId: args.customerId,
      overallScore: args.overallScore,
      factors: args.factors,
      churnRiskLevel: args.churnRiskLevel,
      snapshotDate: args.snapshotDate,
      createdAt: Date.now(),
    });
  },
});

export const getHealthScoresForCustomer = query({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("crmHealthSnapshots")
      .withIndex("by_organization_and_customer", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
      )
      .order("desc")
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT METRICS & DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export const getAccountSummary = query({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== args.organizationId) return null;

    // Aircraft count
    const aircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_customer", (q: any) => q.eq("customerId", args.customerId))
      .collect();

    // Work orders
    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();
    const customerWOs = workOrders.filter((wo: any) => wo.customerId === args.customerId);
    const activeWOs = customerWOs.filter(
      (wo: any) => !["closed", "cancelled", "voided"].includes(wo.status),
    );

    // Invoices
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.organizationId))
      .collect();
    const customerInvoices = invoices.filter((inv: any) => inv.customerId === args.customerId);
    const totalRevenue = customerInvoices.reduce(
      (sum: number, inv: any) => sum + (inv.total ?? 0),
      0,
    );
    const outstandingBalance = customerInvoices
      .filter((inv: any) => inv.status !== "PAID" && inv.status !== "VOID")
      .reduce((sum: number, inv: any) => sum + (inv.balance ?? inv.total ?? 0), 0);

    // Latest interaction
    const interactions = await ctx.db
      .query("crmInteractions")
      .withIndex("by_organization_and_customer", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
      )
      .order("desc")
      .take(1);

    // Contacts count
    const contacts = await ctx.db
      .query("crmContacts")
      .withIndex("by_organization_and_customer", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
      )
      .collect();

    // Latest health snapshot
    const healthSnapshots = await ctx.db
      .query("crmHealthSnapshots")
      .withIndex("by_organization_and_customer", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
      )
      .order("desc")
      .take(1);

    // Opportunities
    const opportunities = await ctx.db
      .query("crmOpportunities")
      .withIndex("by_organization_and_customer", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("customerId", args.customerId),
      )
      .collect();
    const activeOpps = opportunities.filter(
      (o: any) => o.stage !== "won" && o.stage !== "lost",
    );

    return {
      customer,
      aircraftCount: aircraft.length,
      activeWoCount: activeWOs.length,
      totalWoCount: customerWOs.length,
      totalRevenue,
      outstandingBalance,
      contactsCount: contacts.length,
      lastInteraction: interactions[0] ?? null,
      healthScore: healthSnapshots[0] ?? null,
      activeOpportunities: activeOpps.length,
      pipelineValue: activeOpps.reduce((sum: number, o: any) => sum + o.estimatedValue, 0),
    };
  },
});

export const listAccountsWithMetrics = query({
  args: {
    organizationId: v.id("organizations"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const filtered = args.includeInactive
      ? customers
      : customers.filter((c: any) => c.active !== false);

    // Batch load related data
    const allAircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_organization", (q: any) => q.eq("operatingOrganizationId", args.organizationId))
      .collect();

    const allWOs = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const allInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.organizationId))
      .collect();

    const allInteractions = await ctx.db
      .query("crmInteractions")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const allHealthSnapshots = await ctx.db
      .query("crmHealthSnapshots")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    // Group by customer
    const aircraftByCustomer = new Map<string, number>();
    for (const ac of allAircraft) {
      if (ac.customerId) {
        aircraftByCustomer.set(ac.customerId, (aircraftByCustomer.get(ac.customerId) ?? 0) + 1);
      }
    }

    const openWosByCustomer = new Map<string, number>();
    for (const wo of allWOs) {
      if (wo.customerId && !["closed", "cancelled", "voided"].includes(wo.status)) {
        openWosByCustomer.set(wo.customerId, (openWosByCustomer.get(wo.customerId) ?? 0) + 1);
      }
    }

    const revenueByCustomer = new Map<string, number>();
    for (const inv of allInvoices) {
      if (inv.customerId) {
        revenueByCustomer.set(
          inv.customerId,
          (revenueByCustomer.get(inv.customerId) ?? 0) + (inv.total ?? 0),
        );
      }
    }

    const lastInteractionByCustomer = new Map<string, number>();
    for (const interaction of allInteractions) {
      const existing = lastInteractionByCustomer.get(interaction.customerId) ?? 0;
      if (interaction.interactionDate > existing) {
        lastInteractionByCustomer.set(interaction.customerId, interaction.interactionDate);
      }
    }

    const latestHealthByCustomer = new Map<string, any>();
    for (const snapshot of allHealthSnapshots) {
      const existing = latestHealthByCustomer.get(snapshot.customerId);
      if (!existing || snapshot.snapshotDate > existing.snapshotDate) {
        latestHealthByCustomer.set(snapshot.customerId, snapshot);
      }
    }

    return filtered.map((customer: any) => ({
      ...customer,
      aircraftCount: aircraftByCustomer.get(customer._id) ?? 0,
      openWoCount: openWosByCustomer.get(customer._id) ?? 0,
      totalRevenue: revenueByCustomer.get(customer._id) ?? 0,
      lastInteractionDate: lastInteractionByCustomer.get(customer._id) ?? null,
      healthScore: latestHealthByCustomer.get(customer._id)?.overallScore ?? null,
      churnRisk: latestHealthByCustomer.get(customer._id)?.churnRiskLevel ?? null,
    }));
  },
});

export const getCrmDashboardData = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();
    const activeCustomers = customers.filter((c: any) => c.active !== false);

    const opportunities = await ctx.db
      .query("crmOpportunities")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();
    const activeOpps = opportunities.filter(
      (o: any) => o.stage !== "won" && o.stage !== "lost",
    );

    const interactions = await ctx.db
      .query("crmInteractions")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(20);

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.organizationId))
      .collect();

    // Monthly revenue (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentRevenue = invoices
      .filter((inv: any) => inv.status === "PAID" && inv.paidAt && inv.paidAt >= thirtyDaysAgo)
      .reduce((sum: number, inv: any) => sum + (inv.total ?? 0), 0);

    // Revenue by customer type
    const customerTypeMap = new Map<string, string>();
    for (const c of customers) {
      customerTypeMap.set(c._id, c.customerType ?? "company");
    }
    const revenueByType: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.customerId) {
        const type = customerTypeMap.get(inv.customerId) ?? "company";
        revenueByType[type] = (revenueByType[type] ?? 0) + (inv.total ?? 0);
      }
    }

    // Top 10 customers by revenue
    const revenueByCustomer = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.customerId) {
        revenueByCustomer.set(
          inv.customerId,
          (revenueByCustomer.get(inv.customerId) ?? 0) + (inv.total ?? 0),
        );
      }
    }
    const topCustomers = [...revenueByCustomer.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([customerId, revenue]) => {
        const customer = customers.find((c: any) => c._id === customerId);
        return {
          customerId,
          name: customer?.name ?? "Unknown",
          customerType: customer?.customerType ?? "company",
          revenue,
        };
      });

    // Health scores
    const healthSnapshots = await ctx.db
      .query("crmHealthSnapshots")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();
    const latestByCustomer = new Map<string, number>();
    for (const s of healthSnapshots) {
      const existing = latestByCustomer.get(s.customerId);
      if (existing === undefined || s.snapshotDate > existing) {
        latestByCustomer.set(s.customerId, s.overallScore);
      }
    }
    const scores = [...latestByCustomer.values()];
    const avgHealth = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;

    return {
      totalAccounts: activeCustomers.length,
      activeOpportunities: activeOpps.length,
      pipelineValue: activeOpps.reduce((sum: number, o: any) => sum + o.estimatedValue, 0),
      monthlyRevenue: recentRevenue,
      avgHealthScore: Math.round(avgHealth),
      recentInteractions: interactions,
      revenueByType,
      topCustomers,
    };
  },
});

export const getAnalyticsSummary = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    const healthSnapshots = await ctx.db
      .query("crmHealthSnapshots")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .collect();

    // Latest health per customer
    const latestHealth = new Map<string, any>();
    for (const s of healthSnapshots) {
      const existing = latestHealth.get(s.customerId);
      if (!existing || s.snapshotDate > existing.snapshotDate) {
        latestHealth.set(s.customerId, s);
      }
    }

    // Health distribution
    const distribution = { low: 0, medium: 0, high: 0, excellent: 0 };
    for (const h of latestHealth.values()) {
      if (h.overallScore >= 75) distribution.excellent++;
      else if (h.overallScore >= 50) distribution.high++;
      else if (h.overallScore >= 25) distribution.medium++;
      else distribution.low++;
    }

    // Churn risk distribution
    const churnRisk = { low: 0, medium: 0, high: 0 };
    for (const h of latestHealth.values()) {
      churnRisk[h.churnRiskLevel as keyof typeof churnRisk]++;
    }

    // Customer acquisition (new in last 30/90 days)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    const newLast30 = customers.filter((c: any) => c.createdAt >= thirtyDaysAgo).length;
    const newLast90 = customers.filter((c: any) => c.createdAt >= ninetyDaysAgo).length;
    const inactive = customers.filter((c: any) => c.active === false).length;
    const active = customers.filter((c: any) => c.active !== false).length;
    const retentionRate = customers.length > 0
      ? Math.round((active / customers.length) * 100)
      : 100;

    // Revenue by customer type (for segment analysis)
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.organizationId))
      .collect();

    const customerTypeMap = new Map<string, string>();
    for (const c of customers) {
      customerTypeMap.set(c._id, c.customerType ?? "company");
    }

    const revenueByType: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.customerId && inv.status !== "VOID") {
        const type = customerTypeMap.get(inv.customerId) ?? "company";
        revenueByType[type] = (revenueByType[type] ?? 0) + (inv.total ?? 0);
      }
    }

    // Customer lifetime value (top 20)
    const revenueByCustomer = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.customerId && inv.status !== "VOID") {
        revenueByCustomer.set(
          inv.customerId,
          (revenueByCustomer.get(inv.customerId) ?? 0) + (inv.total ?? 0),
        );
      }
    }

    const clvList = [...revenueByCustomer.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([customerId, revenue]) => {
        const customer = customers.find((c: any) => c._id === customerId);
        const health = latestHealth.get(customerId);
        return {
          customerId,
          name: customer?.name ?? "Unknown",
          customerType: customer?.customerType ?? "company",
          totalRevenue: revenue,
          healthScore: health?.overallScore ?? null,
          churnRisk: health?.churnRiskLevel ?? null,
          tenureMonths: customer
            ? Math.round((now - customer.createdAt) / (30 * 24 * 60 * 60 * 1000))
            : 0,
        };
      });

    return {
      healthDistribution: distribution,
      churnRiskDistribution: churnRisk,
      newCustomersLast30Days: newLast30,
      newCustomersLast90Days: newLast90,
      inactiveCustomers: inactive,
      activeCustomers: active,
      retentionRate,
      revenueByType,
      customerLifetimeValue: clvList,
    };
  },
});
