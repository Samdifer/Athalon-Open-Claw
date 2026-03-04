# Athelon — Phase 2 Frontend Architecture
**Authors:** Chloe Park (Frontend Engineer) · Finn Calloway (UX/UI Designer, annotations marked `[FC]`)
**Date:** 2026-02-22
**Status:** Working Draft — Phase 2 Planning

---

> *Everything in Phase 1 was schema and auth contracts. Phase 2 is where those decisions manifest as actual screens a mechanic touches. I'm writing this as a build map, not a spec. Decisions are made here. If something is marked "decided," it's decided — don't re-open it without a reason. — CP*

---

## 1. Next.js App Router Structure

The monorepo root is `apps/web/`. All routes live under `apps/web/app/`. Route groups organize by auth requirement. No page does its own auth logic — that belongs to layouts and middleware.

```
apps/web/
├── app/
│   │
│   ├── (public)/                        # Route group — no Clerk guard
│   │   ├── layout.tsx                   # Minimal layout: no sidebar, no nav
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx             # Clerk's <SignIn /> hosted page
│   │   ├── sign-up/
│   │   │   └── [[...sign-up]]/
│   │   │       └── page.tsx             # Clerk's <SignUp /> hosted page
│   │   └── onboarding/
│   │       ├── page.tsx                 # Org setup / invite acceptance
│   │       └── loading.tsx
│   │
│   ├── (app)/                           # Route group — Clerk guard enforced in layout
│   │   ├── layout.tsx                   # Root app layout: providers, sidebar, header
│   │   ├── loading.tsx                  # Global loading skeleton
│   │   ├── error.tsx                    # Global error boundary (Convex + network errors)
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx                 # Live shop status — Sandra's morning screen
│   │   │   ├── loading.tsx              # Skeleton for WO cards and attention queue
│   │   │   └── error.tsx
│   │   │
│   │   ├── fleet/
│   │   │   ├── page.tsx                 # Aircraft list
│   │   │   ├── loading.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx             # Add aircraft form
│   │   │   └── [tailNumber]/
│   │   │       ├── layout.tsx           # Aircraft context: loads aircraft by tail, tabs
│   │   │       ├── page.tsx             # Aircraft record — Work Orders tab (default)
│   │   │       ├── loading.tsx
│   │   │       ├── history/
│   │   │       │   └── page.tsx         # Maintenance record history
│   │   │       ├── schedule/
│   │   │       │   └── page.tsx         # ADs, inspections due
│   │   │       └── equipment/
│   │   │           └── page.tsx         # Installed engines, components, parts
│   │   │
│   │   ├── work-orders/
│   │   │   ├── page.tsx                 # Work order list — default filter: Active
│   │   │   ├── loading.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx             # Create work order wizard
│   │   │   └── [workOrderId]/
│   │   │       ├── layout.tsx           # WO context: loads WO, status header, tab bar
│   │   │       ├── page.tsx             # WO detail — Task Cards tab (default)
│   │   │       ├── loading.tsx
│   │   │       ├── error.tsx
│   │   │       ├── parts/
│   │   │       │   └── page.tsx         # Parts linked to this WO
│   │   │       ├── notes/
│   │   │       │   └── page.tsx         # Internal shop notes
│   │   │       ├── sign-off/
│   │   │       │   └── page.tsx         # RTS sign-off — DOM/Inspector only
│   │   │       └── tasks/
│   │   │           ├── page.tsx         # Task card list (also the WO default)
│   │   │           ├── new/
│   │   │           │   └── page.tsx     # Add task card to WO
│   │   │           └── [taskCardId]/
│   │   │               ├── page.tsx     # Task card detail + sign-off
│   │   │               └── loading.tsx
│   │   │
│   │   ├── parts/
│   │   │   ├── layout.tsx               # Parts module: tab bar (Requests/Inventory/POs/Receiving)
│   │   │   ├── page.tsx                 # Redirects to /parts/requests
│   │   │   ├── requests/
│   │   │   │   └── page.tsx             # Carlos's primary queue
│   │   │   ├── inventory/
│   │   │   │   ├── page.tsx             # Inventory browser
│   │   │   │   └── [partId]/
│   │   │   │       └── page.tsx         # Individual part record + traceability
│   │   │   ├── purchase-orders/
│   │   │   │   ├── page.tsx             # PO list
│   │   │   │   └── [poId]/
│   │   │   │       └── page.tsx         # PO detail
│   │   │   └── receiving/
│   │   │       └── page.tsx             # Receiving queue + intake flow
│   │   │
│   │   ├── squawks/
│   │   │   ├── page.tsx                 # Open squawk list
│   │   │   ├── new/
│   │   │   │   └── page.tsx             # Create squawk (fast path, ≤4 taps)
│   │   │   └── [squawkId]/
│   │   │       └── page.tsx             # Squawk detail + auth actions
│   │   │
│   │   ├── compliance/
│   │   │   ├── layout.tsx               # Compliance tab bar
│   │   │   ├── page.tsx                 # Redirects to /compliance/audit-trail
│   │   │   ├── audit-trail/
│   │   │   │   └── page.tsx             # Filterable, read-only audit log
│   │   │   ├── certificates/
│   │   │   │   └── page.tsx             # Personnel certificate tracking
│   │   │   ├── rts-records/
│   │   │   │   └── page.tsx             # Return-to-service records
│   │   │   └── documents/
│   │   │       └── page.tsx             # Regulatory document library
│   │   │
│   │   ├── personnel/
│   │   │   ├── page.tsx                 # Team roster
│   │   │   └── [personnelId]/
│   │   │       └── page.tsx             # Individual personnel record
│   │   │
│   │   └── settings/
│   │       ├── layout.tsx               # Settings tab bar
│   │       ├── page.tsx                 # Redirects to /settings/shop
│   │       ├── shop/
│   │       │   └── page.tsx             # Shop profile, Part 145 cert, ratings
│   │       └── roles/
│   │           └── page.tsx             # RBAC configuration (DOM only)
│   │
│   ├── api/
│   │   └── webhooks/
│   │       └── clerk/
│   │           └── route.ts             # Clerk webhook receiver — public, no auth
│   │
│   ├── layout.tsx                       # Root layout — Providers wrapper only
│   ├── not-found.tsx                    # Global 404
│   └── global-error.tsx                 # App-wide error boundary (outside root layout)
│
├── components/
│   ├── ui/                              # Primitive design system components
│   │   ├── StatusBadge.tsx
│   │   ├── TaskCard.tsx
│   │   ├── PartReference.tsx
│   │   ├── DateTimeDisplay.tsx
│   │   ├── AirframeHours.tsx
│   │   ├── SignOffBlock.tsx             # Immutable post-sign display
│   │   ├── ErrorState.tsx              # Tier 1/2/3 error anatomy
│   │   └── EmptyState.tsx
│   ├── layout/
│   │   ├── AppSidebar.tsx
│   │   ├── AppHeader.tsx               # Station switcher, search, timer bar
│   │   ├── MobileTabBar.tsx
│   │   └── OfflineBanner.tsx
│   ├── work-orders/                     # Domain-specific composites
│   ├── task-cards/
│   ├── parts/
│   └── sign-off/                        # Sign-off flow: Review → Auth → Confirm
│
├── convex/                              # Symlink or package ref to /convex
├── lib/
│   ├── types/                           # Shared TypeScript types
│   ├── hooks/                           # Custom React hooks
│   ├── validators/                      # Zod schemas for forms
│   └── utils/
│
├── middleware.ts                         # Clerk middleware — route protection
└── providers.tsx                         # ClerkProvider + ConvexProviderWithClerk
```

**Layout hierarchy note:** The `(app)/layout.tsx` is where `ConvexProviderWithClerk` wraps everything. The root `layout.tsx` is provider-only (Providers wrapper, font loading). Never put data-fetching in root layout — it runs on every route including public ones.

`[FC]` The `(app)` vs `(public)` route group split is the right call. The sidebar and header never render on sign-in/sign-up — that was one of Corridor's visual awkwardnesses. Clean boundary here.

---

## 2. Convex React Integration Patterns

### 2.1 Provider Setup

```typescript
// app/providers.tsx — ConvexProviderWithClerk wraps the app shell
// app/(app)/layout.tsx — This layout can safely useQuery/useConvexAuth
// Never lift Convex queries into the root layout — it's outside auth context
```

### 2.2 useQuery Patterns for MRO Context

**The core rule:** Every query is org-scoped at the Convex layer. The frontend never passes an `orgId` argument — it's derived from the JWT's `org_id` claim inside the Convex function via `requireOrgContext()`. This means query args from the frontend are always entity-specific, never org-specifying.

```typescript
// hooks/useWorkOrders.ts
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// List queries — no orgId arg needed (scoped server-side)
export function useWorkOrders(filter?: { status?: WorkOrderStatus }) {
  return useQuery(api.workOrders.list, filter ?? {});
  // Returns undefined while loading, null if auth missing, array when ready
}

// Single-record queries — pass the Convex document ID
export function useWorkOrder(workOrderId: Id<"workOrders">) {
  return useQuery(api.workOrders.get, { workOrderId });
}

// Real-time: useQuery is reactive by default. No polling needed.
// When the work order status changes (e.g., in_progress → pending_signoff),
// this hook re-renders automatically. That's the Convex value prop.
```

**Loading state discipline:** `useQuery` returns `undefined` while loading. I'm standardizing on a pattern where components render a skeleton at `undefined` and full UI at a real value. I'm NOT using the `isLoading` pattern because it's redundant — `undefined` means loading.

```typescript
// components/work-orders/WorkOrderDetail.tsx
const workOrder = useWorkOrder(workOrderId);

if (workOrder === undefined) return <WorkOrderSkeleton />;
// workOrder is now fully typed — no optional chaining needed
```

### 2.3 useMutation Patterns — Optimistic Updates

Optimistic updates matter most for the mechanic's most frequent action: time logging. A 1-second perceived latency on "log time" will generate complaints. We fake the write and roll back on error.

```typescript
// hooks/useLogTime.ts
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOptimistic } from "react";

export function useLogTime() {
  const logTimeMutation = useMutation(api.taskCardSteps.logTime)
    .withOptimisticUpdate((localStore, args) => {
      // Immediately update the task card's time display
      const existing = localStore.getQuery(api.taskCards.get, {
        taskCardId: args.taskCardId,
      });
      if (existing) {
        localStore.setQuery(
          api.taskCards.get,
          { taskCardId: args.taskCardId },
          {
            ...existing,
            // Optimistically show new total
            totalTimeLoggedMinutes:
              (existing.totalTimeLoggedMinutes ?? 0) + args.durationMinutes,
          }
        );
      }
    });
  return logTimeMutation;
}
```

**Optimistic update scope — what gets it:**
- Time logging (high frequency, low risk)
- Adding notes to task cards
- Marking a step as in-progress

**What does NOT get optimistic updates:**
- Sign-off mutations (must reflect server-confirmed state — legal record)
- Part issuing (inventory state must be authoritative)
- Status transitions on work orders

`[FC]` The sign-off confirmation screen must only render after the Convex mutation resolves — not optimistically. If we show "Signed ✓" before server confirmation and a network error occurs, a mechanic might walk away thinking a regulatory record was created when it wasn't.

### 2.4 Real-Time Subscriptions — Work Order Status

This is the killer feature for the DOM's dashboard. Sandra's screen auto-updates when Ray signs a task card. No refresh. No polling. This just works because `useQuery` is a live subscription.

```typescript
// app/(app)/dashboard/page.tsx
// All of these re-render in real time when underlying data changes

const activeWorkOrders = useQuery(api.workOrders.listActive);
// Re-renders when any WO in the org transitions status

const attentionItems = useQuery(api.dashboard.getAttentionQueue);
// Re-renders when a squawk is created, an auth is needed, or a WO goes overdue

const openSquawks = useQuery(api.squawks.listOpen);
```

**Task card step sign-off propagation:** When Ray signs TC-007, the following chain happens automatically without any frontend polling:
1. `signTaskCardStep` mutation runs, updates `taskCardSteps` table
2. Convex also updates `taskCards.completedStepCount` in the same mutation
3. If all steps complete → `taskCards.status` transitions to `complete`
4. If all task cards complete → `workOrders.status` can transition to `pending_signoff`
5. Every `useQuery` subscriber watching these records re-renders

Sandra sees the work order flip to `pending_signoff` on her dashboard in real time. That's the value proposition delivered.

### 2.5 useConvexAuth

```typescript
// Used in layouts to guard rendering — not for security, for UX
import { useConvexAuth } from "convex/react";

function AppLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <GlobalLoadingSpinner />;
  if (!isAuthenticated) return null; // Middleware handles redirect
  return <AppShell />;
}
```

The `isAuthenticated` check here is UX guard only. The actual data never loads if Convex auth is missing — all queries return `undefined` / throw. Clerk middleware blocks the route before this even renders for truly unauthenticated requests.

---

## 3. Component Implementation Plan

**Priority order: work order engine first.** Everything else is secondary to the loop of `create WO → assign tasks → log time → sign off → RTS`. That loop is what makes Athelon usable on day one.

### Wave 1 — Foundation (Week 1, Chloe owns all of this)

These are prerequisites for everything else. Build these before any page component.

| Component | Why First | Depends On |
|---|---|---|
| `StatusBadge` | Used in every list view, header, and card | Design tokens only |
| `DateTimeDisplay` | Zulu time on every compliance record | Formatter utils |
| `AirframeHours` | Airframe TT display with comma + "hr" — used everywhere | None |
| `ErrorState` | Tier 1/2/3 error anatomy | Design tokens |
| `EmptyState` | All list views need this | Design tokens |
| `OfflineBanner` | Tanya's hard requirement | Connectivity hook |
| `AppSidebar` + `MobileTabBar` | Navigation shell | `useOrgRole` hook |

`[FC]` StatusBadge is the most foundational component in the library. The design spec is locked — color, icon, label, all three channels. If implementation deviates from the icon+color+label trinity, it fails the component checklist. This is not a stylistic preference.

### Wave 2 — Work Order Engine (Week 1–2)

| Component | Priority | Depends On |
|---|---|---|
| `WorkOrderCard` (list view) | P0 | StatusBadge, DateTimeDisplay |
| `WorkOrderList` page | P0 | WorkOrderCard, useWorkOrders hook |
| `WorkOrderHeader` (detail layout) | P0 | StatusBadge, AirframeHours |
| `TaskCardListItem` (collapsed) | P0 | StatusBadge |
| `TaskCardDetail` page | P0 | TaskCardListItem, PartReference, TimeEntry |
| `TimeEntryWidget` (timer + manual) | P0 | useLogTime, timer hook |
| `SignOffFlow` (Review→Auth→Confirm) | P0 | SignOffBlock, Clerk re-auth |
| `PartReference` block | P1 | JetBrains Mono font loaded |

`[FC]` TaskCardListItem in "ready to sign" state (inline SIGN OFF button) is the single most important UI state in the application. More than the sign-off flow itself — because it's the prompt that gets the mechanic to the sign-off. That affordance needs to be impossible to miss. Large blue button, right-aligned, full row height.

### Wave 3 — Parts + Squawks (Week 2–3)

| Component | Priority | Notes |
|---|---|---|
| `PartsRequestCard` | P1 | Carlos's queue — ORDER NOW / PULL buttons inline |
| `InventoryBrowser` | P1 | Search + filter + PartReference |
| `ReceivingForm` | P1 | Barcode scan affordance (input, not camera API yet) |
| `SquawkCard` | P1 | Amber left border, photo attached indicator |
| `SquawkCreateForm` | P0 | Fast path — 4 taps — needs to be complete in Wave 2 |

### Wave 4 — Compliance + Personnel (Week 3–4)

| Component | Priority | Notes |
|---|---|---|
| `AuditTrailTable` | P2 | Read-only, filterable, export |
| `CertificateCard` | P2 | IA expiry prominence |
| `RTSRecord` (display) | P2 | Post-sign-off immutable record |
| `PersonnelCard` | P2 | Role badge, cert status, hours summary |

---

## 4. Auth-Gated Route Patterns

### 4.1 The Three Layers

```
Layer 1: Clerk middleware (middleware.ts)
  — Blocks unauthenticated requests from reaching any (app)/ route
  — Redirects to /sign-in if no Clerk session
  — Fast (Edge runtime) — no Convex call

Layer 2: Layout-level org check (app/(app)/layout.tsx)
  — Verifies user has an active org membership via useConvexAuth + useQuery
  — Redirects to /onboarding if no org (new user, invite pending)
  — This is the UX guard

Layer 3: Convex server-side (every query/mutation)
  — requireOrgContext() + requireOrgMembership() on every protected fn
  — Throws if role is insufficient — frontend catches and shows permission error
  — This is the real security gate
```

### 4.2 Middleware

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/api/webhooks/(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect(); // Redirects to sign-in if no session
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
```

### 4.3 Role-Based UI Gating

I'm building `useOrgRole()` to gate UI elements synchronously (no Convex query on render). It reads from the Clerk session's JWT claim `athelon_role`.

```typescript
// lib/hooks/useOrgRole.ts
import { useAuth } from "@clerk/nextjs";

export type MroRole = "dom" | "supervisor" | "inspector" | "amt" | "viewer";

const ROLE_LEVEL: Record<MroRole, number> = {
  viewer: 1, amt: 2, inspector: 3, supervisor: 4, dom: 5,
};

export function useOrgRole() {
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.athelon_role as MroRole) ?? "viewer";
  return {
    role,
    can: (action: keyof typeof PERMISSION_MAP) =>
      PERMISSION_MAP[action].includes(role),
    isAtLeast: (minimum: MroRole) =>
      ROLE_LEVEL[role] >= ROLE_LEVEL[minimum],
  };
}

// Used in components:
const { can, isAtLeast } = useOrgRole();
// Show sign-off button only if role can perform RTS
{isAtLeast("inspector") && <RTSSignOffButton />}
// Show authorize button on squawk cards only for DOM
{can("authorizeSquawk") && <AuthorizeButton squawkId={squawk._id} />}
```

`[FC]` Role-gated UI elements that are hidden (not just disabled) must be hidden with intent — not by accident. If an AMT can't authorize a squawk, the AUTHORIZE button should not render at all, not render grayed out. A grayed-out button raises questions. An absent button doesn't.

### 4.4 Sign-Off Route Protection

The `/work-orders/[id]/sign-off` page gets an additional layout-level role check:

```typescript
// app/(app)/work-orders/[workOrderId]/sign-off/page.tsx
export default async function SignOffPage() {
  // Server component: read Clerk session server-side
  const { sessionClaims } = auth();
  const role = sessionClaims?.athelon_role as MroRole;

  if (!["dom", "inspector"].includes(role)) {
    redirect("/work-orders"); // Doesn't error — silently routes away
  }
  // Render the sign-off page for authorized roles
}
```

This is defense-in-depth: middleware (Clerk session), page-level (role check), and Convex (permission enforcement). Three layers, three opportunities to catch unauthorized access.

---

## 5. TypeScript Conventions

### 5.1 Shared Types Between `convex/` and `apps/web/`

The Convex data model generates types automatically from the schema. I'm using those generated types directly in the frontend — no manual type duplication.

```typescript
// In frontend code:
import { Doc, Id } from "@/convex/_generated/dataModel";

// Work order document type — generated from schema
type WorkOrder = Doc<"workOrders">;

// Reference to another table
type WorkOrderId = Id<"workOrders">;

// Deriving UI-specific types from the schema types
type WorkOrderStatus = WorkOrder["status"]; // "draft" | "open" | "in_progress" | ...
type WorkOrderPriority = WorkOrder["priority"]; // "routine" | "urgent" | "aog"
```

**No `any` in domain types.** If a type boundary is unclear, use `unknown` and narrow it. `any` is a compile error in our tsconfig. If I see `any` in a PR touching a task card or work order component, it's rejected.

### 5.2 Zod for Form Validation

Forms that create or update Convex records get a Zod schema. The Zod schema is the single source of truth for form validation — not ad-hoc `if (!value)` checks scattered across components.

```typescript
// lib/validators/workOrder.ts
import { z } from "zod";

export const createWorkOrderSchema = z.object({
  aircraftId: z.string().min(1, "Select an aircraft"),
  workOrderType: z.enum([
    "routine", "unscheduled", "annual_inspection", "100hr_inspection",
    "progressive_inspection", "ad_compliance", "major_repair",
    "major_alteration", "field_approval", "ferry_permit",
  ]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["routine", "urgent", "aog"]),
  aircraftTotalTimeAtOpen: z.number()
    .min(0, "Airframe time must be 0 or greater")
    .max(99999.9, "Verify airframe time"),
  targetCompletionDate: z.number().optional(),
  squawks: z.string().optional(),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
```

Forms use `react-hook-form` + `zodResolver`. No bespoke form state management. I'm not reinventing form handling in an MRO app when we have 40-field forms coming.

```typescript
// In a form component:
const form = useForm<CreateWorkOrderInput>({
  resolver: zodResolver(createWorkOrderSchema),
  defaultValues: { priority: "routine" },
});
```

### 5.3 Strict Null Handling

`"strict": true` + `"noUncheckedIndexedAccess": true` are active. This surfaces itself in a few patterns:

**Convex query results are `undefined | null | T`:**
- `undefined` = still loading
- `null` = authenticated but no record found
- `T` = the data

Never write `workOrder?.status === "open"` on a component's top-level — render null/skeleton instead and work with `workOrder` as non-optional below.

**Exhaustive status checks:** Work order statuses are a discriminated union. When I switch on `status`, TypeScript forces me to handle every case. This is intentional — when Devraj adds a new status, the frontend fails to compile until we handle it. No silent "unknown status shows nothing" bugs in regulatory software.

```typescript
function getStatusBadgeVariant(status: WorkOrderStatus): BadgeVariant {
  switch (status) {
    case "draft": return "pending";
    case "open": return "active";
    case "in_progress": return "active";
    case "on_hold": return "warning";
    case "pending_inspection": return "pending";
    case "pending_signoff": return "warning";
    case "open_discrepancies": return "error";
    case "closed": return "complete";
    case "cancelled": return "cancelled";
    case "voided": return "cancelled";
    // TypeScript errors here if a status is unhandled — good.
  }
}
```

`[FC]` Exhaustive status switches mean the StatusBadge always shows something meaningful. "Unknown status" is not a badge variant that should exist. If TypeScript is forcing an unhandled case, it means the design spec needs to define that status's visual treatment — that's a design task, not a frontend workaround.

---

## 6. First Sprint Plan — Chloe, Week 1

Monday is design-token setup and provider wiring. By Friday, a mechanic with a test account can open a work order and view task cards with live Convex data. Sign-off is not in Week 1 — the auth event flow (Jonas's `signatureAuthEvents` table) needs to be ready server-side first.

### Day 1 (Monday) — Foundation
- [ ] `apps/web` Next.js App Router project scaffolding
- [ ] `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`
- [ ] `providers.tsx` — `ClerkProvider` + `ConvexProviderWithClerk`
- [ ] `middleware.ts` — Clerk route protection, public route list
- [ ] CSS design tokens from Finn's spec → Tailwind config extension (colors, spacing, radius, z-index)
- [ ] Inter + JetBrains Mono font loading (`next/font/google`)
- [ ] `(public)/` route group — sign-in / sign-up pages using Clerk components
- [ ] `(app)/layout.tsx` — sidebar + header shell (unstyled, wired to `useConvexAuth`)

### Day 2 (Tuesday) — Core UI Primitives
- [ ] `StatusBadge` component — all variants from Finn's spec, icon+color+label mandatory
- [ ] `DateTimeDisplay` component — Zulu primary, local secondary, ISO date-only variant
- [ ] `AirframeHours` component — formatted with comma, "hr" suffix, tabular numerals
- [ ] `ErrorState` component — Tier 1 (blocking), Tier 2 (warning), Tier 3 (info) anatomy
- [ ] `EmptyState` component — contextual message, action CTA
- [ ] `OfflineBanner` — persistent amber banner + queued action count
- [ ] Storybook stories for all 6 primitives with Finn's component checklist as story docs

### Day 3 (Wednesday) — Navigation Shell + Auth Hooks
- [ ] `useOrgRole()` hook — reads JWT `athelon_role` claim, returns `can()` + `isAtLeast()`
- [ ] `AppSidebar` — icon + label mode, active state, role-filtered nav items
- [ ] `MobileTabBar` — 5-item bottom bar, "More" drawer for Fleet + Compliance
- [ ] `AppHeader` — station name/switcher, `⌘K` search placeholder, notification bell
- [ ] `StationSwitcher` — org list from Clerk + station metadata from Convex
- [ ] `/dashboard` page stub — uses `useQuery(api.workOrders.listActive)` — confirms live data

### Day 4 (Thursday) — Work Order List + Detail
- [ ] `useWorkOrders(filter)` hook — status filter, real-time via Convex `useQuery`
- [ ] `useWorkOrder(id)` hook
- [ ] `WorkOrderCard` component — status badge, tail number, WO type, progress `X/N signed`, parts status
- [ ] `/work-orders` page — tab filters (Active default), list of WorkOrderCards, loading skeleton
- [ ] `WorkOrderHeader` — status badge, aircraft info, opened date, customer, priority
- [ ] `/work-orders/[workOrderId]` layout — loads WO, passes to children via context
- [ ] `/work-orders/[workOrderId]/page.tsx` — task card tab, delegates to TaskCardList

### Day 5 (Friday) — Task Cards
- [ ] `TaskCardListItem` — collapsed view: status, TC number, title, who/when/time, SIGN OFF button when `signOffReady`
- [ ] `TaskCardListItem` blocked state — amber left border, blocking reason inline
- [ ] `/work-orders/[workOrderId]/tasks/page.tsx` — live list of task cards via `useQuery`
- [ ] `PartReference` block — P/N + S/N + NSN in JetBrains Mono, condition badge
- [ ] `/work-orders/[workOrderId]/tasks/[taskCardId]/page.tsx` — full task card detail (read state; sign-off wired Week 2)
- [ ] `TimeEntryWidget` — running timer + manual entry with large steppers, `useLogTime` hook

**End of Week 1 checkpoint:** Live data visible through the work order → task card hierarchy. Mechanic can view their assigned work. Time logging works. Sign-off is blocked pending Jonas's `signatureAuthEvents` endpoint — that's fine, we stub the button with "Auth not ready yet" state.

`[FC]` The Week 1 checkpoint is important not just for feature progress but for Finn to validate the component implementations against the design checklist before we build more. Block a 2-hour session Friday afternoon: I walk through the Storybook stories and the live `/dashboard` and `/work-orders` pages. Anything that fails the checklist (contrast, touch targets, Zulu time, status channels) gets a ticket before Week 2 starts. Fix foundation issues before the house is built on them.

---

## Appendix A — Environment Variables Checklist

| Variable | Where Set | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel | Clerk browser SDK |
| `CLERK_SECRET_KEY` | Vercel | Clerk server-side |
| `NEXT_PUBLIC_CONVEX_URL` | Vercel | Convex deployment URL |
| `CLERK_WEBHOOK_SECRET` | Vercel | Validate Clerk webhooks |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex dashboard | JWT verification |

## Appendix B — Convex Query Naming Conventions

All Convex query/mutation names follow `table.verb` or `domain.verb` patterns:
- `workOrders.list` — list with filters
- `workOrders.get` — single record by ID
- `workOrders.create` — new record
- `workOrders.updateStatus` — status transition
- `taskCardSteps.signOff` — sign a step (high-stakes, requires fresh token)
- `dashboard.getAttentionQueue` — cross-table aggregation for DOM dashboard

These names are stable contracts between frontend and backend. Renaming them without coordinating with Chloe breaks builds.

---

*Chloe Park — 2026-02-22*
*`[FC]` annotations: Finn Calloway*
*Next: Figma component library → Week 3 review. Storybook setup in Week 1.*
