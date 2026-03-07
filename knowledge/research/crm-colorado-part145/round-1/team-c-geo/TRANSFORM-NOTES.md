# TRANSFORM-NOTES

## Logic
- Filtered to `CO` + `UNITED STATES`.
- Nearest airport estimated by city-level mapping (not rooftop geocode).
- Distance bands:
  - `on-airport`: address/name has airport-campus tokens (AIRPORT/AIRWAY/CONTROL TOWER/HANGAR/etc).
  - `near-airport`: mapped airport exists but no direct on-field token.
  - `metro-remote`: no airport mapping match.
- Geo confidence:
  - `high`: on-airport with known airport code linkage.
  - `medium`: mapped city-airport without direct on-field indicator.
  - `low`: unresolved city-airport mapping.

## Caveats
- This pass is intentionally lightweight; distances are banded, not numeric NM.
- Some rows have blank agency names in source data; retained with cert numbers.
