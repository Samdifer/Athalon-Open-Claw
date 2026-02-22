# Athelon — Phase 4 Web Implementation
**Author:** Chloe Park, Frontend Engineer  
**Date:** 2026-02-22  
**Sprint:** Week 1 Wave 2 — Core Operational Pages

---

> *Phase 3 left us with 1 page and a solid foundation. Phase 4 takes us to 6 pages + the sign-off ceremony component. The five deliverables here are the ones every persona encounters within their first session with Athelon. Every component was written against the actual schema (phase-3-implementation/convex/schema.ts) and the UX spec — no invented shapes. — CP*

---

## What's in this directory

```
phase-4-implementation/web/
├── components/
│   └── SignOffFlow.tsx             ✅ Done — full 3-phase signing ceremony
└── app/
    └── (app)/
        ├── work-orders/
        │   └── [id]/
        │       ├── page.tsx         ✅ Done — Work Order Detail
        │       └── task-cards/
        │           └── [cardId]/
        │               └── page.tsx ✅ Done — Task Card Detail
        └── aircraft/
            ├── page.tsx             ✅ Done — Aircraft (Fleet) List
            └── [id]/
                └── page.tsx         ✅ Done — Aircraft Detail
```

---

## Components Built

### `components/SignOffFlow.tsx` — Three-Phase Sign-Off Ceremony

The signing component from UX spec §4.6 and §5.4. Used in both TaskCardStep (individual step sign-off) and Task Card Detail (full card sign-off).

**Three phases:**

1. **CONFIRMATION** — Shows the record being signed, full legal certification statement, and signer identity. Cannot skip. The signer reviews exactly what they are certifying before proceeding.

2. **RE-AUTHENTICATION (PIN dialpad)** — 6-digit PIN entry using a phone-dialpad layout (3×4 grid). 64px button height per Tanya's sign-off dialpad spec. Physical keyboard supported. PIN auto-submits on 6th digit — one less tap. Show/hide PIN toggle. Error state reverts to same phase with inline error message.

3. **SUBMISSION** — Parent's `onSubmit` callback is called with the `signatureAuthEventId`. On success: renders the immutable signed block. On failure: error state with retry.

**Immutable signed block** (spec §5.4):
- Who signed (legal name + cert number in monospace)
- Zulu timestamp primary: `2026-02-25 14:32Z` — always. Local time secondary in parentheses.
- Signature UUID for audit trail lookup
- "This record is cryptographically locked." — verbatim per spec

**`SignedBlock` is also exported** — can be used standalone in list views and signed-step displays without mounting the full flow.

**Server auth event flow:**
```
User enters PIN → frontend calls api.signatureAuthEvents.create (TODO: Jonas)
             → gets signatureAuthEventId (5-minute TTL, consumed once)
             → calls onSubmit(signatureAuthEventId)
             → parent mutation atomically consumes event + writes record
```

**Stubbed:** `api.signatureAuthEvents.create` is currently a stub that generates a placeholder ID. The real mutation is Jonas's `signatureAuthEvents` endpoint. The interface is defined; swap the stub for the real call when it's live.

**Props:**
```typescript
<SignOffFlow
  recordDescription="TC-007 — Left Magneto Inspection"
  certifyingStatement="I certify that left magneto inspection..."
  signerName="Ray Kowalski"
  certNumber="A&P Cert. #3892045"
  context="Step 3 of 7"                  // optional
  existingSignature={existingSig}         // optional — jump to success state
  onSubmit={async (authEventId) => {
    await completeStep({ stepId, signatureAuthEventId: authEventId });
  }}
  onCancel={() => setShowSignOff(false)}
/>
```

---

### `app/(app)/work-orders/[id]/page.tsx` — Work Order Detail

Route: `/work-orders/[workOrderId]`

The core operational view. The page Ray and Mia live in while working a job.

**Header section:**
- Back link (← Work Orders)
- WO number (monospace), status badge, AOG indicator, overdue indicator
- Aircraft tail + make/model + work order type
- Customer name
- Opened date, opened by, target due date, closed date if applicable
- TT at open
- On-hold reason (amber banner, not a tooltip — always visible)

**Quick stats bar:**
- Task cards: `X/N signed` (green when all done)
- Open discrepancies (red if >0)
- Parts on order (amber if >0)
- RTS signed indicator (green if complete)

**Four tabs:**
- **Task Cards** — list with `TaskCardListItem` components. Add Task Card button (supervisor+). Progress: `X/N steps` per card. Status-driven left borders. Links to `/work-orders/[id]/task-cards/[cardId]`.
- **Discrepancies** — severity-colored left borders, MEL deferral info with expiry dates, disposition labels.
- **Parts** — installed/removed/overhauled parts with 8130-3 references, condition indicators.
- **Notes** — raw notes text, preformatted.

**Close WO action:**
- Sticky bottom bar (supervisor+), shown only when not closed
- Clicking triggers `useQuery(api.workOrders.getCloseReadiness)` — loaded lazily on button click
- Readiness modal shows blockers (unsigned task cards, open discrepancies, missing RTS record) or confirms ready
- Blocker list: explicit, red ✕ per item — no vague "cannot close" message

**Data queries (5 total):**
```typescript
useQuery(api.workOrders.get, { id })
useQuery(api.taskCards.listByWorkOrder, { workOrderId: id })
useQuery(api.discrepancies.listByWorkOrder, { workOrderId: id })
useQuery(api.parts.listByWorkOrder, { workOrderId: id })
useQuery(api.workOrders.getCloseReadiness, { workOrderId: id }) // lazy, skip when modal closed
```

---

### `app/(app)/work-orders/[id]/task-cards/[cardId]/page.tsx` — Task Card Detail

Route: `/work-orders/[workOrderId]/task-cards/[taskCardId]`

The individual maintenance task document. The screen Ray is looking at when he's doing the work.

**Header:**
- Back link (← WO-2026-0041 in monospace)
- Task card number (monospace), status badge, type label
- Title (large, prominent)
- Reference manual + revision, aircraft tail, assigned tech
- **Step progress bar** — visual track with separate fills for completed (green) and N/A (gray) portions. `X/N steps (Y N/A)` label.

**Steps list:**
- Uses `TaskCardStep` components from Phase 3 (imported from `@/components/TaskCardStep`)
- Each step knows whether it's the next to sign (`isNextToSign` = first non-signed step)
- `taskCardSignOffReady` propagated from the task card server query
- `userCanSign` = `can("signTaskCard")`

**Sign-off sections:**
1. **Full task card sign-off** — inline panel at bottom of step list, expands to `SignOffFlow` when user clicks. Blue card border. Calls parent's `completeTaskCard` mutation (stubbed).
2. **Sticky mobile bottom bar** — appears on `sm:hidden` when `signOffReady === true`. Scrolls to and expands the inline sign-off. Per Tanya's spec: visible without scrolling on mobile when ready to sign.
3. **Inspector sign-off** — separate section below steps. Only shows when `requiresInspector === true`. Calls `inspectorSignTaskCard` mutation (stubbed). Gated to `isAtLeast("inspector")`.

**Blocker banner:**
- Inline amber panel with warning icon when `signOffBlockReason` is set
- Always visible, never a tooltip — per Finn's spec §4.1

**Return to Work button:**
- Shown for voided cards, gated to `isAtLeast("supervisor")`
- Calls `returnToWork` mutation (stubbed)

**Data queries:**
```typescript
useQuery(api.taskCards.get, { id: cardId })
useQuery(api.taskCardSteps.listByTaskCard, { taskCardId: cardId })
```

---

### `app/(app)/aircraft/page.tsx` — Aircraft (Fleet) List

Route: `/aircraft`

Replaces the "Fleet" section from the nav spec. UX spec uses `/fleet` but the router contract specified `/aircraft` — the `link` targets match.

**Features:**
- **Search bar** — by tail number, make/model, owner name. Debounce-free (Convex reactive). Clear button (✕). Physical keyboard: auto-suggest enabled per spec §6.4 (glove mode — don't suppress suggestions).
- **Status filter tabs** — All | Airworthy | In Maintenance | Out of Service
- **Aircraft cards** — full tap target, tail in `font-mono text-[20px]` (the universal key), make/model + year, owner/customer, status badge, open WO count, open AD count, open squawk count, last maintenance date, next due.

**Card left borders:**
- `out_of_service` → red left border
- `in_maintenance` → amber left border

**Add Aircraft button** — DOM only (`isAtLeast("dom")`). In page header.

**Empty state** — context-specific copy for each filter + search variant. Link to add first aircraft when applicable.

---

### `app/(app)/aircraft/[id]/page.tsx` — Aircraft Detail

Route: `/aircraft/[aircraftId]`

The aircraft record. The page Sandra checks before releasing an aircraft. Per UX spec §4.3.

**Header:**
- Back link (← Fleet)
- Tail number: `font-mono text-[28px] font-bold` — the most prominent element
- Make/model/year/serial
- Owner/customer, base location, operating regulation
- Airframe TT display with `as of` date
- **Release Readiness Summary** — prominent status block for Inspector+ roles:
  - ✅ "Ready for Release" (green) — when no blockers exist
  - ✕ "Not Ready — N blockers" (red) — lists each blocker with red ✕ icons
  - ⚠ "Review Before Release" (amber) — warnings without hard blockers

**Four tabs:**

**WORK ORDERS:**
- Open WOs first (with left-border color by priority), closed history below
- Each row: WO number, status badge, type, description, dates, `X/N signed`, assignees
- RTS badge on closed WOs that have Return to Service records
- New WO button (can("createWorkOrder"))

**SQUAWKS:**
- Open/resolved grouping
- "AUTH REQUIRED" indicator for open squawks needing DOM authorization
- Inline Authorize button for DOM (`can("authorizeSquawk")`)
- MEL deferral info with category and expiry date

**AD STATUS:**
- Non-compliant ADs first (red left border, emergency ADs labeled)
- Complied/Current below
- Not-applicable collapsed (show first 5, "+N more")
- Role-gated to `can("viewCompliance")` — politely hidden with explanation message for lower roles
- `StatusBadge` used for compliance status (consistent visual language)

**EQUIPMENT:**
- Life-limited parts section first (amber header)
- Standard components below
- Shelf-life expired: red left border + "⚠ Shelf life expired" text
- Shelf-life critical (within 90 days): amber left border
- Part numbers in `font-mono` per spec §5.3
- 8130-3 reference noted when present

**Data queries (5 total):**
```typescript
useQuery(api.aircraft.get, { id })
useQuery(api.workOrders.listByAircraft, { aircraftId: id })
useQuery(api.adCompliance.listByAircraft, { aircraftId: id })
useQuery(api.parts.listInstalledOnAircraft, { aircraftId: id })
useQuery(api.squawks.listByAircraft, { aircraftId: id })
```

---

## Patterns Continued from Phase 3

All patterns from Phase 3 README are honored:

- **`useQuery` === undefined = skeleton**, not a separate isLoading boolean
- **Role as a JWT claim** — synchronous, no flicker, same `useOrgRole()` hook
- **No `any` in domain types** — all interfaces mirror the Convex schema; swap for `Doc<"...">` when deployed
- **Inline SVG icons** — no icon library dependency added
- **`font-mono` for aviation identifiers** — WO numbers, part numbers, serial numbers, cert numbers, tail numbers (tail in a larger size where it's the primary identifier)
- **Zulu primary, local secondary** on all timestamps in signed records (spec §5.5)
- **Tabs with border-bottom highlight**, same pattern as Work Orders list page
- **`cn()` from `@/lib/utils`** throughout

---

## What's Stubbed (Needs Jonas's Endpoints)

### Signing mutations (all use signatureAuthEvents pattern):
- `api.signatureAuthEvents.create` → `signatureAuthEventId` — the key stub in SignOffFlow.tsx
- `api.taskCardSteps.completeStep` → called from TaskCardStep (Phase 3 stub, unchanged)
- `api.taskCards.complete` → called from Task Card Detail sign-off flow
- `api.taskCards.inspectorSign` → inspector sign-off on task card
- `api.taskCards.returnToWork` → reactivate a voided task card
- `api.workOrders.close` → close WO after readiness check

### Query stubs (need Devraj's query implementations):
- `api.workOrders.getCloseReadiness` — close readiness checker
- `api.squawks.listByAircraft` — squawks by aircraft (discrepancies table, aircraft-scoped)
- `api.parts.listByWorkOrder` — parts linked to a WO
- `api.parts.listInstalledOnAircraft` — installed parts on an aircraft

---

## What Finn Needs to Review

- [ ] **Work Order Detail tabs** — same border-bottom style as Work Orders list. Consistent, but Finn may want different styles for nested tabs. Get sign-off.
- [ ] **Close WO modal** — bottom-sheet on mobile per spec §6.2. Currently center modal on desktop, bottom-anchored on mobile (via `items-end sm:items-center`). Verify with Figma when available.
- [ ] **Release Readiness Summary block** — my design call; spec mentions DOM pre-release checks but doesn't define a specific UI component. This is a high-visibility addition to the Aircraft Detail header. Finn should review placement and prominence.
- [ ] **Aircraft card tail number size** — `font-mono text-[20px] font-bold`. Tail is the "universal key" per spec; I made it prominent. May be too large for dense lists — check against real data.
- [ ] **AD Status tab badge labels** — used "NOT COMPLIED", "CURRENT", "COMPLIED", "N/A" etc. These are my abbreviations. Review for aviation correctness with Marcus.
- [ ] **Progress bar on task card** — two-color fill (completed = green, N/A = gray). Finn's spec doesn't define a progress bar visual explicitly for task cards. This is my interpretation of the X/N step pattern.

---

## Open Questions

1. **`/aircraft` vs `/fleet`** — UX spec §3 defines `/fleet/[tailNumber]`. Task specified `/aircraft/[id]`. I've used `/aircraft` since it was explicit in the task. If the nav routes change, the back links and Link hrefs need to update. Coordinate with nav implementation.

2. **`aircraft.list` query** — I've assumed `api.aircraft.list({ search, statuses })`. If Devraj names this differently, the list page query call updates. Same pattern issue as `workOrders.list` from Phase 3.

3. **`AircraftDetail.openWorkOrderCount`, `unsignedTaskCardCount`** — These are denormalized fields I'm assuming the server computes for the detail view. If Devraj returns raw aircraft data only, I'll need separate queries. Or they could be computed client-side from the `workOrders` tab data — less elegant but viable.

4. **Inspector sign-off on task cards** — The schema has `requiresInspector` implied by `signOffRequiresIa` on steps (taskCardSteps.signOffRequiresIa). I've aggregated this to a task-card-level `requiresInspector` boolean. Devraj's `api.taskCards.get` response should include this; if not, I can compute it from the steps array client-side.

5. **`squawks` table** — The schema has `discrepancies` table with `workOrderId` scoping. Aircraft-level squawks (not linked to a WO) would be discrepancies where `workOrderId` might be absent or they're linked to a "standalone" WO. Clarify with Devraj how unlinked squawks are stored.

6. **Return to work for deferred cards** — I'm showing the "Return to Work" button only for `voided` cards. If "deferred" becomes a first-class status (the spec mentions MEL deferrals), this needs updating.

---

*Chloe Park — Phase 4 Wave 2*  
*Next: Dashboard page (Sandra's morning view), AppSidebar + mobile tab bar, useLogTime hook*  
*Storybook setup still blocked — needs Day 1 scaffold from infra team*
