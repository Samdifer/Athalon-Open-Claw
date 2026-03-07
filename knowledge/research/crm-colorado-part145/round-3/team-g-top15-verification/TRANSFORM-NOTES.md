# TRANSFORM-NOTES

## Scope
Validated the **top 15 outreach prospects** from Round-2 presentation shortlist using direct-source checks (FAA dataset + official/company/industry pages).

## Field-level transformation decisions
- **legal_name / certificate_hints**: retained FAA-backed values unless source conflict found (none found).
- **shop_size_class**:
  - Upgraded from `unknown` where direct staffing/facility scale cues existed (e.g., Beegles staff count, dedicated facilities).
  - Downgraded/kept `unknown` where no provable direct scale cues (Denver Hot Air Repair).
- **aircraft_worked_on**:
  - Replaced heuristic tags with service-specific tags when explicit on official pages.
  - Kept `unknown` when not provable with direct evidence.
- **airport_distance_band**:
  - Retained Round-2 geo output when direct address-to-airport relationship remained consistent with discovered sources.
- **observability_score**:
  - Re-scored from heuristic/default values using direct digital footprint strength:
    - 0.85+ = strong official + multi-signal enterprise presence.
    - 0.65–0.84 = clear official footprint and service detail.
    - 0.40–0.64 = thin/legacy but valid direct signals.
    - <0.20 = cert-only or effectively non-discoverable web presence.

## Explicit confidence moves
- **Upgrades (major)**: ZL6R006Y, VW6R328Y, BX4R092M, PN5R125N, GM6R566N, 6DNR881C, ZYJR157B.
- **Kept high**: PAZ3068H, WTXR173J, OMKR399L, K4LR032E.
- **Downgrade (major)**: GL6R565N (no reliable current web presence located; FAA-only confidence for operations scope).
- **Partial downgrade / caution**: F42R979Y (legacy signals and aggregator traces; limited modern observability).

## Ambiguity handling
- Did not infer unsupported fleet or OEM authorizations.
- Did not force size/archetype where only weak third-party mentions existed.
