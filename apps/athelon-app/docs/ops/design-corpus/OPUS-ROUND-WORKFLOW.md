# Opus Round Workflow

This document is the reproducible lead-session workflow for running a design
research round for `apps/athelon-app`.

## Baseline Setup

Project subagents are stored in [`/.claude/agents`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/.claude/agents), which Anthropic documents as the project-level location for shared subagents. Anthropic also documents `CLAUDE_CODE_SUBAGENT_MODEL` as the control for subagent model selection, and this repo pins subagents to Sonnet in [`/.claude/settings.json`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/.claude/settings.json). Sources: [Subagents docs](https://docs.anthropic.com/en/docs/claude-code/sub-agents), [Model configuration docs](https://code.claude.com/docs/en/model-config).

## Primary Execution Mode

Use a normal Claude Code lead session, not custom automation:

```bash
claude --model opus
```

`opusplan` is also valid if you want Opus in planning and Sonnet for the rest of
the session, but the default recommendation for research synthesis is a lead
session on `opus`. Anthropic documents both `opus` and `opusplan` model
behavior in the current Claude Code model configuration guide:
[Model configuration](https://code.claude.com/docs/en/model-config).

## Expected Inputs From Repo Context

Load these first:

1. [`STYLE-GUIDE.md`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/apps/athelon-app/docs/ops/STYLE-GUIDE.md)
2. [`mro-access.ts`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/apps/athelon-app/src/shared/lib/mro-access.ts)
3. [`AppSidebar.tsx`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/apps/athelon-app/src/shared/components/AppSidebar.tsx)
4. [`ALPHA-LAUNCH-BRIEF.md`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/knowledge/reviews/ALPHA-LAUNCH-BRIEF.md)
5. [`knowledge/research/README.md`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/knowledge/research/README.md)

## Dispatch Order

### Phase 1: Baseline

1. Read the current style guide.
2. Read the live role and navigation model.
3. Confirm the round folder and required outputs.

### Phase 2: Independent Research Lanes

These lanes are parallelizable because they do not depend on each other’s
conclusions:

1. `design-style-taxonomist`
2. `design-philosophy-analyst`
3. `enterprise-design-system-benchmarker`
4. `operational-workflow-pattern-analyst`
5. `competitor-and-adjacent-benchmark-analyst`

### Phase 3: Role Mapping

Run `athelon-role-fit-analyst` after the baseline and independent research lanes
are available, because it translates those findings into Athelon-specific fit.

### Phase 4: Opus Synthesis

The lead session produces, in order:

1. `ROUND-MANIFEST.md`
2. `CURRENT-STYLE-GUIDE-ASSESSMENT.md`
3. `ROLE-AND-WORKFLOW-FIT-MATRIX.md`
4. `MASTER-SYNTHESIS.md`

## Expected Outputs From Each Sonnet Agent

- `design-style-taxonomist`
  Distinct style families, strengths, failure modes, and candidate surface
  matches.
- `design-philosophy-analyst`
  Interaction philosophies and how they change workflow behavior.
- `enterprise-design-system-benchmarker`
  Official design-system benchmark matrix and borrow/reject guidance.
- `operational-workflow-pattern-analyst`
  Dense-workflow patterns for execution, scheduling, tables, and approvals.
- `competitor-and-adjacent-benchmark-analyst`
  Real product patterns from MRO and adjacent operations software.
- `athelon-role-fit-analyst`
  Role and surface scoring against the fixed round rubric.

## Synthesis Sequence

Use this exact order:

1. Baseline audit
   Compare the current Athelon style guide to the research directions.
2. Research lane consolidation
   Merge the style, philosophy, system, workflow, and benchmark findings without
   forcing agreement.
3. Fit scoring
   Score candidate directions against roles and major app surfaces.
4. Master narrative
   Write the overall design arc, shortlist later-round directions, and preserve
   unresolved tensions.

## Conflict Rule

When sources disagree:

- preserve the disagreement
- label confidence
- identify whether the disagreement is factual, contextual, or philosophical
- do not flatten it into a fake consensus

## Suggested Lead Prompt

```text
We are running Athelon design corpus round 1.

Use the project subagents already defined in .claude/agents.
Treat this as MRO-focused, text-only, benchmark-inclusive research.
Do not average distinct styles together.

First load:
- apps/athelon-app/docs/ops/STYLE-GUIDE.md
- apps/athelon-app/src/shared/lib/mro-access.ts
- apps/athelon-app/src/shared/components/AppSidebar.tsx
- knowledge/reviews/ALPHA-LAUNCH-BRIEF.md
- knowledge/research/README.md

Then dispatch the independent research lanes:
- design-style-taxonomist
- design-philosophy-analyst
- enterprise-design-system-benchmarker
- operational-workflow-pattern-analyst
- competitor-and-adjacent-benchmark-analyst

After those finish, run athelon-role-fit-analyst.

Finally synthesize:
- apps/athelon-app/docs/ops/design-corpus/round-1/ROUND-MANIFEST.md
- apps/athelon-app/docs/ops/design-corpus/round-1/CURRENT-STYLE-GUIDE-ASSESSMENT.md
- apps/athelon-app/docs/ops/design-corpus/round-1/ROLE-AND-WORKFLOW-FIT-MATRIX.md
- apps/athelon-app/docs/ops/design-corpus/round-1/MASTER-SYNTHESIS.md
```

## Optional Advanced Mode

If you want live parallel sessions instead of lead-invoked subagents, Claude
Code documents an experimental agent-team mode that supports an Opus lead and
explicit Sonnet teammates. This is optional for this corpus and should be used
only if you intentionally enable it. Source:
[Agent teams](https://code.claude.com/docs/en/agent-teams).
