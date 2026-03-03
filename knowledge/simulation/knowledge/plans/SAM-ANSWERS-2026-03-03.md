# Sam's Answers to Scheduler Plan Review Questions
**Date:** 2026-03-03 02:04 UTC

## 1. Demo Priority
**All waves needed.** No selective demo — full feature set required.

## 2. Target Shop Size
**1-30 concurrent work orders.** Small-to-mid Part 145 shops. Current in-memory architecture is fine.

## 3. Current Scheduling Methods
**Excel and whiteboards.** Drag-to-Gantt is revolutionary for these customers, not table stakes.

## 4. Graveyard / Archive
Graveyard is mainly for **lost quotes** — learn from losses, retry for new business. 

**NEW FEATURE: Carry-Forward Work Orders.** When a WO closes, save notes and deferred maintenance items so they can easily be added to the next quote or WO opened against that same aircraft. These carry-forward items should be **visible in the fleet/aircraft selection area**.

## 5. Cert-Based Scheduling Constraints
**NOT based on A&P/IA ratings.** Instead based on:
- Role in the org
- Edge-case certifications: 91.411 (altimeter/static), 91.413 (transponder) training
- Specialized training: borescope, NDT, etc.
- In-house training completions

Scheduler should validate that assigned techs have completed required training for the task.

## 6. Quote-to-WO Conversion
**Majority of work is planned.** Comes from sales funnel + recurring scheduled customers. Nearly all receive a quote first. Embedded quote builder is HIGH value.

## 7. Financial Planning Panel
**Keep it — P&L is very key.** Do not defer.

## 8. Multi-Location
**Yes, support multi-location.** Target customers have multiple locations, hangars, and repair station certificates.

## 9. Magic Scheduler Definition
**Load-leveling engine.** Steps:
1. Prioritize by selected WO priority
2. Plan based on shop capacity
3. Capacity = actual technician schedules × efficiency ratings
Not just bin-packing — uses real tech availability and productivity factors.

## 10. Undo
**Yes — include undo.** Plus keyboard shortcuts and in-app UI controls.

## 11. Mobile/Tablet
**Touch support is paramount.** Mobile use is a must-have, not nice-to-have.

## 12. AD Integration with Scheduling
**ADs should be continuously tracked.** Must be able to:
- Add ADs to work orders as tasks
- Track completion through WO sign-offs
- Continuous tracking (not just point-in-time checks)

## 13. Onboarding Target
**5 minutes** from first login to first scheduled work order.

## 14. Tech-to-Task Assignment
**Two separate Gantts:**
- **Scheduling Gantt:** WO-to-bay assignment (shop-level planning)
- **Work Order Gantt:** Tech-to-task assignment (WO-level execution)

These are distinct features, not one combined view.
