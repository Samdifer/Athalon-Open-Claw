# Athelon — Phase 3 Web Implementation
**Author:** Chloe Park, Frontend Engineer  
**Date:** 2026-02-22  
**Sprint:** Week 1 — Foundation + Work Order Engine

---

> *I read all three Phase 1 docs before writing a line. The choices in here are defensible. If something looks wrong, ask me before changing it — there's probably a reason from the spec. — CP*

---

## What's in this directory

```
phase-3-implementation/web/
├── lib/
│   └── auth.ts                   ✅ Done — useOrgRole hook, MroRole types, hasMinimumRole
├── components/
│   ├── StatusBadge.tsx            ✅ Done — all 13 variants (12 in spec + SHELF_LIFE)
│   ├── WorkOrderCard.tsx          ✅ Done — list item, skeleton, full Convex Doc shape
│   └── TaskCardStep.tsx           ✅ Done — sign flow, pending/signing/signed states
└── app/
    └── (app)/
        └── work-orders/
            └── page.tsx           ✅ Done — useQuery, skeleton, empty state, role gate
```

---

## Components Built

### `lib/auth.ts` — Auth Hook

`useOrgRole()` reads `athelon_role` from Clerk's JWT session claims. Returns:

```typescript
const { role, can, isAtLeast, displayName, isLoaded } = useOrgRole();

can("createWorkOrder")    // → boolean
isAtLeast("inspector")    // → boolean
role                      // → MroRole: "dom" | "supervisor" | "inspector" | "amt" | "viewer"
```

**Pattern used:** Synchronous JWT claim read — no Convex round-trip on render. The hook is UX gating only. Server-side enforcement in Convex is the real gate (Jonas's `requireOrgMembership`).

Also exports `hasMinimumRole(userRole, minimum)` as a pure function for use in Server Components or Convex functions without the hook.

---

### `StatusBadge.tsx` — All Variants

13 variants (spec lists 12 explicit + SHELF_LIFE in the table footnote — I included it):

| Variant | Icon | Color |
|---|---|---|
| `active` | ● filled circle | green-600 |
| `pending` | ○ open circle | blue-600 |
| `on_hold` | ⚠ warning triangle | amber-600 |
| `overdue` | ✕ x-mark | red-600 |
| `signed` | ✓ checkmark | green-600 |
| `complete` | ✓ checkmark | green-600 |
| `deferred` | — dash | gray-600 |
| `cancelled` | — dash | gray-600 |
| `awaiting_auth` | ⚠ warning triangle | amber-600 |
| `on_order` | ○ open circle | blue-600 |
| `in_stock` | ✓ checkmark | green-600 |
| `out_of_stock` | ✕ x-mark | red-600 |
| `shelf_life_critical` | ⚠ warning triangle | red-600 + pulse |

**Deuteranopia safety:** Red (`overdue`, `out_of_stock`) uses ✕ icon. Green (`signed`, `complete`, `in_stock`) uses ✓ checkmark. `active` uses ● filled circle. These are visually distinct in grayscale and with deuteranopia. Following Finn's three-channel rule: color + icon + label.

**Three size variants:** `sm` (20px), `default` (24px), `lg` (32px).

**Inline SVG icons** — no external icon library dependency. Reduces bundle size, no version mismatch risk, icons are exactly what the spec describes.

Convenience functions: `workOrderStatusToVariant(status)` and `taskCardStatusToVariant(status)` map Convex string values to badge variants. TypeScript non-exhaustive switch warnings catch new status values at compile time.

---

### `WorkOrderCard.tsx` — Work Order List Item

Uses `WorkOrderDoc` type that mirrors `Doc<"workOrders">` from Convex schema. Shape includes denormalized `tailNumber`, `customerName`, `assignedTechNames` for list performance (no extra joins on the list query).

**Displays:**
- Status badge (variant from `workOrderStatusToVariant`)
- WO number in `font-mono` (Finn's spec: WO IDs in monospace, always)
- Elapsed time since opened (e.g. "3d", "14h")
- Aircraft tail + make/model + work order type
- Customer name
- Opened date (ISO 8601: `2026-02-21`)
- Assigned techs (first two names, "+N" overflow)
- Task card progress: `X/N signed` — **not a percentage** (spec is explicit: percentages imply uniform task weight, which is false in MRO)
- Parts status badge (pending request, on order) — only when relevant

**AOG priority:** Red left border + "AOG" label with icon when `priority === "aog"`.  
**Overdue:** Amber left border + inline warning text when past `targetCompletionDate`.

**Skeleton:** `animate-pulse` placeholder matching the real card height. Used while `workOrder === undefined` (Convex loading state).

**Full-width tap target** — the `Link` wraps the entire card, not just the text. Tanya's requirement.

---

### `TaskCardStep.tsx` — Individual Task Step

Manages its own local sign state (`idle → confirming → authenticating → submitting → error`). After server confirms, flips to `localSigned = true` which shows the immutable signed block.

**Sign flow (Week 2 — NOT yet wired to real mutations):**
1. `SIGN OFF` button clicked → shows confirmation dialog with certification statement
2. `PROCEED TO SIGN` → calls `createSignatureAuthEvent` mutation → gets `eventId`
3. Clerk step-up auth (TODO: wire Clerk SDK — Jonas's `signatureAuthEvents` endpoint needed)
4. Calls `completeStep` mutation with `{ stepId, taskCardId, signatureAuthEventId }`
5. Convex checks token freshness (< 15 min), validates auth event, writes audit record
6. UI flips to signed state **only after server confirms** — never optimistically

**Signed block** shows: who signed, cert number, Zulu timestamp (primary) + local time (secondary), signature UUID with audit trail link.

**States handled:**
- `pending` — open circle icon, sign button if eligible
- `signed` — green left border, immutable signed block
- `blocked` — amber left border, inline blocker reason (never a tooltip — always visible)
- `in_progress` — treated same as pending visually
- `na` — greyed out with strikethrough

The `TOKEN_STALE` error from Convex is intercepted and triggers re-auth copy, not a generic error.

---

### `app/(app)/work-orders/page.tsx` — Work Orders List Page

Client component. Tabs: Active (default), On Hold, Pending Auth, Awaiting Parts, Complete, All.

**Default filter is "Active"** — per spec §4.4 note: "New users won't search in the wrong bucket (the Corridor mistake)." Active = `open` + `in_progress` statuses.

**Role gating:**
- `New Work Order` button: `isAtLeast("supervisor")` — only in page header
- Mobile FAB: same gate
- Empty state CTA: `can("createWorkOrder")` — slightly broader (includes inspector, amt)

TODO with Nadia: confirm whether AMTs should see the create button on the list page or only from task context. Currently gated to supervisor+.

**Loading skeleton:** 5 WorkOrderCard skeletons while `useQuery` returns `undefined`.

**Empty state:** Custom copy per filter tab. Explains *why* it might be empty (aviation-specific, per spec §6.3 empty state principles). Links to create WO if authorized.

**Mobile FAB** at `bottom-20` (above mobile tab bar) — only on `sm:` breakpoint and below.

---

## Patterns Used

### `useQuery` = undefined means loading
Not `isLoading: true`. Components check `=== undefined` for skeleton state. This is the Convex convention and avoids redundant booleans.

```typescript
const workOrders = useQuery(api.workOrders.list, {});
if (workOrders === undefined) return <Skeleton />;
// workOrders is fully typed below — no optional chaining needed
```

### Role as a JWT claim, not a Convex query
`useOrgRole()` reads from `sessionClaims.athelon_role` — synchronous, no loading state on role check. This means role-gated UI doesn't flicker or require a secondary loading state. The Clerk JWT is always available before the component renders.

### Exhaustive status switches catch new statuses at compile time
`workOrderStatusToVariant` and `taskCardStatusToVariant` use switch statements with a `default` fallback that logs a warning in dev. When Devraj adds a new status to the Convex schema, TypeScript will surface it here if we tighten the type (removing the default). Currently lenient to avoid crashes during development.

### No `any` in domain types
All component props use real TypeScript types. The `WorkOrderDoc` and `TaskCardStepDoc` interfaces mirror the Convex schema exactly. When the Convex deploy is live, we swap `import type { Doc } from "@/convex/_generated/dataModel"` and delete the local interfaces — they should match 1:1.

### Inline SVG icons, no icon library
Three reasons: (1) bundle size — Lucide React adds ~50KB for a small icon set; (2) the spec icons are simple and geometric, trivially reproducible in SVG; (3) no version coupling. Downside: more code per icon. Worth it for these foundational components.

---

## What Finn Still Needs to Review

Before Week 1 checkpoint (Friday PM session):

- [ ] **StatusBadge sizing** — 24px default height, 13px font, 4px border-radius. Verify this matches Figma (Figma not yet built as of this writing).
- [ ] **WorkOrderCard density** — 72px minimum row height per Tanya's spec. Check on a real phone in Comfortable mode.
- [ ] **AOG + Overdue left border** — spec mentions amber left border for blocked task cards; I've extended this pattern to AOG (red) and overdue (amber) on work order cards. Intentional — get Finn's sign-off.
- [ ] **Tab filter bar** — current implementation uses border-bottom highlight. Spec doesn't define tab style explicitly. This is my call — open to feedback.
- [ ] **Empty state illustrations** — I'm using stroke SVG icons as placeholders. Finn's spec mentions "simple, contextual" illustrations. Figma pass needed before Week 2.
- [ ] **Skeleton heights** — placeholder card heights are approximate. Eyeballed against real card content. May need adjustment once Figma layout is final.
- [ ] **TaskCardStep — sign confirmation copy** — the certification statement is placeholder text. Needs legal review (Nadia) and Finn review for tone/clarity.
- [ ] **Mobile FAB position** — `bottom-20` assumes a 5-tab bottom bar of ~80px. If MobileTabBar height changes, this breaks. Need to wire to a CSS variable.

---

## What's Missing Before Week 2

### Blocked on Jonas (`signatureAuthEvents` endpoint):
- `TaskCardStep` sign button currently stubs both Convex mutations and throws on use
- Real `completeStep` mutation call needs `signatureAuthEventId` from server
- Clerk step-up auth not wired — currently proceeds directly to mutation (dev only)
- `TOKEN_STALE` error handling is coded and ready; needs real Convex errors to test

### Not yet built (Wave 2 — Week 1 Thursday/Friday per plan):
- `WorkOrderHeader` — detail layout header with status badge, aircraft info, priority
- `TaskCardListItem` — collapsed list view (different from TaskCardStep — this is the WO-level summary row)
- `/work-orders/[workOrderId]/` layout + page — WO detail with task card list
- `/work-orders/[workOrderId]/tasks/[taskCardId]/` — full task card detail page
- `TimeEntryWidget` — timer + manual time entry (useLogTime hook)

### lib/utils.ts needed:
The components import `cn` from `@/lib/utils`. This is the standard shadcn/ui utility:
```typescript
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```
Add `clsx` and `tailwind-merge` to `package.json`. This file isn't in this PR because it's part of the Day 1 scaffold.

### Storybook stories:
StatusBadge, WorkOrderCard, and TaskCardStep all need Storybook stories with Finn's component checklist as story docs. Required before Week 1 checkpoint. Stories blocked on Storybook setup (Day 1 task, not yet done).

### `font-mono` config:
Components use `font-mono` (JetBrains Mono per spec). This requires the Tailwind config to map `fontFamily.mono` to JetBrains Mono loaded via `next/font/google`. Currently inherits system mono. Add to `tailwind.config.ts` during Day 1 scaffold.

---

## Environment Notes

No environment variables needed for these components directly. They rely on:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — for `useAuth()` in `useOrgRole()`
- `NEXT_PUBLIC_CONVEX_URL` — for `ConvexProviderWithClerk` in the app layout
- The Convex JWT template in Clerk must include `athelon_role` in the claims

See `clerk-convex-auth-design.md §4.1` for the full JWT template.

---

## Open Questions

1. **AMT create WO button on list page** — Permission matrix says AMTs can create WOs. My current implementation gates the list-page button to supervisor+. Do AMTs get the button too, or only from the aircraft record page? Tagging Nadia.

2. **`on_hold` vs `pending_signoff` status badge** — Both currently map to `awaiting_auth` variant in `workOrderStatusToVariant`. `on_hold` probably deserves its own variant (`on_hold` badge variant, amber ⚠). Added to backlog.

3. **TaskCardStep vs TaskCardListItem** — These are two different components. `TaskCardStep` is one step within a task card (sign individual steps). `TaskCardListItem` is the collapsed task card row within a work order (sign the whole task card). The task asked for `TaskCardStep` — I built that. `TaskCardListItem` is Wave 2 Thursday.

4. **`workOrders.list` query signature** — I've assumed args `{ statuses?: string[], awaitingParts?: boolean }`. If Devraj's actual query uses different arg names, the page.tsx query call needs to update. Convex query naming per appendix B in frontend-architecture.md: `workOrders.list`.

---

*Chloe Park — Phase 3 Week 1*  
*Next: Day 3 — useOrgRole wired, AppSidebar, WorkOrderHeader*  
*Storybook setup required before Friday review session with Finn*
