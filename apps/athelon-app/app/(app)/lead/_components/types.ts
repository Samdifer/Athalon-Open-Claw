import type { Id } from "@/convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Shared types for Lead Center tab components
// ---------------------------------------------------------------------------

/** Shape returned by api.leadTurnover.getLeadWorkspace */
export interface LeadCenterWorkspace {
  reportDate: string;
  windowStartAt: number;
  windowEndAt: number;
  caller: {
    technicianId: Id<"technicians">;
    legalName: string;
    role: string;
  };
  technicians: Array<{
    _id: Id<"technicians">;
    legalName: string;
    role?: string;
    rosterTeamId?: Id<"rosterTeams">;
  }>;
  workOrders: Array<{
    _id: Id<"workOrders">;
    workOrderNumber: string;
    status: string;
    description?: string;
    promisedDeliveryDate?: string;
    assignedMinutesToday: number;
  }>;
  taskCards: Array<{
    _id: Id<"taskCards">;
    workOrderNumber: string;
    taskCardNumber: string;
    title: string;
    status: string;
    assignedToTechnicianId?: Id<"technicians">;
    pendingSteps: number;
    totalSteps: number;
  }>;
  assignments: Array<{
    entityType: string;
    workOrderId?: Id<"workOrders">;
    taskCardId?: Id<"taskCards">;
    assignedToTechnicianId?: Id<"technicians">;
    assignedTeamName?: string;
  }>;
  dayMetrics: {
    totalMinutes: number;
    workOrderMinutes: number;
    personBreakdown: Array<{
      technicianId: Id<"technicians">;
      technicianName: string;
      minutes: number;
      notes?: string;
    }>;
    minutesByWorkOrder: Record<string, number>;
  };
  report: {
    _id: Id<"turnoverReports">;
    status: string;
    selectedWorkOrderIds: Id<"workOrders">[];
    summaryText?: string;
    aiDraftSummary?: string;
    leadNotes?: string;
    upcomingDeadlinesNotes?: string;
    partsOrderedSummary?: string;
    partsReceivedSummary?: string;
    workOrderNotes?: Array<{
      workOrderId: Id<"workOrders">;
      workOrderNumber?: string;
      notes?: string;
    }>;
    teamBreakdown?: Array<{
      teamName: string;
      minutes: number;
      notes?: string;
    }>;
    updatedAt?: number;
  } | null;
  aiDraftSummary?: string;
  history: Array<{
    _id: Id<"turnoverReports">;
    reportDate: string;
    leadName: string;
    timeAppliedMinutes: number;
    shopWorkOrderMinutes: number;
    selectedWorkOrderCount: number;
    submittedAt?: number;
  }>;
}

/** Shape returned by api.workOrders.getWorkOrdersWithScheduleRisk */
export interface WoSummaryItem {
  _id: Id<"workOrders">;
  workOrderNumber: string;
  status: string;
  taskCardCount?: number;
  completedTaskCardCount?: number;
  aircraft?: { currentRegistration?: string };
}

/** The assignEntity mutation — typed loosely to accept the Convex ReactMutation */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AssignEntityFn = (args: any) => Promise<any>;
