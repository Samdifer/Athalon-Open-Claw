# Role Landing and Nav Map

This document records the current live landing behavior and a recommended
role-aligned landing/nav model for later implementation work.

## Current Live Landing Behavior

- Successful internal app entry generally lands users into the shell and then to the current route or `/dashboard`
- Unauthorized route access in `RouteGuard.tsx` redirects to `/dashboard`
- The current shell does not implement a robust role-specific landing strategy yet

## Recommended Landing Routes by Role

| Role | Recommended default landing route | Why |
|---|---|---|
| `admin` | `/dashboard` | Cross-system oversight is the safest default |
| `shop_manager` | `/dashboard` | Needs cross-shop summary before drilling down |
| `qcm_inspector` | `/compliance` or `/compliance/audit-readiness` | Compliance work is their main job, not dashboarding |
| `billing_manager` | `/billing/invoices` | Highest-frequency operational queue |
| `lead_technician` | `/lead` | Lead Center best matches coordination responsibilities |
| `technician` | `/my-work` | Assigned work should be the primary default |
| `parts_clerk` | `/parts` | Inventory and receiving are the core job |
| `sales_rep` | `/sales/dashboard` | Commercial pipeline and quotes are the core job |
| `sales_manager` | `/sales/dashboard` | Same family, with broader oversight intent |
| `read_only` | `/dashboard` | Oversight-first default |

## Current Sidebar Reality

- `AppSidebar.tsx` is the richest current nav model
- It exposes top-level groups for:
  - Dashboard
  - My Work
  - Lead Center
  - Fleet
  - Work Orders
  - Schedule
  - Parts
  - Sales
  - Billing
  - CRM
  - Compliance
  - Reports
  - Personnel
  - OJT Training
  - Settings
- `ROLE_SECTION_ACCESS` inside `AppSidebar.tsx` partially governs what each role sees
- `ROLE_NAV_ACCESS` in `mro-access.ts` is older and does not fully match the sidebar section model

## Recommended Primary Nav by Role

| Role | Primary nav sections | Secondary nav sections |
|---|---|---|
| `admin` | Dashboard, Fleet, Work Orders, Scheduling, Parts, Billing, Sales, CRM, Compliance, Reports, Personnel, Settings | Training |
| `shop_manager` | Dashboard, Work Orders, Scheduling, Parts, Fleet, Compliance, Billing, Reports, Personnel | Lead Center |
| `qcm_inspector` | Compliance, Work Orders, Fleet, Reports | Findings |
| `billing_manager` | Billing, Sales, CRM, Reports | Work Orders, Fleet |
| `lead_technician` | Lead Center, My Work, Work Orders, Scheduling, Parts | Fleet, Personnel |
| `technician` | My Work, Work Orders, Parts | Fleet |
| `parts_clerk` | Parts | Billing procurement views only where explicitly justified |
| `sales_rep` | Sales, CRM | Billing-adjacent customer context as needed |
| `sales_manager` | Sales, CRM, Reports | Billing summaries |
| `read_only` | Dashboard, Fleet, Reports | Additional curated oversight sections by policy |

## Secondary Nav Expectations

- Work Orders:
  - Dashboard
  - Lead Workspace
  - Shift Handoff
  - Kanban
- Scheduling:
  - Gantt Board
  - Bays
  - Capacity
  - Roster & Teams
  - Financial Planning
  - Due-List
  - Seed Audit
- Parts:
  - Receiving
  - Requests
  - Warehouse
  - Alerts
  - Inventory Count
  - Traceability subdomains
- Compliance:
  - AD/SB Tracking
  - Audit Trail
  - Audit Readiness
  - QCM Review
  - Diamond Award

## Current-State Mismatches To Keep in View

- `sales_rep` and `sales_manager` are not consistently reflected in the route guard model for Sales and CRM
- `read_only` route access and sidebar exposure diverge
- `/lead` is semantically closer to execution/collaboration than reporting, but `mro-access.ts` routes it through `reports.view`

## Wave 0 Working Nav Decisions

- Keep one sidebar tree for now, but drive visibility from a single access matrix instead of parallel helper lists
- Treat Sales and CRM as default top-level nav for `sales_rep` and `sales_manager`
- Keep Scheduling top-level nav limited to `admin`, `shop_manager`, and `lead_technician`
- Keep Compliance top-level nav limited to `admin`, `shop_manager`, and `qcm_inspector` until explicit oversight-only routes exist
- Keep `read_only` as a curated oversight shell centered on Dashboard, Fleet, and Reports
- Treat `/lead` as the canonical lead landing route even while `/work-orders/lead` remains reachable

See also: `WAVE-0-ROLE-ACCESS-DECISIONS.md`

## Remaining Questions

1. Should `OJT Training` stay as a bottom-nav item or become an internal sub-surface of Personnel/Compliance depending on role?
2. When commercial access is extracted in code, should Sales and CRM share one internal permission backbone or remain fully separate categories?
