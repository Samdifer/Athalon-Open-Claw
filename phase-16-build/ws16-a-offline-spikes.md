# WS16-A — Offline Trust-Boundary Design Spikes (DS-1 / DS-2)

**Phase:** 16  
**Workstream:** WS16-A  
**Depends on:** `phase-15-rd/ws15-d-offline.md` (WS15-D, v1.0 — 2026-02-22)  
**Authors:** Tanya Birch (Spike Lead) + Devraj Anand (Backend)  
**QA Review Lead:** Cilla Oduya  
**Regulatory Reviewer:** Marcus Webb  
**Artifact Version:** 1.0 — 2026-02-22  
**Status:** SPIKES COMPLETE — see §7 for final readiness judgment  

---

## Preamble

WS15-D closed Phase 15 in a CONDITIONAL state, with a specific hold on two unresolved design questions designated as design spikes (DS-1 and DS-2). The Phase 15 gate review confirmed: *"WS15-D offline spikes (DS-1/DS-2) and D×J policy closure are first-order critical path."*

This document executes both spikes to a deterministic, evidence-backed conclusion. No implementation of the offline build may begin until both spikes resolve to PASS. If either spike resolves to BLOCKED or NEEDS REDESIGN, this artifact documents the minimum unblock steps and the work is requeued.

The WS15-D spec made the constraint explicit: *"Pending resolution of these two spikes, all other components (IDB schema, Convex mutations, UI components) are READY FOR BUILD."*

---

## §1 — Objective Checklist with PASS/FAIL Criteria

### DS-1: Offline Queue Integrity Boundary

The question asked by WS15-D: **What happens to in-flight signatures when connectivity drops mid-workflow? Does the trust boundary hold?**

| # | Criterion | PASS Condition | FAIL Condition |
|---|---|---|---|
| DS1-C1 | Queue durability across app kill | Every `QueuedSignatureEvent` written to IndexedDB survives process termination and device restart; recovered queue matches pre-kill state bit-for-bit | Any queued item lost on app kill or device restart |
| DS1-C2 | Idempotency key determinism | Given fixed inputs `(authEventId, taskStepId, userId, clientTimestamp)`, the SHA-256 key is always identical; two independent computations from same inputs produce same key | Key varies across executions from same inputs; key cannot be reconstructed from log data |
| DS1-C3 | Duplicate prevention at local layer | `DuplicateSignatureGuard` fires before network is involved; a second sign attempt on a step with a `pending` queue entry is blocked client-side; no second queue entry is written | Second entry written to queue for same `(taskStepId, userId)` pair; guard fails to fire; sign button accessible while pending entry exists |
| DS1-C4 | Server-side idempotency dedup | Two concurrent replay requests with the same `idempotencyKey` result in exactly one `signatures` record; second arrival returns `{ status: "confirmed", idempotent: true }` with the original `signatureId` | Two `signatures` records exist for the same key; or second arrival returns an error that breaks the sync flow |
| DS1-C5 | Auth event atomicity | `signatureAuthEvent.consumed = true` is set in the same Convex transaction as `signatures` insert; if the insert fails, the auth event is NOT consumed | Auth event consumed but signature not written; or signature written without consuming auth event |
| DS1-C6 | Hash integrity chain | Server recomputes `SHA-256(signaturePayload)` and rejects any mismatch; a corrupted IDB queue entry is never silently applied | Hash mismatch accepted; corrupted payload applied as a valid signature |
| DS1-C7 | Trust boundary holds under partial sync failure | If connectivity is lost after items 1–2 of a 5-item sync are confirmed, reconnection replays only items 3–5; items 1–2 are idempotency-deduplicated and return `confirmed`; no duplicates | Items 1–2 are re-written as new signatures; partial sync leaves ambiguous state |
| DS1-C8 | `capturedOffline` flag immutability | No mutation in the Convex schema permits altering `capturedOffline` post-write | A code path exists that can set `capturedOffline = false` on an offline-captured record |
| DS1-C9 | RTS gate blocks on pending signatures | Return-to-Service initiation is blocked when any step in the WO has a signature in `pending` or `syncing` state | RTS can be initiated while offline signatures are unconfirmed |
| DS1-C10 | Per-item sync feedback (not batch) | `SyncConfirmationFeed` resolves each item individually with green checkmark when `serverAckAt` is set; no "sync complete" banner before all items resolve | Feed emits a single batch event; items grouped without individual confirmation timestamps |

**DS-1 PASS threshold:** All 10 criteria must PASS. Any FAIL is a build blocker.

---

### DS-2: Re-Sync Conflict Resolution

The question asked by WS15-D: **When a device comes back online with locally-committed records, what is the deterministic merge/conflict protocol?**

| # | Criterion | PASS Condition | FAIL Condition |
|---|---|---|---|
| DS2-C1 | Step-already-signed conflict detection | Server detects `step.signedBy !== null` at sync time; returns `{ status: "conflict", reason: "..." }` with existing signer identity; offline signature NOT written | Offline signature written on top of existing; duplicate signature in `signatures` table |
| DS2-C2 | WO-on-hold rejection | Server detects `wo.status === "on_hold"` and returns `{ status: "rejected" }`; offline signatures for that WO not applied; mechanic sees explicit rejection with reason | Signatures applied despite WO on hold; or silent failure with no UI feedback |
| DS2-C3 | WO-canceled rejection | Server detects `wo.status === "canceled"` and returns `{ status: "rejected" }`; same behavior as on-hold | Same as DS2-C2 failure |
| DS2-C4 | Step-voided rejection | Server detects `step.voided === true` or `step.canceled === true`; returns `{ status: "rejected" }` | Voided step receives a signature; step state now inconsistent |
| DS2-C5 | `clientTimestamp` ordering preserved | `signatures` table records preserve `clientTimestamp` from client; server `signedAt` reflects server arrival time; audit export shows both; multi-mechanic offline scenario ordering can be reconstructed from `clientTimestamp` values | Only `signedAt` (server time) is stored; signing order is indistinguishable from processing order; ordering cannot be audited |
| DS2-C6 | Conflict surfaced to mechanic (not silently resolved) | Every conflict and rejection appears individually in `SyncConfirmationFeed`; mechanic is shown the reason; no silent discard | Conflict or rejection silently swallowed; UI shows success; maintenance record does not match mechanic expectation |
| DS2-C7 | Conflict items persisted in `sync_log` | Conflict and rejection items written to `sync_log.itemResults` with `outcome`, `conflictReason`, and `serverAckAt`; log survives session end and is retrievable by compliance audit | Conflicts visible only in real-time UI; not written to durable log; FAA audit cannot reconstruct event |
| DS2-C8 | Auth event expiry path | If auth event TTL (48hr `offlineCapable`) has elapsed, sync returns explicit `AUTH_EVENT_EXPIRED`; user prompted to re-sign; offline signature NOT silently applied; step remains unsigned | Expired auth event accepted; stale signature applied without re-verification |
| DS2-C9 | Re-sync does not produce orphaned `idempotencyKeys` | Every resolved conflict or rejection does NOT write to `idempotencyKeys` table; only confirmed signatures write their key; orphaned keys do not prevent future legitimate signatures | Rejected/conflicted replay consumes an idempotency key that blocks a future legitimate signature on the same step |
| DS2-C10 | Deterministic outcome for concurrent replay | If two devices simultaneously replay queued signatures for the same step, one succeeds and one receives the `step-already-signed` conflict; no race condition produces two confirmed signatures | Race condition allows two signatures to pass the step-state check concurrently; two signatures written |

**DS-2 PASS threshold:** All 10 criteria must PASS. Any FAIL is a build blocker.

---

## §2 — DS-1 Spike Report: Offline Queue Integrity Boundary

### 2.1 Spike Objective

Prove that the trust boundary for in-flight signatures holds deterministically under the following adversarial conditions:
- App is killed (Chrome tab closed, iOS Safari evicted from memory) while a signature is being written to IDB
- Device loses connectivity in the middle of a multi-item sync replay
- Service worker restarts mid-sync
- Same signature is replayed from two browser tabs simultaneously

The WS15-D spec identified these as the attack surface on the "durable local queue" contract.

### 2.2 Trust Boundary Definition

**The trust boundary** is the guarantee that a mechanic's deliberate signing act — PIN entered, Step reviewed, Confirm tapped — maps 1:1 to exactly zero or one server-confirmed signature record, regardless of network events between the signing act and the server write.

The boundary is violated if:
- A signature is lost (zero records when mechanic intended one)
- A signature is duplicated (two records when mechanic intended one)
- A signature is misattributed (wrong userId, wrong stepId, wrong timestamp)
- A corrupted signature is silently applied

### 2.3 Queue Write Flow — Deterministic Outcome Spec

**Phase 1: Signing Act (Client-Side — No Network Required)**

```
PRECONDITION: mechanic has tapped "Confirm" on sign-off flow
              navigator.onLine === false OR connectivity check fails

1. Generate localId = UUID()
2. Capture clientTimestamp = Date.now()
3. Retrieve signatureAuthEventId from current session (previously issued by server
   during online phase of flow, or via offlineCapable event)
4. Build signaturePayload = serialize({
     taskStepId, taskCardId, workOrderId, userId,
     certificateNumber, clientTimestamp, signatureAuthEventId
   })
5. Compute localPayloadHash = SHA-256(signaturePayload)
6. Compute idempotencyKey = SHA-256(
     signatureAuthEventId + taskStepId + userId + clientTimestamp
   )
   → This key is DETERMINISTIC. Identical inputs always produce identical key.
   → No random nonce. Recovery from IDB after app-kill produces same key.

7. DUPLICATE GUARD CHECK:
   existingEntry = IDB.signature_queue.query(
     index: "by_step_user",
     where: taskStepId == args.taskStepId AND userId == args.userId
             AND status IN ["pending", "syncing"]
   )
   IF existingEntry EXISTS:
     ABORT — show DuplicateSignatureGuard modal
     RETURN — no queue write
   ENDIF

8. IDB transaction (atomic write):
   IDB.signature_queue.add({
     localId, idempotencyKey, signatureAuthEventId,
     taskStepId, taskCardId, workOrderId, userId,
     certificateNumber, pinHashAttestation,
     clientTimestamp, signaturePayload, localPayloadHash,
     status: "pending", syncAttempts: 0,
     displayStepName   // cached from task card
   })
   → IDB writes are synchronous within the transaction.
   → If the browser is killed BEFORE this add() completes: no entry exists.
     This is safe — mechanic knows the sign attempt did not complete.
   → If the browser is killed AFTER this add() completes: entry persists.
     Next session reads IDB, finds pending entry, resumes sync.

9. Register background sync:
   navigator.serviceWorker.ready.then(sw =>
     sw.sync.register('athelon-signature-sync')
   )

10. UI update: Step card shows "Signed (pending sync)" — amber pulsing ring.
    Sign button disabled for this step.
```

**Deterministic outcome matrix for Phase 1:**

| Event timing | Outcome | Trust boundary status |
|---|---|---|
| Kill before step 8 begins | No entry in IDB; mechanic sees no visual change | HOLDS — zero records, zero confusion |
| Kill during step 8 (IDB transaction incomplete) | IDB transaction rolls back; no entry | HOLDS — zero records |
| Kill after step 8 completes | Entry persists; recovered on next session open | HOLDS — pending entry resumes sync |
| Mechanic re-opens app and taps Sign again | DuplicateSignatureGuard fires at step 7 | HOLDS — second entry blocked |

### 2.4 Queue Replay Flow — Deterministic Outcome Spec

**Phase 2: Reconnection / Background Sync (Service Worker)**

```
TRIGGER: Background Sync event 'athelon-signature-sync' fires on connectivity restore
         OR app foregrounds and detects online transition

FUNCTION replaySignatureQueue():
  syncSessionId = UUID()
  syncStart = Date.now()

  pending = IDB.signature_queue.getAll(status = "pending")
  pending.sort(ascending: clientTimestamp)   // Preserves mechanic signing order

  FOR EACH item IN pending:

    // Step A: Mark as syncing — prevents double-dispatch
    IDB.put({ ...item, status: "syncing" })

    TRY:
      result = await replayToConvex(item)   // See §2.5

      MATCH result.status:

        "confirmed":
          IDB.put({ ...item, status: "confirmed",
                    serverAckAt: Date.now(),
                    serverSignatureId: result.signatureId })
          broadcastSyncProgress({ type: "ITEM_CONFIRMED", ... })

        "conflict":
          IDB.put({ ...item, status: "conflict",
                    conflictReason: result.reason })
          broadcastSyncProgress({ type: "ITEM_CONFLICT", ... })

        "rejected":
          IDB.put({ ...item, status: "rejected",
                    conflictReason: result.reason })
          broadcastSyncProgress({ type: "ITEM_REJECTED", ... })

    CATCH NetworkError:
      // Network dropped mid-sync — do NOT advance to next item
      // Roll back to pending so Background Sync retries
      IDB.put({ ...item, status: "pending",
                syncAttempts: item.syncAttempts + 1,
                lastSyncAttemptAt: Date.now() })
      RETURN   // Abort this sync session; Background Sync will retry

  END FOR

  // Write sync_log entry
  IDB.sync_log.add({
    syncSessionId, startedAt: syncStart, completedAt: Date.now(),
    totalItems: pending.length,
    ...summarize(results)
  })

  broadcastSyncProgress({ type: "SYNC_SESSION_COMPLETE", syncSessionId, results })
```

**Deterministic outcome matrix for Phase 2:**

| Event timing | Outcome | Trust boundary status |
|---|---|---|
| Kill after item N status set to "syncing" before Convex reply | On restart: item N is in `syncing` state. Queue replay function treats `syncing` as resumable pending — resets to `pending` and retries | HOLDS — server side: if Convex received and wrote → idempotency check deduplicates on retry; if Convex never received → retried cleanly |
| Network drops after item 1 confirmed, before item 2 sent | Item 1 is `confirmed` in IDB; item 2 is `syncing`. Next sync session resets item 2 to `pending`, replays. Item 1's retry returns `idempotent: true` from server if accidentally replayed. | HOLDS |
| Two tabs open simultaneously; both replay same item | First arrival: Convex processes and writes idempotency key atomically. Second arrival: idempotency check returns `{ status: "confirmed", idempotent: true }`. Zero duplicates. | HOLDS |

### 2.5 Failure Mode Analysis

**FM-1: Auth event expiry during offline period**
- Risk: Mechanic signs offline. Auth event was created with standard 5-min TTL. Reconnects 2 hours later. Replay fails.
- Mitigation: WS15-D specifies a two-tier TTL system. `offlineCapable: true` events have 48-hour TTL. The offline sign flow UI explicitly requests an `offlineCapable` auth event when `navigator.onLine === false`.
- Deterministic outcome: If TTL elapsed → server returns `AUTH_EVENT_EXPIRED` → item marked `rejected` in sync feed → mechanic prompted to re-sign → NO signature applied silently.
- **Acceptance criterion:** Boundary condition test at 48:01 hours must return `AUTH_EVENT_EXPIRED`. (TC-D-07 covers this.)

**FM-2: IDB storage quota exceeded**
- Risk: Device has insufficient storage; IDB write at step 8 fails.
- Deterministic outcome: IDB write failure throws a `DOMException: QuotaExceededError`. The sign-off flow catches this exception, shows an error modal: *"Cannot queue signature offline — device storage full. Free up space or retry when online."* No partial entry in IDB. Mechanic knows sign did not complete.
- **Acceptance criterion:** Simulated storage quota exceeded must surface error modal; step remains unsigned; no silent failure.

**FM-3: Background Sync API not supported (older iOS Safari)**
- Risk: iOS Safari 15.x and earlier do not support the Background Sync API. Service worker `sync` event never fires. Signatures stay in `pending` state indefinitely without the mechanic knowing.
- Mitigation (from WS15-D open question): Fallback mode required. Spec decision: detect Background Sync API support at install time. If unavailable, implement a foreground sync polling loop triggered on `window` `online` event + app-foreground event.
- **Fallback pseudo-code:**
```javascript
// Fallback when BackgroundSync not available
window.addEventListener('online', async () => {
  if (!hasSWBackgroundSyncSupport()) {
    await replaySignatureQueue();  // Directly invoke (foreground)
  }
});

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    const pending = await IDB.getAll('signature_queue', { status: 'pending' });
    if (pending.length > 0 && !hasSWBackgroundSyncSupport()) {
      await replaySignatureQueue();
    }
  }
});
```
- **Acceptance criterion:** On a simulated iOS 15 environment with Background Sync disabled, queued signatures must replay within 10 seconds of app returning to foreground with connectivity. Mechanic must see `SyncConfirmationFeed` activate.
- **Note:** Jonas Harker must confirm final device support matrix and add any additional Safari-version-specific fallbacks before this fallback is marked DONE.

**FM-4: Service worker evicted mid-sync (iOS PWA memory pressure)**
- Risk: iOS evicts the service worker during a sync session after item 2 of 5 is confirmed.
- Deterministic outcome: Items 1-2 are `confirmed` in IDB (written before eviction). Items 3-5 are `syncing` (transitional state). On next launch, the init routine reads IDB, finds items in `syncing` state, resets them to `pending`, and retries. Items 1-2 are either not retried (confirmed) or if retried accidentally return `idempotent: true`.
- **Acceptance criterion:** TC-D-08 (device restart mid-sync) must pass. See Cilla Oduya test coverage, §6.

**FM-5: Hash mismatch (corrupted IDB entry)**
- Risk: Device storage corruption or adversarial IDB manipulation alters `signaturePayload` but not `localPayloadHash`, or vice versa.
- Deterministic outcome: Server recomputes `SHA-256(signaturePayload)` and compares to `clientPayloadHash`. Mismatch → `ConvexError({ code: "HASH_MISMATCH" })` → item marked `rejected` → SyncConfirmationFeed shows *"Queue item corrupt — supervisor review required"* → alert sent to shop QA record (not just mechanic UI).
- Auth event is NOT consumed on hash mismatch.
- **Acceptance criterion:** TC-D-09 must pass. Tampering with IDB payload field must be surfaced with supervisor alert.

### 2.6 DS-1 Acceptance Criteria (Summary)

The following assertions must be machine-verifiable in test:

1. `IDB.signature_queue` contains exactly one entry per `(taskStepId, userId)` pair in `pending` state at any time — enforced by index constraint + guard check.
2. `idempotencyKey` for a given `(authEventId, taskStepId, userId, clientTimestamp)` is SHA-256 deterministic — verified by running the derivation twice and comparing.
3. Server `idempotencyKeys` table contains exactly one record per key after any number of replay attempts.
4. Server `signatures` table contains exactly one record per confirmed offline sign event.
5. `capturedOffline` field has no Convex mutation that takes it as a mutable arg post-creation.
6. RTS mutation reads `signature_queue` status and throws if any pending/syncing entries exist in the WO scope.

### 2.7 DS-1 Feasibility Assessment

**Verdict: CAN PROCEED**

Evidence:
- IDB durability across app kill is a browser-level guarantee for committed transactions; no spike uncertainty.
- SHA-256 idempotency key determinism is mathematically certain given deterministic inputs; the only open question was whether `clientTimestamp` could drift — resolved by confirming `clientTimestamp` is captured at the moment the mechanic taps Confirm (not at queue write time, not at service worker time).
- Convex transactions are atomic; the auth-event-consumed + signature-insert atomicity is achievable within a single Convex `mutation` handler — confirmed by Devraj Anand.
- Background Sync API fallback (FM-3) adds implementation work but is not architecturally blocking.
- One remaining open item: **Jonas Harker must deliver the Browser Sync API device support matrix** before the service worker is written. This is a bounded deliverable (1-2 days of research), not a design blocker. The fallback design above is sufficient to proceed in parallel.

**DS-1 build authorization: PROCEED (with Jonas's device matrix as a bounded carry-forward)**

---

## §3 — DS-2 Spike Report: Re-Sync Conflict Resolution

### 3.1 Spike Objective

Define the deterministic merge/conflict protocol for the scenario where a device reconnects with locally-committed records and the server state has diverged. Prove that every possible divergence condition produces exactly one deterministic, auditable outcome — with no silent data loss and no ambiguous maintenance records.

### 3.2 Conflict Taxonomy

From analysis of WS15-D Q5 and Q6, the following divergence types can occur when a device comes back online:

| Conflict Type | Code | Root Cause |
|---|---|---|
| Step already signed by another user | `STEP_SIGNED_BY_OTHER` | Mechanic B signed while Mechanic A was offline |
| Step already signed by the same user (duplicate) | `STEP_SIGNED_BY_SELF` | Duplicate queue entry somehow reached server (secondary defense) |
| Work order put on hold | `WO_ON_HOLD` | Shop lead placed WO on hold during offline period |
| Work order canceled | `WO_CANCELED` | WO was administratively canceled |
| Task step voided | `STEP_VOIDED` | QCM or DOM voided the step |
| Task step requirements changed | `STEP_REQUIREMENTS_CHANGED` | Step now requires dual sign-off that wasn't required when queued |
| Auth event expired | `AUTH_EVENT_EXPIRED` | Mechanic was offline longer than `offlineTTLExpiresAt` |
| Auth event already consumed | `AUTH_EVENT_CONSUMED` | Idempotency race — duplicate replay consumed the event first |
| Hash mismatch | `HASH_MISMATCH` | Payload corrupted in IDB |
| Step not found | `STEP_NOT_FOUND` | Step was deleted or task card was removed |

### 3.3 Deterministic Merge Protocol

The server-side resolution protocol is strictly sequential and deterministic. Every queued item is evaluated through the same decision tree in the same order.

```
FUNCTION resolveQueuedSignature(item):

  // GATE 0: Idempotency check
  existing = DB.idempotencyKeys.query(key = item.idempotencyKey)
  IF existing:
    RETURN { status: "confirmed", signatureId: existing.signatureId, idempotent: true }
    // Already processed — safe to return success; no side effects.

  // GATE 1: Auth event validation
  authEvent = DB.signatureAuthEvents.get(item.signatureAuthEventId)
  IF NOT authEvent:
    RETURN { status: "rejected", code: "AUTH_EVENT_NOT_FOUND" }
  IF authEvent.consumed:
    RETURN { status: "rejected", code: "AUTH_EVENT_CONSUMED" }

  // Auth event TTL check:
  IF authEvent.offlineCapable:
    IF authEvent.offlineTTLExpiresAt < now():
      RETURN { status: "rejected", code: "AUTH_EVENT_EXPIRED",
               reason: "Offline auth event expired after 48 hours" }
  ELSE:
    IF authEvent.expiresAt < now():
      RETURN { status: "rejected", code: "AUTH_EVENT_EXPIRED",
               reason: "Standard auth event expired — re-authentication required" }

  // GATE 2: Work order state
  wo = DB.workOrders.get(item.workOrderId)
  IF wo.status == "on_hold":
    RETURN { status: "rejected", code: "WO_ON_HOLD",
             reason: "Work order is on hold" }
  IF wo.status == "canceled":
    RETURN { status: "rejected", code: "WO_CANCELED",
             reason: "Work order was canceled" }

  // GATE 3: Task step state
  step = DB.taskSteps.get(item.taskStepId)
  IF NOT step:
    RETURN { status: "rejected", code: "STEP_NOT_FOUND" }
  IF step.voided OR step.canceled:
    RETURN { status: "rejected", code: "STEP_VOIDED",
             reason: "Step was voided or canceled while you were offline" }
  IF step.signedBy == item.userId:
    // Self-duplicate: secondary defense (primary is IDB guard)
    RETURN { status: "conflict", code: "STEP_SIGNED_BY_SELF",
             reason: "You already signed this step" }
  IF step.signedBy != null:
    RETURN { status: "conflict", code: "STEP_SIGNED_BY_OTHER",
             reason: "Step signed by " + step.signedByName + " at " + step.signedAt }

  // GATE 4: Hash verification
  serverHash = SHA256(item.signaturePayload)
  IF serverHash != item.clientPayloadHash:
    // Do NOT consume auth event
    RETURN { status: "rejected", code: "HASH_MISMATCH",
             reason: "Payload integrity check failed — supervisor review required" }
    // SIDE EFFECT: emit QA alert to shop's quality record (not just UI)

  // GATE 5: WRITE (atomic transaction)
  BEGIN TRANSACTION:
    DB.signatureAuthEvents.patch(item.signatureAuthEventId,
      { consumed: true, consumedAt: now() })
    signatureId = DB.signatures.insert({
      taskStepId: item.taskStepId,
      taskCardId: item.taskCardId,
      workOrderId: item.workOrderId,
      userId: authEvent.userId,
      signedAt: now(),                    // Server canonical time
      clientTimestamp: item.clientTimestamp,  // Preserved — mechanic signing order
      capturedOffline: true,
      signaturePayload: item.signaturePayload,
      payloadHash: serverHash,
      idempotencyKey: item.idempotencyKey
    })
    DB.taskSteps.patch(item.taskStepId,
      { signedBy: authEvent.userId, signedAt: now(), signatureId })
    DB.idempotencyKeys.insert({
      key: item.idempotencyKey, signatureId,
      processedAt: now(), userId: authEvent.userId,
      taskStepId: item.taskStepId
    })
  END TRANSACTION (atomic — all or nothing)

  RETURN { status: "confirmed", signatureId, idempotent: false }
```

**Key protocol guarantees:**
- Gates 0–4 are read-only; no side effects until Gate 5.
- Auth event is consumed atomically with signature write; no orphaned consumed events.
- `idempotencyKeys` entry is written in the same transaction as the signature; no orphaned keys without corresponding signatures.
- `clientTimestamp` is always preserved, ensuring audit trail shows when the mechanic actually signed, not when the server processed.

### 3.4 Edge Case Analysis

**Edge Case EC-1: Dual sign-off step with both mechanics offline**

*Scenario:* Step 14 requires dual sign-off (Mechanic A and Mechanic B). Both go offline. Both sign step 14 offline. Both reconnect simultaneously and replay.

*Resolution:*
- WS15-D Q5 decision: The step model tracks multiple signatures for dual sign-off via `requiredSigners` list.
- Gate 3 checks `step.signedBy` for single sign-off. For dual sign-off steps, the check is `step.signers.length >= step.requiredSignerCount`.
- First replay (say Mechanic A): `step.signers.length == 0`; check passes; A's signature written.
- Second replay (Mechanic B): `step.signers.length == 1`; if `requiredSignerCount == 2`, check passes again; B's signature written.
- Both succeed — dual sign-off achieved. No conflict.
- Race condition: If both arrive simultaneously and both see `step.signers.length == 0`, Convex's serializable transaction model ensures one writes first; the other's transaction re-reads updated state and sees count = 1, still < 2, proceeds. No duplicate signature for same user — idempotency handles that separately.

**Edge Case EC-2: Auth event already consumed by legitimate online use**

*Scenario:* Mechanic signs step 14 online (auth event consumed). Network drops. Mechanic somehow also has a queued offline entry for step 14 from a prior offline period (e.g., device restored from backup, or duplicate event in IDB).

*Resolution:*
- Gate 0: Idempotency key check. If same signing act, key matches → returns `confirmed, idempotent: true`. No duplicate.
- Gate 1: If it's a different auth event (different signing act), auth event state `consumed: true` → returns `rejected, AUTH_EVENT_CONSUMED`.
- In both cases: zero duplicates, deterministic outcome.

**Edge Case EC-3: Three mechanics reconnect in reverse order after multi-step offline**

*Scenario:* Mechanics A, B, C each sign different steps offline. A signed at T=0,1,2 min. B signed at T=0.5,1.5 min. C signed at T=3,4 min. They reconnect in order C (T=10), B (T=11), A (T=12).

*Resolution:*
- Each mechanic's queue is sorted by `clientTimestamp` before replay (within each mechanic's queue).
- Server `signedAt` reflects actual network arrival order: C's signatures have earliest `signedAt`, A's have latest.
- Server `clientTimestamp` accurately reflects: A's signatures are chronologically first in the mechanic signing sequence.
- Audit export presents both timestamps. Auditor can reconstruct: "Mechanic A signed steps 1,2,3 at 10:00, 10:01, 10:02. Server received them at 10:12."
- No ordering ambiguity. AC 120-78B audit trail requirement met.

**Edge Case EC-4: WO released from hold during sync**

*Scenario:* WO is on hold. Sync begins. Shop lead releases hold at T+2 seconds. Items 1-3 of a 5-item sync execute during the hold; items 4-5 execute after the hold is released.

*Resolution:*
- Items 1-3: Gate 2 sees `wo.status == "on_hold"` → `rejected`.
- Items 4-5: Gate 2 sees `wo.status == "active"` → proceed through remaining gates.
- Result: SyncConfirmationFeed shows 3 rejected (with "WO on hold" reason) and 2 confirmed.
- Mechanic sees the exact state. For items 1-3, mechanic must re-sign when WO is active.
- This is a genuine data integrity requirement: steps 1-3 were not confirmed while WO was on hold. Re-signing is the correct behavior.

**Edge Case EC-5: `offlineCapable` auth event and PIN verification gap**

*Scenario:* Mechanic enters PIN and signs offline at T=0 with a 48-hour `offlineCapable` event. Auth event is stored. Mechanic's Clerk session token expires after 1 hour. At T=25 hours, mechanic tries to sync.

*Resolution:*
- Clerk session token expiry does not affect the `offlineCapable` auth event's validity — the auth event is a database record with its own TTL (`offlineTTLExpiresAt`).
- On reconnection, the service worker must first check if the Clerk session is valid. If expired, the service worker cannot call Convex mutations (requires auth).
- **Required behavior:** Service worker detects Clerk token expiry on first Convex call attempt. Broadcasts `SESSION_EXPIRED` to the app. App foregrounds and prompts Clerk re-authentication. After re-authentication, sync proceeds. The `offlineCapable` auth event remains valid (its own 48-hour window is independent of the Clerk session).
- This requires Tanya Birch to verify: Does Clerk's service worker token refresh work in the target environment? Is a silent refresh possible, or does the mechanic need to actively re-authenticate?
- **Spike finding:** This is the one remaining unresolved item in DS-2. See §3.6.

**Edge Case EC-6: Connectivity lost between items 2 and 3 of a 5-item sync**

*Scenario:* 5-item sync in progress. Items 1-2 confirmed (IDB updated, `serverAckAt` set). Network drops mid-replay before item 3's Convex call completes.

*Resolution:*
- Item 3's `replayToConvex()` call throws `NetworkError`.
- Catch block: Item 3 is reset to `pending` (was `syncing`).
- Items 4-5 remain `pending`.
- Sync session ends — Background Sync API will retry.
- On retry: Items 1-2 are `confirmed` — not retried. Items 3-5 are `pending` — replayed.
- If items 1-2 are accidentally retried (e.g., queue logic error), Gate 0 (idempotency) catches them: `idempotent: true`.
- Result: deterministic, no data loss, no duplicates.

### 3.5 DS-2 Acceptance Criteria (Summary)

1. Every conflict type in the taxonomy (§3.2) must have a corresponding server response code in `resolveQueuedSignature`.
2. Every rejection and conflict must be written to `sync_log.itemResults` — not just shown in UI.
3. `clientTimestamp` must be present in every `signatures` record regardless of online/offline path.
4. Server `signatures` table must never contain two records with the same `(taskStepId, userId)` pair — enforced by DB-level unique constraint + idempotency gate.
5. The `idempotencyKeys` table must not contain records for rejected or conflicted items — only for confirmed signatures.
6. The `OfflineSignatureAuditBadge` must appear in PDF export for every `capturedOffline: true` signature.

### 3.6 DS-2 Feasibility Assessment

**Verdict: CAN PROCEED — with one bounded open item**

The deterministic merge protocol (§3.3) is fully specified and implementable in Convex's transaction model. All conflict types are enumerated. All edge cases (EC-1 through EC-6) have deterministic resolutions.

**One bounded open item (not a design blocker):**
EC-5 reveals a Clerk token refresh interaction in the service worker context. Tanya Birch must confirm whether Clerk's PWA SDK supports silent token refresh in a service worker, or whether the mechanic will always need to re-authenticate after session expiry. The outcome of this check affects only the reconnection UX flow (how the mechanic is prompted), not the integrity of the conflict resolution protocol itself. The protocol is the same in both cases: sync proceeds only after a valid Clerk session is established.

**Resolution path:**
- Tanya runs a Clerk PWA offline token test (2-day spike).
- If silent refresh works: service worker refreshes token autonomously and sync proceeds.
- If silent refresh requires active re-auth: app foregrounds with re-auth prompt, then sync resumes.
- Either outcome: zero impact on DS-2 conflict resolution correctness.

**DS-2 build authorization: PROCEED (with Clerk token refresh as bounded carry-forward)**

---

## §4 — Implementation Feasibility Assessment

### DS-1 Feasibility

| Component | Status | Notes |
|---|---|---|
| IDB `signature_queue` schema | ✅ CAN BUILD | Schema fully specified in WS15-D; no changes required |
| `DuplicateSignatureGuard` client-side check | ✅ CAN BUILD | IDB index on `(taskStepId, userId, status)` — straightforward |
| SHA-256 idempotency key derivation | ✅ CAN BUILD | Web Crypto API `SubtleCrypto.digest('SHA-256', ...)` — widely supported |
| Background Sync API service worker | ⚠️ CONDITIONAL | Requires Jonas device support matrix; fallback designed (§2.5 FM-3) |
| `replaySignatureQueue()` service worker function | ✅ CAN BUILD | Spec complete; no open design questions |
| Convex `signTaskStepWithIdempotency` mutation | ✅ CAN BUILD | Spec complete in WS15-D; Devraj confirmed Convex transaction semantics support it |
| `idempotencyKeys` Convex table | ✅ CAN BUILD | Simple indexed table; no retention pruning allowed (Marcus Webb hard block) |
| `capturedOffline` immutability enforcement | ✅ CAN BUILD | Convex mutation validator — field excluded from all patch operations |
| RTS gate blocking on pending signatures | ✅ CAN BUILD | Existing `returnToService` mutation gains pre-check query |
| iOS Safari fallback sync | ✅ CAN BUILD | `visibilitychange` + `online` event listeners; no framework dependency |

**DS-1 overall: CAN PROCEED**

### DS-2 Feasibility

| Component | Status | Notes |
|---|---|---|
| `resolveQueuedSignature` gate protocol | ✅ CAN BUILD | Spec complete in §3.3 |
| All 10 conflict type codes | ✅ CAN BUILD | Enumerated; Convex error types mapped |
| `sync_log` IDB persistence | ✅ CAN BUILD | Schema specified in WS15-D; no changes |
| `SyncConfirmationFeed` per-item UI | ✅ CAN BUILD | Design specified; component is standard React |
| `clientTimestamp` dual-timestamp audit | ✅ CAN BUILD | Both fields written in `signatures` insert |
| DB unique constraint on `(taskStepId, userId)` | ✅ CAN BUILD | Convex index with uniqueness; enforced at schema level |
| `OfflineSignatureAuditBadge` in PDF export | ✅ CAN BUILD | WS15-A PDF Export spec owns this; flag is `capturedOffline` |
| QA alert on `HASH_MISMATCH` | ✅ CAN BUILD | Convex side effect — write to `qaAlerts` table on hash mismatch code path |
| Clerk session + `offlineCapable` TTL interaction | ⚠️ BOUNDED OPEN | Tanya must verify Clerk PWA token refresh in SW context (2-day check) |

**DS-2 overall: CAN PROCEED (with Clerk check as carry-forward)**

---

## §5 — Working Pseudo-Code and Schema-Level Proof

### 5.1 Idempotency Key Schema Proof

```typescript
// Convex schema addition — idempotencyKeys table
idempotencyKeys: defineTable({
  key: v.string(),                      // SHA-256 hex string, 64 chars
  signatureId: v.id("signatures"),      // Always references a real signature
  processedAt: v.number(),             // Server epoch ms
  userId: v.id("users"),
  taskStepId: v.id("taskSteps"),
})
.index("by_key", ["key"])              // Unique lookup by key

// PROOF: uniqueness guarantee
// Convex's .unique() query on "by_key" index throws if >1 record exists.
// The Gate 0 check reads via .unique() — if the key was already inserted
// (same transaction succeeded previously), the check catches it before
// any write occurs. The insert at Gate 5 only runs if .unique() returned null.
// Therefore: exactly 0 or 1 records per key. QED.
```

### 5.2 Signature Queue IDB Index Proof

```typescript
// IDB object store creation (in openAthelonIDB() init)
const queueStore = db.createObjectStore('signature_queue', { keyPath: 'localId' });
queueStore.createIndex('by_step_user_status',
  ['taskStepId', 'userId', 'status'],
  { unique: false }
);

// DuplicateSignatureGuard query:
async function hasPendingSignature(taskStepId: string, userId: string): Promise<boolean> {
  const index = db.transaction('signature_queue').store
    .index('by_step_user_status');

  // Check for pending OR syncing entries (both represent in-flight signatures)
  const pending = await index.get([taskStepId, userId, 'pending']);
  const syncing = await index.get([taskStepId, userId, 'syncing']);
  return pending !== undefined || syncing !== undefined;
}

// PROOF: guard fires before any write
// The guard runs in the React event handler BEFORE the IDB add() call.
// If hasPendingSignature() returns true, the function returns early.
// IDB add() is never called.
// The sign button is also programmatically disabled when hasPendingSignature()
// returns true (checked on task card render via useEffect hook).
// Double-defense: UI prevents tap; event handler prevents write even if tapped.
```

### 5.3 Atomicity Proof for Auth Event + Signature Write

```typescript
// Convex mutation — atomic write proof
export const signTaskStepWithIdempotency = mutation({
  handler: async (ctx, args) => {
    // ... Gates 0-4 (reads only, no writes) ...

    // Gate 5: ALL WRITES IN ONE CONVEX TRANSACTION
    // Convex guarantees: if any write in a mutation handler throws,
    // ALL writes in that handler are rolled back.
    // There is no partial commit.

    // Write 1: Consume auth event
    await ctx.db.patch(args.signatureAuthEventId, {
      consumed: true,
      consumedAt: Date.now()
    });

    // Write 2: Insert signature record
    const signatureId = await ctx.db.insert("signatures", {
      // ... all fields ...
    });

    // Write 3: Update task step
    await ctx.db.patch(args.taskStepId, {
      signedBy: authEvent.userId,
      signedAt: Date.now(),
      signatureId
    });

    // Write 4: Write idempotency key
    await ctx.db.insert("idempotencyKeys", {
      key: args.idempotencyKey,
      signatureId,
      processedAt: Date.now(),
      userId: authEvent.userId,
      taskStepId: args.taskStepId,
    });

    // PROOF: Atomicity
    // Convex mutations are single-transaction. If Write 2 fails (e.g., schema
    // validation error), Write 1 (auth event consumed) is also rolled back.
    // The auth event is never consumed without a corresponding signature record.
    // The signature record is never created without a corresponding idempotency key.
    // All four writes succeed together, or none do. QED.

    return { status: "confirmed", signatureId, idempotent: false };
  }
});
```

### 5.4 Conflict Resolution Protocol Proof (Serializable Transactions)

```
THEOREM: Under concurrent replay from two devices for the same step,
         exactly one "confirmed" result is possible.

PROOF:
  Let device A and device B both replay signatures for taskStep T
  at the same millisecond.

  Convex processes mutations serially within a deployment (single-writer model
  with optimistic concurrency). One of {A, B} will be the first writer.

  Case 1: A commits first.
    - A's transaction: Gate 3 reads step.signedBy = null → PASSES → A's signature written.
    - B's transaction: Gate 3 reads step.signedBy = A.userId (updated by A's commit) → CONFLICT.
    - Or: B's Gate 0 reads idempotencyKeys for B's key → not found (different key) → PASSES Gate 0.
      Gate 3 reads step.signedBy = A.userId → CONFLICT returned.
    - Result: A confirmed, B conflict.

  Case 2: B commits first.
    - Symmetric: B confirmed, A conflict.

  In both cases: exactly one "confirmed" outcome for step T.
  Two "confirmed" outcomes for the same step are impossible under
  Convex's serializable transaction model. QED.
```

### 5.5 `clientTimestamp` Dual-Timestamp Audit Schema Proof

```typescript
// signatures table — dual timestamp proof
signatures: defineTable({
  // ...
  signedAt: v.number(),           // Server canonical time — set by server in Gate 5
  clientTimestamp: v.number(),    // Client signing time — passed by client, never modified
  capturedOffline: v.boolean(),   // Immutable after write
  // ...
})

// PROOF: clientTimestamp is auditable and preserved
// 1. clientTimestamp is passed by the client in args.clientTimestamp
// 2. Server writes it directly to the DB: clientTimestamp: args.clientTimestamp
// 3. No mutation post-creation accepts clientTimestamp as a mutable field
//    (enforced by schema: the patch() calls in other mutations never include clientTimestamp)
// 4. Both signedAt and clientTimestamp appear in the maintenance record export
//    and the OfflineSignatureAuditBadge rendering
// 5. For online signatures: clientTimestamp ≈ signedAt (sub-second difference)
//    For offline signatures: signedAt - clientTimestamp = offline duration (auditable gap)

// PROOF: capturedOffline is immutable
// The only mutation that writes capturedOffline is the insert at Gate 5.
// No other mutation includes capturedOffline in its args schema.
// Convex's type-safe args.validator prevents any other mutation from writing this field.
// QED.
```

### 5.6 RTS Gate Proof

```typescript
// returnToService mutation — pending signature gate
export const initiateReturnToService = mutation({
  args: { workOrderId: v.id("workOrders"), /* ... */ },
  handler: async (ctx, args) => {

    // RTS Gate: Check for any pending offline signatures in this WO
    // Note: This check is against the Convex DB (server state), not IDB.
    // The mechanic's device IDB state is not visible to the server.
    // However: a pending signature in IDB has NOT been written to DB yet.
    // Therefore: DB has no signature for that step.
    // The existing "all steps must be signed" check catches this:

    const steps = await ctx.db
      .query("taskSteps")
      .withIndex("by_work_order", q => q.eq("workOrderId", args.workOrderId))
      .collect();

    const unsignedSteps = steps.filter(s => !s.signedBy);
    if (unsignedSteps.length > 0) {
      throw new ConvexError({
        code: "UNSIGNED_STEPS_EXIST",
        message: `${unsignedSteps.length} step(s) not yet signed. ` +
          `If signatures are pending sync, wait for sync confirmation before initiating RTS.`,
        unsignedStepIds: unsignedSteps.map(s => s._id),
      });
    }

    // PROOF: A pending offline signature (not yet synced) = unsigned step in DB.
    // The RTS gate blocks on unsigned steps.
    // Therefore: RTS is impossible while any offline signature is unconfirmed. QED.
  }
});
```

---

## §6 — Cilla Oduya Test Coverage Outline

> *"I will try to break this. I will try to sign things twice, lose the phone mid-sync, restore the device, go offline in the middle of a sync, and make two mechanics sign the same step at the same time."*

### 6.1 DS-1 Required Test Cases

The following test cases are required before DS-1 can be marked build-PASS:

| TC ID | Spike | Test Name | Input Conditions | Expected Assert | Tool | Criticality |
|---|---|---|---|---|---|---|
| TC-DS1-01 | DS-1 | IDB queue survives app kill | Write 3 pending items to IDB. Force-kill the browser process. Re-open. | IDB contains all 3 items in `pending` state; `localId` and `idempotencyKey` unchanged | Playwright + browser kill signal | CRITICAL |
| TC-DS1-02 | DS-1 | Idempotency key determinism | Run `computeIdempotencyKey(fixedInputs)` 1000 times | All 1000 results are identical SHA-256 strings; no randomness | Jest unit | CRITICAL |
| TC-DS1-03 | DS-1 | DuplicateSignatureGuard — client-side block | Sign step 7 offline (queued). Attempt to sign step 7 again without syncing. | Guard modal fires; sign button disabled; IDB has exactly 1 entry for step 7 + userId | Playwright | CRITICAL |
| TC-DS1-04 | DS-1 | Server idempotency dedup — concurrent replay | Simulate two tabs simultaneously POSTing the same idempotency key | Server `idempotencyKeys` has exactly 1 record; `signatures` has exactly 1 record | k6 concurrency test | CRITICAL |
| TC-DS1-05 | DS-1 | Auth event atomic rollback | Simulate Convex transaction failure after auth event consumed, before signature write | Auth event NOT consumed in DB; no signature record written | Jest + Convex test harness | CRITICAL |
| TC-DS1-06 | DS-1 | Hash mismatch rejection + supervisor alert | Corrupt `signaturePayload` in IDB. Trigger sync. | Server returns `HASH_MISMATCH`; item `rejected` in IDB; `qaAlerts` record written; mechanic UI shows supervisor review warning | Playwright | CRITICAL |
| TC-DS1-07 | DS-1 | Partial sync recovery — kill after item 2 of 5 | 5-item queue; kill process after item 2 confirmed; restart; re-sync | Items 1-2 are `confirmed`, not re-sent; items 3-5 replay; 0 duplicates in `signatures` | Playwright + kill signal | CRITICAL |
| TC-DS1-08 | DS-1 | Per-item confirmation feed — not batch | Sync 7 items | Feed shows 7 individual items with timestamps; no "sync complete" batch banner before all items resolve | Playwright visual assertion | HIGH |
| TC-DS1-09 | DS-1 | `capturedOffline` immutability | Attempt to call any Convex mutation that patches `capturedOffline` | Convex rejects with schema validation error; field remains unchanged | Jest + Convex schema test | HIGH |
| TC-DS1-10 | DS-1 | RTS blocked on pending signature | 1 pending item in IDB (step 7 unsigned on server). Attempt RTS. | RTS mutation throws `UNSIGNED_STEPS_EXIST`; RTS not initiated; UI shows blocking message | Playwright | CRITICAL |
| TC-DS1-11 | DS-1 | iOS Safari fallback sync | Disable Background Sync API. Sign offline. Restore connectivity, foreground app. | `replaySignatureQueue()` fires within 10 seconds via `online`/`visibilitychange` fallback; sync completes | Playwright with SW feature flag disabled | HIGH |
| TC-DS1-12 | DS-1 | IDB quota exceeded — graceful failure | Simulate IDB `QuotaExceededError` on queue write | Error modal shown; step remains unsigned; no partial IDB entry | Playwright with IDB mock | MEDIUM |

### 6.2 DS-2 Required Test Cases

| TC ID | Spike | Test Name | Input Conditions | Expected Assert | Tool | Criticality |
|---|---|---|---|---|---|---|
| TC-DS2-01 | DS-2 | Step signed by other mechanic — conflict surfaced | Mech A offline signs step 14. Mech B (online) signs step 14. Mech A reconnects. | A's sync returns `STEP_SIGNED_BY_OTHER`; `signatures` has 1 record (B's); `sync_log` records conflict; feed shows ⚠️ with B's name | Playwright multi-user | CRITICAL |
| TC-DS2-02 | DS-2 | WO on hold — all queued signatures rejected | Sign 3 steps offline. Shop lead sets WO to `on_hold`. Reconnect. | All 3 items: `WO_ON_HOLD` rejection; 0 signatures written; feed shows 3 ❌ with reason | Playwright | CRITICAL |
| TC-DS2-03 | DS-2 | WO canceled — queued signatures rejected | Sign 2 steps offline. WO canceled server-side. Reconnect. | 2 items: `WO_CANCELED` rejection; 0 signatures written | Playwright | CRITICAL |
| TC-DS2-04 | DS-2 | Step voided — queued signature rejected | Sign step offline. Step voided server-side. Reconnect. | `STEP_VOIDED` rejection; 0 signatures; feed shows ❌ with step-void reason | Playwright | CRITICAL |
| TC-DS2-05 | DS-2 | Auth event expired at 48:01 hours | `offlineCapable` event created. Reconnect after 48h1m. | `AUTH_EVENT_EXPIRED` rejection; signature NOT applied; mechanic prompted to re-sign | Jest + time mock | CRITICAL |
| TC-DS2-06 | DS-2 | Auth event within TTL at 47:59 hours | `offlineCapable` event created. Reconnect at 47h59m. | Signature confirmed; `capturedOffline: true`; `clientTimestamp` preserved | Jest + time mock | CRITICAL |
| TC-DS2-07 | DS-2 | `clientTimestamp` ordering across mechanics | Mech A signs T=0,1,2 min. Mech B signs T=0.5,1.5 min. B reconnects first. | All signatures in `signatures` table have correct `clientTimestamp`; ordering by `clientTimestamp` matches original signing sequence | Playwright multi-user | HIGH |
| TC-DS2-08 | DS-2 | Conflict items in `sync_log` | Sync 4 items: 2 confirmed, 1 conflict, 1 rejected | `sync_log` record has `totalItems: 4`, `confirmedItems: 2`, `conflictItems: 1`, `rejectedItems: 1`; each `itemResults` entry has `conflictReason` | Playwright + DB assertion | CRITICAL |
| TC-DS2-09 | DS-2 | No orphaned idempotency keys for rejections | Sync 3 items: 1 confirmed, 2 rejected | `idempotencyKeys` has exactly 1 record (the confirmed one); rejected items have no idempotency key records | Jest + DB assertion | CRITICAL |
| TC-DS2-10 | DS-2 | Concurrent dual-step race condition | Mech A and Mech B simultaneously replay for same step (concurrent k6 test) | Exactly 1 signature in DB; 1 confirmed result, 1 conflict result; no race producing 2 confirmations | k6 concurrency | CRITICAL |
| TC-DS2-11 | DS-2 | WO released from hold mid-sync (EC-4) | WO on hold. Sync starts. Hold released at T+2s. Items 1-3 hit hold; items 4-5 do not. | Items 1-3: `WO_ON_HOLD`; Items 4-5: confirmed; `sync_log` reflects mixed outcome | Playwright + race condition simulation | HIGH |
| TC-DS2-12 | DS-2 | Self-duplicate secondary defense | Manually insert duplicate entry into IDB (simulating backup restore). Sync. | Server Gate 0 (idempotency) catches it OR Gate 3 (self-signed) catches it; exactly 1 signature in DB | Jest | MEDIUM |
| TC-DS2-13 | DS-2 | `OfflineSignatureAuditBadge` in PDF export | Complete offline sign + sync. Export PDF. | PDF contains "Signed offline · Synced [timestamp]" badge for that signature; badge not present for online signatures | Playwright PDF assertion | HIGH |
| TC-DS2-14 | DS-2 | Hash mismatch — auth event NOT consumed | Corrupt payload in IDB. Trigger sync. | `HASH_MISMATCH` returned; `signatureAuthEvents` record shows `consumed: false`; `qaAlerts` record written | Jest + DB assertion | CRITICAL |

### 6.3 Existing WS15-D Test Cases (Unchanged — Carry Forward to Phase 16)

The following test cases from WS15-D §Test Plan are required in Phase 16 and are NOT superseded by the spike tests above. They cover end-to-end scenarios that the spike pseudo-code alone cannot verify:

- **TC-D-01** through **TC-D-12** — all required; mapped to Phase 16 build verification
- TC-D-03 (Skyline incident replay) is particularly critical — this is the root cause of the entire offline trust concern
- TC-D-07 (auth event expiry boundary) and TC-D-10 (ordering guarantee) have companion spike tests above (TC-DS2-05/06, TC-DS2-07)

### 6.4 Cilla's PASS Gate for Build Authorization

> The build MAY NOT begin on any component until the following are in place:

1. **Test harness exists** for IDB simulation in Playwright (mock IDB with quota, corruption, and kill-point injection).
2. **Convex test environment** supports transaction rollback simulation for TC-DS1-05.
3. **Multi-user Playwright test rig** is configured for concurrent mechanic scenarios (TC-DS2-01, TC-DS2-10).
4. **k6 concurrency profile** is written for idempotency and race condition tests.
5. **Time-mock infrastructure** allows fast-forwarding `offlineTTLExpiresAt` without real waits (TC-DS2-05/06).
6. **All CRITICAL test cases** above have written test stubs before implementation begins — test-first, not test-after.

---

## §7 — Final Status Block

### Readiness Judgment

| Item | Verdict | Authority |
|---|---|---|
| DS-1: Queue integrity boundary — design complete | ✅ PASS | Spike analysis §2 |
| DS-1: All failure modes analyzed with deterministic outcomes | ✅ PASS | §2.5 FM-1 through FM-5 |
| DS-1: Pseudo-code and schema proof produced | ✅ PASS | §5.1 through §5.6 |
| DS-1: Implementation feasibility — CAN PROCEED | ✅ PASS | §4 |
| DS-1: Bounded carry-forward — Jonas device support matrix | ⚠️ OPEN (bounded) | §2.5 FM-3 |
| DS-2: Conflict taxonomy complete | ✅ PASS | §3.2 |
| DS-2: Deterministic merge protocol specified | ✅ PASS | §3.3 |
| DS-2: All edge cases analyzed | ✅ PASS | §3.4 EC-1 through EC-6 |
| DS-2: Implementation feasibility — CAN PROCEED | ✅ PASS | §4 |
| DS-2: Bounded carry-forward — Clerk PWA token refresh check | ⚠️ OPEN (bounded) | §3.4 EC-5, §3.6 |
| Cilla Oduya test coverage outline produced | ✅ PASS | §6 |
| Marcus Webb hard blocks addressed in spec | ✅ PASS | WS15-D §Compliance; all 5 hard blocks have spec-level responses in this artifact |

### Overall Readiness: **SPIKES COMPLETE — PROCEED TO BUILD**

Both DS-1 and DS-2 have been executed to the level of deterministic outcome specification, failure mode analysis, schema-level proof, and test coverage outline. No blocking unknowns remain in the design. Both carry-forward items are bounded work items (Jonas: device matrix research; Tanya: Clerk token test) that do not block the IDB schema, Convex mutations, or UI component build from beginning in parallel.

**The offline build is authorized to proceed per the Phase 15 gate review sequencing decision:**
> *"WS15-D offline spikes (DS-1/DS-2)... are first-order critical path. Pending resolution of these two spikes, all other components (IDB schema, Convex mutations, UI components) are READY FOR BUILD."*

### Open Items Before First Shipping Milestone

| # | Owner | Item | Deadline | Blocks |
|---|---|---|---|---|
| OI-1 | Jonas Harker | Browser Sync API device support matrix; confirm iOS Safari version coverage; deliver final fallback requirement | Phase 16 Week 1 | Service worker implementation |
| OI-2 | Tanya Birch | Clerk PWA token refresh test in service worker context; confirm silent refresh or active re-auth UX requirement | Phase 16 Week 1 | Reconnection flow UX; does not block IDB or Convex work |
| OI-3 | Cilla Oduya | Write test stubs for all CRITICAL test cases in §6.1 and §6.2 before implementation begins | Phase 16 Week 1 | Build cannot be accepted without these stubs in place |
| OI-4 | Marcus Webb | Review this spike artifact; sign off on deliberateness standard compliance argument (§2.3 signing act spec) | Phase 16 Week 2 | Compliance sign-off required before any beta/staging deployment |
| OI-5 | Devraj Anand | Confirm Convex unique index enforcement for `(taskStepId, userId)` on `signatures` table | Phase 16 Week 1 | DS-2 acceptance criterion §3.5 item 4 |

### Cited Evidence Links

| Reference | Relevance |
|---|---|
| `phase-15-rd/ws15-d-offline.md` | Primary source; all schema definitions, SME requirements, original spike statement |
| `reviews/phase-15-gate-review.md` | Authorization to proceed; carry-forward controls; build sequencing decision |
| WS15-D §SME Brief — Troy Weaver | Per-item sync confirmation UX requirement |
| WS15-D §SME Brief — Carla Ostrowski | Duplicate signature prevention (Skyline incident); DOM trust requirements |
| WS15-D §Compliance — Marcus Webb | All 5 hard blocks; deliberateness standard; dual-timestamp requirement |
| WS15-D §Test Plan — Cilla Oduya | TC-D-01 through TC-D-12; base test set carried forward to Phase 16 |
| WS15-D §Implementation Spec | IDB schema, Convex mutation spec, `signTaskStepWithIdempotency` |
| AC 120-78B §5-4 | Electronic signature non-repudiation and tamper-evidence requirements |
| AC 120-78B §5-5 | Audit trail requirements for electronic signature systems |
| 14 CFR §43.9(a)(4) | Signature attribution requirement |
| 14 CFR §43.11(a) | Return to Service; unsigned steps = violation |
| FAA Order 8300.10 Ch. 9 §9-48 | IA deliberateness standard; `clientTimestamp` as moment of deliberate act |

---

*Filed: 2026-02-22 | Phase 16 WS16-A | Artifact v1.0*  
*Tanya Birch + Devraj Anand — Spike authors | Cilla Oduya — QA review | Marcus Webb — Regulatory review pending*  
*Do not modify SIMULATION-STATE.md. This artifact supersedes the "NEEDS DESIGN SPIKE" status in WS15-D §Status for DS-1 and DS-2 only.*
