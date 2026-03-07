# TRANSFORM-NOTES

## Normalization / design rules used
- Preferred extending `customers` for query-critical intelligence fields to minimize UI query complexity.
- Added immutable snapshot table for provenance-heavy/historical payloads.
- Chose enum-backed fields for common filters (status, size, distance band, confidence tiers).
- Designed API contracts to align with existing Convex CRM patterns in `convex/crm.ts`.
- Used denormalized index strategy because Convex lacks relational joins.

## Import/mapping assumptions
- Team E `OUTPUT.csv` is expected to be canonical package but is empty in this run.
- Fallback mapping built from Round 1 Team A/B/C outputs and plan field families.
- Certificate extraction from `certificate_hints` may require regex; unresolved when hints absent.
- Observability score defined as optional/derived until scoring function is standardized.

## Scoring/aggregation assumptions
- `observabilityScore`: 0-100 bucketed to `low|medium|high` (versioned scoring recommended).
- `regulatoryPart145Status` derived from confidence and source quality:
  - verified (direct FAA/supporting doc)
  - likely (strong indirect evidence)
  - unknown/conflict (missing or contradictory evidence)

## Unresolved ambiguities
- Final Team E field names for packaging contract are unknown due to empty CSV.
- Geo pass currently supports distance bands, not robust NM distance.
- Identity resolution key requires final Team E QA guidance for duplicate/collision handling.
