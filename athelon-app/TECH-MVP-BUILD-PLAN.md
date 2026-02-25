# Technician MVP Build Plan

**Date:** 2026-02-25  
**Status:** IN PROGRESS

## Gap Analysis Summary

| # | Feature | Schema | Backend | Frontend | Effort |
|---|---------|--------|---------|----------|--------|
| 1 | Approved data ref on task step | ✅ on taskCards (not steps) | ❌ Need step-level field | 🔧 Add to SignStepDialog | M |
| 2 | Parts installation in step sign-off | ✅ embeddedPartRecord on maintenanceRecords | ❌ Need step-level parts | 🔧 Add parts picker to SignStepDialog | L |
| 3 | "My Work" tech view | ✅ by_assigned index exists | ✅ Can query by techId | ❌ No /my-work page | M |
| 4 | Raise Finding from task card | ✅ discrepancies table exists | ✅ openDiscrepancy mutation | ❌ No UI button on task card | S |
| 5 | Shift handoff notes on task cards | ❌ No schema field | ❌ Need mutation | ❌ No UI | M |
| 6 | Aircraft maintenance logbook view | ✅ maintenanceRecords table | ✅ Queries exist | ❌ No /fleet/[tail]/logbook page | L |
| 7 | Tech notes on step sign-off | ✅ notes field on taskCardSteps | ✅ completeStep accepts notes | ✅ SignStepDialog has notes field | DONE |

**Gap 7 is already built!** Notes field exists in schema, mutation, and UI.

## Build Order

### Phase 1: Small Wins (Gaps 4, 7)
- **Gap 7:** DONE — verify and close
- **Gap 4:** Add "Raise Finding" button to task card page → calls openDiscrepancy

### Phase 2: Step Sign-off Enhancements (Gaps 1, 2)
- **Gap 1:** Add approvedDataReference field to taskCardSteps schema + SignStepDialog display
- **Gap 2:** Add parts picker to SignStepDialog (select from parts inventory, record part serial + qty)

### Phase 3: New Pages (Gaps 3, 6)
- **Gap 3:** Create /my-work page — query taskCardSteps by assignedToTechnicianId
- **Gap 6:** Create /fleet/[tail]/logbook page — query maintenanceRecords by aircraftId

### Phase 4: Shift Handoff (Gap 5)
- **Gap 5:** Add handoffNotes array to taskCards schema, mutation to add notes, UI section on task card page

### Phase 5: Logbook Sign-off Logic
- Enhanced logbook entry creation tied to task card completion
- Ensure completeStep → auto-creates maintenance record when all steps done
- Aircraft-scoped sequential numbering (sequenceNumber field exists)

## Schema Changes Needed

### taskCardSteps (ADD fields)
```
approvedDataReference: v.optional(v.string()),  // Step-level approved data ref
partsInstalled: v.optional(v.array(v.object({
  partId: v.optional(v.id("parts")),
  partNumber: v.string(),
  serialNumber: v.optional(v.string()),
  description: v.string(),
  quantity: v.number(),
}))),
```

### taskCards (ADD field)
```
handoffNotes: v.optional(v.array(v.object({
  technicianId: v.id("technicians"),
  technicianName: v.string(),
  note: v.string(),
  createdAt: v.number(),
}))),
```

## Execution
- Phase 1-2: Direct execution (small, well-defined)
- Phase 3-4: Sub-agents (new pages, parallel work)
- Phase 5: Main session (logbook logic is safety-critical, needs careful review)
