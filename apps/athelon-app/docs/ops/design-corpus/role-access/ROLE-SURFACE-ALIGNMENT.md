# Role Surface Alignment

This document aligns user roles to their primary surfaces and the design modes those
surfaces should use.

## Role-to-Surface Matrix

| Role | Primary surfaces | Secondary surfaces | Best default mode | Notes |
|---|---|---|---|---|
| `admin` | Settings, Dashboard, cross-product oversight | All route families | `ETF` | Full-access role should keep the broadest shell and override access |
| `shop_manager` | Dashboard, Work Orders, Scheduling, Parts, Billing, Compliance, Reports | Fleet, Personnel, Lead Center | `ETF` shell + `ICW` on execution surfaces | Manager work spans both office and execution planes |
| `qcm_inspector` | Compliance, QCM Review, Audit Readiness, selected Work Order review | Fleet, Findings, Reports | `ICW` | Trust and signoff dominate |
| `billing_manager` | Billing, Reports, Sales/CRM-adjacent commercial flows | Work-order read views, Fleet read views | `ETF` + `CAH` | Billing is office-heavy but connected to commercial workflows |
| `lead_technician` | Lead Center, Work Orders, My Work, Scheduling, Parts | Fleet, Personnel time/training | `ICW` + selective `CWP` | Lead role needs both execution and coordination surfaces |
| `technician` | My Work, task execution, Work Orders, Parts requests | Fleet read views, limited Compliance read views | `ICW` + selective `PNU` | Fast execution and low-friction context matter most |
| `parts_clerk` | Parts, receiving, warehouse, alerts, PO receiving | Billing procurement edges | mixed `ICW` + `ETF` | Inventory operations plus structured procurement/admin work |
| `sales_rep` | Sales, CRM, Quotes, Prospect Intelligence | Billing-adjacent customer context | `CAH` | Current live access model does not yet reflect this cleanly |
| `sales_manager` | Sales, CRM, quotes, analytics | Billing summaries, Reports | `CAH` + `ETF` | Needs commercial ownership plus office reporting |
| `read_only` | Dashboard, Fleet, Reports, selected read-only oversight views | Compliance or Work Orders by explicit policy | `ETF` + `PNU` | Current live route vs nav behavior is inconsistent |

## Surface Ownership View

| Surface family | Primary owning roles | Supporting roles | Target mode |
|---|---|---|---|
| Work Orders | lead_technician, technician, shop_manager, qcm_inspector | admin, billing_manager, read_only | `ICW` |
| Lead Center / Handoff | lead_technician, shop_manager, admin | - | `ICW` + `CWP` |
| My Work | technician, lead_technician | - | `ICW` + `PNU` |
| Scheduling | shop_manager, lead_technician, admin | technician, read_only by policy only | `ICW` |
| Parts | parts_clerk, lead_technician, technician, shop_manager | billing_manager | mixed `ICW` + `ETF` |
| Compliance | qcm_inspector, shop_manager, admin | lead_technician, technician, read_only by policy only | `ICW` |
| Billing | billing_manager, shop_manager, admin | sales_manager | `ETF` + `CAH` |
| Sales | sales_rep, sales_manager | billing_manager | `CAH` |
| CRM | sales_rep, sales_manager | billing_manager | `CAH` |
| Fleet | shop_manager, lead_technician, qcm_inspector | billing_manager, read_only | mixed `ICW` + `ETF` |
| Dashboard | shop_manager, admin | most roles | `ETF` |
| Reports | billing_manager, shop_manager, admin, qcm_inspector | read_only | `ETF` |
| Settings | admin primarily | shop_manager for selected views | `ETF` |

## Current-State Alignment Risks

- Sales and CRM are still governed by billing-centric access semantics in parts of the live model
- `route-permissions.ts` is stricter than `mro-access.ts` for some operational surfaces
- `AppSidebar.tsx` has a richer section model than `ROLE_NAV_ACCESS` in `mro-access.ts`
- `read_only` has broader view permissions than its current sidebar exposure suggests

## Working Target for Later Waves

- Keep one cross-product shell
- Use role-specific interior emphasis:
  - `ICW` for execution and compliance
  - `ETF` for management, settings, reporting, and billing structure
  - `CAH` for sales and CRM
- Treat Lead Center as a deliberate bridge surface instead of a naming accident between `/lead` and `/work-orders/lead`

## Wave 0 Decision Outcomes

- Sales and CRM should be treated as commercial surfaces with primary ownership by `sales_rep` and `sales_manager`, not as billing-owned surfaces by accident
- Scheduling should stay a narrow control surface at the route-family level; technician and read-only awareness should come from adjacent execution or oversight surfaces instead of broad `/scheduling/*` access
- Compliance should stay narrow at the route-family level until explicit oversight-only routes exist
- `/lead` should be treated as the canonical lead landing route, with `/work-orders/lead` retained during transition

See also: `WAVE-0-ROLE-ACCESS-DECISIONS.md`

## Remaining Questions

1. Which specific oversight-only Scheduling or Compliance routes, if any, should exist later for `lead_technician` or `read_only`?
2. Should the later commercial permission model expose separate `sales` and `crm` categories or a shared commercial abstraction under the hood?
