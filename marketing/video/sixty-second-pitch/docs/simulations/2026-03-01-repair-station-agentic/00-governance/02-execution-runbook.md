# Execution Runbook

## Environment

Application context used by this simulation:

- App root: `../../../athelon-app`
- Seed scenario: `ATHELON-DEMO-KA-TBM-2LOC`
- Locations: `DEN`, `COS`

## Prep Commands

```bash
cd ../../../athelon-app
npm install
npm run seed:repair-station
npm run seed:audit:repair-station
npm run dev
```

Optional validation:

```bash
npm run test:e2e:wave:scheduler-stories
npm run test:e2e:wave:artifacts
```

## Team Execution Cadence

- Wave 1: Team Alpha + Bravo (operations and scheduling)
- Wave 2: Team Charlie + Delta (parts/compliance and commercial)
- Wave 3: Team Echo (leadership and cross-location control)

Each wave follows this pattern:

1. Run journey script.
2. Log user narrative and friction.
3. Complete developer observation file.
4. Submit artifacts to orchestrator.

## Handoff Contract

Team to orchestrator handoff must include:

- Journey file path
- Observation file path
- Top 5 issues
- Top 3 strengths
- 2 anticipated failure modes not yet observed

## Save Policy

All artifacts are Markdown and must remain in this simulation directory for later troubleshooting and context engineering.
