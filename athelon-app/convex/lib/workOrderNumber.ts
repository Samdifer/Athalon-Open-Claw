import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const WORK_ORDER_PREFIX = "WO";
const COUNTER_TYPE_PREFIX = "work_order";

function normalizeBaseIdentifier(rawValue: string): string | null {
  const lettersOnly = rawValue.toUpperCase().replace(/[^A-Z]/g, "");
  if (lettersOnly.length >= 3) return lettersOnly.slice(0, 3);
  if (lettersOnly.length === 2) return lettersOnly;
  return null;
}

function deriveFallbackBaseIdentifier(orgName: string): string {
  const words = orgName
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);

  if (words.length >= 2) {
    const initials = words.map((word) => word[0]).join("");
    if (initials.length >= 3) return initials.slice(0, 3);
    if (initials.length === 2) return initials;
  }

  return normalizeBaseIdentifier(orgName) ?? "ORG";
}

function parseWorkOrderSequenceForBase(
  workOrderNumber: string,
  baseIdentifier: string,
): number | null {
  const match = workOrderNumber
    .toUpperCase()
    .match(/^WO-([A-Z]{2,3})-([1-9][0-9]*)$/);
  if (!match) return null;
  if (match[1] !== baseIdentifier) return null;

  const sequence = Number(match[2]);
  if (!Number.isSafeInteger(sequence) || sequence < 1) return null;
  return sequence;
}

async function resolveBaseIdentifier(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
): Promise<string> {
  const locations = await ctx.db
    .query("shopLocations")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", organizationId),
    )
    .collect();

  const rankedLocations = [...locations].sort((a, b) => {
    const score = (loc: { isActive: boolean; isPrimary?: boolean }) =>
      (loc.isActive ? 2 : 0) + (loc.isPrimary ? 1 : 0);
    const scoreDiff = score(b) - score(a);
    if (scoreDiff !== 0) return scoreDiff;
    return a.createdAt - b.createdAt;
  });

  for (const location of rankedLocations) {
    const identifier = normalizeBaseIdentifier(location.code);
    if (identifier) return identifier;
  }

  const org = await ctx.db.get(organizationId);
  if (!org) {
    throw new Error(`Organization ${organizationId} not found.`);
  }
  return deriveFallbackBaseIdentifier(org.name);
}

async function seedCounterFromExistingWorkOrders(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  baseIdentifier: string,
): Promise<number> {
  const existingWorkOrders = await ctx.db
    .query("workOrders")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", organizationId),
    )
    .collect();

  let maxSequence = 0;
  for (const workOrder of existingWorkOrders) {
    const parsed = parseWorkOrderSequenceForBase(
      workOrder.workOrderNumber,
      baseIdentifier,
    );
    if (parsed !== null && parsed > maxSequence) {
      maxSequence = parsed;
    }
  }
  return maxSequence;
}

/**
 * Reserves and returns the next work order number for an organization.
 * Format: WO-{BASE}-{N}, where BASE is 2-3 letters and N is unpadded.
 */
export async function reserveNextWorkOrderNumber(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
): Promise<string> {
  const baseIdentifier = await resolveBaseIdentifier(ctx, organizationId);
  const counterType = `${COUNTER_TYPE_PREFIX}:${baseIdentifier}`;

  let counter = await ctx.db
    .query("orgCounters")
    .withIndex("by_org_type", (q) =>
      q.eq("orgId", organizationId).eq("counterType", counterType),
    )
    .first();

  let counterId: Id<"orgCounters">;
  let lastValue: number;

  if (counter === null) {
    const seededLastValue = await seedCounterFromExistingWorkOrders(
      ctx,
      organizationId,
      baseIdentifier,
    );
    counterId = await ctx.db.insert("orgCounters", {
      orgId: organizationId,
      counterType,
      lastValue: seededLastValue,
    });
    lastValue = seededLastValue;
  } else {
    counterId = counter._id;
    lastValue = counter.lastValue;
  }

  // Defensive collision loop in case legacy data or concurrent writers produced a conflict.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const nextValue: number = lastValue + 1;
    await ctx.db.patch(counterId, { lastValue: nextValue });

    const candidateNumber = `${WORK_ORDER_PREFIX}-${baseIdentifier}-${nextValue}`;
    const collision = await ctx.db
      .query("workOrders")
      .withIndex("by_number", (q) =>
        q.eq("organizationId", organizationId).eq("workOrderNumber", candidateNumber),
      )
      .first();

    if (collision === null) {
      return candidateNumber;
    }

    lastValue = nextValue;
  }

  throw new Error(
    `Unable to reserve a unique work order number for base ${baseIdentifier}.`,
  );
}
