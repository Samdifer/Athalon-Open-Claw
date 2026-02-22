# WS15-C — Form 337 / Major Repair UI Closure

**Phase:** 15  
**Workstream:** WS15-C  
**Owner:** Chloe Park (Frontend) + Finn Calloway (UX/UI)  
**SME:** Renata Vasquez, Sheet Metal/Structural, Corpus Christi TX  
**Status at Open:** Backend enforcement exists (blocks at RTS); UI does not surface the requirement until failure  
**Artifact Version:** 1.0 — 2026-02-22  

---

## SME Brief — Renata Vasquez

### Background
Renata Vasquez has submitted between 310 and 340 Form 337s over a 21-year career in sheet metal and structural repair. She currently works out of a Part 145 repair station in Corpus Christi doing everything from skin repairs to STC-based structural modifications. She was hired as a field SME specifically because she has lived the form-337 workflow under multiple shop management systems, including eight months at a facility that had no formalized major/minor classification concept — she kept a parallel paper log during that period to protect herself.

### Direct Quotes from SME Input Sessions

> "The architecture is right. The interface has to catch up."

Renata's first reaction after seeing the backend enforcement demo was approval followed by immediate skepticism:

> "Who enforces it? The database? The UI? Because if the UI lets you submit without it, the schema requirement means nothing. Your mechanics aren't going to read error messages at RTS. They're going to click past it, call the shop lead, and say the system is broken."

On the timing of the enforcement signal:

> "You can't hide the requirement until the end. I've submitted 310-plus of these forms. Most of the prep work — the data entry, the sketches, the approved-data references — that's done while the work is in progress, not at close-out. If your system waits until RTS to tell me I forgot the 337, I'm going back into a closed-out work package. That is a paperwork disaster."

On the major/minor classification decision itself:

> "The hardest part isn't filling out the form. The hardest part is the classification call. 'Is this major or minor?' Every A&P makes that call, but it's actually an IA decision and a regulatory determination. I've seen shops where the lead says 'just call it minor' because it's faster. If your UI doesn't make that decision feel consequential — if it looks the same as any other checkbox — you're making it easier to get wrong."

On failure modes she has seen:

> "I spent eight months at a shop that had no concept of major versus minor in their WO system. Everything was just 'repair.' I kept my own log because I knew eventually someone was going to get called for a 337 and not have the paperwork. That shop got a Letter of Investigation. Nobody lost their certificate, but it was close. The fix was simple: the system should never let you close out a work order touching structural data without answering that question explicitly."

On the minimum bar for this feature:

> "Minimum bar: when a task card is categorized as a repair touching Part 43 Appendix B criteria, the UI must ask the classification question before the mechanic gets to sign-off. Not at RTS. Before sign-off. And if the answer is 'major,' the 337 field should be required in the same step, not a separate workflow. One path. No way around it."

On what "required" means:

> "Required doesn't mean the field turns red and they can still click submit. Required means the submit button doesn't exist until the field has content. There's a difference."

### Failure Modes Surfaced by Renata

1. **Late enforcement:** User discovers missing 337 at RTS, after all signatures are complete. Mental model is "I'm done." Backtracking feels punitive and generates resentment toward the system.
2. **Classification ambiguity:** UI presents major/minor as a dropdown with no contextual guidance. Mechanics pick "minor" to avoid triggering form requirements. No shop lead review enforced.
3. **Invisible 337 status during in-progress work:** Mechanic can't see whether a 337 is attached mid-work-package. There's no "pending 337" state visible at the task card level.
4. **Free-text 337 reference field:** Field accepts anything, including "see attached," "N/A," and blank. This is functionally no enforcement.
5. **IA sign-off without awareness:** The IA doing the final Return to Service sign-off can't see at a glance whether a 337 is on file — they have to navigate into the record to check.

### Minimum Bar (Renata's Definition)
- Classification question presented before sign-off, not at RTS
- If "major" is selected, structured 337 data entry is required in the same workflow step — not optional, not a separate tab
- Submit/sign controls are gated (not merely visually warned) on 337 completeness
- IA view shows 337 status as a first-class signal (green/amber/red badge, not a footnote)
- Major/minor classification decision is auditable: who made it, when, and under what approved data reference

---

## R&D Scope

### Open Design Questions

1. **Classification gate placement:** Should the major/minor prompt occur at task card creation, at task card completion, or at sign-off initiation? Renata's input is clear (before sign-off), but we need to design the exact insertion point in the three-phase sign-off flow.

2. **Classification decision authority:** The UI must surface the question, but who is authorized to make the classification call? Per Part 43 App B, it's a regulatory determination. Should the system require an IA or shop lead to confirm a "major" classification, or can any A&P on the task make that call?

3. **337 reference vs. 337 data entry:** Does the system store the 337 form data inline (attached document, structured fields), or a reference number pointing to a separately filed FAA form? Both are in use in the field. We need to decide whether Athelon captures the full 337 content or just a validated reference.

4. **"No 337 required" attestation:** If the work is classified as minor, who attests? Is an explicit attestation event required, or is selecting "minor" sufficient? Marcus should weigh in on whether a minor classification needs a recorded rationale.

5. **Approved data for major classification:** Renata raised this in passing — the major/minor classification itself should be tied to an approved data reference (the data that supports the classification decision). Is this captured separately from the repair data reference, or combined?

6. **Part 43 Appendix B screening logic:** Can the system auto-flag a task card as "potentially major" based on task type, aircraft type, repair location, or other metadata — reducing cognitive load on the mechanic?

### Regulatory Touch Points
- **Part 43 Appendix B** — defines major repairs and alterations; any structural, flight control, fuel system, propeller, rotor, or landing gear repair meeting the listed criteria is major
- **14 CFR §43.9(a)** — maintenance record entry requirements
- **14 CFR §43.11(a)** — return to service entry; IA required for major repair RTS
- **FAA Form 337** — must be submitted to FSDO within 48 hours of return to service for major repairs (one copy to aircraft owner, one to FSDO, one retained by repair station for 2 years)
- **14 CFR §145.217** — Part 145 records retention (2 years minimum)
- **AC 43-9C Section 6** — maintenance record content requirements

### Technical Research Items
- Confirm the existing RTS block mechanism: which Convex mutation enforces it, what error is returned, how the frontend currently handles it
- Audit the current `approvedDataReference` field schema — confirm it's freeform string vs. structured object
- Determine if task card schema has a `repairClassification` field or equivalent today
- Survey Form 337 digital submission status: FAA accepts PDF but not yet structured data submission; impact on what we store

---

## Implementation Spec

### Data Model Changes

#### `taskCards` table — additions

```typescript
repairClassification: v.optional(
  v.union(v.literal("minor"), v.literal("major"), v.literal("not_applicable"))
),
// ^ Required when task type intersects Part 43 Appendix B criteria
// Enforcement: cannot be null/undefined at sign-off initiation if task is flagged

repairClassificationSetBy: v.optional(v.id("users")),
repairClassificationSetAt: v.optional(v.number()), // epoch ms

form337: v.optional(v.object({
  referenceNumber: v.string(),            // FAA Form 337 number or shop-assigned tracking number
  fsdoSubmissionDate: v.optional(v.number()), // epoch ms; required within 48hr of RTS
  fsdoSubmissionMethod: v.optional(
    v.union(v.literal("email"), v.literal("mail"), v.literal("in_person"))
  ),
  approvedDataReference: v.object({
    documentType: v.string(),             // e.g., "SRM", "STC", "Engineering Order"
    documentNumber: v.string(),
    revisionNumber: v.string(),
    chapterSectionSubject: v.optional(v.string()),
    applicabilityNotes: v.optional(v.string()),
  }),
  descriptionOfWork: v.string(),          // Plain-text; mirrors Form 337 Block 8
  methodOfCompliance: v.string(),         // Form 337 Block 9 analog
  attachmentStorageIds: v.array(v.id("_storage")), // Diagrams, sketches, supporting docs
  preparedBy: v.id("users"),
  preparedAt: v.number(),                 // epoch ms
  iaReviewRequired: v.boolean(),          // true when classification === "major"
})),

// Screening flag — set by system based on task type metadata
requiresClassificationReview: v.optional(v.boolean()),
```

#### `taskCards` table — enforcement rules (in existing validators)

The following conditions must be true for `signTaskCard` mutation to proceed:

1. If `requiresClassificationReview === true`: `repairClassification` must be set (not `undefined`)
2. If `repairClassification === "major"`: `form337` object must be present and fully populated (all required fields non-empty)
3. If `repairClassification === "major"`: signer must hold IA authorization (enforced via existing `signatureAuthEvent` mechanism)
4. If `repairClassification === "minor"`: a `classificationAttestation` record is written (see below)

#### New: `classificationAttestations` table

```typescript
defineTable({
  taskCardId: v.id("taskCards"),
  classification: v.literal("minor"), // "major" is handled by form337 presence
  attestedBy: v.id("users"),
  attestedAt: v.number(),
  rationale: v.optional(v.string()),  // Optional: mechanic's note on why minor
  workOrderId: v.id("workOrders"),
})
.index("by_taskCard", ["taskCardId"])
.index("by_workOrder", ["workOrderId"])
```

### Mutations

#### `mutations/taskCards.ts` — `setRepairClassification`

```typescript
// Arguments:
{
  taskCardId: Id<"taskCards">,
  classification: "minor" | "major" | "not_applicable",
  rationale?: string,        // Optional for minor; system may prompt
}

// Side effects:
// - Sets repairClassification, repairClassificationSetBy, repairClassificationSetAt
// - If "minor": writes classificationAttestation record
// - If "major": sets requiresForm337 flag on taskCard
// - Emits audit event: CLASSIFICATION_SET
```

#### `mutations/taskCards.ts` — `attachForm337`

```typescript
// Arguments:
{
  taskCardId: Id<"taskCards">,
  form337Data: {
    referenceNumber: string,
    approvedDataReference: { documentType, documentNumber, revisionNumber, ... },
    descriptionOfWork: string,
    methodOfCompliance: string,
    attachmentStorageIds: Id<"_storage">[],
    fsdoSubmissionDate?: number,
    fsdoSubmissionMethod?: string,
  }
}

// Validation:
// - All required fields must be present and non-empty strings
// - attachmentStorageIds must contain ≥1 entry (structural repair requires sketch or diagram)
// - Sets form337 on taskCard
// - Emits audit event: FORM337_ATTACHED
```

#### `mutations/workOrders.ts` — `initiateRTS` (existing, amendment)

Add pre-flight check:
```typescript
// Before any RTS logic executes:
const flaggedCards = await ctx.db
  .query("taskCards")
  .withIndex("by_workOrder", q => q.eq("workOrderId", args.workOrderId))
  .filter(q => q.eq(q.field("requiresClassificationReview"), true))
  .collect();

const unclassified = flaggedCards.filter(c => !c.repairClassification);
const majorMissing337 = flaggedCards.filter(
  c => c.repairClassification === "major" && !c.form337
);

if (unclassified.length > 0 || majorMissing337.length > 0) {
  throw new ConvexError({
    code: "FORM337_INCOMPLETE",
    unclassifiedCards: unclassified.map(c => c._id),
    missing337Cards: majorMissing337.map(c => c._id),
    message: "Cannot initiate RTS: classification or Form 337 incomplete on one or more task cards",
  });
}
```

### Queries

#### `queries/taskCards.ts` — `getForm337StatusForWorkOrder`

```typescript
// Returns per-task-card 337 status summary for IA dashboard
// Result shape:
{
  taskCardId: Id<"taskCards">,
  title: string,
  requiresClassificationReview: boolean,
  repairClassification: "minor" | "major" | "not_applicable" | undefined,
  form337Present: boolean,
  form337ReferenceNumber?: string,
  fsdoSubmitted: boolean,
  blockingRTS: boolean,  // true if this card will block RTS
}[]
```

### UI Components

#### `Form337Banner` — persistent contextual banner on task card view

- Appears when `requiresClassificationReview === true` and `repairClassification` is unset
- Color: amber background, not red (not yet a failure — a requirement)
- Copy: **"This task may require a Form 337. Classify the repair before signing off."**
- CTA: "Classify Now" → opens `ClassificationModal`
- Once classified as minor: banner changes to muted green, "Classified: Minor Repair — [timestamp] [name]"
- Once classified as major + 337 attached: banner changes to blue, "Form 337 on file — [reference number]"

#### `ClassificationModal` — inline classification + 337 entry

Two paths after classification:
- **Minor path:** confirmation screen, optional rationale field, "Confirm Minor Classification" button — writes attestation
- **Major path:** multi-step form:
  1. Approved Data Reference (structured fields: doc type, number, revision — all required)
  2. Description of Work (textarea, min 50 chars enforced — prevents "see attached")
  3. Method of Compliance (textarea)
  4. Attachments (drag-drop, min 1 file required for structural tasks)
  5. Review & Confirm — shows SHA-256 preview, "Attach Form 337" button
  - Form data is saved incrementally (draft state) — user can exit and resume
  - Draft state stored server-side on `taskCard.form337Draft` (optional partial object)

#### `IADashboard` — 337 status column

- New column in the IA's work-order task list: **"337 Status"**
- States: `Not Required` (grey) | `Pending Classification` (amber) | `Minor — Attested` (green) | `337 On File` (blue) | `FSDO Submitted` (teal) | `BLOCKS RTS` (red)
- Red badge is the primary action signal for IA review before sign-off

#### `RTSPreflightPanel` — pre-RTS summary (existing, amended)

Add Form 337 section:
- List all task cards requiring classification
- Show per-card status (classified / unclassified / major+337 / major+missing)
- If any BLOCKS RTS items exist: primary CTA changes from "Initiate Return to Service" to "Resolve Open Items" (disabled)
- No way to initiate RTS while `blockingRTS === true` on any card

### Validation Rules

| Field | Rule | Enforcement Point |
|---|---|---|
| `repairClassification` | Required if `requiresClassificationReview=true` | Sign-off initiation (mutation + UI gate) |
| `form337.referenceNumber` | Non-empty, alphanumeric | `attachForm337` mutation |
| `form337.approvedDataReference.documentType` | Non-empty enum or free string (enforced to ≥2 chars) | Mutation + modal step 1 |
| `form337.approvedDataReference.documentNumber` | Non-empty | Mutation + modal step 1 |
| `form337.approvedDataReference.revisionNumber` | Non-empty | Mutation + modal step 1 |
| `form337.descriptionOfWork` | Min 50 characters | Mutation + modal step 2 |
| `form337.methodOfCompliance` | Min 30 characters | Mutation + modal step 2 |
| `form337.attachmentStorageIds` | Min 1 file | Mutation + modal step 3 |
| Classification signer for "major" | Must hold IA cert | `signTaskCard` mutation (existing auth check) |
| `fsdoSubmissionDate` | Must be within 48hr of RTS timestamp | Advisory warning at FSDO-submission step (not a hard block — submission may be in process) |

---

## Test Plan — Cilla Oduya

> "Backend enforcement is only as good as what I can do to the UI without triggering it. Let's find out."

| Test ID | Scenario | Input | Expected | Regulatory Basis |
|---|---|---|---|---|
| TC-C-01 | Sign-off on a major-repair task card with no 337 attached | Navigate directly to sign-off flow on a task card where `requiresClassificationReview=true`, `repairClassification="major"`, `form337=undefined`; attempt to initiate Phase 1 of sign-off | Sign-off flow blocked before Phase 1 even renders; user sees "Form 337 required to proceed" modal; RTS mutation never called | Part 43 App B; §43.11(a) |
| TC-C-02 | Bypass via direct API call to `signTaskCard` with missing 337 | Authenticated API call to `signTaskCard` with a valid `signatureAuthEvent`, valid PIN, for a task card where `repairClassification="major"` and `form337=undefined` | Mutation throws `FORM337_INCOMPLETE` error; `signatureAuthEvent` is NOT consumed; no signature record written; event audit log records the attempted bypass | Part 43 App B; AC 120-78B |
| TC-C-03 | Minor classification attestation — no 337 required | Set `repairClassification="minor"` on a flagged task card, confirm classification; then proceed to sign-off | Sign-off proceeds normally; `classificationAttestation` record written with attestedBy, attestedAt, classification="minor"; banner updates to minor state; no Form 337 required | §43.9(a) |
| TC-C-04 | Major 337 form — partial data submission | Open `ClassificationModal`, select Major, fill approved data reference but leave `descriptionOfWork` field at 49 characters | "Attach Form 337" button remains disabled; field-level error displayed ("Minimum 50 characters required for description of work"); mutation not called | AC 43-9C §6 |
| TC-C-05 | Major 337 form — zero attachments | Complete all text fields for major path, submit with no attachments | Mutation throws validation error; UI shows "At least one supporting document required"; sign-off remains blocked | Part 43 App B |
| TC-C-06 | IA dashboard 337 visibility | Work order with 3 task cards: one minor-attested, one major with 337, one major with no classification | IA dashboard shows correct status badges: green (minor), blue (337 on file), red (BLOCKS RTS); "Initiate RTS" CTA is disabled | §43.11(a) |
| TC-C-07 | 337 draft persistence across sessions | Begin major classification data entry, close the browser mid-form; reopen task card in a new session | Draft 337 data is present (server-persisted); user can resume from where they left off; no data lost | AC 43-9C §6 |
| TC-C-08 | Classification after sign-off locked | Task card has been fully signed off (all signatures complete); attempt to change `repairClassification` from minor to major post-signature | Mutation rejects change; error: "Classification cannot be changed after sign-off"; signed record is immutable | §43.9(a); AC 120-78B |
| TC-C-09 | RTS initiation with mixed classification states across work order | Work order has 12 task cards; 11 compliant, 1 unclassified flagged card | `initiateRTS` returns `FORM337_INCOMPLETE` error listing the exact card ID; RTS does not proceed; error is surfaced in RTSPreflightPanel | §43.11(a) |
| TC-C-10 | Non-IA user attempts to sign a major-repair task card | A mechanic (A&P, no IA certification on file) attempts to complete sign-off on a task card classified as `major` | Sign-off blocked; error: "Return to Service on major repairs requires IA authorization"; mechanic's `signatureAuthEvent` is NOT consumed | §43.11(a); FAA Order 8300.10 |

---

## Compliance Sign-Off Checklist — Marcus Webb

> "The backend blocks are necessary but not sufficient. The audit trail must show that the classification decision happened before the signatures, not after. If the timestamps are wrong, we have a problem regardless of what the database says."

### Applicable Regulations and ACs

- **14 CFR Part 43 Appendix B** — Major Repairs and Alterations (classification authority)
- **14 CFR §43.9(a)** — Maintenance record entry requirements
- **14 CFR §43.11(a)** — Return to service entry; IA required for major repair RTS
- **14 CFR §145.217** — Part 145 records retention
- **AC 43-9C Section 6** — Maintenance record content
- **AC 120-78B** — Electronic signatures and records

### Marcus Webb Pre-Release Checklist

**HARD BLOCKERS — Any one of these = NO-GO:**

- [ ] **[HARD BLOCK]** `repairClassificationSetAt` timestamp must precede all sign-off phase timestamps. Verify in test environment that the timestamp ordering invariant holds and is enforced at the mutation level, not just UI.
- [ ] **[HARD BLOCK]** `signTaskCard` mutation must not consume a `signatureAuthEvent` when the Form 337 gate fires. A consumed auth event with a blocked signature creates an irreconcilable audit gap. Test TC-C-02 must pass at mutation level with auth event count unchanged.
- [ ] **[HARD BLOCK]** For `repairClassification = "major"`: the system must verify that the signing user holds current IA authorization before allowing RTS sign-off. This check must occur server-side in the mutation, not only in the UI.
- [ ] **[HARD BLOCK]** Form 337 reference number and FSDO submission date must be retrievable in the maintenance record export (PDF and structured data). The FAA can and does request this during ramp checks. "Attached separately" is not compliant.
- [ ] **[HARD BLOCK]** If Form 337 data is stored inline in Athelon, the complete 337 dataset must be included in the SHA-256 hash of the signed record. Verify that `form337` object is included in the hash input, not post-hoc appended.

**Standard Verification Items:**

- [ ] Part 43 Appendix B criteria mapping: confirm the `requiresClassificationReview` flag trigger logic covers all Appendix B major repair categories (structural, powerplant, propeller, radio, electrical, fuel system, landing gear, etc.). A missed category = undetected major repair.
- [ ] The "minor" attestation record must include the attesting user's certificate number (A&P or IA). Verify schema includes cert number or that it's resolvable from `attestedBy` user record.
- [ ] FSDO submission 48-hour window: the system should emit an advisory (not a block) if 48 hours passes after RTS without `fsdoSubmissionDate` being recorded. Advisory must appear in the IA dashboard and in daily notification summary.
- [ ] Records retention: Form 337 data must be retained for a minimum of 2 years per §145.217. Verify that deletion or archival policies do not affect 337 records.
- [ ] AC 120-78B compliance for the classification decision itself: the classification attestation event should carry the same attestation attributes (timestamp, user identity, cryptographic integrity) as a signature event. Classification is a regulatory determination, not a UI preference.
- [ ] Confirm that the `classificationAttestation` table entries are included in the standard audit export package (alongside signature events and maintenance record entries).
- [ ] Review the "not_applicable" classification path: what task types legitimately receive this designation, and is there a system-level control preventing it from being used to skip classification on Appendix B-relevant task types?

**FSDO Submission Tracking (Advisory):**
- [ ] Confirm that "FSDO Submitted" badge state requires `fsdoSubmissionDate` to be set — not just a self-report flag without a date.
- [ ] Recommend a 24-hour pre-deadline notification for pending FSDO submissions (FSDO-SUB-ALERT).

---

## Status

**READY FOR BUILD**

Conditions:
1. Marcus must review and sign off on the Part 43 Appendix B trigger-flag mapping before the `requiresClassificationReview` flag logic is implemented — that list drives everything.
2. The Form 337 inline vs. reference-number approach must be decided by Nadia (PM) and documented before `attachForm337` mutation is written. Recommend inline storage for audit-trail completeness.
3. TC-C-02 must be confirmed passing at mutation level (not just UI) before this workstream can be marked PASS.

---
*Filed: 2026-02-22 | Second-wave R&D session | Athelon Phase 15*
