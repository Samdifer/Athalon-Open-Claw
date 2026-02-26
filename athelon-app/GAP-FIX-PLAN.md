# Gap Fix Execution Plan

## Backend Wave 1: Schema + Core Mutations (Jarvis does this)

### Schema changes needed:
1. aircraft: add updateAircraftTotalTime mutation + induction fields
2. taskCardSteps: add photoUrls, measurements, partsRemoved, in_progress status
3. taskCards: add estimatedHours, dedicated signature fields, templateId
4. discrepancies: add taskCardStepId, severity, priority, photoUrls
5. quoteLineItems: add discrepancyId
6. parts: add reservedForWorkOrderId, completeReceivingInspection mutation
7. workOrders: add setCustomerFacingStatus mutation
8. Inspection templates table (new)
9. Conformity inspections table (new)

### New mutations needed:
- aircraft.updateTotalTime
- aircraft.inductAircraft (sets arrival timestamp + TT)
- workOrders.setCustomerFacingStatus
- taskCards.addStep (post-creation)
- taskCards.addSignatureFields (dedicated sign-off fields)
- parts.completeReceivingInspection
- parts.reserveForWorkOrder
- discrepancies.openDiscrepancy (enhanced with stepId, severity, photos)
- billing.addQuoteLineItem (enhanced with discrepancyId)
- billing.approveQuoteLineItems (per-line-item approval)

## Frontend Wave 2: Agents build UI (parallel)
- Agent A: Fleet/Aircraft/Induction pages
- Agent B: Task card creation + template + step enhancements
- Agent C: Parts receiving + inspection + reservation
- Agent D: Discrepancy + quote authorization enhancements
- Agent E: QA/RTS/Billing workflow fixes
