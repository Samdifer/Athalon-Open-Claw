# Round 1 Manifest — MRO-Focused Design Atlas

**Date:** 2026-03-08  
**Scope:** `apps/athelon-app` only  
**Round type:** Foundational research corpus  
**Mode:** Text-only, benchmark-inclusive, role-aware

## Goal

Build the first durable design-research round for Athelon so later redesign work
can choose among distinct high-fit directions instead of converging on generic
enterprise UI.

This round explicitly studies:

- major visual and interaction style families
- major app design philosophies
- major official design systems
- workflow patterns for dense operational software
- MRO and adjacent product benchmarks

## Source Policy

Round 1 uses an official-sources-first policy:

1. Official design-system documentation for Apple, Material, Fluent, Carbon,
   Atlassian, Polaris, and SAP Fiori.
2. Official product pages for benchmark products where available.
3. Internal repo sources for Athelon’s current role model, navigation surface,
   workflow expectations, and style guide.
4. Existing internal research only as context, not as the sole source of truth.

All factual claims in saved outputs are cited. Synthesis is labeled as
inference when it goes beyond direct source language.

## Current Repo Context Used

- Current style guide:
  [`STYLE-GUIDE.md`](../../STYLE-GUIDE.md)
- Role catalog and permissions:
  [`mro-access.ts`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/apps/athelon-app/src/shared/lib/mro-access.ts)
- Main app navigation surface:
  [`AppSidebar.tsx`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/apps/athelon-app/src/shared/components/AppSidebar.tsx)
- Pilot workflow narrative:
  [`ALPHA-LAUNCH-BRIEF.md`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/knowledge/reviews/ALPHA-LAUNCH-BRIEF.md)
- Existing repo research pattern:
  [`knowledge/research/README.md`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/knowledge/research/README.md)

## Fixed Round Rubric

Every style, philosophy, system, or pattern in round 1 is judged against the
same rubric:

1. trust and regulatory clarity
2. information density handling
3. task speed for repeat operational work
4. error prevention and signoff safety
5. accessibility and dark-hangar usability
6. responsiveness across desktop, tablet, and phone
7. implementation fit with the current React/Radix/Tailwind stack
8. differentiation potential for Athelon

## Agent Roster

| Agent | Focus | Saved output |
|---|---|---|
| `design-style-taxonomist` | Distinct style families | [`design-style-taxonomist/OUTPUT.md`](./design-style-taxonomist/OUTPUT.md) |
| `design-philosophy-analyst` | Product and interaction philosophies | [`design-philosophy-analyst/OUTPUT.md`](./design-philosophy-analyst/OUTPUT.md) |
| `enterprise-design-system-benchmarker` | Official system benchmark | [`enterprise-design-system-benchmarker/OUTPUT.md`](./enterprise-design-system-benchmarker/OUTPUT.md) |
| `operational-workflow-pattern-analyst` | Dense-workflow interaction patterns | [`operational-workflow-pattern-analyst/OUTPUT.md`](./operational-workflow-pattern-analyst/OUTPUT.md) |
| `competitor-and-adjacent-benchmark-analyst` | Real product benchmark patterns | [`competitor-and-adjacent-benchmark-analyst/OUTPUT.md`](./competitor-and-adjacent-benchmark-analyst/OUTPUT.md) |
| `athelon-role-fit-analyst` | Role and surface fit scoring | [`athelon-role-fit-analyst/OUTPUT.md`](./athelon-role-fit-analyst/OUTPUT.md) |

Each agent folder also includes `SOURCE-LOG.md`.

## Synthesis Order

Round 1 synthesis follows the saved Opus workflow in
[`OPUS-ROUND-WORKFLOW.md`](../OPUS-ROUND-WORKFLOW.md):

1. baseline audit of the current style guide
2. consolidation of the five independent research lanes
3. role and surface fit scoring
4. master narrative and later-round shortlist

## Output Inventory

- [`CURRENT-STYLE-GUIDE-ASSESSMENT.md`](./CURRENT-STYLE-GUIDE-ASSESSMENT.md)
- [`ROLE-AND-WORKFLOW-FIT-MATRIX.md`](./ROLE-AND-WORKFLOW-FIT-MATRIX.md)
- [`MASTER-SYNTHESIS.md`](./MASTER-SYNTHESIS.md)
- [`IMPLEMENTATION-TOOLING-INVENTORY.md`](./IMPLEMENTATION-TOOLING-INVENTORY.md)
- [`SURFACE-PATTERN-AUDIT.md`](./SURFACE-PATTERN-AUDIT.md)
- [`ARCHITECTURE-COUPLING-ANALYSIS.md`](./ARCHITECTURE-COUPLING-ANALYSIS.md)
- six per-agent output folders

### Implementation context documents

`IMPLEMENTATION-TOOLING-INVENTORY.md`, `SURFACE-PATTERN-AUDIT.md`, and
`ARCHITECTURE-COUPLING-ANALYSIS.md` bridge the abstract design research to the
concrete codebase. They document what UI primitives, patterns, and design tokens
already exist, how tightly coupled the UI is to the backend, where each round-1
recommendation maps to live app surfaces, and which gaps need to be closed before
later rounds.

## Important Boundaries

- This round does not redesign components.
- This round does not rewrite the style guide.
- This round does not assume one aesthetic should cover every role equally.
- This round does not treat portal/commercial surfaces as equal to internal
  execution surfaces.
