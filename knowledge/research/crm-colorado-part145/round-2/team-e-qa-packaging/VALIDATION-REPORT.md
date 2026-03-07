# VALIDATION-REPORT

- Total consolidated entities: 71
- Team A rows ingested: 71
- Team B rows ingested: 6
- Team C rows ingested: 71
- Team D rows ingested: 71

## Provenance Coverage (key fields)
- legal_name: 100.0%
- part145_indicator: 100.0%
- shop_size_class: 12.7%
- aircraft_worked_on: 12.7%
- airport_proximity_profile: 100.0%
- observability_score: 76.1%

## Review Queue Summary
- low_confidence: 0
- ambiguous_identity: 1
- missing_critical_fields: 62

## Validation Notes
- Base identity and Part 145 hints sourced from Team A (FAA registry extract).
- Geo and airport proximity from Team C joined by cert_no.
- Shop size and aircraft profile from Team B where identity match confidence passed threshold.
- Observability score sourced from Team D (normalized to 0-1), with Team B fallback if missing.
