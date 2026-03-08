import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Entry type validator (reused across functions) ─────────────────────────

const entryTypeValidator = v.union(
  v.literal("discrepancy_writeup"),
  v.literal("corrective_action"),
  v.literal("note"),
  v.literal("status_change"),
);

// ─── addEntry ───────────────────────────────────────────────────────────────
//
// Creates an immutable write-up entry. Snapshots technician name and cert
// number at write time. Patches the parent record's summary field with the
// new text so the latest write-up is always denormalized for display.
// ─────────────────────────────────────────────────────────────────────────────

export const addEntry = mutation({
  args: {
    organizationId: v.id("organizations"),
    workOrderId: v.id("workOrders"),
    discrepancyId: v.optional(v.id("discrepancies")),
    taskCardId: v.optional(v.id("taskCards")),
    taskCardStepId: v.optional(v.id("taskCardSteps")),
    entryType: entryTypeValidator,
    text: v.string(),
    technicianId: v.id("technicians"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const callerUserId = identity?.subject;

    // Validate exactly one polymorphic parent is set
    const parentCount = [args.discrepancyId, args.taskCardId, args.taskCardStepId]
      .filter((id) => id !== undefined)
      .length;
    if (parentCount !== 1) {
      throw new Error("Exactly one of discrepancyId, taskCardId, or taskCardStepId must be provided");
    }

    if (args.text.trim().length === 0) {
      throw new Error("Entry text cannot be empty");
    }

    // Validate and snapshot technician
    const tech = await ctx.db.get(args.technicianId);
    if (!tech) {
      throw new Error("Technician not found");
    }

    const technicianName = tech.legalName;

    // Look up primary certificate number for snapshot
    const certs = await ctx.db
      .query("certificates")
      .withIndex("by_technician", (q) => q.eq("technicianId", args.technicianId))
      .collect();
    const activeCert = certs.find((c) => c.active);
    const certificateNumber = activeCert?.certificateNumber;

    const now = Date.now();

    let auditTableName: "discrepancies" | "taskCards" | "taskCardSteps";
    let auditRecordId: string;
    let auditFieldName: string | undefined;
    let auditOldValue: string | undefined;
    let auditNotes: string;

    if (args.discrepancyId) {
      const discrepancy = await ctx.db.get(args.discrepancyId);
      if (!discrepancy) {
        throw new Error("Discrepancy not found");
      }

      auditTableName = "discrepancies";
      auditRecordId = String(args.discrepancyId);

      if (args.entryType === "discrepancy_writeup") {
        auditFieldName = "description";
        auditOldValue = JSON.stringify(discrepancy.description ?? null);
        auditNotes = `Finding description updated on ${discrepancy.discrepancyNumber}.`;
      } else if (args.entryType === "corrective_action") {
        auditFieldName = "correctiveAction";
        auditOldValue = JSON.stringify(discrepancy.correctiveAction ?? null);
        auditNotes = `Corrective action updated on ${discrepancy.discrepancyNumber}.`;
      } else if (args.entryType === "status_change") {
        auditFieldName = "statusNote";
        auditOldValue = undefined;
        auditNotes = `Status note added on ${discrepancy.discrepancyNumber}.`;
      } else {
        auditFieldName = "note";
        auditOldValue = undefined;
        auditNotes = `Note added on ${discrepancy.discrepancyNumber}.`;
      }
    } else if (args.taskCardStepId) {
      const step = await ctx.db.get(args.taskCardStepId);
      if (!step) {
        throw new Error("Task card step not found");
      }

      const taskCard = await ctx.db.get(step.taskCardId);
      const stepLabel = taskCard
        ? `${taskCard.taskCardNumber} step ${step.stepNumber}`
        : `step ${step.stepNumber}`;

      auditTableName = "taskCardSteps";
      auditRecordId = String(args.taskCardStepId);

      if (args.entryType === "discrepancy_writeup") {
        auditFieldName = "stepDiscrepancySummary";
        auditOldValue = JSON.stringify(step.stepDiscrepancySummary ?? null);
        auditNotes = `Step discrepancy summary updated on ${stepLabel}.`;
      } else if (args.entryType === "corrective_action") {
        auditFieldName = "stepCorrectiveActionSummary";
        auditOldValue = JSON.stringify(step.stepCorrectiveActionSummary ?? null);
        auditNotes = `Step corrective action summary updated on ${stepLabel}.`;
      } else if (args.entryType === "status_change") {
        auditFieldName = "statusNote";
        auditOldValue = undefined;
        auditNotes = `Status note added on ${stepLabel}.`;
      } else {
        auditFieldName = "note";
        auditOldValue = undefined;
        auditNotes = `Note added on ${stepLabel}.`;
      }
    } else {
      const taskCard = await ctx.db.get(args.taskCardId!);
      if (!taskCard) {
        throw new Error("Task card not found");
      }

      auditTableName = "taskCards";
      auditRecordId = String(args.taskCardId!);

      if (args.entryType === "discrepancy_writeup") {
        auditFieldName = "discrepancySummary";
        auditOldValue = JSON.stringify(taskCard.discrepancySummary ?? null);
        auditNotes = `Task discrepancy summary updated on ${taskCard.taskCardNumber}.`;
      } else if (args.entryType === "corrective_action") {
        auditFieldName = "correctiveActionSummary";
        auditOldValue = JSON.stringify(taskCard.correctiveActionSummary ?? null);
        auditNotes = `Task corrective action summary updated on ${taskCard.taskCardNumber}.`;
      } else if (args.entryType === "status_change") {
        auditFieldName = "statusNote";
        auditOldValue = undefined;
        auditNotes = `Status note added on ${taskCard.taskCardNumber}.`;
      } else {
        auditFieldName = "note";
        auditOldValue = undefined;
        auditNotes = `Note added on ${taskCard.taskCardNumber}.`;
      }
    }

    // Insert immutable entry
    const entryId = await ctx.db.insert("workItemEntries", {
      organizationId: args.organizationId,
      workOrderId: args.workOrderId,
      discrepancyId: args.discrepancyId,
      taskCardId: args.taskCardId,
      taskCardStepId: args.taskCardStepId,
      entryType: args.entryType,
      text: args.text.trim(),
      technicianId: args.technicianId,
      technicianName,
      certificateNumber,
      createdAt: now,
    });

    // Patch parent record's summary field with latest text
    if (args.entryType === "discrepancy_writeup" || args.entryType === "corrective_action") {
      if (args.taskCardId) {
        const summaryField = args.entryType === "discrepancy_writeup"
          ? "discrepancySummary"
          : "correctiveActionSummary";
        await ctx.db.patch(args.taskCardId, { [summaryField]: args.text.trim() });
      } else if (args.taskCardStepId) {
        const summaryField = args.entryType === "discrepancy_writeup"
          ? "stepDiscrepancySummary"
          : "stepCorrectiveActionSummary";
        await ctx.db.patch(args.taskCardStepId, { [summaryField]: args.text.trim() });
      } else if (args.discrepancyId) {
        // For discrepancies, patch the existing description or correctiveAction field
        const patchField = args.entryType === "discrepancy_writeup"
          ? "description"
          : "correctiveAction";
        await ctx.db.patch(args.discrepancyId, { [patchField]: args.text.trim() });
      }
    }

    await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_updated",
      tableName: auditTableName,
      recordId: auditRecordId,
      userId: callerUserId,
      technicianId: args.technicianId,
      fieldName: auditFieldName,
      oldValue: auditOldValue,
      newValue: JSON.stringify(args.text.trim()),
      notes: `${auditNotes} Entry recorded by ${technicianName}.`,
      timestamp: now,
    });

    return entryId;
  },
});

// ─── listEntriesForDiscrepancy ──────────────────────────────────────────────

export const listEntriesForDiscrepancy = query({
  args: {
    discrepancyId: v.id("discrepancies"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workItemEntries")
      .withIndex("by_discrepancy", (q) => q.eq("discrepancyId", args.discrepancyId))
      .collect();
  },
});

// ─── listEntriesForTaskCard ─────────────────────────────────────────────────
//
// Returns parent-level entries only (taskCardStepId is undefined).

export const listEntriesForTaskCard = query({
  args: {
    taskCardId: v.id("taskCards"),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("workItemEntries")
      .withIndex("by_task_card", (q) => q.eq("taskCardId", args.taskCardId))
      .collect();
    // Filter to parent-level only (no step association)
    return all.filter((e) => e.taskCardStepId === undefined);
  },
});

// ─── listEntriesForTaskCardStep ─────────────────────────────────────────────

export const listEntriesForTaskCardStep = query({
  args: {
    taskCardStepId: v.id("taskCardSteps"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workItemEntries")
      .withIndex("by_task_card_step", (q) => q.eq("taskCardStepId", args.taskCardStepId))
      .collect();
  },
});
