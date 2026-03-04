# Athelon Alpha Test Plan — Gary/Linda Pilot Session
**Author:** Cilla Oduya, QA Lead  
**Date:** 2026-02-22  
**Target Session:** Phase 5 MVP Alpha Pilot  
**Pilot Participants:** Gary Hutchins (DOM, Skyline MRO), Linda Paredes (QCM, Skyline MRO)  
**Supporting Staff:** Nadia Solis (PM, facilitator), Cilla Oduya (QA, observer/recorder)  
**Test Environment:** Production database, test-mode account flag, isolated pilot organization  
**Estimated Duration:** 3 hours (with buffer; real session likely 90–120 minutes)

---

## Purpose of This Document

This test plan governs what Nadia and I will observe during the pilot session with Gary and Linda. It defines:

1. What we are testing (the 11-step Definition of Done scenario, manually)
2. What we are NOT testing (features out of alpha scope)
3. Known gaps and how to handle them gracefully during the session
4. Exact data setup instructions before Gary and Linda touch the system
5. What pass looks like
6. What failure looks like and when it blocks general availability

I wrote `e2e-alpha-scenario.test.ts` to verify the system automatically. This plan covers what the automated tests cannot: real-user interaction, UX friction, and the moments where a human notices something the test didn't assert.

---

## Section 1: What We Are Testing in Alpha

### The Definition of Done Scenario (11 Steps, Manual Execution)

Gary and Linda will execute the same scenario that `e2e-alpha-scenario.test.ts` verifies automatically. The purpose of doing it manually is to validate:

- The **UX flow** works as designed, not just the underlying mutations
- **Error messages** are legible and actionable in a real context
- The **pre-signature summary** shows the right information before Gary and Linda enter their PINs
- **No friction points** that would cause a real shop to revert to paper

#### The 11 Steps (Manual Walkthrough Script)

| Step | Actor | Action | What We Observe |
|------|-------|--------|-----------------|
| 1 | Gary | Open Athelon → Work Orders → New Work Order. Aircraft: N1234A. Type: 100-Hour Inspection. Description: "100-hour inspection per maintenance schedule." Priority: Routine. Submit. | WO created with status "Draft", WO number assigned |
| 2 | Gary | Open the new WO → Enter Aircraft TT: 2,347.4. Assign Troy. Open. | WO status changes to "Open". TT field locked after entry. |
| 3 | Troy | Open the WO → Task Cards → New Task Card. Title: "100-Hour Inspection — Cessna 172". Data source: "C172 MM Chapter 5-10-00 Rev 2025-12". Add 5 steps (Step 5 is IA-required). | Task card created with 5 steps; WO advances to "In Progress" |
| 4a | Troy | Open task card → Sign steps 1-4 via SignOffFlow (PIN re-auth for each). | Steps 1-4 flip to Completed. Step 5 remains pending. Card shows "In Progress (4/5)". |
| 4b | Pat (simulate) | Sign step 5 (IA-required) via SignOffFlow with Pat's credentials. | Step 5 completes. Card flips to "Complete". IA currency badge shows. |
| 5 | Troy | Maintenance Records → New Record. Work performed: full description (>50 chars). Approved data: C172 MM ref. Add test equipment: torque wrench TW-2847. Submit and sign. | MR created. calibrationCurrentAtUse = true shown in record detail. |
| 6 | Troy | Initiate sign-off on maintenance record → observe Pre-Signature Summary. | Cilla verifies all 5 sections visible, N1234A shown, TT 2347.4 shown, cert number present. |
| 7 | Troy | PROCEED TO SIGN → Enter PIN → Submit. | Task card sign-off appears. Audit log shows record_signed entry. |
| 8 | Pat (simulate) | Open inspection records → New Inspection Record → Sign as IA. | Inspection record created with iaCurrentOnInspectionDate = true. |
| 9 (exec last) | Linda | Post-close: QCM Reviews → Review WO-2026-001 → Outcome: Accepted → Sign. | QCM review record created. Audit shows qcm_reviewed event. |
| 10 | Gary | Work Order → Close Readiness Report. Observe checklist. | All 8 checks green. No blocking reasons. |
| 11 | Gary | Authorize Return to Service → complete pre-signature summary → PIN → Submit. | Aircraft flips to Airworthy. WO closes. 4 audit events. |

> **Step ordering note for pilot facilitation:**
> Execute steps 10 → 11 → 9 in that order (Gary closes readiness, Gary authorizes RTS, then Linda reviews post-close). The Definition of Done numbers them differently but the schema requires the WO to be closed before Linda can create the QCM review. Nadia should guide Gary and Linda through this sequence without surfacing the internal numbering difference to them.

---

### Sub-scenarios Within the Manual Session

These are not separate test cases — they are moments we watch for within the main walkthrough.

#### 1.1 — Pre-Signature Summary (Step 6)
This is the component Gary, Pat, and Troy called out independently in interviews. We observe:
- Is every field visible without scrolling on Gary's shop iPad?
- Is the N-number legible in hangar lighting? (Walk to the hangar door during Step 6 if possible)
- Does the "PROCEED TO SIGN" button grey out for the mandatory 2-second delay?
- Does Gary actually read it, or does he tap through? (Behavioral observation — no pass/fail)
- Ask Gary after: "Is this what you expected to see before signing?" Record his answer verbatim.

#### 1.2 — PIN Entry Experience
- Confirm 6-digit PIN is required (Pat's requirement: 4-digit is insufficient)
- Time from "PROCEED TO SIGN" click to confirmation: should be under 30 seconds (Pat's budget)
- Confirm failed PIN shows clear retry message (Pat: "Not silence. A clear message.")

#### 1.3 — Close Readiness Report (Step 10)
Gary's explicit requirement (REQ-GH-03): "One screen, one checklist, green or red for each item."
- Is it actually one screen? Does Gary have to scroll?
- Can Gary click a red item to navigate directly to the blocking record?
- Does anything show red that Gary doesn't expect?
- Ask Gary: "Is this what you described in the interview?" Record answer.

#### 1.4 — Audit Log Accessibility
After Step 11, navigate to the work order's audit log.
- Ask Gary to find the record that shows when he authorized RTS.
- Time the search. If it takes more than 2 minutes, log as a friction finding.
- Pat's requirement: any closed record must be retrievable within 2 minutes from any device.

---

## Section 2: What We Are NOT Testing in Alpha

The following are explicitly out of scope. Nadia will brief Gary and Linda before the session so they don't ask about these and we don't get drawn into a conversation that consumes test time.

### 2.1 — Out of Scope Features (v1.1 or later)

| Feature | Why Out of Scope |
|---------|-----------------|
| Customer portal / customerFacingStatus | v1.1 feature (REQ-DO-02). The schema field exists but no UI or mutation enforcement in alpha. |
| AD compliance data sync from FAA database | Manual entry only in alpha. Gary will enter any ADs manually. The sync tool is v1.1 infrastructure. |
| Offline mode / PWA sync | Queued task card step sign-offs are spec'd for v1.1. In alpha, an internet connection is required throughout the session. |
| Photo attachments on maintenance records | v1.1 scope per pre-signature summary component spec open question 3. |
| Printed final record format (Pat's "print preview") | v1.1 per pre-signature-summary-component.md open question 1. Alpha shows data; print layout is deferred. |
| IA expiry notifications (60/30/14-day alerts) | Alerting infrastructure is Phase 6. The block is implemented; the notifications are not. |
| MEL deferral management | Schema supports it; no UI in alpha. If a discrepancy is found during the pilot, it will be entered as corrected (not deferred). |
| Deputy QCM authorization (INV-25 exception) | Alpha enforces strict QCM match only. Linda must be the org's designated QCM. |
| Engine cycle tracking / LLP dashboard | v3 schema addition (REQ-EH-01/RT-01) — UI is v1.1. |
| Concurrent work order management UI | Guard is implemented; the UI flow for acknowledging the concurrent WO is v1.1. |
| 8130-3 record scanning / suspect parts | Parts receiving flow is out of scope for the pilot scenario. |
| Customer billing and invoice flow | billingStatus exists on the schema; no billing UI in alpha. |

### 2.2 — What We Explicitly Will NOT Attempt During the Session

1. **Creating a second work order during the session** — the concurrent WO guard will fire and we don't have the override UI built. Set Gary's expectation: one WO at a time per aircraft in alpha.
2. **Using the mobile app from an offline state** — the browser-based session requires connectivity. Don't test from the hangar's dead zone.
3. **Attempting to sign as someone else** — do not test the identity theft guard with Gary or Linda present. This belongs in automated tests only.
4. **Voiding the work order** — we're running the happy path. The void flow exists but is not part of the pilot scenario.

---

## Section 3: Known Gaps and Graceful Handling

These are issues I have documented as of 2026-02-22. They may or may not be fixed before the pilot session. For each, I've noted how to handle it gracefully without stopping the session.

### Gap 1: signatureHash Placeholder Pattern
**Status:** Not confirmed fixed as of this writing.  
**Risk:** Gary or Pat may look at the record detail and see `sha256:RTS-HASH-V0-placeholder-*`. This would undermine Pat's trust in the record integrity.  
**Handling:** Before the session, run `e2e-alpha-scenario.test.ts` Step 7 assertion:  
```
expect(rts?.signatureHash).not.toMatch(/RTS-HASH-V0/i);
```
If this assertion fails, the gap is not fixed and we must **postpone the RTS demonstration** until it's resolved. This is a blocker (see Section 6).

### Gap 2: getPreSignatureSummary Query (Wave 2 dependency)
**Status:** Spec complete (pre-signature-summary-component.md); implementation by Devraj is Wave 2.  
**Risk:** If the query isn't implemented by pilot day, the pre-signature summary screen will show a loading skeleton indefinitely.  
**Handling:** If `getPreSignatureSummary` isn't deployed, demonstrate the sign-off flow through the PIN phase only. Tell Gary: "The summary screen is implemented; we'll show it in the next session." Do NOT apologize or explain the Wave 2 dependency in technical terms. One sentence maximum.

### Gap 3: Missing `createTestEquipment` Mutation
**Status:** Schema is defined (v3, REQ-DP-01); mutation implementation is Phase 5.  
**Risk:** The torque wrench entry in Step 5 may fail if `createTestEquipment` isn't wired to the UI.  
**Handling:** Pre-seed the torque wrench record in the database before the session (see Section 4, Data Setup step 7). Gary doesn't need to enter the equipment via UI — we seed it as pre-existing shop equipment. The maintenance record creation form will reference it from the pre-seeded data.

### Gap 4: `createInspectionRecord` UI Flow
**Status:** Mutation is Phase 5; the UI form wiring may not be complete.  
**Risk:** Pat's inspection sign-off (Step 8) requires the inspection record form to be functional.  
**Handling:** If the UI isn't complete for Step 8, skip to Step 9 (close readiness) and note: "Inspection record creation will be included in the next session." The close readiness check for `iaCertificateCurrent` should still pass because we'll pre-seed the inspection record (see Section 4, Data Setup step 9 fallback).

### Gap 5: QCM Review UI
**Status:** Schema is defined (v3, REQ-LP-05); UI is Phase 5.  
**Risk:** Linda's QCM review (Step 9) requires a functioning review form.  
**Handling:** Linda's step is last (post-close). If the UI isn't ready, show Linda the schema and the test assertion instead. Linda is technical enough to understand. Tell her: "The record structure is exactly what you specified. The UI form will be the next thing we build."

### Gap 6: IA Currency Display on Personnel Record
**Status:** Pat's requirement: show IA status on personnel record.  
**Risk:** If Pat (or Gary) asks to verify their IA expiry date in the UI, it may not be surfaced.  
**Handling:** Show the certificates table entry directly (Gary's DOM view should show it). If not visible, note as a finding. It does NOT block the pilot.

---

## Section 4: Data Setup Instructions

Execute the following before Gary and Linda arrive. Estimated setup time: 30–45 minutes.

### Step 1: Create the Pilot Organization

Using the Athelon admin console (or Convex dashboard direct insert):

```
organizations: {
  name: "Skyline MRO Inc. — ALPHA PILOT",
  part145CertificateNumber: "ODSO145R0042",
  part145Ratings: ["Class A Airframe", "Class A Powerplant"],
  address: "1 Ramp Way",
  city: "Tucson", state: "AZ", zip: "85706", country: "US",
  subscriptionTier: "professional",
  active: true,
  rsmRevision: "RSM-2025-Rev-4",
}
```

Note the resulting `orgId`. You'll need it for all subsequent inserts.

### Step 2: Create Gary's User Account

Gary's Clerk account should already exist from the interview tech access request. Link it to a technician record:

```
technicians: {
  legalName: "Gary Hutchins",
  userId: <Gary's Clerk userId>,
  employeeId: "EMP-GH-001",
  organizationId: <orgId>,
  status: "active",
}
```

Certificate:
```
certificates: {
  technicianId: <garyId>,
  certificateType: "A&P",
  certificateNumber: "AP441872",      ← Gary's actual cert number
  ratings: ["airframe", "powerplant"],
  hasIaAuthorization: true,
  iaExpiryDate: <March 31 of next year as Unix ms>,
  active: true,
}
```

### Step 3: Create Troy's User Account

Troy participates in the demo. His account needs Clerk setup + technician record:

```
technicians: {
  legalName: "Troy Vance",
  userId: <Troy's Clerk userId or test userId>,
  employeeId: "EMP-TV-002",
  organizationId: <orgId>,
  status: "active",
}

certificates: {
  certificateType: "A&P",
  certificateNumber: "AP558934",
  ratings: ["airframe", "powerplant"],
  hasIaAuthorization: false,          ← Troy has no IA
  active: true,
}
```

### Step 4: Create Pat's User Account

Pat is simulated by Nadia during the pilot (Pat is in Bend, OR). Nadia will sign in as Pat for Step 4b and Step 8.

```
technicians: {
  legalName: "Patricia DeLuca",
  userId: <test userId for Pat — "user_pat_pilot">,
  employeeId: "EMP-PD-003",
  organizationId: <orgId>,
  status: "active",
}

certificates: {
  certificateType: "A&P",
  certificateNumber: "AP334219",
  ratings: ["airframe", "powerplant"],
  hasIaAuthorization: true,
  iaExpiryDate: <March 31 of next year>,   ← Current IA
  active: true,
}
```

### Step 5: Create Linda's User Account

Linda will execute the QCM review herself.

```
technicians: {
  legalName: "Linda Paredes",
  userId: <Linda's Clerk userId>,
  employeeId: "EMP-LP-004",
  organizationId: <orgId>,
  status: "active",
}

certificates: {
  certificateType: "A&P",
  certificateNumber: "AP772100",
  ratings: ["airframe"],
  hasIaAuthorization: false,
  active: true,
}
```

### Step 6: Set DOM and QCM on the Organization

```
organizations.patch(orgId, {
  directorOfMaintenanceId: <garyId>,
  directorOfMaintenanceName: "Gary Hutchins",
  qualityControlManagerId: <lindaId>,
  qualityControlManagerName: "Linda Paredes",
})
```

**Critical:** This must be done before the session. `createQcmReview` (INV-25) enforces that Linda's technicianId matches `org.qualityControlManagerId`. If this isn't set, Linda's review will be rejected.

### Step 7: Seed the Test Aircraft

```
aircraft: {
  make: "Cessna",
  model: "172S",
  series: "Skyhawk",
  serialNumber: "C172-98712",
  currentRegistration: "N1234A",
  experimental: false,
  aircraftCategory: "normal",
  engineCount: 1,
  totalTimeAirframeHours: 2300.0,     ← Pre-session TT (Gary will enter 2347.4 at open)
  totalTimeAirframeAsOfDate: <NOW>,
  status: "in_maintenance",
  operatingOrganizationId: <orgId>,
  operatingRegulation: "part_91",
}
```

**Verify:** After seeding, confirm the aircraft appears in Gary's fleet list when he logs in. If not, the organizationId linkage is wrong.

### Step 8: Pre-Seed the Torque Wrench (Test Equipment)

```
testEquipment: {
  organizationId: <orgId>,
  partNumber: "SW-3/8-250",
  serialNumber: "TW-2847",
  equipmentName: "Snap-on Torque Wrench 3/8 Drive 250 in-lb",
  manufacturer: "Snap-on Tools",
  equipmentType: "torque_wrench",
  calibrationCertNumber: "NIST-CAL-TW-2847-2025",
  calibrationDate: <60 days ago>,
  calibrationExpiryDate: <305 days from now>,
  calibrationPerformedBy: "National Calibration Services Inc.",
  status: "current",
}
```

**Why pre-seeded:** The `createTestEquipment` UI may not be complete. The pilot scenario requires Troy to reference this equipment in Step 5. Pre-seeding it in the library means Troy only selects it from a picker, not creates it.

### Step 9 (Fallback): Pre-Seed the Inspection Record

Only required if the `createInspectionRecord` UI form is not complete by pilot day. Seed via direct insert:

```
inspectionRecords: {
  workOrderId: <will not be known until Step 2 — see note>,
  organizationId: <orgId>,
  aircraftId: <aircraftId>,
  inspectionType: "100_hour",
  inspectionDate: <pilot day timestamp>,
  aircraftMake: "Cessna", aircraftModel: "172S",
  aircraftSerialNumber: "C172-98712",
  aircraftRegistration: "N1234A",
  totalTimeAirframeHours: 2347.4,
  scopeDescription: "100-hour inspection — all items within limits.",
  airworthinessDetermination: "returned_to_service",
  discrepancyIds: [],
  adComplianceReviewed: true,
  adComplianceReferenceIds: [],
  notes: "No applicable ADs for this interval.",
  iaTechnicianId: <patId>,
  iaCertificateNumber: "AP334219",
  iaCurrentOnInspectionDate: true,
  iaSignatureTimestamp: <NOW>,
  iaSignatureHash: <will need to be generated — run the signing mutation directly>,
  iaSignatureAuthEventId: <pre-created auth event for Pat>,
  sequenceNumber: 1,
  createdAt: <NOW>,
}
```

**Note:** This fallback requires knowing the workOrderId, which isn't created until Step 1 of the live session. If the inspection record UI isn't ready, execute Steps 1-7 with Gary, then pause while Cilla seeds the inspection record using the live workOrderId before resuming with the close readiness check.

### Step 10: Verify Setup Checklist

Before Gary and Linda arrive, run through this checklist:

- [ ] Gary can log in and sees N1234A in his fleet
- [ ] Linda can log in
- [ ] Troy can log in (or Nadia has Troy's credentials ready)
- [ ] Torque wrench TW-2847 appears in the test equipment library
- [ ] `e2e-alpha-scenario.test.ts` passes in the test environment (run it against test DB)
- [ ] The pilot organization has DOM = Gary, QCM = Linda (check DB directly)
- [ ] N1234A has status "in_maintenance" with TT 2300.0
- [ ] No existing open work orders on N1234A

---

## Section 5: What Pass Looks Like

### Pilot Pass Criteria

The pilot session passes when:

#### P1 (Must Pass — Hard Pass Criteria)

| ID | Criterion | How Measured |
|----|-----------|--------------|
| PASS-01 | Gary can complete Steps 1-2 without assistance from Nadia | Observation: Gary navigates independently. Nadia does not touch the screen. |
| PASS-02 | Troy can complete a task card step sign-off including PIN entry in under 30 seconds | Stopwatch: from "click SIGN OFF" to signed-state confirmation. 30-second budget (Pat's REQ-TW-07). |
| PASS-03 | Pre-signature summary shows correct N1234A, WO number, and Troy's cert number before PIN entry | Observation + Cilla screenshot. Gary asked: "Is this what you wanted?" Answer must be unprompted affirmative. |
| PASS-04 | Close readiness report shows all green with no blocking reasons | Screenshot of readiness screen. Gary must say "I trust this list." |
| PASS-05 | Gary completes RTS authorization including PIN entry without Nadia's help | Observation: Gary completes Step 11 independently. |
| PASS-06 | N1234A status changes to "Airworthy" after Gary's RTS | Gary sees the status change in the UI. Verified in DB by Cilla. |
| PASS-07 | Linda creates QCM review post-close without assistance | Linda navigates to QCM review independently. |
| PASS-08 | Audit log for WO-2026-001 shows 4 or more entries after close | Cilla queries audit log. Verified automatically by test assertion Step 11. |

#### P2 (Should Pass — Soft Pass Criteria)

These are not blockers but would significantly strengthen the decision to proceed to GA:

| ID | Criterion |
|----|-----------|
| PASS-09 | Gary reads the pre-signature summary without prompting before clicking PROCEED TO SIGN (behavioral) |
| PASS-10 | Linda asks to see the immutability guarantee on the QCM review (behavioral — shows trust in the record) |
| PASS-11 | Neither Gary nor Linda asks "where is [feature] from the interview?" for any in-scope feature |
| PASS-12 | Cilla observes zero moments where Gary or Linda reaches for a paper form or spreadsheet |

### What "Pass" Does NOT Require

- Zero UI bugs (minor display issues do not block pass)
- Completing the session in under 90 minutes (3-hour buffer is intentional)
- Gary or Linda expressing enthusiasm (professional acceptance is sufficient)
- The session being filmed or recorded (we're taking notes)

---

## Section 6: What Failure Looks Like

### Hard Blockers — Cannot Proceed to General Availability

These conditions, if observed during the pilot, block GA release. Each has an immediate action.

| ID | Condition | Why It Blocks | Immediate Action |
|----|-----------|---------------|-----------------|
| BLOCK-01 | signatureHash field on any signed record shows `sha256:RTS-HASH-V0-*` placeholder | Pat's requirement: signature must be verifiable independently. A placeholder is not a signature. If Pat found this in a real record, she would refuse to sign anything else. | **Stop session.** Fix before rescheduling. Do not show Gary or Linda the record detail if this is not fixed before the session. |
| BLOCK-02 | A completed step shows `signedHasIaOnDate = false` for Pat's IA sign-off (Step 4b) | Regulatory violation: an IA-required step was signed by an IA whose currency was not verified at signing time. This is the exact scenario Marcus Webb identified as enforcement exposure. | **Stop session.** This is a schema invariant violation. |
| BLOCK-03 | getWorkOrderCloseReadinessV2 returns `isReadyForRts = false` after all 11 steps | Gary cannot authorize RTS. The pilot's primary value proposition — Gary sees everything green in one view and signs — is broken. | Debug live if the cause is a data setup error. If it's a code bug, reschedule. |
| BLOCK-04 | authorizeReturnToService succeeds and N1234A does NOT flip to "Airworthy" | The most visible promise Athelon makes: sign the RTS, aircraft is released. If the aircraft record doesn't update, the system can't be trusted to reflect aircraft state. | **Stop session.** Fix before rescheduling. |
| BLOCK-05 | createQcmReview succeeds on an open (non-closed) work order (INV-24 not enforced) | A QCM review on an incomplete WO is legally meaningless. If the invariant guard isn't working, all QCM review data is potentially invalid. | **Stop session.** This is a schema invariant failure. |
| BLOCK-06 | Gary or Linda loses their session mid-sign-off and is unable to recover to the same record | Pat's requirement: "When I reconnect, I should be able to return to exactly where I was." If the session drop loses the in-progress sign-off state, the reliability of digital signatures is undermined. | Note exact reproduction steps. If the record was created in a partial state, **stop session** (partial records are a safety issue). If the session just lost the UI state and the record is clean, note as a finding and continue. |

### Non-Blocking Failures — Log and Continue

These are findings that do NOT block GA but must be logged for the v1.1 backlog:

| ID | Condition | Log As |
|----|-----------|--------|
| FIND-01 | Gary uses the wrong field for TT entry and the UI doesn't prevent it | UX bug — form validation / label clarity |
| FIND-02 | Pre-signature summary requires scrolling on Gary's shop iPad | Accessibility / mobile layout bug |
| FIND-03 | Task card step sign-off takes > 30 seconds (PASS-02 fails) | UX performance finding — not a regulatory gap |
| FIND-04 | Any field in the pre-signature summary shows blank or "Unknown" | Data resolution bug — cert number / name not resolving from Clerk identity |
| FIND-05 | The 2-second PROCEED TO SIGN delay confuses Gary (he thinks the button is broken) | UX copy / affordance finding |
| FIND-06 | Audit log is not immediately visible from the WO detail screen | Navigation / information architecture finding |
| FIND-07 | Linda asks "where do I see all the work orders I've reviewed?" | QCM dashboard — v1.1 scope (REQ-LP-05 dashboard was not MVP) |
| FIND-08 | Any field on the maintenance record is truncated in the UI view | Display bug — data is present in DB but not shown fully |

---

## Section 7: Observation Protocol for Cilla

During the session I am the silent observer. Nadia facilitates. I do not speak unless:
- A hard blocker is triggered (I call it)
- Nadia asks me a direct technical question
- A participant is about to take an action that would corrupt the test data

I will capture:
- Every moment Gary or Linda expresses confusion (write verbatim what they said and what they were looking at)
- Every moment Gary or Linda completes a step without prompting (write as a pass note)
- Any UI error messages (screenshot + exact text)
- Timing for PASS-02 (step sign-off speed — I keep the stopwatch)
- After Step 10 (close readiness): Gary's exact words when he sees the green checklist
- After Step 11 (RTS): Gary's exact words when the aircraft flips to Airworthy

I am specifically watching for:
1. Gary reaching for a pen or opening a spreadsheet (reverts to paper → blocker)
2. Pat's requirement behavior: does Gary actually read the pre-signature summary?
3. Linda's reaction when she sees the QCM review form — does she say this matches what she described?

---

## Section 8: Post-Session Debrief

Immediately after Gary and Linda leave, Nadia and I debrief for 30 minutes. I capture:

1. **Go/No-Go verdict on GA readiness** based on blockers observed
2. **Top 3 friction points** Gary or Linda experienced (not our interpretation — their words)
3. **One thing that worked better than expected** (there's always one)
4. **Immediate action items** before the next session (if anything blocked or needs fixing)

The debrief output is a one-page memo to Rafael (Architecture) and Devraj (Backend) within 24 hours of the session.

---

## Appendix A: Test Equipment Reference Data

For data setup and verification:

| Field | Value |
|-------|-------|
| Equipment Type | Torque Wrench |
| Part Number | SW-3/8-250 |
| Serial Number | TW-2847 |
| Manufacturer | Snap-on Tools |
| Cal Cert Number | NIST-CAL-TW-2847-2025 |
| Cal Date | ~60 days before pilot session |
| Cal Expiry | ~305 days after pilot session |
| Status | current |

---

## Appendix B: Error Code Reference

Error codes asserted in `e2e-alpha-scenario.test.ts` and their triggering conditions:

| Error Code | Mutation | Condition |
|------------|----------|-----------|
| `REQUIRES_IA` | `completeStep` | `signOffRequiresIa=true` and signer has no current IA |
| `IA_EXPIRED` | `completeStep` | `signOffRequiresIa=true` and signer's `iaExpiryDate < now` |
| `PENDING_STEPS` | `signTaskCard` | One or more `taskCardSteps.status == "pending"` |
| `WORK_PERFORMED_TOO_SHORT` | `createMaintenanceRecord` | `workPerformed.length < 50` |
| `INV-24` | `createQcmReview` | `workOrder.status != "closed"` |
| `INV-25` | `createQcmReview` | `reviewedByTechnicianId != org.qualityControlManagerId` |
| `INV-26` | `createQcmReview` | `outcome != "accepted"` and `findingsNotes` is empty or missing |
| `INV-05` | All signing mutations | `signatureAuthEvent.consumed == true` or `expiresAt < now` or `technicianId != caller` |
| `INV-06` | `closeWorkOrder` / `authorizeReturnToService` | `aircraftTotalTimeAtClose < aircraftTotalTimeAtOpen` |
| `INV-14` | `createWorkOrder` | Duplicate `workOrderNumber` within same `organizationId` |
| `INV-18` | `openWorkOrder` | `aircraftTotalTimeAtOpen < aircraft.totalTimeAirframeHours` |

---

*Cilla Oduya — QA Lead, Athelon*  
*2026-02-22*  

*"Every assertion has a clear failure mode it's guarding against. If you can't name the failure mode, you don't need the assertion."*
