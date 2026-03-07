# FINAL-VALIDATION-REPORT

## Summary
- Final records: **71**
- Selected source distribution: {'team-h': 56, 'team-g': 15}
- Confidence labels: {'medium': 54, 'high': 5, 'very_high': 11, 'low': 1}
- Contact completeness: {'partial': 18, 'none': 27, 'good': 18, 'full': 8}
- Manual review queue size: **27**

## Deterministic Precedence Validation
- Rule enforced: `team-g > team-h > team-e`
- team-g records applied: **15**
- team-h records applied: **56**
- team-e fallback records applied: **0**

## Traceability Validation
- Major provenance columns retained: legal identity, Part 145 evidence, shop class, aircraft scope, airport profile, observability.
- Added selected-source traceability fields for in-app filtering and audit.
- `RAW-FINDINGS.jsonl` includes per-record source-presence and final selected source.

## Manual Review Priority
1. `manual_review_reason` includes `missing_major_fields`
2. `contact_completeness=none`
3. lower confidence cluster (`overall_confidence=0.75`)
