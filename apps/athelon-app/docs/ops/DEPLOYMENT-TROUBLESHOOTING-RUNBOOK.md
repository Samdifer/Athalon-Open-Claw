# Deployment Troubleshooting Runbook (Vercel + pnpm)

## Canonical deployment path

Monorepo root deploy is the source of truth:

- Config: `/vercel.json` (repo root)
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm --filter athelon-app run build`
- Output: `apps/athelon-app/dist`

Local simulation of Vercel build path (from repo root):

```bash
pnpm run vercel:build:ci
```

## Fast validation before shipping

From `apps/athelon-app`:

```bash
npx tsc --noEmit
NODE_OPTIONS=--max-old-space-size=4096 npx vite build
```

## If Vercel build fails

1. **Wrong project root selected in Vercel UI**
   - Ensure the Vercel project points to repo root (where `vercel.json` lives).

2. **Lockfile / package manager mismatch**
   - Ensure pnpm is used and `pnpm-lock.yaml` is committed.
   - Avoid npm/yarn install commands in project settings.

3. **Out-of-memory during Vite build**
   - Reproduce locally with:
     `NODE_OPTIONS=--max-old-space-size=4096 npx vite build`

4. **Unexpected SPA 404s after deploy**
   - Confirm rewrite exists: `/(.*) -> /` in `vercel.json`.

## Performance notes

- Route-level lazy loading is active through router module `lazy(() => import(...))` usage.
- Service worker precache excludes very large assets by capping file size to 1 MB
  (`maximumFileSizeToCacheInBytes`) to avoid bloated first install and stale oversized chunks.

## Determinism guardrails

- Keep deploy commands in `vercel.json` + root `package.json` scripts aligned.
- Prefer `pnpm --filter athelon-app run build` for any CI/prod path touching this app.
