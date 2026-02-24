// convex/lib/authHelpers.ts
// Athelon — Aviation MRO SaaS Platform
//
// Shared authentication helper extracted to avoid duplication across
// billing.ts, vendors.ts, timeClock.ts, and pricing.ts.

/**
 * Asserts that the request has a valid Clerk session and returns the
 * caller's subject (Clerk user ID). Throws UNAUTHENTICATED if not.
 */
export async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("UNAUTHENTICATED: Valid Clerk session required.");
  }
  return identity.subject;
}
