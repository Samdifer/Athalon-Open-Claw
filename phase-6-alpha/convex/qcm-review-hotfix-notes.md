# QCM Review Hotfix Notes

## 1) Expected frontend import path and api ref

Because this hotfix is in:
- `phase-6-alpha/convex/qcm-review-hotfix.ts`

Convex generated API path will be:
- `api.qcm_review_hotfix.getWorkOrderForQcmReview`

Frontend wiring in:
- `phase-5-implementation/web/app/(app)/work-orders/[id]/qcm-review/page.tsx`

must switch from:
- `api.workOrders.getWorkOrderForQcmReview`

to:
- `api.qcm_review_hotfix.getWorkOrderForQcmReview`

---

## 2) Return shape contract (TypeScript)

```ts
interface ApprovedDataRef {
  docType: string;
  identifier: string;
  revision: string;
  section: string;
}

interface MaintenanceRecordSummary {
  id: Id<"maintenanceRecords">;
  recordType: "maintenance_43_9" | "inspection_43_11" | "correction";
  workPerformed: string;
  approvedDataReference: string;
  approvedDataRefStructured: ApprovedDataRef | null;
  completionDate: number;
  signingTechnicianLegalName: string;
  signingTechnicianCertNumber: string;
  signatureTimestamp: number;
  partsCount: number;
  testEquipmentCount: number;
}

interface TaskCardSignOffSummary {
  taskCardId: Id<"taskCards">;
  taskCardNumber: string;
  taskCardTitle: string;
  completedAt: number | null;
  stepCount: number;
  completedStepCount: number;
  steps: Array<{
    stepId: Id<"taskCardSteps">;
    stepNumber: number;
    description: string;
    status: "pending" | "completed" | "na";
    signedByName: string | null;
    signedCertNumber: string | null;
    signedAt: number | null;
    requiresIa: boolean;
  }>;
}

interface ExistingQcmReview {
  id: Id<"qcmReviews">;
  reviewerLegalName: string;
  reviewerCertificateNumber: string;
  reviewTimestamp: number;
  outcome: "accepted" | "findings_noted" | "requires_amendment";
  findingsNotes: string | null;
  signatureHash: string;
}

interface WorkOrderForQcmReview {
  id: Id<"workOrders">;
  workOrderNumber: string;
  status: string;
  workOrderType: string;
  description: string;
  openedAt: number;
  closedAt: number | null;
  aircraftRegistration: string;
  aircraftMake: string;
  aircraftModel: string;
  aircraftTotalTimeAtClose: number | null;
  organizationName: string;
}

interface CurrentTechnicianContext {
  technicianId: Id<"technicians">;
  organizationId: Id<"organizations">;
  isQualityControlManager: boolean;
  isDirectorOfMaintenance: boolean;
  qualityControlManagerId: Id<"technicians"> | null;
  directorOfMaintenanceId: Id<"technicians"> | null;
}

interface GetWorkOrderForQcmReviewResult {
  workOrder: WorkOrderForQcmReview;
  maintenanceRecords: MaintenanceRecordSummary[];
  taskCards: TaskCardSignOffSummary[];
  existingReview: ExistingQcmReview | null;
  currentTechnicianId: Id<"technicians">;
  currentTechnicianContext: CurrentTechnicianContext;
}
```

Behavior note:
- Query returns `null` when work order is not found, caller has no linked technician, or org scope fails.

---

## 3) Required frontend adjustments

1. Replace query ref in qcm-review page:
   - `api.workOrders.getWorkOrderForQcmReview`
   - → `api.qcm_review_hotfix.getWorkOrderForQcmReview`

2. Regenerate Convex client types after adding the hotfix file:
   - `npx convex dev --once` (or normal watcher)

3. Optional but recommended:
   - Extend page-local `GetWorkOrderForQcmReviewResult` interface to include
     `currentTechnicianContext` if frontend wants backend-backed role/identity gating
     beyond current `useOrgRole` logic.

---

## 4) Binary verdict

**QCM route unblocked: YES (with one required frontend api ref update).**

Without that single ref update, runtime remains blocked by unresolved query path.
