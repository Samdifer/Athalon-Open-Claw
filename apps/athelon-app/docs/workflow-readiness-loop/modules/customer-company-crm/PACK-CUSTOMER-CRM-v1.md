# Customer + Company CRM Intake + Tracking Pack (v1)

Date: 2026-03-02  
Pack ID: CUSTOMER-CRM-v1  
Parent Plan: `docs/workflow-readiness-loop/PROCESS-CHARTER.md`  
Status: Completed (automation-validated)

## 1) Module Focus

Validate end-to-end intake, maintenance, and downstream use of customer/company records with CRM best-practice controls for data quality, traceability, and org-safe access.

Primary routes:
- `/billing/customers`
- `/billing/customers/:id`

High-impact intake dependencies:
- `/fleet` (Add Aircraft wizard quick-add customer path)
- `/work-orders/new`
- `/billing/quotes/new`
- `/billing/invoices/new`
- `/parts/loaners`

Downstream verification routes:
- `/billing/quotes`
- `/billing/invoices`
- `/billing/ar-dashboard`
- `/work-orders`
- `/portal` + customer portal sub-routes

## 2) Role Coverage

Required runs:

1. Primary: `billing_manager`
2. Adjacent: `shop_manager`
3. Negative RBAC: `read_only`

## 3) User Outcomes (Must Achieve)

1. User can create customer/company records with required identity data and optional billing/contact metadata.
2. User can update customer profiles without corrupting canonical fields or breaking downstream references.
3. User can track customer history (notes, aircraft, work orders, quotes, invoices, payments) from one profile.
4. User can trust org boundary and role boundary enforcement for customer records.

## 4) Button + Action Map

### `/billing/customers`

1. `Add Customer`
- Expected: opens dialog and allows customer creation with validation feedback.

2. `Search customers`
- Expected: filters by customer identity fields and returns deterministic result set.

3. Customer row click
- Expected: navigates to `/billing/customers/:id`.

### `/billing/customers/:id`

1. `Save Changes`
- Expected: updates profile fields and persists changes.

2. `Deactivate` / `Activate`
- Expected: toggles active state and reflects lifecycle state consistently in dependent selectors.

3. `Add Note`
- Expected: appends timestamped activity note with actor metadata.

### `/fleet` (Add Aircraft wizard)

1. `Add New Customer` (quick add)
- Expected: creates customer and links to aircraft intake without duplicate drift.

### `/work-orders/new`

1. `Customer` selector
- Expected: shows active customers; can intentionally select `No customer` when business-appropriate.

### `/billing/quotes/new`

1. `Customer` selector
- Expected: required for quote creation; supports WO-based prefill without identity mismatch.

### `/billing/invoices/new`

1. `Customer` selector and WO prefill branch
- Expected: blocks invoice creation when selected WO has no linked customer or manual customer is missing.

### `/parts/loaners`

1. `Select a customer`
- Expected: required before creating customer loaner transaction.

## 5) Core Invariants

1. Customer reads/writes must be authenticated and enforced to a single organization boundary.
2. Canonical customer profile must reject blank/invalid identity states (for example empty name).
3. Customer/company duplicates should be prevented or surfaced for merge before insert.
4. Inactive customers must not silently remain selectable for new billable transactions.
5. Notes timeline is append-only, actor-attributed, and org/customer-consistent.
6. Downstream records (`work_orders`, `quotes`, `invoices`, `loaners`) must keep stable customer linkage.
7. Customer detail timeline totals and tabs must reconcile with source records.
8. Regression suite must cover create/edit/deactivate/note/downstream-link flow, not only route loads.

## 6) Guided Training Script (Initial Runthrough)

1. Orientation
- Explain customer profile as source-of-truth for billing and workflow linkage.

2. Intake flow
- Create one company customer and one individual customer from `/billing/customers`.

3. Profile maintenance
- Edit contact/payment/tax fields and add notes in `/billing/customers/:id`.

4. Cross-module linkage
- Use customer in WO, quote, invoice, and parts loaner flows.

5. Lifecycle check
- Deactivate/reactivate customer and verify selector behavior in dependent routes.

6. Error/recovery
- Attempt missing-customer branches in quote/invoice flows and verify blocking guidance.

## 7) Structured Test Matrix

### Happy Path

1. `CRM-CUST-HAPPY-01`
- Create customer from list dialog and verify in list + detail.

2. `CRM-CUST-HAPPY-02`
- Edit customer profile fields and verify persistence after refresh.

3. `CRM-CUST-HAPPY-03`
- Add note and verify chronological ordering in notes tab.

### Workflow / UX

1. `CRM-CUST-WF-01`
- User can discover all required inputs for customer intake without trainer assist.

2. `CRM-CUST-WF-02`
- Customer detail tabs provide coherent tracking view (aircraft/work orders/quotes/invoices/payments/notes).

### Edge / Failure

1. `CRM-CUST-EDGE-01`
- Reject blank/invalid customer identity updates.

2. `CRM-CUST-EDGE-02`
- Duplicate customer/company creation attempt receives deterministic conflict handling.

3. `CRM-CUST-EDGE-03`
- Invoice creation from WO with missing customer blocks with corrective guidance.

### RBAC

1. `CRM-CUST-RBAC-01`
- Read-only role cannot create/update/deactivate customer or add notes.

2. `CRM-CUST-RBAC-02`
- Cross-org customer ID cannot be read or mutated through CRM queries/mutations.

### Data Integrity

1. `CRM-CUST-DX-01`
- Same customer ID appears consistently across WO, quote, invoice, and loaner flows.

2. `CRM-CUST-DX-02`
- Active/inactive customer state is consistently applied to dependent selectors.

## 8) Automation Backstop For This Pack

Run before and after session:

1. Route smoke:
- `npx playwright test e2e/smoke-all-routes.spec.ts --project=chromium-authenticated`

2. Billing/customer smoke baseline:
- `npx playwright test e2e/sim-wave4-billing.spec.ts --project=chromium-authenticated`

3. Dedicated CRM guard suite:
- `npx playwright test e2e/wave10-customer-crm-guard.spec.ts --project=chromium-authenticated`

## 9) Evidence Capture

Store run artifacts:
- `artifacts/training-runs/YYYY-MM-DD/customer-company-crm/<role>/<run-id>/`

Capture:
1. Preflight command output (pass/fail/skip counts).
2. Customer IDs created/edited during run.
3. Evidence of downstream linkage in WO/quote/invoice/loaner flows.
4. Findings and ticket mappings.

## 10) Scorecard Gate (This Pack)

Green gate target:
1. >= 90% CRM checks pass.
2. <= 2 trainer assists per role run.
3. 0 unresolved S0/S1 findings.
4. Dedicated deterministic CRM guard suite present and passing.

Current gate note:
- Run 001 is `Green` for WRL automation track (no unresolved S0/S1; deterministic CRM guard suite passing).
- Manual role sessions remain optional for additional UX/assist signal.
