# TRANSFORM-NOTES

## normalization rules used
- Source file: FAA AVInfo Download CSV.
- Mapped `Agency Name` → `legal_name`.
- Mapped `DBA` → `dba_name` (blank if missing).
- Built `street` by concatenating non-empty `Address Line 1/2/3` with spaces.
- Mapped `City` → `city`, forced `state = CO`, mapped `Postal Code` → `zip`.
- Built `certificate_hints` as: `Cert <Cert_No>; Designator <DSGN_CODE>` where present.
- `website` left blank (not present in registry extract).
- `phone` from `Agency Phone Number`; `email` from `Agency Email` fallback `Email`.
- `source_ref` set to `FAA-AVINFO-DOWNLOAD-2026-03-07`.

## dedupe/classification assumptions
- Included only rows with `State/Province = CO` and `Country = UNITED STATES` to avoid non-Colorado false positives (e.g., Coahuila, Mexico using `CO`).
- Deduped exact duplicates on `(legal_name, street, zip, certificate_hints)`.
- Did **not** merge same legal names with different certificate numbers (treated as distinct facilities/certificates).
- Assigned confidence `high` to all included rows (official FAA data source).

## unresolved ambiguities
- Some records appear to represent the same organization with multiple certificates (e.g., punctuation variants in name), but were retained as separate rows due to distinct cert hints.
- No website field available in primary source; enrichment deferred.
