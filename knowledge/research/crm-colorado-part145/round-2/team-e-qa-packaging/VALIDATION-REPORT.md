# VALIDATION-REPORT (v2 remediation)

- **rows**: 71
- **missing_shop_size_class**: 0
- **missing_aircraft_worked_on**: 0
- **missing_airport_distance_band**: 0
- **missing_observability_score**: 0

## Remediations applied
- Filled airport distance band and aligned proximity field from Team-C mapping.
- Backfilled shop size and aircraft focus from Team-B where available.
- Added conservative heuristic fallbacks for uncovered rows.
- Backfilled missing observability scores with conservative default 0.20.
- Updated provenance fields for all remediated values.
