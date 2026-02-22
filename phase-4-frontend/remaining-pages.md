# Athelon — Phase 4: Remaining Pages Specification
**Authors:** Chloe Park (Frontend Engineer) · Finn Calloway (UX/UI Designer, annotations marked `[FINN]`)
**Date:** 2026-02-22
**Status:** AUTHORITATIVE — Phase 4 page implementation begins against this document
**Depends On:** phase-2-frontend/frontend-architecture.md · phase-3-frontend/frontend-integration.md
  · phase-3-mobile/mobile-adaptation.md · phase-4-mutations/remaining-mutations.md
  · reviews/phase-3-gate-review.md
**Resolves:** B-P3-04 (WO detail page missing) · FE-01 (dual sign-off UX, Phase 3 integration.md §4)
  · FE-03 (remove + red-tag 2-tap requirement) · Marcus AD citation requirement (RQ-05/UM-08)

---

> *Five pages, all of them critical-path for alpha pilot. The gate review was clear: one list page
> exists, twelve are missing. This spec closes the five that block a real mechanic from doing a real
> day's work. Everything here maps directly to mutations Devraj just finished in remaining-mutations.md.
> I'm writing this in order of dependency: WO detail first because the task card page hangs off it,
> parts and compliance can be built in parallel, RTS wizard last because it assumes everything above is
> wired. — CP*

---

## 1. Work Order Detail Page

**Route:** `(app)/work-orders/[workOrderId]/page.tsx`
**Layout:** `(app)/work-orders/[workOrderId]/layout.tsx` — WO context, status header, tab bar
**B-P3-04 Resolution:** This is the page that was missing from Phase 3. The gate review flagged it as
the top frontend blocker: "A user can see the list but cannot open a work order."

### 1.1 Route and Layout Architecture

The layout at `[workOrderId]/layout.tsx` loads the work order once and provides it to all child
routes via a React context. `useWorkOrder(workOrderId)` is the single Convex subscription for the
entire WO context — every child tab shares this live subscription rather than each fetching
independently. The tab bar (Task Cards / Parts / Notes / Sign-Off) renders inside this layout.

```typescript
// Convex queries wired at layout level:
const workOrder = useQuery(api.workOrders.get, { workOrderId });
// workOrder: undefined → skeleton, null → not-found, Doc<"workOrders"> → render

// Child pages add their own scoped queries without re-fetching the WO header.
```

The WO detail page (`page.tsx`) is the Task Cards tab (default). It does NOT render all tab content
simultaneously — each tab is its own child route, lazy-loaded on navigation. The layout holds the WO
header; the page holds the tab content.

[FINN] The tab bar for the WO detail is a horizontal row: Task Cards · Parts · Notes · Sign-Off.
On mobile (< 768px) this row is horizontally scrollable, not truncated. Sign-Off tab renders only
for `isAtLeast("inspector")` — hidden completely for AMT, not just disabled. Per the role-gating
pattern from frontend-integration.md §4.3: absent buttons don't raise questions.

### 1.2 WO Header Section

Component: `WorkOrderHeader` (already wired per frontend-integration.md Wave 2 status). The header
renders inside the layout and is visible across all tabs. Fields displayed:
- `StatusBadge` — live, updates in real time when WO status changes. All 10 variants.
- Aircraft tail number — links to `/fleet/[tailNumber]`
- WO type (display label, not enum value)
- Priority badge — `routine` / `urgent` / `aog` with color differentiation
- `AirframeHours` — TT at open; if closed, TT at close alongside
- Opened date via `DateTimeDisplay` (Zulu primary, local secondary)
- Assigned technician(s) — comma-separated if multiple

Real-time behavior: when `completeStep` on the last task card fires and the WO transitions from
`in_progress` to `pending_signoff`, the `StatusBadge` in this header updates for every session
watching that WO detail page. No refresh required. That's the Convex live-query value prop delivered.

[FINN] `StatusBadge` in the header must use the `lg` size variant — the header is the primary status
signal for the whole page. Do not shrink it to `sm` for "visual balance." The badge label, icon, and
color together communicate to a DOM reviewing six open WOs. Make it readable from across a desk.

### 1.3 Task Card List Section (Default Tab Content)

**Convex query:**
```typescript
const taskCards = useQuery(api.taskCards.listForWorkOrder, { workOrderId });
// Returns undefined (loading), null (not found), or array sorted: incomplete first, complete last
```

**Sections within the task card tab:**

**Close Readiness Panel** — rendered when `workOrder.status === "pending_signoff"`. This is a
condensed pre-flight summary sourced from `useQuery(api.workOrders.getCloseReadiness, { workOrderId })`.
It shows: open task card count, unreviewed N/A step count, open discrepancy count, AD compliance
status (for annual/100hr), maintenance record signature count. A green "All Clear" state when all
checks pass — with the "Proceed to Sign-Off" primary button linking to the `/sign-off` tab.
A blocking state when any check fails — with inline links to each blocker.

`getCloseReadiness` is the same query used in the RTS wizard Step 1. Wiring it here means the
inspector doesn't have to enter the wizard to know if the WO is ready — they can see it on the
detail page. If it's not ready, they can navigate directly to the blockers from here.

**Task card list:** each item rendered as `TaskCardListItem` (already built in Phase 3). The
`signOffReady` state — which surfaces the full-row SIGN OFF button — triggers when
`taskCard.status === "complete"` and the task card has no unsigned mandatory steps. The inspector
sees their amber "Counter-Signature Required" badges directly in this list view.

**Empty state:** `<EmptyState label="No task cards" cta="Add Task Card" />`
→ routes to `./tasks/new`. Role-gated: only `isAtLeast("supervisor")` sees the CTA.

### 1.4 Close Work Order Modal

The Close button appears in the WO header action area when `workOrder.status === "pending_signoff"` and
the current user `isAtLeast("inspector")`. It does NOT appear if `getCloseReadiness` shows any blockers
(the pre-flight check is surfaced inline before the modal is reachable).

**Modal sequence:**
1. "Close Work Order" button opens `<CloseWorkOrderModal>`.
2. Modal mounts → fires `useQuery(api.workOrders.getCloseReadiness, { workOrderId })`.
3. If any blocker exists: renders `<BlockingConditionAlert>` list, no proceed action.
4. If all clear: renders confirmation form — Aircraft TT at close field (pre-populated from last
   aircraft record, confirmable), final `RequiredAcknowledgement` checkbox.
5. Confirm → the modal is not the RTS sign-off. It closes the WO for inspection handoff.
   The actual `authorizeReturnToService` mutation fires in the RTS wizard.

**Loading / error states:**
- `getCloseReadiness` loading: skeleton rows inside the modal
- `WO_TASK_CARDS_INCOMPLETE` surfaced inline: "N task card(s) not complete. Fix them before closing."
- `WO_OPEN_INTERRUPTIONS_BLOCK`: links to each open interruption
- All error codes from remaining-mutations.md Error Code Master Registry mapped per
  frontend-integration.md §5 pattern: `useMutationErrorHandler(errorCode)`.

### 1.5 Loading / Error / Empty States

- `useWorkOrder` returns `undefined`: `<WorkOrderSkeleton />` — full-page skeleton, header + tab bar
  + content area, all in placeholder gray. Matches the real layout to prevent layout shift on load.
- `useWorkOrder` returns `null`: `<NotFoundState label="Work order not found" />` with back navigation
  to `/work-orders`.
- Task card list loading: `<TaskCardListSkeleton />` — 3 placeholder rows at correct heights.
- Tab navigation error: each tab has its own `error.tsx` boundary — an error on the Parts tab does
  not break the Task Cards tab.

### 1.6 Mobile Treatment

Per mobile-adaptation.md §1.4: tab bar collapses to horizontal-scroll row on mobile. No truncation.
The close readiness panel collapses to a compact banner on mobile (expand on tap). Task card list is
single-column, full-width. The "Proceed to Sign-Off" CTA uses full-width button with `min-h-[60px]`.
WorkOrderHeader switches from multi-column to stacked single-column. The `StatusBadge` stays `lg`.

[FINN] On the 375px viewport, the WO header can get tall fast: tail number + WO type + status + dates
stacks to 4–5 rows. That's fine — this is the primary context display. Do not try to compress it into
two rows by shrinking text or removing fields. The mechanic needs all of it. Consider a subtle
`bg-muted/50` background on the header to visually separate it from the tab content below.

---

## 2. Task Card Detail Page

**Route:** `(app)/work-orders/[workOrderId]/tasks/[taskCardId]/page.tsx`
**Critical path:** Cannot sign any step without this page. B-P3-04 blocked this entirely.

### 2.1 Convex Queries Wired

```typescript
const taskCard = useQuery(api.taskCards.get, { taskCardId });
const steps = useQuery(api.taskCardSteps.listForCard, { taskCardId });
// Live subscription: steps re-render when any technician signs, counter-signs, or marks N/A
const counterSigs = useQuery(api.taskCardStepCounterSignatures.listForCard, { taskCardId });
// SE-01 table — needed to display dual-sign blocks and amber "counter-sig required" badges
const interruptions = useQuery(api.taskCardInterruptions.listOpen, { taskCardId });
// SE-02 table — surfaces open interruption banners at the top of the page
```

### 2.2 Layout — Desktop and Mobile

**Desktop:** Two-column layout. Left column (60%): step list. Right column (40%): sticky panel
with `PartReference` blocks (from `taskCard.partsRequired[]`), `TimeEntryWidget`, and task card
metadata (reference, type, `requiresDualSignOff` flag).

**Mobile (< 768px):** Single column per mobile-adaptation.md §1.4. Order from top:
`TimeEntryWidget` (mechanics log time first), then step list, then `PartReference` blocks in
a collapsed accordion.

[FINN] The `PartReference` blocks on mobile should NOT be the first thing a mechanic sees on the
task card detail. They need the step list — that's their work queue. References are contextual,
not primary. The accordion pattern for PartReference on mobile is correct. Label the accordion
trigger: "Parts Required (N)" — tap to expand. Default: collapsed.

### 2.3 Step List — Inline Sign Flow

Each step renders as a full-row tap target (`min-h-[60px]` per mobile-adaptation.md §2.8). Step
states map to visual treatments:
- `pending`: empty checkbox, step description, assigned technician if set
- `in_progress`: filled gray checkbox, running timer badge (if TimeEntry running for this step)
- `completed`: green checkbox, `SignOffBlock` (immutable): legal name, cert #, Zulu timestamp, ratings
- `na`: gray "N/A" chip, `naReason` inline, amber "IA Review Required" badge if `signOffRequiresIa`
- Interrupted: amber left border, `<InterruptionBanner>` — reason + interrupted-by + duration

**Completing a step:** tap anywhere on a `pending` or `in_progress` step row → `<StepSignOffModal>`
opens as a bottom sheet on mobile, dialog on desktop. The modal follows the full flow from
frontend-integration.md §2.3 Path 3: ratings selection (RQ-05 unconfirmed → confirmed control),
re-auth modal for IA-required steps, `completeStep` call. No optimistic update on sign-off.
Button loading state: spinner inside the same button dimensions, no layout shift.

### 2.4 Dual Sign-Off UX — FE-01 Resolution

Wiring `counterSignStep` (remaining-mutations.md Mutation 10) into the step row:

After `completeStep` resolves on an IA-required step, the step row transitions to show:
- Primary A&P `SignOffBlock` (green, left / top on mobile)
- Amber badge: "IA Counter-Signature Required"

The IA sees this badge in the task card list AND in the step row. Tapping the step row opens
the `<StepSignOffModal>` in **counter-sign mode**. Counter-sign mode differences from primary mode:
- Shows primary A&P's `SignOffBlock` (read-only, above the counter-sign form)
- `counterSignType` selector: `ia_inspection` pre-selected if caller holds IA, `dual_amt` if not
- `scopeStatement` field (required, free-text, `minLength: 1`, placeholder: "Describe what was
  reviewed during this counter-signature inspection...")
- RQ-05 ratings control — same unconfirmed → confirmed UX as primary sign
- `<ReAuthModal>` fires a SEPARATE `signatureAuthEventId` from the primary A&P's event
- On `counterSignStep` success: step row shows TWO `SignOffBlock` components stacked vertically on
  mobile (`leading: "Primary Signature" / "IA Counter-Signature"` per frontend-integration.md §4)

Guard surfacing: `TC_COUNTER_SIGN_SELF_DUAL_AMT` → modal error: "You signed this step as the
performing technician. You cannot also be the second A&P for dual sign-off. Counter-sign using
your IA authorization instead (select 'IA Inspection')."

[FINN] The counter-sign mode needs a visible header in the modal: "Counter-Sign Step N — IA Review."
It must be unmistakably different from the primary sign modal — the IA is making a separate
regulatory determination, not rubber-stamping the first one. The primary A&P block shown read-only
at the top reinforces this: "You are reviewing and counter-signing [A&P name]'s work."

### 2.5 `reviewNAStep` IA Flow

Steps marked N/A with `signOffRequiresIa === true` show an amber "IA Review Required" badge.
The IA taps the row → `<NaReviewModal>` opens (separate from the sign modal, clearly labeled
"IA N/A Review — Step N"). Modal shows: step description, N/A reason recorded by the A&P,
`reviewDecision` selector (Concur N/A / Reject — Step Reverts), `reviewNotes` field (required —
guard `TC_REVIEW_NOTES_REQUIRED`), RQ-05 ratings control, `<ReAuthModal>`.

- On "Concur": step row transitions to "N/A · IA Concurred" gray badge. If last pending IA review,
  task card transitions to `complete` in real time (Convex subscription fires).
- On "Reject": step row transitions back to `pending`. Amber "N/A Rejected · Step Reverted" badge.
  The prior N/A data is preserved in the step document (immutable chain of custody per
  remaining-mutations.md Mutation 9 execution Branch B).

### 2.6 Interruption Display

Open interruptions (`SE-02 table`) render as a persistent amber banner at the top of the step list:
"⚠ Step N — Interrupted: [reason]. By [technician] at [timestamp]. Tap to Resume."
Tapping the banner opens a `<ResumeInterruptionModal>` → fires `resumeStep` mutation.
A closed interruption record is displayed inline on the step row as a collapsed "Show Interruption
History" disclosure — not prominent, but accessible for audit purposes.

### 2.7 Loading / Error / Empty States

- `taskCard === undefined` → `<TaskCardSkeleton />`: header + 5 placeholder step rows
- `taskCard === null` → `<NotFoundState label="Task card not found" />` with back link to WO detail
- `steps === undefined` → skeleton rows inline (header renders immediately, steps deferred)
- No steps yet: `<EmptyState label="No steps added" cta="Add Step" />` role-gated to supervisor+

---

## 3. Parts Module Pages

**Routes (new):**
- `(app)/parts/receiving/page.tsx` — receiving queue + intake form
- `(app)/parts/inventory/page.tsx` — inventory list with status filters
- Part install and remove/red-tag are modals launched from these pages, not separate routes.

### 3.1 Parts Receiving Form (`receivePart`)

The receiving page shows the open expected deliveries queue (`useQuery(api.parts.listReceivingQueue)`)
and a FAB ("+ Receive Part", `min-w-[60px] min-h-[60px]`, rounded-full, bottom-right) per
mobile-adaptation.md §5.2 Use Case B.

FAB tap → `<ReceivingForm>` opens as a full-screen bottom sheet on mobile, 640px dialog on desktop.

**Field sequence (mobile-optimized):**
1. **Part Number** — `h-[60px]`, `autoCapitalize="characters"`, `autoCorrect="off"`. Required.
2. **Scan Barcode** — secondary full-width button (`min-h-[56px]`). Invokes camera capture.
   Manual entry is primary path.
3. **Serial Number** — shown if serialized (auto-detected or user-toggled). Same treatment.
4. **Documentation Type** selector — `documentationType` is the gating field per
   frontend-integration.md §2.4 Path 4. Four options rendered as a segmented control:
   `8130-3` / `CoC Only` / `PMA Marked` / `No Documentation`. This field renders FIRST in the
   required section — it determines what the rest of the form looks like.
   - "No Documentation" branch: amber banner "Part will be routed to quarantine. A receiving
     inspection is required before this part can be installed." Section header changes from
     "Receiving" to "Quarantine Intake." Inventory fields hidden; quarantine reason field shown.
   - "CoC Only" branch: amber notice about receiving inspection requirement per 14 CFR § 145.201.
   - "8130-3" branch: 8130-3 tracking number field appears (scan affordance + manual entry).
5. **Condition** — segmented control: New / Serviceable / Overhauled. `min-h-[60px]` segments.
6. **Optional / Life Tracking** accordion — collapsed by default. Expands to show:
   life-limited toggle, shelf-life date (`<input type="date">`, native mobile picker),
   owner-supplied toggle, quantity field.

On submit: `receivePart` fires. Button loading state per frontend-integration.md §1.3 pattern.
On success: `<ReceivingSuccessSheet>` — part ID, "View Part Record" link, "Receive Another" action.
Error codes mapped: `PART_QUANTITY_EXCEEDS_TAG_LLP` → hard block, no override path in UI.
`PART_QUANTITY_EXCEEDS_TAG_NON_LLP` → amber banner + Supervisor Override sub-flow requiring
supervisor PIN re-auth + documented reason.

[FINN] "Quarantine Intake" header change is not subtle — it is the mechanic's signal they entered a
different regulatory workflow. Section header: `text-amber-700 font-semibold`, quarantine icon, amber
banner as dominant visual. A mechanic who receives a quarantine part thinking it went to inventory has
created a traceability failure.

### 3.2 Inventory List (`/parts/inventory`)

Filter chips (horizontal scroll row, `min-h-[44px]`): All · Available · Installed · Quarantine · Red Tagged.
Powered by `useQuery(api.parts.listInventory, { statusFilter, search })`.
Each row: `PartReference` block (P/N, S/N, condition badge) + status badge + location + action button
(role-gated). Desktop: compact table. Mobile: stacked cards. AMT+ see "Install" on `available` parts
and "Remove & Red Tag" on `installed` parts.

### 3.3 Install Confirmation Modal (`installPart`)

`<InstallPartConfirmation>` opens as a dialog (desktop) or bottom sheet (mobile). Displays: P/N, S/N,
condition, status, work order context. "Confirm Install" → `installPart` fires (no optimistic update).
Hard blocks before the confirm button: `PART_SHELF_LIFE_EXPIRED` → no Install button rendered at all.
`PART_COC_RECEIVING_INSPECTION_REQUIRED` → amber block, no install path without supervisor action.
On success: modal closes, `PartReference` block in the task card updates in real time.

### 3.4 Remove and Red Tag — FE-03 (Nadia's 2-Tap Requirement)

Nadia's requirement: a mechanic performing a removal + quarantine must complete this in two taps
from the inventory list (one to open the action, one to confirm). No multi-step wizard.

`removePart` + `tagPartUnserviceable` fire in sequence in a single user interaction:
`<RemoveAndRedTagModal>` opens on "Remove & Red Tag" action tap (tap 1). Modal shows:
- Part details (P/N, S/N, install location)
- `tagReason` field (free-text, required, `placeholder: "Describe defect or reason for removal"`)
- Combined "Remove and Red Tag" confirm button (tap 2)

On confirm: first `removePart` fires. On success, `tagPartUnserviceable` fires with the same
mutation context. If `removePart` succeeds but `tagPartUnserviceable` fails, a recovery banner
renders: "Part removed but red-tag failed. Tap to retry red-tag." The part is now `available`
(not quarantined), which is the safe failure direction — it will show in inventory as available
until the tag is applied. This is preferable to leaving the part as `installed` if removal fails.

[FINN] The modal action button label: "Remove and Red Tag Part" — not just "Confirm." The label
must describe the combined destructive action. This is a 2-tap operation with real inventory and
traceability consequences. The confirm button uses `variant="destructive"` styling. No confetti,
no celebration — this is a part being pulled from service.

### 3.5 Mobile Treatment — Parts Pages

Per mobile-adaptation.md: FAB for receiving, single-column inventory cards, native date picker for
shelf-life fields. All text inputs `font-size: 16px` (iOS anti-zoom). PartReference stacks P/N /
S/N / condition badge vertically on mobile. Condition segmented control: three segments across 375px
= ~125px each — adequate for a tap target.

---

## 4. AD Compliance Dashboard

**Route:** `(app)/compliance/ads/page.tsx`
**Within layout:** `(app)/compliance/layout.tsx` — Compliance module tab bar
  (Audit Trail / Certificates / RTS Records / ADs)

### 4.1 Convex Queries Wired

```typescript
// Live subscription — reactive to aircraft TT changes and compliance record updates
const adStatuses = useQuery(api.adCompliance.checkAdDueForAircraft, { aircraftId });
// Returns array sorted: overdue first, due-soon, then complied — per remaining-mutations.md §6
// Includes: isOverdue, isDueSoon, hoursRemaining, daysRemaining, percentWindowConsumed

const adRecords = useQuery(api.adCompliance.listForCurrentOrg, { filter });
// For the dashboard view — all AD compliance records across all org aircraft
```

Real-time subscription scope: `checkAdDueForAircraft` uses live aircraft `totalTimeAirframeHours`
from the aircraft document (not cached fields). When `authorizeReturnToService` updates the aircraft
TT, `checkAdDueForAircraft` subscribers re-render automatically. An IA watching this dashboard
sees the AD status update the moment an RTS fires. That's the live-query value here.

[FINN] This dashboard is Sandra's before-sign-off checklist. The DOM needs to answer "Is this aircraft
current on all ADs?" in under 10 seconds. Default sort: overdue (red) first, due-soon (amber) second,
complied in collapsed section. Filter chips are for the mechanic — the sort order tells the DOM what
they need at a glance.

### 4.2 AD List — Filter Chips and Status Display

Filter chips above the AD list (horizontal scroll row, consistent with Parts inventory chips):
All · Overdue · Due Soon · Complied · Not Applicable · Pending Determination

Each AD card shows (per mobile-adaptation.md §5.3 Use Case C):
- AD number in `font-mono text-base` (bold)
- Short description (2 lines max, truncated — full text in detail sheet)
- `StatusBadge`: Overdue (red) / Due Soon (amber) / Complied (green) / N/A (gray) / Pending (yellow)
- Next due: date OR hours remaining, whichever is sooner (negative = overdue)
- `percentWindowConsumed` progress bar — only shown for `not_complied` ADs within initial window
  (per remaining-mutations.md Query 6 `percentWindowConsumed` field)

**Overdue state — non-dismissible banner:**
Per mobile-adaptation.md §5.3 and frontend-integration.md §6 checklist item 12:
When any AD has `isOverdue: true`, a red persistent banner renders at the TOP of the compliance
page: "N AD(s) Overdue — Aircraft must not be returned to service." Red background, white text,
no dismiss button. This banner also renders on `/fleet/[tailNumber]/schedule` independently.
The `authorizeReturnToService` mutation will throw `RTS_AD_OVERDUE` in this state, but the banner
must be visible without entering the sign-off wizard.

### 4.3 `createAdCompliance` Flow

"Add AD Record" button (DOM and supervisor only, `isAtLeast("supervisor")`) opens
`<CreateAdComplianceModal>`.

Fields:
- AD Number (text, `autoCapitalize="characters"`, required) — looks up AD record via
  `api.airworthinessDirectives.findByNumber` as the user types (300ms debounce). If found:
  shows AD title and effective date below the field as confirmation. If not found: amber notice
  "AD not in database — it will need to be added by your DOM."
- Aircraft selector (pre-populated if navigated from aircraft detail page)
- Initial Note (optional free-text)
- `initialApprovedDataReference` (optional) — if provided, guard `AD_COMPLIANCE_RECORD_NO_AD_CITATION`
  is surfaced inline: "Reference must include the AD number." Validated client-side before submit.

On `createAdCompliance` success: new card appears in the list with `pending_determination` status.
The `RequiredAcknowledgement` on the form: "I understand this record starts in 'Pending Determination'
status. Compliance status must be recorded separately."

### 4.4 `recordAdCompliance` Form — Marcus's Citation Requirement

From the AD card, "Record Compliance" action (AMT+) opens `<RecordComplianceSheet>`.

**Key field: `approvedDataReference`** — Marcus's required citation from compliance-validation.md §2
Item 3 and remaining-mutations.md Mutation 3 G4:
"A maintenance record that does not cite the AD is not proof of AD compliance."
- Required field, labeled "Approved Data Reference" with helper text:
  "Must cite the governing AD number (e.g., '2023-10-07 per AMM Chapter 05-20')"
- Frontend validates before submit: `approvedDataReference.includes(adNumber)` → if false, inline
  error: "Reference must include AD number [adNumber]. A maintenance record not citing the AD
  number is not proof of compliance."
- This mirrors the server guard `AD_COMPLIANCE_RECORD_NO_AD_CITATION` — surfaced on the client
  first to prevent a frustrating submission rejection.

Other fields: `complianceDate` (`<input type="date">`), `aircraftHoursAtCompliance` (numeric, cross-
referenced against aircraft record), `complianceMethodUsed` (select: "Performed per AMM" /
"Per STC" / "Per field approval" / "Inspected N/A"), `notes` (optional), maintenance record
reference (links the compliance to a `maintenanceRecord` document).

On submit: `recordAdCompliance` fires with `signatureAuthEventId` (re-auth required — the record
compliance is a regulatory signing act). `<ReAuthModal>` per standard pattern.

### 4.5 `markAdNotApplicable` — IA Auth Requirement Surfaced in UI

"Mark N/A" button renders only for `isAtLeast("inspector")` — per remaining-mutations.md Mutation 4:
AUTH is `requireOrgMembership(ctx, "inspector")`. This is surfaced in the UI: for AMT users, the
button is absent (not disabled). For inspector+ users, it renders on the AD card.

`<MarkNaModal>` fields:
- `notApplicableReason` (required, `minLength: 20`) — inline counter: "N/20 characters"
  Client-side validation mirrors server guard `AD_MARK_NA_REASON_TOO_SHORT`.
  Helper text: "Document the specific reason this AD does not apply — aircraft model, engine type,
  modification status, or other determining factor. Minimum 20 characters required."
- Re-auth modal (`<ReAuthModal>`) — N/A determination is a signed regulatory act
- Acknowledgement: "This N/A determination is a permanent record. The AD record is retained
  per 14 CFR 91.417(a)(2)(v) and is not deleted."

Guard `AD_MARK_NA_HAS_COMPLIANCE_HISTORY` surfaced inline: "Cannot mark N/A — this record has
compliance history. Contact your DOM if the prior compliance was recorded in error."

[FINN] The "Mark N/A" modal needs a stronger warning treatment than a standard confirmation. An
incorrect N/A determination on a structural or propulsion AD is a serious airworthiness event. The
modal header should be: "Mark AD Not Applicable — Inspector Authorization Required." The body
should show the AD title and category before the reason field. The re-auth step is non-optional here
— reinforce that with the modal copy, not just the UI mechanics.

### 4.6 Mobile Treatment — AD Dashboard

Per mobile-adaptation.md §5.3: two-line card layout at 375px (AD number + badge, then description).
Horizontal filter chips with `overflow-x-auto`. Detail sheet slides up from bottom (no full nav).
Share button on detail sheet: Web Share API → iOS native share sheet for DOM quick-status sharing.

---

## 5. RTS Sign-Off Wizard

**Route:** `(app)/work-orders/[workOrderId]/sign-off/page.tsx`
**Role guard:** Server component `auth()` check — redirects non-inspector roles to `/work-orders`
(per frontend-architecture.md §4.4 Sign-Off Route Protection). Defense-in-depth: middleware,
page-level redirect, Convex guard in `authorizeReturnToService`.

### 5.1 Architecture — `useRtsWizard()` Hook

The wizard is a single page. Step state is managed in `useRtsWizard()` — a custom hook holding:
`currentStep`, `collectedData` (fields from each step), `blockingConditions` (from Step 1 query),
`wizardStatus: "in_progress" | "submitting" | "success" | "error"`.

Wizard state is NOT stored in URL params or the database. It lives in component state. If the user
navigates away and back, the wizard resets to Step 1. This is intentional — a partially-completed
wizard whose underlying data changed is a stale-data risk. The Step 1 pre-flight check re-runs on
every wizard entry.

**Offline block:** `useConnectivity().isOffline` blocks the "Continue" button on every step with
inline label: "Connection required for sign-off." Per frontend-integration.md §6 checklist item 5.

**Mobile layout:** No left step sidebar. Top progress bar (4px, amber → green). "Step N of 6"
label below. Full 375px width available for step content. All CTAs sticky at bottom of viewport
with `env(safe-area-inset-bottom)` padding per mobile-adaptation.md §3.

### 5.2 Step 1 — Pre-Flight Check

**Convex queries (pre-loaded before wizard mounts, snapshot on entry):**
```typescript
const workOrder = useWorkOrder(workOrderId);
const taskCards = useQuery(api.taskCards.listForWorkOrder, { workOrderId });
const discrepancies = useQuery(api.discrepancies.listForWorkOrder, { workOrderId });
const adCompliance = useQuery(api.adCompliance.checkAdDueForAircraft, { aircraftId });
const maintenanceRecords = useQuery(api.maintenanceRecords.listForWorkOrder, { workOrderId });
const closeReadiness = useQuery(api.workOrders.getCloseReadiness, { workOrderId });
// All of these snapshot into useRtsWizard() state when wizard mounts.
// Live updates to underlying data do NOT disrupt the in-flight wizard (§1.4 in Phase 3 integration).
```

**Rendered sections:**
- `<AircraftSummaryCard>` — tail number, model, TT at open, TT at close (if set)
  Mobile: `grid-cols-1` with `divide-y` separator between fields (not a 3-col grid at 375px)
- `<TaskCardStatusGrid>` — rendered as stacked card list on mobile, not a table element
  Each card row: `min-h-[60px]` tap target linking to the task card detail page
- `<DiscrepancySummaryPanel>` — open discrepancies count, MEL deferrals list
  Discrepancy rows: `min-h-[60px]` (per mobile-adaptation.md §2.2 redesign requirement)
- AD compliance status block — sourced from snapshotted `adCompliance` data
- `<MaintenanceRecordList>` — stacked card list on mobile

**"Continue" gating:**
When `closeReadiness` shows any blocker, the "Continue" button is replaced by "Resolve Blockers"
+ `<BlockingConditionAlert>` list. Each blocker is a link. On mobile, blocking links to AD
compliance open a modal sheet (not full navigation) so the inspector doesn't lose the wizard state.
Return to wizard via `router.back()`.

[FINN] Step 1 is the most information-dense step in the wizard. On mobile, the scroll length can
easily be 3–4 screens. That's acceptable — the inspector is doing a regulatory pre-flight, not a
quick acknowledgement. Use clear section headers (H2, `text-lg`) and `divide-y` separators between
sections. Do not try to collapse or paginate within Step 1 — the inspector needs to see all of it.
The "Continue" or "Resolve Blockers" sticky CTA at the bottom is their signal that they can
stop scrolling.

### 5.3 Step 2 — Discrepancy Review (Conditional)

Renders only when `discrepancies.some(d => d.disposition === "deferred_mel")`.
`RequiredAcknowledgement` checkbox: `min-h-[60px]` full-row tap target.
Recipient name field: `h-[60px]`, `font-size: 16px`, `autoCorrect="off"`, `autoCapitalize="words"`.
MEL items rendered as stacked cards (not a table) — read-only.

### 5.4 Step 3 — Aircraft Times Confirmation

`<AircraftTimesConfirmationCard>` — all read-only, no keyboard on mobile. "Fix This" text link
→ converted to full-width `<Button variant="outline" min-h-[56px]>` labeled "← Correct Aircraft
Times" per mobile-adaptation.md §2.4. If `aircraftTotalTimeAtClose < aircraftTotalTimeAtOpen`:
red field, hard block, "Fix This" is the only action available.

### 5.5 Step 4 — RTS Statement

`<RtsStatementEditor>` — full-width textarea, `min-h-[160px]`, `font-size: 16px` (iOS anti-zoom).
Pre-populated template keyed to `workOrder.workOrderType` from constants (not DB).
Template tokens `[YOUR NAME]` / `[CERT #]` as placeholder text inside the editable region —
NOT HTML `placeholder` attribute (which disappears on focus, losing template structure).

**Character count:** top-right of textarea, not below (keyboard hides below on iOS).

**Three inline validations (RQ-06 from remaining-mutations.md §G9):**
- Length < 75: "Statement too short (N/75 chars)" — red counter
- No `14 CFR` or `Part 43`: "Add regulatory citation ('14 CFR' or 'Part 43')" — amber inline
- No `return` or `airworthy`: "Add airworthiness determination ('return' or 'airworthy')" — amber inline
These are frontend-only early warnings. The `authorizeReturnToService` mutation enforces them as
three distinct `ConvexError` codes on the server — the client checks save the inspector from a
rejection at Step 6 for something discoverable at Step 4.

Regulatory citation line: read-only `<p>` below textarea, `bg-muted` background, visually
separated from the editable text.

iOS keyboard management: `window.visualViewport` resize listener adjusts the sticky "Continue"
CTA's bottom offset dynamically per mobile-adaptation.md §2.5.

### 5.6 Step 5 — Identity Re-Authentication

`<ReAuthModal>` with `useSignatureAuthEvent(enabled)` — mounted when user submits credentials,
subscribing to `api.signatureAuthEvents.getPendingForCurrentUser`. Event arrives via Convex
WebSocket push (~200ms on normal connection). Frontend-integration.md §2.5 specifies this as a
reactive subscription, not a poll.

**Mobile — "Sign and Return to Service" button:**
Per mobile-adaptation.md §2.6 and §3.2: press-and-hold 1.5 seconds (not the 2s hover delay from
desktop). `onPointerDown` → start 1.5s timer → CSS `conic-gradient` circular progress animation
around the button during hold → on completion, fire re-auth submission. `navigator.vibrate(200)`
on completion if available. If pointer lifts early, reset progress — no partial credit.

The button is `h-[64px]`, full-width, `variant="danger-confirm"`. Dominant visual on this step.

Face ID: async `isUserVerifyingPlatformAuthenticatorAvailable()` check — render Face ID tab only if
true. PIN is default: `<input type="tel" inputMode="numeric" pattern="[0-9]*">` (numeric keyboard).

On `AUTH_EVENT_EXPIRED`: `<ReAuthTimeoutError>` with "Try Again" button that remounts the
`useSignatureAuthEvent` hook with fresh `mountTime`. 10-second timeout before auto-showing this.

### 5.7 Step 6 — Final Confirmation and `authorizeReturnToService`

`<RtsPreviewCard>` in scrollable container (`max-h-[50vh]` on mobile, full-height on desktop).
Sticky bottom section: `RequiredAcknowledgement` (`min-h-[60px]`) + "Issue Return to Service"
(`h-[64px]`, `variant="danger-confirm"`, full-width).

On submit: `authorizeReturnToService` fires: `workOrderId`, `signatureAuthEventId` (Step 5),
`returnToServiceStatement` (Step 4), `aircraftHoursAtRts` from `workOrder.aircraftTotalTimeAtClose`
(NOT user-entered), `limitations` (optional). `<MutationPendingOverlay>` blocks interaction during
the call — no double-submission path.

**On success:** navigate to `/work-orders/[workOrderId]?rts=success` → persistent dismissible green
banner: "Return to Service Issued · Record [rtsId] · [timestamp]Z". Not a toast — must survive a
screenshot. No confetti. This is a regulatory record, not a product sale.

**On mutation failure — `<GroundedBanner>`:** Full-screen error state (not toast) per
frontend-integration.md §6 checklist item 8. Plain-English message, affected record IDs as links,
"Go Back to Fix This" routing to the relevant step:
- `RTS_AD_OVERDUE` / `RTS_OPEN_DISCREPANCIES` → Step 1 with blocker links
- `RTS_IA_REQUIRED` / `RTS_IA_EXPIRED` → Step 5 with red IA status display
- `RTS_STATEMENT_*` errors → Step 4 with inline validation messages
- `RTS_ZERO_AD_RECORDS` → "Navigate to Compliance → ADs and create at least one record."
- `RTS_MEL_EXPIRED` → red background, bold "AIRCRAFT GROUNDED" label, resolution path.

[FINN] Button label must be "Issue Return to Service" — not "Complete," "Submit," or "Finish." The
"Scroll to review ↓" indicator invites review without requiring it. A "must scroll to bottom" lock
is patronizing and breaks with screen readers. Give the inspector the affordance; the responsibility
is theirs. This is the most legally significant button in the application — label it accordingly.

---

## 6. Cross-Cutting Mobile Checklist — Phase 4 Pages

Before any Phase 4 page ships, run the full checklist from mobile-adaptation.md Appendix A.
In addition, for these five pages specifically:

- [ ] WO detail tab bar scrollable at 375px without label truncation
- [ ] Close Readiness Panel on WO detail: sticky CTA above iOS safari chrome
- [ ] Task card step row full `min-h-[60px]` tap target verified in DevTools iPhone SE emulation
- [ ] `StepSignOffModal` ratings control: pre-populated "unconfirmed" state (dashed border) vs
  confirmed (solid border) — "Confirm Step" disabled until at least one rating confirmed
  (frontend-integration.md §6 checklist item 6)
- [ ] Receiving form "No Documentation" branch: quarantine header change visible, amber banner
  dominant, inventory fields absent
- [ ] AD compliance `approvedDataReference` field: inline citation validation before submit
- [ ] RTS wizard Step 4: iOS keyboard management (`visualViewport` resize) verified with
  software keyboard open in DevTools mobile emulation
- [ ] RTS wizard Step 5: press-and-hold 1.5s behavior on "Sign and Return to Service"
- [ ] `GroundedBanner` on RTS failure: full-screen, not toast, tested with `RTS_AD_OVERDUE`
- [ ] All five pages tested offline: `useConnectivity().isOffline` blocks mutations, read-only
  data accessible, OfflineBanner renders within one render cycle

---

*Chloe Park — Frontend Engineering*
*`[FINN]` annotations: Finn Calloway — UX/UI Design*
*2026-02-22 — Athelon Phase 4 Remaining Pages Specification*
*Resolves: B-P3-04 (WO detail page), FE-01 (dual sign-off UX wire), FE-03 (remove + red-tag 2-tap)*
*Mutation wire targets: Devraj remaining-mutations.md — all 11 mutations covered across 5 pages*
*Next: Finn delivers Figma frames for counter-sign modal, AD card layout, and GroundedBanner by
2026-02-28. Chloe begins WO detail implementation (B-P3-04) Day 1 of Phase 4 sprint.*
