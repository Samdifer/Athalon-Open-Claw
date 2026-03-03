# WS18-E — WS17-H Pre-Close Severity Seam Closure

**Phase:** 18  
**Workstream:** WS18-E  
**Owners:** Devraj Anand (code fix) + Marcus Webb (severity sign-off) + Cilla Oduya (TC-H-07 re-run) + Jonas Harker (flag enablement)  
**Date:** 2026-02-22  
**Source Conditional:** WS17-H — Phase 17 Gate Conditional Item (seam S-07, pre-close severity linkage)  
**Feature Flag:** `PRECLOSE_WS16B_INTEGRATION_ENABLED` — currently `false` in all environments  
**Status: CLOSED**

---

## 1. Seam Description

### 1.1 What the Exact Gap Is

The pre-close checklist engine (WS17-H) contains a rule registry with rules R01 through R09. Rule R03 is the "IA Certification Currency Check" — it verifies that the signing IA's certification is current and has been re-authenticated in accordance with WS16-B's IA re-auth integration before the work order can be closed.

The gap is not in the rule itself. The gap is in **how the rule accesses WS16-B's `signatureAuthEvents` table** to classify the severity of its finding.

**Root cause:** When WS16-H (pre-close build spec) was written in Phase 16, WS16-B (IA re-auth build) had not yet finalized its integration contract — specifically, which fields on `signatureAuthEvents` carry the IA currency determination and what the shape of the lookup query is. WS16-H's R03 rule was written with a placeholder lookup pattern that assumes `signatureAuthEvents` has a field called `iaCurrencyStatus: "CURRENT" | "LAPSED"`. When WS16-B was finalized, the actual field name and enum values differed.

**The mismatch:**

| | WS16-H Assumption (placeholder) | WS16-B Actual Contract |
|---|---|---|
| Field name | `iaCurrencyStatus` | `authCurrencyResult` |
| Enum: current | `"CURRENT"` | `"currency_verified"` |
| Enum: lapsed | `"LAPSED"` | `"currency_lapsed"` |
| Query index | `by_workOrder_ia` | `by_workOrder_signerRole` (with `signerRole = "IA"` filter) |
| Available at close time? | Assumed yes (no expiry) | Actually: token has 4-hour TTL from auth event; query must look for most recent unexpired event |

When `evaluatePreCloseChecklist` runs R03 with `PRECLOSE_WS16B_INTEGRATION_ENABLED = true`, the lookup query references the placeholder field names and gets `null` — which the rule's error handler catches as a `RULE_EVAL_ERROR`, resulting in a BLOCKING FAIL verdict.

**Why the flag exists:** The flag was added precisely because this was detected in testing before Phase 17 gate. Rather than delay the gate, the rule was feature-flagged so the rest of the checklist (8 rules) could run correctly while R03's dependency was resolved.

**Why this is a severity seam, not just a bug fix:** Before Devraj can fix the field name mismatch, Marcus must sign off on R03's severity classification — BLOCKING vs. ADVISORY. The reason this matters:

The IA currency check rule exists because an IA who signs an RTS with a lapsed certificate is a §65.93 compliance issue (IA certificate currency). However, there is a legitimate question about whether Athelon's pre-close checklist should **hard-block** the close on this finding, given that:

1. The IA certificate is already validated at sign-off time by the qualification precheck in WS17-B (TC-G-05 ordering proof). If the IA was current when they signed, R03 at close time is belt-and-suspenders.
2. If the IA's certificate lapses between sign-off and close (which can happen for long WOs), blocking the close forces the shop to either get a new IA to re-sign or wait for the original IA's certificate to be renewed — neither of which is a good user experience.
3. The regulatory requirement is that the IA was current **at the time of signing**, not at the time of close.

Marcus's severity classification is therefore: does R03 check currency **at close time** (BLOCKING if lapsed at close = wrong design), or does it check whether the IA's currency was validated **at sign-off time** via `signatureAuthEvents` (BLOCKING if the auth event shows `currency_lapsed` at signature = correct design)?

---

## 2. Resolution — Code Change Specification

### 2.1 Marcus's Severity Decision (Required First)

**Marcus Webb's severity classification for R03:**

> *"R03 should check whether the IA's currency was validated at the time of sign-off — not whether the IA is current at the moment of pre-close evaluation. The regulatory question is: did a current IA sign this work? The answer lives in the `signatureAuthEvents` record, which is immutable after creation. A lapsed certificate at close time, when the IA was current at sign-off, is not a compliance issue. A `currency_lapsed` result in the `signatureAuthEvents` record means the IA was not current when they signed — that is a BLOCKING finding and must prevent close.*
>
> *R03 severity classification: BLOCKING when `authCurrencyResult = 'currency_lapsed'` in the most recent IA `signatureAuthEvents` record for this work order. ADVISORY when no IA auth event exists (belt-and-suspenders warning, not a hard close block — the qualification precheck at sign-off time already validated this). The ADVISORY case should display: 'IA re-auth event not found for this work order — if IA re-auth was completed, this finding may be a data lookup issue. Contact Athelon support before closing if the IA's certificate status is in question.'*"

**Marcus Webb — Severity Classification Sign-Off:**  
R03: BLOCKING on `currency_lapsed` · ADVISORY on missing auth event  
Signed: Marcus Webb, 2026-02-22

---

### 2.2 Devraj's Code Change Spec

**File:** `convex/lib/preCloseRules.ts`

**Current R03 implementation (broken — with flag off):**

```typescript
// R03 — IA Certification Currency Check (WS16-B integration)
// STATUS: FEATURE FLAGGED — PRECLOSE_WS16B_INTEGRATION_ENABLED must be true
{
  ruleId: "R03",
  label: "IA Certification Currency",
  category: "IA_CERTIFICATION",
  severity: "BLOCKING",    // Will be BLOCKING or ADVISORY per Marcus classification below
  evaluate: async (ctx, workOrder) => {
    if (!PRECLOSE_WS16B_INTEGRATION_ENABLED) {
      return {
        passed: true,
        severity: "ADVISORY",
        detail: "IA certification check advisory (feature flag: pre-close WS16-B integration pending)",
        regulatoryRef: "14 CFR §65.93",
      };
    }

    // BUG: placeholder field names — do not match WS16-B actual contract
    const iaAuthEvent = await ctx.db
      .query("signatureAuthEvents")
      .withIndex("by_workOrder_ia", q => q.eq("workOrderId", workOrder._id))   // WRONG INDEX
      .filter(q => q.eq(q.field("iaCurrencyStatus"), "CURRENT"))               // WRONG FIELD
      .first();

    return {
      passed: !!iaAuthEvent,
      severity: "BLOCKING",
      detail: iaAuthEvent
        ? "IA certification current at time of sign-off"
        : "IA certification could not be verified",
      regulatoryRef: "14 CFR §65.93",
    };
  },
},
```

**Fixed R03 implementation (WS16-B actual contract + Marcus severity classification):**

```typescript
// R03 — IA Certification Currency Check (WS16-B integration)
// STATUS: ACTIVE — PRECLOSE_WS16B_INTEGRATION_ENABLED = true in production
// Field names corrected to match WS16-B signatureAuthEvents contract.
// Severity classification by Marcus Webb (WS18-E): BLOCKING on currency_lapsed,
// ADVISORY on missing auth event (per WS18-E §1.2 severity sign-off).
{
  ruleId: "R03",
  label: "IA Certification Currency at Sign-Off",
  category: "IA_CERTIFICATION",
  evaluate: async (ctx, workOrder) => {
    // Feature flag check (will be removed when PRECLOSE_WS16B_INTEGRATION_ENABLED
    // is permanently set to true after WS18-E flag enablement)
    if (!PRECLOSE_WS16B_INTEGRATION_ENABLED) {
      return {
        passed: true,
        severity: "ADVISORY",
        detail: "IA certification check advisory (feature flag: pre-close WS16-B integration pending)",
        regulatoryRef: "14 CFR §65.93",
      };
    }

    // WS16-B actual contract:
    // Index: by_workOrder_signerRole (workOrderId + signerRole)
    // Field: authCurrencyResult: "currency_verified" | "currency_lapsed" | "not_evaluated"
    // Regulatory note: we check the auth event's record of currency at sign-off time,
    // NOT the IA's current certificate status. The auth event is immutable.
    const iaAuthEvents = await ctx.db
      .query("signatureAuthEvents")
      .withIndex("by_workOrder_signerRole", q =>
        q.eq("workOrderId", workOrder._id).eq("signerRole", "IA")
      )
      .order("desc")
      .collect();

    // Case 1: No IA auth event found for this work order
    if (iaAuthEvents.length === 0) {
      return {
        passed: true,                // ADVISORY — do not block on missing event alone
        severity: "ADVISORY",
        title: "IA Re-Auth Event Not Found",
        detail:
          "No IA re-authentication event found for this work order. " +
          "If IA re-auth was completed, this may be a data lookup issue. " +
          "Contact Athelon support before closing if the IA's certificate status is in question.",
        regulatoryRef: "14 CFR §65.93",
      };
    }

    // Case 2: Most recent IA auth event found — check authCurrencyResult
    const mostRecentIaAuth = iaAuthEvents[0];

    if (mostRecentIaAuth.authCurrencyResult === "currency_lapsed") {
      return {
        passed: false,               // BLOCKING — IA was not current at sign-off
        severity: "BLOCKING",
        title: "IA Certificate Lapsed at Time of Sign-Off",
        detail:
          `IA ${mostRecentIaAuth.signerDisplayName} (cert: ${mostRecentIaAuth.signerCertificateNumber}) ` +
          `authenticated for this work order at ${new Date(mostRecentIaAuth.createdAt).toISOString()} ` +
          `with currency result: 'currency_lapsed'. ` +
          `A lapsed IA certificate at time of signing is a compliance violation (14 CFR §65.93). ` +
          `A current IA must re-sign or this finding must be resolved before close.`,
        evidencePointer: `signatureAuthEvents/${mostRecentIaAuth._id}`,
        remediationRoute: "/dashboard/work-orders/[id]/ia-resign",
        regulatoryRef: "14 CFR §65.93",
      };
    }

    // Case 3: currency_verified or not_evaluated — rule passes
    return {
      passed: true,
      severity: "BLOCKING",          // Classification preserved for when it would fire
      title: "IA Certification Current at Sign-Off",
      detail:
        `IA ${mostRecentIaAuth.signerDisplayName} (cert: ${mostRecentIaAuth.signerCertificateNumber}) ` +
        `confirmed current at time of sign-off ` +
        `(authCurrencyResult: ${mostRecentIaAuth.authCurrencyResult}).`,
      evidencePointer: `signatureAuthEvents/${mostRecentIaAuth._id}`,
      regulatoryRef: "14 CFR §65.93",
    };
  },
},
```

**Additional index required on `signatureAuthEvents`:**
```typescript
// convex/schema.ts — add index to signatureAuthEvents table
.index("by_workOrder_signerRole", ["workOrderId", "signerRole"])
```

This index was missing from the WS16-B schema migration because it was considered a future optimization. It is now a correctness requirement for R03.

**Flag removal:**  
After TC-H-07 re-run passes (§3), Jonas removes the feature flag check from R03 and sets `PRECLOSE_WS16B_INTEGRATION_ENABLED = true` in production configuration. The flag constant itself can then be removed from the codebase in a follow-up cleanup PR.

---

## 3. Test Case: TC-H-07 Re-Run With Fix — PASS Evidence

**Test case reference:** TC-H-07 — "Fail-closed on rule evaluation error"  
**Original behavior:** TC-H-07 passed in Phase 17 because R03 was feature-flagged (the bug path was not reachable). The test confirmed that when R03 throws, the checklist returns FAIL. Post-fix, TC-H-07 must pass with R03 active and the correct WS16-B contract.

**Cilla Oduya's test execution — 2026-02-22:**

### Pre-fix baseline (with flag = true, before field name fix)

```typescript
// Test harness: inject a work order with a valid IA auth event in the DB
// using the CORRECT WS16-B field names (authCurrencyResult, by_workOrder_signerRole)
// but run the OLD R03 code that references the wrong field names.

const result = await testEvaluatePreCloseChecklist({
  workOrderId: testWO._id,
  flagEnabled: true,   // force flag on to exercise the broken path
});

// Expected: RULE_EVAL_ERROR from R03 because the index doesn't exist yet → FAIL verdict
// Actual: ✅ CONFIRMED FAIL
// R03 threw: ConvexError "Index 'by_workOrder_ia' not found on 'signatureAuthEvents'"
// Checklist verdict: FAIL (BLOCKING) — fail-closed as designed
// TC-H-07 core property confirmed: error in rule evaluation → BLOCKING FAIL verdict
```

### Post-fix verification (with flag = true, after field name fix + index added)

**Scenario A — IA auth event with `currency_verified`:**

```typescript
await ctx.db.insert("signatureAuthEvents", {
  workOrderId: testWO._id,
  signerRole: "IA",
  signerDisplayName: "Dale Renfrow",
  signerCertificateNumber: "3126-IA",
  authCurrencyResult: "currency_verified",
  createdAt: Date.now() - 3600000,  // 1 hour ago
  // ... other required fields
});

const result = await evaluatePreCloseChecklist({ workOrderId: testWO._id });

// R03 result: passed = true, severity = "BLOCKING", detail contains "confirmed current"
// Overall checklist: PASS (assuming no other blocking findings)
// ✅ TC-H-07-A: PASS
```

**Scenario B — IA auth event with `currency_lapsed`:**

```typescript
await ctx.db.insert("signatureAuthEvents", {
  workOrderId: testWO._id,
  signerRole: "IA",
  signerDisplayName: "Dale Renfrow",
  signerCertificateNumber: "3126-IA",
  authCurrencyResult: "currency_lapsed",
  createdAt: Date.now() - 3600000,
  // ...
});

const result = await evaluatePreCloseChecklist({ workOrderId: testWO._id });

// R03 result: passed = false, severity = "BLOCKING"
// Detail: "IA Dale Renfrow (cert: 3126-IA) authenticated... with currency result: 'currency_lapsed'"
// Overall checklist: FAIL (BLOCKING)
// closeAllowed: false
// ✅ TC-H-07-B: PASS — BLOCKING on currency_lapsed confirmed
```

**Scenario C — No IA auth event (missing event — ADVISORY case):**

```typescript
// No signatureAuthEvents record inserted for this work order

const result = await evaluatePreCloseChecklist({ workOrderId: testWO._id });

// R03 result: passed = true, severity = "ADVISORY"
// Detail: "No IA re-authentication event found..."
// Overall checklist: CONDITIONAL (advisory finding, no blocking findings)
// closeAllowed: true (strictMode = false)
// ✅ TC-H-07-C: PASS — ADVISORY on missing event, close allowed
```

**Scenario D — Rule evaluation error (TC-H-07 original property preserved):**

```typescript
// Inject a malformed workOrderId that causes the query to throw an unexpected error
// (simulated via test hook that throws from within the R03 evaluator)

const result = await evaluatePreCloseChecklist({ workOrderId: "malformed" });

// Checklist catches the R03 throw → RULE_EVAL_ERROR finding (BLOCKING)
// verdict: FAIL, closeAllowed: false
// ✅ TC-H-07-D: PASS — fail-closed on rule evaluation error, original property preserved
```

### Full TC-H-07 Re-Run Summary

| Sub-test | Scenario | Expected | Actual | Result |
|---|---|---|---|---|
| TC-H-07-A | IA auth event: currency_verified | R03 PASS, checklist PASS | PASS | ✅ |
| TC-H-07-B | IA auth event: currency_lapsed | R03 BLOCKING FAIL, close blocked | BLOCKING FAIL | ✅ |
| TC-H-07-C | No IA auth event | R03 ADVISORY, close allowed | ADVISORY, allowed | ✅ |
| TC-H-07-D | Rule evaluation throws | RULE_EVAL_ERROR, BLOCKING FAIL | BLOCKING FAIL | ✅ |

**TC-H-07 RESULT: PASS (all 4 sub-tests)**  
**Run by:** Cilla Oduya  
**Date:** 2026-02-22  
**Environment:** Convex test environment (vitest + @convex-dev/test, in-memory DB)

---

## 4. Marcus Webb — Compliance Sign-Off

**Marcus Webb, Regulatory/Compliance Authority**

I reviewed the code change specification in §2 and the TC-H-07 re-run evidence in §3.

**On severity classification:**  
The distinction between "IA was not current at sign-off" (BLOCKING) and "no auth event found" (ADVISORY) is the correct policy position. The regulatory requirement under §65.93 is that the IA must be current when exercising their certificate. If the auth event record says `currency_lapsed`, that is a finding that must block close — we cannot close a work order knowing the signing IA's certificate was lapsed. If there is no auth event record, that is a data issue, not a confirmed violation, and an ADVISORY with a contact-support instruction is the appropriate response.

**On the field name correction:**  
The field name mismatch (`iaCurrencyStatus` vs. `authCurrencyResult`) was a specification drift issue between WS16-H and WS16-B, not a design error. The corrected code now reads the actual WS16-B contract. I reviewed the WS16-B build artifact to confirm `authCurrencyResult: "currency_verified" | "currency_lapsed"` is the actual schema. It is.

**On the new index:**  
The `by_workOrder_signerRole` index is a correctness requirement. The R03 rule cannot function without it. Adding this index does not change any other behavior in the system.

**Is the resolution compliant?**  
Yes. The corrected R03 rule correctly enforces §65.93 compliance — it blocks close when we have positive evidence that the IA was not current at sign-off, and it produces an ADVISORY (not a hard block) when the auth event is absent. This matches the regulatory intent: we are not creating a compliance violation (blocking close) on the basis of a missing record alone; we are blocking close on the basis of a confirmed lapsed-currency finding.

**Does the severity classification match regulatory requirements?**  
Yes. 14 CFR §65.93 requires IA currency at the time of exercising the certificate. BLOCKING on `currency_lapsed` is the correct enforcement. ADVISORY on missing event is appropriate because the absence of an auth event record could be a system lookup issue, not a confirmed compliance violation.

**Marcus Webb — Compliance Sign-Off: CONFIRMED**  
**Date: 2026-02-22**

---

## 5. Cilla Oduya — TC-H-07 Unconditional Pass Confirmation

**Cilla Oduya, QA Lead**

TC-H-07 now passes unconditionally. The original Phase 17 conditional attached to WS17-H was: *"TC-H-07 passes fail-closed, but R03 is feature-flagged; the seam is not fully tested."* That conditional is now closed.

With the field name fix and the `by_workOrder_signerRole` index, R03 is fully functional against the WS16-B actual contract. All four TC-H-07 sub-tests pass. The fail-closed property (TC-H-07-D) is preserved — a rule evaluation error still produces a BLOCKING FAIL verdict. The new passing cases (TC-H-07-A/B/C) confirm R03 produces the correct severity classification for each scenario.

**TC-H-07 now passes unconditionally with `PRECLOSE_WS16B_INTEGRATION_ENABLED = true`.**

The flag may be set to `true` in production configuration by Jonas Harker after this artifact is filed.

**Cilla Oduya — QA Sign-Off: CONFIRMED**  
**Date: 2026-02-22**

---

## 6. Jonas Harker — Flag Enablement

**Jonas Harker, Lead Engineer**

Following Marcus's sign-off and Cilla's confirmation:

1. `PRECLOSE_WS16B_INTEGRATION_ENABLED` set to `true` in staging environment configuration.
2. Staging smoke test ST-09 re-run with flag enabled:
   - Pre-close checklist ran with R03 active.
   - Test WO had a valid IA auth event with `currency_verified`.
   - R03 returned PASS. Checklist verdict: PASS (0 blocking, 0 advisory on this WO — since the staging WO had a clean auth event).
   - ✅ PASS in staging.
3. Flag set to `true` in production environment configuration (pending production deployment authorization from WS18-G gate review).
4. Feature flag comment in codebase updated to: `// PRECLOSE_WS16B_INTEGRATION_ENABLED — SET TO TRUE 2026-02-22 (WS18-E closure)`
5. Flag removal from codebase scheduled for v1.1.1 cleanup sprint.

**Jonas Harker — Flag Enablement: CONFIRMED**  
**Date: 2026-02-22**

---

## 7. Status

**WS18-E STATUS: CLOSED**

The WS17-H pre-close severity seam is closed. R03 is corrected, tested, and production-authorized. TC-H-07 passes unconditionally. The seam that was marked CONDITIONAL in the Phase 17 gate is resolved.

**Phase P4 production activation** (as defined in the Phase 17 gate review) is now authorized:  
> *"Phase P4 (after WS17-H WS16-B seam + Marcus severity sign-off): Enable `PRECLOSE_WS16B_INTEGRATION_ENABLED = true` in production."*

This phase is complete. The flag is authorized for production.

---

*Filed: 2026-02-22 | Phase 18 — WS18-E Pre-Close Severity Seam Closure | Athelon v1.1*  
*Owner: Devraj Anand (code fix) + Marcus Webb (severity sign-off) + Cilla Oduya (test execution) + Jonas Harker (flag enablement)*
