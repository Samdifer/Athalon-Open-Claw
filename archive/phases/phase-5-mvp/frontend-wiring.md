# Athelon Phase 5 Alpha — Frontend Wiring Specification
**Document Type:** Phase 5 Alpha — Frontend Implementation Specification
**Authors:** Chloe Park (Frontend Engineer) · Finn Calloway (UX/UI Designer, inline as `[FINN]`)
**Date:** 2026-02-22
**Status:** AUTHORITATIVE — Frontend alpha build begins against this document
**Depends On:** maintenance-record-impl.md · mvp-scope.md · convex-deployment.md
  · phase-4-frontend/remaining-pages.md · auth-platform-wiring.md
  · dom-profile.md · ia-profile.md · qcm-profile.md

---

> *This is the document that connects what Devraj shipped to what Carla will test on day one.
> Every `{} as any` stub is a broken wire. This spec finds every broken wire, names the Convex
> function it connects to, and describes exactly what the user should see when the current flows.
> I am being completely honest about what's wired and what isn't. Carla will read this before she
> logs in. — CP*

---

## Section 1: API Stub Replacement Plan

Phase 4 used `const api = {} as any` throughout all page and hook files as a deployment-pending
shim. Once Jonas runs `npx convex deploy` and `convex/_generated/api.ts` is populated, every
stub becomes a real import. The replacement is mechanical. The TypeScript compiler is the gate.

**Replacement procedure:**
1. Jonas: `npx convex deploy` (Condition 1). Codegen auto-runs.
2. Replace every `const api = {} as any` with `import { api } from "@/convex/_generated/api"`.
3. `npx tsc --noEmit` — fix every error. Do not suppress. Errors are the spec.
4. `pnpm lint` clean. No `// @ts-ignore` on any API call path.

### 1.1 Files Carrying Stubs

| File | Queries Needed | Mutations Needed | Codegen Needed? |
|---|---|---|---|
| `work-orders/[id]/layout.tsx` | `workOrders.get` | — | No |
| `work-orders/[id]/page.tsx` | `taskCards.listForWorkOrder`, `workOrders.getCloseReadiness` | — | No |
| `work-orders/[id]/tasks/[id]/page.tsx` | `taskCards.get`, `taskCardSteps.listForCard`, `…counterSignatures.listForCard`, `…interruptions.listOpen` | `completeStep`, `markNa`, `counterSignStep`, `reviewNaStep`, `interruptStep`, `resumeStep` | No |
| `work-orders/[id]/sign-off/page.tsx` | `workOrders.getCloseReadiness`, `taskCards.listForWorkOrder`, `discrepancies.listForWorkOrder`, `adCompliance.checkAdDueForAircraft`, `maintenanceRecords.listForWorkOrder`, `signatureAuthEvents.getPendingForCurrentUser` | `workOrders.authorizeReturnToService` | No |
| `parts/receiving/page.tsx` | `parts.listReceivingQueue` | `parts.receivePart` | No |
| `parts/inventory/page.tsx` | `parts.listInventory` | `installPart`, `removePart`, `tagPartUnserviceable` | No |
| `compliance/ads/page.tsx` | `adCompliance.checkAdDueForAircraft`, `adCompliance.listForCurrentOrg` | `createAdCompliance`, `recordAdCompliance`, `markAdNotApplicable` | No |
| `work-orders/[id]/maintenance-records/page.tsx` | `maintenanceRecords.listForWorkOrder` | `createMaintenanceRecord`, `signMaintenanceRecord` | **YES — Phase 5 mutations** |
| `work-orders/[id]/maintenance-records/[id]/page.tsx` | `maintenanceRecords.getMaintenanceRecordAuditTrail` | `createCorrectionRecord` | **YES — Phase 5 query** |
| `qcm/dashboard/page.tsx` | `workOrders.listClosedPendingQcmReview` | `workOrders.qcmReviewWorkOrder` | **YES — Phase 5** |
| `components/sign-off/ReAuthModal.tsx` | `signatureAuthEvents.getPendingForCurrentUser` | — | No |
| `lib/hooks/useSignatureAuthEvent.ts` | `signatureAuthEvents.getPendingForCurrentUser` | — | No |

**Critical dependency:** The maintenance record pages, the QCM dashboard, and the IA cert query
(`certificates.getActiveForCurrentUser`) require Devraj's Phase 5 mutations deployed first.
Chloe cannot run codegen for those files until Devraj's push lands. Build sequence step 6 and 10
from mvp-scope.md cannot begin until that push is confirmed.

---

## Section 2: Maintenance Record UI

The maintenance record mutations need a home. The home is a new **Maintenance Records** tab on
the Work Order Detail page.

**Route:** `app/(app)/work-orders/[workOrderId]/maintenance-records/page.tsx`
Tab label: "Records" (fits mobile tab bar without truncation). Visible to all `viewer+` roles.
Record creation FAB: `isAtLeast("amt")` only.

Live subscription on mount:
```typescript
const records = useQuery(api.maintenanceRecords.listForWorkOrder, { workOrderId });
// sorted: draft first (require action), signed second (chronological)
```

Record cards in the list:
- **Draft:** amber left border, "DRAFT — Not Signed" badge, `variant="primary"` "Sign Now" button. The entire amber card is tappable on mobile. A draft record is a compliance gap — the UI communicates that urgency.
- **Signed:** green left border, "SIGNED" badge, signing cert number, timestamp, `<HashIntegrityBadge>` (§3).
- **Corrected:** gray left border, "CORRECTED" badge, link to correction record.

**FAA Inspector View toggle** — ghost button visible to `isAtLeast("inspector")` in the page
header. Toggles expanded view showing full `getMaintenanceRecordAuditTrail` data for each record.
This is Carla's day-one verification mode (§2.4).

[FINN] Draft cards use `variant="primary"` for Sign Now — not outlined, not ghost. Absent edit button on signed records: not disabled, structurally absent. A disabled edit button invites questions. An absent one communicates: this is a record, not a form.

### 2.1 Maintenance Record Creation Form

Component: `<CreateMaintenanceRecordForm>` — full-screen bottom sheet (mobile), 640px drawer (desktop).

**Fields and validation (mirroring mutation guards):**

| Field | Input | Guard Mirrored | Client Pre-check |
|---|---|---|---|
| `recordType` | Segmented: "Maintenance §43.9" / "Inspection §43.11" | — | Required |
| `workPerformed` | Textarea, `min-h-[120px]`, `font-size:16px`, `maxLength:3000` | G3a (50 chars), G3c (100 for inspection) | Character counter top-right; amber at 40–49, green at 50+ |
| `approvedDataReference.documentType` | Select: AMM / SRM / IPC / CMM / AD / SB / TSO / MM / other | G3b | Required |
| `approvedDataReference.documentId/revision/chapter` | Text inputs | G3b | Required, non-whitespace |
| `completionDate` | `<input type="date">` | MR_COMPLETION_DATE_IN_FUTURE | Must not be future |
| `aircraftTotalTimeHours` | Number, **read-only** — pre-populated from WO's `aircraftTotalTimeAtClose` | G4 (MR_AIRCRAFT_TIME_MISMATCH) | Mismatch impossible; field is not user-editable |
| `returnedToService` | Toggle | G5 | — |
| `returnToServiceStatement` | Textarea, conditional | G5 (MR_RTS_STATEMENT_REQUIRED) | Required when RTS true |
| `partsReplaced[]` | Repeatable `<PartEntryRow>` (P/N, S/N, 8130-3 ref) | — | Optional |
| `discrepanciesFound/Corrected[]` | Multi-select from WO discrepancies | G6 | Cross-validated to WO on server |

`aircraftTotalTimeHours` is read from `workOrder.aircraftTotalTimeAtClose` and labeled "Aircraft
Total Time (from Work Order — not editable)". If `aircraftTotalTimeAtClose` is null, an amber
banner renders and the submit button is disabled: "Set aircraft total time on the work order
before creating a maintenance record." This surfaces `MR_WO_NO_CLOSE_TIME` before a failed call.

`documentType: "other"` shows an amber advisory: "Free-text references will be flagged for QCM
review. Use a structured document type when possible." Does not block submission.

**Submission:** `createMaintenanceRecord` fires. Button loading state per frontend-integration.md §1.3
pattern (spinner inside button dimensions, no layout shift). On success, a persistent `<SuccessSheet>`
shows "Record #{sequenceNumber} created — DRAFT. Tap to sign now." Tapping opens the sign flow (§2.2).

**Error handling on creation:**
- `MR_WORK_PERFORMED_TOO_SHORT` → inline error on `workPerformed` field. Should not reach the server
  with client-side validation live, but surfaced inline if it does.
- `MR_APPROVED_DATA_REF_EMPTY` → inline error on the approvedDataReference block.
- `MR_WO_WRONG_STATUS` → `<ErrorBanner>`: "This work order is closed. Maintenance records cannot
  be added to a closed work order."
- `MR_WO_NO_CLOSE_TIME` → surfaced before submit (pre-populated field check above), but if reached:
  `<ErrorBanner>` with link to WO header aircraft times field.
- `MR_TECHNICIAN_NOT_ACTIVE` → `<ForbiddenState>`: "Your technician record is not active. Contact
  your DOM." This should be impossible for a logged-in user but must be handled.
- All other codes → `useMutationErrorHandler` per frontend-integration.md §5 pattern.

### 2.2 Two-Phase Sign Flow: Draft → Signed

**Phase 1 — Content Review (`<MaintenanceRecordSignReview>`):**

Full-screen review of the record as it will be stored: aircraft identity, record type in plain
English, full `workPerformed` text, structured `approvedDataReference`, parts replaced, completion
date, TT, discrepancies linked, RTS statement if applicable. Below the content: `<IaCertIdentityBlock>`
for inspection records (§5). Then ratings exercised RQ-05 selector (unconfirmed → confirmed).

The "Continue to Sign" button is disabled until: (a) user has scrolled to the bottom of the
record content, and (b) at least one rating is confirmed. This is the engineered pause. Dale
Renfrow: "He reads it. Then he signs. Not the other way around."

**Phase 2 — PIN Entry:** Standard `<ReAuthModal>` + `useSignatureAuthEvent`. On `status: "ready"`:
```typescript
await signMaintenanceRecord({
  recordId, signatureAuthEventId: eventId,
  ratingsExercised: confirmedRatings,
  techniciansWhoPerformedWork: additionalTechIds,
});
```
On success: draft card transitions to signed card via Convex live subscription. Persistent banner:
"Record #{sequenceNumber} — SIGNED · [certNumber] · [timestamp]Z". Not a toast. Must survive
a screenshot. This is a regulatory record.

**Error handling on sign:**
- `MR_ALREADY_SIGNED` → full-page `<ErrorState>`: "This record was already signed. Reload the
  page." (Should be impossible if the Convex subscription is live, but guarded.)
- `MR_IA_REQUIRED_FOR_INSPECTION` → `<ForbiddenState>`: "Inspection records require IA authorization.
  You do not hold a current IA." Shown before PIN step via `<IaCertIdentityBlock>` gate (§5.1).
- `MR_IA_EXPIRED` → same as above but with: "Your IA authorization expired [date]. Renew through
  your FSDO before signing inspection records." Hard gate in `<IaCertIdentityBlock>`.
- `AUTH_EVENT_EXPIRED` → `<ReAuthTimeoutError>`: "Authentication event expired. Authenticate again."
  "Try Again" button remounts `useSignatureAuthEvent` hook with fresh `mountTime` per
  auth-platform-wiring.md §4.2.
- `AUTH_EVENT_ALREADY_CONSUMED` → fatal error: "Authentication event already used. Start a new
  sign-off from the record list."
- `SIGN_RATING_NOT_HELD` → form-level error: "You selected the [airframe/powerplant] rating but
  your certificate does not include it. Correct your ratings selection."
- All other codes → `useMutationErrorHandler`.

**Immutability state:** Signed records show no edit button (absent, not disabled). A gray note
at the bottom of the record detail: "This record is signed and immutable. To correct an error,
use Create Correction Record below." A `<CreateCorrectionForm>` CTA renders for `isAtLeast("amt")`.

### 2.3 Carla's Audit Trail View — FAA Inspector View

When FAA Inspector View is toggled, each signed record expands to show the full
`getMaintenanceRecordAuditTrail` result:
- Full record document (all §43.9 fields)
- SHA-256 integrity block: stored hash, recomputed hash, match status, algorithm version, verification timestamp
- Audit trail: creation event + signing event (two distinct timestamps — Dale's "two independent data points")
- Certificate snapshot at signing time + current cert status (live cross-reference)
- Correction chain if applicable

This is what Carla examines at 6 AM after a midnight sign-off. Every field. Readable without
database access. Self-contained.

**Correction chain display:** If `correctionChain.corrections.length > 0`, both the original and
each correction record are shown in chronological sequence with a connecting arrow: "Record #4
[CORRECTED] → Correction Record #7 [SIGNED]". The original remains visible — struck through in
its header section but fully readable below. This satisfies Carla's requirement #3: "The original
signed entry must remain visible — struck through, flagged, whatever — not deleted." The correction
does not replace the original in the database. Both are permanent. Both appear here.

**LAUNCH BLOCKER: PDF export is not built.** The `getMaintenanceRecordAuditTrail` query returns
correct data. The PDF rendering action (Convex action + React PDF library + Marcus-reviewed §43.9
template) does not exist. Per mvp-scope.md "Must Be in Alpha" item 8 and dom-profile.md:
"She will run the export test on day one." On-screen FAA Inspector View does not substitute.
The export is not optional. Build it before Carla arrives.

---

## Section 3: SHA-256 Hash Verification UI

Carla and Dale are not cryptographers. But both understand "this record was altered after signing."
The hash UI translates hexadecimal digest into that plain-English outcome.

### 3.1 `<HashIntegrityBadge>` Component

Renders on: every signed maintenance record card, every signed record in FAA Inspector View,
the RTS detail view, and the `<PreSignIntegrityPanel>` in the sign flow (§3.2).

**Props:** `{ hashesMatch, storedHash, recomputedHash, verifiedAt, hashAlgorithmVersion, compact? }`

**MATCH state (compact):** `✓ INTEGRITY VERIFIED` — green, `text-sm font-semibold`. On tap:
tooltip shows 16-char hash prefix + "Verified [timestamp]Z".

**MATCH state (expanded, in FAA Inspector View):** Both full 64-char hex strings displayed in
`font-mono`, visual match indicator between them ("IDENTICAL" in green).

**MISMATCH state:** Red. Non-dismissible. Full-width, `bg-red-50 border-red-600`, positioned
ABOVE record content:
```
⚠ INTEGRITY MISMATCH — THIS RECORD MAY HAVE BEEN ALTERED AFTER SIGNING
Stored:     [64 hex chars]
Recomputed: [64 hex chars]
Contact your DOM and QCM immediately. Do not use this record for return-to-service.
```

**Draft records:** No badge. Gray italic: "Unsigned — no hash."

[FINN] A mismatch state is not a banner — it IS the page state. The record cannot render normally
when a hash mismatch exists. Everything else is subordinate to the red alert. In a correctly
functioning system this should never trigger. The component exists for the day it does.

### 3.2 `hashesMatch` Implementation

`getMaintenanceRecordAuditTrail` recomputes the SHA-256 server-side over the canonical field set
and returns `hashVerification.hashesMatch`. The frontend reads this field and passes the full
`hashVerification` object as props to `<HashIntegrityBadge>`. No client-side hash computation.
The Convex subscription is live — a mismatch surfaces in real time without a refresh.

### 3.3 `<PreSignIntegrityPanel>`

Rendered in Phase 1 of the sign flow, above the ratings selector, below the record content.

**For a draft record (first signing):**
```
◉ Signing this record will compute and lock a SHA-256 hash of all fields above.
  After signing, any alteration to this record will be detectable.
```
Gray, `text-sm`. Informational — not a warning.

**For a corrected record being reviewed:** Full `<HashIntegrityBadge>` in expanded mode.
"The record being corrected has verified integrity (hash matches). Your correction will create
a new signed record. The original is preserved permanently."

[FINN] This panel is the engineered pause before PIN entry. Keep it minimal. One sentence for
the draft case. The expanded badge for the correction case. It should feel like a pre-flight
check, not a legal disclaimer. Declarative language, not legalistic.

---

## Section 4: QCM Review Action Wiring

mvp-scope.md criterion 10. New Phase 5 work — no Phase 4 precedent.

### 4.1 Button Location

Two surfaces:

**1. Closed WO detail header:** When `workOrder.status === "closed"` and current user is
`isAtLeast("supervisor")`, an action area renders in the WO header:
- Pre-review: `[QCM REVIEW PENDING]  [← Mark Reviewed]` button
- Post-review: `[✓ QCM REVIEWED — [reviewer name] — [timestamp]Z]` (read-only)

All roles `viewer+` see the QCM review status. Only `supervisor+` see the action button.

**2. QCM Dashboard** — primary workflow entry point (§4.3).

### 4.2 Confirmation Flow

`<QcmReviewModal>` on "Mark Reviewed" tap. Shows: WO number, aircraft, close timestamp, elapsed
time since close. Required acknowledgement checkbox: "I have reviewed the maintenance records,
task card sign-offs, discrepancy dispositions, and parts traceability for this work order."
Optional notes textarea (`maxLength: 500`, visible character counter — no silent truncation per
Renata's explicit requirement). "Confirm QCM Review →" button.

On confirm: `qcmReviewWorkOrder` fires. No re-authentication — this is a review action, not a
signing action. Mutation enforces `requireOrgMembership(ctx, "supervisor")`.

On success: WO header transitions in real time (live subscription). `auditLog` event
`qcm_reviewed` appears in the audit trail.

[FINN] Elevated modal style (32px padding, shadow). Copy is direct — no legal boilerplate.
The notes field is for findings, not for self-protection. The modal closes a professional loop.

### 4.3 QCM Dashboard

**Route:** `app/(app)/qcm/dashboard/page.tsx` — `isAtLeast("supervisor")`, middleware + server check.

**Primary panel — "Awaiting QCM Review":**
```typescript
const pendingReview = useQuery(api.workOrders.listClosedPendingQcmReview, { organizationId });
// WOs in "closed" status, no qcm_reviewed auditLog event, sorted by closedAt ascending
```

Each WO card: number, tail number, WO type, aging indicator keyed to `closedAt`:
- `< 24h`: neutral
- `24–48h`: amber badge "⏱ 34h since close"
- `> 48h`: red badge "🔴 53h since close — OVERDUE REVIEW" with full card `bg-red-50`

The 48-hour threshold is from mvp-scope.md item 10. This dashboard replaces Renata's Monday
morning parallel spreadsheet. Make it make that obsolete.

**Secondary panel:** Last 10 reviewed WOs, collapsed by default.

The QCM dashboard is also the correct long-term home for Renata's other manual workarounds
(technician qualification expiry alerts, content quality flags from the keyword-presence check
in maintenance-record-impl.md §6.3, sync-pending states for offline work). Those are deferred
to v1.1 per mvp-scope.md, but the route and role-gating are set up now so they can be added
to the dashboard without a routing change.

[FINN] Overdue cards must dominate the view — full `bg-red-50`, bold "OVERDUE REVIEW" label,
threshold stated in card copy. When Renata opens this page at 8 AM, the view should immediately
communicate whether she has a problem. Don't make her parse.

---

## Section 5: Dale's IA Cert Display Requirement

Dale Renfrow rejected two products for conflating A&P certificate number with IA authorization
number. These are different documents. `certificates.iaCertNumber` must be a separate field.
Every IA sign-off screen must show both before PIN entry. This is maintenance-record-impl.md
Open Item 1 and a **launch blocker**.

### 5.1 `<IaCertIdentityBlock>` Component

Appears in: `<StepSignOffModal>` counter-sign mode (`counterSignType === "ia_inspection"`),
`<MaintenanceRecordSignReview>` when `recordType === "inspection_43_11"`, RTS wizard Step 5.

Data source:
```typescript
const cert = useQuery(api.certificates.getActiveForCurrentUser, {});
// Returns: { certNumber, iaCertNumber, certType, iaExpiryDate, legalName, ... }
```

**Populated state:**
```
┌─ YOUR INSPECTION AUTHORIZATION ────────────────────────────────────────┐
│  Name:            Dale Renfrow                                          │
│  A&P Certificate: #2871490    (Airframe & Powerplant)                  │
│  IA Authorization: #IA-2011-04883                                       │
│  IA Current Through: March 2027                                         │
│  This is the information that will appear in the signed record.         │
│  Review it. Then authenticate.                                          │
└────────────────────────────────────────────────────────────────────────┘
```

**`iaCertNumber` missing or null — HARD GATE:**
```
┌─ IA AUTHORIZATION NUMBER REQUIRED ────────────────────────────────────┐
│  ⚠ Your IA authorization number is not on file.                        │
│  Name: Dale Renfrow  |  A&P Certificate: #2871490                     │
│  IA Authorization: [NOT ON FILE]                                        │
│  You cannot sign inspection records until your IA number is added.     │
│  Contact your DOM: Settings → Personnel → [Name] → Certificates.       │
└────────────────────────────────────────────────────────────────────────┘
```

`bg-amber-50 border-amber-400`. The "Continue to Authenticate" button is structurally absent —
not disabled, absent. The DOM settings link is the only action. The sign-off flow cannot proceed.

**Why this is a hard gate:** A system that allows an IA sign-off without the IA number on file
produces a maintenance record that cannot be verified in the FAA Airmen Inquiry database.
Carla: "The FAA does not care who 'jsmith' is. They care who holds certificate IA-2011-04883."

### 5.2 Sign-Off Screen Order for IA-Required Steps

For any IA-required step, this is the complete, non-reorderable flow:

1. **IA Review panel** — mechanic's sign-off, referenced document, findings. Dale: "I need to
   see the mechanic's sign-off, the referenced document, and the findings before I initiate
   my own sign-off. No sign-off from a summary page."
2. **`<IaCertIdentityBlock>`** — A&P cert number AND IA cert number. Hard gate if IA number missing.
3. **Ratings exercised** — RQ-05 unconfirmed → confirmed. "IA" pre-selected for `ia_inspection`.
4. **Certification statement** — full §43.9 / §43.11 regulatory language, IA name and IA number
   populated. Not editable at this step.
5. **PIN entry** — `<ReAuthModal>`. Per-signature auth. No session persistence across IA sign-offs.

Steps 1–4 complete in order before PIN is presented. No skip affordance. No "remember this device
for 30 days" on any IA sign-off step. This is the engineered pause Dale requested. "The wet
signature is valuable because it imposes a pause. Engineer that pause back into the digital process."

**RTS Wizard Step 5 — IA identity display:** The `<IaCertIdentityBlock>` also renders in the RTS
wizard Step 5 (re-authentication) when `workOrder.requiresIaSignOff` is true. Same hard gate:
if `iaCertNumber` is null, the PIN entry step is blocked. The IA cannot authorize return to service
without their IA number on file. This means the `MR_IA_REQUIRED_FOR_INSPECTION` guard at the
`authorizeReturnToService` mutation layer is pre-surfaced in the UI before the user even reaches
the re-auth step — exactly what Devraj specified in the guard sequence rationale: "Dale's
requirement is that the IA currency check be a hard gate, not a soft warning, before the
sign-off workflow opens."

**`isAtLeast("inspector")` gate in the UI:** The IA cert block renders only for roles where the
caller holds `inspector` or higher per the `athelon_role` claim. For an AMT attempting to sign
an `inspection_43_11` record, the sign flow never reaches the IA block — the role check blocks
the signature action at step 1 of the flow, before the review panel. This mirrors
`MR_IA_REQUIRED_FOR_INSPECTION` on the server: the server guard is the enforcement boundary;
the client check is the early-exit convenience.

[FINN] The IA auth block must be visually unmistakable before PIN entry — not a footnote below a
form. It is the second thing the IA sees on that screen, immediately after the mechanic's review
panel. Clear hierarchy: review what you're certifying, confirm your identity, authenticate.

---

## Section 6: Alpha Acceptance Criteria Wiring Checklist

**Status legend:**
- 🔶 **WIRED PENDING DEPLOY** — Code written; blocked on Convex deployment (Condition 1).
- 🔴 **PENDING** — Known gap; specific blocker listed.

| # | Criterion | Component / Page | Convex Function | Status | Blocker |
|---|---|---|---|---|---|
| 1 | Work Order Lifecycle | `WorkOrderHeader`, `CloseWorkOrderModal`, `VoidWorkOrderModal` | `workOrders.get/closeWorkOrder/voidWorkOrder`, `getCloseReadiness` | 🔶 | Deployment |
| 2 | Task Card Step Sign-Off | `TaskCardDetail`, `StepSignOffModal`, `NaReviewModal` | `completeStep`, `counterSignStep`, `reviewNaStep` | 🔴 | `iaCertNumber` field not in schema (Open Item 1) |
| 3 | Discrepancy Management | `DiscrepancyOpenForm`, `DiscrepancyDispositionModal`, `MelDeferralForm` | `openDiscrepancy`, `dispositionDiscrepancy` | 🔶 | Deployment |
| 4 | Maintenance Record Creation + Signing | `CreateMaintenanceRecordForm` (§2.1), `MaintenanceRecordSignReview` (§2.2) | `createMaintenanceRecord`, `signMaintenanceRecord` | 🔴 | New Phase 5 UI + mutations (2 days) |
| 5 | Return-to-Service Authorization | `sign-off/page.tsx`, `useRtsWizard`, `GroundedBanner` | `authorizeReturnToService`, `getCloseReadiness` | 🔴 | Depends on Criterion 4 (maintenance record is RTS precondition 3) |
| 6 | Close Readiness Report | `CloseReadinessPanel`, `BlockingConditionAlert` | `workOrders.getCloseReadiness` | 🔶 | Deployment |
| 7 | AD Compliance Tracking | `compliance/ads/page.tsx`, `CreateAdComplianceModal`, `MarkNaModal` | `createAdCompliance`, `recordAdCompliance`, `markAdNotApplicable`, `checkAdDueForAircraft` | 🔶 | Deployment |
| 8 | Parts Receiving + Installation | `ReceivingForm`, `InstallPartConfirmation`, `RemoveAndRedTagModal` | `receivePart`, `installPart`, `removePart`, `tagPartUnserviceable` | 🔴 | `pending_inspection` location enum addition (mvp-scope.md schema; 2-hour schema change) |
| 9 | Audit History UI | `AuditTrailView` (generic), FAA Inspector View toggle (§2.3) | `auditLog.listForRecord`, `getMaintenanceRecordAuditTrail` | 🔴 | Generic trail: pending deploy. MR-specific FAA Inspector View: depends on Criterion 4 |
| 10 | QCM Review Action | `QcmReviewModal` (§4.2), `qcm/dashboard/page.tsx` (§4.3) | `qcmReviewWorkOrder`, `listClosedPendingQcmReview` | 🔴 | New Phase 5 UI + query + mutation (1 day); `qcm_reviewed` enum addition required |
| 11 | N-Number Normalization | `AircraftRegistrationInput`, `AircraftSearch` | `aircraft.createAircraft` (normalize in mutation), `aircraft.searchByRegistration` | 🔶 | Deployment (4-hour mutation task per mvp-scope.md) |
| 12 | SHA-256 Hash | `<HashIntegrityBadge>` (§3.1), `<PreSignIntegrityPanel>` (§3.3) | `signMaintenanceRecord` (hash compute), `getMaintenanceRecordAuditTrail` (hash verify) | 🔴 | Condition 4: SHA-256 must replace `RTS-HASH-V0-*` (Devraj, 1 day). Badge UI: depends on Criterion 4 build |

**Summary: 0 criteria fully wired. 5 wired pending deploy. 7 pending new build.**

One clarification on the 5 "wired pending deploy" criteria: the code paths exist, the component
trees are built, the Convex functions are specced. The wire physically cannot close until Convex
deployment generates the typed API. Once the deployment runs and `tsc --noEmit` passes clean,
those five transition from 🔶 to ✅ within the same sprint day. That is the nature of the
Phase 4 investment paying off now.

Nothing is wired until Condition 1 (deployment) executes. That is the correct state for where
we are in the sequence. The deployment is a 1-day execution task with zero design decisions
outstanding. The clock starts when Jonas runs `npx convex deploy`.

### 6.1 Critical Path to Alpha Launch

In sequence:

| Step | Owner | Duration | Unblocks |
|---|---|---|---|
| Convex deployment + schema push | Jonas | 1 day | Everything |
| SHA-256 implementation (Condition 4) | Devraj | 1 day | Criterion 12, 4, 5 |
| `iaCertNumber` schema field + cert query | Devraj | 2 hours (part of schema push) | Criterion 2 |
| `pending_inspection` location enum | Devraj | 2 hours (part of schema push) | Criterion 8 |
| `qcm_reviewed` auditLog eventType | Devraj | 2 hours (part of schema push) | Criterion 10 |
| API stub replacement (`tsc` clean) | Chloe | 2 hours after deploy | All frontend |
| Maintenance record creation + sign UI | Chloe + Devraj | 2 days parallel | Criteria 4, 5, 9 |
| QCM dashboard + review modal | Chloe | 1 day | Criterion 10 |
| Hash integrity badge + FAA Inspector View | Chloe | 1 day | Criteria 9, 12 |
| `<IaCertIdentityBlock>` + IA cert display | Chloe | 0.5 day | Criterion 2 fully wired |
| **PDF export action** | Devraj + Chloe | 2 days | **LAUNCH BLOCKER** |
| Smoke test (Cilla — 43+ cases) | Cilla | 2 days | Marcus simulated inspection |
| Marcus simulated inspection | Marcus | 1 day | Alpha ship |

**Critical path: ~9 working days** (matching mvp-scope.md §Build Sequence).

### 6.1a Connectivity Block — Maintenance Record and QCM Mutations

All signing mutations (`signMaintenanceRecord`, `createCorrectionRecord`) and the QCM review
mutation (`qcmReviewWorkOrder`) are **connectivity-required actions**. The `useConnectivity().isOffline`
check blocks the submit button on the creation form and the "Confirm QCM Review" button with the
same inline label used in the RTS wizard: "Connection required for signing." These are regulatory
record events. They do not queue. They do not proceed offline. Per dom-profile.md: "Does it queue?
Does it fail? Does it silently lose the entry? Does it tell the user?" The answer is: it tells the
user and does not proceed. Full offline mode is deferred to v1.1 (mvp-scope.md §Explicit Deferrals),
but the connectivity block itself must be in the alpha build — otherwise Carla's question has no
answer, and that is a non-starter.

### 6.2 Launch Blockers — Complete List

These items do not have workarounds. Alpha does not ship without them.

1. **PDF export action** — Carla runs the export test on day one. The `getMaintenanceRecordAuditTrail`
   query returns correct data. The PDF rendering (Convex action + React PDF + Marcus-reviewed
   §43.9 field layout) does not exist. Per maintenance-record-impl.md §4 and dom-profile.md:
   "She will create a test work order, sign a step, close the work order, generate the maintenance
   release, and then export the full record to PDF. She will look at it the way an inspector looks
   at it." This is not a day-2 feature.

2. **`iaCertNumber` schema field** — Dale Renfrow has rejected two products for conflating A&P
   cert number with IA number. Until `certificates.iaCertNumber` is a separate field in the schema,
   the IA sign-off flow cannot display the IA number, and the hard gate in `<IaCertIdentityBlock>`
   (§5.1) cannot be populated. Criterion 2 is blocked on this alone.

3. **SHA-256 implementation (Condition 4)** — `RTS-HASH-V0-*` placeholders cannot appear in
   any record created during alpha. The hash display components are only meaningful once
   `computeSha256` runs on real canonical field sets.

4. **`approvedDataReference` structured object** — The promotion from free-text to structured
   `{ documentType, documentId, revision, chapter, section }` (maintenance-record-impl.md §6.3)
   requires a schema migration plan from Rafael and Devraj. Until this lands, the creation form
   cannot enforce the structured reference that prevents "per AMM" entries at the field level.

---

*Chloe Park — Frontend Engineering*
*`[FINN]` annotations: Finn Calloway — UX/UI Design*
*2026-02-22 — Athelon Phase 5 Alpha Frontend Wiring Specification*
*Finn delivers Figma frames for `MaintenanceRecordSignReview`, `IaCertIdentityBlock`,
`QcmReviewModal`, `<HashIntegrityBadge>`, and QCM dashboard by 2026-02-26.*
*Carla will run the export test. Build the export.*
