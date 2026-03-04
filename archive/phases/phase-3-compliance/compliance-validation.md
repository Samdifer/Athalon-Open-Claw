# Athelon — Phase 3 Compliance Validation
**Document Type:** Regulatory Compliance Validation and Inspection Readiness Assessment
**Authors:** Marcus Webb (Regulatory/Compliance) · Capt. Rosa Eaton, Ret. (Aviation Technical Advisor)
**Date:** 2026-02-22
**Phase:** 3 — Integration & Smoke Testing
**Status:** FORMAL DETERMINATION — Not a draft. These are final regulatory positions.
**References:** 14 CFR Parts 39, 43, 65, 91, 145; AC 43-9C; FAA Order 8120.11; FAA Order 8130.21

---

## Prefatory Notes

**Marcus:** This document resolves the six open regulatory questions from the Phase 2 gate review (RQ-01 through RQ-06), validates the AD compliance blocking chain against a Part 39 enforcement scenario, assesses the audit trail spec against AC 43-9C, and simulates a Part 145 surveillance inspection against the current Athelon spec. Determinations in Sections 1 and 4 are binding constraints on Phase 2 mutation implementations — not suggestions.

**Rosa:** The Phase 2 work is solid. Better than anything I saw from the Corridor team in six years. The 8130-3 block mapping is correct, the IA expiry logic is correct, and the AD blocking chain is conceptually right. What follows is where I think we still have exposure. I won't dress it up.

They disagree in two places. Both disagreements are noted below.

---

## Section 1: Formal Regulatory Determinations — RQ-01 through RQ-06

### RQ-01 — Shelf-Life Override Policy for Installed Parts

**Regulatory authority:** 14 CFR § 43.13(a); manufacturer's Instructions for Continued Airworthiness (ICA) per 14 CFR Parts 26 and 33. Shelf-life limits are manufacturer-established, not a uniform FAR calendar rule.

**Formal determination:** Do NOT apply a uniform hard-block on all shelf-life-expired installed parts. That would exceed the regulation and generate false AOG events.

Implementation rules:
1. **`installPart` guard (G6):** Hard-block on `shelfLifeLimitDate < now()` at installation — correct as specified. You do not knowingly install an expired shelf-life part.
2. **Parts that expire during service:** Surface a prominent warning on the aircraft parts list and the next open work order. Do not auto-ground. The IA decides with reference to the applicable AMM.
3. **Category exception:** Add `shelfLifeEnforcementLevel: "warning_only" | "mandatory_removal"` to the `parts` table. Pyrotechnics, rubber bladders, and oxygen system seals default to `mandatory_removal`. All others default to `warning_only`. The nightly scheduled function generates different alert severity based on this field.

**Note to Devraj:** Add `shelfLifeEnforcementLevel` to schema. The nightly shelf-life check must branch on this field — `mandatory_removal` parts escalate immediately; `warning_only` parts appear on next WO review.

---

### RQ-02 — Cycle Counter Requirement Timing

**Regulatory authority:** 14 CFR § 91.417(a)(2)(i) — total time in service, hours and cycles where applicable; 14 CFR Parts 33 and 25 — cycle-based airworthiness limitations for turbine aircraft.

**Formal determination:** Cycle tracking is triggered by aircraft type, not by installation event.

Implementation rules:
1. `createAircraft`: if `aircraftCategory` is `turbine` or `pressurized`, `totalTimeAirframeCycles` is **required**. Hard-block aircraft creation without it.
2. Piston aircraft with no cycle-based limitations: cycles optional at creation. Soft prompt on first LLP installation where `lifeLimitCycles` is set.
3. `recordAdCompliance` (UM-08): if AD's `complianceType` includes cycles and aircraft has no cycle counter → throw `AD_COMPLIANCE_CYCLES_REQUIRED`. Do not implement UM-08 without this guard.

**Note to Devraj:** This is a pre-condition addition to both `createAircraft` and the forthcoming `recordAdCompliance` mutation. A cycle-based compliance record without cycle data is non-defensible and I have seen the FAA reject an entire compliance record set on this basis.

---

### RQ-03 — Multi-Tag Parts Quantity Validation: Warn vs. Hard-Block

**Regulatory authority:** FAA Order 8130.21 Block 10 (Quantity). The quantity on the 8130-3 is the count of parts covered by that release authorization. Installing more parts than the tag covers is a traceability violation.

**Formal determination:** Hard-block. No warning. No override — except under specific conditions.

`receivePart` in bulk mode must count all `parts` records already referencing the same `eightOneThirtyId`. If adding the new part would exceed `eightOneThirtyRecord.quantity`: throw with message identifying the form tracking number and the excess count.

**Rosa's dissent:** *Quantity discrepancies on 8130-3s are often genuine data entry errors on the releasing entity's side, not counterfeit parts. A blanket throw with no override will drive mechanics to create a second tag entry in the system — which is worse. I'd rather have a supervisor-level approval path with a documented reason.*

**Marcus's response:** Rosa's point is accepted with conditions: override path is available IF (a) the authorizing supervisor holds A&P or higher, (b) the override reason is captured in `auditLog` with the supervisor's `technicianId` and certificate number, AND (c) the part is NOT life-limited. For LLPs, the hard block is unconditional — no override argument accepted.

**Note to Devraj:** Add optional `supervisorOverrideAuthEventId` to `receivePart`. The LLP+quantity-exceeded combination throws unconditionally regardless of any override argument. Note to Chloe: override path must visually distinguish as a compliance event, not routine workflow.

---

### RQ-04 — Owner-Supplied Parts with CoC but No 8130-3

**Regulatory authority:** 14 CFR § 145.201(c) — parts used must meet applicable airworthiness requirements; 14 CFR § 21.303 (PMA); FAA Order 8130.21.

**Formal determination:** A CoC is NOT a drop-in substitute for an 8130-3. It is supplemental documentation. Acceptable documentation alternatives by part type:

| Documentation | Acceptable? | Conditions |
|---|---|---|
| FAA Form 8130-3 | Yes | Primary path. Required for repaired/overhauled parts. |
| Manufacturer CoC with airworthiness statement | Yes — **new parts only** | Must include production approval number, part number, conformance statement, authorized signature. |
| PMA marking on part | Yes | Visual verification documented in receiving record. |
| TSO authorization marking | Yes | TSO-designated appliances only. |
| No documentation | No | Quarantine pending investigation. |

For CoC-only parts: receiving inspection must be performed by an A&P, documented as a `maintenanceRecords` entry of `recordType: "maintenance_43_9"`, referencing the CoC. Add `documentationType: "8130_3" | "coc_only" | "pma_marked" | "tso_marked" | "no_documentation"` to the `parts` table. `installPart` G8 evaluates against this field. Parts with `documentationType: "no_documentation"` must be received into `quarantine`, not `inventory`.

**Note to Devraj:** `receivePart` output path changes significantly — no-documentation parts go directly to quarantine. Note to Chloe: documentation type selection must precede all other receiving workflow fields; "No Documentation" branches into the quarantine workflow, not the standard receiving flow.

---

### RQ-05 — Ratings-Exercised: Technician Choice vs. System-Inferred

**Regulatory authority:** 14 CFR §§ 65.85, 65.87; 14 CFR § 43.9(a)(3) — the record must identify the certificate type and rating used.

**Formal determination:** Technician declares. System validates. System does NOT infer.

Three reasons: (1) Many tasks are dual-scope; system cannot determine this from `taskType` alone. (2) System inference creates false certification records if the inferred rating is not held. (3) The regulatory risk of one wrong inference exceeds the UX benefit of pre-filling.

Implementation rules: At the step sign-off modal, present a required selection — "I am exercising my [☐ Airframe] [☐ Powerplant] [☐ Both] rating for this work." Validate against `certificates.ratings[]`; if selection not held, throw `SIGN_RATING_NOT_HELD`. System MAY pre-populate from `taskType` as a default — technician must confirm or change it. A pre-populated value is not silently accepted.

**Note to Devraj:** Add `SIGN_RATING_NOT_HELD` validation to `completeStep` guard sequence. This check was not in the Phase 2 spec; add it before implementation. Note to Chloe: pre-populate rating checkbox from `taskCard.taskType` as convenience, but the technician must touch the control to confirm — this is a legal certification.

---

### RQ-06 — RTS Statement Minimum Content: Keyword Check vs. Character Floor

**Regulatory authority:** 14 CFR §§ 43.9(a)(1), 43.11(a)(6); AC 43-9C Section 6 — content of maintenance records.

**Formal determination:** Keyword check AND character floor. Both, not either/or. The 50-character floor in the Phase 2 spec is insufficient.

`authorizeReturnToService` PRECONDITION 9 shall assert all three:
```
Assert: statement.length >= 75                    → RTS_STATEMENT_TOO_SHORT
Assert: statement contains "14 CFR" OR "Part 43" → RTS_STATEMENT_NO_CITATION
Assert: statement contains "return" OR "airworthy"→ RTS_STATEMENT_NO_DETERMINATION
```

**Note to Devraj:** Three separate assertions, three separate error codes. Do not collapse them — the frontend error handler must tell the technician specifically what is missing. Note to Chloe: the template text in signoff-rts-flow.md Section 3.2 will pass all three checks. The read-only citation line at the bottom of the editor is the correct UX; do not let technicians delete it.

---

## Section 2: Simulated FAA Part 145 Surveillance Inspection

**Scenario:** FAA ASI (Airworthiness), routine annual surveillance of a Class 1 Part 145 repair station running Athelon in Phase 3 preview deployment, all smoke tests passing.

*Rosa: I'm narrating the inspector's walkthrough. I've been on both sides of this table.*

### Item 1 — Recordkeeping System Walkthrough
**Inspector asks:** Walk me through how a record gets created from task completion to logbook entry.

**Athelon answer:** Work order → task cards → steps signed via `completeStep` + `signatureAuthEvent` → discrepancies dispositioned → `closeWorkOrder` → maintenance record (immutable) → IA signs `authorizeReturnToService` → `returnToService` record with hash → WO status: closed. All events in `auditLog`, transaction-coupled.

**Assessment: PASS.** Chain is demonstrable. *Rosa: They will want a printed logbook entry. Make sure Chloe's PDF export contains every required field. If they squint for the certificate number, it's a report comment.*

### Item 2 — Personnel Qualification Records
**Inspector asks:** Verify certificate AB234567 was current on the date of the record it signed.

**Athelon answer:** `returnToService.iaCertificateNumber` and `iaCurrentOnRtsDate` (boolean snapshotted at signing). `signatureAuthEvent` record provides auth timestamp and method. Certificate expiry was verified at mutation precondition 6 and the result is immutably stored.

**Assessment: PASS (with note).** Manual AIRS cross-reference is still a shop-process requirement — Athelon does not integrate with FAA AIRS for real-time certificate verification. Document this in the Quality Manual as a manual step. *Rosa: Standard. No MRO SaaS integrates with AIRS in real-time. The system stores the cert number permanently at signing — that's what matters.*

### Item 3 — AD Compliance Status
**Inspector asks:** Show me all ADs applicable to N7482X and their compliance status.

**Athelon answer:** `checkAdDueForAircraft()` returns all `adCompliance` records with `applicable: true`, sorted overdue-first. Each entry shows status, `nextDueHours`, `hoursRemaining`, and `maintenanceRecordIds[]` linking to the proof.

**Assessment: PASS for complied ADs. CONDITIONAL for `pending_determination` ADs** — the inspector treats any `pending_determination` item past its effective date as an open finding. System surfaces these correctly; shop must act on them promptly.

**New action item (Marcus):** `recordAdCompliance` PRECONDITION 4 must additionally assert that `maintenanceRecord.approvedDataReference` contains the AD number being recorded. A maintenance record that does not cite the AD is not proof of AD compliance. Add error code `AD_COMPLIANCE_RECORD_NO_AD_CITATION`. This precondition is missing from the Phase 2 spec; add it before Devraj implements UM-08.

*Rosa: The inspector will pull one overdue-flagged AD and try to follow the link from the adCompliance record to the maintenance record to the approved data reference. If the maintenance record doesn't say "AD 2022-14-08, paragraph (f)" in that field, we have a finding. That check needs to be there.*

### Item 4 — Parts Traceability
**Inspector asks:** Show me the 8130-3 and installation record for LW-12450 S/N C4821.

**Athelon answer:** `getPartTraceabilityChain()` resolves: `eightOneThirtyRecords` (all 19 blocks structured), `partInstallationHistory` (open record with hours at install), linked work order, maintenance record, installing technician's certificate snapshot. `chainComplete` boolean provides immediate gap visibility.

**Assessment: PASS.** *Rosa: Inspector will compute Block 12 remaining life on a napkin. If our display matches their math, we pass. The Block 12 → `hoursAccumulatedBeforeInstall` sync logic is correct — I verified the arithmetic. Cilla must test it with at least three specific scenarios: mid-life arrival, near-life arrival, at-zero arrival (quarantine case).*

### Item 5 — MEL Deferral Documentation
**Inspector asks:** Show me the MEL deferral from last month's 100-hour and confirm the owner was notified.

**Athelon answer:** `discrepancies` record with `disposition: "deferred_mel"`, `melItemNumber`, `melExpiryDate`, `deferredListIssuedToOwner: true`, recipient name in `auditLog` event.

**Assessment: PASS.** MEL deferral data model complete. MEL expiry hard-blocks RTS correctly. *Rosa: One gap — we're not validating the MEL item number against the aircraft's approved MEL document because we don't store it. Noted in Section 5.*

### Item 6 — Record Integrity After the Fact
**Inspector asks:** Demonstrate that this maintenance record has not been modified since signing.

**Athelon answer:** Re-compute SHA-256 over canonical JSON of required fields; compare to stored `signatureHash`. Schema has no update mutation for signed records. Corrections are new records referencing originals.

**Assessment: CONDITIONAL PASS.** Conditions: (1) Add `hashAlgorithmVersion: string` to `returnToService` and `maintenanceRecords`. Document field ordering in `computeRtsHash()` — it must be deterministic and version-tracked. (2) Build a user-facing "Verify Record Integrity" function that an inspector can trigger on-site. A hash that has no UI verification tool is theater.

*Rosa: The hash doesn't stop a database admin who knows what they're doing. What it does is make falsification detectable. For FAA audit purposes, that's enough. But they need to be able to run the check themselves, not take our word for it.*

### Item 7 — Technician Recent Experience (65.83)
**Inspector asks:** When did your IA last exercise their certificate?

**Athelon answer:** `certificates.lastExercisedDate`. Mutation precondition 6 verifies this is within 24 months at RTS time.

**Assessment: PASS (with note).** `lastExercisedDate` must update at ALL signature events — `completeStep`, maintenance record signing, and RTS. Currently the spec implies this update only at RTS. Devraj must make the update explicit in `completeStep` and any maintenance record signing mutation.

### Inspection Summary

| Item | Result | Key Condition |
|---|---|---|
| Recordkeeping system walkthrough | PASS | PDF export required |
| Personnel qualification records | PASS | Manual AIRS cross-check; snapshot immutability correct |
| AD compliance status | CONDITIONAL | `pending_determination` items = inspector findings |
| Parts traceability | PASS | Block 12 math verified; needs Cilla test matrix |
| MEL deferral documentation | PASS | MEL item number validation gap noted |
| Record integrity verification | CONDITIONAL | Hash version field + user-facing verify endpoint required |
| Technician recent experience | PASS | `lastExercisedDate` scope must expand |

**Rosa's summary:** *Overall we pass a surveillance inspection if implementation is faithful to the spec. The two things that turn a pass into a problem are: ADs stuck in `pending_determination` longer than they should be (shop process, not system) and the hash verification having no user-facing tool. Fix those two things and I'd let a real shop run this on a real fleet.*

---

## Section 3: AD Compliance Blocking Logic Validation

*Rosa is reviewing. This section is her analysis.*

### 3.1 Calendar-Based Recurring AD — Part 39 Enforcement Scenario

**Scenario:** Cessna 182 N4421S. AD 2023-09-04: recurring, calendar-based, every 12 months. Last complied 2024-03-15. Shop opens a 100-hour inspection 2025-04-02 — 18 days past the AD's `nextDueDate` of 2025-03-15. IA attempts to authorize RTS.

**Chain trace:** `checkAdDueForAircraft({ asOfDate: 2025-04-02 })` fetches `nextDueDate: 2025-03-15`. Calendar check: `asOfDate > nextDueDate` → `isOverdue: true`. PRECONDITION 7 of `authorizeReturnToService` throws `RTS_AD_OVERDUE { adIds: ["ad_2023_09_04"] }`. RTS denied.

**Verdict: PASS.** The blocking chain works correctly for calendar-based recurring ADs.

*Rosa: This is exactly the case the FAA cares about. The shop missed the calendar. The system didn't. Hard throw, not a warning. The work order must be re-opened, AD compliance accomplished and documented, `recordAdCompliance` called, then RTS re-authorized. That's the correct sequence and the system enforces it.*

### 3.2 Hours-Based Recurring AD

**Scenario:** Same aircraft. AD 2021-22-14: recurring, 500-hour interval. Last compliance at 3,450.0 TT. Aircraft TT at WO close: 3,960.4. `nextDueHours: 3,950.0`. Aircraft is 10.4 hours past due.

**Chain trace:** `checkAdDueForAircraft` fetches `aircraft.totalTimeAirframeHours: 3960.4` (live, from aircraft record updated at `closeWorkOrder`). Hours check: `3960.4 > 3950.0` → `isOverdue: true`. PRECONDITION 7 throws.

**Verdict: PASS.** Live-hours comparison (not cached `nextDueHours`) catches the overdue correctly.

*Rosa: The key word is "live." If the system used a cached field that wasn't updated at WO close, this check reads the wrong number. Marcus was right to insist on the live query design. I've seen other systems fail on exactly this — the cache is stale by 50 hours and an engine component goes past its AD limit without detection. That's a catastrophic failure mode. The spec avoids it.*

### 3.3 Not-Complied AD Within Initial Compliance Window

**Scenario:** AD 2025-01-12, initial window: 100 hours OR 6 calendar months. Aircraft accumulated 80 hours since effective date; 93 calendar days elapsed. No compliance recorded.

**Chain trace:** `complianceStatus: "not_complied"`, `lastComplianceDate: null`. Initial window check: hours accumulated (80) < `initialComplianceHours` (100); days elapsed (93) < `initialComplianceDays` (183). Result: `isOverdue: false`.

**Verdict: PASS.** System correctly distinguishes "not yet complied, within window" from "overdue."

*Rosa: A lot of systems would flag this as an RTS blocker just because it's not complied. The spec doesn't, which is correct. But I want to see a prominent dashboard warning showing the window consumption percentage — "80 of 100 hours (80%) of initial compliance window consumed." Right now the `isDueSoon` threshold is absolute hours and days, which works for recurring ADs but can miss initial-window urgency on low-utilization aircraft.*

**Action item:** Add `percentWindowConsumed` to `AdComplianceItem` return type. Surface on Step 1 pre-flight summary for `not_complied` ADs with >75% of initial window consumed.

### 3.4 Signature Chain Integrity on `recordAdCompliance`

The mutation requires an unconsumed `signatureAuthEvent` with `intendedTable: "adCompliance"`, consumed atomically with the compliance write. Correctly specified. One addition needed:

*Rosa: "I need the same explicit language in `recordAdCompliance` that appears in the RTS spec: TTL check is enforced at the mutation layer. Frontend timer is informational only. Devraj should not be able to implement a frontend-only TTL check on this mutation."*

**Marcus:** Confirmed. Add to mutation spec: "The `expiresAt > Date.now()` check is mandatory backend enforcement. Frontend timer is informational only and does not substitute for backend TTL validation."

### 3.5 Overall AD Blocking Chain Assessment

**Rosa's verdict:** *The chain works. `recordAdCompliance` establishes the compliance record with signed evidence. `checkAdDueForAircraft` evaluates live at RTS time. `authorizeReturnToService` PRECONDITION 7 throws on any overdue AD. The enforcement is hard, not advisory. Under a Part 39 enforcement scenario — "did your system allow an aircraft with an overdue AD to be returned to service?" — the answer is no, provided implementation is faithful to spec. I'm satisfied with the logic. Two outstanding concerns are in Section 5.*

**Marcus:** Concur. One addition required before implementation: the `approvedDataReference` AD citation check on `recordAdCompliance` (Section 2, Item 3 action item). Without it, the chain proves a compliance event was signed but not that the signing technician cited the AD as their authority.

---

## Section 4: Audit Trail Completeness — AC 43-9C Assessment

### 4.1 Completeness

All AC 43-9C required elements are present: `workPerformed`, `approvedDataReference`, `completionDate`, technician legal name, certificate number, certificate type, `signatureAuthEventId` + `signatureHash`, RTS statement, aircraft identification (denormalized snapshot), and total time in service.

**Assessment: PASS.**

### 4.2 Authenticity

`signatureAuthEvent` is created via Clerk re-authentication for a specific user. The event links `userId` → `technicianId` → certificate record. Consumed exactly once; consuming record ID written back to event. Chain is bidirectional and indexed. `authMethod` field captures authentication mechanism if later challenged.

**Assessment: PASS.** Condition: confirm with Devraj that no `deleteSignatureAuthEvent` mutation exists or will be created. If it does for any reason, remove it. The auth event is the authentication evidence — it must be permanent.

### 4.3 Integrity

`signatureHash` (SHA-256) stored on `maintenanceRecords` and `returnToService`. Schema has no update mutation for signed records. Corrections are new records. `auditLog` is append-only.

**Assessment: CONDITIONAL PASS.** Conditions: (1) Add `hashAlgorithmVersion` field to signed records — algorithm changes must not break verification of historical records. (2) Confirm with Jonas that Convex database access controls prevent direct table manipulation outside the application layer. (3) Confirm no `deleteAuditLog` or `updateAuditLog` mutation exists. An alterable audit log is no audit log.

### 4.4 Retrievability

Index coverage (`workOrders.by_aircraft`, `maintenanceRecords.by_work_order`, `adCompliance.by_aircraft`, `auditLog.by_record`) supports the inspector's primary query pattern.

**Assessment: PASS (with condition).** The `partMaintenanceLinks` junction table (deferred to Phase 3 in parts spec) is needed for high-volume "all parts installed on aircraft" queries. Without it, in-memory filtering on `partsReplaced[]` will be too slow for fleet aircraft under AC 43-9C "reasonable time" retrievability. Escalate junction table priority.

### 4.5 Accessibility Duration

Permanent records (AD compliance, inspection records, major repairs) are associated with `aircraftId`, not `organizationId` — correctly implemented per Phase 2 spec. When a customer changes, permanent records remain tied to the aircraft.

**Assessment: CONDITIONAL PASS.** The aircraft record portability policy (OI-06 from signoff spec) is unresolved — who can read aircraft records when `customerId` changes? See Section 5.6.

### 4.6 Audit Log Coverage

| Module | Events Logged | Gap |
|---|---|---|
| Work order engine | Open, transitions, close | Failed-close events not logged |
| Task card execution | Step sign-off, N/A, card complete | Counter-signature events pending SE-01 |
| AD compliance | Determination, compliance recorded, supersession | Complete per spec |
| Parts traceability | Receive, install, remove, quarantine, suspect flag | Complete per spec |
| Sign-off / RTS | Auth event, RTS created, WO closed, aircraft status | Failed RTS attempts logged ✅ |

**Addition needed:** `closeWorkOrder` failures must be logged to `auditLog`. Currently only RTS failures are explicitly specified. A pattern of close failures is an anomaly an inspector may investigate.

---

## Section 5: Regulatory Gaps and Remaining Risks

### 5.1 Cycle Tracking — Absent for Turbine Operations

**Status:** Known gap; Phase 2 AD compliance module outstanding item 3.

**Marcus:** Not acceptable for any turbine customer. Every turbine engine AD includes cycle-based limits. The `cyclesRemaining` computation returns `null` in the current spec. A Part 145 shop servicing turbine aircraft cannot use Athelon as their primary compliance system until this is implemented.

**Rosa:** *Agree completely. This isn't a missing feature — it's a missing safety control. I would not let a shop I advise put a turbine aircraft's AD compliance on this system as-is. The spec knows cycles are needed. Fix it before any beta customer with turbine operations is onboarded.*

**Risk level:** HIGH. Scope: all turbine and pressurized aircraft customers.

### 5.2 Ferry Permit AD Exception Path — Undesigned

**Status:** Out of scope for Phase 2 per AD compliance module. Phase 3+ scope.

**Marcus:** 14 CFR §§ 91.319 and 21.197 — a ferry permit may authorize flight with an open AD under specific conditions. No `ferryPermit` record type exists. No AD exception path exists. Shops will hit this within the first six months of operations. The RTS hard-block will fire on any overdue AD with no exception path, forcing shops to bypass Athelon's RTS flow for ferry flights — which breaks the audit trail. The `ferryPermits` table and AD exception linkage must be designed before Phase 3 exits so the schema accommodates it without later breaking changes.

**Rosa:** *I've arranged ferry permits. FAA Form 8130-7, specific limitation language, the ADs that are excepted — it's specific paperwork. This is not a fringe case. Any shop doing engine-out ferries will hit this. I disagree with Marcus on deferring the design. The schema needs to be ready even if the UI isn't built yet.*

**Risk level:** HIGH for shops performing ferry operations.

### 5.3 MEL Item Number Validation — No Approved MEL Reference

**Status:** Identified during simulated inspection Section 2, Item 5. Not in Phase 2 open items.

**Rosa:** *`melItemNumber` is free text. Nothing validates it against the aircraft's approved MEL. An inspector checking that the deferral was made under the correct MEL item will find the system cannot corroborate the number.*

**Marcus:** We are not going to store full approved MEL documents in Phase 3. But we should require a `melDocumentReference` field on MEL-deferred discrepancies — the date and revision of the approved MEL being referenced. This creates an auditable citation without requiring us to store the full document. Add `melDocumentReference` (required when `disposition: "deferred_mel"`) to the `discrepancies` table.

**Risk level:** MEDIUM. Procedural gap, not an integrity gap.

### 5.4 `createAdCompliance` Mutation — Unspecified and Critical

**Status:** UM-08 from Phase 2 backlog. The entry point to the entire AD compliance chain has no formal mutation spec.

**Marcus:** This is the most significant outstanding gap in the compliance module. Every other AD mutation presupposes an `adCompliance` record exists. The mutation that creates it has no guard sequence, no precondition set, and no audit trail spec. Without it, the compliance chain cannot be initialized.

Critical failure mode: `checkAdDueForAircraft` queries `adCompliance` records by aircraft. If no records exist, the query returns empty and PRECONDITION 7 of `authorizeReturnToService` passes vacuously — an aircraft with zero AD records passes AD review because there is nothing to flag. This is a compliance failure that allows the system to facilitate regulatory violations.

**Mandatory guard:** `closeInspection` for annual inspections must assert that at least one `adCompliance` record exists for the aircraft, even if in `pending_determination`. If zero records exist, throw and require the IA to provide a signed statement confirming no ADs apply to this specific aircraft configuration. An aircraft with zero AD records is an anomaly, not a clean bill of health.

**Rosa:** *An aircraft with zero AD records would make me nervous immediately. Even a brand-new Cessna 172 has ADs. "No ADs on file" should be a red banner, not a green light.*

**Risk level:** CRITICAL. Phase 3 exit blocker.

### 5.5 Multi-Inspector Sign-Off UX — Design Incomplete

**Status:** FE-01 and OI-05 from Phase 2. No design exists for the multi-inspector annual inspection sign-off sequence.

**Rosa:** *On a complex annual you'll have one A&P on the airframe, a different A&P on the powerplant, and the IA signing the 43.11 entry. Three people, three separate signature events. The data model handles this — `maintenanceRecords.technicians[]` supports it. But the wizard UX isn't designed. If the wizard assumes a single technician, shops doing complex annuals will sign everything under the IA's credentials alone. That is a 43.9 violation — the A&P who performed the work must sign their own work. The system must not incentivize that shortcut.*

**Marcus:** The multi-inspector design session (OI-05) must happen before Phase 3 exits. Data model is ready. UX is not.

**Risk level:** HIGH. Phase 3 exit blocker for annual inspection workflows.

### 5.6 Aircraft Record Portability — Policy Unresolved

**Status:** OI-06 from Phase 2 sign-off spec.

**Marcus:** If an aircraft sells and the new owner cannot access prior maintenance records in Athelon, those records effectively don't exist from the new owner's regulatory perspective. 14 CFR 91.417 requires the new owner to establish maintenance history. If Athelon holds the only digital copies and the new owner can't access them, the system creates a regulatory problem rather than solving one. Required: a `recordAccessGrants` table or equivalent granting read access to permanent records per aircraft, independent of the current `customerId` relationship. This policy must be defined before GA launch.

**Risk level:** HIGH. Not a Phase 3 exit blocker but must be resolved before general availability.

### 5.7 Summary Risk Table

| Risk | Severity | Owner | Phase 3 Exit Blocker? |
|---|---|---|---|
| `createAdCompliance` mutation unspecified; vacuous-pass on annual close | CRITICAL | Devraj + Marcus | **YES** |
| Multi-inspector sign-off UX incomplete | HIGH | Chloe | **YES** (annual inspections) |
| `approvedDataReference` AD citation check missing from `recordAdCompliance` | HIGH | Devraj | **YES** |
| Cycle tracking absent for turbine aircraft | HIGH | Devraj | No (gates turbine customer onboarding) |
| Ferry permit AD exception path undesigned | HIGH | Marcus + Rafael | No (must be before ferry WO type is enabled) |
| Aircraft record portability policy unresolved | HIGH | Marcus + Rafael | No (must be before GA launch) |
| Hash algorithm version field + verify endpoint missing | MEDIUM | Devraj + Chloe | No (must be before any customer data is signed) |
| `lastExercisedDate` update scope incomplete | MEDIUM | Devraj | No |
| MEL item number validation gap | MEDIUM | Devraj | No |

---

## Closing Statements

**Marcus Webb — Formal Position:**

The Phase 2 specification is the most regulatory-complete MRO software spec I have reviewed in twelve years of compliance work. The guard sequences on `authorizeReturnToService` and `recordAdCompliance` are correct. The audit trail design is AC 43-9C compliant in structure. The 8130-3 data model is better than what the FAA's own internal software produces.

However, three Phase 3 exit blockers must be resolved before I issue compliance sign-off: (1) `createAdCompliance` must be fully specified, including the annual-close guard against zero AD records; (2) the multi-inspector sign-off UX must be designed; (3) the `approvedDataReference` AD citation check must be added to `recordAdCompliance` before Devraj implements UM-08.

I will not sign off on a system with a vacuous-truth AD compliance check. Non-negotiable.

**Capt. Rosa Eaton, Ret. — Advisory Position:**

I've flown 22,000 hours and I've sat across from FAA inspectors more times than I can count. I've seen shops lose their Part 145 certificate over paperwork, not maintenance quality. This system, built faithfully to what's written, would be the best compliance tool most GA shops have ever had. That's not flattery — it's a low bar because current tools are genuinely bad.

My two concerns beyond Marcus's blockers are cycle tracking and the ferry permit path. He's willing to defer both with the right customer onboarding gates. I think that's a reasonable position on ferry permits; I think it's too lenient on cycles. I'm noting my dissent and moving on.

The thing that would keep me up at night is not the documented gaps — they're findable and fixable. It's implementation drift. The spec says "hard block, no override." If a developer changes it to a warning during implementation because the hard block is inconvenient in testing, the regulatory guarantee is gone. Cilla's test matrix is the backstop. Every INV test from Phase 2 must pass before I sign off on Phase 3. Non-negotiable.

---

*Marcus Webb — Regulatory & Compliance*
*Capt. Rosa Eaton, Ret. — Aviation Technical Advisor*
*2026-02-22 — Phase 3 Compliance Validation*

*Formal regulatory determinations on RQ-01 through RQ-06. All determinations are binding on Phase 3 implementation. Citations are to 14 CFR as of 2026-02-22. FAA guidance: AC 43-9C, AC 39-7D. This document does not constitute legal advice and is for internal Athelon development use only.*

*Distribution: Devraj Anand · Chloe Park · Cilla Oduya · Jonas Harker · Rafael Mendoza · Nadia Solis*
