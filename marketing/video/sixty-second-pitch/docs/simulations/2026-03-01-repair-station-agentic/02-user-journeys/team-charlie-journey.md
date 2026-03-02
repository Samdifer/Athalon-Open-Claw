# Team Charlie User Journey - Parts, Tools, and Compliance

## Scenario

Midday receiving surge with mixed cert quality, urgent rotable demand, and upcoming AD due dates.

## Journey Timeline

1. Parts clerk receives inventory via `/parts/new` with cert and traceability fields.
2. Clerk moves through `/parts/requests` to inspect pending items and resolve exceptions.
3. Tool crib coordinator opens `/parts/tools` to validate calibration-due assets before assignment.
4. Rotable manager visits `/parts/rotables` and runs condemn/retain decisions under alert safeguards.
5. Compliance analyst uses `/compliance/audit-trail` and `/compliance/ad-sb` to drill fleet risk.

## What Worked

- Receiving workflow captured key cert metadata for auditability.
- Condemn confirmation guard reduced accidental destructive actions.
- Fleet drill-in path made aircraft-level compliance review understandable.

## Friction and User Reactions

| Step | Friction | User Narrative |
| --- | --- | --- |
| 1 | Cert entry felt high-friction during batch receiving | "I need scan/import for repetitive cert fields." |
| 2 | Pending inspection queues lacked urgency ranking | "I need risk-based queue order, not just status." |
| 3 | Tool status lacked quick assignment suitability flag | "Tell me immediately if this tool is dispatch-safe." |
| 5 | AD/SB review required toggling multiple views | "Give me one consolidated compliance cockpit." |

## Anticipated Edge Failures

- Shelf-life or LLP edge conditions pass intake but fail later at install time.
- AD non-compliance remains hidden when fleet filters and selected aircraft state diverge.

## User Story Extracts

- As a parts clerk, I want fast cert data capture so throughput stays high without traceability loss.
- As a tool coordinator, I want an airworthiness-ready status indicator so assignment errors drop.
- As a compliance analyst, I want a unified compliance cockpit so review cycles shorten.
