# Athelon — Phase 4: Mobile Verification Report
**Document Type:** Pre-Alpha Mobile Verification
**Author:** Tanya Birch (Mobile Engineer)
**Date:** 2026-02-22
**Status:** FINAL — Pre-Alpha Sign-Off
**Verification Environment:** `athelon-staging` (Vercel Staging → `athelon-staging` Convex deployment, per convex-deployment.md §1.1)
**Devices Used:** iPhone SE 2nd Gen (375×667, iOS 17, Safari 17) · iPhone 13 (390×844, iOS 17, Safari 17) · Samsung Galaxy A54 (Android 14, Chrome 120) · Chrome DevTools emulation: iPhone SE / iPhone 14 Pro
**Source Documents:**
  - `phase-3-mobile/mobile-adaptation.md` — Phase 3 mobile standards (this is my own doc, I know every word of it)
  - `phase-4-frontend/remaining-pages.md` — Chloe's Phase 4 implementation spec
  - `phase-4-infra/convex-deployment.md` — Jonas's deployment runbook

---

> *This is a spec-to-spec verification, not a live device test. The staging deployment is up
> (B-P3-01 resolved per Jonas's deploy checklist) but the pages are still being built. What I'm
> doing here is reading Chloe's Phase 4 spec against my Phase 3 standards and calling every gap
> I find before any mechanic touches it. Some of what I flag will be "already handled by the
> spec." Some will be "spec says it but I don't trust the implementation." Both kinds get
> flagged. — TB*

---

## Section 1: Touch Target Verification

### Methodology
Phase 3 mobile-adaptation.md §2.1 sets the standard: **60px × 60px minimum hit area** for all
interactive elements. Not 44px (Apple HIG for clean hands). 60px because gloves, grease, and
hangar conditions. Padding counts toward the hit area; visual size does not. I'm reading Chloe's
component specs and comparing them to my Phase 3 audit tables.

---

### 1.1 Page: Work Order Detail (`/work-orders/[workOrderId]`)

**WO Header action area (Close button):**
The spec describes a "Close Work Order" button in the header action area. Height is not explicitly
specified by Chloe. Phase 3 §1.4 says full-width `min-h-[60px]` CTAs on mobile — the Close button
must follow the same rule. Status: **⚠️ Spec gap — no explicit height on WO header Close button.**
Flag to Chloe: add `min-h-[60px]` on mobile context.

**Tab bar (Task Cards / Parts / Notes / Sign-Off):**
Per Chloe's spec, the tab bar is a horizontally scrollable row on mobile. No height specified in
remaining-pages.md. Phase 3 §1.4 specifies `overscroll-behavior-x: contain` and a 2px indicator
underline. The tab row must have `min-h-[48px]` at minimum — touch targets for the tab items
themselves need to be full-height × their width. This is short of 60px but tabs are a navigation
surface, not a primary action. My Phase 3 spec didn't flag the tab row itself because it's a
horizontal navigation — the 60px rule applies to the height of primary interactive elements.
Status: **✅ Tab row acceptable at 48px (navigation surface, not primary action). Note: Chloe
should explicitly set `min-h-[48px]` — if it goes unset, default padding likely renders at 40px
or less.**

**Close Readiness Panel — "Proceed to Sign-Off" CTA:**
Phase 4 spec explicitly states: full-width button with `min-h-[60px]`. Status: **✅ Specified.**

**Close Readiness Panel — blocker links:**
Each blocker is a link to the relevant blocking item. The spec does not specify hit area on these
inline links. On mobile, inline text links are categorically non-compliant unless wrapped in a
padded row. Phase 3 §3.1 addressed this for the sign-off wizard's `BlockingConditionAlert` items:
"full-width amber alert chips, each with a '→ Fix' link." The WO detail panel should follow the
same pattern — full-width chips, not inline text links.
Status: **❌ Gap. Blocker links on the Close Readiness Panel are not specified as full-width
rows. They will default to inline text links at render. Must fix before alpha.**

**Task card list rows (`TaskCardListItem`):**
Phase 3 §2.8 specifies `min-h-[60px]` for the SIGN OFF row when `signOffReady === true`. The
standard task card list item row height is not explicitly anchored in Phase 4. Chloe references
`signOffReady` button renders per my spec but doesn't re-specify the base row height. The cards
must be `min-h-[80px]` per Phase 3 §6.3 `WorkOrderCard` compact variant.
Status: **⚠️ Base list row height needs explicit `min-h-[80px]` — spec inherits from Phase 3
but Chloe should confirm in implementation review.**

---

### 1.2 Page: Task Card Detail (`/work-orders/[workOrderId]/tasks/[taskCardId]`)

**Step rows (`StepCheckbox`):**
Phase 4 spec directly quotes my Phase 3 requirement: "full-row tappable `min-h-[60px]` tap target."
Chloe has it in her spec at §2.3. Status: **✅ Specified.**

**`StepNAButton`:**
Phase 3 §2.8: `min-h-[60px] min-w-[80px]`. Phase 4 spec references Phase 3 but does not re-state
the dimensions. This is a secondary action button — implementors without context may default to
`h-[44px]`. Status: **⚠️ Not re-specified in Phase 4. Flag in implementation review.**

**TimeEntry stepper buttons (+ / −):**
Phase 3 §2.8 explicitly flags these as `❌ Critical — often only 40px` and requires
`min-h-[60px] min-w-[60px]`. Phase 4 spec §2.2 notes `TimeEntryWidget` is above the step list on
mobile (correct) but does not specify the stepper dimensions. Phase 3 §6.3 and Finn's [FC]
annotation call for a dedicated mobile redesign of TimeEntryWidget — large numeric keypad in a
bottom sheet, no inline steppers on mobile.
Status: **❌ Phase 4 spec does not implement the Phase 3 TimeEntryWidget mobile redesign. The
running timer is `text-4xl` (specified), but the entry interaction is not defined. If Chloe
implements the desktop stepper pattern on mobile by default, the + / − buttons will be the
same ≤40px targets I flagged in Phase 3. This is a must-fix before alpha for any shop with
time-logging enabled.**

**`PartReference` expand chevron:**
Phase 3 §2.8: 60px × 60px (icon + padding). Phase 4 spec: accordion pattern, collapsed by default.
Chevron hit area must be the full accordion header row, not just the icon. Chloe's spec says "label
the accordion trigger: 'Parts Required (N)'" — which implies the full header row is the tap target.
Status: **✅ Intent is correct. Verify in implementation that the entire accordion header row is
the tap target, not just the chevron icon.**

**Counter-sign step row:**
After `completeStep`, the amber "IA Counter-Signature Required" badge shows on the step row. The
IA taps the step row to open counter-sign mode. Row is still `min-h-[60px]`. Status: **✅ Same
tap target as primary sign — no change. Compliant.**

---

### 1.3 Pages: Parts Module (`/parts/receiving` and `/parts/inventory`)

**FAB — "Receive Part" / "+" button:**
Phase 4 spec explicitly references Phase 3 Use Case B: `min-w-[60px] min-h-[60px]`, `rounded-full`,
bottom-right. Status: **✅ Specified.**

**Receiving form — Part Number input:**
Phase 4 spec: `h-[60px]`. Status: **✅ Specified.**

**Receiving form — "Scan Barcode" button:**
Phase 4 spec: `min-h-[56px]`, full-width. That's 56px, not 60px.
Phase 3 minimum is 60px. This is 4px short.
Status: **❌ 56px is non-compliant. Increase to `min-h-[60px]`. I understand the visual argument
for making a secondary button slightly shorter than a primary CTA. I'm not accepting it. The
scanning button is tapped at arm's length, often by someone who just put down a part box.**

**Receiving form — Condition segmented control (New / Serviceable / Overhauled):**
Phase 4 spec: `min-h-[60px]` per segment, three segments across 375px ≈ 125px each.
Status: **✅ Specified. Each segment is 125px wide × 60px tall — well over the minimum.**

**Receiving form — "Receive Part" primary submit button:**
Phase 4 spec: sticky bottom, `h-[64px]`, full-width. Status: **✅ Compliant.**

**Inventory list filter chips:**
Phase 4 spec: `min-h-[44px]`. Phase 3 §5.3 also accepts 44px for horizontal filter chips as an
exception ("chips are smaller than standard touch targets but acceptable for a horizontal filter
row where each chip is spacious"). Status: **✅ Acceptable exception. Both specs agree.**

**`RemoveAndRedTagModal` — "Remove and Red Tag Part" confirm button:**
Phase 4 spec specifies `variant="destructive"` but doesn't anchor the height. Must be `min-h-[60px]`.
Status: **⚠️ Height not specified. Add `min-h-[60px]` — this is a destructive mutation.**

---

### 1.4 Page: AD Compliance Dashboard (`/compliance/ads`)

**AD card rows — tappable:**
Phase 4 spec: each AD card shows AD number, description, status badge, next due. On mobile, single-
column cards. Card tap → detail sheet. No explicit row height in the spec. Per Phase 3 §2.2,
interactive rows must be `min-h-[60px]`. AD cards are tappable; their height must be compliant.
Status: **❌ Phase 4 spec does not specify `min-h-[60px]` for AD card rows. Cards will render
at content height, which for a short AD description can be less than 60px. Add
`min-h-[60px] flex items-center` to the card component.**

**"Record Compliance" action on AD card:**
Opens `<RecordComplianceSheet>`. The trigger is an action button on the card. Not height-specified.
Status: **⚠️ Action button height unspecified. Must be `min-h-[60px]` per standard.**

**"Mark N/A" button (inspector only):**
Only renders for `isAtLeast("inspector")`. Height unspecified in Phase 4 spec.
Status: **⚠️ Same as Record Compliance — apply `min-h-[60px]`.**

**`MarkNaModal` — confirm button:**
Height not specified in Phase 4 spec. Must be `min-h-[60px]`. The `notApplicableReason` textarea
should be `min-h-[100px]` on mobile, same as the RTS limitations field.
Status: **⚠️ Not specified. Both apply Phase 3 standard.**

**`approvedDataReference` text input in `<RecordComplianceSheet>`:**
Must be `h-[60px]`, `font-size: 16px`. Phase 4 spec doesn't specify height on this field.
Status: **⚠️ Add `h-[60px] text-base` — anti-zoom and touch target both.**

---

### 1.5 Page: RTS Sign-Off Wizard (`/work-orders/[workOrderId]/sign-off`)

Phase 3 §2.2–§2.7 contains the full touch target audit for all six steps. Phase 4 spec in §5.2–§5.7
does re-specify most of the critical elements. I'm checking for gaps.

**Step 1 — Discrepancy rows:**
Phase 3 §2.2: `❌ Redesign required — increase to 60px`. Phase 4 §5.2: `<DiscrepancySummaryPanel>`
discrepancy rows — no explicit height in Chloe's spec. Phase 3 redesign action applies.
Status: **❌ Not re-specified in Phase 4. Same gap from Phase 3 still open. Discrepancy rows
in the wizard Step 1 need `min-h-[60px]`.**

**Step 1 — `TaskCardStatusGrid` rows:**
Phase 4 spec §5.2: "Each card row: `min-h-[60px]` tap target." Phase 3 §3.2 also specified this.
Status: **✅ Specified in both Phase 3 and Phase 4.**

**Step 2 — `RequiredAcknowledgement`:**
Phase 4 §5.3: `min-h-[60px]` full-row tap target. Status: **✅ Specified.**

**Step 3 — "Fix This" → "← Correct Aircraft Times" button:**
Phase 3 §2.4: critical redesign from inline text link to full-width `<Button>` `min-h-[56px]`.
Phase 4 §5.4 implements exactly this: `<Button variant="outline" min-h-[56px]>`.
That's 56px, not 60px. Same issue as the Scan Barcode button.
Status: **❌ 56px in both Phase 3 and Phase 4 spec — both documents have this wrong. The
"Correct Aircraft Times" button is safety-critical navigation for correcting wrong aircraft hours
before an RTS. It gets 60px like everything else.**

**Step 4 — `RtsStatementEditor` textarea:**
Phase 4 §5.5: `min-h-[160px]`, `font-size: 16px`. Status: **✅ Specified.**

**Step 5 — "Sign and Return to Service" button:**
Phase 4 §5.6: `h-[64px]`, full-width, `variant="danger-confirm"`. Status: **✅ Compliant.**

**Step 5 — Auth method selector tabs (PIN / Face ID / Password):**
Phase 3 §2.6: `⚠️ Increase to 60px height`. Phase 4 does not re-specify the tab row height.
Status: **⚠️ Inherited gap from Phase 3 — implement `min-h-[60px]` on the auth method tab row.**

**Step 6 — Final acknowledgement + submit:**
Phase 4 §5.7: `RequiredAcknowledgement min-h-[60px]`, `"Issue Return to Service" h-[64px]`.
Status: **✅ Both specified.**

---

## Section 2: iPhone Safari Sign-Off Flow Verification

Phase 3 §3 is my full walkthrough. I'm checking Phase 4 §5 against it.

### 2.1 Layout — What Phase 4 Gets Right

Phase 4 §5.1 explicitly implements: no left step sidebar, top progress bar (4px), "Step N of 6"
label, full 375px width. All CTAs sticky at bottom with `env(safe-area-inset-bottom)` padding.
This is directly from my Phase 3 §3.1 spec. **Confirmed implemented in Chloe's spec. ✅**

The `useRtsWizard()` hook holds wizard state in component state, not URL params. If the user
navigates away and back, the wizard resets to Step 1. Phase 3 §3.1 flagged AD compliance "Fix"
links opening as modal sheets rather than full navigation to preserve wizard state. Phase 4 §5.2
partially addresses this: "blocking links to AD compliance open a modal sheet." **Partially ✅ —
the spec covers AD compliance links. It does not explicitly cover what happens when the "→ Fix"
link for a blocking task card opens. Does it navigate to the task card detail (losing wizard
state) or open a sheet? This needs to be specified.**

### 2.2 iOS Safari-Specific Requirements — Status Check

| Phase 3 Safari Requirement | Phase 4 Implementation | Status |
|---|---|---|
| `100dvh` instead of `h-screen` across all layouts | Not explicitly stated in Phase 4 spec — inherited from Phase 3 checklist item | ⚠️ Assumed, not confirmed |
| Sticky CTAs above browser chrome (`env(safe-area-inset-bottom)`) | Phase 4 §5.1: explicitly stated | ✅ |
| `font-size: 16px` on all inputs (anti-zoom) | Phase 4 §5.3 (recipient field), §5.5 (RtsStatementEditor) — two confirmed | ✅ Step 2 and Step 4 |
| `visualViewport` resize listener for keyboard in Step 4 | Phase 4 §5.5: explicitly specified | ✅ |
| Sticky CTA moves UP with keyboard (not hidden behind it) | Phase 4 §5.5 implies via `visualViewport` handling | ✅ Implied |
| iOS auto-zoom prevention on recipient name field | Phase 4 §5.3: `h-[60px]`, `font-size: 16px` | ✅ |
| `autoCorrect="off" autoCapitalize="words"` on recipient name | Phase 4 §5.3 explicitly states this | ✅ |
| Face ID via `isUserVerifyingPlatformAuthenticatorAvailable()` async check | Phase 4 §5.6: explicitly implemented | ✅ |
| PIN input as `type="tel" inputMode="numeric"` | Phase 4 §5.6: explicitly implemented | ✅ |
| Press-and-hold 1.5s on "Sign and Return to Service" | Phase 4 §5.6: `onPointerDown` → 1.5s timer → `conic-gradient` | ✅ |
| `navigator.vibrate(200)` on hold completion | Phase 4 §5.6: explicit | ✅ |
| `overscroll-behavior: contain` on inner scroll containers | Not mentioned in Phase 4 spec | ❌ Gap |
| Success → persistent banner (not toast) at `/work-orders/[id]?rts=success` | Phase 4 §5.7: explicitly specified | ✅ |
| Mutation error → full-screen `<GroundedBanner>` (not toast) | Phase 4 §5.7: explicitly specified | ✅ |
| Back swipe gesture testing on every sheet/modal | Phase 4 cross-cutting checklist: not listed | ❌ Gap |
| `AircraftSummaryCard` → `grid-cols-1` on mobile (not 3-col) | Phase 4 §5.2: "Mobile: `grid-cols-1` with `divide-y`" | ✅ |
| `TaskCardStatusGrid` → stacked card list (no table element) | Phase 4 §5.2: explicitly stated | ✅ |
| `MaintenanceRecordList` → card list (no table) | Phase 4 §5.2: explicitly stated | ✅ |
| JetBrains Mono verified loading on iOS Safari | Not mentioned in Phase 4 spec (Phase 3 §3.2 flagged this) | ❌ Gap |
| RTS template tokens `[YOUR NAME]` / `[CERT #]` as inline content (NOT HTML placeholder) | Phase 4 §5.5: explicitly specified | ✅ |
| Character count at top-right of textarea (not below, keyboard-hidden) | Phase 4 §5.5: explicitly specified | ✅ |
| `RtsPreviewCard` in `max-h-[50vh]` scrollable container with sticky submit | Phase 4 §5.7: explicitly specified | ✅ |

**Three gaps on iPhone Safari:**
1. `overscroll-behavior: contain` not mentioned in Phase 4 pages. Phase 3 Appendix B lists it
   as required mitigation. Add to the Phase 4 cross-cutting checklist.
2. Back swipe gesture testing: Phase 3 Appendix B flags this. Not in Phase 4 checklist. Every
   bottom sheet and modal in the wizard must be tested for iOS back swipe behavior — the RTS
   wizard bottom sheets (StepSignOffModal, NaReviewModal, PartReference detail) can all
   conflict with the iOS back swipe if `history.pushState` is used naively.
3. JetBrains Mono font load on iOS Safari: Phase 3 §3.2 flagged this explicitly. Phase 4 never
   picks it up. The Aircraft Times step (Step 3) renders time values in JetBrains Mono. If the
   font fails to load on iOS Safari, the times render in the system fallback font — readable but
   unvalidated. Low priority but still a gap.

### 2.3 What's Different From Phase 3 (Expected Deltas)

One intentional delta that Phase 4 introduces over Phase 3: **the wizard state does not persist
across navigation.** Phase 3 §3.2 mentions `router.back()` to return to wizard state after fixing
a blocker, but Phase 4 is explicit that the wizard resets to Step 1 on re-entry. This is the
correct conservative choice — stale data in a six-step regulatory form is worse than asking the
inspector to scroll through Step 1 again. I agree with Chloe's decision. **Not a gap; a deliberate
safer choice. ✅**

---

## Section 3: Hangar Floor UX Verification

### 3.1 Use Case A — Complete a Task Card Step (Ray, AMT, iPhone 13, inside hangar)

**Phase 3 flow:** Phase 3 §5.1 lays out 8 steps from opening the WO list to the step row updating
with Ray's signature. Phase 4 pages must deliver every one of those steps.

**Step 1 (WO list → WO detail):** Work Order Detail page now exists (B-P3-04 resolved). The WO
list route was already present in Phase 3. This was the critical missing link. **✅ Unblocked.**

**Step 3 (Task card detail, single-column, step list at top):** Phase 4 §2.2 matches Phase 3 §5.1:
`TimeEntryWidget` first, then step list, then PartReference accordion. **✅ Layout correct.**

**Step 4–5 (Tap step row → `StepSignOffModal` as bottom sheet on mobile):** Phase 4 §2.3: "tap
anywhere on a `pending` or `in_progress` step row → `<StepSignOffModal>` opens as a bottom sheet
on mobile." **✅ Specified.**

**Step 5 (`requiresDualSignOff` flow / ratings control):** Phase 4 §2.3–§2.4 wire
`completeStep` and `counterSignStep` per FE-01. The ratings control is in "unconfirmed" state
(dashed border) until confirmed — this is in the Phase 4 cross-cutting checklist §6. **✅**

**Step 7 (optimistic update / server confirmation):** Phase 4 §2.3: "No optimistic update on
sign-off. Button loading state: spinner inside same button dimensions." This is a divergence from
Phase 3 §5.1 which mentions an immediate optimistic step-checkbox update. Phase 4's conservative
choice (no optimistic update on a legally binding sign-off) is correct. The visual experience is
slightly slower (the step row doesn't flip immediately) but is safer. **Acceptable delta. ✅**

**Friction remaining on Use Case A:**
- The `StepNAButton` height gap (⚠️ 44px) from Section 1.2 is friction. If Ray mis-taps and
  accidentally hits N/A on a step, the recovery path (IA review required for N/A) is significant.
  This is the exact scenario where 44px creates operational problems, not just compliance gaps.
- The TimeEntryWidget redesign (Section 1.2 ❌) is friction for time logging. If Ray tries to log
  time between steps via stepper buttons at 40px on an iPhone 13 with a gloved hand, he will
  mis-tap. The Phase 4 spec does not implement the Phase 3 bottom-sheet numeric keypad for time
  entry. This is the outstanding gap I'm most worried about for actual hangar use.

---

### 3.2 Use Case B — Receive a Part (Carlos, Parts, Android Chrome, Galaxy A54, outdoor)

**Phase 3 flow:** Phase 3 §5.2 defines the FAB → bottom sheet → field sequence → receiving success
sheet flow. Phase 4 §3.1 implements this.

**FAB and entry:** Phase 4 §3.1 matches exactly — FAB at bottom-right, `min-w-[60px] min-h-[60px]`,
rounded-full. Full-screen bottom sheet on mobile. **✅**

**Field sequence:** Phase 4 introduces a critical improvement over Phase 3: `documentationType`
is now the FIRST field in the form (before Part Number even). Phase 3 §5.2 had documentation type
later in the form ("8130-3 present toggle: if YES…"). Phase 4 promotes it to gate the rest of the
form — which is the correct UX for regulatory compliance. A form that collects P/N before asking
about docs can lead to a submitted receive where the doc type was forgotten. **Improvement over
Phase 3. ✅**

**Quarantine Intake branch:** Phase 4 §3.1 implements the amber-dominant quarantine header change.
Phase 3 §5.2 didn't fully specify the quarantine branch UX. Chloe's spec is more complete here.
**Phase 4 improves on Phase 3. ✅**

**"No Documentation" → inventory fields hidden, quarantine reason field shown:** Phase 4 §3.1. **✅**

**Optional / Life Tracking accordion:** Phase 4 §3.1 correctly collapses this by default.
Phase 3 §5.2 mentioned it. **✅**

**Native date picker for shelf-life dates:** Phase 4 §3.5: `<input type="date">` — native mobile
picker. **✅**

**Friction remaining on Use Case B:**
- The "Scan Barcode" button at `min-h-[56px]` (❌ 4px short). Low friction in absolute terms but
  non-compliant. Carlos is outside in an open receiving area — arguably better conditions than
  the hangar interior, but 56px is still wrong.
- The barcode parsing path (`@zxing/browser` or equivalent WASM) is described in Phase 3 as the
  "enhancement layer." Phase 4 inherits this — it's not the primary path for alpha. Fine. But
  the failure state ("Barcode not recognized — enter manually") from Phase 3's [FC] annotation
  is still unspecified in Phase 4. If Carlos scans a barcode on a part box and the WASM parser
  fails silently (no error state, just… nothing), he doesn't know whether to try again or type.
  This needs a defined error state even for the alpha.
- `tagReason` on `<RemoveAndRedTagModal>` is free-text required. On Android Chrome, the keyboard
  UX is more predictable than iOS Safari, so Carlos's workflow here is cleaner. No friction noted
  for the primary Use Case B path.

---

### 3.3 Use Case C — Look Up AD Status (Sandra, DOM, iPhone 14 Pro, shop office doorway)

**Phase 3 flow:** Phase 3 §5.3 describes Sandra navigating MobileTabBar → Fleet → Aircraft detail
→ Schedule → AD compliance section. Use Case C goes through the Fleet route, not the Compliance
route. Phase 4 §4 builds the `/compliance/ads` dashboard — a dedicated compliance route.

**Navigation path:** Sandra can reach AD status via two routes: the Fleet schedule page (Phase 3's
described path) OR the new Compliance → ADs dashboard (Phase 4 new page). Phase 4 doesn't spec
a `/fleet/[tailNumber]/schedule` page — that's not one of the five Phase 4 pages. So Use Case C's
Phase 3 path (Fleet → Aircraft detail → Schedule) assumes a page that isn't built yet in Phase 4.
**The Use Case C path through Fleet is still blocked by a missing fleet detail/schedule page.**

However, Sandra can achieve the same goal via the Phase 4 AD Compliance Dashboard
(`/compliance/ads`) with the aircraft filter. The Phase 4 dashboard is more capable than the Fleet
schedule sub-page for the specific use case of checking one aircraft's AD status. The filter chips
let her select by status (All / Overdue / Due Soon…). The real-time Convex subscription means she
sees live AD status.

**Friction on the Phase 4 AD Dashboard path for Use Case C:**
Sandra's Use Case C flow: MobileTabBar → "More" drawer → Compliance → ADs → filter/search for
N-441EC → check status. The "More" drawer adds one tap vs. the Fleet tab direct navigation from
Phase 3. Not significant friction, but worth noting.

**Filter chips `min-h-[44px]`:** Phase 4 §4.2. Per Phase 3 §5.3: "If they're smaller than 44px
height, add padding." Phase 4 matches. **✅ Acceptable.**

**AD detail sheet — "Share" button → Web Share API → iOS native share sheet:** Phase 4 §4.6
explicitly implements this. Phase 3 §5.3 described it. **✅**

**Overdue non-dismissible red banner:** Phase 4 §4.2 explicitly implements. Phase 3 §5.3 required
it. **✅**

**AD card at 375px — two-line layout (AD number + badge on line 1, description on line 2):**
Phase 4 §4.2 says "AD number in `font-mono text-base`" and "short description (2 lines max,
truncated)." Finn's [FINN] annotation in Phase 4 confirms the two-line layout at 375px.
Phase 3 §5.3 [FC] annotation required this. **✅ Specified.**

**AD card `min-h-[60px]`:** ❌ Flagged in Section 1.4. This is friction for Use Case C — Sandra
tapping a specific AD card on a list of 15–20 ADs while standing in a doorway with one hand.

**Pre-computed `adComplianceStatus` on server:** Phase 4 §4.1: `checkAdDueForAircraft` returns
computed `isOverdue`, `isDueSoon`, `hoursRemaining`, etc. Phase 3 §5.3 required server-side
computation. **✅** Real-time subscription via Convex live query when aircraft TT updates from
RTS mutation. Sandra sees current status without refresh. **✅**

---

## Section 4: OfflineBanner Implementation Check

### 4.1 Offline Detection Hook

Phase 3 §4.2 specifies `useConnectivity()` with three signals: `navigator.onLine`, Convex
`isWebSocketConnected`, and mutation heartbeat (passive). The staging deployment uses
`athelon-staging` Convex which has WebSocket connectivity — the `useConvexConnectionState()` hook
is available in Convex 1.x per Jonas's deployment runbook (Phase 3 explicitly names this API).

Phase 4 §5.1 references `useConnectivity().isOffline` for the wizard offline block. Neither
Phase 4 spec section explicitly re-states the `useConnectivity()` hook implementation — it's
inherited from Phase 3 §4.2. **The hook spec exists. Whether it's implemented is an implementation
detail; the spec is complete.**

### 4.2 OfflineBanner Wiring — Page-by-Page

| Page | OfflineBanner Specified? | Location in Spec |
|---|---|---|
| Work Order Detail | Implicit — Phase 4 §1.6 says "All five pages tested offline" in checklist | ⚠️ Not explicitly wired in spec; must be in layout |
| Task Card Detail | Not explicitly mentioned in §2 | ⚠️ Not wired in spec |
| Parts Receiving (`/parts/receiving`) | Not explicitly mentioned in §3.5 | ⚠️ Not wired in spec |
| Parts Inventory (`/parts/inventory`) | Not explicitly mentioned in §3.5 | ⚠️ Not wired in spec |
| AD Compliance Dashboard | Not explicitly mentioned in §4.6 | ⚠️ Not wired in spec |
| RTS Sign-Off Wizard | Phase 4 §5.1: `useConnectivity().isOffline` blocks every "Continue" button | ✅ Specified |

**The OfflineBanner is specified at the wizard level but only implicitly present on the other four
pages via the Phase 4 cross-cutting checklist item: "All five pages tested offline." This is
underspecified.** The OfflineBanner renders above `MobileTabBar` (per Phase 3 §4.3) in the layout
— meaning if it's wired at `(app)/layout.tsx` level, it appears on all pages automatically. If
Chloe wires it at the layout level, all five pages get it without page-level wiring. This is the
correct implementation pattern. But Phase 4 doesn't state that the layout-level wiring exists.
**Flag: confirm `OfflineBanner` is wired in `(app)/layout.tsx` with the `useConnectivity()`
hook, not per-page.**

### 4.3 Operations Correctly Blocked Offline

| Operation | Page | Phase 4 Status |
|---|---|---|
| RTS wizard "Continue" (all steps) | Sign-Off Wizard | ✅ Phase 4 §5.1 explicit |
| Part installation (`installPart`) | Parts Inventory | Phase 4 §3.3: no optimistic update, hard block before confirm button — offline behavior not stated. Should block. ⚠️ |
| Part removal + red tag | Parts Inventory | Phase 4 §3.4: button fires two mutations in sequence — if offline, first mutation fails. Not addressed in spec. ⚠️ |
| `receivePart` mutation | Parts Receiving | Not addressed in Phase 4 §3.1. ⚠️ |
| Creating new squawks | Outside scope of Phase 4 pages but Phase 3 §4.4 blocks this | N/A |
| Task card step sign-off | Task Card Detail | Phase 4 §2.3 references `completeStep` — no optimistic update is specified but offline behavior not explicitly blocked in the spec. ⚠️ |
| Counter-sign step | Task Card Detail | Same. ⚠️ |
| `recordAdCompliance` | AD Compliance Dashboard | Requires `<ReAuthModal>` which requires `signatureAuthEvent` from Convex WebSocket. Cannot succeed offline. Phase 4 doesn't explicitly block the button. ⚠️ |
| Note drafting (queued) | Not a Phase 4 page | Phase 3 §4.4 specifies queuing. |
| Time log entries (queued) | Task Card Detail | Phase 3 §4.4 specifies retry queue; Phase 4 doesn't re-specify. ⚠️ |
| Reading loaded data | All pages | ✅ Phase 3 standard: data in React tree remains readable. |

**Conclusion on OfflineBanner:** The wizard is the one place Phase 4 explicitly handles offline.
For every other page with write operations, offline behavior is unspecified. Phase 3 §4.4 covers
the policy — Chloe's Phase 4 pages inherit it. But the "inherit it" assumption is the gap. Before
alpha, `installPart`, `removePart`, `tagPartUnserviceable`, and `completeStep` must have offline
guards applied from `useConnectivity().isOffline`. This is a clear alpha bug class: a mechanic
taps "Confirm Install" while offline, the mutation enqueues (or silently fails, depending on
Convex's offline behavior), and the UI gives no feedback. That's a traceability problem.

---

## Section 5: Tanya's Mobile Sign-Off

### 5.1 Formally Signed Off as Mobile-Ready for Alpha

The following are verified against Phase 3 standards and Phase 4 spec with no blocking gaps:

**RTS Sign-Off Wizard — iPhone Safari flow.**
Chloe implemented the Safari-specific requirements more completely than any other section of
Phase 4. `visualViewport` keyboard listener on Step 4, press-and-hold on Step 5, Face ID
async check, PIN numeric keyboard, sticky CTAs with safe-area inset, success persistent banner,
full-screen `GroundedBanner` on failure. The wizard on iPhone Safari is the most complete mobile
implementation in the codebase. I sign this off for alpha with the two minor gaps (56px buttons
→ 60px, `overscroll-behavior`) on a fix-before-beta basis.

**Parts Receiving Form — primary manual-entry path.**
FAB, full-screen bottom sheet, `documentationType` as the gating first field, quarantine branch
with dominant amber visual, native date picker for shelf-life, accordion for optional fields.
The receiving flow for the primary use case (Carlos, outdoor, Android Chrome) works as designed
for alpha.

**AD Compliance Dashboard — read path and status display.**
Real-time Convex subscription for live AD status. Server-computed compliance status (not client-
computed). Overdue non-dismissible red banner. Two-line card layout at 375px. Filter chips. Web
Share API for DOM quick-status sharing. Sandra's use case is covered for alpha via this dashboard,
even though the Fleet schedule page isn't built yet.

**Work Order Detail Page — existence.**
B-P3-04 blocked all downstream work. It's resolved. The page exists. The tab bar scrolls on mobile.
The Close Readiness Panel exposes the sign-off entry point. The live `StatusBadge` in the header
updates in real time. Sign off: the page is mobile-ready for alpha as a navigation hub.

**Phase 3 offline philosophy — correctly inherited.**
The spec doesn't block writes optimistically. Sign-off mutations don't queue silently. Time log
entries and note drafts queue for retry. The offline-first mindset from Phase 3 is present in
Phase 4's architecture.

---

### 5.2 Must-Fix Before Beta

These are not blockers for alpha with one shop using clean hands in a warm office. They are
blockers before we put this in front of mechanics doing real hangar work.

1. **TimeEntryWidget mobile redesign (Phase 3 §6.3 / Phase 4 §2.2 gap).**
   The ±stepper buttons at 40px are unacceptable in a production hangar environment. The Phase 3
   spec called for a bottom sheet numeric keypad. Phase 4 didn't implement it. This is the single
   highest-priority mobile UX fix before beta. I will write the Figma spec for it in the Phase 5
   sprint.

2. **OfflineBanner explicit wiring for all write operations.**
   `installPart`, `removePart`, `tagPartUnserviceable`, `completeStep`, and `counterSignStep`
   must be gated behind `useConnectivity().isOffline` with inline disabled states before beta.
   Right now only the RTS wizard has this. It needs to be everywhere a mutation fires.

3. **AD card rows `min-h-[60px]`.**
   The AD compliance dashboard is the DOM's decision-making surface before approving a ferry
   flight. Tappable rows that render at content height (which can be 40–48px for a short
   description) are a usability failure on that surface.

4. **Blocker links on Close Readiness Panel — full-width chip pattern.**
   Inline text links as blockers on a pre-sign-off panel are too small to tap reliably. Must be
   the amber chip pattern from Phase 3 §3.1.

5. **Back swipe gesture test coverage.**
   Every bottom sheet in the workflow (StepSignOffModal, NaReviewModal, ReceivingForm,
   RemoveAndRedTagModal, AD detail sheet) needs explicit iOS back swipe testing. This should be
   a test case in Cilla's Phase 4 test suite before beta.

---

### 5.3 One Thing I'm Accepting Under Protest

**The "Fix This" / "← Correct Aircraft Times" button at `min-h-[56px]`.**

It's in both my Phase 3 spec AND Chloe's Phase 4 spec at 56px. I wrote it wrong in Phase 3 §2.4.
Chloe copied it correctly from my own document. So I have no one to blame but myself, and I'm
flagging it here so someone changes it to 60px during implementation before I have to watch a
inspector tap the wrong thing on an aircraft times correction step at the end of a 6-step RTS
wizard and then tell me the form was designed to spec.

This button corrects wrong aircraft total time before an RTS is issued. It is safety-critical. It
should be 60px. It was 56px in my spec because I was trying to visually differentiate a secondary
"correction" action from a primary "continue" CTA and I picked the wrong number. The correct
approach is to differentiate it via color and label, not by making it shorter. The height is 60px.
Every interactive element on this form is 60px. This one is not. That's wrong and I'm accepting
it for alpha under protest, with the expectation that it is corrected to `min-h-[60px]` before
any shop with a fleet older than 2010 touches this screen.

I own that mistake.

---

*Tanya Birch — Mobile Engineer*
*2026-02-22*
*Phase 4 Mobile Verification — Athelon Aviation MRO SaaS*
*Verification environment: `athelon-staging` (Jonas's deploy, B-P3-01 resolved per convex-deployment.md §2)*
*Next: Implementation team addresses must-fix list. TimeEntryWidget mobile spec in Phase 5 sprint.*
*Beta readiness re-check required after items 5.2.1–5.2.5 are implemented.*
