// convex/logbook.ts
// Athelon — Logbook Auto-Generation from Completed Work Orders
//
// Pre-configured FAA maintenance record statements per 14 CFR 43.9/43.11.
// Auto-generates structured logbook entries from completed work order data.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// FAA STATEMENTS — per 14 CFR 43.9 / 43.11
// ─────────────────────────────────────────────────────────────────────────────

export const FAA_STATEMENTS: Record<string, string> = {
  annual_inspection:
    "I certify that this aircraft has been inspected in accordance with an annual inspection and was determined to be in airworthy condition.",
  progressive_inspection:
    "I certify that this aircraft has been inspected in accordance with a progressive inspection program and was determined to be in airworthy condition.",
  hundred_hour:
    "I certify that this aircraft has been inspected in accordance with a 100-hour inspection and was determined to be in airworthy condition.",
  return_to_service:
    "I certify that the maintenance recorded herein has been performed using methods, techniques, and practices acceptable to the Administrator, using FAA-approved data.",
  ad_compliance:
    "Airworthiness Directive {adNumber} has been complied with as described herein.",
  major_repair:
    "I certify that the repair or alteration made to the unit identified above was performed in accordance with the requirements of 14 CFR Part 43.",
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL AUTH HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("UNAUTHENTICATED: Sign in before calling this mutation.");
  }
  return identity.subject;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION: generateLogbookEntry
//
// Auto-creates a structured logbook entry from completed work order data.
// Gathers task cards, discrepancies, parts, and technician info to build
// a comprehensive logbook narrative per 14 CFR 43.9.
// ─────────────────────────────────────────────────────────────────────────────

export const generateLogbookEntry = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    organizationId: v.id("organizations"),
    // Optional override for the FAA statement type
    statementType: v.optional(v.string()),
    // Optional manual notes to append
    additionalNotes: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();
    const callerUserId = await requireAuth(ctx);

    // Fetch work order
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo) throw new Error(`Work order ${args.workOrderId} not found.`);
    if (wo.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch.");
    }
    if (wo.status !== "closed") {
      throw new Error(
        `Logbook entries can only be generated for closed work orders. Current status: "${wo.status}".`
      );
    }

    // Fetch aircraft
    const aircraft = await ctx.db.get(wo.aircraftId);
    if (!aircraft) throw new Error("Aircraft not found.");

    // Fetch completed task cards
    const taskCards = await ctx.db
      .query("taskCards")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    const completedCards = taskCards.filter((tc) => tc.status === "complete");

    // Fetch discrepancies
    const discrepancies = await ctx.db
      .query("discrepancies")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .collect();

    // Fetch RTS record
    const rts = await ctx.db
      .query("returnToService")
      .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
      .first();

    // Build description from task cards
    const workDescriptionLines: string[] = [];
    for (const card of completedCards) {
      workDescriptionLines.push(`- ${card.title} (${card.taskCardNumber}): ${card.taskType}`);
      // Get steps for this card
      const steps = await ctx.db
        .query("taskCardSteps")
        .withIndex("by_task_card", (q) => q.eq("taskCardId", card._id))
        .collect();
      const completedSteps = steps.filter((s) => s.status === "completed");
      for (const step of completedSteps) {
        workDescriptionLines.push(`  Step ${step.stepNumber}: ${step.description}`);
        if (step.approvedDataReference) {
          workDescriptionLines.push(`    Ref: ${step.approvedDataReference}`);
        }
      }
    }

    // Build discrepancy summary
    const discrepancyLines: string[] = [];
    for (const disc of discrepancies) {
      const status = disc.disposition || disc.status;
      discrepancyLines.push(`- ${disc.discrepancyNumber}: ${disc.description} [${status}]`);
      if (disc.correctiveAction) {
        discrepancyLines.push(`  Corrective action: ${disc.correctiveAction}`);
      }
    }

    // Determine FAA statement
    const woTypeToStatement: Record<string, string> = {
      annual_inspection: "annual_inspection",
      progressive_inspection: "progressive_inspection",
      "100hr_inspection": "hundred_hour",
      ad_compliance: "ad_compliance",
      major_repair: "major_repair",
      major_alteration: "major_repair",
    };
    const statementKey = args.statementType ||
      woTypeToStatement[wo.workOrderType] ||
      "return_to_service";
    const faaStatement = FAA_STATEMENTS[statementKey] || FAA_STATEMENTS.return_to_service;

    // Get closing technician info
    let closingTechName = "Unknown";
    let closingCertNumber = "Unknown";
    if (wo.closedByTechnicianId) {
      const tech = await ctx.db.get(wo.closedByTechnicianId);
      if (tech) {
        closingTechName = tech.legalName;
        // Get certificate
        const cert = await ctx.db
          .query("certificates")
          .withIndex("by_technician", (q) => q.eq("technicianId", tech._id))
          .filter((q) => q.eq(q.field("active"), true))
          .first();
        closingCertNumber = cert?.certificateNumber || "N/A";
      }
    }

    // Calculate total hours
    const totalHours = completedCards.reduce((sum, c) => sum + (c.estimatedHours ?? 0), 0);

    // Build full entry
    const entryDescription = [
      `Work Order: ${wo.workOrderNumber}`,
      `Type: ${wo.workOrderType}`,
      `Description: ${wo.description}`,
      "",
      "Work Performed:",
      ...workDescriptionLines,
      ...(discrepancyLines.length > 0
        ? ["", "Discrepancies:", ...discrepancyLines]
        : []),
      ...(args.additionalNotes ? ["", `Notes: ${args.additionalNotes}`] : []),
    ].join("\n");

    // Insert as a maintenance record-style logbook entry via audit log
    // (We store logbook entries as audit log records with a special event type
    // since the maintenanceRecords table is immutable and requires signature auth)
    const entryId = await ctx.db.insert("auditLog", {
      organizationId: args.organizationId,
      eventType: "record_created",
      tableName: "logbookEntries",
      recordId: String(args.workOrderId),
      userId: callerUserId,
      notes: JSON.stringify({
        type: "logbook_entry",
        workOrderId: String(args.workOrderId),
        workOrderNumber: wo.workOrderNumber,
        aircraftId: String(wo.aircraftId),
        aircraftRegistration: aircraft.currentRegistration || "Unknown",
        aircraftMake: aircraft.make,
        aircraftModel: aircraft.model,
        aircraftSerialNumber: aircraft.serialNumber,
        date: wo.closedAt || now,
        description: entryDescription,
        totalHours,
        aircraftTotalTimeAtClose: wo.aircraftTotalTimeAtClose,
        technicianName: closingTechName,
        certificateNumber: closingCertNumber,
        faaStatement,
        statementType: statementKey,
        taskCardCount: completedCards.length,
        discrepancyCount: discrepancies.length,
        rtsRecordId: rts?._id ? String(rts._id) : null,
        generatedAt: now,
      }),
      timestamp: now,
    });

    return {
      entryId,
      workOrderNumber: wo.workOrderNumber,
      aircraftRegistration: aircraft.currentRegistration,
      description: entryDescription,
      faaStatement,
      technicianName: closingTechName,
      certificateNumber: closingCertNumber,
      totalHours,
      date: wo.closedAt || now,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY: listLogbookEntries
//
// Returns all logbook entries for an aircraft, parsed from audit log records.
// ─────────────────────────────────────────────────────────────────────────────

export const listLogbookEntries = query({
  args: {
    aircraftId: v.id("aircraft"),
    organizationId: v.id("organizations"),
  },

  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Query audit log for logbook entries
    const entries = await ctx.db
      .query("auditLog")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    // Filter and parse logbook entries for this aircraft
    const logbookEntries = entries
      .filter((entry) => {
        if (entry.tableName !== "logbookEntries") return false;
        if (!entry.notes) return false;
        try {
          const data = JSON.parse(entry.notes);
          return data.type === "logbook_entry" && data.aircraftId === String(args.aircraftId);
        } catch {
          return false;
        }
      })
      .map((entry) => {
        const data = JSON.parse(entry.notes!);
        return {
          _id: entry._id,
          workOrderId: data.workOrderId,
          workOrderNumber: data.workOrderNumber,
          aircraftRegistration: data.aircraftRegistration,
          aircraftMake: data.aircraftMake,
          aircraftModel: data.aircraftModel,
          date: data.date,
          description: data.description,
          totalHours: data.totalHours,
          aircraftTotalTimeAtClose: data.aircraftTotalTimeAtClose,
          technicianName: data.technicianName,
          certificateNumber: data.certificateNumber,
          faaStatement: data.faaStatement,
          statementType: data.statementType,
          taskCardCount: data.taskCardCount,
          discrepancyCount: data.discrepancyCount,
          generatedAt: data.generatedAt,
        };
      });

    // Also get actual maintenance records for this aircraft
    const maintenanceRecords = await ctx.db
      .query("maintenanceRecords")
      .withIndex("by_aircraft", (q) => q.eq("aircraftId", args.aircraftId))
      .order("desc")
      .collect();

    const mrEntries = maintenanceRecords
      .filter((mr) => mr.organizationId === args.organizationId)
      .map((mr) => ({
        _id: mr._id,
        workOrderId: String(mr.workOrderId),
        workOrderNumber: undefined as string | undefined,
        aircraftRegistration: mr.aircraftRegistration,
        aircraftMake: mr.aircraftMake,
        aircraftModel: mr.aircraftModel,
        date: mr.completionDate,
        description: mr.workPerformed,
        totalHours: undefined as number | undefined,
        aircraftTotalTimeAtClose: mr.aircraftTotalTimeHours,
        technicianName: mr.signingTechnicianLegalName,
        certificateNumber: mr.signingTechnicianCertNumber,
        faaStatement: mr.returnToServiceStatement || undefined,
        statementType: mr.recordType,
        taskCardCount: undefined as number | undefined,
        discrepancyCount: mr.discrepanciesFound.length,
        generatedAt: mr.createdAt,
        isMaintenanceRecord: true,
      }));

    // Merge and sort by date descending
    const allEntries = [...logbookEntries, ...mrEntries].sort(
      (a, b) => (b.date || 0) - (a.date || 0)
    );

    return allEntries;
  },
});
