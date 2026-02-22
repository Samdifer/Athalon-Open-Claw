/**
 * convex/auth.config.ts
 * Athelon — Convex JWT Authentication Configuration (Clerk provider)
 *
 * Author: Jonas Harker, DevOps / Platform
 * Date: 2026-02-22
 * Phase: 4 — Alpha Sprint
 *
 * CODEOWNERS: @athelon/jonas-harker
 *
 * This file configures which JWT providers Convex will trust. In Athelon's case,
 * the only trusted provider is Clerk.
 *
 * How it works:
 *   1. The browser obtains a Clerk session JWT using the "Convex" JWT template
 *      configured in the Clerk dashboard (see §4.1 of clerk-convex-auth-design.md).
 *   2. The ConvexProviderWithClerk component passes this token to the Convex
 *      WebSocket connection on every request.
 *   3. Convex's runtime validates the JWT signature against the JWKS endpoint
 *      at `{domain}/.well-known/jwks.json`.
 *   4. On validation success, `ctx.auth.getUserIdentity()` returns the decoded
 *      identity object. On failure it returns null.
 *
 * Environment variable:
 *   CLERK_JWT_ISSUER_DOMAIN
 *     Set in the Convex dashboard (NOT in Vercel — this is a Convex-side env var).
 *     Value format: https://<clerk-instance>.clerk.accounts.dev  (development)
 *                   https://<clerk-instance>.clerk.accounts.com  (production)
 *
 *     To find your issuer domain:
 *       Clerk Dashboard → JWT Templates → Convex → "Issuer" field
 *
 *     Development example:  https://comic-lemur-42.clerk.accounts.dev
 *     Production example:   https://clerk.athelon.app           (custom domain)
 *
 *   IMPORTANT: Use the exact domain from the Clerk dashboard including the scheme.
 *   Do not include a trailing slash. Do not include a path component.
 *
 * Clerk JWT Template (configure in Clerk Dashboard → JWT Templates → "Convex"):
 *
 *   Template name: convex
 *   Token lifetime: 60 seconds (short-lived; Convex SDK auto-refreshes)
 *   Signing algorithm: RS256
 *
 *   Claims:
 *   {
 *     "aud": "convex",
 *     "sub": "{{user.id}}",
 *     "email": "{{user.primary_email_address}}",
 *     "name": "{{user.full_name}}",
 *     "org_id": "{{org.id}}",
 *     "org_role": "{{org.role}}",
 *     "org_slug": "{{org.slug}}",
 *     "athelon_role": "{{org.public_metadata.athelon_role}}",
 *     "station_codes": "{{org.public_metadata.station_codes}}"
 *   }
 *
 *   The `athelon_role` claim carries the MRO role slug ("dom", "supervisor", etc.)
 *   stored in the Clerk organization's publicMetadata. This is a fast-path hint —
 *   Convex mutations always verify against the orgMemberships table, never against
 *   this claim alone. See: clerk-convex-auth-design.md §3.2 for the dual-storage rationale.
 *
 *   The `aud` claim MUST be "convex". This is how Convex distinguishes its tokens
 *   from other JWTs issued by the same Clerk instance (e.g., tokens for other APIs).
 *
 * Runtime behavior:
 *   The JWKS endpoint is fetched and cached by the Convex runtime. There is no
 *   need to configure the public key manually — Convex fetches it from:
 *     {CLERK_JWT_ISSUER_DOMAIN}/.well-known/jwks.json
 *
 * Multiple providers:
 *   This config supports one provider per entry in the `providers` array.
 *   If we ever add a machine-to-machine JWT provider (e.g., for Convex scheduled
 *   actions calling other services), add it here as a second entry with a different
 *   `applicationID`. The `applicationID` must match the `aud` claim in the token.
 *
 * @see https://docs.convex.dev/auth/clerk
 * @see https://docs.convex.dev/api/modules/server#authconfig
 */

/**
 * Convex v1 auth configuration.
 *
 * The shape of this export is validated by the Convex CLI at deploy time.
 * TypeScript type: { providers: Array<{ domain: string; applicationID: string }> }
 *
 * Do not rename this export — the Convex runtime expects the default export from
 * the file at the path configured in convex.json (default: convex/auth.config.ts).
 */
const authConfig = {
  providers: [
    {
      /**
       * The issuer domain for Clerk JWTs.
       *
       * This must match the `iss` claim in the JWT issued by Clerk.
       * Convex will fetch JWKS from: `${domain}/.well-known/jwks.json`
       *
       * Environment variable is read at runtime by the Convex backend —
       * NOT at build time. It is safe to rotate this without redeploying code;
       * only a Convex environment variable update + function restart is required.
       *
       * If this variable is missing, Convex will reject ALL authenticated requests
       * with "No matching auth provider" errors. Set it before any auth-gated
       * mutations are called.
       */
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN as string,

      /**
       * The expected `aud` (audience) claim in the JWT.
       *
       * Must match the audience configured in the Clerk JWT Template.
       * The Convex template convention is "convex" — do not change this
       * without also updating the JWT template in the Clerk dashboard.
       */
      applicationID: "convex",
    },
  ],
} as const;

export default authConfig;

/**
 * Type exported for use in test utilities that need to mock auth config.
 * convex-test can import this to understand the configured providers.
 */
export type AuthConfig = typeof authConfig;
