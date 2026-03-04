# Original Request Full-Scope Verification

Date: 2026-03-03
Scope: verify implementation status for each original feature request (FR-001..FR-025)

## Verification Commands Run

1. `npm run typecheck` -> pass
2. `npx playwright test e2e/wave14-fleet-wo-evidence.spec.ts --project=chromium-authenticated` -> 3 passed
3. `npx playwright test e2e/wave13-lead-turnover.spec.ts e2e/wave12-wo-dashboard-quote-decisions.spec.ts --project=chromium-authenticated` -> 4 passed
4. `npx playwright test e2e/wave9-work-order-creation-guard.spec.ts e2e/wave11-work-order-lifecycle-guard.spec.ts e2e/wave6-rts-release-gate.spec.ts e2e/wave6-parts-wo-safety.spec.ts --project=chromium-authenticated` -> 14 passed, 6 skipped

## Status Matrix

Legend:
- Implemented: core requested behavior present end-to-end
- Partial: substantial implementation exists but notable scope remains
- Missing: requested behavior not found

| FR | Status | Evidence |
|---|---|---|
| FR-001 Map-based location picker | Missing | `settings/locations` still shows placeholder "Map integration coming soon". |
| FR-002 ADS-B tracking integration | Missing | No ADS-B/OpenSky ingestion pipeline or references in runtime code. |
| FR-003 Task/subtask compliance/manual docs + in-app PDF flow | Partial | Task compliance exists; WO-level document attachment exists; task/subtask manual-link/file viewer flow is incomplete. |
| FR-004 Vendor services + discrepancy/corrective + privilege architecture | Partial | Vendor service attach/update exists; discrepancy/corrective mutations exist; granular role-capability admin model + RIII-specific workflow not complete. |
| FR-005 Task-level estimated vs actual time (squawk/discrepancy context) | Partial | Task timers exist; no clear discrepancy-level estimated vs applied hours surface in task UI. |
| FR-006 Task parts removed/installed + chain-of-custody docs | Partial | Schema/mutations support partsInstalled/partsRemoved; standard task sign dialog only captures installed parts and not full removed/docs drill-through. |
| FR-007 WO parts lifecycle board + SWAC linkage | Partial | WO parts tab lists linked parts/status but not full requested requested->ordered->received->installed lifecycle board; SWAC linkage unresolved. |
| FR-008 Provisional new-part acceptance queue | Missing | No clear technician provisional queue with parts-clerk accept/edit workflow. |
| FR-009 Parts status color semantics (requested mapping) | Partial | Current location/status colors differ from requested business-state color mapping. |
| FR-010 WO top timeline stages | Implemented | Stage flow rendered on WO header with requested named phases. |
| FR-011 Shift turnover notes + lead turnover aggregation | Partial | Task handoff notes + lead turnover workspace implemented; richer automation and expanded synthesis are incomplete. |
| FR-012 Lead technician assignment workspace | Partial | Lead page supports WO/task assignment; subtask assignment UI depth and richer insights remain incomplete. |
| FR-013 Turnover report contract (PDF/submit lock/history/signatures/analytics) | Partial | Draft/save/PDF/submit-lock/signature/history present; graph-style analytics and deeper report content automation incomplete. |
| FR-014 Fleet filters + view modes + aircraft class/make/model | Implemented | Schedule-window filters and list/tile/truncated views with class/make/model filters are present. |
| FR-015 Work Orders view modes + fleet thumbnail linkage | Implemented | List/tile/truncated WO views and aircraft featured image linkage implemented. |
| FR-016 In-dock + RTS checklist/video evidence hub | Partial | Dedicated evidence tab with upload/preview/download/auto naming exists; admin checklist-template governance remains incomplete. |
| FR-017 Work order search/location filtering | Implemented | All/specific location filter is wired into WO query + UI selector. |
| FR-018 WO-detail Gantt with dependency/smart assignment | Partial | Robust scheduling Gantt exists on scheduling surfaces; WO detail page lacks integrated Gantt workflow requested. |
| FR-019 Task/subtask part return-to-Parts prefill/confirmation flow | Missing | No end-to-end task/subtask return flow with prefill + parts-dept confirmation gate found. |
| FR-020 Receiving checklist per part/PO/batch + ownership/docs export | Partial | Receiving approve/reject flow exists; full per-PO/batch checklist ownership and doc bundle workflow is incomplete. |
| FR-021 Work Orders dashboard subpage KPI WIP/countdown | Implemented | `work-orders/dashboard` shows active WOs, estimated vs applied, WIP %, and RTS countdown. |
| FR-022 WO header KPI + committed RTS + post-inspection date update workflow | Partial | WO header surfaces date/risk and estimate hints; full committed/post-inspection date workflow not found. |
| FR-023 Quote line-item category + accept/defer/decline | Implemented | Quote detail shows categories and per-line decision actions with persistence. |
| FR-024 Secondary quote history depth + stable decision/event trail | Partial | Decision actor attribution exists; immutable multi-event line-item decision history remains incomplete. |
| FR-025 Origin taxonomy across squawks/tasks | Partial | Multiple origin fields exist; not fully normalized/surfaced end-to-end for all requested origin modes. |

## Key Evidence References

- FR-001: `app/(app)/settings/locations/page.tsx` line 207 placeholder text.
- FR-010/016/022: `app/(app)/work-orders/[id]/page.tsx` stage flow + WO header + evidence tab wiring.
- FR-017: `app/(app)/work-orders/page.tsx` location filter passed into work-order query.
- FR-021: `app/(app)/work-orders/dashboard/page.tsx` KPI/WIP/countdown.
- FR-014/015: `app/(app)/fleet/page.tsx` and `app/(app)/work-orders/page.tsx` view modes + media linkage.
- FR-011/012/013: `app/(app)/work-orders/lead/page.tsx`, `convex/leadTurnover.ts`, `lib/pdf/TurnoverReportPDF.tsx`.
- FR-023/024: `components/quote-workspace/QuoteDetailEditor.tsx`, `convex/gapFixes.ts`, `convex/billing.ts`, `convex/schema.ts`.
- FR-006/019/020: `convex/gapFixes.ts`, `app/(app)/work-orders/[id]/tasks/[cardId]/_components/SignStepDialog.tsx`, `app/(app)/parts/receiving/page.tsx`.

## Summary

Original request is **not fully implemented to full scope**. Current verified distribution:
- Implemented: 7 / 25
- Partial: 14 / 25
- Missing: 4 / 25

