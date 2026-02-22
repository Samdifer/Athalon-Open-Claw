/**
 * apps/web/middleware.ts
 * Athelon — Next.js Edge Middleware (Clerk authentication + org context)
 *
 * Author: Jonas Harker, DevOps / Platform
 * Date: 2026-02-22
 * Phase: 4 — Alpha Sprint
 *
 * CODEOWNERS: @athelon/jonas-harker
 * Place this file at: apps/web/middleware.ts (Next.js App Router root)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 * ─────────────────────────────────────────────────────────────────────────────
 * This middleware runs on every request at the Vercel Edge network layer before
 * any page or route handler executes. It handles three concerns:
 *
 *   1. AUTHENTICATION GATE — Protect all (app)/* routes. Redirect unauthenticated
 *      users to /sign-in with a return URL so they land back where they were.
 *
 *   2. ORG CONTEXT ENFORCEMENT — After authentication, ensure the user has an
 *      active Clerk organization selected. If they're authenticated but have no
 *      active org (e.g., they've just signed up and haven't been assigned to a
 *      station yet), redirect to /onboarding.
 *
 *   3. PUBLIC ROUTE ALLOWLIST — Let through public routes without auth:
 *      - / (marketing landing page)
 *      - /sign-in and /sign-up (Clerk hosted auth pages)
 *      - /api/webhooks/* (Clerk pushes here — cannot authenticate as a user)
 *      - /health (uptime monitor endpoint — returns 200 with no auth)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY MODEL (read before modifying)
 * ─────────────────────────────────────────────────────────────────────────────
 * This middleware is a UX gate, NOT a security control.
 *
 * Per clerk-convex-auth-design.md §1:
 *   "Security happens in Convex. The frontend guards are for user experience."
 *
 * A malicious actor who bypasses this middleware — by crafting requests that
 * skip the edge layer — still cannot access org data because every Convex
 * mutation and query calls requireAuth() + requireOrgContext() server-side.
 * The Convex backend is the real security boundary.
 *
 * This middleware prevents:
 *   - Accidental exposure of authenticated pages to crawlers and unauthenticated
 *     users (UX, SEO protection)
 *   - "Broken" states where the user sees an authenticated shell with empty data
 *     because they have no org context (UX, prevents confusing blank-state bugs)
 *
 * This middleware does NOT prevent:
 *   - Unauthorized data access (Convex enforces that)
 *   - Cross-org data leakage (Convex enforces that via org-scoped queries)
 *   - Expired session attacks (Clerk + Convex enforce that)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ORG CONTEXT REDIRECTS
 * ─────────────────────────────────────────────────────────────────────────────
 * Clerk's auth() helper exposes orgId from the active organization in the session.
 * If the user is authenticated but orgId is null:
 *
 *   Case A — New user, no org membership yet:
 *     They signed up but haven't been invited to a station yet.
 *     → Redirect to /onboarding (informational page: "Your account is pending
 *       station assignment. Contact your DOM.")
 *
 *   Case B — User who belongs to orgs but hasn't selected one:
 *     Clerk session can be authenticated without an active org if the user's
 *     last session had no org selected (rare, but possible on new devices).
 *     → Redirect to /select-station (org picker page using Clerk's org switcher)
 *
 * The middleware checks orgId null status. If the target route is already
 * /onboarding or /select-station, we don't redirect again (loop prevention).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPENDENCIES
 * ─────────────────────────────────────────────────────────────────────────────
 * @clerk/nextjs >= 5.0.0 (clerkMiddleware is the v5 API; older versions use
 * authMiddleware which is deprecated)
 *
 * Required environment variables (set in Vercel for each environment):
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — Browser-safe Clerk publishable key
 *   CLERK_SECRET_KEY                  — Server-side Clerk secret key
 *
 * Optional (for custom domain Clerk instances):
 *   CLERK_DOMAIN                      — Custom Clerk domain (athelon.app/auth)
 *   NEXT_PUBLIC_CLERK_SIGN_IN_URL     — Custom sign-in URL override
 *   NEXT_PUBLIC_CLERK_SIGN_UP_URL     — Custom sign-up URL override
 *   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL — Post sign-in redirect
 *   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL — Post sign-up redirect
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE MATCHERS
// These are evaluated on every request by the middleware. Keep them cheap —
// they run at the edge on every single request, including static assets if the
// matcher config is too broad (see config.matcher below).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public routes — no authentication required.
 *
 * Pattern notes:
 *   - "(.*)" suffix: matches the route and all sub-paths
 *   - "/sign-in(.*)" catches /sign-in, /sign-in/factor-one, /sign-in/sso-callback, etc.
 *   - "/api/webhooks/(.*)" catches all webhook receivers (Clerk, Stripe, etc.)
 *     These MUST be public — Clerk pushes webhook payloads here without user auth.
 *   - "/health" — simple liveness endpoint for uptime monitors (Better Stack)
 *   - "/" — landing page (marketing). Authenticated users who land here are
 *     redirected to /dashboard by the page component itself (not middleware).
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",
  "/health",
]);

/**
 * Org-required routes — authenticated but also require an active org context.
 *
 * All routes under /dashboard, /work-orders, /aircraft, /parts, /compliance,
 * /reports, and /settings require an active station (org) to render usefully.
 * Without an org, Convex queries return no data and the UI would be blank.
 *
 * Routes explicitly excluded from org requirement:
 *   - /onboarding — shown when user has no org membership
 *   - /select-station — shown when user has orgs but none active
 *   - /account — user profile settings (not org-specific)
 */
const isOrgRequiredRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/work-orders(.*)",
  "/aircraft(.*)",
  "/parts(.*)",
  "/compliance(.*)",
  "/reports(.*)",
  "/settings(.*)",
]);

/**
 * Routes that are safe after auth but before org selection.
 * Authenticated users on these routes do NOT get redirected to /select-station.
 */
const isOrgExemptRoute = createRouteMatcher([
  "/onboarding(.*)",
  "/select-station(.*)",
  "/account(.*)",
]);

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // ── Step 1: Allow public routes through without any auth check ──────────────
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // ── Step 2: Protect all non-public routes ────────────────────────────────
  // auth().protect() redirects unauthenticated users to the configured sign-in
  // URL (NEXT_PUBLIC_CLERK_SIGN_IN_URL or /sign-in by default) with a
  // `redirect_url` parameter pointing back to the current page.
  //
  // If the user IS authenticated, protect() is a no-op and execution continues.
  // If the user is NOT authenticated, protect() throws a redirect — middleware
  // execution stops here for unauthenticated requests.
  const { userId, orgId } = await auth.protect();

  // ── Step 3: Org context enforcement for org-required routes ─────────────
  // At this point the user is authenticated (userId is non-null).
  // If the route requires an org and the user has no active org, redirect.
  if (isOrgRequiredRoute(req) && !isOrgExemptRoute(req)) {
    if (!orgId) {
      // Determine where to send them:
      //   /select-station — if they have org memberships but none is active
      //   /onboarding     — if they have no org memberships at all (new users)
      //
      // We can't determine org membership count here without a DB call, which
      // would be too slow for edge middleware. Instead, we always redirect to
      // /select-station and let that page route them to /onboarding if needed.
      // The /select-station page can make a Convex query to check membership count.
      const url = req.nextUrl.clone();
      url.pathname = "/select-station";
      // Preserve the originally-intended destination so we can redirect after
      // org selection. The select-station page reads this param.
      url.searchParams.set("redirect_url", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  // ── Step 4: Pass through — authenticated, org context present (or not required) ──
  return NextResponse.next();
});

// ─────────────────────────────────────────────────────────────────────────────
// MATCHER CONFIG
// ─────────────────────────────────────────────────────────────────────────────
/**
 * The matcher controls which requests reach this middleware at all.
 *
 * Pattern 1: Exclude Next.js internals and all static files. This prevents the
 * middleware from running on /_next/static/*, /_next/image/*, /favicon.ico, etc.
 * which would add unnecessary latency to every static asset request.
 *
 * The negative lookahead `(?!_next|[^?]*\\.(...))` excludes:
 *   - _next directory (Next.js build output)
 *   - Files with common static extensions (.html, .css, .js, .jpg, etc.)
 *
 * Pattern 2: Always run on /api/* and /trpc/* regardless of extension, because
 * API routes need auth enforcement even if they happen to have a file extension.
 *
 * IMPORTANT: The /api/webhooks/(.*) routes ARE matched by this config, but the
 * isPublicRoute() check at the top of the middleware lets them through. Do not
 * move webhook routes out of the matcher — they still need Clerk to run for
 * proper request context setup, even though they don't need user auth.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - Files with extensions: html, css, js/json, images, fonts, documents
     *   (indicated by \\.(?:html?|css|js(?!on)|...)
     */
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    /*
     * Always run for API and tRPC routes (they may not have extensions but
     * still need middleware auth enforcement).
     */
    "/(api|trpc)(.*)",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPER NOTES
// ─────────────────────────────────────────────────────────────────────────────
//
// Q: Why clerkMiddleware() and not authMiddleware()?
// A: authMiddleware() is deprecated as of @clerk/nextjs v5. clerkMiddleware() is
//    the current API. It separates route matching (createRouteMatcher) from auth
//    logic, which is more composable and easier to test.
//
// Q: Why does auth.protect() throw instead of returning null?
// A: By throwing a redirect, Clerk ensures there's no code path where a developer
//    forgets to check the return value and accidentally serves protected content.
//    The redirect is handled by Clerk's internal error boundary in Next.js.
//
// Q: Can I add custom headers to auth'd responses?
// A: Yes. Replace the final `return NextResponse.next()` with:
//      const response = NextResponse.next();
//      response.headers.set("X-Athelon-Org", orgId ?? "none");
//      return response;
//    Useful for debugging in production when you can see response headers.
//    Do NOT put sensitive data (user IDs, email) in response headers.
//
// Q: How do I test this middleware locally?
// A: The Clerk SDK reads from environment variables. With a valid .env.local
//    containing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY,
//    middleware runs correctly in `pnpm dev`. Use the Clerk dashboard's
//    "Users" section to create test accounts and org memberships.
//    For unit tests, see: apps/web/__tests__/middleware.test.ts
//    (uses next-test-utils to invoke middleware with mock requests)
//
// Q: What happens to /api/webhooks/clerk if Clerk tries to sign it?
// A: It can't — the webhook uses svix signature verification (HMAC), not JWT auth.
//    Clerk doesn't issue a user JWT for its outbound webhooks. This is why /api/webhooks/*
//    must be public: the isPublicRoute() check lets it through before auth.protect()
//    would reject it as unauthenticated.
//
// Q: Do I need to worry about CSRF?
// A: Clerk handles CSRF protection for its own endpoints. For our Next.js API
//    route handlers (route.ts files), Next.js App Router enforces same-origin
//    for mutating requests by default. The webhook endpoint is HMAC-validated
//    (svix), which is stronger than CSRF protection for server-to-server calls.
