# Cross-Surface Remediation Program

> Canonical feature-spec pointer: this file is an execution-program companion to the authoritative registry in [`../spec/MASTER-BUILD-LIST.md`](../spec/MASTER-BUILD-LIST.md). Derived planning references remain [`MASTER-BUILD-PLAN.md`](./MASTER-BUILD-PLAN.md), [`MASTER-FEATURE-CROSSWALK.md`](./MASTER-FEATURE-CROSSWALK.md), and [`MASTER-FEATURE-REGISTRY.csv`](./MASTER-FEATURE-REGISTRY.csv). The usability assessment that triggered this program is [`../../../../knowledge/reports/product/2026-03-08-athelon-cross-surface-usability-assessment.md`](../../../../knowledge/reports/product/2026-03-08-athelon-cross-surface-usability-assessment.md).

Date: 2026-03-08  
Status: Active implementation  
Scope: `apps/athelon-app` primary, customer portal in `app/(customer)`, and manual follow-on lanes for `apps/athelon-demo`, `apps/athelon-ios-demo`, and `apps/scheduler`

## 1) Purpose

Turn the cross-surface usability assessment into a buildable execution program with:
1. A dependency-aware agentic queue for work that is already represented in the canonical MBP backlog.
2. A backlog-extension list for high-priority gaps that are real product problems but are not yet modeled cleanly in the canonical registry.
3. A sequencing model that prioritizes operational value stream completion over visual polish.

## 2) Current Ground Truth

Primary findings from the 2026-03-08 assessment:
1. `apps/athelon-app` is credible as a desktop-first internal operations app, but the highest business risk is incomplete handoff integrity between intake, execution, parts, discrepancies, billing, and release.
2. The customer portal is only partially proven in live review and still lacks a validated linked-customer flow.
3. Accessibility and responsive behavior pass smoke checks, but task-level keyboard, mobile, and dense-screen usability are not yet at production best-practice level.
4. `apps/athelon-demo`, `apps/athelon-ios-demo`, and `apps/scheduler` are not currently demo-ready in the local environment.

## 3) Dependency Reality

The agentic orchestrator only dispatches work whose dependency groups roll up to `implemented`.

Current dependency-ready groups:
1. `GRP-002` Audit, Event Ledger, and Taxonomy
2. `GRP-021` Reliability and Hardening Program

Immediate unlock path:
1. Finish `MBP-0153` (`GRP-001` Station config and org governance console).
2. Apply reviewer status so `GRP-001` can roll to `implemented`.
3. This unlocks the first operational build wave across `GRP-003`, `GRP-005`, and `GRP-006`.

Important implication:
1. Most of the roadmap can be queued today.
2. Only the governance unlock stream is dispatchable immediately under the current canonical rollup state.

## 3.1) Current Implementation Progress

Live governance-unlock work completed in the main workspace:
1. Onboarding now captures an explicit timezone and persists it into the initial shop-location bootstrap.
2. Settings routes for shop, locations, import, routing templates, notifications, station config, email log, users, and QuickBooks now follow the same organization-prerequisite recovery pattern instead of leaving users in inconsistent skeletons or partial banners.
3. Station configuration and location-management surfaces now support per-location timezone, primary-location switching, and richer location editing parity.
4. The explicit `/not-found` route is now wired to the shared app recovery UI instead of existing only as a filesystem page.
5. Targeted verification currently passes for:
   - `pnpm --dir apps/athelon-app exec tsc --noEmit`
   - `pnpm --dir apps/athelon-app exec playwright test tests/e2e/wave3-settings.spec.ts tests/e2e/wave-empty-org-internal-routes.spec.ts tests/e2e/wave-empty-state-cta.spec.ts --project=chromium-authenticated`
   - `pnpm --dir apps/athelon-app exec playwright test tests/e2e/wave4-error-handling.spec.ts --project=chromium-authenticated`

Program status:
1. `REQ-PROGRAM-20260308-01` is still the only dispatchable lane under the canonical dependency graph.
2. Downstream team requests remain queued and blocked until `MBP-0153` is strong enough for reviewer promotion.

## 4) Program Outcomes

The program is considered successful when:
1. One work order can move from intake through execution, parts, discrepancy capture, billing, and release without off-system reconstruction.
2. One linked customer can sign in through the portal and complete the intended quote/invoice/status tasks without dead ends.
3. Core desktop and tablet workflows are keyboard-safe and operationally legible.
4. External demo surfaces either boot cleanly or are explicitly classified as internal-only.

## 5) Agent Team Lanes

| Team | Request ID | MBP Scope | Objective | Current State |
|---|---|---|---|---|
| Team A | `REQ-PROGRAM-20260308-01` | `MBP-0153` | Finish station config and org-governance controls to unlock the broader roadmap. | Dispatch now |
| Team B | `REQ-PROGRAM-20260308-02` | `MBP-0124`, `MBP-0138`, `MBP-0139`, `MBP-0140`, `MBP-0142` | Harden task-card execution, finding creation, persistence, and assignment safety. | Queue now, blocked on `GRP-001` |
| Team C | `REQ-PROGRAM-20260308-03` | `MBP-0035`, `MBP-0036`, `MBP-0037`, `MBP-0048`, `MBP-0049`, `MBP-0122`, `MBP-0151` | Build the parts system of record from request through receipt, install, removal, and return. | Queue now, blocked on `GRP-001` |
| Team D | `REQ-PROGRAM-20260308-04` | `MBP-0053`, `MBP-0150` | Complete discrepancy-to-quote identity and reusable commercial scope templates. | Queue now, blocked on `GRP-003` |
| Team E | `REQ-PROGRAM-20260308-05` | `MBP-0045`, `MBP-0063`, `MBP-0064`, `MBP-0065`, `MBP-0066`, `MBP-0067`, `MBP-0068`, `MBP-0077`, `MBP-0078`, `MBP-0079`, `MBP-0080`, `MBP-0081` | Build evidence capture, file upload, and closeout/PDF artifacts. | Queue now, blocked on `GRP-003` |
| Team F | `REQ-PROGRAM-20260308-06` | `MBP-0069`, `MBP-0070`, `MBP-0119`, `MBP-0120`, `MBP-0147` | Finish labor pricing, tax, invoice automation, and AR controls. | Queue now, blocked on `GRP-003` and `GRP-014` |
| Team G | `REQ-PROGRAM-20260308-07` | `MBP-0096`, `MBP-0097`, `MBP-0098`, `MBP-0099`, `MBP-0100`, `MBP-0101`, `MBP-0102`, `MBP-0146` | Ship the first real customer portal MVP. | Queue now, blocked on `GRP-003` and `GRP-014` |

Manual lanes outside the current dispatchable MBP map:
1. `UX/A11Y Lane`: welcome modal demotion, loading-state clarity, scheduling setup reduction, dense mobile list simplification, and a deeper accessibility pass. `MBP-0095` covers WCAG AA only; the rest needs backlog expansion.
2. `Secondary Surface Lane`: `apps/athelon-demo`, `apps/athelon-ios-demo`, and `apps/scheduler` are not modeled in the Athelon app MBP registry and should be tracked as explicit cross-app work before agentic ownership can be enforced.

## 6) Epic Backlog

### EPIC-01 Governance Unlock

Scope:
1. `MBP-0153`

Primary files:
1. `app/(app)/settings/station-config/**`
2. `app/(app)/settings/locations/**`
3. `app/(app)/settings/shop/**`
4. `convex/stationConfig.ts`
5. `convex/shopLocations.ts`

Acceptance criteria:
1. Governance and station configuration routes no longer present as partial stubs for required admin workflows.
2. Shop, location, and station configuration changes are persisted consistently and do not strand onboarding.
3. The resulting implementation is strong enough to justify reviewer promotion of `MBP-0153` from `partial`.

### EPIC-02 Core Execution Hardening

Scope:
1. `MBP-0124`
2. `MBP-0138`
3. `MBP-0139`
4. `MBP-0140`
5. `MBP-0142`

Acceptance criteria:
1. A technician can raise a finding from task execution with durable linkage.
2. Task-card state survives refresh/navigation without compliance drift.
3. Lead-tech orchestration and assignment consistency rules prevent silent task-state corruption.

### EPIC-03 Parts System of Record

Scope:
1. `MBP-0035`
2. `MBP-0036`
3. `MBP-0037`
4. `MBP-0048`
5. `MBP-0049`
6. `MBP-0122`
7. `MBP-0151`

Acceptance criteria:
1. Receiving, inspection, reservation, installation, removal, and return-to-stock form one traceable chain.
2. Task-level install/remove history is authoritative and reversible only by explicit workflow.
3. A work-order parts board reflects real lifecycle state, not local UI-only state.

### EPIC-04 Quote and Scope Integrity

Scope:
1. `MBP-0053`
2. `MBP-0150`

Acceptance criteria:
1. Secondary quote lines remain attributable to real discrepancies/findings.
2. Partial customer acceptance is preserved through execution handoff.
3. Quote templates and labor kits reduce manual rebuilds without obscuring approval history.

### EPIC-05 Evidence and Closeout Artifacts

Scope:
1. `MBP-0045`
2. `MBP-0063` through `MBP-0068`
3. `MBP-0077` through `MBP-0081`

Acceptance criteria:
1. Step sign-off, discrepancies, and work-order evidence use real upload/storage flows instead of placeholder metadata.
2. RTS, quote, invoice, and work-order PDFs are exportable from the product.
3. Evidence is visible and downloadable in the same workflow that collects it.

### EPIC-06 Billing Automation and Financial Controls

Scope:
1. `MBP-0069`
2. `MBP-0070`
3. `MBP-0119`
4. `MBP-0120`
5. `MBP-0147`

Acceptance criteria:
1. Labor pricing and tax apply automatically in invoice and quote creation.
2. Invoice totals no longer depend on manual reconstruction of labor and parts truth.
3. AR/deposits/credit memo handling is sufficient for normal closeout workflows.

### EPIC-07 Customer Portal MVP

Scope:
1. `MBP-0096`
2. `MBP-0097`
3. `MBP-0098`
4. `MBP-0099`
5. `MBP-0100`
6. `MBP-0101`
7. `MBP-0102`
8. `MBP-0146`

Acceptance criteria:
1. One linked customer can access status, quotes, invoices, fleet, and messaging without dead ends.
2. Portal state is driven by the same commercial and execution truth as the internal app.
3. Unfinished portal capabilities are hidden rather than implied.

## 7) Unmapped High-Priority Gaps Requiring Canonical Backlog Expansion

These gaps came out of the assessment and roadmap but are not yet represented cleanly enough in the MBP registry to queue through the agentic system without creating spec debt.

### Intake and Induction

1. `BACKLOG-INTAKE-01` Customer linkage during work-order creation.
2. `BACKLOG-INTAKE-02` Structured squawk intake rather than free-form-only entry.
3. `BACKLOG-INTAKE-03` Aircraft baseline hours/cycles capture at induction.
4. `BACKLOG-INTAKE-04` Explicit induction status and first customer-facing status.

Primary files likely involved:
1. `convex/workOrders.ts`
2. `convex/aircraft.ts`
3. `app/(app)/work-orders/new/**`
4. `app/(app)/fleet/**`

### UX and Accessibility

1. `BACKLOG-UX-01` Demote or retire the dashboard welcome modal after first use.
2. `BACKLOG-UX-02` Replace ambiguous full-page skeletons with scoped loading and recovery states.
3. `BACKLOG-UX-03` Simplify scheduling setup and reduce top-of-screen blocker density.
4. `BACKLOG-UX-04` Define tablet/mobile-safe task flows rather than shrinking dense desktop pages.
5. `BACKLOG-UX-05` Deep keyboard/focus/screen-reader audit beyond smoke tests.

Primary files likely involved:
1. `app/(app)/dashboard/_components/WelcomeModal.tsx`
2. `src/shared/components/AppSidebar.tsx`
3. `app/(app)/scheduling/**`
4. `app/(app)/work-orders/**`

### Secondary Surfaces

1. `BACKLOG-DEMO-01` `apps/athelon-demo` demo-safe auth and seeded review path.
2. `BACKLOG-DEMO-02` `apps/athelon-ios-demo` runtime boot hardening and missing Convex config handling.
3. `BACKLOG-DEMO-03` `apps/scheduler` environment validation and graceful fallback.
4. `BACKLOG-DEMO-04` Cross-surface demo classification: production, beta, internal-only.

## 8) Execution Order

### Phase 0: Unlock

1. Dispatch `REQ-PROGRAM-20260308-01`.
2. Finish `MBP-0153`.
3. Run reviewer proposal/apply so `GRP-001` can promote to `implemented`.

### Phase 1: Operational Truth

1. Dispatch `REQ-PROGRAM-20260308-02`.
2. Dispatch `REQ-PROGRAM-20260308-03`.
3. Add canonical MBP entries for the intake backlog if leadership wants intake completed in the same operational wave.

### Phase 2: Commercial and Evidence Completion

1. Dispatch `REQ-PROGRAM-20260308-04`.
2. Dispatch `REQ-PROGRAM-20260308-05`.

### Phase 3: Financial and Customer Completion

1. Dispatch `REQ-PROGRAM-20260308-06`.
2. Dispatch `REQ-PROGRAM-20260308-07`.

### Phase 4: UX/A11Y and Demo Readiness

1. Expand the canonical backlog for the unmapped UX gaps.
2. Add ownership and execution contracts for secondary surfaces.
3. Run a dedicated polish and accessibility hardening wave once workflow truth is stable.

## 9) Live Program Rules

1. Do not mark an MBP `implemented` through queue completion alone; reviewer apply is required to change canonical status.
2. Do not queue new work against assessment gaps that lack MBP coverage without first adding them to the canonical spec.
3. Preserve the product sequencing principle: workflow truth first, polish second.
4. Keep `apps/athelon-demo`, `apps/athelon-ios-demo`, and `apps/scheduler` out of stakeholder demos until their runtime boot path is deterministic.
