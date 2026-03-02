# Team Charlie Developer Observations

## Scope

Parts receiving, inventory readiness, tooling safety, rotable control, and compliance analytics.

## Findings

| ID | Observation | Likely Root Cause | Risk | Recommendation | Class |
| --- | --- | --- | --- | --- | --- |
| CHARLIE-01 | Cert-heavy receiving is accurate but slow during volume spikes. | High manual data entry burden and low reuse of repeated fields. | Throughput bottleneck and keyboard-entry errors. | Add scan/import assist and smart defaults by vendor/template. | missing-feature |
| CHARLIE-02 | Pending inspection queue is status-based, not risk-prioritized. | No urgency scoring model for receiving exceptions. | High-risk parts can wait behind low-risk work. | Add risk score and SLA-based queue ordering. | missing-feature |
| CHARLIE-03 | Tool readiness is not summarized in a dispatch-safe badge. | Tool state is visible but not translated to operational decision cues. | Ineligible tooling may be assigned under time pressure. | Add dispatch-safe indicator with calibration and location checks. | fix-now |
| CHARLIE-04 | Condemnation safeguards are improved but post-action traceability can be deeper. | Confirmation covers action intent, not downstream chain-of-custody view. | Audit gaps on expensive serialized components. | Add condemn event timeline and required disposition reason taxonomy. | fix-now |
| CHARLIE-05 | Compliance review requires multiple context switches for fleet + aircraft truth. | Fleet and detail views are separated without unified cockpit layer. | Longer review cycle and missed latent non-compliance. | Build consolidated compliance cockpit with drill-through. | missing-feature |

## Anticipated Failure Modes

- LLP/shelf-life edge cases pass intake but fail at install due to delayed validation.
- Compliance status may be misread when filter state persists across aircraft switches.
