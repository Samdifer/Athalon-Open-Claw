# Frontend Final Wiring — Alpha

Date: 2026-02-22  
Owners: Chloe Park (frontend), Devraj Anand (Convex), Jonas Harker (infra/types generation)

## Scope audited
- `phase-5-implementation/web/components/QcmReviewPanel.tsx`
- `phase-5-implementation/web/components/MaintenanceRecordForm.tsx`
- `phase-5-implementation/web/app/(app)/work-orders/[id]/qcm-review/page.tsx`
- Cross-checked against `phase-5-implementation/convex/wave-2-mutations.ts`

---

## 1) File-by-file checklist for every `{} as any` replacement

## A. `web/components/QcmReviewPanel.tsx`
### Replace
- `const api = {} as any;`

### With
```ts
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
```

### Wire mutation call
Current stub function in `QcmReviewForm`:
- `createQcmReviewStub(...)`

Replace with real Convex mutation ref:
```ts
const createQcmReview = useMutation(api.wave_2_mutations.createQcmReview);
```

Then call:
```ts
await createQcmReview({
  workOrderId,
  organizationId,              // add as prop/input
  reviewerTechnicianId: currentTechnicianId,
  outcome,
  findingsNotes: findingsNotes.trim() || undefined,
  signatureAuthEventId,
});
```

### Required prop additions
`QcmReviewPanelProps` must include:
- `organizationId: Id<"organizations">`

Reason: backend `createQcmReview` requires `organizationId`.

---

## B. `web/components/MaintenanceRecordForm.tsx`
### Replace
- `const api = {} as any;`

### With
```ts
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
```

### Wire mutation call
Replace stubbed submit path (`setTimeout` + fake ID) with:
```ts
const createMaintenanceRecord = useMutation(
  api.wave_2_mutations.createMaintenanceRecord
);
```

Call shape must match backend exactly:
```ts
const result = await createMaintenanceRecord({
  workOrderId,
  organizationId,                    // add prop
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
```

Use `result.maintenanceRecordId` for `onSuccess`.

### Required prop additions
`MaintenanceRecordFormProps` must include:
- `organizationId: Id<"organizations">`

Reason: backend mutation requires it and no fallback exists.

---

## C. `web/app/(app)/work-orders/[id]/qcm-review/page.tsx`
### Replace
- `const api = {} as any;`
- local `useQuery` stub function

### With
```ts
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
```

### Query wiring
Current expected query is:
- `api.workOrders.getWorkOrderForQcmReview` (not implemented in `wave-2-mutations.ts`)

Action:
- Keep call site target as `api.workOrders.getWorkOrderForQcmReview` **only after Devraj adds real query file/export**.
- Until then, this route is blocked on backend query availability.

---

## 2) Exact generated API paths/functions to use

Based on current backend file `convex/wave-2-mutations.ts`, generated API namespace will be:
- `api.wave_2_mutations.*`

Use these exact refs now:
- `api.wave_2_mutations.createMaintenanceRecord`
- `api.wave_2_mutations.createQcmReview`
- `api.wave_2_mutations.getPreSignatureSummary`
- `api.wave_2_mutations.getWorkOrderCloseReadinessV2`
- `api.wave_2_mutations.receiveTestEquipment`

**Important mismatch currently in frontend comments:**
- `api.qcmReviews.createQcmReview` → not valid with current backend file layout
- `api.maintenanceRecords.createMaintenanceRecord` → not valid with current backend file layout
- `api.workOrders.getWorkOrderForQcmReview` → not present in current backend file at all

---

## 3) Type mismatch fixes required after wiring

## A) Enum/doc-type mapping mismatch (hard failure)
Frontend `ApprovedDocType` values differ from backend validator:
- Frontend has: `FAA_AC`, `MMPL`, `Manufacturer_Letter`, `Other`, etc.
- Backend accepts: `AC`, `STC`, `other`, etc.

### Required fix
Add explicit mapper:
- `FAA_AC -> AC`
- `Other -> other`
- Unsupported frontend-only options (`MMPL`, `Manufacturer_Letter`) must map to `other` and include detail in `identifier`.

---

## B) ID type stubs to generated `Id<>`
Replace all local:
```ts
type Id<_T extends string> = string;
```
with imported generated `Id` from `@/convex/_generated/dataModel`.

---

## C) Nullable fields from `getPreSignatureSummary`
Backend returns nullable values that current `PreSignatureSummaryData` types mark as non-null:
- `aircraft.registration` can be `null`
- `technician.certificateType` can be `null`
- `technician.technicianId`, `organizationId` may be `null`

### Required fix
Either:
1. Update `PreSignatureSummaryData` to nullable-compatible types, or
2. Add adapter layer before passing into `PreSignatureSummary` to normalize nulls to display-safe defaults.

---

## D) QCM role semantic mismatch
`QcmReviewPanel` uses:
- `isQcm = role === "inspector"`

Confirm with auth-role canonical mapping; if backend/ACL expects a dedicated `qcm` role later, this will break authorization expectations. Owner: Chloe + Devraj.

---

## E) Mutation args mismatch for QCM submit
Current form only has `workOrderId`, `technicianId`, `outcome`, `findingsNotes`, `signatureAuthEventId`.
Backend also requires:
- `organizationId`

Must be included end-to-end.

---

## 4) Final verification criteria

## `rg '{} as any'`
Expected pass condition:
- No matches in `phase-5-implementation/web/**` app/components code.
- Informational matches allowed in docs (`*.md`) only.

Equivalent pass expectation:
- code files: `0`
- markdown docs: any

## `tsc --noEmit`
Expected pass condition:
- Zero TS errors in web package after Convex generation (`npx convex dev --once` at minimum).
- Specifically no errors for:
  - missing `@/convex/_generated/api`
  - missing mutation/query refs under wrong namespaces
  - enum incompatibility for `approvedDataRef.docType`
  - missing required `organizationId` args

---

## 5) Remaining blockers and owners

1. **Missing query for QCM page aggregate payload** (`getWorkOrderForQcmReview`)  
   - Owner: Devraj  
   - Blocker level: hard blocker for `/qcm-review` route runtime

2. **Namespace mismatch risk due single file `wave-2-mutations.ts`**  
   - Owner: Devraj + Chloe  
   - Decision needed: keep `api.wave_2_mutations.*` OR split into domain files (`qcmReviews.ts`, `maintenanceRecords.ts`) and update frontend refs

3. **Convex generated files availability** (`_generated/api.ts`, `_generated/dataModel.ts`)  
   - Owner: Jonas (infra), then Chloe consumes  
   - Required command: `npx convex dev --once` (or running watcher)

4. **SignOffFlow/PIN integration for real `signatureAuthEventId`** in both forms  
   - Owner: Chloe  
   - Current state: still placeholder/stub path

---

## 6) Binary verdict

**Ready for staging demo: NO**

Reason: hard blockers remain (missing `getWorkOrderForQcmReview`, required arg/type mismatches, and unresolved namespace alignment for generated API refs).