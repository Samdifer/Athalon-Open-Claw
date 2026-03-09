# Athelon Redesign Program Gap Analysis

This document records the main gaps found in the original redesign handoff and the
program changes made in response.

## Summary

The original handoff was directionally correct but incomplete as a redesign program.
It described good foundation work, but it did not yet cover the full role model, the
full surface map, the shared shell contract, or the rollout controls needed for a
safe multi-surface redesign.

The revised handoff keeps the incremental route-swap strategy and expands the plan in
five areas:

1. broader surface coverage
2. role/access alignment
3. shell and cross-surface contract definition
4. missing UX primitives
5. validation and rollout governance

## Findings

### 1. Surface coverage gap

The original plan covered 10 surfaces, but the current app inventory includes more
distinct route families that materially affect user experience:

- My Work
- Lead Workspace / Handoff
- Findings
- Sales
- Training
- Reports

Without documenting these surfaces, the redesign would optimize the biggest pages but
still miss important technician, lead, commercial, and oversight journeys.

### 2. Role/access gap

The round-1 research argues for role-specific interior modes, but the current access
model still contains mismatches:

- `/sales` and `/crm` are tied to billing permissions in `mro-access.ts`
- `route-permissions.ts` does not presently grant `sales_rep` or `sales_manager`
  direct access to `/sales/*` or `/crm/*`
- role nav exposure does not yet reflect a first-class commercial mode

That means a visually correct sales or CRM redesign could still be operationally
wrong if the access model remains unchanged.

### 3. Technical contract gap

The original domain-hook plan addressed the worst hotspots, but not enough of the app
to support a full role-aware redesign:

- page-level direct Convex usage remains heavy across work-orders, billing, parts,
  personnel, scheduling, training, fleet, settings, and CRM
- shared shell components still own their own data wiring in many places

This is why the revised plan adds both more surface hooks and a dedicated shell
contract workstream.

### 4. UX primitive gap

The pattern audit already called out missing primitives that were not fully captured
in the original implementation plan:

- dense data tables
- pagination
- URL-backed filter state
- reusable detail sheets
- preview-before-confirm review flows

If these primitives are not built, later redesigned surfaces will continue inventing
one-off solutions.

### 5. Rollout and validation gap

The original plan relied mainly on type safety plus ad hoc next steps. That is not
enough for an operational system with role-sensitive flows and high-consequence
actions.

The revised plan adds:

- per-role acceptance criteria
- explicit validation command packs
- route-swap checklists
- rollback rules

## Program Adjustments

The revised handoff changes the program in these ways:

### A. Expanded feature registry scope

Feature registries now cover 16 major surface families instead of only the first 10,
and each registry must include roles, access rules, shell dependencies, state model,
and surface acceptance criteria.

### B. New role/access alignment workstream

The revised plan makes role/access alignment a first-class prerequisite instead of an
implicit concern left for later.

### C. New shell contract workstream

The revised plan treats the shell as part of the product, not a neutral wrapper.

### D. Expanded UX primitives workstream

The revised plan adds DataTable, pagination, URL filter state, detail-sheet drill-in,
and review-confirm patterns alongside the previously identified shared components.

### E. New rollout governance workstream

The revised plan adds acceptance, validation, route-swap, and rollback documents so
the redesign can move surface by surface without losing operational trust.

## Practical Implication

The redesign should still start with Work Orders, but only after the following are in
place:

1. the execution-surface registries
2. the role/access alignment docs
3. the shell contract docs
4. the first wave of domain hooks
5. the first wave of shared primitives
6. the validation and acceptance model

That sequence is slower than immediately rewriting a page, but it materially reduces
the chance of producing a visually improved surface that is still misaligned with the
actual roles, shell behavior, and technical seams of the app.
