# Workflow Readiness Loop (WRL)

Status: Active  
Owner: Product/Ops + Engineering

## Purpose

`Workflow Readiness Loop (WRL)` is the operating process for:
1. Training users on real workflows.
2. Finding workflow friction, logic inconsistencies, and missing features.
3. Converting findings into prioritized fixes and regression coverage.

## First Active Target

`Work Order Creation` is the first active module:
- Route: `/work-orders/new`
- Downstream checks: `/work-orders`, `/work-orders/:id`
- Module pack: `modules/work-order-creation/PACK-WO-CREATE-v1.md`

## Canonical File Structure

- `PROCESS-CHARTER.md`: Program rules, gates, role matrix, cadence.
- `templates/`: Reusable templates for weekly dashboards and packs.
- `context/`: Rationale and continuity docs for future Codex instances.
- `modules/`: Module-specific packs, run logs, and findings.
- `runs/weekly/`: Weekly operating dashboard instances.

## Execution Order (Weekly)

1. Copy weekly dashboard template into `runs/weekly/` for current week.
2. Confirm in-scope module packs and roles.
3. Run preflight automation.
4. Execute live sessions and log findings in real time.
5. Gate review on Friday (Red/Yellow/Green) and set next commitments.
