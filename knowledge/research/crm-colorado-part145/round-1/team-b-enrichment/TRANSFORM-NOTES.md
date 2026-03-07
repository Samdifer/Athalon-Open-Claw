# TRANSFORM-NOTES

## Objective
Create conservative enrichment for Colorado Part 145 prospects using public evidence.

## Derived field rules

- **shop_size_class**
  - `large`: explicit multi-site national MRO or very large workforce/facility signals.
  - `medium`: meaningful facility/team indicators (e.g., ~50-250 staff equivalent signal, multiple hangars) but not national mega-scale.
  - `small`: niche/limited footprint signals.
  - `unknown`: insufficient evidence.

- **aircraft_worked_on (tags)**
  - Added only when directly named (OEM/model/family) or explicitly described (e.g., "under 12,500 lbs", PT6-powered, avionics-heavy).
  - Avoided inferred tags unless strongly implied by source text.

- **profile_archetype**
  - `full_service_mro`: broad maintenance + structures/interiors/avionics/paint.
  - `avionics_heavy_satellite`: location focused on avionics/line support and installs.
  - `airframe_restoration_specialist`: repairs/restoration/structural emphasis.
  - `oem_platform_specialist`: service tied to specific platforms (e.g., King Air/PT6/Citation/PC-12).

- **web_observability_signals**
  - Encoded as compact semicolon-separated tags:
    - `website:first_party`
    - `news:first_party`
    - `directory_or_3p:present`
    - `faa_cert_doc:linked_or_discovered`

## Confidence labeling
- **high**: explicit Part 145 statement + direct service/platform details.
- **medium**: good service/location evidence with Part 145 inferred via related signals (or partial document access).
- **low**: weak or indirect evidence (none in current output).

## Normalization
- Unified city/state as Colorado entries.
- Kept candidate names as operating brand names used publicly.
- Preserved provenance with `source_refs` (S# IDs from SOURCE-LOG.md).
