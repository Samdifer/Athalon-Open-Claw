# Team Alpha User Journey - Line Ops and Release

## Scenario

AOG arrival at DEN with avionics discrepancy and same-day release pressure.

## Journey Timeline

1. Service writer opens `/squawks`, locates open discrepancy, and initiates disposition path.
2. Lead technician opens `/work-orders`, filters to assigned work, enters `/work-orders/[id]`.
3. Technician starts task steps, adds handoff note, and updates completion state.
4. Inspector uses `/compliance/qcm-review` to validate close-readiness blockers.
5. Team proceeds to `/work-orders/[id]/rts`, then to release page once blockers clear.

## What Worked

- Work-order structure supported a clear task execution narrative.
- RTS flow was visible and discoverable for inspector role.
- Compliance panel helped separate true blockers from informational items.

## Friction and User Reactions

| Step | Friction | User Narrative |
| --- | --- | --- |
| 1 | Squawk filtering felt noisy under urgency | "I need a fast lane for today-only AOG issues." |
| 3 | Shift handoff notes were hard to summarize at-a-glance | "I can add notes, but I still need a one-screen handoff digest." |
| 4 | Inspector wanted explicit dual-signoff visualization | "I need to instantly see tech signoff vs inspector signoff." |
| 5 | Release confidence depended on reading multiple panels | "I want one yes/no release readiness card with reason codes." |

## Anticipated Edge Failures

- Technician starts work during location mismatch and writes progress to wrong station context.
- Inspector assumes RTS complete when signature event exists but release prerequisites are incomplete.

## User Story Extracts

- As a lead technician, I want an AOG triage filter so I can prioritize true dispatch risk first.
- As an inspector, I want dual-signoff status separated by role so compliance checks are instantaneous.
- As a service writer, I want a shift-handoff digest so turnover does not lose critical context.
