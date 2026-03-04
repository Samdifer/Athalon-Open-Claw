# Athelon — Work Order Engine: Phase 2 Design & Implementation Specification
**Document Type:** Phase 2 Implementation Specification — Mutation Layer  
**Author:** Rafael Mendoza (Tech Lead / Architect) with Devraj Anand (Backend, Convex) inline notes  
**Regulatory Review:** Marcus Webb (Regulatory & Compliance)  
**QA Review:** Cilla Oduya (QA Lead)  
**Date:** 2026-02-22  
**Status:** DRAFT — Pending Cilla and Marcus review  
**Schema Basis:** `convex-schema-v2.md` (FROZEN)  
**Prerequisites:** Phase 1 gate review blockers B-01 through B-15 fully resolved; schema v2 signed off.

---

## Rafael's Preamble

*I want to be precise about what this document is and is not.*

*This is the authoritative specification for the Work Order Engine — the six core mutations that move a work order through its lifecycle, the queries that support the work order module, and the invariant-enforcement requirements that make every mutation defensible under an FAA inspection. This is not a tutorial. This is not exploratory. Every decision in this document is traceable to a schema invariant, a regulatory requirement, or a gate review condition.*

*The mutations documented here are the enforcement layer that the Phase 1 schema relies on. Devraj's schema comment about invariants not being enforceable by the type system was not a disclaimer — it was a contract. These mutations honor that contract. Every INV-* reference in this document maps to the invariant table in schema-v2.md.*

*Three things I need to call out before we get into the specs:*

*First: The work order lifecycle is not a simple status machine. It has guard conditions at every transition, and those guard conditions are not optional. A work order that transitions to "closed" without a returnToService record is not just a data error — it is a falsified maintenance record in an aircraft logbook. Treat every guard condition as if a certificate holder's license depends on it, because it does.*

*Second: Devraj's implementation notes are inserted throughout this document. They are not asides — read them. Several of them flag implementation pitfalls that will cost days to debug if missed.*

*Third: Marcus Webb has annotated each mutation with the specific regulatory requirement it satisfies and the specific failure mode we are preventing. Those annotations are not decorative. Read them before implementing.*

---

## 1. Work Order State Machine

The following is the complete work order state machine. Every arrow represents a valid transition; every label is a guard condition that must be evaluated in the transition mutation. Transitions not shown are illegal and must be rejected at the mutation layer.

```
                         ┌────────────────────────────────────────────────┐
                         │              WORK ORDER STATES                 │
                         └────────────────────────────────────────────────┘

                                        [createWorkOrder]
                                              │
                                              ▼
                                         ┌─────────┐
                                         │  draft  │
                                         └────┬────┘
                                              │ [openWorkOrder]
                                              │ GUARD: aircraftId exists and aircraft.status
                                              │   is not "destroyed" or "sold"
                                              │ GUARD: no open/in_progress WO on same aircraft
                                              │   unless concurrentWOOverrideAcknowledged=true
                                              │ GUARD: aircraftTotalTimeAtOpen captured
                                              │ GUARD: ≥1 assignedTechnician
                                              ▼
                                         ┌────────┐
                                         │  open  │◄─────────────────────────────┐
                                         └───┬────┘                              │
                                             │                                   │ [releaseHold]
                                             │ [beginWork] (implicit)            │ GUARD: onHoldReason
                                             │ (first addTaskCard or             │   cleared
                                             │  first step touched)              │
                                             ▼                                   │
                                      ┌─────────────┐     [placeOnHold]    ┌────┴──────┐
                                      │ in_progress │────────────────────► │  on_hold  │
                                      └──────┬──────┘    GUARD: reason     └───────────┘
                                             │             provided
                                             │
                               ┌─────────────┴─────────────┐
                               │                           │
                               │ [allTaskCards complete     │ [discrepancy found
                               │  OR no task cards,        │  and unresolved]
                               │  but discrepancies open]  │
                               ▼                           ▼
                    ┌──────────────────────┐    ┌───────────────────────┐
                    │ pending_inspection   │    │  open_discrepancies   │
                    └──────────┬───────────┘    └──────────┬────────────┘
                               │                          │
                               │ [IA reviews]             │ [all discrepancies
                               │                          │  dispositioned]
                               ▼                          │
                    ┌──────────────────────┐              │
                    │   pending_signoff    │◄─────────────┘
                    └──────────┬───────────┘
                               │ [closeWorkOrder]
                               │ GUARD: all discrepancies dispositioned
                               │ GUARD: returnToService record exists
                               │ GUARD: aircraftTotalTimeAtClose set
                               │ GUARD: aircraftTotalTimeAtClose ≥ atOpen
                               │ GUARD: closedByTechnicianId set (IA or A&P)
                               │ GUARD: DOM authorization (if Part 145)
                               ▼
                         ┌─────────┐
                         │ closed  │
                         └─────────┘

       ┌──────────────────────────────────────────────────────────────────┐
       │  [voidWorkOrder] may be called from: draft, open, on_hold ONLY  │
       │  GUARD: voidedByUserId + voidedReason required                  │
       │  GUARD: no signed maintenanceRecords linked to this WO          │
       │  GUARD: status != in_progress, pending_inspection,              │
       │         pending_signoff, open_discrepancies, closed, cancelled  │
       │                         │                                       │
       │                         ▼                                       │
       │                    ┌─────────┐                                  │
       │                    │ voided  │  (terminal — no exit)            │
       │                    └─────────┘                                  │
       └──────────────────────────────────────────────────────────────────┘

       ┌──────────────────────────────────────────────────────────────────┐
       │  [cancelWorkOrder] — not covered in this document (Phase 2 backlog) │
       │  cancelled is a customer-decision terminal state                │
       └──────────────────────────────────────────────────────────────────┘
```

**State Transition Invariant Summary:**

| From → To | Mutation | Critical Guards |
|---|---|---|
| `draft` → `open` | `openWorkOrder` | Aircraft status, concurrent WO check, TT capture, technician assignment |
| `open` → `in_progress` | `addTaskCard` (first) | WO must be open |
| `in_progress` → `on_hold` | `placeWorkOrderOnHold` | Reason required |
| `on_hold` → `open` | `releaseWorkOrderHold` | — |
| `in_progress` → `pending_inspection` | `submitForInspection` | All task cards not_started or complete |
| `in_progress` → `open_discrepancies` | `flagOpenDiscrepancies` | ≥1 undispositioned discrepancy |
| `open_discrepancies` → `pending_signoff` | `clearDiscrepancies` | All discrepancies dispositioned |
| `pending_inspection` → `pending_signoff` | IA review flow | — |
| `pending_signoff` → `closed` | `closeWorkOrder` | Full RTS precondition set (INV-06, INV-19) |
| `draft/open/on_hold` → `voided` | `voidWorkOrder` | No signed records, reason required |

---

## 2. Mutation Specifications

### Shared Types

```typescript
// convex/types/workOrderTypes.ts
// Rafael: All types used across work order mutations are centralized here.
// Devraj note: Do not inline these in individual mutation files — shared types
// must have a single source of truth. The schema validators are truth for Convex
// document shapes; these types are truth for mutation input contracts.

import { Id } from "./_generated/dataModel";

export type WorkOrderStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "on_hold"
  | "pending_inspection"
  | "pending_signoff"
  | "open_discrepancies"
  | "closed"
  | "cancelled"
  | "voided";

// Rafael: This is the standard audit log write payload used by every mutation.
// Devraj: Wrap the writeAuditLog call in a helper so no mutation forgets a field.
export interface AuditLogPayload {
  organizationId: Id<"organizations">;
  eventType: string;
  tableName: string;
  recordId: string;
  userId: string;
  technicianId?: Id<"technicians">;
  ipAddress?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
}
```

---

### 2.1 `createWorkOrder`

**Purpose:** Initialize a new work order in `draft` status. Does not open it, does not capture aircraft time, does not assign technicians. Draft is the administrative intake step.

**Enforces:** INV-14 (work order number uniqueness within org)

```typescript
// convex/mutations/workOrders/createWorkOrder.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createWorkOrder = mutation({
  args: {
    // Identity
    organizationId: v.id("organizations"),
    aircraftId: v.id("aircraft"),

    // Work order metadata
    workOrderNumber: v.string(),
    workOrderType: v.union(
      v.literal("routine"),
      v.literal("unscheduled"),
      v.literal("annual_inspection"),
      v.literal("100hr_inspection"),
      v.literal("progressive_inspection"),
      v.literal("ad_compliance"),
      v.literal("major_repair"),
      v.literal("major_alteration"),
      v.literal("field_approval"),
      v.literal("ferry_permit")
    ),
    description: v.string(),
    squawks: v.optional(v.string()),
    priority: v.union(
      v.literal("routine"),
      v.literal("urgent"),
      v.literal("aog")
    ),
    targetCompletionDate: v.optional(v.number()),
    customerId: v.optional(v.id("customers")),
    notes: v.optional(v.string()),

    // Caller context
    callerUserId: v.string(),       // Clerk user ID — must match an active technician
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"workOrders">> => {
    const now = Date.now();

    // ── Validation Block ──────────────────────────────────────────────

    // INV-14: workOrderNumber must be unique within organizationId.
    // Devraj note: We query by_number directly. If anything comes back, we throw.
    // Do not rely on a count() — use collect() and check length, or use a .first() query.
    const existingWO = await ctx.db
      .query("workOrders")
      .withIndex("by_number", (q) =>
        q.eq("organizationId", args.organizationId)
         .eq("workOrderNumber", args.workOrderNumber)
      )
      .first();

    if (existingWO !== null) {
      throw new Error(
        `INV-14: Work order number "${args.workOrderNumber}" already exists ` +
        `within organization ${args.organizationId}. ` +
        `Work order numbers must be unique per organization.`
      );
    }

    // Validate organization exists and is active
    const org = await ctx.db.get(args.organizationId);
    if (!org || !org.active) {
      throw new Error(`Organization ${args.organizationId} not found or inactive.`);
    }

    // Validate aircraft exists and is not terminal
    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) {
      throw new Error(`Aircraft ${args.aircraftId} not found.`);
    }
    if (aircraft.status === "destroyed" || aircraft.status === "sold") {
      throw new Error(
        `Aircraft ${args.aircraftId} has status "${aircraft.status}". ` +
        `Work orders may not be created for destroyed or sold aircraft.`
      );
    }

    // Validate workOrderNumber is non-empty and non-whitespace
    if (!args.workOrderNumber.trim()) {
      throw new Error(`workOrderNumber must be a non-empty, non-whitespace string.`);
    }

    // Validate description is non-empty
    if (!args.description.trim()) {
      throw new Error(`description must be a non-empty string.`);
    }

    // ── Insert ────────────────────────────────────────────────────────

    const workOrderId = await ctx.db.insert("workOrders", {
      workOrderNumber: args.workOrderNumber.trim(),
      organizationId: args.organizationId,
      aircraftId: args.aircraftId,
      status: "draft",
      workOrderType: args.workOrderType,
      description: args.description.trim(),
      squawks: args.squawks,
      openedAt: now,
      openedByUserId: args.callerUserId,
      targetCompletionDate: args.targetCompletionDate,
      customerId: args.customerId,
      priority: args.priority,
      notes: args.notes,
      // Aircraft total time at open is set in openWorkOrder, not here.
      // We set 0 as a placeholder; it is overwritten in openWorkOrder.
      // Devraj note: Do NOT surface this field in UI before openWorkOrder runs —
      // the 0 value is a sentinel, not a real reading. The WO cannot be used
      // in any maintenance record until openWorkOrder sets the real TT.
      aircraftTotalTimeAtOpen: 0,
      returnedToService: false,
      createdAt: now,
      updatedAt: now,
    });

    // ── Audit Log ─────────────────────────────────────────────────────
    // Marcus: Every work order creation must be in the audit log.
    // The record_created event is not regulated per se, but it anchors the
    // chain of custody that starts here and ends with the closed/voided record.
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "workOrders",
      recordId: workOrderId,
      userId: args.callerUserId,
      ipAddress: args.callerIpAddress,
      notes: `Work order ${args.workOrderNumber} created (draft).`,
      timestamp: now,
    });

    return workOrderId;
  },
});
```

> **Marcus — FAA Compliance Note (createWorkOrder):**
> This mutation satisfies the administrative intake requirement under 14 CFR 145.157 (work order initiation). The `draft` status correctly models a work order that exists but has not yet been formally opened — no aircraft time is captured, no technicians are assigned. INV-14 enforcement is critical: duplicate work order numbers in a regulated shop are not just inconvenient, they are a chain-of-custody failure. An FAA inspector tracing maintenance history by work order number must get exactly one record. If that query returns two records, both are suspect.
>
> **What could go wrong:** Calling `createWorkOrder` with a number that was previously used on a voided WO. The INV-14 check queries all statuses — including `voided`. A voided WO still occupies its number. This is intentional: you cannot re-use a voided work order number because the voided record is a permanent audit record.

---

### 2.2 `openWorkOrder`

**Purpose:** Formally open a draft work order. Captures aircraft total time at open, assigns initial technicians, and transitions status to `open`. This is the regulatory start of the maintenance event.

**Enforces:** INV-06 (partial — aircraftTotalTimeAtOpen ≥ 0), INV-18 (aircraft total time capture)

```typescript
// convex/mutations/workOrders/openWorkOrder.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const openWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    // Aircraft total time at open — required per 14 CFR 43.11(a)(2).
    // Devraj note: This comes from the aircraft's current tach/hobbs reading,
    // entered by the opening technician. It is NOT derived from aircraft.totalTimeAirframeHours —
    // that field is the last-known value. The actual current time is entered here.
    aircraftTotalTimeAtOpen: v.number(),

    // Assigned technicians — at least one required
    assignedTechnicianIds: v.array(v.id("technicians")),

    // Concurrent work order override (INV per schema)
    concurrentWorkOrderOverrideAcknowledged: v.optional(v.boolean()),
    concurrentWorkOrderReason: v.optional(v.string()),

    callerUserId: v.string(),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();

    // ── Fetch and validate work order ─────────────────────────────────
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error(`Work order ${args.workOrderId} not found.`);
    if (wo.organizationId !== args.organizationId) {
      throw new Error(`Work order does not belong to organization ${args.organizationId}.`);
    }
    if (wo.status !== "draft") {
      throw new Error(
        `openWorkOrder requires status "draft". Current status: "${wo.status}".`
      );
    }

    // ── Aircraft total time validation ────────────────────────────────
    if (args.aircraftTotalTimeAtOpen < 0) {
      throw new Error(`aircraftTotalTimeAtOpen must be ≥ 0. Got: ${args.aircraftTotalTimeAtOpen}.`);
    }

    // INV-18 (partial): verify the entered TT is not less than the aircraft's
    // last known total time. This is a soft guard — the aircraft's recorded TT
    // might be stale, but a value significantly below it is a data quality issue.
    const aircraft = await ctx.db.get(wo.aircraftId);
    if (!aircraft) throw new Error(`Aircraft ${wo.aircraftId} not found.`);
    if (args.aircraftTotalTimeAtOpen < aircraft.totalTimeAirframeHours) {
      // Devraj note: This is a throw, not a warning. Per INV-18, aircraft total
      // time is monotonically increasing. If the technician entered a value lower
      // than the last known value, it is either a typo or falsification.
      // Marcus agreed: throw, do not warn.
      throw new Error(
        `INV-18: aircraftTotalTimeAtOpen (${args.aircraftTotalTimeAtOpen}h) is less than ` +
        `aircraft last known total time (${aircraft.totalTimeAirframeHours}h). ` +
        `Aircraft total time is monotonically increasing. ` +
        `If this reading is correct, contact your DOM before proceeding.`
      );
    }

    // ── Concurrent work order check ───────────────────────────────────
    // INV per schema: If another open/in_progress WO exists for the same aircraft,
    // concurrentWorkOrderOverrideAcknowledged must be true and reason must be set.
    const concurrentWO = await ctx.db
      .query("workOrders")
      .withIndex("by_aircraft_status", (q) => q.eq("aircraftId", wo.aircraftId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "open"),
          q.eq(q.field("status"), "in_progress"),
          q.eq(q.field("status"), "pending_inspection"),
          q.eq(q.field("status"), "pending_signoff"),
          q.eq(q.field("status"), "open_discrepancies")
        )
      )
      .first();

    if (concurrentWO !== null) {
      if (!args.concurrentWorkOrderOverrideAcknowledged || !args.concurrentWorkOrderReason?.trim()) {
        throw new Error(
          `Aircraft ${wo.aircraftId} already has an active work order (${concurrentWO.workOrderNumber}, ` +
          `status: ${concurrentWO.status}). To open a concurrent work order, set ` +
          `concurrentWorkOrderOverrideAcknowledged=true and provide a concurrentWorkOrderReason.`
        );
      }
    }

    // ── Technician assignment validation ──────────────────────────────
    if (args.assignedTechnicianIds.length === 0) {
      throw new Error(`At least one technician must be assigned when opening a work order.`);
    }
    for (const techId of args.assignedTechnicianIds) {
      const tech = await ctx.db.get(techId);
      if (!tech || tech.status !== "active") {
        throw new Error(`Technician ${techId} not found or is not active.`);
      }
      if (tech.organizationId !== args.organizationId) {
        throw new Error(`Technician ${techId} does not belong to organization ${args.organizationId}.`);
      }
    }

    // ── Update work order ─────────────────────────────────────────────
    await ctx.db.patch(args.workOrderId, {
      status: "open",
      aircraftTotalTimeAtOpen: args.aircraftTotalTimeAtOpen,
      concurrentWorkOrderOverrideAcknowledged: args.concurrentWorkOrderOverrideAcknowledged,
      concurrentWorkOrderReason: args.concurrentWorkOrderReason,
      updatedAt: now,
    });

    // ── Audit log ─────────────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "status_changed",
      tableName: "workOrders",
      recordId: args.workOrderId,
      userId: args.callerUserId,
      ipAddress: args.callerIpAddress,
      fieldName: "status",
      oldValue: JSON.stringify("draft"),
      newValue: JSON.stringify("open"),
      notes:
        `Work order opened. Aircraft TT at open: ${args.aircraftTotalTimeAtOpen}h. ` +
        `Technicians assigned: ${args.assignedTechnicianIds.join(", ")}.`,
      timestamp: now,
    });
  },
});
```

> **Marcus — FAA Compliance Note (openWorkOrder):**
> The `aircraftTotalTimeAtOpen` capture is the regulatory start clock for this maintenance event. Under 14 CFR 43.11(a)(2), the inspection record must contain the total time in service at the time of the inspection. We cannot derive this from close time alone — we need the open value to demonstrate the time interval during which the maintenance was performed.
>
> The concurrent work order check is not a regulatory requirement per se, but it is a chain-of-custody best practice. Two concurrent work orders on the same aircraft with overlapping date ranges and the same technicians are a red flag in a logbook audit. The override mechanism exists for legitimate cases (e.g., warranty work being performed alongside a scheduled inspection) but requires documented justification.
>
> **What could go wrong:** Technician enters a total time rounded to the nearest whole hour when the actual hobbs time is fractional. This is common in the field and acceptable — but the close mutation must accept any value ≥ atOpen, not just whole numbers. `v.number()` in Convex is float64. No rounding constraint should be imposed.

---

### 2.3 `addTaskCard`

**Purpose:** Add a task card to an open or in-progress work order. Creates the task card document, creates all step documents in `taskCardSteps`, and transitions the work order to `in_progress` if it was `open`.

**Enforces:** INV-10 (steps logged per-step in taskCardSteps)

```typescript
// convex/mutations/workOrders/addTaskCard.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Input shape for a single step within a task card
const stepInput = v.object({
  stepNumber: v.number(),
  description: v.string(),
  requiresSpecialTool: v.boolean(),
  specialToolReference: v.optional(v.string()),
  signOffRequired: v.boolean(),
  signOffRequiresIa: v.boolean(),
});

export const addTaskCard = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    // Task card metadata
    taskCardNumber: v.string(),
    title: v.string(),
    taskType: v.union(
      v.literal("inspection"),
      v.literal("repair"),
      v.literal("replacement"),
      v.literal("ad_compliance"),
      v.literal("functional_check"),
      v.literal("rigging"),
      v.literal("return_to_service"),
      v.literal("overhaul"),
      v.literal("modification")
    ),
    // Required per 14 CFR 43.9(a)(1) — must be non-empty
    approvedDataSource: v.string(),
    approvedDataRevision: v.optional(v.string()),
    assignedToTechnicianId: v.optional(v.id("technicians")),
    notes: v.optional(v.string()),

    // Steps — at least one required
    // Devraj note: Steps are created atomically with the task card in a single
    // mutation transaction. This is intentional — a task card without steps is
    // an incomplete regulatory record. Convex mutations are atomic.
    steps: v.array(stepInput),

    callerUserId: v.string(),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<Id<"taskCards">> => {
    const now = Date.now();

    // ── Validate work order ───────────────────────────────────────────
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error(`Work order ${args.workOrderId} not found.`);
    if (wo.organizationId !== args.organizationId) {
      throw new Error(`Work order does not belong to organization ${args.organizationId}.`);
    }
    if (wo.status !== "open" && wo.status !== "in_progress") {
      throw new Error(
        `addTaskCard requires work order status "open" or "in_progress". ` +
        `Current status: "${wo.status}".`
      );
    }

    // ── Validate approved data source ─────────────────────────────────
    // Per 14 CFR 43.9(a)(1) — approved data reference is required, not optional
    if (!args.approvedDataSource.trim()) {
      throw new Error(
        `approvedDataSource must be a non-empty string. ` +
        `Per 14 CFR 43.9(a)(1), every maintenance action must reference approved data.`
      );
    }

    // ── Validate steps ────────────────────────────────────────────────
    if (args.steps.length === 0) {
      throw new Error(`A task card must have at least one step.`);
    }
    // Validate step numbers are sequential starting at 1
    const stepNumbers = args.steps.map((s) => s.stepNumber).sort((a, b) => a - b);
    for (let i = 0; i < stepNumbers.length; i++) {
      if (stepNumbers[i] !== i + 1) {
        throw new Error(
          `Step numbers must be sequential starting at 1. ` +
          `Got: ${stepNumbers.join(", ")}.`
        );
      }
    }

    // ── Validate assigned technician (if provided) ────────────────────
    if (args.assignedToTechnicianId) {
      const tech = await ctx.db.get(args.assignedToTechnicianId);
      if (!tech || tech.status !== "active" || tech.organizationId !== args.organizationId) {
        throw new Error(
          `Assigned technician ${args.assignedToTechnicianId} is not an active member ` +
          `of organization ${args.organizationId}.`
        );
      }
    }

    // ── Create task card ──────────────────────────────────────────────
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

    // ── Create step documents ─────────────────────────────────────────
    // INV-10: Each step is a first-class document in taskCardSteps.
    // Devraj note: These are created in the same mutation transaction as the
    // task card. Convex's atomicity guarantee means either all steps are created
    // or none are. No partial task card state is possible.
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

    // ── Transition WO to in_progress if it was open ───────────────────
    if (wo.status === "open") {
      await ctx.db.patch(args.workOrderId, {
        status: "in_progress",
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.workOrderId, { updatedAt: now });
    }

    // ── Audit log ─────────────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "taskCards",
      recordId: taskCardId,
      userId: args.callerUserId,
      ipAddress: args.callerIpAddress,
      notes:
        `Task card ${args.taskCardNumber} added to work order. ` +
        `${args.steps.length} steps created. ` +
        `Approved data: ${args.approvedDataSource}.`,
      timestamp: now,
    });

    return taskCardId;
  },
});
```

> **Marcus — FAA Compliance Note (addTaskCard):**
> The `approvedDataSource` enforcement here is one of the most important validations in the entire system. Under 14 CFR 43.9(a)(1), a maintenance record must reference the approved data used to perform the work. A task card without an approved data reference is not a compliant maintenance record. Making this field required at the task card level — not just at the final maintenance record level — means we catch the omission before work begins, not after it's been signed.
>
> **What could go wrong:** Technicians will attempt to enter placeholder text ("TBD", "AMM") in `approvedDataSource` and intend to update it later. The schema does not prevent this — we can only validate non-empty. The QA test matrix should include a case for placeholder detection, and the UI should validate AMM chapter/section format on the client side to nudge toward correct entries.

---

### 2.4 `completeTaskCard`

**Purpose:** Mark all steps of a task card as complete or N/A, record step-level signatures, create `signatureAuthEvent`-linked sign-offs, and transition the task card status to `complete` or `incomplete_na_steps`.

**Enforces:** INV-02 (ratingsExercised at signing), INV-05 (signatureAuthEvent single-consumption), INV-09 (taskCard status enum), INV-10 (per-step sign-off in taskCardSteps)

```typescript
// convex/mutations/workOrders/completeTaskCard.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const completeTaskCard = mutation({
  args: {
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    // Per-step completion data
    stepCompletions: v.array(v.object({
      stepId: v.id("taskCardSteps"),
      action: v.union(v.literal("complete"), v.literal("mark_na")),

      // Required when action == "complete"
      signatureAuthEventId: v.optional(v.id("signatureAuthEvents")),
      ratingsExercised: v.optional(v.array(v.union(
        v.literal("airframe"),
        v.literal("powerplant"),
        v.literal("ia"),
        v.literal("none")
      ))),

      // Required when action == "mark_na"
      naReason: v.optional(v.string()),
      naAuthorizedById: v.optional(v.id("technicians")),

      discrepancyIds: v.optional(v.array(v.id("discrepancies"))),
      notes: v.optional(v.string()),
    })),

    callerUserId: v.string(),
    callerTechnicianId: v.id("technicians"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();

    // ── Fetch and validate task card ──────────────────────────────────
    const taskCard = await ctx.db.get(args.taskCardId);
    if (!taskCard) throw new Error(`Task card ${args.taskCardId} not found.`);
    if (taskCard.workOrderId !== args.workOrderId) {
      throw new Error(`Task card does not belong to work order ${args.workOrderId}.`);
    }
    if (taskCard.status === "complete" || taskCard.status === "voided") {
      throw new Error(
        `Task card is already in terminal status "${taskCard.status}". ` +
        `No further step completions are permitted.`
      );
    }

    // ── Validate calling technician ───────────────────────────────────
    const callerTech = await ctx.db.get(args.callerTechnicianId);
    if (!callerTech || callerTech.status !== "active") {
      throw new Error(`Calling technician ${args.callerTechnicianId} not found or inactive.`);
    }
    // INV per schema: technician must have a userId to sign
    if (!callerTech.userId) {
      throw new Error(
        `Technician ${args.callerTechnicianId} has no system account (userId is null) ` +
        `and cannot perform signing actions. A technician must have an active Clerk account ` +
        `to sign off maintenance records.`
      );
    }

    // ── Process each step completion ──────────────────────────────────
    let completedCount = 0;
    let naCount = 0;
    let pendingCount = 0;
    let hasNARequiringIAReview = false;

    for (const completion of args.stepCompletions) {
      const step = await ctx.db.get(completion.stepId);
      if (!step) throw new Error(`Step ${completion.stepId} not found.`);
      if (step.taskCardId !== args.taskCardId) {
        throw new Error(`Step ${completion.stepId} does not belong to task card ${args.taskCardId}.`);
      }
      if (step.status !== "pending") {
        // Idempotency: skip already-processed steps, do not re-throw
        if (step.status === "completed") completedCount++;
        if (step.status === "na") naCount++;
        continue;
      }

      if (completion.action === "complete") {
        // INV-05: signatureAuthEvent must be provided, unconsumed, and not expired
        if (!completion.signatureAuthEventId) {
          throw new Error(
            `INV-05: Step ${step.stepNumber} requires a signatureAuthEventId to complete. ` +
            `Pre-signing re-authentication is mandatory for all step sign-offs.`
          );
        }
        const authEvent = await ctx.db.get(completion.signatureAuthEventId);
        if (!authEvent) {
          throw new Error(`signatureAuthEvent ${completion.signatureAuthEventId} not found.`);
        }
        if (authEvent.consumed) {
          throw new Error(
            `INV-05: signatureAuthEvent ${completion.signatureAuthEventId} has already been consumed. ` +
            `Each auth event may only be used for a single sign-off.`
          );
        }
        if (authEvent.expiresAt < now) {
          throw new Error(
            `INV-05: signatureAuthEvent ${completion.signatureAuthEventId} has expired ` +
            `(expired at ${new Date(authEvent.expiresAt).toISOString()}). ` +
            `Request a new re-authentication event and retry.`
          );
        }
        if (authEvent.technicianId !== args.callerTechnicianId) {
          throw new Error(
            `INV-05: signatureAuthEvent was issued to technician ${authEvent.technicianId} ` +
            `but the caller is technician ${args.callerTechnicianId}. ` +
            `Auth events are non-transferable.`
          );
        }

        // INV-02: ratingsExercised must be populated at signing
        if (!completion.ratingsExercised || completion.ratingsExercised.length === 0) {
          throw new Error(
            `INV-02: ratingsExercised must be populated when signing step ${step.stepNumber}. ` +
            `Per 14 CFR 65.85/65.87, the A&P rating exercised for this work must be recorded.`
          );
        }

        // If step requires IA sign-off: verify technician has current IA
        let signedHasIaOnDate: boolean | undefined;
        if (step.signOffRequiresIa) {
          const certs = await ctx.db
            .query("certificates")
            .withIndex("by_type", (q) =>
              q.eq("technicianId", args.callerTechnicianId).eq("certificateType", "IA")
            )
            .filter((q) => q.eq(q.field("active"), true))
            .first();

          if (!certs || !certs.hasIaAuthorization || !certs.iaExpiryDate || certs.iaExpiryDate < now) {
            throw new Error(
              `Step ${step.stepNumber} requires an IA sign-off, but technician ` +
              `${args.callerTechnicianId} does not hold a current Inspection Authorization. ` +
              `IA may be expired or not on file.`
            );
          }
          signedHasIaOnDate = true;
        }

        // Retrieve certificate number for snapshot
        const cert = await ctx.db
          .query("certificates")
          .withIndex("by_technician", (q) => q.eq("technicianId", args.callerTechnicianId))
          .filter((q) => q.eq(q.field("active"), true))
          .first();
        if (!cert) {
          throw new Error(`No active certificate found for technician ${args.callerTechnicianId}.`);
        }

        // Mark signatureAuthEvent as consumed (INV-05)
        await ctx.db.patch(completion.signatureAuthEventId, {
          consumed: true,
          consumedAt: now,
          consumedByTable: "taskCardSteps",
          consumedByRecordId: completion.stepId,
        });

        // Update step to completed
        await ctx.db.patch(completion.stepId, {
          status: "completed",
          signedByTechnicianId: args.callerTechnicianId,
          signedAt: now,
          signedCertificateNumber: cert.certificateNumber,
          signedHasIaOnDate,
          signatureAuthEventId: completion.signatureAuthEventId,
          discrepancyIds: completion.discrepancyIds ?? [],
          notes: completion.notes,
          updatedAt: now,
        });

        // Create signatureAuthEvent audit log entry
        await ctx.db.insert("auditLog", {
          organizationId: taskCard.organizationId,
          eventType: "technician_signed",
          tableName: "taskCardSteps",
          recordId: completion.stepId,
          userId: args.callerUserId,
          technicianId: args.callerTechnicianId,
          ipAddress: args.callerIpAddress,
          notes: `Step ${step.stepNumber} signed off. Cert: ${cert.certificateNumber}. Ratings: ${completion.ratingsExercised?.join(", ")}.`,
          timestamp: now,
        });

        completedCount++;

      } else if (completion.action === "mark_na") {
        // N/A requires a reason and an authorizing technician
        if (!completion.naReason?.trim()) {
          throw new Error(`Step ${step.stepNumber}: naReason is required when marking a step N/A.`);
        }
        if (!completion.naAuthorizedById) {
          throw new Error(`Step ${step.stepNumber}: naAuthorizedById is required when marking a step N/A.`);
        }

        await ctx.db.patch(completion.stepId, {
          status: "na",
          naReason: completion.naReason.trim(),
          naAuthorizedById: completion.naAuthorizedById,
          naAuthorizedAt: now,
          notes: completion.notes,
          updatedAt: now,
        });

        // If this step required sign-off and was marked N/A, IA review is required
        if (step.signOffRequiresIa) {
          hasNARequiringIAReview = true;
        }
        naCount++;
      }
    }

    // ── Recount all steps for task card update ────────────────────────
    const allSteps = await ctx.db
      .query("taskCardSteps")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .collect();

    let totalCompleted = 0, totalNA = 0, totalPending = 0;
    for (const s of allSteps) {
      if (s.status === "completed") totalCompleted++;
      else if (s.status === "na") totalNA++;
      else totalPending++;
    }

    // Determine new task card status (INV-09)
    let newStatus: "in_progress" | "complete" | "incomplete_na_steps" = "in_progress";
    if (totalPending === 0) {
      newStatus = hasNARequiringIAReview || totalNA > 0 ? "incomplete_na_steps" : "complete";
    }

    await ctx.db.patch(args.taskCardId, {
      status: newStatus,
      completedStepCount: totalCompleted,
      naStepCount: totalNA,
      startedAt: taskCard.startedAt ?? now,
      completedAt: newStatus === "complete" ? now : undefined,
      updatedAt: now,
    });
  },
});
```

> **Marcus — FAA Compliance Note (completeTaskCard):**
> This mutation is where the regulatory rubber meets the road. The `signatureAuthEvent` consumption pattern (INV-05) is the core of our AC 43-9C defensibility claim. Each step sign-off is linked to an independently verifiable authentication event. The technician's legal name, certificate number, and the specific rating exercised are all captured at signing time — not looked up later. This is the snapshot principle that protects the record's integrity even if the technician's certificate changes after signing.
>
> The IA currency check is particularly important. An annual inspection step signed by a technician whose IA expired on March 31 — even by one day — is a regulatory violation. The check is strict: if `iaExpiryDate < now`, it throws. There is no grace period in the regulations.
>
> **What could go wrong:** A step requiring IA sign-off is first signed by an A&P (the mutation should have caught this) and the IA counter-signs later. This double-signing scenario is legitimate in a shop environment. Phase 2 should support "counter-sign" as a separate action on a completed step, not attempt to model it through this mutation. Flag for Phase 3 backlog.

---

### 2.5 `closeWorkOrder`

**Purpose:** Formally close a work order. This is the most heavily guarded mutation in the system — it is the regulatory point of return-to-service authorization. Six conditions must all be satisfied before closure.

**Enforces:** INV-06 (aircraftTotalTimeAtClose required and ≥ atOpen), INV-18 (monotonic TT), INV-19 (closedAt/closedByUserId/closedByTechnicianId required), INV-20 (returnToServiceStatement required)

```typescript
// convex/mutations/workOrders/closeWorkOrder.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const closeWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),

    // INV-06: required at close
    aircraftTotalTimeAtClose: v.number(),

    // INV-19: the certificated individual performing RTS authorization
    closingTechnicianId: v.id("technicians"),

    // DOM authorization (for Part 145 organizations)
    domAuthorizationId: v.optional(v.id("technicians")),

    // Return to service statement (INV-20)
    returnToServiceStatement: v.string(),

    // signatureAuthEvent for the RTS signing
    signatureAuthEventId: v.id("signatureAuthEvents"),

    callerUserId: v.string(),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();

    // ── Fetch and validate work order ─────────────────────────────────
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error(`Work order ${args.workOrderId} not found.`);
    if (wo.organizationId !== args.organizationId) {
      throw new Error(`Work order does not belong to organization ${args.organizationId}.`);
    }
    if (wo.status !== "pending_signoff") {
      throw new Error(
        `closeWorkOrder requires status "pending_signoff". Current: "${wo.status}". ` +
        `Ensure all task cards are complete and all discrepancies are dispositioned.`
      );
    }

    // ── Condition 1: aircraftTotalTimeAtClose ─────────────────────────
    // INV-06: Must be set and ≥ aircraftTotalTimeAtOpen
    if (args.aircraftTotalTimeAtClose < wo.aircraftTotalTimeAtOpen) {
      throw new Error(
        `INV-06/INV-18: aircraftTotalTimeAtClose (${args.aircraftTotalTimeAtClose}h) is less than ` +
        `aircraftTotalTimeAtOpen (${wo.aircraftTotalTimeAtOpen}h). ` +
        `Aircraft total time is monotonically increasing. This is a falsification flag. ` +
        `Do not proceed. Contact your DOM.`
      );
    }

    // ── Condition 2: All discrepancies must be dispositioned ──────────
    const openDiscrepancies = await ctx.db
      .query("discrepancies")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "open"),
          q.eq(q.field("status"), "under_evaluation")
        )
      )
      .collect();

    if (openDiscrepancies.length > 0) {
      throw new Error(
        `INV per schema: ${openDiscrepancies.length} discrepancy(ies) are still open or under evaluation. ` +
        `All discrepancies must be dispositioned before a work order can be closed. ` +
        `Discrepancy IDs: ${openDiscrepancies.map((d) => d._id).join(", ")}.`
      );
    }

    // ── Condition 3: returnToService record must exist ─────────────────
    const rts = await ctx.db
      .query("returnToService")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();

    if (!rts) {
      throw new Error(
        `INV per schema: No returnToService record exists for work order ${args.workOrderId}. ` +
        `A return-to-service record signed by a certificated IA must be created before ` +
        `the work order can be closed. Create the RTS record first, then close.`
      );
    }

    // ── Condition 4: Validate closing technician ──────────────────────
    // INV-19: closedByTechnicianId must be set and reference an active certificated person
    const closingTech = await ctx.db.get(args.closingTechnicianId);
    if (!closingTech || closingTech.status !== "active") {
      throw new Error(
        `INV-19: Closing technician ${args.closingTechnicianId} not found or inactive.`
      );
    }

    // ── Condition 5: returnToServiceStatement must be non-empty ───────
    // INV-20
    if (!args.returnToServiceStatement.trim()) {
      throw new Error(
        `INV-20: returnToServiceStatement must be a non-empty string. ` +
        `Per 14 CFR 43.9, a return-to-service statement is required in every maintenance record.`
      );
    }

    // ── Condition 6: signatureAuthEvent validation (INV-05) ───────────
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) throw new Error(`signatureAuthEvent ${args.signatureAuthEventId} not found.`);
    if (authEvent.consumed) {
      throw new Error(`INV-05: signatureAuthEvent ${args.signatureAuthEventId} already consumed.`);
    }
    if (authEvent.expiresAt < now) {
      throw new Error(`INV-05: signatureAuthEvent ${args.signatureAuthEventId} has expired.`);
    }
    if (authEvent.technicianId !== args.closingTechnicianId) {
      throw new Error(
        `INV-05: signatureAuthEvent issued to technician ${authEvent.technicianId} ` +
        `but closing technician is ${args.closingTechnicianId}.`
      );
    }

    // ── Consume signatureAuthEvent ────────────────────────────────────
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: now,
      consumedByTable: "workOrders",
      consumedByRecordId: args.workOrderId,
    });

    // ── Close the work order ──────────────────────────────────────────
    // INV-19: closedAt, closedByUserId, closedByTechnicianId all set
    await ctx.db.patch(args.workOrderId, {
      status: "closed",
      closedAt: now,
      closedByUserId: args.callerUserId,
      closedByTechnicianId: args.closingTechnicianId,
      aircraftTotalTimeAtClose: args.aircraftTotalTimeAtClose,
      returnedToService: true,
      updatedAt: now,
    });

    // ── Update aircraft total time ────────────────────────────────────
    // INV-18: Aircraft total time is updated to reflect the close reading.
    // The aircraft.totalTimeAirframeHours is the system's last-known TT snapshot.
    const aircraft = await ctx.db.get(wo.aircraftId);
    if (aircraft && args.aircraftTotalTimeAtClose > aircraft.totalTimeAirframeHours) {
      await ctx.db.patch(wo.aircraftId, {
        totalTimeAirframeHours: args.aircraftTotalTimeAtClose,
        totalTimeAirframeAsOfDate: now,
        updatedAt: now,
      });
    }

    // ── Audit log ─────────────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "status_changed",
      tableName: "workOrders",
      recordId: args.workOrderId,
      userId: args.callerUserId,
      technicianId: args.closingTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "status",
      oldValue: JSON.stringify("pending_signoff"),
      newValue: JSON.stringify("closed"),
      notes:
        `Work order closed. Aircraft TT at close: ${args.aircraftTotalTimeAtClose}h. ` +
        `Closing technician: ${args.closingTechnicianId}. ` +
        `RTS statement: ${args.returnToServiceStatement.substring(0, 80)}...`,
      timestamp: now,
    });
  },
});
```

> **Marcus — FAA Compliance Note (closeWorkOrder):**
> This mutation is the most important in the system. Every guard condition corresponds to a specific regulatory requirement. I want to annotate them individually:
>
> - **All discrepancies dispositioned:** 14 CFR 43.11(a)(6) — airworthiness determination requires all findings to be addressed. An open discrepancy on a closed work order means an aircraft returned to service with an unresolved finding.
> - **returnToService record exists:** This is the 43.11 inspection record. You cannot close without it.
> - **aircraftTotalTimeAtClose ≥ atOpen (INV-06/INV-18):** A time-at-close less than time-at-open is the single most reliable indicator of falsified logbooks in FAA enforcement actions. This check is not a formality.
> - **closedByTechnicianId (INV-19):** Distinguishes the regulatory act of return-to-service authorization from the administrative act of clicking "close." Different people may do these; both must be on record.
>
> **What could go wrong:** The RTS record may have been created for a different work order by mistake. The condition only checks that *a* RTS record links to this work order — it does not validate that the RTS record's aircraftHoursAtRts matches aircraftTotalTimeAtClose. Devraj, add that cross-check. It corresponds to INV per schema on returnToService: "aircraftHoursAtRts must equal the work order's aircraftTotalTimeAtClose."

---

### 2.6 `voidWorkOrder`

**Purpose:** Administratively void a work order that was created in error or became inapplicable. Voiding is distinct from cancellation: voided = administrative error; cancelled = customer decision. A voided work order is a permanent audit record.

**Enforces:** INV per schema (voidedByUserId, voidedAt, voidedReason all required on void)

```typescript
// convex/mutations/workOrders/voidWorkOrder.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const voidWorkOrder = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    voidedReason: v.string(),

    callerUserId: v.string(),
    callerTechnicianId: v.id("technicians"),
    callerIpAddress: v.optional(v.string()),
  },

  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();

    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error(`Work order ${args.workOrderId} not found.`);
    if (wo.organizationId !== args.organizationId) {
      throw new Error(`Work order does not belong to organization ${args.organizationId}.`);
    }

    // ── Status guard: only draft, open, on_hold may be voided ─────────
    const voidableStatuses: WorkOrderStatus[] = ["draft", "open", "on_hold"];
    if (!voidableStatuses.includes(wo.status as WorkOrderStatus)) {
      throw new Error(
        `voidWorkOrder: Work order status "${wo.status}" is not voidable. ` +
        `Only draft, open, and on_hold work orders may be voided. ` +
        `Work orders in progress, pending inspection, or closed cannot be voided. ` +
        `If work has already begun, contact your DOM — this requires a formal discrepancy entry.`
      );
    }

    // ── Guard: No signed maintenance records linked to this WO ────────
    // A work order with signed maintenance records cannot be voided — the records
    // are immutable legal documents. The work order must remain to anchor them.
    const signedRecords = await ctx.db
      .query("maintenanceRecords")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();

    if (signedRecords !== null) {
      throw new Error(
        `voidWorkOrder: Work order ${args.workOrderId} has at least one signed maintenance record ` +
        `(record ID: ${signedRecords._id}). Work orders with signed records cannot be voided — ` +
        `maintenance records are immutable legal documents. ` +
        `Contact your DOM for guidance on correcting the work order chain of custody.`
      );
    }

    // ── voidedReason must be non-empty ────────────────────────────────
    if (!args.voidedReason.trim()) {
      throw new Error(
        `voidedReason must be a non-empty string. ` +
        `The reason for voiding a work order is a required audit record.`
      );
    }

    // ── Void the work order ───────────────────────────────────────────
    await ctx.db.patch(args.workOrderId, {
      status: "voided",
      voidedByUserId: args.callerUserId,
      voidedAt: now,
      voidedReason: args.voidedReason.trim(),
      updatedAt: now,
    });

    // ── Audit log ─────────────────────────────────────────────────────
    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "status_changed",
      tableName: "workOrders",
      recordId: args.workOrderId,
      userId: args.callerUserId,
      technicianId: args.callerTechnicianId,
      ipAddress: args.callerIpAddress,
      fieldName: "status",
      oldValue: JSON.stringify(wo.status),
      newValue: JSON.stringify("voided"),
      notes: `Work order voided. Reason: ${args.voidedReason.trim()}`,
      timestamp: now,
    });
  },
});
```

> **Marcus — FAA Compliance Note (voidWorkOrder):**
> The prohibition on voiding a work order with signed records is absolute. A signed maintenance record is a permanent entry in an aircraft's permanent maintenance history. The work order number on that record is its chain-of-custody anchor. If the work order is voided, any future inquiry about that maintenance record encounters a broken chain. The check for signed records is therefore not a business rule — it is a regulatory records integrity requirement.
>
> Note that voiding a work order in `draft` or `open` status (before any work has been signed) is an administrative action, not a regulatory one. The audit log entry is the sufficient record. A voided draft WO does not need DOM authorization. A voided open WO (where technicians were assigned but no work performed) should be reviewed by the DOM before voiding — but this is a shop policy matter, not a regulatory enforcement point.
>
> **What could go wrong:** Org-level permissions on `voidWorkOrder` must restrict this to shop managers or DOM — not line technicians. The mutation itself enforces the data integrity rules; RBAC in the Convex auth layer enforces who can call it.

---

## 3. Query Specifications

These are the Convex queries required to support the work order module in Phase 2. Each includes the index used, filter logic, and return shape.

```typescript
// convex/queries/workOrders/index.ts — Query Catalogue

// ─── Q-WO-01: Get work orders by organization + status ─────────────────────
// Use: Work order list screen, org-level dashboard
// Index: workOrders.by_status ["organizationId", "status"]
// Devraj note: status is optional here — if null, all statuses are returned.
// Use a compound query when filtering by multiple statuses (e.g., "active" = open + in_progress).
export const getWorkOrdersByOrg = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(workOrderStatus),
    limit: v.optional(v.number()),
  },
  returns: /* workOrders[] with aircraft.make/model denormalized */,
  // Index: by_status
});

// ─── Q-WO-02: Get active work orders for an aircraft ───────────────────────
// Use: Aircraft detail screen, concurrent WO detection
// Index: workOrders.by_aircraft_status ["aircraftId", "status"]
export const getActiveWorkOrdersForAircraft = query({
  args: { aircraftId: v.id("aircraft") },
  returns: /* workOrders[] where status not in [closed, voided, cancelled] */,
  // Index: by_aircraft_status
});

// ─── Q-WO-03: Get work order detail (with task cards and steps) ─────────────
// Use: Work order detail screen; task card list; progress tracking
// Index: taskCards.by_work_order, taskCardSteps.by_work_order
export const getWorkOrderDetail = query({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
  },
  returns: /* {
    workOrder: WorkOrder,
    aircraft: Aircraft,
    taskCards: Array<TaskCard & { steps: TaskCardStep[] }>,
    discrepancies: Discrepancy[],
    returnToService: ReturnToService | null,
  } */,
});

// ─── Q-WO-04: Get work orders by priority ──────────────────────────────────
// Use: AOG queue, urgent work prioritization
// Index: workOrders.by_priority ["organizationId", "priority", "status"]
export const getWorkOrdersByPriority = query({
  args: {
    organizationId: v.id("organizations"),
    priority: v.union(v.literal("aog"), v.literal("urgent"), v.literal("routine")),
  },
  returns: /* workOrders[] excluding closed/voided/cancelled */,
});

// ─── Q-WO-05: Get task cards for a technician ──────────────────────────────
// Use: Technician worklist screen; mobile task card view
// Index: taskCards.by_assigned ["assignedToTechnicianId", "status"]
export const getTaskCardsForTechnician = query({
  args: {
    technicianId: v.id("technicians"),
    organizationId: v.id("organizations"),
    status: v.optional(v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("incomplete_na_steps")
    )),
  },
  returns: /* taskCards[] with work order number and aircraft reg denormalized */,
});

// ─── Q-WO-06: Get steps for a task card ────────────────────────────────────
// Use: Task card detail screen; step-by-step sign-off flow
// Index: taskCardSteps.by_task_card_step ["taskCardId", "stepNumber"]
export const getStepsForTaskCard = query({
  args: { taskCardId: v.id("taskCards") },
  returns: /* taskCardSteps[] ordered by stepNumber */,
  // Devraj note: use by_task_card_step index, not by_task_card, to get ordered results.
});

// ─── Q-WO-07: Get discrepancies for a work order ───────────────────────────
// Use: Discrepancy management screen; close-WO precondition check
// Index: discrepancies.by_work_order ["workOrderId"]
export const getDiscrepanciesForWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  returns: /* discrepancies[] with disposition status */,
});

// ─── Q-WO-08: Get audit trail for a work order ─────────────────────────────
// Use: Audit/compliance screen; FAA inspection support
// Index: auditLog.by_record ["tableName", "recordId"]
export const getAuditTrailForWorkOrder = query({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
  },
  returns: /* auditLog[] ordered by timestamp desc, filtered to this WO and its task cards */,
});

// ─── Q-WO-09: Validate closeWorkOrder preconditions (pre-flight check) ──────
// Use: UI — "Ready to close?" check before presenting close modal
// Composite: queries discrepancies, returnToService, task cards
// Returns a structured readiness report, not a boolean.
// Devraj note: This query should be called client-side before closeWorkOrder
// to give the user a friendly pre-flight check. The mutation enforces the same
// rules — but showing them before the user clicks "close" reduces failed mutations.
export const getCloseReadiness = query({
  args: { workOrderId: v.id("workOrders") },
  returns: /* {
    canClose: boolean,
    openDiscrepancyCount: number,
    incompleteTaskCardCount: number,
    hasRtsRecord: boolean,
    aircraftTotalTimeAtOpenRecorded: boolean,
    blockers: string[],
  } */,
});
```

> **Devraj — Query Index Coverage Note:**
> Every query above uses an existing v2 index. No new indexes are required for Phase 2 work order module queries. The `by_task_card_step` index is specifically required for Q-WO-06 to return steps in stepNumber order without a client-side sort — Convex queries return documents in index order.

---

## 4. Invariant-to-Test-Case Table

*Per Cilla Oduya's Phase 1 sign-off requirement: every invariant enforced in these mutations must have a named test case.*

| Invariant | Mutation | Test Case ID | Test Description |
|---|---|---|---|
| INV-01 | `createCorrectionRecord` | TC-INV-01 | Correction record with null `corrects` → assert throws |
| INV-02 | `completeTaskCard` | TC-INV-02 | Step sign-off with empty `ratingsExercised` → assert throws |
| INV-03 | `createAdCompliance` | TC-INV-03 | adCompliance with all three IDs null → assert throws |
| INV-04 | `setOrganizationLeadership` | TC-INV-04 | Assign expired IA as DOM → assert throws |
| INV-05 | `completeTaskCard`, `closeWorkOrder` | TC-INV-05a/b | (a) Reuse consumed auth event → assert throws; (b) Expired event → assert throws |
| INV-06 | `closeWorkOrder` | TC-INV-06 | Close WO with TT-at-close < TT-at-open → assert throws |
| INV-07 | `installPart` | TC-INV-07 | Install OSP with null `eightOneThirtyId` → assert throws |
| INV-08 | `closeInspection` | TC-INV-08 | `adComplianceReviewed=true`, empty refs, no notes → assert throws |
| INV-09 | `completeTaskCard` | TC-INV-09 | All steps complete, no N/A → assert card status == "complete" |
| INV-10 | `completeTaskCard` | TC-INV-10 | Sign step → assert `taskCardSteps` doc updated, auditLog entry created |
| INV-11 | `createPart` | TC-INV-11 | `isLifeLimited=true`, both limit fields null → assert throws |
| INV-12 | `createPart` | TC-INV-12 | `hasShelfLifeLimit=true`, `shelfLifeLimitDate` null → assert throws |
| INV-13 | `createCertificate` | TC-INV-13 | `hasIaAuthorization=true`, `iaExpiryDate` null → assert throws |
| INV-14 | `createWorkOrder` | TC-INV-14 | Duplicate WO number in same org → assert throws |
| INV-15 | `associateAircraftCustomer` | TC-INV-15 | Aircraft linked to customer → query `aircraft.by_customer` → assert returns aircraft |
| INV-16 | `dispositionDiscrepancy` | TC-INV-16 | `disposition=corrected`, no `correctiveMaintenanceRecordId` → assert throws |
| INV-17 | `dispositionDiscrepancy` | TC-INV-17 | `disposition=deferred_mel`, no `melDeferralDate` → assert throws |
| INV-18 | `closeWorkOrder` | TC-INV-18 | TT-at-close (lower value) → assert throws |
| INV-19 | `closeWorkOrder` | TC-INV-19 | Close without `closedByTechnicianId` → assert throws |
| INV-20 | `createMaintenanceRecord` | TC-INV-20 | `returnedToService=true`, empty statement → assert throws |

---

## 5. Integration Points

### 5.1 Work Orders ↔ AD Compliance

When a work order of type `ad_compliance` is created, the following integration is required:

- At `addTaskCard`: If `taskType == "ad_compliance"`, the task card should link to an `adCompliance` record via a reference field (Phase 2 backlog: add `adComplianceId` to `taskCards`).
- At `closeWorkOrder`: If the work order is `annual_inspection` or `100hr_inspection`, the close mutation should verify that all overdue AD compliance records for the aircraft have either been addressed or have an explicit N/A determination on file. This check uses `adCompliance.by_org_next_due_date` and `adCompliance.by_aircraft`.
- When a task card of type `ad_compliance` reaches status `complete`, the corresponding `adCompliance` record should be updated with a new `complianceHistory` entry. This update must preserve the append-only invariant on `complianceHistory` (no backdating).

### 5.2 Work Orders ↔ Parts

- Parts are linked to work orders via `parts.installedByWorkOrderId` and `parts.removedByWorkOrderId`.
- The `installPart` mutation (Phase 2) must be called with a work order ID in `open` or `in_progress` status. Parts cannot be installed against a closed or voided work order.
- At `closeWorkOrder`, all parts installed against this work order that have `isLifeLimited=true` must have their remaining life recomputed. This is a background job trigger, not a synchronous check — the close mutation should emit an event that triggers the life-remaining recomputation.
- The `partInstallationHistory` table records the full install/remove cycle. Every install creates a `partInstallationHistory` record with `installedByWorkOrderId`.

### 5.3 Work Orders ↔ Task Cards

This is the primary relationship in Phase 2. Key integration points:

- A work order cannot transition to `pending_signoff` until all task cards are in status `complete`, `voided`, or `incomplete_na_steps` (with all N/A steps IA-reviewed).
- Task card `approvedDataSource` feeds directly into the `maintenanceRecords.approvedDataReference` field when the maintenance record is created at work order close. The maintenance record signing mutation must source the approved data reference from the task card, not from independent user input.
- The `stepCount`, `completedStepCount`, and `naStepCount` on `taskCards` are denormalized counters maintained by `completeTaskCard`. They must stay synchronized. If they drift, `getCloseReadiness` (Q-WO-09) will surface the discrepancy.

### 5.4 Work Orders ↔ Discrepancies

- Discrepancies link to work orders via `discrepancyId.workOrderId`. One work order may have many discrepancies.
- The `openDiscrepancies` status on the work order is set when any discrepancy transitions to `open` that is linked to the work order. This is a reactive update — when a discrepancy is found during a task card step, the step's `discrepancyIds` array is updated, and the work order status should reflect it.
- The `closeWorkOrder` mutation's discrepancy check is the hard gate. All discrepancies must be in `dispositioned` status before close.

### 5.5 Work Orders ↔ maintenanceRecords / inspectionRecords

- Both `maintenanceRecords` and `inspectionRecords` are created *after* `closeWorkOrder` is called, as part of the signing flow.
- The `maintenanceRecords.aircraftTotalTimeHours` field must be sourced from `workOrders.aircraftTotalTimeAtClose` — not from independent user input. The signing mutation enforces this.
- `inspectionRecords.totalTimeAirframeHours` has the same constraint.
- Both record types are immutable after creation. The work order must be closed before they can be created.

---

## 6. Open Items for Phase 2 Backlog

The following items were identified during this spec pass and are formally deferred to the Phase 2 backlog. None are blockers for the six mutations above.

| Item | Description | Priority |
|---|---|---|
| BACK-P2-01 | `adComplianceId` field on `taskCards` for AD compliance task tracking | High |
| BACK-P2-02 | Counter-sign flow for IA review of A&P-signed steps | Medium |
| BACK-P2-03 | `placeWorkOrderOnHold` and `releaseWorkOrderHold` mutations | High |
| BACK-P2-04 | Life-remaining recomputation trigger at close | High |
| BACK-P2-05 | `submitForInspection` / `flagOpenDiscrepancies` transitions | High |
| BACK-P2-06 | Squawks-to-discrepancy traceability (NB-05 from gate review) | Medium |
| BACK-P2-07 | Verify `rts.aircraftHoursAtRts == wo.aircraftTotalTimeAtClose` in `closeWorkOrder` | **High — Marcus flagged** |

---

*Phase 2 Work Order Engine Specification — Rafael Mendoza, Devraj Anand*  
*Regulatory annotations: Marcus Webb*  
*Test case mapping: Cilla Oduya (in progress)*  
*Schema basis: convex-schema-v2.md (FROZEN, 2026-02-22)*  
*This document supersedes any prior informal design notes. All Phase 2 mutation work implements against this spec.*
