# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

A phase-based simulation project documenting the full product development lifecycle of Athelon, an FAA Part 145-compliant aircraft maintenance MRO SaaS platform.

The live application lives in `apps/athelon-app/`.
Historical simulation artifacts live in `archive/` and `knowledge/`.

## Tech Stack (`apps/athelon-app`)

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode — no `any`) |
| Build | Vite 6 + `@vitejs/plugin-react` |
| Frontend | React 19 + React Router v6 |
| Backend | Convex 1.32+ (serverless functions, schema-driven DB) |
| Auth | `@clerk/clerk-react` |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel SPA via `apps/athelon-app/vercel.json` rewrites |

## Commands (run from `apps/athelon-app/`)

```bash
cd apps/athelon-app

pnpm dev
pnpm build
pnpm typecheck
pnpm preview

pnpm exec playwright test
pnpm exec playwright show-report

# Convex backend (separate terminal)
pnpm exec convex dev
```

## Convex Backend Rules (Required)

- Canonical Convex implementation rules live in `apps/athelon-app/convex/CONVEX_RULES.md`.
- When editing any file in `apps/athelon-app/convex/`, follow that document for validators, API registration, indexing/query patterns, action runtime rules, scheduling, and storage.
- Treat `CONVEX_RULES.md` as authoritative over generic templates/snippets.

## Application Structure

```text
apps/athelon-app/
  main.tsx
  App.tsx
  app/
    (app)/
    (auth)/
    (customer)/
  components/
  convex/
    schema.ts
    _generated/
  e2e/
  hooks/
  lib/
```

## Path Aliases & TypeScript

`@/` maps to `apps/athelon-app/` root (configured in `vite.config.ts` and `tsconfig.json`).

```ts
import { AppLayout } from "@/app/(app)/layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
```

The main `tsconfig.json` excludes `convex/`. Convex function type errors surface during `pnpm exec convex dev`.

## Environment Variables

Required in `apps/athelon-app/.env.local`:

```bash
VITE_CONVEX_URL=...
VITE_CLERK_PUBLISHABLE_KEY=...
```

## E2E Test Notes

- Playwright config: `apps/athelon-app/playwright.config.ts`
- Tests: `apps/athelon-app/e2e/`
- Authenticated tests need `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD`

## Repository Structure Note

- `archive/phases/*` contains historical waterfall artifacts.
- `knowledge/` contains dispatches, plans, reports, reviews, and team context.
- `apps/` contains active application codebases.
