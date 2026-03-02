# Work Order Creation Training + Test Pack (v1)

Date: 2026-03-02  
Pack ID: WO-CREATE-v1  
Parent Plan: `docs/workflow-readiness-loop/PROCESS-CHARTER.md`  
Status: Completed (automation-validated)

## 1) Module Focus

Train users on creating a new work order and identify workflow/logic gaps in the creation flow.

Primary route:
- `/work-orders/new`

Downstream verification routes:
- `/work-orders`
- `/work-orders/:id`

## 2) Role Coverage

Required runs:

1. Primary: `lead_technician` (or `shop_manager`)
2. Adjacent: `admin`
3. Negative RBAC: `read_only`

## 3) User Outcomes (Must Achieve)

1. User can create a draft work order with required fields only.
2. User understands optional fields and when to use them.
3. User can verify created WO in detail view and list view.
4. User can recover cleanly from create errors.

## 4) Button + Action Map

Page: `/work-orders/new`

1. `Work Orders` back link
- Expected: Navigates to `/work-orders` without creating records.

2. `Aircraft` selector (required)
- Expected: Must be selected before submit can enable.
- Empty-state behavior: show "No aircraft registered. Add aircraft in Fleet first."

3. `Customer` selector (optional)
- Expected: allow no customer via `— No customer —`.
- Empty-state behavior: show "No customers yet. Add customers in Billing → Customers."

4. `Work Order Type` selector (required)
- Expected: defaults to `routine`; user can switch to other `WO_TYPES`.

5. `Description` textarea (required)
- Expected: required for submit enable.

6. `Priority` radio group
- Expected: defaults to `routine`, allows `urgent` and `aog`.

7. `Promised Delivery Date` (optional)
- Expected: stores date when provided.

8. `Estimated Labor Hours` (optional)
- Expected: stores numeric override when provided, otherwise omitted.

9. `Create Work Order` submit button
- Expected: disabled until required fields met.
- Expected on success: create mutation succeeds and route transitions to `/work-orders/:id`.

10. `Cancel` button
- Expected: returns to `/work-orders`; no mutation.

## 5) Core Invariants

1. Submit remains disabled until both required inputs are valid:
- aircraft selected
- non-empty description

2. New WO number is system-generated (not manually entered on this screen).

3. Successful create lands on WO detail page for the created record.

4. Failed create shows inline error and keeps user on form.

## 6) Guided Training Script (Initial Runthrough)

1. Orientation (1 minute)
- "This screen creates a draft work order and then opens the detail page."

2. Required fields walkthrough
- Select aircraft.
- Confirm work order type.
- Enter a short description.

3. Optional fields walkthrough
- Choose customer (or no customer).
- Set priority.
- Add squawks, promised date, estimated labor, internal notes.

4. Create and verify
- Click `Create Work Order`.
- Confirm navigation to `/work-orders/:id`.
- Confirm record appears with expected aircraft/description/priority data.

5. Recovery path
- Trigger an invalid/blocked attempt and show error banner behavior.

## 7) Structured Test Matrix

### Happy Path

1. `WO-CREATE-HAPPY-01`
- Required fields only -> create succeeds -> detail route opens.

2. `WO-CREATE-HAPPY-02`
- Required + all optional fields -> create succeeds with values persisted.

### Workflow / UX

1. `WO-CREATE-WF-01`
- New user can find required controls without trainer assist.

2. `WO-CREATE-WF-02`
- User understands WO number is auto-generated, not manual input.

### Edge / Failure

1. `WO-CREATE-EDGE-01`
- No aircraft in org -> blocking guidance shown.

2. `WO-CREATE-EDGE-02`
- Backend failure on create -> inline error shown and data preserved on form.

3. `WO-CREATE-EDGE-03`
- Cancel from partially completed form -> no record created.

### RBAC

1. `WO-CREATE-RBAC-01`
- Read-only role cannot successfully create WO (UI and/or server enforcement).

### Data Integrity

1. `WO-CREATE-DX-01`
- Created WO appears in `/work-orders` list after creation.

2. `WO-CREATE-DX-02`
- Promised date and estimated labor values persist exactly when provided.

## 8) Automation Backstop For This Pack

Use existing suites before and after session:

1. Route smoke:
- `npx playwright test e2e/smoke-all-routes.spec.ts --project=chromium-authenticated`

2. Existing WO context checks:
- `npx playwright test e2e/wave3-work-orders.spec.ts --project=chromium-authenticated`

3. Dedicated WRL WO creation guard suite:
- `npx playwright test e2e/wave9-work-order-creation-guard.spec.ts --project=chromium-authenticated`

4. Optional adjacent suite (parts safety; no WO assertions):
- `npx playwright test e2e/wave6-parts-wo-safety.spec.ts --project=chromium-authenticated`

Follow-up rule:
- Any reproducible training finding becomes an E2E test in next cycle.

Validation note:
- `WO-CREATE-001` and `WO-CREATE-002` were closed by migrating drifted WO assertions out of mixed-domain suite and into `wave9-work-order-creation-guard.spec.ts`.

## 9) Evidence Capture

Store run artifacts:
- `artifacts/training-runs/YYYY-MM-DD/work-order-creation/<role>/<run-id>/`

Capture:
1. Session video or screenshots for key steps.
2. Created WO ID(s).
3. Error screenshot(s) for failed attempts.
4. Final scorecard and findings list.

## 10) Scorecard Gate (This Pack)

Green gate target:
1. >= 90% task completion.
2. <= 2 trainer assists.
3. 0 unresolved S0/S1 findings.
4. All required flow checks pass (`HAPPY-01`, `RBAC-01`, `DX-01`).

## 11) Known Drift To Validate During Session

Legacy test naming references "WO Number input required," while current UI uses auto-generated WO number display.  
During this pack, confirm the true gating behavior remains:
- required: aircraft + description
- not required: manual WO number entry
