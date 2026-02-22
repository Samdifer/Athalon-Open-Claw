import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string; name?: string } | null> };
}): Promise<{ subject: string; name?: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("UNAUTHENTICATED: Sign in required.");
  }
  return identity;
}

type StructuredApprovedDataRef = {
  docType: string;
  identifier: string;
  revision: string;
  section: string;
};

function parseApprovedDataRef(input: string): StructuredApprovedDataRef | null {
  if (!input || !input.includes("|")) return null;
  const [docType = "", identifier = "", revision = "", section = ""] = input
    .split("|")
    .map((s) => s.trim());

  if (!docType || !identifier || !revision) return null;

  return {
    docType,
    identifier,
    revision,
    section,
  };
}

export const getWorkOrderForQcmReview = query({
  args: {
    workOrderId: v.id("workOrders"),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);

    const currentTechnician = await ctx.db
      .query("technicians")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    // Org guard: if no linked technician account, treat as inaccessible for this route.
    if (!currentTechnician) {
      return null;
    }

    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) {
      return null;
    }

    if (workOrder.organizationId !== currentTechnician.organizationId) {
      return null;
    }

    const [aircraft, organization, maintenanceRecords, taskCards, qcmReviews] = await Promise.all([
      ctx.db.get(workOrder.aircraftId),
      ctx.db.get(workOrder.organizationId),
      ctx.db
        .query("maintenanceRecords")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .collect(),
      ctx.db
        .query("taskCards")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .collect(),
      ctx.db
        .query("qcmReviews")
        .withIndex("by_work_order", (q) => q.eq("workOrderId", args.workOrderId))
        .collect(),
    ]);

    if (!aircraft || !organization) {
      return null;
    }

    const maintenanceRecordSummaries = maintenanceRecords
      .sort((a, b) => b.signatureTimestamp - a.signatureTimestamp)
      .map((record) => ({
        id: record._id,
        recordType: record.recordType,
        workPerformed: record.workPerformed,
        approvedDataReference: record.approvedDataReference,
        approvedDataRefStructured: parseApprovedDataRef(record.approvedDataReference),
        completionDate: record.completionDate,
        signingTechnicianLegalName: record.signingTechnicianLegalName,
        signingTechnicianCertNumber: record.signingTechnicianCertNumber,
        signatureTimestamp: record.signatureTimestamp,
        partsCount: record.partsReplaced.length,
        testEquipmentCount: record.testEquipmentUsed?.length ?? 0,
      }));

    const taskCardsWithSignerSummaries = await Promise.all(
      taskCards
        .sort((a, b) => a.taskCardNumber.localeCompare(b.taskCardNumber))
        .map(async (taskCard) => {
          const steps = await ctx.db
            .query("taskCardSteps")
            .withIndex("by_task_card_step", (q) => q.eq("taskCardId", taskCard._id))
            .collect();

          const signerIds = Array.from(
            new Set(
              steps
                .map((s) => s.signedByTechnicianId)
                .filter(Boolean) as Id<"technicians">[],
            ),
          );

          const signerMap = new Map<Id<"technicians">, string>();
          await Promise.all(
            signerIds.map(async (techId) => {
              const tech = await ctx.db.get(techId);
              if (tech) signerMap.set(techId, tech.legalName);
            }),
          );

          return {
            taskCardId: taskCard._id,
            taskCardNumber: taskCard.taskCardNumber,
            taskCardTitle: taskCard.title,
            completedAt: taskCard.completedAt ?? null,
            stepCount: taskCard.stepCount,
            completedStepCount: taskCard.completedStepCount,
            steps: steps.map((step) => ({
              stepId: step._id,
              stepNumber: step.stepNumber,
              description: step.description,
              status: step.status,
              signedByName: step.signedByTechnicianId
                ? signerMap.get(step.signedByTechnicianId) ?? null
                : null,
              signedCertNumber: step.signedCertificateNumber ?? null,
              signedAt: step.signedAt ?? null,
              requiresIa: step.signOffRequiresIa,
            })),
          };
        }),
    );

    const latestReview = qcmReviews
      .sort((a, b) => b.reviewTimestamp - a.reviewTimestamp)[0] ?? null;

    const existingReview = latestReview
      ? {
          id: latestReview._id,
          reviewerLegalName: latestReview.reviewerLegalName,
          reviewerCertificateNumber: latestReview.reviewerCertificateNumber,
          reviewTimestamp: latestReview.reviewTimestamp,
          outcome: latestReview.outcome,
          findingsNotes: latestReview.findingsNotes ?? null,
          signatureHash: latestReview.signatureHash,
        }
      : null;

    const currentTechRoleContext = {
      technicianId: currentTechnician._id,
      organizationId: currentTechnician.organizationId,
      isQualityControlManager:
        organization.qualityControlManagerId === currentTechnician._id,
      isDirectorOfMaintenance:
        organization.directorOfMaintenanceId === currentTechnician._id,
      qualityControlManagerId: organization.qualityControlManagerId ?? null,
      directorOfMaintenanceId: organization.directorOfMaintenanceId ?? null,
    };

    return {
      workOrder: {
        id: workOrder._id,
        workOrderNumber: workOrder.workOrderNumber,
        status: workOrder.status,
        workOrderType: workOrder.workOrderType,
        description: workOrder.description,
        openedAt: workOrder.openedAt,
        closedAt: workOrder.closedAt ?? null,
        aircraftRegistration: aircraft.currentRegistration ?? "UNREGISTERED",
        aircraftMake: aircraft.make,
        aircraftModel: aircraft.model,
        aircraftTotalTimeAtClose: workOrder.aircraftTotalTimeAtClose ?? null,
        organizationName: organization.name,
      },
      maintenanceRecords: maintenanceRecordSummaries,
      taskCards: taskCardsWithSignerSummaries,
      existingReview,
      currentTechnicianId: currentTechnician._id,
      currentTechnicianContext: currentTechRoleContext,
    };
  },
});
