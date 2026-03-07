/**
 * sales-ops-bucketing.test.mjs
 *
 * Guard tests for Sales Ops pipeline bucketing logic, quote status mapping,
 * owner resolution, and edge cases.
 *
 * Run with: node --test scripts/sales-ops/sales-ops-bucketing.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── Replicated logic (keep in sync with app/(app)/sales/ops/page.tsx) ───────

const PIPELINE_BUCKETS = [
  { key: "draft",      statuses: ["DRAFT"] },
  { key: "in-process", statuses: ["SENT", "APPROVED"] },
  { key: "closed",     statuses: ["CONVERTED", "DECLINED"] },
];

const STATUS_LABELS = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
  CONVERTED: "Converted",
  DECLINED: "Declined",
};

/** Bucket quotes exactly as SalesOpsPage does */
function bucketQuotes(quotes) {
  return PIPELINE_BUCKETS.map((bucket) => ({
    ...bucket,
    items: quotes.filter((q) => bucket.statuses.includes(q.status)),
  }));
}

/** Resolve owner display name, falling back to "Unassigned" */
function resolveOwner(techId, technicianMap) {
  if (!techId) return "Unassigned";
  return technicianMap.get(String(techId)) ?? "Unassigned";
}

/** Resolve customer display name */
function resolveCustomer(customerId, customerMap) {
  if (!customerId) return "Unknown customer";
  return customerMap.get(String(customerId)) ?? "Unknown customer";
}

/** STATUS_LABELS with fallback — mirrors the BUG-004 fix */
function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PIPELINE_BUCKETS definition", () => {
  it("has exactly three buckets", () => {
    assert.equal(PIPELINE_BUCKETS.length, 3);
  });

  it("every status is covered exactly once", () => {
    const allStatuses = ["DRAFT", "SENT", "APPROVED", "CONVERTED", "DECLINED"];
    const covered = PIPELINE_BUCKETS.flatMap((b) => b.statuses);
    assert.deepEqual(covered.sort(), allStatuses.sort());
  });

  it("draft bucket contains only DRAFT", () => {
    const draft = PIPELINE_BUCKETS.find((b) => b.key === "draft");
    assert.deepEqual(draft.statuses, ["DRAFT"]);
  });

  it("in-process bucket contains SENT and APPROVED", () => {
    const inProcess = PIPELINE_BUCKETS.find((b) => b.key === "in-process");
    assert.deepEqual(inProcess.statuses, ["SENT", "APPROVED"]);
  });

  it("closed bucket contains CONVERTED and DECLINED", () => {
    const closed = PIPELINE_BUCKETS.find((b) => b.key === "closed");
    assert.deepEqual(closed.statuses, ["CONVERTED", "DECLINED"]);
  });
});

describe("bucketQuotes()", () => {
  const quotes = [
    { _id: "q1", status: "DRAFT",     total: 1000, customerId: "c1", createdByTechId: "t1" },
    { _id: "q2", status: "SENT",      total: 2000, customerId: "c2", createdByTechId: "t2" },
    { _id: "q3", status: "APPROVED",  total: 3000, customerId: "c1", createdByTechId: "t1" },
    { _id: "q4", status: "CONVERTED", total: 4000, customerId: "c3", createdByTechId: null },
    { _id: "q5", status: "DECLINED",  total:  500, customerId: "c4", createdByTechId: "t3" },
  ];

  it("routes each quote to exactly one bucket", () => {
    const buckets = bucketQuotes(quotes);
    const allItems = buckets.flatMap((b) => b.items);
    assert.equal(allItems.length, quotes.length, "every quote should appear exactly once");
  });

  it("draft bucket has 1 item (DRAFT)", () => {
    const { items } = bucketQuotes(quotes).find((b) => b.key === "draft");
    assert.equal(items.length, 1);
    assert.equal(items[0]._id, "q1");
  });

  it("in-process bucket has 2 items (SENT + APPROVED)", () => {
    const { items } = bucketQuotes(quotes).find((b) => b.key === "in-process");
    assert.equal(items.length, 2);
    assert.deepEqual(items.map((i) => i._id).sort(), ["q2", "q3"].sort());
  });

  it("closed bucket has 2 items (CONVERTED + DECLINED)", () => {
    const { items } = bucketQuotes(quotes).find((b) => b.key === "closed");
    assert.equal(items.length, 2);
    assert.deepEqual(items.map((i) => i._id).sort(), ["q4", "q5"].sort());
  });

  it("unknown status quote falls into no bucket", () => {
    const withUnknown = [...quotes, { _id: "q6", status: "PENDING" }];
    const buckets = bucketQuotes(withUnknown);
    const allItems = buckets.flatMap((b) => b.items);
    assert.equal(allItems.length, quotes.length, "PENDING should not appear in any bucket");
  });
});

describe("resolveOwner() — edge cases", () => {
  const techMap = new Map([
    ["t1", "Alice Smith"],
    ["t2", "Bob Jones"],
  ]);

  it("resolves known technician", () => {
    assert.equal(resolveOwner("t1", techMap), "Alice Smith");
  });

  it("falls back to Unassigned for missing techId", () => {
    assert.equal(resolveOwner(null, techMap), "Unassigned");
    assert.equal(resolveOwner(undefined, techMap), "Unassigned");
  });

  it("falls back to Unassigned for deleted/archived technician", () => {
    assert.equal(resolveOwner("t-deleted", techMap), "Unassigned");
  });
});

describe("resolveCustomer() — edge cases", () => {
  const custMap = new Map([
    ["c1", "Acme Airways"],
  ]);

  it("resolves known customer", () => {
    assert.equal(resolveCustomer("c1", custMap), "Acme Airways");
  });

  it("falls back to Unknown customer for null customerId", () => {
    assert.equal(resolveCustomer(null, custMap), "Unknown customer");
  });

  it("falls back to Unknown customer for ID not in map", () => {
    assert.equal(resolveCustomer("c-missing", custMap), "Unknown customer");
  });
});

describe("statusLabel() — BUG-004 fallback", () => {
  it("returns human label for known statuses", () => {
    assert.equal(statusLabel("DRAFT"), "Draft");
    assert.equal(statusLabel("SENT"), "Sent");
    assert.equal(statusLabel("APPROVED"), "Approved");
    assert.equal(statusLabel("CONVERTED"), "Converted");
    assert.equal(statusLabel("DECLINED"), "Declined");
  });

  it("returns raw status for unknown status instead of undefined", () => {
    assert.equal(statusLabel("PENDING"), "PENDING");
    assert.equal(statusLabel("VOID"), "VOID");
  });
});

describe("tab count correctness — BUG-001 scenario", () => {
  // Simulate what QuoteListPanel should do after the fix:
  // all quotes fetched, counts computed from full set, then filtered client-side.
  const allQuotes = [
    { _id: "q1", status: "DRAFT" },
    { _id: "q2", status: "DRAFT" },
    { _id: "q3", status: "SENT" },
    { _id: "q4", status: "APPROVED" },
    { _id: "q5", status: "CONVERTED" },
  ];

  function computeCounts(quotes) {
    return {
      all: quotes.length,
      DRAFT: quotes.filter((q) => q.status === "DRAFT").length,
      SENT: quotes.filter((q) => q.status === "SENT").length,
      APPROVED: quotes.filter((q) => q.status === "APPROVED").length,
      CONVERTED: quotes.filter((q) => q.status === "CONVERTED").length,
      DECLINED: quotes.filter((q) => q.status === "DECLINED").length,
    };
  }

  it("counts are accurate regardless of active tab (client-side filter approach)", () => {
    // Simulates: activeTab = "DRAFT", but allQuotes always comes from a full fetch
    const counts = computeCounts(allQuotes);
    assert.equal(counts.all, 5);
    assert.equal(counts.DRAFT, 2);
    assert.equal(counts.SENT, 1);
    assert.equal(counts.APPROVED, 1);
    assert.equal(counts.CONVERTED, 1);
    assert.equal(counts.DECLINED, 0);
  });

  it("client-side tab filter returns correct subset", () => {
    const activeTab = "DRAFT";
    const filtered = allQuotes.filter((q) => q.status === activeTab);
    assert.equal(filtered.length, 2);
    assert.ok(filtered.every((q) => q.status === "DRAFT"));
  });
});
