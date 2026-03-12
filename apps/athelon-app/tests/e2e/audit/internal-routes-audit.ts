import type { Page } from "@playwright/test";
import type { InternalRoute } from "../route-manifest.internal";

export type RouteAuditIssueType =
  | "sign_in_redirect"
  | "infinite_loading"
  | "missing_empty_state_cta"
  | "noop_cta";

export type RouteAuditIssue = {
  type: RouteAuditIssueType;
  routePath: string;
  routeLabel: string;
  message: string;
};

export type RouteAuditResult = {
  route: InternalRoute;
  finalUrl: string;
  hasEmptyState: boolean;
  issues: RouteAuditIssue[];
};

type AuditOptions = {
  loadingTimeoutMs?: number;
  clickAudit?: boolean;
};

function isAuthUrl(url: string): boolean {
  return (
    url.includes("/sign-in") ||
    url.includes("accounts.dev") ||
    url.includes("/sign-up")
  );
}

async function waitForLoadingToSettle(
  page: Page,
  timeoutMs: number,
): Promise<"settled" | "timed_out"> {
  const start = Date.now();
  const loading = page.getByTestId("page-loading-state").first();

  while (Date.now() - start < timeoutMs) {
    if (isAuthUrl(page.url())) return "settled";
    const visible = await loading.isVisible().catch(() => false);
    if (!visible) return "settled";
    await page.waitForTimeout(250);
  }
  return "timed_out";
}

async function checkPrimaryActionNoop(
  page: Page,
  route: InternalRoute,
): Promise<boolean> {
  const action = page.getByTestId("empty-state-primary-action").first();
  const main = page.locator("main").first();
  const beforeUrl = page.url();
  const beforeToastCount = await page.locator("[data-sonner-toast]").count();
  const beforeMainText = await main.innerText().catch(() => "");

  await action.click({ timeout: 5_000 });
  await page.waitForTimeout(1200);

  const afterUrl = page.url();
  const dialogVisible = await page
    .locator('[role="dialog"]')
    .first()
    .isVisible()
    .catch(() => false);
  const afterToastCount = await page.locator("[data-sonner-toast]").count();
  const afterMainText = await main.innerText().catch(() => "");

  if (afterUrl !== beforeUrl) {
    // Return to route to keep audit non-mutating for later checks.
    await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 30_000 });
    return false;
  }

  if (dialogVisible) return false;
  if (afterToastCount > beforeToastCount) return false;
  if (afterMainText.replace(/\s+/g, " ").trim() !== beforeMainText.replace(/\s+/g, " ").trim()) {
    return false;
  }
  return true;
}

export async function auditInternalRoute(
  page: Page,
  route: InternalRoute,
  options: AuditOptions = {},
): Promise<RouteAuditResult> {
  const loadingTimeoutMs = options.loadingTimeoutMs ?? 5_000;
  const clickAudit = options.clickAudit ?? false;
  const issues: RouteAuditIssue[] = [];

  await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(200);

  const finalUrl = page.url();
  if (isAuthUrl(finalUrl)) {
    issues.push({
      type: "sign_in_redirect",
      routePath: route.path,
      routeLabel: route.label,
      message: `Unexpected auth redirect for authenticated persona (${finalUrl})`,
    });
    return { route, finalUrl, hasEmptyState: false, issues };
  }

  const loadingState = await waitForLoadingToSettle(page, loadingTimeoutMs);
  if (loadingState === "timed_out") {
    issues.push({
      type: "infinite_loading",
      routePath: route.path,
      routeLabel: route.label,
      message: `Loading state persisted longer than ${loadingTimeoutMs}ms`,
    });
  }

  const hasEmptyState = await page
    .getByTestId("empty-state")
    .first()
    .isVisible()
    .catch(() => false);

  if (hasEmptyState) {
    const primaryAction = page.getByTestId("empty-state-primary-action").first();
    const hasPrimaryAction = await primaryAction.isVisible().catch(() => false);
    const isDisabled = hasPrimaryAction
      ? await primaryAction.isDisabled().catch(() => false)
      : true;

    if (!hasPrimaryAction || isDisabled) {
      issues.push({
        type: "missing_empty_state_cta",
        routePath: route.path,
        routeLabel: route.label,
        message: "Empty state is missing an interactive primary action",
      });
    } else if (clickAudit && !route.skipCtaClickAudit) {
      const isNoop = await checkPrimaryActionNoop(page, route).catch(() => true);
      if (isNoop) {
        issues.push({
          type: "noop_cta",
          routePath: route.path,
          routeLabel: route.label,
          message: "Primary empty-state action click produced no visible feedback",
        });
      }
    }
  }

  return {
    route,
    finalUrl: page.url(),
    hasEmptyState,
    issues,
  };
}

export async function auditInternalRoutes(
  page: Page,
  routes: InternalRoute[],
  options: AuditOptions = {},
): Promise<RouteAuditResult[]> {
  const results: RouteAuditResult[] = [];
  for (const route of routes) {
    // eslint-disable-next-line no-await-in-loop
    const result = await auditInternalRoute(page, route, options);
    results.push(result);
  }
  return results;
}
