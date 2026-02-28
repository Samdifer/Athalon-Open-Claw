/**
 * gapFixes.ts — Technician Journey Gap Fixes
 *
 * Addresses 63 gaps found in the Phase 1-10 technician user journey audit.
 * Grouped by functional area.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { createNotificationHelper } from "./notifications";

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED");
  return identity.subject;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: AIRCRAFT & INDUCTION (GAP-01, GAP-02, GAP-03, GAP-04)
// ═══════════════════════════════════════════════════════════════════════════════

/** GAP-01: Update aircraft total time (monotonically increasing per INV-18) */
export const updateAircraftTotalTime = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    totalTimeAirframeHours: v.number(),
    asOfDate: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const ac = await ctx.db.get(args.aircraftId);
    if (!ac) throw new Error("Aircraft not found.");
    // INV-18: monotonically increasing
    if (args.totalTimeAirframeHours < ac.totalTimeAirframeHours) {
      throw new Error(
        `INV-18 VIOLATION: New TT (${args.totalTimeAirframeHours}) < current TT (${ac.totalTimeAirframeHours}). Decreasing TT is not permitted.`
      );
    }
    await ctx.db.patch(args.aircraftId, {
      totalTimeAirframeHours: args.totalTimeAirframeHours,
      totalTimeAirframeAsOfDate: args.asOfDate,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/** GAP-02: Induct aircraft — records arrival, TT, and creates initial event */
export const inductAircraft = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    workOrderId: v.id("workOrders"),
    totalTimeAtInduction: v.number(),
    inductionNotes: v.optional(v.string()),
    walkAroundFindings: v.optional(v.string()),
    logbookReviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    const ac = await ctx.db.get(args.aircraftId);
    if (!ac) throw new Error("Aircraft not found.");

    // Update TT (INV-18 enforced)
    if (args.totalTimeAtInduction < ac.totalTimeAirframeHours) {
      throw new Error(`INV-18 VIOLATION: Induction TT (${args.totalTimeAtInduction}) < current TT (${ac.totalTimeAirframeHours}).`);
    }
    await ctx.db.patch(args.aircraftId, {
      totalTimeAirframeHours: args.totalTimeAtInduction,
      totalTimeAirframeAsOfDate: now,
      updatedAt: now,
    });

    // Update work order with induction data
    await ctx.db.patch(args.workOrderId, {
      inductedAt: now,
      aircraftTotalTimeAtOpen: args.totalTimeAtInduction,
      customerFacingStatus: "received_inspection_pending",
      updatedAt: now,
    });

    // Store induction record
    const inductionId = await ctx.db.insert("inductionRecords", {
      aircraftId: args.aircraftId,
      workOrderId: args.workOrderId,
      totalTimeAtInduction: args.totalTimeAtInduction,
      inductionNotes: args.inductionNotes,
      walkAroundFindings: args.walkAroundFindings,
      logbookReviewNotes: args.logbookReviewNotes,
      inductedAt: now,
    });

    return inductionId;
  },
});

/** GAP-03: Set customer-facing status on work orders */
export const setCustomerFacingStatus = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    customerFacingStatus: v.union(
      v.literal("awaiting_arrival"),
      v.literal("received_inspection_pending"),
      v.literal("inspection_in_progress"),
      v.literal("discrepancy_authorization_required"),
      v.literal("awaiting_parts"),
      v.literal("work_in_progress"),
      v.literal("final_inspection_pending"),
      v.literal("ready_for_pickup"),
      v.literal("completed"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error("Work order not found.");
    await ctx.db.patch(args.workOrderId, {
      customerFacingStatus: args.customerFacingStatus,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2: WORK SCOPE & TASK CARDS (GAP-06, GAP-07, GAP-08, GAP-09, GAP-22)
// ═══════════════════════════════════════════════════════════════════════════════

/** GAP-06: Inspection template system */
export const createInspectionTemplate = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    aircraftMake: v.optional(v.string()),
    aircraftModel: v.optional(v.string()),
    inspectionType: v.string(),
    approvedDataSource: v.string(),
    approvedDataRevision: v.optional(v.string()),
    steps: v.array(v.object({
      stepNumber: v.number(),
      description: v.string(),
      requiresSpecialTool: v.boolean(),
      specialToolReference: v.optional(v.string()),
      signOffRequired: v.boolean(),
      signOffRequiresIa: v.boolean(),
      estimatedDurationMinutes: v.optional(v.number()),
      zoneReference: v.optional(v.string()),
      measurementSpec: v.optional(v.object({
        name: v.string(),
        unit: v.string(),
        minValue: v.optional(v.number()),
        maxValue: v.optional(v.number()),
      })),
    })),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (!args.name.trim()) throw new Error("Template name required.");
    if (args.steps.length === 0) throw new Error("At least one step required.");
    const now = Date.now();
    return ctx.db.insert("inspectionTemplates", {
      organizationId: args.organizationId,
      name: args.name.trim(),
      aircraftMake: args.aircraftMake?.trim(),
      aircraftModel: args.aircraftModel?.trim(),
      inspectionType: args.inspectionType,
      approvedDataSource: args.approvedDataSource,
      approvedDataRevision: args.approvedDataRevision,
      steps: args.steps,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listInspectionTemplates = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("inspectionTemplates")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

/** Create task card from template — pre-populates all steps */
export const createTaskCardFromTemplate = mutation({
  args: {
    templateId: v.id("inspectionTemplates"),
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
    taskCardNumber: v.string(),
    title: v.string(),
    assignedToTechnicianId: v.optional(v.id("technicians")),
    estimatedHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found.");

    const now = Date.now();
    const cardId = await ctx.db.insert("taskCards", {
      workOrderId: args.workOrderId,
      aircraftId: args.aircraftId,
      organizationId: args.organizationId,
      taskCardNumber: args.taskCardNumber,
      title: args.title.trim(),
      taskType: "inspection",
      approvedDataSource: template.approvedDataSource,
      approvedDataRevision: template.approvedDataRevision,
      assignedToTechnicianId: args.assignedToTechnicianId,
      status: "not_started",
      stepCount: template.steps.length,
      completedStepCount: 0,
      naStepCount: 0,
      estimatedHours: args.estimatedHours,
      createdAt: now,
      updatedAt: now,
    });

    // Create all steps from template
    for (const step of template.steps) {
      await ctx.db.insert("taskCardSteps", {
        taskCardId: cardId,
        workOrderId: args.workOrderId,
        aircraftId: args.aircraftId,
        organizationId: args.organizationId,
        stepNumber: step.stepNumber,
        description: step.description,
        requiresSpecialTool: step.requiresSpecialTool,
        specialToolReference: step.specialToolReference,
        signOffRequired: step.signOffRequired,
        signOffRequiresIa: step.signOffRequiresIa,
        status: "pending",
        estimatedDurationMinutes: step.estimatedDurationMinutes,
        zoneReference: step.zoneReference,
        measurementSpec: step.measurementSpec,
        discrepancyIds: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    return cardId;
  },
});

/** GAP-07: Add step to existing task card */
export const addStepToTaskCard = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    organizationId: v.id("organizations"),
    description: v.string(),
    requiresSpecialTool: v.boolean(),
    specialToolReference: v.optional(v.string()),
    signOffRequired: v.boolean(),
    signOffRequiresIa: v.boolean(),
    estimatedDurationMinutes: v.optional(v.number()),
    zoneReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const card = await ctx.db.get(args.taskCardId);
    if (!card) throw new Error("Task card not found.");
    if (card.organizationId !== args.organizationId) throw new Error("ORG_MISMATCH.");
    if (card.status === "complete" || card.status === "voided") {
      throw new Error("Cannot add steps to a completed or voided task card.");
    }

    // Determine next step number
    const existingSteps = await ctx.db
      .query("taskCardSteps")
      .filter((q) => q.eq(q.field("taskCardId"), args.taskCardId))
      .collect();
    const nextStepNumber = existingSteps.length + 1;

    const now = Date.now();
    const stepId = await ctx.db.insert("taskCardSteps", {
      taskCardId: args.taskCardId,
      workOrderId: card.workOrderId,
      aircraftId: card.aircraftId,
      organizationId: args.organizationId,
      stepNumber: nextStepNumber,
      description: args.description,
      requiresSpecialTool: args.requiresSpecialTool,
      specialToolReference: args.specialToolReference,
      signOffRequired: args.signOffRequired,
      signOffRequiresIa: args.signOffRequiresIa,
      status: "pending",
      estimatedDurationMinutes: args.estimatedDurationMinutes,
      zoneReference: args.zoneReference,
      discrepancyIds: [],
      createdAt: now,
      updatedAt: now,
    });

    // Update step count on card
    await ctx.db.patch(args.taskCardId, {
      stepCount: nextStepNumber,
      updatedAt: now,
    });

    return stepId;
  },
});

/** GAP-18: Mark step as in progress */
export const startStep = mutation({
  args: {
    stepId: v.id("taskCardSteps"),
    technicianId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const step = await ctx.db.get(args.stepId);
    if (!step) throw new Error("Step not found.");
    if (step.status !== "pending") throw new Error("Can only start a pending step.");
    await ctx.db.patch(args.stepId, {
      status: "in_progress",
      startedByTechnicianId: args.technicianId,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update card status if it was not_started
    const card = await ctx.db.get(step.taskCardId);
    if (card && card.status === "not_started") {
      await ctx.db.patch(step.taskCardId, { status: "in_progress", startedAt: Date.now(), updatedAt: Date.now() });
    }
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: PARTS (GAP-11, GAP-12, GAP-14, GAP-15)
// ═══════════════════════════════════════════════════════════════════════════════

/** GAP-11: Complete receiving inspection — moves parts from pending_inspection → inventory */
export const completeReceivingInspection = mutation({
  args: {
    partId: v.id("parts"),
    inspectedByTechnicianId: v.id("technicians"),
    inspectionResult: v.union(v.literal("approved"), v.literal("rejected")),
    inspectionNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const part = await ctx.db.get(args.partId);
    if (!part) throw new Error("Part not found.");
    if (part.location !== "pending_inspection") {
      throw new Error(`Part is not in pending_inspection status (current: ${part.location}).`);
    }
    const now = Date.now();
    if (args.inspectionResult === "approved") {
      await ctx.db.patch(args.partId, {
        location: "inventory",
        receivingInspectedBy: args.inspectedByTechnicianId,
        receivingInspectedAt: now,
        receivingInspectionNotes: args.inspectionNotes,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.partId, {
        location: "quarantine",
        condition: "unserviceable",
        receivingInspectedBy: args.inspectedByTechnicianId,
        receivingInspectedAt: now,
        receivingInspectionNotes: args.inspectionNotes,
        receivingRejectionReason: args.rejectionReason,
        updatedAt: now,
      });
    }
    return { success: true, newLocation: args.inspectionResult === "approved" ? "inventory" : "quarantine" };
  },
});

/** GAP-14: Reserve part for a work order */
export const reservePartForWorkOrder = mutation({
  args: {
    partId: v.id("parts"),
    workOrderId: v.id("workOrders"),
    reservedByTechnicianId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const part = await ctx.db.get(args.partId);
    if (!part) throw new Error("Part not found.");
    if (part.location !== "inventory") throw new Error("Only inventory parts can be reserved.");
    if (part.reservedForWorkOrderId) throw new Error("Part is already reserved for another work order.");
    await ctx.db.patch(args.partId, {
      reservedForWorkOrderId: args.workOrderId,
      reservedByTechnicianId: args.reservedByTechnicianId,
      reservedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const releasePartReservation = mutation({
  args: { partId: v.id("parts") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const part = await ctx.db.get(args.partId);
    if (!part) throw new Error("Part not found.");
    await ctx.db.patch(args.partId, {
      reservedForWorkOrderId: undefined,
      reservedByTechnicianId: undefined,
      reservedAt: undefined,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/** List parts pending receiving inspection */
export const listPartsPendingInspection = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("parts")
      .withIndex("by_location", (q) => q.eq("organizationId", args.organizationId).eq("location", "pending_inspection"))
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: INSPECTION EXECUTION (GAP-16, GAP-17, GAP-21, GAP-24)
// ═══════════════════════════════════════════════════════════════════════════════

/** GAP-16 + GAP-17: Enhanced step completion with photos and measurements */
export const completeStepEnhanced = mutation({
  args: {
    stepId: v.id("taskCardSteps"),
    technicianId: v.id("technicians"),
    action: v.union(v.literal("complete"), v.literal("mark_na")),
    notes: v.optional(v.string()),
    // GAP-16: Photos
    photoUrls: v.optional(v.array(v.string())),
    // GAP-17: Measurements
    measurements: v.optional(v.array(v.object({
      name: v.string(),
      value: v.number(),
      unit: v.string(),
      withinLimits: v.boolean(),
      minLimit: v.optional(v.number()),
      maxLimit: v.optional(v.number()),
      notes: v.optional(v.string()),
    }))),
    // Parts
    partsInstalled: v.optional(v.array(v.object({
      partId: v.optional(v.id("parts")),
      partNumber: v.string(),
      serialNumber: v.optional(v.string()),
      description: v.string(),
      quantity: v.number(),
    }))),
    partsRemoved: v.optional(v.array(v.object({
      partId: v.optional(v.id("parts")),
      partNumber: v.string(),
      serialNumber: v.optional(v.string()),
      description: v.string(),
      conditionAtRemoval: v.union(
        v.literal("serviceable"),
        v.literal("unserviceable"),
        v.literal("damaged"),
        v.literal("beyond_limits"),
        v.literal("time_expired"),
      ),
      intendedDisposition: v.union(
        v.literal("scrap"),
        v.literal("overhaul"),
        v.literal("return_to_stock"),
        v.literal("return_to_customer"),
        v.literal("return_to_vendor"),
      ),
    }))),
    // Approved data reference
    approvedDataReference: v.optional(v.string()),
    // NA reason
    naReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    const step = await ctx.db.get(args.stepId);
    if (!step) throw new Error("Step not found.");
    if (step.status === "completed") throw new Error("Step already completed.");

    const tech = await ctx.db.get(args.technicianId);
    if (!tech) throw new Error("Technician not found.");

    if (args.action === "mark_na") {
      if (!args.naReason?.trim()) throw new Error("NA reason required.");
      await ctx.db.patch(args.stepId, {
        status: "na",
        naReason: args.naReason.trim(),
        naAuthorizedById: args.technicianId,
        naAuthorizedAt: now,
        updatedAt: now,
      });
    } else {
      // Complete the step
      await ctx.db.patch(args.stepId, {
        status: "completed",
        signedByTechnicianId: args.technicianId,
        signedAt: now,
        notes: args.notes?.trim(),
        photoUrls: args.photoUrls,
        measurements: args.measurements,
        partsInstalled: args.partsInstalled,
        partsRemoved: args.partsRemoved,
        approvedDataReference: args.approvedDataReference?.trim(),
        updatedAt: now,
      });

      // GAP-12 fix: Auto-call installPart for each partsInstalled with partId
      if (args.partsInstalled) {
        for (const pi of args.partsInstalled) {
          if (pi.partId) {
            const part = await ctx.db.get(pi.partId);
            if (part && part.location === "inventory") {
              await ctx.db.patch(pi.partId, {
                location: "installed",
                installedOnAircraftId: step.aircraftId,
                installedOnWorkOrderId: step.workOrderId,
                installedAt: now,
                installedByTechnicianId: args.technicianId,
                updatedAt: now,
              });
            }
          }
        }
      }

      // GAP-13 fix: Update removed parts
      if (args.partsRemoved) {
        for (const pr of args.partsRemoved) {
          if (pr.partId) {
            const part = await ctx.db.get(pr.partId);
            if (part && part.location === "installed") {
              await ctx.db.patch(pr.partId, {
                location: "removed_pending_disposition",
                condition: pr.conditionAtRemoval === "serviceable" ? "serviceable" : "unserviceable",
                removedAt: now,
                removedByTechnicianId: args.technicianId,
                removalCondition: pr.conditionAtRemoval,
                intendedDisposition: pr.intendedDisposition,
                updatedAt: now,
              });
            }
          }
        }
      }
    }

    // Update card step counts
    const allSteps = await ctx.db
      .query("taskCardSteps")
      .filter((q) => q.eq(q.field("taskCardId"), step.taskCardId))
      .collect();
    const completedCount = allSteps.filter((s) => s.status === "completed" || s.status === "na").length;
    await ctx.db.patch(step.taskCardId, {
      completedStepCount: completedCount,
      status: completedCount >= allSteps.length ? "complete" : "in_progress",
      completedAt: completedCount >= allSteps.length ? now : undefined,
      updatedAt: now,
    });

    return { success: true };
  },
});

/** GAP-21: Enhanced My Work query with aircraft registration */
export const listMyWorkEnhanced = query({
  args: { technicianId: v.id("technicians"), organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("taskCards")
      .withIndex("by_org_assigned", (q) =>
        q.eq("organizationId", args.organizationId).eq("assignedToTechnicianId", args.technicianId))
      .collect();

    const results = [];
    for (const card of cards) {
      if (card.status === "complete" || card.status === "voided") continue;
      const wo = await ctx.db.get(card.workOrderId);
      const ac = await ctx.db.get(card.aircraftId);
      results.push({
        ...card,
        workOrderId: card?.workOrderId ?? null,
        workOrderNumber: wo?.workOrderNumber ?? "Unknown",
        aircraftRegistration: ac?.currentRegistration ?? "Unknown",
        aircraftMakeModel: ac ? `${ac.make} ${ac.model}` : "Unknown",
      });
    }
    return results;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5: DISCREPANCIES (GAP-01, GAP-02, GAP-04, GAP-05, GAP-06)
// ═══════════════════════════════════════════════════════════════════════════════

/** Enhanced discrepancy opening with severity, priority, step link, photos */
export const openDiscrepancyEnhanced = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
    description: v.string(),
    componentAffected: v.optional(v.string()),
    componentPartNumber: v.optional(v.string()),
    componentSerialNumber: v.optional(v.string()),
    componentPosition: v.optional(v.string()),
    foundDuring: v.union(
      v.literal("annual_inspection"),
      v.literal("100hr_inspection"),
      v.literal("progressive_inspection"),
      v.literal("routine_maintenance"),
      v.literal("preflight"),
      v.literal("pilot_report"),
      v.literal("ad_compliance_check"),
      v.literal("other"),
    ),
    foundAtAircraftHours: v.number(),
    // NEW FIELDS:
    taskCardStepId: v.optional(v.id("taskCardSteps")),
    taskCardId: v.optional(v.id("taskCards")),
    severity: v.union(
      v.literal("critical"),
      v.literal("major"),
      v.literal("minor"),
      v.literal("observation"),
    ),
    priority: v.union(
      v.literal("aog"),
      v.literal("urgent"),
      v.literal("routine"),
      v.literal("deferred"),
    ),
    photoUrls: v.optional(v.array(v.string())),
    reportedByTechnicianId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();

    // Get aircraft actual TT if not provided correctly
    let hours = args.foundAtAircraftHours;
    if (hours === 0) {
      const ac = await ctx.db.get(args.aircraftId);
      if (ac) hours = ac.totalTimeAirframeHours;
    }

    // Generate discrepancy number
    const existing = await ctx.db
      .query("discrepancies")
      .filter((q) => q.eq(q.field("workOrderId"), args.workOrderId))
      .collect();
    const discNumber = `DISC-${String(existing.length + 1).padStart(3, "0")}`;

    const discId = await ctx.db.insert("discrepancies", {
      workOrderId: args.workOrderId,
      aircraftId: args.aircraftId,
      organizationId: args.organizationId,
      discrepancyNumber: discNumber,
      status: "open",
      foundDuring: args.foundDuring,
      description: args.description.trim(),
      componentAffected: args.componentAffected?.trim(),
      componentPartNumber: args.componentPartNumber?.trim(),
      componentSerialNumber: args.componentSerialNumber?.trim(),
      componentPosition: args.componentPosition?.trim(),
      foundByTechnicianId: args.reportedByTechnicianId,
      foundAt: now,
      foundAtAircraftHours: hours,
      taskCardStepId: args.taskCardStepId,
      taskCardId: args.taskCardId,
      severity: args.severity,
      priority: args.priority,
      photoUrls: args.photoUrls,
      reportedByTechnicianId: args.reportedByTechnicianId,
      createdAt: now,
      updatedAt: now,
    });

    // If raised from a step, link back
    if (args.taskCardStepId) {
      const step = await ctx.db.get(args.taskCardStepId);
      if (step) {
        const currentIds = step.discrepancyIds ?? [];
        await ctx.db.patch(args.taskCardStepId, {
          discrepancyIds: [...currentIds, discId],
        });
      }
    }

    // GAP-09: Auto-set customer-facing status when discrepancy requires authorization
    if (args.severity === "critical" || args.severity === "major") {
      await ctx.db.patch(args.workOrderId, {
        customerFacingStatus: "discrepancy_authorization_required",
        updatedAt: now,
      });
    }

    return discId;
  },
});

/** GAP-06: Enhanced disposition with more options */
export const dispositionDiscrepancyEnhanced = mutation({
  args: {
    discrepancyId: v.id("discrepancies"),
    disposition: v.union(
      v.literal("corrected"),
      v.literal("replaced"),
      v.literal("overhauled"),
      v.literal("serviceable_as_is"),
      v.literal("deferred_mel"),
      v.literal("deferred_grounded"),
      v.literal("deferred_customer_declined"),
      v.literal("deferred_next_inspection"),
      v.literal("no_fault_found"),
      v.literal("no_fault_found_could_not_reproduce"),
    ),
    correctiveAction: v.string(),
    dispositionedByTechnicianId: v.id("technicians"),
    approvedDataReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const disc = await ctx.db.get(args.discrepancyId);
    if (!disc) throw new Error("Discrepancy not found.");
    await ctx.db.patch(args.discrepancyId, {
      status: "dispositioned",
      disposition: args.disposition,
      correctiveAction: args.correctiveAction.trim(),
      dispositionedByTechnicianId: args.dispositionedByTechnicianId,
      dispositionedAt: Date.now(),
      dispositionApprovedDataReference: args.approvedDataReference?.trim(),
      dispositionNotes: args.notes?.trim(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 6: QUOTE AUTHORIZATION (GAP-07, GAP-08, GAP-10)
// ═══════════════════════════════════════════════════════════════════════════════

/** GAP-08: Approve/decline individual quote line items */
export const decideQuoteLineItem = mutation({
  args: {
    orgId: v.id("organizations"),
    lineItemId: v.id("quoteLineItems"),
    decision: v.union(v.literal("approved"), v.literal("declined"), v.literal("deferred")),
    decisionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const item = await ctx.db.get(args.lineItemId);
    if (!item) throw new Error("Line item not found.");
    if (item.orgId !== args.orgId) throw new Error("ORG_MISMATCH.");
    await ctx.db.patch(args.lineItemId, {
      customerDecision: args.decision,
      customerDecisionNotes: args.decisionNotes?.trim(),
      customerDecisionAt: Date.now(),
    });

    // GAP-10: If declined and linked to a discrepancy, defer the discrepancy
    if (args.decision === "declined" && item.discrepancyId) {
      const disc = await ctx.db.get(item.discrepancyId);
      if (disc && disc.status === "open") {
        await ctx.db.patch(item.discrepancyId, {
          status: "dispositioned",
          disposition: "deferred_customer_declined",
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 8: QCM REVIEW (GAP-01, GAP-05)
// ═══════════════════════════════════════════════════════════════════════════════

/** GAP-05 (Phase 8): List all steps requiring IA sign-off across all active WOs */
export const listStepsRequiringIAReview = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const allSteps = await ctx.db
      .query("taskCardSteps")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const needsReview = allSteps.filter(
      (s) => s.signOffRequiresIa && s.status === "pending"
    );

    const results = [];
    for (const step of needsReview) {
      const card = await ctx.db.get(step.taskCardId);
      const wo = card ? await ctx.db.get(card.workOrderId) : null;
      const ac = step.aircraftId ? await ctx.db.get(step.aircraftId) : null;
      results.push({
        ...step,
        taskCardTitle: card?.title ?? "Unknown",
        taskCardNumber: card?.taskCardNumber ?? "Unknown",
        workOrderNumber: wo?.workOrderNumber ?? "Unknown",
        aircraftRegistration: ac?.currentRegistration ?? "Unknown",
      });
    }
    return results;
  },
});

/** Get work summary for billing context (GAP-17 Phase 10) */
export const getWorkOrderSummaryForBilling = query({
  args: { workOrderId: v.id("workOrders"), orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error("Work order not found.");

    const cards = await ctx.db
      .query("taskCards")
      .filter((q) => q.eq(q.field("workOrderId"), args.workOrderId))
      .collect();

    const discrepancies = await ctx.db
      .query("discrepancies")
      .filter((q) => q.eq(q.field("workOrderId"), args.workOrderId))
      .collect();

    const timeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org_wo", (q) => q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId))
      .collect();

    const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

    // Collect all installed parts across all steps
    const allParts: Array<{ partNumber: string; description: string; quantity: number }> = [];
    for (const card of cards) {
      const steps = await ctx.db
        .query("taskCardSteps")
        .filter((q) => q.eq(q.field("taskCardId"), card._id))
        .collect();
      for (const step of steps) {
        if (step.partsInstalled) {
          for (const p of step.partsInstalled as Array<{ partNumber: string; description: string; quantity: number }>) {
            allParts.push(p);
          }
        }
      }
    }

    return {
      workOrder: wo,
      taskCardCount: cards.length,
      completedCards: cards.filter((c) => c.status === "complete").length,
      discrepancyCount: discrepancies.length,
      resolvedDiscrepancies: discrepancies.filter((d) => d.status === "dispositioned").length,
      laborHours: Math.round(totalMinutes / 60 * 10) / 10,
      laborEntryCount: timeEntries.length,
      partsInstalled: allParts,
    };
  },
});

/** GAP-14 (Phase 10): Create invoice from WO with auto-populated parts + labor rates */
export const createInvoiceFromWorkOrderEnhanced = mutation({
  args: {
    orgId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    createdByTechId: v.id("technicians"),
    laborRatePerHour: v.number(),
    dueDate: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();

    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error("Work order not found.");

    // Generate invoice number
    const counter = await ctx.db
      .query("orgCounters")
      .withIndex("by_org_type", (q) => q.eq("orgId", args.orgId as string).eq("counterType", "invoice"))
      .first();
    const next = (counter?.lastValue ?? 0) + 1;
    if (counter) await ctx.db.patch(counter._id, { lastValue: next });
    else await ctx.db.insert("orgCounters", { orgId: args.orgId as string, counterType: "invoice", lastValue: next });
    const invNumber = `INV-${String(next).padStart(4, "0")}`;

    // Get labor hours from time entries
    const timeEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_org_wo", (q) => q.eq("orgId", args.orgId).eq("workOrderId", args.workOrderId))
      .collect();
    const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
    const laborTotal = Math.round(totalHours * args.laborRatePerHour * 100) / 100;

    // Get parts from completed task card steps
    const cards = await ctx.db
      .query("taskCards")
      .filter((q) => q.eq(q.field("workOrderId"), args.workOrderId))
      .collect();
    let partsTotal = 0;
    const partsLineItems: Array<{ description: string; qty: number; unitPrice: number; total: number }> = [];

    for (const card of cards) {
      const steps = await ctx.db
        .query("taskCardSteps")
        .filter((q) => q.eq(q.field("taskCardId"), card._id))
        .collect();
      for (const step of steps) {
        if (step.partsInstalled) {
          for (const p of step.partsInstalled as Array<{ partNumber: string; description: string; quantity: number; partId?: string }>) {
            let unitPrice = 0;
            if (p.partId) {
              const part = await ctx.db.get(p.partId as Id<"parts">);
              if (part) unitPrice = (part as any).unitCost ?? 0;
            }
            const total = Math.round(p.quantity * unitPrice * 100) / 100;
            partsLineItems.push({ description: `${p.partNumber} — ${p.description}`, qty: p.quantity, unitPrice, total });
            partsTotal += total;
          }
        }
      }
    }

    // Get tax
    const taxRates = await ctx.db
      .query("taxRates")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("active", true))
      .collect();
    let tax = 0;
    for (const tr of taxRates) {
      if (tr.appliesTo === "all") tax += (laborTotal + partsTotal) * tr.rate / 100;
      else if (tr.appliesTo === "labor") tax += laborTotal * tr.rate / 100;
      else if (tr.appliesTo === "parts") tax += partsTotal * tr.rate / 100;
    }
    tax = Math.round(tax * 100) / 100;

    const subtotal = Math.round((laborTotal + partsTotal) * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const invoiceId = await ctx.db.insert("invoices", {
      orgId: args.orgId,
      workOrderId: args.workOrderId,
      customerId: wo.customerId!,
      invoiceNumber: invNumber,
      status: "DRAFT",
      createdByTechId: args.createdByTechId,
      laborTotal,
      partsTotal,
      subtotal,
      tax,
      total,
      amountPaid: 0,
      balance: total,
      dueDate: args.dueDate,
      paymentTerms: args.paymentTerms,
      createdAt: now,
      updatedAt: now,
    });

    // Create labor line item
    if (totalHours > 0) {
      await ctx.db.insert("invoiceLineItems", {
        orgId: args.orgId,
        invoiceId,
        type: "labor",
        description: `Labor: ${totalHours} hours @ $${args.laborRatePerHour}/hr`,
        qty: totalHours,
        unitPrice: args.laborRatePerHour,
        total: laborTotal,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create parts line items
    for (const pl of partsLineItems) {
      await ctx.db.insert("invoiceLineItems", {
        orgId: args.orgId,
        invoiceId,
        type: "part",
        description: pl.description,
        qty: pl.qty,
        unitPrice: pl.unitPrice,
        total: pl.total,
        createdAt: now,
        updatedAt: now,
      });
    }

    return invoiceId;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 9: RELEASE TO CUSTOMER (GAP-18)
// ═══════════════════════════════════════════════════════════════════════════════

export const releaseAircraftToCustomer = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    releasedByTechnicianId: v.id("technicians"),
    customerSignature: v.optional(v.string()),
    pickupNotes: v.optional(v.string()),
    aircraftTotalTimeAtRelease: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error("Work order not found.");

    await ctx.db.patch(args.workOrderId, {
      customerFacingStatus: "completed",
      releasedAt: now,
      releasedByTechnicianId: args.releasedByTechnicianId,
      customerSignatureAtRelease: args.customerSignature,
      pickupNotes: args.pickupNotes,
      updatedAt: now,
    });

    // Update aircraft
    if (wo.aircraftId) {
      const ac = await ctx.db.get(wo.aircraftId);
      if (ac && args.aircraftTotalTimeAtRelease >= ac.totalTimeAirframeHours) {
        await ctx.db.patch(wo.aircraftId, {
          totalTimeAirframeHours: args.aircraftTotalTimeAtRelease,
          totalTimeAirframeAsOfDate: now,
          updatedAt: now,
        });
      }
    }

    // Notify shop managers about aircraft release
    const managers = await ctx.db
      .query("technicians")
      .withIndex("by_organization", (q) => q.eq("organizationId", wo.organizationId))
      .filter((q) =>
        q.or(
          q.eq(q.field("role"), "shop_manager"),
          q.eq(q.field("role"), "admin"),
        ),
      )
      .collect();
    for (const mgr of managers) {
      if (mgr.userId) {
        await createNotificationHelper(ctx, {
          organizationId: wo.organizationId,
          recipientUserId: mgr.userId,
          type: "rts_ready",
          title: "Aircraft Released to Customer",
          message: `Work order ${wo.workOrderNumber} — aircraft released to customer.`,
          linkTo: `/work-orders/${wo.workOrderNumber}`,
        });
      }
    }

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-CUTTING: GLOBAL SEARCH (GAP-21)
// ═══════════════════════════════════════════════════════════════════════════════

export const globalSearch = query({
  args: { organizationId: v.id("organizations"), query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.toLowerCase().trim();
    if (q.length < 2) return { workOrders: [], aircraft: [], taskCards: [] };

    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_organization", (q2) => q2.eq("organizationId", args.organizationId))
      .collect();
    const matchedWOs = workOrders
      .filter((wo) =>
        wo.workOrderNumber.toLowerCase().includes(q) ||
        wo.description.toLowerCase().includes(q))
      .slice(0, 10);

    const aircraft = await ctx.db
      .query("aircraft")
      .withIndex("by_organization", (q2) => q2.eq("operatingOrganizationId", args.organizationId))
      .collect();
    const matchedAC = aircraft
      .filter((ac) =>
        (ac.currentRegistration?.toLowerCase().includes(q)) ||
        ac.make.toLowerCase().includes(q) ||
        ac.model.toLowerCase().includes(q) ||
        ac.serialNumber.toLowerCase().includes(q))
      .slice(0, 10);

    const taskCards = await ctx.db
      .query("taskCards")
      .withIndex("by_organization", (q2) => q2.eq("organizationId", args.organizationId))
      .collect();
    const matchedCards = taskCards
      .filter((tc) =>
        tc.taskCardNumber.toLowerCase().includes(q) ||
        tc.title.toLowerCase().includes(q))
      .slice(0, 10);

    return { workOrders: matchedWOs, aircraft: matchedAC, taskCards: matchedCards };
  },
});

// Temporary helper for QCM simulation
export const listAllOrganizations = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("organizations").collect();
  },
});

export const listAllWorkOrders = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("workOrders").collect();
  },
});

export const listAllTechnicians = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("technicians").collect();
  },
});

export const listAllAircraft = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("aircraft").collect();
  },
});

export const listAllParts = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("parts").collect();
  },
});

export const listAllTaskCards = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("taskCards").collect();
  },
});

export const listAllTaskCardSteps = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("taskCardSteps").collect();
  },
});
