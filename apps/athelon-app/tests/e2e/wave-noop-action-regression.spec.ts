import { test, expect } from "@playwright/test";
import path from "path";
import { INTERNAL_ROUTE_MANIFEST } from "./route-manifest.internal";
import { auditInternalRoutes } from "./audit/internal-routes-audit";

const EMPTY_ORG_AUTH_FILE = path.join(__dirname, "../playwright/.auth/empty-org-admin.json");

test.use({ storageState: EMPTY_ORG_AUTH_FILE });
test.setTimeout(180_000);

test("visible empty-state primary actions are not click no-ops", async ({ page }) => {
  const results = await auditInternalRoutes(page, INTERNAL_ROUTE_MANIFEST, {
    loadingTimeoutMs: 5_000,
    clickAudit: true,
  });

  const noopIssues = results.flatMap((result) =>
    result.issues.filter((issue) => issue.type === "noop_cta"),
  );

  expect(
    noopIssues,
    noopIssues.map((issue) => `${issue.routePath}: ${issue.message}`).join("\n"),
  ).toEqual([]);
});
