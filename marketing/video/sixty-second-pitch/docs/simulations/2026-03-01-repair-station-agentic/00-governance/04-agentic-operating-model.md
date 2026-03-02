# Agentic Operating Model

## Team Cell Design

Each team runs as a three-agent cell:

- `A1 User Simulator`: follows role constraints and tries to finish mission outcomes.
- `A2 Dev Analyst`: documents defect candidates, UX debt, data integrity risk.
- `A3 Scribe`: writes strict evidence logs with steps and route references.

## Orchestrator Loop

1. Ingest all team outputs.
2. Normalize issue statements into canonical defect clusters.
3. Merge duplicates across modules.
4. Split into:
   - `Obvious fix now`
   - `Missing capability`
5. Publish backlog with priority, rationale, and suggested owner.

## Scoring

Each issue gets a 1-5 score for:

- Operational impact
- Safety/compliance risk
- Frequency likelihood
- Revenue/throughput impact
- User confidence erosion

Priority heuristic:

- P0: Total >= 20 or compliance/safety blocker
- P1: Total 16-19
- P2: Total 11-15
- P3: Total <= 10

## Artifact Naming

- Journey: `02-user-journeys/<team>-journey.md`
- Observation: `03-observations/<team>-developer-observations.md`
- Synthesis: `04-orchestrator/01-cross-team-synthesis.md`
- Backlog: `05-backlog/01-feature-bug-list.md`
