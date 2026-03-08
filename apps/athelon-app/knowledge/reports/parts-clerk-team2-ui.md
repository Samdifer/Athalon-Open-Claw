# Parts Clerk Team 2 — UI/Workflow + Part Details Visibility Report

**Date:** 2026-03-08  
**Scope:** Receiving/inspection UI, part issuance, part detail accessibility, navigation/deep-link consistency

---

## Defects Found & Fixes Applied

### BUG-PC-T2-01: PartStatusBadge mapped `removed_pending_disposition` to "Issued"
- **Impact:** Parts awaiting disposition after removal showed misleading "Issued" badge, hiding actual state from clerks and inspectors.
- **Fix:** Added dedicated `removed_pending_disposition` status with "Pending Disposition" label and distinct amber styling.
- **File:** `src/shared/components/PartStatusBadge.tsx`

### BUG-PC-T2-02: Part Detail Sheet missing Transaction History timeline
- **Impact:** Clerks clicking a part card could see identity/traceability but NOT the lifecycle audit trail, violating FAA chain-of-custody visibility requirements.
- **Fix:** Added `PartHistoryTimeline` component to the PartDetailSheet.
- **File:** `app/(app)/parts/page.tsx`

### BUG-PC-T2-03: Part Detail Sheet missing Conformity Documents panel
- **Impact:** CoC/CoA/8130-3/test reports were only accessible through a separate navigation path; not visible from the main part detail sheet.
- **Fix:** Added `ConformityDocumentPanel` to the PartDetailSheet, positioned before Photos & Documents.
- **File:** `app/(app)/parts/page.tsx`

### BUG-PC-T2-04: PartsIssueDialog omitted `workOrderId` from issuePart mutation
- **Impact:** When issuing a part from inventory to a WO, the backend couldn't associate the part with the work order because `workOrderId` was not included in the mutation args.
- **Fix:** Added `workOrderId` to the `issuePart` mutation call.
- **File:** `app/(app)/parts/_components/PartsIssueDialog.tsx`

### BUG-PC-T2-05: Part details inaccessible from Receiving Queue
- **Impact:** Clerks in the receiving inspection page had no way to view part details (history, conformity docs, photos) before or after inspection.
- **Fix:** Added an Info button per row that opens a detail Sheet with PartHistoryTimeline, ConformityDocumentPanel, and DocumentAttachmentPanel.
- **File:** `app/(app)/parts/_components/ReceivingInspection.tsx`

### BUG-PC-T2-06: No deep-link route for individual parts (`/parts/:id`)
- **Impact:** Users couldn't bookmark, share, or deep-link to a specific part. All part viewing required navigating through the inventory list first.
- **Fix:** Created `/parts/:id` route with full part detail page including identity, tags, history timeline, conformity docs, and photos.
- **Files:** `app/(app)/parts/[id]/page.tsx` (new), `src/router/routeModules/protectedAppRoutes.tsx`, `convex/parts.ts` (added `getPart` query)

### BUG-PC-T2-07: Pending Inspection table rows not clickable for part details
- **Impact:** In the Parts Inventory pending inspection tab, clicking a row did nothing. Users had to use the Inspect button exclusively.
- **Fix:** Added `onClick` handler to table rows to open part detail sheet, with `stopPropagation` on the Inspect button.
- **File:** `app/(app)/parts/page.tsx`

### BUG-PC-T2-08: PartsLifecycleBoard items not clickable
- **Impact:** WO parts lifecycle board showed parts in kanban columns but provided no way to click into detail view.
- **Fix:** Added `onItemClick` prop and clickable styling to board items.
- **File:** `app/(app)/work-orders/[id]/_components/PartsLifecycleBoard.tsx`

---

## Files Changed

| File | Change Type |
|------|-------------|
| `src/shared/components/PartStatusBadge.tsx` | Modified — added `removed_pending_disposition` status |
| `app/(app)/parts/page.tsx` | Modified — added imports, history timeline, conformity docs, clickable rows |
| `app/(app)/parts/_components/PartsIssueDialog.tsx` | Modified — added `workOrderId` to mutation |
| `app/(app)/parts/_components/ReceivingInspection.tsx` | Modified — added detail sheet with info button |
| `app/(app)/parts/[id]/page.tsx` | **New** — part detail deep-link page |
| `src/router/routeModules/protectedAppRoutes.tsx` | Modified — added `/parts/:id` route |
| `convex/parts.ts` | Modified — added `getPart` query |
| `app/(app)/work-orders/[id]/_components/PartsLifecycleBoard.tsx` | Modified — added `onItemClick` prop |
| `tests/e2e/wave-parts-clerk-ui.spec.ts` | **New** — e2e tests for clerk workflow |
| `knowledge/reports/parts-clerk-team2-ui.md` | **New** — this report |

---

## Test Evidence

### TypeScript Build
```
$ npx tsc --noEmit
# 3 pre-existing errors (PersonnelRosterTab.tsx, workOrderParts.ts x2)
# 0 new errors from Team 2 changes
```

### E2E Test Suite
New test file: `tests/e2e/wave-parts-clerk-ui.spec.ts`
- Receiving page load + inspection queue table
- Receiving queue detail button presence
- Parts page tabs and search
- Pending inspection tab interaction
- Part detail deep-link route (`/parts/:id`)
- Status badge accuracy for `removed_pending_disposition`
- Part detail sheet content (history, conformity docs, photos)

---

## Design Patterns Maintained
- Used existing `Sheet` component for part detail side-panels (consistent with main inventory page)
- Used existing `PartHistoryTimeline`, `ConformityDocumentPanel`, `DocumentAttachmentPanel` components
- Route follows existing `/:entity/:id` pattern (same as `/work-orders/:id`, `/fleet/:tail`)
- Added Convex `getPart` query following same pattern as other entity queries
