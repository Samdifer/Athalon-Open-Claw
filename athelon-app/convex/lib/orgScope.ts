/**
 * orgScope.ts — Organization scoping convention
 *
 * CONVENTION:
 * - Billing tables (v2+) use `orgId` as the field name
 * - Core tables (v1) use `organizationId` as the field name
 * - Both reference `v.id("organizations")`
 *
 * This file provides shared validators and helpers so all new code
 * uses a consistent pattern regardless of the underlying field name.
 *
 * MIGRATION NOTE:
 * Renaming schema fields in Convex requires a full migration (new table + copy).
 * Until that's done, this adapter layer handles the inconsistency.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

/**
 * Standard organization ID validator for mutation/query args.
 * All new public functions should use this.
 */
export const orgIdArg = {
  organizationId: v.id("organizations"),
} as const;

/**
 * Get the org ID from a document, handling both field names.
 */
export function getOrgId(
  doc: { orgId?: Id<"organizations">; organizationId?: Id<"organizations"> },
): Id<"organizations"> | undefined {
  return doc.orgId ?? doc.organizationId;
}

/**
 * Verify a document belongs to the expected organization.
 * Works with both orgId and organizationId field names.
 */
export function assertOrgMatch(
  doc: { orgId?: Id<"organizations">; organizationId?: Id<"organizations"> },
  expectedOrgId: Id<"organizations">,
  docLabel: string,
): void {
  const docOrgId = doc.orgId ?? doc.organizationId;
  if (docOrgId !== expectedOrgId) {
    throw new Error(
      `ORG_MISMATCH: ${docLabel} does not belong to organization ${expectedOrgId}.`,
    );
  }
}
