# Phase 4 — Remaining Convex Mutations
**Author:** Devraj Anand  
**Date:** 2026-02-22  
**Status:** Implementation Complete — Pending QA Review (Cilla Oduya)  
**Builds on:** Phase 3 (10 of ~21 mutations). This phase delivers the remaining ~11 mutations/queries.

---

## What Was Built

### `adCompliance.ts` — AD Compliance Module

| Export | Type | Spec Ref |
|---|---|---|
| `recordAdCompliance` | mutation | ad-compliance-module.md §3.1 |
| `markAdNotApplicable` | mutation | ad-compliance-module.md §3.2 |
| `checkAdDueForAircraft` | query | ad-compliance-module.md §3.3 |
| `handleAdSupersession` | mutation | ad-compliance-module.md §4.2 |

**Marcus's new requirement implemented in `recordAdCompliance`:**  
The `approvedDataReference` field of the linked maintenance record must contain the AD number. If `maintenanceRecord.approvedDataReference` doesn't contain `adNumber`, the mutation throws `AD_REFERENCE_NOT_IN_RECORD`. This enforces the traceability chain that FAA inspectors follow.

**Auth level enforcement in `markAdNotApplicable`:**  
Per Cilla's QA rule: auth level is enforced by querying the `certificates` table, NOT by checking role labels on the technician/user record. An N/A determination requires an active A&P or IA certificate. The IA status is captured on the record for audit purposes.

**Live hours in `checkAdDueForAircraft`:**  
Per Marcus §2.3: "Don't rely on cached fields for RTS blocking logic." Every call fetches `aircraft.totalTimeAirframeHours` live. No cached fields are used for the authoritative overdue determination.

**Bidirectional supersession in `handleAdSupersession`:**  
Both AD records updated (old → supersededByAdId, new → supersedesAdId). Every affected adCompliance record: old → "superseded", new → pending_determination record created with informative notes from the prior compliance history.

---

### `parts.ts` — Parts Traceability Module

| Export | Type | Spec Ref |
|---|---|---|
| `receivePart` | mutation | parts-traceability.md §2.1 |
| `installPart` | mutation | parts-traceability.md §2.2 |
| `removePart` | mutation | parts-traceability.md §2.3 |
| `tagPartUnserviceable` | mutation | parts-traceability.md §2.4 |

**8130-3 tag validation in `receivePart`:**  
When `eightOneThirtyData` is provided: `formTrackingNumber`, `approvalNumber`, and `certifyingStatement` are required (non-empty). `quantity >= 1` enforced. Approval number is the FAA repair station cert of the releasing entity.

**LLP hard block vs supervisor override:**  
- Zero or negative remaining life → hard block. No override. Per spec §2.2 G7: "block at zero."  
- Low remaining life (≤ 10% of limit) → warning in audit notes, not a hard block. Per Nadia's PM note: "mechanics sometimes knowingly install a part with low remaining life. That's a legal operation."  
- LLP quantity mismatch on 8130-3 → hard block (no override path for LLPs).  
- Non-LLP quantity mismatch → `supervisorOverrideReason` + `supervisorTechnicianId` required.

**Aircraft time snapshot in `installPart`:**  
`aircraftHoursAtInstall` is captured at installation so life accumulation can be correctly computed at removal. This is the `hoursAtInstallation` field used by `computeRemainingLife`.

**Cilla 3.5 in `removePart`:**  
BOTH `currentAircraftId` and `currentEngineId` are patched to `undefined` on removal. The schema INV explicitly requires both be cleared — even if only one was set at installation.

**Two-step guard in `tagPartUnserviceable`:**  
Cannot tag an installed part unserviceable directly. `removePart` must be called first. This ensures the removal record (with hours-at-removal) always exists. The traceability chain cannot have a gap between installation and unserviceable determination.

---

### `returnToService.ts` — Return-to-Service Module

| Export | Type | Spec Ref |
|---|---|---|
| `authorizeReturnToService` | mutation | signoff-rts-flow.md §2 |
| `generateRtsDocument` | mutation | signoff-rts-flow.md §3 |
| `getCloseReadinessReport` | query | signoff-rts-flow.md §5.1, tests/README.md |

**All 9 preconditions from §2.2 are enforced:**

| # | Code | Description |
|---|---|---|
| 1 | `RTS_AUTH_EVENT_CONSUMED/EXPIRED/WRONG_TABLE` | Auth event valid, unexpired, for returnToService table |
| 2 | `RTS_WRONG_WO_STATUS/NO_CLOSE_TIME/ALREADY_SIGNED` | Work order in pending_signoff, has close time, not already signed |
| 3 | `RTS_TIME_MISMATCH/DECREASED/BELOW_AIRCRAFT_RECORD` | Aircraft hours consistent |
| 4 | `RTS_OPEN_TASK_CARDS/UNREVIEWED_NA_STEPS` | All task cards complete or voided |
| 5 | `RTS_OPEN_DISCREPANCIES/CORRECTIVE_RECORD_MISSING/MEL_*` | All discrepancies dispositioned with required docs |
| 6 | `RTS_TECH_INACTIVE/IA_REQUIRED/IA_EXPIRED/RECENT_EXP_LAPSED/RATING_INSUFFICIENT/NOT_AUTHORIZED_FOR_ORG` | Technician authorized |
| 7 | `RTS_NO_INSPECTION_RECORD/AD_REVIEW_NOT_DOCUMENTED/AD_OVERDUE` | AD compliance reviewed (annual/100hr only) |
| 8 | `RTS_NO_MAINTENANCE_RECORDS/UNSIGNED_RECORD` | Maintenance records signed |
| 9 | `RTS_STATEMENT_EMPTY/STATEMENT_TOO_SHORT` | Statement provided (≥50 chars) |

**Failed attempts always logged** per §6.6: every call to `logFailedAttempt` is an `access_denied` event in `auditLog`. A pattern of failed RTS attempts on a single work order is a data anomaly an FAA inspector may investigate.

**Signature hash:** Deterministic over canonical JSON of required fields. Structural integrity only — see TODO: Phase 4.1 for SHA-256 upgrade.

---

### `discrepancies.ts` — Discrepancy Management Module

| Export | Type | Spec Ref |
|---|---|---|
| `openDiscrepancy` | mutation | schema INV + RTS §2.2 P5 |
| `dispositionDiscrepancy` | mutation | schema INV-16 |
| `deferDiscrepancy` | mutation | schema INV-17 + RTS §2.2 P5 |

**INV-16 enforced in `dispositionDiscrepancy`:**  
`corrected` disposition requires both `correctiveAction` (non-empty) AND `correctiveMaintenanceRecordId` (pointing to a signed record for the same aircraft). Missing either throws.

**INV-17 enforced in `deferDiscrepancy`:**  
`melExpiryDate` is COMPUTED from `melDeferralDate + category_interval` — not accepted from the caller. If the caller provides `melExpiryDateOverride`, it must not exceed the computed maximum. This prevents falsification of MEL expiry dates.

| MEL Category | Interval |
|---|---|
| A | 10 calendar days |
| B | 3 calendar days |
| C | 120 calendar days |
| D | No limit (null expiry) |

**MEL deferral requires signatureAuthEvent** — a MEL deferral is a certified act (the technician certifies the aircraft may operate with the deferred item). No-fault findings do not require an auth event.

**Owner notification (14 CFR 43.11(b)):** For Part 135/121 aircraft, `deferredListIssuedToOwner` must be set before RTS per PRECONDITION 5. The `deferDiscrepancy` mutation records the notification with recipient and timestamp.

---

## TODOs: Phase 4.1

Items explicitly deferred with `// TODO: Phase 4.1`:

| # | Location | Item | Reason Deferred |
|---|---|---|
| 1 | `adCompliance.ts` | Load due-soon thresholds from org settings document | org-level settings table not yet implemented |
| 2 | `adCompliance.ts` | Initial compliance window hours check | requires aircraft hours at AD effective date |
| 3 | `parts.ts` | `partTagQuantityUsed` counter for 8130-3 quantity enforcement | spec §3.3 Q3 pending Marcus decision |
| 4 | `parts.ts` | Maintenance record parts link index | junction table not yet in schema (spec §4.2) |
| 5 | `returnToService.ts` | SHA-256 signature hash | Convex action with crypto module |
| 6 | `returnToService.ts` | Full rating inference from task card `taskType` | OI-01 design question open per spec §8 |
| 7 | `returnToService.ts` | Work scope vs. part145Ratings check (`RTS_SCOPE_OUTSIDE_STATION_RATING`) | OI-01 design question |
| 8 | `returnToService.ts` | PDF rendering action | calls `generateRtsDocument` output with PDF library |
| 9 | `discrepancies.ts` | Sequential discrepancy number counter | optimistic count, race condition possible under load |

---

## Cilla's QA Requirements Met

Per `phase-3-implementation/tests/README.md` §5.3 ("Things I will NOT accept as good enough"):

- ✅ AD compliance uses `adCompliance.by_aircraft` index — no table scans
- ✅ Denormalized counters not involved in Phase 4 mutations (those are Phase 3 `completeStep`)
- ✅ `markAdNotApplicable` checks `certificates` table, not role labels on user/technician
- ✅ Every audit log write is in the same Convex transaction as the primary mutation
- ✅ `signatureAuthEvent` consumption sets both `consumedByTable` and `consumedByRecordId`

---

## Test Coverage Targets

These mutations map to Cilla's test IDs from the README:

| Test ID | Mutation | Key Guard |
|---|---|---|
| TC-AD-RECORD-01 | `recordAdCompliance` | Append-only history, nextDueDate recomputed |
| TC-AD-NA-01/02 | `markAdNotApplicable` | A&P rejects, IA succeeds |
| TC-AD-NA-03 | `markAdNotApplicable` | Empty reason rejects |
| TC-AD-NA-04 | `markAdNotApplicable` | Terminal status rejects |
| TC-AD-DUE-01 to 05 | `checkAdDueForAircraft` | Calendar/hours arithmetic, dual-limit |
| TC-AD-SUPER-01/02 | `handleAdSupersession` | pending_determination created, blocks annual RTS |
| `authorizeReturnToService` all 9 | RTS §5.3 coverage gap closed | All preconditions enforced |

---

*Devraj Anand*  
*2026-02-22 — Phase 4 Implementation*  
*Pending QA review by Cilla Oduya and regulatory sign-off by Marcus Webb.*
