# TRANSFORM-NOTES

## Tiering Rules
- **confirmed**: hard cert linkage checks pass and `overall_confidence >= 0.85`
- **probable**: hard cert linkage checks pass but `overall_confidence < 0.85`
- **weak**: one or more hard checks fail (`entity_id/cert_no/hints/part145/state`)

## Name-Cert-Address Consistency
- Name/address consistency validated by round-1 key join (`legal_name`,`street`,`city`)
- Certificate consistency validated by triad check (`entity_id`,`cert_no`,`certificate_hints`)

## Distribution
- confirmed: 10
- probable: 61
- weak: 0

## Queue Policy
- Strict queue includes all uncertain records (`probable` + `weak`) for manual FAA revalidation.
