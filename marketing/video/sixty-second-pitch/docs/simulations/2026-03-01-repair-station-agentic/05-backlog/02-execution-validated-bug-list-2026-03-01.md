# Execution-Validated Bug List (2026-03-01)

Source: live run failures from `03-observations/2026-03-01-live-run-command-log.md`

## P0 - Execute First

| ID | Source Test | Issue | Classification | Action |
| --- | --- | --- | --- | --- |
| EXE-001 | `wave8-quote-conversion-regression` | Converted quote `E2E-Q-CONV-001` not discoverable in billing list. | product/test contract mismatch | Confirm seeded quote visibility contract and restore stable selector+UI linkage. |
| EXE-002 | `wave8-quote-labor-kits` | New quote builder did not expose expected `Add Kit Lines` interaction. | product behavior mismatch | Validate labor-kit panel rendering conditions and CTA labeling contract. |
| EXE-003 | `wave8-quote-labor-kits` | Draft quote `E2E-Q-DRAFT-001` row not found by user-story path. | product/test contract mismatch | Verify seeded quote ownership/org scope and list filtering defaults. |
| EXE-004 | `wave6-rts-release-gate` | Release page gate assertions failed (heading + gate card). | product behavior mismatch | Re-validate release page structure and RTS gate rendering rules against compliance requirements. |

## P1 - High

| ID | Source Test | Issue | Classification | Action |
| --- | --- | --- | --- | --- |
| EXE-005 | `wave6-invoice-payment-guard` | Record payment CTA missing on selected invoice flow. | product/data contract mismatch | Ensure unpaid invoice fixture selection and visible CTA policy in detail view. |
| EXE-006 | `wave6-parts-wo-safety` | Condemn action did not present alertdialog role contract. | product or accessibility contract mismatch | Ensure destructive confirm uses accessible alertdialog role and stable selectors. |
| EXE-007 | `wave6-parts-wo-safety` | Part detail sheet content assertion empty after open action. | product behavior mismatch | Verify sheet content hydration and fallback states on detail open. |

## P2 - Medium (Likely Test Contract Drift)

| ID | Source Test | Issue | Classification | Action |
| --- | --- | --- | --- | --- |
| EXE-008 | `wave5-discrepancy-disposition` | Heading detection captured "command palette" instead of squawks heading. | test harness drift | Scope heading locator to page container/testid; avoid global first-heading lookup. |
| EXE-009 | `wave5-discrepancy-disposition` | KPI card class-based selector returned zero. | test harness drift | Replace style-class selector with semantic testids/labels for KPI cards. |
| EXE-010 | `wave6-parts-wo-safety` | WO number selector matched non-input node. | test harness drift | Constrain selector to `input#workOrderNumber` and assert element type before inputValue. |

## Re-Run Plan

1. Fix P0 contract issues and re-run `test:e2e:wave:scheduler-stories` and `wave6-rts-release-gate`.
2. Fix P1 product/accessibility issues and re-run `wave6-parts-wo-safety` + `wave6-invoice-payment-guard`.
3. Patch P2 test drift and re-run `wave5-discrepancy-disposition`.
4. Run `smoke-full` to confirm no route regressions after changes.
