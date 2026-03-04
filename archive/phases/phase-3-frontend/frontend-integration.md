# Athelon — Phase 3 Frontend Integration Specification
**Authors:** Chloe Park (Frontend Engineer) · Finn Calloway (UX/UI Designer, annotations marked `[FINN]`)
**Date:** 2026-02-22
**Status:** AUTHORITATIVE — Phase 3 integration implementation begins against this document
**Depends On:** frontend-architecture.md · mutation-implementation.md · auth-platform-wiring.md · mobile-adaptation.md · compliance-validation.md · signoff-rts-flow.md
**Resolves:** FE-01 (multi-inspector dual sign-off UX) · OI-03 (Clerk→Convex→frontend push) · OI-05 (wizard UX)

---

> *Phase 2 was spec. Phase 3 is wiring. The difference is that every "call the mutation" in Phase 2 is now a real `useMutation` call with a real error code from Devraj's implementation spec, and every loading state has a mobile touch target attached to it. This document bridges those worlds. I'm writing it so a developer picking up any one of the five smoke test paths can follow the thread from the user's tap to the Convex audit log entry without having to triangulate across five other docs. — CP*

---

## Section 1: Integration Architecture

### 1.1 What Changed from Phase 2 to Phase 3

Phase 2 frontend-architecture.md specced the provider setup, query hooks, and component plan against an abstract mutation layer. The mutation-implementation.md now gives us the real guard sequences, real error codes, and real auth wrapper requirements. Three things changed materially:

**1. orgId is never a frontend argument.** Phase 2 had a note about this; Phase 3 makes it structural. Every `useMutation` call in the codebase passes only entity IDs and business arguments. `orgId` is derived from the Clerk JWT `org_id` claim on the Convex server via `requireOrgMembership()`. Any form, hook, or component that was going to pass `organizationId` as a mutation arg is wrong. Remove it.

**2. `signatureAuthEvent` management is a first-class frontend concern.** Phase 2 noted "Jonas proposes a Convex useQuery poll" as the mechanism for surfacing `signatureAuthEventId` to the sign-off flow. That is now resolved: the mechanism is `useSignatureAuthEvent()` (auth-platform-wiring.md Section 4.2) — a Convex reactive subscription, not a poll. The hook mounts when the user submits re-auth credentials, and the eventId arrives via Convex WebSocket push in ~200ms on a normal connection. This matters for every signing mutation in the system.

**3. Ratings-exercised (RQ-05) is now a required UI control.** In Phase 2 the ratings field was specced as a mutation argument. Phase 3 makes it a required user interaction — the technician must explicitly select their rating from a two-option control (Airframe / Powerplant / Both / None for inspection-only work). System may pre-populate from `taskCard.taskType` but the technician must touch the control to confirm. This changes the `StepSignOffModal` and the `counterSignStep` flow.

### 1.2 Real Call Sites — How Each Mutation Connects

**Core pattern:** all mutations are called via `useMutation` from `convex/react`. Each mutation hook is wrapped in a domain-specific custom hook that handles loading state, error mapping, and any optimistic updates. No component calls `useMutation` directly — it goes through the hook layer.

```
Component
  → domain hook (e.g., useCompleteStep, useAuthorizeRts)
    → useMutation(api.taskCardSteps.completeStep)
      → Convex server guard sequence (ordered, auth-first)
        → audit log write (same transaction)
        → result / typed ConvexError
  → error handler (maps code → user-facing message)
  → UI state update
```

**`callerTechnicianId` resolution:** This is passed as a mutation argument from every signing call site. The hook resolves it client-side from a Convex query (`api.technicians.getForCurrentUser`) which runs once at session start and is cached in React context via a `TechnicianProvider`. The JWT subject is a Clerk user ID, not a Convex document ID — this bridge query is how we go from `identity.subject` to `technician._id`. Once resolved, it sits in context for the session.

### 1.3 Optimistic Update Decisions — Per Mutation

The Phase 2 spec established the general rule: high-frequency low-risk writes get optimistic updates; signing and inventory mutations do not. Phase 3 makes this precise for every mutation in Devraj's spec.

| Mutation | Optimistic Update? | Reasoning |
|---|---|---|
| `logTime` | **Yes** | High-frequency, roll back on error; no legal record |
| `addStepNote` | **Yes** | Low-risk, narrative content |
| `markStepInProgress` | **Yes** | Cosmetic state, not a signature |
| `interruptStep` | **No** | Creates a `taskCardInterruptions` record — BP-01 depends on this being authoritative |
| `resumeStep` | **No** | Closes an interruption record — must be server-confirmed |
| `completeStep` | **No** | Regulatory signature. Must reflect confirmed server state. |
| `counterSignStep` | **No** | Same — dual-sign record is a legal document |
| `reviewNAStep` | **No** | IA regulatory decision — no optimism |
| `voidTaskCard` | **No** | Permanent status transition, supervisor-level |
| `createWorkOrder` | **No** | Assigns server ID immediately; downstream depends on it |
| `openWorkOrder` | **No** | State transition — other users' subscriptions depend on accuracy |
| `placeWorkOrderOnHold` | **No** | Status transition visible to others in real time |
| `addTaskCard` / `createTaskCard` | **No** | Server ID required before steps can be attached |
| `receivePart` | **No** | Creates inventory record — server ID required |
| `installPart` | **No** | Inventory and traceability state must be authoritative |
| `authorizeReturnToService` | **No** | Terminal legal record — never optimistic |

[FINN] The principle here is sound but I want to name the design implication: every "No" mutation above means there is a loading state between the user's action and the UI update. That loading state must be designed, not defaulted. A 24px spinner replacing a full-width button is not a designed loading state — it's a placeholder. Every one of these "No" mutations gets a specific loading treatment in the component spec.

### 1.4 Real-Time Subscription Strategy

`useQuery` is a live reactive subscription. We exploit this deliberately:

- **Dashboard:** `listActiveWorkOrders`, `getAttentionQueue`, `listOpenSquawks` — all live. Sandra's screen updates when Ray signs TC-007.
- **WO Detail:** `getWorkOrder(workOrderId)` — status badge updates in real time when WO transitions (e.g., `in_progress` → `pending_signoff` when the last task card is signed off).
- **Task Card List:** `listTaskCardsForWorkOrder(workOrderId)` — card status updates live when any technician completes a step.
- **Sign-Off Wizard Step 1:** all queries pre-loaded before the wizard mounts. The wizard does NOT re-subscribe mid-flow. Once the inspector enters the wizard, the state is snapshotted in component state. Live updates to the underlying data do not disrupt the wizard mid-flow. This is a deliberate UX decision: an in-flight RTS sign-off is not a place for live surprises.

**What does NOT get live subscription:**
- The six-step RTS wizard's precondition data. Snapshots at wizard entry. Stale-data scenarios (e.g., another technician voids a task card while the IA is mid-wizard) are caught by the final `authorizeReturnToService` guard sequence — the mutation is the authoritative check, not the wizard's UI state.
- Print/PDF views. These are one-shot renders from a query at render time, not live.

### 1.5 `TechnicianProvider` — Session Bridging

The JWT subject is a Clerk user ID (`user_2abc…`). Every signing mutation requires a Convex `technician._id`. We resolve this once at session start via `TechnicianProvider`:

```
ConvexProviderWithClerk
  └─ TechnicianProvider
      → api.technicians.getForCurrentUser (useQuery, live)
      → exposes { technicianId, certNumber, role, ratings } via React context
      → if undefined: loading (skeleton app shell)
      → if null: <NoTechnicianRecord> error state — cannot proceed
```

Every hook that fires a signing mutation reads `technicianId` from this context. No mutation call site resolves it independently. If the technician record goes inactive mid-session (e.g., DOM revokes access), the next `useQuery` re-render of `getForCurrentUser` returns `null` and `TechnicianProvider` transitions to the error state. The mutation server guard (`TECHNICIAN_NOT_ACTIVE_IN_ORG`) is the real security backstop — the provider transition is UX early-warning.

---

## Section 2: Five Smoke Test Screens

### Path 1: Sign-In + Org Switch

**Screens involved:**
- `(public)/sign-in/[[...sign-in]]/page.tsx` — Clerk `<SignIn />` hosted component
- `(app)/layout.tsx` — org context check and redirect logic
- `AppHeader` — `StationSwitcher` component (org selector)
- `/dashboard` — role-gated landing target

**Convex queries/mutations wired:**
- `useConvexAuth()` — determines auth loading state before rendering the app shell
- `api.technicians.getForCurrentUser` — resolves `technicianId` for `TechnicianProvider`
- `api.workOrders.listActive` — first live query on dashboard; confirms org-scoped data loads

**Flow:**
1. User hits `(app)/` unauthenticated → Clerk middleware fires, redirects to `/sign-in`.
2. Clerk `<SignIn />` handles authentication. On success, Clerk issues JWT with `org_id` (if user has one active org) or without `org_id` (if user belongs to multiple orgs or none).
3. If `org_id` missing from JWT: `requireOrgContext()` would throw `NO_ORG_CONTEXT` on any query. Before we get there, `(app)/layout.tsx` detects missing org context and renders `<OrgSwitcherPrompt>` — Clerk's `<OrganizationSwitcher>` embedded in a centered card. User selects org → JWT refreshes → `org_id` present → layout proceeds.
4. With org context: layout renders `AppSidebar` (desktop) or `MobileTabBar` (mobile). `StationSwitcher` in `AppHeader` shows the active org name and an affordance to switch.
5. `TechnicianProvider` fires `api.technicians.getForCurrentUser`. If technician record not found: `<NoTechnicianRecord>` — "Your account is not linked to a technician record. Contact your DOM." (This is an edge case but it must be handled — a Clerk user with no linked technician cannot use any signing mutation.)
6. Role-gated redirect: after technician resolves, `useOrgRole()` reads `athelon_role` from JWT claims. AMT → `/work-orders`. Inspector/Supervisor → `/work-orders`. DOM → `/dashboard`. The redirect happens once at session start via a `useEffect` in `(app)/layout.tsx`.

**Loading states:**
- `useConvexAuth().isLoading === true` → `<GlobalLoadingSpinner />` (full-screen, replaces layout)
- `useConvexAuth().isAuthenticated === false` → null (Clerk middleware handles redirect; this state should be transient)
- Org context missing → `<OrgSwitcherPrompt>` (blocks app shell, not an error state)
- Technician query `undefined` → skeleton header + sidebar (app shell renders, content deferred)

**Edge cases:**
[FINN] The `StationSwitcher` in `AppHeader` is a critical UI element that almost never gets tested. If a user belongs to two orgs (e.g., the DOM at a main shop who also owns a satellite facility), the switcher must show their current org with a clear affordance to switch. The active org name truncates at 24 characters on mobile — test with "Lakewood Air Maintenance LLC" (28 chars). Truncate with ellipsis, not wrap. The station name must not push the notification bell off-screen on a 375px viewport.

---

### Path 2: Create and Open a Work Order

**Screens involved:**
- `/work-orders/new/page.tsx` — `CreateWorkOrderForm`
- `/work-orders/[workOrderId]/page.tsx` — WO detail (task cards tab, default)
- `WorkOrderHeader` component in `[workOrderId]/layout.tsx`

**Convex mutations wired:**
- `api.workOrders.create` → `createWorkOrder`
- `api.workOrders.open` → `openWorkOrder` (transitions `draft` → `open`)

**Convex queries wired:**
- `api.workOrders.get(workOrderId)` — powers `WorkOrderHeader` and page content
- `api.fleet.listAircraft` — populates aircraft selector in form
- `api.taskCards.listForWorkOrder(workOrderId)` — task card list (initially empty)

**Flow:**
1. User navigates to `/work-orders/new`. Form renders: aircraft selector, work order type, description, priority, `aircraftTotalTimeAtOpen`, optional target date, squawks field. All validated via `createWorkOrderSchema` (Zod — lib/validators/workOrder.ts).
2. `aircraftTotalTimeAtOpen` is a required numeric field. We display the aircraft's last known TT (`aircraft.totalTimeAirframeHours`) as a reference below the field — pre-populates the input but the technician must confirm it is current.
3. On submit: `createWorkOrder` fires. No optimistic update. Button shows loading state: full-width button collapses to a `<Spinner>` inside the same button width (button height preserved — no layout shift). On success: Convex returns the new `workOrderId`. Router pushes to `/work-orders/[workOrderId]`. The WO is in `draft` status.
4. On the WO detail page: `WorkOrderHeader` renders the `StatusBadge` in `draft` variant. A contextual `<DraftWorkOrderBanner>` renders above the task card list: "This work order is a draft. Open it to begin work." with an "Open Work Order" primary action button.
5. "Open Work Order" calls `openWorkOrder`. Guard: `status === "draft"`. On success: status transitions to `open`, `StatusBadge` updates in real time via Convex subscription, `DraftWorkOrderBanner` unmounts (the query result changed and the component re-renders with the new status).
6. WO is now open. The task card tab shows `<EmptyState label="No task cards yet" cta="Add Task Card" />`.

**Loading states:**
- Form submission: button loading state (no optimistic UI)
- WO detail initial load: `useWorkOrder` returns `undefined` → `<WorkOrderSkeleton />` (full-page skeleton matching the real layout)
- WO not found (`null`): `<NotFoundState label="Work order not found" />` with back navigation

**Error states:**
- `WO_AIRCRAFT_NOT_FOUND` → "The selected aircraft no longer exists. Refresh and try again."
- `WO_AIRCRAFT_NOT_ACTIVE` → "This aircraft has been marked inactive. Contact your DOM."
- `TECHNICIAN_NOT_ACTIVE_IN_ORG` → "Your technician record is inactive. Contact your DOM."

[FINN] The `aircraftTotalTimeAtOpen` field is the most error-prone field in the entire form. Mechanics transpose digits. The field needs a sanity range check in the Zod schema (`min: 0, max: 99999.9`) and an inline reference display ("Aircraft record shows: 4,823.4 hrs — last updated [date]"). If the entered value differs from the aircraft record by more than 50 hours, render an inline amber warning: "Entered time differs significantly from aircraft record. Verify logbook." Not a block — a warning. The backend does not have this check; this is frontend-only UX scaffolding.

---

### Path 3: Add Task Card + Sign Steps

**Screens involved:**
- `/work-orders/[workOrderId]/tasks/new/page.tsx` — `AddTaskCardForm`
- `/work-orders/[workOrderId]/tasks/[taskCardId]/page.tsx` — task card detail
- `StepSignOffModal` — bottom sheet (mobile) / dialog (desktop) for step completion

**Convex mutations wired:**
- `api.taskCards.add` → `addTaskCard` (links an existing task card template)
- `api.taskCards.create` → `createTaskCard` (creates new task card from scratch)
- `api.taskCardStepAssignments.assign` → `assignStep`
- `api.taskCardSteps.complete` → `completeStep`
- `api.taskCardStepCounterSignatures.create` → `counterSignStep`

**Convex queries wired:**
- `api.taskCards.get(taskCardId)` — powers task card detail
- `api.taskCardSteps.listForCard(taskCardId)` — live step list
- `api.technicians.getCertificateForCurrent` — provides cert data for ratings display in modal

**Flow:**
1. From the WO detail, "Add Task Card" navigates to `/tasks/new`. Form: task card number, title, reference data (AMM chapter / AD number), `taskType` (airframe / powerplant / avionics / inspection), `requiresDualSignOff` toggle. On submit: `createTaskCard` fires. Router pushes to the new task card detail.
2. Task card detail: step list renders. Steps are added inline via an "Add Step" form at the bottom of the list.
3. **Assigning a step:** `assignStep` links a step to a specific technician. The step shows the assigned technician's name in collapsed `TaskCardListItem` view.
4. **Completing a step:** technician taps the step row (full row = 60px tap target per mobile spec). `StepSignOffModal` opens.
   - Modal shows: step description, reference (AMM/AD), completion notes field (optional)
   - **Ratings selection (RQ-05):** two-button group — "Airframe" / "Powerplant" / toggle for both. Pre-populated from `taskCard.taskType`. The technician must tap at least one button to enable the Confirm action. A pre-populated value is NOT silently accepted — the control renders in an "unconfirmed" state (gray outline, no fill) until the technician taps it. On tap: transitions to confirmed state (filled, bold). This is the RQ-05 UX: technician declares, system validates.
   - For steps where `signOffRequiresIa === false`: lightweight PIN confirmation field (numeric keyboard on mobile). `completeStep` mutation fires on PIN confirm.
   - For steps where `signOffRequiresIa === true`: full re-auth flow via `<ReAuthModal>` (see Section 4 — FE-01 resolution).
   - On `completeStep` success: step row updates (Convex subscription), showing green checkmark, `signedByLegalName`, cert number, timestamp (Zulu).
5. **Dual sign-off path (counterSignStep):** if the step has `signOffRequiresIa === true` or `requiresDualSignOff === true`, after `completeStep` resolves, the step row shows a "Counter-Signature Required" badge in amber. The IA sees this on their view and can tap the step to open the counter-sign flow. Full treatment in Section 4.

**Loading / error states:**
- Step modal loading (mutation in-flight): "Confirm Step" button shows spinner, disabled. Rating buttons also disabled during mutation.
- `SIGN_RATING_NOT_HELD` → "You selected [rating] but your certificate does not include this rating. Check your certificate and select the correct rating."
- `TC_STEP_NOT_SIGNED_BY_PRIMARY` (counterSign called before completeStep) → this should not be reachable from the UI, but if it is: "This step must be signed by the performing technician before a counter-signature can be applied."
- `AUTH_EVENT_EXPIRED` → `<ReAuthTimeoutError>` with "Re-authenticate" action button.

[FINN] The "unconfirmed" state for the ratings buttons is the most important UX detail in this entire flow. It is the difference between technicians accidentally rubber-stamping the pre-populated value and technicians making a deliberate legal certification. The visual treatment: pre-populated button has a light fill and a dashed border (not the solid border of a confirmed selection). Label: "Tap to confirm." On tap, the dashed border becomes solid, the fill saturates, and the label disappears. This is a two-state control, not a simple toggle. I'll deliver the Figma spec for it by EOW.

---

### Path 4: Parts Receive + Install

**Screens involved:**
- `/parts/receiving/page.tsx` — `ReceivingQueue` + FAB for new receipt
- `ReceivingForm` — bottom sheet (full-screen on mobile)
- `/parts/inventory/[partId]/page.tsx` — part record + traceability
- `InstallPartConfirmation` — confirmation dialog before `installPart` fires

**Convex mutations wired:**
- `api.parts.receive` → `receivePart`
- `api.parts.install` → `installPart`

**Convex queries wired:**
- `api.parts.listReceivingQueue` — open expected deliveries
- `api.parts.get(partId)` — part record detail
- `api.parts.getTraceabilityChain(partId)` — full chain: 8130-3 → installation → maintenance record

**Flow:**
1. Carlos navigates to `/parts/receiving`. FAB ("+ Receive Part") opens `ReceivingForm`.
2. **Form field sequence (mobile-optimized):** P/N first (auto-caps, no autocorrect) → optional barcode scan → S/N if serialized → `documentationType` selector (four options: 8130-3 / CoC only / PMA marked / No Documentation). The `documentationType` selector is shown FIRST in the required section — it gates the rest of the form. Selecting "No Documentation" immediately branches into a quarantine workflow (amber banner: "Part will be routed to quarantine. A receiving inspection is required before this part can be installed."), hiding inventory fields and showing a quarantine reason field.
3. For "CoC only" selection: an amber notice renders below: "A receiving inspection by an A&P is required before this part can be installed (14 CFR § 145.201). A maintenance record of the inspection will be required at install time." Non-blocking at receive; blocks at install per `installPart` G8.
4. **8130-3 tracking number field** appears only when `documentationType === "8130_3"`. Scan affordance: "Scan Tag" secondary button opens camera input (`<input type="file" accept="image/*" capture="environment">`). Barcode value parsed client-side via WASM. Manual entry always available.
5. Life-limited toggle and shelf-life date field are in an "Optional / Life Tracking" accordion section — collapsed by default. Expanding reveals them. This keeps the scroll manageable for the common case (non-LLP, no shelf-life).
6. On "Receive Part" submit: `receivePart` fires. On success: a success bottom sheet appears with the new part's `_id`, a "View Part Record" link, and a "Receive Another" action. On **RQ-03 quantity exceeded (non-LLP):** rendered as a compliance event — amber full-width banner with the error text and a "Supervisor Override" secondary CTA. Supervisor override opens a sub-form requiring the supervisor's PIN re-authentication and a documented reason. For **LLP quantity exceeded:** hard error, no override path in the UI.
7. **Install flow:** from the task card detail's `PartReference` block, a "Install This Part" action (role-gated to AMT+) opens `InstallPartConfirmation`. Confirmation shows: part P/N, S/N, current condition, work order context. "Confirm Install" button fires `installPart`. Loading state: button spinner. On success: part status updates (`installed`), traceability chain in the inventory view updates in real time.

**Loading / error states:**
- `PART_SHELF_LIFE_EXPIRED` → "This part's shelf life expired on [date]. It cannot be installed." (Hard block — no install button available for expired shelf-life parts)
- `PART_COC_RECEIVING_INSPECTION_REQUIRED` → "A receiving inspection record is required for CoC-only parts. Contact your supervisor to document the A&P inspection before installing."
- `PART_QUANTITY_EXCEEDS_TAG_LLP` → "The 8130-3 quantity would be exceeded. Life-limited parts cannot be received beyond the tagged quantity. No override is available."

[FINN] The quarantine branch in the receiving form is visually important. When a technician selects "No Documentation," the form should not just silently adapt — it should signal a meaningful workflow change. The amber banner, the hidden inventory fields, the visible quarantine reason field: these together communicate that this is not a normal receiving event. The mechanic must understand they are creating a quarantine record, not an inventory record. Consider a section header change: "Receiving" → "Quarantine Intake" when this branch is active.

---

### Path 5: RTS Sign-Off Flow

**Screens involved:**
- `/work-orders/[workOrderId]/sign-off/page.tsx` — six-step `<RtsWizard>`
- `ReAuthModal` — Step 5 identity confirmation
- WO detail page post-RTS — green persistent success banner

**Convex mutations wired:**
- `api.returnToService.authorize` → `authorizeReturnToService`

**Convex queries wired (all pre-loaded before wizard mounts):**
- `api.workOrders.get(workOrderId)` — WO state, aircraft times
- `api.taskCards.listForWorkOrder(workOrderId)` — completion status
- `api.discrepancies.listForWorkOrder(workOrderId)` — disposition status
- `api.adCompliance.listForAircraft(aircraftId)` — AD status (annual/100-hr only)
- `api.maintenanceRecords.listForWorkOrder(workOrderId)` — signature status
- `api.signatureAuthEvents.getPendingForCurrentUser` — Step 5 re-auth hook

**RTS Wizard Steps (full sequence):**

**Step 1 — Pre-Flight Summary:** `AircraftSummaryCard` + `TaskCardStatusGrid` + `DiscrepancySummaryPanel` + AD compliance status + `MaintenanceRecordList`. All data pre-loaded. "Continue" gated: if any blocker present, replaced by "Resolve Blockers" + `BlockingConditionAlert` listing each blocker as a link. The inspector can navigate away, fix the blocker, and return — the wizard state is preserved in React component state (not URL state, not database). The page itself is not a multi-page wizard; it's a single page with step state managed in a `useRtsWizard()` hook.

**Step 2 — Discrepancy Review (conditional):** renders only when `discrepancies.some(d => d.disposition === "deferred_mel")`. `RequiredAcknowledgement` checkbox + recipient field + auto-timestamp. On mobile: `min-h-[60px]` row for checkbox+label, `font-size: 16px` on recipient field (iOS anti-zoom).

**Step 3 — Aircraft Times Confirmation:** read-only `AircraftTimesConfirmationCard`. If `closeTime < openTime`: hard block, red field, "Fix This" renders as `<Button variant="outline" size="full-width">← Correct Aircraft Times</Button>` (not an inline text link — touch target requirement per mobile spec).

**Step 4 — RTS Statement:** `RtsStatementEditor` with pre-populated template keyed to `workOrder.workOrderType`. Template from constants file (not DB). The regulatory citation line is a read-only `<p>` rendered below the textarea with `bg-muted` background — visually separate, not editable. Character count displayed at top-right of textarea (not below — below is obscured by iOS keyboard). The textarea must satisfy RQ-06: ≥75 chars + "14 CFR" or "Part 43" citation + "return" or "airworthy" determination. These three checks are validated on the frontend with inline feedback BEFORE the final mutation fires — this is not a substitute for the backend assertion, but it prevents a frustrating rejection at Step 6 for something discoverable at Step 4. Three separate inline messages: "Statement too short (N/75 chars)", "Missing regulatory citation (include '14 CFR' or 'Part 43')", "Missing airworthiness determination (include 'return' or 'airworthy')".

**Step 5 — Identity Re-Authentication:** `<ReAuthModal>` powered by `useSignatureAuthEvent(enabled)`. `enabled` goes `true` when the user submits their credentials. Hook mounts, subscribes to `api.signatureAuthEvents.getPendingForCurrentUser`. Happy path: event arrives in ~200ms via Convex WebSocket push. 500ms `<SuccessState label="Identity confirmed" />`. Step 5 advances to Step 6. On timeout (10s): `<ReAuthTimeoutError>` with "Try Again" button that remounts the hook with fresh `mountTime`. On mobile: "Sign and Return to Service" button uses 1.5s press-and-hold with conic-gradient progress animation (Tanya's mobile spec) — not the 2s hover delay from desktop. Haptic feedback via `navigator.vibrate(200)` on completion if available.

**Step 6 — Final Confirmation:** `RtsPreviewCard` in scrollable container (`max-h-[50vh]` on mobile, full-height on desktop). `RequiredAcknowledgement` + "Issue Return to Service" (`variant="danger-confirm"`). On submit: `authorizeReturnToService` fires with collected args: `workOrderId`, `signatureAuthEventId` (from Step 5), `returnToServiceStatement` (from Step 4), `aircraftHoursAtRts` (sourced from `workOrder.aircraftTotalTimeAtClose` — NOT user-entered at this step), `limitations` (from Step 4, optional). On success: navigate to `/work-orders/[workOrderId]?rts=success`. The WO detail page reads this query param and renders a persistent dismissible green banner: "Return to Service Issued — Record [rtsId]". No toast — it must survive a screenshot. On mutation failure: full-screen error state (not toast, not alert dialog). Error code → plain-English message → "Go Back to Fix This" route to relevant step.

**Loading state (mutation in-flight):** the "Issue Return to Service" button collapses to a spinner and the wizard overlay shows `<MutationPendingOverlay label="Issuing return to service..." />`. The overlay blocks all interaction. This prevents double-submission and signals the gravity of the moment.

[FINN] The Step 6 success navigation to `/work-orders/[workOrderId]?rts=success` is correct, but the WO detail page at that point shows `status: "closed"`. The `StatusBadge` for "closed" is green. The RTS success banner is green. The overall visual effect should be calm and final — not a celebration, not a warning. This is a regulatory record being created, not a product sale. The banner label: "Return to Service Issued · Record [rtsId] · [timestamp]Z". Clean, permanent-feeling. No confetti.

---

## Section 3: Component Integration Status

### Wave 1 — Foundation Components

| Component | Live Wired? | Status |
|---|---|---|
| `StatusBadge` | Yes — `useWorkOrder`, `useTaskCard` | ✅ Wired, all variants |
| `DateTimeDisplay` | Yes — all record timestamps | ✅ Wired, Zulu primary |
| `AirframeHours` | Yes — `WorkOrderHeader`, `AircraftSummaryCard` | ✅ Wired |
| `ErrorState` (Tier 1/2/3) | Yes — all error boundaries | ✅ Wired |
| `EmptyState` | Yes — task card list, parts list | ✅ Wired |
| `OfflineBanner` | Yes — `useConnectivity()` hook | ✅ Wired, blocks sign-off mutations |
| `AppSidebar` + `MobileTabBar` | Yes — `useOrgRole()` for nav filtering | ✅ Wired, role-filtered |
| `SignOffBlock` (immutable post-sign display) | Partial — renders data, verify export | ⚠️ Needs PDF export integration |

### Wave 2 — Work Order Engine

| Component | Live Wired? | Status |
|---|---|---|
| `WorkOrderCard` | Yes — `api.workOrders.listActive` | ✅ Wired |
| `WorkOrderList` page | Yes — `useWorkOrders(filter)` | ✅ Wired |
| `WorkOrderHeader` | Yes — `useWorkOrder(id)` | ✅ Wired |
| `TaskCardListItem` | Yes — `useTaskCardsForWorkOrder` | ✅ Wired |
| `TaskCardDetail` page | Yes — step list, `completeStep`, `interruptStep` | ✅ Wired |
| `TimeEntryWidget` | Yes — `useLogTime` with optimistic update | ✅ Wired (desktop); mobile redesign pending Finn's Figma |
| `SignOffFlow` (Review→Auth→Confirm) | Yes — full wizard wired to `authorizeReturnToService` | ✅ Wired |
| `PartReference` block | Yes — renders from task card `partsRequired[]` | ✅ Wired |
| `StepSignOffModal` | Yes — `completeStep`, `counterSignStep`, ratings UX | ✅ Wired (RQ-05 control confirmed) |
| `ReAuthModal` | Yes — `useSignatureAuthEvent` hook | ✅ Wired |

### Wave 3 — Parts + Squawks

| Component | Live Wired? | Status |
|---|---|---|
| `PartsRequestCard` | Yes — `api.parts.listRequests` | ✅ Wired |
| `InventoryBrowser` | Yes — `api.parts.listInventory` + search | ✅ Wired |
| `ReceivingForm` | Yes — `receivePart`, RQ-03/RQ-04 branches | ✅ Wired (supervisor override path pending Figma) |
| `InstallPartConfirmation` | Yes — `installPart` | ✅ Wired |
| `SquawkCard` | Yes — `api.squawks.listOpen` | ✅ Wired |
| `SquawkCreateForm` | Yes — `createSquawk` | ✅ Wired |
| `PartTraceabilityView` | Partial — chain renders, `chainComplete` boolean | ⚠️ `partMaintenanceLinks` junction table pending |

### Wave 4 — Compliance + Personnel

| Component | Live Wired? | Status |
|---|---|---|
| `AuditTrailTable` | Partial — renders `auditLog` records | ⚠️ Export function not implemented |
| `CertificateCard` | Yes — IA expiry prominence rendered | ✅ Wired |
| `RTSRecord` display | Yes — immutable post-sign view | ✅ Wired (hash verify endpoint pending) |
| `PersonnelCard` | Yes — `api.personnel.get` | ✅ Wired |
| `AdComplianceCard` | Partial — status renders, detail sheet renders | ⚠️ `createAdCompliance` (UM-08) not yet specced; card is read-only until UM-08 ships |
| Hash verify UI (`VerifyRecordIntegrity`) | **Not started** | ❌ Required before any customer data is signed (compliance-validation.md Section 4) |

**Honest assessment:** Wave 1 and Wave 2 are fully wired. Wave 3 is complete except for the `partMaintenanceLinks` junction table gap (flagged by Marcus as a retrievability concern — in-memory filtering on `partsReplaced[]` will be too slow for fleet aircraft with 100+ part histories). Wave 4 has two gaps that matter for Phase 3 exit:

1. **Hash verify UI** (`VerifyRecordIntegrity` component) is not started. This is a compliance-validation.md Section 4.3 condition: "A hash that has no UI verification tool is theater." An FAA inspector must be able to run the check themselves on-site. The component needs to: fetch the `returnToService` or `maintenanceRecord` document, re-compute SHA-256 over the canonical JSON (same field ordering as `computeRtsHash()`), compare to stored `signatureHash`, and display: "Record integrity verified ✓ — hash matches" or "⚠️ Hash mismatch — record may have been altered." This must be accessible from the `RTSRecord` display component via a "Verify Integrity" secondary action.

2. **`createAdCompliance` (UM-08)** is unimplemented server-side. `AdComplianceCard` renders existing compliance records correctly, but there is no UI for creating a new compliance record — the data entry pathway for an A&P to record AD compliance after performing the work does not exist yet. This is the compliance-validation.md Section 5.4 CRITICAL gap: vacuous-pass on annual close if no AD records exist. The `AdComplianceCard` currently shows a "Record Compliance" button that renders as a disabled state with tooltip "Not available in this release." This is intentional and honest — do not remove the disabled affordance. When UM-08 ships, the button becomes live.

Phase 3 smoke tests can proceed without these two components, but neither customer-data environment sign-off nor Marcus's compliance sign-off can proceed until both are implemented.

---

## Section 4: FE-01 Resolution — Multi-Inspector Dual Sign-Off UX

**Context:** An annual inspection work order on a complex aircraft may have airframe work signed by one A&P (Airframe rating), powerplant work signed by a different A&P (Powerplant rating), and the full inspection signed off by the IA. The data model supports this via `maintenanceRecords.technicians[]` — each technician signs their scope, and the IA signs the 43.11 record as the terminal RTS authority. The UX for this workflow was OI-05 — undesigned until now.

**The Core Constraint (Rosa's concern):** The system must not create an incentive for the IA to sign everything under their own credentials because the multi-signer path is too cumbersome. If the path of least resistance is "IA signs all work," we've facilitated a 43.9 violation. The design must make the multi-inspector path as frictionless as the single-inspector path.

### 4.1 Wizard Step Sequence — Dual Sign-Off

The `requiresDualSignOff` flag at the task card level (and `signOffRequiresIa` at the step level) triggers a branched wizard. Here is the full step sequence when a work order has steps requiring counter-signature.

**For the primary A&P (performing technician):**

1. A&P completes physical work on a step.
2. Taps step row → `StepSignOffModal` opens.
3. Selects rating (RQ-05 — must confirm, not just accept pre-populated).
4. For non-IA steps: PIN confirmation → `completeStep` fires.
5. For `signOffRequiresIa === true` steps: `<ReAuthModal>` opens for the A&P's own re-authentication. `useSignatureAuthEvent(enabled)` mounts. A&P completes re-auth → event arrives → `completeStep` fires. The A&P's signature is now on the step. Step status: `completed`. Counter-signature badge appears: "IA Counter-Signature Required."
6. A&P's work is done on this step. They move on to the next step.

**For the IA (counter-signing technician):**

1. IA opens task card detail. Steps requiring counter-signature show an amber "Counter-Signature Required" badge.
2. IA taps the step row → a modified version of `StepSignOffModal` opens in "counter-sign mode."
3. Counter-sign mode shows: step description, primary A&P's signature (name, cert, timestamp), a read-only `counterSignType` selector pre-set to `"ia_inspection"`, `scopeStatement` field (required free-text — IA documents what they reviewed), ratings selection (same RQ-05 pattern as primary).
4. `<ReAuthModal>` opens for the IA's own re-authentication. This is a SEPARATE auth event from the A&P's event — two distinct `signatureAuthEvent` records are consumed for a dual-signed step.
5. On IA re-auth: `useSignatureAuthEvent(enabled)` mounts. Event arrives → `counterSignStep` fires with `counterSignType: "ia_inspection"`, IA's `signatureAuthEventId`, `scopeStatement`, `ratingsExercised`.
6. On success: step row updates — two signature blocks visible: primary A&P block (green, left) + IA counter-sign block (blue, right). Step is now fully signed. On mobile: two-block layout stacks vertically.

**Sequencing rule:** The IA cannot counter-sign before the A&P has signed (guard `TC_STEP_NOT_SIGNED_BY_PRIMARY`). The UI prevents reaching counter-sign mode on an unsigned step — the badge only appears after `completeStep` resolves. The IA also cannot be the same technician as the primary A&P on a `dual_amt` counter-sign type (guard `TC_COUNTER_SIGN_SELF_DUAL_AMT`). If the IA is the same person as the primary A&P, `counterSignType` must be `"ia_inspection"` — the IA is signing in a separate regulatory capacity.

### 4.2 RTS Sign-Off with Multi-Inspector Work Order

When all dual-signed steps are fully counter-signed, the work order can proceed to RTS. The `authorizeReturnToService` mutation verifies that all required signatures are present (PRECONDITION 4 — all task cards complete). At the RTS wizard Step 1, the `MaintenanceRecordList` shows multiple records — one per scope per A&P — each with their own `signatureHash`. The IA sees all records before signing the 43.11 RTS statement. The IA's single `authorizeReturnToService` call is the terminal event; it does not re-sign the individual maintenance records.

**The key UX distinction:** The sign-off wizard is always run by the IA. The A&P scope signatures are done inline on the task card detail page. The wizard is not opened by the A&P — it is opened only by the role that can authorize RTS (`isAtLeast("inspector")`). This separation prevents the wizard from being used for A&P-only scope sign-offs.

### 4.3 What the Task Card List Shows Each Role

Because the dual sign-off sequence involves multiple technicians working asynchronously, the task card list must communicate the right state to each role without exposing the other's pending actions unnecessarily:

| Task Card State | What AMT sees | What IA sees |
|---|---|---|
| All steps unsigned | Steps with empty checkboxes, no counter-sign indication | Same — IA cannot counter-sign until AMT signs |
| AMT signed, IA needed | Step row: "Signed by [AMT] · Counter-signature required" badge (amber) | Same amber badge + tappable counter-sign affordance |
| Both signatures present | Step row: two signature blocks, no badges | Same |
| N/A step, IA review needed | "N/A · IA Review Required" amber badge | "N/A · Tap to Review" — links to `reviewNAStep` flow |
| N/A reviewed (concur) | "N/A · IA Concurred" gray badge | Same |
| N/A reviewed (reject) | "N/A Rejected · Step Reverted" — step is `pending` again | Same |

The amber badge system is the visual contract that tells the IA where their attention is needed without requiring them to open every task card individually. From the task card list, an IA can scan all cards and triage their review work. A task card with zero amber badges is either fully signed or has no dual-sign requirements — either way, no IA action needed.

[FINN] The two-signature block display on the step row is the most complex visual element in the task card UI. On desktop, side-by-side works. On mobile at 375px, side-by-side at any useful font size is impossible — stack them vertically with a thin divider and a clear label: "Primary Signature" / "IA Counter-Signature." Each block: technician name (bold), cert # (mono), timestamp (Zulu), rating exercised. Total stacked height: ~120px per step row when dual-signed. That's fine — it's a legal record. Make it readable, not compact.

---

## Section 5: Error State Catalogue

All `ConvexError` codes from Devraj's mutation specs are mapped here to user-facing messages and UI behaviors. Frontend error handler pattern: `useMutationErrorHandler(errorCode)` maps code → `{ message: string, severity: "blocking" | "recoverable" | "info", resolution?: string }`.

### 5.1 RTS Precondition Failures

| Error Code | User-Facing Message | UI Behavior |
|---|---|---|
| `RTS_AUTH_EVENT_CONSUMED` | "This re-authentication has already been used. Complete a new re-authentication to sign." | `<ReAuthTimeoutError>` with "Re-authenticate" CTA. Step 5 resets to pre-auth state. |
| `RTS_AUTH_EVENT_EXPIRED` | "Re-authentication expired (5-minute window). Please re-authenticate again." | Same as above. |
| `RTS_AUTH_EVENT_WRONG_TABLE` | "Authentication event type mismatch. Re-authenticate and try again." | Same as above — this should not be reachable from normal UI flow. |
| `RTS_WRONG_WO_STATUS` | "This work order is not ready for sign-off. Current status: [status]. All task cards must be complete." | Full-screen error state with link back to WO detail. |
| `RTS_ALREADY_SIGNED` | "This work order has already been returned to service. No further sign-off is needed." | Navigate to RTS record view. |
| `RTS_TIME_MISMATCH` | "Aircraft time at sign-off does not match the recorded close time. Contact your DOM to verify." | Step 3 highlighted with red, "Fix This" button. |
| `RTS_TIME_DECREASED` | "⚠️ Aircraft total time at close is less than at open. This may indicate a data entry error. Contact your DOM." | Hard block, flagged for DOM review. Severity: blocking. |
| `RTS_OPEN_TASK_CARDS` | "N task card(s) are not complete: [list]. Complete or void all task cards before sign-off." | Navigate to Step 1; blocker list includes links to each incomplete card. |
| `RTS_UNREVIEWED_NA_STEPS` | "N step(s) marked N/A require IA review. An IA must review each N/A determination before sign-off." | Links to each step requiring review. |
| `RTS_OPEN_DISCREPANCIES` | "N discrepancy(ies) are not dispositioned. Each discrepancy must be corrected, deferred, or deferred-MEL." | Links to discrepancy resolution. |
| `RTS_MEL_EXPIRED` | "MEL deferral [item #] has expired. Aircraft cannot be returned to service with an expired MEL item." | Hard block, red — `<GroundedBanner>`. |
| `RTS_MEL_DEFERRAL_LIST_NOT_ISSUED` | "Owner/lessee deferral list has not been issued. Complete Step 2 of the sign-off wizard." | Route back to Step 2. |
| `RTS_IA_REQUIRED` | "An annual inspection requires an IA signature. Your certificate does not include an Inspection Authorization." | Hard block. "Contact your DOM to assign an authorized IA." |
| `RTS_IA_EXPIRED` | "Your IA expired [date]. An expired IA cannot authorize return to service. Renew your IA before signing." | Hard block. Red banner in Step 5 displaying expiry date. |
| `RTS_RECENT_EXP_LAPSED` | "Your IA has not been exercised within the past 24 months (14 CFR 65.83). Contact the FAA to re-establish currency." | Hard block. |
| `RTS_RATING_INSUFFICIENT` | "Your certificate does not include the required rating for this work order type." | Hard block in Step 5. |
| `RTS_AD_OVERDUE` | "N AD(s) are overdue for this aircraft: [AD numbers]. AD compliance must be accomplished before return to service." | Links to each overdue AD compliance record. Route to `/fleet/[tailNumber]/schedule`. |
| `RTS_NO_MAINTENANCE_RECORDS` | "No signed maintenance records exist for this work order. Task cards must be signed off before authorizing RTS." | Links back to task card list. |
| `RTS_STATEMENT_TOO_SHORT` | "Return-to-service statement is too short (N characters; 75 minimum). Expand the statement with additional detail." | Inline counter in Step 4 goes red. |
| `RTS_STATEMENT_NO_CITATION` | "Statement must include a regulatory citation — add '14 CFR' or 'Part 43'." | Inline Step 4 warning. |
| `RTS_STATEMENT_NO_DETERMINATION` | "Statement must include an airworthiness determination — add 'return' or 'airworthy'." | Inline Step 4 warning. |

### 5.2 Auth Event Failures (All Signing Mutations)

| Error Code | User-Facing Message | UI Behavior |
|---|---|---|
| `AUTH_EVENT_NOT_FOUND` | "Re-authentication record not found. Please re-authenticate." | `<ReAuthTimeoutError>` — hooks remounts. |
| `AUTH_EVENT_ALREADY_CONSUMED` | "This authentication event has already been used. Complete a new re-authentication." | Same — cannot reuse an event. |
| `AUTH_EVENT_EXPIRED` | "Re-authentication expired. Please re-authenticate again (5-minute window)." | Same. |
| `AUTH_EVENT_IDENTITY_MISMATCH` | "Authentication event belongs to a different technician. Each technician must complete their own re-authentication." | Hard error with explanation. This state should not be reachable from the UI; log it. |

### 5.3 State Machine Violations (Work Order Lifecycle)

| Error Code | User-Facing Message | UI Behavior |
|---|---|---|
| `WO_INVALID_STATE_FOR_HOLD` | "Work order must be in-progress to place on hold. Current status: [status]." | Recoverable — surface on action button, with current status displayed. |
| `WO_NOT_ON_HOLD` | "Work order is not on hold. No hold to release." | Stale UI — trigger a `useWorkOrder` refresh. |
| `WO_ALREADY_TERMINAL` | "Work order is [status] and cannot be modified." | Navigate to WO detail (read-only view). |
| `WO_CANCEL_IN_PROGRESS_BLOCKED` | "A work order in [status] cannot be cancelled without DOM authorization. Contact your DOM." | Surface as a dialog with the DOM's contact information if available. |
| `WO_TASK_CARDS_INCOMPLETE` | "N task card(s) must be complete before submitting for inspection: [list]." | Links to each incomplete card. |
| `WO_OPEN_INTERRUPTIONS_BLOCK` | "N step interruption(s) are unresolved. All interruptions must be resumed or resolved before closing." | Links to each open interruption record. |
| `WO_CLOSE_RTS_HOURS_MISMATCH` | "Aircraft time at close ([closeHours]h) does not match RTS record ([rtsHours]h). Verify aircraft logbook." | Route back to aircraft times confirmation. Requires DOM review. |

### 5.4 Task Card Step Errors

| Error Code | User-Facing Message | UI Behavior |
|---|---|---|
| `SIGN_RATING_NOT_HELD` | "You selected the [rating] rating, but your certificate does not include it. Select only ratings you hold." | Inline in `StepSignOffModal` — rating button goes red, explanatory text. |
| `IA_CERT_NOT_CURRENT` | "Your IA is not current (expired [date]). An IA with a current authorization must review this step." | Hard block in counter-sign modal. |
| `TC_COUNTER_SIGN_ALREADY_EXISTS` | "A counter-signature already exists for this step. Each step receives one counter-signature." | Refresh task card — likely a stale UI state. |
| `TC_CARD_HAS_SIGNED_STEPS` | "Task card has N signed step(s) (steps: [list]) and cannot be voided. Signed steps are permanent." | Voids blocked. Show signed steps list. |
| `TC_STEP_ALREADY_INTERRUPTED` | "Step already has an open interruption. Resume the existing interruption before creating a new one." | Link to existing interruption record. |
| `INSUFFICIENT_ROLE` | "Your role ([current]) does not permit this action. Minimum required: [required]." | Render `<ForbiddenState>` with role explanation. |

---

## Section 6: Finn's Pre-Ship UX Checklist

*I'm writing these as the design acceptance criteria for Phase 3. If a component or screen doesn't satisfy these, it doesn't ship. These aren't preferences — most of them are regulatory or safety requirements with a UX face on them. — FC*

**1. `StatusBadge` icon+color+label trinity is unbroken on every screen.** Every status value must render with all three channels: icon, color, and label text. No status is represented by color alone (colorblindness), no status by icon alone (no screen-reader label), no status by label alone (no visual hierarchy). Check the `StatusBadge` in every context it appears — `WorkOrderCard`, `WorkOrderHeader`, `TaskCardListItem`, `AdComplianceCard`, `PartReference` condition badge. If any instance is icon+color without label, or label+color without icon, it fails.

**2. The `TaskCardListItem` SIGN OFF button in `signOffReady` state is unmissable.** This is the single highest-frequency action in the application. Right-aligned, full row height (min 60px on mobile, 52px on desktop), primary blue fill, "SIGN OFF" label in medium weight. Nothing in the row visual hierarchy should compete with it when the step is ready. Check against Finn's Figma spec with the approved color token. A ghost button variant or an icon-only affordance is a design defect here.

**3. Touch targets meet 60px minimum on every interactive element in the sign-off wizard.** Run the mobile spec audit from mobile-adaptation.md Section 2 on every step. Discrepancy rows, acknowledgement checkboxes, "Fix This" navigation, auth method selectors, the "Sign and Return to Service" hold button — all must pass. Use Chrome DevTools device emulation at iPhone SE (375×667) to measure rendered hit areas. A failing touch target on a regulatory sign-off flow is not a cosmetic issue.

**4. All text inputs in the application render at font-size 16px or larger on mobile.** Non-negotiable per the iOS Safari zoom specification. This includes every field in the WO create form, the task card step modal, the RTS statement editor, the receiving form, and the auth PIN input. Run `document.querySelectorAll('input, textarea')` in mobile Safari emulation and verify `getComputedStyle(el).fontSize` for all of them. If any returns less than '16px', file it as a P0.

**5. The `OfflineBanner` is the first thing a user sees when connectivity drops, and it blocks the sign-off wizard.** Test by toggling DevTools "Offline" mode mid-session. The banner must appear within one render cycle (signal from `useConnectivity()`). The sign-off wizard "Continue" button on any step must be disabled with inline text "Connection required for sign-off." The mechanic should not be able to reach the re-auth step offline — the wizard blocks at the step currently active when connectivity dropped. Verify this on Step 3 and Step 4 specifically (the steps before re-auth).

**6. The RQ-05 ratings control in `StepSignOffModal` visually distinguishes pre-populated (unconfirmed) from technician-confirmed state.** The dashed border + light fill for unconfirmed, solid border + saturated fill for confirmed. The "Confirm Step" action must be disabled until at least one rating button is in the confirmed state. A pre-populated value that enables the submit button without user interaction is a regulatory defect. Test by opening the modal on a task card with `taskType: "airframe"` — the Airframe button pre-populates but the submit should be disabled until the technician taps it.

**7. The `ReAuthModal` never shows a "success" or "signed" state before the `signatureAuthEvent` exists in Convex.** Test by inserting an artificial 2-second delay in the Convex HTTP action and confirming the modal holds its loading state for the full delay. The step cannot advance to Step 6 until `useSignatureAuthEvent` returns `status: "ready"`. No optimistic transition. Check this in the test deployment against Jonas's AUTH-11 scenario.

**8. Error states after RTS failure are full-screen, not toasts.** After `authorizeReturnToService` throws any precondition error, the mutation error component must take up the full wizard content area. It must show: the error code's plain-English message, the affected record(s) (task card IDs, AD numbers, discrepancy IDs) as links, and a "Go Back to Fix This" action that routes to the relevant wizard step or the relevant record. A toast that auto-dismisses after a 6-step sign-off flow is a UX failure. Test this with `RTS_AD_OVERDUE` and `RTS_OPEN_DISCREPANCIES` specifically.

**9. The `SignOffBlock` post-sign immutable display renders correctly with two signatures (dual sign-off).** The A&P primary block and the IA counter-sign block must both display without layout breakage on a 375px viewport — stacked vertically, each block fully readable: legal name (bold), cert number (mono, truncated if needed with tap-to-expand), timestamp (Zulu), rating exercised. A compressed or overlapping two-signature block is a regulatory legibility issue, not a cosmetic one. Test with the longest plausible names (e.g., "Bartholomew Czarnkowski-Hughes" — 28 chars).

**10. The work order status transitions are visible in real time across all active sessions.** Open the WO detail page in two browser tabs. In Tab A, fire `completeStep` to complete the last step of the last task card — triggering `workOrder.status → "pending_signoff"`. Tab B must update the `StatusBadge` from `in_progress` to `pending_signoff` without a manual refresh, within 500ms. This validates that the Convex reactive subscription is functioning for the WO detail layout query. If Tab B requires a refresh, the `useWorkOrder(id)` hook is not a live subscription and we have a regression.

**11. The `OfflineBanner` back-online sequence correctly shows the "Connection restored" green state and syncs queued items.** Test the full cycle: go offline → queue one time log entry → come back online → observe green banner with "1 action synced" → confirm the time log mutation was retried and the Convex record exists. If the "connection restored" green state never appears, or queued items don't sync, or the banner stays amber after reconnect, the `useConnectivity()` hook's back-online detection is broken.

**12. The `AdComplianceCard` overdue state renders a non-dismissible red banner at the top of `/fleet/[tailNumber]/schedule`.** This is not a status badge — it is a banner that persists across scroll. "1 AD Overdue — Aircraft must not be returned to service." Red background, white text, no X button. The `authorizeReturnToService` wizard will throw `RTS_AD_OVERDUE` if this state exists, but the banner must also render on the schedule page independently — the DOM should be able to see the grounded state without opening a sign-off flow. Verify this banner appears when any `adCompliance` record has `isOverdue: true` and does NOT appear when all ADs are current.

---

*Chloe Park — Frontend Engineering*
*`[FINN]` annotations: Finn Calloway — UX/UI Design*
*2026-02-22 — Athelon Phase 3 Frontend Integration Specification*
*Resolves: FE-01 (multi-inspector dual sign-off UX), OI-03 (auth push mechanism), OI-05 (wizard UX design)*
*Compliance sign-off pending: hash verify UI (compliance-validation.md §4.3), UM-08 implementation (compliance-validation.md §5.4)*
*Next: Finn delivers mobile Figma frames (TimeEntryWidget redesign, dual-sign step row, ratings control) by 2026-02-28. Chloe begins Phase 3 integration PR review cycle week of 2026-03-01.*
