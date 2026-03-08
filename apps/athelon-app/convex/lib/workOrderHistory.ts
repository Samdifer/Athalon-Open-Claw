import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type HistoryEntityKind = "work_order" | "task_card" | "task_step" | "discrepancy";

type RecordRef = {
  tableName: string;
  recordId: string;
};

type EntityMeta = {
  entityKind: HistoryEntityKind;
  entityId: string;
  entityLabel: string;
};

type HistoryBuildInput = {
  organizationId: Id<"organizations">;
  workOrder: Doc<"workOrders">;
  taskCards: Array<Doc<"taskCards">>;
  taskCardSteps: Array<Doc<"taskCardSteps">>;
  discrepancies: Array<Doc<"discrepancies">>;
  auditRows: Array<Doc<"auditLog">>;
  workItemEntries?: Array<Doc<"workItemEntries">>;
};

export type HistoryTimelineEvent = {
  _id: string;
  source: "audit" | "entry";
  eventType: string;
  headline: string;
  notes?: string | null;
  userId?: string | null;
  actorName: string;
  timestamp: number;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  entityKind: HistoryEntityKind;
  entityId: string;
  entityLabel: string;
};

type HistoryQueryCtx = Pick<QueryCtx, "db">;

const FIELD_LABELS: Record<string, string> = {
  description: "Description",
  correctiveAction: "Corrective Action",
  discrepancySummary: "Task Discrepancy Summary",
  correctiveActionSummary: "Task Corrective Action Summary",
  stepDiscrepancySummary: "Step Discrepancy Summary",
  stepCorrectiveActionSummary: "Step Corrective Action Summary",
  returnToServiceStatement: "Return-to-Service Statement",
  inspectorNotes: "Inspector Sign-Off Notes",
  handoffNotes: "Shift Handoff Notes",
  notes: "Sign-Off Notes",
  naReason: "N/A Reason",
  note: "Note",
  statusNote: "Status Note",
};

function formatFieldLabel(fieldName?: string | null): string {
  if (!fieldName) return "Record";
  if (FIELD_LABELS[fieldName]) return FIELD_LABELS[fieldName];
  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

function resolveEntityMeta(
  tableName: string,
  recordId: string,
  input: Pick<HistoryBuildInput, "workOrder" | "taskCards" | "taskCardSteps" | "discrepancies">,
): EntityMeta | null {
  const taskCardById = new Map(input.taskCards.map((taskCard) => [String(taskCard._id), taskCard]));
  const stepById = new Map(input.taskCardSteps.map((step) => [String(step._id), step]));
  const discrepancyById = new Map(input.discrepancies.map((discrepancy) => [String(discrepancy._id), discrepancy]));

  if (tableName === "workOrders" && recordId === String(input.workOrder._id)) {
    return {
      entityKind: "work_order",
      entityId: recordId,
      entityLabel: input.workOrder.workOrderNumber,
    };
  }

  if (tableName === "taskCards") {
    const taskCard = taskCardById.get(recordId);
    if (!taskCard) return null;
    return {
      entityKind: "task_card",
      entityId: recordId,
      entityLabel: `${taskCard.taskCardNumber} - ${taskCard.title}`,
    };
  }

  if (tableName === "taskCardSteps") {
    const step = stepById.get(recordId);
    if (!step) return null;
    const taskCard = taskCardById.get(String(step.taskCardId));
    return {
      entityKind: "task_step",
      entityId: recordId,
      entityLabel: taskCard
        ? `${taskCard.taskCardNumber} - Step ${step.stepNumber}`
        : `Step ${step.stepNumber}`,
    };
  }

  if (tableName === "discrepancies") {
    const discrepancy = discrepancyById.get(recordId);
    if (!discrepancy) return null;
    return {
      entityKind: "discrepancy",
      entityId: recordId,
      entityLabel: discrepancy.discrepancyNumber,
    };
  }

  return null;
}

function deriveAuditHeadline(row: Doc<"auditLog">): string {
  if (row.eventType === "record_updated" && row.fieldName) {
    return `${formatFieldLabel(row.fieldName)} Updated`;
  }

  if (row.eventType === "status_changed") return "Status Changed";
  if (row.eventType === "record_created") return "Created";
  if (row.eventType === "record_signed") return "Sign-Off Recorded";
  if (row.eventType === "technician_signed") return "Technician Sign-Off Recorded";
  if (row.eventType === "qcm_reviewed") return "QCM Review Recorded";
  if (row.eventType === "part_installed") return "Part Installed";
  if (row.eventType === "part_removed") return "Part Removed";
  if (row.eventType === "correction_created") return "Correction Recorded";

  return row.eventType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

function deriveEntryHeadline(entryType: Doc<"workItemEntries">["entryType"]): string {
  if (entryType === "discrepancy_writeup") return "Description Updated";
  if (entryType === "corrective_action") return "Corrective Action Updated";
  if (entryType === "status_change") return "Status Note Added";
  return "Note Added";
}

function inferWorkItemFieldName(entry: Doc<"workItemEntries">): string | null {
  if (entry.entryType === "discrepancy_writeup") {
    if (entry.discrepancyId) return "description";
    if (entry.taskCardStepId) return "stepDiscrepancySummary";
    if (entry.taskCardId) return "discrepancySummary";
  }

  if (entry.entryType === "corrective_action") {
    if (entry.discrepancyId) return "correctiveAction";
    if (entry.taskCardStepId) return "stepCorrectiveActionSummary";
    if (entry.taskCardId) return "correctiveActionSummary";
  }

  if (entry.entryType === "note") return "note";
  if (entry.entryType === "status_change") return "statusNote";
  return null;
}

function resolveWorkItemEntryMeta(
  entry: Doc<"workItemEntries">,
  input: Pick<HistoryBuildInput, "workOrder" | "taskCards" | "taskCardSteps" | "discrepancies">,
): EntityMeta | null {
  if (entry.discrepancyId) {
    return resolveEntityMeta("discrepancies", String(entry.discrepancyId), input);
  }

  if (entry.taskCardStepId) {
    return resolveEntityMeta("taskCardSteps", String(entry.taskCardStepId), input);
  }

  if (entry.taskCardId) {
    return resolveEntityMeta("taskCards", String(entry.taskCardId), input);
  }

  return null;
}

function isWorkItemMirroredByAudit(
  entry: Doc<"workItemEntries">,
  auditRows: Array<Doc<"auditLog">>,
  input: Pick<HistoryBuildInput, "workOrder" | "taskCards" | "taskCardSteps" | "discrepancies">,
): boolean {
  const entityMeta = resolveWorkItemEntryMeta(entry, input);
  const fieldName = inferWorkItemFieldName(entry);
  if (!entityMeta || !fieldName) return false;

  return auditRows.some((row) =>
    row.recordId === entityMeta.entityId &&
    row.technicianId === entry.technicianId &&
    row.timestamp === entry.createdAt &&
    row.fieldName === fieldName &&
    row.newValue === JSON.stringify(entry.text),
  );
}

async function buildActorNameMaps(
  ctx: HistoryQueryCtx,
  input: Pick<HistoryBuildInput, "organizationId" | "auditRows" | "workItemEntries">,
): Promise<{
  technicianNameById: Map<string, string>;
  technicianNameByUserId: Map<string, string>;
}> {
  const technicianIds = new Set<string>();
  const userIds = new Set<string>();

  for (const row of input.auditRows) {
    if (row.technicianId) technicianIds.add(String(row.technicianId));
    if (row.userId) userIds.add(row.userId);
  }

  for (const entry of input.workItemEntries ?? []) {
    technicianIds.add(String(entry.technicianId));
  }

  const technicianDocs = await Promise.all(
    Array.from(technicianIds).map((technicianId) =>
      ctx.db.get(technicianId as Id<"technicians">),
    ),
  );
  const technicianNameById = new Map<string, string>();
  const technicianNameByUserId = new Map<string, string>();

  for (const technician of technicianDocs) {
    if (!technician) continue;
    technicianNameById.set(String(technician._id), technician.legalName);
    if (technician.userId) {
      technicianNameByUserId.set(technician.userId, technician.legalName);
      userIds.delete(technician.userId);
    }
  }

  const userTechnicians = await Promise.all(
    Array.from(userIds).map((userId) =>
      ctx.db
        .query("technicians")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", input.organizationId).eq("userId", userId),
        )
        .first(),
    ),
  );

  for (const technician of userTechnicians) {
    if (!technician?.userId) continue;
    technicianNameByUserId.set(technician.userId, technician.legalName);
    technicianNameById.set(String(technician._id), technician.legalName);
  }

  return { technicianNameById, technicianNameByUserId };
}

function resolveActorName(
  auditRow: Pick<Doc<"auditLog">, "technicianId" | "userId">,
  lookups: {
    technicianNameById: Map<string, string>;
    technicianNameByUserId: Map<string, string>;
  },
): string {
  if (auditRow.technicianId) {
    return lookups.technicianNameById.get(String(auditRow.technicianId)) ?? "Staff Member";
  }

  if (auditRow.userId) {
    return lookups.technicianNameByUserId.get(auditRow.userId) ?? "Staff Member";
  }

  return "System";
}

export async function collectAuditRowsForRecords(
  ctx: HistoryQueryCtx,
  recordRefs: Array<RecordRef>,
): Promise<Array<Doc<"auditLog">>> {
  const dedupedRefs = Array.from(
    new Map(
      recordRefs.map((ref) => [`${ref.tableName}:${ref.recordId}`, ref]),
    ).values(),
  );

  const results = await Promise.all(
    dedupedRefs.map((ref) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_record", (q) =>
          q.eq("tableName", ref.tableName).eq("recordId", ref.recordId),
        )
        .collect(),
    ),
  );

  return results.flat();
}

export async function buildHistoryTimelineEvents(
  ctx: HistoryQueryCtx,
  input: HistoryBuildInput,
): Promise<Array<HistoryTimelineEvent>> {
  const actorLookups = await buildActorNameMaps(ctx, input);

  const auditEvents: Array<HistoryTimelineEvent> = [];
  for (const row of input.auditRows) {
    const entityMeta = resolveEntityMeta(row.tableName, row.recordId, input);
    if (!entityMeta) continue;

    auditEvents.push({
      _id: `audit:${String(row._id)}`,
      source: "audit",
      eventType: row.eventType,
      headline: deriveAuditHeadline(row),
      notes: row.notes,
      userId: row.userId,
      actorName: resolveActorName(row, actorLookups),
      timestamp: row.timestamp,
      fieldName: row.fieldName,
      oldValue: row.oldValue,
      newValue: row.newValue,
      entityKind: entityMeta.entityKind,
      entityId: entityMeta.entityId,
      entityLabel: entityMeta.entityLabel,
    });
  }

  const legacyEntries: Array<HistoryTimelineEvent> = [];
  for (const entry of input.workItemEntries ?? []) {
    if (isWorkItemMirroredByAudit(entry, input.auditRows, input)) continue;
    const entityMeta = resolveWorkItemEntryMeta(entry, input);
    if (!entityMeta) continue;

    legacyEntries.push({
      _id: `entry:${String(entry._id)}`,
      source: "entry",
      eventType: entry.entryType,
      headline: deriveEntryHeadline(entry.entryType),
      notes: entry.text,
      actorName: entry.technicianName,
      timestamp: entry.createdAt,
      fieldName: inferWorkItemFieldName(entry),
      oldValue: null,
      newValue: JSON.stringify(entry.text),
      entityKind: entityMeta.entityKind,
      entityId: entityMeta.entityId,
      entityLabel: entityMeta.entityLabel,
    });
  }

  return [...auditEvents, ...legacyEntries].sort((left, right) => {
    if (right.timestamp !== left.timestamp) return right.timestamp - left.timestamp;
    return left._id.localeCompare(right._id);
  });
}
