# WS17-J — RSM Read-and-Acknowledge Workflow Implementation

**Phase:** 17 — Sprint Execution  
**Workstream:** WS17-J  
**Team:** Devraj Anand (lead) + Chloe Park (UX/workflow)  
**Source Spec:** `phase-16-build/ws16-j-rsm-build.md`  
**Sprint Date:** 2026-02-22  
**Status:** CONDITIONAL

---

## 1. Implementation Summary

### What Was Built

Phase 1 (Core) RSM Read-and-Acknowledge workflow in full:

- **`rsmRevisions` Convex table** — with all schema fields including `requiresAcknowledgmentBy` snapshot, `acknowledgedBy` append-only array, `sessionToken` captured server-side
- **`pendingRsmAcknowledgments` field on `users` table**
- **`publishRsmRevision` mutation** — role-gated, duplicate-number rejection, eligible-user snapshot, per-user pending-ack fan-out
- **`acknowledgeRsmRevision` mutation** — idempotent, append-only, session-token from Convex auth context, atomic dual-patch
- **`getRsmAcknowledgmentStatus` query** — full roster with days-overdue computation
- **`<RsmAcknowledgmentGate>` Next.js server component** — wraps task queue page
- **`<RsmAcknowledgmentModal>` React component** — no-dismiss, scroll-to-bottom gate, IntersectionObserver activation
- **Next.js middleware enforcement** — blocks all protected routes until all pending acks complete
- **Supersession logic** — `publishRsmRevision` supersedes prior active revision and cleans up pending acks for non-acknowledged users

Phase 2 (Compliance hardening) items tracked as follow-on. Four hard blockers (HB-1 through HB-4) from WS16-J §6.5 remain outstanding — this is why the sprint status is CONDITIONAL. See §5 for details.

### Key Decisions

1. **`sessionToken` is `identity.tokenIdentifier` from Convex auth context.** This is the Clerk-issued token identifier for the session. It is fetched from `ctx.auth.getUserIdentity()` server-side — not from any client request parameter. A client cannot supply a forged session token.

2. **`requiresAcknowledgmentBy` is a frozen snapshot.** The list of required users is computed at publish time and never updated retroactively. This matches the WS16-J §1.1 spec and the FAA requirement that the distribution list be fixed at time of issue.

3. **Scroll-to-bottom uses IntersectionObserver with `threshold: 0.95`.** This requires the sentinel `<div>` at the bottom of the summary container to be 95% visible. The threshold of 0.95 (not 1.0) handles sub-pixel rendering differences across devices that can prevent 100% intersection from ever firing.

4. **Supersession is automatic on new publish.** When `publishRsmRevision` is called, the previous active revision (if any) is patched to `status: "superseded"`. Users who had not yet acknowledged the superseded revision have it removed from their `pendingRsmAcknowledgments`. The acknowledgment history of users who did acknowledge the superseded revision is preserved — those records are immutable.

5. **Large population fan-out (> 500 users) uses scheduled action.** The `publishRsmRevision` mutation inserts the revision synchronously and then schedules `internal.rsmRevisions.fanOutPendingAcks` via `ctx.scheduler.runAfter(0, ...)` for user patches. This prevents mutation timeout for large shops.

### Spec Deviations

None in Phase 1 scope. Hard blockers HB-1 through HB-4 (Clerk log retention, data retention policy, RSM quick-access link, DOM emergency override) are Phase 2 items acknowledged at spec time — they do not constitute deviations from the agreed Phase 1 scope.

---

## 2. Code — TypeScript + Convex

### 2.1 Schema Additions

```typescript
// convex/schema.ts additions

rsmRevisions: defineTable({
  revisionNumber: v.string(),
  effectiveDate: v.number(),
  uploadedBy: v.id("users"),
  fileRef: v.string(),
  summaryOfChanges: v.string(),
  requiresAcknowledgmentBy: v.array(v.id("users")),
  acknowledgedBy: v.array(
    v.object({
      userId: v.id("users"),
      timestamp: v.number(),
      sessionToken: v.string(),
    })
  ),
  status: v.union(v.literal("active"), v.literal("superseded")),
  createdAt: v.number(),
})
  .index("by_status", ["status"])
  .index("by_revisionNumber", ["revisionNumber"])
  .index("by_effectiveDate", ["effectiveDate"]),

// users table extension (existing table; add field)
// pendingRsmAcknowledgments: v.optional(v.array(v.id("rsmRevisions")))
// Treat missing field as [] in all reads.
```

### 2.2 `publishRsmRevision` Mutation

```typescript
// convex/mutations/rsmRevisions.ts
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const publishRsmRevision = mutation({
  args: {
    revisionNumber: v.string(),
    effectiveDate: v.number(),
    fileRef: v.string(),
    summaryOfChanges: v.string(),
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

    // 2. Input validation
    if (args.revisionNumber.trim().length === 0) throw new ConvexError("revisionNumber is required");
    if (args.summaryOfChanges.trim().length < 50) {
      throw new ConvexError("summaryOfChanges must be at least 50 characters");
    }
    if (args.fileRef.trim().length === 0) throw new ConvexError("fileRef is required");

    // 3. Duplicate check
    const existing = await ctx.db
      .query("rsmRevisions")
      .withIndex("by_revisionNumber", (q) => q.eq("revisionNumber", args.revisionNumber))
      .first();
    if (existing) throw new ConvexError(`Revision ${args.revisionNumber} already exists`);

    // 4. Supersede prior active revision
    const priorActive = await ctx.db
      .query("rsmRevisions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();

    if (priorActive) {
      await ctx.db.patch(priorActive._id, { status: "superseded" });
      // Remove superseded revision from pending acks of users who hadn't acked yet
      const notYetAcked = priorActive.requiresAcknowledgmentBy.filter(
        (uid) => !priorActive.acknowledgedBy.some((a) => a.userId === uid)
      );
      for (const uid of notYetAcked) {
        const user = await ctx.db.get(uid);
        if (!user) continue;
        const updatedPending = (user.pendingRsmAcknowledgments ?? []).filter(
          (id) => id !== priorActive._id
        );
        await ctx.db.patch(uid, { pendingRsmAcknowledgments: updatedPending });
      }
    }

    // 5. Collect eligible users
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

    // 6. Insert revision
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

    // 7. Fan out pending acks
    if (eligibleUsers.length <= 500) {
      // Inline for small shops
      for (const user of eligibleUsers) {
        const pending = user.pendingRsmAcknowledgments ?? [];
        await ctx.db.patch(user._id, {
          pendingRsmAcknowledgments: [...pending, revisionId],
        });
      }
    } else {
      // Schedule fan-out for large shops
      await ctx.scheduler.runAfter(0, internal.rsmRevisions.fanOutPendingAcks, { revisionId });
    }

    return { revisionId, recipientCount: eligibleUserIds.length };
  },
});
```

### 2.3 `acknowledgeRsmRevision` Mutation

```typescript
export const acknowledgeRsmRevision = mutation({
  args: {
    rsmRevisionId: v.id("rsmRevisions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!caller) throw new ConvexError("User not found");

    const revision = await ctx.db.get(args.rsmRevisionId);
    if (!revision) throw new ConvexError("RSM revision not found");

    const isRequired = revision.requiresAcknowledgmentBy.some((uid) => uid === caller._id);
    if (!isRequired) {
      throw new ConvexError("You are not in the acknowledgment recipient list for this revision");
    }

    // Idempotency guard
    const alreadyAcked = revision.acknowledgedBy.some((ack) => ack.userId === caller._id);
    if (alreadyAcked) {
      return { alreadyAcknowledged: true };
    }

    // Session token from server-side Convex auth — never client-supplied
    const sessionToken = identity.tokenIdentifier;
    const now = Date.now();

    // Atomic: append to acknowledgedBy + remove from user's pending list
    await ctx.db.patch(args.rsmRevisionId, {
      acknowledgedBy: [
        ...revision.acknowledgedBy,
        { userId: caller._id, timestamp: now, sessionToken },
      ],
    });

    const updatedPending = (caller.pendingRsmAcknowledgments ?? []).filter(
      (id) => id !== args.rsmRevisionId
    );
    await ctx.db.patch(caller._id, { pendingRsmAcknowledgments: updatedPending });

    return { alreadyAcknowledged: false, acknowledgedAt: now };
  },
});
```

### 2.4 `getRsmAcknowledgmentStatus` Query

```typescript
export const getRsmAcknowledgmentStatus = query({
  args: { rsmRevisionId: v.id("rsmRevisions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const revision = await ctx.db.get(args.rsmRevisionId);
    if (!revision) throw new ConvexError("RSM revision not found");

    const now = Date.now();
    const ackedMap = new Map(revision.acknowledgedBy.map((a) => [a.userId.toString(), a]));

    const acknowledged: {
      userId: string; displayName: string; role: string;
      acknowledgedAt: number; sessionToken: string;
    }[] = [];

    const pending: {
      userId: string; displayName: string; role: string; daysOverdue: number;
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
        const msOverdue = now - revision.effectiveDate;
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

### 2.5 `<RsmAcknowledgmentModal>` Component

```typescript
// web/components/rsm/RsmAcknowledgmentModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface RsmRevisionSummary {
  _id: Id<"rsmRevisions">;
  revisionNumber: string;
  effectiveDate: number;
  fileRef: string;
  summaryOfChanges: string;
}

interface Props {
  revision: RsmRevisionSummary;
  onAcknowledged: () => void;
}

export function RsmAcknowledgmentModal({ revision, onAcknowledged }: Props) {
  const acknowledgeRevision = useMutation(api.rsmRevisions.acknowledgeRsmRevision);
  const [canAcknowledge, setCanAcknowledge] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Block Escape key — modal is non-dismissible
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, []);

  // Scroll-to-bottom detection via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCanAcknowledge(true);
      },
      { root: container, threshold: 0.95 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    try {
      await acknowledgeRevision({ rsmRevisionId: revision._id });
      onAcknowledged();
    } catch (err) {
      console.error("Acknowledgment failed:", err);
      setIsSubmitting(false);
    }
  };

  const formattedDate = new Date(revision.effectiveDate).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    // No onClick on backdrop — intentionally non-interactive
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      data-testid="rsm-modal"
      aria-modal="true"
      aria-labelledby="rsm-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="rounded-t-xl bg-amber-50 border-b border-amber-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">⚠️</span>
            <h2 id="rsm-modal-title" className="font-bold text-gray-900">
              Action Required — RSM Revision Acknowledgment
            </h2>
          </div>
          <p className="text-sm text-gray-700 mt-1">
            <span className="font-semibold">{revision.revisionNumber}</span> — Effective {formattedDate}
          </p>
        </div>

        {/* Document link */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <a
            href={revision.fileRef}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            View Full RSM Document ↗
          </a>
        </div>

        {/* Scrollable summary */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-scroll px-6 py-4 text-sm leading-relaxed text-gray-700 min-h-0"
          data-testid="scroll-container"
        >
          <p className="font-semibold text-gray-900 mb-2">Summary of Changes</p>
          <div className="whitespace-pre-wrap">{revision.summaryOfChanges}</div>
          <div ref={sentinelRef} className="h-2 mt-4" aria-hidden="true" />
        </div>

        {/* Scroll prompt */}
        {!canAcknowledge && (
          <div className="px-6 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
            Scroll to bottom to activate the acknowledge button
          </div>
        )}

        {/* Acknowledge button */}
        <div className="px-6 py-4 border-t">
          <button
            onClick={handleAcknowledge}
            disabled={!canAcknowledge || isSubmitting}
            className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
              canAcknowledge && !isSubmitting
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            aria-disabled={!canAcknowledge || isSubmitting}
            data-testid="ack-button"
          >
            {isSubmitting ? "Acknowledging…" : "I have read and understand this revision"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2.6 `<RsmAcknowledgmentGate>` Server Component

```typescript
// web/components/rsm/RsmAcknowledgmentGate.tsx
// Next.js Server Component
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { RsmAcknowledgmentModalClient } from "./RsmAcknowledgmentModalClient";
import type { ReactNode } from "react";

interface Props {
  userId: string;
  children: ReactNode;
}

export async function RsmAcknowledgmentGate({ userId, children }: Props) {
  const user = await fetchQuery(api.users.getUserById, { userId });

  const pendingRevisionIds = user?.pendingRsmAcknowledgments ?? [];

  if (pendingRevisionIds.length === 0) {
    return <>{children}</>;
  }

  // Load pending revision details (first in queue)
  const pendingRevisions = await Promise.all(
    pendingRevisionIds.map((id: any) =>
      fetchQuery(api.rsmRevisions.getRsmRevisionById, { revisionId: id })
    )
  );

  return (
    <div data-testid="rsm-gate-active">
      {/* Children are rendered but hidden — gate modal is on top */}
      <div aria-hidden="true" className="invisible">{children}</div>
      <RsmAcknowledgmentModalClient revisions={pendingRevisions} />
    </div>
  );
}
```

```typescript
// web/components/rsm/RsmAcknowledgmentModalClient.tsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RsmAcknowledgmentModal } from "./RsmAcknowledgmentModal";

interface Props {
  revisions: any[];
}

export function RsmAcknowledgmentModalClient({ revisions }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  const handleAcknowledged = () => {
    if (currentIndex < revisions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All acknowledged — refresh to load unblocked content
      router.refresh();
    }
  };

  if (currentIndex >= revisions.length) return null;

  return (
    <RsmAcknowledgmentModal
      revision={revisions[currentIndex]}
      onAcknowledged={handleAcknowledged}
    />
  );
}
```

### 2.7 Next.js Middleware Enforcement

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "./convex/_generated/api";
import { getAuth } from "@clerk/nextjs/server";

const PROTECTED_ROUTES = ["/dashboard", "/work-orders", "/task-cards", "/engines"];
const ALLOWED_DURING_PENDING = ["/rsm", "/api/rsm"];

export async function middleware(request: NextRequest) {
  const { userId } = getAuth(request);
  if (!userId) return NextResponse.next();

  const isProtected = PROTECTED_ROUTES.some((r) =>
    request.nextUrl.pathname.startsWith(r)
  );
  if (!isProtected) return NextResponse.next();

  const isAllowed = ALLOWED_DURING_PENDING.some((r) =>
    request.nextUrl.pathname.startsWith(r)
  );
  if (isAllowed) return NextResponse.next();

  try {
    const user = await fetchQuery(api.users.getUserByClerkId, { clerkId: userId });
    const hasPending = (user?.pendingRsmAcknowledgments?.length ?? 0) > 0;

    if (hasPending) {
      return NextResponse.redirect(new URL("/rsm/pending", request.url));
    }
  } catch {
    // If query fails, allow through — don't lock users out on error
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/clerk).*)"],
};
```

---

## 3. Test Results (Cilla's Matrix Executed)

| Test ID | Scenario | Result | Notes |
|---|---|---|---|
| TC-J-01 | Happy path — full acknowledge cycle | **PASS** | `rsmRevisions` record created with `status: "active"`. Mechanic's `acknowledgedBy` entry has `userId`, `timestamp` within 2s of call, non-empty `sessionToken`. Mechanic's `pendingRsmAcknowledgments` is empty post-ack. Status query returns mechanic in `acknowledged` array with correct timestamp. Completion = 100% (single-user test) |
| TC-J-02 | Block enforcement — mechanic with pending ack cannot access task queue | **PASS** | `<RsmAcknowledgmentGate>` renders modal; `<TaskQueue>` not visible. Middleware test: `GET /dashboard/tasks` returns 302 → `/rsm/pending` when `pendingRsmAcknowledgments.length > 0` |
| TC-J-03 | Dismiss prevention — Escape, backdrop click, history.back | **PASS** | Escape key prevented via capture listener. Backdrop click no-ops (no onClick handler). `window.history.back()` → middleware redirects back to `/rsm/pending`. Modal remains mounted after all 4 attempts |
| TC-J-04 | Scroll requirement — button inactive until scroll-to-bottom | **PASS** | 2,000-word test summary injected. **Before scroll:** `ack-button` has `disabled` attr, `aria-disabled="true"`. **After `scrollTop = scrollHeight`:** disabled removed, primary blue class applied. Playwright: `page.locator('[data-testid="scroll-container"]').evaluate(el => el.scrollTop = el.scrollHeight)` then `expect(page.locator('[data-testid="ack-button"]')).toBeEnabled()` passes |
| TC-J-05 | Multiple pending revisions — shown one at a time in publish order | **PASS** | 3 revisions seeded in order A→B→C. Modal shows A first. After ack A: B. After ack B: C. After ack C: modal unmounts, task queue renders. `pendingRsmAcknowledgments` length: 3→2→1→0. Modal `h2` text changes in sequence (Playwright) |
| TC-J-06 | Superseded revision — publish rev 2 marks rev 1 superseded; M2's pending cleaned up | **PASS** | Rev 1 `status: "superseded"`. M2's `pendingRsmAcknowledgments` no longer contains rev 1 ID. M2's pending contains rev 2 ID. Rev 1's `acknowledgedBy` unchanged (M1's ack preserved). `getRsmAcknowledgmentStatus(rev1)` returns `status: "superseded"` |

**Additional unit tests:**

| Scenario | Result | Notes |
|---|---|---|
| `publishRsmRevision` rejects summaryOfChanges < 50 chars | **PASS** | Throws "at least 50 characters" |
| `publishRsmRevision` rejects duplicate revisionNumber | **PASS** | Throws "already exists" |
| `acknowledgeRsmRevision` idempotent — second call returns alreadyAcknowledged: true | **PASS** | Second call: `{ alreadyAcknowledged: true }`; `acknowledgedBy` has length 1 |
| `acknowledgeRsmRevision` rejects user not in requiresAcknowledgmentBy | **PASS** | Throws "not in the acknowledgment recipient list" |

**Overall: 6/6 primary + 4/4 unit tests = 10/10 PASS**

---

## 4. SME Acceptance Note

**Rachel Kwon — UAT/SME:**

> "I ran every step of the UAT script. The modal appeared on Day-3 task queue access — no hunts, no menus. Escape key did nothing. Clicking the backdrop did nothing. The Convex dashboard showed the acknowledgment with session token after I clicked the button. The status report showed the correct 33% completion after one of three users acknowledged. The CSV export downloaded and was populated. But I want to be clear about the hard blockers: HB-1 (Clerk log retention), HB-2 (written retention policy), HB-3 (RSM quick access in task queue), and HB-4 (DOM emergency override) are real. I cannot accept this as production-ready for compliance purposes until those four items are resolved. The core mechanism works exactly as I asked. The compliance packaging is incomplete. CONDITIONAL acceptance — Phase 1 UX confirmed, Phase 2 blockers must be closed before first production revision is published."

---

## 5. Sprint Status

**CONDITIONAL**

Phase 1 (core) implementation is complete and all 10 test cases pass. Rachel Kwon has confirmed the core mechanism functions as designed.

**Outstanding items before production use:**

| Blocker | Owner | Target |
|---|---|---|
| HB-1: Clerk auth log retention (30 days → 6 years) | Devraj Anand | Phase 17 Week 3 |
| HB-2: Written data retention policy document | Rachel Kwon (policy) + Devraj (technical) | Phase 17 Week 3 |
| HB-3: RSM Quick Access persistent link in task queue sidebar | Chloe Park | Phase 17 Week 2 |
| HB-4: DOM emergency override mutation (8-hour window, reason-coded) | Devraj Anand | Phase 17 Week 3 |

HB-3 is the lowest-complexity item and will be delivered by Chloe in Phase 17 Week 2. HB-1, HB-2, and HB-4 are scheduled for Phase 17 Week 3. The sprint is marked CONDITIONAL pending closure of these items. No production RSM revision will be published until all four are resolved.

**Note on open questions from WS16-J §8:**
1. Supersession is automatic on new publish — confirmed in this implementation.
2. QCM publisher is included in `requiresAcknowledgmentBy` — they must acknowledge their own revision. This mirrors the compliance requirement that all certificated personnel read each revision.
3. External `fileRef` (SharePoint/S3 URLs) supported — `fileRef` accepts any HTTPS URL.
4. `sessionToken` stored as opaque string — not parsed. Confirmed with Devraj.
