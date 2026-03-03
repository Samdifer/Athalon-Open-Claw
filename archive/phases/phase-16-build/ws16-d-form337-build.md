# WS16-D — Form 337 UI Build

**Workstream:** WS16-D  
**Phase:** 16 — Build Execution  
**Owners:** Chloe Park (Frontend) + Finn Calloway (UX) + Renata Vasquez (UAT)  
**Source R&D:** `phase-15-rd/ws15-c-form337-ui.md`  
**Output:** `phase-16-build/ws16-d-form337-build.md`  
**Date:** 2026-02-22  
**Status:** BUILD READY — EXECUTE NOW

---

## 1. UI Component Spec: Form 337 Badge on Work Order Card

### 1.1 What Renders When a Job Is Classified as Major Repair

**Trigger:** A task card on a work order has `repairClassification = "major"` set (via `setRepairClassification` mutation).  
**When this happens:** A "337 Ref" badge appears immediately on the work order card in every view that shows work order cards: the WO list, the coordinator board (WS16-I), and the WO detail header.

**Badge specification:**

```
┌─────────────────────────────────────────────────────────────┐
│  WO-2026-0441  |  N447DE  |  Cessna 172S                    │
│  Annual Inspection                                           │
│                                                              │
│  ┌──────────────────────┐   ┌─────────────────────────────┐ │
│  │ 337 Ref: PENDING     │   │ Status: In Progress          │ │
│  └──────────────────────┘   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Badge: "337 Ref: PENDING"**
- Background color: amber (#F59E0B)
- Text color: black (#000000) — for grayscale-print legibility
- Font: 11pt bold
- Border: 1px solid #D97706 (darker amber)
- Border-radius: 4px
- Padding: 4px 8px
- Position: Below the WO title line, left-aligned, before status badge
- Always visible (not collapsible, not behind a tooltip)

**Badge state progression:**

| State | Display Text | Background | When |
|---|---|---|---|
| Unclassified (flagged) | "337 Review Required" | amber (#F59E0B) | `requiresClassificationReview = true`, classification not yet set |
| Major — 337 pending | "337 Ref: PENDING" | amber (#F59E0B) | `repairClassification = "major"`, `form337 = undefined` |
| Major — 337 on file | "337 Ref: [ref number]" | blue (#2563EB) | `form337.referenceNumber` is set |
| Major — FSDO submitted | "337: FSDO Filed [date]" | teal (#0D9488) | `form337.fsdoSubmissionDate` is set |
| Minor — attested | "Minor Repair — Attested" | green (#16A34A) | `repairClassification = "minor"`, attestation record exists |
| Not applicable | (no badge shown) | N/A | `repairClassification = "not_applicable"` |

**Critical behavior:** The badge in the "major / 337 pending" state is NOT dismissible. It persists on the card until the Form 337 reference is attached or classification is changed. There is no "dismiss" button, no "remind me later" action.

**Click behavior:** Clicking the badge navigates to the task card view with the `ClassificationModal` or `Form337Panel` open, scrolled to the relevant task card. URL deep-links: `/work-orders/[id]/task-cards/[taskCardId]?modal=form337`.

### 1.2 Placement Priority on Multi-Card Work Orders

If multiple task cards on a single work order have `repairClassification = "major"`, the WO-level badge shows: "337 Ref: [N] PENDING" where N is the count of task cards with outstanding 337 refs. Click navigates to the 337 overview panel for the WO (see Section 1.4).

### 1.3 IA Dashboard — 337 Status Column

A dedicated "337 Status" column appears in the IA's work order task list. This column is always visible (not opt-in) for any IA-role user.

States (text-first, color as secondary):

| Text Label | Icon | Color | Meaning |
|---|---|---|---|
| "Not Required" | — | gray | No task cards flagged for classification |
| "Pending Classification" | ⚠ | amber | Task card(s) flagged, classification not yet set |
| "Minor — Attested" | ✓ | green | All flagged cards classified minor with attestation |
| "337 On File" | ✓ | blue | Major classification + form337 data attached |
| "FSDO Filed" | ✓ | teal | fsdoSubmissionDate recorded |
| "BLOCKS RTS" | ✗ | red | Major classification with no 337 — will block RTS initiation |

The "BLOCKS RTS" state is the primary action signal. Red, bold, icon with text. Clicking it opens the WO's 337 overview panel.

### 1.4 WO-Level 337 Overview Panel

Accessible from the IA dashboard and from the WO detail sidebar. Shows per-task-card 337 status for all task cards on the work order that have `requiresClassificationReview = true`.

Columns: Task Card Title | Classification | 337 Reference | FSDO Submitted | Blocking RTS?

If any row shows "Blocking RTS: YES", a banner at the top of the panel reads:

```
⛔ One or more task cards will prevent Return to Service.
   Form 337 must be on file before RTS can be initiated.
   You have been aware of this requirement since [classification date] — [X days ago].
```

The "since [classification date]" language is intentional: it directly surfaces the fact that this requirement has been visible throughout the work period, pre-empting any "the system surprised me at RTS" claim.

---

## 2. Form 337 Reference Input

### 2.1 Field Placement

The Form 337 reference input lives in two places:

**A. The ClassificationModal (primary path)**  
When a mechanic or IA classifies a task card as "major", the modal's major-repair path includes Form 337 data entry as an inline multi-step form within the same modal. The 337 reference number is Step 1 of 5 in the major path. There is no "do this later" option in the modal. The user must either:
- Complete the full Form 337 data entry (saves as a draft if they navigate away), or
- Change the classification back (requires justification), or
- Close the modal and leave the task card in "pending classification" state (amber badge visible, RTS not blocked yet — but the clock has started)

**B. The Task Card Detail View (secondary path)**  
A dedicated "Form 337" section appears on any task card where `requiresClassificationReview = true`. It shows the current classification and a "Complete Form 337" action button if `repairClassification = "major"` and `form337` is absent.

### 2.2 Form Fields and Validation

**Multi-step form for major classification:**

**Step 1 — Reference Number**
- Label: "Form 337 Reference Number"
- Input: text field
- Validation: required; regex `/^[A-Z0-9\-]{4,30}$/i` — alphanumeric, hyphens, 4-30 characters
- Error message: "Reference number must be 4–30 alphanumeric characters (hyphens allowed). Example: 337-2026-0441"
- Submit behavior: field-level validation fires on blur and on Next button click; Next button disabled until field valid

**Step 2 — Approved Data Reference**
- Four sub-fields, all required:
  - Document Type (text, min 2 chars): e.g., "Structural Repair Manual", "STC", "Engineering Order"
  - Document Number (text, min 2 chars): e.g., "172S-SRM-01"
  - Revision (text, min 1 char): e.g., "Rev 12", "Original Issue"
  - Chapter/Section (text, optional — required for SRM and MM, optional for EOs): e.g., "Ch. 53, Sec. 53-30"
- Error messages are field-specific; Next button disabled until all required sub-fields valid

**Step 3 — Description of Work**
- Label: "Description of Work (Form 337 Block 8 equivalent)"
- Input: textarea
- Min characters: 50 (enforced client-side on Next and server-side in mutation)
- Character counter: always visible, e.g. "47 / 50 minimum"
- Error message (< 50 chars): "Description must be at least 50 characters. Avoid 'see attached' — describe the work performed."
- Placeholder: "Describe the specific repair performed, including method, area of repair, and any deviations from standard practice."

**Step 4 — Method of Compliance**
- Label: "Method of Compliance (Form 337 Block 9 equivalent)"
- Input: textarea
- Min characters: 30
- Character counter visible
- Error message: "Method of compliance must be at least 30 characters."

**Step 5 — Supporting Documents / Attachments**
- Label: "Supporting Documents (sketches, diagrams, photos)"
- Upload: drag-and-drop or click to upload
- Accepted types: PDF, JPG, PNG, TIFF, DWG
- Required: minimum 1 file
- Max file size: 25 MB per file; max 10 files
- Error message (0 files): "At least one supporting document is required (sketch, diagram, or repair scheme). This is a regulatory requirement for major repairs."
- Upload preview: thumbnail with filename and size; individual remove button

**Review and Confirm screen (before final submit):**
- Shows all entered data in read-only form
- SHA-256 hash preview (computed from `{ referenceNumber, approvedDataReference, descriptionOfWork, methodOfCompliance }` prior to submission — shown as "Record integrity: [hash preview]")
- "Attach Form 337" button — submits via `attachForm337` mutation
- "Edit" links on each section for final corrections

### 2.3 When Required vs. Visible

| Condition | Field Visible? | Field Required? | Submit Gated? |
|---|---|---|---|
| `requiresClassificationReview = false` | No | No | No |
| `requiresClassificationReview = true`, classification not set | No (classification prompt shown instead) | N/A | Sign-off gated on classification |
| `repairClassification = "minor"` | No | No | Minor attestation required; 337 not required |
| `repairClassification = "major"`, `form337 = undefined` | Yes | **Yes — hard gate** | Sign-off blocked; RTS blocked |
| `repairClassification = "major"`, `form337` exists | Read-only display | N/A | No longer blocking |

**The submit/sign button does not merely turn red or show a warning when 337 is missing. It does not exist.** The sign-off flow entry point (Phase 1 sign-off button) is replaced with:

```
┌─────────────────────────────────────────────────────────────┐
│  ⛔ FORM 337 REQUIRED                                        │
│  This task was classified as a major repair on [date].      │
│  A Form 337 reference must be on file before signing.       │
│                                                              │
│  [Complete Form 337 →]                                      │
└─────────────────────────────────────────────────────────────┘
```

The "Complete Form 337" button is the only CTA available. There is no way to access the sign-off flow without either attaching a Form 337 or changing the classification (which requires a recorded justification).

---

## 3. RTS Block Confirmation UX

### 3.1 Design Principle

> "You can't hide the requirement until the end." — Renata Vasquez

The RTS block for a missing Form 337 must not feel like a surprise. The UI accomplishes this by making the requirement continuously visible from the moment of major repair classification. By the time a mechanic reaches the RTS step, they will have seen the amber badge on the WO card for days. The RTS block message explicitly acknowledges this.

### 3.2 RTS Preflight Panel — 337 Section

When `initiateRTS` is attempted and the `FORM337_INCOMPLETE` error fires, the RTS Preflight Panel opens (or updates) with a 337-specific section:

**Header:**
```
⛔ RETURN TO SERVICE BLOCKED — FORM 337 INCOMPLETE
```

**Body:**
```
The following task card(s) are classified as major repairs and require a Form 337 reference
before Return to Service can be authorized:

  Task Card: [task card title]
  Classified as major repair: [classification date and time]
  That was [X days] ago.
  Form 337 status: NOT ON FILE

  ──────────────────────────────────────────────────────────────
  This requirement has been visible on the work order card since [classification date].
  It was visible to the signing mechanic(s) throughout the work period.
  It is not a new requirement — it is an outstanding one.

  To proceed with Return to Service:
  [Complete Form 337 for [task card title] →]
```

**Key design decisions:**

1. **"That was X days ago"** — explicitly surfacing how long the requirement has been visible. This is not accusatory; it is informational. It documents that the requirement was not hidden.

2. **"This requirement has been visible on the work order card since [date]"** — the RTS block message directly states that the 337 badge has been on the card since classification. An IA signing off has seen that badge.

3. **No workaround** — there is no "override" button, no "acknowledge and proceed anyway," no IA-override. The `initiateRTS` mutation returns `FORM337_INCOMPLETE` and the RTS does not proceed. Period.

4. **The CTA is resolution, not bypass** — the only available action is "Complete Form 337 for [task card title]." This takes the user directly to the Form 337 entry modal for the specific card that is blocking.

### 3.3 Pre-RTS Warning (Before Attempt)

In the RTSPreflightPanel (which is accessible before attempting RTS initiation), the 337 status appears prominently:

**State: Major task card with pending 337:**
```
FORM 337 STATUS                                    [BLOCKS RTS]
  Task: [task card title]
  Classified major repair: [date]  ([X days] in progress)
  337 Reference: NOT ON FILE

  [Resolve now →]  ← navigates to Form 337 entry
```

This panel is accessible at any time from the WO detail view. Mechanics and IAs who review it before attempting RTS will see the block before trying to initiate.

---

## 4. Renata Vasquez UAT Script

> "The architecture is right. The interface has to catch up."

**UAT Scenario: Major Repair → Days of Work → RTS → Verify 337 was always visible**

**Setup:**  
Renata is given access to a test Athelon environment with a single work order: WO-UAT-337-01, aircraft N-TESTUA, task card TC-SHEET-1 (Skin Repair, Rib Station 6), flagged `requiresClassificationReview = true`.

---

**Step 1 — Classify as Major Repair (Day 1)**

Action: Renata opens TC-SHEET-1. She sees the amber banner: "This task may require a Form 337. Classify the repair before signing off." She clicks "Classify Now."

Expected UI: ClassificationModal opens.

Action: She selects "Major Repair."

Expected UI: Modal transitions to major-repair path, Step 1 (Reference Number).

Action: She enters reference number "337-UAT-2026-001" and clicks Next.

Expected: Step 2 (Approved Data Reference) opens.

Action: She fills out:
- Document Type: "Structural Repair Manual"
- Document Number: "172S-SRM-01"
- Revision: "Rev 12"
- Chapter/Section: "Ch. 53, Sec. 53-20"

Clicks Next.

Expected: Step 3 (Description of Work) opens with character counter at 0/50.

Action: She enters: "Replaced cracked skin panel at rib station 6, left wing. Trimmed, fit, and riveted replacement skin per SRM procedure 53-30-10. Corrosion treated underlying rib structure." (152 chars)

Clicks Next.

Expected: Step 4 (Method of Compliance) opens.

Action: She enters: "Per Cessna 172S Structural Repair Manual Section 53-30-10, with standard aircraft riveting practices per AC 43.13-1B."

Clicks Next.

Expected: Step 5 (Attachments) opens.

Action: She uploads a JPG file "repair-sketch-UAT.jpg" (simulated sketch).

Clicks Next.

Expected: Review screen shows all entered data. "Attach Form 337" button visible.

Action: She clicks "Attach Form 337."

Expected:
- Mutation `attachForm337` fires.
- Modal closes.
- TC-SHEET-1 banner changes from amber to blue: "Form 337 on file — 337-UAT-2026-001"
- WO card badge changes from "337 Ref: PENDING" to "337 Ref: 337-UAT-2026-001" in blue.
- IA dashboard 337 column for this WO changes from "BLOCKS RTS" (red) to "337 On File" (blue).

**Verification checkpoint 1:** Renata notes the date and time. Badge is blue and visible on WO card. Day 1 work is done.

---

**Step 2 — Return to Work (Simulated Day 3)**

Action: Renata logs in again (test environment fast-forwards session). She navigates to WO-UAT-337-01 on the WO list.

Expected: WO card shows "337 Ref: 337-UAT-2026-001" in blue. Badge has been there since Day 1. No amber. No warning that something is missing.

Action: She clicks on TC-SHEET-1.

Expected: Task card view shows Form 337 section with all fields pre-populated (read-only), ref number visible. No sign-off blockers related to 337.

**Verification checkpoint 2:** 337 badge visible without hunting. Not hidden three clicks deep. Renata records that the requirement was visible on Day 3 without any action on her part.

---

**Step 3 — Simulated Work Day 5 — Attempt Sign-Off**

Action: Renata (as the IA for this UAT) navigates to the sign-off flow for TC-SHEET-1.

**For this test step only:** Reset the test scenario so that `form337 = undefined` on TC-SHEET-1 but `repairClassification = "major"` (simulating the case where 337 was not attached). Renata observes the blocked state.

Expected:
- Sign-off flow entry shows: "⛔ FORM 337 REQUIRED — This task was classified as a major repair on [Day 1 date]. A Form 337 reference must be on file before signing. [Complete Form 337 →]"
- No sign-off button visible.
- No "proceed anyway" option.

Action: Renata attempts to call `signTaskCard` via the API directly (simulating a bypass attempt).

Expected: Mutation returns `FORM337_INCOMPLETE`. `signatureAuthEvent` is NOT consumed. No signature record created. Audit log records attempted action.

**Verification checkpoint 3:** Renata confirms the block is at the server level, not only the UI level. The bypass test fails exactly as expected.

---

**Step 4 — Attempt RTS (with 337 in place)**

Action: Reset test environment. TC-SHEET-1 has `form337` fully populated (from Step 1). All other task cards on WO-UAT-337-01 complete and signed.

Action: IA (Renata) navigates to RTS initiation.

Expected:
- RTSPreflightPanel shows Form 337 section: "337 Reference: 337-UAT-2026-001 ✓ On File"
- No BLOCKS RTS indicators.
- "Initiate Return to Service" CTA is available (not disabled).

Action: Renata initiates RTS. IA signs.

Expected: RTS proceeds normally. WO moves to RETURNED_TO_SERVICE state.

**Verification checkpoint 4:** RTS completed. The 337 requirement was visible throughout the work period (Day 1 badge, Day 3 badge, no surprise at RTS).

---

**Step 5 — Verify It Was Never a Surprise**

Renata reviews the audit trail for WO-UAT-337-01:

- Event: `CLASSIFICATION_SET` — timestamp Day 1, `classification = "major"`, `setBy = [Renata's user ID]`
- Event: `FORM337_ATTACHED` — timestamp Day 1, `referenceNumber = "337-UAT-2026-001"`
- No event: `FORM337_INCOMPLETE_BLOCKED` (because 337 was attached on Day 1)

Expected: Audit trail is complete. The classification decision is timestamped. The 337 attachment is timestamped. An FSDO auditor reviewing this trail can see the requirement was met on the same day as classification.

**Renata's UAT verdict criteria:**
- [ ] Badge visible on WO card immediately after classification (not after page refresh)
- [ ] Badge visible on Day 3 log-in without any user action
- [ ] Badge visible to IA in IA dashboard 337 column
- [ ] Sign-off blocked at both UI and mutation level when 337 absent
- [ ] RTS blocked at mutation level when 337 absent (bypassing UI tested)
- [ ] RTS block message explicitly references the classification date (not a generic error)
- [ ] 337 in place → RTS proceeds normally
- [ ] Audit trail records classification and attachment with timestamps
- [ ] No point in the workflow where the requirement is hidden or unannounced

---

## 5. Cilla's Test Plan

> "Backend enforcement is only as good as what I can do to the UI without triggering it. Let's find out."

### TC-337-01 — Major Classification → Immediate Badge

**Input:** Task card with `requiresClassificationReview = true`, `repairClassification = undefined`. Operator sets `repairClassification = "major"` via `setRepairClassification` mutation (simulating UI action).  
**Expected:**
1. `repairClassification` is "major" in DB.
2. `repairClassificationSetBy` and `repairClassificationSetAt` are populated.
3. `auditLog` event `CLASSIFICATION_SET` with `classification = "major"` exists.
4. WO card badge updates to "337 Ref: PENDING" (amber) within 1 second (Convex reactivity).
5. IA dashboard 337 column updates to "BLOCKS RTS" (red) within 1 second.
6. Sign-off flow for this task card shows "⛔ FORM 337 REQUIRED" instead of sign-off button.

**Automatable:** Yes. Convex test + Playwright assertion on badge text and color class.  
**Fail condition:** If badge does not appear within 3 seconds, or if sign-off button renders when `form337 = undefined`, test fails as HIGH SEVERITY.

---

### TC-337-02 — API Bypass Attempt (Server-Side Enforcement)

**Input:** Task card with `repairClassification = "major"`, `form337 = undefined`. Valid `signatureAuthEvent` generated and consumed client-side (simulating authenticated mechanic). Direct API call to `signTaskCard` mutation.  
**Expected:**
1. Mutation throws `FORM337_INCOMPLETE`.
2. `signatureAuthEvent.consumed` remains `false` (event NOT consumed by the blocked call).
3. No `signatureEvent` record created in `signatureEvents` table.
4. Audit log records `SIGN_ATTEMPT_BLOCKED` with `reason = "FORM337_INCOMPLETE"`, `actorId`, timestamp.
5. HTTP response status: 400 with error code `FORM337_INCOMPLETE`.

**Automatable:** Yes. Convex test with direct mutation call. Assert on DB state (no signature record, auth event unconsumed).  
**Fail condition:** If the mutation succeeds (signature is written), this is a CRITICAL REGRESSION. Test fails with severity CRITICAL.  
**Regulatory basis:** Part 43 Appendix B; AC 120-78B (auth event must not be consumed by a failed operation).

---

### TC-337-03 — Description Minimum Length Enforcement

**Input A:** `ClassificationModal` major path, Step 3. User types 49 characters in `descriptionOfWork`. Clicks Next.  
**Input B:** Direct API call to `attachForm337` with `descriptionOfWork` = "Short desc" (10 chars).  
**Expected (A):**
1. Character counter shows "49 / 50 minimum" in red.
2. Next button is disabled (not just visually grey — `disabled` attribute is set).
3. No mutation called.
4. Error text: "Description must be at least 50 characters."

**Expected (B):**
1. `attachForm337` mutation throws `VALIDATION_ERROR` with `field = "descriptionOfWork"` and `min = 50`.
2. No `form337` object written to task card.
3. No `FORM337_ATTACHED` audit event.

**Automatable:** Yes. UI: Playwright assert on button `disabled` attribute and error text. API: Convex test assert on mutation exception.  
**Regulatory basis:** AC 43-9C §6 (description must be substantive).

---

### TC-337-04 — Zero Attachments Block

**Input A:** ClassificationModal major path, all text fields valid (ref number, approved data, description, compliance). Step 5 has zero files uploaded. User clicks "Attach Form 337."  
**Input B:** Direct API call to `attachForm337` with `attachmentStorageIds = []`.  
**Expected (A):**
1. "Attach Form 337" button is disabled while `attachmentStorageIds.length === 0`.
2. Error shown: "At least one supporting document is required."
3. No mutation called.

**Expected (B):**
1. Mutation throws `VALIDATION_ERROR` with `field = "attachmentStorageIds"` and `min = 1`.
2. No form337 object written.

**Automatable:** Yes.  
**Fail condition:** If any path succeeds with zero attachments, test fails as HIGH SEVERITY.  
**Regulatory basis:** Part 43 Appendix B (major repair data requires supporting documentation).

---

### TC-337-05 — RTS Initiation Block With Explicit "Since [Date]" Message

**Input:** Work order with one task card: `repairClassification = "major"`, `form337 = undefined`. Task card was classified as major 5 days ago (set `repairClassificationSetAt = Date.now() - 5 * 24 * 60 * 60 * 1000`). All other WO conditions for RTS are met.  
**Action:** Call `initiateRTS` mutation for this work order.  
**Expected:**
1. Mutation throws `FORM337_INCOMPLETE` with payload: `{ unclassifiedCards: [], missing337Cards: [taskCardId], classificationDate: [5 days ago timestamp] }`.
2. Frontend RTSPreflightPanel (rendered in test via component test) shows:
   - Header: "⛔ RETURN TO SERVICE BLOCKED — FORM 337 INCOMPLETE"
   - Body contains: "Classified as major repair: [5-days-ago date]"
   - Body contains: "That was 5 days ago."
   - Body contains: "This requirement has been visible on the work order card since [5-days-ago date]."
3. No RTS event recorded in audit log.
4. Work order state remains unchanged.

**Automatable:** Yes. Convex test for mutation; Vitest component test for RTSPreflightPanel rendering with the error payload.  
**Key assertion:** The component renders the `classificationDate` from the error payload as a human-readable date in the block message. If the date is absent or shows "unknown", test fails.  
**Regulatory basis:** §43.11(a); Renata's anti-surprise design requirement.

---

## 6. Marcus Webb Compliance Checklist

### Applicable Regulations

- **14 CFR Part 43 Appendix B** — Defines major repairs and major alterations; any work meeting the listed criteria is a major repair regardless of how the mechanic classifies it
- **14 CFR §43.9(a)** — Maintenance record entry requirements for any maintenance performed
- **14 CFR §43.11(a)** — Return to service entry; for major repairs, must be performed by or supervised by an IA
- **14 CFR §145.217** — Part 145 records retention: maintenance records must be retained minimum 2 years
- **AC 43-9C Section 6** — Minimum content requirements for maintenance record entries
- **AC 120-78B** — Electronic signatures and records: classification decision is a regulatory attestation and must be treated with the same integrity as a signature event

### Pre-Release Compliance Sign-Off Items

**HARD BLOCKERS — Any one of these = NO-GO for release:**

| Item | Requirement | Regulatory Basis | Status |
|---|---|---|---|
| MWC-D-01 | The `repairClassificationSetAt` timestamp must precede all sign-off phase timestamps for the same task card. This is verified at the mutation level: `signTaskCard` checks that `repairClassificationSetAt < signedAt` before proceeding. A classification set after signing is invalid and must throw. | §43.9(a); AC 120-78B §5 | Must pass TC-337-01 |
| MWC-D-02 | `signTaskCard` mutation must NOT consume a `signatureAuthEvent` when the `FORM337_INCOMPLETE` gate fires. A consumed auth event with a failed signature creates an irreconcilable audit gap. TC-337-02 must pass at mutation level with the auth event unconsumed. | AC 120-78B §4 (authentication integrity) | Must pass TC-337-02 |
| MWC-D-03 | For `repairClassification = "major"`: the signing user must hold current IA authorization (verified by `signatureAuthEvent` type "ia_auth" in the existing auth mechanism). This check occurs server-side in `signTaskCard`, not only in the UI. A standard A&P cannot sign off a major repair task card without IA authority. | §43.11(a) | Must pass as variant of TC-337-02 |
| MWC-D-04 | Form 337 reference number and FSDO submission date must be included in the maintenance record export (PDF Section 7 and in `getMaintenanceRecordFullExportPayload`). If the export omits Form 337 data for a major repair task card, the export is non-compliant. | §43.9(a); AC 43-9C §6 | Verify in WS16-C export integration test |
| MWC-D-05 | The `form337` object (including all fields) must be included in the SHA-256 hash input for the signed task card record. The hash must be computed over the complete record including Form 337 data — not post-hoc appended after hashing. Verify by testing that changing any Form 337 field after a dry-run hash produces a different hash. | AC 120-78B §5 (record integrity) | Integration test required |

**Standard Verification Items:**

| Item | Requirement | Regulatory Basis |
|---|---|---|
| MWC-D-06 | Part 43 Appendix B trigger-flag mapping: the `requiresClassificationReview` flag must cover all listed major repair categories. Marcus reviews and signs the trigger-flag logic before implementation. Categories: structural (fuselage, wings, control surfaces, empennage), powerplant, propeller, radio apparatus, electrical wiring, hydraulic/mechanical components per Appendix B, rotor (helicopter), and flight control. A missed category means an undetected major repair. | Part 43 Appendix B |
| MWC-D-07 | Minor classification attestation: the `classificationAttestations` record must store the attesting user's A&P certificate number (resolvable from the `users` table via `attestedBy`). Without the cert number, the attestation cannot be verified by an inspector. | §43.9(a)(4) |
| MWC-D-08 | FSDO submission 48-hour window: system must emit an advisory alert (not a hard block) if 48 hours pass after RTS timestamp without `fsdoSubmissionDate` being recorded on a major repair task card. Alert routes to IA + DOM. Advisory text: "Form 337 for [task card title] on [WO number] has not been recorded as submitted to FSDO. FAA requires submission within 48 hours of return to service (14 CFR §43.9)." | 14 CFR §43.9 (FSDO submission requirement) |
| MWC-D-09 | Records retention: Form 337 data stored in Athelon must be retained for minimum 2 years. Verify that org-level archival or deletion policies explicitly exclude `form337` fields and `classificationAttestations` records from any purge operation. | §145.217 |
| MWC-D-10 | The classification decision itself (major or minor) is a regulatory determination. The `classificationAttestation` event carries the same audit attributes as a signature event: timestamp (atomic, not session-start), user identity, certificate number, cryptographic reference. Verify that the attestation is included in the standard audit export package. | AC 120-78B §5 |
| MWC-D-11 | The "not_applicable" classification path must be restricted: `not_applicable` may only be set on task card types that do not intersect Part 43 Appendix B criteria. The system must prevent `not_applicable` from being applied to task types that Marcus has flagged as requiring mandatory classification (e.g., any structural repair, any flight control repair). | Part 43 Appendix B |

**Who Can Authorize Major Repairs — Regulatory Summary:**

Per 14 CFR §43.11(a)(2): A major repair or major alteration must be returned to service by a certificated mechanic (A&P) with an Inspection Authorization. An A&P without IA cannot return a major-repair aircraft to service. The certificate holder's IA number must appear on the maintenance record.

The system enforces this: `repairClassification = "major"` → `signTaskCard` requires IA-class `signatureAuthEvent`. No bypass.

Additionally: Under Part 145, the RSMO (Repair Station Manual Operations Specifications) may designate authorized personnel for major repair return to service. Athelon's IA-authorization check must be aligned with the org's RSMO designation — not assumed to be all IA holders equally.

---

## Implementation Sequencing

| Sprint Day | Task | Owner |
|---|---|---|
| 1 | Schema: `repairClassification`, `form337`, `classificationAttestations` table migration | Devraj |
| 1-2 | `setRepairClassification` mutation with audit event; `attachForm337` mutation with all validation | Devraj |
| 2 | `getForm337StatusForWorkOrder` query | Devraj |
| 2-3 | `Form337Banner` component (state machine: amber → blue progression) | Chloe |
| 3-4 | `ClassificationModal` — minor path (attestation) + major path (5-step form) with draft persistence | Chloe + Finn |
| 4 | `IADashboard` 337 status column | Chloe |
| 4-5 | `RTSPreflightPanel` 337 section with classification-date-aware block message | Chloe |
| 5 | `initiateRTS` mutation amendment: pre-flight check with `classificationDate` in error payload | Devraj |
| 6 | WO card badge integration in all card views (WO list, coordinator board) | Chloe |
| 7 | TC-337-01 through TC-337-05 full run | Cilla |
| 8 | Renata Vasquez UAT (remote session, recorded) | Renata + Chloe |
| 8 | Marcus compliance sign-off (MWC-D-01..MWC-D-11 review) | Marcus |

---
*Filed: 2026-02-22 | Phase 16 Build Execution | WS16-D*
