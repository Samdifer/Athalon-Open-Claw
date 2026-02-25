# QA Master Plan — Athelon MVP Comprehensive Test & Fix Sprint

**Created:** 2026-02-25 12:30 UTC  
**Status:** IN PROGRESS  
**Coordinator:** Jarvis (main session)

## Objective
Comprehensively test ALL MVP modules via E2E, smoke, and browser testing. Fix bugs, note large features, add small fixes autonomously.

## App Pages (37 total across 8 modules)

### Module 1: Dashboard
- `/dashboard`

### Module 2: Fleet Management
- `/fleet` (list)
- `/fleet/[tail]` (detail)

### Module 3: Work Orders
- `/work-orders` (list)
- `/work-orders/new`
- `/work-orders/[id]` (detail)
- `/work-orders/[id]/tasks/new`
- `/work-orders/[id]/tasks/[cardId]`
- `/work-orders/[id]/records`
- `/work-orders/[id]/rts`
- `/work-orders/[id]/signature`

### Module 4: Parts
- `/parts` (list)
- `/parts/new`
- `/parts/requests`

### Module 5: Billing (15 pages)
- `/billing/quotes`, `/billing/quotes/new`, `/billing/quotes/[id]`
- `/billing/invoices`, `/billing/invoices/new`, `/billing/invoices/[id]`
- `/billing/purchase-orders`, `/billing/purchase-orders/new`, `/billing/purchase-orders/[id]`
- `/billing/time-clock`
- `/billing/vendors`, `/billing/vendors/new`, `/billing/vendors/[id]`
- `/billing/pricing`
- `/billing/analytics`

### Module 6: Personnel
- `/personnel`

### Module 7: Compliance
- `/compliance`
- `/compliance/audit-trail`

### Module 8: Squawks
- `/squawks`

### Module 9: Settings
- `/settings/shop`

## Wave Plan

### Wave 1 — Auth Fix + Smoke Expansion (Agent 1)
- Fix global-setup.ts auth to reliably save authenticated state
- Expand smoke tests to ALL 37 pages (not just billing)
- Run and verify all smoke tests pass

### Wave 2 — Browser Visual QA (Agent 2)
- Log into app via browser tool
- Screenshot and audit EVERY page for UI bugs
- Check responsive layout, missing labels, broken links
- Document all issues in QA-BROWSER-REPORT.md

### Wave 3 — Authenticated E2E Tests (Agent 3)
- Write E2E tests for: Dashboard, Fleet, Work Orders, Parts, Personnel, Compliance, Squawks, Settings
- Test CRUD flows, navigation, error states, empty states
- Run full suite and document results

### Wave 4 — Data Integrity & Edge Cases (Agent 4)
- Test Convex mutations directly via `npx convex run`
- Verify schema constraints, required fields, status transitions
- Test billing lifecycle: Quote→Invoice→Payment→Partial→Paid
- Test work order lifecycle: Create→Assign→Execute→RTS

### Wave 5 — Fix & Polish (Main Session)
- Triage all findings from Waves 1-4
- Fix bugs (small), document features (large)
- Re-run full test suite
- Final QA-FINAL-REPORT.md

## Tracking
- [ ] Wave 1: Auth + Smoke
- [ ] Wave 2: Browser Visual QA
- [ ] Wave 3: Authenticated E2E
- [ ] Wave 4: Data Integrity
- [ ] Wave 5: Fix & Polish
