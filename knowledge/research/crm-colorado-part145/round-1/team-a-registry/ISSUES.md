# ISSUES

## ambiguous records
- Potential same-entity/multi-cert cases retained as separate entries when certificate hints differed (example class: minor name punctuation differences).

## conflicts needing manual review
- `GOGO BUSINESS AVIATION, LLC` and `GOGO BUSINESS AVIATION, LLC.` appear as near-duplicates with different certificate numbers (`GO2R846D` vs `X8CR828N`). Kept both.
- Any additional same-name/multi-cert patterns should be reviewed against FAA certificate detail pages if strict legal-entity dedupe is required.

## blocked sources
- Browser automation service unavailable in this run, so extraction used direct CSV endpoint from FAA-hosted Tableau view instead of UI interaction.

## data quality caveats
- FAA source does not expose website field in this export; output websites are blank.
- Some rows have sparse contact fields (phone/email absent in source); no values were invented.
