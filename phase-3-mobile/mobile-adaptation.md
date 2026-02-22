# Athelon — Phase 3: Mobile Adaptation
**Document Type:** Mobile Design & Engineering Specification
**Authors:** Tanya Birch (Mobile Engineer) · Finn Calloway (UX/UI Designer, annotations marked `[FC]`)
**Date:** 2026-02-22
**Status:** Working Draft — Phase 3 Planning
**Depends On:** phase-2-frontend/frontend-architecture.md · phase-2-signoff/signoff-rts-flow.md · phase-2-parts/parts-traceability.md
**Target Platform:** Mobile Web (Next.js App Router) — iPhone Safari primary, Android Chrome secondary. Not a native app. Not a PWA initially.

---

> *I'll be honest: the Phase 2 frontend architecture was designed desktop-first. Chloe's layout structure is correct for a desktop MRO tool and I'm not re-opening it. What I AM doing here is specifying exactly what changes at 375px so mobile doesn't become an afterthought that breaks the sign-off flow and gets a mechanic's RTS rejected because a tap target was 32px on an iPhone 13 in a cold hangar with gloves on. That's the scenario I'm designing for. — TB*

---

## 1. Mobile-First Layout Strategy

### 1.1 The Desktop Structure We're Adapting From

The `(app)/layout.tsx` renders `AppSidebar` + `AppHeader` + `{children}`. On desktop that's a left sidebar (~240px) + top header + content area. On mobile, neither of those structures work: the sidebar takes up the full viewport width and the top header eats prime vertical space that scrolling content needs.

**The adaptation contract:**
- `AppSidebar` renders on `md:` breakpoint and above only (`hidden md:flex`)
- `MobileTabBar` renders below `md:` only (`flex md:hidden`) — this was already in the component plan; it needs to be wired at layout level, not optional
- `AppHeader` collapses to a minimal mobile header: back navigation + page title + overflow menu — no station switcher dropdown, no search bar (those move to tab-bar accessible screens)
- All page content assumes a viewport of **375px minimum** and **844px maximum height** (iPhone 13 Safari, accounting for the bottom browser chrome eating ~84px)

### 1.2 Breakpoint Definitions

Using Tailwind's default breakpoints but treating `md: (768px)` as the desktop threshold. Everything below is mobile/tablet-in-portrait:

```
< 768px  → Mobile layout: MobileTabBar, collapsed header, single-column content
768px–1024px → Tablet: can use sidebar (collapsed icon-only mode) or MobileTabBar depending on orientation
> 1024px → Full desktop: AppSidebar expanded, AppHeader full
```

The critical viewport is **375px × 667px** (iPhone SE / iPhone 8 — still common in hangars because shops don't replace phones on a schedule). If it works there, it works everywhere.

`[FC]` I'm setting 375px as the design floor, not 390px (iPhone 14). I've seen beta shop techs use iPhone SE 2nd gen. Design at 375, test at 375. Any component that requires > 375px to function correctly is a design defect, not an "unsupported viewport."

### 1.3 MobileTabBar — 5-Tab Structure

The bottom tab bar is the primary navigation surface on mobile. Tab items:

| Position | Icon | Label | Route | Role Guard |
|---|---|---|---|---|
| 1 | Clipboard | Work Orders | `/work-orders` | All roles |
| 2 | Plane | Fleet | `/fleet` | All roles |
| 3 | Package | Parts | `/parts/requests` | `isAtLeast("amt")` |
| 4 | AlertTriangle | Squawks | `/squawks` | All roles |
| 5 | MoreHorizontal | More | Drawer → Compliance, Personnel, Settings | Role-filtered |

Tab bar height: **56px safe area + iOS safe area inset** (implemented via `pb-[env(safe-area-inset-bottom)]`). Each tab touch target: full width/5 × 56px minimum = **~75px wide, 56px tall**. Compliant.

The "More" drawer opens upward from the tab bar. It's a bottom sheet, not a full-screen nav. Items: Compliance, Personnel, Settings. DOM-only items render only for `role === "dom"`.

`[FC]` The tab labels must render at the 375px viewport. Five labels across 375px = 75px per tab = max ~8 characters per label. "Work Orders" at 75px will wrap or truncate. Decision: truncate with icon-only fallback at 375px (remove label, keep icon + active indicator), add label back at 420px+. I've mocked this — the icon-only bar is legible if icons are 28px and the active tab gets a filled indicator dot below. **Do not use tiny 20px icons at 375px.** Minimum icon size on the tab bar: 26px.

### 1.4 Responsive Layout Shifts — What Changes Per Route

**Work Orders List (`/work-orders`):**
- Desktop: 3-column card grid
- Mobile: single-column full-width cards, compact variant (remove secondary metadata from card face, promote to expanded state)
- `WorkOrderCard` compact: tail number + status badge + task progress fraction + priority badge. Remove "opened date" and "assigned to" from card face — those appear in detail.

**Work Order Detail (`/work-orders/[id]`):**
- Desktop: sticky tab bar (Work Orders / Parts / Notes / Sign-Off)
- Mobile: tabs collapse to horizontal scroll row, no truncation of tab labels — this is a scrollable row, 2px indicator underline, `overscroll-behavior-x: contain`. The Sign-Off tab is hidden for non-authorized roles (not just disabled — hidden, per Chloe's role-gating pattern).

**Task Card Detail (`/work-orders/[id]/tasks/[taskCardId]`):**
- Desktop: two-column layout (step list left, PartReference + TimeEntry right)
- Mobile: single column, PartReference blocks collapse to accordion, TimeEntryWidget moves above the step list (mechanics log time first, then work through steps)
- This is a high-frequency hangar screen. See Section 5 for full UX flows.

**Sign-Off Wizard (`/work-orders/[id]/sign-off`):**
- Desktop: centered 640px wizard card, fixed step sidebar on left
- Mobile: **full-screen step-by-step**, no sidebar step list (it wastes 30% of a 375px screen). Step progress shown as top progress bar + "Step N of 6" label. Full treatment in Section 3.

**Parts Receiving (`/parts/receiving`):**
- Desktop: split-panel form + camera preview
- Mobile: single-column form, camera/barcode affordance as a prominent floating action button at bottom. Full treatment in Section 5.

---

## 2. Touch Target Audit — Sign-Off Wizard and Task Card Steps

### 2.1 Methodology

Minimum touch target: **60px × 60px** (Apple HIG: 44pt minimum; we're using 60px to account for gloved or grease-covered hands in a hangar environment — 44px is for clean hands on a desk). Every interactive element below is measured at its rendered hit area, not its visual size. A 20px icon with 20px padding around it is a 60px target. A 20px icon with 10px padding is a 40px target and a redesign candidate.

### 2.2 Sign-Off Wizard — Step 1: Pre-Flight Summary

| Element | Visual Size | Padding / Hit Area | Total Touch Target | Status |
|---|---|---|---|---|
| "Continue" primary CTA (full-width) | text button | full width × 52px height | 375px × 60px | ✅ Compliant |
| "Resolve Blockers" replacement CTA | same | full width × 52px height | 375px × 60px | ✅ Compliant |
| Task card status row (clickable link to card) | varies | 44px height, full row width | 375px × 52px | ⚠️ **Borderline — needs 60px height** |
| Discrepancy item row (clickable) | varies | 44px height | 375px × 44px | ❌ **Redesign required — increase to 60px** |
| AD compliance detail expand | chevron icon | 24px icon, 16px padding each side | 56px × 56px | ✅ Compliant |
| Maintenance record item row | varies | 44px height | 375px × 44px | ❌ **Redesign required** |

**Redesign actions:**
- Discrepancy rows and maintenance record rows: increase `min-height` from `h-11 (44px)` to `h-16 (64px)` on mobile. The additional height accommodates an extra line of metadata that was hidden on desktop anyway.
- Task card status rows: enforce `min-h-[60px]` on `TaskCardStatusGrid` row items in mobile rendering context.

`[FC]` I'm not comfortable with 52px for "borderline." Gloves exist. Turbine engine wash chemicals exist. We call it 60px minimum, we add the 8px, and we don't debate it. The only reason to have a 52px row is if you haven't thought about who uses this app where.

### 2.3 Sign-Off Wizard — Step 2: Discrepancy Review (Conditional)

| Element | Visual Size | Hit Area | Total Touch Target | Status |
|---|---|---|---|---|
| `RequiredAcknowledgement` checkbox | 24px checkbox | 24px visual + automatic HIG sizing | needs explicit 60px wrapper | ⚠️ **Needs wrapper** |
| Recipient name text field | full-width input | 48px height | 375px × 48px | ⚠️ **Increase to 60px** |
| Deferred item row (read-only, no tap) | — | non-interactive | N/A | ✅ |
| "Continue" CTA | full-width button | 60px height | 375px × 60px | ✅ Compliant |

**Redesign actions:**
- `RequiredAcknowledgement`: wrap the checkbox + label in a `min-h-[60px]` touch area. The label itself should be tappable (standard `<label htmlFor>` association), so the effective tap area is the full checkbox + label row. On mobile, set the row to `min-h-[60px] flex items-center`.
- Recipient text field: set `h-[60px]` on mobile, `text-base` (16px) to prevent iOS Safari auto-zoom on focus (critical — any input with `font-size < 16px` triggers zoom on iOS, which destroys the layout and confuses mechanics mid-flow).

`[FC]` The iOS zoom-on-focus issue from font-size < 16px is one of the most common mobile web mistakes I see. This is non-negotiable: every text input in this app must have `font-size: 16px` or larger on mobile. If the design calls for a smaller input label, the INPUT FIELD itself must still be 16px. Check every form field across all six wizard steps.

### 2.4 Sign-Off Wizard — Step 3: Aircraft Times Confirmation

| Element | Visual Size | Hit Area | Total Touch Target | Status |
|---|---|---|---|---|
| "I confirm these times are accurate" acknowledgement | checkbox + label | see 2.3 pattern | 375px × 60px (with fix) | ⚠️ **Apply same wrapper fix** |
| "Fix This" link (amend WO close times) | text link | text-only, no padding | ~100px × 20px | ❌ **Critical redesign required** |
| Aircraft time fields (read-only displays) | non-interactive | non-interactive | N/A | ✅ |
| "Continue" CTA | full-width | 60px | 375px × 60px | ✅ Compliant |

**Redesign actions:**
- "Fix This" link: this is a safety-critical navigation — a mechanic who needs to correct incorrect aircraft times must be able to tap it reliably. Convert from inline text link to a full-width `<button variant="outline">` with `min-h-[56px]` and label "← Correct Aircraft Times". A text link on an RTS wizard that's smaller than 40px is a defect, not a styling choice.

### 2.5 Sign-Off Wizard — Step 4: RTS Statement

| Element | Visual Size | Hit Area | Total Touch Target | Status |
|---|---|---|---|---|
| `RtsStatementEditor` textarea | full-width | `min-h-[160px]` | 375px × 160px | ✅ Compliant |
| Limitations textarea | full-width | `min-h-[100px]` | 375px × 100px | ✅ Compliant |
| Character count display | read-only | non-interactive | N/A | ✅ |
| Regulatory citation line (read-only) | static text block | non-interactive | N/A | ✅ |
| "Continue" CTA | full-width | 60px | 375px × 60px | ✅ Compliant |

No redesign required on this step. The textarea surfaces the iOS keyboard, which eats ~280px of a 667px viewport. The wizard layout must account for this: the textarea shrinks to show at least 3 lines visible above the keyboard, and the "Continue" CTA scrolls INTO VIEW when the textarea is focused (use `scrollIntoView({ behavior: 'smooth', block: 'end' })` on the CTA button after keyboard-open delay).

`[FC]` The keyboard behavior on this step needs explicit product attention. On iPhone Safari, when the keyboard opens, the page doesn't scroll automatically — the fixed bottom CTA can be obscured by the keyboard chrome. Use `window.visualViewport` resize event to detect keyboard height and adjust the bottom CTA's `bottom` offset dynamically. This is a known Safari quirk and has no pure CSS solution.

### 2.6 Sign-Off Wizard — Step 5: Identity Re-Authentication

| Element | Visual Size | Hit Area | Total Touch Target | Status |
|---|---|---|---|---|
| Auth method selector tabs (PIN / Face ID / Password) | ~100px each | full row height 52px | ~100px × 52px | ⚠️ **Increase to 60px height** |
| PIN entry field (masked) | full-width | `h-[60px]` | 375px × 60px | ✅ if enforced |
| Face ID trigger button | full-width | `h-[60px]` | 375px × 60px | ✅ if enforced |
| "Sign and Return to Service" submit | full-width | `h-[64px]` — make this large, deliberate | 375px × 64px | ✅ Compliant + intentional weight |
| Certificate display (read-only) | non-interactive | non-interactive | N/A | ✅ |
| IA expiry status (read-only) | non-interactive | non-interactive | N/A | ✅ |

**Note on Face ID:** `navigator.credentials.get({ publicKey: ... })` / WebAuthn is the correct API for Face ID on mobile Safari (available iOS 14.5+). This is NOT a native app integration — it goes through the browser's WebAuthn stack. Jonas needs to confirm the Clerk re-auth flow supports WebAuthn on mobile Safari before we surface the Face ID option. If unsupported, hide the Face ID tab and default to PIN.

`[FC]` The "Sign and Return to Service" button should be the most visually dominant interactive element on this screen. 64px height, full width, strong background (the danger-confirm variant). This is not the place for visual restraint. A mechanic needs to feel the weight of this action. That said — on a 375px screen, `danger-confirm`'s "2s hover before clickable" behavior from desktop doesn't translate. **Replace the 2s hover delay with a press-and-hold for 1.5 seconds** on mobile. Haptic feedback on confirmation (via `navigator.vibrate(200)` if available).

### 2.7 Sign-Off Wizard — Step 6: Final Confirmation and Submission

| Element | Visual Size | Hit Area | Total Touch Target | Status |
|---|---|---|---|---|
| `RtsPreviewCard` (read-only scroll) | full-width card | scrollable, not interactive | N/A | ✅ |
| Final acknowledgement checkbox + label | see pattern | `min-h-[60px]` wrapper | 375px × 60px | ✅ with fix applied |
| "Issue Return to Service" button | full-width | `h-[64px]` danger-confirm | 375px × 64px | ✅ Compliant |

This step must not have a keyboard-triggering input. The only interaction is: read the preview, check the acknowledgement, press the button. No free-text fields. The RtsPreviewCard must be fully visible via scroll before the submit button — use a sticky bottom footer pattern with the acknowledgement + submit pinned at the bottom, and the preview card scrolling above it.

### 2.8 Task Card Step List — Touch Target Audit

| Element | Visual Size | Hit Area | Total Touch Target | Status |
|---|---|---|---|---|
| `StepCheckbox` — step completion toggle | 24px checkbox | needs `min-h-[60px]` row | ❌ **Redesign — full row tappable** |
| `StepNAButton` — mark N/A | 80px button | `h-[44px]` | ~80px × 44px | ❌ **Increase to 60px** |
| SIGN OFF inline button (task card list item, `signOffReady` state) | full row right | `min-h-[60px]` per Chloe's spec | 375px × 60px | ✅ Chloe specified this |
| Expand/collapse task card accordion | full row header | `min-h-[56px]` | 375px × 56px | ⚠️ **Increase to 64px** |
| PartReference expand chevron | 24px icon | 40px padding | 60px × 60px | ✅ Compliant |
| TimeEntry stepper buttons (+ / −) | 32px visual | needs `min-w-[60px] min-h-[60px]` | ❌ **Critical — often only 40px** |

**Redesign actions:**
- `StepCheckbox`: the entire step row must be the tap target, not just the 24px checkbox. Implement `<label className="flex items-center min-h-[60px] w-full cursor-pointer">` wrapping the visual checkbox + step description. On tap anywhere on the row, the checkbox toggles. The `StepSignOffModal` slides in from this interaction.
- `StepNAButton`: `min-h-[60px] min-w-[80px]` — this is a secondary action, keep it visually secondary but make it tappable.
- TimeEntry steppers: these need `min-h-[60px] min-w-[60px]` — the + and − buttons for logging time are used frequently in hangars. A 40px stepper that's adjacent to another 40px stepper with 4px gap between them is three mis-taps per day per mechanic. Expand to 60px square with 8px gap minimum.

`[FC]` The TimeEntry widget deserves a full mobile redesign pass, not just a padding increase. Desktop: two compact steppers + a number display. Mobile: consider a dedicated time-entry bottom sheet with a large numeric keypad (like entering a phone number) for minute entry, and the running timer as a large central element. Engineers will push back on scope; I'll mock it in Figma first and we decide based on the mock. But the 40px stepper on mobile is categorically not acceptable.

---

## 3. Sign-Off Flow on iPhone Safari — Full Walkthrough

### 3.1 Entry Point Behavior

A mechanic navigating to `/work-orders/[id]/sign-off` on iPhone Safari encounters:

**What renders differently from desktop:**
- No step sidebar — replaced by a horizontal progress bar (thin, 4px, amber → green as steps complete) at the top of the content area, below the minimal mobile header
- "Step N of 6" label in small text below the progress bar (`text-sm text-muted-foreground`)
- No sticky left sidebar taking up width — full 375px content width is available

**Where layout breaks without mobile treatment:**
1. **`AircraftSummaryCard` with full data** — on desktop it's a 3-column grid. At 375px that grid wraps awkwardly. Needs `grid-cols-1 md:grid-cols-3` with a `divide-y` separator between rows on mobile.
2. **`TaskCardStatusGrid`** — on desktop it's a multi-column table. On mobile it must be a list of rows (no table element — tables are illegible at 375px). Convert to stacked card list.
3. **`MaintenanceRecordList`** — same issue: table → card-list.

### 3.2 Step-by-Step Mobile Rendering

**Step 1 (Pre-Flight Summary) on iPhone Safari:**
- Content scrolls vertically; the "Continue / Resolve Blockers" CTA is **sticky at the bottom** of the viewport (`position: sticky; bottom: 0; + safe-area-inset-bottom padding`)
- `BlockingConditionAlert` items are rendered as a stacked list of full-width amber alert chips, each with a "→ Fix" link. On mobile, these links should navigate to the blocking item; back navigation returns to the wizard at Step 1 via `router.back()`.
- If AD compliance is a blocker, it opens `/fleet/[tailNumber]/schedule` in a new sheet (not full navigation — mechanics get lost if the sign-off disappears). Implement as a modal sheet with its own scroll area.

**Step 2 (Discrepancy Review — Conditional) on iPhone Safari:**
- Only appears when deferred discrepancies exist. Full-width stacked deferred item cards, not a table.
- `RequiredAcknowledgement`: the checkbox + label in a `min-h-[60px]` row. **The label text must be `text-base` (16px), not `text-sm`.** On a safety-critical acknowledgement, small text is a liability.
- Recipient name field must suppress iOS autocorrect (`autoCorrect="off" autoCapitalize="words"`). A mechanic's name autocorrected to something else in a legal record is embarrassing at best.

**Step 3 (Aircraft Times) on iPhone Safari:**
- All fields read-only. No keyboard activation. This step renders correctly at 375px without specific mobile treatment, EXCEPT the "Fix This" link (redesign specified in Section 2.4).
- `TimeDisplay` formatted values in JetBrains Mono — confirm the font loads on iOS Safari. WebKit has occasional issues with subset WOFF2 files. Test explicitly.

**Step 4 (RTS Statement) on iPhone Safari:**
- **Keyboard management is the primary concern here.** When the textarea receives focus, iOS keyboard opens (~280px). The `RtsStatementEditor` must:
  1. Listen to `window.visualViewport.addEventListener('resize', ...)` to detect keyboard height
  2. Adjust bottom padding of the scroll container to push content above the keyboard
  3. Ensure the sticky CTA moves UP with the keyboard, not stays hidden behind it
- The RTS statement template text is pre-populated — mechanic may need to add their name, date, and certificate number to the template. The template should include `[YOUR NAME]` / `[CERT #]` tokens as placeholder text in the editable region that the mechanic taps to replace. Do NOT use actual `placeholder` HTML attribute — that disappears on focus and the mechanic loses the template structure.
- Character count: position at top-right of textarea, not below it (below gets hidden by keyboard).

**Step 5 (Re-Auth / Sign) on iPhone Safari:**
- **Face ID path:** `navigator.credentials.get()` prompts the Face ID UI. This is a system-modal interaction — nothing we can style. It works or it doesn't. Fallback: PIN. The Face ID tab should only render if `window.PublicKeyCredential !== undefined && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`. Check async; render the tab after the check resolves. A brief skeleton during the check is acceptable.
- **PIN path (default):** Numeric keypad input (`<input type="tel" inputMode="numeric" pattern="[0-9]*">`) — this triggers the numeric keyboard on iOS, not the full QWERTY, which is what mechanics want.
- The "Sign and Return to Service" button: press-and-hold 1.5 seconds (see Section 2.6). Implement with `onPointerDown` → start a 1.5s timer → on timer completion, if pointer is still down, enable the submit. Show a circular progress animation around the button during hold (CSS `conic-gradient` animation, 1.5s linear). If the pointer lifts early, reset. This is deliberate friction, not an obstacle.

**Step 6 (Final Confirmation) on iPhone Safari:**
- `RtsPreviewCard` may be long — aircraft ID block + times block + RTS statement + technician block. On a 667px-height viewport, this can exceed one screen.
- Pattern: `RtsPreviewCard` in a scrollable container with `max-h-[50vh]`, scrollable. The acknowledgement + submit button are in a sticky bottom section. The mechanic must scroll through the preview; we do not require them to reach the bottom before enabling the button (that's a patronizing pattern that breaks on screen reader assistive tech), but we do show a "Scroll to review ↓" indicator while the card is not fully scrolled.
- **On success:** navigate to `/work-orders/[id]` with `?rts=success` query param. The WO detail page reads this param and displays a green success banner: "Return to Service Issued — Record [rtsId]". Do not use `toast` for RTS success — it auto-dismisses and a mechanic may want to screenshot it. Use a persistent dismissible banner.
- **On mutation error:** display the error full-screen (not toast, not alert dialog) with the error code, a plain-English explanation, and a "Go Back to Fix This" button routing to the relevant step or the blocking record. The mechanic just completed a 6-step flow — losing their place to a toast that disappears is a terrible experience.

---

## 4. Offline Detection and OfflineBanner Component Spec

### 4.1 Tanya's Offline Philosophy

Hangars are metal buildings. Metal buildings block cell signals. A mechanic 40 feet inside a hangar working on an aircraft may have no connectivity. We are a web app built on Convex's real-time subscriptions — by definition, offline means our core data layer is unavailable. I am not going to pretend we can be a full offline-first app in Phase 3. What I AM going to do is:

1. Detect offline clearly and immediately
2. Block write operations that require server confirmation (sign-offs, part mutations)
3. NOT block read operations for data that's already loaded in the React tree
4. Queue low-risk writes (notes, time log drafts) for retry when connectivity returns
5. Never let a mechanic believe they signed something when they didn't

### 4.2 Connectivity Monitoring

Three signals monitored in parallel via a `useConnectivity()` hook:

```typescript
// lib/hooks/useConnectivity.ts

export function useConnectivity() {
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine)
  const [convexConnected, setConvexConnected] = useState(true)
  const [lastConvexSuccess, setLastConvexSuccess] = useState(Date.now())

  // Signal 1: Browser Online/Offline API
  // Fast but unreliable — reports "online" when connected to a local network
  // with no internet. Use as first signal only.
  useEffect(() => {
    const onOnline  = () => setNetworkOnline(true)
    const onOffline = () => setNetworkOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  // Signal 2: Convex connection state
  // ConvexProviderWithClerk exposes connection status via useConvexConnectionState()
  // (Convex 1.x API). This is the authoritative signal — if Convex WebSocket is
  // disconnected, we cannot guarantee data consistency.
  const { isWebSocketConnected } = useConvexConnectionState()
  useEffect(() => {
    setConvexConnected(isWebSocketConnected)
    if (isWebSocketConnected) setLastConvexSuccess(Date.now())
  }, [isWebSocketConnected])

  // Signal 3: Mutation heartbeat (passive)
  // Track last successful Convex mutation. If > 30s without success while
  // network reports online, flag as degraded (not fully offline, but suspicious).
  const isOffline   = !networkOnline || !convexConnected
  const isDegraded  = networkOnline && !convexConnected
  const offlineSince = isOffline ? lastConvexSuccess : null

  return { isOffline, isDegraded, offlineSince, convexConnected, networkOnline }
}
```

### 4.3 OfflineBanner Component Spec

```typescript
// components/layout/OfflineBanner.tsx
// Renders above MobileTabBar (or below AppHeader on desktop)
// Z-index: above content, below modals (z-40 in our z-index scale)

Props: {
  isOffline: boolean
  isDegraded: boolean
  offlineSince: number | null   // Unix ms timestamp
  queuedActionCount: number     // count of pending write operations
}
```

**Visual spec:**
- **Offline state:** Full-width amber bar, `bg-amber-500`, white text. Icon: `WifiOff` (Lucide). Text: "No connection — read-only mode". Height: 44px. Does not push content — overlays at top of content area with a `top: 0 sticky` or appears below the mobile header.
- **Degraded state** (network present, Convex disconnected > 5s): Full-width yellow bar, `bg-yellow-400`, dark text. Icon: `AlertTriangle`. Text: "Connection unstable — changes may not save".
- **Back online:** Banner transitions to green (`bg-green-500`) for 3 seconds: "Connection restored" + queued count if any ("2 actions synced"). Then dismisses with a height-collapse animation.
- If `queuedActionCount > 0` while offline: show "N actions queued" in the banner. Each queued item must be a low-risk write (see 4.4). Do not queue sign-off mutations under any circumstance.

### 4.4 What OfflineBanner Blocks vs. Allows

**Blocked when `isOffline === true`:**
- The entire sign-off wizard. If a mechanic starts the wizard and goes offline mid-flow, the "Continue" button on the current step is disabled with inline explanation: "Cannot proceed — connection required for sign-off." The mechanic can read everything they've already loaded; they cannot advance.
- Part installation and removal mutations (`installPart`, `removePart`, `tagPartUnserviceable`)
- Re-authentication flow (Step 5 of sign-off). There is no offline re-auth. The `signatureAuthEvent` must be server-created.
- Creating new squawks (the squawk needs a server-assigned ID immediately for photo attachment)

**Allowed when `isOffline === true` (data already in React tree):**
- Reading any currently-loaded work order, task card, part record
- Reading the sign-off wizard steps 1–4 (data pre-loaded before offline state)
- Drafting a note (queued for retry, NOT submitted optimistically)
- Viewing AD compliance records, part traceability (already loaded)

**Queued for retry (low-risk writes):**
- Time log entries (the `useLogTime` hook already has optimistic update; we additionally queue the mutation call with a retry interval of 10s × 3 attempts)
- Note additions to task cards (drafted locally, synced on reconnect)
- Step status marking (in-progress → but NOT the sign-off confirmation)

`[FC]` The OfflineBanner needs to be the most prominent persistent UI element when active — not a subtle indicator that a mechanic ignores. Amber is the right color. Keep the language direct and operational: "No connection — read-only mode." Not "Offline." Not "Connection issue detected." Mechanics understand "read-only mode." They understand consequences. Don't soften the message.

---

## 5. Hangar Floor Use Cases

### 5.1 Use Case A — Complete a Task Card Step

**Context:** Ray (AMT, iPhone 13, inside hangar, 1–2 bars LTE) is working on TC-007 for work order WO-2241. He's completed a step and needs to sign it off.

**UX Flow:**
1. Ray opens Athelon via MobileTabBar → "Work Orders" tab. The WO list loads (or shows cached data from last session — `useQuery` keeps the subscription alive). He taps WO-2241.
2. WO detail page: task card tab is default. He sees TC-007 with status `in_progress`. He taps the row.
3. Task card detail: single-column mobile layout. Step list is above parts and time entry. He locates Step 4 (the step he just completed). The entire step row is tappable (`min-h-[60px]` tap target).
4. He taps the step row. `StepCheckbox` triggers. `StepSignOffModal` slides up from the bottom (bottom sheet, 60% viewport height).
5. Modal shows: step description (full text), "This work falls under my: [Airframe] [Powerplant]" toggle — two large tap targets, full-width each, `min-h-[60px]`. He taps "Airframe."
6. Since this step does not require IA (`signOffRequiresIa: false`), a lightweight PIN confirmation field appears. He types his 4-digit PIN (numeric keyboard auto-surfaces). Taps "Confirm Step."
7. `signTaskCardStep` mutation fires. Optimistic update shows the step as checked immediately. Server confirms within 1–2s on LTE. Step row shows: green checkmark, "R. Kowalski · A&P #1234567 · 14:22Z."
8. If this was the last step: the task card header automatically updates to "Complete" (real-time Convex subscription). The SIGN OFF button appears on the task card list item for the Inspector.

**Mobile-specific concerns:**
- If LTE drops during step 5–7: the mutation is queued (step sign-off IS a write-with-signature, so it is NOT queued silently — the OfflineBanner appears and the "Confirm Step" button is disabled with "Connection required to sign"). The mechanic waits or moves to a spot with signal.
- Back navigation from the step modal should not close the entire task card detail — use `router.back()` correctly to only close the bottom sheet.

### 5.2 Use Case B — Receive a Part

**Context:** Carlos (Parts, Android Chrome, Samsung Galaxy A54, outdoor receiving area — full signal) is checking in a new part delivery.

**UX Flow:**
1. Carlos opens MobileTabBar → "Parts" tab → routes to `/parts/requests`. He navigates to "Receiving" (sub-tab in the Parts section, accessible via horizontal scroll tab row).
2. `/parts/receiving` page: the receiving queue shows open expected deliveries. A floating action button (FAB) at bottom-right: "Receive New Part" (+ icon, `min-w-[60px] min-h-[60px]`, `rounded-full`).
3. Carlos taps FAB. The receiving form opens as a full-screen bottom sheet (slides up, covers full viewport).
4. **Field sequence (optimized for mobile entry):**
   - Part Number: text input, `text-base`, `autoCapitalize="characters"`, `autoCorrect="off"`. Large input, `h-[60px]`.
   - Below the P/N field: a "Scan Barcode" button (`min-h-[56px]`, full-width, secondary variant). On tap: invokes `<input type="file" accept="image/*" capture="environment">` — this opens the camera on mobile without requiring camera API permissions setup. The barcode value is parsed client-side from the captured image using a WASM barcode library (Phase 3 spec: `@zxing/browser` or equivalent). For Phase 3 MVP, manual entry is the primary path; camera capture is the enhancement.
   - Serial Number (if serialized): same pattern.
   - Condition selector: segmented control — New / Serviceable / Overhauled. Each segment `min-h-[60px]`, one-third width at 375px (~125px per segment). Tap to select.
   - Owner-Supplied toggle: large `Switch` component, `min-h-[60px]` row with label.
   - Life-Limited toggle: same.
   - 8130-3 present toggle: if YES, shows 8130-3 tracking number field. If NO, shows an amber notice: "Part cannot be installed without airworthiness documentation. A receiving inspection will be required." (Non-blocking at receive — blocks at install per `installPart` G8.)
5. Carlos fills the form. At the bottom, a sticky "Receive Part" primary button, `h-[64px]`, full-width.
6. On submit: `receivePart` mutation fires. On success: a success bottom sheet (not a full page nav) shows the created part ID with a "View Part Record" link and a "Receive Another" action. Carlos can immediately receive the next item without navigating away.

**Mobile-specific concerns:**
- The form is long (8–10 fields). Use accordion sections — "Required" fields visible by default, "Optional / Life Tracking" behind an expand toggle. This keeps the scroll length manageable on a 667px screen.
- Life-limited and shelf-life date fields use `<input type="date">` — native on mobile, which is appropriate here. Do not use a custom date picker; the native one is accessible and familiar.

`[FC]` The receiving flow's "scan barcode" path needs careful UX design before we scope it for Phase 3. Camera permission prompt + capture + parse has multiple failure modes. The failure state ("Barcode not recognized — enter manually") must be immediate and non-disorienting. I want to see a mock before this is implemented. For now, the form-first path is correct. The camera path is an enhancement layer, not a replacement.

### 5.3 Use Case C — Look Up AD Compliance Status

**Context:** Sandra (DOM, iPhone 14 Pro, in the shop office doorway — adequate signal) needs to quickly check whether N-441EC is current on all applicable ADs before approving a ferry flight.

**UX Flow:**
1. Sandra opens MobileTabBar → "Fleet" tab. Aircraft list loads. She locates N-441EC (sorted by tail number, searchable via a search input at top of list, `h-[56px]`, `text-base`).
2. She taps the N-441EC row. Aircraft detail page: tab bar across top (Work Orders default / History / Schedule / Equipment). She taps "Schedule."
3. `/fleet/N-441EC/schedule` renders the AD compliance section. On mobile, the layout is single-column cards, not a desktop table. Each AD card shows:
   - AD number (bold, `font-mono text-base`)
   - Short description (2 lines max, truncated)
   - Status badge (`StatusBadge` component — green "Complied" / amber "Due Soon" / red "Overdue" / gray "N/A")
   - Next due: date OR hours remaining, whichever is sooner
4. Sandra filters by status: a row of filter chips above the list (`flex gap-2 overflow-x-auto`, scroll horizontally) — "All / Overdue / Due Soon / Complied / N/A". Each chip `min-h-[44px] px-4` — chips are smaller than standard touch targets but acceptable for a horizontal filter row where each chip is spacious. If they're smaller than 44px height, add padding.
5. She sees one "Due Soon" AD (amber). She taps the card. AD detail sheet slides up:
   - Full AD text reference (regulatory citation)
   - Compliance method recorded
   - Last complied date + hours
   - Next due date + hours
   - "View Compliance Record" link → opens the maintenance record
6. Sandra can share this status (via iOS native share sheet) using a "Share" button on the AD detail sheet. The share action generates a plain-text summary: "N-441EC AD Compliance — [AD number] — Status: Due Soon — Next Due: [date/hours]".

**Mobile-specific concerns:**
- AD compliance data can be lengthy for an older aircraft with many applicable ADs. Pagination or virtual scrolling is required if the list exceeds 30 items (unlikely in Phase 3 for the typical light GA fleet, but worth noting for commuter operators).
- The "Overdue" AD state must render with a red status badge AND a persistent red banner at the top of the schedule page: "1 AD Overdue — Aircraft must not be returned to service." This banner is not dismissible.
- Performance: `/fleet/[tailNumber]/schedule` may load 20–50 AD records with compliance calculations. Pre-compute `adComplianceStatus` on the server (Convex query) and return the computed status alongside the raw data. Do not compute remaining life on the client from raw aircraft hours — that's slow and duplicates server logic.

`[FC]` The AD status card at 375px: the AD number + status badge on one line. That's tight. AD numbers can be long ("2023-10-07 R1"). Use a two-line layout: AD number on line 1, description on line 2, badge aligned right of the AD number. Test at 375px with a realistic AD number. I'll provide the card layout spec in Figma.

---

## 6. Finn's Design Notes — Typography, Dark Mode, and Component Adaptations

### 6.1 Typography Scaling

The desktop design uses Inter at specific sizes. Here's what changes on mobile:

| Element | Desktop | Mobile | Rationale |
|---|---|---|---|
| Page heading (H1) | `text-2xl` (24px) | `text-xl` (20px) | Viewport width savings |
| Section heading (H2) | `text-xl` (20px) | `text-lg` (18px) | Same |
| Body text | `text-sm` (14px) | `text-base` (16px) | **iOS anti-zoom + readability** |
| Form labels | `text-sm` (14px) | `text-sm` (14px) | Acceptable — labels are not inputs |
| P/N and S/N (JetBrains Mono) | `text-sm` (14px) | `text-sm` (14px) | Mono is readable at 14px |
| Status badge labels | `text-xs` (12px) | `text-xs` (12px) | Badge is supplementary — icon + color carry meaning |
| Legal / RTS statement body | `text-sm` | `text-base` (16px) | Legal text must be readable — not negotiable |
| Time display (TT hours) | `text-base` | `text-base` | Same, tabular numerals |

`[FC]` The `text-base` (16px) for body on mobile is the single most important typography decision in this document. I will push back on any PR that shrinks body text below 16px on mobile for "visual density" reasons. If a card feels too spacious at 16px, redesign the card — don't shrink the text. Aviation MRO is not a fashion app. Legibility in suboptimal lighting conditions (hangar floor, outdoors, cockpit) is a product requirement.

Line height on mobile: `leading-relaxed` (1.625) for body text, `leading-snug` (1.375) for headings and badge labels. Tighter line height than desktop is acceptable for headings but NOT for body — mechanics reading step descriptions need relaxed line height.

### 6.2 Dark Mode — Tablet-in-Bright-Hangar Scenario

The most overlooked use case: an iPad or large Android tablet mounted on a maintenance stand in a hangar with overhead fluorescent lighting and open hangar doors letting in direct sunlight. The screen is in direct ambient light competition. Standard dark mode makes this worse — dark backgrounds with white text have lower contrast in bright ambient light than light backgrounds.

**Athelon's approach:**
- Dark mode is available but NOT the default on mobile/tablet
- On `prefers-color-scheme: dark` (device is in dark mode): apply our dark theme
- On "High Contrast" mode (device accessibility): apply forced high-contrast palette (this is not the same as dark mode)
- **Bright hangar recommendation:** We add a "High Brightness" mode toggle in Settings (persistent per device, stored in `localStorage`). High Brightness mode: light background (`bg-white`), maximum contrast ratios (WCAG AAA minimum: 7:1 for body text), no gray-on-gray secondary text — secondary text uses `text-gray-700` minimum, not `text-gray-400`.

`[FC]` The `text-gray-400` secondary text color that looks elegant on a desktop in a dim office is completely illegible in a bright hangar. This affects: `DateTimeDisplay` secondary (local time shown below Zulu), task card secondary metadata (assigned-to name, time logged), status badge supporting text. Every instance of `text-gray-400` or lighter in the codebase must be audited for the high-brightness context. My token for mobile secondary text: `text-gray-600` minimum (contrast ratio 5.74:1 on white — not AAA but acceptable; test against actual tablet brightness).

**Status badge colors in bright light:**
- Red ("Overdue," "Error"): `bg-red-600` not `bg-red-400` — the 600 has enough saturation to survive bright ambient light
- Amber ("Warning," "Due Soon"): `bg-amber-500` — test this one; amber is the most ambient-light-sensitive color in our palette
- Green ("Complete," "Airworthy"): `bg-green-600` — compliant at standard brightness
- The `StatusBadge` icon is the primary differentiator in high-brightness conditions — color alone is insufficient (also: accessibility). Ensure icons are consistently sized at 16px within badges and not scaled down at 375px.

### 6.3 Component Adaptations — Mobile Variants

**`WorkOrderCard` → Mobile Compact Variant:**
The card face at 375px shows: Status badge (left) + Tail number (bold, center) + Priority badge (right, top row). Second row: WO type label + task progress "3/5 signed." Third row is removed on mobile (assigned-to, target date — accessible via detail page). Card `min-h-[80px]`, `px-4 py-3`, full-width, `rounded-lg`, `shadow-sm`. Tap anywhere → WO detail.

**`SignOffBlock` (Post-Sign Immutable Display):**
Desktop: wide card with three-column technician info. Mobile: single column, same information in a stacked format. The `signatureHash` display should be truncated (`hash.slice(0, 16) + '...'`) with a tap-to-expand interaction (shows the full hash in a bottom sheet for verification purposes). The full hash is never needed by the mechanic — it's for FAA audit use — but it must be accessible.

**`PartReference` block:**
Desktop: inline three-column (P/N, S/N, NSN) in `JetBrains Mono`. Mobile: stack vertically with labels. P/N always first, bold, `text-sm font-mono`. S/N below. NSN below. Condition badge right-aligned. Tap on the block → part detail sheet (not navigation; keeps the task card context).

**`TimeEntryWidget`:**
This is the one component Finn and Tanya agree needs a dedicated mobile design, not just responsive CSS. Proposal (subject to Figma mock):
- Running timer display: large, centered, `text-4xl font-mono tabular-nums` — readable from arm's length
- "Log Time" CTA: full-width, `h-[64px]`, below the timer
- Manual entry: a secondary CTA that opens a bottom sheet with a large numeric pad for minute entry
- No inline stepper buttons on mobile. Desktop can keep the steppers.

`[FC]` This is a good summary but I want to be clear on the TimeEntry mobile design: the `text-4xl` running timer is correct. A mechanic who has their phone on the workbench while working needs to see the timer from 2–3 feet away without picking up the device. `text-4xl` (36px) at standard iOS text sizes is the minimum for that readability distance. If we go smaller, we've failed the use case. This is the same logic as cockpit instrument design — information at a glance, not on close inspection.

---

## Appendix A — Mobile Component Checklist

Before any component is considered complete for mobile:
- [ ] Renders without horizontal overflow at 375px viewport
- [ ] All interactive elements have `min-h-[60px]` touch targets (confirmed in DevTools device emulation)
- [ ] All text inputs have `font-size: 16px` or larger (iOS Safari anti-zoom)
- [ ] No `text-gray-400` or lighter for informational text in mobile context
- [ ] Tested in Chrome DevTools iPhone SE (375×667) and iPhone 14 Pro (393×852) emulation
- [ ] Sticky CTAs verified above iOS Safari browser chrome (use `env(safe-area-inset-bottom)`)
- [ ] Keyboard management: form pages tested with software keyboard open (use DevTools mobile keyboard simulation)
- [ ] OfflineBanner: tested with `navigator.onLine = false` (DevTools Network → Offline)
- [ ] No table elements on mobile without `overflow-x-scroll` container (prefer list-card pattern)
- [ ] Finn's `[FC]` annotations in this document reviewed and addressed before component sign-off

## Appendix B — iPhone Safari Known Issues / Mitigations

| Issue | Mitigation |
|---|---|
| Sticky bottom elements obscured by browser chrome | `padding-bottom: env(safe-area-inset-bottom)` + `100dvh` instead of `100vh` |
| Input font-size < 16px triggers zoom | `font-size: 16px` on all inputs — no exceptions |
| `position: fixed` elements jump on keyboard open | Use `visualViewport` resize event to adjust positions dynamically |
| Overscroll bounce on scroll containers | `overscroll-behavior: contain` on inner scroll containers |
| Back swipe gesture conflicts with in-app navigation | Use `history.pushState` carefully; test swipe-back behavior on every sheet/modal |
| WebAuthn (Face ID) availability | Async check via `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` before rendering the Face ID option |
| `100vh` includes browser chrome on iOS | Replace `h-screen` / `min-h-screen` with `min-h-[100dvh]` across all layout containers |

---

*Tanya Birch — Mobile Engineer*
*`[FC]` annotations: Finn Calloway — UX/UI Designer*
*2026-02-22*
*Phase 3 Mobile Adaptation — Athelon Aviation MRO SaaS*
*Next: Finn delivers Figma mobile component library (TimeEntryWidget, MobileTabBar, OfflineBanner, sign-off wizard mobile frames) by 2026-02-28. Tanya begins implementation in Week 5.*
