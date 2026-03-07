/**
 * sales-dashboard-metrics.test.mjs
 *
 * Guard tests for Sales Dashboard calculation helpers:
 *  - LTV formula and division safety (annualChurnRate = 0)
 *  - CAC formula: division safety when newCustomers = 0
 *  - LTV:CAC ratio and division safety (actualCAC = 0)
 *  - Projected EBITDA = revenue × (grossMargin − overhead)
 *  - newCustomers resolution: wonDeals first, pipeline fallback (no forced min=1)
 *  - qualityScore: division guards (min > 0, coverageChecks.length > 0)
 *
 * Replicates the logic from app/(app)/sales/dashboard/page.tsx.
 * Run with: node --test scripts/sales-ops/sales-dashboard-metrics.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── Replicated constants (keep in sync with page.tsx DEFAULTS) ─────────────

const DEFAULTS = {
  grossMarginPct: 0.42,
  overheadPct: 0.24,
  churnAnnualPct: 0.2,
  closeRate: 0.28,
  salesCycleMonths: 3,
};

// ─── Replicated helpers (keep in sync with page.tsx) ────────────────────────

/**
 * Compute annualised LTV.
 * Guard: returns 0 when churnRate is 0 (avoid division by zero).
 */
function computeLtv(avgWonDealSize, grossMargin, annualChurnRate) {
  return annualChurnRate > 0 ? (avgWonDealSize * grossMargin) / annualChurnRate : 0;
}

/**
 * Compute CAC from quote-proxy spend and new-customer count.
 * Guard: returns 0 when newCustomers is 0 (no denominator).
 */
function computeCac(quoteProxySpend, newCustomers) {
  return newCustomers > 0 ? quoteProxySpend / newCustomers : 0;
}

/**
 * Compute LTV:CAC ratio.
 * Guard: returns 0 when actualCAC is 0 (avoid division by zero).
 */
function computeLtvCac(ltv, cac) {
  return cac > 0 ? ltv / cac : 0;
}

/**
 * Compute projected EBITDA.
 * Formula: revenue × (grossMargin − overhead)
 */
function computeProjectedEbitda(projectedRevenue, grossMargin, overhead) {
  return projectedRevenue * (grossMargin - overhead);
}

/**
 * Resolve newCustomers count.
 * Uses won deals first; falls back to projected wins from active pipeline.
 * NOTE: does NOT force Math.max(1, ...) — zero is a valid answer.
 */
function resolveNewCustomers(wonDealCount, activeOpportunities, closeRate) {
  return wonDealCount || Math.round(activeOpportunities * closeRate);
}

/**
 * Compute quality score from coverage checks.
 * Guards: check.min=0 treated as fully satisfied; coverageChecks.length=0 → 100.
 */
function computeQualityScore(coverageChecks) {
  if (coverageChecks.length === 0) return 100;
  const sum = coverageChecks.reduce(
    (acc, check) => acc + Math.min(1, check.min > 0 ? check.count / check.min : 1),
    0,
  );
  return Math.round((sum / coverageChecks.length) * 100);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("LTV formula", () => {
  it("standard case: (dealSize × margin) / churn", () => {
    const ltv = computeLtv(50_000, DEFAULTS.grossMarginPct, DEFAULTS.churnAnnualPct);
    // (50000 × 0.42) / 0.20 = 105,000
    assert.strictEqual(ltv, 105_000);
  });

  it("zero churn rate returns 0 (division safety)", () => {
    const ltv = computeLtv(50_000, DEFAULTS.grossMarginPct, 0);
    assert.strictEqual(ltv, 0);
  });

  it("zero deal size yields LTV = 0", () => {
    assert.strictEqual(computeLtv(0, DEFAULTS.grossMarginPct, DEFAULTS.churnAnnualPct), 0);
  });

  it("zero margin yields LTV = 0", () => {
    assert.strictEqual(computeLtv(50_000, 0, DEFAULTS.churnAnnualPct), 0);
  });
});

describe("CAC formula", () => {
  it("standard case: proxySpend / customers", () => {
    const cac = computeCac(10_000, 5);
    assert.strictEqual(cac, 2_000);
  });

  it("zero new customers returns 0 (division safety)", () => {
    assert.strictEqual(computeCac(10_000, 0), 0);
  });

  it("zero spend yields CAC = 0", () => {
    assert.strictEqual(computeCac(0, 5), 0);
  });
});

describe("LTV:CAC ratio", () => {
  it("standard: ltv / cac", () => {
    const ratio = computeLtvCac(105_000, 2_000);
    assert.strictEqual(ratio, 52.5);
  });

  it("zero CAC returns 0 (division safety)", () => {
    assert.strictEqual(computeLtvCac(105_000, 0), 0);
  });

  it("both zero returns 0", () => {
    assert.strictEqual(computeLtvCac(0, 0), 0);
  });
});

describe("Projected EBITDA", () => {
  it("standard: revenue × (margin − overhead)", () => {
    const ebitda = computeProjectedEbitda(1_000_000, DEFAULTS.grossMarginPct, DEFAULTS.overheadPct);
    // 1_000_000 × (0.42 − 0.24) = 1_000_000 × 0.18 = 180_000
    assert.ok(Math.abs(ebitda - 180_000) < 0.01, `Expected ~180000, got ${ebitda}`);
  });

  it("when margin equals overhead EBITDA is zero", () => {
    assert.strictEqual(computeProjectedEbitda(1_000_000, 0.24, 0.24), 0);
  });

  it("zero revenue yields zero EBITDA", () => {
    assert.strictEqual(computeProjectedEbitda(0, DEFAULTS.grossMarginPct, DEFAULTS.overheadPct), 0);
  });

  it("overhead exceeding margin yields negative EBITDA", () => {
    const ebitda = computeProjectedEbitda(500_000, 0.15, 0.30);
    // 500_000 × (0.15 − 0.30) = −75_000
    assert.ok(Math.abs(ebitda - -75_000) < 0.01, `Expected −75000, got ${ebitda}`);
  });
});

describe("newCustomers resolution (no forced min=1)", () => {
  it("uses won deal count when available", () => {
    assert.strictEqual(resolveNewCustomers(7, 20, DEFAULTS.closeRate), 7);
  });

  it("falls back to projected wins when won deals = 0", () => {
    // Math.round(20 × 0.28) = Math.round(5.6) = 6
    assert.strictEqual(resolveNewCustomers(0, 20, DEFAULTS.closeRate), 6);
  });

  it("returns 0 when both won deals and pipeline are 0", () => {
    // Bug guard: must NOT be forced to 1 — CAC should show $0 in this case
    assert.strictEqual(resolveNewCustomers(0, 0, DEFAULTS.closeRate), 0);
  });

  it("CAC is $0 when newCustomers resolves to 0", () => {
    const newCustomers = resolveNewCustomers(0, 0, DEFAULTS.closeRate);
    const cac = computeCac(5_000, newCustomers);
    assert.strictEqual(cac, 0);
  });
});

describe("qualityScore computation", () => {
  it("all checks fully met returns 100", () => {
    const checks = [
      { name: "Opportunities", count: 5, min: 3 },
      { name: "Quotes", count: 4, min: 3 },
      { name: "Invoices", count: 6, min: 3 },
      { name: "Assigned deal owner", count: 3, min: 1 },
    ];
    assert.strictEqual(computeQualityScore(checks), 100);
  });

  it("all checks empty returns 0", () => {
    const checks = [
      { name: "Opportunities", count: 0, min: 3 },
      { name: "Quotes", count: 0, min: 3 },
      { name: "Invoices", count: 0, min: 3 },
      { name: "Assigned deal owner", count: 0, min: 1 },
    ];
    assert.strictEqual(computeQualityScore(checks), 0);
  });

  it("partial coverage computes proportional score", () => {
    const checks = [
      { name: "Opportunities", count: 3, min: 3 },  // 100%
      { name: "Quotes", count: 0, min: 3 },          // 0%
      { name: "Invoices", count: 0, min: 3 },         // 0%
      { name: "Assigned deal owner", count: 1, min: 1 }, // 100%
    ];
    // (1 + 0 + 0 + 1) / 4 = 0.5 → 50
    assert.strictEqual(computeQualityScore(checks), 50);
  });

  it("check.min = 0 is treated as fully satisfied (no div-by-zero)", () => {
    const checks = [
      { name: "Anything", count: 0, min: 0 },
    ];
    // min=0 → treated as 1 (satisfied) → score = 100
    assert.strictEqual(computeQualityScore(checks), 100);
  });

  it("empty coverageChecks array returns 100 (no div-by-zero)", () => {
    assert.strictEqual(computeQualityScore([]), 100);
  });
});
