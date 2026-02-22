# Athelon — Task Card Execution Engine: Phase 2 Design Specification
**Document Type:** Phase 2 Implementation Specification — Task Card Mutation Layer  
**Author:** Rafael Mendoza (Tech Lead / Architect) with Marcus Webb (Regulatory) inline  
**Devraj Anand** (Backend, Convex) implementation notes  
**Date:** 2026-02-22  
**Status:** DRAFT — Pending Marcus Webb and Cilla Oduya review  
**Schema Basis:** `convex-schema-v2.md` (FROZEN, 2026-02-22)  
**Companion Document:** `phase-2-work-orders/work-order-engine.md`  
**Prerequisites:** Work Order Engine spec complete; schema v2 FROZEN.

---

## Rafael's Preamble

*The work order engine document defines `addTaskCard` and `completeTaskCard` as WO-level operations. This document goes one level deeper. We are specifying the task card execution engine — the mutation layer that runs the per-step lifecycle inside a task card, handles real-world shop floor interruptions, and enforces dual sign-off when the regulatory situation requires it.*

*Let me be direct about the scope boundary. The WO engine's `completeTaskCard` is a bulk operation — it accepts an array of step completions and processes them in one transaction. That is the right primitive for programmatic generation (e.g., import from an ERP, or a simple card where all steps are done by one person without interruption). The task card execution engine adds the granular mutations that handle what actually happens on the shop floor: a tech signs off step 3, goes to lunch, another tech signs step 4, the foreman assigns step 5 to a specialist, and then an IA counter-signs two steps that required inspection authority.*

*Three design principles I established with Devraj before writing this spec:*

*First: Every mutation in this engine operates at step granularity, not card granularity. The card-level status is always derived from its steps, never independently set. This is not a UI preference — it is the audit trail requirement. The FAA does not inspect task cards; they inspect step-level entries. If our audit log shows "task card completed at 14:32" but no individual step sign-off events, that card is not a defensible maintenance record.*

*Second: The dual sign-off model — where both an AMT and an IA must sign a step — requires a schema extension beyond what v2 currently supports. The `taskCardSteps` table has a single signer slot. I am documenting the extension here as `taskCardStepCounterSignatures` (a lightweight companion table), and Marcus has annotated the specific regulatory scenarios that require it. This companion table is not in v2 — it is the first schema extension request from Phase 2. Devraj, flag this for Cilla's review.*

*Third: Interruptions are first-class events, not exceptions. Shift change, deferred maintenance, parts awaiting — these are the normal state of a shop floor, not edge cases. The `interruptStep` and `resumeStep` mutations handle these explicitly, and the interruption record is part of the audit trail.*

---

## 1. Task Card Lifecycle States and Transitions

The task card state machine is a child of the work order state machine. A task card cannot reach `complete` while its parent work order is `voided`. The states are defined in schema-v2; this section documents the guard conditions on every transition.

```
                    ┌──────────────────────────────────────────────────┐
                    │            TASK CARD STATES                      │
                    └──────────────────────────────────────────────────┘

          [createTaskCard / addTaskCard]
                      │
                      ▼
               ┌─────────────┐
               │ not_started │
               └──────┬──────┘
                      │ [assignStep] or [completeStep]
                      │ (first step touched — any step)
                      │ GUARD: parent WO status == open or in_progress
                      ▼
               ┌─────────────┐◄─────────────────────────────┐
               │ in_progress │                              │ [resumeStep]
               └──────┬──────┘                              │ GUARD: interruptionRecord
                      │                                     │   has resumedAt == null
                      │                                     │
                      │ [interruptStep]              ┌──────┴────────────┐
                      │ GUARD: stepId in progress    │   interrupted      │
                      │ GUARD: interruptionReason    │   (virtual — not  │
                      └────────────────────────────► │   a schema status, │
                      │                              │   tracked in       │
                      │                              │   interruptions    │
                      │                              │   sub-table)       │
                      │                              └────────────────────┘
                      │
                      │ [completeStep] exhausts all pending steps
                      │
               ┌──────┴─────────────────────────────────────────────────┐
               │                                                         │
               │ All steps completed or N/A                             │
               │                                                         │
               ├────────────────────────┬───────────────────────────────┤
               │                        │                               │
               │ All N/A steps          │ ≥1 N/A step with             │
               │ IA-reviewed OR no N/A  │ signOffRequiresIa == true     │
               │ steps present          │ pending IA review             │
               ▼                        ▼                               │
        ┌──────────┐           ┌──────────────────────┐                │
        │ complete │           │ incomplete_na_steps  │                │
        │ (pending │           │ (requires IA review  │                │
        │  final   │           │  of N/A markings)    │                │
        │  signoff)│           └──────────┬───────────┘                │
        └────┬─────┘                      │ [reviewNAStep] (IA)        │
             │                            │ GUARD: caller has active IA │
             │                            │                             │
             │                            ▼                             │
             │                     ┌──────────┐                        │
             │◄────────────────────│ complete │◄───────────────────────┘
             │                     └──────────┘    (all NA steps cleared)
             │
             │ [signTaskCard] — FINAL CARD SIGN-OFF
             │ GUARD: all steps completed or NA-reviewed
             │ GUARD: ≥1 signatureAuthEvent consumed
             │ GUARD: dual sign-off requirements satisfied
             │ GUARD: parent WO not voided
             ▼
       ┌────────────────┐
       │ SIGNED/CLOSED  │ (task card is now a permanent audit record)
       └────────────────┘

       ┌────────────────────────────────────────────────────────────────────┐
       │ [returnTaskCard] — can be called from: complete, in_progress       │
       │ GUARD: returnReason required                                        │
       │ GUARD: returnedByTechnicianId must have supervisory role or IA     │
       │ GUARD: specific step(s) to rework must be identified               │
       │ Effect: targeted steps revert to "pending"; card to "in_progress"  │
       └────────────────────────────────────────────────────────────────────┘

       [voidTaskCard] — from: not_started, in_progress
       GUARD: no signed steps present
       GUARD: voidReason required
       GUARD: parent WO must be open or in_progress (not closed)
```

### 1.1 State Transition Guard Summary

| From → To | Trigger Mutation | Critical Guards |
|---|---|---|
| `not_started` → `in_progress` | First `assignStep` or `completeStep` call | WO is open/in_progress |
| `in_progress` → `in_progress` | Each subsequent `completeStep` | Step belongs to card; signer is active |
| `in_progress` → `incomplete_na_steps` | `completeStep` (mark N/A on IA-required step) | naReason + naAuthorizedById required |
| `in_progress` → `complete` | `completeStep` (last pending step) | No pending steps remain; all NA reviewed |
| `incomplete_na_steps` → `complete` | `reviewNAStep` (IA confirms N/A) | Caller holds current IA; authEvent valid |
| `complete` → `complete` | `signTaskCard` (card-level sign-off) | All dual sign-off requirements satisfied |
| `complete` → `in_progress` | `returnTaskCard` | returnReason; identified steps reverted |
| `in_progress` → `voided` | `voidTaskCard` | No signed steps; WO is open/in_progress |

---

## 2. Step-Level Execution Model

### 2.1 Step Status Machine

Each `taskCardStep` document in the schema has its own `status` field. The step lifecycle is independent of the card lifecycle — the card status is *derived* from its steps, not the other way around.

```
            ┌─────────┐
            │ pending │  ← created by createTaskCard / addTaskCard
            └────┬────┘
                 │
       ┌─────────┼─────────────────────────────────────┐
       │         │                                     │
       │ [completeStep]                       [completeStep action=mark_na]
       │ GUARD: signatureAuthEvent valid       GUARD: naReason non-empty
       │ GUARD: ratingsExercised set           GUARD: naAuthorizedById set
       │ GUARD: cert currency verified         GUARD: supervisor-level caller
       ▼         │                                     ▼
  ┌───────────┐  │                              ┌─────────┐
  │ completed │  │                              │   na    │
  └───────────┘  │                              └────┬────┘
                 │                                   │
                 │                      [reviewNAStep] if signOffRequiresIa == true
                 │                      GUARD: IA reviews and confirms N/A is appropriate
                 │                                   │
                 │                              naReviewedByIaId set (schema extension)
                 │
       ┌─────────┘
       │
       │ [counterSign] — when step.signOffRequiresIa == true (dual sign-off flow)
       │ OR when step.requiresDualSignOff == true (Phase 2 schema extension)
       │ Creates a taskCardStepCounterSignature record
       ▼
  ┌────────────────────────────────┐
  │ completed + counter-signed     │  (step fully resolved)
  └────────────────────────────────┘
```

### 2.2 Step Assignment Model

The `taskCardSteps` table has no `assignedToTechnicianId` field — assignment lives at the card level (`taskCards.assignedToTechnicianId`). However, real shop floors assign individual steps to individual technicians, especially for specialized work. The `assignStep` mutation handles this through a companion approach: it writes the assignment to a `taskCardStepAssignments` sub-table (Phase 2 schema extension) and caches the most recent assignment on the step document via a patch.

> **Devraj implementation note:** Since the v2 schema is FROZEN, we cannot add `assignedToTechnicianId` to `taskCardSteps` directly. For Phase 2, `assignStep` will write to a new `taskCardStepAssignments` table and we will request a targeted schema extension in Phase 2.1. The mutation is specified here against the extended schema. Cilla — flag for TC coverage.

### 2.3 Step Ordering and Sequentiality

Steps within a task card are numbered 1-indexed. Sequential execution is the default, but steps may be completed out of order when:

1. The task card's `taskType` is `inspection` — steps may be performed non-sequentially based on access constraints
2. Different technicians are performing different steps simultaneously
3. A step is blocked pending parts (triggering an interruption record)

The system does not enforce sequential execution at the mutation layer. It enforces that every step is accounted for before the card can reach `complete`.

---

## 3. Schema Extension Requirements

Before specifying the mutations, I need to document the two schema extensions required for full task card execution. These are not in schema-v2 (which is FROZEN) — they are Phase 2.1 extension requests.

### 3.1 `taskCardStepCounterSignatures` (New Table)

**Rationale:** The dual sign-off requirement (AMT + IA inspector) cannot be modeled with a single signer slot on `taskCardSteps`. The counter-sign is a distinct regulatory act by a distinct certificate holder.

```typescript
// PHASE 2.1 SCHEMA EXTENSION — not in v2
// Request for Devraj / Cilla review

taskCardStepCounterSignatures: defineTable({
  stepId: v.id("taskCardSteps"),
  taskCardId: v.id("taskCards"),
  workOrderId: v.id("workOrders"),
  organizationId: v.id("organizations"),

  counterSignType: v.union(
    v.literal("ia_inspection"),     // IA confirming returned-to-service eligibility
    v.literal("inspector_qc"),      // QC inspector under Part 145 RSM
    v.literal("dual_amt")           // Second A&P required by AMM (some avionics)
  ),

  counterSignedByTechnicianId: v.id("technicians"),
  counterSignedLegalName: v.string(),        // snapshot at signing time
  counterSignedCertNumber: v.string(),       // snapshot at signing time
  counterSignedAt: v.number(),
  counterSignRatingsExercised: ratingsExercised,
  counterSignatureAuthEventId: v.id("signatureAuthEvents"),  // INV-05
  counterSignatureHash: v.string(),
  scopeStatement: v.string(),

  createdAt: v.number(),
})
  .index("by_step", ["stepId"])
  .index("by_task_card", ["taskCardId"])
  .index("by_work_order", ["workOrderId"])
  .index("by_technician", ["counterSignedByTechnicianId"])
```

> **Marcus — Regulatory Basis (counterSignatures table):**
> Under 14 CFR Part 145.109(d), a repair station's RSM may require two-person sign-off for specific work categories. Under 14 CFR 65.91, an IA performing an annual inspection signs the inspection record — but the AMT who performed specific repair steps within the inspection must sign those steps under their A&P. The counter-signature captures the IA's independent review of the AMT's work and the IA's return-to-service authorization. These are two separate regulatory acts. Modeling them as a single signature is a compliance deficiency. This table resolves that deficiency.

### 3.2 `taskCardInterruptions` (New Table)

**Rationale:** Interruptions (shift change, parts hold, deferred maintenance) must be captured in the audit trail. An un-interrupted step that was actually put down mid-procedure is a continuity-of-work violation.

```typescript
// PHASE 2.1 SCHEMA EXTENSION — not in v2

taskCardInterruptions: defineTable({
  stepId: v.id("taskCardSteps"),
  taskCardId: v.id("taskCards"),
  workOrderId: v.id("workOrders"),
  organizationId: v.id("organizations"),

  interruptionType: v.union(
    v.literal("shift_change"),
    v.literal("parts_hold"),
    v.literal("deferred_maintenance"),
    v.literal("tooling_unavailable"),
    v.literal("awaiting_engineering_order"),
    v.literal("rdd_hold"),          // Return to Detail Data hold
    v.literal("supervisor_review"),
    v.literal("other")
  ),

  interruptedByTechnicianId: v.id("technicians"),
  interruptedAt: v.number(),
  interruptionReason: v.string(),
  workStatusAtInterruption: v.string(),  // Description of work state when interrupted
  safetyPreservationTaken: v.string(),   // What was done to preserve safety (caps on, covers on, etc.)

  resumedByTechnicianId: v.optional(v.id("technicians")),
  resumedAt: v.optional(v.number()),
  resumptionNotes: v.optional(v.string()),

  // If deferred: reference to a discrepancy or MEL item
  deferralDiscrepancyId: v.optional(v.id("discrepancies")),
  deferralType: v.optional(v.union(
    v.literal("mel"),
    v.literal("cdl"),        // Configuration Deviation List
    v.literal("neo"),        // Non-essential equipment
    v.literal("deferred_wo") // Deferred to a new work order
  )),
  deferredToWorkOrderId: v.optional(v.id("workOrders")),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_step", ["stepId"])
  .index("by_task_card", ["taskCardId"])
  .index("by_work_order", ["workOrderId"])
  .index("by_org_type", ["organizationId", "interruptionType"])
  .index("by_open_interruptions", ["organizationId", "resumedAt"])
```

> **Marcus — Regulatory Basis (interruptions table):**
> 14 CFR 43 does not explicitly require interruption logging — but AC 43-9C and the FAA's Aviation Safety Inspector guidance strongly recommend documenting continuity of work. More importantly, 14 CFR Part 145.109(a) requires that repair stations maintain records sufficient for an FAA inspector to reconstruct the maintenance event. If an inspector asks "who was working on this aircraft at 2 AM when the shift changed?" and we have no record, that is a compliance gap. Further: a shift change on a fuel system task that was not documented as interrupted — and where the resuming technician had no written handoff — is the kind of continuity issue that shows up in accident investigations. We document interruptions because they are safety-critical data, not because the regulation explicitly demands it.

---

## 4. Mutation Specifications

### 4.1 `createTaskCard`

**Purpose:** Create a standalone task card with its steps. The card begins in `not_started` status. This is equivalent to the WO engine's `addTaskCard` but invoked from the task card module directly, with richer step configuration.

**Enforces:** INV-10 (per-step records in taskCardSteps), INV per schema (approvedDataSource non-empty)

> **Marcus — Regulatory Requirement (createTaskCard):**
> Per 14 CFR 43.9(a)(1), every maintenance record must reference the approved data used to perform the work. This requirement attaches at task card creation, not at signing. If the approved data reference is not captured here, it will be missing from the audit trail. Placeholder values like "AMM" or "TBD" are not compliant references. The UI must enforce AMM chapter-section format on the client side; the mutation enforces non-empty.

```typescript
// convex/mutations/taskCards/createTaskCard.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

const stepInput = v.object({
  stepNumber: v.number(),
  description: v.string(),
  requiresSpecialTool: v.boolean(),
  specialToolReference: v.optional(v.string()),
  signOffRequired: v.boolean(),
  signOffRequiresIa: v.boolean(),
  // Phase 2.1 extension: requiresDualSignOff captures scenarios where two
  // A&Ps must sign (certain avionics installations per AMM).
  requiresDualSignOff: v.optional(v.boolean()),
  estimatedDurationMinutes: v.optional(v.number()),
  prerequisiteStepNumbers: v.optional(v.array(v.number())),
});

export const createTaskCard = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    taskCardNumber: v.string(),
    title: v.string(),
    taskType: v.union(
      v.literal("inspection"), v.literal("repair"), v.literal("replacement"),
      v.literal("ad_compliance"), v.literal("functional_check"), v.literal("rigging"),
      v.literal("return_to_service"), v.literal("overhaul"), v.literal("modification")
    ),
    approvedDataSource: v.string(),    // Required, non-empty (14 CFR 43.9(a)(1))
    approvedDataRevision: v.optional(v.string()),
    assignedToTechnicianId: v.optional(v.id("technicians")),
    steps: v.array(stepInput),         // At least one step required
    notes: v.optional(v.string()),
    callerUserId: v.string(),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate work order state
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo || wo.organizationId !== args.organizationId) {
      throw new Error(`Work order ${args.workOrderId} not found or org mismatch.`);
    }
    if (wo.status !== "open" && wo.status !== "in_progress") {
      throw new Error(
        `createTaskCard requires WO status "open" or "in_progress". Got: "${wo.status}".`
      );
    }

    // INV: approvedDataSource non-empty (14 CFR 43.9(a)(1))
    if (!args.approvedDataSource.trim()) {
      throw new Error(
        `approvedDataSource must be non-empty. Per 14 CFR 43.9(a)(1), every maintenance ` +
        `action must reference approved data. Acceptable formats: AMM XX-XX-XX Rev N, ` +
        `AD 20XX-XX-XX, SB XXXX-XXX, FAA-approved data reference.`
      );
    }

    // Validate steps — at least one, sequential numbering from 1
    if (args.steps.length === 0) {
      throw new Error(`A task card must contain at least one step.`);
    }
    const sortedNumbers = [...args.steps.map((s) => s.stepNumber)].sort((a, b) => a - b);
    sortedNumbers.forEach((n, i) => {
      if (n !== i + 1) throw new Error(`Step numbers must be sequential from 1. Got: ${sortedNumbers.join(", ")}.`);
    });

    // Validate prerequisite step references are internally consistent
    for (const step of args.steps) {
      if (step.prerequisiteStepNumbers) {
        for (const prereq of step.prerequisiteStepNumbers) {
          if (!sortedNumbers.includes(prereq)) {
            throw new Error(
              `Step ${step.stepNumber} references prerequisite step ${prereq} which does not exist.`
            );
          }
          if (prereq >= step.stepNumber) {
            throw new Error(
              `Step ${step.stepNumber}: prerequisite step ${prereq} must have a lower step number.`
            );
          }
        }
      }
    }

    // Validate assigned technician
    if (args.assignedToTechnicianId) {
      const tech = await ctx.db.get(args.assignedToTechnicianId);
      if (!tech || tech.status !== "active" || tech.organizationId !== args.organizationId) {
        throw new Error(`Assigned technician ${args.assignedToTechnicianId} not active or not in org.`);
      }
    }

    // Create task card document
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
      createdAt: now,
      updatedAt: now,
    });

    // Create step documents (INV-10 — each step is a first-class record)
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

    // Transition WO to in_progress on first task card added
    if (wo.status === "open") {
      await ctx.db.patch(args.workOrderId, { status: "in_progress", updatedAt: now });
    }

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "taskCards",
      recordId: taskCardId,
      userId: args.callerUserId,
      ipAddress: args.callerIpAddress,
      notes: `Task card ${args.taskCardNumber} created. ${args.steps.length} steps. Data ref: ${args.approvedDataSource.trim()}.`,
      timestamp: now,
    });

    return taskCardId;
  },
});
```

---

### 4.2 `assignStep`

**Purpose:** Assign a specific step to a specific technician, updating the step-level assignment record. Transitions the task card from `not_started` to `in_progress` on the first assignment. Creates a `taskCardStepAssignments` record (Phase 2.1 extension).

> **Marcus — Regulatory Requirement (assignStep):**
> Step-level assignment is not independently required by 14 CFR, but it is required by Part 145 RSM procedures at most certificated repair stations. More practically: it is the mechanism that creates the paper trail for "who was responsible for this step." When an accident investigation traces back to step 7 of task card TC-2024-A-019, we need to know who it was assigned to, not just who ultimately signed it. Assignment and sign-off are distinct regulated acts.

```typescript
// convex/mutations/taskCards/assignStep.ts

export const assignStep = mutation({
  args: {
    stepId: v.id("taskCardSteps"),
    taskCardId: v.id("taskCards"),
    organizationId: v.id("organizations"),
    assignToTechnicianId: v.id("technicians"),
    estimatedStartAt: v.optional(v.number()),
    assignmentNotes: v.optional(v.string()),
    callerUserId: v.string(),
    callerTechnicianId: v.id("technicians"),  // The supervisor/lead making the assignment
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const step = await ctx.db.get(args.stepId);
    if (!step || step.taskCardId !== args.taskCardId) {
      throw new Error(`Step ${args.stepId} not found or does not belong to task card ${args.taskCardId}.`);
    }
    if (step.status === "completed" || step.status === "na") {
      throw new Error(`Step ${step.stepNumber} is already in terminal status "${step.status}". Cannot reassign.`);
    }

    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard || taskCard.organizationId !== args.organizationId) {
      throw new Error(`Task card ${args.taskCardId} not found or org mismatch.`);
    }
    if (taskCard.status === "complete" || taskCard.status === "voided") {
      throw new Error(`Cannot assign steps on a task card in terminal status "${taskCard.status}".`);
    }

    // Validate target technician
    const tech = await ctx.db.get(args.assignToTechnicianId);
    if (!tech || tech.status !== "active" || tech.organizationId !== args.organizationId) {
      throw new Error(`Target technician ${args.assignToTechnicianId} not active or not in org.`);
    }

    // If step requires IA, warn if tech does not have IA (do not block — they may complete
    // the work and have a different IA counter-sign; throw only at sign-off time).
    // Note: this is a UI-layer warning, not a mutation-layer block.

    // Transition card to in_progress if not_started
    if (taskCard.status === "not_started") {
      await ctx.db.patch(args.taskCardId, { status: "in_progress", startedAt: now, updatedAt: now });
    }

    // Write the step assignment (Phase 2.1 extension table — taskCardStepAssignments)
    // Until that table exists, we write the assignment as an audit log entry with structured notes.
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: "taskCardSteps",
      recordId: args.stepId,
      userId: args.callerUserId,
      technicianId: args.callerTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "assignedToTechnicianId",
      newValue: JSON.stringify(args.assignToTechnicianId),
      notes: `Step ${step.stepNumber} assigned to technician ${args.assignToTechnicianId}. ${args.assignmentNotes ?? ""}`,
      timestamp: now,
    });

    await ctx.db.patch(args.stepId, { updatedAt: now });

    return { stepId: args.stepId, assignedTo: args.assignToTechnicianId };
  },
});
```

---

### 4.3 `completeStep`

**Purpose:** Complete a single step. This is the primary granular execution mutation. It validates the `signatureAuthEvent`, consumes it atomically, snapshots certificate data, enforces IA currency if required, and updates both the step document and the parent card's denormalized counters.

**Enforces:** INV-02 (ratingsExercised), INV-05 (signatureAuthEvent single-consumption), INV-10 (per-step audit trail)

> **Marcus — Regulatory Requirement (completeStep):**
> This is the single most important mutation in the task card engine from a regulatory standpoint. Under 14 CFR 43.9(a)(3), the record must contain the name, certificate number, certificate type, and kind of certificate held by the person approving the work for return to service. We capture all of this at sign-off time — as a snapshot, not a lookup. The `signedCertificateNumber`, `signedLegalName`, and `signedHasIaOnDate` fields are written at this moment and are immutable thereafter. If the technician's certificate lapses after signing, the historical record of what their certificate was at the time of signing is preserved. This is AC 43-9C compliance at the mutation layer.

```typescript
// convex/mutations/taskCards/completeStep.ts

export const completeStep = mutation({
  args: {
    stepId: v.id("taskCardSteps"),
    taskCardId: v.id("taskCards"),
    organizationId: v.id("organizations"),

    action: v.union(v.literal("complete"), v.literal("mark_na")),

    // Required when action == "complete"
    signatureAuthEventId: v.optional(v.id("signatureAuthEvents")),
    ratingsExercised: v.optional(v.array(v.union(
      v.literal("airframe"), v.literal("powerplant"), v.literal("ia"), v.literal("none")
    ))),
    scopeOfWork: v.optional(v.string()),

    // Required when action == "mark_na"
    naReason: v.optional(v.string()),
    naAuthorizedById: v.optional(v.id("technicians")),

    // Optional for both actions
    discrepancyIds: v.optional(v.array(v.id("discrepancies"))),
    notes: v.optional(v.string()),

    callerUserId: v.string(),
    callerTechnicianId: v.id("technicians"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    // Fetch step and validate
    const step = await ctx.db.get(args.stepId);
    if (!step || step.taskCardId !== args.taskCardId) {
      throw new Error(`Step ${args.stepId} not found or task card mismatch.`);
    }
    if (step.organizationId !== args.organizationId) {
      throw new Error(`Step does not belong to organization ${args.organizationId}.`);
    }
    if (step.status !== "pending") {
      // Idempotent guard: if already completed/NA by a prior call, return success without re-signing.
      // The mutation is idempotent for the same caller and same step — it does not re-consume auth events.
      return { stepId: args.stepId, status: step.status, idempotent: true };
    }

    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard || taskCard.status === "voided" || taskCard.status === "complete") {
      throw new Error(`Task card is in terminal status "${taskCard?.status ?? "not found"}". Cannot complete steps.`);
    }

    // Validate caller technician
    const callerTech = await ctx.db.get(args.callerTechnicianId);
    if (!callerTech || callerTech.status !== "active" || !callerTech.userId) {
      throw new Error(
        `Technician ${args.callerTechnicianId} is inactive or has no system account. ` +
        `A Clerk-linked account is required for signing actions.`
      );
    }

    if (args.action === "complete") {
      // ── INV-05: signatureAuthEvent validation ─────────────────────────────
      if (!args.signatureAuthEventId) {
        throw new Error(
          `INV-05: signatureAuthEventId is required to complete step ${step.stepNumber}. ` +
          `Pre-signing re-authentication is mandatory for all step sign-offs.`
        );
      }
      const authEvent = await ctx.db.get(args.signatureAuthEventId);
      if (!authEvent) throw new Error(`signatureAuthEvent ${args.signatureAuthEventId} not found.`);
      if (authEvent.consumed) {
        throw new Error(
          `INV-05: signatureAuthEvent ${args.signatureAuthEventId} has already been consumed. ` +
          `Auth events are single-use. Request a new re-authentication.`
        );
      }
      if (authEvent.expiresAt < now) {
        throw new Error(
          `INV-05: signatureAuthEvent ${args.signatureAuthEventId} expired at ` +
          `${new Date(authEvent.expiresAt).toISOString()}. Request a new re-authentication.`
        );
      }
      if (authEvent.technicianId !== args.callerTechnicianId) {
        throw new Error(
          `INV-05: Auth event was issued to technician ${authEvent.technicianId}, ` +
          `not ${args.callerTechnicianId}. Auth events are non-transferable.`
        );
      }

      // ── INV-02: ratingsExercised must be populated ────────────────────────
      if (!args.ratingsExercised || args.ratingsExercised.length === 0) {
        throw new Error(
          `INV-02: ratingsExercised must be set when signing step ${step.stepNumber}. ` +
          `Per 14 CFR 65.85/65.87, record which A&P rating applies to this work.`
        );
      }

      // ── Retrieve active certificate (snapshot at signing time) ────────────
      const cert = await ctx.db
        .query("certificates")
        .withIndex("by_technician", (q) => q.eq("technicianId", args.callerTechnicianId))
        .filter((q) => q.eq(q.field("active"), true))
        .first();
      if (!cert) {
        throw new Error(
          `No active certificate found for technician ${args.callerTechnicianId}. ` +
          `A technician must hold an active certificate to sign maintenance records.`
        );
      }

      // ── IA currency check for IA-required steps ───────────────────────────
      let signedHasIaOnDate: boolean | undefined;
      if (step.signOffRequiresIa) {
        const iaCert = await ctx.db
          .query("certificates")
          .withIndex("by_type", (q) =>
            q.eq("technicianId", args.callerTechnicianId).eq("certificateType", "IA")
          )
          .filter((q) => q.and(
            q.eq(q.field("active"), true),
            q.eq(q.field("hasIaAuthorization"), true)
          ))
          .first();

        if (!iaCert || !iaCert.iaExpiryDate || iaCert.iaExpiryDate < now) {
          throw new Error(
            `Step ${step.stepNumber} requires an IA sign-off. Technician ` +
            `${args.callerTechnicianId} does not hold a current IA ` +
            `(expiry: ${iaCert?.iaExpiryDate ? new Date(iaCert.iaExpiryDate).toISOString() : "none on file"}). ` +
            `An IA-qualified technician must perform this step or counter-sign it.`
          );
        }
        signedHasIaOnDate = true;
      }

      // ── Atomically consume signatureAuthEvent (INV-05) ────────────────────
      await ctx.db.patch(args.signatureAuthEventId, {
        consumed: true,
        consumedAt: now,
        consumedByTable: "taskCardSteps",
        consumedByRecordId: args.stepId,
      });

      // ── Write step completion ─────────────────────────────────────────────
      await ctx.db.patch(args.stepId, {
        status: "completed",
        signedByTechnicianId: args.callerTechnicianId,
        signedAt: now,
        signedCertificateNumber: cert.certificateNumber,
        signedHasIaOnDate,
        signatureAuthEventId: args.signatureAuthEventId,
        discrepancyIds: args.discrepancyIds ?? [],
        notes: args.notes,
        updatedAt: now,
      });

      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "technician_signed",
        tableName: "taskCardSteps",
        recordId: args.stepId,
        userId: args.callerUserId,
        technicianId: args.callerTechnicianId,
        ipAddress: args.callerIpAddress,
        notes: `Step ${step.stepNumber} completed. Cert: ${cert.certificateNumber}. ` +
               `Ratings: ${args.ratingsExercised?.join(", ")}. ` +
               `IA on date: ${signedHasIaOnDate ?? "n/a"}.`,
        timestamp: now,
      });

    } else if (args.action === "mark_na") {
      if (!args.naReason?.trim()) {
        throw new Error(`naReason is required when marking step ${step.stepNumber} N/A.`);
      }
      if (!args.naAuthorizedById) {
        throw new Error(`naAuthorizedById is required when marking a step N/A. A supervisor or IA must authorize the N/A marking.`);
      }

      const naAuth = await ctx.db.get(args.naAuthorizedById);
      if (!naAuth || naAuth.status !== "active") {
        throw new Error(`N/A authorizer ${args.naAuthorizedById} not found or inactive.`);
      }

      await ctx.db.patch(args.stepId, {
        status: "na",
        naReason: args.naReason.trim(),
        naAuthorizedById: args.naAuthorizedById,
        naAuthorizedAt: now,
        notes: args.notes,
        updatedAt: now,
      });

      await ctx.db.insert("auditLog", {
        organizationId: args.organizationId,
        eventType: "record_updated",
        tableName: "taskCardSteps",
        recordId: args.stepId,
        userId: args.callerUserId,
        technicianId: args.callerTechnicianId,
        ipAddress: args.callerIpAddress,
        notes: `Step ${step.stepNumber} marked N/A. Reason: ${args.naReason?.trim()}. Authorized by: ${args.naAuthorizedById}.`,
        timestamp: now,
      });
    }

    // ── Recompute and update task card counters ───────────────────────────
    const allSteps = await ctx.db
      .query("taskCardSteps")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .collect();

    let completed = 0, na = 0, pending = 0, hasNaRequiringIaReview = false;
    for (const s of allSteps) {
      if (s.status === "completed") completed++;
      else if (s.status === "na") {
        na++;
        if (s.signOffRequiresIa) hasNaRequiringIaReview = true;
      } else pending++;
    }

    // INV-09: Derive card status from step state
    let newCardStatus = taskCard.status as string;
    if (taskCard.status === "not_started") newCardStatus = "in_progress";
    if (pending === 0) {
      newCardStatus = hasNaRequiringIaReview ? "incomplete_na_steps" : "complete";
    }

    await ctx.db.patch(args.taskCardId, {
      status: newCardStatus as "not_started" | "in_progress" | "incomplete_na_steps" | "complete" | "voided",
      completedStepCount: completed,
      naStepCount: na,
      startedAt: taskCard.startedAt ?? now,
      completedAt: newCardStatus === "complete" ? now : undefined,
      updatedAt: now,
    });

    return { stepId: args.stepId, newCardStatus, remaining: pending };
  },
});
```

---

### 4.4 `signTaskCard`

**Purpose:** Final card-level sign-off. Called after all steps are in `completed` or `na` status and any `incomplete_na_steps` IA reviews are resolved. Captures the card-closing signature, validates dual sign-off requirements are satisfied, and creates the card's final audit record.

> **Marcus — Regulatory Requirement (signTaskCard):**
> The card-level sign-off is the point at which the task card becomes a completed maintenance entry eligible for inclusion in the aircraft's maintenance record under 14 CFR 43.9. Each step sign-off proves the individual work was done; the card-level sign-off is the supervising technician's attestation that the entire task was performed in accordance with the approved data and returned to an airworthy condition. These are not the same act. If your shop has an AMT sign each step and a foreman or IA sign the overall card, both signatures are necessary and their roles are distinct.

```typescript
// convex/mutations/taskCards/signTaskCard.ts

export const signTaskCard = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    organizationId: v.id("organizations"),
    signatureAuthEventId: v.id("signatureAuthEvents"),
    ratingsExercised: v.array(v.union(
      v.literal("airframe"), v.literal("powerplant"), v.literal("ia"), v.literal("none")
    )),
    returnToServiceStatement: v.string(),  // Card-level RTS attestation
    callerUserId: v.string(),
    callerTechnicianId: v.id("technicians"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard || taskCard.organizationId !== args.organizationId) {
      throw new Error(`Task card ${args.taskCardId} not found or org mismatch.`);
    }
    if (taskCard.status !== "complete") {
      throw new Error(
        `signTaskCard requires status "complete". Current: "${taskCard.status}". ` +
        `All steps must be resolved (including any incomplete_na_steps IA reviews) before signing.`
      );
    }

    // Validate all steps are indeed in terminal state (double-check denormalized counters)
    const pendingSteps = await ctx.db
      .query("taskCardSteps")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    if (pendingSteps.length > 0) {
      throw new Error(
        `signTaskCard: ${pendingSteps.length} step(s) are still pending. ` +
        `Step numbers: ${pendingSteps.map((s) => s.stepNumber).join(", ")}. ` +
        `Complete or N/A all steps before signing the card.`
      );
    }

    // Check dual sign-off requirements are satisfied (INV: Phase 2.1)
    // For now, check that any step with signOffRequiresIa has a counter-signature record.
    // This query will run against taskCardStepCounterSignatures once that table exists.
    const iaRequiredSteps = await ctx.db
      .query("taskCardSteps")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .filter((q) =>
        q.and(
          q.eq(q.field("signOffRequiresIa"), true),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    // Phase 2.1: For each iaRequiredStep, verify a counter-signature exists.
    // For Phase 2.0: Verify the signing technician themselves holds a current IA.
    // If the signing tech has IA, they can sign the whole card. If not, a counter-signer is needed.
    const callerCert = await ctx.db
      .query("certificates")
      .withIndex("by_type", (q) =>
        q.eq("technicianId", args.callerTechnicianId).eq("certificateType", "IA")
      )
      .filter((q) => q.and(q.eq(q.field("active"), true), q.eq(q.field("hasIaAuthorization"), true)))
      .first();

    const callerHasCurrentIa = callerCert && callerCert.iaExpiryDate && callerCert.iaExpiryDate >= now;

    if (iaRequiredSteps.length > 0 && !callerHasCurrentIa) {
      throw new Error(
        `This task card contains ${iaRequiredSteps.length} IA-required step(s) ` +
        `(steps: ${iaRequiredSteps.map((s) => s.stepNumber).join(", ")}). ` +
        `The card-level signer must hold a current IA, or a separate IA counter-signature ` +
        `must be on file for each IA-required step (Phase 2.1 counter-sign flow). ` +
        `Technician ${args.callerTechnicianId} does not hold a current IA.`
      );
    }

    // INV-05: signatureAuthEvent validation
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent || authEvent.consumed || authEvent.expiresAt < now) {
      throw new Error(
        `signatureAuthEventId ${args.signatureAuthEventId} is invalid, consumed, or expired. ` +
        `Request a new re-authentication event.`
      );
    }
    if (authEvent.technicianId !== args.callerTechnicianId) {
      throw new Error(`INV-05: Auth event technician mismatch.`);
    }
    if (!args.returnToServiceStatement.trim()) {
      throw new Error(`returnToServiceStatement must be non-empty for card-level sign-off.`);
    }
    if (!args.ratingsExercised || args.ratingsExercised.length === 0) {
      throw new Error(`INV-02: ratingsExercised must be set for card-level sign-off.`);
    }

    // Consume auth event
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true, consumedAt: now,
      consumedByTable: "taskCards", consumedByRecordId: args.taskCardId,
    });

    // Update task card with final signature data (using notes field — schema extension TBD)
    await ctx.db.patch(args.taskCardId, {
      completedAt: now,
      updatedAt: now,
      notes: (taskCard.notes ? taskCard.notes + "\n" : "") +
             `[SIGNED] ${new Date(now).toISOString()} by ${args.callerTechnicianId}: ${args.returnToServiceStatement.trim()}`,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_signed",
      tableName: "taskCards",
      recordId: args.taskCardId,
      userId: args.callerUserId,
      technicianId: args.callerTechnicianId,
      ipAddress: args.callerIpAddress,
      notes: `Task card ${taskCard.taskCardNumber} signed. Ratings: ${args.ratingsExercised.join(", ")}. ` +
             `RTS: ${args.returnToServiceStatement.trim().substring(0, 100)}.`,
      timestamp: now,
    });

    return { taskCardId: args.taskCardId, signedAt: now };
  },
});
```

---

### 4.5 `returnTaskCard`

**Purpose:** Return a task card for rework. Specific steps are identified for re-execution; those steps revert from `completed` back to `pending`. The task card transitions from `complete` (or `in_progress`) back to `in_progress`. The return is permanently logged.

> **Marcus — Regulatory Requirement (returnTaskCard):**
> A task card returned for rework is not a deletion of the prior sign-off — it is an extension of the maintenance event. The original step sign-off events remain in the audit log. The `returnTaskCard` mutation creates a new audit record documenting *why* the card was returned and which steps are affected. Under AC 43-9C, corrections to maintenance records must be made by creating new entries, not by striking or altering old ones. The same principle applies here: a step that was signed and then found to be incomplete generates a return record, reverts the step to pending, and requires a new sign-off. The chain of authority is preserved.

```typescript
// convex/mutations/taskCards/returnTaskCard.ts

export const returnTaskCard = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    organizationId: v.id("organizations"),
    returnReason: v.string(),               // Required — documented reason for return
    stepIdsToRework: v.array(v.id("taskCardSteps")),  // Which steps must be re-executed
    reworkInstructions: v.optional(v.string()),
    callerUserId: v.string(),
    callerTechnicianId: v.id("technicians"),  // Must be supervisor, QC, or IA
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    if (!args.returnReason.trim()) {
      throw new Error(`returnReason is required. Document why the task card is being returned for rework.`);
    }
    if (args.stepIdsToRework.length === 0) {
      throw new Error(`At least one step must be identified for rework when returning a task card.`);
    }

    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard || taskCard.organizationId !== args.organizationId) {
      throw new Error(`Task card ${args.taskCardId} not found or org mismatch.`);
    }
    if (taskCard.status !== "complete" && taskCard.status !== "in_progress") {
      throw new Error(
        `returnTaskCard can only be called on "complete" or "in_progress" cards. ` +
        `Current status: "${taskCard.status}".`
      );
    }

    // Revert each identified step to pending
    // The prior sign-off data is NOT cleared — it remains in the document as historical context
    // and in the audit log as an immutable event. The step status reverts but the history stays.
    let revertedCount = 0;
    for (const stepId of args.stepIdsToRework) {
      const step = await ctx.db.get(stepId);
      if (!step || step.taskCardId !== args.taskCardId) {
        throw new Error(`Step ${stepId} not found or does not belong to task card ${args.taskCardId}.`);
      }

      if (step.status === "completed") {
        // Log the rework event before reverting
        await ctx.db.insert("auditLog", {
          organizationId: args.organizationId,
          eventType: "status_changed",
          tableName: "taskCardSteps",
          recordId: stepId,
          userId: args.callerUserId,
          technicianId: args.callerTechnicianId,
          ipAddress: args.callerIpAddress,
          fieldName: "status",
          oldValue: JSON.stringify("completed"),
          newValue: JSON.stringify("pending"),
          notes: `Step ${step.stepNumber} reverted to pending for rework. Reason: ${args.returnReason.trim()}. ` +
                 `Prior sign-off by ${step.signedByTechnicianId} at ${step.signedAt} is preserved in log.`,
          timestamp: now,
        });

        // Revert the step — clear signing fields, return to pending
        await ctx.db.patch(stepId, {
          status: "pending",
          signedByTechnicianId: undefined,
          signedAt: undefined,
          signedCertificateNumber: undefined,
          signedHasIaOnDate: undefined,
          signatureAuthEventId: undefined,
          notes: (step.notes ? step.notes + "\n" : "") +
                 `[RETURNED ${new Date(now).toISOString()}] ${args.returnReason.trim()}`,
          updatedAt: now,
        });
        revertedCount++;
      }
    }

    // Recompute task card status
    const allSteps = await ctx.db
      .query("taskCardSteps")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .collect();

    const pendingCount = allSteps.filter((s) => s.status === "pending").length;
    const newStatus = pendingCount > 0 ? "in_progress" : "complete";

    await ctx.db.patch(args.taskCardId, {
      status: newStatus,
      completedStepCount: allSteps.filter((s) => s.status === "completed").length,
      naStepCount: allSteps.filter((s) => s.status === "na").length,
      completedAt: undefined,
      updatedAt: now,
    });

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "status_changed",
      tableName: "taskCards",
      recordId: args.taskCardId,
      userId: args.callerUserId,
      technicianId: args.callerTechnicianId,
      ipAddress: args.callerIpAddress,
      notes: `Task card ${taskCard.taskCardNumber} returned for rework. ` +
             `${revertedCount} step(s) reverted. Reason: ${args.returnReason.trim()}. ` +
             `Instructions: ${args.reworkInstructions ?? "none provided"}.`,
      timestamp: now,
    });

    return { taskCardId: args.taskCardId, revertedSteps: revertedCount, newStatus };
  },
});
```

---

## 5. Multiple-Technician Sign-Off Logic

### 5.1 Scenarios Requiring Dual Sign-Off

| Scenario | Primary Signer | Counter-Signer | Regulatory Basis |
|---|---|---|---|
| Annual inspection step with repair work | A&P (airframe/powerplant) | IA (inspection authorization) | 14 CFR 65.91, 14 CFR 43 Appendix D |
| Part 145 QC-required inspection step | Performing AMT | QC Inspector | 14 CFR 145.109(d), RSM procedure |
| Return-to-service on annual inspection | AMT who performed work | IA signing overall inspection | 14 CFR 43.11, 14 CFR 91.409 |
| Avionics installation per AMM (some models) | Avionics tech | Second A&P (dual AMT requirement) | AMM chapter requirement |

### 5.2 Dual Sign-Off Execution Flow

```
  Step requiring dual sign-off:

  1. Primary AMT calls completeStep(action="complete", stepId, signatureAuthEventId_A)
     → Step status: completed (primary signature captured)
     → signedByTechnicianId: AMT_id
     → signatureAuthEventId: authEvent_A (consumed)

  2. IA/Inspector calls counterSignStep(stepId, signatureAuthEventId_B)
     → Creates taskCardStepCounterSignatures record
     → counterSignedByTechnicianId: IA_id
     → counterSignatureAuthEventId: authEvent_B (consumed)
     → Step is now "fully counter-signed"

  3. signTaskCard validates: for each step with signOffRequiresIa=true,
     a matching taskCardStepCounterSignatures record must exist.
     If any IA-required step lacks a counter-signature, signTaskCard throws.
```

> **Marcus — Regulatory Annotation (dual sign-off):**
> The two-signature model is not a procedural nicety — it is a separation of authorities required by the FARs. The AMT certifies the work was performed. The IA certifies the work was performed correctly and the aircraft is airworthy. These are different certifications made under different authorities. The AMT's A&P certificate does not grant return-to-service authority for annual inspections. The IA's signature does. If you allow a single signature to satisfy both requirements, you have invalidated the inspection.
>
> A specific enforcement scenario: an IA signs a step both as the performing AMT and the inspecting IA (two hats, one person). This is legally permissible — an IA holds an A&P. Our system should permit a single technician to be both primary signer and counter-signer only if their certificate covers both roles. The `counterSignStep` mutation must verify: if caller is the same technician as `signedByTechnicianId`, they must hold an IA for it to count as a valid counter-signature.

---

## 6. In-Progress Interruption Handling

### 6.1 Shift Change Protocol

When a technician must leave a task mid-execution, the `interruptStep` mutation creates a `taskCardInterruptions` record and logs the work state. The resuming technician calls `resumeStep`, which closes the interruption record and creates a continuity-of-work audit entry.

```typescript
// Abbreviated specs — full TypeScript in Phase 2.1 implementation file

// interruptStep
// args: stepId, taskCardId, organizationId, interruptionType, interruptionReason,
//       workStatusAtInterruption, safetyPreservationTaken, callerTechnicianId
// effect:
//   - Creates taskCardInterruptions record with resumedAt=null
//   - Writes auditLog entry with full work state snapshot
//   - Does NOT change step.status (step remains "pending" — it was not completed)
//   - Does NOT require signatureAuthEvent (interruption is not a signing event)
// guard:
//   - step.status must be "pending" (cannot interrupt an already-completed step)
//   - taskCard.status must be "in_progress"
//   - interruptionReason and safetyPreservationTaken must be non-empty

// resumeStep
// args: stepId, taskCardId, organizationId, interruptionId, resumptionNotes,
//       callerTechnicianId
// effect:
//   - Sets taskCardInterruptions.resumedAt = now
//   - Sets taskCardInterruptions.resumedByTechnicianId = caller
//   - Writes auditLog entry documenting continuity handoff
//   - Does NOT advance step.status (resuming does not complete)
// guard:
//   - interruptionRecord.resumedAt must be null (not already resumed)
//   - Resuming technician must be active and in org
```

### 6.2 Deferred Maintenance

A step that requires deferral (parts unavailable, engineering order pending) follows a specific path:

```
  Step cannot be completed now (parts on order):

  1. interruptStep(interruptionType="parts_hold", ...)
     Creates interruption record.

  2. If deferral is formal (MEL/CDL required):
     - Create a discrepancy record linked to this step
     - Call completeStep(action="mark_na", naReason="Parts on order — deferred per MEL X.X")
     - The N/A marking with a linked discrepancy creates the formal deferral chain

  3. If deferral moves to a new work order:
     - interruptionRecord.deferralType = "deferred_wo"
     - interruptionRecord.deferredToWorkOrderId = [new WO]
     - This step remains pending on the original WO until either:
       a. The new WO completes and this step is resumed, or
       b. The task card is voided and a new task card created on the new WO

  4. The original WO cannot close while this step is pending
     (closeWorkOrder guard: all task cards must be complete, voided, or incomplete_na_steps-reviewed)
```

> **Marcus — Regulatory Annotation (deferred maintenance):**
> The deferred maintenance path is where regulatory exposure is highest. A step deferred to a new work order creates a loose end in the current work order. If the original WO closes without that step being formally resolved — either completed, N/A'd with a discrepancy, or voided — the maintenance record is incomplete. The close guard must check for open interruption records with `resumedAt == null` as a blocking condition. Devraj: add this to the `getCloseReadiness` query (Q-WO-09 in the work order engine) and to `closeWorkOrder`'s precondition block. This is BACK-P2-08.

---

## 7. Integration with `signatureAuthEvents`

### 7.1 Auth Event Lifecycle in Task Card Execution

The `signatureAuthEvents` table acts as the cryptographic handshake between the Clerk re-authentication flow and the Convex signing mutations. The following table maps each task card mutation to its auth event requirements:

| Mutation | Requires Auth Event | Consumed At | One-Per |
|---|---|---|---|
| `createTaskCard` | No | — | — |
| `assignStep` | No | — | — |
| `completeStep` (complete) | **Yes — mandatory** | Step completion | Per step |
| `completeStep` (mark_na) | No | — | — |
| `reviewNAStep` | **Yes — mandatory** | IA review of N/A step | Per reviewed step |
| `signTaskCard` | **Yes — mandatory** | Card-level sign-off | Per card sign-off |
| `counterSignStep` | **Yes — mandatory** | Counter-signature | Per counter-sign |
| `returnTaskCard` | No | — | — |
| `interruptStep` | No | — | — |
| `resumeStep` | No | — | — |
| `voidTaskCard` | No | — | — |

### 7.2 Auth Event Verification Checklist

Every mutation that consumes a `signatureAuthEvent` must execute the following six checks atomically. These are not optional:

```
1. EXISTS:     authEvent = ctx.db.get(signatureAuthEventId) — throw if null
2. UNCONSUMED: authEvent.consumed == false — throw if already consumed
3. UNEXPIRED:  authEvent.expiresAt >= Date.now() — throw if expired
4. IDENTITY:   authEvent.technicianId == callerTechnicianId — throw if mismatch
5. CONSUME:    ctx.db.patch(signatureAuthEventId, { consumed: true, consumedAt: now, ... })
6. WRITE:      The target record (step/card) is updated in the same transaction as step 5
```

Convex mutations are atomic — steps 5 and 6 happen in the same transaction. This guarantees that an auth event is never consumed without the corresponding record being updated, and a record is never updated without its auth event being consumed. There is no race condition.

### 7.3 Audit Chain Reconstruction

The complete audit chain for a signed step is reconstructable from three tables:

```
taskCardSteps[stepId]
  .signatureAuthEventId ──► signatureAuthEvents[authEventId]
                              .clerkSessionId
                              .technicianId
                              .authenticatedAt
                              .authMethod
                              .ipAddress

  .signedByTechnicianId ──► technicians[technicianId]
                              .legalName
                              .userId

  (audit events) ──────────► auditLog
                              .by_record("taskCardSteps", stepId)
                              all events for this step in timestamp order
```

An FAA inspector can reconstruct the full chain of custody for any step sign-off: who authenticated (Clerk session), how they authenticated (PIN/biometric/TOTP), when, from what IP, and what they signed. This chain is what AC 43-9C calls for in a digital recordkeeping system.

---

## 8. Invariant-to-Test-Case Table (Task Card Engine)

| Invariant | Mutation | Test Case ID | Description |
|---|---|---|---|
| INV-05 | `completeStep` | TC-TC-01 | Reuse consumed auth event → assert throws "already consumed" |
| INV-05 | `completeStep` | TC-TC-02 | Expired auth event (expiresAt < now) → assert throws "expired" |
| INV-05 | `completeStep` | TC-TC-03 | Auth event for technician A used by technician B → assert throws "mismatch" |
| INV-02 | `completeStep` | TC-TC-04 | Empty ratingsExercised on complete → assert throws |
| INV-09 | `completeStep` | TC-TC-05 | All steps complete, no IA N/A → assert card status == "complete" |
| INV-09 | `completeStep` | TC-TC-06 | One IA-required step marked N/A → assert card status == "incomplete_na_steps" |
| INV-10 | `completeStep` | TC-TC-07 | Step sign-off → assert taskCardSteps doc updated, auditLog entry present |
| IA currency | `completeStep` | TC-TC-08 | IA-required step, signer's IA expired → assert throws with expiry message |
| Dual sign-off | `signTaskCard` | TC-TC-09 | Card with IA-required step, no counter-signature, signer lacks IA → assert throws |
| Return rework | `returnTaskCard` | TC-TC-10 | Return card → assert step reverts to pending, prior sign-off in auditLog |
| Card terminal | `completeStep` | TC-TC-11 | Step on voided card → assert throws |
| Sequential | `createTaskCard` | TC-TC-12 | Steps [1,3,5] non-sequential → assert throws |
| N/A auth | `completeStep` | TC-TC-13 | mark_na with null naAuthorizedById → assert throws |
| RTS statement | `signTaskCard` | TC-TC-14 | Empty returnToServiceStatement → assert throws |
| Pending steps | `signTaskCard` | TC-TC-15 | Card with one pending step, signTaskCard called → assert throws |
| Interruption | `interruptStep` | TC-TC-16 | Interrupt already-completed step → assert throws |
| Deferred WO | close guard | TC-TC-17 | WO with open interruption (resumedAt null) → closeWorkOrder throws |

---

## 9. Open Items and Backlog

| Item | Description | Priority | Blocker? |
|---|---|---|---|
| BACK-TC-01 | `taskCardStepCounterSignatures` table — schema extension request | **High** | Phase 2.1 |
| BACK-TC-02 | `taskCardInterruptions` table — schema extension request | **High** | Phase 2.1 |
| BACK-TC-03 | `taskCardStepAssignments` table — step-level assignment tracking | Medium | Phase 2.1 |
| BACK-TC-04 | `reviewNAStep` mutation — IA review of N/A-marked steps | **High** | Needed for `incomplete_na_steps` resolution |
| BACK-TC-05 | `counterSignStep` mutation — dual sign-off execution | **High** | Needed for annual inspections |
| BACK-TC-06 | `interruptStep` / `resumeStep` mutations — full implementation | **High** | Needed for shift-change compliance |
| BACK-TC-07 | `voidTaskCard` mutation | Medium | Needed for admin correction flow |
| BACK-TC-08 | Close guard: open interruptions block WO close | **High — Marcus flagged** | Must add to closeWorkOrder and getCloseReadiness |
| BACK-TC-09 | `getTaskCardAuditTrail` query — step-level audit for FAA export | Medium | Phase 2.1 |
| BACK-TC-10 | Phase 2.1 schema extension review with Devraj and Cilla | **High** | Gates TC-01 through TC-03 |

---

*Task Card Execution Engine — Rafael Mendoza (Tech Lead)*  
*Regulatory annotations: Marcus Webb*  
*Schema basis: convex-schema-v2.md (FROZEN, 2026-02-22)*  
*Companion: phase-2-work-orders/work-order-engine.md*  
*This document governs Phase 2 task card mutation implementation. All references to schema extensions are Phase 2.1 items pending Devraj/Cilla review.*
