# Wave 0 Role/Access Decisions

This document records the short decision pass that follows the initial Wave 0
research outputs. It resolves the highest-value access-model blockers so Wave 1
can start from a stable policy baseline instead of re-litigating role intent.

Scope:

- docs only
- no app code changes
- no backend changes

Evidence base:

- `src/shared/lib/mro-access.ts`
- `src/shared/lib/route-permissions.ts`
- `src/shared/components/AppSidebar.tsx`
- `src/shared/components/RouteGuard.tsx`
- `src/router/routeModules/protectedAppRoutes.tsx`
- Wave 0 feature registries and role/access docs
- round-1 `ROLE-AND-WORKFLOW-FIT-MATRIX.md`

## Decision 1: Sales and CRM are commercial surfaces, not billing-owned surfaces

Working decision:

- `/sales/*` and `/crm/*` are first-class commercial route families
- Primary owners are `sales_rep` and `sales_manager`
- Supporting/override roles are `billing_manager`, `shop_manager`, and `admin`
- `parts_clerk` should not retain default Sales or CRM route ownership

Why:

- The live router already exposes standalone `/sales/*` and `/crm/*` families
- `AppSidebar.tsx` already models Sales and CRM as separate top-level sections
- round-1 design direction assigns Sales and CRM to `CAH`, not billing-office semantics
- Current `billing.view` mapping collapses commercial ownership into the wrong domain

Implications for Wave 1:

- Stop mapping `/sales` and `/crm` through `billing.view`
- Introduce explicit commercial route/nav semantics in the access model
- Keep `billing_manager` as a supporting commercial role, not the owner

## Decision 2: Quotes stay shared with billing data, but the route owner is commercial

Working decision:

- `/sales/quotes*` is the canonical quote workspace route family
- `/billing/quotes*` remains a legacy alias/redirect edge, not the ownership signal
- Quote data may continue to come from billing modules without changing surface ownership

Why:

- The live router already redirects `/billing/quotes*` into `/sales/quotes*`
- Scheduling and CRM both deep-link into quote workflows under `/sales/quotes*`
- Backend/data coupling does not require billing-owned route semantics

Implications for Wave 1:

- Preserve quote aliases for safety and rollback
- Model quotes as a shared commercial workspace with billing data dependencies

## Decision 3: Scheduling is a control surface, not a general read-only surface

Working decision:

- Default top-level Scheduling access remains `admin`, `shop_manager`, and `lead_technician`
- `technician` schedule awareness should come through `My Work`, Work Orders, and lead flows
- `read_only` does not get default Scheduling nav or broad `/scheduling/*` access

Why:

- The route family is highly mutable and keyboard/undo driven
- Scheduling pages control assignments, bays, capacity, roster, and planning state
- The stricter route guard aligns better with the actual job-to-be-done than the broader view grant

Implications for Wave 1:

- Remove or narrow the broad `scheduling.view` implication for `technician` and `read_only`
- If later oversight views are needed, they should be carved into explicit read-only routes rather than implied by the whole family

## Decision 4: Compliance is a governance/review family; broad family access stays narrow

Working decision:

- Full Compliance family access remains `admin`, `shop_manager`, and `qcm_inspector`
- `lead_technician` is a candidate for later curated oversight routes, but not blanket `/compliance/*` access yet
- `technician` and `read_only` should consume compliance context through adjacent surfaces unless explicit oversight routes are created

Why:

- The route family clusters audit readiness, QCM review, AD/SB oversight, and audit-trail work
- Current `mro-access.ts` view grants are broader than the route family semantics
- The existing pages do not distinguish control routes from safe read-only oversight routes clearly enough yet

Implications for Wave 1:

- Do not treat `compliance.view` as equivalent to blanket family access
- Either tighten current grants or split the family into narrower control vs oversight route classes before widening access

## Decision 5: Lead Center is an execution/collaboration bridge, not a reporting surface

Working decision:

- `/lead` is the canonical lead landing route
- `/work-orders/lead` remains available as a work-orders-adjacent entry point during transition
- Lead access should be modeled beside execution and coordination semantics, not under `reports.view`

Why:

- The live router and sidebar already treat Lead Center as a primary workspace
- The feature registry shows direct dependencies on work-order risk, roster, turnover, and time oversight
- Mapping `/lead` through `reports.view` is semantically weak and misleads later access extraction

Implications for Wave 1:

- Replace the current reporting-based permission mapping for `/lead`
- Keep `/work-orders/lead` intact until route consolidation is explicitly approved

## Decision 6: Work Orders and My Work should not keep blanket all-role route access

Working decision:

- `sales_rep` and `sales_manager` should not retain blanket `/work-orders/*` access
- `/my-work/*` should be treated as a personal execution surface for `technician`, `lead_technician`, with `shop_manager` and `admin` as oversight/override roles
- `read_only` remains a curated oversight role, not an execution-shell default

Why:

- The current route guard is broader than both the conceptual role model and the sidebar model
- Work Orders and My Work belong to the execution spine, not the commercial shell
- Leaving `ALL_ROLES` in place will distort later redesign validation and nav alignment

Implications for Wave 1:

- Narrow route-family guards to match the intended role model
- Derive sidebar visibility from the same route matrix instead of maintaining separate drift-prone lists

## Recommended Wave 1 Access Extraction Order

1. Establish one canonical route/shell access matrix for each role
2. Add explicit commercial semantics for Sales, CRM, and shared quote ownership
3. Re-map `/lead` away from `reports.view`
4. Tighten Scheduling, Compliance, Work Orders, and My Work route-family access
5. Reconcile sidebar section visibility against the same matrix
6. Add route/access tests for the touched families before any surface redesign begins

## Decisions Still Deferred

- Whether commercial permissions should be represented as separate `sales` and `crm` categories or as a shared commercial abstraction underneath
- Whether Compliance later gains explicit oversight-only subroutes for `lead_technician` or `read_only`
- Whether any read-only Scheduling overview should exist outside dashboard/reporting context
