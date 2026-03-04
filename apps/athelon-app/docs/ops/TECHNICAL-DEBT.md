# Athelon MVP — Technical Debt Register
**Reviewed by:** Jarvis (Lead Review, Codex 5.3)  
**Date:** 2026-02-24  
**Reviewer role:** Senior engineering lead reviewing junior team output  
**Scope:** All files in `athelon-app/` produced during MVP build cycles

---

## Summary
| Severity | Count | Fixed |
|----------|-------|-------|
| P0 — Critical (security/correctness) | 3 | 0 |
| P1 — High (architecture/maintainability) | 5 | 0 |
| P2 — Medium (code quality) | 5 | 0 |
| P3 — Low (polish/standards) | 4 | 0 |
| **Total** | **17** | **0** |

---

## P0 — Critical

### TD-001 · WO number generated client-side with Math.random()
**File:** `app/(app)/work-orders/new/page.tsx`  
**Function:** `defaultWoNumber()`  
**Issue:** Uses `Math.random()` to produce a 4-digit suffix. Duplicates are statistically probable under concurrent creates. WO numbers are a legal document identifier — they must be server-generated (sequential counter or deterministic hash) inside the Convex mutation, never in the client.  
**Fix:** Remove `defaultWoNumber()` from the client entirely. Add server-side WO number generation inside `createWorkOrder` mutation (e.g., count-based sequence stored in an `orgSettings` document or use `_creationTime` + org prefix).  
**Status:** [ ] TODO

---

### TD-002 · PIN-based signature auth is security theater
**File:** `app/(app)/work-orders/[id]/tasks/[cardId]/page.tsx` — `SignStepDialog`  
**Issue:** The dialog collects a "PIN" from the technician but never validates it. The `createSignatureAuthEvent` mutation does not verify any PIN — it creates the auth token unconditionally. Any string (including empty) will succeed. Under 14 CFR Part 43, a maintenance signature must positively identify the certificated person. A fake PIN check satisfies neither the regulatory intent nor basic security.  
**Fix:** Two-track solution: (a) Short-term: replace the PIN field with Clerk re-authentication (a pop-up password confirmation using Clerk's `useSession` re-auth API). (b) Longer-term: `createSignatureAuthEvent` should validate a TOTP or biometric factor via a Convex action. At minimum, remove the PIN field from the UI so it does not imply false security.  
**Status:** [ ] TODO

---

### TD-003 · No 404/not-found handling on dynamic routes
**Files:** `work-orders/[id]/page.tsx`, `work-orders/[id]/tasks/[cardId]/page.tsx`, `fleet/[tail]/page.tsx`, `work-orders/[id]/rts/page.tsx`, `work-orders/[id]/records/page.tsx`  
**Issue:** All dynamic route pages pass the URL param directly into `useQuery` without checking if the result is `null`. When a record doesn't exist (stale link, manually typed URL, deleted record), pages either show a blank skeleton loop or crash with a runtime error.  
**Fix:** After each `useQuery`, check if result is `null` when `isLoaded`. Render a proper `not-found.tsx` or inline "Record not found" state with a back link. Next.js App Router supports `notFound()` from `"next/navigation"` for server components, but for client components, a conditional redirect or inline empty state is correct.  
**Status:** [ ] TODO

---

## P1 — High

### TD-004 · STATUS_LABEL / WO_TYPE_LABEL / getStatusStyles duplicated across 5+ files
**Files:** `work-orders/page.tsx`, `work-orders/[id]/page.tsx`, `work-orders/new/page.tsx`, `work-orders/[id]/tasks/[cardId]/page.tsx`, `work-orders/[id]/rts/page.tsx`  
**Issue:** The same `STATUS_LABEL`, `WO_TYPE_LABEL`, `getStatusStyles`, `getTaskStatusStyles`, and `WO_TYPES` constants are copy-pasted verbatim across at least 5 files. Any change to a status label or color requires editing every file — and they will inevitably drift.  
**Fix:** Extract all shared MRO constants to `lib/mro-constants.ts`. Export typed constants and helper functions. Import from all consumers.  
**Status:** [ ] TODO

---

### TD-005 · Forms use raw useState instead of react-hook-form + zod
**Files:** `work-orders/new/page.tsx`, `work-orders/[id]/tasks/new/page.tsx`, `parts/new/page.tsx`, `work-orders/[id]/records/page.tsx`  
**Issue:** All forms are built with manual `useState` fields and ad-hoc validation strings. `react-hook-form` and `zod` are already declared in `package.json` and used nowhere in the MVP pages. The result is: no schema-driven validation, no accessible error messages tied to specific fields, no dirty/touched tracking, and no controlled submission state.  
**Fix:** Convert all forms to `react-hook-form` + `zod`. Define a Zod schema for each form (can mirror the Convex validator for that mutation). Use `zodResolver`. This eliminates 50–80 lines of boilerplate per form.  
**Status:** [ ] TODO

---

### TD-006 · No React error boundaries on any page
**Files:** All `app/(app)/**/page.tsx` files  
**Issue:** A Convex subscription error, network failure, or unexpected null propagation will crash the entire page and display Next.js's default error page (a white screen in prod) with no recovery path. There are no `error.tsx` files in any route segment.  
**Fix:** Add `error.tsx` in `app/(app)/` (segment-level error boundary) that shows a user-friendly error card with a "Try again" button. For critical paths (WO detail, RTS), add per-route `error.tsx`. Reference Next.js App Router error boundary docs.  
**Status:** [ ] TODO

---

### TD-007 · useCurrentOrg adds a waterfall query to every page load
**File:** `hooks/useCurrentOrg.ts`  
**Issue:** Every authenticated page calls `useCurrentOrg()` which fires `api.technicians.getMyContext` — an extra Convex round-trip that must complete before any org-scoped data can load. This creates a serial waterfall: Clerk auth → getMyContext → page data queries. On slow connections, this doubles perceived load time.  
**Fix:** Cache the result of `getMyContext` in React Context at the app layout level (`app/(app)/layout.tsx`). Wrap the layout in an `OrgContextProvider` that fires `getMyContext` once at mount. All child pages read from context — no per-page waterfall.  
**Status:** [ ] TODO

---

### TD-008 · Inline Tailwind class strings for status colors duplicated everywhere
**Files:** All page files  
**Issue:** The exact string `"bg-sky-500/15 text-sky-400 border-sky-500/30"` (and its 8 variants for other statuses) appears copy-pasted across 5+ files. Changing a status color requires a grep-and-replace across the entire codebase.  
**Fix:** Add all status color mappings to `lib/mro-constants.ts` as a `STATUS_STYLES` map alongside `STATUS_LABEL`. Consumers call `STATUS_STYLES[status]` — one place to change.  
**Status:** [ ] TODO  
*(Resolved together with TD-004)*

---

## P2 — Medium

### TD-009 · Monolithic page files — no component extraction
**Files:** `work-orders/[id]/page.tsx` (620 lines), `tasks/[cardId]/page.tsx` (840 lines), `work-orders/[id]/rts/page.tsx` (592 lines)  
**Issue:** Pages contain multiple distinct UI components (dialogs, tab panels, card sections) inlined as local functions. This makes the files hard to test, navigate, and modify independently. It also prevents component reuse.  
**Fix:** Extract named sub-components to co-located files (e.g., `_components/TaskCardStepRow.tsx`, `_components/PreconditionRow.tsx`, `_components/RtsStatementForm.tsx`). Pages should be thin orchestration layers.  
**Status:** [ ] TODO

---

### TD-010 · derivePreconditions uses fragile inline ReturnType annotation
**File:** `work-orders/[id]/rts/page.tsx`  
**Issue:** `ReturnType<typeof useQuery<typeof api.returnToService.getCloseReadinessReport>>` is used as an inline type annotation. This will silently break if the query signature changes and produces opaque type errors. It also makes the function signature unreadable.  
**Fix:** Import or define a named `CloseReadinessReport` type in `lib/mro-types.ts` derived from the Convex return type using Convex's type helpers. Use that named type everywhere.  
**Status:** [ ] TODO

---

### TD-011 · Missing mutation error feedback on several forms
**Files:** `parts/new/page.tsx`, `work-orders/[id]/tasks/new/page.tsx`  
**Issue:** Some form submission handlers catch errors in `try/catch` but only log to console or show a generic toast. The specific error message from Convex (which contains the invariant violation reason) is discarded.  
**Fix:** Propagate the Convex error message to a visible inline error alert above the submit button. Use a consistent pattern: `const [submitError, setSubmitError] = useState<string | null>(null)` + `<Alert variant="destructive">` display.  
**Status:** [ ] TODO

---

### TD-012 · WO number generation uses Math.random() seeded at component mount
**File:** `app/(app)/work-orders/new/page.tsx`  
**Issue:** `useState(defaultWoNumber)` calls `defaultWoNumber()` once at mount. Because `Math.random()` is not seeded, two tabs opened in the same second will generate the same WO number with ~1/9000 probability. More importantly, the number is editable by the user.  
*(See also TD-001 for the server-side fix — this item tracks the client-side call)*  
**Status:** [ ] TODO  
*(Resolved together with TD-001)*

---

### TD-013 · No consistent date formatting utility
**Files:** Multiple page files  
**Issue:** Dates are formatted inconsistently: some pages use `.toLocaleDateString()`, some use `new Date(ms).toLocaleString()`, some use hardcoded format strings. This produces locale-dependent output that will look different for users in different regions.  
**Fix:** Add `lib/format.ts` with `formatDate(ms: number): string` and `formatDateTime(ms: number): string` utilities using `Intl.DateTimeFormat` with a fixed locale and format options. Import from all pages.  
**Status:** [ ] TODO

---

## P3 — Low

### TD-014 · No ESLint configuration in athelon-app
**File:** `athelon-app/` root  
**Issue:** No `.eslintrc` or `eslint.config.mjs` exists in `athelon-app`. `npm run build` will not catch common React/accessibility issues. The `next/core-web-vitals` ruleset ships with Next.js and catches real bugs.  
**Fix:** Add `eslint.config.mjs` with `next/core-web-vitals` + `@typescript-eslint/recommended`. Add `"lint": "next lint"` to `package.json` scripts. Run and fix all warnings.  
**Status:** [ ] TODO

---

### TD-015 · `as never` and unsafe casts in Convex backend code
**Files:** `convex/parts.ts`, other backend files  
**Issue:** Several places use `as never` or `as` type assertions to satisfy Convex type constraints. These suppress legitimate TypeScript errors and can hide runtime type mismatches.  
**Fix:** Replace each `as never` cast with a properly typed value. If the Convex type system requires a cast, document why with an inline comment.  
**Status:** [ ] TODO

---

### TD-016 · Missing `loading.tsx` files for route segments
**Files:** `app/(app)/` and sub-routes  
**Issue:** Next.js App Router supports `loading.tsx` for automatic Suspense boundaries. None exist. Pages show no loading state during navigation — just a blank flash.  
**Fix:** Add `loading.tsx` files at the `(app)` segment level and at high-traffic routes (`/work-orders`, `/work-orders/[id]`). Use the existing `Skeleton` components for consistent loading UI.  
**Status:** [ ] TODO

---

### TD-017 · `auth.config.ts` is incomplete — no Clerk domain configured
**File:** `convex/auth.config.ts`  
**Issue:** The auth config file exists but may not have the correct Clerk domain. When deployed without the right `CLERK_JWT_ISSUER_DOMAIN`, all auth will fail silently.  
**Fix:** Verify `auth.config.ts` references the correct Clerk frontend API URL. Document the required env vars in `README.md` or a `.env.example` file so the next developer can set up instantly.  
**Status:** [ ] TODO

---

## Fix Log

| ID | Description | Team | Commit | Verified |
|----|-------------|------|--------|----------|
| TD-004+008 | Extract shared MRO constants to lib/mro-constants.ts | Team A | — | — |
| TD-001+012 | Server-side WO number generation | Team A | — | — |
| TD-005 | Convert forms to react-hook-form + zod | Team B | — | — |
| TD-003 | 404/not-found handling on dynamic routes | Team B | — | — |
| TD-006 | Add error.tsx error boundaries | Team B | — | — |
| TD-007 | OrgContext provider — eliminate waterfall | Team C | — | — |
| TD-009 | Extract sub-components from monolithic pages | Team C | — | — |
| TD-010 | Named CloseReadinessReport type in mro-types.ts | Team A | — | — |
| TD-011 | Consistent mutation error feedback | Team B | — | — |
| TD-013 | Shared date formatting utility | Team A | — | — |
| TD-014 | ESLint config + next/core-web-vitals | Team C | — | — |
| TD-015 | Remove as-never casts from Convex backend | Team C | — | — |
| TD-016 | Add loading.tsx files | Team B | — | — |
| TD-017 | Verify auth.config.ts + .env.example | Team A | — | — |
| TD-002 | Replace fake PIN with Clerk re-auth | Team B | — | — |

---

*Last updated: 2026-02-24 by Jarvis (Codex 5.3 review)*
