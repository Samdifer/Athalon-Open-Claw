# WS16-B — IA Re-Auth Build + AC 120-78B Proof

**Phase:** 16  
**Depends on:** `phase-15-rd/ws15-b-ia-reauth.md`  
**Owners:** Jonas Harker (auth/backend), Chloe Park (UI), Marcus Webb (compliance), Dale Renfrow (SME UAT)  
**Status:** **READY FOR BUILD**

---

## 1) Implementation Spec

Build the Phase 15 design into production-grade flow with four hard properties:
1. **Per-signature auth events only** (no session reuse).
2. **IA currency hard gate before modal open**.
3. **Summary-before-credential + anti-rubber-stamp controls**.
4. **Atomic consume-and-sign mutation with immutable audit trail**.

### Build modules
- `convex/schema.ts`: extend `signatureAuthEvents` with `intendedTable` + method metadata.
- `convex/iaAuth.ts`: `validateIaCurrencyBeforeModal`, `consumeIaAuthAndSignRts`.
- `convex/http/sessionReAuthenticated.ts`: webhook strategy mapping + biometric-only reject.
- `web/components/signoff/IaReauthModal.tsx`: dwell timer, scroll requirement, timeout handling.
- `web/components/signoff/CommittedRtsRecordView.tsx`: render stored record fields + hash.

---

## 2) Concrete Mutation / Query / API Contracts

### Query: `validateIaCurrencyBeforeModal`
```ts
args: { workOrderId: Id<"workOrders"> }
returns:
  | { allowed: true }
  | { allowed: false; code: "IA_EXPIRED"|"IA_RECENT_EXP_LAPSED"|"IA_NUMBER_MISSING"|"IA_NOT_HELD"; message: string }
```

### HTTP Action: `sessionReAuthenticated`
```ts
payload: Clerk session.reAuthenticated webhook
behavior:
- verify HMAC
- derive authMethod (pin/password/mfa/biometric)
- if IA scope + biometric-only => 422 IA_AUTH_BIOMETRIC_ONLY_REJECTED
- create signatureAuthEvent { consumed:false, expiresAt:+5m, intendedTable }
```

### Mutation: `consumeIaAuthAndSignRts`
```ts
args: { workOrderId: Id<"workOrders">; signatureAuthEventId: Id<"signatureAuthEvents"> }
throws:
- IA_AUTH_EVENT_CONSUMED
- IA_AUTH_EVENT_EXPIRED
- IA_AUTH_EVENT_WRONG_TABLE
- RTS_ALREADY_SIGNED
- IA_CURRENCY_INVALID
returns: { returnToServiceId: Id<"returnToService">; signatureHash: string; consumedAt: number }
```

### Query: `getCommittedRtsRecord`
```ts
args: { returnToServiceId: Id<"returnToService"> }
returns: stored immutable fields including iaCertificateNumber, iaNumber, signatureHash, signatureAuthEventId
```

---

## 3) UI Behaviors

- Re-auth modal opens only after `validateIaCurrencyBeforeModal.allowed=true`.
- Full certification summary displays first.
- PIN field disabled for **5 seconds minimum dwell**.
- If summary overflows viewport: scroll-to-bottom required before PIN enable.
- Timeout after 10s waiting for auth event: show explicit no-commit message.
- After successful mutation, show committed record view (not pretty summary) with full hash.

---

## 4) UAT Script (Named SME: Dale Renfrow)

1. Open annual-inspection WO pending RTS.
2. Trigger IA sign-off; verify full certification text appears before PIN.
3. Attempt early PIN entry before 5s: blocked.
4. Complete PIN auth; sign RTS.
5. Confirm committed record view shows IA #, cert #, and full SHA-256.
6. Repeat with interrupted network after PIN submit; verify deterministic outcome:
   - either no record (retry required), or
   - record exists and WO closed (no duplicate signing path).

**Pass condition:** Dale confirms “deliberate and defensible” flow and signs UAT sheet.

---

## 5) Cilla Test Matrix

| ID | Scenario | Expected |
|---|---|---|
| B-01 | Happy-path IA sign | Event consumed once, RTS created once |
| B-02 | Reuse consumed event | Hard reject |
| B-03 | Expired auth event | Hard reject server-side |
| B-04 | Wrong intendedTable | Hard reject |
| B-05 | Biometric-only attempt | 422 + no event created |
| B-06 | Expired IA | modal blocked pre-auth |
| B-07 | Missing IA number | modal blocked pre-auth |
| B-08 | Concurrent dual submit | one success, one RTS_ALREADY_SIGNED |
| B-09 | Timeout flow | explicit no-commit UX |
| B-10 | Committed record view | stored fields displayed correctly |

---

## 6) Marcus Compliance Checklist

- [ ] AC 120-78B §4 unique identity and per-signature auth verified.
- [ ] AC 120-78B §5 timestamp/audit linkage validated.
- [ ] 14 CFR §43.9(a)(4) and §43.11 IA field separation (A&P vs IA) validated.
- [ ] Biometric-only for IA rejected at server, not just UI.
- [ ] Signed RTS record immutable; correction path only via amendment record.

---

## 7) Build Exit + Status

**Build exit criteria:** all BLOCKING tests green + Dale UAT pass + Marcus checklist complete.  
**Status:** **READY FOR BUILD**