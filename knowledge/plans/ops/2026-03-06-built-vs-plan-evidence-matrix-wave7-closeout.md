# Built-vs-Plan Evidence Matrix — Wave 7 Closeout
Date: 2026-03-06 (UTC)
Owner: TEAM-R closeout

## Purpose
Definitive reconciliation of Wave 7 plan intent vs delivered implementation, including recovery-scope drift and remediation commits.

## Evidence matrix

| MBP / Feature ID | Status | Commit SHA(s) | Route / File evidence | Validation / test evidence |
|---|---|---|---|---|
| MBP-0083 — Dark mode | built | `2a5262c`, `a015ac5` | `apps/athelon-app/src/shared/components/TopBar.tsx` (theme toggle), `apps/athelon-app/components/TopBar.tsx` (pre-reorg compatibility path) | Route-level regression included in `tests/e2e/smoke-all-routes.spec.ts`; type safety validated via `npx tsc --noEmit` (see Validation log below). |
| MBP-0084 — Cmd-K command palette | built | `2a5262c`, `a015ac5` | `apps/athelon-app/src/shared/components/TopBar.tsx`, `apps/athelon-app/src/shared/components/ShortcutsHelp.tsx` | Explicit E2E: `apps/athelon-app/tests/e2e/navigation.spec.ts` (`command palette result navigates to fleet detail`). |
| MBP-0085 — Activity timeline | built | `d1425b5`, `a015ac5` | `apps/athelon-app/app/(app)/work-orders/[id]/_components/ActivityTimeline.tsx`, integrated in `app/(app)/work-orders/[id]/page.tsx` | Covered by existing WO route smoke and user-flow test suites (`smoke-all-routes`, work-order lifecycle specs); typecheck validation below. |
| MBP-0086 — Keyboard shortcuts | built | `2a5262c`, `a015ac5` | `apps/athelon-app/src/shared/components/ShortcutsHelp.tsx` and keyboard handling in `TopBar.tsx` | Functional coverage via navigation + route smoke tests; typecheck validation below. |
| MBP-0088 — Bulk CSV import | built | `01e63f9` | `apps/athelon-app/app/(app)/settings/import/page.tsx`, `apps/athelon-app/convex/bulkImport.ts` | Includes BOM regression hardening in `1fd3f53`; typecheck validation below. |
| MBP-0089 — Parts reorder alerts | built | `4f13751` | `apps/athelon-app/app/(app)/parts/alerts/page.tsx`, `apps/athelon-app/convex/inventoryAlerts.ts`, linked from `app/(app)/parts/page.tsx` | Route integrated in sidebar/topbar + protected routes; typecheck validation below. |
| MBP-0090 — MEL deferral tracking | built | `50e2f80`, `a015ac5` | `apps/athelon-app/convex/discrepancies.ts` (MEL validation + deferral), `apps/athelon-app/convex/returnToService.ts`, `app/(app)/work-orders/[id]/rts/_components/RtsSignoffForm.tsx` | Existing RTS/discrepancy guard suites + route smoke; typecheck validation below. |
| MBP-0091 — Shift handoff dashboard | built | `4f13751` | `apps/athelon-app/app/(app)/work-orders/handoff/page.tsx`, backend aggregation in `apps/athelon-app/convex/taskCards.ts` | Route and workflow regression coverage in existing work-order + smoke suites; typecheck validation below. |
| MBP-0092 — Fleet calendar | built | `01e63f9` | `apps/athelon-app/app/(app)/fleet/calendar/page.tsx` | Follow-up bug-fix hardening in `a92cd9c`, `38f4ea1`, `1fd3f53`; typecheck validation below. |
| MBP-0087 — PWA offline (manifest + SW + offline behavior) | built | `773fc12` | `apps/athelon-app/public/sw.js`, `apps/athelon-app/src/bootstrap/registerServiceWorker.ts`, `apps/athelon-app/vite.config.ts`, `apps/athelon-app/index.html`, `apps/athelon-app/src/shared/components/OfflineStatusBanner.tsx` | Offline architecture shipped with explicit degraded-mode UX; typecheck validation below. |
| Wave 7 recovery-scope reconciliation artifact: TEAM-M commit | superseded | `30345b7` | `app/(app)/scheduling/_components/SchedulingOnboardingPanel.tsx`, `convex/shopLocations.ts` | This commit is retained as historical recovery evidence; it does **not** constitute completion of TEAM-M MBP bundle. |
| Wave 7 recovery-scope reconciliation artifact: TEAM-N commit | superseded | `21ac095` | `app/(app)/scheduling/_components/SchedulingCommandCenterDialog.tsx`, `convex/schedulerPlanning.ts`, `convex/shared/helpers/schedulingPermissions.ts` | This commit is retained as historical recovery evidence; it does **not** constitute completion of TEAM-N MBP bundle. |
| Consolidated-plan missing artifact: `app/(app)/personnel/[id]/training/page.tsx` | built | `fa49e95` | `apps/athelon-app/app/(app)/personnel/[id]/training/page.tsx`, route wiring in `src/router/routeModules/protectedAppRoutes.tsx` and roster tab | Closes audit gap from `UNBUILT-FEATURE-AUDIT-2026-03-06.md`; typecheck validation below. |

## Queue/spec reconciliation notes
- Wave 7 queue rows are now truthfully split into:
  1) historical recovery commits that corrected adjacent scheduling scope (`30345b7`, `21ac095`), and
  2) actual MBP-completion commits (`01e63f9`, `4f13751`, `773fc12`, plus legacy commits for pre-existing MBPs).
- This preserves traceability while removing the implication that mismatched recovery commits shipped the full MBP sets.

## Remaining backlog (explicit)
For the specific TEAM-R closeout scope (Wave 7 drift + missing training artifact):
- **No remaining unbuilt items.**

Next actions:
1. Keep this matrix as canonical evidence reference for future queue audits.
2. Optional confidence pass: run targeted Playwright subset for newly remediated routes (`/settings/import`, `/parts/alerts`, `/work-orders/handoff`, `/fleet/calendar`) in CI if not already in nightly pack.

## Validation log
- ✅ `npx tsc --noEmit` (apps/athelon-app) passed on 2026-03-06 UTC in this closeout session.
