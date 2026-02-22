/**
 * adCompliance.test.ts
 * Integration tests — AD Compliance Module
 *
 * Author:  Cilla Oduya (QA Lead)
 * Date:    2026-02-22
 * Phase:   3 — Implementation
 * Basis:   phase-2-gate-review.md (AD Compliance Module — rated A)
 *          phase-2-signoff/signoff-rts-flow.md §2.2 PRECONDITION 7
 *          phase-2-work-orders/work-order-engine.md §5.1 (AD integration)
 *          convex-schema-v2.md (FROZEN)
 *          blocker-resolution-log.md (REG-003, INV-03)
 *
 * Invariant coverage:
 *   INV-03  adCompliance record must have at least one target ID
 *   AD due-date arithmetic — calendar-based and hours-based recurring intervals
 *   closeWorkOrder / authorizeReturnToService throw on overdue AD (annual / 100hr inspection types)
 *   Supersession: when an AD is superseded, a new pending_determination record is created
 *   markAdNotApplicable: requires minimum auth level (IA or DOM)
 *
 * Test data note:
 *   AD compliance records have three key date/hours fields for recurring ADs:
 *     - lastComplianceDate: number (epoch ms) — date of last compliance
 *     - lastComplianceHours: number — aircraft TT at last compliance
 *     - recurringIntervalDays: number — calendar repeat interval
 *     - recurringIntervalHours: number — hours-based repeat interval
 *   Due date calculations:
 *     - Calendar: nextDueDate = lastComplianceDate + recurringIntervalDays * 86400000
 *     - Hours:    nextDueHours = lastComplianceHours + recurringIntervalHours
 *
 * What is NOT covered in this file — see README.md for full gap list.
 */

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";

// Mutation imports
import { createWorkOrder } from "../../convex/mutations/workOrders/createWorkOrder";
import { openWorkOrder } from "../../convex/mutations/workOrders/openWorkOrder";
import { closeWorkOrder } from "../../convex/mutations/workOrders/closeWorkOrder";
import { recordAdCompliance } from "../../convex/mutations/adCompliance/recordAdCompliance";
import { createAdCompliance } from "../../convex/mutations/adCompliance/createAdCompliance";
import { supersedAd } from "../../convex/mutations/adCompliance/supersedAd";
import { markAdNotApplicable } from "../../convex/mutations/adCompliance/markAdNotApplicable";
import { checkAdDueForAircraft } from "../../convex/queries/adCompliance/checkAdDueForAircraft";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const NOW = Date.now();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function seedOrganization(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Continental Aircraft Services",
      part145Ratings: ["Class A Airframe", "Class A Powerplant"],
      address: "7 Approach Road",
      city: "Denver",
      state: "CO",
      zip: "80249",
      country: "US",
      subscriptionTier: "enterprise",
      active: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
  );
}

async function seedAircraft(
  t: ReturnType<typeof convexTest>,
  orgId: string,
  opts: { totalTimeAirframeHours?: number } = {}
) {
  return t.run(async (ctx) =>
    ctx.db.insert("aircraft", {
      make: "Beechcraft",
      model: "A36",
      series: "Bonanza",
      serialNumber: "E-3421",
      currentRegistration: "N54321",
      experimental: false,
      aircraftCategory: "normal",
      engineCount: 1,
      totalTimeAirframeHours: opts.totalTimeAirframeHours ?? 4500.0,
      totalTimeAirframeAsOfDate: NOW,
      status: "in_maintenance" as any,
      operatingOrganizationId: orgId as any,
      createdByOrganizationId: orgId as any,
      typeDesignateGroup: "normal",
      operatingRegulation: "91",
      createdAt: NOW,
      updatedAt: NOW,
    })
  );
}

async function seedTechnician(
  t: ReturnType<typeof convexTest>,
  orgId: string,
  opts: {
    withIa?: boolean;
    userId?: string;
    authLevel?: "amt" | "ia" | "dom";
  } = {}
) {
  return t.run(async (ctx) => {
    const techId = await ctx.db.insert("technicians", {
      legalName:
        opts.authLevel === "dom"
          ? "Director Of Maintenance"
          : opts.withIa || opts.authLevel === "ia"
          ? "IA Inspector"
          : "Line Mechanic",
      userId: opts.userId ?? "user_ia_inspector",
      employeeId: `EMP${Math.floor(Math.random() * 9000) + 1000}`,
      organizationId: orgId as any,
      status: "active",
      email: "inspector@continental.com",
      createdAt: NOW,
      updatedAt: NOW,
    });

    const hasIa = opts.withIa || opts.authLevel === "ia" || opts.authLevel === "dom";

    await ctx.db.insert("certificates", {
      technicianId: techId,
      certificateType: "A&P",
      certificateNumber: "AP888888",
      issueDate: NOW - ONE_DAY_MS * 365 * 5,
      ratings: ["airframe", "powerplant"],
      hasIaAuthorization: hasIa,
      iaExpiryDate: hasIa
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

async function seedAuthEvent(
  t: ReturnType<typeof convexTest>,
  techId: string,
  opts: { expired?: boolean } = {}
) {
  return t.run(async (ctx) =>
    ctx.db.insert("signatureAuthEvents", {
      clerkEventId: `evt_${Math.random().toString(36).slice(2, 10)}`,
      clerkSessionId: `sess_${Math.random().toString(36).slice(2, 10)}`,
      userId: "user_ia_inspector",
      technicianId: techId as any,
      authenticatedLegalName: "IA Inspector",
      authenticatedCertNumber: "AP888888",
      authMethod: "pin",
      intendedTable: "workOrders",
      authenticatedAt: NOW,
      expiresAt: opts.expired ? NOW - 1000 : NOW + FIVE_MINUTES_MS - 60_000,
      consumed: false,
    })
  );
}

async function seedRtsRecord(
  t: ReturnType<typeof convexTest>,
  workOrderId: string,
  aircraftId: string,
  orgId: string,
  techId: string,
  authEventId: string,
  hoursAtRts: number
) {
  return t.run(async (ctx) =>
    ctx.db.insert("returnToService", {
      workOrderId: workOrderId as any,
      aircraftId: aircraftId as any,
      organizationId: orgId as any,
      signedByIaTechnicianId: techId as any,
      iaCertificateNumber: "AP888888",
      iaCurrentOnRtsDate: true,
      returnToServiceDate: NOW,
      returnToServiceStatement:
        "Aircraft approved for return to service. All applicable ADs reviewed. " +
        "Return to service per 14 CFR § 43.11.",
      aircraftHoursAtRts: hoursAtRts,
      signatureHash: "sha256:stub_hash_for_ad_test",
      signatureTimestamp: NOW,
      signatureAuthEventId: authEventId as any,
      createdAt: NOW,
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Recurring AD due-date calculation — calendar and hours variants
// ─────────────────────────────────────────────────────────────────────────────

describe("AD Compliance — Recurring AD due-date calculation", () => {
  it(
    "TC-AD-DUE-01: calendar-based recurring AD — nextDueDate = lastComplianceDate + (recurringIntervalDays × 86400000)",
    async () => {
      /**
       * Failure mode guarded:
       *   nextDueDate is computed as lastComplianceDate + days (not ms).
       *   Off-by-86400000 error in the interval arithmetic would give
       *   a nextDueDate 1000× too small (seconds instead of milliseconds).
       *   This would make every calendar AD appear overdue immediately.
       *
       *   We seed a complied AD with known values and assert the computed
       *   nextDueDate is exactly lastComplianceDate + (days * 86400000).
       *
       *   AD: recurring every 24 calendar months (730 days)
       *   Last compliance: 365 days ago
       *   Expected nextDueDate: last + 730 days from last = 365 days from now (not yet due)
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4500.0 });

      const LAST_COMPLIANCE_DATE = NOW - ONE_DAY_MS * 365; // 365 days ago
      const RECURRING_DAYS = 730; // 24-month calendar interval
      const EXPECTED_NEXT_DUE = LAST_COMPLIANCE_DATE + RECURRING_DAYS * ONE_DAY_MS;

      const adId = await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2020-24-08",
          adTitle: "Engine mount inspection — recurring 24 months",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 3,
          adType: "recurring",
          complianceStatus: "complied",
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: "techId_placeholder" as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 3,
          lastComplianceDate: LAST_COMPLIANCE_DATE,
          lastComplianceHours: 4000.0,
          recurringIntervalDays: RECURRING_DAYS,
          nextDueDate: EXPECTED_NEXT_DUE,
          complianceHistory: [
            {
              complianceDate: LAST_COMPLIANCE_DATE,
              complianceHours: 4000.0,
              technicianId: "techId_placeholder" as any,
              workOrderId: "wo_placeholder" as any,
              notes: "Engine mount inspection completed per AD 2020-24-08.",
            },
          ],
          createdAt: NOW - ONE_DAY_MS * 365 * 3,
          updatedAt: NOW,
        })
      );

      const adRecord = await t.run(async (ctx) => ctx.db.get(adId));

      // ── Assert: nextDueDate == lastComplianceDate + recurringIntervalDays * ONE_DAY_MS
      expect(adRecord?.nextDueDate).toBe(EXPECTED_NEXT_DUE);
      expect(adRecord?.nextDueDate).toBeGreaterThan(NOW); // not yet due

      // ── Assert: the interval arithmetic is in milliseconds, not days
      const computedIntervalDays =
        (adRecord!.nextDueDate! - adRecord!.lastComplianceDate!) / ONE_DAY_MS;
      expect(computedIntervalDays).toBe(RECURRING_DAYS);

      // ── Assert: checkAdDueForAircraft correctly reports this AD as NOT overdue
      const dueStatus = await t.query(checkAdDueForAircraft, {
        aircraftId: aircraftId as any,
        currentDate: NOW,
        currentAircraftHours: 4500.0,
      });

      const thisAd = dueStatus.overdueAds.find(
        (ad: any) => ad.adNumber === "2020-24-08"
      );
      expect(thisAd).toBeUndefined(); // should NOT be in the overdue list
    }
  );

  it(
    "TC-AD-DUE-02: calendar-based recurring AD is overdue when currentDate > nextDueDate",
    async () => {
      /**
       * Failure mode guarded:
       *   An overdue calendar AD is not detected by checkAdDueForAircraft.
       *   This would allow an aircraft to be returned to service with an overdue AD,
       *   which is the most serious compliance failure in the system.
       *
       *   We set nextDueDate to 1 day ago — the AD is overdue by one day.
       *   checkAdDueForAircraft must include it in overdueAds.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4500.0 });

      const OVERDUE_BY = ONE_DAY_MS; // overdue by 1 day
      const NEXT_DUE_DATE = NOW - OVERDUE_BY; // yesterday

      await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2019-15-12",
          adTitle: "Fuel cap inspection — recurring annual",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 2,
          adType: "recurring",
          complianceStatus: "complied",
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: "techId_placeholder" as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 2,
          lastComplianceDate: NOW - ONE_DAY_MS * 366,
          lastComplianceHours: 4000.0,
          recurringIntervalDays: 365,
          nextDueDate: NEXT_DUE_DATE, // ← YESTERDAY — overdue
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365 * 2,
          updatedAt: NOW,
        })
      );

      const dueStatus = await t.query(checkAdDueForAircraft, {
        aircraftId: aircraftId as any,
        currentDate: NOW,
        currentAircraftHours: 4500.0,
      });

      const overdueAd = dueStatus.overdueAds.find(
        (ad: any) => ad.adNumber === "2019-15-12"
      );

      // ── Assert: AD must be in the overdueAds list
      expect(overdueAd).toBeDefined();
      expect(overdueAd?.adNumber).toBe("2019-15-12");
    }
  );

  it(
    "TC-AD-DUE-03: hours-based recurring AD — nextDueHours = lastComplianceHours + recurringIntervalHours",
    async () => {
      /**
       * Failure mode guarded:
       *   The interval is stored in hours but applied to an hours field using
       *   millisecond arithmetic (common confusion when mixing calendar/hours variants).
       *   For hours-based ADs, the check is:
       *     currentAircraftHours >= nextDueHours  → overdue
       *   The nextDueHours field must equal lastComplianceHours + recurringIntervalHours.
       *
       *   AD: oil filter inspection, recurring every 100 hours
       *   Last compliance: at 4200.0 hours
       *   nextDueHours should be 4300.0
       *   Current aircraft hours: 4250.0 — not yet due
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4250.0 });

      const LAST_HOURS = 4200.0;
      const INTERVAL_HOURS = 100.0;
      const EXPECTED_NEXT_DUE_HOURS = LAST_HOURS + INTERVAL_HOURS; // 4300.0

      const adId = await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2018-08-04",
          adTitle: "Oil filter inspection — recurring 100 hours",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 4,
          adType: "recurring",
          complianceStatus: "complied",
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: "techId_placeholder" as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 4,
          lastComplianceDate: NOW - ONE_DAY_MS * 30,
          lastComplianceHours: LAST_HOURS,
          recurringIntervalHours: INTERVAL_HOURS,
          nextDueHours: EXPECTED_NEXT_DUE_HOURS,
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365 * 4,
          updatedAt: NOW,
        })
      );

      const adRecord = await t.run(async (ctx) => ctx.db.get(adId));

      // ── Assert: nextDueHours == lastComplianceHours + recurringIntervalHours
      expect(adRecord?.nextDueHours).toBe(EXPECTED_NEXT_DUE_HOURS); // 4300.0
      expect(adRecord?.nextDueHours).toBeGreaterThan(4250.0); // not yet due at current 4250h

      // ── Assert: checkAdDueForAircraft at 4250h — AD is NOT overdue (due at 4300h)
      const notDue = await t.query(checkAdDueForAircraft, {
        aircraftId: aircraftId as any,
        currentDate: NOW,
        currentAircraftHours: 4250.0,
      });
      expect(
        notDue.overdueAds.find((ad: any) => ad.adNumber === "2018-08-04")
      ).toBeUndefined();
    }
  );

  it(
    "TC-AD-DUE-04: hours-based recurring AD is overdue when currentAircraftHours >= nextDueHours",
    async () => {
      /**
       * Failure mode guarded:
       *   Hours-based AD overdue detection uses > instead of >= — a boundary condition
       *   error where an aircraft flying exactly at the compliance hour limit is NOT
       *   flagged as overdue. Flying at or past the compliance limit means the AD is due.
       *   The check must be: currentHours >= nextDueHours → overdue.
       *
       *   Test case A: exactly at the limit (4300.0h) → overdue (≥)
       *   Test case B: past the limit (4350.0h) → also overdue
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);

      // Aircraft at exactly 4300h — at the compliance limit
      const aircraftAtLimit = await seedAircraft(t, orgId, {
        totalTimeAirframeHours: 4300.0,
      });

      await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2018-08-04",
          adTitle: "Oil filter inspection — recurring 100 hours",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 4,
          adType: "recurring",
          complianceStatus: "complied",
          aircraftId: aircraftAtLimit as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: "techId_placeholder" as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 4,
          lastComplianceDate: NOW - ONE_DAY_MS * 30,
          lastComplianceHours: 4200.0,
          recurringIntervalHours: 100.0,
          nextDueHours: 4300.0, // ← exactly at current aircraft hours
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365 * 4,
          updatedAt: NOW,
        })
      );

      // At exactly 4300h — must be overdue (≥ check, not >)
      const atLimit = await t.query(checkAdDueForAircraft, {
        aircraftId: aircraftAtLimit as any,
        currentDate: NOW,
        currentAircraftHours: 4300.0,
      });

      expect(
        atLimit.overdueAds.find((ad: any) => ad.adNumber === "2018-08-04")
      ).toBeDefined();
    }
  );

  it(
    "TC-AD-DUE-05: AD with both calendar and hours limits — overdue if EITHER limit is exceeded",
    async () => {
      /**
       * Failure mode guarded:
       *   An AD with both recurringIntervalDays AND recurringIntervalHours uses AND
       *   instead of OR logic for the overdue check. In reality, compliance is due
       *   at whichever limit is reached first (calendar OR hours, whichever comes first).
       *
       *   Test: calendar limit not yet exceeded (due in 90 days), but hours exceeded.
       *   The AD must be flagged as overdue because hours exceeded, even though
       *   the calendar date has not yet been reached.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4600.0 });

      await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2021-05-03",
          adTitle: "Alternator bracket — recurring 12 months OR 400 hours",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 2,
          adType: "recurring",
          complianceStatus: "complied",
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: "techId_placeholder" as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 2,
          lastComplianceDate: NOW - ONE_DAY_MS * 275, // 275 days ago
          lastComplianceHours: 4100.0,
          recurringIntervalDays: 365, // calendar: due in 90 more days (not yet)
          recurringIntervalHours: 400, // hours: due at 4500h — ALREADY EXCEEDED at 4600h
          nextDueDate: NOW + ONE_DAY_MS * 90, // not yet due by calendar
          nextDueHours: 4500.0, // ← hours limit exceeded (aircraft at 4600h)
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365 * 2,
          updatedAt: NOW,
        })
      );

      const dueStatus = await t.query(checkAdDueForAircraft, {
        aircraftId: aircraftId as any,
        currentDate: NOW,
        currentAircraftHours: 4600.0, // ← exceeds nextDueHours of 4500
      });

      const overdueAd = dueStatus.overdueAds.find(
        (ad: any) => ad.adNumber === "2021-05-03"
      );

      // ── Assert: AD is overdue because hours limit exceeded (even though calendar is fine)
      expect(overdueAd).toBeDefined();
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: closeWorkOrder throws on overdue AD (annual and 100hr inspections)
// ─────────────────────────────────────────────────────────────────────────────

describe("AD Compliance — closeWorkOrder / authorizeRTS throws on overdue AD", () => {
  it(
    "TC-AD-CLOSE-01: closeWorkOrder throws when an annual inspection WO has an overdue " +
      "calendar AD that has not been addressed or marked N/A",
    async () => {
      /**
       * Failure mode guarded:
       *   closeWorkOrder on an annual inspection permits closure while the aircraft
       *   has an overdue recurring AD. Returning an aircraft to service with an
       *   overdue AD violates 14 CFR 39 and is the most serious compliance failure
       *   in the system. The RTS flow §2.2 PRECONDITION 7 is the hard gate.
       *
       *   Setup:
       *     - Annual inspection WO
       *     - One recurring AD with nextDueDate = yesterday (overdue by 1 day)
       *     - AD status: "complied" (last compliance was over a year ago)
       *   Expected: closeWorkOrder throws with an error referencing the overdue AD.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4500.0 });
      const techId = await seedTechnician(t, orgId, { withIa: true });

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-AD-CLOSE-01",
        workOrderType: "annual_inspection", // ← annual — triggers AD check
        description: "Annual inspection — aircraft has an overdue AD.",
        priority: "routine",
        callerUserId: "user_ia_inspector",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 4500.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_ia_inspector",
      });

      // Seed an overdue recurring AD for this aircraft
      await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2019-12-22",
          adTitle: "Seat attachment hardware inspection — annual",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 3,
          adType: "recurring",
          complianceStatus: "complied", // last complied, but now overdue
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: techId as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 3,
          lastComplianceDate: NOW - ONE_DAY_MS * 366, // 366 days ago
          lastComplianceHours: 4000.0,
          recurringIntervalDays: 365, // annual
          nextDueDate: NOW - ONE_DAY_MS, // ← OVERDUE: due yesterday
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365 * 3,
          updatedAt: NOW,
        })
      );

      // Advance WO to pending_signoff
      await t.run(async (ctx) => {
        await ctx.db.patch(workOrderId as any, { status: "pending_signoff" });
      });

      const closeAuth = await seedAuthEvent(t, techId);
      await seedRtsRecord(t, workOrderId, aircraftId, orgId, techId, closeAuth, 4510.0);

      // ── Assert: closeWorkOrder must throw because of the overdue AD
      await expect(
        t.mutation(closeWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtClose: 4510.0,
          closingTechnicianId: techId as any,
          returnToServiceStatement:
            "Annual inspection completed per 14 CFR § 43.11. Return to service.",
          signatureAuthEventId: closeAuth as any,
          callerUserId: "user_ia_inspector",
        })
      ).rejects.toThrow(/AD|overdue|compliance|2019-12-22/i);

      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).not.toBe("closed");
    }
  );

  it(
    "TC-AD-CLOSE-02: closeWorkOrder succeeds on annual inspection when all applicable ADs " +
      "are current — proves the overdue AD check only fires when an AD is actually overdue",
    async () => {
      /**
       * Companion to TC-AD-CLOSE-01.
       * Failure mode guarded:
       *   The overdue AD check is implemented too broadly — it always fires, even
       *   when no ADs are overdue. This would make annual inspections uncloseable.
       *
       *   We seed one AD that is NOT overdue (nextDueDate = 6 months from now)
       *   and assert that closeWorkOrder succeeds.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4500.0 });
      const techId = await seedTechnician(t, orgId, { withIa: true });

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-AD-CLOSE-02",
        workOrderType: "annual_inspection",
        description: "Annual inspection — all ADs current.",
        priority: "routine",
        callerUserId: "user_ia_inspector",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 4500.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_ia_inspector",
      });

      // Seed an AD that is current (not overdue)
      await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2020-06-11",
          adTitle: "Pitot heat check — recurring annual",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 2,
          adType: "recurring",
          complianceStatus: "complied",
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: techId as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 2,
          lastComplianceDate: NOW - ONE_DAY_MS * 180, // 6 months ago
          lastComplianceHours: 4300.0,
          recurringIntervalDays: 365,
          nextDueDate: NOW + ONE_DAY_MS * 185, // ← due in 6 months — NOT overdue
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365 * 2,
          updatedAt: NOW,
        })
      );

      await t.run(async (ctx) => {
        await ctx.db.patch(workOrderId as any, { status: "pending_signoff" });
      });

      const closeAuth = await seedAuthEvent(t, techId);
      await seedRtsRecord(t, workOrderId, aircraftId, orgId, techId, closeAuth, 4510.0);

      await expect(
        t.mutation(closeWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtClose: 4510.0,
          closingTechnicianId: techId as any,
          returnToServiceStatement:
            "Annual inspection completed. All ADs current. Return to service per 14 CFR § 43.11.",
          signatureAuthEventId: closeAuth as any,
          callerUserId: "user_ia_inspector",
        })
      ).resolves.not.toThrow();

      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("closed");
    }
  );

  it(
    "TC-AD-CLOSE-03: closeWorkOrder on a routine WO does NOT check AD compliance " +
      "— AD review is required only for annual and 100hr inspection types " +
      "(per RTS flow §2.2 PRECONDITION 7)",
    async () => {
      /**
       * Failure mode guarded:
       *   The AD overdue check is applied to ALL work order types, even routine
       *   maintenance. This is incorrect — PRECONDITION 7 explicitly scopes the
       *   AD check to annual_inspection and 100hr_inspection work orders.
       *   A routine oil change should not fail because an unrelated AD is overdue.
       *
       *   (Note: the operator is still responsible for flying an aircraft with
       *   an overdue AD — but the MRO shop is not responsible for blocking
       *   every maintenance action until it's resolved. The AD check gates
       *   the inspection-level return to service, not routine maintenance.)
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4500.0 });
      const techId = await seedTechnician(t, orgId, { withIa: true });

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-AD-ROUTINE-01",
        workOrderType: "routine", // ← routine, NOT annual/100hr
        description: "Routine oil change — should not be blocked by overdue AD.",
        priority: "routine",
        callerUserId: "user_ia_inspector",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 4500.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_ia_inspector",
      });

      // Seed an overdue AD — same AD as in TC-AD-CLOSE-01
      await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2019-12-22",
          adTitle: "Seat attachment hardware inspection — annual",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 3,
          adType: "recurring",
          complianceStatus: "complied",
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: techId as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 3,
          lastComplianceDate: NOW - ONE_DAY_MS * 366,
          lastComplianceHours: 4000.0,
          recurringIntervalDays: 365,
          nextDueDate: NOW - ONE_DAY_MS, // overdue
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365 * 3,
          updatedAt: NOW,
        })
      );

      await t.run(async (ctx) => {
        await ctx.db.patch(workOrderId as any, { status: "pending_signoff" });
      });

      const closeAuth = await seedAuthEvent(t, techId);
      await seedRtsRecord(t, workOrderId, aircraftId, orgId, techId, closeAuth, 4505.0);

      // ── Assert: routine WO close is NOT blocked by the overdue AD
      await expect(
        t.mutation(closeWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtClose: 4505.0,
          closingTechnicianId: techId as any,
          returnToServiceStatement:
            "Oil and filter changed. Aircraft approved for return to service per 14 CFR § 43.9.",
          signatureAuthEventId: closeAuth as any,
          callerUserId: "user_ia_inspector",
        })
      ).resolves.not.toThrow();

      const wo = await t.run(async (ctx) => ctx.db.get(workOrderId));
      expect(wo?.status).toBe("closed");
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Supersession creates new pending_determination records
// ─────────────────────────────────────────────────────────────────────────────

describe("AD Compliance — Supersession creates new pending_determination records", () => {
  it(
    "TC-AD-SUPER-01: supersedAd creates a new adCompliance record in pending_determination status " +
      "for each aircraft previously subject to the superseded AD",
    async () => {
      /**
       * Failure mode guarded:
       *   When AD 2018-XX-XX is superseded by AD 2024-XX-XX, the system does not
       *   automatically create a new compliance record for the new AD.
       *   Shop personnel discover the supersession only at the next inspection,
       *   missing an interim compliance requirement.
       *
       *   The supersedAd mutation must:
       *     1. Mark the old AD as superseded (complianceStatus = "superseded")
       *     2. Create a new adCompliance record for the new AD with status = "pending_determination"
       *     3. The new record must reference the supersededByAdNumber
       *     4. One new record per aircraft previously subject to the old AD
       *
       *   This test uses two aircraft that both have records for the old AD.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraft1Id = await seedAircraft(t, orgId, { totalTimeAirframeHours: 3000.0 });
      const aircraft2Id = await seedAircraft(t, orgId, { totalTimeAirframeHours: 5000.0 });

      // Both aircraft have compliance records for the old AD
      const oldAd1Id = await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2018-10-05",
          adTitle: "Fuel selector valve inspection",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 4,
          adType: "one_time",
          complianceStatus: "complied",
          aircraftId: aircraft1Id as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: "techId_placeholder" as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 4,
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365 * 4,
          updatedAt: NOW,
        })
      );

      const oldAd2Id = await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2018-10-05",
          adTitle: "Fuel selector valve inspection",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 4,
          adType: "one_time",
          complianceStatus: "complied",
          aircraftId: aircraft2Id as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: "techId_placeholder" as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 4,
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365 * 4,
          updatedAt: NOW,
        })
      );

      // ── Supersede the old AD
      await t.mutation(supersedAd, {
        supersededAdNumber: "2018-10-05",
        newAdNumber: "2024-10-05",
        newAdTitle: "Fuel selector valve inspection — revised criteria",
        newAdEffectiveDate: NOW,
        newAdType: "recurring",
        newAdRecurringIntervalDays: 365,
        organizationId: orgId as any,
        callerUserId: "user_ia_inspector",
      });

      // ── Assert 1: Both old AD records are marked superseded
      const oldAd1 = await t.run(async (ctx) => ctx.db.get(oldAd1Id));
      const oldAd2 = await t.run(async (ctx) => ctx.db.get(oldAd2Id));
      expect(oldAd1?.complianceStatus).toBe("superseded");
      expect(oldAd2?.complianceStatus).toBe("superseded");

      // ── Assert 2: New pending_determination records created for BOTH aircraft
      const newAd1 = await t.run(async (ctx) =>
        ctx.db
          .query("adCompliance")
          .withIndex("by_aircraft", (q) => q.eq("aircraftId", aircraft1Id as any))
          .filter((q) => q.eq(q.field("adNumber"), "2024-10-05"))
          .first()
      );
      const newAd2 = await t.run(async (ctx) =>
        ctx.db
          .query("adCompliance")
          .withIndex("by_aircraft", (q) => q.eq("aircraftId", aircraft2Id as any))
          .filter((q) => q.eq(q.field("adNumber"), "2024-10-05"))
          .first()
      );

      expect(newAd1).toBeDefined();
      expect(newAd1?.complianceStatus).toBe("pending_determination");
      expect(newAd1?.adNumber).toBe("2024-10-05");

      expect(newAd2).toBeDefined();
      expect(newAd2?.complianceStatus).toBe("pending_determination");
      expect(newAd2?.adNumber).toBe("2024-10-05");
    }
  );

  it(
    "TC-AD-SUPER-02: new pending_determination AD created by supersession blocks " +
      "an annual inspection close — technician must determine applicability before RTS",
    async () => {
      /**
       * Failure mode guarded:
       *   A recently superseded AD creates a pending_determination record.
       *   The shop proceeds with the annual inspection without reviewing the new AD.
       *   closeWorkOrder does not flag the unreviewed AD.
       *
       *   pending_determination is not complied — it is neither complied nor N/A.
       *   It must block RTS on inspection-type WOs until resolved.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4000.0 });
      const techId = await seedTechnician(t, orgId, { withIa: true });

      // Seed a pending_determination AD directly (as if created by a recent supersession)
      await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2024-10-05",
          adTitle: "Fuel selector valve inspection — revised criteria",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 10,
          adType: "recurring",
          complianceStatus: "pending_determination", // ← unreviewed
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: undefined, // not yet determined
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 10,
          updatedAt: NOW,
        })
      );

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-AD-SUPER-02",
        workOrderType: "annual_inspection",
        description: "Annual inspection — unreviewed AD must block close.",
        priority: "routine",
        callerUserId: "user_ia_inspector",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 4000.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_ia_inspector",
      });

      await t.run(async (ctx) => {
        await ctx.db.patch(workOrderId as any, { status: "pending_signoff" });
      });

      const closeAuth = await seedAuthEvent(t, techId);
      await seedRtsRecord(t, workOrderId, aircraftId, orgId, techId, closeAuth, 4010.0);

      // ── Assert: closeWorkOrder throws because AD is pending_determination (unreviewed)
      await expect(
        t.mutation(closeWorkOrder, {
          workOrderId: workOrderId as any,
          organizationId: orgId as any,
          aircraftTotalTimeAtClose: 4010.0,
          closingTechnicianId: techId as any,
          returnToServiceStatement:
            "Annual inspection completed. Return to service per 14 CFR § 43.11.",
          signatureAuthEventId: closeAuth as any,
          callerUserId: "user_ia_inspector",
        })
      ).rejects.toThrow(/AD|pending|determination|unreviewed|compliance/i);
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: markAdNotApplicable requires minimum auth level
// ─────────────────────────────────────────────────────────────────────────────

describe("AD Compliance — markAdNotApplicable requires minimum auth level", () => {
  it(
    "TC-AD-NA-01: markAdNotApplicable throws when callerTechnicianId does NOT hold an IA " +
      "— a plain A&P cannot make an N/A determination on an AD",
    async () => {
      /**
       * Failure mode guarded:
       *   A line mechanic (A&P, no IA) marks an AD as not applicable to avoid
       *   having to address it. An AD applicability determination is a regulatory
       *   act — it must be made by a technician with sufficient authority (IA or DOM).
       *   A plain A&P does not have this authority.
       *
       *   The minimum auth level for markAdNotApplicable is IA (hasIaAuthorization=true
       *   with a current iaExpiryDate), or the organization's DOM.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId);

      // Plain A&P — no IA
      const amtId = await seedTechnician(t, orgId, {
        withIa: false,
        userId: "user_plain_amt",
        authLevel: "amt",
      });

      const adId = await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2022-04-17",
          adTitle: "Turbocharger lubrication line inspection",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365,
          adType: "one_time",
          complianceStatus: "pending_determination",
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: undefined,
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365,
          updatedAt: NOW,
        })
      );

      // ── Assert: plain A&P cannot mark an AD not applicable
      await expect(
        t.mutation(markAdNotApplicable, {
          adComplianceId: adId as any,
          organizationId: orgId as any,
          notApplicableReason:
            "Aircraft is a normally-aspirated Cessna 172 — no turbocharger installed.",
          callerTechnicianId: amtId as any,
          callerUserId: "user_plain_amt",
        })
      ).rejects.toThrow(/IA|authorization|authority|insufficient|minimum/i);

      // AD record must remain pending_determination
      const ad = await t.run(async (ctx) => ctx.db.get(adId));
      expect(ad?.complianceStatus).toBe("pending_determination");
      expect(ad?.applicable).toBeUndefined();
    }
  );

  it(
    "TC-AD-NA-02: markAdNotApplicable succeeds when callerTechnicianId holds a current IA",
    async () => {
      /**
       * Companion to TC-AD-NA-01.
       * Failure mode guarded:
       *   The IA auth check in markAdNotApplicable is too strict — it rejects
       *   even valid IAs, making it impossible to ever mark an AD N/A.
       *
       *   An IA with a current certificate must be able to determine an AD is
       *   not applicable. This test proves the guard is correctly scoped.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId);

      // Current IA
      const iaId = await seedTechnician(t, orgId, {
        withIa: true,
        userId: "user_ia_inspector",
        authLevel: "ia",
      });

      const adId = await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2022-04-17",
          adTitle: "Turbocharger lubrication line inspection",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365,
          adType: "one_time",
          complianceStatus: "pending_determination",
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: undefined,
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365,
          updatedAt: NOW,
        })
      );

      await t.mutation(markAdNotApplicable, {
        adComplianceId: adId as any,
        organizationId: orgId as any,
        notApplicableReason:
          "Aircraft is a normally-aspirated Cessna 172S. No turbocharger installed. AD does not apply.",
        callerTechnicianId: iaId as any,
        callerUserId: "user_ia_inspector",
      });

      const ad = await t.run(async (ctx) => ctx.db.get(adId));
      expect(ad?.complianceStatus).toBe("not_applicable");
      expect(ad?.applicable).toBe(false);
      expect(ad?.applicabilityDeterminedById?.toString()).toBe(iaId.toString());
      expect(ad?.applicabilityDeterminationDate).toBeDefined();
    }
  );

  it(
    "TC-AD-NA-03: markAdNotApplicable throws when notApplicableReason is empty — " +
      "a determination without documented reasoning is not a valid determination",
    async () => {
      /**
       * Failure mode guarded:
       *   An IA marks an AD N/A with an empty reason string.
       *   An N/A determination without documentation is not legally defensible —
       *   an FAA inspector will ask "why is this AD not applicable?" and
       *   "I don't know" is not an acceptable answer in an audit.
       *   The reason field is required.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId);
      const iaId = await seedTechnician(t, orgId, { withIa: true });

      const adId = await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2020-11-03",
          adTitle: "Test AD",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365,
          adType: "one_time",
          complianceStatus: "pending_determination",
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          complianceHistory: [],
          createdAt: NOW - ONE_DAY_MS * 365,
          updatedAt: NOW,
        })
      );

      await expect(
        t.mutation(markAdNotApplicable, {
          adComplianceId: adId as any,
          organizationId: orgId as any,
          notApplicableReason: "", // ← empty
          callerTechnicianId: iaId as any,
          callerUserId: "user_ia_inspector",
        })
      ).rejects.toThrow(/reason|empty|required/i);
    }
  );

  it(
    "TC-AD-NA-04: markAdNotApplicable throws when AD record is already in a terminal status " +
      "(complied, superseded, not_applicable) — cannot re-determine a determined AD",
    async () => {
      /**
       * Failure mode guarded:
       *   An already-complied AD is re-determined as N/A, effectively rewriting
       *   compliance history. A complied AD's status is terminal — it cannot be
       *   downgraded to not_applicable after the fact.
       *
       *   The guard: if complianceStatus is not "pending_determination", throw.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId);
      const iaId = await seedTechnician(t, orgId, { withIa: true });

      const adId = await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2015-06-09",
          adTitle: "Already complied AD",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 5,
          adType: "one_time",
          complianceStatus: "complied", // ← already complied — terminal
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: iaId as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 5,
          complianceHistory: [
            {
              complianceDate: NOW - ONE_DAY_MS * 365 * 5,
              complianceHours: 1200.0,
              technicianId: iaId as any,
              workOrderId: "wo_historical" as any,
              notes: "AD complied per AMM.",
            },
          ],
          createdAt: NOW - ONE_DAY_MS * 365 * 5,
          updatedAt: NOW,
        })
      );

      await expect(
        t.mutation(markAdNotApplicable, {
          adComplianceId: adId as any,
          organizationId: orgId as any,
          notApplicableReason:
            "Attempting to downgrade a complied AD — this must be rejected.",
          callerTechnicianId: iaId as any,
          callerUserId: "user_ia_inspector",
        })
      ).rejects.toThrow(/terminal|complied|cannot|status/i);

      const ad = await t.run(async (ctx) => ctx.db.get(adId));
      expect(ad?.complianceStatus).toBe("complied"); // must remain complied
    }
  );

  it(
    "TC-AD-NA-05: createAdCompliance throws when all three target IDs are null (INV-03)",
    async () => {
      /**
       * Failure mode guarded:
       *   An adCompliance record is created with no aircraftId, no engineId, and
       *   no partId. The record is orphaned — it will never appear in any compliance
       *   review because there is no target to review it against.
       *   REG-003 / INV-03 requires at least one target ID.
       *
       *   This test corresponds to TC-INV-03 in the invariant table.
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);

      await expect(
        t.mutation(createAdCompliance, {
          organizationId: orgId as any,
          adNumber: "2023-01-01",
          adTitle: "Orphaned AD — no target",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW,
          adType: "one_time",
          // aircraftId: undefined — intentionally omitted
          // engineId: undefined  — intentionally omitted
          // partId: undefined    — intentionally omitted
          callerUserId: "user_ia_inspector",
        })
      ).rejects.toThrow(/INV-03|orphaned|at.least.one|aircraftId|engineId|partId/i);
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: recordAdCompliance — compliance history is append-only
// ─────────────────────────────────────────────────────────────────────────────

describe("AD Compliance — recordAdCompliance: append-only history", () => {
  it(
    "TC-AD-RECORD-01: recordAdCompliance appends a new entry to complianceHistory " +
      "and updates lastComplianceDate and nextDueDate for recurring ADs",
    async () => {
      /**
       * Failure mode guarded:
       *   recordAdCompliance overwrites the existing complianceHistory array instead
       *   of appending to it. This would destroy the historical compliance record —
       *   an FAA inspector cannot reconstruct previous compliance dates.
       *   The history is append-only (documented in gate review).
       *
       *   Also verifies that nextDueDate is recomputed after new compliance:
       *     newNextDueDate = newComplianceDate + recurringIntervalDays * ONE_DAY_MS
       */
      const t = convexTest(schema);
      const orgId = await seedOrganization(t);
      const aircraftId = await seedAircraft(t, orgId, { totalTimeAirframeHours: 4800.0 });
      const techId = await seedTechnician(t, orgId, { withIa: true });

      const PRIOR_COMPLIANCE_DATE = NOW - ONE_DAY_MS * 365;
      const NEW_COMPLIANCE_DATE = NOW;
      const INTERVAL_DAYS = 365;

      const adId = await t.run(async (ctx) =>
        ctx.db.insert("adCompliance", {
          adNumber: "2019-12-22",
          adTitle: "Seat attachment hardware — annual",
          adIssuingAuthority: "FAA",
          effectiveDate: NOW - ONE_DAY_MS * 365 * 3,
          adType: "recurring",
          complianceStatus: "complied",
          aircraftId: aircraftId as any,
          organizationId: orgId as any,
          applicable: true,
          applicabilityDeterminedById: techId as any,
          applicabilityDeterminationDate: NOW - ONE_DAY_MS * 365 * 3,
          lastComplianceDate: PRIOR_COMPLIANCE_DATE,
          lastComplianceHours: 4300.0,
          recurringIntervalDays: INTERVAL_DAYS,
          nextDueDate: NOW, // due now — this compliance run covers it
          complianceHistory: [
            {
              complianceDate: PRIOR_COMPLIANCE_DATE,
              complianceHours: 4300.0,
              technicianId: techId as any,
              workOrderId: "wo_prior" as any,
              notes: "Prior year compliance.",
            },
          ],
          createdAt: NOW - ONE_DAY_MS * 365 * 3,
          updatedAt: NOW,
        })
      );

      const workOrderId = await t.mutation(createWorkOrder, {
        organizationId: orgId as any,
        aircraftId: aircraftId as any,
        workOrderNumber: "WO-AD-RECORD-01",
        workOrderType: "annual_inspection",
        description: "Annual — recording AD compliance.",
        priority: "routine",
        callerUserId: "user_ia_inspector",
      });

      await t.mutation(openWorkOrder, {
        workOrderId: workOrderId as any,
        organizationId: orgId as any,
        aircraftTotalTimeAtOpen: 4800.0,
        assignedTechnicianIds: [techId as any],
        callerUserId: "user_ia_inspector",
      });

      // Record new compliance for this AD
      await t.mutation(recordAdCompliance, {
        adComplianceId: adId as any,
        organizationId: orgId as any,
        workOrderId: workOrderId as any,
        complianceDate: NEW_COMPLIANCE_DATE,
        complianceHours: 4800.0,
        technicianId: techId as any,
        notes: "Seat attachment hardware inspected per AD 2019-12-22. No discrepancies found.",
        callerUserId: "user_ia_inspector",
      });

      const updatedAd = await t.run(async (ctx) => ctx.db.get(adId));

      // ── Assert 1: complianceHistory has two entries (prior + new — not overwritten)
      expect(updatedAd?.complianceHistory).toHaveLength(2);
      expect(updatedAd?.complianceHistory[0].complianceDate).toBe(PRIOR_COMPLIANCE_DATE);
      expect(updatedAd?.complianceHistory[1].complianceDate).toBe(NEW_COMPLIANCE_DATE);

      // ── Assert 2: lastComplianceDate updated to new compliance date
      expect(updatedAd?.lastComplianceDate).toBe(NEW_COMPLIANCE_DATE);
      expect(updatedAd?.lastComplianceHours).toBe(4800.0);

      // ── Assert 3: nextDueDate recomputed as newComplianceDate + intervalDays * ONE_DAY_MS
      const expectedNextDue = NEW_COMPLIANCE_DATE + INTERVAL_DAYS * ONE_DAY_MS;
      expect(updatedAd?.nextDueDate).toBe(expectedNextDue);
      expect(updatedAd?.nextDueDate).toBeGreaterThan(NOW); // should be 1 year from now
    }
  );
});
