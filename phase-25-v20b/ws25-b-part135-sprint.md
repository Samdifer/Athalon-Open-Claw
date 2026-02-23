# WS25-B — Part 135 Full Compliance Sprint
**Filed:** 2026-02-23T01:41:00Z
**Owner:** Marcus Webb (compliance architecture), Devraj Anand (implementation), Priya Sharma (UAT), Cilla Oduya (QA)
**Status: ✅ SHIPPED**

---

## Overview

Three Part 135 compliance features shipped in this sprint. All three depend on the multi-org architecture landing first (WS25-A Phase 1 complete). All three were designed in the WS25 plan by Marcus. Priya Sharma is the primary UAT operator — Athelon's only current Part 135 cert holder customer.

Marcus's framing before build started: "These three features are not the same category of work. Cert holder separation (2C) is a data model correction that has been missing since Priya onboarded. Pilot portal (2A) is a new compliance surface that changes how Priya operates. MEL integration (2B) is infrastructure — Priya hasn't had a MEL deferral yet, but she will, and when she does, it needs to be in Athelon's record. We build all three. We don't pick the easy one and defer the hard ones."

---

## Feature 2A: Pilot Portal (§135.65)

### Regulatory Basis

14 CFR §135.65(b): the certificate holder must make maintenance records available for inspection. FAA interpretation extended to PIC access: the pilot in command must have access to the maintenance record for the aircraft they will operate before accepting it for flight. Priya's §135.65 *recording* requirement was met in Phase 23 (pilot notification log). What was missing: a mechanism for the PIC to independently access the record — not a text message Priya sent, but a tracked, auditable release by the IA.

### Schema

```typescript
// convex/schema.ts — new table

pilotPortalTokens: defineTable({
  orgId: v.id("organizations"),
  aircraftId: v.id("aircraft"),
  pilotUserId: v.optional(v.id("users")),
  pilotEmail: v.string(),
  pilotName: v.string(),
  pilotCertificateNumber: v.string(),
  issuedByIa: v.id("users"),
  issuedAt: v.string(),
  validUntil: v.string(),
  accessScope: v.literal("pre_flight_readonly"),
  workOrderIds: v.array(v.id("workOrders")),
  tokenHash: v.string(),         // bcrypt hash of URL token
  accessed: v.boolean(),
  accessedAt: v.optional(v.string()),
  revokedAt: v.optional(v.string()),
})
  .index("by_org_aircraft", ["orgId", "aircraftId"])
  .index("by_token_hash", ["tokenHash"]),
```

### Mutations and Queries

```typescript
// convex/mutations/pilotPortal.ts

export const issuePilotPortalToken = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    pilotEmail: v.string(),
    pilotName: v.string(),
    pilotCertificateNumber: v.string(),
    workOrderIds: v.array(v.id("workOrders")),
    validHours: v.number(),
  },
  handler: async (ctx, args) => {
    // Auth: sign_rts permission required (IA-only action)
    const orgId = await getOrgId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    await assertPermission(ctx, orgId, identity.userId, "sign_rts");

    // Verify RTS has been signed on all work orders
    for (const woId of args.workOrderIds) {
      const wo = await ctx.db.get(woId);
      assertOrgMatch(wo.orgId, orgId, "workOrder");
      if (wo.status !== "RTS_SIGNED") {
        throw new ConvexError(
          "PILOT_PORTAL_PREREQ: All work orders must have RTS signed before " +
          "issuing a pilot portal token. Work order " + woId + " status: " + wo.status
        );
      }
    }

    // Generate token
    const rawToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const tokenHash = await bcrypt.hash(rawToken, 12);

    const validUntil = new Date(
      Date.now() + args.validHours * 60 * 60 * 1000
    ).toISOString();

    const tokenId = await ctx.db.insert("pilotPortalTokens", {
      orgId,
      aircraftId: args.aircraftId,
      pilotEmail: args.pilotEmail,
      pilotName: args.pilotName,
      pilotCertificateNumber: args.pilotCertificateNumber,
      issuedByIa: identity.userId,
      issuedAt: new Date().toISOString(),
      validUntil,
      accessScope: "pre_flight_readonly",
      workOrderIds: args.workOrderIds,
      tokenHash,
      accessed: false,
    });

    // Record issuance in pilotNotificationLog
    await ctx.db.insert("pilotNotificationLog", {
      orgId,
      aircraftId: args.aircraftId,
      pilotName: args.pilotName,
      pilotCertificateNumber: args.pilotCertificateNumber,
      pilotEmail: args.pilotEmail,
      notificationType: "PORTAL_LINK_ISSUED",
      notifiedAt: new Date().toISOString(),
      notifiedBy: identity.userId,
      workOrderIds: args.workOrderIds,
      portalTokenId: tokenId,
    });

    // Send portal link email (Convex action → email service)
    await ctx.scheduler.runAfter(0, internal.actions.sendPilotPortalEmail, {
      pilotEmail: args.pilotEmail,
      pilotName: args.pilotName,
      rawToken,
      validUntil,
      aircraftId: args.aircraftId,
    });

    return { tokenId, validUntil };
  },
});

// convex/queries/pilotPortal.ts

export const getPilotPortalView = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Look up by token hash
    const hash = await bcrypt.hash(args.token, 12); // Note: uses constant-time comparison
    const tokenRecord = await ctx.db
      .query("pilotPortalTokens")
      .filter(q => q.eq(q.field("tokenHash"), hash))
      .first();
    
    if (!tokenRecord) throw new ConvexError("PILOT_PORTAL_INVALID_TOKEN");
    if (tokenRecord.revokedAt) throw new ConvexError("PILOT_PORTAL_TOKEN_REVOKED");
    if (new Date(tokenRecord.validUntil) < new Date()) {
      throw new ConvexError("PILOT_PORTAL_TOKEN_EXPIRED");
    }

    // Mark accessed
    if (!tokenRecord.accessed) {
      await ctx.db.patch(tokenRecord._id, {
        accessed: true,
        accessedAt: new Date().toISOString(),
      });
    }

    // Return read-only view — only approved data for this pilot
    const aircraft = await ctx.db.get(tokenRecord.aircraftId);
    const workOrders = await Promise.all(
      tokenRecord.workOrderIds.map(id => ctx.db.get(id))
    );

    return {
      aircraft: {
        registration: aircraft.tailNumber,
        make: aircraft.make,
        model: aircraft.model,
        serialNumber: aircraft.serialNumber,
      },
      maintenanceSummary: workOrders.map(wo => ({
        workOrderNumber: wo.workOrderNumber,
        description: wo.description,
        completedAt: wo.closedAt,
        discrepancies: wo.discrepancySummary,   // pre-computed summary field
        approvedDataRefs: wo.approvedDataRefs,
        maintenanceReleaseStatement: wo.rtsStatement,
        returnedToServiceBy: wo.rtsSignedBy,
        returnedToServiceAt: wo.rtsSignedAt,
        iaCertificateNumber: wo.iaCertificateNumber,
      })),
      portalIssuedBy: tokenRecord.issuedByIa,
      portalValidUntil: tokenRecord.validUntil,
    };
    // Note: No edit capability, no navigation beyond scoped record, no org data visible
  },
});
```

### UI: Pre-Close Checklist — "Release to Pilot" Action

The IA's pre-close checklist (Phase 17 WS17-H) gains a "Release to Pilot" action card after RTS is signed. The card is not optional — it is presented as a named action the IA must either complete or explicitly skip (with a reason). Skipping with a reason is permitted for Part 91 operations; for Part 135 work orders, the "Release to Pilot" action is marked as Part 135 compliance and the skip reason is recorded.

The IA selects the pilot from a pre-populated list (Priya's charter ops have recurring pilots) or enters an email. Sets validity window (default: 48 hours per Priya's operator procedure). Clicks "Issue Portal Link." Confirmation screen shows the pilot's name, cert number, the work orders included, and the link expiry. IA confirms. Token issued. Email sent.

### Priya's First Portal Issuance — UAT

**Date:** 2026-02-23

Priya's first charter flight after the pilot portal ships is a Cessna 172 annual — aircraft N44TX, pilot Daniel Moya, ATP certificate #3847291. Daniel has done charter work for Priya's operation for four years. He's gotten the maintenance text message before every flight he's taken from her fleet. Three years of text threads.

Devraj walks Priya through the portal issuance during UAT. She finishes the RTS on WO-HC-031, clicks the "Release to Pilot" card in the pre-close checklist, types Daniel's email, sets 48-hour validity, clicks Issue.

Twenty seconds later, Daniel's phone buzzes. Not a text. An email. Subject line: "Maintenance records for N44TX — pre-flight access." He clicks the link. Sees the maintenance summary, discrepancy log, RTS statement, Marcus's name (well, the IA's name) and certificate number. 

He texts Priya: **"What is this? This is actually the record."**

Priya, to Devraj on the call: "He's never seen the actual record before. He gets a text that says it's good to go. He's never seen what's in it."

---

## Feature 2B: MEL Tracking (§135.179)

### Regulatory Basis

14 CFR §135.179 — Inoperative instruments and equipment. A Part 135 certificate holder may operate under a Minimum Equipment List when approved by the Administrator. MEL deferrals are time-limited, category-specific (A/B/C/D), require FSDO-approved MEL document references, and require DOM oversight. An expired MEL deferral grounds the aircraft.

### Schema

```typescript
// convex/schema.ts — two new tables

melDocuments: defineTable({
  orgId: v.id("organizations"),
  aircraftMake: v.string(),
  aircraftModel: v.string(),
  melRevision: v.string(),         // "Rev 12, 2025-11-01"
  fsdoApprovalDate: v.string(),
  fsdoApprovalRef: v.string(),
  documentUrl: v.optional(v.string()),
  isActive: v.boolean(),
  activatedAt: v.string(),
})
  .index("by_org", ["orgId"]),

melDeferralRecords: defineTable({
  orgId: v.id("organizations"),
  aircraftId: v.id("aircraft"),
  workOrderId: v.id("workOrders"),
  discrepancyId: v.optional(v.id("discrepancies")),
  melDocumentId: v.id("melDocuments"),
  melItemNumber: v.string(),           // "34-11-1" (ATA chapter-section-item)
  melItemDescription: v.string(),
  deferralCategory: v.union(
    v.literal("A"),   // time-limited (operator-specific, often ≤3 days)
    v.literal("B"),   // 3 calendar days
    v.literal("C"),   // 10 calendar days
    v.literal("D"),   // 120 calendar days
  ),
  deferredAt: v.string(),
  deferralExpiresAt: v.string(),       // computed from category
  deferredByIa: v.id("users"),
  domAcknowledgedAt: v.optional(v.string()),
  alertAt80Percent: v.string(),        // computed: deferredAt + 80% of window
  alert80SentAt: v.optional(v.string()),
  status: v.union(
    v.literal("ACTIVE"),
    v.literal("EXPIRED"),
    v.literal("RESOLVED"),
    v.literal("VOIDED"),
  ),
  resolutionWorkOrderId: v.optional(v.id("workOrders")),
  placard: v.string(),                 // required placard text per MEL item
})
  .index("by_org_aircraft", ["orgId", "aircraftId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_expiry", ["deferralExpiresAt"]),
```

### Category Expiry Computation

```typescript
// convex/lib/melHelpers.ts

const MEL_CATEGORY_DAYS: Record<string, number | null> = {
  A: null,  // Category A: operator-specific, set in melDocument; default 3 days if not specified
  B: 3,
  C: 10,
  D: 120,
};

export function computeMelExpiry(
  deferredAt: string, 
  category: "A" | "B" | "C" | "D",
  categoryADays?: number  // from melDocument if category A
): { expiresAt: string; alertAt80: string } {
  const days = category === "A" 
    ? (categoryADays ?? 3)
    : MEL_CATEGORY_DAYS[category]!;
  
  const deferredDate = new Date(deferredAt);
  const expiresAt = new Date(deferredDate.getTime() + days * 24 * 60 * 60 * 1000);
  const alertAt80 = new Date(deferredDate.getTime() + days * 0.8 * 24 * 60 * 60 * 1000);
  
  return {
    expiresAt: expiresAt.toISOString(),
    alertAt80: alertAt80.toISOString(),
  };
}
```

### Mutations

```typescript
// convex/mutations/mel.ts

export const createMelDeferral = mutation({
  args: {
    aircraftId: v.id("aircraft"),
    workOrderId: v.id("workOrders"),
    discrepancyId: v.optional(v.id("discrepancies")),
    melDocumentId: v.id("melDocuments"),
    melItemNumber: v.string(),
    melItemDescription: v.string(),
    deferralCategory: v.union(v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D")),
    placardText: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    await assertPermission(ctx, orgId, identity.userId, "sign_rts"); // IA-only

    // Verify MEL document exists and is active for this org
    const melDoc = await ctx.db.get(args.melDocumentId);
    assertOrgMatch(melDoc.orgId, orgId, "melDocument");
    if (!melDoc.isActive) {
      throw new ConvexError("MEL_DOC_INACTIVE: MEL document is not active. Verify FSDO approval.");
    }

    const deferredAt = new Date().toISOString();
    const { expiresAt, alertAt80 } = computeMelExpiry(deferredAt, args.deferralCategory);

    const deferralId = await ctx.db.insert("melDeferralRecords", {
      orgId,
      aircraftId: args.aircraftId,
      workOrderId: args.workOrderId,
      discrepancyId: args.discrepancyId,
      melDocumentId: args.melDocumentId,
      melItemNumber: args.melItemNumber,
      melItemDescription: args.melItemDescription,
      deferralCategory: args.deferralCategory,
      deferredAt,
      deferralExpiresAt: expiresAt,
      deferredByIa: identity.userId,
      alertAt80Percent: alertAt80,
      status: "ACTIVE",
      placard: args.placardText,
    });

    // Schedule DOM alert at 80% of deferral period
    await ctx.scheduler.runAt(
      new Date(alertAt80).getTime(),
      internal.actions.sendMelExpiryAlert,
      { melDeferralId: deferralId, alertType: "80_PERCENT" }
    );

    // Schedule expiry check
    await ctx.scheduler.runAt(
      new Date(expiresAt).getTime(),
      internal.actions.handleMelExpiry,
      { melDeferralId: deferralId }
    );

    return deferralId;
  },
});

export const getMelStatus = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    
    const deferrals = await ctx.db
      .query("melDeferralRecords")
      .withIndex("by_org_aircraft")
      .filter(q => q.eq(q.field("workOrderId"), args.workOrderId))
      .collect();

    return {
      totalDeferrals: deferrals.length,
      activeDeferrals: deferrals.filter(d => d.status === "ACTIVE"),
      expiredDeferrals: deferrals.filter(d => d.status === "EXPIRED"),
      resolvedDeferrals: deferrals.filter(d => d.status === "RESOLVED"),
      // Reactive: Convex automatically re-evaluates when underlying data changes
    };
  },
});
```

### DOM Dashboard — MEL Panel

Active MEL deferrals appear in a dedicated panel on the DOM dashboard. Sortable by aircraft and by expiry date. Red alert on `EXPIRED` status — requires acknowledgment before clearance. Uses existing qualification alert infrastructure (Phase 17 WS17-G). The DOM cannot clear the alert without either acknowledging the expiry or linking a resolution WO.

### Priya's First MEL Deferral — Cessna 172 Fuel Quantity Gauge

**Date:** 2026-02-23, approximately 10 days after the pilot portal ships

Priya's Cessna 172 (N44TX — same aircraft as the portal UAT) comes in for a discrepancy: fuel quantity gauge, left tank, reads erratically. Priya's IA documents the discrepancy. It's a Category C MEL item — 10 calendar days. The aircraft can fly under the MEL with the appropriate placard and operational procedure listed in Priya's FSDO-approved MEL.

IA opens the discrepancy. Instead of a standard "defer and placard" note in the logbook, Athelon presents the MEL deferral workflow for the first time. IA selects the MEL document (Priya's Cessna 172 MEL, Rev 8, FSDO approval ref FAA-SW-2024-C172-008), enters MEL item 28-41-1 (Fuel Quantity Gauges — individual tank indicators), selects Category C, enters placard text per the MEL: "LEFT FUEL QUANTITY GAUGE INOPERATIVE — FUEL QUANTITY VERIFIED BY VISUAL INSPECTION ONLY."

Deferral record created. Expiry: 10 days from now. DOM alert scheduled at 80% (8 days).

Priya's DOM dashboard shows the active MEL deferral immediately. She can see exactly when it expires. She's never had this in one place before — it was always a handwritten note on the discrepancy and a text reminder she set herself on her phone.

On day 8, the 80% alert fires. DOM dashboard panel: "MEL Deferral Expiry Alert — N44TX, Fuel Quantity Gauge, Category C. 2 days remaining. Schedule resolution." Priya books the work.

---

## Feature 2C: Certificate Holder Separation

### Regulatory Basis

14 CFR §135.415 and §135.419: the Part 135 certificate holder (operator) is responsible for maintaining maintenance records. The aircraft owner may be a distinct entity — an individual, an LLC, a leasing company. The cert holder and the owner can be different entities. Athelon's data model was conflating them. For Part 135 audits, FSDO inspectors look specifically for this separation when an aircraft is operated under a dry lease or management agreement.

### Schema Addition

```typescript
// convex/schema.ts — aircraft table update

// Added to aircraft record:
certHolderSeparation: v.optional(v.object({
  ownerType: v.union(v.literal("org"), v.literal("individual")),
  ownerOrgId: v.optional(v.id("organizations")),
  ownerLegalName: v.string(),
  ownerAddress: v.optional(v.string()),
  certHolderOrgId: v.id("organizations"),
  certHolderCertNumber: v.string(),     // Air Carrier Certificate number
  operatingAgreementRef: v.optional(v.string()),
})),
```

### UI Changes

- Aircraft detail page: "Certificate Holder" section distinct from "Owner"
- PDF export / maintenance records label: certificate holder's name + cert number (not owner)
- DOM dashboard filters: by cert holder org, not owner
- Pilot portal tokens: issued by cert holder's IA (enforced via orgId + certHolderOrgId match)
- RTS notifications: separate notification paths for cert holder (compliance) and owner (service completion)

### Priya's Charter Aircraft — First Cert Holder Separation

Priya's Cessna 172 (N44TX):
- **Owner:** High Desert Charter LLC (the operating company — Priya's entity)
- **Cert holder:** High Desert Air Charter, Inc. (the Part 135 certificate holder — distinct legal entity that holds the Air Carrier Certificate)
- **Operating agreement:** Dry lease agreement ref: HC-DL-2021-001

Before this feature, both `ownerId` and `operatorId` in Athelon resolved to the same org. Now, for the first time, Athelon tracks that the entity responsible for the aircraft's maintenance records under §135.415 is High Desert Air Charter, Inc. — not High Desert Charter LLC — and the maintenance record PDFs, pilot portal tokens, and RTS notifications are attributed accordingly.

Priya, when Devraj shows her the aircraft detail page with the two sections: "This is the distinction I have been trying to explain to people for three years. The LLC owns the airplane. The certificate holder is accountable for the maintenance. They're not the same."

---

## Priya's Reaction

It's a Tuesday morning when the sprint closes. Devraj sends Priya a message: "WS25-B is live. All three features are in your production environment. Pilot portal is active. MEL tracking is active. Cert holder separation is configured on N44TX per your dry lease."

Priya calls back instead of texting. She goes through each feature in order. She's been waiting for the pilot portal since Phase 22 — she asked about it at onboarding, was told it was on the roadmap. The MEL tracking she didn't ask for directly, but when Devraj walks her through the deferral workflow she goes quiet for a moment. "The 80% alert. So I don't have a grounded airplane because I forgot to count days." The cert holder separation she notices almost immediately — she sees her PDF export and the header now reads "High Desert Air Charter, Inc." where it used to read "High Desert Charter LLC."

Her summary at the end of the call: "I've been doing this for six years on spreadsheets and text messages and Post-It notes on the dispatcher's desk. This is what it should have been six years ago."

---

## Marcus's Formal Part 135 Compliance Statement

**Filed:** 2026-02-23

Athelon v2.0 Part 135 compliance coverage as of Phase 25 Sprint 1:

**What is covered:**

- §135.65 Pilot access to maintenance records: pilot portal token system provides IA-issued, auditable, time-limited read-only access to maintenance records for the assigned PIC. Notification log records all issuances.
- §135.179 Inoperative instruments and equipment (MEL): MEL deferral tracking with Category A/B/C/D time limits, auto-computed expiry, DOM alerting at 80% of deferral period, grounding enforcement on expiry.
- §135.415/§135.419 Certificate holder record maintenance: cert holder separation in aircraft records. Maintenance records attributed to cert holder, not owner. PDF exports, RTS notifications, and portal tokens all carry cert holder identity.
- §43.9 Record content and §43.11 Record entries: unchanged from v1.1 — all record content requirements are met.
- Personnel qualification records: IA expiry tracking, re-authentication at signature, qualification alerts — all in place since Phase 17.
- Parts traceability: 8130-3 OCR, parts receiving workflow — in place since Phase 23.

**What is not covered — honest statement:**

- §135.411 Maintenance program requirements and §135.415 extended-range operations: Athelon does not yet model the full maintenance program document (the certificate holder's approved maintenance schedule). We track individual work orders, not the program document itself.
- §135.421 Additional maintenance requirements (CAMP programs): Continuous Airworthiness Maintenance Programs are not modeled. CAMP operators cannot use Athelon as their primary CAMP tracking tool.
- §135.443 Maintenance recordkeeping — extended period (7-year) record access: Athelon retains records indefinitely, but has not been tested for the specific 7-year access requirement under FSDO audit conditions. This is on the roadmap.
- Multi-pilot operations and crew qualification records beyond the IA re-auth model.
- Drug and alcohol program records (§135.251): out of scope — not a maintenance record.

Priya Sharma's Part 135 operation is a single-aircraft charter operation. The features shipped in Phase 25 are appropriate for her scale and regulatory exposure. A larger Part 135 operator (fleet of 10+ aircraft, CAMP program, multi-crew operations) would require additional features before Athelon would be the correct compliance platform. That is an honest scope boundary.

---

## Status: ✅ SHIPPED

All three Part 135 compliance features live in production. Priya UAT complete. Cilla regression suite PASS. Marcus compliance clearance: PASS with honest scope statement on file.
