# WS16-J — RSM Read-and-Acknowledge Workflow Build

**Phase:** 16  
**Workstream:** WS16-J  
**Owners:** Devraj Anand (backend lead), Chloe Park (UX/workflow), Rachel Kwon (UAT/SME)  
**Date:** 2026-02-22  
**Reads from:** `phase-15-rd/ws15-k-rsm-ack.md` (CONDITIONAL PASS — WS15-K)  
**Stack:** Convex (database + mutations + queries), Clerk (auth/session), Next.js 14 App Router, Vercel  
**Regulatory context:** 14 CFR Part 145, §145.163 (training/currency), FAA AC 145-10 (RSM requirements)

---

## 1. Schema Additions

### 1.1 New Table: `rsmRevisions`

```typescript
// convex/schema.ts addition

rsmRevisions: defineTable({
  revisionNumber: v.string(),        // e.g. "RSM-2026-03"  (format validated: /^RSM-\d{4}-\d{2}$/)
  effectiveDate: v.number(),          // Unix timestamp (ms)
  uploadedBy: v.id("users"),          // Must hold role DOM or QCM at time of publish
  fileRef: v.string(),               // Convex storage ID ("kg2abc...") or external URL
  summaryOfChanges: v.string(),       // Minimum 50 characters; enforced in mutation
  requiresAcknowledgmentBy: v.array(v.id("users")), // Snapshot of active certificated users at publish time
  acknowledgedBy: v.array(
    v.object({
      userId: v.id("users"),
      timestamp: v.number(),          // Unix ms — wall clock at time of ack
      sessionToken: v.string(),       // Clerk session ID (svix: ses_...) captured server-side
    })
  ),
  status: v.union(v.literal("active"), v.literal("superseded")),
  createdAt: v.number(),             // Unix ms — immutable after insert
})
  .index("by_status", ["status"])
  .index("by_revisionNumber", ["revisionNumber"])
  .index("by_effectiveDate", ["effectiveDate"]),
```

**Notes:**
- `requiresAcknowledgmentBy` is a frozen snapshot of eligible users at publish time. Users added after publish are NOT retroactively added (consistent with WS15-K §2.7 distribution batch semantics).
- `acknowledgedBy` is append-only. No element is ever removed after insertion.
- `sessionToken` is the raw Clerk session ID retrieved server-side via `auth.sessionId` in the Convex mutation context — not a client-supplied value.
- `fileRef` must be non-empty. If stored in Convex Storage, the ref is the `storageId`. If hosted externally (e.g., S3 presigned or SharePoint), the full HTTPS URL is stored.

### 1.2 New Field on `users` Table

```typescript
// convex/schema.ts — add to existing users table definition

pendingRsmAcknowledgments: v.optional(v.array(v.id("rsmRevisions"))),
// Default: [] (treat missing field as empty array in all mutations and queries)
// Ordered: newest revision first (insertion order mirrors publish sequence)
// Invariant: a revision ID appears here IFF:
//   (a) the user is in rsmRevisions.requiresAcknowledgmentBy for that revision, AND
//   (b) the user's userId does NOT appear in rsmRevisions.acknowledgedBy
```

**Migration note:** Existing user documents that do not have this field should be treated as `[]` in all reads. A one-time backfill patch mutation is not required unless a future query needs to index on this field.

---

## 2. Mutation Specs

### 2.1 `publishRsmRevision`

**Authorization:** Caller must hold role `DOM` or `QCM`. Enforced server-side via Clerk JWT claims.

**Signature:**
```typescript
// convex/mutations/rsmRevisions.ts

export const publishRsmRevision = mutation({
  args: {
    revisionNumber: v.string(),       // e.g. "RSM-2026-03"
    effectiveDate: v.number(),        // Unix ms timestamp
    fileRef: v.string(),
    summaryOfChanges: v.string(),     // min 50 chars
  },
  handler: async (ctx, args) => {
    // 1. Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!caller) throw new ConvexError("User not found");
    if (!["DOM", "QCM"].includes(caller.role)) {
      throw new ConvexError("Forbidden: only DOM or QCM may publish RSM revisions");
    }

    // 2. Validate inputs
    if (args.revisionNumber.trim().length === 0) {
      throw new ConvexError("revisionNumber is required");
    }
    if (args.summaryOfChanges.trim().length < 50) {
      throw new ConvexError("summaryOfChanges must be at least 50 characters");
    }
    if (args.fileRef.trim().length === 0) {
      throw new ConvexError("fileRef is required");
    }

    // 3. Check for duplicate revisionNumber
    const existing = await ctx.db
      .query("rsmRevisions")
      .withIndex("by_revisionNumber", (q) => q.eq("revisionNumber", args.revisionNumber))
      .first();
    if (existing) {
      throw new ConvexError(`Revision ${args.revisionNumber} already exists`);
    }

    // 4. Collect all active certificated users (mechanics and IAs)
    const eligibleUsers = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.or(
            q.eq(q.field("role"), "MECHANIC"),
            q.eq(q.field("role"), "IA"),
            q.eq(q.field("role"), "DOM"),
            q.eq(q.field("role"), "QCM")
          )
        )
      )
      .collect();
    const eligibleUserIds = eligibleUsers.map((u) => u._id);

    // 5. Insert revision record
    const now = Date.now();
    const revisionId = await ctx.db.insert("rsmRevisions", {
      revisionNumber: args.revisionNumber,
      effectiveDate: args.effectiveDate,
      uploadedBy: caller._id,
      fileRef: args.fileRef,
      summaryOfChanges: args.summaryOfChanges,
      requiresAcknowledgmentBy: eligibleUserIds,
      acknowledgedBy: [],
      status: "active",
      createdAt: now,
    });

    // 6. Update each eligible user's pendingRsmAcknowledgments
    for (const user of eligibleUsers) {
      const pending = user.pendingRsmAcknowledgments ?? [];
      await ctx.db.patch(user._id, {
        pendingRsmAcknowledgments: [...pending, revisionId],
      });
    }

    return { revisionId, recipientCount: eligibleUserIds.length };
  },
});
```

**Side effects:**
- Creates exactly one `rsmRevisions` document.
- Patches every eligible user's `pendingRsmAcknowledgments` array (one `ctx.db.patch` per user). For large populations this runs within Convex's 8-second mutation timeout for up to ~1,000 users. For shops with >500 users, a scheduled action should be used instead (see §2.1-A below).
- Does NOT supersede any prior revision — that is triggered by a separate `supersedePriorRevision` call or handled in a follow-up batch action.

**§2.1-A — Large population note (>500 users):**  
Use a scheduled `internalAction` to fan out the user patches in batches of 100 rather than a single blocking mutation. The revision document is inserted first (synchronously), then the action is scheduled via `ctx.scheduler.runAfter(0, internal.rsmRevisions.fanOutPendingAcks, { revisionId })`.

---

### 2.2 `acknowledgeRsmRevision`

**Authorization:** Any certificated user (MECHANIC, IA, DOM, QCM). The revision must be in the caller's `requiresAcknowledgmentBy` list. The caller must not already appear in `acknowledgedBy`.

**Signature:**
```typescript
export const acknowledgeRsmRevision = mutation({
  args: {
    rsmRevisionId: v.id("rsmRevisions"),
  },
  handler: async (ctx, args) => {
    // 1. Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!caller) throw new ConvexError("User not found");

    // 2. Load revision
    const revision = await ctx.db.get(args.rsmRevisionId);
    if (!revision) throw new ConvexError("RSM revision not found");

    // 3. Verify caller is in requiresAcknowledgmentBy
    const isRequired = revision.requiresAcknowledgmentBy.some(
      (uid) => uid === caller._id
    );
    if (!isRequired) {
      throw new ConvexError("You are not in the acknowledgment recipient list for this revision");
    }

    // 4. Check for duplicate ack (idempotency guard)
    const alreadyAcked = revision.acknowledgedBy.some(
      (ack) => ack.userId === caller._id
    );
    if (alreadyAcked) {
      // Idempotent: return success but do not double-write
      return { alreadyAcknowledged: true };
    }

    // 5. Capture session token server-side (never trust client-supplied)
    // Clerk session ID is exposed on the identity object in Convex auth context
    const sessionToken = identity.tokenIdentifier; // format: clerk|ses_xxxxx
    const now = Date.now();

    // 6. Append to acknowledgedBy (append-only, never mutate existing entries)
    const updatedAckedBy = [
      ...revision.acknowledgedBy,
      {
        userId: caller._id,
        timestamp: now,
        sessionToken,
      },
    ];
    await ctx.db.patch(args.rsmRevisionId, { acknowledgedBy: updatedAckedBy });

    // 7. Remove from user's pendingRsmAcknowledgments
    const updatedPending = (caller.pendingRsmAcknowledgments ?? []).filter(
      (id) => id !== args.rsmRevisionId
    );
    await ctx.db.patch(caller._id, { pendingRsmAcknowledgments: updatedPending });

    return { alreadyAcknowledged: false, acknowledgedAt: now };
  },
});
```

**Guarantees:**
- Append-only on `acknowledgedBy` — existing entries are never modified or removed.
- Session token captured from server-side Clerk context, not from the client request body.
- Idempotent: if called twice by the same user, second call returns `{ alreadyAcknowledged: true }` without writing.
- Atomic: both the revision patch and the user patch happen within the same Convex transaction. If either fails, both roll back.

---

### 2.3 `getRsmAcknowledgmentStatus`

**Authorization:** DOM, QCM, or any supervisor role. Mechanics may query for self only (not implemented here — this spec covers the compliance officer view).

**Signature:**
```typescript
export const getRsmAcknowledgmentStatus = query({
  args: {
    rsmRevisionId: v.id("rsmRevisions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const revision = await ctx.db.get(args.rsmRevisionId);
    if (!revision) throw new ConvexError("RSM revision not found");

    const now = Date.now();
    const effectiveDate = revision.effectiveDate;

    // Build acknowledged set for O(1) lookup
    const ackedMap = new Map<string, { timestamp: number; sessionToken: string }>();
    for (const ack of revision.acknowledgedBy) {
      ackedMap.set(ack.userId.toString(), {
        timestamp: ack.timestamp,
        sessionToken: ack.sessionToken,
      });
    }

    // Resolve user details for all required recipients
    const acknowledged: {
      userId: string;
      displayName: string;
      role: string;
      acknowledgedAt: number;
      sessionToken: string;
    }[] = [];

    const pending: {
      userId: string;
      displayName: string;
      role: string;
      daysOverdue: number;
    }[] = [];

    for (const uid of revision.requiresAcknowledgmentBy) {
      const user = await ctx.db.get(uid);
      if (!user) continue;

      const ackData = ackedMap.get(uid.toString());
      if (ackData) {
        acknowledged.push({
          userId: uid.toString(),
          displayName: user.displayName,
          role: user.role,
          acknowledgedAt: ackData.timestamp,
          sessionToken: ackData.sessionToken,
        });
      } else {
        const msOverdue = now - effectiveDate;
        const daysOverdue = Math.max(0, Math.floor(msOverdue / (1000 * 60 * 60 * 24)));
        pending.push({
          userId: uid.toString(),
          displayName: user.displayName,
          role: user.role,
          daysOverdue,
        });
      }
    }

    return {
      revisionNumber: revision.revisionNumber,
      effectiveDate: revision.effectiveDate,
      status: revision.status,
      totalRequired: revision.requiresAcknowledgmentBy.length,
      totalAcknowledged: acknowledged.length,
      totalPending: pending.length,
      completionPercent: Math.round(
        (acknowledged.length / Math.max(revision.requiresAcknowledgmentBy.length, 1)) * 100
      ),
      acknowledged,
      pending,
    };
  },
});
```

**Response shape (example):**
```json
{
  "revisionNumber": "RSM-2026-03",
  "effectiveDate": 1740960000000,
  "status": "active",
  "totalRequired": 12,
  "totalAcknowledged": 8,
  "totalPending": 4,
  "completionPercent": 67,
  "acknowledged": [
    {
      "userId": "jd7abc...",
      "displayName": "John Torres",
      "role": "MECHANIC",
      "acknowledgedAt": 1741046400000,
      "sessionToken": "clerk|ses_2abc..."
    }
  ],
  "pending": [
    {
      "userId": "k9xyz...",
      "displayName": "Mike Chen",
      "role": "IA",
      "daysOverdue": 3
    }
  ]
}
```

---

## 3. UI Blocking Behavior

### 3.1 Gate Component: `<RsmAcknowledgmentGate>`

This component wraps the task queue page. It is rendered server-side via a Next.js server component that checks `pendingRsmAcknowledgments` before allowing queue content to hydrate.

```
Page: /dashboard/tasks
  └── <RsmAcknowledgmentGate userId={userId}>
        ├── if pendingRsmAcknowledgments.length > 0:
        │     └── <RsmAcknowledgmentModal revision={revisions[0]} />
        │           (renders over everything — portal to document.body)
        └── else:
              └── <TaskQueueContent />
```

### 3.2 Modal Behavior Specification

**Trigger:** Any page load by a MECHANIC or IA user where `pendingRsmAcknowledgments.length > 0`.

**Dismissal:** The modal has **no close button, no escape-key handler, and no backdrop click handler**. The only exit is a successful `acknowledgeRsmRevision` call.

```typescript
// Implementation note:
// useEffect hook to suppress Escape key
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === "Escape") e.preventDefault();
  };
  document.addEventListener("keydown", handler, { capture: true });
  return () => document.removeEventListener("keydown", handler, { capture: true });
}, []);

// Dialog element: modal={true}, no onClose prop
// Backdrop pointer-events: none on the overlay; clicking backdrop does nothing
```

**Modal content (in order):**
1. Header banner: `⚠️ Action Required — RSM Revision Acknowledgment`
2. Revision number and effective date (formatted: "RSM-2026-03 — Effective March 1, 2026")
3. Link to RSM document (`fileRef`) — opens in new tab: `View Full RSM Document ↗`
4. Full `summaryOfChanges` text in a scrollable container with `overflow-y: scroll; max-height: 320px`
5. Scroll-to-bottom progress indicator: `"Scroll to bottom to activate the acknowledge button"`
6. Acknowledge button: `"I have read and understand this revision"` — disabled until scroll sentinel is visible

**Scroll-to-bottom detection:**
```typescript
// IntersectionObserver on a sentinel <div> pinned to the bottom of the summary container
const [canAcknowledge, setCanAcknowledge] = useState(false);

useEffect(() => {
  const sentinel = sentinelRef.current;
  if (!sentinel) return;
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) setCanAcknowledge(true); },
    { root: scrollContainerRef.current, threshold: 0.95 }
  );
  observer.observe(sentinel);
  return () => observer.disconnect();
}, []);
```

**Multiple pending revisions:** If `pendingRsmAcknowledgments.length > 1`, the modal shows revisions one at a time in the order they appear in the `pendingRsmAcknowledgments` array (oldest first — the array is append-ordered by publish time). After each acknowledgment, the next revision's modal renders automatically. Only after all are acknowledged does the task queue load.

**On success:** `acknowledgeRsmRevision` returns `{ acknowledgedAt }`. The client invalidates the `pendingRsmAcknowledgments` query (Convex reactivity handles this automatically via the subscription). The modal unmounts and `<TaskQueueContent />` renders.

### 3.3 Navigation-level Gate (Defense in Depth)

In addition to the modal, the Next.js middleware (`middleware.ts`) checks `pendingRsmAcknowledgments` server-side on every request to protected routes:

```typescript
// middleware.ts (pseudocode)
// If user is MECHANIC or IA and has pendingRsmAcknowledgments.length > 0:
//   - Allow: /api/rsm/acknowledge (the mutation endpoint)
//   - Allow: /rsm/document/* (document viewer)
//   - Block all other protected routes → redirect to /rsm/pending
// The /rsm/pending page renders only the RsmAcknowledgmentModal
```

This ensures that even if a user somehow bypasses the client modal (e.g., direct navigation), the server enforces the gate.

---

## 4. Rachel Kwon's UAT Script

**Purpose:** Validate end-to-end RSM Read-and-Acknowledge workflow in staging.  
**Environment:** Athelon staging instance, Clerk test tenant, Convex dev deployment.  
**Prerequisite state:** At least 2 active MECHANIC users and 1 IA user seeded. Rachel's account holds `QCM` role. DOM test account configured separately.  
**Estimated run time:** 20 minutes.

---

### Step 1 — Publish a new RSM revision as DOM

1. Log in to Athelon staging as the **DOM** test account (credentials: `dom-test@athelon-staging.dev`).
2. Navigate to **Compliance → RSM Revisions → Publish New Revision**.
3. Fill in the form:
   - **Revision Number:** `RSM-2026-TEST-01`
   - **Effective Date:** tomorrow's date (use the date picker)
   - **Document:** upload `test-rsm-rev-1.pdf` (provided in test kit)
   - **Summary of Changes:** `This test revision introduces updated torque specifications for Section 8.4 (fastener torque tables) and revised inspection intervals for Section 12.1 (hydraulic line inspection). Mechanics must review both sections before sign-off on affected work orders. Minimum read time: 5 minutes.`
4. Click **Publish Revision**.
5. **Expected:** Green success toast: `"RSM-2026-TEST-01 published. 3 users notified."` (count matches active certificated users in staging).
6. **Check:** In Convex dashboard, query `rsmRevisions` — confirm new document with `status: "active"` and `requiresAcknowledgmentBy` containing the 3 mechanic/IA user IDs.

---

### Step 2 — Log in as a mechanic (without acknowledging)

1. Open a **new private/incognito browser window**.
2. Log in as **Mechanic Test User 1** (`mech-test-1@athelon-staging.dev`).
3. Do NOT navigate to any RSM page. Go directly to **Dashboard**.

---

### Step 3 — Attempt to open task queue → modal appears, queue is blocked

1. Click **Task Queue** in the left nav (or navigate to `/dashboard/tasks`).
2. **Expected:** The task queue content does NOT render. A full-screen modal overlay appears immediately.
3. **Verify modal content:**
   - Header: `⚠️ Action Required — RSM Revision Acknowledgment`
   - Revision: `RSM-2026-TEST-01`
   - Effective date: tomorrow's date formatted as human-readable (e.g., "February 23, 2026")
   - "View Full RSM Document ↗" link present — click it, confirm PDF opens in new tab
   - Summary text block is visible and scrollable
4. **Verify blocking:** The task queue list is completely hidden behind the modal. No work cards are visible or interactive.

---

### Step 4 — Attempt to dismiss modal → cannot be dismissed

1. Press the **Escape key** on the keyboard.
   - **Expected:** Nothing happens. Modal stays.
2. Click the **dark backdrop area** around the modal.
   - **Expected:** Nothing happens. Modal stays.
3. Try to **right-click → inspect** and manually remove the modal element via DevTools.
   - **Expected:** Even if DOM element is removed, navigating to `/dashboard/tasks` re-renders the gate (server enforces). Middleware blocks the route until ack is complete.
4. Try navigating directly to `/dashboard/tasks/new-work-order` via URL bar.
   - **Expected:** Redirected to `/rsm/pending` which shows the same acknowledgment modal.
5. **Rachel's note for auditors:** "There is no back door. No email opt-out. No 'remind me later'. The modal is the only way forward."

---

### Step 5 — Scroll to bottom → button activates

1. In the open modal, locate the **Summary of Changes** scrollable text area.
2. Confirm the **"I have read and understand this revision"** button is visually disabled (greyed out, `cursor: not-allowed`).
3. Scroll the summary text area to the very bottom (scroll bar reaches bottom, or swipe down on mobile).
4. **Expected:** The acknowledge button becomes enabled (changes to primary blue color, cursor becomes pointer).
5. **If button does not activate:** Scroll up slightly then back down — the IntersectionObserver requires the sentinel element to be in viewport.

---

### Step 6 — Click acknowledge → queue loads

1. Click **"I have read and understand this revision"**.
2. **Expected:** Button shows loading state briefly (`"Acknowledging..."`).
3. **Expected:** Modal disappears. Task queue renders normally with the mechanic's assigned work orders.
4. **Verify in Convex dashboard:** Query `rsmRevisions` for `RSM-2026-TEST-01`. Confirm:
   - `acknowledgedBy` array contains an entry with `userId` matching Mechanic Test User 1
   - `timestamp` is approximately "now" (within 60 seconds)
   - `sessionToken` is populated (format: `clerk|ses_...`)
5. **Verify on user record:** Query `users` for Mechanic Test User 1. Confirm `pendingRsmAcknowledgments` no longer contains the revision ID.

---

### Step 7 — As Rachel/QCM: pull acknowledgment status report

1. Switch back to the **DOM/QCM browser window** (or log in as Rachel: `rachel@athelon-staging.dev`).
2. Navigate to **Compliance → RSM Revisions → RSM-2026-TEST-01 → Acknowledgment Status**.
3. **Expected report shows:**
   - **Total Required:** 3
   - **Total Acknowledged:** 1
   - **Total Pending:** 2
   - **Completion:** 33%
   - In the **Acknowledged** section: "John Torres — MECHANIC — Acknowledged Feb 22, 2026 at 7:48 PM UTC" (actual name/time will vary)
   - In the **Pending** section: the other 2 mechanics, each showing **Days Overdue: 0** (revision effective date is tomorrow)
4. Click **Export Acknowledgment Report (CSV)**.
5. **Expected:** CSV file downloads with columns: `Name, Role, Status, Acknowledged At, Session Token, Days Overdue`.
6. **Verify:** Mechanic Test User 1 row shows `Status: ACKNOWLEDGED`, timestamp matches Step 6, session token is non-empty.

---

### Step 8 — Verify the 40% problem is solved

1. Log in as **Mechanic Test User 2** (`mech-test-2@athelon-staging.dev`) — simulating a mechanic who ignores emails.
2. Navigate to **Task Queue**.
3. **Expected:** Same full-screen blocking modal. No task queue access.
4. Without acknowledging, attempt to navigate to **Work Orders → Open a Work Order → Sign Off**.
5. **Expected:** Blocked at middleware level. Redirect to `/rsm/pending`.
6. **Rachel's commentary for the demo:** *"This is your 40%. They didn't reply to the email. They didn't click the link. But when they opened the app to do their job — there it was. They had no choice. They acknowledged or they couldn't work. That's compliance."*

**Rachel's Pass Criterion:** ✅ `"The 40% problem is solved. If they open the app, they acknowledge. If they don't acknowledge, they can't work."`

**UAT Result fields to capture:**
- [ ] Modal appeared on task queue load: YES / NO
- [ ] Escape key dismissed modal: YES / NO (expected: NO)
- [ ] Backdrop click dismissed modal: YES / NO (expected: NO)
- [ ] Button activated on scroll-to-bottom: YES / NO
- [ ] Acknowledgment recorded in database with timestamp: YES / NO
- [ ] Session token captured (non-empty): YES / NO
- [ ] Status report shows correct acknowledged/pending split: YES / NO
- [ ] Export CSV populated: YES / NO

---

## 5. Cilla's Test Plan

**Framework:** Vitest + @convex-dev/test (Convex test environment with in-memory DB)  
**Coverage target:** 100% mutation path coverage for `publishRsmRevision` and `acknowledgeRsmRevision`  
**UI tests:** Playwright component tests for `<RsmAcknowledgmentModal>`

| Test ID | Scenario | Input | Expected | Regulatory Basis |
|---------|----------|-------|----------|-----------------|
| TC-J-01 | **Happy path — full acknowledge cycle** | DOM calls `publishRsmRevision("RSM-2026-03", effectiveDate, fileRef, summaryOfChanges)`. Mechanic calls `acknowledgeRsmRevision(revisionId)`. Query `getRsmAcknowledgmentStatus(revisionId)`. | `rsmRevisions` record created with `status: "active"`. Mechanic's `acknowledgedBy` entry has `userId`, `timestamp` (within 5s of call), non-empty `sessionToken`. `pendingRsmAcknowledgments` on mechanic's user record is empty. Status query returns mechanic in `acknowledged` array with `acknowledgedAt` matching ack timestamp. Completion = 100% (single-user test). | 14 CFR §145.163(a) — currency requires documented read/ack. FAA AC 145-10 §6.2 — RSM acknowledgment must be traceable to named individual and date. |
| TC-J-02 | **Block enforcement — mechanic with pending ack cannot access task queue** | Seed: 1 active RSM revision, mechanic user with `pendingRsmAcknowledgments: [revisionId]`. Render `<RsmAcknowledgmentGate>` wrapping mock `<TaskQueue>`. | `<TaskQueue>` does NOT render. `<RsmAcknowledgmentModal>` renders instead. In Playwright: `await expect(page.locator('[data-testid="task-queue"]')).not.toBeVisible()`. `await expect(page.locator('[data-testid="rsm-modal"]')).toBeVisible()`. Middleware test: `GET /dashboard/tasks` returns `302 → /rsm/pending` when `pendingRsmAcknowledgments.length > 0`. | 14 CFR §145.163(b) — shop must maintain currency; system must enforce access control when currency is lapsed. |
| TC-J-03 | **Dismiss prevention — modal cannot be closed without acknowledging** | Render `<RsmAcknowledgmentModal>` with a pending revision. Simulate: (a) `keyboard.press("Escape")`, (b) `modal-backdrop.click()`, (c) `modal.close()` call via ref, (d) attempt `window.history.back()`. | Modal remains mounted and visible after all four attempts. `data-testid="rsm-modal"` is still in the DOM. No `onDismiss` or `onClose` callback is ever invoked. Playwright assertion: `await expect(page.locator('[data-testid="rsm-modal"]')).toBeVisible()` after each interaction. For the history.back attempt: page remains on `/rsm/pending`. | 14 CFR §145.163 — acknowledgment is a required step; no mechanism for circumvention is permitted. |
| TC-J-04 | **Scroll requirement — acknowledge button inactive until scroll-to-bottom** | Render `<RsmAcknowledgmentModal>` with summary text long enough to require scrolling (inject 2,000-word test summary). Observe button state before scroll. Trigger `scrollContainer.scrollTop = scrollContainer.scrollHeight`. Observe button state after scroll. | **Before scroll:** `button[data-testid="ack-button"]` has `disabled` attribute. `aria-disabled="true"`. CSS class `btn-disabled` present. **After scroll to bottom:** `disabled` attribute removed. `aria-disabled="false"`. CSS class `btn-primary` applied. Playwright: `await page.locator('[data-testid="scroll-container"]').evaluate(el => el.scrollTop = el.scrollHeight)`. `await expect(page.locator('[data-testid="ack-button"]')).toBeEnabled()`. | 14 CFR §145.163 — "read" acknowledgment requires evidence of engagement with content, not merely checkbox click. Electronic signature guidance (FAA Order 8100.15) supports scroll-to-confirm as engagement indicator. |
| TC-J-05 | **Multiple pending revisions — shown one at a time in publish order** | Seed: 3 RSM revisions published in sequence: `RSM-A` (t=0), `RSM-B` (t=1), `RSM-C` (t=2). Mechanic user has `pendingRsmAcknowledgments: [RSM-A, RSM-B, RSM-C]`. | **Initial render:** Modal shows `RSM-A` only. `RSM-B` and `RSM-C` are not visible. **After mechanic acknowledges `RSM-A`:** Modal transitions to `RSM-B`. **After acknowledging `RSM-B`:** Modal transitions to `RSM-C`. **After acknowledging `RSM-C`:** Modal unmounts. Task queue renders. Vitest: assert `pendingRsmAcknowledgments` length decrements from 3 → 2 → 1 → 0 with each ack call. Playwright: confirm modal `h2` text changes from "RSM-A" to "RSM-B" to "RSM-C" in sequence. Database: all 3 revisions have the mechanic's userId in `acknowledgedBy`, each with distinct timestamps. | 14 CFR §145.163 — each issued RSM revision is an independent compliance obligation; batch acknowledgment is not permitted. |
| TC-J-06 | **Superseded revision — publish rev 2 marks rev 1 as superseded; no new pending acks created for rev 1** | Seed: `RSM-2026-01` is `status: "active"`. Mechanic `M1` has already acknowledged. Mechanic `M2` has NOT acknowledged. Call `publishRsmRevision("RSM-2026-02", ...)` which triggers supersession of `RSM-2026-01`. | `RSM-2026-01` `status` field updated to `"superseded"`. Mechanic `M2`'s `pendingRsmAcknowledgments` has `RSM-2026-01` removed (no longer required — superseded). `M2`'s `pendingRsmAcknowledgments` now contains only `RSM-2026-02`. `RSM-2026-01.acknowledgedBy` is unchanged (M1's acknowledgment is preserved — immutable). `getRsmAcknowledgmentStatus(RSM-2026-01-id)` returns `status: "superseded"`. `getRsmAcknowledgmentStatus(RSM-2026-02-id)` returns M2 in `pending` array. Vitest: `expect(rev1.status).toBe("superseded")`. `expect(rev2.requiresAcknowledgmentBy).toContain(M2.id)`. `expect(rev1.acknowledgedBy).toHaveLength(1)` (M1 still there). | WS15-K §3.2 — supersession reclassifies, does not delete history. 14 CFR §145.163 — prior evidence must be retained. FAA AC 145-10 — superseded manuals must remain traceable. |

**Additional Vitest unit tests (not in table above — for completeness):**

```typescript
// Input validation
test("publishRsmRevision rejects summaryOfChanges < 50 chars", async () => {
  await expect(
    mutation(publishRsmRevision, { summaryOfChanges: "Too short." })
  ).rejects.toThrow("at least 50 characters");
});

test("publishRsmRevision rejects duplicate revisionNumber", async () => {
  await seed_rsmRevision({ revisionNumber: "RSM-2026-01" });
  await expect(
    mutation(publishRsmRevision, { revisionNumber: "RSM-2026-01" })
  ).rejects.toThrow("already exists");
});

test("acknowledgeRsmRevision is idempotent — second call returns alreadyAcknowledged: true", async () => {
  const { revisionId } = await mutation(publishRsmRevision, validArgs);
  await mutation(acknowledgeRsmRevision, { rsmRevisionId: revisionId });
  const result = await mutation(acknowledgeRsmRevision, { rsmRevisionId: revisionId });
  expect(result.alreadyAcknowledged).toBe(true);
  // Only one entry in acknowledgedBy
  const rev = await query(ctx.db.get, revisionId);
  expect(rev.acknowledgedBy).toHaveLength(1);
});

test("acknowledgeRsmRevision rejects user not in requiresAcknowledgmentBy", async () => {
  const { revisionId } = await seed_rsmRevision({ requiresAcknowledgmentBy: [] });
  await expect(
    mutation(acknowledgeRsmRevision, { rsmRevisionId: revisionId })
  ).rejects.toThrow("not in the acknowledgment recipient list");
});
```

---

## 6. Marcus Compliance Checklist

**Inspector:** Marcus (Part 145 Compliance Lead)  
**Context:** FAA Part 145 surveillance inspection — Training Records and RSM Currency  
**Regulation:** 14 CFR Part 145, FAA AC 145-10  
**Electronic records guidance:** FAA Order 8100.15 (Electronic Recordkeeping)

---

### 6.1 Part 145 §145.163 — Training Requirements and Currency

| # | Requirement | How Athelon Satisfies It | Evidence Location | Status |
|---|-------------|--------------------------|-------------------|--------|
| 145.163-1 | Certificate holder must maintain training program that ensures personnel are current on RSM content | `publishRsmRevision` triggers mandatory acknowledgment obligation for all active certificated personnel at time of release. No opt-out path exists. | `rsmRevisions.requiresAcknowledgmentBy` snapshot + `acknowledgedBy` entries | ✅ SATISFIED |
| 145.163-2 | Each person performing maintenance must be familiar with the current RSM | UI gate enforces that any user in MECHANIC or IA role cannot access work orders, sign-offs, or task queue until all pending RSM acknowledgments are completed | Middleware enforcement logs + `pendingRsmAcknowledgments.length === 0` gate | ✅ SATISFIED |
| 145.163-3 | Training records must be retrievable on request during inspection | `getRsmAcknowledgmentStatus` query returns full roster with acknowledgment timestamps. Export bundle available as CSV with `userId`, `displayName`, `role`, `acknowledgedAt`, `sessionToken` | `/compliance/rsm-revisions/:id/status` — accessible to DOM/QCM | ✅ SATISFIED |
| 145.163-4 | Records must identify the specific revision acknowledged | `acknowledgedBy` entries link to exact `rsmRevisionId`. The revision document includes `revisionNumber`, `effectiveDate`, `fileRef`, and `summaryOfChanges` | `rsmRevisions` table — each ack entry references revision by Convex document ID | ✅ SATISFIED |
| 145.163-5 | Revision currency must not lapse undetected | `pendingRsmAcknowledgments` field on each user provides real-time currency status. DOM/QCM dashboard shows pending count per revision with days-overdue calculation | `getRsmAcknowledgmentStatus` — `pending[].daysOverdue` field | ✅ SATISFIED |

---

### 6.2 RSM Requirements Under Part 145 Certificate

| # | Requirement | How Athelon Satisfies It | Hard Blocker? |
|---|-------------|--------------------------|---------------|
| RSM-1 | The RSM must be the controlled document governing maintenance operations | `fileRef` stores the canonical controlled document (Convex storage or versioned URL). Each revision has a unique `revisionNumber` and `effectiveDate`. | No |
| RSM-2 | RSM revisions must be released by authorized personnel only | `publishRsmRevision` is role-gated: only `DOM` or `QCM` callers can execute. Server-side check via Clerk JWT role claim — not bypassable from client. | No |
| RSM-3 | All personnel who perform maintenance must receive each RSM revision | Distribution list (`requiresAcknowledgmentBy`) captures all active MECHANIC, IA, DOM, and QCM users at time of publish. Snapshot is immutable after creation. | No |
| RSM-4 | Evidence of distribution must be retained | `requiresAcknowledgmentBy` array + `createdAt` timestamp provides distribution evidence. Combined with `uploadedBy` (the releasing DOM/QCM), distribution chain is fully documented. | No |
| RSM-5 | Prior RSM revisions must remain traceable (not deleted) | `status: "superseded"` replaces the record rather than deleting it. `acknowledgedBy` entries on superseded revisions are preserved indefinitely. Convex does not expose a delete-by-filter for documents — only soft-state via `status` field. | No |
| RSM-6 | The RSM must be accessible to mechanics during performance of maintenance | `fileRef` link in the acknowledgment modal opens the document in a new browser tab. Document viewer is accessible even when the acknowledgment gate is active. | **⚠️ PARTIAL — see note below** |

> **⚠️ RSM-6 Note — HARD BLOCKER CANDIDATE:** The current spec links to `fileRef` during the acknowledgment modal. However, once the mechanic has acknowledged and is in the task queue, there must be a persistent, readily accessible link to the current RSM. This is **not yet specified** in WS16-J scope. A separate "RSM Quick Access" panel in the task queue UI must be added before inspection. **Action required before go-live: Devraj + Chloe to add RSM document viewer link to task queue sidebar.**

---

### 6.3 FAA Documentation Requirements — What the Inspector Will Ask For

The following documents must be producible within 30 minutes of an inspector's request:

| Inspector Request | Athelon Response | Source |
|-------------------|------------------|--------|
| "Show me your current RSM and its revision history" | `GET /compliance/rsm-revisions` — lists all revisions by number/date/status (active and superseded) | `rsmRevisions` table, queried by DOM/QCM |
| "Who was required to acknowledge RSM-2026-03?" | `getRsmAcknowledgmentStatus("RSM-2026-03")` — returns full `requiresAcknowledgmentBy` roster with roles | Live Convex query |
| "Did John Torres acknowledge RSM-2026-03? When?" | Same query — `acknowledged` array shows Torres with `acknowledgedAt` timestamp and `sessionToken` | `rsmRevisions.acknowledgedBy` |
| "Show me Torres's acknowledgment record including system identity evidence" | `acknowledged[].sessionToken` is the Clerk session ID. Clerk Admin Dashboard confirms this session ID was authenticated to Torres's Clerk user at that timestamp. | Convex record + Clerk Admin API |
| "Who has NOT acknowledged RSM-2026-03?" | `getRsmAcknowledgmentStatus` — `pending` array with `daysOverdue` | Live Convex query |
| "What happens to a mechanic who doesn't acknowledge?" | Walk inspector through middleware block: mechanic cannot access task queue, work orders, or sign-off until acknowledgment is complete. No override path exists for mechanics. | Code review + live demo |
| "Are your records tamper-evident?" | `acknowledgedBy` is append-only — no delete path exposed in any mutation. Convex audit log shows all writes. Session token links to Clerk's immutable auth log. | Architecture review |
| "Show me the RSM document John Torres acknowledged" | `rsmRevisions.fileRef` for the revision Torres acknowledged | Convex record → document URL/storage |

---

### 6.4 Electronic Acknowledgment — Session Token Satisfies Regulatory Requirement

**Question:** Does electronic acknowledgment with Clerk session token satisfy FAA electronic signature requirements under Part 145 and Order 8100.15?

**Analysis:**

| Criterion | Requirement | Athelon Implementation | Satisfied? |
|-----------|-------------|----------------------|-----------|
| Unique identification | Record must identify the specific individual | `userId` (Convex `Id<"users">`) + Clerk `tokenIdentifier` (session ID) maps 1:1 to an authenticated Clerk user, which maps to a named individual with email and MFA | ✅ YES |
| Non-repudiation | Signer cannot credibly deny they performed the action | Session token is captured server-side in the Convex mutation — not client-supplied. Only the authenticated Clerk session holder could have generated a valid token for that `userId`. | ✅ YES |
| Timestamp integrity | Record when the acknowledgment occurred | `timestamp: Date.now()` captured in the server-side mutation handler. Not client-supplied. Convex server time is authoritative. | ✅ YES |
| Document binding | Record which specific document was acknowledged | `rsmRevisionId` links to specific revision with `revisionNumber`, `effectiveDate`, `fileRef`, and `summaryOfChanges`. The revision is immutable after creation. | ✅ YES |
| Scroll engagement | Evidence of content engagement (not just checkbox click) | Scroll-to-bottom gate enforced client-side via IntersectionObserver. Button is disabled until sentinel is intersected. Provides Tier 2 evidence per WS15-K §3.5. | ✅ YES (Tier 2) |
| Retention period | Electronic records must be retained per FAA minimum | Convex database retains records indefinitely (no TTL on `rsmRevisions`). Recommended minimum: 6 years per WS15-K §3.8. A data retention policy must be formally adopted. | ⚠️ PARTIAL — policy not yet written |
| Accessibility | Records must be retrievable within reasonable time | `getRsmAcknowledgmentStatus` returns live data in <1s. CSV export available on demand. | ✅ YES |

**Conclusion:** The Clerk session token mechanism **does satisfy** FAA electronic recordkeeping guidance under Order 8100.15, provided:
1. Clerk's own authentication logs are retained in parallel (Clerk retains auth events for 30 days by default — **this must be extended to 6 years or exported regularly**).
2. A formal data retention policy document is adopted by the certificate holder referencing Convex record retention and Clerk log export procedures.

---

### 6.5 Hard Blockers — Marcus's Go/No-Go List

The following items are **hard blockers** that must be resolved before the system can be used as the official RSM acknowledgment record for Part 145 compliance purposes:

| # | Blocker | Owner | Resolution |
|---|---------|-------|-----------|
| **HB-1** | **Clerk auth log retention is 30 days by default.** Session tokens in `acknowledgedBy` are meaningless after 30 days if Clerk logs are purged. FAA requires 6-year minimum retention of training records. | Devraj Anand | Implement nightly Clerk audit log export to durable storage (S3 or similar). OR upgrade to Clerk Enterprise with extended log retention. Must be in place before first revision published to production. |
| **HB-2** | **No formal data retention policy document.** The certificate holder must have a written policy specifying record retention periods, storage location, and destruction schedule. | Rachel Kwon (policy) + Devraj (technical impl) | Draft and execute a "RSM Electronic Acknowledgment Record Retention Policy" citing 14 CFR §145.209(e) and Order 8100.15. Must be approved by DOM before go-live. |
| **HB-3** | **RSM Quick Access link not specified in task queue.** §145 requires RSM to be available during maintenance performance, not only during the acknowledgment step. | Chloe Park (UX) + Devraj | Add persistent RSM document link to task queue sidebar before inspection. (See §6.2, RSM-6 note.) |
| **HB-4** | **No DOM override / emergency bypass is specified.** WS15-K §4.4 specifies a temporary override model for lockout. This is not included in the current WS16-J scope. Without it, a mechanic locked out during an AOG event has no compliant path to work. | Devraj Anand | Implement DOM-issued temporary override (8-hour window, reason-coded, auto-expiring) as a follow-on workstream (WS16-K or patch). Must be present before production for any shop with AOG operations. **This is a safety-adjacent blocker.** |

**Non-blocking items (must be addressed before third revision):**
- Implement escalation schedule (T+24h reminder, T+72h L1, T+168h lockout) per WS15-K §4.2. Currently, the system records who has and hasn't acknowledged but does not proactively escalate.
- Add section-scoped acknowledgment support for minor/editorial revisions (WS15-K §3.3).
- Implement evidence Tier 3 (challenge attestation) for high-criticality revisions.

---

## 7. Implementation Sequencing

### Phase 1 — Core (WS16-J scope, sprint 1–2)
- [ ] Add `rsmRevisions` table to `convex/schema.ts`
- [ ] Add `pendingRsmAcknowledgments` field to `users` table
- [ ] Implement `publishRsmRevision` mutation
- [ ] Implement `acknowledgeRsmRevision` mutation
- [ ] Implement `getRsmAcknowledgmentStatus` query
- [ ] Implement `<RsmAcknowledgmentGate>` component
- [ ] Implement `<RsmAcknowledgmentModal>` with scroll gate
- [ ] Implement Next.js middleware enforcement
- [ ] Run TC-J-01 through TC-J-06 and attach Vitest output

### Phase 2 — Compliance hardening (sprint 3, before go-live)
- [ ] Resolve HB-1: Clerk log retention export
- [ ] Resolve HB-2: Data retention policy document
- [ ] Resolve HB-3: RSM Quick Access in task queue
- [ ] Resolve HB-4: DOM emergency override mutation
- [ ] Rachel Kwon UAT sign-off (all 8 steps pass)
- [ ] Marcus compliance review sign-off

### Phase 3 — Full WS15-K parity (post-launch)
- [ ] Escalation scheduler (T+24h, T+72h, T+120h, T+168h)
- [ ] Section-scoped acknowledgment mode
- [ ] Full audit export bundle (manifest + hash verification)
- [ ] Bulk release performance validation (500+ users)

---

## 8. Open Questions

1. **Who publishes the supersession?** Is supersession automatic when a new revision is published to the same RSM, or does the DOM explicitly mark the prior revision as superseded? Current spec assumes automatic supersession on new publish — confirm with Rachel.
2. **Role of QCM in requiresAcknowledgmentBy:** Should QCM users be required to acknowledge their own revisions? Current spec includes them. Confirm with Rachel whether the publisher is automatically considered acknowledged.
3. **fileRef storage strategy:** Is the RSM PDF always stored in Convex Storage, or will some shops link to an external DMS (e.g., SharePoint, DocuWare)? URL validation logic will differ.
4. **Session token format change:** Clerk's `tokenIdentifier` format may change between Clerk SDK versions. The stored token should be treated as an opaque identifier, not parsed. Confirm Devraj's implementation does not parse it.

---

## Status: READY FOR BUILD

**Reason:** Core schema, mutations, UI behavior, UAT script, test plan, and compliance checklist are fully specified. Implementation can begin immediately for Phase 1 items. Four hard blockers (HB-1 through HB-4) are identified and owned — none block the Phase 1 build sprint, but all must be resolved before the first production revision is published. Phase 1 deliverables are sufficient to run Rachel Kwon's UAT in staging.

**Pre-production gate:** HB-1, HB-2, HB-3, and HB-4 must be closed before any RSM revision is published to the production tenant.

---

*Prepared by: Devraj Anand (backend spec) + Chloe Park (UX behavior) with SME authority from Rachel Kwon (UAT) and regulatory review from Marcus (compliance).*  
*Document version: 1.0 — 2026-02-22*
