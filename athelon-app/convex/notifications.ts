// convex/notifications.ts
// Athelon — In-App Notification System (Phase 6)

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPER: Create a notification (called from other mutations)
// ─────────────────────────────────────────────────────────────────────────────

export async function createNotificationHelper(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    recipientUserId: string;
    type: "wo_status_change" | "quote_approved" | "quote_declined" | "invoice_overdue" | "invoice_paid" | "discrepancy_critical" | "part_received" | "task_completed" | "rts_ready" | "assignment" | "system";
    title: string;
    message: string;
    linkTo?: string;
  },
): Promise<void> {
  // Check preferences — skip if user disabled this type
  const prefs = await ctx.db
    .query("notificationPreferences")
    .withIndex("by_user", (q) => q.eq("userId", args.recipientUserId))
    .first();
  if (prefs && prefs.disabledTypes.includes(args.type)) {
    return;
  }

  await ctx.db.insert("notifications", {
    organizationId: args.organizationId,
    recipientUserId: args.recipientUserId,
    type: args.type,
    title: args.title,
    message: args.message,
    linkTo: args.linkTo,
    read: false,
    createdAt: Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL MUTATION: createNotification (callable via internal.notifications.create)
// ─────────────────────────────────────────────────────────────────────────────

export const create = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    recipientUserId: v.string(),
    type: v.union(
      v.literal("wo_status_change"),
      v.literal("quote_approved"),
      v.literal("quote_declined"),
      v.literal("invoice_overdue"),
      v.literal("invoice_paid"),
      v.literal("discrepancy_critical"),
      v.literal("part_received"),
      v.literal("task_completed"),
      v.literal("rts_ready"),
      v.literal("assignment"),
      v.literal("system"),
    ),
    title: v.string(),
    message: v.string(),
    linkTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await createNotificationHelper(ctx, args);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listMyNotifications — paginated, newest first
// ─────────────────────────────────────────────────────────────────────────────

export const listMyNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;
    const limit = args.limit ?? 20;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientUserId", userId))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: countUnread
// ─────────────────────────────────────────────────────────────────────────────

export const countUnread = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const userId = identity.subject;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientUserId", userId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    return notifications.length;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: markAsRead
// ─────────────────────────────────────────────────────────────────────────────

export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return;
    if (notification.recipientUserId !== identity.subject) return;

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: markAllRead
// ─────────────────────────────────────────────────────────────────────────────

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");
    const userId = identity.subject;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientUserId", userId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: deleteOldNotifications — cleanup > 30 days
// ─────────────────────────────────────────────────────────────────────────────

export const deleteOldNotifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    // Scan all notifications and delete old ones
    const old = await ctx.db
      .query("notifications")
      .filter((q) => q.lt(q.field("createdAt"), thirtyDaysAgo))
      .take(500);

    for (const n of old) {
      await ctx.db.delete(n._id);
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY/MUTATION: Notification Preferences
// ─────────────────────────────────────────────────────────────────────────────

export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const updatePreferences = mutation({
  args: {
    organizationId: v.id("organizations"),
    disabledTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");
    const userId = identity.subject;

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        disabledTypes: args.disabledTypes,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("notificationPreferences", {
        userId,
        organizationId: args.organizationId,
        disabledTypes: args.disabledTypes,
        updatedAt: Date.now(),
      });
    }
  },
});
