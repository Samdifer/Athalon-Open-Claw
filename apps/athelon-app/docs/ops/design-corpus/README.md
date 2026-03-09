# Athelon Design Corpus

This folder is the app-local research corpus for redesigning `apps/athelon-app`
without collapsing into generic SaaS design. It sits beside the current
[`STYLE-GUIDE.md`](../STYLE-GUIDE.md) and is meant to accumulate distinct design
options over multiple rounds.

## Purpose

The corpus has two jobs:

1. Preserve reusable design research in a round-based structure.
2. Pair that research with shared Claude Code subagents so future rounds can be
   rerun or extended instead of restarted from zero.

Round 1 is:

- MRO-focused
- text-only
- benchmark-inclusive
- role-aware
- explicitly non-averaging

## Structure

- `README.md`
  This file. Corpus purpose, structure, and workflow.
- `OPUS-ROUND-WORKFLOW.md`
  The reproducible lead-session workflow for running a research round.
- `round-1/`
  First saved corpus round, including per-agent outputs and the master synthesis.

Each round should follow the same shape:

- `ROUND-MANIFEST.md`
- `CURRENT-STYLE-GUIDE-ASSESSMENT.md`
- `ROLE-AND-WORKFLOW-FIT-MATRIX.md`
- `MASTER-SYNTHESIS.md`
- one folder per research agent, each with `OUTPUT.md` and `SOURCE-LOG.md`

Rounds may also include implementation context documents that bridge abstract research
to the live codebase:

- `IMPLEMENTATION-TOOLING-INVENTORY.md` — UI primitives, dependencies, design tokens,
  and buildability assessment
- `SURFACE-PATTERN-AUDIT.md` — per-surface pattern usage, consistency map, and gap
  analysis against the round's recommendations

## Claude Setup

Project subagents live in [`/.claude/agents`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/.claude/agents). Project settings pin subagents to Sonnet via [`/.claude/settings.json`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/.claude/settings.json).

This corpus expects:

- main synthesis session run with `opus` or `opusplan`
- research subagents run on Sonnet
- outputs written into the matching round folder

## Working Rules

- Keep distinct design directions distinct until the synthesis step.
- Use official sources first for design systems and product docs.
- Mark inference as inference.
- Keep role fit explicit; do not design for a fictional average user.
- Add rounds rather than rewriting history.

## Related Context

- Current style guide:
  [`STYLE-GUIDE.md`](../STYLE-GUIDE.md)
- Existing app role model:
  [`mro-access.ts`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/apps/athelon-app/src/shared/lib/mro-access.ts)
- Current main app navigation surface:
  [`AppSidebar.tsx`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/apps/athelon-app/src/shared/components/AppSidebar.tsx)
- Existing broader repo research pattern:
  [`knowledge/research/README.md`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/knowledge/research/README.md)
