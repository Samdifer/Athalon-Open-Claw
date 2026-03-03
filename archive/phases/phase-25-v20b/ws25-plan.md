# WS25 Plan — Multi-Org + Part 135 Full Compliance + Fort Worth Scoping
**Filed:** 2026-02-23T01:35:00Z
**Owner:** Nadia Solis, Marcus Webb, Devraj Anand, Jonas Harker, Rosa Eaton
**Phase:** 25 (ACTIVE)

---

## DST-FB-001 — Sprint 1 Priority Item

Before anything else: Frank Nguyen's formal feedback ships in Phase 25 Sprint 1. Devraj owns the schema addition. Marcus owns the compliance review of the enum options. The DOM backfill migration (flagging existing `NOT_APPLICABLE` records) must run before Desert Sky Turbine enters any FSDO audit cycle. Frank gets a ship notification. This is non-negotiable — a 31-year DER filed formal product feedback with a reference number. It ships with a reference number in the changelog.

---

## Part 1: Multi-Org Architecture (v2.0 GAP 1)

**Regulatory Complexity:** Low
**Estimated Sprints:** 3
**Owner:** Devraj Anand (implementation), Jonas Harker (infrastructure), Marcus Webb (compliance review)
**Prerequisite for:** Part 135 full compliance (GAP 2), DER record linkage (GAP 4)

Clerk org switching is implemented at the auth layer and present in the schema. The product surface and data tenancy are still single-org. What follows is the complete design to close that gap.

---

### Cross-Org Data Isolation

**The gap:** Convex queries and mutations do not currently enforce org-scoping at the data layer. Org context flows through Clerk session tokens, but the server-side mutations accept `orgId` as a parameter rather than deriving it from the authenticated identity. A misconfigured mutation could theoretically access records across org boundaries.

**Devraj's design:**

Every table that contains org-scoped data must carry an `orgId` field. Every Convex query and mutation that touches org-scoped data must derive `orgId` from `ctx.auth.getUserIdentity().orgId` — not from the client-supplied argument. Client-supplied `orgId` is rejected. This is the same pattern used for `userId` scoping on audit fields.

**Index partitioning:** All existing primary query patterns must gain a composite index with `orgId` as the leading field. The priority tables and their required index additions:

```typescript
// workOrders — all primary query paths now org-partitioned
.index("by_org_aircraft", ["orgId", "aircraftId"])
.index("by_org_status", ["orgId", "status"])
.index("by_org_assignedMechanic", ["orgId", "assignedMechanic"])

// aircraft
.index("by_org", ["orgId"])
.index("by_org_tailNumber", ["orgId", "tailNumber"])

// adComplianceRecords
.index("by_org_aircraft", ["orgId", "aircraftId"])

// personnel (users/mechanics)
.index("by_org", ["orgId"])

// ferryPermitRecord
.index("by_org", ["orgId"])  // already designed in WS24-A
```

Jonas's infrastructure note: Convex's document-level security model means the database does not enforce row-level isolation — the application layer must. The index-first partitioning strategy is the correct approach and aligns with Convex's query performance model. At the scale Athelon is currently operating (4 shops, ~50 concurrent users peak), a full table scan with post-hoc org filtering would not be a performance problem, but it is an isolation architecture problem. The partitioned indexes enforce correctness before they become a performance necessity. Partition now; do not wait for scale to force it.

**Shared aircraft records:** A tail number that appears at multiple stations (e.g., a King Air that transits between two Frank-affiliated locations) requires an explicit sharing policy. Design: `aircraftOrgAccess` junction table, with fields `[aircraftId, orgId, accessLevel: "owner" | "read_only", grantedBy, grantedAt]`. Sharing requires explicit grant by the owning org's DOM. No automatic cross-org visibility. Marcus compliance note: §43.9 requires that maintenance records be attributable; shared aircraft records must make clear which org performed which work. The `orgId` on each work order already provides this — shared aircraft means shared visibility into the work order list, not shared ownership of records.

---

### Role Mapping Per Org

**The gap:** Athelon's current role set (DOM, QCM, IA, A&P, VIEWER) was designed around the Skyline/High Desert repair station model. Desert Sky Turbine's org has different staffing — Frank is simultaneously DOM and certifying IA on turbine work, and the powerplant specialization creates different role boundaries than a general aviation shop. A helicopter MRO in Fort Worth may have no QCM at all (Part 27 one-person shops are not uncommon). Corporate flight departments (if and when Athelon serves them) have no DOM equivalent.

**Design:** Role definitions become org-configurable within a fixed permission set. The permission set is fixed (cannot be extended by org admins — this prevents shops from granting themselves unauthorized access). Orgs can create named roles and assign permissions from the set.

```typescript
// orgRoleConfig table
orgRoleConfig: defineTable({
  orgId: v.id("organizations"),
  roleName: v.string(),           // e.g., "DOM", "Lead IA", "Powerplant IA", "Shop Foreman"
  permissions: v.array(v.union(
    v.literal("sign_rts"),
    v.literal("create_work_order"),
    v.literal("close_work_order"),
    v.literal("qcm_review"),
    v.literal("create_ferry_wo"),
    v.literal("manage_personnel"),
    v.literal("view_compliance"),
    v.literal("pilot_readonly"),    // new — for Part 135 pilot portal (GAP 2)
    v.literal("admin"),
  )),
  isActive: v.boolean(),
  createdBy: v.id("users"),
  createdAt: v.string(),
})
  .index("by_org", ["orgId"]),
```

The system ships with pre-configured role templates per org type: `REPAIR_STATION_145` (DOM/QCM/IA/A&P/VIEWER defaults), `TURBINE_SHOP` (DOM+IA combined, no QCM required for small shops), `HELICOPTER_MRO` (Part 27 role set, pending Marcus's Fort Worth assessment), `PART_135_OPERATOR` (adds `pilot_readonly` permission for GAP 2). DOM admins can clone and rename a template but cannot create permissions from scratch.

Marcus: The QCM role is defined in Part 145 §145.155 and §145.157. Shops not holding a Part 145 certificate do not require a QCM. The system must not enforce QCM review on work orders at orgs that are not Part 145 certificate holders. The org type field on `organizations` (`orgType: v.union(v.literal("part_145_repair_station"), v.literal("part_135_operator"), v.literal("part_91_flight_dept"))`) gates the QCM enforcement rule.

---

### Billing Model Implications

**Current state:** Billing is not implemented in the simulation — Athelon's commercial terms are out-of-scope for the compliance simulation. However, the multi-org architecture decision has billing model implications that must be documented to avoid a painful retrofit.

**Per-org vs. per-user:** The correct model for aviation MRO software is per-org (per repair station certificate holder), not per-user. Reason: certificated personnel headcount at small GA shops is low (4–12 people), and a per-user model would create perverse incentives to share logins rather than create individual certificated personnel records — which is exactly the behavior Athelon's IA re-auth and audit trail are designed to prevent. Seat-sharing in a compliance-tracking system is not just a commercial problem; it is a safety documentation problem.

**Recommended model:** Per-org subscription tier based on certificated personnel count (1–5, 6–15, 16+), with unlimited aircraft and work orders per tier. Multi-org users (e.g., Frank managing two locations in the future) are billed once per org, not double-billed for shared identity.

**Nadia to action:** Document the billing model in the commercial terms before Phase 25 closes. Do not implement billing infrastructure in Phase 25; document the model constraints so that whatever billing system is implemented in a future phase does not require a multi-org schema retrofit.

---

### Migration: 3-Shop Single-Org → Multi-Org

**Devraj's migration plan:**

The three current production shops (Skyline, High Desert MRO, High Desert Charter) are running in what is effectively a single Convex deployment with manual per-org scoping conventions. The migration to the fully partitioned multi-org architecture is non-destructive but must be executed carefully.

**Phase 1 — Schema migration (no data movement):**
1. Add `orgId` field to all tables that lack it (most already have it from the initial schema; audit to confirm coverage).
2. Backfill `orgId` from the `users.orgId` of the `createdBy` user for any records with a null `orgId`.
3. Create all required composite indexes with `orgId` as the leading field.
4. Deploy the index additions to production. Convex index builds are non-blocking (they backfill asynchronously without write locks). Monitor index build completion before Phase 2.

**Phase 2 — Mutation hardening:**
1. Audit all mutations for client-supplied `orgId` parameters. Replace with `ctx.auth.getUserIdentity().orgId` derivation.
2. Add server-side org-isolation assertions to all queries: if a query returns a document whose `orgId` does not match the authenticated user's `orgId`, throw `ORG_ISOLATION_VIOLATION`.
3. Deploy mutation hardening. Run Cilla's full regression suite against all three shops in staging before production.

**Phase 3 — Clerk org switching surface:**
1. Wire Clerk's `useOrganization()` hook to the frontend. Add an org switcher component to the nav (only visible to users with membership in >1 org).
2. On org context switch: clear all cached queries, reset UI state, redirect to the org's dashboard.
3. Validate: a user with two shop memberships (e.g., Frank's future second location) can switch between orgs without data from one org appearing in the other's views.

**Jonas's infrastructure note:** The Convex deployment is currently single-environment per product tier (dev/staging/production). Multi-org does not require multiple Convex deployments — all orgs share the same Convex backend, isolated at the data layer. This is the correct architecture and is consistent with how Convex is designed to be used. Jonas confirms: Convex's query performance on composite indexes at the scale of 4–10 shops and 50–150 concurrent users is well within the free/growth tier limits. Partition scaling does not require infrastructure changes at this stage.

**Migration timeline:** Phase 1 (schema + indexes): Sprint 1. Phase 2 (mutation hardening): Sprint 2. Phase 3 (Clerk surface): Sprint 2 (parallel to Phase 2 hardening). Full regression + production deployment: Sprint 3. DST-FB-001 ships in Sprint 1 alongside Phase 1 schema work.

---

## Part 2: Part 135 Full Compliance (v2.0 GAP 2)

**Regulatory Complexity:** High
**Estimated Sprints:** 4 (after GAP 1 multi-org lands)
**Owner:** Marcus Webb (compliance architecture), Devraj Anand (implementation), Priya Sharma (primary UAT)
**Depends on:** GAP 1 multi-org (pilot portal requires org-scoped identity)

---

### 2A. Pilot Access Portal

**Regulatory basis:** 14 CFR §135.65(b) — The certificate holder shall make any record required by this section available for inspection by the Administrator or an authorized representative of the National Transportation Safety Board. Read in context with FAA interpretation: the pilot in command must have access to maintenance records for the aircraft they will operate before accepting the aircraft for flight.

**What's missing:** Priya's §135.65 recording requirement is satisfied (pilot notification log shipped in Phase 23). What is not built: a mechanism for the assigned PIC to independently access the maintenance record before flight, without requiring Priya or the IA to send it manually.

**Design:**

```typescript
// pilotPortalTokens table — tokenized access, scoped to one aircraft + one flight period
pilotPortalTokens: defineTable({
  orgId: v.id("organizations"),             // cert holder's org
  aircraftId: v.id("aircraft"),
  pilotUserId: v.optional(v.id("users")),   // if pilot has Athelon account (preferred)
  pilotEmail: v.string(),                   // always required — for tokenized link delivery
  pilotName: v.string(),
  pilotCertificateNumber: v.string(),
  issuedByIa: v.id("users"),               // IA who released the record
  issuedAt: v.string(),                    // ISO timestamp
  validUntil: v.string(),                  // ISO timestamp — token expires after flight period
  accessScope: v.literal("pre_flight_readonly"),
  workOrderIds: v.array(v.id("workOrders")), // specific WOs the pilot can see
  tokenHash: v.string(),                    // bcrypt hash of the URL token
  accessed: v.boolean(),
  accessedAt: v.optional(v.string()),
  revokedAt: v.optional(v.string()),
})
  .index("by_org_aircraft", ["orgId", "aircraftId"])
  .index("by_token_hash", ["tokenHash"]),
```

**Mutation signature:**

```typescript
// Issued by the IA as an explicit release action — not automatic
export const issuePilotPortalToken = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    pilotEmail: v.string(),
    pilotName: v.string(),
    pilotCertificateNumber: v.string(),
    workOrderIds: v.array(v.id("workOrders")),
    validHours: v.number(),   // typically 24–48 hrs per operator procedure
  },
  handler: async (ctx, args) => {
    // Auth: only users with sign_rts permission (IA) may issue pilot portal tokens
    // Org-scoped: derives orgId from ctx.auth
    // Creates token, sends email with secure link to read-only portal view
    // Records issuance in pilotNotificationLog (existing table) with token reference
  },
});
```

**UI:** The IA's pre-close checklist (already shipped) gains a "Release to Pilot" action card after RTS is signed. The IA selects the pilot from a list (or enters email for a new pilot), selects the work orders to share, sets the validity window, and issues the token. The pilot receives an email with a secure link. The link opens a read-only portal view showing: aircraft registration, work order summary, discrepancies found and resolved, RTS statement, and the IA's name and certificate number. No edit capability, no navigation beyond the scoped record.

**Architecture note:** The tokenized access pattern mirrors the customer portal architecture (Phase 17 WS17-K) with one key difference: the customer portal is DOM-issued and organization-scoped; the pilot portal is IA-issued and scoped to a specific work order set per flight. The pilot portal does not give the PIC access to the shop's full maintenance records — only the records relevant to the aircraft they are accepting.

Marcus: §135.65(b) enforcement history in FSDO audits is real. This is not a cosmetic feature. The explicit IA release action is the correct design — the IA must affirmatively release the record, creating an auditable timestamp of when the pilot was given access. A fully automated release (records always available to assigned pilots without IA action) would reduce friction but would also remove the IA's affirmative review step before release.

---

### 2B. MEL Integration

**Regulatory basis:** 14 CFR §135.179 — Inoperative instruments and equipment. An aircraft may be operated under a minimum equipment list when approved by the Administrator. §91.213 — Inoperative instruments and equipment for Part 91. For Part 135 ops, the MEL is a certificate holder document, approved by FSDO, listing equipment that may be inoperative for flight within defined limits.

**What's missing:** No MEL data model exists in Athelon. MEL deferrals have a fundamentally different disposition path than standard discrepancies: they have time limits, require specific FSDO-approved MEL item references, must be tracked against the MEL document revision, and require DOM oversight. A deferred MEL item that expires must ground the aircraft until resolved.

**Schema additions:**

```typescript
// melDocuments table — the FSDO-approved MEL for the cert holder
melDocuments: defineTable({
  orgId: v.id("organizations"),
  aircraftMake: v.string(),
  aircraftModel: v.string(),
  melRevision: v.string(),           // e.g., "Rev 12, 2025-11-01"
  fsdoApprovalDate: v.string(),
  fsdoApprovalRef: v.string(),
  documentUrl: v.optional(v.string()), // uploaded PDF
  isActive: v.boolean(),
  activatedAt: v.string(),
})
  .index("by_org", ["orgId"]),

// melDeferralRecords table — individual deferred items
melDeferralRecords: defineTable({
  orgId: v.id("organizations"),
  aircraftId: v.id("aircraft"),
  workOrderId: v.id("workOrders"),         // the WO that documented the finding
  discrepancyId: v.optional(v.id("discrepancies")), // the specific discrepancy deferred
  melDocumentId: v.id("melDocuments"),
  melItemNumber: v.string(),               // e.g., "34-11-1" (ATA chapter-section-item)
  melItemDescription: v.string(),
  deferralCategory: v.union(
    v.literal("A"),    // time-limited (hours specific, often ≤3 days)
    v.literal("B"),    // 3 calendar days
    v.literal("C"),    // 10 calendar days
    v.literal("D"),    // 120 calendar days
  ),
  deferredAt: v.string(),                  // ISO timestamp of deferral
  deferralExpiresAt: v.string(),           // computed from category
  deferredByIa: v.id("users"),
  domAcknowledgedAt: v.optional(v.string()),
  status: v.union(
    v.literal("ACTIVE"),                   // within deferral window
    v.literal("EXPIRED"),                  // deferral window elapsed, aircraft grounded
    v.literal("RESOLVED"),                 // underlying issue corrected, WO linked
    v.literal("VOIDED"),                   // voided before expiry (e.g., MEL revised)
  ),
  resolutionWorkOrderId: v.optional(v.id("workOrders")),
  placard: v.string(),                     // required placard text per MEL item
})
  .index("by_org_aircraft", ["orgId", "aircraftId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_expiry", ["deferralExpiresAt"]),
```

**Mutation signatures:**

```typescript
// Creates a MEL deferral record linked to a discrepancy
export const createMelDeferral = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    workOrderId: v.id("workOrders"),
    discrepancyId: v.optional(v.id("discrepancies")),
    melDocumentId: v.id("melDocuments"),
    melItemNumber: v.string(),
    deferralCategory: v.union(v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D")),
    placardText: v.string(),
  },
  // Auth: IA-only (sign_rts permission). Computes expiry from category + deferredAt.
  // Blocks createMelDeferral if aircraft has no FSDO-approved melDocument for its make/model.
  // Notifies DOM via DOM compliance dashboard (existing alert infrastructure).
});

// DOM acknowledges active MEL deferral — required for DOM compliance dashboard clearance
export const acknowledgeMelDeferral = mutation({
  args: { melDeferralId: v.id("melDeferralRecords") },
  // Auth: DOM-only. Records domAcknowledgedAt timestamp.
});
```

**DOM compliance dashboard additions:** Active MEL deferrals appear in a dedicated panel on the DOM dashboard, sortable by aircraft and by expiry date. Expired deferrals (status: `EXPIRED`) trigger a red alert requiring acknowledgment. The alert mechanism uses the existing qualification alert infrastructure (Phase 17 WS17-G) — the DOM cannot clear the alert without either acknowledging the expiry or linking a resolution WO.

**Disposition difference from standard discrepancies:** A standard discrepancy in Athelon follows: found → documented → resolved → closed in WO. A MEL deferral follows: found → MEL applicability verified by IA → deferral record created → placard installed → DOM notified → deferral expires or resolution WO created. The MEL deferral does not close the underlying discrepancy — it defers it with a time limit. The discrepancy remains open in the work order and is linked to the MEL deferral record until resolution.

---

### 2C. Certificate Holder Separation

**Regulatory basis:** 14 CFR §135.415 and §135.419 — the Part 135 certificate holder (operator) is responsible for maintenance records; the aircraft owner may be a different entity. Athelon must track both and correctly attribute maintenance records to the certificate holder, not the owner, for Part 135 purposes.

**What's missing:** The `aircraft` table has `ownerId` and `operatorId` fields in the current schema, but they both resolve to an `orgId` — there is no mechanism for the operator (cert holder) and the owner to be different organizations or different entities. For Part 135 charter operators, the aircraft may be owned by an individual or LLC and operated under the charter certificate holder's authority.

**Schema addition:**

```typescript
// To aircraft table — add certificate holder separation
aircraftCertHolderSeparation: v.optional(v.object({
  ownerType: v.union(v.literal("org"), v.literal("individual")),
  ownerOrgId: v.optional(v.id("organizations")),    // if owned by an Athelon org
  ownerLegalName: v.string(),                        // always required
  ownerAddress: v.optional(v.string()),
  certHolderOrgId: v.id("organizations"),            // the Part 135 cert holder — always an org
  certHolderCertNumber: v.string(),                  // Air Carrier Certificate number
  operatingAgreementRef: v.optional(v.string()),     // reference to dry lease or management agreement
})),
```

**UI changes:** The aircraft detail page gains a "Certificate Holder" section distinct from "Owner." Reports and PDF exports label maintenance records with the certificate holder's name and certificate number (not the owner's). The DOM compliance dashboard filters by cert holder org (not owner). The pilot portal token (2A above) is issued by the cert holder's IA, not the owner.

Marcus: §135.415 requires the certificate holder to maintain records; §135.419 specifies the record content requirements. The separation of owner vs. cert holder is a documented audit area — FSDO inspectors look for this specifically when an aircraft is operated under a management agreement or dry lease arrangement. This is the simplest of the three Part 135 items and can be delivered as a v1.3 patch before the full pilot portal lands, per the sequencing in the v2.0 roadmap letter.

---

## Part 3: Fort Worth Helicopter MRO — Pre-Onboarding Assessment

**Shop:** Unnamed — Robinson and Bell fleet, Fort Worth TX
**Prospect status:** Inbound — conditional onboarding pending Marcus's Part 27 audit
**Marcus Webb's assessment lead:** Yes
**Timeline:** Begin administrative onboarding after Desert Sky Turbine is stable; defer compliance-surface features pending audit

---

### What Helicopter MRO Requires That Fixed-Wing Does Not

Marcus's Part 27 regulatory assessment, filed for the Phase 25 pre-onboarding record:

**Part 27 vs. Part 23 Certification Basis**

Fixed-wing GA aircraft (Cessna, Piper, Beechcraft) are certificated under 14 CFR Part 23 (Airworthiness Standards: Normal, Utility, Acrobatic, and Commuter Category Airplanes). Athelon's compliance framing — AD citations, major/minor repair classification, maintenance record content — references Part 23 regulatory sections and the advisory circulars that govern Part 23 aircraft maintenance.

Helicopters operate under 14 CFR Part 27 (Airworthiness Standards: Normal Category Rotorcraft) or Part 29 (Transport Category Rotorcraft). Robinson R22/R44 and Bell 206/407 are Part 27. The certification basis differs in several compliance-surface areas that matter to Athelon:
- Part 27 §27.1529 requires an Airworthiness Limitations section in the Rotorcraft Flight Manual (RFM), not in the maintenance manual. This is structurally different from Part 23 aircraft, where airworthiness limitations are typically in the aircraft maintenance manual.
- Major/minor repair classification under Part 27 follows the same framework as Part 23 (Appendix A to Part 43) but with rotorcraft-specific structural categories that affect the Form 337 classification workflow.
- Work order template regulatory citations (§23.XX vs. §27.XX) are configuration data, not schema — Athelon can support Part 27 citations once the data is entered, but the pre-loaded template library (if any is built) must have rotorcraft-specific citations.

**Airworthiness Limitations Sections in the RFM**

Robinson's mandatory replacement times and service life limits are published in the RFM Airworthiness Limitations Section (ALS), not in a traditional maintenance manual. The ALS is FAA-approved and has the force of an AD for the specific items listed. Compliance with Robinson ALS items is mandatory.

The LLP dashboard concept maps correctly to Robinson ALS tracking. The data structure challenge is that Robinson ALS items include:
- Main rotor blades (hours or calendar, whichever first — R22: 2,200 hours or 12 years)
- Main rotor hub (hours)
- Tail rotor system (hours and event-based — blade strikes)
- Engine (hours and calendar — Lycoming and Robinson mandate both)
- Governor (hours)
- Drive system components

The existing LLP life accumulation engine handles hours, cycles, and date-based limits — this is architecturally compatible with Robinson's requirement set. However, the field mapping for Robinson components requires validation by a Robinson-qualified IA. The LLP dashboard should not be represented as covering Robinson ALS compliance until that validation is complete. **Pre-onboarding gate: Robinson IA validation of ALS field mapping before compliance-surface features are enabled.**

**Bell Service Instructions vs. ADs**

Bell helicopters maintain a mandatory service instruction network that has AD-equivalence through incorporation by reference. Specifically:
- Bell Technical Bulletins (TB) and Alert Service Bulletins (ASB) that are incorporated by reference into FAA ADs become mandatory. Athelon's AD compliance module handles these if the AD is in the FAA AD database with the Bell TB incorporated.
- Bell mandatory service instructions that are NOT incorporated by reference into an FAA AD do not appear in the standard FAA AD feed. A Bell shop tracking compliance via the FAA AD database alone will miss mandatory Bell maintenance items.

**This is a compliance gap risk, not a limitation.** If Athelon's AD compliance module is used by the Fort Worth shop and a Bell TB is not in the FAA AD feed, the module will show no applicable AD for that TB item — which is technically correct (no AD exists) but operationally dangerous (the maintenance is still mandatory per Bell's service data). The module would need either: (a) a supplemental service instruction tracking layer parallel to the AD compliance layer, or (b) explicit documentation to the Fort Worth DOM that the AD module does not cover Bell mandatory service instructions not incorporated into ADs.

Marcus's recommendation: Option (b) first — honest scope boundary communication before onboarding. Option (a) as a v2.0 feature (supplemental service instruction tracking) in Phase 26 or later.

**Life Limits: Helicopter Dynamic Components**

Fixed-wing LLP tracking (Phase 17) was designed around engine components, propellers, and structural life limits — the standard Part 23/Part 25 LLP model. Helicopter dynamic components have additional tracking complexity:
- **Blade strikes:** Main or tail rotor blade contact events require immediate retirement or inspection regardless of accumulated hours. The event-based LLP trigger (Phase 17 handled prop strikes) is structurally compatible but must be extended to main and tail rotor components, not just propeller events.
- **Dynamic component retirement:** Helicopter main rotor hub, tail rotor, and pitch links have retirement limits measured in hours AND subject to mandatory retirement if any overspeed event or hard landing is recorded. The combination of hours-based and event-based retirement is handled by the existing LLP engine, but the specific event types (overspeed, hard landing, blade strike) need to be defined in the LLP component configuration for rotorcraft.
- **Inspection intervals vs. retirement limits:** For fixed-wing LLPs, the life limit is typically a retirement interval (replace at X hours). For helicopter dynamic components, there are often both inspection intervals (inspect at X hours, retire at Y hours) and retirement limits. The LLP engine supports both — but the Bell/Robinson component configuration must specify both fields, not just the retirement limit.

**Marcus's Verdict — What Athelon Covers Today vs. What Needs Building**

| Area | Athelon Today | Gap | Required Before Fort Worth Onboards |
|---|---|---|---|
| Work order structure | ✅ Aircraft-agnostic | — | None |
| Task card execution | ✅ Aircraft-agnostic | — | None |
| Parts traceability | ✅ Aircraft-agnostic | — | None |
| RTS flow (§43.7 / §43.9) | ✅ Part 27-compatible | Reg citations are Part 23 templates | Update citation templates to Part 27 |
| LLP dashboard (hours/calendar/event) | ✅ Architecturally compatible | Robinson ALS field mapping unvalidated | Robinson-qualified IA audit of ALS mapping |
| AD compliance module | ✅ Covers ADs in FAA feed | Bell mandatory SIs not in AD feed missed | Scope boundary communication + future SI tracking |
| DOM dashboard | ✅ Works for all org types | — | None |
| Photo attachments, personnel compliance | ✅ Aircraft-agnostic | — | None |
| Form 337 (major/minor classification) | ✅ Part 27 uses same Appendix A | Part 27-specific structural categories | DOM interview to validate Form 337 use cases |
| Ferry permit design | ✅ Designed (flag off) | — | Same ferry WO gate applies (Marcus production memo) |
| MEL integration | ⬜ Not built | Part 27 MEL requirements parallel Part 135 | Depends on GAP 2 MEL work landing first |

**Recommended onboarding approach:**

1. **Begin administrative onboarding** — work orders, task card execution, parts traceability. These features work for Part 27 operations without modification. Rosa should interview the Fort Worth DOM before any demonstration to understand fleet mix (R22 vs. R44 vs. Bell 206 vs. 407) and specific documentation practices.

2. **Defer compliance-surface features** — do not enable AD compliance module or LLP dashboard as production compliance tools for the Fort Worth shop until:
   - Marcus's Robinson ALS field mapping audit is complete (estimated 3–4 weeks post-interview)
   - Bell mandatory SI scope boundary is communicated to the DOM in writing and acknowledged
   - Part 27 regulatory citation templates are loaded for their fleet

3. **Timeline:** After Desert Sky Turbine is stable (estimated 4–6 weeks post-Phase 25 Sprint 1), Rosa conducts Fort Worth DOM interview. Marcus's Part 27 audit runs concurrently with GAP 2 Part 135 work. Fort Worth administrative onboarding in Phase 25 Sprint 3; compliance-surface features in Phase 26 after audit completion.

4. **Do not represent Athelon's AD compliance module as covering Part 27 helicopters** until Marcus's audit is complete. The same discipline that kept the ferry permit flag off since Phase 4 applies here. An accurate scope boundary communicated clearly is better than a silent compliance gap discovered in an FSDO audit.

---

## Phase 25 Sprint Sequencing

| Sprint | Contents | Owner(s) |
|---|---|---|
| Sprint 1 | DST-FB-001 schema fix; Multi-org Phase 1 (schema + indexes) | Devraj + Marcus |
| Sprint 2 | Multi-org Phase 2 (mutation hardening) + Phase 3 (Clerk surface); Part 135 cert holder separation (2C) | Devraj + Jonas + Chloe |
| Sprint 3 | Part 135 pilot portal (2A) + Fort Worth admin onboarding; MEL design finalization | Marcus + Devraj + Priya (UAT) + Rosa |
| Sprint 4 | Part 135 MEL integration (2B) build; Fort Worth DOM interview + Marcus Part 27 audit | Devraj + Marcus + Rosa |

*Fort Worth compliance-surface features: Phase 26 after Marcus audit closes.*

---

*WS25 Plan filed. Phase 25 is active.*
