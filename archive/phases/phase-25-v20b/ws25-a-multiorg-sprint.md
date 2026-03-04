# WS25-A — DST-FB-001 Fix + Multi-Org Sprint
**Filed:** 2026-02-23T01:41:00Z
**Owner:** Devraj Anand (implementation), Marcus Webb (compliance), Cilla Oduya (QA), Jonas Harker (infrastructure)
**Status: ✅ SHIPPED**

---

## Part 1: DST-FB-001 — nonApplicabilityBasis Fix

### Background

Frank Nguyen filed DST-FB-001 as formal product feedback on 2026-02-20. Reference number cited in changelog per Nadia's standing directive: a 31-year DER files formal feedback with a reference number, it ships with a reference number in the changelog. The bug: `adComplianceRecords` records with `complianceStatus = "NOT_APPLICABLE"` carry no required basis for the determination. Frank surfaced this during Desert Sky Turbine's onboarding — his turbine AD list includes several ADs technically applicable to piston-engine aircraft that are marked NOT_APPLICABLE by the prior shop with no documented basis. In an FSDO audit, a not-applicable determination without a documented basis is indistinguishable from a skipped compliance check.

Marcus's compliance framing: 14 CFR §39.23 permits FSDO-authorized Alternative Methods of Compliance (AMOC). NOT_APPLICABLE determinations require a documented basis in the maintenance record. The four basis values in Frank's report — serial number exclusion, model exclusion, date-of-manufacture exclusion, and DOM determination — map directly to the four legally defensible bases for an applicability determination. There is no fifth category. A record that cannot be assigned one of these four values should not be marked NOT_APPLICABLE.

---

### Schema Addition: nonApplicabilityBasis Enum

```typescript
// convex/schema.ts — adComplianceRecords table update

// New enum type
const nonApplicabilityBasisValues = v.union(
  v.literal("NOT_APPLICABLE_BY_SERIAL"),        // S/N outside AD applicability range
  v.literal("NOT_APPLICABLE_BY_MODEL"),         // Aircraft model not listed in AD
  v.literal("NOT_APPLICABLE_BY_DATE"),          // DOM before/after AD applicability cutoff
  v.literal("NOT_APPLICABLE_DOM_DETERMINATION") // DOM determination with supporting reference
);

// adComplianceRecords table — updated fields
adComplianceRecords: defineTable({
  orgId: v.id("organizations"),
  aircraftId: v.id("aircraft"),
  adNumber: v.string(),
  adTitle: v.string(),
  complianceStatus: v.union(
    v.literal("COMPLIANT"),
    v.literal("NOT_APPLICABLE"),
    v.literal("PENDING"),
    v.literal("DEFERRED"),
    v.literal("OVERDUE"),
  ),
  // NEW — required when complianceStatus = "NOT_APPLICABLE"
  // Null value hard-blocks when status is NOT_APPLICABLE (enforced at mutation layer)
  nonApplicabilityBasis: v.optional(nonApplicabilityBasisValues),
  nonApplicabilityNotes: v.optional(v.string()), // supporting reference (S/N, model doc, etc.)
  complianceDueDate: v.optional(v.string()),
  lastComplianceDate: v.optional(v.string()),
  nextDueDate: v.optional(v.string()),
  methodOfCompliance: v.optional(v.string()),
  documentedBy: v.id("users"),
  documentedAt: v.string(),
  // ... existing fields preserved
})
  .index("by_org_aircraft", ["orgId", "aircraftId"])
  .index("by_org_status", ["orgId", "complianceStatus"]),
```

---

### Hard-Block Enforcement

```typescript
// convex/mutations/adCompliance.ts

export const upsertAdComplianceRecord = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    adNumber: v.string(),
    adTitle: v.string(),
    complianceStatus: v.union(
      v.literal("COMPLIANT"),
      v.literal("NOT_APPLICABLE"),
      v.literal("PENDING"),
      v.literal("DEFERRED"),
      v.literal("OVERDUE"),
    ),
    nonApplicabilityBasis: v.optional(nonApplicabilityBasisValues),
    nonApplicabilityNotes: v.optional(v.string()),
    // ... other args
  },
  handler: async (ctx, args) => {
    // Hard-block: null nonApplicabilityBasis when status = NOT_APPLICABLE
    if (args.complianceStatus === "NOT_APPLICABLE" && !args.nonApplicabilityBasis) {
      throw new ConvexError(
        "DST-FB-001: nonApplicabilityBasis is required when complianceStatus is NOT_APPLICABLE. " +
        "Accepted values: NOT_APPLICABLE_BY_SERIAL, NOT_APPLICABLE_BY_MODEL, " +
        "NOT_APPLICABLE_BY_DATE, NOT_APPLICABLE_DOM_DETERMINATION."
      );
    }
    
    // Org derivation — never from client args
    const identity = await ctx.auth.getUserIdentity();
    const orgId = identity?.orgId;
    if (!orgId) throw new ConvexError("ORG_CONTEXT_MISSING");
    
    // ... upsert logic
  },
});
```

**UI enforcement:** The AD compliance record form disables the "Save" button when `complianceStatus = "NOT_APPLICABLE"` and no basis is selected. The basis dropdown is required-field styled (red asterisk, inline validation message). `nonApplicabilityNotes` is a free-text field below the dropdown, labeled "Supporting reference (S/N range, model applicability doc, DOM memo ref)." Not required — but the DOM dashboard flags NOT_APPLICABLE records with no notes as a soft warning for review.

---

### Backfill Migration: backfillNonApplicabilityBasis

```typescript
// convex/migrations/backfillNonApplicabilityBasis.ts

export const backfillNonApplicabilityBasis = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Auth: admin-only mutation (checked via ctx.auth orgId + admin role)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.isAdmin) throw new ConvexError("ADMIN_ONLY");

    // Find all NOT_APPLICABLE records with null nonApplicabilityBasis
    const records = await ctx.db
      .query("adComplianceRecords")
      .filter(q => 
        q.and(
          q.eq(q.field("complianceStatus"), "NOT_APPLICABLE"),
          q.eq(q.field("nonApplicabilityBasis"), undefined)
        )
      )
      .collect();

    const migrationLog = {
      runAt: new Date().toISOString(),
      dryRun: args.dryRun ?? false,
      totalFound: records.length,
      updated: 0,
      flaggedForDomReview: 0,
    };

    for (const record of records) {
      if (!args.dryRun) {
        await ctx.db.patch(record._id, {
          nonApplicabilityBasis: "NOT_APPLICABLE_DOM_DETERMINATION",
          nonApplicabilityNotes: 
            "[MIGRATION 2026-02-23] Default basis set. Original determination basis undocumented. " +
            "DOM review required before next FSDO audit cycle.",
          domReviewFlag: true,  // new optional flag field — surfaced on DOM dashboard
          domReviewFlagReason: "backfillNonApplicabilityBasis migration — basis was undocumented",
        });
        migrationLog.updated++;
        migrationLog.flaggedForDomReview++;
      }
    }

    return migrationLog;
  },
});
```

**Migration execution log (dry run first):**
```
2026-02-23T01:41:00Z — backfillNonApplicabilityBasis DRY RUN
  totalFound: 47 records across 3 orgs
  - Skyline Aviation: 12 records
  - High Desert MRO: 8 records  
  - High Desert Charter / Priya org: 3 records
  - Desert Sky Turbine: 24 records (Frank's import — expected; turbine ADs with piston-applicability)
  dryRun: true — no writes

2026-02-23T01:41:30Z — backfillNonApplicabilityBasis PRODUCTION RUN
  totalFound: 47 records
  updated: 47
  flaggedForDomReview: 47
  All records patched to NOT_APPLICABLE_DOM_DETERMINATION with domReviewFlag: true
  Migration complete — zero errors
```

**DOM dashboard behavior:** The 47 flagged records surface as a new "Applicability Review Required" panel in each org's DOM dashboard. The panel title reads: "47 NOT_APPLICABLE records have undocumented determination basis (migration flag). Review and update basis before next audit cycle." Frank's Desert Sky Turbine org gets 24 of these flags. He expects them — he filed the bug that created this cleanup.

---

### Cilla's Test Cases — DST-FB-001

**Test Case TC-DST-001: Null basis hard-blocks save**
```
Precondition: AD compliance record form loaded for aircraft N44TX
Action: Set complianceStatus = NOT_APPLICABLE, leave nonApplicabilityBasis empty, click Save
Expected: ConvexError thrown with message containing "DST-FB-001: nonApplicabilityBasis is required"
Expected: Record NOT written to database
Expected: Form displays inline validation error: "Basis for determination is required"
Result: PASS ✅
```

**Test Case TC-DST-002: Enum validates — all four values accepted**
```
Precondition: AD compliance record form loaded
Action: Set complianceStatus = NOT_APPLICABLE
For each of: NOT_APPLICABLE_BY_SERIAL, NOT_APPLICABLE_BY_MODEL, NOT_APPLICABLE_BY_DATE, NOT_APPLICABLE_DOM_DETERMINATION
  - Set nonApplicabilityBasis to value
  - Click Save
Expected: Record written successfully for all four values
Expected: complianceStatus and nonApplicabilityBasis stored correctly in database
Expected: No ConvexError thrown for any valid enum value
Result: PASS ✅ (4/4 enum values accepted)
```

**Test Case TC-DST-003: Migration runs clean**
```
Precondition: 3 seeded test records with complianceStatus = NOT_APPLICABLE, nonApplicabilityBasis = null
Action: Run backfillNonApplicabilityBasis({ dryRun: true })
Expected: Returns { totalFound: 3, updated: 0, dryRun: true }
Expected: Database records unchanged

Action: Run backfillNonApplicabilityBasis({ dryRun: false })
Expected: Returns { totalFound: 3, updated: 3, flaggedForDomReview: 3 }
Expected: All 3 records patched to NOT_APPLICABLE_DOM_DETERMINATION
Expected: All 3 records have domReviewFlag: true
Expected: nonApplicabilityNotes contains migration timestamp string
Result: PASS ✅
```

---

### Frank Gets the Slack Message

**[Slack — #desert-sky-turbine channel — 2026-02-23 01:43 UTC]**

**Nadia Solis:** @Frank Nguyen — DST-FB-001 shipped. `nonApplicabilityBasis` is now required on all NOT_APPLICABLE records — null hard-blocks. All 24 of your imported records are flagged in the DOM dashboard for review. Migration basis set to `NOT_APPLICABLE_DOM_DETERMINATION` with a note. You'll see the review panel when you log in.

**Frank Nguyen:** About time. I'll go through the 24 this week. Most of them are going to be `NOT_APPLICABLE_BY_MODEL` — piston ADs on a turbine import. A few might actually be DOM determinations that need a reference attached.

Good. This is how it should work. 👍

---

## Part 2: Multi-Org Implementation

### Schema Additions

**orgRoleConfig table:**

```typescript
// convex/schema.ts — new table

orgRoleConfig: defineTable({
  orgId: v.id("organizations"),
  roleName: v.string(),           // "DOM", "Lead IA", "Powerplant IA", "Shop Foreman", etc.
  permissions: v.array(v.union(
    v.literal("sign_rts"),
    v.literal("create_work_order"),
    v.literal("close_work_order"),
    v.literal("qcm_review"),
    v.literal("create_ferry_wo"),
    v.literal("manage_personnel"),
    v.literal("view_compliance"),
    v.literal("pilot_readonly"),
    v.literal("admin"),
  )),
  isActive: v.boolean(),
  createdBy: v.id("users"),
  createdAt: v.string(),
  updatedAt: v.optional(v.string()),
  templateSource: v.optional(v.union(
    v.literal("REPAIR_STATION_145"),
    v.literal("TURBINE_SHOP"),
    v.literal("HELICOPTER_MRO"),
    v.literal("PART_135_OPERATOR"),
    v.literal("CUSTOM"),
  )),
})
  .index("by_org", ["orgId"])
  .index("by_org_active", ["orgId", "isActive"]),
```

**orgId added to all primary tables — confirmed coverage audit:**

| Table | orgId Present | Status |
|---|---|---|
| workOrders | ✅ Added | New composite indexes added |
| aircraft | ✅ Added | New composite indexes added |
| adComplianceRecords | ✅ Added | New composite indexes added |
| personnel / users | ✅ Added | New composite index added |
| ferryPermitRecord | ✅ Present (WS24-A) | Composite index confirmed |
| discrepancies | ✅ Added | Inherits from workOrder — index added |
| llpComponents | ✅ Added | New composite index added |
| pilotNotificationLog | ✅ Added | New composite index added |
| orgRoleConfig | ✅ New table | Primary by_org index |

**Index additions (primary tables):**

```typescript
// workOrders
.index("by_org_aircraft", ["orgId", "aircraftId"])
.index("by_org_status", ["orgId", "status"])
.index("by_org_assignedMechanic", ["orgId", "assignedMechanic"])

// aircraft
.index("by_org", ["orgId"])
.index("by_org_tailNumber", ["orgId", "tailNumber"])

// adComplianceRecords
.index("by_org_aircraft", ["orgId", "aircraftId"])

// personnel
.index("by_org", ["orgId"])

// ferryPermitRecord
.index("by_org", ["orgId"])
```

---

### orgId Middleware: Derive from Clerk Auth Identity

**The core principle** (Devraj's design, unchanged from plan): `orgId` is never accepted as a client-supplied argument. Every mutation derives it from `ctx.auth.getUserIdentity().orgId`. Client-supplied `orgId` is rejected at the mutation boundary.

```typescript
// convex/lib/authHelpers.ts

/**
 * getOrgId — derive orgId from Clerk auth context
 * Throws ORG_CONTEXT_MISSING if auth is absent or orgId not present.
 * Called at the top of every mutation and query that touches org-scoped data.
 */
export async function getOrgId(ctx: MutationCtx | QueryCtx): Promise<Id<"organizations">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("UNAUTHENTICATED");
  
  const orgId = identity.orgId as Id<"organizations"> | undefined;
  if (!orgId) throw new ConvexError("ORG_CONTEXT_MISSING: No org context in auth identity. " +
    "Ensure Clerk org is selected before performing this action.");
  
  return orgId;
}

/**
 * assertOrgMatch — verify a document belongs to the requesting org
 * Called after any document fetch to enforce isolation.
 */
export function assertOrgMatch(
  docOrgId: Id<"organizations">, 
  requestingOrgId: Id<"organizations">,
  docType: string
): void {
  if (docOrgId !== requestingOrgId) {
    throw new ConvexError(`ORG_ISOLATION_VIOLATION: ${docType} does not belong to requesting org.`);
  }
}
```

**Injection pattern — example mutation:**

```typescript
// convex/mutations/workOrders.ts

export const createWorkOrder = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    description: v.string(),
    // NOTE: orgId is NOT in args — never client-supplied
    // ... other args
  },
  handler: async (ctx, args) => {
    // Derive orgId from auth — never from args
    const orgId = await getOrgId(ctx);
    
    // Verify aircraft belongs to this org
    const aircraft = await ctx.db.get(args.aircraftId);
    if (!aircraft) throw new ConvexError("AIRCRAFT_NOT_FOUND");
    assertOrgMatch(aircraft.orgId, orgId, "aircraft");
    
    // Create work order with org-derived orgId
    return await ctx.db.insert("workOrders", {
      orgId,
      aircraftId: args.aircraftId,
      description: args.description,
      // ... other fields
    });
  },
});
```

This pattern is applied to all 47 mutations that touch org-scoped data. Cilla runs mutation-by-mutation confirmation in her regression suite.

---

### 3-Phase Migration

**Phase A — Add orgId nullable + backfill:**

Devraj's migration log — Phase A production run:

```
2026-02-23T02:00:00Z — MULTI-ORG PHASE A MIGRATION — PRODUCTION
Operator: Devraj Anand
Deployment: Convex production (all shops)

Step 1: Deploy schema with orgId optional (nullable) on all tables
  - workOrders: orgId v.optional(v.id("organizations")) added ✅
  - aircraft: confirmed present ✅
  - adComplianceRecords: confirmed present (added alongside DST-FB-001 fix) ✅
  - personnel: confirmed present ✅
  - discrepancies: added ✅
  - llpComponents: added ✅
  - pilotNotificationLog: added ✅
  Convex schema deployment: SUCCESS
  Index build initiated (async, non-blocking)

Step 2: Backfill orgId on records where null
  Strategy: derive from users.orgId of the record's createdBy user
  Records to backfill: 0 (all existing records had orgId from initial schema design)
  Note: Convex schema always had orgId fields — this confirms Jonas's architecture was correct.
  Backfill: NOT REQUIRED ✅

Step 3: Monitor index build completion
  by_org_aircraft (workOrders): BUILD COMPLETE ✅
  by_org_status (workOrders): BUILD COMPLETE ✅
  by_org_assignedMechanic (workOrders): BUILD COMPLETE ✅
  by_org (aircraft): BUILD COMPLETE ✅
  by_org_tailNumber (aircraft): BUILD COMPLETE ✅
  by_org_aircraft (adComplianceRecords): BUILD COMPLETE ✅
  by_org (personnel): BUILD COMPLETE ✅
  by_org (ferryPermitRecord): BUILD COMPLETE ✅
  All index builds complete: 2026-02-23T02:14:00Z (14 minutes)

Step 4: Validate index build — sample queries against each org
  Skyline Aviation (WO count by org): 124 records — MATCH ✅
  High Desert MRO (WO count by org): 89 records — MATCH ✅
  High Desert Charter / Priya org (WO count by org): 31 records — MATCH ✅
  Desert Sky Turbine (WO count by org): 7 records (new shop) — MATCH ✅

PHASE A COMPLETE — 2026-02-23T02:15:00Z
Zero errors. Zero data movement required. Index builds clean.
```

**Phase B — Make orgId required:**

```
2026-02-23T02:30:00Z — MULTI-ORG PHASE B MIGRATION
  Action: Change all orgId fields from v.optional(...) to required
  Pre-condition: Phase A complete, all indexes built, no null orgIds in any table
  
  Null orgId check (pre-Phase B gate):
    workOrders with null orgId: 0 ✅
    aircraft with null orgId: 0 ✅
    adComplianceRecords with null orgId: 0 ✅
    All tables: 0 null orgIds ✅
  
  Schema redeploy with orgId required: SUCCESS
  Validation: create_work_order mutation tested — rejects on missing org context ✅
  
PHASE B COMPLETE — 2026-02-23T02:31:00Z
```

**Phase C — Add leading-key indexes:**

Phase A included all composite index additions. Phase C confirms all leading-key (orgId-first) indexes are live and the query planner is using them.

```
2026-02-23T02:32:00Z — MULTI-ORG PHASE C CONFIRMATION
  All composite indexes with orgId as leading key: CONFIRMED ACTIVE ✅
  Query planner validation (spot check, Devraj):
    getWorkOrdersByOrg — using by_org_aircraft index ✅
    getAircraftByOrg — using by_org index ✅
    getAdComplianceByOrgAircraft — using by_org_aircraft index ✅
  
PHASE C COMPLETE — 2026-02-23T02:33:00Z
Multi-org Phase 1 migration: DONE
```

---

### Cilla's Test Cases — Multi-Org

**Test Case TC-MORG-001: Cross-org isolation**
```
Precondition: Two test orgs (org_alpha, org_bravo). Work order WO-ALPHA-001 belongs to org_alpha.
Action: Authenticate as a user in org_bravo. Call getWorkOrder(WO-ALPHA-001).
Expected: ConvexError thrown with code "ORG_ISOLATION_VIOLATION"
Expected: WO-ALPHA-001 not returned to org_bravo user
Action: Authenticate as org_alpha user. Call getWorkOrder(WO-ALPHA-001).
Expected: Work order returned successfully
Result: PASS ✅
```

**Test Case TC-MORG-002: Role config per org**
```
Precondition: org_alpha has orgRoleConfig for "Powerplant IA" with permissions: ["sign_rts", "view_compliance"]
Action: Authenticate as org_alpha user with "Powerplant IA" role. Attempt to create_work_order.
Expected: ConvexError — "create_work_order" not in role permissions
Action: Authenticate as org_alpha user with "DOM" role (includes create_work_order). Attempt create_work_order.
Expected: Work order created successfully
Action: Attempt to add orgRoleConfig entry with permissions not in the fixed permission set.
Expected: Schema validation error — only allowed permission literals accepted
Result: PASS ✅
```

**Test Case TC-MORG-003: Auth derivation — orgId from Clerk, not args**
```
Precondition: Test mutation createWorkOrder with a crafted request supplying an explicit orgId arg 
              (attempting client-side org override).
Action: Call createWorkOrder with { aircraftId: ..., orgId: "org_bravo_id", description: "..." }
Expected: orgId arg is not present in mutation args schema — TypeScript compile error
Expected: If mutation handler is called directly (bypassing schema), orgId arg is ignored;
          orgId is derived from ctx.auth.getUserIdentity().orgId exclusively
Action: Call createWorkOrder with no active org in Clerk session (orgId = null in identity)
Expected: ConvexError "ORG_CONTEXT_MISSING"
Result: PASS ✅
```

---

## Changelog Entry

```
## [Phase 25 Sprint 1] — 2026-02-23

### Fixed
- DST-FB-001 (Frank Nguyen, Desert Sky Turbine, 2026-02-20): Added `nonApplicabilityBasis` 
  enum to `adComplianceRecords`. Required when `complianceStatus = "NOT_APPLICABLE"`. 
  Null value hard-blocks save. Accepted values: NOT_APPLICABLE_BY_SERIAL, 
  NOT_APPLICABLE_BY_MODEL, NOT_APPLICABLE_BY_DATE, NOT_APPLICABLE_DOM_DETERMINATION.
  `backfillNonApplicabilityBasis` migration run: 47 records updated across 4 orgs.

### Added
- Multi-org architecture Phase 1: `orgRoleConfig` table with per-org configurable roles 
  and fixed permission set. Pre-configured templates: REPAIR_STATION_145, TURBINE_SHOP, 
  HELICOPTER_MRO, PART_135_OPERATOR.
- `orgId` middleware: all mutations now derive `orgId` from Clerk auth identity 
  (ctx.auth.getUserIdentity().orgId). Client-supplied orgId rejected.
- Composite indexes with orgId as leading key on all primary tables.
- ORG_ISOLATION_VIOLATION error thrown when document orgId does not match requesting 
  user's auth orgId.
- `aircraftOrgAccess` junction table for explicit cross-org aircraft sharing grants.
```

---

## Status: ✅ SHIPPED

DST-FB-001 closed. Multi-org Phase 1 (schema + indexes) live in production. All tests green. Devraj signed off on migration. Cilla signed off on test suite. Marcus compliance clearance: PASS.
