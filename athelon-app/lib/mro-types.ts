/**
 * lib/mro-types.ts — Named types derived from Convex queries and the Athelon schema.
 *
 * Using named types (rather than inline ReturnType / typeof useQuery annotations)
 * makes function signatures readable and ensures type errors surface at the
 * definition site, not buried inside page components.
 *
 * TD-010 fix — Team A debt remediation 2026-02-24.
 */

import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

// ─── CloseReadinessReport ─────────────────────────────────────────────────────

/**
 * Raw return type of api.returnToService.getCloseReadinessReport.
 * May be `undefined` (Convex loading state) or `null` (work order not found).
 */
export type CloseReadinessReportRaw = FunctionReturnType<
  typeof api.returnToService.getCloseReadinessReport
>;

/**
 * A fully-loaded close-readiness report (null/undefined already narrowed out).
 *
 * Usage:
 *   const report = useQuery(api.returnToService.getCloseReadinessReport, ...);
 *   if (!report) return <Loading />;
 *   const preconditions = derivePreconditions(report, ...); // typed CloseReadinessReport
 */
export type CloseReadinessReport = NonNullable<CloseReadinessReportRaw>;
