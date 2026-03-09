# Wave 0 Execution Manifest

Wave 0 is the documentation and alignment wave. It is intentionally read-only with
respect to application code.

## Wave Goal

Produce the minimum architecture and research artifacts required to let later agents
extract hooks, align access, and redesign surfaces without rediscovering the app from
scratch.

## Wave 0 Write Scope

Allowed write locations:

- `apps/athelon-app/docs/ops/design-corpus/feature-registry/*`
- `apps/athelon-app/docs/ops/design-corpus/role-access/*`
- `apps/athelon-app/docs/ops/design-corpus/shell/*`
- `apps/athelon-app/docs/ops/design-corpus/WAVE-0-STATUS.md`

Disallowed write locations:

- `apps/athelon-app/app/**`
- `apps/athelon-app/src/**`
- `apps/athelon-app/convex/**`
- `apps/athelon-app/docs/ops/design-corpus/round-1/**`

## Mandatory Read Packet

Every Wave 0 agent must read:

1. `apps/athelon-app/docs/ops/design-corpus/REDESIGN-ARCHITECTURE-PLAN.md`
2. `apps/athelon-app/docs/ops/design-corpus/REDESIGN-NEXT-STEPS.md`
3. `apps/athelon-app/docs/ops/APP-HIERARCHY-AND-INTERCONNECTIVITY-MAP.md`
4. `apps/athelon-app/docs/ops/APP-PAGE-INVENTORY.csv`
5. `apps/athelon-app/src/router/routeModules/protectedAppRoutes.tsx`
6. `apps/athelon-app/src/shared/lib/mro-access.ts`
7. `apps/athelon-app/src/shared/lib/route-permissions.ts`
8. `apps/athelon-app/src/shared/components/AppSidebar.tsx`

## Agent Assignments

### Agent 1

Scope:

- `feature-registry/work-orders.md`
- `feature-registry/lead-workspace.md`

Additional required reads:

- `app/(app)/work-orders/**`
- `app/(app)/lead/**`
- relevant work-order shared and feature components

### Agent 2

Scope:

- `feature-registry/my-work.md`
- `feature-registry/scheduling.md`

Additional required reads:

- `app/(app)/my-work/**`
- `app/(app)/scheduling/**`

### Agent 3

Scope:

- `feature-registry/parts.md`
- `feature-registry/compliance.md`

Additional required reads:

- `app/(app)/parts/**`
- `app/(app)/compliance/**`

### Agent 4

Scope:

- `role-access/ROLE-SURFACE-ALIGNMENT.md`
- `role-access/ROLE-LANDING-AND-NAV-MAP.md`
- `role-access/ACCESS-MISMATCH-LOG.md`

Additional required reads:

- `app/(app)/layout.tsx`
- `src/shared/components/RouteGuard.tsx`
- relevant auth and onboarding guards

### Agent 5

Scope:

- `shell/SHELL-CONTRACT.md`
- `shell/GLOBAL-INTERACTION-MAP.md`
- `shell/SURFACE-TO-SHELL-DEPENDENCIES.md`

Additional required reads:

- `app/(app)/layout.tsx`
- `src/shared/components/TopBar.tsx`
- `src/shared/components/CommandPalette.tsx`
- `src/shared/components/KeyboardShortcuts.tsx`
- `src/shared/components/GlobalTimerWidget.tsx`
- `src/shared/components/LocationSwitcher.tsx`
- `src/shared/components/OrgContextProvider.tsx`

## Shared Output Rules

1. Use the scaffolds and templates already created in the target directories.
2. Preserve the section order in the template unless a strong reason is documented.
3. Reference exact files and routes.
4. Log mismatches instead of resolving them.
5. Do not edit another agent's output file.

## Handoff Protocol

Every agent should leave, at minimum:

- completed output files
- a short open-questions section in each file if needed
- contradictions called out explicitly

Only the coordinator should update `WAVE-0-STATUS.md`.

## Completion Criteria

Wave 0 is ready for review when:

1. all 6 registry docs exist
2. all 3 role/access docs exist
3. all 3 shell docs exist
4. the status board shows completion state and blockers

The coordinator then reviews for cross-file consistency before authorizing Wave 1.
