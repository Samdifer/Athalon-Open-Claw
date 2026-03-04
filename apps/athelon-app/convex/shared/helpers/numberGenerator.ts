// convex/lib/numberGenerator.ts
// Athelon — Aviation MRO SaaS Platform
//
// Atomic org-scoped sequential number generator using the orgCounters table.
// Replaces the legacy scan-based generateUniqueNumber() in billing.ts.
//
// Design:
//   - Each counter is a single orgCounters document keyed by (orgId, counterType).
//   - On first use, the document is created with lastValue = 1 (INV-0001, etc.).
//   - On subsequent uses, lastValue is incremented atomically via ctx.db.patch.
//   - Because Convex mutations are serialized within an org's document set,
//     concurrent mutations cannot produce the same counter value.

import type { MutationCtx } from "../../_generated/server";

/**
 * Returns the next formatted number for the given org and counter type.
 *
 * @param ctx         - Convex mutation context
 * @param orgId       - Organization ID string (stringified)
 * @param counterType - "invoice" | "quote" | "po"
 * @param prefix      - Prefix string, e.g. "INV", "Q", "PO"
 * @returns           - Formatted number, e.g. "INV-0042"
 *
 * @example
 *   const invoiceNumber = await getNextNumber(ctx, orgId, "invoice", "INV");
 *   // → "INV-0001" (first), "INV-0002" (second), etc.
 */
export async function getNextNumber(
  ctx: MutationCtx,
  orgId: string,
  counterType: string,
  prefix: string,
): Promise<string> {
  const existing = await ctx.db
    .query("orgCounters")
    .withIndex("by_org_type", (q) =>
      q.eq("orgId", orgId).eq("counterType", counterType),
    )
    .first();

  let newValue: number;

  if (existing === null) {
    // First number for this org/type — start at 1
    newValue = 1;
    await ctx.db.insert("orgCounters", {
      orgId,
      counterType,
      lastValue: newValue,
    });
  } else {
    newValue = existing.lastValue + 1;
    await ctx.db.patch(existing._id, { lastValue: newValue });
  }

  return `${prefix}-${String(newValue).padStart(4, "0")}`;
}
