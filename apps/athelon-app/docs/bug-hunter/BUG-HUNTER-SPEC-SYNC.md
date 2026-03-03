# Bug Hunter Spec Sync Protocol (v2)

This document defines the automation contract for keeping canonical feature spec artifacts current after each Bug Hunter cycle.

## Canonical Write Targets

1. `MASTER-BUILD-LIST.md`:
   - `## Registry A — Master Features ...` (upsert by `fs_id` or legacy `featureNumber`)
2. `docs/feature-spec-appendices/bug-hunter-categorization-ledger.md` (append rows)
3. `docs/feature-spec-appendices/detected-features-log.md` (append rows)
4. `docs/feature-spec-appendices/qa-artifact-reconciliation-log.md` (append rows)
5. `docs/feature-spec-appendices/bug-hunter-run-log.md` (append run row)

## Required Gate Before Any Write

Bug Hunter may update the spec only when validation has passed:

1. `npm run typecheck`
2. `npm run build`
3. Role/cycle-specific E2E suite(s)
4. `report.validation.status` must equal `pass`

If validation is not `pass`, no spec update is allowed.

## Explicit Prohibitions

1. Do not delete existing rows in appendices.
2. Do not rewrite historical autonomous cycle narratives.
3. Do not change legacy IDs already emitted.
4. Do not write relative dates (`today`, `yesterday`); use absolute UTC timestamps.
5. Do not sync if validation failed.

## Input Contract

Automation reads a JSON report and applies it with:

```bash
npm run spec:sync:bug-hunter -- --report docs/bug-hunter/bug-hunter-sync.example.json
```

Minimum required fields:

```json
{
  "runId": "BH-CYCLE-049",
  "runDate": "2026-03-03",
  "validation": {
    "status": "pass",
    "checks": ["npm run typecheck", "npm run build"]
  }
}
```

## Feature Update Payloads

### Legacy-compatible shape

```json
{
  "featureStateUpdates": [
    {
      "featureNumber": 23,
      "currentState": "Partially Implemented",
      "featureName": "Work Order Close Readiness",
      "whatNowWorks": "...",
      "bugHunterEvidence": "BUG-LT-AUTO-001",
      "qaAuditEvidence": "GAP-06"
    }
  ]
}
```

### v2 shape (preferred)

```json
{
  "featureStateUpdates": [
    {
      "fsId": "FS-0023",
      "implementationState": "partially_implemented",
      "verificationState": "qa_verified",
      "lastReviewedAtUtc": "2026-03-03T00:00:00Z",
      "lastVerifiedInAppAtUtc": "2026-03-03T00:00:00Z",
      "reviewedBy": "bug-hunter",
      "featureName": "Work Order Close Readiness",
      "whatNowWorks": "...",
      "rebuildNotes": "...",
      "evidenceLinks": "BugHunter=...; QA=..."
    }
  ]
}
```

## Optional Payload Arrays

1. `bugLedgerEntries`
2. `featureStateUpdates`
3. `detectedFeatures`
4. `qaReconciliationUpdates`
5. `newMasterFeatures`

## Automation Command

```bash
npm run spec:sync:bug-hunter -- --report <path-to-report.json>
```

Dry-run mode:

```bash
npm run spec:sync:bug-hunter -- --report <path-to-report.json> --dry-run
```

Idempotency behavior:

1. Duplicate ledger/detected/QA keys are skipped.
2. Existing Registry A rows are upserted by `fs_id` or `featureNumber` mapping.
3. Duplicate run IDs in run log are skipped unless `--force` is passed.
