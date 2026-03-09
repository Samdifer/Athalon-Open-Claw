# Wave 0 Status

Coordinator-owned status board for Wave 0.

## Coordinator Review

- Wave 0 completion criteria are satisfied
- Completion was re-checked after the role/access decision pass on March 9, 2026
- Wave 1 has begun with access-model extraction in:
  - `src/shared/lib/access-policy.ts`
  - `src/shared/lib/mro-access.ts`
  - `src/shared/lib/route-permissions.ts`
  - `src/shared/components/AppSidebar.tsx`

## Scope

- Feature registries:
  - work-orders
  - lead-workspace
  - my-work
  - scheduling
  - parts
  - compliance
- Role/access docs
- Shell docs

## Task Status

| Task | Owner | Status | Notes |
|---|---|---|---|
| `feature-registry/work-orders.md` | Agent 1 | completed | Route family documented across list, detail, task, finding, RTS, release, and signature edges |
| `feature-registry/lead-workspace.md` | Agent 1 | completed | `/lead`, `/work-orders/lead`, and handoff relationship documented |
| `feature-registry/my-work.md` | Agent 2 | completed | Personal execution and timer dependencies documented |
| `feature-registry/scheduling.md` | Agent 2 | completed | Board, roster, due-list, quote, and location dependencies documented |
| `feature-registry/parts.md` | Agent 3 | completed | Inventory, receiving, warehouse, alerts, and traceability routes documented |
| `feature-registry/compliance.md` | Agent 3 | completed | Hub, audit, readiness, and QCM review routes documented |
| `role-access/ROLE-SURFACE-ALIGNMENT.md` | Agent 4 | completed | Role-to-surface mode mapping documented |
| `role-access/ROLE-LANDING-AND-NAV-MAP.md` | Agent 4 | completed | Current and recommended landing/nav model documented |
| `role-access/ACCESS-MISMATCH-LOG.md` | Agent 4 | completed | Initial live contradiction set recorded |
| `shell/SHELL-CONTRACT.md` | Agent 5 | completed | Stable shell zones and constraints documented |
| `shell/GLOBAL-INTERACTION-MAP.md` | Agent 5 | completed | Search, shortcuts, timer, notifications, and location switching documented |
| `shell/SURFACE-TO-SHELL-DEPENDENCIES.md` | Agent 5 | completed | Wave 0 surface-to-shell dependency map documented |

## Cross-Agent Blockers

Use this section only for blockers that affect more than one deliverable.

- The Wave 0 policy blockers have been converted into a shared Wave 1 access baseline in `src/shared/lib/access-policy.ts`
- Sales and CRM ownership baseline is now documented and reflected in the current Wave 1 access extraction
- Scheduling and Compliance visibility baseline is now documented and reflected in the current Wave 1 access extraction

## Decision Pass Outcomes

- Commercial ownership baseline:
  - Sales and CRM are commercial surfaces owned primarily by `sales_rep` and `sales_manager`
  - Quotes stay canonically routed under `/sales/quotes*` even if billing data contracts remain shared
- Scheduling baseline:
  - top-level Scheduling remains a control surface for `admin`, `shop_manager`, and `lead_technician`
  - `technician` and `read_only` should not imply broad `/scheduling/*` access
- Compliance baseline:
  - broad `/compliance/*` access remains narrow until explicit oversight-only routes exist
- Lead baseline:
  - `/lead` is the canonical lead landing route and should not remain modeled as reporting access
- Execution baseline:
  - `/work-orders/*` and `/my-work/*` should not keep blanket all-role route access in Wave 1

These decisions have moved the program from policy ambiguity into implementation follow-through.

## Known Contradictions To Track

- Sales and CRM route ownership vs current permission and nav model
- Billing quote file location vs sales route ownership
- Live router coverage vs older derived route registry coverage
