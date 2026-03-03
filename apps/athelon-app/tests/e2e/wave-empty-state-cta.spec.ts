import { test, expect } from "@playwright/test";
import path from "path";
import { INTERNAL_ROUTE_MANIFEST } from "./route-manifest.internal";
import { auditInternalRoutes } from "./audit/internal-routes-audit";

const EMPTY_ORG_AUTH_FILE = path.join(__dirname, "../playwright/.auth/empty-org-admin.json");

test.use({ storageState: EMPTY_ORG_AUTH_FILE });
test.setTimeout(180_000);

test("every rendered empty state has an interactive primary CTA", async ({ page }) => {
  const results = await auditInternalRoutes(page, INTERNAL_ROUTE_MANIFEST, {
    loadingTimeoutMs: 5_000,
    clickAudit: false,
  });

  const ctaIssues = results.flatMap((result) =>
    result.issues.filter((issue) => issue.type === "missing_empty_state_cta"),
  );

  expect(
    ctaIssues,
    ctaIssues.map((issue) => `${issue.routePath}: ${issue.message}`).join("\n"),
  ).toEqual([]);
});
