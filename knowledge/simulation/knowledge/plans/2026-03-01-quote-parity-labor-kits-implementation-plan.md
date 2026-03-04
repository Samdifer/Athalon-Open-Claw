# Quote System Parity + Labor Kits Implementation Plan

Date: 2026-03-01
Owner: Athelon Product/Engineering
Status: Ready for execution

## Goal
Deliver full parity between the original scheduler quote builder and `athelon-app` quote workflows, while preserving Athelon's domain model (`quote -> workOrder`) and existing billing lifecycle.

## Current State Snapshot
Completed:
1. Labor kit integration exists in New Quote and Draft Quote Detail flows.
2. Draft quote composer now supports manual line add + pricing rule application + labor kit apply.
3. Seeded E2E user stories cover quote labor-kit workflows and pass.

Remaining for exact parity:
1. Drag-and-drop line-item ordering and reorder persistence.
2. Rich line economics from scheduler (direct cost, markup override, fixed-price override, margin preview).
3. Sidebar-style operational controls (AOG toggle, target start/end request fields) unified in quote workflow.
4. In-app quote template settings manager comparable to scheduler template editing UX.
5. End-to-end regression coverage for all quote parity scenarios.

## Non-Negotiables
1. Work orders remain the canonical project record.
2. Quote conversion continues to own quote -> workOrder handoff.
3. Quote lifecycle invariants remain enforced: `DRAFT -> SENT -> APPROVED -> CONVERTED/DECLINED`.
4. No billing status regressions or mutation permission regressions.

## Wave Plan

### Wave 1 - Data Model and API Contracts
Scope:
1. Add explicit `sortOrder` to `quoteLineItems`.
2. Add optional quote-line economics fields needed for parity:
- `directCost`
- `markupMultiplier`
- `fixedPriceOverride`
- `pricingMode` (derived/override)
3. Add mutations for reorder + bulk update line economics.
4. Update quote totals recompute helper for override-safe behavior.

Acceptance:
1. Reorder persists after reload.
2. Totals are deterministic with mixed fixed-price and markup lines.
3. Existing quotes without new fields still calculate correctly.

Test Gate:
1. `npx convex codegen`
2. `npm run typecheck`

### Wave 2 - Quote Builder UX Parity
Scope:
1. Add drag handle + reorder interaction for line items (new + detail pages).
2. Add expanded line editor UI:
- labor rate behavior
- direct cost
- markup (auto-tier + manual override)
- fixed-price override
3. Add quote-level profitability panel:
- labor rev
- parts/service rev
- est. cost
- gross margin
4. Add AOG + requested start/end controls to quote detail model and UI.

Acceptance:
1. User can build quote using same decision flow as scheduler builder.
2. Profitability metrics update instantly with line edits.
3. AOG/date preferences remain visible after reopen.

Test Gate:
1. `npm run typecheck`
2. Focused Playwright for quote compose + reorder + overrides.

### Wave 3 - Template/Settings Parity
Scope:
1. Build quote template manager route/modal aligned with scheduler settings behavior.
2. Support aircraft-specific and common templates.
3. Enable template edit, duplicate, activate/deactivate, and insert into quote.
4. Keep labor kits as first-class reusable kit source; unify template insertion with labor kits.

Acceptance:
1. Service templates can be managed without leaving billing context.
2. Template updates are immediately available in quote composers.
3. Aircraft filtering logic works for both kits and templates.

Test Gate:
1. Convex mutation/query tests for template CRUD + filters.
2. Playwright user story for template-to-quote insertion.

### Wave 4 - Hardening, Migration, and Rollout
Scope:
1. Backfill defaults for new quote-line fields.
2. Add migration-safe guards for old rows and mixed data.
3. Add full seeded regression matrix for quote lifecycle + conversion + scheduler continuity.
4. Add release checklist and rollback steps.

Acceptance:
1. Legacy quotes render correctly after migration.
2. No regression in conversion to work orders.
3. Full quote + scheduler seeded regression suite passes in CI.

Test Gate:
1. `npm run typecheck`
2. `npm run build`
3. `npm run test:e2e:wave:scheduler-stories`
4. Quote-specific seeded suite for parity scenarios.

## Seeded E2E Scenarios to Maintain
1. New quote: apply labor kit, verify generated lines.
2. Draft quote: apply labor kit + add manual line + verify persisted lines.
3. Quote conversion: converted quote remains discoverable and linked in scheduler views.
4. Scheduler continuity: planned WO bars preserve quote linkage metadata.

## Delivery Checklist
1. Schema/API updates merged and codegen current.
2. UI parity features merged with no accessibility regressions.
3. Seed scripts deterministic and idempotent.
4. E2E and typecheck green.
5. Release notes added with known limitations (if any).
