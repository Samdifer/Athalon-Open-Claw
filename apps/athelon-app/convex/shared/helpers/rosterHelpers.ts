import type { Id } from "../../_generated/dataModel";

export const SUPERVISOR_ROLES = new Set([
  "lead_technician",
  "shop_manager",
  "admin",
]);

export type ShiftLike = {
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
};

export type EffectiveShiftSource =
  | "technician_override"
  | "team_shift"
  | "org_default";

export function isSupervisorRole(role?: string): boolean {
  return role !== undefined && SUPERVISOR_ROLES.has(role);
}

export function isShiftActive(
  shift: { effectiveTo?: number },
  nowMs: number,
): boolean {
  return shift.effectiveTo === undefined || shift.effectiveTo > nowMs;
}

export function resolveEffectiveShift(args: {
  technicianShift?: ShiftLike;
  teamShift?: ShiftLike;
  defaultShift: ShiftLike;
}): ShiftLike & {
  source: EffectiveShiftSource;
  usingDefaultShift: boolean;
  usingTeamShift: boolean;
} {
  if (args.technicianShift) {
    return {
      ...args.technicianShift,
      source: "technician_override",
      usingDefaultShift: false,
      usingTeamShift: false,
    };
  }

  if (args.teamShift) {
    return {
      ...args.teamShift,
      source: "team_shift",
      usingDefaultShift: false,
      usingTeamShift: true,
    };
  }

  return {
    ...args.defaultShift,
    source: "org_default",
    usingDefaultShift: true,
    usingTeamShift: false,
  };
}

export function dateKeyFromMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function msFromDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Invalid dateKey: ${dateKey}`);
  }
  return new Date(y, m - 1, d).getTime();
}

export function isDateKeyWithinRange(
  dateKey: string,
  startMs: number,
  endMs: number,
): boolean {
  const dayMs = msFromDateKey(dateKey);
  return dayMs >= startMs && dayMs <= endMs;
}

export async function ensureShopLocationBelongsToOrg(
  ctx: { db: { get: (id: Id<"shopLocations">) => Promise<any> } },
  organizationId: Id<"organizations">,
  shopLocationId: Id<"shopLocations">,
) {
  const location = await ctx.db.get(shopLocationId);
  if (!location || location.organizationId !== organizationId) {
    throw new Error("Shop location does not belong to this organization");
  }
}
