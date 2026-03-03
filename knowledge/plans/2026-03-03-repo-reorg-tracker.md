# Repository Reorganization Tracker

Date: 2026-03-03

## Scope Status

Completed:
- Monorepo namespaces applied: `apps/`, `archive/`, `knowledge/`, `ops/`.
- Active apps moved to `apps/`:
  - `apps/athelon-app`
  - `apps/scheduler` (submodule path updated in `.gitmodules`)
  - `apps/marketing`
- Historical artifacts moved to `archive/` (`archive/phases`, `archive/backups`, `archive/artifacts`).
- Knowledge areas moved to `knowledge/` (`dispatches`, `reports`, `reviews`, `team`, plans).
- Operational scripts moved to `ops/scripts`.

Compatibility layer active:
- Legacy root paths retained as symlinks (`athelon-app`, `scheduler`, `marketing`, `scripts`, `phase-*`, `dispatches`, `reports`, `reviews`, `team`, `docs`, `artifacts`, `openclaw-backup`).
- `knowledge/plans/plans/` retained as a compatibility folder of symlinks pointing to canonical `knowledge/plans/*.md`.

Research cutover completed:
- `research/` content is now canonically located under `knowledge/research/`.
- `research/industry-context-field-artifacts/context-index/` is included at `knowledge/research/industry-context-field-artifacts/context-index/`.
- Root `research` now exists as a compatibility symlink to `knowledge/research`.

## Tooling and CI Status

Completed:
- Root workspace tooling enabled: PNPM + Turbo (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `pnpm-lock.yaml`).
- CI workflow updated to PNPM and canonical app path (`apps/athelon-app`) for internal routes gate.
- Vercel root config updated to PNPM workspace build and `apps/athelon-app/dist` output.
- Repo structure guardrail added:
  - `ops/scripts/ci/check-repo-structure.sh`
  - `.github/workflows/repo-structure-guard.yml`

## Athelon App Deep Slice Status

Completed:
- Bootstrap entry moved to `src/bootstrap/main.tsx` with temporary root compatibility entry.
- Router moved to `src/router` with composed domain route modules.
- Shared layer moved to `src/shared` with temporary compatibility symlinks (`components`, `hooks`, `lib`).
- E2E location normalized to `tests/e2e` with temporary compatibility symlink (`e2e`).
- Canonical docs moved into `docs/spec`, `docs/qa`, `docs/ops` with root doc symlink stubs retained.

Convex compatibility-safe re-slice completed:
- Domain scaffolding under `convex/domains/*`.
- Shared helpers in `convex/shared/*`.
- Root facade compatibility files retained for existing API/module paths.
- Seed/sim organization normalized under `convex/seeds/*` with root entrypoint facades retained.

## Validation Snapshot

Passed:
- `pnpm install`
- `pnpm turbo run typecheck build`
- `pnpm turbo run test`
- `bash ops/scripts/ci/check-repo-structure.sh`

## Deferred by Program Design

- Shim retirement and legacy-path cleanup are deferred to observation window (two release cycles), target retirement around June 12, 2026.
