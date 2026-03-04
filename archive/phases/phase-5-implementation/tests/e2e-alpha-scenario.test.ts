/**
 * e2e-alpha-scenario.test.ts
 * End-to-End Alpha Scenario — Definition of Done
 *
 * Author:  Cilla Oduya (QA Lead)
 * Date:    2026-02-22
 * Phase:   5 — MVP
 * Basis:   phase-5-mvp/mvp-scope.md (Definition of Done scenario)
 *          phase-5-implementation/convex/schema-v3.ts
 *          phase-5-implementation/wave-1/pre-signature-summary-component.md
 *
 * This file is the machine-executable version of the Definition of Done scenario.
 * It tests exactly what mvp-scope.md says must work end-to-end on the deployed
 * system — without manual database intervention, without workarounds, without
 * anyone saying "we'll fix that later."
 *
 * CAST:
 *   Gary   — Director of Maintenance, holds IA certificate (DOM authorizes RTS)
 *   Troy   — A&P mechanic, NO IA (performs the work, signs task card steps)
 *   Pat    — Senior A&P / IA holder (inspection sign-off on IA-required steps)
 *   Linda  — QCM (Quality Control Manager; performs post-close review)
 *
 * SCENARIO:
 *   100-hour inspection on N1234A (Cessna 172, S/N C172-98712), 2,347.4 TT at open.
 *   Torque wrench S/N TW-2847 used for torque-critical fasteners (calibration current).
 *   Reference: C172 Maintenance Manual Chapter 5-10-00.
 *
 * STEP ORDERING NOTE:
 *   The task description lists "Linda creates QCM review" as Step 9, before the RTS
 *   authorization (Step 11). However, schema invariant INV-24 requires workOrder.status ==
 *   "closed" before a qcmReviews record can be created. The correct regulatory sequence
 *   is: close readiness → RTS/close → QCM review. This file implements that correct order.
 *   Step labels match the Definition of Done numbering; execution order follows invariants.
 *
 * INVARIANT COVERAGE:
 *   INV-05  signatureAuthEvent single-consumption
 *   INV-06  aircraftTotalTimeAtClose >= atOpen
 *   INV-09  task card complete only when all steps resolved
 *   INV-10  per-step audit trail
 *   INV-13  IA expiry required when hasIaAuthorization == true
 *   INV-18  aircraft TT monotonically increasing
 *   INV-20  returnToServiceStatement required when returnedToService
 *   INV-24  QCM review requires closed work order
 *   INV-25  QCM reviewer must be org's qualityControlManagerId
 *   INV-26  findingsNotes required when outcome != "accepted"
 *   v3 INV-22  testEquipment: calibrationExpiryDate > calibrationDate
 *   v3 INV-23  pending_inspection parts are not issuable
 */

import { describe, it, expect, beforeAll } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import type { Id } from "../../convex/_generated/dataModel";

// ─── Phase 3 mutations (already implemented) ─────────────────────────────────
import { createWorkOrder }          from "../../convex/mutations/workOrders/createWorkOrder";
import { openWorkOrder }             from "../../convex/mutations/workOrders/openWorkOrder";
import { createTaskCard }            from "../../convex/mutations/taskCards/createTaskCard";
import { completeStep }              from "../../convex/mutations/taskCards/completeStep";
import { signTaskCard }              from "../../convex/mutations/taskCards/signTaskCard";

// ─── Phase 5 mutations (new — will fail to compile until implementations exist) ──
import { createTestEquipment }       from "../../convex/mutations/testEquipment/createTestEquipment";
import { createMaintenanceRecord }   from "../../convex/mutations/maintenanceRecords/createMaintenanceRecord";
import { createInspectionRecord }    from "../../convex/mutations/inspectionRecords/createInspectionRecord";
import { authorizeReturnToService }  from "../../convex/mutations/returnToService/authorizeReturnToService";
import { createQcmReview }           from "../../convex/mutations/qcmReviews/createQcmReview";

// ─── Phase 5 queries (new) ────────────────────────────────────────────────────
import { getPreSignatureSummary }         from "../../convex/queries/signOff/getPreSignatureSummary";
import { getWorkOrderCloseReadinessV2 }   from "../../convex/queries/workOrders/getWorkOrderCloseReadinessV2";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const NOW = Date.now();
const FIVE_MINUTES_MS    = 5  * 60 * 1000;
const ONE_YEAR_MS        = 365 * 24 * 60 * 60 * 1000;
const SIX_MONTHS_MS      = 180 * 24 * 60 * 60 * 1000;

// Aircraft under test
const N_NUMBER           = "N1234A";
const AIRCRAFT_SERIAL    = "C172-98712";
const INITIAL_TT_HOURS   = 2300.0;  // Aircraft's recorded TT before the work order
const TT_AT_OPEN         = 2347.4;  // TT at work order open (Gary enters this in Step 2)
const TT_AT_CLOSE        = 2347.4;  // No flight during maintenance — TT unchanged at close

// Approved data reference (C172 Maintenance Manual)
const AMM_REF            = "C172 MM Chapter 5-10-00";
const AMM_REF_REVISION   = "Rev 2025-12";

// Torque wrench used for fastener torque verification
const TORQUE_WRENCH_PN   = "SW-3/8-250";
const TORQUE_WRENCH_SN   = "TW-2847";
const TORQUE_WRENCH_CAL_CERT = "NIST-CAL-TW-2847-2025";
const TORQUE_WRENCH_CAL_DATE = NOW - 60 * 24 * 60 * 60 * 1000;         // 60 days ago
const TORQUE_WRENCH_CAL_EXPIRY = NOW + 305 * 24 * 60 * 60 * 1000;      // ~10 months from now (current)

// Work performed description (must be >= 50 characters per mvp-scope.md §Schema Changes)
const WORK_PERFORMED_DESC =
  "Performed 100-hour inspection per C172 Maintenance Manual Chapter 5-10-00 Rev 2025-12. " +
  "Inspected engine, fuel system, flight controls, landing gear, and propeller. " +
  "Torqued all critical fasteners per AMM limits. All items found within serviceable limits.";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STATE — populated incrementally as each step executes
// Each `it()` block writes to this object and asserts state from prior steps.
// Tests run sequentially within a describe block (Vitest default).
// ─────────────────────────────────────────────────────────────────────────────

let t: ReturnType<typeof convexTest>;

// IDs of all records created during the scenario
const S: {
  orgId:                Id<"organizations"> | null;
  garyId:               Id<"technicians">   | null;  // DOM, IA
  troyId:               Id<"technicians">   | null;  // A&P, no IA
  patId:                Id<"technicians">   | null;  // A&P + IA
  lindaId:              Id<"technicians">   | null;  // QCM
  aircraftId:           Id<"aircraft">      | null;
  workOrderId:          Id<"workOrders">    | null;
  taskCardId:           Id<"taskCards">     | null;
  taskCardStepIds:      Id<"taskCardSteps">[];
  torqueWrenchId:       Id<"testEquipment"> | null;
  maintenanceRecordId:  Id<"maintenanceRecords"> | null;
  inspectionRecordId:   Id<"inspectionRecords">  | null;
  rtsId:                Id<"returnToService">    | null;
  qcmReviewId:          Id<"qcmReviews">         | null;
} = {
  orgId:               null,
  garyId:              null,
  troyId:              null,
  patId:               null,
  lindaId:             null,
  aircraftId:          null,
  workOrderId:         null,
  taskCardId:          null,
  taskCardStepIds:     [],
  torqueWrenchId:      null,
  maintenanceRecordId: null,
  inspectionRecordId:  null,
  rtsId:               null,
  qcmReviewId:         null,
};

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE SEED HELPERS
// Direct ctx.db inserts — used only to establish pre-test state.
// Assertions use mutations and queries, not direct inserts.
// ─────────────────────────────────────────────────────────────────────────────

async function seedOrganization() {
  return t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Skyline MRO Inc.",
      part145CertificateNumber: "ODSO145R0042",
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
    })
  );
}

/**
 * Seed a technician and their certificate(s).
 * Returns the technician ID.
 *
 * iaExpiryDateOverride — pass a past timestamp to simulate an expired IA.
 *   Default when withIa=true is March 31 of next year (current IA).
 */
async function seedTechnician(opts: {
  legalName: string;
  userId: string;
  employeeId: string;
  orgId: Id<"organizations">;
  withIa: boolean;
  certNumber: string;
  iaExpiryDateOverride?: number;
}) {
  return t.run(async (ctx) => {
    const techId = await ctx.db.insert("technicians", {
      legalName: opts.legalName,
      userId: opts.userId,
      employeeId: opts.employeeId,
      organizationId: opts.orgId,
      status: "active",
      email: `${opts.userId.replace("user_", "")}@skylinemro.com`,
      createdAt: NOW,
      updatedAt: NOW,
    });

    // Current IA expiry: March 31 of next calendar year
    const nextMarch31 = new Date(new Date().getFullYear() + 1, 2, 31, 23, 59, 59).getTime();

    await ctx.db.insert("certificates", {
      technicianId: techId,
      certificateType: "A&P",
      certificateNumber: opts.certNumber,
      issueDate: NOW - ONE_YEAR_MS * 5,
      ratings: ["airframe", "powerplant"],
      hasIaAuthorization: opts.withIa,
      iaExpiryDate: opts.withIa
        ? (opts.iaExpiryDateOverride ?? nextMarch31)
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

async function seedAircraft(orgId: Id<"organizations">) {
  return t.run(async (ctx) =>
    ctx.db.insert("aircraft", {
      make: "Cessna",
      model: "172S",
      series: "Skyhawk",
      serialNumber: AIRCRAFT_SERIAL,
      currentRegistration: N_NUMBER,
      experimental: false,
      aircraftCategory: "normal",
      engineCount: 1,
      totalTimeAirframeHours: INITIAL_TT_HOURS,
      totalTimeAirframeAsOfDate: NOW,
      status: "in_maintenance",
      operatingOrganizationId: orgId,
      operatingRegulation: "part_91",
      createdByOrganizationId: orgId,
      createdAt: NOW,
      updatedAt: NOW,
    })
  );
}

/**
 * Seed a torque wrench test equipment record (S/N TW-2847, calibration current).
 * Used in Step 5 when Troy creates the maintenance record.
 */
async function seedTorqueWrench(orgId: Id<"organizations">, opts: { expired?: boolean } = {}) {
  return t.run(async (ctx) =>
    ctx.db.insert("testEquipment", {
      organizationId: orgId,
      partNumber: TORQUE_WRENCH_PN,
      serialNumber: TORQUE_WRENCH_SN,
      equipmentName: "Snap-on Torque Wrench 3/8 Drive 250 in-lb",
      manufacturer: "Snap-on Tools",
      equipmentType: "torque_wrench",
      calibrationCertNumber: TORQUE_WRENCH_CAL_CERT,
      calibrationDate: opts.expired
        ? NOW - ONE_YEAR_MS * 2         // 2 years ago
        : TORQUE_WRENCH_CAL_DATE,       // 60 days ago
      calibrationExpiryDate: opts.expired
        ? NOW - ONE_YEAR_MS             // Expired 1 year ago
        : TORQUE_WRENCH_CAL_EXPIRY,     // ~10 months from now
      calibrationPerformedBy: "National Calibration Services Inc.",
      status: opts.expired ? "expired" : "current",
      createdAt: NOW,
      updatedAt: NOW,
    })
  );
}

/**
 * Seed a valid, unconsumed signatureAuthEvent for a given technician.
 * The event expires 4 minutes from now by default (within 5-minute window).
 */
async function seedAuthEvent(
  techId: Id<"technicians">,
  userId: string,
  certNumber: string,
  opts: {
    expired?: boolean;
    consumed?: boolean;
    intendedTable?: string;
    legalName?: string;
  } = {}
) {
  return t.run(async (ctx) =>
    ctx.db.insert("signatureAuthEvents", {
      clerkEventId: `clerk_evt_${Math.random().toString(36).slice(2, 12)}`,
      clerkSessionId: `sess_${Math.random().toString(36).slice(2, 12)}`,
      userId,
      technicianId: techId,
      authenticatedLegalName: opts.legalName ?? "Unknown",
      authenticatedCertNumber: certNumber,
      authMethod: "pin",
      intendedTable: opts.intendedTable ?? "taskCardSteps",
      authenticatedAt: NOW,
      expiresAt: opts.expired
        ? NOW - 1_000                         // 1 second in the past
        : NOW + FIVE_MINUTES_MS - 60_000,      // 4 minutes from now
      consumed: opts.consumed ?? false,
      consumedAt: opts.consumed ? NOW - 2_000 : undefined,
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP — runs once before all steps in the scenario
// Seeds the org, technicians, and aircraft.
// Does NOT create the work order — that happens in Step 1.
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  t = convexTest(schema);

  // ── Seed organization ─────────────────────────────────────────────────────
  S.orgId = await seedOrganization();

  // ── Seed technicians ──────────────────────────────────────────────────────
  S.garyId = await seedTechnician({
    legalName:   "Gary Hutchins",
    userId:      "user_gary",
    employeeId:  "EMP001",
    orgId:       S.orgId!,
    withIa:      true,       // Gary is DOM and holds an IA
    certNumber:  "AP441872",
  });

  S.troyId = await seedTechnician({
    legalName:   "Troy Vance",
    userId:      "user_troy",
    employeeId:  "EMP002",
    orgId:       S.orgId!,
    withIa:      false,      // Troy is A&P only — this matters for Step 4 / negative paths
    certNumber:  "AP558934",
  });

  S.patId = await seedTechnician({
    legalName:   "Patricia DeLuca",
    userId:      "user_pat",
    employeeId:  "EMP003",
    orgId:       S.orgId!,
    withIa:      true,       // Pat holds a current IA (verified in Step 8)
    certNumber:  "AP334219",
  });

  S.lindaId = await seedTechnician({
    legalName:   "Linda Paredes",
    userId:      "user_linda",
    employeeId:  "EMP004",
    orgId:       S.orgId!,
    withIa:      false,      // Linda is QCM — cert type doesn't require IA
    certNumber:  "AP772100",
  });

  // ── Wire DOM and QCM onto the organization record ─────────────────────────
  // INV-25 requires reviewedByTechnicianId == org.qualityControlManagerId.
  // We set this now so Linda can create the QCM review in Step 11.
  await t.run(async (ctx) => {
    await ctx.db.patch(S.orgId!, {
      directorOfMaintenanceId:   S.garyId!,
      directorOfMaintenanceName: "Gary Hutchins",
      qualityControlManagerId:   S.lindaId!,
      qualityControlManagerName: "Linda Paredes",
      updatedAt: NOW,
    });
  });

  // ── Seed the test aircraft ────────────────────────────────────────────────
  S.aircraftId = await seedAircraft(S.orgId!);

  // ── Seed torque wrench (S/N TW-2847, calibration current) ────────────────
  // Referenced in Step 5 when Troy creates the maintenance record.
  S.torqueWrenchId = await seedTorqueWrench(S.orgId!);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE 11-STEP DEFINITION OF DONE SCENARIO
// ─────────────────────────────────────────────────────────────────────────────

describe("Alpha E2E Scenario — 100-Hour Inspection, N1234A, Cessna 172", () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Gary creates work order for N1234A
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 1: Gary creates work order WO-2026-001 for N1234A (Cessna 172, 100-hour inspection)",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) createWorkOrder accepts a non-existent aircraft or inactive org — must throw
       *   (b) WO is created but status is not "draft" — precondition for Step 2 fails
       *   (c) workOrderType is not persisted correctly — 100hr_inspection audit trail is broken
       *   (d) aircraftTotalTimeAtOpen sentinel (0) is set as expected until openWorkOrder
       *
       * Gary's explicit concern (REQ-GH-04): signing must be a cryptographic event,
       * not a text field. This WO will eventually hold records that survive scrutiny.
       * The WO is the chain-of-custody anchor for everything that follows.
       */
      S.workOrderId = await t.mutation(createWorkOrder, {
        organizationId:   S.orgId!,
        aircraftId:       S.aircraftId!,
        workOrderNumber:  "WO-2026-001",
        workOrderType:    "100hr_inspection",
        description:      "100-hour inspection per C172 maintenance schedule.",
        priority:         "routine",
        callerUserId:     "user_gary",
      });

      expect(S.workOrderId).toBeDefined();

      const wo = await t.run(async (ctx) => ctx.db.get(S.workOrderId!));

      // Status must be "draft" — Gary has not yet opened the WO or entered TT
      expect(wo?.status).toBe("draft");

      // workOrderType must be exactly "100hr_inspection" — drives regulatory logic downstream
      expect(wo?.workOrderType).toBe("100hr_inspection");

      // Sentinel value: aircraftTotalTimeAtOpen starts at 0 until Gary enters it in Step 2
      // This prevents the WO from looking like a legitimate open record before TT capture
      expect(wo?.aircraftTotalTimeAtOpen).toBe(0);

      // Work order is linked to the correct aircraft and org
      expect(wo?.aircraftId?.toString()).toBe(S.aircraftId!.toString());
      expect(wo?.organizationId?.toString()).toBe(S.orgId!.toString());
      expect(wo?.workOrderNumber).toBe("WO-2026-001");
      expect(wo?.priority).toBe("routine");

      // openedByUserId is Gary's Clerk user ID — immutable chain-of-custody record
      expect(wo?.openedByUserId).toBe("user_gary");
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Gary opens work order, captures aircraft TT at 2,347.4 hours
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 2: Gary opens work order, captures aircraft TT at 2,347.4 hours",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) openWorkOrder accepts aircraftTotalTimeAtOpen < aircraft.totalTimeAirframeHours —
       *       INV-18 must throw. Gary enters 2347.4, aircraft last recorded at 2300.0. Valid.
       *   (b) WO status stays draft after openWorkOrder — Step 3 (task card creation) would fail
       *   (c) aircraftTotalTimeAtOpen is set to a different value than what Gary entered —
       *       the maintenance record and close readiness will use this value for TT reconciliation
       *   (d) Gary is not added to assignedTechnicianIds — acceptable since Troy does the work
       *
       * Aircraft TT at open (2347.4) > aircraft's last recorded TT (2300.0) — passes INV-18.
       * This captures 47.4 hours of flight time since the aircraft's last logbook entry.
       */
      await t.mutation(openWorkOrder, {
        workOrderId:              S.workOrderId!,
        organizationId:           S.orgId!,
        aircraftTotalTimeAtOpen:  TT_AT_OPEN,     // 2347.4 — Gary's physical logbook read
        assignedTechnicianIds:    [S.troyId!],     // Troy assigned as performing mechanic
        callerUserId:             "user_gary",
      });

      const wo = await t.run(async (ctx) => ctx.db.get(S.workOrderId!));

      expect(wo?.status).toBe("open");

      // This is the critical assertion: 2347.4 is the TT of record for this work order.
      // Every downstream mutation that uses aircraft TT derives from this value.
      expect(wo?.aircraftTotalTimeAtOpen).toBe(TT_AT_OPEN);

      // openedAt must be set (required for INV-19 at close)
      expect(wo?.openedAt).toBeDefined();
      expect(wo?.openedAt).toBeGreaterThan(0);

      // Aircraft record must be updated to reflect the new TT reading (INV-18 enforcement)
      const aircraft = await t.run(async (ctx) => ctx.db.get(S.aircraftId!));
      expect(aircraft?.totalTimeAirframeHours).toBe(TT_AT_OPEN);
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Troy is assigned, creates task card for 100-hour inspection items
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 3: Troy creates task card for 100-hour inspection with C172 MM Chapter 5-10-00 reference",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) Task card is created with an empty approvedDataSource — violates 14 CFR 43.9(a)(1).
       *       The AMM reference is required to appear on the pre-signature summary (Step 6).
       *   (b) stepCount doesn't match the steps array length — denormalized counter is wrong
       *   (c) IA-required step (Step 5 of 5) has signOffRequiresIa = false — Pat's sign-off
       *       won't be enforced. The IA currency check in Step 4 depends on this being true.
       *   (d) Task card status is not "not_started" — prior steps executed something unexpectedly
       *
       * Troy creates a 5-step task card. Step 5 requires IA sign-off (Pat's role in Step 4).
       */
      S.taskCardId = await t.mutation(createTaskCard, {
        workOrderId:       S.workOrderId!,
        organizationId:    S.orgId!,
        taskCardNumber:    "TC-100HR-001",
        title:             "100-Hour Inspection — C172 Airframe and Powerplant",
        taskType:          "inspection",
        approvedDataSource:  AMM_REF,          // "C172 MM Chapter 5-10-00"
        approvedDataRevision: AMM_REF_REVISION, // "Rev 2025-12"
        assignedToTechnicianId: S.troyId!,
        steps: [
          {
            stepNumber: 1,
            description: "Inspect engine oil quantity, color, and condition. Check for metal contamination using oil filter cut-open inspection per AMM 5-10-00 §3.a.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 2,
            description: "Inspect all engine compartment hoses and clamps. Check for chafing, cracks, and security per AMM 5-10-00 §3.b. Torque all hose clamps to AMM spec.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 3,
            description: "Inspect landing gear — tires, brakes, strut servicing. Check gear door clearances. Measure brake pad thickness per AMM 5-10-00 §5.a.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 4,
            description: "Inspect propeller blades, hub, and spinner. Check blade tracking within 1/8 inch per AMM 5-10-00 §6.a. Inspect propeller flange for cracks.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: false,
          },
          {
            stepNumber: 5,
            description: "Final airworthiness inspection — complete aircraft conformity review per 14 CFR Part 43 Appendix D. Sign-off requires Inspection Authorization holder.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: true,   // ← PAT signs this step in Step 4 / Step 8
          },
        ],
        callerUserId: "user_troy",
      });

      expect(S.taskCardId).toBeDefined();

      const card = await t.run(async (ctx) => ctx.db.get(S.taskCardId!));

      // Status must be "not_started" — no steps have been touched yet
      expect(card?.status).toBe("not_started");

      // Denormalized step counter must equal the steps array length (5)
      // If this is wrong, the close readiness report will miscount completions
      expect(card?.stepCount).toBe(5);
      expect(card?.completedStepCount).toBe(0);
      expect(card?.naStepCount).toBe(0);

      // The AMM reference is the approved data source — this must match exactly
      // what will appear on the pre-signature summary and maintenance record
      expect(card?.approvedDataSource).toBe(AMM_REF);
      expect(card?.approvedDataRevision).toBe(AMM_REF_REVISION);
      expect(card?.assignedToTechnicianId?.toString()).toBe(S.troyId!.toString());

      // Verify step 5 is IA-required — if this assertion fails, Pat's sign-off
      // enforcement in Step 4 won't trigger and the scenario is invalid
      const steps = await t.run(async (ctx) =>
        ctx.db
          .query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", S.taskCardId!))
          .collect()
      );
      expect(steps).toHaveLength(5);

      const step5 = steps.find((s) => s.stepNumber === 5);
      expect(step5?.signOffRequiresIa).toBe(true);

      // Work order must transition to in_progress now that a task card exists
      const wo = await t.run(async (ctx) => ctx.db.get(S.workOrderId!));
      expect(wo?.status).toBe("in_progress");

      // Capture step IDs for use in Steps 4 and 7
      S.taskCardStepIds = steps
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .map((s) => s._id);
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Troy completes steps 1-4 (A&P); Pat completes step 5 (IA-required)
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 4: Troy completes steps 1-4 (A&P sign-off); Pat completes step 5 with IA authority",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) Troy can sign step 5 (IA-required) with his A&P cert — MUST throw.
       *       This is tested explicitly in the Negative Paths section below.
       *   (b) After Troy signs steps 1-4, task card shows "complete" prematurely —
       *       it must be "in_progress" because step 5 (IA-required) is still pending.
       *   (c) Pat's IA currency is not verified at signing time — INV-10 must enforce this.
       *   (d) signedHasIaOnDate is not set on step 5 — IA currency snapshot is missing.
       *   (e) Auth events are not consumed atomically — steps could be double-signed.
       *
       * Troy signs steps 1-4 with airframe + powerplant ratings.
       * Pat signs step 5 under IA authority (ratingsExercised: ["ia"]).
       */

      // ── Troy signs steps 1-4 ─────────────────────────────────────────────
      const troyStepRatings = ["airframe", "powerplant"] as const;

      for (let i = 0; i < 4; i++) {
        const auth = await seedAuthEvent(
          S.troyId!, "user_troy", "AP558934",
          { legalName: "Troy Vance", intendedTable: "taskCardSteps" }
        );

        await t.mutation(completeStep, {
          stepId:               S.taskCardStepIds[i],
          taskCardId:           S.taskCardId!,
          organizationId:       S.orgId!,
          action:               "complete",
          signatureAuthEventId: auth,
          ratingsExercised:     [...troyStepRatings],
          callerUserId:         "user_troy",
          callerTechnicianId:   S.troyId!,
        });

        // Verify each step is now completed with correct technician and auth event consumed
        const step = await t.run(async (ctx) => ctx.db.get(S.taskCardStepIds[i]));
        expect(step?.status).toBe("completed");
        expect(step?.signedByTechnicianId?.toString()).toBe(S.troyId!.toString());
        expect(step?.signedHasIaOnDate).toBeUndefined(); // A&P step — no IA flag expected

        const consumedAuth = await t.run(async (ctx) => ctx.db.get(auth));
        expect(consumedAuth?.consumed).toBe(true);
        expect(consumedAuth?.consumedByTable).toBe("taskCardSteps");
        expect(consumedAuth?.consumedByRecordId?.toString()).toBe(S.taskCardStepIds[i].toString());
      }

      // After Troy signs steps 1-4, card must still be "in_progress" — step 5 is pending
      const cardAfterTroy = await t.run(async (ctx) => ctx.db.get(S.taskCardId!));
      expect(cardAfterTroy?.status).toBe("in_progress");
      expect(cardAfterTroy?.completedStepCount).toBe(4);

      // ── Pat signs step 5 (IA-required) ───────────────────────────────────
      const patAuth = await seedAuthEvent(
        S.patId!, "user_pat", "AP334219",
        { legalName: "Patricia DeLuca", intendedTable: "taskCardSteps" }
      );

      await t.mutation(completeStep, {
        stepId:               S.taskCardStepIds[4],   // step 5 (index 4)
        taskCardId:           S.taskCardId!,
        organizationId:       S.orgId!,
        action:               "complete",
        signatureAuthEventId: patAuth,
        ratingsExercised:     ["ia"],
        callerUserId:         "user_pat",
        callerTechnicianId:   S.patId!,
      });

      // Step 5 must be completed by Pat with IA currency confirmed
      const step5 = await t.run(async (ctx) => ctx.db.get(S.taskCardStepIds[4]));
      expect(step5?.status).toBe("completed");
      expect(step5?.signedByTechnicianId?.toString()).toBe(S.patId!.toString());

      // signedHasIaOnDate MUST be set to true — this is the immutable record that
      // Pat held a current IA at the moment she signed. If this is false or missing,
      // the inspection sign-off is not defensible before an FAA inspector.
      expect(step5?.signedHasIaOnDate).toBe(true);
      expect(step5?.signedCertificateNumber).toBe("AP334219");

      // After Pat signs step 5, task card must transition to "complete"
      const cardAfterPat = await t.run(async (ctx) => ctx.db.get(S.taskCardId!));
      expect(cardAfterPat?.status).toBe("complete");
      expect(cardAfterPat?.completedStepCount).toBe(5);
      expect(cardAfterPat?.naStepCount).toBe(0);

      // Audit log must have per-step technician_signed entries (INV-10)
      // Step 5 specifically must show Pat as the signer — not Troy
      const step5AuditEntries = await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_record", (q) =>
            q.eq("tableName", "taskCardSteps").eq("recordId", S.taskCardStepIds[4] as any)
          )
          .filter((q) => q.eq(q.field("eventType"), "technician_signed"))
          .collect()
      );
      expect(step5AuditEntries.length).toBeGreaterThanOrEqual(1);
      expect(step5AuditEntries[0].technicianId?.toString()).toBe(S.patId!.toString());
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: Troy creates maintenance record with approved data and test equipment
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 5: Troy creates maintenance record — workPerformed >= 50 chars, C172 MM ref, " +
    "torque wrench S/N TW-2847 (calibration current)",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) workPerformed < 50 characters — mutation must throw citing AC 43-9C.
       *       Linda's explicit requirement: the software must not allow a legally
       *       insufficient maintenance record without friction (mvp-scope.md §Schema Changes).
       *   (b) approvedDataReference is empty — violates 14 CFR 43.9(a)(1). The reference
       *       on the record must be the exact AMM reference, not a placeholder.
       *   (c) testEquipmentUsed is empty when calibrated equipment was used — the FAA
       *       inspector will ask "what equipment was used?" (REQ-DP-01, Dale Purcell).
       *   (d) calibrationCurrentAtUse is computed as true — torque wrench cal expiry is
       *       ~10 months in the future; the mutation must compute this correctly.
       *   (e) The snapshot fields (P/N, S/N, cal cert#, cal expiry) match the testEquipment
       *       record at signing time — snapshotted for immutability.
       *   (f) The signatureHash is not a placeholder (sha256:RTS-HASH-V0-*) — mvp-scope.md
       *       requires the placeholder pattern be replaced entirely.
       *
       * Note: partsReplaced is empty — this is a 100-hour inspection with no replaced parts.
       * The maintenance record documents the inspection work, not parts replacement.
       */
      const troyMrAuth = await seedAuthEvent(
        S.troyId!, "user_troy", "AP558934",
        { legalName: "Troy Vance", intendedTable: "maintenanceRecords" }
      );

      S.maintenanceRecordId = await t.mutation(createMaintenanceRecord, {
        workOrderId:         S.workOrderId!,
        organizationId:      S.orgId!,
        recordType:          "maintenance_43_9",
        workPerformed:       WORK_PERFORMED_DESC,    // 267 chars — well above 50-char minimum
        approvedDataReference: AMM_REF,              // "C172 MM Chapter 5-10-00"
        partsReplaced:       [],
        testEquipmentUsed: [
          {
            testEquipmentId:      S.torqueWrenchId!,
            // Snapshot fields — must match the testEquipment library record at signing time
            partNumber:           TORQUE_WRENCH_PN,
            serialNumber:         TORQUE_WRENCH_SN,
            equipmentName:        "Snap-on Torque Wrench 3/8 Drive 250 in-lb",
            calibrationCertNumber: TORQUE_WRENCH_CAL_CERT,
            calibrationExpiryDate: TORQUE_WRENCH_CAL_EXPIRY,
            // calibrationCurrentAtUse is NOT passed by the caller — the mutation computes it.
            // Caller's value would be ignored; mutation enforces this field.
          },
        ],
        completionDate:      NOW,
        ratingsExercised:    ["airframe", "powerplant"],
        signatureAuthEventId: troyMrAuth,
        callerUserId:        "user_troy",
        callerTechnicianId:  S.troyId!,
      });

      expect(S.maintenanceRecordId).toBeDefined();

      const record = await t.run(async (ctx) => ctx.db.get(S.maintenanceRecordId!));

      // Core content assertions
      expect(record?.recordType).toBe("maintenance_43_9");
      expect(record?.workOrderId?.toString()).toBe(S.workOrderId!.toString());
      expect(record?.workPerformed).toBe(WORK_PERFORMED_DESC);
      expect(record?.workPerformed.length).toBeGreaterThanOrEqual(50);
      expect(record?.approvedDataReference).toBe(AMM_REF);

      // Aircraft identity snapshot — these fields are snapshotted AT signing time
      // and will survive even if the aircraft record is later amended
      expect(record?.aircraftRegistration).toBe(N_NUMBER);
      expect(record?.aircraftSerialNumber).toBe(AIRCRAFT_SERIAL);

      // Organization certificate number must be present (Marcus 4.2)
      // If org has a Part 145 cert, this field must be populated
      expect(record?.organizationCertificateNumber).toBe("ODSO145R0042");

      // Test equipment assertions (v3 INV — calibration traceability)
      expect(record?.testEquipmentUsed).toHaveLength(1);
      const teRef = record?.testEquipmentUsed![0];
      expect(teRef?.serialNumber).toBe(TORQUE_WRENCH_SN);
      expect(teRef?.calibrationCertNumber).toBe(TORQUE_WRENCH_CAL_CERT);

      // calibrationCurrentAtUse MUST be computed by the mutation as true.
      // calibrationExpiryDate (~10 months future) > signatureTimestamp (now) = true.
      // If false: the maintenance record contains a false calibration assertion.
      expect(teRef?.calibrationCurrentAtUse).toBe(true);

      // Signature assertions
      // signatureHash must NOT be the deprecated placeholder pattern (REQ: replace RTS-HASH-V0-*)
      expect(record?.signatureHash).toBeDefined();
      expect(record?.signatureHash).toMatch(/^sha256:/);
      expect(record?.signatureHash).not.toMatch(/RTS-HASH-V0/i);
      expect(record?.signatureTimestamp).toBeGreaterThan(0);
      expect(record?.signingTechnicianId?.toString()).toBe(S.troyId!.toString());

      // Auth event consumed atomically with record creation (INV-05)
      const consumedAuth = await t.run(async (ctx) => ctx.db.get(troyMrAuth));
      expect(consumedAuth?.consumed).toBe(true);
      expect(consumedAuth?.consumedByTable).toBe("maintenanceRecords");

      // Immutability signal: maintenanceRecords must NOT have updatedAt
      // The schema intentionally omits updatedAt as a signal of immutability.
      // If updatedAt is present, the record type's immutability is compromised.
      expect((record as any)?.updatedAt).toBeUndefined();
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: PreSignatureSummary is fetched and validated
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 6: PreSignatureSummary fetched for Troy's maintenance record — " +
    "all 5 sections present, no blocking warnings",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) summary is null (NOT_FOUND) — the query fails to resolve the maintenance record
       *   (b) summary.workPerformed.minimumLengthMet is false — would disable PROCEED TO SIGN
       *       and make it impossible for Troy to sign (falsely blocks a valid record)
       *   (c) summary.technician.certificateNumber is null — would show warning banner and
       *       disable PROCEED TO SIGN. Troy's cert number must be on file.
       *   (d) summary.isIaExpired is true — wrong technician identity resolved from userId
       *   (e) summary.aircraft.registration != N1234A — wrong aircraft linked to WO
       *   (f) Any of the 5 required sections is missing — component would render incomplete
       *
       * The pre-signature summary is the technician's last chance to see what they are
       * signing before they enter their PIN. If it is wrong or incomplete, they may sign
       * a record they didn't intend to. (Gary: "The software is responsible for making
       * that impossible.")
       *
       * The "5 sections" correspond to: RecordIdentity, Aircraft, WorkPerformed,
       * RegulatoryReference (implicit in recordType), TechnicianIdentity.
       *
       * This test uses withIdentity to simulate Troy's authenticated session.
       * The query resolves his certificate number from the technicians table via userId.
       */
      const summary = await t
        .withIdentity({
          subject:    "user_troy",
          name:       "Troy Vance",
          email:      "troy@skylinemro.com",
          // athelon_role drives the certificate type label in the UI
          athelon_role: "A&P",
        })
        .query(getPreSignatureSummary, {
          recordType:   "maintenance_record",
          recordId:     S.maintenanceRecordId!,
          workOrderId:  S.workOrderId!,
        });

      // The query must return a non-null summary.
      // null means UNAUTHENTICATED or NOT_FOUND — both are hard blocks on signing.
      expect(summary).not.toBeNull();
      expect(summary).toBeDefined();

      // ── Section 1: Record Identity ────────────────────────────────────────
      // Must show the correct WO number so Troy can confirm which job he's signing for
      expect(summary.recordIdentity).toBeDefined();
      expect(summary.recordIdentity.workOrderNumber).toBe("WO-2026-001");
      expect(summary.recordIdentity.recordType).toBe("maintenance_record");

      // ── Section 2: Aircraft ───────────────────────────────────────────────
      // N-number must match exactly — wrong tail number on a maintenance record
      // is a falsification (Gary's primary concern from the 2019 AD finding)
      expect(summary.aircraft).toBeDefined();
      expect(summary.aircraft.registration).toBe(N_NUMBER);             // "N1234A"
      expect(summary.aircraft.make).toBe("Cessna");
      expect(summary.aircraft.model).toBe("172S");
      expect(summary.aircraft.serialNumber).toBe(AIRCRAFT_SERIAL);     // "C172-98712"
      expect(summary.aircraft.totalTimeAtOpen).toBe(TT_AT_OPEN);       // 2347.4

      // ── Section 3: Work Performed ─────────────────────────────────────────
      // minimumLengthMet MUST be true — if false, PROCEED TO SIGN is disabled
      // and Troy cannot sign. Since we have 267 chars, this must be true.
      expect(summary.workPerformed).toBeDefined();
      expect(summary.workPerformed.minimumLengthMet).toBe(true);
      expect(summary.workPerformed.approvedDataReference).toBe(AMM_REF);

      // ── Section 4: Regulatory Reference (implicit) ────────────────────────
      // The regulatory text for maintenance_record type is "14 CFR §43.9"
      // The query should return the record type which maps to the regulatory text
      // (the UI component does the text mapping; the query provides the type)
      expect(summary.recordIdentity.recordType).toBe("maintenance_record");
      // requiresIa should be false for a maintenance record (not an inspection step)
      expect(summary.requiresIa).toBe(false);

      // ── Section 5: Technician Identity ───────────────────────────────────
      // certificateNumber MUST be set. If null, PROCEED TO SIGN is disabled.
      // Troy's cert AP558934 must be resolvable from his userId "user_troy".
      expect(summary.technician).toBeDefined();
      expect(summary.technician.fullName).toBe("Troy Vance");
      expect(summary.technician.certificateNumber).not.toBeNull();
      expect(summary.technician.certificateNumber).toBe("AP558934");

      // isIaExpired must be false for Troy (he has no IA — null expiry is not "expired")
      expect(summary.isIaExpired).toBe(false);

      // ── No blocking warnings ──────────────────────────────────────────────
      // The combination of these checks = "no warnings" on the summary:
      //   minimumLengthMet: true    → no 50-char warning
      //   certificateNumber: set    → no missing cert warning
      //   isIaExpired: false        → no IA expiry warning (or not applicable)
      // All three clear = PROCEED TO SIGN button is enabled.
      const hasBlockingWarning =
        !summary.workPerformed.minimumLengthMet ||
        summary.technician.certificateNumber === null ||
        summary.isIaExpired;

      expect(hasBlockingWarning).toBe(false);
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7: Troy signs the task card (A&P sign-off, consummates signatureAuthEvent)
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 7: Troy signs task card TC-100HR-001 (A&P card-level sign-off, auth event consumed)",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) signTaskCard succeeds even though a step is still pending — INV-09 must throw.
       *       All 5 steps are complete at this point (Troy: 4, Pat: 1), so this must succeed.
       *   (b) The signatureAuthEvent is not consumed atomically with the card sign-off (INV-05)
       *   (c) The audit log entry with eventType "record_signed" is not written —
       *       AC 43-9C requires the card-level sign-off to be traceable
       *   (d) task card completedAt is not set after signing — timing data lost
       *
       * Troy signs the card-level attestation as A&P. This is separate from the per-step
       * sign-offs. The card sign-off certifies that Troy supervised and completed the work
       * package as a whole.
       */
      const troySigAuth = await seedAuthEvent(
        S.troyId!, "user_troy", "AP558934",
        { legalName: "Troy Vance", intendedTable: "taskCards" }
      );

      await t.mutation(signTaskCard, {
        taskCardId:           S.taskCardId!,
        organizationId:       S.orgId!,
        signatureAuthEventId: troySigAuth,
        ratingsExercised:     ["airframe", "powerplant"],
        returnToServiceStatement:
          "I certify that all inspection items in task card TC-100HR-001 were completed " +
          "per C172 Maintenance Manual Chapter 5-10-00 Rev 2025-12 and found within limits.",
        callerUserId:        "user_troy",
        callerTechnicianId:  S.troyId!,
      });

      // Task card status must remain "complete" — signTaskCard adds the card-level
      // sign-off but doesn't change the status (it was already complete after steps)
      const card = await t.run(async (ctx) => ctx.db.get(S.taskCardId!));
      expect(card?.status).toBe("complete");

      // completedAt must be set — timestamped evidence of when the card was signed
      expect(card?.completedAt).toBeDefined();
      expect(card?.completedAt).toBeGreaterThan(0);

      // Auth event consumed atomically (INV-05)
      const consumedAuth = await t.run(async (ctx) => ctx.db.get(troySigAuth));
      expect(consumedAuth?.consumed).toBe(true);
      expect(consumedAuth?.consumedByTable).toBe("taskCards");
      expect(consumedAuth?.consumedByRecordId?.toString()).toBe(S.taskCardId!.toString());

      // Audit log must contain a "record_signed" entry for this task card
      // This is the audit trail that shows when and by whom the card was signed
      const auditEntries = await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_record", (q) =>
            q.eq("tableName", "taskCards").eq("recordId", S.taskCardId! as any)
          )
          .filter((q) => q.eq(q.field("eventType"), "record_signed"))
          .collect()
      );
      expect(auditEntries.length).toBeGreaterThanOrEqual(1);
      expect(auditEntries[0].technicianId?.toString()).toBe(S.troyId!.toString());
      expect(auditEntries[0].organizationId?.toString()).toBe(S.orgId!.toString());
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 8: Pat performs inspection sign-off (IA sign-off, IA currency verified)
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 8: Pat creates and signs 100-hour inspection record (IA sign-off, " +
    "iaCurrentOnInspectionDate = true, SHA-256 signature hash)",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) createInspectionRecord accepts an IA holder with expired IA — must throw.
       *       The mutation checks iaExpiryDate against the inspection date (not today's date —
       *       against the inspectionDate parameter). Pat's IA expires next March 31 and is current.
       *   (b) iaCurrentOnInspectionDate is false even though IA is current — the snapshot is wrong.
       *       This would show an IA currency violation on a valid inspection record.
       *   (c) signatureHash is the placeholder pattern — must be real SHA-256 (REQ: replace all placeholders)
       *   (d) The inspection record is not linked to the work order — chain-of-custody broken.
       *   (e) totalTimeAirframeHours on the inspection record != aircraftTotalTimeAtOpen —
       *       INV mismatch (Cilla 3.3 from Phase 3 architecture).
       *
       * Pat's IA sign-off is the regulatory basis for the 100-hour inspection.
       * 14 CFR 65.91 requires an IA to sign the annual/100-hour inspection record.
       * This record is Pat's professional certification that the aircraft meets airworthiness standards.
       * As Pat said: "The IA certificate is the thing I'm most protective of."
       */
      const patInspAuth = await seedAuthEvent(
        S.patId!, "user_pat", "AP334219",
        { legalName: "Patricia DeLuca", intendedTable: "inspectionRecords" }
      );

      S.inspectionRecordId = await t.mutation(createInspectionRecord, {
        workOrderId:               S.workOrderId!,
        organizationId:            S.orgId!,
        inspectionType:            "100_hour",
        inspectionDate:            NOW,
        scopeDescription:
          "100-hour inspection completed per 14 CFR Part 91 §91.409(b) and C172 MM Chapter 5-10-00. " +
          "Engine, airframe, flight controls, landing gear, and propeller inspected. " +
          "All items within serviceable limits. No airworthiness concerns found.",
        airworthinessDetermination: "returned_to_service",
        discrepancyIds:             [],
        adComplianceReviewed:       true,
        adComplianceReferenceIds:   [],
        notes:
          "No applicable ADs for this aircraft identified for this inspection interval. " +
          "AD research performed via FAA database query dated 2026-02-22.",
        nextInspectionDueHours:     2447.4,   // 100 hours from now
        iaTechnicianId:             S.patId!,
        signatureAuthEventId:       patInspAuth,
        callerUserId:               "user_pat",
        callerTechnicianId:         S.patId!,
      });

      expect(S.inspectionRecordId).toBeDefined();

      const record = await t.run(async (ctx) => ctx.db.get(S.inspectionRecordId!));

      // Core linkage assertions
      expect(record?.workOrderId?.toString()).toBe(S.workOrderId!.toString());
      expect(record?.inspectionType).toBe("100_hour");
      expect(record?.airworthinessDetermination).toBe("returned_to_service");

      // IA currency snapshot — must be true for Pat's current IA
      // This field is the permanent record that Pat's IA was valid at signing time.
      // Even after Pat's IA expires next March 31, this field remains true.
      expect(record?.iaCurrentOnInspectionDate).toBe(true);
      expect(record?.iaCertificateNumber).toBe("AP334219");
      expect(record?.iaTechnicianId?.toString()).toBe(S.patId!.toString());

      // Aircraft TT on the inspection record must match the WO's recorded TT at open
      // (Cilla 3.3 — the inspection was performed at this TT)
      expect(record?.totalTimeAirframeHours).toBe(TT_AT_OPEN);   // 2347.4

      // Signature hash must be a real SHA-256 hash (not the old placeholder)
      expect(record?.iaSignatureHash).toBeDefined();
      expect(record?.iaSignatureHash).toMatch(/^sha256:/);
      expect(record?.iaSignatureHash).not.toMatch(/RTS-HASH-V0/i);
      expect(record?.iaSignatureTimestamp).toBeGreaterThan(0);

      // Auth event consumed
      const consumedAuth = await t.run(async (ctx) => ctx.db.get(patInspAuth));
      expect(consumedAuth?.consumed).toBe(true);
      expect(consumedAuth?.consumedByTable).toBe("inspectionRecords");

      // Immutability: no updatedAt on inspectionRecords
      expect((record as any)?.updatedAt).toBeUndefined();
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 10 (EXECUTION ORDER): getWorkOrderCloseReadinessV2 returns isReadyForRts: true
  // NOTE: Step numbering follows the Definition of Done; execution order differs.
  // This runs before Step 9 (Linda's QCM review) because the QCM review requires
  // workOrder.status == "closed" (INV-24), which doesn't happen until Step 11.
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 10: getWorkOrderCloseReadinessV2 returns isReadyForRts: true — all 8 checks pass",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) isReadyForRts is false due to a bug in one of the 8 checks — Gary can't close.
       *   (b) The check names don't match the actual schema invariants being enforced —
       *       a false positive on close readiness is worse than a false negative.
       *   (c) allTaskCardsComplete is false even though all 5 steps are done —
       *       denormalized counter drift (QA-002 resolution must be holding)
       *   (d) aircraftTtReconciled is false — TT_AT_OPEN == TT_AT_CLOSE is the edge case;
       *       the check must accept equal values (INV-06: >= not >)
       *   (e) iaCertificateCurrent is false even though Pat's IA is current —
       *       the check is resolving the wrong technician for the IA check
       *
       * The 8 checks correspond to the pre-signing preconditions that can be evaluated
       * before the signatureAuthEvent is generated (the event itself is verified at
       * authorizeReturnToService time). If all 8 are green, Gary can proceed to RTS.
       *
       * Gary's explicit requirement (REQ-GH-03): "One screen, one checklist, green or
       * red for each item." This query is the server-side implementation of that screen.
       */
      const readiness = await t.query(getWorkOrderCloseReadinessV2, {
        workOrderId:    S.workOrderId!,
        organizationId: S.orgId!,
      });

      // Top-level gate: isReadyForRts must be true before Gary can proceed
      expect(readiness.isReadyForRts).toBe(true);

      // Verify each check is individually green — this is what Gary sees on the
      // close readiness screen. Each false item blocks closure and links to the record.
      const { checks } = readiness;

      // Check 1: All task cards complete
      // One task card with 5 steps — all completed in Steps 3-4
      expect(checks.allTaskCardsComplete).toBe(true);

      // Check 2: All discrepancies dispositioned
      // No discrepancies were opened in this scenario (clean inspection)
      expect(checks.allDiscrepanciesDispositioned).toBe(true);

      // Check 3: Maintenance records exist and are signed
      // Troy created and signed the maintenance record in Step 5
      expect(checks.maintenanceRecordsSigned).toBe(true);

      // Check 4: Aircraft TT reconciled
      // TT_AT_CLOSE == TT_AT_OPEN (no flight during maintenance) — must pass (INV-06: >=)
      expect(checks.aircraftTtReconciled).toBe(true);

      // Check 5: IA certificate current
      // Pat signed the inspection record with a current IA in Step 8
      expect(checks.iaCertificateCurrent).toBe(true);

      // Check 6: No overdue ADs
      // No AD compliance records were opened — no overdue items
      expect(checks.noOverdueAds).toBe(true);

      // Check 7: MEL expirations valid
      // No MEL deferrals were created — no expirations to check
      expect(checks.melExpirationsValid).toBe(true);

      // Check 8: RTS statement present
      // The inspection record contains a return-to-service statement
      expect(checks.rtsStatementPresent).toBe(true);

      // blockingReasons must be empty when isReadyForRts is true
      expect(readiness.blockingReasons).toHaveLength(0);
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 11: Gary authorizes RTS — aircraft flips to airworthy, WO closes,
  // 4 audit events written
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 11: Gary authorizes RTS — aircraft status → airworthy, WO status → closed, " +
    "SHA-256 signature hash, 4 audit events written",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) authorizeReturnToService succeeds even though all 9 preconditions are not met —
       *       the mutation must re-verify all preconditions atomically (not rely on the
       *       close readiness query result, which could be stale)
       *   (b) Aircraft status is not updated to "airworthy" after RTS — the physical aircraft
       *       is released but the system still shows it as "in_maintenance"
       *   (c) Work order status is not updated to "closed" after RTS — audit trail is broken
       *   (d) The signatureAuthEvent is not consumed atomically with RTS creation (INV-05)
       *   (e) The signature hash is the deprecated placeholder (REQ: replace all RTS-HASH-V0-*)
       *   (f) aircraftHoursAtRts != workOrder.aircraftTotalTimeAtClose — schema invariant violation
       *   (g) The 4 required audit events are not all written — RTS is defensible only if
       *       all four events are in the audit trail:
       *       1. record_created (returnToService)
       *       2. status_changed (workOrders: → closed)
       *       3. aircraft_returned (aircraft: status → airworthy)
       *       4. technician_signed (RTS IA sign-off event)
       *
       * Gary is the DOM and holds an IA. He signs the RTS in his capacity as authorized
       * repair station IA holder. Pat performed the inspection sign-off (Step 8); Gary
       * performs the final RTS authorization.
       *
       * Pat's requirement: "I need to be able to prove I signed it without the software's help."
       * This record's SHA-256 hash is that proof.
       */
      const garyRtsAuth = await seedAuthEvent(
        S.garyId!, "user_gary", "AP441872",
        { legalName: "Gary Hutchins", intendedTable: "returnToService" }
      );

      S.rtsId = await t.mutation(authorizeReturnToService, {
        workOrderId:             S.workOrderId!,
        organizationId:          S.orgId!,
        inspectionRecordId:      S.inspectionRecordId!,
        signedByIaTechnicianId:  S.garyId!,
        returnToServiceDate:     NOW,
        returnToServiceStatement:
          "I hereby certify that the aircraft described in this work order has been inspected " +
          "and/or repaired in accordance with current regulations and is approved for return " +
          "to service. Pursuant to 14 CFR §43.9(a), §65.95, and §91.409.",
        aircraftTotalTimeAtClose: TT_AT_CLOSE,     // 2347.4 — same as at open (no flight)
        signatureAuthEventId:    garyRtsAuth,
        callerUserId:            "user_gary",
        callerTechnicianId:      S.garyId!,
      });

      expect(S.rtsId).toBeDefined();

      // ── Assert: returnToService record ───────────────────────────────────
      const rts = await t.run(async (ctx) => ctx.db.get(S.rtsId!));

      expect(rts?.workOrderId?.toString()).toBe(S.workOrderId!.toString());
      expect(rts?.signedByIaTechnicianId?.toString()).toBe(S.garyId!.toString());
      expect(rts?.iaCurrentOnRtsDate).toBe(true);
      expect(rts?.iaCertificateNumber).toBe("AP441872");

      // aircraftHoursAtRts must equal aircraftTotalTimeAtClose (Cilla 3.3)
      expect(rts?.aircraftHoursAtRts).toBe(TT_AT_CLOSE);

      // SHA-256 hash: must be present and NOT the deprecated placeholder
      expect(rts?.signatureHash).toBeDefined();
      expect(rts?.signatureHash).toMatch(/^sha256:/);
      expect(rts?.signatureHash).not.toMatch(/RTS-HASH-V0/i);

      // Immutability: returnToService must NOT have updatedAt
      expect((rts as any)?.updatedAt).toBeUndefined();

      // ── Assert: work order is now closed ─────────────────────────────────
      const closedWo = await t.run(async (ctx) => ctx.db.get(S.workOrderId!));
      expect(closedWo?.status).toBe("closed");
      expect(closedWo?.aircraftTotalTimeAtClose).toBe(TT_AT_CLOSE);   // 2347.4
      expect(closedWo?.closedAt).toBeDefined();
      expect(closedWo?.closedByUserId).toBe("user_gary");
      expect(closedWo?.closedByTechnicianId?.toString()).toBe(S.garyId!.toString());
      expect(closedWo?.returnedToService).toBe(true);
      expect(closedWo?.returnToServiceId?.toString()).toBe(S.rtsId!.toString());

      // ── Assert: aircraft is now airworthy ─────────────────────────────────
      const aircraft = await t.run(async (ctx) => ctx.db.get(S.aircraftId!));
      expect(aircraft?.status).toBe("airworthy");

      // ── Assert: signatureAuthEvent consumed ──────────────────────────────
      const consumedRtsAuth = await t.run(async (ctx) => ctx.db.get(garyRtsAuth));
      expect(consumedRtsAuth?.consumed).toBe(true);
      expect(consumedRtsAuth?.consumedByTable).toBe("returnToService");

      // ── Assert: 4 audit events written ───────────────────────────────────
      // All four events must exist in the audit log. Their absence means the audit
      // trail is incomplete and an FAA inspector could not reconstruct the close event.

      // Event 1: returnToService record created
      const rtsCreatedEvents = await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_record", (q) =>
            q.eq("tableName", "returnToService").eq("recordId", S.rtsId! as any)
          )
          .filter((q) => q.eq(q.field("eventType"), "record_created"))
          .collect()
      );
      expect(rtsCreatedEvents.length).toBeGreaterThanOrEqual(1);

      // Event 2: workOrders status changed to "closed"
      const woStatusChangedEvents = await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_record", (q) =>
            q.eq("tableName", "workOrders").eq("recordId", S.workOrderId! as any)
          )
          .filter((q) => q.eq(q.field("eventType"), "status_changed"))
          .collect()
      );
      const closeEvent = woStatusChangedEvents.find(
        (e) => e.newValue && JSON.parse(e.newValue).status === "closed"
      );
      expect(closeEvent).toBeDefined();

      // Event 3: aircraft returned to service
      const aircraftReturnedEvents = await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_record", (q) =>
            q.eq("tableName", "aircraft").eq("recordId", S.aircraftId! as any)
          )
          .filter((q) => q.eq(q.field("eventType"), "aircraft_returned"))
          .collect()
      );
      expect(aircraftReturnedEvents.length).toBeGreaterThanOrEqual(1);

      // Event 4: technician signed the RTS
      const techSignedEvents = await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_record", (q) =>
            q.eq("tableName", "returnToService").eq("recordId", S.rtsId! as any)
          )
          .filter((q) => q.eq(q.field("eventType"), "technician_signed"))
          .collect()
      );
      expect(techSignedEvents.length).toBeGreaterThanOrEqual(1);
      expect(techSignedEvents[0].technicianId?.toString()).toBe(S.garyId!.toString());
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 9 (EXECUTION ORDER): Linda creates QCM review (post-close)
  // NOTE: Executed after Steps 10-11 because INV-24 requires workOrder.status == "closed".
  // The step label is Step 9 per the Definition of Done numbering.
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "Step 9: Linda creates QCM review (post-close, outcome: accepted, no findings) — " +
    "INV-24 (WO must be closed), INV-25 (reviewer must be org QCM)",
    async () => {
      /**
       * Failure modes guarded:
       *   (a) createQcmReview succeeds on an open WO — INV-24 must throw.
       *       This is tested explicitly in the Negative Paths section.
       *       At this point, the WO is closed (Step 11), so it must succeed.
       *   (b) reviewedByTechnicianId != org.qualityControlManagerId — INV-25 must throw.
       *       We set Linda as QCM on the org in beforeAll, so this must succeed.
       *   (c) findingsNotes is required when outcome != "accepted" — INV-26.
       *       We're testing outcome "accepted" here; the INV-26 test is in Negative Paths.
       *   (d) QCM review is not audit-logged with eventType "qcm_reviewed" — v3 schema addition.
       *       The "qcm_reviewed" event type was added specifically for this (REQ-LP-05).
       *   (e) The signatureHash on the QCM review is a placeholder — must be real SHA-256.
       *   (f) reviewerLegalName / reviewerCertificateNumber snapshots are missing —
       *       identity must be snapshotted at review time (same pattern as maintenance records).
       *
       * Linda's requirement: "QCM review is a first-class compliance action, not a note
       * in a spreadsheet." This record is her legal attestation that the work was reviewed.
       */

      // Verify the WO is closed before creating the QCM review
      const wo = await t.run(async (ctx) => ctx.db.get(S.workOrderId!));
      expect(wo?.status).toBe("closed"); // Precondition for INV-24

      const lindaQcmAuth = await seedAuthEvent(
        S.lindaId!, "user_linda", "AP772100",
        { legalName: "Linda Paredes", intendedTable: "qcmReviews" }
      );

      S.qcmReviewId = await t.mutation(createQcmReview, {
        workOrderId:            S.workOrderId!,
        organizationId:         S.orgId!,
        reviewedByTechnicianId: S.lindaId!,
        outcome:                "accepted",
        // findingsNotes intentionally omitted — "accepted" outcome does not require it (INV-26)
        signatureAuthEventId:   lindaQcmAuth,
        callerUserId:           "user_linda",
        callerTechnicianId:     S.lindaId!,
      });

      expect(S.qcmReviewId).toBeDefined();

      const review = await t.run(async (ctx) => ctx.db.get(S.qcmReviewId!));

      // Core content
      expect(review?.workOrderId?.toString()).toBe(S.workOrderId!.toString());
      expect(review?.outcome).toBe("accepted");
      expect(review?.findingsNotes).toBeUndefined(); // Not required for "accepted"

      // Reviewer identity snapshot (same pattern as maintenanceRecords)
      expect(review?.reviewedByTechnicianId?.toString()).toBe(S.lindaId!.toString());
      expect(review?.reviewerLegalName).toBe("Linda Paredes");
      expect(review?.reviewerCertificateNumber).toBe("AP772100");

      // Signature assertions
      expect(review?.signatureHash).toBeDefined();
      expect(review?.signatureHash).toMatch(/^sha256:/);
      expect(review?.signatureTimestamp).toBeGreaterThan(0);

      // Auth event consumed
      const consumedAuth = await t.run(async (ctx) => ctx.db.get(lindaQcmAuth));
      expect(consumedAuth?.consumed).toBe(true);

      // Audit log must contain a "qcm_reviewed" event (v3 schema addition, REQ-LP-05)
      // This event is what appears in the "per-record audit history" UI Gary asked for
      const qcmAuditEvents = await t.run(async (ctx) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_org_event_type", (q) =>
            q.eq("organizationId", S.orgId!).eq("eventType", "qcm_reviewed")
          )
          .collect()
      );
      expect(qcmAuditEvents.length).toBeGreaterThanOrEqual(1);

      const qcmEvent = qcmAuditEvents.find(
        (e) => e.recordId === S.qcmReviewId!.toString()
      );
      expect(qcmEvent).toBeDefined();
      expect(qcmEvent?.technicianId?.toString()).toBe(S.lindaId!.toString());

      // Immutability: no updatedAt on qcmReviews
      expect((review as any)?.updatedAt).toBeUndefined();
    }
  );

}); // END: main e2e scenario

// ─────────────────────────────────────────────────────────────────────────────
// NEGATIVE PATH TESTS
// These tests verify that the system hard-blocks invalid operations with
// specific error codes. Each uses an isolated convexTest instance.
//
// Error codes referenced here correspond to error message patterns
// the mutations must throw. Assertions use toThrow() with regex patterns
// matching the expected error message content.
// ─────────────────────────────────────────────────────────────────────────────

describe("Negative Paths — Hard-Block Error Codes", () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PATH 1: Troy (A&P, no IA) tries to sign the IA-required step
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "REJECT-IA-01: Troy (A&P, no IA) cannot sign an IA-required step — " +
    "completeStep must throw REQUIRES_IA before consuming auth event",
    async () => {
      /**
       * Failure mode guarded:
       *   Troy signs step 5 (signOffRequiresIa=true) using his A&P cert.
       *   This is the most common regulatory violation in annual/100-hour inspections:
       *   an AMT signs the IA-required step, the inspection sign-off is invalid.
       *   The mutation checks certificates.by_type for an active IA cert with
       *   hasIaAuthorization=true and iaExpiryDate > now. Troy has neither.
       *   The guard must fire BEFORE consuming the auth event (INV-05 atomicity).
       *
       * What makes this different from TC-TC-IA-01 in taskCards.test.ts:
       *   That test uses a generic AMT. This test uses Troy specifically — the
       *   same technician from the e2e scenario — proving the guard holds against
       *   the actual cast member, not just a synthetic fixture.
       */
      const isolated = convexTest(schema);

      const orgId = await isolated.run(async (ctx) =>
        ctx.db.insert("organizations", {
          name: "Test MRO",
          part145Ratings: [],
          address: "1 Test St",
          city: "Tucson",
          state: "AZ",
          zip: "85706",
          country: "US",
          subscriptionTier: "starter",
          active: true,
          createdAt: NOW,
          updatedAt: NOW,
        })
      );

      // Troy — A&P, NO IA certificate
      const troyIsolated = await isolated.run(async (ctx) => {
        const techId = await ctx.db.insert("technicians", {
          legalName: "Troy Vance",
          userId: "user_troy_isolated",
          employeeId: "EMP-TROY-ISOLATED",
          organizationId: orgId,
          status: "active",
          createdAt: NOW,
          updatedAt: NOW,
        });
        await ctx.db.insert("certificates", {
          technicianId: techId,
          certificateType: "A&P",
          certificateNumber: "AP558934",
          issueDate: NOW - ONE_YEAR_MS * 5,
          ratings: ["airframe", "powerplant"],
          hasIaAuthorization: false,  // ← A&P ONLY — cannot sign IA-required steps
          iaRenewalActivities: [],
          repairStationAuthorizations: [],
          active: true,
          createdAt: NOW,
          updatedAt: NOW,
        });
        return techId;
      });

      const aircraftIsolated = await isolated.run(async (ctx) =>
        ctx.db.insert("aircraft", {
          make: "Cessna", model: "172S", serialNumber: "ISOLATED-TEST-01",
          currentRegistration: "N9999T",
          experimental: false,
          aircraftCategory: "normal",
          engineCount: 1,
          totalTimeAirframeHours: 1000.0,
          totalTimeAirframeAsOfDate: NOW,
          status: "in_maintenance",
          operatingOrganizationId: orgId,
          createdByOrganizationId: orgId,
          createdAt: NOW,
          updatedAt: NOW,
        })
      );

      const woId = await isolated.mutation(createWorkOrder, {
        organizationId: orgId, aircraftId: aircraftIsolated,
        workOrderNumber: "WO-REJECT-IA-01", workOrderType: "100hr_inspection",
        description: "Negative path test WO.",
        priority: "routine", callerUserId: "user_troy_isolated",
      });

      await isolated.mutation(openWorkOrder, {
        workOrderId: woId, organizationId: orgId,
        aircraftTotalTimeAtOpen: 1000.0,
        assignedTechnicianIds: [troyIsolated],
        callerUserId: "user_troy_isolated",
      });

      const tcId = await isolated.mutation(createTaskCard, {
        workOrderId: woId, organizationId: orgId,
        taskCardNumber: "TC-REJECT-IA-01",
        title: "IA Step Test",
        taskType: "inspection",
        approvedDataSource: "C172 MM Chapter 5-10-00",
        steps: [
          {
            stepNumber: 1,
            description: "Final airworthiness inspection — requires IA sign-off.",
            requiresSpecialTool: false,
            signOffRequired: true,
            signOffRequiresIa: true,  // ← IA REQUIRED
          },
        ],
        callerUserId: "user_troy_isolated",
      });

      const steps = await isolated.run(async (ctx) =>
        ctx.db.query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", tcId))
          .collect()
      );

      const authEvent = await isolated.run(async (ctx) =>
        ctx.db.insert("signatureAuthEvents", {
          clerkEventId: "evt_reject_ia_01",
          clerkSessionId: "sess_reject_ia_01",
          userId: "user_troy_isolated",
          technicianId: troyIsolated,
          authenticatedLegalName: "Troy Vance",
          authenticatedCertNumber: "AP558934",
          authMethod: "pin",
          intendedTable: "taskCardSteps",
          authenticatedAt: NOW,
          expiresAt: NOW + FIVE_MINUTES_MS,
          consumed: false,
        })
      );

      // ── Assert: Troy (A&P) cannot sign an IA-required step — must throw ──
      await expect(
        isolated.mutation(completeStep, {
          stepId: steps[0]._id,
          taskCardId: tcId,
          organizationId: orgId,
          action: "complete",
          signatureAuthEventId: authEvent,
          ratingsExercised: ["airframe"],
          callerUserId: "user_troy_isolated",
          callerTechnicianId: troyIsolated,
        })
      ).rejects.toThrow(/REQUIRES_IA|IA|Inspection Authorization|not authorized|current/i);

      // The step must remain pending — not completed despite the auth event existing
      const step = await isolated.run(async (ctx) => ctx.db.get(steps[0]._id));
      expect(step?.status).toBe("pending");

      // Critical: the auth event must NOT be consumed if the mutation threw.
      // Consuming the event on a failed sign-off would exhaust Troy's auth token
      // and prevent him from retrying or using it for a legitimate step.
      const event = await isolated.run(async (ctx) => ctx.db.get(authEvent));
      expect(event?.consumed).toBe(false);
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PATH 2: Troy tries to sign the task card before Pat signs the IA step
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "REJECT-SIGN-01: Troy cannot signTaskCard while IA-required step 5 is still pending — " +
    "signTaskCard must throw PENDING_STEPS (INV-09)",
    async () => {
      /**
       * Failure mode guarded:
       *   Troy completes steps 1-4 and then immediately attempts to sign the card
       *   before Pat signs step 5 (IA-required, still pending). signTaskCard must
       *   throw because not all steps are in status "completed" or "na".
       *
       *   This is the exact scenario from the Definition of Done where the sequence
       *   matters: Step 4 (complete all steps) must fully complete BEFORE Step 7
       *   (Troy signs task card). If step 5 is pending, the card is in_progress,
       *   not complete, and signTaskCard must hard-block.
       *
       *   INV-09 covers this: "A task card may only transition to complete when all
       *   linked taskCardSteps are in status completed or na."
       */
      const isolated = convexTest(schema);

      const orgId = await isolated.run(async (ctx) =>
        ctx.db.insert("organizations", {
          name: "Test MRO Sign",
          part145Ratings: [],
          address: "1 Sign St",
          city: "Tucson", state: "AZ", zip: "85706", country: "US",
          subscriptionTier: "starter",
          active: true, createdAt: NOW, updatedAt: NOW,
        })
      );

      const techId = await isolated.run(async (ctx) => {
        const id = await ctx.db.insert("technicians", {
          legalName: "Troy Vance",
          userId: "user_troy_sign",
          employeeId: "EMP-SIGN-01",
          organizationId: orgId,
          status: "active",
          createdAt: NOW, updatedAt: NOW,
        });
        await ctx.db.insert("certificates", {
          technicianId: id,
          certificateType: "A&P",
          certificateNumber: "AP558934",
          issueDate: NOW - ONE_YEAR_MS * 3,
          ratings: ["airframe", "powerplant"],
          hasIaAuthorization: false,  // Troy: no IA
          iaRenewalActivities: [],
          repairStationAuthorizations: [],
          active: true, createdAt: NOW, updatedAt: NOW,
        });
        return id;
      });

      const aircraftId = await isolated.run(async (ctx) =>
        ctx.db.insert("aircraft", {
          make: "Cessna", model: "172S", serialNumber: "SIGN-TEST-01",
          currentRegistration: "N8888T",
          experimental: false, aircraftCategory: "normal", engineCount: 1,
          totalTimeAirframeHours: 500.0, totalTimeAirframeAsOfDate: NOW,
          status: "in_maintenance",
          operatingOrganizationId: orgId, createdByOrganizationId: orgId,
          createdAt: NOW, updatedAt: NOW,
        })
      );

      const woId = await isolated.mutation(createWorkOrder, {
        organizationId: orgId, aircraftId,
        workOrderNumber: "WO-REJECT-SIGN-01", workOrderType: "100hr_inspection",
        description: "Test sign before IA.", priority: "routine",
        callerUserId: "user_troy_sign",
      });
      await isolated.mutation(openWorkOrder, {
        workOrderId: woId, organizationId: orgId,
        aircraftTotalTimeAtOpen: 500.0,
        assignedTechnicianIds: [techId],
        callerUserId: "user_troy_sign",
      });

      const tcId = await isolated.mutation(createTaskCard, {
        workOrderId: woId, organizationId: orgId,
        taskCardNumber: "TC-SIGN-REJECT-01",
        title: "Test Card — IA step pending",
        taskType: "inspection",
        approvedDataSource: "C172 MM Chapter 5-10-00",
        steps: [
          {
            stepNumber: 1,
            description: "Non-IA step — Troy can sign this.",
            requiresSpecialTool: false, signOffRequired: true, signOffRequiresIa: false,
          },
          {
            stepNumber: 2,
            description: "IA-required step — Troy CANNOT sign and Pat hasn't signed yet.",
            requiresSpecialTool: false, signOffRequired: true, signOffRequiresIa: true,
          },
        ],
        callerUserId: "user_troy_sign",
      });

      const steps = await isolated.run(async (ctx) =>
        ctx.db.query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", tcId))
          .collect()
      );
      const step1 = steps.find((s) => s.stepNumber === 1)!;

      // Troy signs step 1 (non-IA)
      const step1Auth = await isolated.run(async (ctx) =>
        ctx.db.insert("signatureAuthEvents", {
          clerkEventId: "evt_step1_sign",
          clerkSessionId: "sess_step1",
          userId: "user_troy_sign",
          technicianId: techId,
          authenticatedLegalName: "Troy Vance",
          authenticatedCertNumber: "AP558934",
          authMethod: "pin",
          intendedTable: "taskCardSteps",
          authenticatedAt: NOW,
          expiresAt: NOW + FIVE_MINUTES_MS,
          consumed: false,
        })
      );

      await isolated.mutation(completeStep, {
        stepId: step1._id, taskCardId: tcId, organizationId: orgId,
        action: "complete", signatureAuthEventId: step1Auth,
        ratingsExercised: ["airframe"],
        callerUserId: "user_troy_sign", callerTechnicianId: techId,
      });

      // Task card is now in_progress (1 of 2 done, IA step still pending)
      const card = await isolated.run(async (ctx) => ctx.db.get(tcId));
      expect(card?.status).toBe("in_progress");
      expect(card?.completedStepCount).toBe(1);

      // Troy attempts to sign the task card at the card level — must fail
      const cardSignAuth = await isolated.run(async (ctx) =>
        ctx.db.insert("signatureAuthEvents", {
          clerkEventId: "evt_card_sign_reject",
          clerkSessionId: "sess_card_reject",
          userId: "user_troy_sign",
          technicianId: techId,
          authenticatedLegalName: "Troy Vance",
          authenticatedCertNumber: "AP558934",
          authMethod: "pin",
          intendedTable: "taskCards",
          authenticatedAt: NOW,
          expiresAt: NOW + FIVE_MINUTES_MS,
          consumed: false,
        })
      );

      // ── Assert: signTaskCard must throw because step 2 is still pending (INV-09) ──
      await expect(
        isolated.mutation(signTaskCard, {
          taskCardId: tcId, organizationId: orgId,
          signatureAuthEventId: cardSignAuth,
          ratingsExercised: ["airframe"],
          returnToServiceStatement:
            "Attempting to sign before all steps complete — this should fail.",
          callerUserId: "user_troy_sign",
          callerTechnicianId: techId,
        })
      ).rejects.toThrow(/PENDING_STEPS|pending|incomplete|all steps|INV-09/i);

      // Card must still be in_progress — not signed
      const cardAfter = await isolated.run(async (ctx) => ctx.db.get(tcId));
      expect(cardAfter?.status).toBe("in_progress");

      // The card sign auth event must NOT be consumed — the throw aborted the mutation
      const cardAuthAfter = await isolated.run(async (ctx) => ctx.db.get(cardSignAuth));
      expect(cardAuthAfter?.consumed).toBe(false);
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PATH 3: Expired calibration on test equipment
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "WARN-CAL-01: Expired calibration on torque wrench produces calibrationCurrentAtUse=false " +
    "in the maintenance record (warning, not hard-block — per Dale Purcell / Marcus sign-off)",
    async () => {
      /**
       * Failure mode guarded:
       *   The mutation computes calibrationCurrentAtUse = (calibrationExpiryDate > signatureTimestamp).
       *   When the calibration is expired, this must be false. The record is still created
       *   (alpha spec: warning, not block) but the false value serves as the permanent record
       *   that out-of-calibration equipment was used. This is auditable.
       *
       *   If calibrationCurrentAtUse is true when the calibration is expired:
       *   - The maintenance record contains a false assertion about equipment calibration
       *   - An FAA inspector reviewing the record would see calibrated equipment
       *     when the actual calibration had lapsed
       *   - This is a Part 145 RSM compliance violation (all interviewees cited this)
       *
       *   The alpha spec (schema-v3.ts and Dale Purcell's spec) explicitly states this is
       *   a WARNING, not a hard-block, for alpha. v1.1 may revisit this to a hard-block.
       *   This test verifies the warning contract, NOT a block.
       */
      const isolated = convexTest(schema);

      const orgId = await isolated.run(async (ctx) =>
        ctx.db.insert("organizations", {
          name: "Test MRO Cal",
          part145CertificateNumber: "TEST145-CAL",
          part145Ratings: ["Class A Airframe"],
          address: "1 Cal St", city: "Tucson", state: "AZ", zip: "85706", country: "US",
          subscriptionTier: "starter", active: true, createdAt: NOW, updatedAt: NOW,
        })
      );

      const techId = await isolated.run(async (ctx) => {
        const id = await ctx.db.insert("technicians", {
          legalName: "Test Tech Cal",
          userId: "user_tech_cal",
          employeeId: "EMP-CAL-01",
          organizationId: orgId,
          status: "active",
          createdAt: NOW, updatedAt: NOW,
        });
        await ctx.db.insert("certificates", {
          technicianId: id,
          certificateType: "A&P",
          certificateNumber: "AP900001",
          issueDate: NOW - ONE_YEAR_MS * 2,
          ratings: ["airframe", "powerplant"],
          hasIaAuthorization: false,
          iaRenewalActivities: [],
          repairStationAuthorizations: [],
          active: true, createdAt: NOW, updatedAt: NOW,
        });
        return id;
      });

      // Torque wrench with EXPIRED calibration (expired 1 year ago)
      const expiredTorqueWrenchId = await isolated.run(async (ctx) =>
        ctx.db.insert("testEquipment", {
          organizationId: orgId,
          partNumber: "SW-3/8-250",
          serialNumber: "TW-EXPIRED-001",
          equipmentName: "Torque Wrench — EXPIRED CALIBRATION",
          equipmentType: "torque_wrench",
          calibrationCertNumber: "NIST-EXPIRED-2024",
          calibrationDate:       NOW - ONE_YEAR_MS * 2,  // 2 years ago
          calibrationExpiryDate: NOW - ONE_YEAR_MS,       // Expired 1 year ago
          status: "expired",
          createdAt: NOW, updatedAt: NOW,
        })
      );

      const aircraftId = await isolated.run(async (ctx) =>
        ctx.db.insert("aircraft", {
          make: "Cessna", model: "172S", serialNumber: "CAL-TEST-01",
          currentRegistration: "N7777T",
          experimental: false, aircraftCategory: "normal", engineCount: 1,
          totalTimeAirframeHours: 800.0, totalTimeAirframeAsOfDate: NOW,
          status: "in_maintenance",
          operatingOrganizationId: orgId, createdByOrganizationId: orgId,
          createdAt: NOW, updatedAt: NOW,
        })
      );

      const woId = await isolated.mutation(createWorkOrder, {
        organizationId: orgId, aircraftId,
        workOrderNumber: "WO-CAL-WARN-01", workOrderType: "100hr_inspection",
        description: "Calibration warning test.", priority: "routine",
        callerUserId: "user_tech_cal",
      });
      await isolated.mutation(openWorkOrder, {
        workOrderId: woId, organizationId: orgId,
        aircraftTotalTimeAtOpen: 800.0,
        assignedTechnicianIds: [techId],
        callerUserId: "user_tech_cal",
      });

      const mrAuth = await isolated.run(async (ctx) =>
        ctx.db.insert("signatureAuthEvents", {
          clerkEventId: "evt_cal_warn",
          clerkSessionId: "sess_cal_warn",
          userId: "user_tech_cal",
          technicianId: techId,
          authenticatedLegalName: "Test Tech Cal",
          authenticatedCertNumber: "AP900001",
          authMethod: "pin",
          intendedTable: "maintenanceRecords",
          authenticatedAt: NOW,
          expiresAt: NOW + FIVE_MINUTES_MS,
          consumed: false,
        })
      );

      // ── Assert: createMaintenanceRecord SUCCEEDS with expired calibration ──
      // (warning, not hard-block, per Dale's spec and Marcus's sign-off)
      const EXPIRED_CAL_EXPIRY = NOW - ONE_YEAR_MS;

      let mrId: Id<"maintenanceRecords">;
      await expect(
        isolated.mutation(createMaintenanceRecord, {
          workOrderId: woId,
          organizationId: orgId,
          recordType: "maintenance_43_9",
          workPerformed:
            "Torque-checked all engine cowling fasteners per AMM 71-10-00. " +
            "Torque wrench used was found to have expired calibration certificate. " +
            "Equipment calibration status noted as expired in this record.",
          approvedDataReference: "AMM 71-10-00",
          partsReplaced: [],
          testEquipmentUsed: [
            {
              testEquipmentId:       expiredTorqueWrenchId,
              partNumber:            "SW-3/8-250",
              serialNumber:          "TW-EXPIRED-001",
              equipmentName:         "Torque Wrench — EXPIRED CALIBRATION",
              calibrationCertNumber: "NIST-EXPIRED-2024",
              calibrationExpiryDate: EXPIRED_CAL_EXPIRY,  // Past date
              // calibrationCurrentAtUse computed by mutation: (EXPIRED_CAL_EXPIRY > NOW) = false
            },
          ],
          completionDate: NOW,
          ratingsExercised: ["airframe"],
          signatureAuthEventId: mrAuth,
          callerUserId: "user_tech_cal",
          callerTechnicianId: techId,
        }).then((id: Id<"maintenanceRecords">) => {
          mrId = id;
          return id;
        })
      ).resolves.not.toThrow();

      // ── Assert: calibrationCurrentAtUse is FALSE in the immutable record ──
      const record = await isolated.run(async (ctx) => ctx.db.get(mrId!));
      expect(record).toBeDefined();
      expect(record?.testEquipmentUsed).toHaveLength(1);

      const teRef = record?.testEquipmentUsed![0];
      expect(teRef?.serialNumber).toBe("TW-EXPIRED-001");

      // This is the critical assertion: the mutation computed calibrationCurrentAtUse
      // as false because calibrationExpiryDate < signatureTimestamp.
      // The record permanently documents that out-of-calibration equipment was used.
      expect(teRef?.calibrationCurrentAtUse).toBe(false);

      // The warning should be surfaced in the mutation return value or a warning field
      // The mutation must return a warnings array when calibration is expired
      // (implementation: createMaintenanceRecord returns { id, warnings: string[] })
      // This assertion covers REQ-DP-03 (Dale Purcell: calibration warning, not block)
      const result = await isolated.run(async (ctx) => {
        const r = await ctx.db.get(mrId!);
        return r;
      });
      // The record itself documents the issue via calibrationCurrentAtUse=false.
      // Additional warning surfacing (toast/return value) is tested in unit tests.
      expect(result?.testEquipmentUsed![0].calibrationCurrentAtUse).toBe(false);
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PATH 4: QCM review attempted on open (not closed) work order
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "REJECT-QCM-01: createQcmReview throws INV-24 when work order status is not 'closed'",
    async () => {
      /**
       * Failure mode guarded:
       *   The QCM attempts to create a review while the work order is still in_progress.
       *   INV-24 requires workOrder.status == "closed" before any QCM review can be created.
       *   If this guard fails, a QCM review could exist on an open WO — the review would
       *   be reviewing work that hasn't been completed or authorized for RTS yet.
       *   This is a procedural compliance failure under Part 145 RSM requirements.
       *
       *   This is the scenario that the Definition of Done step ordering issue (Step 9
       *   before Step 11) would trigger if it were executed as written.
       */
      const isolated = convexTest(schema);

      const orgId = await isolated.run(async (ctx) =>
        ctx.db.insert("organizations", {
          name: "Test MRO QCM",
          part145Ratings: [],
          address: "1 QCM St", city: "Tucson", state: "AZ", zip: "85706", country: "US",
          subscriptionTier: "starter", active: true, createdAt: NOW, updatedAt: NOW,
        })
      );

      const lindaIsolated = await isolated.run(async (ctx) => {
        const id = await ctx.db.insert("technicians", {
          legalName: "Linda Paredes",
          userId: "user_linda_isolated",
          employeeId: "EMP-QCM-01",
          organizationId: orgId,
          status: "active", createdAt: NOW, updatedAt: NOW,
        });
        await ctx.db.insert("certificates", {
          technicianId: id, certificateType: "A&P",
          certificateNumber: "AP772100",
          issueDate: NOW - ONE_YEAR_MS * 2,
          ratings: ["airframe"],
          hasIaAuthorization: false,
          iaRenewalActivities: [],
          repairStationAuthorizations: [],
          active: true, createdAt: NOW, updatedAt: NOW,
        });
        return id;
      });

      // Set Linda as QCM on the org
      await isolated.run(async (ctx) => {
        await ctx.db.patch(orgId, {
          qualityControlManagerId: lindaIsolated,
          qualityControlManagerName: "Linda Paredes",
          updatedAt: NOW,
        });
      });

      const aircraftId = await isolated.run(async (ctx) =>
        ctx.db.insert("aircraft", {
          make: "Cessna", model: "172S", serialNumber: "QCM-TEST-01",
          currentRegistration: "N6666T",
          experimental: false, aircraftCategory: "normal", engineCount: 1,
          totalTimeAirframeHours: 300.0, totalTimeAirframeAsOfDate: NOW,
          status: "in_maintenance",
          operatingOrganizationId: orgId, createdByOrganizationId: orgId,
          createdAt: NOW, updatedAt: NOW,
        })
      );

      const woId = await isolated.mutation(createWorkOrder, {
        organizationId: orgId, aircraftId,
        workOrderNumber: "WO-QCM-REJECT-01", workOrderType: "routine",
        description: "QCM review reject test.",
        priority: "routine", callerUserId: "user_linda_isolated",
      });
      await isolated.mutation(openWorkOrder, {
        workOrderId: woId, organizationId: orgId,
        aircraftTotalTimeAtOpen: 300.0,
        assignedTechnicianIds: [lindaIsolated],
        callerUserId: "user_linda_isolated",
      });

      // WO is now "open" — not "closed" — QCM review must fail
      const wo = await isolated.run(async (ctx) => ctx.db.get(woId));
      expect(wo?.status).toBe("open"); // Confirm precondition for this test

      const qcmAuth = await isolated.run(async (ctx) =>
        ctx.db.insert("signatureAuthEvents", {
          clerkEventId: "evt_qcm_reject",
          clerkSessionId: "sess_qcm_reject",
          userId: "user_linda_isolated",
          technicianId: lindaIsolated,
          authenticatedLegalName: "Linda Paredes",
          authenticatedCertNumber: "AP772100",
          authMethod: "pin",
          intendedTable: "qcmReviews",
          authenticatedAt: NOW,
          expiresAt: NOW + FIVE_MINUTES_MS,
          consumed: false,
        })
      );

      // ── Assert: QCM review on open WO must throw INV-24 ──
      await expect(
        isolated.mutation(createQcmReview, {
          workOrderId: woId,
          organizationId: orgId,
          reviewedByTechnicianId: lindaIsolated,
          outcome: "accepted",
          signatureAuthEventId: qcmAuth,
          callerUserId: "user_linda_isolated",
          callerTechnicianId: lindaIsolated,
        })
      ).rejects.toThrow(/INV-24|not closed|work order must be closed|closed/i);

      // No QCM review record should have been created
      const qcmReviews = await isolated.run(async (ctx) =>
        ctx.db.query("qcmReviews")
          .withIndex("by_work_order", (q) => q.eq("workOrderId", woId))
          .collect()
      );
      expect(qcmReviews).toHaveLength(0);
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PATH 5: QCM review with findings but no findingsNotes (INV-26)
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "REJECT-QCM-02: createQcmReview throws INV-26 when outcome='findings_noted' " +
    "and findingsNotes is empty — legally insufficient review",
    async () => {
      /**
       * Failure mode guarded:
       *   A QCM creates a review with outcome "findings_noted" but provides no notes.
       *   INV-26 requires findingsNotes to be non-empty when outcome != "accepted".
       *   An empty findings review is legally meaningless — the FAA inspector would ask
       *   "what were the findings?" and the answer would be "we noted findings but
       *   didn't document them." This is the exact gap Linda described.
       *
       *   Linda: "If the software allows someone to create a legally insufficient
       *   maintenance record without friction, they will."
       *   The same principle applies to QCM reviews.
       */
      const isolated = convexTest(schema);

      const orgId = await isolated.run(async (ctx) =>
        ctx.db.insert("organizations", {
          name: "Test MRO QCM INV26",
          part145Ratings: [],
          address: "1 INV26 St", city: "Tucson", state: "AZ", zip: "85706", country: "US",
          subscriptionTier: "starter", active: true, createdAt: NOW, updatedAt: NOW,
        })
      );

      const lindaIsolated = await isolated.run(async (ctx) => {
        const id = await ctx.db.insert("technicians", {
          legalName: "Linda Paredes", userId: "user_linda_inv26",
          employeeId: "EMP-INV26",
          organizationId: orgId, status: "active",
          createdAt: NOW, updatedAt: NOW,
        });
        await ctx.db.insert("certificates", {
          technicianId: id, certificateType: "A&P", certificateNumber: "AP772100",
          issueDate: NOW - ONE_YEAR_MS * 2, ratings: ["airframe"],
          hasIaAuthorization: false, iaRenewalActivities: [],
          repairStationAuthorizations: [], active: true, createdAt: NOW, updatedAt: NOW,
        });
        return id;
      });

      await isolated.run(async (ctx) => {
        await ctx.db.patch(orgId, {
          qualityControlManagerId: lindaIsolated,
          qualityControlManagerName: "Linda Paredes",
          updatedAt: NOW,
        });
      });

      // Seed a "closed" WO directly to satisfy INV-24 for this test
      const aircraftId = await isolated.run(async (ctx) =>
        ctx.db.insert("aircraft", {
          make: "Cessna", model: "172S", serialNumber: "INV26-TEST-01",
          currentRegistration: "N5555T",
          experimental: false, aircraftCategory: "normal", engineCount: 1,
          totalTimeAirframeHours: 500.0, totalTimeAirframeAsOfDate: NOW,
          status: "airworthy",
          operatingOrganizationId: orgId, createdByOrganizationId: orgId,
          createdAt: NOW, updatedAt: NOW,
        })
      );

      const closedWoId = await isolated.run(async (ctx) =>
        ctx.db.insert("workOrders", {
          workOrderNumber: "WO-INV26-001",
          organizationId: orgId,
          aircraftId,
          status: "closed",   // ← Seed as closed to satisfy INV-24
          workOrderType: "routine",
          description: "Closed WO for INV-26 test.",
          priority: "routine",
          openedAt: NOW - 24 * 60 * 60 * 1000,
          openedByUserId: "user_linda_inv26",
          aircraftTotalTimeAtOpen: 500.0,
          aircraftTotalTimeAtClose: 500.0,
          closedAt: NOW - 60 * 60 * 1000,
          closedByUserId: "user_linda_inv26",
          returnedToService: true,
          createdAt: NOW - 24 * 60 * 60 * 1000,
          updatedAt: NOW - 60 * 60 * 1000,
        })
      );

      const qcmAuth = await isolated.run(async (ctx) =>
        ctx.db.insert("signatureAuthEvents", {
          clerkEventId: "evt_inv26_reject",
          clerkSessionId: "sess_inv26",
          userId: "user_linda_inv26",
          technicianId: lindaIsolated,
          authenticatedLegalName: "Linda Paredes",
          authenticatedCertNumber: "AP772100",
          authMethod: "pin",
          intendedTable: "qcmReviews",
          authenticatedAt: NOW,
          expiresAt: NOW + FIVE_MINUTES_MS,
          consumed: false,
        })
      );

      // ── Assert: findings_noted without findingsNotes must throw INV-26 ──
      await expect(
        isolated.mutation(createQcmReview, {
          workOrderId: closedWoId,
          organizationId: orgId,
          reviewedByTechnicianId: lindaIsolated,
          outcome: "findings_noted",
          // findingsNotes intentionally omitted — this is the error condition
          signatureAuthEventId: qcmAuth,
          callerUserId: "user_linda_inv26",
          callerTechnicianId: lindaIsolated,
        })
      ).rejects.toThrow(/INV-26|findings|notes required|cannot be empty/i);
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PATH 6: Expired IA tries to sign inspection step
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "REJECT-IA-EXPIRED-01: Expired IA cannot sign IA-required step — " +
    "completeStep throws IA_EXPIRED, no grace period past March 31",
    async () => {
      /**
       * Failure mode guarded:
       *   An IA whose certificate expired on March 31 attempts to sign an IA-required
       *   step on April 1. There is no grace period (14 CFR 65.92, per Marcus Webb).
       *   The mutation must check iaExpiryDate < Date.now() and throw immediately.
       *
       *   Pat's exact words: "When my IA expires, block me from signing inspection
       *   records immediately. Not a warning. A block."
       *
       *   We simulate this by seeding an IA with iaExpiryDate set 2 years in the past.
       *   The test proves the block is active regardless of how recently the cert expired.
       */
      const isolated = convexTest(schema);

      const orgId = await isolated.run(async (ctx) =>
        ctx.db.insert("organizations", {
          name: "Test MRO Expired IA",
          part145Ratings: [],
          address: "1 Expired St", city: "Tucson", state: "AZ", zip: "85706", country: "US",
          subscriptionTier: "starter", active: true, createdAt: NOW, updatedAt: NOW,
        })
      );

      // Dana — IA holder with EXPIRED certificate (expired 2 years ago)
      const danaId = await isolated.run(async (ctx) => {
        const id = await ctx.db.insert("technicians", {
          legalName: "Dana Kim",
          userId: "user_dana_expired",
          employeeId: "EMP-EXPIRED-IA",
          organizationId: orgId, status: "active",
          createdAt: NOW, updatedAt: NOW,
        });
        await ctx.db.insert("certificates", {
          technicianId: id, certificateType: "A&P",
          certificateNumber: "AP666666",
          issueDate: NOW - ONE_YEAR_MS * 15,
          ratings: ["airframe", "powerplant"],
          hasIaAuthorization: true,
          iaExpiryDate: NOW - ONE_YEAR_MS * 2,  // ← EXPIRED 2 YEARS AGO
          iaRenewalActivities: [],
          repairStationAuthorizations: [],
          active: true, createdAt: NOW, updatedAt: NOW,
        });
        return id;
      });

      const aircraftId = await isolated.run(async (ctx) =>
        ctx.db.insert("aircraft", {
          make: "Cessna", model: "172S", serialNumber: "IA-EXPIRED-TEST-01",
          currentRegistration: "N4444T",
          experimental: false, aircraftCategory: "normal", engineCount: 1,
          totalTimeAirframeHours: 1200.0, totalTimeAirframeAsOfDate: NOW,
          status: "in_maintenance",
          operatingOrganizationId: orgId, createdByOrganizationId: orgId,
          createdAt: NOW, updatedAt: NOW,
        })
      );

      const woId = await isolated.mutation(createWorkOrder, {
        organizationId: orgId, aircraftId,
        workOrderNumber: "WO-IA-EXPIRED-01", workOrderType: "annual_inspection",
        description: "Expired IA test.", priority: "routine",
        callerUserId: "user_dana_expired",
      });
      await isolated.mutation(openWorkOrder, {
        workOrderId: woId, organizationId: orgId,
        aircraftTotalTimeAtOpen: 1200.0,
        assignedTechnicianIds: [danaId],
        callerUserId: "user_dana_expired",
      });

      const tcId = await isolated.mutation(createTaskCard, {
        workOrderId: woId, organizationId: orgId,
        taskCardNumber: "TC-IA-EXPIRED-01",
        title: "Annual Inspection — IA step",
        taskType: "inspection",
        approvedDataSource: "14 CFR Part 43 Appendix D",
        steps: [
          {
            stepNumber: 1,
            description: "Annual inspection — IA required.",
            requiresSpecialTool: false, signOffRequired: true, signOffRequiresIa: true,
          },
        ],
        callerUserId: "user_dana_expired",
      });

      const steps = await isolated.run(async (ctx) =>
        ctx.db.query("taskCardSteps")
          .withIndex("by_task_card", (q) => q.eq("taskCardId", tcId))
          .collect()
      );

      const authEvent = await isolated.run(async (ctx) =>
        ctx.db.insert("signatureAuthEvents", {
          clerkEventId: "evt_ia_expired",
          clerkSessionId: "sess_ia_expired",
          userId: "user_dana_expired",
          technicianId: danaId,
          authenticatedLegalName: "Dana Kim",
          authenticatedCertNumber: "AP666666",
          authMethod: "pin",
          intendedTable: "taskCardSteps",
          authenticatedAt: NOW,
          expiresAt: NOW + FIVE_MINUTES_MS,
          consumed: false,
        })
      );

      // ── Assert: expired IA cannot sign IA-required step — no grace period ──
      await expect(
        isolated.mutation(completeStep, {
          stepId: steps[0]._id, taskCardId: tcId, organizationId: orgId,
          action: "complete", signatureAuthEventId: authEvent,
          ratingsExercised: ["ia"],
          callerUserId: "user_dana_expired", callerTechnicianId: danaId,
        })
      ).rejects.toThrow(/IA_EXPIRED|IA.*expired|expired.*IA|expiry|March 31/i);

      const step = await isolated.run(async (ctx) => ctx.db.get(steps[0]._id));
      expect(step?.status).toBe("pending");

      // Auth event must not be consumed on a thrown mutation
      const event = await isolated.run(async (ctx) => ctx.db.get(authEvent));
      expect(event?.consumed).toBe(false);
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PATH 7: workPerformed < 50 characters blocks maintenance record creation
  // ═══════════════════════════════════════════════════════════════════════════

  it(
    "REJECT-MR-01: createMaintenanceRecord throws WORK_PERFORMED_TOO_SHORT when " +
    "workPerformed.length < 50 (14 CFR AC 43-9C minimum content)",
    async () => {
      /**
       * Failure mode guarded:
       *   A mechanic creates a maintenance record with a minimal description:
       *   "100-hr insp. OK." (17 characters). This is legally insufficient under
       *   AC 43-9C. The mutation must throw before creating the record.
       *
       *   Linda's requirement: "If the software allows someone to create a legally
       *   insufficient maintenance record without friction, they will."
       *   The friction is a hard throw, not a warning.
       */
      const isolated = convexTest(schema);

      const orgId = await isolated.run(async (ctx) =>
        ctx.db.insert("organizations", {
          name: "Test MRO Short WP",
          part145Ratings: [],
          address: "1 Short St", city: "Tucson", state: "AZ", zip: "85706", country: "US",
          subscriptionTier: "starter", active: true, createdAt: NOW, updatedAt: NOW,
        })
      );

      const techId = await isolated.run(async (ctx) => {
        const id = await ctx.db.insert("technicians", {
          legalName: "Test Tech Short",
          userId: "user_short_wp",
          employeeId: "EMP-SHORT",
          organizationId: orgId, status: "active",
          createdAt: NOW, updatedAt: NOW,
        });
        await ctx.db.insert("certificates", {
          technicianId: id, certificateType: "A&P", certificateNumber: "AP111222",
          issueDate: NOW - ONE_YEAR_MS * 2, ratings: ["airframe"],
          hasIaAuthorization: false, iaRenewalActivities: [],
          repairStationAuthorizations: [], active: true, createdAt: NOW, updatedAt: NOW,
        });
        return id;
      });

      const aircraftId = await isolated.run(async (ctx) =>
        ctx.db.insert("aircraft", {
          make: "Cessna", model: "172S", serialNumber: "SHORTWP-TEST-01",
          currentRegistration: "N3333T",
          experimental: false, aircraftCategory: "normal", engineCount: 1,
          totalTimeAirframeHours: 600.0, totalTimeAirframeAsOfDate: NOW,
          status: "in_maintenance",
          operatingOrganizationId: orgId, createdByOrganizationId: orgId,
          createdAt: NOW, updatedAt: NOW,
        })
      );

      const woId = await isolated.mutation(createWorkOrder, {
        organizationId: orgId, aircraftId,
        workOrderNumber: "WO-SHORTWP-01", workOrderType: "routine",
        description: "Short work performed test.", priority: "routine",
        callerUserId: "user_short_wp",
      });
      await isolated.mutation(openWorkOrder, {
        workOrderId: woId, organizationId: orgId,
        aircraftTotalTimeAtOpen: 600.0,
        assignedTechnicianIds: [techId],
        callerUserId: "user_short_wp",
      });

      const mrAuth = await isolated.run(async (ctx) =>
        ctx.db.insert("signatureAuthEvents", {
          clerkEventId: "evt_short_wp",
          clerkSessionId: "sess_short_wp",
          userId: "user_short_wp",
          technicianId: techId,
          authenticatedLegalName: "Test Tech Short",
          authenticatedCertNumber: "AP111222",
          authMethod: "pin",
          intendedTable: "maintenanceRecords",
          authenticatedAt: NOW,
          expiresAt: NOW + FIVE_MINUTES_MS,
          consumed: false,
        })
      );

      const TOO_SHORT_DESCRIPTION = "100-hr insp. OK.";  // 17 characters — UNDER 50
      expect(TOO_SHORT_DESCRIPTION.length).toBeLessThan(50);

      // ── Assert: short workPerformed must throw ──
      await expect(
        isolated.mutation(createMaintenanceRecord, {
          workOrderId: woId, organizationId: orgId,
          recordType: "maintenance_43_9",
          workPerformed: TOO_SHORT_DESCRIPTION,  // ← TOO SHORT
          approvedDataReference: "AMM 05-10-00",
          partsReplaced: [],
          completionDate: NOW,
          ratingsExercised: ["airframe"],
          signatureAuthEventId: mrAuth,
          callerUserId: "user_short_wp",
          callerTechnicianId: techId,
        })
      ).rejects.toThrow(/WORK_PERFORMED_TOO_SHORT|minimum.*50|50.*character|AC 43-9C/i);

      // No maintenance record should have been created
      const records = await isolated.run(async (ctx) =>
        ctx.db.query("maintenanceRecords")
          .withIndex("by_work_order", (q) => q.eq("workOrderId", woId))
          .collect()
      );
      expect(records).toHaveLength(0);
    }
  );

}); // END: negative paths
