# Remediation Plan — Unbuilt/Unverified Features (Post Wave 8)

Date: 2026-03-06
Owner: Jarvis

## Goal
Close all identified gaps from the unbuilt-feature audit with minimal disruption, clear evidence, and shippable checkpoints.

## Guiding principles
- Fix **spec drift first** (so status reporting is truthful).
- Ship in small, testable batches.
- Backend enforcement > UI-only behavior.
- Each batch ends with explicit validation evidence.

---

## Batch 0 — Source-of-truth cleanup (same day)

## 0.1 Reconcile queue wording with delivered scope
- Update `BUILD-AGENT-QUEUE-V3.md` Wave 7 labels to reflect what was actually delivered in recovery commits.
- Add “planned-but-deferred” subsection listing MBPs not implemented in recovery scope.

Acceptance:
- Queue text no longer claims mismatched MBPs as completed.
- Watchdog outputs remain aligned with updated queue + commits.

---

## Batch 1 — Missing artifact completion (P0)

## 1.1 Build missing training UI route
- Implement: `app/(app)/personnel/[id]/training/page.tsx`
- Hook to existing `convex/technicianTraining.ts` CRUD.
- Include basic guardrails:
  - organization scoping
  - role-aware edit controls
  - empty/loading/error states

Acceptance:
- Route exists and is navigable from personnel context.
- Create/update/archive training records works end-to-end.
- `tsc --noEmit` + `vite build` pass.

---

## Batch 2 — Wave 7 deferred feature pack (P1)

## 2.1 Bulk CSV import
- Scope: deterministic CSV parser + validation + dry-run preview + import summary.
- Add template download and failure report (row-level errors).

## 2.2 Parts reorder alerts
- Add threshold model and alert generation for low-stock parts.
- Surface in notifications panel and parts dashboard cards.

## 2.3 Shift handoff dashboard
- Consolidate existing handoff notes into dashboard view (per shift/day/tech/team).
- Add filters and unresolved handoff indicator.

## 2.4 Fleet calendar (if product intent confirms separate surface)
- Implement or formalize as extension of existing scheduling timeline.
- Clarify route + object model (events, maintenance windows, AOG flags).

Acceptance (for each item):
- Feature has explicit route/component entry point.
- Backend writes are RBAC-protected and audited.
- At least one E2E/user-story test added.

---

## Batch 3 — PWA offline hardening (P1)

## 3.1 Add true PWA pipeline
- Add Vite PWA/service worker registration and manifest strategy.
- Cache strategy by surface:
  - static assets/cache-first
  - API/network-first + fallback

## 3.2 Offline behavior definition
- Define explicit degraded behaviors (read-only vs queued writes).
- Add visible offline/online state and retry semantics.

Acceptance:
- Service worker is generated/registered in production build.
- Offline smoke test passes for critical read flows.
- No silent data-loss behavior on queued writes.

---

## Batch 4 — Verification and closeout (P0)

## 4.1 Re-run Wave 8 targeted regression suite
- Now that pnpm exists, run previously blocked Playwright tests.

## 4.2 Build-vs-plan evidence matrix
- Produce one matrix document:
  - MBP ID
  - status (built/partial/unbuilt)
  - commit SHA(s)
  - route/file evidence
  - test evidence

## 4.3 Exit criteria
- No known unbuilt P0/P1 items from audit remain.
- Queue + watchdog + commits all agree.

---

## Execution order (recommended)
1. Batch 0 (truth sync)
2. Batch 1 (missing training route)
3. Batch 4.1 (unblock confidence quickly)
4. Batch 2 and Batch 3 in parallel (if resources allow)
5. Batch 4.2/4.3 final closeout

---

## Risk controls
- Keep compatibility wrappers for any deprecated API until caller inventory is complete.
- Feature-flag larger surfaces (bulk import, offline queueing) for safe rollout.
- Require backend audit event on all new write mutations.

---

## Immediate next action (if approved)
Start Batch 1 now: implement missing training route + CRUD wiring + validations + commit + test evidence.
