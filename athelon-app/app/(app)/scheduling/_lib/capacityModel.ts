const DAY_MS = 24 * 60 * 60 * 1000;

export type CapacityPoint = {
  day: number;
  capacity: number;
  load: number;
  utilization: number;
};

export type TechnicianWorkloadRow = {
  daysOfWeek?: number[];
  startHour?: number;
  endHour?: number;
  efficiencyMultiplier?: number;
};

export type ScheduledPlannerProjectRow = {
  workOrderId: string;
  workOrderStatus: string;
  scheduledStartDate: number;
  promisedDeliveryDate: number;
  dailyEffort?: { dayOffset: number; effortHours: number }[];
  nonWorkDays?: number[];
};

export type WorkOrderCapacityRow = {
  _id: string;
  remainingHours?: number;
  effectiveEstimatedHours?: number;
};

function resolveDailyCapacityProfile(
  technicianWorkload: TechnicianWorkloadRow[],
  dailyCapacityProfile?: Float32Array,
): Float32Array {
  if (dailyCapacityProfile) return dailyCapacityProfile;

  const profile = new Float32Array(7);
  for (const tech of technicianWorkload) {
    const shiftDays = tech.daysOfWeek ?? [];
    const shiftHours = Math.max(0, (tech.endHour ?? 0) - (tech.startHour ?? 0));
    const efficiency = tech.efficiencyMultiplier ?? 1;
    const productiveHours = shiftHours * efficiency;

    for (const dayIndex of shiftDays) {
      if (dayIndex < 0 || dayIndex > 6) continue;
      profile[dayIndex] += productiveHours;
    }
  }

  return profile;
}

export function buildDailyCapacityPoints(args: {
  timelineTotalDays: number;
  timelineStartMs: number;
  scheduledProjects: ScheduledPlannerProjectRow[];
  workOrders: WorkOrderCapacityRow[];
  technicianWorkload: TechnicianWorkloadRow[];
  dailyCapacityProfile?: Float32Array;
}): CapacityPoint[] {
  const timelineTotalDays = Math.max(1, args.timelineTotalDays);
  const capacityHours = new Float32Array(timelineTotalDays);
  const loadHours = new Float32Array(timelineTotalDays);
  const capacityProfile = resolveDailyCapacityProfile(
    args.technicianWorkload,
    args.dailyCapacityProfile,
  );
  const workOrderMap = new Map(args.workOrders.map((wo) => [String(wo._id), wo]));

  for (let i = 0; i < timelineTotalDays; i++) {
    const date = new Date(args.timelineStartMs + i * DAY_MS);
    const dayOfWeek = date.getDay();
    capacityHours[i] = capacityProfile[dayOfWeek] ?? 0;
  }

  for (const project of args.scheduledProjects) {
    if (["cancelled", "voided"].includes(project.workOrderStatus)) continue;

    const wo = workOrderMap.get(String(project.workOrderId));
    const totalHours = Math.max(
      0,
      wo?.remainingHours ?? wo?.effectiveEstimatedHours ?? 0,
    );

    const start = Math.floor((project.scheduledStartDate - args.timelineStartMs) / DAY_MS);
    const durationDays = Math.max(
      1,
      Math.ceil((project.promisedDeliveryDate - project.scheduledStartDate) / DAY_MS),
    );
    const end = start + durationDays;

    const effortByOffset = new Map<number, number>();
    for (const point of project.dailyEffort ?? []) {
      effortByOffset.set(point.dayOffset, Math.max(0, point.effortHours));
    }

    const nonWorkDays = new Set(project.nonWorkDays ?? []);
    const weights = new Array(durationDays).fill(1);
    let totalWeight = 0;
    for (let i = 0; i < durationDays; i++) {
      if (nonWorkDays.has(i)) {
        weights[i] = 0;
      } else if (effortByOffset.has(i)) {
        weights[i] = effortByOffset.get(i)!;
      }
      totalWeight += weights[i];
    }

    if (totalWeight <= 0) continue;

    const loopStart = Math.max(0, start);
    const loopEnd = Math.min(timelineTotalDays, end);
    for (let dayIndex = loopStart; dayIndex < loopEnd; dayIndex++) {
      const offset = dayIndex - start;
      const ratio = weights[offset] / totalWeight;
      loadHours[dayIndex] += ratio * totalHours;
    }
  }

  const points: CapacityPoint[] = new Array(timelineTotalDays);
  for (let i = 0; i < timelineTotalDays; i++) {
    const cap = capacityHours[i];
    const load = loadHours[i];
    points[i] = {
      day: i,
      capacity: cap,
      load,
      utilization: cap > 0 ? (load / cap) * 100 : load > 0 ? 100 : 0,
    };
  }

  return points;
}

export function summarizeCapacityPoints(
  points: CapacityPoint[],
  currentDayIndex: number,
  bufferPercent: number,
) {
  if (points.length === 0) {
    return {
      totalAvailableHours: 0,
      totalLoadHours: 0,
      utilizationPercent: 0,
      peakUtilization: 0,
      overloadedDayCount: 0,
      nearBufferDayCount: 0,
      current: {
        capacity: 0,
        load: 0,
        utilization: 0,
        isOverCapacity: false,
        isNearBuffer: false,
      },
    };
  }

  let totalAvailableHours = 0;
  let totalLoadHours = 0;
  let peakUtilization = 0;
  let overloadedDayCount = 0;
  let nearBufferDayCount = 0;

  for (const point of points) {
    totalAvailableHours += point.capacity;
    totalLoadHours += point.load;
    peakUtilization = Math.max(peakUtilization, point.utilization);
    if (point.load > point.capacity + 0.1) overloadedDayCount++;
    if (point.capacity > 0 && point.utilization > 100 - bufferPercent) {
      nearBufferDayCount++;
    }
  }

  const utilizationPercent =
    totalAvailableHours > 0 ? Math.round((totalLoadHours / totalAvailableHours) * 100) : 0;
  const clampedDay = Math.max(0, Math.min(currentDayIndex, points.length - 1));
  const currentPoint = points[clampedDay];

  return {
    totalAvailableHours,
    totalLoadHours,
    utilizationPercent,
    peakUtilization,
    overloadedDayCount,
    nearBufferDayCount,
    current: {
      capacity: currentPoint.capacity,
      load: currentPoint.load,
      utilization: currentPoint.utilization,
      isOverCapacity: currentPoint.load > currentPoint.capacity + 0.1,
      isNearBuffer:
        currentPoint.capacity > 0 && currentPoint.utilization > 100 - bufferPercent,
    },
  };
}
