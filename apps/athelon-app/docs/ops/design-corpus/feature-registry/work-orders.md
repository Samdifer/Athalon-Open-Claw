# Work Orders - Feature Registry

## Design Direction

- Primary mode: `ICW`
- Secondary influences: document-centric review for RTS, release, certificates, and signatures
- Supporting influence: `CWP` for lead handoff and assignment edges

## Roles and Access

- Primary users:
  - `lead_technician`
  - `technician`
  - `shop_manager`
  - `qcm_inspector`
- Secondary users:
  - `admin`
  - `billing_manager` via downstream billing edges
  - `read_only` by direct route if linked, though nav exposure is inconsistent
- Current access reality:
  - `route-permissions.ts` allows `/work-orders/*` for `ALL_ROLES`
  - `mro-access.ts` models work-order access more narrowly through `work_orders.view`
  - `AppSidebar` exposes Work Orders mainly to execution and management roles
- Mismatch to track:
  - direct route access is broader than the intended execution audience

## Entry Points and Adjacent Surfaces

- Common entry points:
  - `/work-orders`
  - `/work-orders/dashboard`
  - `/work-orders/lead`
  - `/lead`
  - dashboard attention items
  - fleet detail and billing flows
- Common adjacent surfaces:
  - `/parts`
  - `/findings`
  - `/fleet/:tail`
  - `/billing/invoices/new`
  - `/compliance/*`

## Routes

- L1:
  - `/work-orders`
  - `/work-orders/dashboard`
  - `/work-orders/lead`
  - `/work-orders/handoff`
  - `/work-orders/kanban`
  - `/work-orders/new`
  - `/work-orders/templates`
- L2-L4:
  - `/work-orders/:id`
  - `/work-orders/:id/tasks/new`
  - `/work-orders/:id/tasks/:cardId`
  - `/work-orders/:id/findings/:discrepancyId`
  - `/work-orders/:id/records`
  - `/work-orders/:id/rts`
  - `/work-orders/:id/release`
  - `/work-orders/:id/certificates`
  - `/work-orders/:id/execution`
  - `/work-orders/:id/signature`

## Shell Dependencies

- Depends on `OrgContextProvider` for org and technician identity
- Uses global top-bar and command access for fast navigation back to Work Orders
- Detail pages depend on timer-related shell behavior via `GlobalTimerWidget`
- Detail page embeds shell-adjacent shared panels:
  - `HandoffNotesPanel`
  - `VoiceNotesPanel`
  - `CloseReadinessPanel`
- Route family assumes keyboard-heavy desktop use and deep in-app linking

## Data Dependencies

### Convex Queries

- Core work-order lifecycle:
  - `api.workOrders.getWorkOrdersWithScheduleRisk`
  - `api.workOrders.getWorkOrder`
  - `api.workOrders.getWorkOrderHistory`
  - `api.workOrders.getCloseReadiness`
  - `api.workOrders.resolveWorkOrderRef`
- Task execution:
  - `api.taskCards.listTaskCardsForWorkOrder`
  - `api.taskCards.getTaskCardHistory`
  - `api.taskAssignments.listByWorkOrder`
  - `api.taskCompliance.getComplianceItemsForTask`
  - `api.taskCompliance.getComplianceItemsForWorkOrder`
  - `api.taskCardVendorServices.getVendorServicesForTask`
  - `api.taskCardVendorServices.getVendorServicesForWorkOrder`
  - `api.taskStepReferences.listForTaskCard`
  - `api.taskStepPartTrace.listForTaskCard`
- Findings and narrative:
  - `api.discrepancies.listDiscrepancies`
  - `api.discrepancies.getDiscrepancyHistory`
  - `api.workItemEntries.listEntriesForTaskCard`
  - `api.workItemEntries.listEntriesForDiscrepancy`
- Compliance and records:
  - `api.returnToService.getCloseReadinessReport`
  - `api.releaseCertificates.listByWorkOrder`
  - `api.maintenanceRecords.listForWorkOrder`
  - `api.evidenceChecklists.listWorkOrderItems`
- Time and staffing:
  - `api.timeClock.getActiveTimerForTechnician`
  - `api.timeClock.getTimeEntriesForWorkOrder`
  - `api.timeClock.listActiveTimers`
  - `api.timeClock.listTimeEntries`
  - `api.technicians.getSelf`
  - `api.technicians.list`
  - `api.technicians.listWithExpiringCerts`
  - `api.technicianTraining.listByTechnician`
  - `api.training.listTrainingRecords`
- Planning and context:
  - `api.stationConfig.getWorkOrderStageConfig`
  - `api.shopLocations.list`
  - `api.maintenancePrograms.computeDueDates`
  - `api.maintenancePrograms.listByAircraftType`

### Convex Mutations and Actions

- Lifecycle and status:
  - `api.workOrders.createWorkOrder`
  - `api.workOrders.updateWorkOrderStatus`
  - `api.workOrders.updateScheduleFields`
  - `api.workOrders.createSignatureAuthEvent`
- Task execution:
  - `api.taskCards.createTaskCard`
  - `api.taskCards.completeStep`
  - `api.taskCards.signTaskCard`
  - `api.taskCards.signTaskCardInspector`
  - `api.taskCards.addHandoffNote`
  - `api.taskAssignments.assignTechToTask`
  - `api.taskAssignments.moveAssignment`
  - `api.taskCompliance.addComplianceItem`
  - `api.taskCompliance.updateComplianceStatus`
  - `api.taskCompliance.removeComplianceItem`
  - `api.taskCardVendorServices.addVendorServiceToTask`
  - `api.taskCardVendorServices.updateVendorServiceStatus`
  - `api.taskStepReferences.addReference`
  - `api.taskStepPartTrace.addTraceEvent`
  - `api.taskStepPartTrace.voidTraceEvent`
- Findings and closeout:
  - `api.discrepancies.openDiscrepancy`
  - `api.workItemEntries.addEntry`
  - `api.carryForwardItems.createFromWOClose`
- Evidence and documents:
  - `api.documents.generateUploadUrl`
  - `api.documents.saveDocument`
  - `api.documents.deleteDocument`
  - `api.fileStorage.storeFileMetadata`
  - `api.evidenceChecklists.ensureDefaultChecklistItems`
  - `api.evidenceChecklists.toggleWorkOrderItem`
- Time:
  - `api.timeClock.startTimer`
  - `api.timeClock.stopTimer`
- Release and RTS:
  - `api.returnToService.authorizeReturnToService`
  - `api.releaseCertificates.createReleaseCertificate`

### Cross-Feature Data

- Billing and customer context:
  - `api.customers.getCustomer`
  - `api.billingV4.listAllCustomers`
- Fleet and aircraft context:
  - `api.aircraft.list`
  - `api.adCompliance.checkAdDueForAircraft`
- Parts:
  - `api.parts.listParts`
- Personnel and training:
  - technician and training APIs listed above

## Cross-Feature Component Imports

- Imports part-request types from Parts:
  - `@/app/(app)/parts/_components/PartsRequestForm`
- Imports personnel time-management components in lead-adjacent execution contexts:
  - `@/app/(app)/personnel/time-management/_components/TeamOverviewTab`
  - `@/app/(app)/personnel/time-management/_components/TimeCorrectionsTab`

## Shared Component Usage

- Shared non-UI components seen in this route family:
  - `HandoffNotesPanel`
  - `VoiceNotesPanel`
  - `VoiceNoteRecorder`
  - `FindingDispositionDialog`
  - `CloseReadinessPanel`
  - `ExportCSVButton`
  - `ReturnPartDialog`
  - PDF-related components
- Shared UI primitives are used heavily throughout

## UI Patterns in Use

- List display:
  - card-row primary list
  - kanban route
  - three-mode toggle on list page: list, tiles, truncated
- Detail navigation:
  - full-page detail is dominant
  - deep drill-down to task cards and finding detail
- Forms:
  - card-based forms for create, handoff notes, task creation, signatures
- Status indicators:
  - standard badge system plus AOG accents and micro progress bars
- Filters and URL persistence:
  - search, tab filters, popover filters, local sort state
  - no broad URL-synced filter model yet
- Loading and empty states:
  - `usePagePrereqs`, `Skeleton`, `ActionableEmptyState`

## State Model

- Heavy local UI state on list and detail pages
- Detail tabs are controlled in the main detail page
- Dialog and sheet-like behavior is local to the route family
- Timer and evidence states mix local UI state with shared shell state
- Filter state is mostly local and resets on navigation

## Key Workflows by Role

- Technician:
  - open assigned work via My Work or Work Orders
  - enter a work order
  - open task card
  - run timer, execute steps, attach evidence, log findings, sign task card
- Lead technician:
  - triage work-order backlog
  - move between lead workspace, handoff, and work-order detail
  - assign work, monitor tasks, request parts, manage turnover report
- QCM inspector:
  - review compliance tab, evidence, findings, and release readiness
  - move to RTS, records, certificates, release, and signature moments
- Shop manager:
  - watch risk, promised delivery, and progress
  - jump between list, dashboard, kanban, and specific high-risk orders

## Critical Decisions and Safety Checks

- Close readiness and RTS eligibility
- Release authorization and signature capture
- Finding disposition and discrepancy resolution
- Compliance evidence completeness
- Timer context and labor attribution

## Redesign Notes

- This is the primary execution cockpit candidate for round 2
- Highest-value upgrades:
  - domain hooks for detail, list, lead, and adjacent task execution
  - shared timeline and readiness gate
  - denser task and parts tables
  - sheet-based drill-in for sub-entities instead of route-depth everywhere
  - exception-first queue treatment for blockers and pending signoff

## Surface Acceptance Criteria

- A later redesign must preserve all route-family edges, not only `/work-orders/:id`
- Task execution, findings, evidence, timer, and release edges must remain reachable
- No redesign may sever billing, parts, compliance, or fleet handoffs
- Route swap is blocked until work-order lifecycle and RTS guard tests pass

## Open Questions

- Should `/work-orders/handoff` remain in the work-order family or move fully under Lead Center?
- Should task-card detail remain a full route or become a sheet/drill-in on the main work-order canvas?
- Which read-only roles should have first-class work-order navigation versus deep-link-only access?
