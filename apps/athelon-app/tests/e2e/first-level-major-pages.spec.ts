import { expect, test } from "@playwright/test";
import path from "path";
import { auditInternalRoute } from "./audit/internal-routes-audit";

const SEEDED_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/seeded-admin.json",
);

test.use({ storageState: SEEDED_AUTH_FILE });

const FIRST_LEVEL_MAJOR_ROUTES = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "My Work", path: "/my-work" },
  { label: "Lead Center", path: "/lead" },
  { label: "Fleet", path: "/fleet" },
  { label: "Work Orders", path: "/work-orders" },
  { label: "Schedule", path: "/scheduling" },
  { label: "Parts", path: "/parts" },
  { label: "Billing", path: "/billing/invoices" },
  { label: "CRM", path: "/crm/dashboard" },
  { label: "Compliance", path: "/compliance" },
  { label: "Reports", path: "/reports" },
  { label: "Personnel", path: "/personnel" },
  { label: "OJT Training", path: "/training/ojt" },
  { label: "Settings", path: "/settings/shop" },
] as const;

test.describe("First-level major pages", () => {
  for (const route of FIRST_LEVEL_MAJOR_ROUTES) {
    test(`[${route.label}] ${route.path} loads without auth redirect or loading dead-end`, async ({
      page,
    }) => {
      const result = await auditInternalRoute(page, route, {
        loadingTimeoutMs: 8_000,
      });

      const fatalIssues = result.issues.filter(
        (issue) =>
          issue.type === "sign_in_redirect" ||
          issue.type === "infinite_loading",
      );

      expect(
        fatalIssues,
        fatalIssues.map((issue) => issue.message).join("\n"),
      ).toEqual([]);
    });
  }
});
