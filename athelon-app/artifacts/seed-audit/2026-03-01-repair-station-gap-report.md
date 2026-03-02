# Repair Station Seed Audit Report (2026-03-01)

Scenario key: `ATHELON-DEMO-KA-TBM-2LOC`
Coverage pass: **PASS**

## Count Coverage

| Item | Required | Actual | Pass |
| --- | --- | --- | --- |
| aircraft | 12 | 12 | yes |
| engines | 20 | 20 | yes |
| hangarBays | 8 | 8 | yes |
| loanerItems | 4 | 4 | yes |
| locations | 2 | 2 | yes |
| parts | 60 | 60 | yes |
| propellers | 20 | 20 | yes |
| quotes | 10 | 10 | yes |
| rotables | 8 | 8 | yes |
| scheduleAssignments | 30 | 30 | yes |
| taskCards | 90 | 90 | yes |
| technicians | 10 | 10 | yes |
| toolRecords | 40 | 40 | yes |
| vendors | 8 | 8 | yes |
| workOrders | 30 | 30 | yes |

## Per-Location Scheduled Counts

| Location | Scheduled | Target | Pass |
| --- | --- | --- | --- |
| DEN | 15 | 15 | yes |
| COS | 15 | 15 | yes |

## Per-Location Tool Counts

| Location | Tools | Target | Pass |
| --- | --- | --- | --- |
| DEN | 20 | 20 | yes |
| COS | 20 | 20 | yes |

## Fleet Component Coverage

| Tail | Expected | Engines | Propellers | Pass |
| --- | --- | --- | --- | --- |
| N2KA01 | 2 | 2 | 2 | yes |
| N2KA02 | 2 | 2 | 2 | yes |
| N2KA03 | 2 | 2 | 2 | yes |
| N2KA04 | 2 | 2 | 2 | yes |
| N2KA05 | 2 | 2 | 2 | yes |
| N2KA06 | 2 | 2 | 2 | yes |
| N2KA07 | 2 | 2 | 2 | yes |
| N2KA08 | 2 | 2 | 2 | yes |
| N9TB01 | 1 | 1 | 1 | yes |
| N9TB02 | 1 | 1 | 1 | yes |
| N9TB03 | 1 | 1 | 1 | yes |
| N9TB04 | 1 | 1 | 1 | yes |

## Parts Family Coverage

| Metric | Actual | Required | Pass |
| --- | --- | --- | --- |
| consumables_hardware | 21 | 18 | yes |
| powerplant_service | 17 | 12 | yes |
| airframe_brake_env | 12 | 10 | yes |
| avionics_electrical | 10 | 8 | yes |

## Parts Edge Coverage

| Metric | Actual | Required | Pass |
| --- | --- | --- | --- |
| lifeLimited | 9 | 6 | yes |
| shelfLifeLimited | 11 | 10 | yes |
| serialized | 32 | 20 | yes |
| ownerSupplied | 2 | 2 | yes |
| lowStock | 6 | 6 | yes |
| pendingInspection | 5 | 4 | yes |
| quarantine | 5 | 4 | yes |
| removedPendingDisposition | 5 | 4 | yes |
| installed | 7 | 6 | yes |
| expiredShelfLife | 2 | 2 | yes |
| nearLifeLimit | 2 | 2 | yes |
| lifeExpiredInQuarantine | 1 | 1 | yes |
| pendingWithoutInspection | 5 | 4 | yes |

## Tool Status Mix

| Status | Count |
| --- | --- |
| available | 28 |
| calibration_due | 4 |
| in_use | 6 |
| out_for_calibration | 2 |

## Tool Category Mix

| Category | Count |
| --- | --- |
| hand_tool | 14 |
| power_tool | 4 |
| special_tooling | 6 |
| test_equipment | 16 |

## Gap Summary

- Open gaps: **0**
- Resolved gaps: **13**

## Gaps

### gap-schedule-assignments-not-location-scoped (Resolved)

- Severity: critical
- Category: scheduling
- Impact: Schedule board cannot guarantee per-location workload partitioning.
- Recommended fix: Store and enforce shopLocationId on scheduleAssignments and filter planner queries by location.
- Evidence: `{"codeRef":"convex/schedulerPlanning.ts","linkedAssignments":30,"perLocationScheduledCounts":[{"locationCode":"DEN","locationId":"vh777dfse0fn149d1gmhw8wzas823h03","scheduled":15},{"locationCode":"COS","locationId":"vh79zy3m5q9ea0y16mxz46edwn822yv7","scheduled":15}],"totalAssignments":30}`

### gap-work-orders-not-location-scoped (Resolved)

- Severity: critical
- Category: work_orders
- Impact: Operational and financial reports cannot reliably separate workloads per station.
- Recommended fix: Persist shopLocationId on workOrders and apply location filters to list/risk queries.
- Evidence: `{"codeRef":"convex/workOrders.ts","linkedWorkOrders":30,"totalWorkOrders":30}`

### gap-location-switcher-query-consumption (Resolved)

- Severity: high
- Category: location_filtering
- Impact: If unresolved, location switching does not materially change scheduler/capacity views.
- Recommended fix: Pass shopLocationId through scheduling/capacity/work-order queries and persist selection state.
- Evidence: `{"allAssignmentsLinked":true,"allBaysLinked":true,"allTechsLinked":true,"allWorkOrdersLinked":true,"codeRefs":["components/LocationSwitcher.tsx","app/(app)/scheduling/page.tsx","app/(app)/scheduling/capacity/page.tsx","app/(app)/scheduling/financial-planning/page.tsx"],"perLocationScheduledCounts":[{"locationCode":"DEN","locationId":"vh777dfse0fn149d1gmhw8wzas823h03","scheduled":15},{"locationCode":"COS","locationId":"vh79zy3m5q9ea0y16mxz46edwn822yv7","scheduled":15}]}`

### gap-hangar-bays-not-linked-to-locations (Resolved)

- Severity: high
- Category: data_model
- Impact: Bays cannot be partitioned by location without explicit linkage.
- Recommended fix: Keep hangarBays.shopLocationId populated and enforce org ownership on create/update.
- Evidence: `{"codeRef":"convex/schema.ts","linked":8,"total":8}`

### gap-technicians-not-location-assigned (Resolved)

- Severity: high
- Category: capacity
- Impact: Capacity bars blend technicians from multiple locations.
- Recommended fix: Persist primaryShopLocationId on technicians and scope capacity queries.
- Evidence: `{"codeRef":"convex/capacity.ts","linkedTechnicians":10,"totalTechnicians":10}`

### gap-scheduler-parity-base-filter-model (Resolved)

- Severity: high
- Category: scheduler_parity
- Impact: Parity with Scheduler app degrades when base/location filters are not first-class data dimensions.
- Recommended fix: Keep location on bays/assignments/technicians and consume it in all planner and capacity routes.
- Evidence: `{"allAssignmentsLinked":true,"allBaysLinked":true,"allTechsLinked":true,"codeRefs":["scheduler/components/GanttBoard.tsx","convex/schedulerPlanning.ts"],"perLocationScheduledCounts":[{"locationCode":"DEN","locationId":"vh777dfse0fn149d1gmhw8wzas823h03","scheduled":15},{"locationCode":"COS","locationId":"vh79zy3m5q9ea0y16mxz46edwn822yv7","scheduled":15}]}`

### gap-fleet-component-coverage (Resolved)

- Severity: high
- Category: fleet_components
- Impact: Fleet detail pages and maintenance planning lose realism when engine/propeller coverage is incomplete.
- Recommended fix: Seed and maintain deterministic engines/propellers per aircraft engineCount.
- Evidence: `{"expectedByAircraft":[{"aircraftId":"j9733m4gx8gh6tea4tf4cb9h3d823dq2","engines":2,"expected":2,"propellers":2,"tailNumber":"N2KA01"},{"aircraftId":"j97cbv2rv83n6g1ps126r26wys822nn2","engines":2,"expected":2,"propellers":2,"tailNumber":"N2KA02"},{"aircraftId":"j975jhw0d4q5wx6fqq022p5n6182312c","engines":2,"expected":2,"propellers":2,"tailNumber":"N2KA03"},{"aircraftId":"j976bshzj02mv7tre8yrtktfdh823yhc","engines":2,"expected":2,"propellers":2,"tailNumber":"N2KA04"},{"aircraftId":"j978shk725fmntjw3hwgw3rjzd823j8n","engines":2,"expected":2,"propellers":2,"tailNumber":"N2KA05"},{"aircraftId":"j97b9xcfb8f2nqr36nbjfxrzfs822n7n","engines":2,"expected":2,"propellers":2,"tailNumber":"N2KA06"},{"aircraftId":"j974ps2vrr0vjq28mpysrdz5vx822y15","engines":2,"expected":2,"propellers":2,"tailNumber":"N2KA07"},{"aircraftId":"j97aacsfrksf5bs3vb17xat2mx82301v","engines":2,"expected":2,"propellers":2,"tailNumber":"N2KA08"},{"aircraftId":"j97dvfkzdg8sbj9j0y1294qc2d823dp3","engines":1,"expected":1,"propellers":1,"tailNumber":"N9TB01"},{"aircraftId":"j97ebp5hj538mwe3cxr82155y1822hbq","engines":1,"expected":1,"propellers":1,"tailNumber":"N9TB02"},{"aircraftId":"j974njb7shat502m2zxbt0fypn823s4p","engines":1,"expected":1,"propellers":1,"tailNumber":"N9TB03"},{"aircraftId":"j976242pt1fb2h4dzzbkrjp3h5822w3h","engines":1,"expected":1,"propellers":1,"tailNumber":"N9TB04"}],"requiredCounts":{"engines":20,"propellers":20}}`

### gap-parts-usecase-coverage (Resolved)

- Severity: high
- Category: inventory_coverage
- Impact: Parts UI and workflows do not exercise realistic turboprop maintenance inventory paths.
- Recommended fix: Keep contextual family-based parts templates and enforce minimum family coverage in seed audit.
- Evidence: `{"contract":{"airframe_brake_env":10,"avionics_electrical":8,"consumables_hardware":18,"powerplant_service":12},"familyCounts":{"airframe_brake_env":12,"avionics_electrical":10,"consumables_hardware":21,"powerplant_service":17}}`

### gap-tooling-catalog-contract (Resolved)

- Severity: high
- Category: tooling_coverage
- Impact: Tool crib workflows and calibration dashboards are under-tested without core turboprop tooling families.
- Recommended fix: Maintain deterministic 40-item tooling catalog and enforce family presence in seed audit.
- Evidence: `{"expectedToolCount":40,"toolCategoryMix":{"hand_tool":14,"power_tool":4,"special_tooling":6,"test_equipment":16},"toolCount":40,"toolFamilyChecks":{"borescope":true,"caliper":true,"compression":true,"pitot_static":true,"torque_wrench":true,"transponder":true,"wing_jack":true},"toolStatusMix":{"available":28,"calibration_due":4,"in_use":6,"out_for_calibration":2}}`

### gap-location-deactivation-not-enforced (Resolved)

- Severity: medium
- Category: policy_enforcement
- Impact: UI messaging can drift from actual assignment behavior after deactivation.
- Recommended fix: Add mutation-level guards that block assignment to inactive locations and migrate affected records.
- Evidence: `{"assignmentsAtInactiveLocations":0,"codeRefs":["app/(app)/settings/locations/page.tsx","convex/shopLocations.ts"],"inactiveLocationCount":0,"workOrdersAtInactiveLocations":0}`

### gap-work-order-number-uses-primary-location (Resolved)

- Severity: medium
- Category: numbering
- Impact: WO numbering can drift from the assigned station in multi-location operations.
- Recommended fix: Update number reservation API to accept work-order location and derive prefix from that location.
- Evidence: `{"codeRefs":["convex/lib/workOrderNumber.ts","convex/workOrders.ts","convex/billing.ts"],"locationPrefixMatches":true,"locationScopedNumberingPass":true,"note":"Work-order numbering should follow explicit shopLocationId context when present, then fallback to org primary location when absent."}`

### gap-life-limit-shelf-life-edge-coverage (Resolved)

- Severity: medium
- Category: inventory_edge_cases
- Impact: Edge-case QA paths for LLP and shelf-life handling may regress without deterministic test fixtures.
- Recommended fix: Seed deterministic expired/near-limit/pending-inspection records and verify with coverage checks.
- Evidence: `{"contract":{"expiredShelfLife":2,"lifeExpiredInQuarantine":1,"nearLifeLimit":2,"pendingWithoutInspection":4},"coverage":{"expiredShelfLife":2,"familyCounts":{"airframe_brake_env":12,"avionics_electrical":10,"consumables_hardware":21,"powerplant_service":17},"installed":7,"lifeExpiredInQuarantine":1,"lifeLimited":9,"lowStock":6,"nearLifeLimit":2,"ownerSupplied":2,"pendingInspection":5,"pendingWithoutInspection":5,"quarantine":5,"removedPendingDisposition":5,"serialized":32,"shelfLifeLimited":11}}`

### gap-tooling-location-scoping (Resolved)

- Severity: medium
- Category: tooling_location_filtering
- Impact: Location-filtered tool crib views can drift when tools are not location-scoped.
- Recommended fix: Persist toolRecords.shopLocationId and consume shopLocationId filters in tool crib queries/routes.
- Evidence: `{"allToolsLinked":true,"codeRefs":["convex/toolCrib.ts","app/(app)/parts/tools/page.tsx"],"perLocationToolCounts":[{"locationCode":"DEN","locationId":"vh777dfse0fn149d1gmhw8wzas823h03","tools":20},{"locationCode":"COS","locationId":"vh79zy3m5q9ea0y16mxz46edwn822yv7","tools":20}]}`
