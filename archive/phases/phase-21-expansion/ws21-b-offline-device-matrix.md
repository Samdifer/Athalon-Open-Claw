# WS21-B — Offline Device Matrix Execution
**Phase:** 21  
**Owner:** Tanya Birch (lead) + Devraj Anand (fixes) + Troy Weaver (field SME, iPhone 14)  
**Scope:** 3-device offline validation matrix for P6 authorization  
**Devices:** iPad 10th gen, Samsung Galaxy Tab A8, iPhone 14  
**Validation Window:** 2026-02-24 – 2026-03-14  
**P6 Activation Decision:** **GO — week of 2026-03-16**  
**Status:** ✅ MATRIX COMPLETE — P6 AUTHORIZED

---

## Context

P6 offline mode was scoped in Phase 20 (WS20-D). The design was complete. The implementation was complete. What remained was the device matrix — three specific devices representing the range of hardware in real shop deployments — run to failure to find the edge cases before the feature went live.

Tanya's rule for device matrix testing: you're not looking for pass/fail on the happy path. The happy path always works. You're looking for what the software does when the environment betrays it. Network drops mid-write. OS terminates the app while a signature is queued. Background sync fires at the wrong moment. You stress the seams.

She found three. One per device.

---

## Device 1: iPad 10th Gen — SW Termination Edge Case

**Test lead:** Tanya Birch  
**Test period:** 2026-02-24 – 2026-02-28  
**Issue ID:** OFX-001

### Background

The iPad 10th gen is the primary shop floor device at Skyline (Carla's shop). It's also the most common tablet in GA maintenance environments. The test priority was high.

### The Edge Case

iOS has a background task time limit for apps that have been backgrounded while performing sync operations. The nominal window is 30 seconds. After 30 seconds, iOS is permitted to terminate the background task.

The offline queue in Athelon buffers unsynced signatures. When the app comes back to foreground (or when connectivity returns), the queue drains and signatures are committed. The question Tanya was testing: what happens to a signature that is sitting in the queue at the exact moment iOS terminates the background task?

She built a test harness that let her control exactly when the termination fired. She ran it at 1-second intervals across the 29–31 second window.

**29 seconds:** App is terminated. The queued signature is in an unwritten state — it exists in the in-memory queue but has not been persisted to IndexedDB. On relaunch, the queue is empty. The signature is gone. **No user notification.** The mechanic would not know their signature didn't take.

**30 seconds (boundary):** Race condition. Indeterminate outcome across three test runs: one ghost (gone), one duplicate (persisted twice), one clean write.

**31 seconds:** The background write completed before termination. Signature survives. Clean state on relaunch.

The 29-second case was the dangerous one. A ghost signature — a sign-off the mechanic believed they'd made, that the system silently lost — is not acceptable in an aviation maintenance context. An unnoticed missing signature on a task card is a return-to-service integrity failure.

### Tanya's Fix

The fix was not to fight iOS's termination behavior — that's a losing battle. The fix was to change the write sequence.

**Before:** Signature → in-memory queue → sync to IndexedDB → commit.  
**After:** Signature → immediate write to IndexedDB → in-memory queue → sync.

By persisting to IndexedDB synchronously before the app enters the queue-drain path, the signature survives any subsequent termination. On relaunch, the queue is reconstructed from IndexedDB, not from memory.

The boundary condition (30-second race) was resolved by adding an explicit lock on the IndexedDB write: if the write is in progress when termination fires, iOS preserves it as an atomic operation. The duplicate case was resolved by adding a unique-constraint check on signature UUID at queue drain time.

**Tanya filed OFX-001 on 2026-02-27. Fix shipped 2026-02-28.**

Post-fix matrix: 29s, 30s, and 31s all clean across 20 runs per interval. Zero ghost signatures. Zero duplicates.

### What Tanya Said

"The 29-second case is the one that keeps you up at night. Not because it's likely — in normal shop use, the app isn't being backgrounded mid-queue-drain constantly. But it's the kind of failure that's invisible. The mechanic thinks they signed. The system has no record. Nobody knows until the FAA shows up and wants the sign-off for that task card."

"We caught it in testing. That's what the matrix is for."

---

## Device 2: Samsung Galaxy Tab A8 — Background Sync Race Condition

**Test lead:** Tanya Birch  
**Fix author:** Devraj Anand  
**Test period:** 2026-03-01 – 2026-03-07  
**Issue ID:** OFX-002

### Background

The Galaxy Tab A8 is the backup device at Skyline and is being evaluated for deployment at High Desert. Android's sync behavior differs from iOS in one critical way: background sync can fire immediately on network reconnection, without the app coming to foreground first.

### The Race Condition

The offline queue uses a mutex to serialize writes — only one write operation should be processing the queue at a time. The mutex acquisition sequence is:

1. App detects connectivity restored.
2. Background sync service fires.
3. Sync service acquires queue mutex.
4. Sync service drains queue to server.

The race condition occurred when the background sync service and a foreground write operation (the mechanic adding a new signature while the queue was draining) competed for the mutex. In a subset of test runs, the background sync fired *before* the mutex was acquired — meaning it started reading the queue while the foreground write was modifying it.

The result: a partially written queue was read by the sync service, committing an incomplete set of records to the server. The records that made it through were valid. The records that didn't make it through were silently dropped from the sync run and not re-queued.

This was not a data corruption issue — the records on-device were intact. But they didn't sync. And because the sync service marked the run as complete, the queue drain logic assumed they had.

**OFX-002 was a silent data loss scenario.** Not as immediately dangerous as OFX-001 (the signatures were still on-device, not gone), but in a disconnect/reconnect cycle during a busy work session, a mechanic could generate 20 task card sign-offs, get network back, and have 14 of them sync while 6 sat unseen.

### Devraj's Fix

Devraj's solution: **optimistic lock + version token**.

Each queue entry now carries a version token — a monotonic counter that increments on every write. The mutex acquisition now includes a version check: the sync service reads the current queue version before acquiring the mutex. If the version changes between the read and the acquire, the sync service yields and retries.

On the foreground write side: every write to the queue increments the version token atomically. This makes any concurrent sync attempt aware that the queue state has changed.

The optimistic lock pattern means the sync service never reads a queue mid-write. It either sees the queue before the write (and retries after) or after the write (and processes the complete set).

**Devraj filed OFX-002 on 2026-03-05. Fix shipped 2026-03-07.**

Post-fix matrix: 50 reconnect/write-concurrent test runs. Zero dropped records. Zero partial syncs. Queue drain confirmed complete in all cases.

### What Devraj Said

"The interesting thing about this one is that Android was doing exactly what it's supposed to do. The background sync service is designed to fire immediately on reconnect — that's a feature, not a bug. The problem was that we hadn't accounted for the race between 'sync fires' and 'user is still writing.' Once you add the version token, the sync service becomes queue-state-aware. It knows when to wait."

---

## Device 3: iPhone 14 — Troy Weaver's Floor Device

**Test lead:** Troy Weaver (field SME) + Tanya Birch (engineering observer)  
**Test period:** 2026-03-08 – 2026-03-12  
**Location:** Skyline Aviation, Lakeland FL (hangar floor)  
**Issue ID:** OFX-003 + UX-FEEDBACK-001

### Background

Troy Weaver is an A&P at Skyline. He's been using the iPhone 14 as his primary work device since the P4 rollout. He was the SME for offline mode design in Phase 15 (WS15-D). When Tanya asked if he'd be willing to run the iPhone portion of the matrix himself, on the hangar floor, during actual work, he said yes without hesitating.

"I'm the person this thing is built for," he said. "Might as well be the one who finds out if it works."

### What He Did

Troy ran the iPhone matrix across five days. He worked his normal schedule. He used the offline mode in the conditions it was designed for: hangar interior, weak or no cellular, heavy metal structures blocking signal. The iPad and Galaxy Tab tests had been run in a controlled environment. Troy's test was not controlled. It was a real hangar with real aircraft and real work.

**Day 1-2:** Normal offline operation. Signature queue building correctly. Sync on walk-to-office (connectivity return) working. No issues found.

**Day 3:** Troy found something Tanya hadn't tested.

He was offline, working through a 100-hour inspection task list. He signed off eight items in succession — engine oil change, filter inspection, spark plug check, and five more. He walked to the office, connected, and the queue drained. All eight signatures synced.

What he got was: *8 items synced successfully.*

A summary. A single line.

He wanted eight confirmations.

"I need to see each one confirm," he told Tanya that evening. "Not a summary. If I signed off eight things, I want to see eight checkmarks. Because if one of them failed silently and I got 'seven items synced' I might not notice the difference between seven and eight on a summary line. But if I'm watching each one come through — spark plugs ✓, oil filter ✓ — I know exactly what committed and what didn't."

Tanya didn't argue with him. Troy has been signing off aircraft for eleven years. His instinct about what he needs to see is the product specification.

### What He Found (OFX-003)

On Day 4, in the middle of a batch sync, Troy got a summary: *11 items synced successfully.* He was pretty sure he'd signed 12.

He was right. Item 9 of the batch — a propeller inspection sign-off — had silently failed to sync. The version token fix (OFX-002) had been applied to Android but not yet to iOS (different sync service implementation). The propeller sign-off was in an on-device state but had not committed to the server.

The signature was recoverable — it was still in the local queue. But Troy didn't know it had failed until he counted manually.

This is precisely why he wanted per-item confirmation.

**OFX-003 filed 2026-03-10.** iOS sync service patched with the same optimistic lock + version token logic as Android. Fix shipped 2026-03-11.

### UX-FEEDBACK-001: Per-Item Confirmation

**Troy's request:** Replace the batch sync summary with a sequential per-item confirmation view. Each signature, as it commits, shows a brief confirmation (item name, timestamp, ✓). The list persists until the user dismisses it.

Tanya brought this to Devraj on 2026-03-10. Devraj's initial instinct was that a per-item view would be slow — visual confirmation for each of 15+ items would feel like progress bars. He proposed a hybrid: per-item confirmations with a 400ms display time per item, collapsing to a summary after all complete.

Troy: "No. I want to be able to see them. If there are fifteen, show me fifteen. I'm checking them."

Devraj: "You're going to count them every time?"

Troy: "Yes."

Devraj looked at Tanya. Tanya looked at Troy. Troy was not being unreasonable. He was being a mechanic who signs off aircraft for a living and has a very precise understanding of what "confirmed" means.

**UX-FEEDBACK-001 resolution:** Per-item confirmation view implemented. No collapsing. Items displayed in sign-off order, each with: item name, sign-off timestamp, certificate number, ✓ committed / ⚠️ retry / ✗ failed status. View persists until user explicitly dismisses. Swipe-up to dismiss if all ✓.

Devraj implemented it in two days. Shipped 2026-03-12.

### Troy's Final Verdict

On 2026-03-12, Troy ran a full day on the patched build. Batch sync, single-item sync, forced offline/reconnect. Everything confirmed correctly. Per-item view showed each sign-off as it committed.

"This is what I wanted," he said. "It's not a nice-to-have. If I can't tell that my signatures committed, I'm not using offline mode. I'll walk to the office. I'd rather have the delay than the ambiguity."

---

## Matrix Summary — All Three Devices

| Device | Issue Found | Fix Author | Fix Type | Post-Fix Status |
|---|---|---|---|---|
| iPad 10th gen | OFX-001: Ghost signature at 29s SW termination | Tanya Birch | Write-before-queue (IndexedDB immediate persist) | ✅ PASS — 20 runs clean |
| Galaxy Tab A8 | OFX-002: Background sync race condition, silent partial drain | Devraj Anand | Optimistic lock + version token | ✅ PASS — 50 runs clean |
| iPhone 14 | OFX-003: Version token not applied to iOS sync service; UX-FEEDBACK-001: Per-item confirmation | Tanya/Devraj | iOS sync parity fix + per-item confirmation UI | ✅ PASS — Troy field-verified |

All three devices passing as of 2026-03-12.

---

## P6 Activation Decision

**Decision date:** 2026-03-13 (team sync)  
**Attendees:** Tanya Birch, Devraj Anand, Jonas Harker, Nadia Solis, Marcus Webb

**Tanya's recommendation:** GO. All three failure modes found and fixed. The matrix revealed real edge cases — not theoretical ones. The fixes are solid. Troy's field test was the most valuable part of the matrix because it found OFX-003 through actual use, not scripted simulation.

**Jonas (infrastructure):** Confirmed the version token implementation is consistent across iOS and Android sync paths. No divergence remaining.

**Marcus (compliance):** Reviewed the ghost-signature scenario (OFX-001) specifically. Confirmed that the fix meets the same standard as online signatures — the write is atomic and audit-trail-persistent before any sync operation begins. No compliance gap.

**Nadia:** "Troy's per-item confirmation is now the feature. That's what offline mode should have looked like from the start."

**P6 Activation: GO, week of 2026-03-16.**

---

## Notes for P6 Rollout

1. Both shops (Skyline + High Desert) will be on updated builds before P6 activation week.
2. Tanya will run a Day 1 offline mode briefing for Bill's mechanics at High Desert — different hardware, same feature, but worth a walkthrough.
3. Troy Weaver will be available for mechanic-to-mechanic questions if Bill's team has concerns about the per-item confirmation flow.
4. Marcus will file a short compliance memo confirming offline signature audit trail integrity before P6 goes live.

**Status: MATRIX COMPLETE — P6 AUTHORIZED**
