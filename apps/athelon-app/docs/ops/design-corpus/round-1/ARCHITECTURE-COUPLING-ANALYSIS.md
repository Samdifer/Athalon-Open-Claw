# Architecture Coupling Analysis

This document captures the findings from a deep architectural audit of
`apps/athelon-app/` conducted to determine how cleanly the presentation layer
can be separated from business logic for a design overhaul.

## 1. Backend Scale

The `convex/` directory contains **97 TypeScript files** — a substantial serverless
backend. The Convex deployment is a cloud project at
`aromatic-nightingale-384.convex.cloud`. Any client with the URL and correct Clerk
JWT can connect.

**There is no abstraction layer between the UI and Convex.** Page components import
`useQuery`/`useMutation` directly from `"convex/react"` and call `api.*` functions
inline:

```ts
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
const data = useQuery(api.workOrders.getWithDetails, { workOrderId: id });
```

No custom domain hooks (e.g., `useWorkOrderDetail()`) exist to wrap raw Convex calls.

## 2. Page Component Profile

Sampled pages are monolithic — they mix data fetching and rendering in single files:

| Page | Lines | useQuery calls | useMutation calls |
|---|---|---|---|
| Work Order Detail | 1,330 | 11 | 2 |
| Parts | 1,701 | 7 | 5 |
| Scheduling | 2,455 | 14 | 7 |

Every complex page is both a data-fetching container and a rendering component. There
is no separation between "container" (data) and "presentational" (view) layers.

## 3. Shared Hooks (9 total)

**Pure UI (4):** `use-mobile`, `useNetworkStatus`, `useOfflineSnapshot`, `usePagePrereqs`

**Convex-coupled (3):** `useUserRole` (calls `api.roles.getMyRole`), `useCurrentOrg`
(re-export of `OrgContextProvider`), `usePortalCustomerId`

**Glue (2):** `useRbac` (pure logic from context), `useRouter` (wrapper around
`useNavigate`)

The hook layer is thin. The only real abstraction is `OrgContextProvider`, which fires
a single `api.technicians.getMyContext` subscription for the entire session.

## 4. Shared Components Coupling

Of ~55 non-UI components in `src/shared/components/`:

- **30 are pure UI** — all shadcn `ui/` primitives plus `BarcodeScanner`
- **24 are Convex-coupled** — import from `"convex/react"` or `api`

Notable Convex-coupled shared components:
- `TopBar.tsx`, `CommandPalette.tsx`, `CloseReadinessPanel.tsx`
- `GlobalTimerWidget.tsx`, `VoiceNotesPanel.tsx`, `VoiceNoteRecorder.tsx`
- `HandoffNotesPanel.tsx`, `LocationSwitcher.tsx`, `PartNumberCombobox.tsx`
- `PhotoGallery.tsx`, `FilePreview.tsx`, `FileUpload.tsx`
- `FindingDispositionDialog.tsx`, `OrgContextProvider.tsx`
- `quote-workspace/` subtree (5 files)

`AppSidebar` has **no Convex coupling** — it reads from Clerk only.

## 5. Cross-Feature Dependencies

### Component-level coupling (2 instances)

| Import | From | To |
|---|---|---|
| `DocumentAttachmentPanel` | `work-orders/[id]/_components/` | `parts/page.tsx` |
| `PredictionToOpportunityBanner` | `crm/_components/` | `fleet/predictions/page.tsx` |

### Data-layer coupling (well-defined seams)

| Consumer | Queries from |
|---|---|
| WO Detail | `api.customers.getCustomer`, `api.parts.listParts`, `api.adCompliance.checkAdDueForAircraft` |
| Billing (multiple pages) | `api.workOrders.listWorkOrders`, `api.customers.listCustomers`, `api.taskCards.listTaskCardsForWorkOrder` |
| Scheduling | `api.workOrders.getWorkOrdersWithScheduleRisk` |
| Parts | `api.workOrders.listActive` |
| WO Creation | `api.aircraft.list`, `api.billingV4.listAllCustomers` |

### Self-contained features (no outbound dependencies)

- CRM dashboard page
- Fleet list/detail (except inbound from Fleet Predictions → CRM)

## 6. Route Structure

`protectedAppRoutes.tsx` is fully declarative:
- **130+ routes** as flat `<Route>` entries
- All page components are **lazy-loaded via `React.lazy()`**
- No inline logic in the route file
- One nesting level: `ProtectedRoute` → `OrgContextProvider` → `OnboardingGate` → `AppLayout`
- Routes are maximally swappable — any page can be replaced without touching the router

## 7. Layout

`app/(app)/layout.tsx` is **43 lines** of pure composition:
- `SidebarProvider` → `AppSidebar` + `TopBar` + `OfflineStatusBanner` + `<Outlet />`
- Global overlays: `CommandPalette`, `KeyboardShortcuts`, `PWAInstallPrompt`
- Zero Convex imports in the layout itself
- Indirect coupling: `TopBar` and `CommandPalette` children are Convex-coupled

## 8. CSS/Theme

`app/globals.css` (289 lines) is the **single source of design tokens**:
- Tailwind v4 `@theme inline` block
- OKLCH color space, dark mode primary
- Aviation semantic tokens, status utility classes, chart palette, sidebar tokens
- Typography: Geist, Geist Mono, Rajdhani (tactical)
- No scattered inline design tokens elsewhere

## 9. Convex Backend Organization

Feature-oriented naming but not perfectly 1:1 with frontend:

**Core feature files:** `workOrders.ts`, `parts.ts`, `billing.ts`, `billingV4.ts`,
`billingV4b.ts`, `crm.ts`, `crmProspects.ts`, `customers.ts`, `aircraft.ts`,
`adCompliance.ts`, `taskCards.ts`, `taskCompliance.ts`, `workOrderParts.ts`,
`vendors.ts`, `scheduling.ts`, `technicians.ts`, `shopLocations.ts`, `documents.ts`,
`discrepancies.ts`

**Cross-cutting:** `schema.ts`, `auth.config.ts`, `roles.ts`, `userManagement.ts`,
`notifications.ts`, `email.ts`, `fileStorage.ts`, `shared/`, `lib/`, `_generated/`

Billing has 3 evolutionary files (`billing.ts`, `billingV4.ts`, `billingV4b.ts`).
Parts spans 7 files (`parts.ts`, `workOrderParts.ts`, `partSearch.ts`,
`partHistory.ts`, `partDocuments.ts`, `partTags.ts`, `poReceiving.ts`).

## 10. Redesign Strategy Conclusion

**Recommended approach:** Incremental surface-by-surface redesign with route-level
component swapping. Old pages preserved as dormant files for instant reversion.

**Prerequisites before visual redesign:**
1. Extract domain hooks to create typed interface contracts
2. Build feature registry documents describing each surface's data, relationships,
   and role workflows
3. Promote shared patterns (ActivityTimeline, Precondition, AttentionQueue, view mode
   toggle) to `src/shared/components/`

**Not recommended:** Creating a parallel `apps/athelon-app-v2/` — the UI layer is too
tightly coupled to cleanly fork, and the route structure already supports per-surface
swapping without a second app.
