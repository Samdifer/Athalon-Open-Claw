import { test, expect } from "@playwright/test";
import path from "path";
import { INTERNAL_ROUTE_MANIFEST } from "./route-manifest.internal";
import { auditInternalRoute } from "./audit/internal-routes-audit";

const EMPTY_ORG_AUTH_FILE = path.join(__dirname, "../playwright/.auth/empty-org-admin.json");

test.use({ storageState: EMPTY_ORG_AUTH_FILE });

test.describe("Wave: Empty-org internal routes", () => {
  for (const route of INTERNAL_ROUTE_MANIFEST) {
    test(`[${route.label}] ${route.path} has no auth redirect or loading dead-end`, async ({ page }) => {
      const result = await auditInternalRoute(page, route, { loadingTimeoutMs: 5_000 });
      const fatalIssues = result.issues.filter(
        (issue) =>
          issue.type === "sign_in_redirect" || issue.type === "infinite_loading",
      );

      expect(
        fatalIssues,
        fatalIssues.map((issue) => issue.message).join("\n"),
      ).toEqual([]);
    });
  }
});
