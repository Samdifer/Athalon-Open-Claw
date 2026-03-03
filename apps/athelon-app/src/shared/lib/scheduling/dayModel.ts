type DailyEffortRow = {
  dayOffset: number;
  effortHours: number;
};

export type DayModel = {
  dailyEffortHours: number[];
  nonWorkDays: number[];
};

type DayModelInput = {
  durationDays: number;
  totalHours: number;
  dailyEffort: DailyEffortRow[] | undefined;
  nonWorkDays: number[] | undefined;
};

type BlockToggleInput = DayModelInput & {
  dayOffset: number;
};

type DistributeInput = DayModelInput & {
  dayOffset: number;
  deltaHours: number;
};

const MIN_DAY_COUNT = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function safeDuration(durationDays: number): number {
  if (!Number.isFinite(durationDays)) return MIN_DAY_COUNT;
  return Math.max(MIN_DAY_COUNT, Math.floor(durationDays));
}

function safeTotalHours(totalHours: number): number {
  if (!Number.isFinite(totalHours)) return 0;
  return Math.max(0, totalHours);
}

function normalizeNonWorkDays(raw: number[] | undefined, durationDays: number): number[] {
  const unique = new Set<number>();
  for (const value of raw ?? []) {
    const normalized = Math.floor(value);
    if (normalized >= 0 && normalized < durationDays) {
      unique.add(normalized);
    }
  }
  const sorted = Array.from(unique).sort((a, b) => a - b);
  if (sorted.length >= durationDays) {
    return sorted.slice(0, durationDays - 1);
  }
  return sorted;
}

function rebalanceEffort(
  dailyEffortHours: number[],
  nonWorkDays: Set<number>,
  totalHours: number,
): DayModel {
  const dayCount = Math.max(MIN_DAY_COUNT, dailyEffortHours.length);
  const activeDays = Array.from({ length: dayCount }, (_, i) => i).filter(
    (idx) => !nonWorkDays.has(idx),
  );
  if (activeDays.length === 0) {
    nonWorkDays.clear();
    activeDays.push(...Array.from({ length: dayCount }, (_, i) => i));
  }

  const targetTotal = safeTotalHours(totalHours);
  const next = new Array(dayCount).fill(0);
  for (const idx of activeDays) {
    next[idx] = Math.max(0, dailyEffortHours[idx] ?? 0);
  }

  if (targetTotal > 0) {
    const currentTotal = activeDays.reduce((sum, idx) => sum + next[idx], 0);
    if (currentTotal <= 0) {
      const even = targetTotal / activeDays.length;
      for (const idx of activeDays) {
        next[idx] = even;
      }
    } else {
      const scale = targetTotal / currentTotal;
      for (const idx of activeDays) {
        next[idx] = next[idx] * scale;
      }
    }
  } else {
    for (const idx of activeDays) {
      next[idx] = 0;
    }
  }

  const rounded = next.map((hours) => roundHours(hours));
  const roundedTotal = activeDays.reduce((sum, idx) => sum + rounded[idx], 0);
  const drift = roundHours(targetTotal - roundedTotal);
  if (Math.abs(drift) > 0.009 && activeDays.length > 0) {
    const first = activeDays[0];
    rounded[first] = roundHours(Math.max(0, rounded[first] + drift));
  }

  for (const idx of nonWorkDays) {
    rounded[idx] = 0;
  }

  return {
    dailyEffortHours: rounded,
    nonWorkDays: Array.from(nonWorkDays).sort((a, b) => a - b),
  };
}

export function buildNormalizedDayModel(input: DayModelInput): DayModel {
  const durationDays = safeDuration(input.durationDays);
  const targetTotal = safeTotalHours(input.totalHours);
  const nonWorkDays = normalizeNonWorkDays(input.nonWorkDays, durationDays);
  const nonWorkSet = new Set<number>(nonWorkDays);

  const seeded = new Array(durationDays).fill(0);
  for (const row of input.dailyEffort ?? []) {
    if (!Number.isFinite(row.dayOffset) || !Number.isFinite(row.effortHours)) continue;
    const dayOffset = Math.floor(row.dayOffset);
    if (dayOffset < 0 || dayOffset >= durationDays || nonWorkSet.has(dayOffset)) continue;
    seeded[dayOffset] = Math.max(0, row.effortHours);
  }

  return rebalanceEffort(seeded, nonWorkSet, targetTotal);
}

export function toggleBlockedDay(input: BlockToggleInput): DayModel {
  const durationDays = safeDuration(input.durationDays);
  const safeOffset = clamp(Math.floor(input.dayOffset), 0, durationDays - 1);

  const base = buildNormalizedDayModel(input);
  const nonWorkSet = new Set<number>(base.nonWorkDays);

  if (nonWorkSet.has(safeOffset)) {
    nonWorkSet.delete(safeOffset);
  } else {
    if (nonWorkSet.size >= durationDays - 1) {
      return base;
    }
    nonWorkSet.add(safeOffset);
  }

  return rebalanceEffort(base.dailyEffortHours, nonWorkSet, input.totalHours);
}

export function applyDistributeStep(input: DistributeInput): DayModel {
  const durationDays = safeDuration(input.durationDays);
  const safeOffset = clamp(Math.floor(input.dayOffset), 0, durationDays - 1);
  const targetTotal = safeTotalHours(input.totalHours);
  const deltaHours = Number.isFinite(input.deltaHours) ? input.deltaHours : 0;

  const base = buildNormalizedDayModel(input);
  const nonWorkSet = new Set<number>(base.nonWorkDays);
  nonWorkSet.delete(safeOffset);

  const daily = [...base.dailyEffortHours];
  for (const idx of nonWorkSet) {
    daily[idx] = 0;
  }

  const activeDays = Array.from({ length: durationDays }, (_, i) => i).filter(
    (idx) => !nonWorkSet.has(idx),
  );

  if (activeDays.length === 0) {
    nonWorkSet.clear();
    activeDays.push(...Array.from({ length: durationDays }, (_, i) => i));
  }

  if (targetTotal <= 0) {
    return rebalanceEffort(daily, nonWorkSet, 0);
  }

  const currentTarget = daily[safeOffset] ?? 0;
  const desiredTarget = clamp(currentTarget + deltaHours, 0, targetTotal);
  const otherDays = activeDays.filter((idx) => idx !== safeOffset);

  daily[safeOffset] = desiredTarget;
  if (otherDays.length === 0) {
    daily[safeOffset] = targetTotal;
  } else {
    const remainingTotal = Math.max(0, targetTotal - desiredTarget);
    const otherCurrentTotal = otherDays.reduce((sum, idx) => sum + (daily[idx] ?? 0), 0);

    if (remainingTotal <= 0) {
      for (const idx of otherDays) {
        daily[idx] = 0;
      }
    } else if (otherCurrentTotal <= 0) {
      const even = remainingTotal / otherDays.length;
      for (const idx of otherDays) {
        daily[idx] = even;
      }
    } else {
      const scale = remainingTotal / otherCurrentTotal;
      for (const idx of otherDays) {
        daily[idx] = Math.max(0, (daily[idx] ?? 0) * scale);
      }
    }
  }

  return rebalanceEffort(daily, nonWorkSet, targetTotal);
}

export function toDailyEffortRows(model: DayModel): DailyEffortRow[] {
  const nonWorkSet = new Set(model.nonWorkDays);
  return model.dailyEffortHours
    .map((effortHours, dayOffset) => ({
      dayOffset,
      effortHours: roundHours(Math.max(0, effortHours)),
    }))
    .filter((row) => !nonWorkSet.has(row.dayOffset));
}
