# Convex Backend Guide

This project uses strict Convex backend conventions.

## Required Rules

- Read and follow [`CONVEX_RULES.md`](./CONVEX_RULES.md) before changing any file in this folder.
- The rules document is the canonical source for:
  - function/action/query/mutation registration syntax
  - validators and schema patterns
  - function references (`api`/`internal`) and `ctx.run*` usage
  - query/indexing rules
  - actions, cron scheduling, and storage usage

## Local Convex Commands

Run from `athelon-app/`:

```bash
npx convex dev       # Sync schema/functions + typecheck Convex code
npx convex codegen   # Regenerate _generated API types
npx convex deploy    # Deploy to Convex cloud
```

## Notes

- `convex/_generated/` is auto-generated; do not edit it manually.
- Keep schema updates in `convex/schema.ts` and align index names/query order with the rules doc.
