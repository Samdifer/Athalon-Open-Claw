# Athelon Redesign Architecture Plan

This document defines how the redesign program should be executed across multiple
sessions and multiple agents without breaking the application or creating conflicting
design artifacts.

It is the control-plane document for the redesign effort. Read this before launching
parallel work.

## Objectives

The redesign program must improve user experience by role and by surface while
preserving:

- the existing backend contract in `convex/`
- the current route topology unless a route swap is explicitly approved
- the shell-level operational behavior users already depend on
- reversion capability for every redesigned surface

The redesign is therefore a constrained architecture exercise, not a freeform
front-end rewrite.

## Source of Truth Hierarchy

When sources disagree, use this precedence order:

1. Live router and page code
   - `apps/athelon-app/src/router/routeModules/protectedAppRoutes.tsx`
   - `apps/athelon-app/app/**`
2. Live access and shell code
   - `apps/athelon-app/src/shared/lib/mro-access.ts`
   - `apps/athelon-app/src/shared/lib/route-permissions.ts`
   - `apps/athelon-app/src/shared/components/AppSidebar.tsx`
   - `apps/athelon-app/app/(app)/layout.tsx`
3. Reverse-engineering architecture artifacts
   - `apps/athelon-app/docs/ops/APP-HIERARCHY-AND-INTERCONNECTIVITY-MAP.md`
   - `apps/athelon-app/docs/ops/APP-PAGE-INVENTORY.csv`
4. Redesign research corpus
   - `apps/athelon-app/docs/ops/design-corpus/round-1/*`
5. Redesign execution docs
   - `apps/athelon-app/docs/ops/design-corpus/REDESIGN-NEXT-STEPS.md`
   - `apps/athelon-app/docs/ops/design-corpus/WAVE-0-EXECUTION-MANIFEST.md`
6. Derived or older spec artifacts elsewhere in the repo

If a live route or guard disagrees with a research document, the live code wins and
the difference must be logged as a mismatch, not silently normalized away.

## System Boundaries That Must Be Preserved

These boundaries are architectural and should be treated as first-class seams in all
redesign planning:

1. Public auth boundary
   - Clerk sign-in and sign-up flows
2. Onboarding/bootstrap boundary
   - org bootstrap, profile linking, and app entry readiness
3. Internal operations shell
   - sidebar, top bar, command palette, keyboard shortcuts, offline status, PWA
4. Customer portal boundary
   - separate auth audience and route family under `/portal/*`
5. Redirect and legacy alias boundary
   - route aliases such as `/billing`, `/billing/quotes*`, `/squawks`

No wave may remove or redefine these boundaries implicitly.

## Dependency Spine

The redesign program should assume the following live dependency spine:

- `workOrders` is the primary operational hub
- `billing`, `billingV4`, and `billingV4b` are shared by billing, sales, CRM, and reports
- `technicians` and `timeClock` cross execution, personnel, billing, and dashboard
- `aircraft` crosses fleet, work orders, compliance, and CRM
- `stationConfig` and `shopLocations` quietly shape scheduling, readiness, and routing

Any redesign that simplifies a surface by hiding one of these seams must document the
seam explicitly in the surface registry.

## Execution Modes

The redesign program has three execution modes:

### Mode 1: Documentation and research

- Safe for parallel execution
- No app code changes
- Produces registries, alignment docs, shell contracts, and rollout plans

### Mode 2: Foundation code extraction

- Medium risk
- Introduces domain hooks, shared primitives, and access-model changes
- Requires file ownership and validation gates

### Mode 3: Surface replacement

- Highest risk
- Introduces `page-v2.tsx` or equivalent replacement components
- Requires role-specific acceptance gates and route-swap approval

Wave 0 is strictly Mode 1.

## Multi-Agent Operating Model

Use a coordinator-plus-specialists model.

### Coordinator responsibilities

- Own the execution manifest and status board
- Assign exact output files to each agent
- Prevent overlapping file ownership
- Reconcile contradictions across outputs
- Decide whether a finding is a mismatch, blocker, or approved assumption

### Specialist agent responsibilities

- Read the mandatory context bundle before editing anything
- Write only to assigned output files
- Treat shared code and docs outside assignment as read-only
- Log contradictions rather than resolving them in unrelated files
- Use exact file references and route names from live code

### Allowed parallelism

- Multiple agents may work in parallel only when each has a non-overlapping write set
- Shared synthesis files must have exactly one writer
- No two agents may edit the same output file or the same app code file in the same wave

## File Ownership and Write Locks

The table below is the default lock model for redesign work.

| Area | Writable by | Read-only dependencies | Forbidden during Wave 0 |
|---|---|---|---|
| `docs/ops/design-corpus/feature-registry/*` | Assigned registry agent only | router, shell, access, round-1 docs, page files | app code, `convex/` |
| `docs/ops/design-corpus/role-access/*` | Role/access agent only | access libs, sidebar, router, hierarchy map | app code changes |
| `docs/ops/design-corpus/shell/*` | Shell agent only | layout, sidebar, top bar, command palette, timer, hierarchy map | app code changes |
| `docs/ops/design-corpus/rollout/*` | Rollout agent only | package scripts, tests, route manifests | app code changes |
| `src/shared/hooks/domain/*` | One hook agent per file | page files, Convex signatures | parallel edits to same page |
| `src/shared/components/*` | One component agent per file | existing shared/UI primitives | edits in `src/shared/components/ui/*` |
| `src/shared/lib/mro-access.ts` | Access agent only after docs approved | role-access docs | unplanned edits by page agents |
| `src/shared/lib/route-permissions.ts` | Access agent only after docs approved | role-access docs | unplanned edits by page agents |
| `src/shared/components/AppSidebar.tsx` | Access or shell agent only after docs approved | role-access and shell docs | unplanned edits by surface agents |
| `convex/*` | nobody in redesign waves by default | all docs may read | all redesign work |

If a change needs a file outside the assigned write set, the agent must stop and log a
blocker instead of improvising a broader edit.

## Mandatory Context Bundle for All Agents

Every redesign agent must read these before starting:

1. `apps/athelon-app/docs/ops/design-corpus/REDESIGN-ARCHITECTURE-PLAN.md`
2. `apps/athelon-app/docs/ops/design-corpus/REDESIGN-NEXT-STEPS.md`
3. `apps/athelon-app/docs/ops/APP-HIERARCHY-AND-INTERCONNECTIVITY-MAP.md`
4. `apps/athelon-app/docs/ops/APP-PAGE-INVENTORY.csv`
5. `apps/athelon-app/src/router/routeModules/protectedAppRoutes.tsx`
6. `apps/athelon-app/src/shared/lib/mro-access.ts`
7. `apps/athelon-app/src/shared/lib/route-permissions.ts`
8. `apps/athelon-app/src/shared/components/AppSidebar.tsx`
9. `apps/athelon-app/docs/ops/design-corpus/role-access/WAVE-0-ROLE-ACCESS-DECISIONS.md`

Then each agent reads its domain-specific anchors only.

## Deliverable Contracts

Every output document must satisfy these rules:

1. Use exact route paths from live router code.
2. Reference exact page files or shared files, not inferred names.
3. Separate observed current state from proposed redesign state.
4. Mark contradictions as contradictions.
5. Mark inferences as inferences.
6. Do not rewrite history by editing round-1 research.
7. Keep implementation advice inside the boundaries of the assigned workstream.

## Contradiction Handling

There are four allowed contradiction labels:

- `live-vs-research`
- `router-vs-sidebar`
- `permission-vs-intended-role`
- `page-vs-shared-pattern`

Agents should not resolve contradictions in Wave 0. They should log them in the
assigned output and, when relevant, in the Wave 0 status board.

## Safety Rules

These are non-negotiable unless the user explicitly changes scope.

1. Do not modify `convex/`.
2. Do not modify `src/shared/components/ui/*`.
3. Do not modify existing round-1 outputs.
4. Do not delete current page files.
5. Do not change live routes during Wave 0.
6. Do not install dependencies during Wave 0.
7. Do not “fix” mismatches in access, shell, or page code while producing registry docs.

## Validation Model

### Wave 0 validation

- Document coverage matches the assigned route families
- All claims are traceable to live code or named research docs
- No Wave 0 output requires app code changes to be considered complete

### Foundation code validation

- `pnpm --dir apps/athelon-app typecheck`
- targeted helper tests when touching scheduling or script-backed behavior
- targeted Playwright coverage for the touched surfaces

### Surface replacement validation

- route-specific Playwright coverage
- `smoke-all-routes.spec.ts`
- role-specific acceptance checks
- rollback path documented before route swap

## Wave Dependencies

The redesign program should move in this order:

1. Architecture plan and execution manifest
2. Wave 0 research outputs
3. Role/access and shell synthesis review
4. Foundation code extraction
5. Shared primitive promotion
6. First surface replacement
7. Subsequent surface replacements in dependency order

Surface replacements must never begin before the relevant registry, shell contract,
and role/access decisions exist.

## Completion Gate for Wave 0

Wave 0 is complete only when:

1. all assigned registry docs exist
2. role/access docs exist
3. shell docs exist
4. the status board records blockers and unresolved contradictions
5. the outputs give enough context for later agents to change code without re-running
   the reverse-engineering effort from scratch

## Coordinator Checklist

Before dispatch:

1. confirm the mandatory context bundle
2. assign one writer per output file
3. publish the Wave 0 manifest
4. publish the Wave 0 status board

During execution:

1. reject overlapping write ownership
2. merge repeated findings into the status board
3. escalate unresolved contradictions instead of hiding them

After execution:

1. review outputs for cross-file consistency
2. decide which contradictions become explicit follow-up work
3. approve or refine Wave 1 foundation code scope
