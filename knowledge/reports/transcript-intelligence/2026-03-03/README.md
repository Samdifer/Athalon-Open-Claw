# Transcript Intelligence Report Bundle (V1)

This folder contains a JSON-first report package generated from the core transcript corpus:
- `dispatches/*.md`
- `phase-*/dispatches/*.md`
- `phase-5-repair-station/**/*.md`

## Files
- `manifest.v1.json`: frozen corpus manifest with hashes and metadata.
- `evidence_index.v1.jsonl`: one `EvidenceRecordV1` per line.
- `report_bundle.v1.json`: full `ReportBundleV1` object.
- `leadership_brief.md`: founder/leadership digest.

## Contracts

### ReportBundleV1
- `meta`
- `themes[]`
- `problems[]`
- `features[]`
- `timeline[]`
- `entities[]`
- `open_questions[]`

### EvidenceRecordV1
- `evidence_id`
- `source_file`
- `doc_type`
- `phase`
- `date_normalized`
- `section`
- `speaker`
- `excerpt_text`
- `theme_primary`
- `theme_secondary[]`
- `discussion_attribute`
- `interpretation`
- `confidence`
- `tags[]`

## Confidence Rules
- `High`: explicit requirement/risk language and corroboration across >=2 distinct sources, or broad corroboration (>=3).
- `Medium`: explicit language without broad corroboration, or corroboration across >=2 sources.
- `Low`: single-source contextual inference.

## Prioritization Rules
- Impact and urgency are scored 1-5.
- `P0`: impact >=5, or impact >=4 and urgency >=4.
- `P1`: impact >=3 and urgency >=3.
- `P2`: all remaining items.

## QA Gates
1. Corpus inclusion exactness.
2. Metadata extraction viability (dates/phases).
3. Requirement extraction coverage.
4. Evidence attribution completeness.
5. Non-null theme assignment.
6. Confidence enum validity.
7. Theme excerpt depth (6-10 or explicit low-evidence flag).
8. Prioritization field completeness.
9. Output contract presence.
10. Leadership brief readability sections.
