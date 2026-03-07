# ISSUES

## 1) Denver Hot Air Repair (GL6R565N)
- Problem: Name search is noisy; results mostly unrelated HVAC entities.
- Evidence quality: FAA identity/cert present, but poor direct web discoverability for current operations.
- Impact: `shop_size_class` and `aircraft_worked_on` left unknown; observability downgraded to 0.12.
- Manual follow-up: FAA Air Agency public query or direct phone validation recommended.

## 2) Front Range Transponder Service (F42R979Y)
- Problem: Primary direct evidence is legacy FAA145 profile + old blog.
- Evidence quality: Sufficient for niche transponder scope, weak for broader modern activity.
- Impact: kept as specialty/small with moderate confidence only.
- Manual follow-up: verify active operation status via direct call or updated FAA listing metadata.

## 3) Potential legal-name drift
- Several brands market under DBA names (West Star/Premier; Gogo entities; Elevate branding).
- Impact: No cert mismatch found, but CRM should preserve cert-centric keying to avoid duplicate entities.
