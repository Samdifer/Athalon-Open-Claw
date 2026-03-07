# Athelon App

`apps/athelon-app` is the main Athelon web application. It currently runs as a
Vite + React 19 SPA with React Router on the frontend and Convex on the
backend.

## Getting Started

Run from `apps/athelon-app/`:

```bash
pnpm dev
```

The dev server runs on `http://localhost:3000`.

## Validation

```bash
npx tsc --noEmit
NODE_OPTIONS=--max-old-space-size=4096 npx vite build
pnpm test:agentic
pnpm test:camp-linkage
pnpm test:scheduling-helpers
pnpm test:due-list-helpers
```

For backend schema/function changes, also run:

```bash
npx convex codegen
```

## App Structure

- `main.tsx`: compatibility entrypoint into the Vite bootstrap.
- `src/bootstrap/main.tsx`: React app bootstrap, providers, and router mount.
- `src/router/`: route modules and app router composition.
- `convex/`: backend schema, queries, mutations, and generated bindings.

## Documentation Index

- [Master Build Spec](docs/spec/MASTER-BUILD-LIST.md)
- [Master Feature Registry (Derived CSV)](docs/plans/MASTER-FEATURE-REGISTRY.csv)
- [Master Feature Crosswalk (Derived)](docs/plans/MASTER-FEATURE-CROSSWALK.md)
- [Master Build Plan (Derived)](docs/plans/MASTER-BUILD-PLAN.md)
- [Agentic Build System Runbook](docs/ops/agentic-build-system/README.md)
- [Deployment Troubleshooting Runbook](docs/ops/DEPLOYMENT-TROUBLESHOOTING-RUNBOOK.md)

## Deploy Parity Command

From repository root:

```bash
pnpm run vercel:build:ci
```
