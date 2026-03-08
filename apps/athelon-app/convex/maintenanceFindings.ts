// convex/maintenanceFindings.ts
// Athelon — Aviation MRO SaaS Platform
//
// Unified Maintenance Findings (Unaccounted Tasks) Module — Opus-A
//
// Tracks AD, SB, and predictive-maintenance findings that are not yet
// associated with a work order. Provides full lifecycle management:
// create → triage → approve → link to WO → complete (or defer/dismiss).
//
// Author:     Devraj Anand (Opus-A Implementation)
// Regulatory: Marcus Webb
// QA:         Cilla Oduya
//
// ─── DESIGN NOTES ────────────────────────────────────────────────────────────
//
// STATUS TRANSITIONS (guardrails):
//   new        → triaged | dismissed
//   triaged    → approved | deferred | dismissed
//   approved   → linked_to_wo | deferred | dismissed
//   linked_to_wo → completed | approved (via unlinkFromWorkOrder)
//   deferred   → triaged | approved (re-evaluate)
//   completed  → (terminal)
//   dismissed  → (terminal)
//
// RBAC: All mutations require a valid Clerk session. Org scoping is enforced
// on every query and mutation — cross-org data access is architecturally
// impossible via index constraints.
//
// AUDIT: Every status transition, WO link/unlink, and sensitive mutation
// writes to the auditLog table.
// ─────────────────────────────────────────────────────────────────────────────

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

const findingTypeValidator = v.union(
  v.literal("AD"),
  v.literal("SB"),
  v.literal("PREDICTED"),
);

const severityValidator = v.union(
  v.literal("critical"),
  v.literal("major"),
  v.literal("minor"),
  v.literal("informational"),
);

const priorityValidator = v.union(
  v.literal("aog"),
  v.literal("urgent"),
  v.literal("routine"),
  v.literal("deferred"),
);

const statusValidator = v.union(
  v.literal("new"),
  v.literal("triaged"),
  v.literal("approved"),
  v.literal("linked_to_wo"),
  v.literal("deferred"),
  v.literal("completed"),
  v.literal("dismissed"),
);

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TRANSITION MAP
// ─────────────────────────────────────────────────────────────────────────────

type FindingStatus = "new" | "triaged" | "approved" | "linked_to_wo" | "deferred" | "completed" | "dismissed";

const VALID_TRANSITIONS: Record<FindingStatus, FindingStatus[]> = {
  new:          ["triaged", "dismissed"],
  triaged:      ["approved", "deferred", "dismissed"],
  approved:     ["linked_to_wo", "deferred", "dismissed"],
  linked_to_wo: ["completed", "approved"],  // approved = unlink path
  deferred:     ["triaged", "approved"],
  completed:    [],                          // terminal
  dismissed:    [],                          // terminal
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("UNAUTHENTICATED: Valid Clerk session required.");
  }
  return identity.subject;
}

async function generateFindingNumber(
  ctx: { db: any },
  organizationId: Id<"organizations">,
): Promise<string> {
  const counterType = "maintenanceFinding";
  const counter = await ctx.db
    .query("orgCounters")
    .withIndex("by_org_type", (q: any) =>
      q.eq("orgId", String(organizationId)).eq("counterType", counterType),
    )
    .first();

  const next = (counter?.lastValue ?? 0) + 1;
  if (counter) {
    await ctx.db.patch(counter._id, { lastValue: next });
  } else {
    await ctx.db.insert("orgCounters", {
      orgId: String(organizationId),
      counterType,
      lastValue: next,
    });
  }
  return `FND-${String(next).padStart(4, "0")}`;
}

async function writeAuditLog(
  ctx: { db: any },
  args: {
    organizationId: Id<"organizations">;
    eventType: string;
    recordId: string;
    userId: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    notes?: string;
  },
) {
  await ctx.db.insert("auditLog", {
    organizationId: args.organizationId,
    eventType: args.eventType,
    tableName: "maintenanceFindings",
    recordId: args.recordId,
    userId: args.userId,
    timestamp: Date.now(),
    fieldName: args.fieldName,
    oldValue: args.oldValue,
    newValue: args.newValue,
    notes: args.notes,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createFinding
// Creates a new maintenance finding in "new" status.
// ─────────────────────────────────────────────────────────────────────────────

export const createFinding = mutation({
  args: {
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),
    type: findingTypeValidator,
    sourceRef: v.string(),
    title: v.string(),
    description: v.string(),
    severity: severityValidator,
    priority: priorityValidator,
    dueAt: v.optional(v.number()),
    dueCounter: v.optional(v.number()),
    confidenceScore: v.optional(v.number()),
    provenance: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    const now = Date.now();

    // Validate org exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new Error("ORG_NOT_FOUND: Organization does not exist.");

    // Validate aircraft exists and belongs to org
    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) throw new Error("AIRCRAFT_NOT_FOUND: Aircraft does not exist.");
    if (
      aircraft.operatingOrganizationId &&
      aircraft.operatingOrganizationId !== args.organizationId
    ) {
      throw new Error("ORG_MISMATCH: Aircraft does not belong to this organization.");
    }

    // Validate confidenceScore range for PREDICTED type
    if (args.type === "PREDICTED" && args.confidenceScore !== undefined) {
      if (args.confidenceScore < 0 || args.confidenceScore > 1) {
        throw new Error("VALIDATION: confidenceScore must be between 0.0 and 1.0.");
      }
    }

    const findingNumber = await generateFindingNumber(ctx, args.organizationId);

    const findingId = await ctx.db.insert("maintenanceFindings", {
      findingNumber,
      organizationId: args.organizationId,
      aircraftId: args.aircraftId,
      type: args.type,
      sourceRef: args.sourceRef,
      title: args.title,
      description: args.description,
      severity: args.severity,
      priority: args.priority,
      dueAt: args.dueAt,
      dueCounter: args.dueCounter,
      status: "new" as const,
      confidenceScore: args.confidenceScore,
      provenance: args.provenance,
      notes: args.notes,
      createdAt: now,
      createdByUserId: callerUserId,
    });

    await writeAuditLog(ctx, {
      organizationId: args.organizationId,
      eventType: "record_created",
      recordId: String(findingId),
      userId: callerUserId,
      notes: `Created finding ${findingNumber} (${args.type}: ${args.sourceRef})`,
    });

    return { findingId, findingNumber };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: getFinding
// ─────────────────────────────────────────────────────────────────────────────

export const getFinding = query({
  args: {
    organizationId: v.id("organizations"),
    findingId: v.id("maintenanceFindings"),
  },
  handler: async (ctx, args) => {
    const finding = await ctx.db.get(args.findingId);
    if (!finding || finding.organizationId !== args.organizationId) {
      return null;
    }
    return finding;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listFindings
// Org-scoped listing with optional filters by status, type, aircraftId.
// ─────────────────────────────────────────────────────────────────────────────

export const listFindings = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(statusValidator),
    type: v.optional(findingTypeValidator),
    aircraftId: v.optional(v.id("aircraft")),
  },
  handler: async (ctx, args) => {
    // Choose the most selective index based on provided filters
    if (args.aircraftId && args.status) {
      return await ctx.db
        .query("maintenanceFindings")
        .withIndex("by_org_aircraft_status", (q: any) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("aircraftId", args.aircraftId)
            .eq("status", args.status),
        )
        .collect();
    }

    if (args.status) {
      return await ctx.db
        .query("maintenanceFindings")
        .withIndex("by_org_status", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("status", args.status),
        )
        .collect();
    }

    if (args.aircraftId) {
      const results = await ctx.db
        .query("maintenanceFindings")
        .withIndex("by_org_aircraft", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("aircraftId", args.aircraftId),
        )
        .collect();

      if (args.type) {
        return results.filter((r: any) => r.type === args.type);
      }
      return results;
    }

    if (args.type) {
      return await ctx.db
        .query("maintenanceFindings")
        .withIndex("by_org_type", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("type", args.type),
        )
        .collect();
    }

    // Default: all findings for org
    return await ctx.db
      .query("maintenanceFindings")
      .withIndex("by_org", (q: any) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: updateFinding
// Update mutable fields (not status — use transitionStatus for that).
// ─────────────────────────────────────────────────────────────────────────────

export const updateFinding = mutation({
  args: {
    organizationId: v.id("organizations"),
    findingId: v.id("maintenanceFindings"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    severity: v.optional(severityValidator),
    priority: v.optional(priorityValidator),
    dueAt: v.optional(v.number()),
    dueCounter: v.optional(v.number()),
    confidenceScore: v.optional(v.number()),
    notes: v.optional(v.string()),
    provenance: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    const now = Date.now();

    const finding = await ctx.db.get(args.findingId);
    if (!finding || finding.organizationId !== args.organizationId) {
      throw new Error("NOT_FOUND: Finding does not exist or does not belong to this organization.");
    }

    // Cannot update terminal findings
    if (finding.status === "completed" || finding.status === "dismissed") {
      throw new Error(`INVALID_UPDATE: Cannot update a finding in terminal status "${finding.status}".`);
    }

    // Build patch from provided optional fields
    const patch: Record<string, any> = {
      updatedAt: now,
      updatedByUserId: callerUserId,
    };
    const changedFields: string[] = [];

    if (args.title !== undefined) { patch.title = args.title; changedFields.push("title"); }
    if (args.description !== undefined) { patch.description = args.description; changedFields.push("description"); }
    if (args.severity !== undefined) { patch.severity = args.severity; changedFields.push("severity"); }
    if (args.priority !== undefined) { patch.priority = args.priority; changedFields.push("priority"); }
    if (args.dueAt !== undefined) { patch.dueAt = args.dueAt; changedFields.push("dueAt"); }
    if (args.dueCounter !== undefined) { patch.dueCounter = args.dueCounter; changedFields.push("dueCounter"); }
    if (args.confidenceScore !== undefined) {
      if (args.confidenceScore < 0 || args.confidenceScore > 1) {
        throw new Error("VALIDATION: confidenceScore must be between 0.0 and 1.0.");
      }
      patch.confidenceScore = args.confidenceScore;
      changedFields.push("confidenceScore");
    }
    if (args.notes !== undefined) { patch.notes = args.notes; changedFields.push("notes"); }
    if (args.provenance !== undefined) { patch.provenance = args.provenance; changedFields.push("provenance"); }

    await ctx.db.patch(args.findingId, patch);

    await writeAuditLog(ctx, {
      organizationId: args.organizationId,
      eventType: "record_updated",
      recordId: String(args.findingId),
      userId: callerUserId,
      notes: `Updated fields: ${changedFields.join(", ")}`,
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: transitionStatus
// Enforces valid state machine transitions. Requires reason for
// deferred/dismissed transitions.
// ─────────────────────────────────────────────────────────────────────────────

export const transitionStatus = mutation({
  args: {
    organizationId: v.id("organizations"),
    findingId: v.id("maintenanceFindings"),
    newStatus: statusValidator,
    reason: v.optional(v.string()),
    deferredUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    const now = Date.now();

    const finding = await ctx.db.get(args.findingId);
    if (!finding || finding.organizationId !== args.organizationId) {
      throw new Error("NOT_FOUND: Finding does not exist or does not belong to this organization.");
    }

    const currentStatus = finding.status as FindingStatus;
    const newStatus = args.newStatus as FindingStatus;

    // Validate transition
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(
        `INVALID_TRANSITION: Cannot transition from "${currentStatus}" to "${newStatus}". ` +
        `Allowed transitions: [${(allowed || []).join(", ")}].`,
      );
    }

    // Require reason for deferred and dismissed
    if (newStatus === "deferred" && !args.reason) {
      throw new Error("REASON_REQUIRED: A reason is required when deferring a finding.");
    }
    if (newStatus === "dismissed" && !args.reason) {
      throw new Error("REASON_REQUIRED: A reason is required when dismissing a finding.");
    }

    const patch: Record<string, any> = {
      status: newStatus,
      updatedAt: now,
      updatedByUserId: callerUserId,
    };

    if (newStatus === "deferred") {
      patch.deferredReason = args.reason;
      if (args.deferredUntil) patch.deferredUntil = args.deferredUntil;
    }
    if (newStatus === "dismissed") {
      patch.dismissedReason = args.reason;
    }

    await ctx.db.patch(args.findingId, patch);

    await writeAuditLog(ctx, {
      organizationId: args.organizationId,
      eventType: "finding_status_changed",
      recordId: String(args.findingId),
      userId: callerUserId,
      fieldName: "status",
      oldValue: JSON.stringify(currentStatus),
      newValue: JSON.stringify(newStatus),
      notes: args.reason ?? undefined,
    });

    return { success: true, previousStatus: currentStatus, newStatus };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: linkToWorkOrder
// Associates a finding with a work order. Finding must be in "approved" status.
// Transitions status to "linked_to_wo".
// ─────────────────────────────────────────────────────────────────────────────

export const linkToWorkOrder = mutation({
  args: {
    organizationId: v.id("organizations"),
    findingId: v.id("maintenanceFindings"),
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    const now = Date.now();

    const finding = await ctx.db.get(args.findingId);
    if (!finding || finding.organizationId !== args.organizationId) {
      throw new Error("NOT_FOUND: Finding does not exist or does not belong to this organization.");
    }

    // Must be in approved status to link
    if (finding.status !== "approved") {
      throw new Error(
        `INVALID_STATE: Finding must be in "approved" status to link to a work order. ` +
        `Current status: "${finding.status}".`,
      );
    }

    // Validate work order exists and belongs to same org
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) {
      throw new Error("WO_NOT_FOUND: Work order does not exist.");
    }
    if (workOrder.organizationId !== args.organizationId) {
      throw new Error("ORG_MISMATCH: Work order does not belong to this organization.");
    }

    // Validate work order is in an active status
    const terminalWoStatuses = ["closed", "voided", "completed"];
    if (terminalWoStatuses.includes(workOrder.status)) {
      throw new Error(
        `INVALID_WO_STATE: Cannot link to a work order in "${workOrder.status}" status.`,
      );
    }

    await ctx.db.patch(args.findingId, {
      status: "linked_to_wo" as const,
      workOrderId: args.workOrderId,
      linkedAt: now,
      linkedByUserId: callerUserId,
      unlinkedReason: undefined,
      updatedAt: now,
      updatedByUserId: callerUserId,
    });

    await writeAuditLog(ctx, {
      organizationId: args.organizationId,
      eventType: "finding_wo_linked",
      recordId: String(args.findingId),
      userId: callerUserId,
      newValue: JSON.stringify({ workOrderId: String(args.workOrderId) }),
      notes: `Linked finding ${finding.findingNumber} to WO ${workOrder.workOrderNumber}`,
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: unlinkFromWorkOrder
// Removes work-order association. Reason is REQUIRED. Transitions status
// back to "approved" so the finding can be re-linked or handled differently.
// ─────────────────────────────────────────────────────────────────────────────

export const unlinkFromWorkOrder = mutation({
  args: {
    organizationId: v.id("organizations"),
    findingId: v.id("maintenanceFindings"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const callerUserId = await requireAuth(ctx);
    const now = Date.now();

    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error("REASON_REQUIRED: A non-empty reason is required to unlink a finding from a work order.");
    }

    const finding = await ctx.db.get(args.findingId);
    if (!finding || finding.organizationId !== args.organizationId) {
      throw new Error("NOT_FOUND: Finding does not exist or does not belong to this organization.");
    }

    if (finding.status !== "linked_to_wo") {
      throw new Error(
        `INVALID_STATE: Finding must be in "linked_to_wo" status to unlink. ` +
        `Current status: "${finding.status}".`,
      );
    }

    const previousWorkOrderId = finding.workOrderId;

    await ctx.db.patch(args.findingId, {
      status: "approved" as const,
      workOrderId: undefined,
      linkedAt: undefined,
      linkedByUserId: undefined,
      unlinkedReason: args.reason,
      updatedAt: now,
      updatedByUserId: callerUserId,
    });

    await writeAuditLog(ctx, {
      organizationId: args.organizationId,
      eventType: "finding_wo_unlinked",
      recordId: String(args.findingId),
      userId: callerUserId,
      oldValue: JSON.stringify({ workOrderId: String(previousWorkOrderId) }),
      notes: `Unlinked: ${args.reason}`,
    });

    return { success: true };
  },
});
