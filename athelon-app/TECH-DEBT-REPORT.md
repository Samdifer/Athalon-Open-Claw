# Technical Debt Report — Athelon MVP

**Date:** 2026-02-25  
**Audited by:** Jarvis  
**Status:** Fixed items marked ✅, documented items marked 📋

---

## Fixed ✅

### TD-001: Missing Error Boundaries (9 modules)
- **Before:** Only billing + work-order detail had error.tsx
- **Fix:** Created error.tsx for all 9 missing modules (compliance, dashboard, fleet, my-work, parts, personnel, settings, squawks, work-orders root)
- **Impact:** App-wide crash protection — no more white screens

### TD-002: Missing Loading Skeletons (8 modules)
- **Before:** Only billing modules had loading.tsx
- **Fix:** Created loading.tsx for 8 missing modules
- **Impact:** Better UX during navigation — skeleton loaders instead of blank pages

### TD-003: PIN Not Cryptographically Verified (Security)
- **Before:** createSignatureAuthEvent accepted any 4+ digit PIN without verification
- **Fix:** 
  - Added `pinHash` field to technicians schema (SHA-256 hex digest)
  - Added `setPin` mutation to technicians.ts (validates 4-6 digits, hashes with SHA-256)
  - Updated createSignatureAuthEvent to verify PIN against stored hash when set
  - Graceful fallback: if technician has no pinHash, any PIN accepted (backward compatible)
- **Impact:** Signature re-authentication now enforced when PINs are configured

### TD-004: Dashboard Hydration Error (Fixed in QA Sprint)
- **Before:** `<Skeleton>` (renders `<div>`) nested inside `<p>` tags — invalid HTML
- **Fix:** Changed 4 stat card wrappers from `<p>` to `<div>`

### TD-005: Sub-Agent Code Corruption (Fixed)
- **Before:** Sub-agents imported shared `requireAuth` from authHelpers but removed local function definitions, leaving dangling code in 6 files
- **Fix:** Restored original files from git, verified all legitimate changes intact
- **Impact:** Clean TypeScript compilation restored

### TD-006: Stale TODO Comments in Logbook
- **Before:** Logbook page had TODO comments about missing query
- **Fix:** Query was already implemented; TODO comments were auto-cleaned during wiring

---

## Documented 📋 (Not Fixed — Requires Broader Refactor)

### TD-007: orgId vs organizationId Inconsistency
- **Severity:** Low (code smell)
- **Scope:** Billing tables use `orgId` (101 refs), core tables use `organizationId` (87 refs)
- **Recommendation:** Standardize to `orgId` in next major refactor. Requires schema migration + all mutation/query args.
- **Risk if ignored:** Developer confusion, potential bugs when writing cross-module queries

### TD-008: Large Page Files (>500 lines)
- **Severity:** Low
- **Files:**
  - `work-orders/[id]/records/page.tsx` (797 lines)
  - `dashboard/page.tsx` (652 lines)
  - `work-orders/[id]/tasks/new/page.tsx` (630 lines)
  - `work-orders/[id]/rts/page.tsx` (586 lines)
  - `fleet/[tail]/logbook/page.tsx` (570 lines)
  - `compliance/page.tsx` (517 lines)
- **Recommendation:** Extract sub-components into `_components/` folders (pattern already used in task cards)

### TD-009: Zero Accessibility Attributes
- **Severity:** Medium
- **Finding:** 0 aria-labels or role attributes across entire app
- **Recommendation:** Add aria-labels to interactive elements, role attributes to landmark regions. Required for WCAG compliance if app will be used commercially.

### TD-010: Phase 2.1/4.1 TODOs (~20 items)
- **Severity:** Info (planned work)
- **Distribution:**
  - returnToService.ts: 6 TODOs (SHA-256 hash, PDF rendering, rating inference, scope check)
  - workOrders.ts: 3 TODOs (signature fields, BP-01 Marcus item)
  - adCompliance.ts: 3 TODOs (org-level settings, due-soon thresholds)
  - parts.ts: 3 TODOs (partTag quantity tracking)
  - taskCards.ts: 2 TODOs (counterSignStep, signature fields)
  - discrepancies.ts: 1 TODO (counter document)
- **Status:** These are correctly scoped to future phases. No immediate action needed.

### TD-011: RTS Hash Uses Weak Algorithm
- **Severity:** Medium (security)
- **Location:** `convex/returnToService.ts` line 50-78
- **Issue:** computeRtsHash uses a custom non-cryptographic hash instead of SHA-256
- **Recommendation:** Replace with `crypto.subtle.digest("SHA-256", ...)` (same pattern now used for PIN hashing)

---

## Metrics

| Metric | Value |
|--------|-------|
| Total Convex backend lines | 15,741 |
| Total app pages | 39 |
| Total components | 21 |
| `as any` casts | 1 (documented) |
| console.log in production | 0 |
| Hardcoded URLs | 0 |
| Error boundaries | 13/13 modules covered ✅ |
| Loading skeletons | 13/13 modules covered ✅ |
| Smoke tests | 36/36 passing ✅ |
| Authenticated E2E | 10/10 passing ✅ |
