# Access Mismatch Log

This log captures live contradictions between intended role usage, access helpers,
sidebar exposure, and router behavior.

Method:

- Treat live code as the current-state source of truth
- Treat round-1 research as intended-state guidance
- Do not resolve mismatches here; record them for later alignment work

## Current-State Evidence Sources

- `src/shared/lib/mro-access.ts`
- `src/shared/lib/route-permissions.ts`
- `src/shared/components/AppSidebar.tsx`
- `src/shared/components/RouteGuard.tsx`
- `src/router/routeModules/protectedAppRoutes.tsx`
- `docs/ops/design-corpus/round-1/ROLE-AND-WORKFLOW-FIT-MATRIX.md`

## Confirmed Mismatches

| ID | Type | Current-state evidence | Why it is a mismatch | Affected roles / surfaces | Follow-up |
|---|---|---|---|---|---|
| `RAM-001` | `permission-vs-intended-role` | `ROUTE_PERMISSION_RULES` maps both `/sales` and `/crm` to `billing.view` in `mro-access.ts` | Commercial surfaces are being permissioned as billing surfaces, which collapses CAH ownership into billing semantics | `sales_rep`, `sales_manager`, `billing_manager`; Sales and CRM | Define separate commercial route semantics or explicitly document why they remain billing-owned |
| `RAM-002` | `router-vs-sidebar` | `route-permissions.ts` allows `/sales/*` only for `admin`, `shop_manager`, `billing_manager`, and `parts_clerk`; `/crm/*` only for `admin`, `shop_manager`, and `billing_manager` | The live router exposes sales and CRM routes, but the role guard excludes `sales_rep` and `sales_manager`, the two roles most aligned to those surfaces | `sales_rep`, `sales_manager`; Sales and CRM | Align route guard roles with intended commercial ownership |
| `RAM-003` | `permission-vs-intended-role` | `RouteGuard.tsx` `PERMISSION_ROLE_MAP` has no `sales` or `crm` permission category | Commercial route access is governed only indirectly, which makes the model incomplete and harder to reason about | Sales and CRM | Decide whether commercial permissions become first-class or remain aliases of billing |
| `RAM-004` | `router-vs-sidebar` | `mro-access.ts` `ROLE_NAV_ACCESS` has no `sales` or `crm` nav sections, while `AppSidebar.tsx` has explicit `sales` and `crm` sections | There are two different nav models in play: one older shared-lib model and one live sidebar model | All roles touching commercial nav | Choose a single nav-source model and reconcile the other |
| `RAM-005` | `permission-vs-intended-role` | `ROLE_SECTION_ACCESS` in `AppSidebar.tsx` grants `parts_clerk` access to `sales` | Round-1 role fit favors CAH for sales roles and mixed ICW/ETF for parts, so sales visibility for parts clerk needs explicit justification rather than drift | `parts_clerk`; Sales | Confirm whether this is deliberate procurement overlap or unintended nav leakage |
| `RAM-006` | `router-vs-sidebar` | `read_only` has broad view permissions in `mro-access.ts`, but `ROLE_SECTION_ACCESS` in `AppSidebar.tsx` only exposes `dashboard`, `fleet`, and `reports` | The hidden-nav experience for `read_only` is materially narrower than the granted route/view surface area | `read_only`; Dashboard, Fleet, Reports, Billing, Work Orders, Compliance, Scheduling, Parts | Define intended read-only navigation model: broad read-only shell or tightly curated oversight shell |
| `RAM-007` | `permission-vs-intended-role` | `/lead` is mapped to `reports.view` in `ROUTE_PERMISSION_RULES` inside `mro-access.ts` | Lead workspace is operational coordination, not a reporting surface; the semantic permission category is misaligned | `lead_technician`, `shop_manager`, `admin`; Lead Center | Define whether Lead becomes its own category or sits under work-orders / collaboration semantics |
| `RAM-008` | `live-vs-research` | Round-1 fit matrix says Sales/CRM should default to `CAH`, while current access helpers and route guards still route them through billing-centric semantics | The intended design mode and the governing access model are currently pulling in different directions | Sales and CRM | Resolve before any commercial redesign begins |
| `RAM-009` | `permission-vs-intended-role` | `mro-access.ts` grants `scheduling.view` to `technician` and `read_only`, but `route-permissions.ts` denies `/scheduling/*` to both | Scheduling visibility semantics are inconsistent between the two access models | `technician`, `read_only`; Scheduling | Decide whether scheduling is manager/lead-only or partially viewable by additional roles |
| `RAM-010` | `permission-vs-intended-role` | `mro-access.ts` grants `compliance.view` to `technician`, `lead_technician`, and `read_only`, but `route-permissions.ts` denies `/compliance/*` to those roles | Compliance visibility policy is split between helpers | `technician`, `lead_technician`, `read_only`; Compliance | Clarify whether these roles should have curated read-only compliance access |
| `RAM-011` | `permission-vs-intended-role` | `route-permissions.ts` allows `/work-orders/*` and `/my-work/*` for `ALL_ROLES`, while `mro-access.ts` models these through `work_orders.view` and narrower nav | Direct route access to execution surfaces is broader than the conceptual permission model | `sales_rep`, `sales_manager`, `read_only`; Work Orders and My Work | Bring route guard logic and permission semantics back into one coherent model |

## Open Questions

1. Should Sales and CRM become first-class permission categories, or should they stay
   under billing with clearer documentation and role mapping?
2. Should `Lead Center` be treated as a collaboration surface with distinct access,
   or as a work-orders-adjacent execution surface?
3. Is `read_only` intentionally hidden from some viewable routes, or is the current
   sidebar simply incomplete for that role?
4. Should Scheduling and Compliance have curated view-only states for technician and read-only users, or should those grants be removed from `mro-access.ts`?

## Decision Pass References

- Commercial ownership and quote routing: `WAVE-0-ROLE-ACCESS-DECISIONS.md`
  - covers `RAM-001` through `RAM-005` and `RAM-008`
- Scheduling visibility semantics: `WAVE-0-ROLE-ACCESS-DECISIONS.md`
  - covers `RAM-009`
- Compliance visibility semantics: `WAVE-0-ROLE-ACCESS-DECISIONS.md`
  - covers `RAM-010`
- Lead route semantics: `WAVE-0-ROLE-ACCESS-DECISIONS.md`
  - covers `RAM-007`
- Work-order and My Work route-family scope: `WAVE-0-ROLE-ACCESS-DECISIONS.md`
  - covers `RAM-011`
