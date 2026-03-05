// convex/taskCards.ts
// Athelon — Aviation MRO SaaS Platform
//
// Implements the Task Card Execution Engine as specified in:
//   phase-2-task-cards/task-card-execution.md (Rafael Mendoza, Marcus Webb)
//   phase-2-work-orders/work-order-engine.md §2.3, §2.4
//   phase-2-signoff/signoff-rts-flow.md §5.3, §6.2
//   reviews/phase-2-gate-review.md
//
// Author:    Devraj Anand (Phase 3 Implementation)
// Spec:      Rafael Mendoza (Tech Lead / Architect)
// Regulatory: Marcus Webb
// QA:        Cilla Oduya
//
// ─── DESIGN PRINCIPLE: Step Granularity ────────────────────────────────────
// Every mutation in this module operates at step granularity, not card granularity.
// The card-level status is ALWAYS DERIVED from its steps — never independently set.
// This is not a UI preference. It is the audit trail requirement.
//
// Per Rafael's preamble in task-card-execution.md:
//   "The FAA does not inspect task cards; they inspect step-level entries.
//   If our audit log shows 'task card completed at 14:32' but no individual
//   step sign-off events, that card is not a defensible maintenance record."
//
// ─── INVARIANTS ENFORCED ────────────────────────────────────────────────────
// INV-02: ratingsExercised must be populated at step sign-off time
// INV-05: signatureAuthEvent is single-use; six-check atomic consumption
// INV-09: Card status is derived from step state, never independently set
// INV-10: Every step sign-off produces a taskCardSteps document update + auditLog entry
//
// ─── AUTH PATTERN ──────────────────────────────────────────────────────────
// ctx.auth.getUserIdentity() → Clerk JWT subject (Clerk user ID)
// Used as userId in all audit log entries.
// Mutations that require technician identity ALSO take callerTechnicianId,
// which is independently validated against the database.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

const taskTypeValidator = v.union(
  v.literal("inspection"),
  v.literal("repair"),
  v.literal("replacement"),
  v.literal("ad_compliance"),
  v.literal("functional_check"),
  v.literal("rigging"),
  v.literal("return_to_service"),
  v.literal("overhaul"),
  v.literal("modification"),
);

const ratingsExercisedValidator = v.array(
  v.union(
    v.literal("airframe"),
    v.literal("powerplant"),
    v.literal("ia"),
    v.literal("none"),
  ),
);

type StepAuthorizationType = "airframe" | "powerplant" | "inspection" | "ndt" | "borescope";

const NDT_PATTERN =
  /\bndt\b|non[-\s]?destructive|eddy\s?current|ultrasonic|magnetic\s+particle|dye\s+penetrant|liquid\s+penetrant/i;
const BORESCOPE_PATTERN = /\bborescope\b|\bboroscope\b/i;
const POWERPLANT_PATTERN =
  /\bpowerplant\b|\bengine\b|\bturbine\b|\bcompressor\b|\bcombustor\b|\bhot section\b|\bpropeller\b|\bfuel nozzle\b/i;

function resolveStepAuthorizationType(args: {
  description: string;
  signOffRequiresIa: boolean;
  specialToolReference?: string | null;
  aircraftSystem?: string | null;
}): StepAuthorizationType {
  const search = `${args.description} ${args.specialToolReference ?? ""}`.toLowerCase();

  if (BORESCOPE_PATTERN.test(search)) return "borescope";
  if (NDT_PATTERN.test(search)) return "ndt";
  if (args.signOffRequiresIa) return "inspection";

  if (
    args.aircraftSystem === "engine_left" ||
    args.aircraftSystem === "engine_right" ||
    args.aircraftSystem === "engine_center" ||
    args.aircraftSystem === "engine_single" ||
    POWERPLANT_PATTERN.test(search)
  ) {
    return "powerplant";
  }

  return "airframe";
}

function isRatingAllowedForAuthorization(
  requiredAuthorizationType: StepAuthorizationType,
  selectedRating: "airframe" | "powerplant" | "ia" | "none",
): boolean {
  if (selectedRating === "none") return false;
  if (requiredAuthorizationType === "inspection") return selectedRating === "ia";
  if (requiredAuthorizationType === "powerplant") return selectedRating === "powerplant";
  return selectedRating === "airframe" || selectedRating === "powerplant" || selectedRating === "ia";
}

/**
 * Validator for a single step definition provided when creating a task card.
 * Prerequisites use step numbers (1-indexed integers), not IDs — IDs don't
 * exist yet at card creation time.
 */
const stepInputValidator = v.object({
  stepNumber: v.number(),
  description: v.string(),
  requiresSpecialTool: v.boolean(),
  specialToolReference: v.optional(v.string()),
  signOffRequired: v.boolean(),
  signOffRequiresIa: v.boolean(),
  estimatedDurationMinutes: v.optional(v.number()),
  prerequisiteStepNumbers: v.optional(v.array(v.number())),
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITY: REQUIRE AUTHENTICATED USER
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "UNAUTHENTICATED: This operation requires a valid Clerk session.",
    );
  }
  return identity.subject;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITY: RECOMPUTE TASK CARD STATUS FROM STEPS
//
// This function implements INV-09: task card status is derived from step state.
// It is called after every step update (completeStep, signTaskCard, etc.)
// to recompute and persist the card's denormalized status and counters.
//
// Returns the new status and counters — does NOT write to the database.
// The caller is responsible for calling ctx.db.patch.
// ─────────────────────────────────────────────────────────────────────────────

function deriveCardStatus(steps: Array<{ status: string; signOffRequiresIa: boolean }>): {
  newStatus: "not_started" | "in_progress" | "incomplete_na_steps" | "complete" | "voided";
  completedCount: number;
  naCount: number;
  pendingCount: number;
  hasNaRequiringIaReview: boolean;
} {
  let completedCount = 0;
  let naCount = 0;
  let pendingCount = 0;
  let hasNaRequiringIaReview = false;

  for (const step of steps) {
    if (step.status === "completed") {
      completedCount++;
    } else if (step.status === "na") {
      naCount++;
      // A step that required IA sign-off but was marked N/A requires IA review
      // before the card can be fully complete.
      if (step.signOffRequiresIa) {
        hasNaRequiringIaReview = true;
      }
    } else {
      pendingCount++;
    }
  }

  // INV-09: Status derivation rules
  let newStatus: "not_started" | "in_progress" | "incomplete_na_steps" | "complete" | "voided";
  if (steps.length === 0) {
    // Degenerate case — should not happen (createTaskCard requires >= 1 step)
    newStatus = "not_started";
  } else if (completedCount === 0 && naCount === 0 && pendingCount === steps.length) {
    newStatus = "not_started";
  } else if (pendingCount > 0) {
    // Work is in flight — at least one step addressed, at least one still pending
    newStatus = "in_progress";
  } else if (pendingCount === 0 && hasNaRequiringIaReview) {
    // All steps addressed, but one or more IA-required steps were N/A'd —
    // these require an IA to formally review the N/A marking before the card closes.
    newStatus = "incomplete_na_steps";
  } else {
    // All steps are completed or N/A'd, and no IA review is outstanding.
    newStatus = "complete";
  }

  return { newStatus, completedCount, naCount, pendingCount, hasNaRequiringIaReview };
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: createTaskCard
//
// Spec ref: task-card-execution.md §4.1 and work-order-engine.md §2.3
// Enforces: INV-10 (per-step records in taskCardSteps), INV per schema (approvedDataSource)
//
// Creates a task card and all its step documents in a single atomic transaction.
// Transitions the parent work order from "open" to "in_progress" if needed.
//
// Critical: approvedDataSource is required and must be non-empty per 14 CFR 43.9(a)(1).
// Every maintenance action must reference approved data. Placeholder values like
// "TBD" or "AMM" are not compliant references — the mutation enforces non-empty.
//
// Atomicity guarantee: Convex mutations are atomic. If step creation fails midway,
// the entire mutation is rolled back — no partial task card with missing steps.
// ─────────────────────────────────────────────────────────────────────────────

export const createTaskCard = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    taskCardNumber: v.string(),
    title: v.string(),
    taskType: taskTypeValidator,

    // Required — 14 CFR 43.9(a)(1). e.g.: "AMM 27-20-00 Rev 15", "FAA AD 2024-15-07"
    approvedDataSource: v.string(),
    approvedDataRevision: v.optional(v.string()),

    assignedToTechnicianId: v.optional(v.id("technicians")),

    // At least one step required. Steps must have sequential numbers starting at 1.
    steps: v.array(stepInputValidator),

    // Aircraft system classification (Phase 1 — Squawks Unification)
    aircraftSystem: v.optional(v.union(
      v.literal("airframe"),
      v.literal("engine_left"),
      v.literal("engine_right"),
      v.literal("engine_center"),
      v.literal("engine_single"),
      v.literal("avionics"),
      v.literal("landing_gear"),
      v.literal("fuel_system"),
      v.literal("hydraulics"),
      v.literal("electrical"),
      v.literal("other"),
    )),
    isInspectionItem: v.optional(v.boolean()),
    isCustomerReported: v.optional(v.boolean()),

    notes: v.optional(v.string()),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"taskCards">> => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Validate work order state ────────────────────────────────────────────
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) {
      throw new Error(`Work order ${args.workOrderId} not found.`);
    }
    if (wo.organizationId !== args.organizationId) {
      throw new Error(
        `Work order ${args.workOrderId} does not belong to organization ${args.organizationId}.`,
      );
    }
    if (wo.status !== "open" && wo.status !== "in_progress") {
      throw new Error(
        `createTaskCard requires work order status "open" or "in_progress". ` +
        `Current status: "${wo.status}". ` +
        `Task cards cannot be added to a closed, voided, or draft work order.`,
      );
    }

    // ── INV per schema: approvedDataSource must be non-empty ──────────────────
    // Per 14 CFR 43.9(a)(1): every maintenance record must reference the approved
    // data used to perform the work. This is captured at task card creation — not
    // at signing. Enforcing it here ensures it is never missing from the audit trail.
    if (!args.approvedDataSource.trim()) {
      throw new Error(
        `approvedDataSource must be a non-empty string. ` +
        `Per 14 CFR 43.9(a)(1), every maintenance action must reference approved data. ` +
        `Acceptable formats: "AMM XX-XX-XX Rev N", "FAA AD YYYY-NN-NN", ` +
        `"SB XXXX-XXX", "AC 43.13-1B Ch.7 §7-89".`,
      );
    }

    // ── Validate steps ───────────────────────────────────────────────────────
    if (args.steps.length === 0) {
      throw new Error(
        `A task card must contain at least one step. ` +
        `A task card without steps is not a complete maintenance procedure.`,
      );
    }

    // Step numbers must be sequential starting at 1
    // INV: Any gap or duplicate breaks the sequential numbering contract.
    const sortedStepNumbers = args.steps.map((s) => s.stepNumber).sort((a, b) => a - b);
    for (let i = 0; i < sortedStepNumbers.length; i++) {
      if (sortedStepNumbers[i] !== i + 1) {
        throw new Error(
          `Step numbers must be sequential starting at 1. ` +
          `Got: [${sortedStepNumbers.join(", ")}]. ` +
          `Expected: [${Array.from({ length: sortedStepNumbers.length }, (_, i) => i + 1).join(", ")}].`,
        );
      }
    }

    // Validate prerequisite step references are internally consistent
    for (const step of args.steps) {
      if (step.prerequisiteStepNumbers) {
        for (const prereqNum of step.prerequisiteStepNumbers) {
          if (!sortedStepNumbers.includes(prereqNum)) {
            throw new Error(
              `Step ${step.stepNumber} references prerequisite step number ${prereqNum} ` +
              `which does not exist in this task card.`,
            );
          }
          if (prereqNum >= step.stepNumber) {
            throw new Error(
              `Step ${step.stepNumber}: prerequisite step number ${prereqNum} ` +
              `must have a lower step number than the dependent step.`,
            );
          }
        }
      }
    }

    // ── Validate assigned technician ──────────────────────────────────────────
    if (args.assignedToTechnicianId) {
      const tech = await ctx.db.get(args.assignedToTechnicianId);
      if (!tech) {
        throw new Error(`Assigned technician ${args.assignedToTechnicianId} not found.`);
      }
      if (tech.status !== "active") {
        throw new Error(
          `Assigned technician ${args.assignedToTechnicianId} (${tech.legalName}) ` +
          `has status "${tech.status}". Only active technicians may be assigned to task cards.`,
        );
      }
      if (tech.organizationId !== args.organizationId) {
        throw new Error(
          `Assigned technician ${args.assignedToTechnicianId} does not belong to ` +
          `organization ${args.organizationId}.`,
        );
      }
    }

    // ── Create task card document ─────────────────────────────────────────────
    const taskCardId = await ctx.db.insert("taskCards", {
      workOrderId: args.workOrderId,
      aircraftId: wo.aircraftId,
      organizationId: args.organizationId,
      taskCardNumber: args.taskCardNumber,
      title: args.title,
      taskType: args.taskType,
      approvedDataSource: args.approvedDataSource.trim(),
      approvedDataRevision: args.approvedDataRevision,
      assignedToTechnicianId: args.assignedToTechnicianId,
      status: "not_started",
      stepCount: args.steps.length,
      completedStepCount: 0,
      naStepCount: 0,
      notes: args.notes,
      // Phase 1 — Squawks Unification fields (all optional)
      ...(args.aircraftSystem !== undefined && { aircraftSystem: args.aircraftSystem }),
      ...(args.isInspectionItem !== undefined && { isInspectionItem: args.isInspectionItem }),
      ...(args.isCustomerReported !== undefined && { isCustomerReported: args.isCustomerReported }),
      createdAt: now,
      updatedAt: now,
    });

    // ── Create step documents (INV-10) ────────────────────────────────────────
    // Each step is a first-class document in taskCardSteps — not an embedded array.
    // This is atomic: either ALL steps are created, or NONE are (Convex atomicity).
    for (const step of args.steps) {
      await ctx.db.insert("taskCardSteps", {
        taskCardId,
        workOrderId: args.workOrderId,
        aircraftId: wo.aircraftId,
        organizationId: args.organizationId,
        stepNumber: step.stepNumber,
        description: step.description,
        requiresSpecialTool: step.requiresSpecialTool,
        specialToolReference: step.specialToolReference,
        signOffRequired: step.signOffRequired,
        signOffRequiresIa: step.signOffRequiresIa,
        status: "pending",
        discrepancyIds: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    // ── Transition work order to in_progress (if it was open) ────────────────
    // The first task card added to an "open" WO transitions it to "in_progress".
    // This models "first task card touched = work has begun."
    if (wo.status === "open") {
      await ctx.db.patch(args.workOrderId, {
        status: "in_progress",
        updatedAt: now,
      });
    } else {
      // Always update updatedAt to reflect the WO was touched
      await ctx.db.patch(args.workOrderId, { updatedAt: now });
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    // task-card-execution.md §6.2: record_created on taskCards
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "taskCards",
      recordId: taskCardId,
      userId: callerUserId,
      ipAddress: args.callerIpAddress,
      notes:
        `Task card "${args.taskCardNumber}" created with ${args.steps.length} step(s). ` +
        `Type: ${args.taskType}. ` +
        `Approved data: "${args.approvedDataSource.trim()}". ` +
        `WO status: ${wo.status} → in_progress.`,
      timestamp: now,
    });

    return taskCardId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: completeStep
//
// Spec ref: task-card-execution.md §4.3, work-order-engine.md §2.4
// Enforces: INV-02, INV-05, INV-09, INV-10
//
// THE MOST IMPORTANT MUTATION IN THE TASK CARD ENGINE from a regulatory standpoint.
//
// Per Marcus (task-card-execution.md §4.3 annotation):
//   "Under 14 CFR 43.9(a)(3), the record must contain the name, certificate number,
//   certificate type, and kind of certificate held by the person approving the work
//   for return to service. We capture all of this at sign-off time — as a snapshot,
//   not a lookup. The signedCertificateNumber, signedLegalName, and signedHasIaOnDate
//   fields are written at this moment and are immutable thereafter."
//
// ─── ACTIONS ────────────────────────────────────────────────────────────────
// action == "complete":
//   Requires a valid, unconsumed signatureAuthEvent (INV-05).
//   Requires ratingsExercised (INV-02).
//   Verifies IA currency if step.signOffRequiresIa == true.
//   Snapshots certificate data from the database at signing time.
//   Atomically consumes the auth event and updates the step (same transaction).
//
// action == "mark_na":
//   No auth event required (marking N/A is not a signing act).
//   Requires naReason (non-empty) and naAuthorizedById (a supervisor or IA).
//   If the step required IA sign-off, the N/A marking must be reviewed by an IA
//   before the task card can reach "complete" (incomplete_na_steps state).
//
// ─── IDEMPOTENCY ─────────────────────────────────────────────────────────────
// If a step is already in a terminal state (completed or na) from a prior call,
// the mutation returns successfully without re-signing. This handles retry scenarios
// where the client may not have received the success response.
// ─────────────────────────────────────────────────────────────────────────────

export const completeStep = mutation({
  args: {
    stepId: v.id("taskCardSteps"),
    taskCardId: v.id("taskCards"),
    organizationId: v.id("organizations"),

    action: v.union(v.literal("complete"), v.literal("mark_na")),

    // ── Required when action == "complete" ─────────────────────────────────
    // INV-05: Pre-signing re-authentication is mandatory for all step sign-offs.
    signatureAuthEventId: v.optional(v.id("signatureAuthEvents")),
    // INV-02: Which A&P rating is being exercised for this work.
    ratingsExercised: v.optional(ratingsExercisedValidator),
    scopeOfWork: v.optional(v.string()),

    // ── Required when action == "mark_na" ──────────────────────────────────
    // N/A reason must be specific and non-empty.
    naReason: v.optional(v.string()),
    // The supervisor or IA authorizing the N/A marking (not the performing tech).
    naAuthorizedById: v.optional(v.id("technicians")),

    // ── Optional for both actions ──────────────────────────────────────────
    discrepancyIds: v.optional(v.array(v.id("discrepancies"))),
    notes: v.optional(v.string()),

    // v3: Step-level approved data reference (Gap 1)
    approvedDataReference: v.optional(v.string()),

    // v3: Parts installed during this step (Gap 2)
    partsInstalled: v.optional(v.array(v.object({
      partId: v.optional(v.id("parts")),
      partNumber: v.string(),
      serialNumber: v.optional(v.string()),
      description: v.string(),
      quantity: v.number(),
    }))),

    // The technician performing the action (signing or N/A authorizing)
    callerTechnicianId: v.id("technicians"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Fetch and validate step ──────────────────────────────────────────────
    const step = await ctx.db.get(args.stepId);
    if (!step) {
      throw new Error(`Step ${args.stepId} not found.`);
    }
    if (step.taskCardId !== args.taskCardId) {
      throw new Error(
        `Step ${args.stepId} does not belong to task card ${args.taskCardId}.`,
      );
    }
    if (step.organizationId !== args.organizationId) {
      throw new Error(
        `Step ${args.stepId} does not belong to organization ${args.organizationId}.`,
      );
    }

    // ── Idempotency guard ────────────────────────────────────────────────────
    // If the step is already in a terminal state, return success without re-processing.
    // This handles network retries and client-side uncertainty after a prior call.
    if (step.status !== "pending") {
      return {
        stepId: args.stepId,
        stepNumber: step.stepNumber,
        status: step.status,
        idempotent: true,
        message: `Step ${step.stepNumber} is already in status "${step.status}". No action taken.`,
      };
    }

    // ── Fetch and validate parent task card ──────────────────────────────────
    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard) {
      throw new Error(`Task card ${args.taskCardId} not found.`);
    }
    if (taskCard.status === "voided") {
      throw new Error(
        `Task card ${taskCard.taskCardNumber} is voided. ` +
        `Steps on voided task cards cannot be signed off.`,
      );
    }
    if (taskCard.status === "complete") {
      throw new Error(
        `Task card ${taskCard.taskCardNumber} is already complete. ` +
        `If rework is required, use returnTaskCard to revert specific steps.`,
      );
    }

    // ── Validate calling technician ──────────────────────────────────────────
    const callerTech = await ctx.db.get(args.callerTechnicianId);
    if (!callerTech) {
      throw new Error(`Technician ${args.callerTechnicianId} not found.`);
    }
    if (callerTech.status !== "active") {
      throw new Error(
        `Technician ${args.callerTechnicianId} (${callerTech.legalName}) ` +
        `has status "${callerTech.status}". Only active technicians may sign off steps.`,
      );
    }
    // A technician must have a Clerk account (userId) to perform signing actions.
    // Signing mutations require re-authentication, which requires a linked Clerk account.
    if (!callerTech.userId) {
      throw new Error(
        `Technician ${args.callerTechnicianId} (${callerTech.legalName}) ` +
        `has no system account (userId is null) and cannot perform signing actions. ` +
        `A Clerk-linked account is required for re-authentication and step sign-off.`,
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // BRANCH: action == "complete"
    // ════════════════════════════════════════════════════════════════════════
    if (args.action === "complete") {

      // ── INV-05: signatureAuthEvent — six-check atomic consumption ────────────
      // task-card-execution.md §7.2: ALL six checks must execute atomically.
      // Check 1: EXISTS
      if (!args.signatureAuthEventId) {
        throw new Error(
          `INV-05: signatureAuthEventId is required to complete step ${step.stepNumber}. ` +
          `Pre-signing re-authentication is mandatory for all step sign-offs.`,
        );
      }
      // Check 2: EXISTS in DB
      const authEvent = await ctx.db.get(args.signatureAuthEventId);
      if (!authEvent) {
        throw new Error(
          `INV-05: signatureAuthEvent ${args.signatureAuthEventId} not found. ` +
          `The auth event may have already been used or the ID is incorrect.`,
        );
      }
      // Check 3: UNCONSUMED
      if (authEvent.consumed) {
        throw new Error(
          `INV-05: signatureAuthEvent ${args.signatureAuthEventId} has already been consumed ` +
          `(consumed at ${authEvent.consumedAt ? new Date(authEvent.consumedAt).toISOString() : "unknown"} ` +
          `for ${authEvent.consumedByTable}/${authEvent.consumedByRecordId}). ` +
          `Each auth event is single-use. Request a new re-authentication.`,
        );
      }
      // Check 4: UNEXPIRED
      if (authEvent.expiresAt < now) {
        throw new Error(
          `INV-05: signatureAuthEvent ${args.signatureAuthEventId} expired at ` +
          `${new Date(authEvent.expiresAt).toISOString()} ` +
          `(${Math.round((now - authEvent.expiresAt) / 1000)}s ago). ` +
          `Auth events have a 5-minute TTL. Request a new re-authentication.`,
        );
      }
      // Check 5: IDENTITY MATCH
      if (authEvent.technicianId !== args.callerTechnicianId) {
        throw new Error(
          `INV-05: Auth event was issued to technician ${authEvent.technicianId} ` +
          `but the caller is technician ${args.callerTechnicianId}. ` +
          `Auth events are non-transferable.`,
        );
      }
      // Checks 6 (CONSUME) and the step update happen atomically below.

      // ── INV-02: ratingsExercised must be populated ──────────────────────────
      if (!args.ratingsExercised || args.ratingsExercised.length === 0) {
        throw new Error(
          `INV-02: ratingsExercised must be set when signing step ${step.stepNumber}. ` +
          `Per 14 CFR 65.85/65.87, record which A&P rating applies to this work. ` +
          `Acceptable values: "airframe", "powerplant", "ia", "none".`,
        );
      }

      // MBP-0055: Backend rating-to-step authorization gate.
      // Mirror frontend stepAuthorization.ts logic so invalid ratings cannot be
      // submitted via direct API calls or modified clients.
      const requiredAuthorizationType = resolveStepAuthorizationType({
        description: step.description,
        signOffRequiresIa: step.signOffRequiresIa,
        specialToolReference: step.specialToolReference,
        aircraftSystem: taskCard.aircraftSystem,
      });

      for (const exercisedRating of args.ratingsExercised) {
        if (!isRatingAllowedForAuthorization(requiredAuthorizationType, exercisedRating)) {
          throw new Error(
            `Rating authorization failed: Step ${step.stepNumber} requires ` +
            `${requiredAuthorizationType === "inspection" ? "IA" : requiredAuthorizationType} authorization, ` +
            `but selected rating "${exercisedRating}" is not permitted for this step type.`,
          );
        }
      }

      // ── Retrieve active certificate (snapshot at signing time) ─────────────
      // Per Marcus (task-card-execution.md §4.3):
      //   The certificate number is written at signing time as an immutable snapshot.
      //   If the certificate lapses after signing, the historical record is preserved.
      const cert = await ctx.db
        .query("certificates")
        .withIndex("by_technician", (q) => q.eq("technicianId", args.callerTechnicianId))
        .filter((q) => q.eq(q.field("active"), true))
        .first();
      if (!cert) {
        throw new Error(
          `No active certificate found for technician ${args.callerTechnicianId} ` +
          `(${callerTech.legalName}). ` +
          `A technician must hold an active certificate to sign maintenance records.`,
        );
      }

      // ── Rating-to-certificate authorization check ─────────────────────────
      // Verify that each exercised rating is actually held on the technician's
      // certificate. Skip validation for "none" (non-regulatory steps).
      if (!args.ratingsExercised.includes("none")) {
        for (const rating of args.ratingsExercised) {
          if (rating === "ia") {
            // IA authorization checked separately below via signOffRequiresIa logic
            if (!cert.hasIaAuthorization) {
              throw new Error(
                `Rating authorization failed: Technician ${args.callerTechnicianId} ` +
                `(${callerTech.legalName}) is exercising "ia" rating but does not hold ` +
                `an Inspection Authorization on their certificate ${cert.certificateNumber}. ` +
                `Per 14 CFR 65.91, an IA is required to exercise this rating.`,
              );
            }
            if (!cert.iaExpiryDate || cert.iaExpiryDate < now) {
              throw new Error(
                `Rating authorization failed: Technician ${args.callerTechnicianId} ` +
                `(${callerTech.legalName}) is exercising "ia" rating but their IA ` +
                `${!cert.iaExpiryDate ? "has no expiry date on file" : `expired on ${new Date(cert.iaExpiryDate).toISOString()}`}. ` +
                `Per 14 CFR 65.92, IAs expire annually with no grace period.`,
              );
            }
          } else {
            // "airframe" or "powerplant" — must be present in cert.ratings
            if (!cert.ratings.includes(rating as "airframe" | "powerplant")) {
              throw new Error(
                `Rating authorization failed: Technician ${args.callerTechnicianId} ` +
                `(${callerTech.legalName}) is exercising "${rating}" rating but their ` +
                `certificate ${cert.certificateNumber} only holds ratings: [${cert.ratings.join(", ")}]. ` +
                `Per 14 CFR 65.85/65.87, a mechanic may only exercise ratings held on their certificate.`,
              );
            }
          }
        }
      }

      // ── IA currency check for IA-required steps ───────────────────────────
      // Per Marcus (signoff-rts-flow.md §1.3 / §4.3):
      //   An annual inspection step signed by a technician whose IA expired —
      //   even by one day — is a regulatory violation. There is no grace period.
      //   Throw if iaExpiryDate < now. No override path.
      let signedHasIaOnDate: boolean | undefined;
      if (step.signOffRequiresIa) {
        const iaCert = await ctx.db
          .query("certificates")
          .withIndex("by_type", (q) =>
            q
              .eq("technicianId", args.callerTechnicianId)
              .eq("certificateType", "IA"),
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("active"), true),
              q.eq(q.field("hasIaAuthorization"), true),
            ),
          )
          .first();

        if (!iaCert) {
          throw new Error(
            `Step ${step.stepNumber} requires an IA sign-off. ` +
            `Technician ${args.callerTechnicianId} (${callerTech.legalName}) ` +
            `does not hold an Inspection Authorization on file. ` +
            `Per 14 CFR 65.91, an IA is required for this step. ` +
            `Have an IA-qualified technician sign this step, or use the counter-sign ` +
            `flow (Phase 2.1) for dual sign-off scenarios.`,
          );
        }
        if (!iaCert.iaExpiryDate || iaCert.iaExpiryDate < now) {
          throw new Error(
            `Step ${step.stepNumber} requires an IA sign-off. ` +
            `Technician ${args.callerTechnicianId} (${callerTech.legalName}) ` +
            `has an Inspection Authorization but it ${!iaCert.iaExpiryDate ? "has no expiry date on file" : `expired on ${new Date(iaCert.iaExpiryDate).toISOString()}`}. ` +
            `Per the March 31 rule (14 CFR 65.92), IAs expire annually. ` +
            `There is no grace period. Update the IA expiry date or have a current ` +
            `IA-qualified technician sign this step.`,
          );
        }
        signedHasIaOnDate = true;
      }

      // ── Check 6 + WRITE: Consume auth event atomically with step update ────
      // These two db operations are in the same Convex transaction.
      // Convex's atomicity guarantee: either both succeed, or neither does.
      // This makes it impossible for an auth event to be consumed without
      // the step being updated, or vice versa.

      // Consume the auth event (INV-05 Check 6 — CONSUME)
      await ctx.db.patch(args.signatureAuthEventId, {
        consumed: true,
        consumedAt: now,
        consumedByTable: "taskCardSteps",
        consumedByRecordId: args.stepId,
      });

      // Update step to completed (INV-10)
      await ctx.db.patch(args.stepId, {
        status: "completed",
        signedByTechnicianId: args.callerTechnicianId,
        signedAt: now,
        signedCertificateNumber: cert.certificateNumber,  // immutable snapshot
        signedHasIaOnDate,
        signatureAuthEventId: args.signatureAuthEventId,
        discrepancyIds: args.discrepancyIds ?? [],
        notes: args.notes,
        // v3: Step-level approved data and parts (Gap 1 & 2)
        approvedDataReference: args.approvedDataReference,
        partsInstalled: args.partsInstalled,
        updatedAt: now,
      });

      // Audit log: step signed (task-card-execution.md §6.2 / signoff-rts-flow.md §6.2)
      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "technician_signed",
        tableName: "taskCardSteps",
        recordId: args.stepId,
        userId: callerUserId,
        technicianId: args.callerTechnicianId,
        ipAddress: args.callerIpAddress,
        notes:
          `Step ${step.stepNumber} signed off. ` +
          `Cert: ${cert.certificateNumber} (${cert.certificateType}). ` +
          `Ratings exercised: [${args.ratingsExercised.join(", ")}]. ` +
          `IA on date: ${signedHasIaOnDate ?? "N/A (not required)"}. ` +
          `Auth event: ${args.signatureAuthEventId}.`,
        timestamp: now,
      });

    // ════════════════════════════════════════════════════════════════════════
    // BRANCH: action == "mark_na"
    // ════════════════════════════════════════════════════════════════════════
    } else if (args.action === "mark_na") {

      // N/A reason is mandatory
      if (!args.naReason?.trim()) {
        throw new Error(
          `naReason is required when marking step ${step.stepNumber} N/A. ` +
          `Provide a specific reason explaining why this step does not apply.`,
        );
      }

      // N/A authorization is mandatory — a supervisor or IA must authorize it
      if (!args.naAuthorizedById) {
        throw new Error(
          `naAuthorizedById is required when marking a step N/A. ` +
          `A supervisor or IA must authorize the N/A marking. ` +
          `Self-authorization (naAuthorizedById == callerTechnicianId) is permitted ` +
          `for supervisors — the UI should verify the caller has supervisory authority.`,
        );
      }

      const naAuth = await ctx.db.get(args.naAuthorizedById);
      if (!naAuth || naAuth.status !== "active") {
        throw new Error(
          `N/A authorizer ${args.naAuthorizedById} not found or inactive. ` +
          `The authorizing technician must be active in the system.`,
        );
      }

      // Update step to N/A
      await ctx.db.patch(args.stepId, {
        status: "na",
        naReason: args.naReason.trim(),
        naAuthorizedById: args.naAuthorizedById,
        naAuthorizedAt: now,
        notes: args.notes,
        updatedAt: now,
      });

      // Audit log: step marked N/A (signoff-rts-flow.md §6.2)
      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "record_updated",
        tableName: "taskCardSteps",
        recordId: args.stepId,
        userId: callerUserId,
        technicianId: args.callerTechnicianId,
        ipAddress: args.callerIpAddress,
        fieldName: "status",
        oldValue: JSON.stringify("pending"),
        newValue: JSON.stringify("na"),
        notes:
          `Step ${step.stepNumber} marked N/A. ` +
          `Reason: "${args.naReason.trim()}". ` +
          `Authorized by: ${args.naAuthorizedById} (${naAuth.legalName}). ` +
          `Note: ${step.signOffRequiresIa ? "IA review required — card will enter incomplete_na_steps." : "No IA review required."}`,
        timestamp: now,
      });
    }

    // ── Recompute task card status from all steps (INV-09) ────────────────────
    // We must recount all steps to maintain accurate denormalized counters.
    // Do NOT trust the in-memory view of the card's current counters —
    // concurrent mutations from other technicians signing different steps
    // may have updated counts between our fetch and this write.
    const allSteps = await ctx.db
      .query("taskCardSteps")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .collect();

    const { newStatus, completedCount, naCount } = deriveCardStatus(allSteps);

    // Determine completedAt — set only when transitioning to "complete"
    const wasAlreadyComplete = (taskCard.status as string) === "complete";
    const isNowComplete = newStatus === "complete";
    const completedAt = isNowComplete && !wasAlreadyComplete ? now : taskCard.completedAt;

    await ctx.db.patch(args.taskCardId, {
      status: newStatus,
      completedStepCount: completedCount,
      naStepCount: naCount,
      // Set startedAt on the first step touched (if not already set)
      startedAt: taskCard.startedAt ?? now,
      completedAt,
      updatedAt: now,
    });

    // Emit a card-level status_changed event if the card just reached "complete"
    if (isNowComplete && !wasAlreadyComplete) {
      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "status_changed",
        tableName: "taskCards",
        recordId: args.taskCardId,
        userId: callerUserId,
        technicianId: args.callerTechnicianId,
        ipAddress: args.callerIpAddress,
        fieldName: "status",
        oldValue: JSON.stringify(taskCard.status),
        newValue: JSON.stringify("complete"),
        notes: `Task card ${taskCard.taskCardNumber} reached "complete" status.`,
        timestamp: now,
      });
    }

    return {
      stepId: args.stepId,
      stepNumber: step.stepNumber,
      newStepStatus: step.status === "pending" ? args.action === "complete" ? "completed" : "na" : step.status,
      newCardStatus: newStatus,
      remainingSteps: allSteps.filter((s) => s.status === "pending").length,
      idempotent: false,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: signTaskCard
//
// Spec ref: task-card-execution.md §4.4
// Enforces: INV-02, INV-05, INV-09
//
// Final card-level sign-off. Called after ALL steps are in "completed" or "na"
// status, and any "incomplete_na_steps" IA reviews are resolved.
//
// This is the point at which the task card becomes a completed maintenance entry
// eligible for inclusion in the aircraft's maintenance record under 14 CFR 43.9.
//
// Per Marcus (task-card-execution.md §4.4 annotation):
//   "The card-level sign-off is the supervising technician's attestation that the
//   entire task was performed in accordance with the approved data and returned to
//   an airworthy condition. This is not the same act as the individual step sign-offs."
//
// ─── DUAL SIGN-OFF HANDLING (Phase 2.0 limitation) ──────────────────────────
// For cards with IA-required steps, the card-level signer must hold a current IA.
// The full dual sign-off flow (AMT signs step + separate IA counter-signs via
// taskCardStepCounterSignatures) is a Phase 2.1 implementation pending schema
// extension SE-01. For Phase 2.0, the card signer must hold IA themselves.
// ─────────────────────────────────────────────────────────────────────────────

export const signTaskCard = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    organizationId: v.id("organizations"),

    // INV-05: pre-signing re-authentication required for card-level sign-off
    signatureAuthEventId: v.id("signatureAuthEvents"),

    // INV-02: which rating is being exercised for the overall card sign-off
    ratingsExercised: ratingsExercisedValidator,

    // The legal certification statement for this card's scope of work.
    // Per 14 CFR 43.9: must not be empty.
    returnToServiceStatement: v.string(),

    callerTechnicianId: v.id("technicians"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // ── Fetch and validate task card ──────────────────────────────────────────
    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard) {
      throw new Error(`Task card ${args.taskCardId} not found.`);
    }
    if (taskCard.organizationId !== args.organizationId) {
      throw new Error(
        `Task card ${args.taskCardId} does not belong to organization ${args.organizationId}.`,
      );
    }
    if (taskCard.status !== "complete") {
      throw new Error(
        `signTaskCard requires task card status "complete". ` +
        `Current status: "${taskCard.status}". ` +
        `All steps must be resolved (including any incomplete_na_steps IA reviews) ` +
        `before the card can be signed. ` +
        (taskCard.status === "incomplete_na_steps"
          ? "Use reviewNAStep (Phase 2.1) to clear IA-required N/A steps first."
          : ""),
      );
    }

    // ── Verify all steps are actually in terminal state ───────────────────────
    // Double-check the denormalized card status by querying actual step data.
    // The denormalized counters could theoretically drift — this is the authoritative check.
    const pendingSteps = await ctx.db
      .query("taskCardSteps")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    if (pendingSteps.length > 0) {
      throw new Error(
        `signTaskCard: ${pendingSteps.length} step(s) are still pending on this task card. ` +
        `Pending step numbers: [${pendingSteps.map((s) => s.stepNumber).sort((a, b) => a - b).join(", ")}]. ` +
        `Complete or mark N/A all steps before signing the card.`,
      );
    }

    const blockingComplianceItems = await ctx.db
      .query("taskComplianceItems")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .filter((q) =>
        q.or(
          q.eq(q.field("complianceStatus"), "pending"),
          q.eq(q.field("complianceStatus"), "non_compliant"),
        ),
      )
      .collect();

    if (blockingComplianceItems.length > 0) {
      throw new Error(
        `Cannot sign task card while ${blockingComplianceItems.length} compliance item(s) are pending/non-compliant. ` +
          `Resolve regulatory references before final sign-off.`,
      );
    }

    const openVendorServices = await ctx.db
      .query("taskCardVendorServices")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "planned"),
          q.eq(q.field("status"), "sent_for_work"),
          q.eq(q.field("status"), "in_progress"),
        ),
      )
      .collect();

    if (openVendorServices.length > 0) {
      throw new Error(
        `Cannot sign task card while ${openVendorServices.length} vendor service(s) are still open. ` +
          `Complete or cancel outsourced work first.`,
      );
    }

    // ── Validate calling technician ──────────────────────────────────────────
    const callerTech = await ctx.db.get(args.callerTechnicianId);
    if (!callerTech || callerTech.status !== "active" || !callerTech.userId) {
      throw new Error(
        `Technician ${args.callerTechnicianId} not found, inactive, or has no system account. ` +
        `A Clerk-linked active technician is required for card-level sign-off.`,
      );
    }

    // ── Dual sign-off: IA currency check (Phase 2.0 enforcement) ─────────────
    // For cards containing IA-required steps, the card-level signer must hold a
    // current IA. In Phase 2.1, this will be relaxed when counterSignStep is
    // implemented — a separate IA counter-signature will be sufficient.
    const iaRequiredSteps = await ctx.db
      .query("taskCardSteps")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .filter((q) =>
        q.and(
          q.eq(q.field("signOffRequiresIa"), true),
          q.eq(q.field("status"), "completed"),
        ),
      )
      .collect();

    if (iaRequiredSteps.length > 0) {
      if (!taskCard.inspectorSignedAt || !taskCard.inspectorTechnicianId) {
        throw new Error(
          `This task card contains ${iaRequiredSteps.length} IA/RIII-required step(s). ` +
          `An independent inspector sign-off is required before final card sign-off.`,
        );
      }
      if (taskCard.inspectorTechnicianId === args.callerTechnicianId) {
        throw new Error(
          "Inspector and final card signer must be different technicians for RIII separation-of-duties.",
        );
      }
    }

    // ── INV-05: signatureAuthEvent validation ─────────────────────────────────
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) {
      throw new Error(`signatureAuthEvent ${args.signatureAuthEventId} not found.`);
    }
    if (authEvent.consumed) {
      throw new Error(
        `INV-05: signatureAuthEvent ${args.signatureAuthEventId} has already been consumed. ` +
        `Request a new re-authentication event.`,
      );
    }
    if (authEvent.expiresAt < now) {
      throw new Error(
        `INV-05: signatureAuthEvent ${args.signatureAuthEventId} expired at ` +
        `${new Date(authEvent.expiresAt).toISOString()}. ` +
        `Request a new re-authentication event.`,
      );
    }
    if (authEvent.technicianId !== args.callerTechnicianId) {
      throw new Error(
        `INV-05: Auth event was issued to technician ${authEvent.technicianId} ` +
        `but the signing technician is ${args.callerTechnicianId}. ` +
        `Auth events are non-transferable.`,
      );
    }

    // ── INV-02: ratingsExercised ──────────────────────────────────────────────
    if (!args.ratingsExercised || args.ratingsExercised.length === 0) {
      throw new Error(
        `INV-02: ratingsExercised must be set for card-level sign-off. ` +
        `Per 14 CFR 65.85/65.87, specify which A&P rating covers the overall scope of this card.`,
      );
    }

    // ── returnToServiceStatement must be non-empty ────────────────────────────
    if (!args.returnToServiceStatement.trim()) {
      throw new Error(
        `returnToServiceStatement must be non-empty for card-level sign-off. ` +
        `Per 14 CFR 43.9, the maintenance entry must include a description of the work ` +
        `performed and the approver's certification.`,
      );
    }

    // Retrieve the signing cert for audit snapshot
    const signingCert = await ctx.db
      .query("certificates")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.callerTechnicianId))
      .filter((q) => q.eq(q.field("active"), true))
      .first();
    if (!signingCert) {
      throw new Error(
        `No active certificate found for technician ${args.callerTechnicianId}. ` +
        `A current certificate is required to sign a task card.`,
      );
    }

    // ── Consume auth event (atomically with card update) ─────────────────────
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "taskCards",
      consumedByRecordId: args.taskCardId,
    });

    // ── Record the card-level sign-off in dedicated immutable fields ─────────
    const signatureNoteEntry =
      `[CARD SIGNED ${new Date(now).toISOString()}] ` +
      `Signed by: ${callerTech.legalName} (Cert: ${signingCert.certificateNumber}). ` +
      `Ratings: ${args.ratingsExercised.join(", ")}. ` +
      `Statement: ${args.returnToServiceStatement.trim()}`;

    await ctx.db.patch(args.taskCardId, {
      completedAt: now,
      signingTechnicianId: args.callerTechnicianId,
      signedAt: now,
      signedCertificateNumber: signingCert.certificateNumber,
      cardSignatureAuthEventId: args.signatureAuthEventId,
      notes: taskCard.notes
        ? `${taskCard.notes}\n${signatureNoteEntry}`
        : signatureNoteEntry,
      updatedAt: now,
    });

    // ── Audit log: card-level sign-off (signoff-rts-flow.md §6.2) ────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_signed",
      tableName: "taskCards",
      recordId: args.taskCardId,
      userId: callerUserId,
      technicianId: args.callerTechnicianId,
      ipAddress: args.callerIpAddress,
      notes:
        `Task card "${taskCard.taskCardNumber}" signed at card level. ` +
        `Signed by: ${callerTech.legalName} (${signingCert.certificateNumber}). ` +
        `Ratings: [${args.ratingsExercised.join(", ")}]. ` +
        `IA required steps signed by IA: ${iaRequiredSteps.length > 0}. ` +
        `RTS statement (first 100): "${args.returnToServiceStatement.trim().substring(0, 100)}". ` +
        `Auth event: ${args.signatureAuthEventId}.`,
      timestamp: now,
    });

    return {
      taskCardId: args.taskCardId,
      signedAt: now,
      signingTechnicianId: args.callerTechnicianId,
      certificateNumber: signingCert.certificateNumber,
    };
  },
});

export const signTaskCardInspector = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    organizationId: v.id("organizations"),
    signatureAuthEventId: v.id("signatureAuthEvents"),
    callerTechnicianId: v.id("technicians"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard || taskCard.organizationId !== args.organizationId) {
      throw new Error("Task card not found for inspector sign-off.");
    }
    if (taskCard.status !== "complete") {
      throw new Error("Inspector sign-off requires task card status complete.");
    }
    if (taskCard.inspectorSignedAt) {
      throw new Error("Inspector sign-off already recorded for this card.");
    }

    const iaRequiredSteps = await ctx.db
      .query("taskCardSteps")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .filter((q) => q.eq(q.field("signOffRequiresIa"), true))
      .collect();

    if (iaRequiredSteps.length === 0) {
      throw new Error("Inspector sign-off is only required for IA/RIII step cards.");
    }

    const inspector = await ctx.db.get(args.callerTechnicianId);
    if (!inspector || inspector.status !== "active" || !inspector.userId) {
      throw new Error("Inspector must be an active technician with system identity.");
    }

    const iaCert = await ctx.db
      .query("certificates")
      .withIndex("by_type", (q) =>
        q.eq("technicianId", args.callerTechnicianId).eq("certificateType", "IA"),
      )
      .filter((q) => q.and(q.eq(q.field("active"), true), q.eq(q.field("hasIaAuthorization"), true)))
      .first();

    if (!iaCert || !iaCert.iaExpiryDate || iaCert.iaExpiryDate < now) {
      throw new Error("Inspector sign-off requires a current IA certificate.");
    }

    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent || authEvent.consumed || authEvent.expiresAt < now || authEvent.technicianId !== args.callerTechnicianId) {
      throw new Error("Invalid or expired signature authorization event.");
    }

    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "taskCards",
      consumedByRecordId: args.taskCardId,
    });

    await ctx.db.patch(args.taskCardId, {
      inspectorTechnicianId: args.callerTechnicianId,
      inspectorSignedAt: now,
      inspectorCertificateNumber: iaCert.certificateNumber,
      inspectorSignatureAuthEventId: args.signatureAuthEventId,
      notes: args.notes?.trim()
        ? `${taskCard.notes ? `${taskCard.notes}\n` : ""}[INSPECTOR SIGNED ${new Date(now).toISOString()}] ${inspector.legalName}: ${args.notes.trim()}`
        : taskCard.notes,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_signed",
      tableName: "taskCards",
      recordId: args.taskCardId,
      userId: callerUserId,
      technicianId: args.callerTechnicianId,
      notes: `Inspector sign-off recorded by ${inspector.legalName} (${iaCert.certificateNumber}) for ${iaRequiredSteps.length} IA/RIII step(s).`,
      timestamp: now,
    });

    return { inspectorTechnicianId: args.callerTechnicianId, inspectorSignedAt: now };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listTaskCardsForWorkOrder
//
// Spec ref: work-order-engine.md §3 (Q-WO-05), task-card-execution.md §1
//
// Returns all task cards for a work order, ordered by task card number.
// Each card is enriched with:
//   - All its steps (ordered by stepNumber via by_task_card_step index)
//   - Assigned technician name (denormalized for display)
//
// Org scope is enforced: the caller's organizationId must match the work order's.
// Task cards from a different org's work order cannot be fetched via this query.
// ─────────────────────────────────────────────────────────────────────────────

export const listTaskCardsForWorkOrder = query({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    // Optional: filter to a specific status
    filterStatus: v.optional(
      v.union(
        v.literal("not_started"),
        v.literal("in_progress"),
        v.literal("incomplete_na_steps"),
        v.literal("complete"),
        v.literal("voided"),
      ),
    ),
  },

  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Verify the work order exists and belongs to the requested org
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) return null;
    if (wo.organizationId !== args.organizationId) {
      throw new Error(
        `Access denied: Work order ${args.workOrderId} does not belong to ` +
        `organization ${args.organizationId}.`,
      );
    }

    // Fetch all task cards for this work order
    let taskCardQuery = ctx.db
      .query("taskCards")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId));

    // Apply status filter if provided
    const allTaskCards = await (args.filterStatus
      ? taskCardQuery
          .filter((q) => q.eq(q.field("status"), args.filterStatus!))
          .collect()
      : taskCardQuery.collect());

    // Enrich each task card with its steps and assigned technician name
    const enriched = await Promise.all(
      allTaskCards.map(async (tc) => {
        // Fetch steps in order using by_task_card_step index
        // This index includes stepNumber as the second key, so results come out sorted.
        const steps = await ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card_step", (q) => q.eq("taskCardId", tc._id))
          .collect();

        // Fetch assigned technician name (for display)
        let assignedTechnicianName: string | null = null;
        if (tc.assignedToTechnicianId) {
          const tech = await ctx.db.get(tc.assignedToTechnicianId);
          assignedTechnicianName = tech?.legalName ?? null;
        }

        // For each step, optionally fetch the signer's name for display
        const stepsWithSignerName = await Promise.all(
          steps.map(async (step) => {
            let signerName: string | null = null;
            if (step.signedByTechnicianId) {
              const signer = await ctx.db.get(step.signedByTechnicianId);
              signerName = signer?.legalName ?? null;
            }
            let naAuthorizerName: string | null = null;
            if (step.naAuthorizedById) {
              const naAuth = await ctx.db.get(step.naAuthorizedById);
              naAuthorizerName = naAuth?.legalName ?? null;
            }
            return { ...step, signerName, naAuthorizerName };
          }),
        );

        // Compute progress percentage for this card
        const completedSteps = steps.filter((s) => s.status === "completed").length;
        const naSteps = steps.filter((s) => s.status === "na").length;
        const progressPercent =
          steps.length > 0
            ? Math.round(((completedSteps + naSteps) / steps.length) * 100)
            : 0;

        return {
          ...tc,
          steps: stepsWithSignerName,
          assignedTechnicianName,
          progressPercent,
        };
      }),
    );

    // Sort by task card number (lexicographic — assumes consistent numbering format)
    enriched.sort((a, b) => a.taskCardNumber.localeCompare(b.taskCardNumber));

    return enriched;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// ADD HANDOFF NOTE  (Gap 5: Shift Handoff)
// ═══════════════════════════════════════════════════════════════════════════
export const addHandoffNote = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    organizationId: v.id("organizations"),
    callerTechnicianId: v.id("technicians"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (!args.note.trim()) {
      throw new Error("HANDOFF_NOTE_EMPTY: note must be non-empty.");
    }

    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard) throw new Error("Task card not found.");
    if (taskCard.organizationId !== args.organizationId) {
      throw new Error("ORG_MISMATCH: task card does not belong to this organization.");
    }
    if (taskCard.status === "voided") {
      throw new Error("VOIDED_CARD: cannot add handoff notes to a voided task card.");
    }

    const tech = await ctx.db.get(args.callerTechnicianId);
    const techName = tech?.legalName ?? "Unknown";

    const existingNotes = taskCard.handoffNotes ?? [];
    const newNote = {
      technicianId: args.callerTechnicianId,
      technicianName: techName,
      note: args.note.trim(),
      createdAt: Date.now(),
    };

    await ctx.db.patch(args.taskCardId, {
      handoffNotes: [...existingNotes, newNote],
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// LIST TASK CARDS FOR TECHNICIAN  (Gap 3: "My Work" view)
// ═══════════════════════════════════════════════════════════════════════════
export const listTaskCardsForTechnician = query({
  args: {
    organizationId: v.id("organizations"),
    technicianId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    // Use the by_org_assigned index to efficiently fetch assigned cards
    const cards = await ctx.db
      .query("taskCards")
      .withIndex("by_org_assigned", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("assignedToTechnicianId", args.technicianId),
      )
      .collect();

    // BUG-TECH-002: Previously filtered out "complete" and "voided" cards here,
    // so the frontend's "Show all / Active only" toggle (BUG-031) never worked —
    // hiddenCount was always 0 and historical cards were never shown. The frontend
    // My Work page already implements the status filter client-side. Return all
    // assigned cards and let the caller decide what to display.

    // Enrich with work order info and steps
    const enriched = await Promise.all(
      cards.map(async (tc) => {
        const wo = await ctx.db.get(tc.workOrderId);
        const steps = await ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", tc._id))
          .collect();

        const pendingSteps = steps.filter((s) => s.status === "pending").length;
        const totalSteps = steps.length;

        // Schedule risk: simple overdue/at_risk check from parent WO promisedDeliveryDate
        const now = Date.now();
        const promisedDeliveryDate = wo?.promisedDeliveryDate;
        let scheduleRisk: "overdue" | "at_risk" | "on_track" | "no_date" = "no_date";
        if (promisedDeliveryDate) {
          if (promisedDeliveryDate < now) {
            scheduleRisk = "overdue";
          } else {
            const daysLeft = (promisedDeliveryDate - now) / (1000 * 60 * 60 * 24);
            scheduleRisk = daysLeft <= 2 ? "at_risk" : "on_track";
          }
        }

        return {
          ...tc,
          workOrderNumber: wo?.workOrderNumber ?? "—",
          workOrderPriority: wo?.priority ?? "routine",
          aircraftRegistration: "", // Will be enriched by caller if needed
          promisedDeliveryDate,
          scheduleRisk,
          pendingSteps,
          totalSteps,
        };
      }),
    );

    // Sort by priority: in_progress first, then not_started
    enriched.sort((a, b) => {
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (a.status !== "in_progress" && b.status === "in_progress") return 1;
      return a.taskCardNumber.localeCompare(b.taskCardNumber);
    });

    return enriched;
  },
});
