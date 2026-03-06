import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  assertValidDirectiveLifecycleTransition,
  type DirectiveLifecycleState,
} from "./dueEngine";

/**
 * Append-only compliance ledger utilities (C1.1).
 *
 * Invariant:
 * - rows in complianceLedgerEvents are immutable; mutations only INSERT events.
 * - current state should be derived from the latest event during replay when needed.
 */

export const appendComplianceLedgerEvent = mutation({
  args: {
    organizationId: v.id("organizations"),
    aggregateType: v.union(
      v.literal("ad_compliance"),
      v.literal("task_compliance"),
      v.literal("directive_lifecycle"),
      v.literal("counter_reconciliation"),
    ),
    aggregateId: v.string(),
    eventType: v.string(),
    previousState: v.optional(v.string()), // JSON encoded to keep schema additive/flexible.
    nextState: v.optional(v.string()), // JSON encoded snapshot.
    dueDate: v.optional(v.number()),
    dueHours: v.optional(v.number()),
    dueCycles: v.optional(v.number()),
    source: v.union(
      v.literal("system"),
      v.literal("user"),
      v.literal("integration"),
      v.literal("reconciliation"),
    ),
    entityTable: v.optional(v.string()),
    entityId: v.optional(v.string()),
    actorUserId: v.optional(v.string()),
    occurredAt: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"complianceLedgerEvents">> => {
    return await ctx.db.insert("complianceLedgerEvents", {
      organizationId: args.organizationId,
      aggregateType: args.aggregateType,
      aggregateId: args.aggregateId,
      eventType: args.eventType,
      previousState: args.previousState,
      nextState: args.nextState,
      dueDate: args.dueDate,
      dueHours: args.dueHours,
      dueCycles: args.dueCycles,
      source: args.source,
      entityTable: args.entityTable,
      entityId: args.entityId,
      actorUserId: args.actorUserId,
      occurredAt: args.occurredAt,
      createdAt: Date.now(),
    });
  },
});

export const listComplianceLedgerEvents = query({
  args: {
    organizationId: v.id("organizations"),
    aggregateType: v.optional(
      v.union(
        v.literal("ad_compliance"),
        v.literal("task_compliance"),
        v.literal("directive_lifecycle"),
        v.literal("counter_reconciliation"),
      ),
    ),
    aggregateId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);

    const rows = await ctx.db
      .query("complianceLedgerEvents")
      .withIndex("by_org_occurred", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(limit);

    return rows.filter((row) => {
      if (args.aggregateType && row.aggregateType !== args.aggregateType) return false;
      if (args.aggregateId && row.aggregateId !== args.aggregateId) return false;
      return true;
    });
  },
});

/**
 * Replay helper used by audits/tests: folds the latest known state from an
 * append-only stream.
 */
export const replayComplianceLedger = query({
  args: {
    organizationId: v.id("organizations"),
    aggregateType: v.union(
      v.literal("ad_compliance"),
      v.literal("task_compliance"),
      v.literal("directive_lifecycle"),
      v.literal("counter_reconciliation"),
    ),
    aggregateId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("complianceLedgerEvents")
      .withIndex("by_org_aggregate", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("aggregateType", args.aggregateType)
          .eq("aggregateId", args.aggregateId),
      )
      .order("asc")
      .collect();

    let currentState: string | undefined;
    let dueDate: number | undefined;
    let dueHours: number | undefined;
    let dueCycles: number | undefined;

    for (const row of rows) {
      currentState = row.nextState ?? currentState;
      dueDate = row.dueDate ?? dueDate;
      dueHours = row.dueHours ?? dueHours;
      dueCycles = row.dueCycles ?? dueCycles;
    }

    return {
      aggregateId: args.aggregateId,
      eventCount: rows.length,
      latestState: currentState,
      dueSnapshot: {
        dueDate,
        dueHours,
        dueCycles,
      },
      events: rows,
    };
  },
});

/**
 * Generic AD/SB lifecycle transition contract with explicit guard policy (C1.3).
 * This records a lifecycle event in the compliance ledger; caller systems can
 * project this into domain-specific records as needed.
 */
export const transitionDirectiveLifecycle = mutation({
  args: {
    organizationId: v.id("organizations"),
    directiveKind: v.union(v.literal("ad"), v.literal("sb")),
    directiveRef: v.string(),
    fromState: v.union(
      v.literal("identified"),
      v.literal("assessed"),
      v.literal("applicable"),
      v.literal("scheduled"),
      v.literal("complied"),
      v.literal("recurring_next"),
    ),
    toState: v.union(
      v.literal("identified"),
      v.literal("assessed"),
      v.literal("applicable"),
      v.literal("scheduled"),
      v.literal("complied"),
      v.literal("recurring_next"),
    ),
    actorUserId: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"complianceLedgerEvents">> => {
    assertValidDirectiveLifecycleTransition(
      args.fromState as DirectiveLifecycleState,
      args.toState as DirectiveLifecycleState,
    );

    const occurredAt = args.occurredAt ?? Date.now();

    return await ctx.db.insert("complianceLedgerEvents", {
      organizationId: args.organizationId,
      aggregateType: "directive_lifecycle",
      aggregateId: `${args.directiveKind}:${args.directiveRef}`,
      eventType: "directive_lifecycle_transition",
      previousState: JSON.stringify({ state: args.fromState }),
      nextState: JSON.stringify({ state: args.toState }),
      source: "user",
      actorUserId: args.actorUserId,
      occurredAt,
      createdAt: Date.now(),
    });
  },
});

/**
 * Counter source-of-truth reconciliation event contract (C1.4).
 */
export const recordCounterReconciliation = mutation({
  args: {
    organizationId: v.id("organizations"),
    counterScope: v.union(
      v.literal("airframe"),
      v.literal("engine"),
      v.literal("apu"),
    ),
    counterName: v.union(v.literal("hours"), v.literal("cycles")),
    authoritativeSource: v.union(
      v.literal("aircraft"),
      v.literal("engine"),
      v.literal("apu"),
      v.literal("external_sync"),
      v.literal("manual"),
    ),
    entityRef: v.string(),
    observedValue: v.number(),
    authoritativeValue: v.number(),
    action: v.union(
      v.literal("accepted_authoritative"),
      v.literal("accepted_observed"),
      v.literal("requires_review"),
    ),
    metadataJson: v.optional(v.string()),
    actorUserId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"counterReconciliationEvents">> => {
    const now = Date.now();
    const delta = args.authoritativeValue - args.observedValue;

    const eventId = await ctx.db.insert("counterReconciliationEvents", {
      organizationId: args.organizationId,
      counterScope: args.counterScope,
      counterName: args.counterName,
      authoritativeSource: args.authoritativeSource,
      entityRef: args.entityRef,
      observedValue: args.observedValue,
      authoritativeValue: args.authoritativeValue,
      delta,
      action: args.action,
      metadataJson: args.metadataJson,
      actorUserId: args.actorUserId,
      createdAt: now,
    });

    await ctx.db.insert("complianceLedgerEvents", {
      organizationId: args.organizationId,
      aggregateType: "counter_reconciliation",
      aggregateId: `${args.counterScope}:${args.counterName}:${args.entityRef}`,
      eventType: "counter_reconciliation_recorded",
      previousState: undefined,
      nextState: JSON.stringify({
        action: args.action,
        delta,
        authoritativeSource: args.authoritativeSource,
      }),
      source: "reconciliation",
      entityTable: "counterReconciliationEvents",
      entityId: String(eventId),
      actorUserId: args.actorUserId,
      occurredAt: now,
      createdAt: now,
    });

    return eventId;
  },
});
