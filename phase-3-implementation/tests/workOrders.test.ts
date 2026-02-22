/**
 * workOrders.test.ts
 * Integration tests — Work Order Engine
 *
 * Author:  Cilla Oduya (QA Lead)
 * Date:    2026-02-22
 * Phase:   3 — Implementation
 * Basis:   phase-2-work-orders/work-order-engine.md
 *          convex-schema-v2.md (FROZEN)
 *
 * Every test in this file has a named failure mode it is guarding against.
 * No vague assertions. No "it should work" tests.
 *
 * Invariant coverage:
 *   INV-06  aircraftTotalTimeAtClose required and ≥ atOpen
 *   INV-14  workOrderNumber unique within organization
 *   INV-18  Aircraft total time monotonically increasing
 *   INV-19  closedAt / closedByUserId / closedByTechnicianId required at close
 *   INV-20  returnToServiceStatement required when returnedToService
 *   WO void guard — no signed maintenance records
 *   Concurrent WO guard — second open WO on same aircraft without override
 */

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";

// Mutation imports — these point at Phase 3 implementation files.
// Tests will fail to compile until the implementations exist; that is intentional.
import { createWorkOrder } from "../../convex/mutations/workOrders/createWorkOrder";
import { openWorkOrder } from "../../convex/mutations/workOrders/openWorkOrder";
import { addTaskCard } from "../../convex/mutations/workOrders/addTaskCard";
import { completeTaskCard } from "../../convex/mutations/workOrders/completeTaskCard";
import { closeWorkOrder } from "../../convex/mutations/workOrders/closeWorkOrder";
import { voidWorkOrder } from "../../convex/mutations/workOrders/voidWorkOrder";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const NOW = Date.now();
const FIVE_MINUTES = 5 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURE FACTORY HELPERS
// Direct ctx.db inserts — bypasses mutation layer to set up known-good state.
// Used for "arrange" phase only; never used to assert system behavior.
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a minimal active organization. Returns its Id. */
async function seedOrganization(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    return ctx.db.insert("organizations", {
      name: "Skyline MRO Inc.",
      part145CertificateNumber: "ODSO145R0001",
      part145Ratings: ["Class A Airframe", "Class A Powerplant"],
      address: "1 Ramp Way",
      city: "Tucson",
      state: "AZ",
      zip: "85706",
      country: "US",
      subscriptionTier: "professional",
      active: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
}

/** Creates an active aircraft in `in_maintenance` status. Returns its Id. */
async function seedAircraft(
  t: ReturnType<typeof convexTest>,
  orgId: string,
  overrides: { totalTimeAirframeHours?: number; status?: string } = {}
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("aircraft", {
      make: "Cessna",
      model: "172S",
      series: "Skyhawk SP",
      serialNumber: "172S12345",
      currentRegistration: "N12345",
      experimental: false,
      aircraftCategory: "normal",
      engineCount: 1,
      totalTimeAirframeHours: overrides.totalTimeAirframeHours ?? 3200.5,
      totalTimeAirframeAsOfDate: NOW,
      status: (overrides.status ?? "in_maintenance") as any,
      operatingOrganizationId: orgId as any,
      createdByOrganizationId: orgId as any,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
}

/**
 * Creates an active technician with a valid A&P certificate.
 * If `withIa: true`, also creates an IA certificate that expires 31 March
 * of next year — current on the day the test runs.
 */
async function seedTechnicianWithCert(
  t: ReturnType<typeof convexTest>,
  orgId: string,
  opts: { withIa?: boolean; userId?: string } = {}
) {
  return t.run(async (ctx) => {
    const techId = await ctx.db.insert("technicians", {
      legalName: "Jordan Lee",
      userId: opts.userId ?? "user_jordan_lee",
      employeeId: "EMP001",
      organizationId: orgId as any,
      status: "active",
      email: "jordan.lee@skylinemro.com",
      createdAt: NOW,
      updatedAt: NOW,
    });

    // A&P certificate
    await ctx.db.insert("certificates", {
      technicianId: techId,
      certificateType: "A&P",
      certificateNumber: "AP123456",
      issueDate: NOW - TWENTY_FOUR_HOURS * 365 * 3,
      ratings: ["airframe", "powerplant"],
      hasIaAuthorization: opts.withIa ?? false,
      // IA expires 31 March of the next calendar year
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

/**
 * Creates a valid, unconsumed signatureAuthEvent for a given technician.
 * expiresAt defaults to 4 minutes from now (inside the 5-minute TTL window).
 * Pass `expired: true` for an already-expired event.
 */
async function seedAuthEvent(
  t: ReturnType<typeof convexTest>,
  techId: string,
  opts: { expired?: boolean; consumed?: boolean; intendedTable?: string } = {}
) {
  return t.run(async (ctx) => {
    const authenticatedAt = NOW;
    const expiresAt = opts.expired
      ? NOW - 1000 // 1 second in the past
      : NOW + FIVE_MINUTES - 60_000; // 4 minutes from now

    return ctx.db.insert("signatureAuthEvents", {
      clerkEventId: `clerk_evt_${Math.random().toString(36).slice(2)}`,
      clerkSessionId: `sess_${Math.random().toString(36).slice(2)}`,
      userId: "user_jordan_lee",
      technicianId: techId as any,
      authenticatedLegalName: "Jordan Lee",
      authenticatedCertNumber: "AP123456",
      authMethod: "pin",
      intendedTable: opts.intendedTable ?? "taskCardSteps",
      authenticatedAt,
      expiresAt,
      consumed: opts.consumed ?? false,
      consumedAt: opts.consumed ? NOW - 1000 : undefined,
    });
  });
}

/**
 * Seeds a ReturnToService record for a work order.
 * Required by closeWorkOrder as precondition 3 (RTS record must exist).
 */
async function seedRtsRecord(
  t: ReturnType<typeof convexTest>,
  workOrderId: string,
  aircraftId: string,
  orgId: string,
  techId: string,
  authEventId: string,
  hoursAtRts: number
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("returnToService", {
      workOrderId: workOrderId as any,
      aircraftId: aircraftId as any,
      organizationId: orgId as any,
      signedByIaTechnicianId: techId as any,
      iaCertificateNumber: "AP123456",
      iaCurrentOnRtsDate: true,
      returnToServiceDate: NOW,
      returnToServiceStatement:
        "I certify that this aircraft has been inspected in accordance with a 100-hour inspection " +
        "and was determined to be in airworthy condition. Return to service per 14 CFR § 43.11.",
      aircraftHoursAtRts: hoursAtRts,
      signatureHash: "sha256:stub_hash_for_test",
      signatureTimestamp: NOW,
      signatureAuthEventId: authEventId as any,
      createdAt: NOW,
    });
  });
}

/**
 * Seeds a maintenanceRecord linked to a work order (simulates a signed record).
 * Used for the void-guard test — a WO with a signed record cannot be voided.
 */
async function seedMaintenanceRecord(
  t: ReturnType<typeof convexTest>,
  workOrderId: string,
  aircraftId: string,
  orgId: string,
  techId: string,
  authEventId: string
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("maintenanceRecords", {
      recordType: "maintenance_43_9",
      aircraftId: aircraftId as any,
      aircraftMake: "Cessna",
      aircraftModel: "172S",
      aircraftSerialNumber: "172S12345",
      aircraftRegistration: "N12345",
      aircraftTotalTimeHours: 3210.5,
      workOrderId: workOrderId as any,
      organizationId: orgId as any,
      organizationCertificateNumber: "ODSO145R0001",
      sequenceNumber: 1,
      workPerformed: "100-hour inspection performed per AMM 05-10-00 Rev 4.",
      approvedDataReference: "AMM 05-10-00 Rev 4",
      partsReplaced: [],
      completionDate: NOW,
      technicians: [
        {
          technicianId: techId as any,
          legalName: "Jordan Lee",
          certificateNumber: "AP123456",
          certificateType: "A&P",
          ratingsExercised: ["airframe", "powerplant"],
          scopeOfWork: "100-hour inspection — all systems.",
          signatureTimestamp: NOW,
          signatureHash: "sha256:stub_for_test",
          signatureAuthEventId: authEventId as any,
        },
      ],
      signingTechnicianId: techId as any,
      signingTechnicianLegalName: "Jordan Lee",
      signingTechnicianCertNumber: "AP123456",
      signingTechnicianCertType: "A&P",
      signingTechnicianRatingsExercised: ["airframe", "powerplant"],
      signatureTimestamp: NOW,
      signatureHash: "sha256:stub_for_test",
      signatureAuthEventId: authEventId as any,
      returnedToService: true,
      returnToServiceStatement:
        "Aircraft approved for return to service per 14 CFR § 43.9.",
      discrepanciesFound: [],
      discrepanciesCorrected: [],
      createdAt: NOW,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: HAPPY PATH — create → open → add task card → complete → close
// ─────────────────────────────────────────────────────────────────────────────

describe("Work Order Engine — Happy Path", () => {
  it(
    "TC-WO-HP-01: full lifecycle create → open → addTaskCard → completeTaskCard → close " +
      "produces a closed WO with correct TT fields and RTS linkage",
    async () => {
      /**
       * Failure mode guarded: The happy path could fail silently in any of these ways:
       *   (a) closeWorkOrder updates status but leaves aircraftTotalTimeAtClose unset
       *   (b) The work order's returnedToService flag is not flipped to true
       *   (c) aircraft.totalTimeAirframeHours is not updated after close
       *   (d) Task card status is not "complete" after all steps are signed
       * All four are asserted explicitly below.
       */
      const t = convexTest(schema);

      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 3200.5 });
      const techId = await seedTechnicianWithCert(t, orgId, { withIa: true });

      // ── Step 1: Create WO in draft
      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0001",
        workOrderType: "100hr_inspection",
        description: "100-hour inspection per maintenance schedule.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      let wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("draft");
      expect(wo?.aircraftTotalTimeAtOpen).toBe(0); // sentinel until openWorkOrder

      // ── Step 2: Open WO — captures aircraft TT at open
      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 3200.5,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_jordan_lee",
      });

      wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("open");
      expect(wo?.aircraftTotalTimeAtOpen).toBe(3200.5);

      // ── Step 3: Add task card — transitions WO to in_progress
      const taskCardId = await t.mutation(addTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-001",
        title: "100-Hour Inspection Checklist",
        taskType: "inspection",
        approvedDataSource: "AMM 05-10-00 Rev 4",
        steps: [
          {
            stepNumber: 1,
            description: "Inspect engine oil and filter.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 2,
            description: "Inspect control surface rigging.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_jordan_lee",
      });

      wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("in_progress");

      const taskCard = await t.run(async (ctx) => ctx.db.get(taskCardId));
      expect(taskCard?.status).toBe("not_started");
      expect(taskCard?.stepCount).toBe(2);

      // ── Step 4: Complete task card — sign both steps
      const authEvent1 = await seedAuthEvent(t, techId);
      const authEvent2 = await seedAuthEvent(t, techId);

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );
      expect(steps).toHaveLength(2);

      await t.mutation(completeTaskCard, {
        taskCardId: taskCardId as any,
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        stepCompletions: [
          {
            stepId: steps[0]._id,
            action: "complete",
            signatureAuthEventId: authEvent1 as any,
            ratingsExercised: ["airframe"],
          },
          {
            stepId: steps[1]._id,
            action: "complete",
            signatureAuthEventId: authEvent2 as any,
            ratingsExercised: ["airframe"],
          },
        ],
        callerUserId: "user_jordan_lee",
        callerTechnicianId: techId as any,
      });

      const completedCard = await t.run(async (ctx) => ctx.db.get(taskCardId));
      expect(completedCard?.status).toBe("complete");
      expect(completedCard?.completedStepCount).toBe(2);

      // Verify both auth events are consumed
      const consumedEvent1 = await t.run(async (ctx) => ctx.db.get(authEvent1 as any));
      const consumedEvent2 = await t.run(async (ctx) => ctx.db.get(authEvent2 as any));
      expect(consumedEvent1?.consumed).toBe(true);
      expect(consumedEvent2?.consumed).toBe(true);

      // ── Step 5: Manually advance WO to pending_signoff (via direct db — state
      //    transitions to pending_inspection and pending_signoff are BACK-P2-05
      //    mutations not yet implemented; seed the state directly for close test)
      await t.run(async (ctx) => {
        await ctx.db.patch(workOrderId as any, { status: "pending_signoff" });
      });

      // ── Step 6: Seed required RTS record and close auth event
      const closeAuthEvent = await seedAuthEvent(t, techId, { intendedTable: "workOrders" });
      await seedRtsRecord(t, workOrderId, aircraftId, orgId, techId, closeAuthEvent, 3210.5);

      await t.mutation(closeWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtClose: 3210.5,
        closingTechnicianId: techId as any,
        returnToServiceStatement:
          "I certify this aircraft has been inspected and is approved for return to service per 14 CFR § 43.11.",
        signatureAuthEventId: closeAuthEvent as any,
        callerUserId: "user_jordan_lee",
      });

      // ── Assert: WO is closed with all required fields set (INV-06, INV-19)
      const closedWo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(closedWo?.status).toBe("closed");
      expect(closedWo?.aircraftTotalTimeAtClose).toBe(3210.5);
      expect(closedWo?.closedAt).toBeDefined();
      expect(closedWo?.closedByUserId).toBe("user_jordan_lee");
      expect(closedWo?.closedByTechnicianId?.toString()).toBe(techId.toString());
      expect(closedWo?.returnedToService).toBe(true);

      // ── Assert: aircraft total time updated to close reading (INV-18)
      const updatedAircraft = await t.run(async (ctx) => ctx.db.get(aircraftId as any));
      expect(updatedAircraft?.totalTimeAirframeHours).toBe(3210.5);

      // ── Assert: close auth event consumed (INV-05)
      const consumedCloseEvent = await t.run(async (ctx) => ctx.db.get(closeAuthEvent as any));
      expect(consumedCloseEvent?.consumed).toBe(true);
      expect(consumedCloseEvent?.consumedByTable).toBe("workOrders");
    }
  );

  it(
    "TC-WO-HP-02: openWorkOrder transitions WO from draft to open and sets aircraftTotalTimeAtOpen",
    async () => {
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 1500.0 });
      const techId = await seedTechnicianWithCert(t, orgId);

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0002",
        workOrderType: "routine",
        description: "Routine oil change.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 1500.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_jordan_lee",
      });

      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("open");
      expect(wo?.aircraftTotalTimeAtOpen).toBe(1500.0);
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: INVARIANT — Cannot close WO with open task cards
// ─────────────────────────────────────────────────────────────────────────────

describe("Work Order Engine — Invariant: Cannot close WO with open task cards", () => {
  it(
    "TC-WO-INV-01: closeWorkOrder throws when a task card is still in_progress (not complete)",
    async () => {
      /**
       * Failure mode guarded:
       *   closeWorkOrder permits closure while a task card has status "in_progress".
       *   This would result in a signed maintenance record with incomplete task work —
       *   a falsified 14 CFR 43.9 entry. The mutation MUST throw, not warn.
       *
       * What we set up:
       *   A WO in pending_signoff with one task card that is "in_progress"
       *   (one step signed, one step still pending). Close attempt must fail.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4000.0 });
      const techId = await seedTechnicianWithCert(t, orgId, { withIa: true });

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0003",
        workOrderType: "100hr_inspection",
        description: "Test — incomplete task card blocks close.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 4000.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_jordan_lee",
      });

      const taskCardId = await t.mutation(addTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-001",
        title: "Incomplete card",
        taskType: "inspection",
        approvedDataSource: "AMM 05-20-00",
        steps: [
          {
            stepNumber: 1,
            description: "Step one — will be signed.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 2,
            description: "Step two — will NOT be signed.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_jordan_lee",
      });

      // Sign only step 1 — leave step 2 pending
      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );
      const authEvent = await seedAuthEvent(t, techId);

      await t.mutation(completeTaskCard, {
        taskCardId: taskCardId as any,
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        stepCompletions: [
          {
            stepId: steps.find((s) => s.stepNumber === 1)!._id,
            action: "complete",
            signatureAuthEventId: authEvent as any,
            ratingsExercised: ["airframe"],
          },
        ],
        callerUserId: "user_jordan_lee",
        callerTechnicianId: techId as any,
      });

      // Task card should now be in_progress (1 of 2 steps done)
      const card = await t.run(async (ctx) => ctx.db.get(taskCardId));
      expect(card?.status).toBe("in_progress");

      // Advance WO to pending_signoff state (bypass state machine for this test — we're
      // testing closeWorkOrder's own guard, not the transition guards before it)
      await t.run(async (ctx) => {
        await ctx.db.patch(workOrderId as any, { status: "pending_signoff" });
      });

      const closeAuth = await seedAuthEvent(t, techId, { intendedTable: "workOrders" });
      await seedRtsRecord(t, workOrderId, aircraftId, orgId, techId, closeAuth, 4010.0);

      // ── Assert: closeWorkOrder MUST throw because task card is not complete
      await expect(
        t.mutation(closeWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtClose: 4010.0,
          closingTechnicianId: techId as any,
          returnToServiceStatement:
            "Aircraft approved for return to service per 14 CFR § 43.11.",
          signatureAuthEventId: closeAuth as any,
          callerUserId: "user_jordan_lee",
        })
      ).rejects.toThrow();

      // WO must still be pending_signoff — not closed
      const stillOpen = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(stillOpen?.status).toBe("pending_signoff");
    }
  );

  it(
    "TC-WO-INV-02: closeWorkOrder succeeds once all task cards are complete",
    async () => {
      /**
       * Companion to TC-WO-INV-01.
       * Proves the guard is gated on task card status, not on a timer or other side-effect.
       * Setup is identical to TC-WO-INV-01 except both steps are signed.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4000.0 });
      const techId = await seedTechnicianWithCert(t, orgId, { withIa: true });

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0004",
        workOrderType: "100hr_inspection",
        description: "Test — all task cards complete allows close.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 4000.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_jordan_lee",
      });

      const taskCardId = await t.mutation(addTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-001",
        title: "Complete card",
        taskType: "inspection",
        approvedDataSource: "AMM 05-20-00",
        steps: [
          {
            stepNumber: 1,
            description: "Step one.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 2,
            description: "Step two.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_jordan_lee",
      });

      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", taskCardId as any))
          .collect()
      );

      const auth1 = await seedAuthEvent(t, techId);
      const auth2 = await seedAuthEvent(t, techId);

      await t.mutation(completeTaskCard, {
        taskCardId: taskCardId as any,
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        stepCompletions: [
          {
            stepId: steps[0]._id,
            action: "complete",
            signatureAuthEventId: auth1 as any,
            ratingsExercised: ["airframe"],
          },
          {
            stepId: steps[1]._id,
            action: "complete",
            signatureAuthEventId: auth2 as any,
            ratingsExercised: ["airframe"],
          },
        ],
        callerUserId: "user_jordan_lee",
        callerTechnicianId: techId as any,
      });

      await t.run(async (ctx) => {
        await ctx.db.patch(workOrderId as any, { status: "pending_signoff" });
      });

      const closeAuth = await seedAuthEvent(t, techId, { intendedTable: "workOrders" });
      await seedRtsRecord(t, workOrderId, aircraftId, orgId, techId, closeAuth, 4010.0);

      await expect(
        t.mutation(closeWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtClose: 4010.0,
          closingTechnicianId: techId as any,
          returnToServiceStatement:
            "Aircraft approved for return to service per 14 CFR § 43.11.",
          signatureAuthEventId: closeAuth as any,
          callerUserId: "user_jordan_lee",
        })
      ).resolves.not.toThrow();

      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("closed");
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: INVARIANT — Cannot open two concurrent WOs on same aircraft
// ─────────────────────────────────────────────────────────────────────────────

describe("Work Order Engine — Invariant: Concurrent WO guard", () => {
  it(
    "TC-WO-INV-03: openWorkOrder throws when aircraft already has an open WO " +
      "and no override is provided",
    async () => {
      /**
       * Failure mode guarded:
       *   Two work orders opened simultaneously on the same aircraft without
       *   explicit acknowledgement. The two WOs' maintenance records could describe
       *   conflicting aircraft states — both claiming to be the authoritative record
       *   at the same aircraft hours. This is a chain-of-custody failure.
       *
       * The guard: openWorkOrder queries by_aircraft_status for any WO in
       * open/in_progress/pending_inspection/pending_signoff/open_discrepancies.
       * If one exists without override flag, it throws.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 2000.0 });
      const techId = await seedTechnicianWithCert(t, orgId);

      // Open the first WO
      const wo1Id = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0005",
        workOrderType: "routine",
        description: "First WO — open.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: wo1Id as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 2000.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_jordan_lee",
      });

      const wo1 = await t.run(async (ctx) => ctx.db.get(wo1Id));
      expect(wo1?.status).toBe("open"); // First WO is open

      // Create second WO on the same aircraft
      const wo2Id = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0006",
        workOrderType: "unscheduled",
        description: "Second WO — should be blocked.",
        priority: "urgent",
        callerUserId: "user_jordan_lee",
      });

      // ── Assert: opening second WO on same aircraft without override throws
      await expect(
        t.mutation(openWorkOrder, {
          workOrderId: wo2Id as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtOpen: 2000.0,
          assignedTechnicianIds: [techId as any],
          // No override acknowledged
          callerUserId: "user_jordan_lee",
        })
      ).rejects.toThrow(/concurrent/i);

      // The second WO must remain in draft — not opened
      const wo2 = await t.run(async (ctx) => ctx.db.get(wo2Id));
      expect(wo2?.status).toBe("draft");
    }
  );

  it(
    "TC-WO-INV-04: openWorkOrder succeeds with concurrentWorkOrderOverrideAcknowledged=true " +
      "and a non-empty reason — override path must work",
    async () => {
      /**
       * Failure mode guarded:
       *   The concurrent override path is broken — legitimate concurrent WOs
       *   (e.g., customer-requested warranty work alongside scheduled inspection)
       *   cannot be opened even with documented justification. The override
       *   fields exist precisely for this scenario.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 2000.0 });
      const techId = await seedTechnicianWithCert(t, orgId);

      const wo1Id = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0007",
        workOrderType: "routine",
        description: "First WO.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: wo1Id as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 2000.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_jordan_lee",
      });

      const wo2Id = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0008",
        workOrderType: "unscheduled",
        description: "Warranty work — concurrent with scheduled inspection.",
        priority: "urgent",
        callerUserId: "user_jordan_lee",
      });

      await expect(
        t.mutation(openWorkOrder, {
          workOrderId: wo2Id as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtOpen: 2000.0,
          assignedTechnicianIds: [techId as any],
          concurrentWorkOrderOverrideAcknowledged: true,
          concurrentWorkOrderReason:
            "Manufacturer warranty campaign requires simultaneous access. DOM authorization on file.",
          callerUserId: "user_jordan_lee",
        })
      ).resolves.not.toThrow();

      const wo2 = await t.run(async (ctx) => ctx.db.get(wo2Id));
      expect(wo2?.status).toBe("open");
      expect(wo2?.concurrentWorkOrderOverrideAcknowledged).toBe(true);
      expect(wo2?.concurrentWorkOrderReason).toBeTruthy();
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: INVARIANT — Monotonic TT enforcement (INV-06 / INV-18)
// ─────────────────────────────────────────────────────────────────────────────

describe("Work Order Engine — Invariant: Monotonic total time (INV-06 / INV-18)", () => {
  it(
    "TC-WO-INV-05: closeWorkOrder throws when aircraftTotalTimeAtClose < aircraftTotalTimeAtOpen",
    async () => {
      /**
       * Failure mode guarded:
       *   An aircraft logbook entry shows less total time at work order close than at open.
       *   This is the single most common indicator of falsified logbooks in FAA enforcement
       *   actions (per Marcus Webb). The mutation MUST throw — not warn, not flag for review.
       *   The test verifies that a 1-hour regression (3210 → 3209) is hard-rejected.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 3209.0 });
      const techId = await seedTechnicianWithCert(t, orgId, { withIa: true });

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0009",
        workOrderType: "100hr_inspection",
        description: "TT monotonicity test.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 3210.0, // recorded at 3210 when opened
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_jordan_lee",
      });

      await t.run(async (ctx) => {
        await ctx.db.patch(workOrderId as any, { status: "pending_signoff" });
      });

      const closeAuth = await seedAuthEvent(t, techId, { intendedTable: "workOrders" });
      await seedRtsRecord(t, workOrderId, aircraftId, orgId, techId, closeAuth, 3209.0);

      // ── Assert: close with TT 3209 < open TT 3210 must throw (INV-06 / INV-18)
      await expect(
        t.mutation(closeWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtClose: 3209.0, // ← LESS than atOpen of 3210
          closingTechnicianId: techId as any,
          returnToServiceStatement:
            "Aircraft approved for return to service per 14 CFR § 43.11.",
          signatureAuthEventId: closeAuth as any,
          callerUserId: "user_jordan_lee",
        })
      ).rejects.toThrow(/INV-06|INV-18|monoton|decreas|less than|falsif/i);

      // WO must not be closed
      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).not.toBe("closed");
      expect(wo?.aircraftTotalTimeAtClose).toBeUndefined();
    }
  );

  it(
    "TC-WO-INV-06: closeWorkOrder throws when aircraftTotalTimeAtClose exactly equals atOpen " +
      "— zero-time maintenance is allowed (e.g., line maintenance with no flight between open and close)",
    async () => {
      /**
       * Failure mode guarded:
       *   A guard implementation that uses strict greater-than (>) instead of
       *   greater-than-or-equal (≥) would reject legitimate line maintenance
       *   where the aircraft hasn't flown between WO open and close.
       *   atClose == atOpen is valid. This test proves the boundary condition.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 5000.0 });
      const techId = await seedTechnicianWithCert(t, orgId, { withIa: true });

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0010",
        workOrderType: "routine",
        description: "Line maintenance — aircraft on ground entire time.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 5000.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_jordan_lee",
      });

      await t.run(async (ctx) => {
        await ctx.db.patch(workOrderId as any, { status: "pending_signoff" });
      });

      const closeAuth = await seedAuthEvent(t, techId, { intendedTable: "workOrders" });
      await seedRtsRecord(t, workOrderId, aircraftId, orgId, techId, closeAuth, 5000.0);

      // atClose == atOpen == 5000.0 — this must NOT throw
      await expect(
        t.mutation(closeWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtClose: 5000.0, // ← EQUAL to atOpen
          closingTechnicianId: techId as any,
          returnToServiceStatement:
            "Aircraft approved for return to service per 14 CFR § 43.9.",
          signatureAuthEventId: closeAuth as any,
          callerUserId: "user_jordan_lee",
        })
      ).resolves.not.toThrow();

      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("closed");
      expect(wo?.aircraftTotalTimeAtClose).toBe(5000.0);
    }
  );

  it(
    "TC-WO-INV-07: openWorkOrder throws when aircraftTotalTimeAtOpen < aircraft.totalTimeAirframeHours",
    async () => {
      /**
       * Failure mode guarded:
       *   A technician enters a total time at open that is lower than the aircraft's
       *   last known total time. This is either a data entry error or a falsification attempt.
       *   Both are caught by the same guard (INV-18 partial enforcement at open).
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      // Aircraft's last known TT is 3200.5
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 3200.5 });
      const techId = await seedTechnicianWithCert(t, orgId);

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0011",
        workOrderType: "routine",
        description: "TT at open less than last known — must throw.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await expect(
        t.mutation(openWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtOpen: 3100.0, // ← less than aircraft's last known 3200.5
          assignedTechnicianIds: [techId as any],
          callerUserId: "user_jordan_lee",
        })
      ).rejects.toThrow(/INV-18|monoton|less than|last known/i);

      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("draft"); // must remain draft
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: VOID GUARD — Cannot void a WO with signed maintenance records
// ─────────────────────────────────────────────────────────────────────────────

describe("Work Order Engine — Void Guard: signed records block voidWorkOrder", () => {
  it(
    "TC-WO-VOID-01: voidWorkOrder throws when a signed maintenanceRecord is linked to the WO",
    async () => {
      /**
       * Failure mode guarded:
       *   voidWorkOrder succeeds on a WO that has a signed maintenance record.
       *   A signed maintenance record is an immutable legal document. If its parent
       *   WO is voided, the chain of custody is broken — the record exists with no
       *   parent. Under 14 CFR 43.9 and AC 43-9C, the work order number on a
       *   maintenance record is its permanent chain-of-custody anchor.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId);
      const techId = await seedTechnicianWithCert(t, orgId);

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0012",
        workOrderType: "routine",
        description: "WO with signed record — void must be rejected.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 3200.5,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_jordan_lee",
      });

      // Seed a signed maintenance record linked to this WO
      const authEvent = await seedAuthEvent(t, techId);
      await seedMaintenanceRecord(t, workOrderId, aircraftId, orgId, techId, authEvent);

      // ── Assert: void must fail because a signed record exists
      await expect(
        t.mutation(voidWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          voidedReason: "Created in error.",
          callerUserId: "user_jordan_lee",
          callerTechnicianId: techId as any,
        })
      ).rejects.toThrow(/signed|maintenance record|immutable|legal/i);

      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("open"); // must remain open, not voided
    }
  );

  it(
    "TC-WO-VOID-02: voidWorkOrder succeeds on a draft WO with no signed records — " +
      "sets voidedByUserId, voidedAt, voidedReason (all three void fields required)",
    async () => {
      /**
       * Failure mode guarded:
       *   voidWorkOrder on a draft WO with no signed records fails for some reason
       *   (e.g., status guard is too restrictive), OR succeeds but doesn't set
       *   all three required void fields (voidedByUserId, voidedAt, voidedReason).
       *   The three fields are required — their absence is an audit gap.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId);
      const techId = await seedTechnicianWithCert(t, orgId);

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0013",
        workOrderType: "routine",
        description: "Draft WO — void allowed.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await t.mutation(voidWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        voidedReason: "Duplicate entry — WO-2026-0001 is the correct record.",
        callerUserId: "user_jordan_lee",
        callerTechnicianId: techId as any,
      });

      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("voided");
      expect(wo?.voidedByUserId).toBe("user_jordan_lee");
      expect(wo?.voidedAt).toBeDefined();
      expect(wo?.voidedReason).toBe("Duplicate entry — WO-2026-0001 is the correct record.");
    }
  );

  it(
    "TC-WO-VOID-03: voidWorkOrder throws when status is in_progress " +
      "— in-progress WOs cannot be voided",
    async () => {
      /**
       * Failure mode guarded:
       *   voidWorkOrder is called on a WO that has work in progress.
       *   An in-progress WO may have unsigned task card steps. Even without signed
       *   maintenance records, the work that has been done needs to be accounted for —
       *   this requires the DOM's involvement, not an administrative void.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId);
      const techId = await seedTechnicianWithCert(t, orgId);

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-2026-0014",
        workOrderType: "routine",
        description: "In-progress WO.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 3200.5,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_jordan_lee",
      });

      // Add a task card → transitions WO to in_progress
      await t.mutation(addTaskCard, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        taskCardNumber: "TC-001",
        title: "Some work",
        taskType: "repair",
        approvedDataSource: "AMM 27-10-00",
        steps: [
          {
            stepNumber: 1,
            description: "Work step.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
        ],
        callerUserId: "user_jordan_lee",
      });

      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("in_progress");

      await expect(
        t.mutation(voidWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          voidedReason: "Trying to void an in-progress WO.",
          callerUserId: "user_jordan_lee",
          callerTechnicianId: techId as any,
        })
      ).rejects.toThrow(/in.progress|voidable|cannot void|status/i);
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: AUTH CHECKS — Cannot create WO without valid org context
// ─────────────────────────────────────────────────────────────────────────────

describe("Work Order Engine — Auth checks: organization context required", () => {
  it(
    "TC-WO-AUTH-01: createWorkOrder throws when organizationId references a non-existent org",
    async () => {
      /**
       * Failure mode guarded:
       *   A mutation accepts a fabricated or stale organizationId and creates a
       *   work order with no valid org anchor. The resulting WO would have no
       *   regulatory owner — an FAA inspection would find a maintenance record with
       *   no repair station of record.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId);

      const fakeOrgId = "nonexistent_org_id_00000000000";

      await expect(
        t.mutation(createWorkOrder, {
          organizationId: fakeOrgId as any,
          aircraftId: aircraftId as any,
          workOrderNumber: "WO-FAKE-001",
          workOrderType: "routine",
          description: "This should not be created.",
          priority: "routine",
          callerUserId: "user_jordan_lee",
        })
      ).rejects.toThrow();
    }
  );

  it(
    "TC-WO-AUTH-02: createWorkOrder throws when organizationId is valid but the org is inactive",
    async () => {
      /**
       * Failure mode guarded:
       *   Work order created against a deactivated organization.
       *   An inactive org may no longer hold its Part 145 certificate —
       *   any maintenance produced under that context would be unauthorized.
       */
      const t = convexTest(schema);
      const orgId = await t.run(async (ctx) => {
        return ctx.db.insert("organizations", {
          name: "Defunct MRO LLC",
          part145Ratings: [],
          address: "1 Closed St",
          city: "Phoenix",
          state: "AZ",
          zip: "85001",
          country: "US",
          subscriptionTier: "starter",
          active: false, // ← inactive
          createdAt: NOW,
          updatedAt: NOW,
        });
      });

      const aircraftId = await seedAircraft(t, orgId);

      await expect(
        t.mutation(createWorkOrder, {
          organizationId: orgId as any,
          aircraftId: aircraftId as any,
          workOrderNumber: "WO-INACTIVE-001",
          workOrderType: "routine",
          description: "Inactive org — must reject.",
          priority: "routine",
          callerUserId: "user_jordan_lee",
        })
      ).rejects.toThrow(/inactive|not found|organization/i);
    }
  );

  it(
    "TC-WO-AUTH-03: createWorkOrder throws on duplicate work order number within same org (INV-14)",
    async () => {
      /**
       * Failure mode guarded:
       *   Two work orders in the same organization share the same work order number.
       *   An FAA inspector querying by WO number gets two results — both are now suspect.
       *   INV-14 requires uniqueness; this test proves the mutation enforces it.
       *
       *   NOTE: A voided WO still occupies its number. The second insert attempt
       *   must fail regardless of the first WO's status.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId);

      // First WO — should succeed
      await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-DUPE-001",
        workOrderType: "routine",
        description: "Original WO.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      // Second WO with same number in same org — must throw (INV-14)
      await expect(
        t.mutation(createWorkOrder, {
          organizationId: orgId as any,
          aircraftId: aircraftId as any,
          workOrderNumber: "WO-DUPE-001", // ← duplicate
          workOrderType: "unscheduled",
          description: "Duplicate WO — should be rejected.",
          priority: "routine",
          callerUserId: "user_jordan_lee",
        })
      ).rejects.toThrow(/INV-14|already exists|duplicate|unique/i);
    }
  );

  it(
    "TC-WO-AUTH-04: same work order number in DIFFERENT organizations is allowed",
    async () => {
      /**
       * Failure mode guarded:
       *   INV-14 enforcement is too broad — it rejects WO numbers that are unique
       *   within their org but happen to match a WO in another org.
       *   The uniqueness constraint is per-organization, not global.
       */
      const t = convexTest(schema);
      const org1Id = await seedOrganization(t);
      const org2Id = await t.run(async (ctx) => {
        return ctx.db.insert("organizations", {
          name: "Second MRO Inc.",
          part145Ratings: [],
          address: "2 Ramp Way",
          city: "Phoenix",
          state: "AZ",
          zip: "85001",
          country: "US",
          subscriptionTier: "starter",
          active: true,
          createdAt: NOW,
          updatedAt: NOW,
        });
      });
      const aircraft1Id = await seedAircraft(t, org1Id);
      const aircraft2Id = await seedAircraft(t, org2Id);

      // Same number in org1
      await t.mutation(createWorkOrder, {
        organizationId: org1Id as any,
        aircraftId: aircraft1Id as any,
        workOrderNumber: "WO-2026-0001",
        workOrderType: "routine",
        description: "Org 1 WO.",
        priority: "routine",
        callerUserId: "user_jordan_lee",
      });

      // Same number in org2 — must succeed
      await expect(
        t.mutation(createWorkOrder, {
          organizationId: org2Id as any,
          aircraftId: aircraft2Id as any,
          workOrderNumber: "WO-2026-0001", // ← same number, DIFFERENT org
          workOrderType: "routine",
          description: "Org 2 WO — same number, different org, should be fine.",
          priority: "routine",
          callerUserId: "user_jordan_lee",
        })
      ).resolves.not.toThrow();
    }
  );
});
