# AGENTS.md

## Scope

This file applies to all work inside `apps/athelon-app/`.

## Convex Backend Instructions

- Before editing anything in `convex/`, read `convex/CONVEX_RULES.md`.
- Treat `convex/CONVEX_RULES.md` as the canonical backend ruleset.
- Always use Convex function argument validators (`args`) for all function types.
- Keep schema definitions in `convex/schema.ts`.
- Do not edit `convex/_generated/` manually.

## Validation Commands

Run from `apps/athelon-app/` after backend changes:

```bash
npx convex codegen
npx convex dev
```

## Canonical Feature Spec Rules

- `docs/spec/MASTER-BUILD-LIST.md` is the canonical, write-authoritative feature specification document.
- `docs/plans/MASTER-FEATURE-REGISTRY.csv`, `docs/plans/MASTER-FEATURE-CROSSWALK.md`, and `docs/plans/MASTER-BUILD-PLAN.md` are derived/reference artifacts.
- Regenerate derived artifacts with:

```bash
pnpm run spec:export:derived
```

## Bug Hunter Spec Sync Permissions

- Bug Hunter may update spec artifacts only after validation passes (`typecheck` + `build` + cycle E2E checks).
- Bug Hunter must use:

```bash
pnpm run spec:sync:bug-hunter -- --report <json-report>
```

- Bug Hunter may mutate only:
  - `docs/spec/MASTER-BUILD-LIST.md` Registry A (`## Registry A — Master Features ...`) row upserts
  - `docs/feature-spec-appendices/bug-hunter-categorization-ledger.md`
  - `docs/feature-spec-appendices/detected-features-log.md`
  - `docs/feature-spec-appendices/qa-artifact-reconciliation-log.md`
  - `docs/feature-spec-appendices/bug-hunter-run-log.md`
- Bug Hunter must not delete/rewrite historical rows; updates are append-only except Registry A row upserts by `fs_id`/feature number.
- Use absolute dates (`YYYY-MM-DD` or ISO-8601 UTC) in all sync payloads.
