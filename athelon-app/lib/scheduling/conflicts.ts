// lib/scheduling/conflicts.ts
// Schedule Conflict Detection — Phase 7

export type ScheduledWO = {
  woId: string;
  workOrderNumber: string;
  bayId?: string;
  bayName?: string;
  startDate: number;
  endDate: number;
  assignedTechnicianIds?: string[];
  promisedDeliveryDate?: number;
};

export type Conflict = {
  type: "bay_double_booking" | "tech_over_allocation" | "past_due";
  severity: "error" | "warning";
  message: string;
  woIds: string[];
};

/**
 * Detect scheduling conflicts in a set of scheduled work orders.
 */
export function detectConflicts(scheduledWOs: ScheduledWO[]): Conflict[] {
  const conflicts: Conflict[] = [];

  // 1. Bay double-booking
  const byBay = new Map<string, ScheduledWO[]>();
  for (const wo of scheduledWOs) {
    if (wo.bayId) {
      const list = byBay.get(wo.bayId) ?? [];
      list.push(wo);
      byBay.set(wo.bayId, list);
    }
  }

  for (const [, wos] of byBay) {
    for (let i = 0; i < wos.length; i++) {
      for (let j = i + 1; j < wos.length; j++) {
        const a = wos[i];
        const b = wos[j];
        if (a.startDate < b.endDate && b.startDate < a.endDate) {
          conflicts.push({
            type: "bay_double_booking",
            severity: "error",
            message: `Bay "${a.bayName ?? a.bayId}": ${a.workOrderNumber} and ${b.workOrderNumber} overlap`,
            woIds: [a.woId, b.woId],
          });
        }
      }
    }
  }

  // 2. Technician over-allocation
  const byTech = new Map<string, ScheduledWO[]>();
  for (const wo of scheduledWOs) {
    for (const techId of wo.assignedTechnicianIds ?? []) {
      const list = byTech.get(techId) ?? [];
      list.push(wo);
      byTech.set(techId, list);
    }
  }

  for (const [, wos] of byTech) {
    for (let i = 0; i < wos.length; i++) {
      for (let j = i + 1; j < wos.length; j++) {
        const a = wos[i];
        const b = wos[j];
        if (a.startDate < b.endDate && b.startDate < a.endDate) {
          conflicts.push({
            type: "tech_over_allocation",
            severity: "warning",
            message: `Technician assigned to overlapping WOs: ${a.workOrderNumber} and ${b.workOrderNumber}`,
            woIds: [a.woId, b.woId],
          });
        }
      }
    }
  }

  // 3. Past-due WOs
  const now = Date.now();
  for (const wo of scheduledWOs) {
    if (wo.promisedDeliveryDate && wo.endDate > wo.promisedDeliveryDate) {
      conflicts.push({
        type: "past_due",
        severity: "warning",
        message: `${wo.workOrderNumber}: estimated completion exceeds promised delivery date`,
        woIds: [wo.woId],
      });
    }
    if (wo.promisedDeliveryDate && wo.promisedDeliveryDate < now && wo.endDate > now) {
      conflicts.push({
        type: "past_due",
        severity: "error",
        message: `${wo.workOrderNumber}: past promised delivery date`,
        woIds: [wo.woId],
      });
    }
  }

  return conflicts;
}
