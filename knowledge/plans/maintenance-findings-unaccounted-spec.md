# Unaccounted Maintenance Findings Specification

**Date:** 2026-03-08
**Author:** Opus Team C
**Status:** Implementation-Ready Spec
**Commit tag:** opus-c

---

## 1. Problem Statement

Athelon tracks **discrepancies** (found during active WOs) and **AD compliance** (regulatory directives with due-date tracking), but has no unified concept of a **maintenance finding** that exists *before* it becomes a work order or compliance event. Specifically:

1. **AD/SB items discovered but not yet triaged** — an AD is identified as potentially applicable but no `adCompliance` record exists yet, or an SB is received but not evaluated.
2. **Predicted maintenance** — `maintenancePredictions` surface TBO/trend alerts but have no formal path to become work orders or compliance events.
3. **Carry-forward items** — `carryForwardItems` capture deferred work at WO close, but lack lifecycle governance (aging, SLA tracking, re-triage).
4. **External findings** — inspector write-ups, customer-reported issues, and FAA audit findings that arrive outside a WO context.

These are **unaccounted findings**: items the shop knows about but hasn't formally dispositioned into the maintenance workflow. Without tracking, they create regulatory exposure (missed ADs), revenue leakage (unfollowed predictions), and audit risk.

---

## 2. Data Model

### 2.1 New Table: `maintenanceFindings`

```
maintenanceFindings: defineTable({
  organizationId: v.id("organizations"),
  aircraftId: v.id("aircraft"),

  // ── Identity ──
  findingNumber: v.string(),          // Auto-generated: MF-YYYY-NNNN
  title: v.string(),
  description: v.string(),

  // ── Classification ──
  findingType: v.union(
    v.literal("ad_identified"),        // New AD discovered, applicability TBD
    v.literal("sb_received"),          // Service bulletin received
    v.literal("predicted_maintenance"),// From maintenancePredictions
    v.literal("carry_forward"),        // Deferred from prior WO
    v.literal("inspector_writeup"),    // External inspector finding
    v.literal("customer_report"),      // Operator/customer reported issue
    v.literal("audit_finding"),        // FAA/internal audit finding
    v.literal("other"),
  ),

  severity: v.union(
    v.literal("critical"),    // Immediate grounding risk
    v.literal("high"),        // Must address within regulatory window
    v.literal("medium"),      // Address at next scheduled event
    v.literal("low"),         // Informational / optional SB
  ),

  // ── Lifecycle ──
  status: v.union(
    v.literal("new"),                  // Just received / discovered
    v.literal("under_review"),         // Being evaluated for applicability/action
    v.literal("deferred"),             // Intentionally deferred with justification
    v.literal("scheduled"),            // Linked to upcoming WO/compliance event
    v.literal("in_progress"),          // Active work underway
    v.literal("closed_resolved"),      // Completed — evidence linked
    v.literal("closed_not_applicable"),// Evaluated and determined N/A
    v.literal("superseded"),           // Replaced by newer finding or AD revision
  ),

  // ── Regulatory Context ──
  regulatoryBasis: v.optional(v.union(
    v.literal("14cfr_part39"),     // AD (14 CFR § 39)
    v.literal("14cfr_part43"),     // Maintenance records
    v.literal("14cfr_part91"),     // Operator responsibility
    v.literal("14cfr_part135"),    // Air carrier maintenance
    v.literal("14cfr_part145"),    // Repair station
    v.literal("manufacturer_sb"),  // OEM service bulletin
    v.literal("none"),             // No regulatory mandate
  )),

  complianceDeadline: v.optional(v.number()),   // Hard regulatory deadline (ms)
  complianceDeadlineHours: v.optional(v.number()),
  complianceDeadlineCycles: v.optional(v.number()),

  // ── Source Linkage ──
  sourceType: v.union(
    v.literal("ad_compliance"),
    v.literal("prediction"),
    v.literal("carry_forward"),
    v.literal("discrepancy"),
    v.literal("external"),
    v.literal("manual"),
  ),
  sourceId: v.optional(v.string()),         // ID of originating record
  sourceTable: v.optional(v.string()),      // e.g. "maintenancePredictions"

  // ── Resolution Linkage ──
  resolvedByWorkOrderId: v.optional(v.id("workOrders")),
  resolvedByAdComplianceId: v.optional(v.id("adCompliance")),
  resolvedByMaintenanceRecordId: v.optional(v.id("maintenanceRecords")),

  // ── Deferral ──
  deferralJustification: v.optional(v.string()),
  deferralApprovedById: v.optional(v.string()),
  deferralApprovedAt: v.optional(v.number()),
  deferralExpiresAt: v.optional(v.number()),  // Deferral cannot be indefinite

  // ── Supersession ──
  supersededByFindingId: v.optional(v.id("maintenanceFindings")),
  supersedesFindingId: v.optional(v.id("maintenanceFindings")),

  // ── Evidence ──
  evidenceDocumentIds: v.array(v.string()),   // References to uploaded docs
  evidenceNotes: v.optional(v.string()),

  // ── Assignment ──
  assignedToUserId: v.optional(v.string()),
  assignedAt: v.optional(v.number()),

  // ── Timestamps ──
  discoveredAt: v.number(),      // When finding was first identified
  triageDeadline: v.optional(v.number()),  // SLA: must be reviewed by this time
  createdAt: v.number(),
  updatedAt: v.number(),
  closedAt: v.optional(v.number()),
})
  .index("by_org_status", ["organizationId", "status"])
  .index("by_aircraft_status", ["aircraftId", "status"])
  .index("by_org_type", ["organizationId", "findingType"])
  .index("by_org_severity", ["organizationId", "severity"])
  .index("by_compliance_deadline", ["organizationId", "complianceDeadline"])
  .index("by_source", ["sourceTable", "sourceId"])
```

### 2.2 Companion Table: `maintenanceFindingEvents`

Append-only audit trail for every finding state change. Mirrors the `complianceLedgerEvents` pattern already in use.

```
maintenanceFindingEvents: defineTable({
  organizationId: v.id("organizations"),
  findingId: v.id("maintenanceFindings"),
  eventType: v.string(),          // "status_change", "assignment", "deferral", "evidence_added"
  previousState: v.optional(v.string()),  // JSON
  nextState: v.optional(v.string()),      // JSON
  actorUserId: v.string(),
  notes: v.optional(v.string()),
  occurredAt: v.number(),
  createdAt: v.number(),
})
  .index("by_finding", ["findingId", "occurredAt"])
  .index("by_org_occurred", ["organizationId", "occurredAt"])
```

---

## 3. Lifecycle State Machine

```
                ┌─────────────┐
                │     new      │
                └──────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │ under_review   │
              └───┬──────┬─────┘
                  │      │
         ┌────────┘      └────────────┐
         ▼                            ▼
  ┌─────────────┐           ┌────────────────────┐
  │  deferred   │           │ closed_not_applicable│
  └──────┬──────┘           └────────────────────┘
         │ (deferral expires
         │  or re-triaged)
         ▼
  ┌─────────────┐
  │  scheduled   │◄──── (from under_review directly)
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ in_progress  │
  └──────┬──────┘
         │
         ▼
  ┌────────────────┐
  │ closed_resolved │
  └────────────────┘

  Any non-terminal state → superseded (when a newer AD/SB replaces this finding)
```

### 3.1 Transition Rules

| From | To | Guard |
|------|-----|-------|
| `new` | `under_review` | Assigned reviewer required |
| `under_review` | `deferred` | `deferralJustification` + `deferralApprovedById` required |
| `under_review` | `scheduled` | `resolvedByWorkOrderId` required (WO created/linked) |
| `under_review` | `closed_not_applicable` | `evidenceNotes` required explaining N/A determination |
| `deferred` | `under_review` | Re-triage (deferral expired or manual) |
| `deferred` | `scheduled` | WO created from deferred item |
| `scheduled` | `in_progress` | Linked WO status is `open` or `in_work` |
| `in_progress` | `closed_resolved` | Evidence linkage required (WO closed, maintenance record, or AD compliance entry) |
| `*` (non-terminal) | `superseded` | `supersededByFindingId` required |

### 3.2 Terminal States

- `closed_resolved` — Work completed, evidence linked
- `closed_not_applicable` — Evaluated and determined not actionable
- `superseded` — Replaced by another finding

Terminal states are **immutable** — no further transitions allowed.

---

## 4. Edge-Case Rules

### 4.1 Deferral Rules

1. **Deferral requires justification** — `deferralJustification` cannot be empty.
2. **Deferral requires approval** — `deferralApprovedById` must be a user with DOM/QCM/IA role.
3. **Deferral has expiry** — `deferralExpiresAt` is mandatory. Default: 90 days for medium, 30 days for high severity. Critical severity cannot be deferred.
4. **Expired deferrals auto-escalate** — A scheduled job moves expired deferrals back to `under_review` with severity bumped one level (medium→high, high→critical).
5. **No double-deferral** — A finding that was previously deferred and returned to `under_review` can only be deferred again with DOM-level approval.

### 4.2 Overdue Rules

1. **Compliance deadline breached** — When `complianceDeadline < now` and status is not terminal, the finding is flagged `overdue`.
2. **Overdue is a computed property**, not a status. Derived from `complianceDeadline`, `complianceDeadlineHours` (vs. current aircraft hours), or `complianceDeadlineCycles` (vs. current aircraft cycles).
3. **Overdue notifications** — Trigger alert events at 30-day, 14-day, 7-day, and 0-day windows before compliance deadline.
4. **Overdue blocks aircraft release** — Any overdue finding with `regulatoryBasis` in `["14cfr_part39", "14cfr_part43"]` creates a hard RTS block per existing `returnToService` precondition pattern.

### 4.3 Evidence Requirements

1. **Resolution evidence** — `closed_resolved` requires at least one of:
   - `resolvedByWorkOrderId` (WO completed)
   - `resolvedByAdComplianceId` (AD compliance entry recorded)
   - `resolvedByMaintenanceRecordId` (maintenance record created)
2. **N/A evidence** — `closed_not_applicable` requires `evidenceNotes` explaining the determination, plus optionally uploaded supporting documents.
3. **Evidence immutability** — Once a finding reaches a terminal state, `evidenceDocumentIds` and `evidenceNotes` cannot be modified.

### 4.4 Supersession Rules

1. **AD supersession** — When a new AD supersedes an old one (via `airworthinessDirectives.supersededByAdId`), any `ad_identified` finding referencing the old AD should be automatically superseded, with a new finding created for the replacement AD.
2. **SB supersession** — Manual process; requires a user to link the superseding finding.
3. **Chain integrity** — `supersededByFindingId` and `supersedesFindingId` must form a consistent bidirectional link (same pattern as `airworthinessDirectives`).

### 4.5 Predicted Maintenance Conversion

1. **Auto-finding creation** — When a `maintenancePrediction` is created with `severity >= high`, an `maintenanceFinding` of type `predicted_maintenance` is auto-created with `sourceType: "prediction"` and `sourceId` referencing the prediction.
2. **Prediction-to-WO conversion** — When a predicted finding is scheduled (linked to a WO), the source prediction status moves to `scheduled`.
3. **Prediction resolution** — When the finding is `closed_resolved`, the prediction moves to `resolved`.
4. **Dismissed predictions** — If a prediction is dismissed, the finding moves to `closed_not_applicable`.

---

## 5. FAR-Aware Control Mapping (High-Level)

| FAR Reference | Control | Finding Enforcement |
|---------------|---------|-------------------|
| **14 CFR § 39.3** | No operation with unapplied AD | `ad_identified` findings with `regulatoryBasis: "14cfr_part39"` create RTS hard blocks when overdue |
| **14 CFR § 43.9** | Maintenance record content | `closed_resolved` requires linked `maintenanceRecordId` with complete sign-off chain |
| **14 CFR § 43.11** | Content of records | Finding closure evidence must include approved data reference per existing `ApprovedDataRef` component pattern |
| **14 CFR § 91.417** | Record retention | `maintenanceFindingEvents` are append-only and immutable; no deletion path |
| **14 CFR § 91.403** | Owner responsibility | `customer_report` and `inspector_writeup` findings establish documented awareness |
| **14 CFR § 135.439** | Maintenance recording | Findings in Part 135 context (`regulatoryBasis: "14cfr_part135"`) require additional approval gates |
| **14 CFR § 145.209** | Repair station manual | Finding triage and deferral procedures must align with documented RSM procedures |
| **14 CFR § 145.211** | Quality control | `deferralApprovedById` must hold QC/QCM authority per org role configuration |

### 5.1 RTS Integration

The existing `returnToService` precondition checks (in `convex/returnToService.ts`) should be extended:

```typescript
// New precondition: No overdue maintenanceFindings
const overdueFindings = await ctx.db
  .query("maintenanceFindings")
  .withIndex("by_aircraft_status", q =>
    q.eq("aircraftId", aircraftId)
  )
  .filter(q =>
    q.and(
      q.neq(q.field("status"), "closed_resolved"),
      q.neq(q.field("status"), "closed_not_applicable"),
      q.neq(q.field("status"), "superseded"),
      q.or(
        q.lt(q.field("complianceDeadline"), Date.now()),
        // hours/cycles comparison requires live aircraft data
      )
    )
  )
  .collect();

if (overdueFindings.length > 0) {
  blocks.push({
    type: "overdue_maintenance_findings",
    message: `${overdueFindings.length} overdue maintenance finding(s) must be resolved before RTS`,
    findingIds: overdueFindings.map(f => f._id),
  });
}
```

---

## 6. Mutation Contracts

### 6.1 `createFinding`

```typescript
args: {
  organizationId: Id<"organizations">,
  aircraftId: Id<"aircraft">,
  title: string,
  description: string,
  findingType: FindingType,
  severity: Severity,
  regulatoryBasis?: RegulatoryBasis,
  complianceDeadline?: number,
  complianceDeadlineHours?: number,
  complianceDeadlineCycles?: number,
  sourceType: SourceType,
  sourceId?: string,
  sourceTable?: string,
}

// Auto-generates findingNumber
// Sets status = "new", discoveredAt = now
// Sets triageDeadline based on severity:
//   critical: +24h, high: +72h, medium: +7d, low: +30d
// Writes maintenanceFindingEvent for creation
```

### 6.2 `triageFinding`

```typescript
args: {
  findingId: Id<"maintenanceFindings">,
  action: "review" | "defer" | "schedule" | "close_na" | "supersede",
  // Conditional fields based on action...
}
// Validates transition per state machine
// Enforces guard rules per Section 3.1
// Writes audit event
```

### 6.3 `resolveFinding`

```typescript
args: {
  findingId: Id<"maintenanceFindings">,
  resolvedByWorkOrderId?: Id<"workOrders">,
  resolvedByAdComplianceId?: Id<"adCompliance">,
  resolvedByMaintenanceRecordId?: Id<"maintenanceRecords">,
  evidenceNotes?: string,
}
// Requires at least one resolution linkage
// Validates linked record exists and is in terminal state
// Sets status = "closed_resolved", closedAt = now
// Writes audit event
```

---

## 7. Query Contracts

### 7.1 `listFindings`
- Filters: organizationId, aircraftId, status, findingType, severity, overdue flag
- Sort: by severity (desc), then complianceDeadline (asc)
- Includes computed `isOverdue` boolean

### 7.2 `getFindingWithHistory`
- Returns finding + full `maintenanceFindingEvents` timeline
- Includes resolved linked record details (WO number, AD number, etc.)

### 7.3 `getUnaccountedBacklog`
- Returns count + age distribution of findings in non-terminal states
- Grouped by findingType and severity
- Used for KPI dashboards

### 7.4 `getOverdueFindings`
- Live computation against current aircraft hours/cycles
- Returns findings where any compliance deadline dimension is breached
- Sorted by urgency (most overdue first)

---

## 8. Relationship to Existing Tables

| Existing Table | Relationship |
|----------------|-------------|
| `airworthinessDirectives` | Finding of type `ad_identified` links via `sourceId` → AD `_id` |
| `adCompliance` | Finding resolution links via `resolvedByAdComplianceId` |
| `maintenancePredictions` | Finding of type `predicted_maintenance` links via `sourceId` → prediction `_id` |
| `carryForwardItems` | Finding of type `carry_forward` links via `sourceId` → carry-forward `_id` |
| `discrepancies` | Finding of type `inspector_writeup` may link via `sourceId` → discrepancy `_id` |
| `workOrders` | Resolution linkage via `resolvedByWorkOrderId` |
| `maintenanceRecords` | Resolution linkage via `resolvedByMaintenanceRecordId` |
| `complianceLedgerEvents` | Cross-referenced for AD lifecycle replay |

---

## 9. UI Surface Summary

| Page | Purpose |
|------|---------|
| `/compliance/findings` | Finding triage workbench (list + filters + bulk actions) |
| `/compliance/findings/[id]` | Finding detail with timeline, evidence, linked records |
| `/fleet/[tail]/findings` | Aircraft-scoped finding list (tab on aircraft detail) |
| `/dashboard` | Findings KPI widget (unaccounted count, overdue count) |
| `/compliance/audit-readiness` | Finding backlog impact on audit readiness score |

---

*This spec is grounded in the actual Convex schema (`convex/schema.ts`), existing `adCompliance` module patterns, `dueEngine.ts` lifecycle transition logic, and `complianceLedgerEvents` audit trail conventions. All mutation contracts follow the append-only audit and transition-guard patterns established by Teams A/B.*
