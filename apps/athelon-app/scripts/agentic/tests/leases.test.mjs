import assert from "node:assert/strict";
import test from "node:test";

import {
  acquireLease,
  normalizeOwnershipConfig,
  patternsOverlap,
  releaseLeasesForAssignment,
  resolveOwnershipForRequest,
} from "../leases.mjs";

test("patternsOverlap detects overlapping and non-overlapping path sets", () => {
  const repoFiles = [
    "apps/athelon-app/app/(app)/work-orders/page.tsx",
    "apps/athelon-app/app/(app)/work-orders/detail.tsx",
    "apps/athelon-app/app/(app)/parts/page.tsx",
  ];

  const overlap = patternsOverlap(
    ["apps/athelon-app/app/(app)/work-orders/**"],
    ["apps/athelon-app/app/(app)/work-orders/detail.tsx"],
    repoFiles,
  );
  assert.equal(overlap.overlap, true);

  const noOverlap = patternsOverlap(
    ["apps/athelon-app/app/(app)/work-orders/**"],
    ["apps/athelon-app/app/(app)/parts/**"],
    repoFiles,
  );
  assert.equal(noOverlap.overlap, false);
});

test("lease acquisition blocks collisions and allows release/reacquire", () => {
  const leasesState = { leases: [] };
  const repoFiles = [
    "apps/athelon-app/app/(app)/work-orders/page.tsx",
    "apps/athelon-app/app/(app)/parts/page.tsx",
  ];

  const first = acquireLease({
    leasesState,
    assignmentId: "ASG-1",
    ownerSession: "s1",
    ownerBranch: "agent/asg-1",
    patterns: ["apps/athelon-app/app/(app)/work-orders/**"],
    repoFiles,
    nowIso: "2026-03-03T00:00:00Z",
  });
  assert.equal(first.ok, true);

  const second = acquireLease({
    leasesState,
    assignmentId: "ASG-2",
    ownerSession: "s2",
    ownerBranch: "agent/asg-2",
    patterns: ["apps/athelon-app/app/(app)/work-orders/**"],
    repoFiles,
    nowIso: "2026-03-03T00:01:00Z",
  });
  assert.equal(second.ok, false);
  assert.equal(Boolean(second.conflict), true);

  const released = releaseLeasesForAssignment(leasesState, "ASG-1", "test_release", "2026-03-03T00:02:00Z");
  assert.equal(released, 1);

  const third = acquireLease({
    leasesState,
    assignmentId: "ASG-3",
    ownerSession: "s3",
    ownerBranch: "agent/asg-3",
    patterns: ["apps/athelon-app/app/(app)/work-orders/**"],
    repoFiles,
    nowIso: "2026-03-03T00:03:00Z",
  });
  assert.equal(third.ok, true);
});

test("resolveOwnershipForRequest does not force protected paths unless requested", () => {
  const ownership = normalizeOwnershipConfig({
    protected_paths: [
      "apps/athelon-app/docs/spec/MASTER-BUILD-LIST.md",
    ],
    group_paths: {
      "GRP-003": ["apps/athelon-app/app/(app)/work-orders/**"],
    },
    defaults: {
      fallback_paths: ["apps/athelon-app/**"],
    },
  });

  const mbpRows = [{ canonical_group_id: "GRP-003" }];

  const standard = resolveOwnershipForRequest({
    mbpRows,
    explicitPaths: [],
    ownership,
  });
  assert.deepEqual(standard, ["apps/athelon-app/app/(app)/work-orders/**"]);
  assert.equal(standard.includes("apps/athelon-app/docs/spec/MASTER-BUILD-LIST.md"), false);

  const withProtected = resolveOwnershipForRequest({
    mbpRows,
    explicitPaths: [],
    ownership,
    includeProtected: true,
  });
  assert.equal(withProtected.includes("apps/athelon-app/docs/spec/MASTER-BUILD-LIST.md"), true);
});

test("explicit paths override group patterns when provided", () => {
  const ownership = normalizeOwnershipConfig({
    protected_paths: [],
    group_paths: {
      "GRP-003": ["apps/athelon-app/app/(app)/work-orders/**"],
    },
    defaults: {
      fallback_paths: ["apps/athelon-app/**"],
    },
  });

  const mbpRows = [{ canonical_group_id: "GRP-003" }];
  const resolved = resolveOwnershipForRequest({
    mbpRows,
    explicitPaths: ["apps/athelon-app/app/(app)/settings/page.tsx"],
    ownership,
  });

  assert.deepEqual(resolved, ["apps/athelon-app/app/(app)/settings/page.tsx"]);
});
