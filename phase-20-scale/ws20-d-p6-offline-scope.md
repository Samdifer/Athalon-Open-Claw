# WS20-D — P6 Offline Mode Scoping
**Phase:** 20 — Scale  
**Status:** SCOPED — DEVICE MATRIX UNDERWAY  
**Lead:** Tanya Birch (infrastructure + service worker architecture)  
**Supporting:** Jonas Harker (CDN / infrastructure) + Devraj Anand (Convex sync layer)  
**Timeline:** 3 weeks device matrix validation → P6 activation decision

---

## Context

Offline mode was designed and specced in Phase 15 (WS15-D), and the trust-boundary spikes were validated in Phase 16 (WS16-A). The architecture decisions are settled: 4-hour trust window, per-item queue confirmation, fail-closed on conflict. What hasn't been done is real-device validation across the target hardware. P6 offline mode goes live only after Tanya has run the full matrix and confirmed that the behavior specified in WS15-D is the behavior that actually ships on the devices Skyline and High Desert are using.

Tanya's philosophy, stated in the Phase 15 kickoff: *"I will not ship offline mode until I've dropped connectivity on every target device myself and watched what happens."*

---

## Target Devices

### iPad 10th Gen (Skyline Aviation — current fleet)
Carla's shop uses iPads. Specifically, they have three iPad 10th generation units — two on the shop floor, one in the coordinator's office. These are the primary working devices for Skyline's technicians. Offline mode has to be bulletproof on these.

iOS 17 behavior characteristics relevant to offline:
- Service worker lifecycle is well-established but aggressive about cache eviction under storage pressure
- Background sync API is available but unreliable across iOS Safari versions — Tanya is not relying on it
- PWA installed-to-homescreen behavior differs from browser tab behavior in ways that matter for service worker registration

### Samsung Galaxy Tab A8 (High Desert MRO — Bill's shop preference)
Bill's shop runs Android. Bill mentioned this to Nadia on the call — they have two Galaxy Tab A8 units they use for documentation reference on the floor. He asked whether Athelon would work on them. The answer needs to be yes.

Android Chrome service worker behavior differs from iOS Safari in important ways (detailed below). The Tab A8 is a mid-range Android 13 device — not the fastest, not slow, but the offline asset bundle size and cache management strategy need to account for its storage profile.

### iPhone 14 (Troy Weaver's floor device)
Troy Weaver, Athelon's A&P SME from Phase 15, uses his personal iPhone 14 as his floor device. He specifically requested that offline mode work on mobile phone form factor, not just tablets. The task card sign-off flow and tool attachment interactions need to be fully functional in offline mode on a phone screen.

---

## Test Matrix

### 1. Connectivity Drop Simulation
Each device goes through a structured connectivity drop protocol:

**Scenario A — Planned drop:** Technician is mid-task-card entry. Airplane mode enabled. Continue working. Re-enable connectivity. Verify: all in-progress entries queued, no data loss, sync confirmation fires within 30 seconds of reconnect.

**Scenario B — Unplanned drop (mid-signature):** IA is in the middle of the IA re-auth biometric flow. Connectivity drops. Verify: signature flow does not proceed (fail-closed — cannot sign without connectivity confirmation for IA re-auth specifically, per AC 120-78B). System presents: *"Connectivity required for IA authorization — reconnect to continue."*

**Scenario C — Extended offline (2+ hours):** Technician works offline for 2.5 hours. At the 4-hour trust window boundary (described below), system behavior is tested. Verify: warning fires at 3.5 hours. Hard lock fires at 4 hours. No silent expiry.

**Scenario D — Conflict on reconnect:** Two technicians edit the same task card field while both offline. On reconnect, conflict detection fires. System presents conflict resolution UI — does not silently overwrite. Tanya verifies which device "wins" matches the conflict resolution spec from WS15-D (last-server-confirmed timestamp wins; user is notified of the discarded value).

### 2. 4-Hour Trust Window Enforcement
The offline trust window is 4 hours. Within 4 hours of last server sync confirmation, a technician may continue working offline. At the 4-hour mark, the system hard-locks new entries until connectivity is re-established and the session is re-validated.

**Test matrix for trust window:**
- 30-minute offline: full function, no warnings — verified per device
- 3.5-hour offline: warning banner fires: *"Offline mode expires in 30 minutes — reconnect to continue working"* — verified per device
- 4.0-hour offline: system locks new task card entries, new tool attachments. Read access remains. Existing queued items remain queued — they are not discarded. On reconnect: sync fires, session re-validates, lock clears — verified per device
- 4.1-hour offline: same as 4.0 — no grace period, no silent bypass — verified per device

**Why 4 hours:** This was established in WS15-D based on SME input from Troy Weaver and Dale Renfrow. A typical maintenance shift is 8 hours. 4 hours gives a full half-shift of offline coverage while still requiring at least one mid-shift sync — which catches both data integrity issues and connectivity failures before they compound.

### 3. Queue Confirmation Per-Item
Every action queued while offline must be explicitly confirmable by the user before sync. The technician must see: "These 4 items are queued for sync" with each item listed. They confirm before the sync fires — or they can discard individual items if they made an error.

**Why per-item:** Troy's feedback in Phase 15 was direct: *"I don't want the app to automatically push everything I did while I was offline. I want to see what it's about to do. I might have made a mistake."* This was written into the spec and is the test criterion.

**Test cases:**
- Queue 3 task card entries + 1 tool attachment while offline. On reconnect: confirm all 4 items appear in the queue manifest before sync fires. ✅ (staging validated)
- Queue 1 entry, decide to discard it, confirm the other 3 sync without it. ✅ (staging validated)
- Queue 0 items (technician was reading, not writing). On reconnect: no sync prompt fires, no unnecessary confirmation UI. ✅

### 4. Conflict Detection
When two devices have edited the same record while offline and both reconnect:
- System detects conflict on the second sync attempt
- Presents conflict UI: "This record was updated by [user] while you were offline. Current server value: [X]. Your queued value: [Y]. Which do you want to keep?"
- Does not silently merge or silently discard
- Either choice is logged in the audit trail with user, timestamp, and resolution decision

**Conflict detection architecture:** Devraj implemented optimistic version tokens (OVT) on every mutable record. On sync, the OVT from when the record was last seen is sent with the update. If the server-side OVT has advanced, conflict is detected. This is the same mechanism used in the Convex mutations generally — the offline layer integrates with it rather than working around it.

---

## Android vs iOS: Service Worker Differences

This is the technically hairy part of P6. Tanya's assessment:

### iOS Safari (iPad 10th gen, iPhone 14)

**Storage:**  
iOS Safari enforces a 50MB per-origin storage limit for service worker caches by default. Aggressive storage eviction occurs when the device is low on storage. Tanya has verified the Athelon offline asset bundle is ~12MB (app shell + last 30 days of relevant WO data for the shop). Comfortably within limits for normal operation — but if a shop has heavy media attachments (photos of discrepancies, etc.), the cache could grow. Jonas has implemented a cache eviction policy that prioritizes the app shell and current WO data over older records.

**Service worker lifecycle:**  
iOS Safari will terminate a service worker after ~30 seconds of inactivity in the background. This means that if a technician switches apps for more than 30 seconds, the service worker may need to re-register on return. Tanya's implementation handles this: the app shell checks service worker registration on every foreground event and re-registers if needed. No data loss — the queue is persisted in IndexedDB, not in the service worker's memory.

**Background sync:**  
Background sync is not reliably available on iOS. Tanya is not using it. All sync is triggered by foreground events (app return to foreground, user explicitly tapping "sync now," or reconnect event). This is a more conservative approach than the Android implementation.

**PWA installation:**  
Athelon is installable to the iOS homescreen. When installed, it runs as a standalone PWA with its own service worker scope. Tanya has verified that the service worker registration is correct in standalone mode and that the trust window timer persists correctly across homescreen restarts.

### Android Chrome (Samsung Galaxy Tab A8)

**Storage:**  
Android Chrome is significantly more permissive — up to 60% of available free storage is available to service worker caches. No meaningful storage constraint issue for Athelon's bundle size.

**Service worker lifecycle:**  
Android Chrome keeps service workers alive in the background much more reliably than iOS Safari. Tanya's implementation is more aggressive on Android — background sync is used where available, giving technicians a more seamless reconnect experience (sync fires automatically when connectivity returns, then prompts for queue confirmation rather than requiring manual trigger).

**Background sync:**  
Available and reliable on Android Chrome 113+. The Tab A8 will be running Chrome 120 or later. Tanya uses the Background Sync API on Android to queue a sync event when connectivity is restored, then triggers the queue confirmation UI in the foreground when the technician next opens the app. This means on Android, reconnect → sync confirmation is nearly instantaneous. On iOS, it waits for the user to open the app.

**WebAuthn / IA re-auth:**  
Android Chrome's WebAuthn implementation for biometric auth differs from iOS. Tanya has verified that the IA re-auth flow (Scenario B in the connectivity drop test) behaves identically on both platforms: fail-closed when offline, no matter the WebAuthn implementation details. The platform-specific differences are in the biometric challenge UI, not in the security model.

### Implementation Approach
Tanya uses a platform-detection shim that selects the appropriate sync strategy at runtime:
```typescript
const syncStrategy = isPlatformIOS() 
  ? new ForegroundSyncStrategy() 
  : new BackgroundSyncStrategy();
```
Both strategies implement the same `SyncManager` interface — the rest of the application doesn't know which one is running. This keeps the conflict detection and queue confirmation logic identical across platforms.

---

## Tanya's Timeline Estimate

**Week 1 (2026-02-23 – 2026-03-01):** Device setup and baseline testing. All three devices provisioned with current production build. Connectivity drop scenarios A–D run on iPad 10th gen. Issues documented, Devraj patches anything that surfaces.

**Week 2 (2026-03-02 – 2026-03-08):** Android matrix. Galaxy Tab A8 full matrix. Then iPhone 14. Cross-device conflict scenario (iPad vs Android simultaneous offline). Document any platform-specific edge cases.

**Week 3 (2026-03-09 – 2026-03-15):** Edge case closure. Extended offline test (2.5 hours per device). Trust window enforcement verified on all three devices. Jonas's CDN caching validated (see below). Final sign-off run.

**P6 Activation Decision: Week of 2026-03-16** — if device matrix passes, P6 offline mode goes live. If any open issues, Tanya holds activation until closed. No partial rollout — offline mode ships when it's right on all three devices or it doesn't ship.

---

## Jonas's Infrastructure Note: CDN Caching Strategy

The offline mode's usefulness depends on the asset bundle being fresh when the technician goes offline. If a technician's last sync was two days ago and the app has been updated since, they might be offline with a stale app shell.

Jonas's CDN strategy for offline asset delivery:

**1. Versioned asset manifest**  
Every build generates a `manifest.json` with content-hashed filenames for all static assets. The service worker fetches this manifest on every foreground event when online. If any asset hash has changed, it pre-fetches the updated assets in the background before the technician might need them offline. The technician never sees this — it happens silently.

**2. CDN cache headers**  
Static assets (content-hashed): `Cache-Control: public, max-age=31536000, immutable`  
Manifest file: `Cache-Control: public, max-age=60, stale-while-revalidate=300`  
API responses (Convex): Not CDN-cached (real-time, not appropriate for CDN)  
WO data snapshot (offline bundle): `Cache-Control: public, max-age=300, stale-while-revalidate=900`

**3. Shop-specific offline bundle**  
Jonas pre-computes a shop-specific offline data snapshot on the CDN edge: last 30 days of WO records, aircraft data, and user profiles for the authenticated shop. This snapshot is computed every 5 minutes and delivered via CDN. When a technician's device syncs, it pulls the latest snapshot from the CDN edge (fast) rather than querying Convex directly (slower). Convex is the authoritative source — the snapshot is a cached read layer only. Writes always go through Convex.

**4. Storage quota management**  
Jonas implemented a quota monitor in the service worker. If the device's available storage drops below 50MB, the offline bundle pruning algorithm activates: removes WO records older than 7 days (keeping only the last week of data instead of 30 days). This trades completeness for reliability — a technician with a nearly-full device still has a functional offline mode, just with a shorter history window.

*"The failure mode I'm optimizing against is a technician going offline and not having the data they need because we ran out of storage. That's worse than not having offline mode. So we degrade gracefully — smaller window, but never empty."* — Jonas Harker

---

## P6 Activation Conditions

1. All three devices pass the full test matrix (Scenarios A–D + trust window + queue confirmation + conflict detection)
2. Android/iOS sync strategy differences documented and validated
3. Jonas's CDN caching verified: asset delivery fresh within 5-minute SLA on all three devices
4. Troy Weaver (SME) does a live offline walkthrough on iPhone 14 — his sign-off required
5. Tanya's final sign-off on device matrix report
6. Marcus reviews for any compliance implications of the 4-hour trust window (expected: PASS — WS15-D trust boundary spec was already Marcus-reviewed)

**P6 goes live when all 6 conditions are met. Not before.**

---

*WS20-D filed by Tanya Birch + Jonas Harker — 2026-02-23*
