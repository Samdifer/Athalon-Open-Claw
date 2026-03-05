# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

A monorepo for Athelon, an FAA Part 145-compliant aircraft maintenance MRO SaaS platform. The live application lives in `apps/athelon-app/`. Historical simulation artifacts live in `archive/` and `knowledge/` — do not modify those directories for feature work.

## Tech Stack (`apps/athelon-app`)

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode — no `any`) |
| Build | Vite 6 + `@vitejs/plugin-react` |
| Frontend | React 19 + React Router v6 (`react-router-dom`) |
| Backend | Convex 1.32+ (serverless functions, schema-driven DB) |
| Auth | `@clerk/clerk-react` + `convex/react-clerk` |
| UI | shadcn/ui primitives (Radix) + Tailwind CSS v4 |
| Deployment | Vercel SPA via `apps/athelon-app/vercel.json` rewrites |

**Important:** Use `@clerk/clerk-react` (not `@clerk/react`) — the latter has a broken build at v5.54.0.

## Commands (run from `apps/athelon-app/`)

```bash
cd apps/athelon-app

pnpm dev              # Vite dev server on port 3000 (run convex dev in a separate terminal)
pnpm build            # tsc + vite build
pnpm typecheck        # tsc --noEmit (excludes convex/)
pnpm preview          # Serve production build on port 3000

# Convex backend (separate terminal)
pnpm exec convex dev

# E2E tests
pnpm exec playwright test                                    # all tests
pnpm exec playwright test tests/e2e/smoke.spec.ts            # single file
pnpm exec playwright test --project=chromium-authenticated   # authenticated only
pnpm exec playwright show-report

# Pre-defined test suites (see package.json for full list)
pnpm run qa:first-user-gate    # typecheck + core E2E gate tests
```

## Monorepo Layout

pnpm workspace with packages defined in `pnpm-workspace.yaml`:
- `apps/athelon-app` — the main application (where all feature work happens)
- `apps/scheduler` — scheduler service
- `apps/athelon-demo`, `apps/athelon-ios-demo` — demo apps
- `apps/marketing/video/*` — marketing videos (Remotion)
- `archive/`, `knowledge/` — historical simulation artifacts (read-only, do not modify)

## Application Architecture

### Entry & Provider Stack

`main.tsx` → `src/bootstrap/main.tsx` renders the provider tree:
```
ThemeProvider → ClerkProvider → BrowserRouter → ConvexProviderWithClerk → AppRouter
```

`ConvexClientProvider` (`src/shared/components/ConvexClientProvider.tsx`) uses `ConvexProviderWithClerk` to integrate Clerk auth with Convex.

### Routing

`App.tsx` re-exports `src/router/AppRouter.tsx`, which defines three route groups via `<Routes>`:

| Module | File | Scope |
|---|---|---|
| `AuthRoutes` | `src/router/routeModules/authRoutes.tsx` | `/sign-in`, `/sign-up` |
| `CustomerPortalRoutes` | `src/router/routeModules/customerPortalRoutes.tsx` | `/portal/*` |
| `ProtectedAppRoutes` | `src/router/routeModules/protectedAppRoutes.tsx` | Everything else (auth-gated) |

Protected routes wrap: `ProtectedRoute` → `OrgContextProvider` → `OnboardingGate` → `AppLayout`.

All page components are lazy-loaded via `React.lazy()`.

### Source Organization (`apps/athelon-app/`)

```
src/
  bootstrap/main.tsx          # React root + provider stack
  router/
    AppRouter.tsx              # Top-level <Routes>
    routeModules/              # Route group definitions
  shared/
    components/                # Reusable components (ProtectedRoute, AppSidebar, TopBar, etc.)
    components/ui/             # shadcn/ui primitives (button, dialog, table, etc.)
    hooks/                     # useCurrentOrg, useUserRole, usePortalCustomerId, etc.
    lib/                       # Utilities, PDF generators, scheduling engine, roles
app/
  (app)/                       # Internal app pages (work-orders, fleet, billing, etc.)
  (auth)/                      # Sign-in/sign-up pages
  (customer)/                  # Customer portal pages
convex/
  schema.ts                    # Canonical database schema
  *.ts                         # ~60+ backend function files (queries, mutations, actions)
tests/e2e/                     # Playwright E2E tests
```

### Path Alias

`@/` maps to `apps/athelon-app/` root (configured in `vite.config.ts` and `tsconfig.json`).

```ts
import { AppLayout } from "@/app/(app)/layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
```

Note: `@/components/X` and `@/src/shared/components/X` may both resolve — the legacy `components/` path still works as a compatibility alias. Prefer `@/components/X` for consistency.

### TypeScript

The main `tsconfig.json` excludes `convex/`, `tests/e2e/`, and `dist/`. Convex function type errors surface during `pnpm exec convex dev`, not `pnpm typecheck`.

## Convex Backend Rules (Required)

Canonical Convex implementation rules live in `apps/athelon-app/convex/CONVEX_RULES.md`. When editing any file in `convex/`, follow that document. Key rules:

- Always use the new function syntax (`query({args: {}, handler: ...})`)
- Always include argument validators for all functions
- Use `internalQuery`/`internalMutation`/`internalAction` for private functions
- Do NOT use `filter` in queries — define indexes and use `withIndex`
- Actions cannot use `ctx.db` — use `ctx.runQuery`/`ctx.runMutation` instead
- Never put `"use node"` in a file that exports queries/mutations

## RBAC (Role-Based Access Control)

The app has 8 MRO roles defined in `src/shared/lib/roles.ts`: `admin`, `shop_manager`, `qcm_inspector`, `billing_manager`, `lead_technician`, `technician`, `parts_clerk`, `read_only`. Each role has a numeric level and controls sidebar nav visibility via `ROLE_NAV_ACCESS`.

Key hooks:
- `useCurrentOrg()` — resolves current user's org, technician record, and IDs (reads from `OrgContextProvider`)
- `useRbac()` — returns `role`, `hasPermission()`, `canAccess()`, `isAdmin`, `isManager`, `isInspector`
- `useUserRole()` — lower-level role resolution

## Agentic Workflow Scripts

`package.json` includes `agentic:*` scripts for automated code review and orchestration:
- `pnpm run agentic:reviewer:quick` / `agentic:reviewer:deep` — propose code review changes
- `pnpm run agentic:reviewer:apply` — apply proposed changes
- `pnpm run agentic:orchestrator:start` / `stop` / `tick` — orchestration lifecycle
- `pnpm run agentic:queue:add` / `list` / `complete` — task queue management

## E2E Testing

- Config: `apps/athelon-app/playwright.config.ts`
- Tests: `apps/athelon-app/tests/e2e/` (NOT `e2e/` at app root)
- Global setup: `tests/e2e/global-setup.ts` (handles Clerk auth)
- Two Playwright projects: `chromium` (unauthenticated smoke tests) and `chromium-authenticated`
- Auth storage state saved to `playwright/.auth/user.json`
- Requires `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD` in `.env.local`

## Environment Variables

Required in `apps/athelon-app/.env.local`:

```bash
VITE_CONVEX_URL=...
VITE_CLERK_PUBLISHABLE_KEY=...
# For E2E tests:
PLAYWRIGHT_TEST_EMAIL=...
PLAYWRIGHT_TEST_PASSWORD=...
```
