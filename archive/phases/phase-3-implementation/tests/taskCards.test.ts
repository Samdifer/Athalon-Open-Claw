/**
 * taskCards.test.ts
 * Integration tests — Task Card Execution Engine
 *
 * Author:  Cilla Oduya (QA Lead)
 * Date:    2026-02-22
 * Phase:   3 — Implementation
 * Basis:   phase-2-task-cards/task-card-execution.md
 *          phase-2-work-orders/work-order-engine.md (completeTaskCard spec)
 *          phase-2-signoff/signoff-rts-flow.md (IA sign-off requirements)
 *          convex-schema-v2.md (FROZEN)
 *
 * Invariant coverage:
 *   INV-02  ratingsExercised required at step sign-off
 *   INV-05  signatureAuthEvent single-consumption (TC-TC-01, TC-TC-02, TC-TC-03)
 *   INV-09  task card status derived from step state (TC-TC-05, TC-TC-06)
 *   INV-10  per-step audit trail in taskCardSteps (TC-TC-07)
 *   IA currency check  (TC-TC-08)
 *   Pending-steps guard on signTaskCard (TC-TC-15)
 *   Inspector-only steps cannot be signed by AMT  (new test below)
 */

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";

import { createWorkOrder } from "../../convex/mutations/workOrders/createWorkOrder";
import { openWorkOrder } from "../../convex/mutations/workOrders/openWorkOrder";
import { addTaskCard } from "../../convex/mutations/workOrders/addTaskCard";
import { completeStep } from "../../convex/mutations/taskCards/completeStep";
import { signTaskCard } from "../../convex/mutations/taskCards/signTaskCard";
import { createTaskCard } from "../../convex/mutations/taskCards/createTaskCard";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const NOW = Date.now();
const FIVE_MINUTES = 5 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function seedOrganization(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Apex Avionics MRO",
      part145Ratings: ["Class A Airframe", "Class A Powerplant"],
      address: "404 Taxiway Blvd",
      city: "Mesa",
      state: "AZ",
      zip: "85210",
      country: "US",
      subscriptionTier: "professional",
      active: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
  );
}

async function seedAircraft(t: ReturnType<typeof convexTest>, orgId: string) {
  return t.run(async (ctx) =>
    ctx.db.insert("aircraft", {
      make: "Piper",
      model: "PA-28",
      series: "Cherokee",
      serialNumber: "28-7654321",
      currentRegistration: "N98765",
      experimental: false,
      aircraftCategory: "normal",
      engineCount: 1,
      totalTimeAirframeHours: 2800.0,
      totalTimeAirframeAsOfDate: NOW,
      status: "in_maintenance" as any,
      operatingOrganizationId: orgId as any,
      createdByOrganizationId: orgId as any,
      createdAt: NOW,
      updatedAt: NOW,
    })
  );
}

/**
 * Seeds a technician.
 *   - withIa: true  → has current IA (expires next March 31)
 *   - withIa: false → A&P only, no IA
 */
async function seedTechnician(
  t: ReturnType<typeof convexTest>,
  orgId: string,
  opts: {
    withIa?: boolean;
    userId?: string;
    legalName?: string;
    certNumber?: string;
  } = {}
) {
  return t.run(async (ctx) => {
    const techId = await ctx.db.insert("technicians", {
      legalName: opts.legalName ?? "Alex Rivera",
      userId: opts.userId ?? "user_alex_rivera",
      employeeId: `EMP${Math.floor(Math.random() * 9000) + 1000}`,
      organizationId: orgId as any,
      status: "active",
      email: `${(opts.legalName ?? "alex").toLowerCase().replace(" ", ".")}@apex.com`,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await ctx.db.insert("certificates", {
      technicianId: techId,
      certificateType: "A&P",
      certificateNumber: opts.certNumber ?? "AP999001",
      issueDate: NOW - TWENTY_FOUR_HOURS * 365 * 5,
      ratings: ["airframe", "powerplant"],
      hasIaAuthorization: opts.withIa ?? false,
      iaExpiryDate: opts.withIa
        ? new Date(new Date().getFullYear() + 1, 2, 31, 23, 59, 59).getTime()
        : undefined,
      iaRenewalActivities: [],
      repairStationAuthorizations: [],
      active: true,
      createdAt: NOW,
      updatedAt: NOW,
    });

    return techId;
  });
}

/** Seeds a valid unconsumed auth event (4 min TTL remaining by default). */
async function seedAuthEvent(
  t: ReturnType<typeof convexTest>,
  techId: string,
  opts: {
    expired?: boolean;
    consumed?: boolean;
    wrongTechnicianId?: string;
  } = {}
) {
  return t.run(async (ctx) =>
    ctx.db.insert("signatureAuthEvents", {
      clerkEventId: `evt_${Math.random().toString(36).slice(2, 10)}`,
      clerkSessionId: `sess_${Math.random().toString(36).slice(2, 10)}`,
      userId: "user_alex_rivera",
      technicianId: (opts.wrongTechnicianId ?? techId) as any,
      authenticatedLegalName: "Alex Rivera",
      authenticatedCertNumber: "AP999001",
      authMethod: "pin",
      intendedTable: "taskCardSteps",
      authenticatedAt: NOW,
      expiresAt: opts.expired ? NOW - 1000 : NOW + FIVE_MINUTES - 60_000,
      consumed: opts.consumed ?? false,
      consumedAt: opts.consumed ? NOW - 5000 : undefined,
    })
  );
}

/**
 * Creates a WO in open status and returns { workOrderId, aircraftId, orgId }.
 * Convenience wrapper used by most tests.
 */
async function createOpenWorkOrder(
  t: ReturnType<typeof convexTest>,
  techId: string
) {
  const orgId = await seedOrganization(t);
  const aircraftId = await seedAircraft(t, orgId);

  const workOrderId = await t.mutation(createWorkOrder, {
    organizationId: orgId as any,
    aircraftId: aircraftId as any,
    workOrderNumber: `WO-TC-${Math.floor(Math.random() * 90000) + 10000}`,
    workOrderType: "100hr_inspection",
    description: "Task card test scaffold WO.",
    priority: "routine",
    callerUserId: "user_alex_rivera",
  });

  await t.mutation(openWorkOrder, {
    workOrderId: workOrderId as any,
    organizationId: orgId as any,
    aircraftTotalTimeAtOpen: 2800.0,
    assignedTechnicianIds: [techId as any],
    callerUserId: "user_alex_rivera",
  });

  return { workOrderId, aircraftId, orgId };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Step completion requires valid signatureAuthEvent (INV-05)
// ─────────────────────────────────────────────────────────────────────────────

describe("Task Cards — Step completion requires valid signatureAuthEvent", () => {
  it(
    "TC-TC-STEP-01: completeStep throws when signatureAuthEventId is not provided",
    async () => {
      /**
       * Failure mode guarded:
       *   A step can be signed without generating a re-authentication event.
       *   Without a signatureAuthEvent, the signature is not independently
       *   verifiable under AC 43-9C. There is no fallback — it must throw.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const techId = await seedTechnician(t, orgId);
      const aircraftId = await seedAircraft(t, orgId);

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-TC-AUTH-01",
        workOrderType: "routine",
        description: "Auth event test WO.",
        priority: "routine",
        callerUserId: "user_alex_rivera",
      });
      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 2800.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_alex_rivera",
      });

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-AUTH-01",
        title: "Auth test card",
        taskType: "repair",
        approvedDataSource: "AMM 27-10-00",
        steps: [
          {
            stepNumber: 1,
            description: "Test step.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_alex_rivera",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );

      // ── Assert: completeStep without signatureAuthEventId must throw (INV-05)
      await expect(
        t.mutation(completeStep, {
          stepId: steps[0]._id,
          taskCardId: taskCardId as any,
          organizationId: orgId as any,
          action: "complete",
          // signatureAuthEventId intentionally omitted
          ratingsExercised: ["airframe"],
          callerUserId: "user_alex_rivera",
          callerTechnicianId: techId as any,
        })
      ).rejects.toThrow(/INV-05|signatureAuthEvent|re-authentication|required/i);
    }
  );

  it(
    "TC-TC-STEP-02: completeStep throws when signatureAuthEvent is expired (expiresAt < now)",
    async () => {
      /**
       * Failure mode guarded:
       *   A step is signed using a 5-minute auth event that expired 1 second ago.
       *   There is no grace period. expiresAt < Date.now() is a hard reject.
       *   This prevents replay attacks using captured auth tokens.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const techId = await seedTechnician(t, orgId);
      const { workOrderId } = await createOpenWorkOrder(t, techId);

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-EXPIRED-01",
        title: "Expired auth test",
        taskType: "repair",
        approvedDataSource: "AMM 27-20-00",
        steps: [
          {
            stepNumber: 1,
            description: "Step.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_alex_rivera",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );

      const expiredAuthEvent = await seedAuthEvent(t, techId, { expired: true });

      await expect(
        t.mutation(completeStep, {
          stepId: steps[0]._id,
          taskCardId: taskCardId as any,
          organizationId: orgId as any,
          action: "complete",
          signatureAuthEventId: expiredAuthEvent as any,
          ratingsExercised: ["airframe"],
          callerUserId: "user_alex_rivera",
          callerTechnicianId: techId as any,
        })
      ).rejects.toThrow(/INV-05|expired|expiresAt/i);

      // Step must remain pending
      const step = await t.run(async (ctx) => ctx.db.get(steps[0]._id));
      expect(step?.status).toBe("pending");
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Single-consumption enforcement (INV-05)
// ─────────────────────────────────────────────────────────────────────────────

describe("Task Cards — Single-consumption enforcement: auth events cannot sign twice", () => {
  it(
    "TC-TC-CONS-01: using a consumed auth event on a second step throws with 'already consumed'",
    async () => {
      /**
       * Failure mode guarded:
       *   One signatureAuthEvent is used to sign TWO separate steps.
       *   The consumed flag (INV-05) exists precisely to prevent this.
       *   After the first step sign-off, the event's consumed=true.
       *   The second attempt must be rejected with a clear error.
       *
       *   Regulatory exposure: without single-consumption enforcement, a technician
       *   could authenticate once and sign an unlimited number of steps with that
       *   single event — undermining the per-step authentication requirement.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const techId = await seedTechnician(t, orgId);
      const { workOrderId } = await createOpenWorkOrder(t, techId);

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-CONS-01",
        title: "Single consumption test — two steps",
        taskType: "repair",
        approvedDataSource: "AMM 29-10-00",
        steps: [
          {
            stepNumber: 1,
            description: "Step 1 — will be signed with the auth event.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 2,
            description: "Step 2 — second attempt must fail.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_alex_rivera",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );
      const step1 = steps.find((s) => s.stepNumber === 1)!;
      const step2 = steps.find((s) => s.stepNumber === 2)!;

      const sharedAuthEvent = await seedAuthEvent(t, techId);

      // Sign step 1 — should succeed, consumes the auth event
      await t.mutation(completeStep, {
        stepId: step1._id,
        taskCardId: taskCardId as any,
        organizationId: orgId as any,
        action: "complete",
        signatureAuthEventId: sharedAuthEvent as any,
        ratingsExercised: ["airframe"],
        callerUserId: "user_alex_rivera",
        callerTechnicianId: techId as any,
      });

      // Verify the auth event is now consumed
      const consumedEvent = await t.run(async (ctx) => ctx.db.get(sharedAuthEvent as any));
      expect(consumedEvent?.consumed).toBe(true);
      expect(consumedEvent?.consumedByTable).toBe("taskCardSteps");
      expect(consumedEvent?.consumedByRecordId?.toString()).toBe(step1._id.toString());

      // ── Assert: using the same auth event for step 2 must throw (INV-05)
      await expect(
        t.mutation(completeStep, {
          stepId: step2._id,
          taskCardId: taskCardId as any,
          organizationId: orgId as any,
          action: "complete",
          signatureAuthEventId: sharedAuthEvent as any, // ← already consumed
          ratingsExercised: ["airframe"],
          callerUserId: "user_alex_rivera",
          callerTechnicianId: techId as any,
        })
      ).rejects.toThrow(/INV-05|consumed|already used|single.use/i);

      // Step 2 must still be pending
      const step2Doc = await t.run(async (ctx) => ctx.db.get(step2._id));
      expect(step2Doc?.status).toBe("pending");
    }
  );

  it(
    "TC-TC-CONS-02: auth event created for technician A cannot be used by technician B (INV-05 identity check)",
    async () => {
      /**
       * Failure mode guarded:
       *   Technician A generates a re-auth event, then technician B uses it to sign a step.
       *   The auth event belongs to A — it cannot be transferred.
       *   The identity check (authEvent.technicianId == callerTechnicianId) is the guard.
       *
       *   This prevents the scenario where a technician delegates their authentication
       *   event to a co-worker, which would defeat the purpose of per-identity re-auth.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const techA = await seedTechnician(t, orgId, {
        userId: "user_tech_a",
        legalName: "Tech A",
        certNumber: "AP000001",
      });
      const techB = await seedTechnician(t, orgId, {
        userId: "user_tech_b",
        legalName: "Tech B",
        certNumber: "AP000002",
      });
      const { workOrderId } = await createOpenWorkOrder(t, techA);

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-IDENT-01",
        title: "Identity test card",
        taskType: "repair",
        approvedDataSource: "AMM 32-10-00",
        steps: [
          {
            stepNumber: 1,
            description: "Landing gear inspection.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_tech_a",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );

      // Auth event was issued to techA
      const authEventForTechA = await seedAuthEvent(t, techA);

      // ── Assert: techB trying to use techA's auth event must throw (INV-05 identity)
      await expect(
        t.mutation(completeStep, {
          stepId: steps[0]._id,
          taskCardId: taskCardId as any,
          organizationId: orgId as any,
          action: "complete",
          signatureAuthEventId: authEventForTechA as any, // belongs to techA
          ratingsExercised: ["airframe"],
          callerUserId: "user_tech_b",
          callerTechnicianId: techB as any, // techB is the caller
        })
      ).rejects.toThrow(/INV-05|mismatch|non-transferable|technician/i);
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Task card sign-off requires ALL steps complete (INV-09 / TC-TC-15)
// ─────────────────────────────────────────────────────────────────────────────

describe("Task Cards — signTaskCard requires all steps resolved", () => {
  it(
    "TC-TC-SIGN-01: signTaskCard throws when at least one step is still pending (TC-TC-15)",
    async () => {
      /**
       * Failure mode guarded:
       *   signTaskCard is called before all steps are resolved.
       *   The card-level sign-off attests to the ENTIRE task — if a step is pending,
       *   the attestation is false. The guard checks for pending steps
       *   and throws before allowing the card-level signature.
       *
       *   This directly corresponds to TC-TC-15 in the task card spec.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const techId = await seedTechnician(t, orgId, { withIa: true });
      const { workOrderId } = await createOpenWorkOrder(t, techId);

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-SIGN-01",
        title: "Partial completion test",
        taskType: "inspection",
        approvedDataSource: "AMM 05-20-00 Rev 3",
        steps: [
          {
            stepNumber: 1,
            description: "Step 1 — will be signed.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 2,
            description: "Step 2 — will remain pending.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_alex_rivera",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );

      // Sign only step 1
      const auth1 = await seedAuthEvent(t, techId);
      await t.mutation(completeStep, {
        stepId: steps.find((s) => s.stepNumber === 1)!._id,
        taskCardId: taskCardId as any,
        organizationId: orgId as any,
        action: "complete",
        signatureAuthEventId: auth1 as any,
        ratingsExercised: ["airframe"],
        callerUserId: "user_alex_rivera",
        callerTechnicianId: techId as any,
      });

      // Card should be in_progress (1 of 2 steps done)
      const card = await t.run(async (ctx) => ctx.db.get(taskCardId));
      expect(card?.status).toBe("in_progress");

      const cardSignAuth = await seedAuthEvent(t, techId);

      // ── Assert: signTaskCard must throw because step 2 is still pending
      await expect(
        t.mutation(signTaskCard, {
          taskCardId: taskCardId as any,
          organizationId: orgId as any,
          signatureAuthEventId: cardSignAuth as any,
          ratingsExercised: ["airframe"],
          returnToServiceStatement:
            "I certify this task was completed per the approved data. Return to service per 14 CFR § 43.9.",
          callerUserId: "user_alex_rivera",
          callerTechnicianId: techId as any,
        })
      ).rejects.toThrow(/pending|incomplete|all steps|complete/i);
    }
  );

  it(
    "TC-TC-SIGN-02: signTaskCard succeeds when all steps are complete — " +
      "produces audit log entry and updates completedAt",
    async () => {
      /**
       * Failure mode guarded:
       *   signTaskCard on a fully-completed card fails for some reason, OR succeeds
       *   but doesn't write the sign-off to the audit log.
       *   The audit log entry is the legally defensible record of the card sign-off.
       *   Its absence is an AC 43-9C gap.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const techId = await seedTechnician(t, orgId, { withIa: true });
      const { workOrderId } = await createOpenWorkOrder(t, techId);

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-SIGN-02",
        title: "All steps complete",
        taskType: "inspection",
        approvedDataSource: "AMM 05-50-00",
        steps: [
          {
            stepNumber: 1,
            description: "Inspect aircraft.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_alex_rivera",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );

      const stepAuth = await seedAuthEvent(t, techId);
      await t.mutation(completeStep, {
        stepId: steps[0]._id,
        taskCardId: taskCardId as any,
        organizationId: orgId as any,
        action: "complete",
        signatureAuthEventId: stepAuth as any,
        ratingsExercised: ["airframe"],
        callerUserId: "user_alex_rivera",
        callerTechnicianId: techId as any,
      });

      // Card should now be "complete"
      const completedCard = await t.run(async (ctx) => ctx.db.get(taskCardId));
      expect(completedCard?.status).toBe("complete");

      const cardSignAuth = await seedAuthEvent(t, techId);
      await t.mutation(signTaskCard, {
        taskCardId: taskCardId as any,
        organizationId: orgId as any,
        signatureAuthEventId: cardSignAuth as any,
        ratingsExercised: ["airframe"],
        returnToServiceStatement:
          "Task completed per AMM 05-50-00. Aircraft approved for return to service per 14 CFR § 43.9.",
        callerUserId: "user_alex_rivera",
        callerTechnicianId: techId as any,
      });

      // Card sign-off audit log entry must exist
      const auditEntries = await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_record", (q) =>
            q.eq("tableName", "taskCards").eq("recordId", taskCardId as any)
          )
          .filter((q) => q.eq(q.field("eventType"), "record_signed"))
          .collect()
      );
      expect(auditEntries.length).toBeGreaterThanOrEqual(1);

      // Card auth event must be consumed (INV-05)
      const consumedCardAuth = await t.run(async (ctx) => ctx.db.get(cardSignAuth as any));
      expect(consumedCardAuth?.consumed).toBe(true);
      expect(consumedCardAuth?.consumedByTable).toBe("taskCards");
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: Inspector-only steps cannot be signed by AMT (IA currency check)
// ─────────────────────────────────────────────────────────────────────────────

describe("Task Cards — Inspector-only steps cannot be signed by AMT", () => {
  it(
    "TC-TC-IA-01: completeStep throws when signOffRequiresIa=true and signer holds no current IA",
    async () => {
      /**
       * Failure mode guarded:
       *   A step marked signOffRequiresIa=true is signed by a plain A&P with no IA.
       *   This is the most common regulatory violation in annual inspection work:
       *   the performing AMT signs the IA-required step under their A&P, and the
       *   annual inspection sign-off is invalid. The guard must prevent it.
       *
       *   The guard checks certificates.by_type for an active IA certificate
       *   with hasIaAuthorization=true and iaExpiryDate > now.
       *   A plain A&P with no IA certificate will fail this check.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);

      // AMT — A&P only, NO IA
      const amtId = await seedTechnician(t, orgId, {
        withIa: false, // ← A&P only
        userId: "user_amt_no_ia",
        legalName: "Sam Torres",
        certNumber: "AP777777",
      });

      const { workOrderId } = await createOpenWorkOrder(t, amtId);

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-IA-01",
        title: "Annual inspection — IA-required step",
        taskType: "inspection",
        approvedDataSource: "14 CFR Part 43 Appendix D",
        steps: [
          {
            stepNumber: 1,
            description: "Inspect and sign off flight control system — IA required.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: true, // ← IA REQUIRED
          },
        ],
        callerUserId: "user_amt_no_ia",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );

      const authEvent = await seedAuthEvent(t, amtId);

      // ── Assert: AMT without IA cannot sign an IA-required step
      await expect(
        t.mutation(completeStep, {
          stepId: steps[0]._id,
          taskCardId: taskCardId as any,
          organizationId: orgId as any,
          action: "complete",
          signatureAuthEventId: authEvent as any,
          ratingsExercised: ["airframe"],
          callerUserId: "user_amt_no_ia",
          callerTechnicianId: amtId as any,
        })
      ).rejects.toThrow(/IA|Inspection Authorization|current|expired|required/i);

      // Step must remain pending
      const step = await t.run(async (ctx) => ctx.db.get(steps[0]._id));
      expect(step?.status).toBe("pending");
    }
  );

  it(
    "TC-TC-IA-02: completeStep throws when signOffRequiresIa=true and signer's IA is expired " +
      "— March 31 rule: expired on April 1 is a hard reject, no grace period",
    async () => {
      /**
       * Failure mode guarded:
       *   An IA signed an annual inspection step on April 1 when their IA expired on
       *   March 31. This is a hard regulatory violation — there is no grace period past
       *   the March 31 expiry (14 CFR 65.92, per Marcus Webb's annotation).
       *
       *   We simulate this by seeding an IA certificate with iaExpiryDate in the past.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);

      // IA with EXPIRED certificate
      const expiredIaTechId = await t.run(async (ctx) => {
        const techId = await ctx.db.insert("technicians", {
          legalName: "Dana Kim",
          userId: "user_dana_kim",
          employeeId: "EMP999",
          organizationId: orgId as any,
          status: "active",
          email: "dana.kim@apex.com",
          createdAt: NOW,
          updatedAt: NOW,
        });

        await ctx.db.insert("certificates", {
          technicianId: techId,
          certificateType: "A&P",
          certificateNumber: "AP555555",
          issueDate: NOW - TWENTY_FOUR_HOURS * 365 * 10,
          ratings: ["airframe", "powerplant"],
          hasIaAuthorization: true,
          // IA expired on March 31 of THIS year
          iaExpiryDate: new Date(new Date().getFullYear(), 2, 31, 23, 59, 59).getTime(),
          // Ensure expiry is in the past (this will be past if running after March 31)
          // For test reliability, set expiry to a known past date
          iaRenewalActivities: [],
          repairStationAuthorizations: [],
          active: true,
          createdAt: NOW,
          updatedAt: NOW,
        });

        return techId;
      });

      // Patch the IA cert to a guaranteed past date
      await t.run(async (ctx) => {
        const cert = await ctx.db
          .query("certificates")
          .withIndex("by_technician", (q) => q.eq("technicianId", expiredIaTechId as any))
          .first();
        if (cert) {
          await ctx.db.patch(cert._id, {
            // Expired 2 years ago — unambiguously expired
            iaExpiryDate: NOW - TWENTY_FOUR_HOURS * 365 * 2,
          });
        }
      });

      const { workOrderId } = await createOpenWorkOrder(t, expiredIaTechId);

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-EXPIRED-IA-01",
        title: "Annual step — expired IA",
        taskType: "inspection",
        approvedDataSource: "14 CFR Part 43 Appendix D",
        steps: [
          {
            stepNumber: 1,
            description: "Annual inspection — IA required.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: true, // ← IA required, but signer's IA is expired
          },
        ],
        callerUserId: "user_dana_kim",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );

      const authEvent = await seedAuthEvent(t, expiredIaTechId);

      await expect(
        t.mutation(completeStep, {
          stepId: steps[0]._id,
          taskCardId: taskCardId as any,
          organizationId: orgId as any,
          action: "complete",
          signatureAuthEventId: authEvent as any,
          ratingsExercised: ["ia"],
          callerUserId: "user_dana_kim",
          callerTechnicianId: expiredIaTechId as any,
        })
      ).rejects.toThrow(/IA|expired|current|March 31|expiry/i);
    }
  );

  it(
    "TC-TC-IA-03: completeStep succeeds when signOffRequiresIa=true and signer holds a current IA",
    async () => {
      /**
       * Companion test to TC-TC-IA-01 and TC-TC-IA-02.
       * An IA with a current, unexpired IA signing an IA-required step must succeed.
       * This proves the guard is correctly scoped — it rejects only the unauthorized
       * case, not all IA-required steps categorically.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);

      // IA with CURRENT certificate
      const iaId = await seedTechnician(t, orgId, {
        withIa: true, // ← current IA
        userId: "user_current_ia",
        legalName: "Robin Patel",
        certNumber: "AP111111",
      });

      const { workOrderId } = await createOpenWorkOrder(t, iaId);

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-IA-PASS-01",
        title: "Annual inspection — current IA signs",
        taskType: "inspection",
        approvedDataSource: "14 CFR Part 43 Appendix D",
        steps: [
          {
            stepNumber: 1,
            description: "Annual inspection step — IA required, IA is current.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: true,
          },
        ],
        callerUserId: "user_current_ia",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );

      const authEvent = await seedAuthEvent(t, iaId);

      await expect(
        t.mutation(completeStep, {
          stepId: steps[0]._id,
          taskCardId: taskCardId as any,
          organizationId: orgId as any,
          action: "complete",
          signatureAuthEventId: authEvent as any,
          ratingsExercised: ["ia"],
          callerUserId: "user_current_ia",
          callerTechnicianId: iaId as any,
        })
      ).resolves.not.toThrow();

      const step = await t.run(async (ctx) => ctx.db.get(steps[0]._id));
      expect(step?.status).toBe("completed");
      expect(step?.signedHasIaOnDate).toBe(true);
      expect(step?.signedByTechnicianId?.toString()).toBe(iaId.toString());
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: Concurrent step signing on same task card (INV-10 / QA-002 resolution)
// ─────────────────────────────────────────────────────────────────────────────

describe("Task Cards — Concurrent step signing on the same task card", () => {
  it(
    "TC-TC-CONCURRENT-01: two technicians signing different steps simultaneously " +
      "both succeed — no write conflict (validates QA-002 resolution: steps are independent docs)",
    async () => {
      /**
       * Failure mode guarded:
       *   With the old embedded steps array (schema v1), two simultaneous step sign-offs
       *   would both write to the same taskCards document → write conflict, one fails.
       *   QA-002 extracted steps to taskCardSteps — each step is now an independent
       *   document. Two technicians signing different steps should never conflict.
       *
       *   This test proves the extraction was effective. We run both mutations
       *   sequentially (convex-test is single-threaded), but we verify that each
       *   step's write is isolated to its own document, not the parent card.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);

      const techA = await seedTechnician(t, orgId, {
        userId: "user_concurrent_a",
        legalName: "Chris Ngo",
        certNumber: "AP300001",
      });
      const techB = await seedTechnician(t, orgId, {
        userId: "user_concurrent_b",
        legalName: "Pat Sawyer",
        certNumber: "AP300002",
      });

      const { workOrderId } = await createOpenWorkOrder(t, techA);

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-CONC-01",
        title: "Concurrent sign-off test",
        taskType: "repair",
        approvedDataSource: "AMM 55-10-00",
        steps: [
          {
            stepNumber: 1,
            description: "Tech A's step — engine bay.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 2,
            description: "Tech B's step — airframe inspection.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_concurrent_a",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );
      const step1 = steps.find((s) => s.stepNumber === 1)!;
      const step2 = steps.find((s) => s.stepNumber === 2)!;

      // Auth events for each technician — independent events
      const authA = await seedAuthEvent(t, techA);
      const authB = await seedAuthEvent(t, techB);

      // Tech A signs step 1
      await t.mutation(completeStep, {
        stepId: step1._id,
        taskCardId: taskCardId as any,
        organizationId: orgId as any,
        action: "complete",
        signatureAuthEventId: authA as any,
        ratingsExercised: ["powerplant"],
        callerUserId: "user_concurrent_a",
        callerTechnicianId: techA as any,
      });

      // Tech B signs step 2 (concurrently in real world; sequential in test)
      await t.mutation(completeStep, {
        stepId: step2._id,
        taskCardId: taskCardId as any,
        organizationId: orgId as any,
        action: "complete",
        signatureAuthEventId: authB as any,
        ratingsExercised: ["airframe"],
        callerUserId: "user_concurrent_b",
        callerTechnicianId: techB as any,
      });

      // Both steps must be completed by their respective technicians
      const finalStep1 = await t.run(async (ctx) => ctx.db.get(step1._id));
      const finalStep2 = await t.run(async (ctx) => ctx.db.get(step2._id));

      expect(finalStep1?.status).toBe("completed");
      expect(finalStep1?.signedByTechnicianId?.toString()).toBe(techA.toString());

      expect(finalStep2?.status).toBe("completed");
      expect(finalStep2?.signedByTechnicianId?.toString()).toBe(techB.toString());

      // Task card should now be "complete" (both steps done)
      const card = await t.run(async (ctx) => ctx.db.get(taskCardId));
      expect(card?.status).toBe("complete");
      expect(card?.completedStepCount).toBe(2);

      // Each auth event consumed by its respective step — cross-consumption impossible
      const eventA = await t.run(async (ctx) => ctx.db.get(authA as any));
      const eventB = await t.run(async (ctx) => ctx.db.get(authB as any));

      expect(eventA?.consumed).toBe(true);
      expect(eventA?.consumedByRecordId?.toString()).toBe(step1._id.toString());
      expect(eventB?.consumed).toBe(true);
      expect(eventB?.consumedByRecordId?.toString()).toBe(step2._id.toString());

      // Per-step audit log entries must exist (INV-10 — per-step audit trail)
      const step1AuditEntries = await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_record", (q) =>
            q.eq("tableName", "taskCardSteps").eq("recordId", step1._id)
          )
          .filter((q) => q.eq(q.field("eventType"), "technician_signed"))
          .collect()
      );
      const step2AuditEntries = await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_record", (q) =>
            q.eq("tableName", "taskCardSteps").eq("recordId", step2._id)
          )
          .filter((q) => q.eq(q.field("eventType"), "technician_signed"))
          .collect()
      );

      expect(step1AuditEntries.length).toBeGreaterThanOrEqual(1);
      expect(step2AuditEntries.length).toBeGreaterThanOrEqual(1);

      // The two sign-offs are independent — step 1's audit log does NOT contain techB
      expect(step1AuditEntries[0].technicianId?.toString()).toBe(techA.toString());
      expect(step2AuditEntries[0].technicianId?.toString()).toBe(techB.toString());
    }
  );

  it(
    "TC-TC-CONCURRENT-02: task card status after concurrent sign-offs is correctly derived " +
      "— denormalized counters (completedStepCount) match actual step states",
    async () => {
      /**
       * Failure mode guarded:
       *   After concurrent sign-offs, the task card's denormalized completedStepCount
       *   drifts out of sync with the actual step states. This causes getCloseReadiness
       *   (Q-WO-09) to give a false positive or false negative on task card completion.
       *   The step recount in completeStep must be accurate even after concurrent writes.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const techId = await seedTechnician(t, orgId);
      const { workOrderId } = await createOpenWorkOrder(t, techId);

      const taskCardId = await t.mutation(createTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-COUNTERS-01",
        title: "Counter accuracy test",
        taskType: "inspection",
        approvedDataSource: "AMM 05-10-00",
        steps: [
          {
            stepNumber: 1,
            description: "Step 1.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 2,
            description: "Step 2.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 3,
            description: "Step 3.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_alex_rivera",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );

      const auth1 = await seedAuthEvent(t, techId);
      const auth2 = await seedAuthEvent(t, techId);

      // Sign step 1
      await t.mutation(completeStep, {
        stepId: steps.find((s) => s.stepNumber === 1)!._id,
        taskCardId: taskCardId as any,
        organizationId: orgId as any,
        action: "complete",
        signatureAuthEventId: auth1 as any,
        ratingsExercised: ["airframe"],
        callerUserId: "user_alex_rivera",
        callerTechnicianId: techId as any,
      });

      let card = await t.run(async (ctx) => ctx.db.get(taskCardId));
      expect(card?.completedStepCount).toBe(1);
      expect(card?.status).toBe("in_progress"); // 1 of 3 done

      // Sign step 2
      await t.mutation(completeStep, {
        stepId: steps.find((s) => s.stepNumber === 2)!._id,
        taskCardId: taskCardId as any,
        organizationId: orgId as any,
        action: "complete",
        signatureAuthEventId: auth2 as any,
        ratingsExercised: ["airframe"],
        callerUserId: "user_alex_rivera",
        callerTechnicianId: techId as any,
      });

      card = await t.run(async (ctx) => ctx.db.get(taskCardId));
      expect(card?.completedStepCount).toBe(2);
      expect(card?.status).toBe("in_progress"); // 2 of 3 done

      // Mark step 3 as N/A
      await t.mutation(completeStep, {
        stepId: steps.find((s) => s.stepNumber === 3)!._id,
        taskCardId: taskCardId as any,
        organizationId: orgId as any,
        action: "mark_na",
        naReason: "Not applicable to this aircraft configuration.",
        naAuthorizedById: techId as any,
        callerUserId: "user_alex_rivera",
        callerTechnicianId: techId as any,
      });

      card = await t.run(async (ctx) => ctx.db.get(taskCardId));
      expect(card?.completedStepCount).toBe(2);
      expect(card?.naStepCount).toBe(1);
      // No pending steps remain; no IA-required NA step → complete
      expect(card?.status).toBe("complete");
    }
  );
});
