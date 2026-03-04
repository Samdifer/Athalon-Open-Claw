# Pre-Signature Summary Component — Design & Implementation Spec
**Authors:** Chloe Park (Frontend), Finn [Design] (UX/Accessibility)
**Date:** 2026-02-22
**Wave:** 1 — Infrastructure Wiring
**Status:** SPEC — Implementation begins after Task Card Detail page is wired (frontend-wiring-plan.md §4, step 4)
**Priority:** HIGHEST — #1 cross-cutting requirement from all 10 interviews
**Ref:** requirements-synthesis.md Theme 1 (Pre-Signature Summary, 5/10 interviewees); mvp-scope.md Feature 2

---

## Why This Component Exists

Five of ten interviewees — Gary (DOM), Troy (A&P), Pat (IA), Dale (Avionics), and Felix (Sheet Metal) — independently described the same requirement without being asked a leading question: **before I put my name on something, I need to see exactly what I'm signing.** Not a summary. Not a preview. The complete record, rendered as it will look to an FAA inspector.

From the interviews:

- **Gary:** "I've seen mechanics sign things they couldn't read. The software is responsible for making that impossible."
- **Pat:** "The IA certificate is the thing I'm most protective of. If I'm authorizing return to service, I need to see the full record — aircraft, work performed, every discrepancy dispositioned. Before I put my PIN in."
- **Dale:** "In avionics work, the maintenance record is the legal document. I should be able to see the final format, not the form layout."
- **Felix:** "Show me what the record looks like after I sign it. Not the form I'm filling in. The record."
- **Troy:** "The sign button should make me pause. Not slow me down, but make it impossible to sign accidentally."

The SignOffFlow three-phase ceremony (confirm → PIN → submit) was built in Phase 3 and is already correct architecturally. What was missing is the **content of the confirm phase** — the pre-signature summary. This document specifies exactly what goes there.

---

## Section 1: Information Requirements

The pre-signature summary must show **all** of the following. Nothing is optional. Nothing is collapsed by default. The inspector sitting next to the signer should be able to read everything without scrolling to a hidden section.

### 1.1 — Record Identity

| Field | Source | Display |
|---|---|---|
| Record type | `recordType` on the document being signed | Displayed as a human-readable label: "Maintenance Record", "Task Card Step Sign-Off", "Return to Service Authorization", "Inspection Sign-Off" |
| Record ID | `_id` of the document | Short form: last 8 characters in `font-mono`. Full ID in `title` attribute for accessibility. Not the primary display — this is audit reference |
| Work order number | `workOrderNumber` from parent `workOrders` record | Prominent. Format: `WO-2026-001`. Always in `font-mono` per Finn's spec |
| Date and time of signing | Computed at render time (not stored until after PIN) | UTC ("Zulu") primary. Local time secondary in parentheses. Format: `2026-02-22 14:32 UTC (09:32 PST)` |

### 1.2 — Aircraft

| Field | Source | Display |
|---|---|---|
| Registration (N-number) | `aircraft.currentRegistration` | Large, prominent. `font-mono`. Normalized format (N12345, not N-12345) |
| Make and model | `aircraft.make` + `aircraft.model` | e.g. "Cessna 172S" |
| Serial number | `aircraft.serialNumber` | `font-mono` |
| Aircraft total time at signing | `workOrder.aircraftTotalTimeAtOpen` + any updates | Format: `"12,847.3 hours"`. This is the TT recorded on the work order, not a live query of the aircraft record. The distinction matters: the record is immutable at the time of signing |

### 1.3 — Work Performed

| Field | Source | Display |
|---|---|---|
| Work performed description | `maintenanceRecord.workPerformed` (for maintenance records) or step description (for task card steps) | Full text, no truncation. If it's 200 characters, show all 200 characters. If the signer hasn't written enough (< 50 chars for maintenance records per mvp-scope.md §Schema Changes), this is where they see the validation warning — before the PIN phase |
| Approved data reference | `maintenanceRecord.approvedDataReference` | Full text. "AMM Chapter 12, Section 12-11-00, Rev 2026-01" |
| Step number (for task card step sign-offs) | `taskCardStep.stepNumber` + `taskCard.title` | e.g. "Step 6 of 8 — Engine Compartment Inspection" |

### 1.4 — Regulatory References

| Field | Source | Display |
|---|---|---|
| Regulatory basis for the sign-off | Derived from `workOrder.workOrderType` and record type | Static mapped text (see §1.4.1 below) |
| Certificate requirement | Derived from step's `requiresIa` flag | "IA Certificate Required" banner if the step requires IA — displayed prominently, not as a footnote |

#### 1.4.1 — Regulatory Reference Text Mapping

These are static strings mapped from the record type. They are not stored in the database — they are display-only copy that Chloe hardcodes in the component.

| Context | Regulatory Text Displayed |
|---|---|
| Maintenance record creation | "This record is created pursuant to 14 CFR §43.9. Signing certifies that the work was performed in accordance with the approved data reference and applicable regulations." |
| Task card step sign-off (A&P) | "Signing this step certifies performance of the described work and compliance with the referenced data as an FAA-certificated mechanic pursuant to 14 CFR §65.81." |
| Task card step sign-off (IA) | "Signing this step as the Inspection Authorization holder certifies that the described work meets the standards required for return to service pursuant to 14 CFR §65.95." |
| Return to Service authorization | "Authorizing return to service as an IA holder pursuant to 14 CFR §43.9(a), §65.95, and §91.409. All nine preconditions have been verified by the system at this moment. This authorization is immutable." |
| Inspection record | "This inspection record is created pursuant to 14 CFR §43.11. Signing certifies the inspection was performed and the aircraft was found to be in (condition stated)." |

### 1.5 — Technician Identity Being Asserted

This section is critical. The signer must see exactly whose certificate they are asserting. Identity theft (signing as someone else, intentionally or due to a shared device/account) is a Part 145 compliance failure.

| Field | Source | Display |
|---|---|---|
| Full legal name | `user.name` from Clerk session claims | Large, bold. The name on their FAA certificate |
| Certificate type | `user.profile.certificateType` or `org.public_metadata.athelon_role` | e.g. "FAA A&P Mechanic" or "FAA Inspection Authorization Holder" |
| Certificate number | `user.profile.certificateNumber` | `font-mono`. If missing from profile, show a hard warning (see §3.3) |
| IA expiry date (IA holders only) | `user.profile.iaExpiryDate` | For IA sign-offs only. Shown as `"IA Certificate valid through 2026-10-01"`. If expired, hard block (not a warning — the sign button is disabled) |
| Organization | `org.name` from Clerk JWT claims | e.g. "Reid Aviation Services — KRHV" |
| Current UTC date/time | System clock (computed) | "You are signing at 14:32:07 UTC on 2026-02-22" — stated explicitly, not implied |

> **The "You are signing as" framing is intentional.** Every person who reviewed this in interviews responded positively to explicit identity assertion. "You are signing as [NAME], certificate [NUMBER]" is not bureaucratic — it is the moment of professional accountability. It should feel like it.

---

## Section 2: Component Structure

### 2.1 — Integration into SignOffFlow.tsx

The SignOffFlow has three phases (already built in Phase 3). The pre-signature summary occupies Phase 1 (confirm).

```
SignOffFlow.tsx
├── Phase 1: Confirm (PreSignatureSummary renders here)
│   ├── [Record Identity section]
│   ├── [Aircraft section]
│   ├── [Work Performed section]
│   ├── [Regulatory Reference section]
│   ├── [Technician Identity section]  ← "You are signing as..."
│   └── [Two CTAs: "PROCEED TO SIGN" and "Cancel"]
├── Phase 2: PIN Entry (existing phone-dialpad PIN input)
│   └── [6-digit PIN]
└── Phase 3: Submit (confirmation of signed state)
    └── [Immutable signed block]
```

**Current SignOffFlow.tsx Phase 1 state:**
The confirm phase currently shows placeholder copy ("Confirm your sign-off") with a basic button. The `PreSignatureSummary` component slots into this phase, replacing the placeholder content entirely.

**SignOffFlow.tsx change required:**
```typescript
// SignOffFlow.tsx — Phase 1 render
// BEFORE (placeholder):
{phase === "confirming" && (
  <div>
    <p>Confirm your sign-off</p>
    <button onClick={proceedToPin}>Proceed to Sign</button>
  </div>
)}

// AFTER (real component):
{phase === "confirming" && (
  <PreSignatureSummary
    recordType={recordType}
    recordId={recordId}
    workOrderId={workOrderId}
    onProceed={proceedToPin}
    onCancel={cancel}
  />
)}
```

### 2.2 — Component Props Interface

```typescript
// apps/web/components/sign-off/PreSignatureSummary.tsx

interface PreSignatureSummaryProps {
  /** The type of record being signed */
  recordType: "maintenance_record" | "task_card_step" | "return_to_service" | "inspection_record";
  
  /** The Convex ID of the record being signed */
  recordId: Id<"maintenanceRecords"> | Id<"taskCardSteps"> | Id<"returnToService"> | Id<"inspectionRecords">;
  
  /** The parent work order ID — used to fetch context */
  workOrderId: Id<"workOrders">;
  
  /** Called when user clicks "PROCEED TO SIGN" — advances SignOffFlow to PIN phase */
  onProceed: () => void;
  
  /** Called when user clicks "Cancel" — returns SignOffFlow to idle state */
  onCancel: () => void;
}
```

### 2.3 — Component File Structure

```
apps/web/components/sign-off/
├── PreSignatureSummary.tsx          ← Main component (this spec)
├── PreSignatureSummary.test.tsx     ← Unit tests
├── sections/
│   ├── RecordIdentitySection.tsx    ← §1.1
│   ├── AircraftSection.tsx          ← §1.2
│   ├── WorkPerformedSection.tsx     ← §1.3
│   ├── RegulatoryReferenceSection.tsx ← §1.4
│   └── TechnicianIdentitySection.tsx ← §1.5
└── SignOffFlow.tsx                  ← Existing — import PreSignatureSummary here
```

Sub-components are in a `sections/` directory because:
1. Each section is independently testable
2. Each section has distinct data requirements
3. Future record types may show different subsets of sections

### 2.4 — Full Component Markup Structure

```tsx
// PreSignatureSummary.tsx — simplified structure (not production code)

export function PreSignatureSummary({ recordType, recordId, workOrderId, onProceed, onCancel }: PreSignatureSummaryProps) {
  const summary = useQuery(api.signOff.getPreSignatureSummary, { recordType, recordId, workOrderId });
  
  // Loading state — see §3.1 for skeleton spec
  if (summary === undefined) return <PreSignatureSummarySkeleton />;
  
  // Error state — data required; sign button must remain disabled
  if (summary === null) return <PreSignatureSummaryError onCancel={onCancel} />;
  
  // Identity warning state — certificate number missing
  const hasCertNumber = Boolean(summary.technician.certificateNumber);
  
  return (
    <div
      role="region"
      aria-label="Sign-off summary — review before signing"
      className={cn(
        "rounded-lg border bg-white",
        // High-contrast border during IA sign-offs (red border = IA required)
        summary.requiresIa ? "border-red-600" : "border-gray-200",
      )}
    >
      {/* IA Required Banner — always at top if applicable */}
      {summary.requiresIa && (
        <div role="alert" className="bg-red-50 border-b border-red-600 px-4 py-2 rounded-t-lg">
          <span className="text-red-700 font-semibold text-sm">IA Certificate Required for this sign-off</span>
        </div>
      )}
      
      <div className="p-4 space-y-4">
        <RecordIdentitySection identity={summary.recordIdentity} />
        <AircraftSection aircraft={summary.aircraft} />
        <WorkPerformedSection workPerformed={summary.workPerformed} recordType={recordType} />
        <RegulatoryReferenceSection recordType={recordType} requiresIa={summary.requiresIa} />
        <TechnicianIdentitySection technician={summary.technician} />
      </div>
      
      {/* Actions */}
      <div className="border-t border-gray-200 p-4 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 h-14 rounded-md border border-gray-300 text-gray-700 text-base font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onProceed}
          disabled={!hasCertNumber || summary.isIaExpired}
          aria-disabled={!hasCertNumber || summary.isIaExpired}
          className={cn(
            "flex-1 h-14 rounded-md text-white text-base font-semibold",
            hasCertNumber && !summary.isIaExpired
              ? "bg-blue-600 active:bg-blue-700"
              : "bg-gray-300 cursor-not-allowed",
          )}
        >
          PROCEED TO SIGN
        </button>
      </div>
    </div>
  );
}
```

---

## Section 3: Data Fetching — Convex Query

### 3.1 — Query Name and Location

```typescript
// convex/signOff.ts (new file — created in Wave 2 by Devraj)
// Query: getPreSignatureSummary

export const getPreSignatureSummary = query({
  args: {
    recordType: v.union(
      v.literal("maintenance_record"),
      v.literal("task_card_step"),
      v.literal("return_to_service"),
      v.literal("inspection_record"),
    ),
    recordId: v.id("maintenanceRecords"), // TODO: expand to union type with other record IDs
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    // Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("UNAUTHENTICATED");
    
    // Fetch the work order (for WO number, aircraft, open TT)
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) throw new ConvexError("NOT_FOUND");
    
    // Fetch the aircraft
    const aircraft = await ctx.db.get(workOrder.aircraftId);
    if (!aircraft) throw new ConvexError("NOT_FOUND");
    
    // Fetch the specific record being signed
    const record = await ctx.db.get(args.recordId as Id<"maintenanceRecords">);
    
    // Fetch the signing user's profile
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .unique();
    
    // Compute IA expiry status
    const iaExpiryDate = user?.iaExpiryDate;
    const isIaExpired = iaExpiryDate ? new Date(iaExpiryDate) < new Date() : false;
    
    // Return the summary shape
    return {
      recordIdentity: {
        recordType: args.recordType,
        recordId: args.recordId,
        workOrderNumber: workOrder.workOrderNumber,
        // Step context for task card steps:
        stepNumber: record?.stepNumber ?? null,
        taskCardTitle: record?.taskCardTitle ?? null,
      },
      aircraft: {
        registration: aircraft.currentRegistration,
        make: aircraft.make,
        model: aircraft.model,
        serialNumber: aircraft.serialNumber,
        totalTimeAtOpen: workOrder.aircraftTotalTimeAtOpen,
      },
      workPerformed: {
        description: record?.workPerformed ?? record?.description ?? "",
        approvedDataReference: record?.approvedDataReference ?? null,
        minimumLengthMet: (record?.workPerformed?.length ?? 0) >= 50,
      },
      technician: {
        fullName: identity.name ?? user?.name ?? "Unknown",
        certificateType: identity.athelon_role ?? "unknown",
        certificateNumber: user?.certificateNumber ?? null,
        iaExpiryDate: iaExpiryDate ?? null,
        organizationName: identity.org_slug ?? "Unknown Organization",
      },
      requiresIa: record?.requiresIa ?? false,
      isIaExpired,
    };
  },
});
```

> **Note for Devraj:** The exact shape of the returned object is the contract between this query and `PreSignatureSummary.tsx`. Define the return type as a named TypeScript type in `convex/types/signOff.ts` so it can be imported in both the query and the component. Do not rely on `infer` alone — name the type explicitly so that if the shape changes, TypeScript surfaces the breakage in the component immediately.

### 3.2 — Real-time subscription behavior

`useQuery` in Convex is a live subscription. If the work order record changes while the summary is open (e.g., another user closes a discrepancy), the summary will re-render automatically. This is **correct behavior** for the summary phase — the signer should see the current state.

However, there is one edge case: if the summary re-renders while the signer is reading it (between Phase 1 and Phase 2), the content changes. This would be disorienting. Handle this with a stable snapshot: capture the summary data when Phase 1 opens and do not update it. Pass the snapshot into the component rather than re-subscribing continuously.

```typescript
// In SignOffFlow.tsx — capture snapshot when entering confirm phase
const [summarySnapshot, setSummarySnapshot] = useState<SignOffSummary | null>(null);
const liveSummary = useQuery(api.signOff.getPreSignatureSummary, { ... });

// Only capture the snapshot once (when entering confirm phase)
useEffect(() => {
  if (phase === "confirming" && liveSummary && !summarySnapshot) {
    setSummarySnapshot(liveSummary);
  }
}, [phase, liveSummary, summarySnapshot]);

// Pass the snapshot to the component, not the live query
<PreSignatureSummary summary={summarySnapshot} ... />
```

### 3.3 — Error States

| Condition | Display |
|---|---|
| `summary === undefined` (loading) | Skeleton with correct section heights — same structure as the real component, grey animated blocks. Do NOT use a spinner — spinners in the signing ceremony create the "spinner ambiguity" problem Troy called out (REQ-TW-06) |
| `summary === null` (not found or error) | Error state with "Unable to load sign-off summary. Do not proceed." in red. Cancel button only — no proceed button |
| `technician.certificateNumber === null` | Yellow warning banner: "Your certificate number is not on file. Contact your administrator before signing." Proceed button disabled |
| `isIaExpired === true` | Red banner: "Your IA certificate expired on [date]. You cannot authorize return to service or sign IA-required steps." Proceed button disabled. Hard block, not advisory |
| `workPerformed.minimumLengthMet === false` | Inline validation warning in the Work Performed section: "Work performed description must be at least 50 characters (14 CFR AC 43-9C). [Current length: X characters]." Proceed button disabled until resolved (user must go back and complete the description) |

---

## Section 4: Accessibility and Hangar-Condition Requirements

Tanya's glove-mode rules apply to this component without exception. The signing ceremony is the most high-stakes UX interaction in the entire product. If a mechanic in latex gloves can't complete it reliably in a hangar, the component has failed.

### 4.1 — Touch Targets

All interactive elements:
- Minimum height: **64px** (Tanya's spec, confirmed by REQ-TW-07 30-second budget)
- Minimum width: **100%** for primary actions (PROCEED TO SIGN, Cancel) — full-width buttons
- No interactive element smaller than **48x48px** anywhere in the component

"PROCEED TO SIGN" and "Cancel" buttons are **always full-width**. Not side-by-side on mobile. Stack them vertically on mobile (they are side-by-side on tablet/desktop):
```tsx
// Mobile: stack vertically
<div className="flex flex-col gap-3 sm:flex-row">
  <button className="w-full h-16">Cancel</button>
  <button className="w-full h-16">PROCEED TO SIGN</button>
</div>
```

### 4.2 — Typography

- Body text (work performed description, regulatory text): minimum **16px** (1rem)
- Prominent fields (name, WO number, N-number): minimum **20px** (1.25rem), semibold
- Certificate number, record ID: `font-mono`, minimum **16px**
- All text must pass WCAG AA contrast ratio (4.5:1 minimum for normal text, 3:1 for large text)
- No gray text lighter than `text-gray-700` on white backgrounds

### 4.3 — Readability in Bright Light

Hangar lighting is variable — direct sunlight through hangar doors, or dim fluorescent at night. The component must be readable in both.

- Background: **white only** (`bg-white`) — no off-white, no gray backgrounds for content sections
- Text: **near-black** (`text-gray-900` = #111827) for all primary content
- No low-contrast decorative elements that could obscure text
- The IA Required banner uses **red-50 background with red-700 text** — high contrast, readable in all lighting

### 4.4 — No Tooltips

Tooltips are not visible in gloves. All information must be statically displayed, not hover-dependent. This means:

- No information hidden behind a `title` attribute that only appears on hover (exception: the record ID short form may have `title` with the full ID — but the short form is still shown statically)
- No collapsible sections that default to closed — all sections open
- No "read more" truncation on any field

### 4.5 — Screen Reader Support

```tsx
// Each section has a region role and accessible name
<section aria-labelledby="work-performed-heading">
  <h3 id="work-performed-heading" className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
    Work Performed
  </h3>
  <p className="mt-2 text-base text-gray-900">{summary.workPerformed.description}</p>
</section>

// The proceed button communicates its state to screen readers
<button
  aria-label="Proceed to sign — enter PIN"
  aria-describedby="sign-warning"
  disabled={hasCertNumber === false}
>
  PROCEED TO SIGN
</button>
{!hasCertNumber && (
  <p id="sign-warning" role="alert" className="sr-only">
    Cannot proceed: certificate number not on file
  </p>
)}
```

### 4.6 — Minimum Interaction Time (Anti-Accidental-Sign)

The "PROCEED TO SIGN" button must be **unreachable for 2 seconds** after the component renders. This prevents tapping through the summary screen accidentally on mobile. Implementation:

```typescript
const [proceedEnabled, setProceedEnabled] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => setProceedEnabled(true), 2000);
  return () => clearTimeout(timer);
}, []);
```

During the 2-second delay, show a subtle countdown indicator on the button (not a full progress bar — just a dimming effect that resolves). Do NOT show a spinner. The button text remains "PROCEED TO SIGN" throughout.

> **Why 2 seconds, not more?** Pat said "30-second interaction budget for the entire sign flow" (REQ-TW-07). Troy said "make it impossible to sign accidentally, not slow me down." 2 seconds is enough to make double-tapping impossible while keeping the total flow under 30 seconds.

### 4.7 — Landscape Mode on Mobile Tablet

Mechanics use iPads and Android tablets in landscape orientation in the hangar. The pre-signature summary must not require vertical scrolling in landscape mode on a 768px-wide display.

- Maximum component height in landscape: `calc(100vh - 64px)` (full screen minus header)
- If content exceeds this, the content area (not the action buttons) gets `overflow-y-auto`
- Action buttons are always in a sticky footer, never scrolled out of view

```tsx
<div className={cn("flex flex-col", "max-h-[calc(100vh-64px)]")}>
  {/* Scrollable content region */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    {/* Sections */}
  </div>
  {/* Sticky action buttons — never scroll off screen */}
  <div className="border-t bg-white px-4 py-3 flex gap-3">
    {/* Buttons */}
  </div>
</div>
```

---

## Section 5: Variants by Record Type

The summary shows slightly different content depending on what's being signed:

| Record Type | Show Aircraft? | Show Work Performed? | Show Reg Reference? | Show IA Banner? |
|---|---|---|---|---|
| `maintenance_record` | ✅ Yes | ✅ Yes (full text, min 50 chars enforced) | ✅ Yes (§43.9) | ❌ No (unless step requires IA) |
| `task_card_step` (A&P) | ✅ Yes | ✅ Yes (step description) | ✅ Yes (§65.81) | ❌ No |
| `task_card_step` (IA required) | ✅ Yes | ✅ Yes (step description) | ✅ Yes (§65.95) | ✅ Yes — RED BANNER |
| `return_to_service` | ✅ Yes | ✅ Yes (summary of all work: all task cards complete, all discrepancies dispositioned) | ✅ Yes (§43.9 + §65.95 + §91.409) | ✅ Yes — RED BANNER |
| `inspection_record` | ✅ Yes | ✅ Yes | ✅ Yes (§43.11) | If IA required |

For the **Return to Service** sign-off, the "Work Performed" section expands to show a condensed close readiness summary:
- ✅ All task cards complete (N of N)
- ✅ All discrepancies dispositioned (N of N)
- ✅ Signed maintenance records (N records)
- ✅ AD compliance verified
- ✅ Aircraft TT reconciled

These are the same 9 preconditions from `authorizeReturnToService` — surfaced here so the IA can see they're all green before entering their PIN.

---

## Section 6: Testing Requirements

### Unit tests (Chloe writes — `PreSignatureSummary.test.tsx`)

1. **Renders all sections with mock data** — snapshot test
2. **Proceed button disabled for 2 seconds on mount** — timer test
3. **Proceed button disabled when `certificateNumber === null`** — prop test
4. **Proceed button disabled when `isIaExpired === true`** — prop test
5. **IA banner shown when `requiresIa === true`** — conditional render test
6. **Work performed warning shown when length < 50** — validation test
7. **Cancel button calls `onCancel`** — interaction test
8. **Proceed button calls `onProceed` after 2 seconds** — interaction + timer test
9. **Loading skeleton rendered when `summary === undefined`** — loading state test
10. **Error state rendered when `summary === null`** — error state test

### Integration test (Cilla runs as part of Smoke Test #3)

Full sign-off flow:
1. Navigate to a task card step
2. Click SIGN OFF
3. Assert PreSignatureSummary renders with correct aircraft N-number, work order number, technician name
4. Assert proceed button is disabled for 2 seconds
5. Assert proceed button becomes enabled
6. Click PROCEED TO SIGN
7. Assert PIN phase renders

---

## Open Questions

1. **Felix's "rendered final format" request (REQ-FO-07):** Felix asked for the summary to show the record as it will appear to an FAA inspector — final format, not form layout. The current spec shows the data, but not the "printed record" layout. We're deferring the "rendered final format" view (print preview) to v1.1. The pre-signature summary is the regulatory minimum for alpha. Need Finn's sign-off on this decision.

2. **Parts replaced on maintenance records:** Should the pre-signature summary show the parts array (P/N, S/N, 8130-3 reference)? Linda and Pat would both say yes. This would require `maintenanceRecord.partsReplaced` to be fetched and rendered. Propose: include parts in the summary for `maintenance_record` type. Devraj to confirm the query can join this efficiently.

3. **Photo attachments (v1.1):** When photo attachments are added to records, the pre-signature summary must show thumbnail(s). Not in scope for alpha. Architect the component with a nullable `attachments` slot so this can be added without restructuring.

4. **Amendment / correction records:** When someone is signing a `correction` record (linked to an original signed record), should the summary show both the original and the correction? Propose: yes — show the original record ID as "Correcting: [ID]" with a clear label. Regulatory standard (per Linda) is that the original must remain visible.

---

*Chloe Park + Finn — 2026-02-22*
*This component is the moment of professional accountability made visible. Build it like it matters. Because for the people using it, it does.*
