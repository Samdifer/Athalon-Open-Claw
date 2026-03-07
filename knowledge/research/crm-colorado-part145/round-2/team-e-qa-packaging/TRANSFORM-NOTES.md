# TRANSFORM-NOTES

- Parsed cert_no from Team A `certificate_hints`.
- Joined Team C by cert_no (fallback: normalized legal name).
- Matched Team B candidate names to Team A legal/dba names by token-overlap threshold (>=0.34).
- Mapped Team D observability_score (0-100) to CRM score (0.00-1.00).
- Generated review queue for low-confidence, ambiguous identity, and missing critical fields.
