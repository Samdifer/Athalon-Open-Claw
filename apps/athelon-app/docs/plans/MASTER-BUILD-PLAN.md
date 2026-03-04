# MASTER BUILD PLAN (Derived Reference)

This file is a derived planning reference generated from the canonical feature spec at `docs/spec/MASTER-BUILD-LIST.md`.

Canonical source of truth: `apps/athelon-app/docs/spec/MASTER-BUILD-LIST.md`

## Canonical Ownership

1. Do not directly author feature status in this file.
2. Update canonical feature records in `docs/spec/MASTER-BUILD-LIST.md` (Registry A/Registry B/Registry C/Registry D) or through Bug Hunter sync.
3. Regenerate derived artifacts with `pnpm run spec:export:derived`.

## Derived Snapshot

- Total atomic features: **153**
- Total master features (Registry A): **69**
- Status counts: implemented=22, partial=53, missing=7, proposed=71
- Total route entries (Registry C): **101**
- Total route categories (Registry D): **17**
- Route source-status counts: routed=96, router_only=3, orphan_page=2

## Source Coverage

| Source Pack | Atomic Count |
|---|---:|
| FR | 25 |
| MASTER | 20 |
| REPORT | 29 |
| SCHED | 6 |
| TECH_MVP | 7 |
| WATERFALL | 66 |

## Wave Distribution

| Wave | Atomic Count |
|---|---:|
| Wave0 | 12 |
| Wave1 | 36 |
| Wave2 | 19 |
| Wave3 | 33 |
| Wave4 | 34 |
| Wave5 | 17 |
| Wave6 | 2 |

## Dependency and Group Reference

Use `docs/plans/MASTER-FEATURE-CROSSWALK.md` for canonical group rollups and MBP-to-group mapping.
Use `docs/plans/MASTER-ROUTE-CATEGORY-ROLLUP.md` for route-category coverage rollups.

## Update Workflow

1. Update canonical registries in `docs/spec/MASTER-BUILD-LIST.md` (or run Bug Hunter sync).
2. Run `pnpm run spec:export:derived`.
3. Review diffs in:
   - `docs/plans/MASTER-FEATURE-REGISTRY.csv`
   - `docs/plans/MASTER-FEATURE-CROSSWALK.md`
   - `docs/plans/MASTER-BUILD-PLAN.md` (this file)
   - `docs/plans/MASTER-ROUTE-CAPABILITY-REGISTRY.csv`
   - `docs/plans/MASTER-ROUTE-CATEGORY-ROLLUP.md`

