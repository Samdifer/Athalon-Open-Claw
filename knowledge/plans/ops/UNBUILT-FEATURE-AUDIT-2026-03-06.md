# Unbuilt Feature Audit — 2026-03-06

Scope reviewed:
- `apps/athelon-app/docs/ops/BUILD-AGENT-QUEUE-V3.md`
- `docs/CONSOLIDATED-SCHEDULER-PLAN-v2.md`
- current repo artifacts under `apps/athelon-app`

## Executive findings

1. **Plan/queue drift exists**: completed Wave 7 recovery commits delivered *different scope* than the Wave 7 MBP list in queue.
2. **At least one planned artifact is missing**: `app/(app)/personnel/[id]/training/page.tsx`.
3. **PWA/offline appears partial**: install prompt exists, but no clear service worker/Vite PWA pipeline detected.
4. **Wave 8 test verification gap previously existed** due missing `pnpm` (now installed).

---

## Detailed status matrix

## A) Wave 7 queue MBPs vs delivered commits

Queue currently labels Wave 7 MBPs as:
- TEAM-M: dark mode, Cmd-K palette, activity timeline, keyboard shortcuts, bulk CSV import
- TEAM-N: parts reorder alerts, MEL deferral tracking, shift handoff dashboard, fleet calendar, PWA offline

Recovery commits actually delivered:
- `30345b7` — multi-location onboarding + per-location cert display
- `21ac095` — command center shift editing + RBAC

### Conclusion
Wave 7 queue MBP labels are **not aligned** with what those recovery commits implemented.

---

## B) Artifact presence check from consolidated scheduler plan

Required artifact list spot check:
- ✅ `convex/onboarding.ts`
- ✅ `convex/technicianTraining.ts`
- ✅ `convex/quoteTemplates.ts`
- ✅ `convex/carryForwardItems.ts`
- ✅ `convex/taskAssignments.ts`
- ✅ `app/(app)/scheduling/hooks/useScheduleUndo.ts`
- ✅ `app/(app)/scheduling/hooks/useSchedulerKeyboard.ts`
- ❌ `app/(app)/personnel/[id]/training/page.tsx` **missing**
- ✅ `app/(app)/billing/quotes/templates/page.tsx`
- ✅ `app/(app)/work-orders/[id]/_components/WOExecutionGantt.tsx`
- ✅ `app/(app)/work-orders/[id]/execution/page.tsx`

### Conclusion
At least one high-visibility planned UI artifact is still missing.

---

## C) Feature evidence scan for Wave 7 MBPs

### Appears present (at least partially)
- Dark mode toggle exists in app top bar (`TopBar.tsx`)
- Cmd+K command palette references and E2E test references exist
- Activity timeline exists for work-order detail
- Keyboard shortcuts helper exists (`useSchedulerKeyboard.ts`)
- MEL deferral workflow exists in discrepancy + RTS flows
- PWA install prompt component exists

### Not found / weak evidence in scan
- Bulk CSV import flow (no strong app-level evidence found)
- Parts reorder alerts (no clear alert feature evidence found)
- Shift handoff **dashboard** (handoff notes exist elsewhere, but dashboard-specific evidence weak)
- Fleet calendar feature parity uncertain (single E2E mention; needs explicit product-surface verification)
- True offline support (service worker/workbox/pwa plugin wiring not found in quick config scan)

### Conclusion
Some Wave 7 labeled features may exist in other forms, but several are either missing, incomplete, or unverified against MBP intent.

---

## D) Wave 8 verification

Wave 8 commits landed:
- Backend hardening: `5c37b79`
- Frontend hardening: `11ab71b`

Previous gap:
- targeted Playwright run was blocked because `pnpm` was not available.

Current state:
- `pnpm` is now installed and available, so test verification can proceed.

---

## Final gap list (actionable)

1. **Queue/spec reconciliation gap**
   - Wave 7 MBP text does not match delivered recovery scope/commits.
2. **Missing training UI route**
   - `app/(app)/personnel/[id]/training/page.tsx`.
3. **Likely unbuilt/incomplete items requiring confirmation and implementation**
   - Bulk CSV import
   - Parts reorder alerts
   - Shift handoff dashboard
   - Fleet calendar (if intended as new planning surface)
   - Full PWA offline stack (not just install prompt)
4. **Verification gap**
   - Run and pass targeted Wave 8 regression tests now that pnpm exists.
