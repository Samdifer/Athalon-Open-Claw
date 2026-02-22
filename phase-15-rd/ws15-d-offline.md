# WS15-D — Offline Mode Full Design + v1.1 Build

**Phase:** 15  
**Workstream:** WS15-D  
**Owner:** Tanya Birch (Mobile/Offline Architecture) + Devraj Anand (Backend/Convex)  
**SMEs:** Troy Weaver (A&P Airframe, Lakeland FL) + Carla Ostrowski (DOM)  
**Status at Open:** Alpha offline indicators + fast-fail exist; full offline-first design not yet built  
**Artifact Version:** 1.0 — 2026-02-22  
**Risk Level:** HIGH — Offline signature capture in aviation MRO is not a standard sync problem  

---

## SME Brief

### Troy Weaver — A&P Airframe, Lakeland FL

Troy works primarily on GA and light turbine airframes at a mid-sized Part 145 shop at Lakeland Linder Regional. He's the mechanic who is standing in the hangar at 2 AM. His design philosophy is unambiguous:

> "Every decision should start from the assumption that I'm standing in a hangar, I've got a flashlight in one hand, and I've got maybe 30 seconds before I need to put the phone down and get back to work."

On connectivity in hangars:

> "We've got maybe 60% signal coverage in the main hangar. The back bay where we do heavy maintenance? You walk in there and the phone drops. That's not going to change — the steel structure and the aircraft in the way guarantee it. I work offline more than I work online, and I need the system to behave the same either way."

On his specific requirement for sync confirmation:

> "Here's what I want to see. I've got 5 signatures queued, syncing now — and then I want to see them confirm one by one. Not 'sync complete' as a single message. One by one. Because if one of them didn't make it, I need to know which one. And I need to see a green checkmark on each one before I put the phone down. Otherwise I'm second-guessing myself on the ramp."

On what "sync complete" as a single event means in practice:

> "A single 'sync complete' message means nothing to me in a safety context. Which steps synced? Which ones are still pending? If my supervisor comes to me and asks 'did you sign step 14?' I need to be able to say yes or no with certainty. A single sync banner doesn't give me that."

On mobile UX expectations:

> "The app should work like a flashlight. When I pick it up, it's ready. When I put it down, it saves. I shouldn't have to manage connectivity. I should just work. If I sign something and put the phone in my pocket, I expect that signature to exist. If it doesn't, tell me before I walk away — not the next morning."

### Carla Ostrowski — Director of Maintenance (DOM)

Carla runs maintenance operations at a regional charter and MRO operation. She provided the most important failure case this stream is being designed to prevent — the Skyline incident:

> "We had a mechanic sign the same step twice. The first signature went pending without telling him. He assumed it didn't take — there was no feedback, nothing. So he signed again. Both signatures appeared when connectivity restored. We caught it during the IA review before RTS, but it was genuinely confusing to explain to the IA which signature was the valid one. From a records standpoint, a duplicated signature on a maintenance step is not a compliance non-event."

On what the system should have done:

> "The mechanic should have seen 'Signature pending — do not re-sign this step' the instant he tried to sign while offline. Immediately. Not after the fact. If the system can't tell me in real time whether my signature went through, it needs to tell me something — and that something has to be specific enough that I don't sign twice."

On the DOM's perspective on offline risk:

> "Offline mode for a mechanic logging time is fine. Offline mode for a sign-off on a safety-critical step is a different thing entirely. I'm not saying you can't do it — I'm saying the audit trail has to be airtight. I need to be able to reconstruct, from the database alone, the exact sequence in which every signature was made, whether it was made online or offline, and whether any duplicate was ever attempted."

On organizational trust:

> "The question I ask about any system is: 'What's the worst thing a mechanic can do accidentally, and does the system catch it?' With offline signatures, the worst thing is a duplicate. The second worst thing is a lost signature. I need the system to catch both. And I need to know how."

### Minimum Bar (Both SMEs Combined)

1. Signatures captured offline must be durably queued and individually confirmed on reconnect — no "batch sync complete" messaging
2. The system must prevent duplicate signatures on the same step, even if the mechanic attempts to re-sign offline while a pending signature exists
3. Every signature must be clearly labeled as "signed online" or "signed offline (synced [timestamp])" in the audit trail
4. Conflict resolution when the WO state changed server-side during offline period must be surfaced to the mechanic — not silently resolved
5. An offline-signed step must not appear "confirmed" in the UI until the server has acknowledged it

---

## R&D Scope

### Core Technical Problem Statement

Aviation maintenance sign-off is not a CRUD operation. Each signature carries regulatory meaning. A duplicated signature is not merely a data quality problem — it creates an ambiguous maintenance record that an IA must resolve and that the FAA can scrutinize. A lost signature creates an unsigned step in a safety-critical maintenance package. Neither outcome is acceptable.

The challenge is that we want to support offline-first UX (Troy's 30-second rule, hangar connectivity gaps) while providing the same integrity guarantees that online sign-off provides. This requires:

1. **Durable local queue** — signature events captured locally must survive app kills, device restarts, and extended offline periods
2. **Idempotent server mutations** — reconnection must not be able to double-spend a signature event or create duplicate records
3. **Per-item sync feedback** — not aggregate sync status
4. **Duplicate prevention at the local level** — before the network is even involved
5. **Conflict detection and surfacing** — when server state diverged from local expectations during offline period
6. **Ordering guarantees** — multi-mechanic concurrent workflows must produce a deterministic, auditable ordering

### Open Technical Questions

**Q1: IndexedDB persistence scope**
What is the scope of the offline local store? Only queued signature events, or also the full work order / task card data (read capability while offline)? Troy's use case suggests read access to task cards is needed while offline — he needs to see what he's signing. But syncing all WO data adds significant complexity.
- *Proposed answer:* Sync task card content at WO open time (opportunistic pre-fetch). Queue only write events (signatures) in offline queue. Do not attempt to sync new WO content while offline.

**Q2: Service worker lifecycle and auth**
Clerk auth tokens have a short expiry. When the mechanic is offline for 2 hours and then reconnects, their auth token may be expired. The service worker attempting to replay queued signatures with a stale token will fail. We need a strategy:
- Option A: Queue the raw signature event with a short-lived auth token; accept that some offline signatures will require re-authentication on reconnect
- Option B: Store the PIN-hash and cert data locally, allow the service worker to request a new token on reconnect before replaying queue
- Option C: Token refresh is handled transparently by Clerk's SDK; verify that Clerk's offline token behavior supports extended offline periods
- *Research required:* Clerk offline token lifetime; Clerk PWA/service-worker token refresh behavior

**Q3: Convex offline mutation behavior**
Convex's reactive client has built-in optimistic updates and queuing to some degree. Does the existing Convex JS client handle offline mutation queuing natively, or do we need to implement our own IndexedDB queue layer on top?
- *Known:* Convex JS client does not durably persist mutation queue across page reloads/app kills — this is an IndexedDB layer we must build
- *Research required:* Convex mutation queue internals; whether Convex's client-side queue survives service worker restarts

**Q4: Idempotency key design**
Each offline signature event needs an idempotency key that:
- Is generated deterministically from the signature event parameters (not a random UUID, which could differ on retry)
- Includes the `signatureAuthEvent` ID (already a single-use token)
- Includes the task step ID, the user ID, and the event timestamp
- Can be verified server-side without replay risk
- *Proposed design:* `idempotencyKey = SHA-256(signatureAuthEventId + taskStepId + userId + clientTimestamp)`

**Q5: What happens when a step was unsigned offline and then signed online by someone else?**
Two mechanics are both assigned to a work order. Mechanic A goes offline and signs step 14 locally (queued). While offline, Mechanic B — online — also signs step 14 (perhaps because step 14 required dual sign-off and the system allowed B to sign while A's signature was unknown). When A reconnects and attempts to sync step 14's signature, what does the server do?
- This is the core conflict scenario. We need a clear policy:
  - Option A: Server rejects A's queued signature if the step is already fully signed; surfaces a conflict to A
  - Option B: Server accepts both signatures if dual sign-off is required and only one was online (B's)
  - Option C: Server compares `signatureAuthEvent` IDs; A's event was never consumed server-side; reject A's queue replay, return "step already completed"
- *Recommended policy:* Option C — check step completion state at sync time; if already complete, do not apply A's queued signature; surface this as "Signature not applied — step already completed by [other user]" in A's sync confirmation feed

**Q6: Conflict resolution for WO state changes**
If a work order is put on hold, or a task card is canceled, or a discrepancy is raised against a step — all while a mechanic is offline with pending signatures for that step — what happens at sync time?

**Q7: Ordering guarantees**
Multiple mechanics sign different steps offline. On reconnect, their queued events arrive at the server in reconnection order (race condition). We need the server to apply signatures in `clientTimestamp` order within a single WO, not in network-arrival order.

### Regulatory Touch Points
- **AC 120-78B** — Electronic signatures; each signature must be attributable to a specific individual, non-repudiable, tamper-evident; the standard does not specifically address offline capture but the integrity requirements are absolute
- **AC 43-9C §6** — Record content; an incomplete maintenance record (unsigned step) is a violation regardless of the mechanism
- **14 CFR §43.9(a)(4)** — Signature must identify the individual who performed the work
- **FAA Order 8300.10, Ch. 9** — IA authorization and sign-off deliberateness; "deliberate" act requirement has been interpreted to require that the signer be aware of what they are signing at the moment of signing — offline capture must demonstrate this same deliberateness standard

---

## Implementation Spec

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / PWA                         │
│                                                          │
│  ┌─────────────┐    ┌───────────────────────────────┐   │
│  │  React App   │    │      Service Worker            │   │
│  │  (Next.js)   │◄──►│  - Background sync            │   │
│  │             │    │  - Network proxy               │   │
│  └──────┬──────┘    │  - Queue replay on reconnect   │   │
│         │           └───────────────────────────────┘   │
│         ▼                         │                      │
│  ┌─────────────┐                  │                      │
│  │  IndexedDB  │◄─────────────────┘                      │
│  │             │                                          │
│  │  Stores:    │                                          │
│  │  - queue    │  (pending signature events)             │
│  │  - cache    │  (read-only WO/task content)            │
│  │  - sync_log │  (per-item sync outcomes)              │
│  └─────────────┘                                          │
└─────────────────────────────────────────────────────────┘
                         │ (online)
                         ▼
              ┌──────────────────────┐
              │   Convex Backend     │
              │                      │
              │  Mutations:          │
              │  - signTaskStep      │
              │    (idempotent)      │
              │  - replaySyncQueue   │
              │                      │
              │  Idempotency store:  │
              │  - processedKeys     │
              └──────────────────────┘
```

### New Data Store: IndexedDB Schema

**Object Store: `signature_queue`**

```typescript
interface QueuedSignatureEvent {
  localId: string;                  // client-generated UUID for local dedup
  idempotencyKey: string;           // SHA-256(authEventId+stepId+userId+clientTs)
  signatureAuthEventId: string;     // The single-use auth token ID
  taskStepId: string;
  taskCardId: string;
  workOrderId: string;
  userId: string;
  certificateNumber: string;        // Cached from user profile at queue time
  pinHashAttestation: string;       // SHA-256 of PIN entered at sign time (for audit, not replay)
  clientTimestamp: number;          // epoch ms — when mechanic tapped Sign
  signaturePayload: string;         // The same payload that would be hashed on server
  localPayloadHash: string;         // SHA-256 of signaturePayload, computed client-side
  status: "pending" | "syncing" | "confirmed" | "conflict" | "rejected";
  syncAttempts: number;
  lastSyncAttemptAt?: number;
  serverAckAt?: number;
  serverSignatureId?: string;       // Set on confirmation
  conflictReason?: string;          // Set if status = "conflict" | "rejected"
  displayStepName: string;          // Cached human-readable step name for UI display
}
```

**Object Store: `offline_cache`**

```typescript
interface CachedWorkOrder {
  workOrderId: string;
  cacheVersion: string;             // Server version tag at time of cache
  cachedAt: number;
  taskCards: CachedTaskCard[];
}

interface CachedTaskCard {
  taskCardId: string;
  title: string;
  steps: CachedStep[];
  requiredSigners: string[];
}

interface CachedStep {
  stepId: string;
  description: string;
  signatureRequired: boolean;
  completedBy?: string;             // userId if already signed on server
  completedAt?: number;
}
```

**Object Store: `sync_log`**

```typescript
interface SyncLogEntry {
  syncSessionId: string;            // UUID for the reconnection sync event
  startedAt: number;
  completedAt?: number;
  totalItems: number;
  confirmedItems: number;
  conflictItems: number;
  rejectedItems: number;
  itemResults: SyncItemResult[];
}

interface SyncItemResult {
  localId: string;
  displayStepName: string;
  outcome: "confirmed" | "conflict" | "rejected" | "failed";
  serverSignatureId?: string;
  conflictReason?: string;
  serverAckAt?: number;
}
```

### Service Worker Design

**Registration:** Service worker registered via `next-pwa` or custom SW in `/public/sw.js`. Scope: full app.

**Lifecycle hooks used:**
- `install` — pre-cache static assets and critical UI components
- `activate` — clean up old caches
- `fetch` — network proxy; pass through for Convex WebSocket; intercept HTTP API calls if any
- `sync` (Background Sync API) — triggered when connectivity restores; initiates queue replay

**Background Sync Event: `athelon-signature-sync`**

```javascript
// Registered by the app when a signature is queued offline:
navigator.serviceWorker.ready.then(sw => {
  sw.sync.register('athelon-signature-sync');
});

// Service worker handles the sync event:
self.addEventListener('sync', event => {
  if (event.tag === 'athelon-signature-sync') {
    event.waitUntil(replaySignatureQueue());
  }
});
```

**`replaySignatureQueue()` — core sync function**

```javascript
async function replaySignatureQueue() {
  const db = await openAthelon IDB();
  const pending = await db.getAll('signature_queue', 
    IDBKeyRange.only('pending'));
  
  // Sort by clientTimestamp ascending — preserve mechanic's signing order
  pending.sort((a, b) => a.clientTimestamp - b.clientTimestamp);
  
  const syncSessionId = generateUUID();
  const results = [];
  
  for (const item of pending) {
    await db.put('signature_queue', { ...item, status: 'syncing' });
    
    try {
      // Attempt to replay against Convex mutation
      const result = await replaySignatureToConvex(item);
      
      if (result.status === 'confirmed') {
        await db.put('signature_queue', {
          ...item,
          status: 'confirmed',
          serverAckAt: Date.now(),
          serverSignatureId: result.signatureId,
        });
        // Emit per-item confirmation to UI via postMessage
        broadcastSyncProgress({ 
          type: 'ITEM_CONFIRMED', 
          localId: item.localId, 
          displayStepName: item.displayStepName,
          serverSignatureId: result.signatureId,
        });
        
      } else if (result.status === 'conflict') {
        await db.put('signature_queue', {
          ...item,
          status: 'conflict',
          conflictReason: result.reason,
        });
        broadcastSyncProgress({
          type: 'ITEM_CONFLICT',
          localId: item.localId,
          displayStepName: item.displayStepName,
          reason: result.reason,
        });
        
      } else if (result.status === 'rejected') {
        await db.put('signature_queue', {
          ...item,
          status: 'rejected',
          conflictReason: result.reason,
        });
        broadcastSyncProgress({
          type: 'ITEM_REJECTED',
          localId: item.localId,
          displayStepName: item.displayStepName,
          reason: result.reason,
        });
      }
      
      results.push({ localId: item.localId, outcome: result.status, ... });
      
    } catch (err) {
      // Network failure mid-sync — mark for retry, do not advance
      await db.put('signature_queue', {
        ...item,
        status: 'pending',
        syncAttempts: item.syncAttempts + 1,
        lastSyncAttemptAt: Date.now(),
      });
    }
  }
  
  // Write sync log
  await db.add('sync_log', {
    syncSessionId,
    startedAt: syncStart,
    completedAt: Date.now(),
    totalItems: pending.length,
    ...summarize(results),
  });
  
  broadcastSyncProgress({ type: 'SYNC_SESSION_COMPLETE', syncSessionId, results });
}
```

### Convex Backend Changes

#### `idempotencyKeys` table (new)

```typescript
defineTable({
  key: v.string(),              // The SHA-256 idempotency key
  signatureId: v.id("signatures"),  // The resulting signature record
  processedAt: v.number(),
  userId: v.id("users"),
  taskStepId: v.id("taskSteps"),
})
.index("by_key", ["key"])
```

#### `mutations/signatures.ts` — `signTaskStepWithIdempotency` (new / wraps existing)

```typescript
export const signTaskStepWithIdempotency = mutation({
  args: {
    idempotencyKey: v.string(),     // Client-computed SHA-256
    signatureAuthEventId: v.id("signatureAuthEvents"),
    taskStepId: v.id("taskSteps"),
    taskCardId: v.id("taskCards"),
    workOrderId: v.id("workOrders"),
    clientTimestamp: v.number(),    // When mechanic tapped Sign (epoch ms)
    signaturePayload: v.string(),   // The payload string
    clientPayloadHash: v.string(),  // Client-side hash; server recomputes and verifies match
    capturedOffline: v.boolean(),   // true when queued offline
  },
  
  handler: async (ctx, args) => {
    // === PHASE 0: IDEMPOTENCY CHECK ===
    const existing = await ctx.db
      .query("idempotencyKeys")
      .withIndex("by_key", q => q.eq("key", args.idempotencyKey))
      .unique();
    
    if (existing) {
      // Already processed — return the existing signature ID (not an error)
      // This is a safe idempotent replay
      return { 
        status: "confirmed", 
        signatureId: existing.signatureId,
        idempotent: true,
      };
    }
    
    // === PHASE 1: AUTH EVENT VALIDATION ===
    const authEvent = await ctx.db.get(args.signatureAuthEventId);
    if (!authEvent) {
      throw new ConvexError({ 
        code: "AUTH_EVENT_NOT_FOUND",
        message: "Signature auth event not found or already consumed",
      });
    }
    if (authEvent.consumed) {
      throw new ConvexError({
        code: "AUTH_EVENT_ALREADY_CONSUMED", 
        message: "This auth event has already been used",
      });
    }
    if (authEvent.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "AUTH_EVENT_EXPIRED",
        message: "Auth event expired",
      });
    }
    
    // === PHASE 2: STEP STATE CHECK ===
    const step = await ctx.db.get(args.taskStepId);
    if (!step) throw new ConvexError({ code: "STEP_NOT_FOUND" });
    if (step.signedBy) {
      // Step already signed by someone else while offline
      return {
        status: "conflict",
        reason: `Step already signed by ${step.signedByName} at ${step.signedAt}`,
        existingSignatureId: step.signatureId,
      };
    }
    if (step.voided || step.canceled) {
      return {
        status: "rejected",
        reason: "Step was voided or canceled while you were offline",
      };
    }
    
    // === PHASE 3: WORK ORDER STATE CHECK ===
    const wo = await ctx.db.get(args.workOrderId);
    if (wo?.status === "on_hold" || wo?.status === "canceled") {
      return {
        status: "rejected",
        reason: `Work order is ${wo.status} — signature cannot be applied`,
      };
    }
    
    // === PHASE 4: HASH VERIFICATION ===
    const serverComputedHash = await computeSignatureHash(args.signaturePayload);
    if (serverComputedHash !== args.clientPayloadHash) {
      throw new ConvexError({
        code: "HASH_MISMATCH",
        message: "Signature payload hash does not match — possible data corruption in offline queue",
      });
    }
    
    // === PHASE 5: WRITE SIGNATURE ===
    // Mark auth event consumed (atomic)
    await ctx.db.patch(args.signatureAuthEventId, { consumed: true, consumedAt: Date.now() });
    
    // Write signature record
    const signatureId = await ctx.db.insert("signatures", {
      taskStepId: args.taskStepId,
      taskCardId: args.taskCardId,
      workOrderId: args.workOrderId,
      userId: authEvent.userId,
      signedAt: Date.now(),              // Server time is canonical
      clientTimestamp: args.clientTimestamp,  // Preserved for audit
      capturedOffline: args.capturedOffline,
      signaturePayload: args.signaturePayload,
      payloadHash: serverComputedHash,
      idempotencyKey: args.idempotencyKey,
    });
    
    // Update step
    await ctx.db.patch(args.taskStepId, {
      signedBy: authEvent.userId,
      signedAt: Date.now(),
      signatureId,
    });
    
    // Write idempotency record
    await ctx.db.insert("idempotencyKeys", {
      key: args.idempotencyKey,
      signatureId,
      processedAt: Date.now(),
      userId: authEvent.userId,
      taskStepId: args.taskStepId,
    });
    
    return { status: "confirmed", signatureId, idempotent: false };
  },
});
```

#### Auth Event Expiry for Offline Use

The existing `signatureAuthEvent` model must accommodate offline scenarios. Current implementation likely has a short TTL (minutes). For offline capture, the auth event is consumed at a later time.

**Design decision:** The auth event is NOT held open for hours while offline. Instead:
1. The mechanic initiates sign-off while online (or marginal connectivity) — auth event is created with a standard TTL (e.g., 5 minutes)
2. If offline, the sign-off flow completes locally using the locally-captured auth event parameters
3. The auth event payload (PIN hash, identity assertion, timestamp) is captured in the queue item
4. On reconnect, the server validates the auth event ID against the database (if still within extended offline window TTL, e.g., 48 hours for offline) OR implements a re-auth challenge if the original event expired

**Recommended approach:** Two-tier auth event TTL:
- Standard online TTL: 5 minutes (existing behavior)
- Offline-capable TTL: 48 hours — set only when mechanic explicitly enters offline-capable sign mode
- Offline-capable events are flagged `offlineCapable: true` in the `signatureAuthEvents` table
- The mutation validates that an offline-captured signature used an `offlineCapable` auth event

```typescript
// signatureAuthEvents table additions:
offlineCapable: v.optional(v.boolean()),  // true = 48hr TTL
offlineTTLExpiresAt: v.optional(v.number()),  // epoch ms, 48hr from creation
```

### UI Components

#### `OfflineSignaturePendingBanner`

- Appears at top of any task card with pending offline signatures
- **Never dismissible** while signatures are in `pending` or `syncing` state
- Copy: **"[N] signature(s) queued — waiting for connection"**
- When syncing begins: **"Syncing [N] signature(s)..."** with animated indicator
- Does NOT show generic "sync complete" — see `SyncConfirmationFeed`

#### `SyncConfirmationFeed` (the key Troy Weaver UX requirement)

A persistent, scrollable feed that appears during and after sync. Shows each queued item individually:

```
┌─────────────────────────────────────────────────────────┐
│  🔄  Syncing 5 signatures...                            │
│                                                          │
│  ✅  Step 3 — Torque check, aileron bellcrank           │
│      Confirmed 14:32:07 · Signature ID: sig_abc123      │
│                                                          │
│  ✅  Step 5 — Rig check, elevator                       │
│      Confirmed 14:32:08 · Signature ID: sig_abc124      │
│                                                          │
│  ⏳  Step 7 — Operational check, trim tabs             │
│      Syncing...                                          │
│                                                          │
│  ⏳  Step 8 — Inspector sign-off, aileron              │
│      Queued                                              │
│                                                          │
│  ⚠️   Step 4 — Functional test, flap actuator          │
│      CONFLICT: Step already signed by J. Torres         │
│      [View Details]  [Dismiss]                           │
└─────────────────────────────────────────────────────────┘
```

- Each item resolves individually — never grouped
- Green checkmark appears when `serverAckAt` is set for that item
- Conflicts and rejections appear inline with explanation and CTA
- The feed is retained in `sync_log` — accessible any time after sync, not just immediately

#### `DuplicateSignatureGuard` (the Carla Ostrowski requirement)

Before allowing a mechanic to sign a step:
1. Check local `signature_queue` for any pending entry with the same `taskStepId`
2. If found and `status === "pending"`, show modal:
   ```
   ⚠️ Signature Pending
   
   You signed this step at [clientTimestamp] while offline.
   That signature is queued and has not yet synced.
   
   Do NOT sign again — your first signature is preserved.
   
   [View Pending Queue]  [OK, Don't Re-sign]
   ```
3. Sign button must be disabled while a pending queue item exists for this step
4. This check occurs entirely client-side in IndexedDB — no network call required

#### `OfflineSignatureAuditBadge`

On any signature record in the maintenance record view:
- If `capturedOffline === false`: no badge (standard display)
- If `capturedOffline === true`: badge reads **"Signed offline · Synced [serverAckAt timestamp]"**
- Badge is part of the rendered record and included in PDF export

#### `OfflineCapableSignModal` (modification to existing sign flow)

At Phase 1 (summary step) of the sign-off flow:
- If `navigator.onLine === false` or connectivity indicator shows offline: UI enters offline sign mode
- Banner: **"You are offline. This signature will be queued and synced when connection restores."**
- The mechanic proceeds through PIN entry normally
- On PIN confirmation: signature event is written to IndexedDB queue (not to Convex)
- Background sync is registered
- UI immediately shows the step as "Signed (pending sync)" — distinct visual state from "Signed (confirmed)"

#### Connectivity States for Step Cards

| State | Visual | Meaning |
|---|---|---|
| Unsigned | Grey ring | Not yet signed |
| Signed (confirmed) | Solid green checkmark | Server-confirmed |
| Signed (pending) | Amber pulsing ring | Queued offline, awaiting sync |
| Signed (syncing) | Blue spinning | Sync in progress |
| Conflict | Red warning | Server rejected or conflict detected |

---

## Test Plan — Cilla Oduya

> "I will try to break this. I will try to sign things twice, lose the phone mid-sync, restore the device, go offline in the middle of a sync, and make two mechanics sign the same step at the same time. If any of those scenarios produce a duplicated or lost signature that makes it into the maintenance record without detection, this feature doesn't ship."

| Test ID | Scenario | Input | Expected | Regulatory Basis |
|---|---|---|---|---|
| TC-D-01 | Happy path offline sign-and-sync | Mechanic goes offline, signs 5 steps on two different task cards, reconnects | All 5 items appear individually in SyncConfirmationFeed; each shows green checkmark when server confirms; batch "sync complete" message never shown; `sync_log` record written with 5 confirmed items | AC 120-78B; §43.9(a)(4) |
| TC-D-02 | Duplicate prevention — same step, same mechanic, offline | Mechanic signs Step 7 offline (queued). App does not indicate pending. Mechanic attempts to sign Step 7 again. | DuplicateSignatureGuard fires client-side; sign button disabled; modal shown: "Signature pending — do not re-sign"; second signature NOT added to queue; `signature_queue` contains exactly one entry for this step+user | Carla Ostrowski requirement; AC 120-78B non-repudiation |
| TC-D-03 | Skyline incident replay — pending invisible to mechanic | Simulate alpha behavior: Step 7 signed offline, no UI feedback. Mechanic retries. Queue replay results in duplicate on server. | This test is expected to FAIL on alpha behavior (existing fast-fail behavior may not cover offline state). Must PASS on v1.1 with DuplicateSignatureGuard. Confirm server-side idempotency key deduplication also fires as secondary defense. | Carla Ostrowski incident; AC 120-78B |
| TC-D-04 | Idempotency key dedup — same event replayed twice at server | Two instances of the service worker (simulated via two browser tabs) both attempt to replay the same queued signature event simultaneously | Server processes first arrival; second arrival hits idempotency check; returns `{ status: "confirmed", idempotent: true }` with original `signatureId`; no duplicate signature record created; `idempotencyKeys` table has exactly one record for this key | AC 120-78B §5-5; internal integrity |
| TC-D-05 | Conflict: step signed online by another mechanic while first mechanic is offline | Mechanic A goes offline, queues signature for Step 14. Mechanic B (online) completes Step 14 online. Mechanic A reconnects and queue replays. | Server returns `{ status: "conflict", reason: "Step already signed by B" }`; A's signature NOT written; A's queue item shows CONFLICT in SyncConfirmationFeed; A is prompted to review; maintenance record contains only B's signature | AC 120-78B; §43.9(a) |
| TC-D-06 | Work order put on hold during offline period | Mechanic signs 3 steps offline. Shop lead puts WO on hold (server-side). Mechanic reconnects. | Queue replays; all 3 items return `{ status: "rejected", reason: "Work order on hold" }`; SyncConfirmationFeed shows 3 rejected items with reason; maintenance record has 0 new signatures; WO hold-state prominently displayed | §43.9(a); Part 145 record integrity |
| TC-D-07 | Auth event expiry — offline longer than TTL | Mechanic initiates offline-capable sign-off, goes offline for 49 hours (beyond 48hr TTL), reconnects and attempts sync | If `offlineCapable=false`: sync fails with AUTH_EVENT_EXPIRED; user prompted to re-sign; offline signature NOT applied; explicit failure message shown. If `offlineCapable=true`: within TTL, succeeds. Verify boundary condition at exactly 48:01 hours. | AC 120-78B §5-4 |
| TC-D-08 | Device restart while sync in progress | Mechanic has 5 pending items; sync starts; device is hard-restarted at item 3 | On restart: items 1-2 are `confirmed` in IDB (server confirmed, idempotency keys written). Items 3-5 are still `pending`. Background sync re-fires. Items 3-5 replay from IDB queue. No duplicates. Items 1-2 are idempotency-deduplicated if re-sent. | Internal integrity; AC 120-78B |
| TC-D-09 | Hash mismatch — corrupted queue item | Manually corrupt the `signaturePayload` field in IDB for a queued item. Trigger sync. | Server rejects with HASH_MISMATCH. Item marked `rejected` in queue and SyncConfirmationFeed. No signature written. Alert displayed to mechanic: "Queue item corrupt — do not proceed without supervisor review." Auth event NOT consumed. | AC 120-78B tamper-evidence; SHA-256 integrity |
| TC-D-10 | Ordering guarantee — 3 mechanics sign offline in different order, reconnect in different order | Mech A signs steps 1,2,3 offline at T=0,1,2 min. Mech B signs steps 4,5 offline at T=0.5,1.5 min. Mech C goes online first at T=10 min, B at T=11 min, A at T=12 min. | Server-side `signatures` table `clientTimestamp` ordering matches the mechanics' actual signing sequence, regardless of reconnection order. `signedAt` (server time) reflects arrival order; `clientTimestamp` reflects signing order. Audit report shows both timestamps. | AC 120-78B ordering; §43.9(a)(4) |
| TC-D-11 | IA sign-off with offline subordinate signatures pending | IA attempts to initiate RTS while 2 mechanic step-signatures are in `pending` state (offline queue) | RTS initiation blocked; error: "Pending offline signatures exist — RTS cannot proceed until all signatures are synced and confirmed"; IA can see which steps are pending and which mechanics own them | §43.11(a); AC 120-78B |
| TC-D-12 | Per-item confirmation feed — correct count and labeling | Sync 7 items: 5 confirmed, 1 conflict, 1 rejected | Feed shows exactly 7 items with individual outcomes; "Syncing X signatures" count accurately decrements; final state shows 5 ✅, 1 ⚠️, 1 ❌; no "sync complete" banner shown until all 7 are resolved | Troy Weaver requirement; AC 120-78B |

---

## Compliance Sign-Off Checklist — Marcus Webb

> "Offline signatures in an FAA-regulated maintenance record context are not new — mechanics have always been able to sign paper records at a later time. What's new is doing it digitally in a way where the system's internal timestamp and the mechanic's actual signing time can differ. That gap is where the FAA will look first. We need to be able to explain it, document it, and prove the integrity of both timestamps."

### Applicable Regulations and ACs

- **14 CFR §43.9(a)(4)** — Signature must identify the person who performed and approved the work
- **14 CFR §43.11(a)** — Return to Service entry requirements; must occur after all work is complete
- **AC 120-78B §5-4** — Electronic signature system requirements: uniqueness, non-repudiation, tamper-evidence
- **AC 120-78B §5-5** — Audit trail requirements for electronic signatures
- **AC 43-9C §6** — Maintenance record content
- **FAA Order 8300.10 Ch. 9** — IA sign-off deliberateness standard

### Marcus Webb Pre-Release Checklist

**HARD BLOCKERS — Any one of these = NO-GO:**

- [ ] **[HARD BLOCK]** Every signature record in the database must carry both `clientTimestamp` (when mechanic tapped Sign) and `signedAt` (server canonical timestamp). Both must appear in the maintenance record export. The FAA can request both. If only one exists, we cannot prove signing order vs. processing order.
- [ ] **[HARD BLOCK]** The `capturedOffline: true` flag must be immutable once written. No mutation can clear or change this flag post-creation. An offline signature that has been retroactively re-labeled as online is a falsified maintenance record.
- [ ] **[HARD BLOCK]** RTS must be blocked while any step in the work order has a signature in `pending` state. An unsigned step (from the server's perspective, pending = unsigned) cannot be the basis for Return to Service. Test TC-D-11 must pass.
- [ ] **[HARD BLOCK]** The `signatureAuthEvent` consumption must be atomic with the signature record creation. If the signature record fails to write (any reason), the auth event must NOT be marked consumed. Verify this in a simulated Convex transaction rollback scenario.
- [ ] **[HARD BLOCK]** Idempotency keys must be stored in the database permanently (not pruned after 30 days or similar). An inspector reviewing records from 18 months ago needs to be able to verify that a replayed sync was deduplicated correctly.

**Standard Verification Items:**

- [ ] AC 120-78B §5-4 requires that electronic signature systems prevent repudiation. Verify that the offline PIN-hash attestation stored in the queue item is sufficient to prove deliberate act by the mechanic (PIN was entered, not just a tap). Document the deliberateness standard compliance argument.
- [ ] Verify that `offlineCapable` auth events carry the same identity-verification rigor as standard events — the 48-hour TTL should not lower the identity bar.
- [ ] The `SyncConfirmationFeed` and `sync_log` must be included in the standard audit export. If an FAA inspector asks "what happened during this sync session," we must be able to produce the log.
- [ ] Confirm that conflict and rejected items are logged permanently (not just shown in UI and then cleared). A conflict is a material event in the maintenance record history.
- [ ] Review the offline-capable sign mode opt-in mechanism: is there a risk that mechanics routinely sign offline to avoid the network dependency, then sync in bulk in the office — losing the "in the field at the time of work" integrity? Consider whether offline mode should require proximity validation (e.g., Bluetooth beacon, GPS geofence near aircraft tail number). Flag for Nadia/policy discussion.
- [ ] `OfflineSignatureAuditBadge` must appear in the PDF export, not just the web UI. FAA inspectors reviewing printed records should see the offline capture notation.
- [ ] Verify that the Background Sync API has a fallback for environments where it is not supported (e.g., certain browser configurations). The fallback must be explicit failure + user alert, not silent loss.
- [ ] The `hash_mismatch` rejection path (TC-D-09) must generate an alert to the shop's QA record (not just the mechanic's UI) — a hash mismatch on a signature event is a potential tampering indicator.

**Deliberateness Standard (Marcus's specific concern):**

> Per FAA Order 8300.10, Chapter 9 Paragraph 9-48: the IA signature on a Return to Service entry must be a deliberate act. I interpret this to mean the signer must be cognitively aware of what they are signing at the moment of signing. Offline capture, by design, defers the server processing — but the deliberate act (mechanic looks at step, decides it's airworthy, enters PIN) must happen in the field, at the aircraft, before the network event. Our system must document the clientTimestamp as the moment of the deliberate act, and the serverAckAt as the moment of record creation, and make the distinction clear in every audit output.

---

## Status

**NEEDS DESIGN SPIKE**

Two design questions must be resolved before build begins:

1. **Auth event offline TTL strategy** — Tanya needs to prototype Clerk's PWA/service-worker token behavior and determine whether the 48-hour `offlineCapable` TTL approach is viable. If Clerk cannot support this, an alternative auth-at-reconnect re-challenge flow must be designed.

2. **Background Sync API support matrix** — Jonas must confirm Browser Sync API availability across the target device landscape (specifically older iOS Safari versions used in hangars). Fallback strategy required before service worker is written.

Pending resolution of these two spikes, all other components (IDB schema, Convex mutations, UI components) are READY FOR BUILD.

---
*Filed: 2026-02-22 | Second-wave R&D session | Athelon Phase 15*  
*This is the highest-risk stream in Phase 15. Tanya and Devraj must co-own the design spike output. Do not begin implementation until both blockers are resolved and Marcus has signed off on the deliberateness standard compliance argument.*
