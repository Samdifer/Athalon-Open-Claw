# GEMINI.md - Athalon MRO SaaS Platform

This file provides specialized guidance for Gemini CLI when working with this repository. It complements `CLAUDE.md` and project-specific documentation.

## 🚀 Project Overview

Athalon is a comprehensive FAA Part 145-compliant aircraft maintenance MRO (Maintenance, Repair, and Overhaul) SaaS platform. The project documents the full product development lifecycle via a phase-based simulation.

### Core Applications

1. **Athelon App** (`apps/athelon-app/`): The main production SaaS platform.
   - **Stack**: React 19, Vite 6, Convex 1.32 (Backend), Clerk (Auth), shadcn/ui + Tailwind CSS v4.
   - **Role**: Production-grade MRO management.
2. **Scheduler** (`apps/scheduler/`): A tactical aviation maintenance simulation.
   - **Stack**: React 19.2, Vite 6.2, IndexedDB (Persistence).
   - **Role**: Scheduling, capacity planning, and financial simulation.
3. **Marketing** (`apps/marketing/`): Marketing site and video assets (Remotion).

---

## 🛠️ Tech Stack & Engineering Standards (Athelon App)

### Frontend Architecture
- **Strict TypeScript**: No `any` allowed. Use precise types for all components and backend functions.
- **Bootstrap & Providers**: Entry point is `src/bootstrap/main.tsx`. Provider stack: `ThemeProvider` → `ClerkProvider` → `BrowserRouter` → `ConvexProviderWithClerk` → `AppRouter`.
- **Routing**: Centralized in `src/router/AppRouter.tsx`. Three modules: `AuthRoutes`, `CustomerPortalRoutes`, and `ProtectedAppRoutes`.
- **UI & Styling**: shadcn/ui primitives + Tailwind CSS v4. **Note**: Use `@clerk/clerk-react` (not `@clerk/react`).
- **Path Alias**: `@/` maps to `apps/athelon-app/` root.

### Backend (Convex)
- **Strict Compliance**: Follow `apps/athelon-app/convex/CONVEX_RULES.md` for all functions.
- **Coding Patterns**:
  - Always use new syntax (`query({args: {}, handler: ...})`).
  - Argument validators are MANDATORY.
  - No `filter` in queries; use indexes and `withIndex`.
  - Use `internalQuery`/`internalMutation` for private logic.
  - Actions cannot use `ctx.db`; use `ctx.runQuery`/`ctx.runMutation`.

### E2E Testing (Playwright)
- **Location**: `apps/athelon-app/tests/e2e/`.
- **Execution**: `pnpm exec playwright test`.
- **Projects**: Use `chromium-authenticated` for auth-gated flows.

---

## 💻 Development Commands (Athelon App)

```bash
cd apps/athelon-app
pnpm dev              # Frontend dev server (port 3000)
pnpm exec convex dev  # Backend dev server (separate terminal)
pnpm build            # Production build
pnpm typecheck        # Strict TS check (excludes convex/)
pnpm run qa:first-user-gate # Full typecheck + core E2E tests
```

---

## 📂 Source Organization (`apps/athelon-app/`)

- `src/`: Core logic, router, shared components, and library utilities.
- `app/`: Page-level components organized by route group (`(app)/`, `(auth)/`, `(customer)/`).
- `convex/`: Schema and 60+ backend functions.
- `tests/e2e/`: Playwright test suites.
- `knowledge/`: Strategy, plans, and dispatches.
- `archive/`: Historical waterfall artifacts (Read-only).

---

## 🎯 Implementation Priorities (Next Sprints)

1. **Phase 1: Backend Fixes**: Tax calculation, labor rate application, and rating-to-step auth validation.
2. **Phase 2: PDF Generation**: Implement downloadable PDFs for Invoices, Quotes, and RTS documents.
3. **Phase 3: File Storage**: Real Convex file storage integration for photos and documents.
4. **Phase 7: Advanced Scheduling**: Interactive Gantt and constraint-based auto-scheduling.

---

## ⚠️ Critical Mandates

- **Do Not Revert**: Never revert architectural decisions or "fix" code by removing established patterns (e.g., Convex rules, Tailwind 4 usage).
- **Validation**: Every change must be verified via `pnpm typecheck` or functional tests.
- **Contextual Precedence**: Root `CLAUDE.md` and `GEMINI.md` are primary. `apps/athelon-app/convex/CONVEX_RULES.md` is authoritative for backend.
- **Security**: Protect `.env.local` and Clerk secrets at all times.
