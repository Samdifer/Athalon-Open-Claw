# Frontend Wiring Diff Plan — Alpha

Execution plan for immediate implementation with minimal breakage.

## Priority order (minimize regressions)
1. **Generate Convex API/types first** (`npx convex dev --once`)  
2. **Wire `QcmReviewPanel.tsx` mutation path** (localized change)  
3. **Wire `MaintenanceRecordForm.tsx` mutation path + enum mapper**  
4. **Wire `qcm-review/page.tsx` query import path** (only after backend query exists)  
5. **Run typecheck + grep cleanup**

---

## 1) `web/components/QcmReviewPanel.tsx`

## Before
```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;
type Id<_T extends string> = string;

// const createQcmReview = useMutation(api.qcmReviews.createQcmReview);
const createQcmReviewStub = async (_args: {
  workOrderId: Id<"workOrders">;
  technicianId: Id<"technicians">;
  outcome: string;
  findingsNotes: string | null;
  signatureAuthEventId: string;
}) => { ... }
```

## After
```ts
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";

const createQcmReview = useMutation(api.wave_2_mutations.createQcmReview);

await createQcmReview({
  workOrderId,
  organizationId,
  reviewerTechnicianId: currentTechnicianId,
  outcome,
  findingsNotes: findingsNotes.trim() || undefined,
  signatureAuthEventId,
});
```

## Required companion diff
- Add `organizationId` to `QcmReviewPanelProps`
- Thread prop from page/container into `QcmReviewForm`

---

## 2) `web/components/MaintenanceRecordForm.tsx`

## Before
```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;
type Id<_T extends string> = string;

// await createRecord({...})
await new Promise((r) => setTimeout(r, 600));
const stubRecordId: Id<"maintenanceRecords"> = "stub-maintenance-record-" + Date.now();
onSuccess?.(stubRecordId);
```

## After
```ts
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";

const createMaintenanceRecord = useMutation(
  api.wave_2_mutations.createMaintenanceRecord
);

const result = await createMaintenanceRecord({
  workOrderId,
  organizationId,
  taskCardId: taskCardId ?? undefined,
  recordType: "maintenance_43_9",
  workPerformed: workPerformed.trim(),
  approvedDataRef: {
    docType: mapDocTypeToBackend(approvedData.docType),
    identifier: approvedData.identifier.trim(),
    revision: approvedData.revision.trim(),
    section: approvedData.section.trim() || undefined,
  },
  testEquipmentUsed: selectedEquipment.map((id) => ({ testEquipmentId: id })),
  completionDate: new Date(completionDate).getTime(),
  returnedToService: false,
  ratingsExercised: deriveRatingsExercised(signerCertType),
  callerTechnicianId: currentTechnicianId,
  signatureAuthEventId,
});

onSuccess?.(result.maintenanceRecordId);
```

## Required companion diff
- Add prop `organizationId: Id<"organizations">`
- Add `mapDocTypeToBackend()` helper to reconcile frontend enum vs backend validator

---

## 3) `web/app/(app)/work-orders/[id]/qcm-review/page.tsx`

## Before
```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {} as any;
function useQuery<T>(_ref: unknown, _args?: unknown): T | null | undefined {
  return undefined;
}
type Id<_T extends string> = string;

const result = useQuery<GetWorkOrderForQcmReviewResult>(
  api.workOrders?.getWorkOrderForQcmReview,
  workOrderId ? { workOrderId } : "skip",
);
```

## After
```ts
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";

const result = useQuery(
  api.workOrders.getWorkOrderForQcmReview,
  workOrderId ? { workOrderId } : "skip",
);
```

## Blocked until backend adds query
- `api.workOrders.getWorkOrderForQcmReview` does not exist in current `wave-2-mutations.ts`.

---

## 4) Critical mapper diff (enum mismatch fix)

## Before
```ts
approvedDataRef: {
  docType: approvedData.docType,
  ...
}
```

## After
```ts
function mapDocTypeToBackend(v: ApprovedDocType):
  "AMM"|"CMM"|"SRM"|"AD"|"SB"|"AC"|"ICA"|"TCDS"|"STC"|"other" {
  switch (v) {
    case "FAA_AC": return "AC";
    case "Other": return "other";
    case "MMPL":
    case "Manufacturer_Letter":
      return "other";
    default:
      return v as any;
  }
}
```

(Replace `as any` in final implementation with explicit exhaustive mapping.)

---

## Rollback plan if regressions appear

1. **Feature flag at call site**
   - Wrap real mutation call behind `NEXT_PUBLIC_USE_REAL_CONVEX_WIRING === "true"`.
   - If regression: flip flag false, revert to stub behavior temporarily for demo continuity.

2. **Revert granularity**
   - Revert in this order only:
     1) `qcm-review/page.tsx` query wiring
     2) `MaintenanceRecordForm.tsx` submit wiring
     3) `QcmReviewPanel.tsx` submit wiring
   - Keep import/type cleanup where non-breaking.

3. **Data safety guard**
   - Do not roll back backend mutation validations.
   - If frontend breaks, disable entry points (buttons/routes) rather than bypassing backend invariants.

4. **Verification after rollback**
   - Confirm no runtime crashes on affected routes
   - Confirm legal signing actions are blocked rather than partially submitted

---

## Final done criteria
- No `{} as any` in web app/components source
- No local `type Id = string` stubs in wired files
- `tsc --noEmit` clean in web package
- QCM submit and maintenance record submit use real `useMutation`
- `/work-orders/[id]/qcm-review` fetch path wired to real Convex query (once backend exists)