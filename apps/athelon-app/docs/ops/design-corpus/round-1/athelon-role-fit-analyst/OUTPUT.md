# Round 1 Output — Athelon Role Fit Analyst

## Scope

This output maps round-1 design findings onto Athelon’s actual role model and
surface inventory.

## Current Role And Surface Model

The current role catalog in
[`mro-access.ts`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/apps/athelon-app/src/shared/lib/mro-access.ts)
includes:

- `admin`
- `shop_manager`
- `qcm_inspector`
- `billing_manager`
- `lead_technician`
- `technician`
- `parts_clerk`
- `sales_rep`
- `sales_manager`
- `read_only`

The current navigation surface in
[`AppSidebar.tsx`](/Users/samuelsandifer/Sam%20Codebases/Athalon-Open-Claw/apps/athelon-app/src/shared/components/AppSidebar.tsx)
already separates major areas: dashboard, my work, fleet, work orders,
scheduling, parts, sales, billing, compliance, personnel, reports, and settings.

## Role Jobs To Be Done

### Execution cluster

- `lead_technician`
- `technician`
- `parts_clerk`

Primary need: speed, legibility, status visibility, low ambiguity, strong
exception handling.

### Oversight cluster

- `qcm_inspector`
- `shop_manager`
- `admin`
- `read_only`

Primary need: trust, summary-to-detail review, audit visibility, predictable
state transitions.

### Commercial/office cluster

- `billing_manager`
- `sales_rep`
- `sales_manager`

Primary need: clarity, form/table balance, customer context, lower visual
severity than aircraft-signoff surfaces.

## Fit Scoring By Role Cluster

| Role cluster | Best direction | Why |
|---|---|---|
| Execution | Industrial control workbench | Strongest speed + density + state fit |
| Oversight | Industrial control workbench + enterprise transactional floorplan | Oversight needs trust and review structure, not just density |
| Commercial/office | Enterprise transactional floorplan + commerce/admin hybrid | Strongest form-flow clarity and customer-facing comfort |

`Inference`: Athelon’s redesign should not force technicians and billing users
into the same default visual rhythm.

## Fit Scoring By Surface

| Surface | Highest-fit direction | Notes |
|---|---|---|
| My Work | Industrial control workbench | Mobile/touch influence should come from platform-native utility |
| Work Orders | Industrial control workbench | Add document-centric moments around signoff and readiness |
| Compliance | Industrial control workbench + document-centric ledger | Needs trust-first presentation |
| Scheduling | Industrial control workbench | Dense control surface, not lightweight board theater |
| Parts | Industrial control workbench + enterprise transactional floorplan | Mixed operator and clerk behavior |
| Billing | Enterprise transactional floorplan | Add commerce/admin clarity where appropriate |
| Sales / CRM | Commerce/admin hybrid | Secondary collaboration patterns are useful |
| Reports / settings | Enterprise transactional floorplan | Predictability beats stylistic novelty |
| Dashboard | Enterprise transactional floorplan | Role-specific overview pages likely outperform one universal dashboard |

## Handoff To Opus Synthesis

The most important fit conclusion is structural:

Athelon should use one shared trust spine, but different surface defaults for
execution, oversight, and commercial work. The current role model already
justifies that split.
