# Live Execution Command Log (2026-03-01)

Environment executed: `../../../athelon-app`

## Commands Run

```bash
npm run seed:repair-station
npm run seed:audit:repair-station
npm run test:e2e:wave:scheduler-stories
npx playwright test e2e/wave5-discrepancy-disposition.spec.ts e2e/wave6-parts-wo-safety.spec.ts e2e/wave6-rts-release-gate.spec.ts e2e/wave6-invoice-payment-guard.spec.ts e2e/wave7-audit-trail-fleet.spec.ts --project=chromium-authenticated
npx playwright test e2e/smoke-full.spec.ts --project=chromium
```

## Seed + Audit Outcome

- `seed:repair-station`: PASS
- Scenario: `ATHELON-DEMO-KA-TBM-2LOC`
- Coverage: PASS
- Open gaps: `0`
- Resolved gaps: `13`

## Test Outcome Summary

| Suite | Total | Passed | Skipped | Failed | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| wave scheduler stories (`wave8-*`) | 18 | 14 | 1 | 3 | failing |
| cross-team suites (`wave5/6/7`) | 54 | 24 | 22 | 8 | failing |
| smoke full routes | 47 | 47 | 0 | 0 | passing |
| **aggregate** | **119** | **85** | **23** | **11** | mixed |

## Failed Tests Captured

### Scheduler/Quote Failures (3)

- `wave8-quote-conversion-regression`: converted quote row not found (`E2E-Q-CONV-001`).
- `wave8-quote-labor-kits`: `Add Kit Lines` button not found in new quote flow.
- `wave8-quote-labor-kits`: draft quote row `E2E-Q-DRAFT-001` not found.

### Cross-Team Failures (8)

- `wave5-discrepancy-disposition`: squawks heading assertion failed (first heading resolved to "command palette").
- `wave5-discrepancy-disposition`: KPI card detection returned 0.
- `wave6-invoice-payment-guard`: record payment button not found on selected invoice.
- `wave6-parts-wo-safety`: condemn action did not surface `[role='alertdialog']`.
- `wave6-parts-wo-safety`: part detail sheet text assertion empty.
- `wave6-parts-wo-safety`: WO number selector resolved non-input element.
- `wave6-rts-release-gate`: release page heading assertion failed.
- `wave6-rts-release-gate`: RTS gate card expectation failed.

## Notes

- Route-level health is strong (`47/47` smoke pass), indicating broad app availability.
- Most failures are feature-contract or selector-contract issues within otherwise reachable pages.
- High skip count in cross-team suite reflects data-dependent guards in tests.
