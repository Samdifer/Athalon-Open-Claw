"use client";

import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BarChart3, DollarSign, Gauge, TrendingUp, Users } from "lucide-react";

const DEFAULTS = {
  grossMarginPct: 0.42,
  overheadPct: 0.24,
  churnAnnualPct: 0.2,
  closeRate: 0.28,
  salesCycleMonths: 3,
};

function fmtMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function fmtNum(value: number, max = 1) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: max }).format(
    Number.isFinite(value) ? value : 0,
  );
}

function qualityBadge(score: number) {
  if (score >= 80) return { label: "High confidence", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  if (score >= 55) return { label: "Medium confidence", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  return { label: "Low confidence", className: "bg-red-500/15 text-red-600 border-red-500/30" };
}

function SalesDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-[420px]" />
    </div>
  );
}

export default function SalesDashboardPage() {
  const { orgId } = useCurrentOrg();

  const crmDashboard = useQuery(
    api.crm.getCrmDashboardData,
    orgId ? { organizationId: orgId } : "skip",
  );
  const opportunities = useQuery(
    api.crm.listOpportunities,
    orgId ? { organizationId: orgId } : "skip",
  );
  const quotes = useQuery(api.billing.listQuotes, orgId ? { orgId } : "skip");
  const invoices = useQuery(api.billing.listInvoices, orgId ? { orgId } : "skip");

  const isLoading = !orgId || !crmDashboard || !opportunities || !quotes || !invoices;
  if (isLoading) return <SalesDashboardSkeleton />;

  const wonDeals = opportunities.filter((o) => o.stage === "won");
  const openDeals = opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost");
  const activeQuotes = quotes.filter((q) => q.status !== "DECLINED");
  const actualRevenue = invoices
    .filter((i) => i.status !== "VOID")
    .reduce((sum, i) => sum + (i.total ?? 0), 0);

  const projectedNewRevenue = openDeals.reduce((sum, deal) => {
    const dealValue = deal.estimatedValue ?? 0;
    return sum + dealValue * DEFAULTS.closeRate;
  }, 0);
  const projectedRevenue = actualRevenue + projectedNewRevenue;

  const avgWonDealSize = wonDeals.length > 0
    ? wonDeals.reduce((sum, d) => sum + (d.estimatedValue ?? 0), 0) / wonDeals.length
    : 0;

  // newCustomers: use won deal count; fall back to projected wins from pipeline.
  // Do NOT force a minimum of 1 — if there are genuinely zero new customers,
  // CAC should be $0 (undefined / not computable), not artificially computed
  // against a phantom denominator of 1.
  const newCustomers =
    wonDeals.length || Math.round((crmDashboard.activeOpportunities || 0) * DEFAULTS.closeRate);

  const quoteProxySpend = activeQuotes.reduce((sum, q) => sum + (q.total ?? 0), 0) * 0.08;
  const actualCAC = newCustomers > 0 ? quoteProxySpend / newCustomers : 0;

  const annualChurnRate = DEFAULTS.churnAnnualPct;
  const avgGrossMargin = DEFAULTS.grossMarginPct;
  const annualizedLtv = annualChurnRate > 0
    ? (avgWonDealSize * avgGrossMargin) / annualChurnRate
    : 0;

  const ltvCac = actualCAC > 0 ? annualizedLtv / actualCAC : 0;
  // EBITDA = Revenue × (Gross Margin % − Overhead %)
  // Simplified from the original complex form: rev*(1-overhead) - rev*(1-margin)
  // which is algebraically identical but harder to audit.
  const projectedEbitda = projectedRevenue * (avgGrossMargin - DEFAULTS.overheadPct);

  const ownershipMap = new Map<string, { owner: string; count: number; value: number }>();
  for (const deal of openDeals) {
    const owner = deal.assignedToName || "Unassigned";
    const prior = ownershipMap.get(owner) ?? { owner, count: 0, value: 0 };
    prior.count += 1;
    prior.value += deal.estimatedValue ?? 0;
    ownershipMap.set(owner, prior);
  }
  const ownershipRows = [...ownershipMap.values()].sort((a, b) => b.value - a.value);

  const coverageChecks = [
    { name: "Opportunities", count: opportunities.length, min: 3 },
    { name: "Quotes", count: quotes.length, min: 3 },
    { name: "Invoices", count: invoices.length, min: 3 },
    { name: "Assigned deal owner", count: opportunities.filter((d) => !!d.assignedToUserId || !!d.assignedToName).length, min: 1 },
  ];

  // Guard: if check.min is 0 treat as fully satisfied (avoid division by zero / NaN).
  // Guard: if coverageChecks is somehow empty, default to 100.
  const qualityScore = coverageChecks.length > 0
    ? Math.round(
        coverageChecks.reduce(
          (sum, check) => sum + Math.min(1, check.min > 0 ? check.count / check.min : 1),
          0,
        ) / coverageChecks.length * 100,
      )
    : 100;
  const quality = qualityBadge(qualityScore);

  const missingInputs = coverageChecks.filter((check) => check.count < check.min);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">Sales Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            LTV:CAC calibration, explainable assumptions, and forward revenue/EBITDA projection.
          </p>
        </div>
        <Badge variant="outline" className={`border ${quality.className}`}>
          {quality.label} · {qualityScore}% data completeness
        </Badge>
      </div>

      {missingInputs.length > 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Missing source data: {missingInputs.map((m) => `${m.name} (${m.count}/${m.min})`).join(", ")}. Placeholder assumptions are shown explicitly below.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />LTV</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{fmtMoney(annualizedLtv)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />CAC</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{fmtMoney(actualCAC)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Gauge className="h-3.5 w-3.5" />LTV:CAC</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{fmtNum(ltvCac, 2)}:1</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />Revenue (Act + Proj)</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{fmtMoney(projectedRevenue)}</p><p className="text-xs text-muted-foreground mt-1">Actual {fmtMoney(actualRevenue)} + projected {fmtMoney(projectedNewRevenue)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />Projected EBITDA</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{fmtMoney(projectedEbitda)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="calibration" className="space-y-4">
        <TabsList className="h-9 bg-muted/40 p-0.5">
          <TabsTrigger value="calibration">Assumptions calibration</TabsTrigger>
          <TabsTrigger value="explainability">Explainability & quality</TabsTrigger>
          <TabsTrigger value="ownership">Deal ownership visibility</TabsTrigger>
        </TabsList>

        <TabsContent value="calibration" className="mt-0">
          <Tabs defaultValue="rules" className="space-y-4">
            <TabsList className="h-9 bg-muted/40 p-0.5">
              <TabsTrigger value="rules">Rules-of-thumb</TabsTrigger>
              <TabsTrigger value="real">Real-data</TabsTrigger>
              <TabsTrigger value="blended">Blended/custom override</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Rules-of-thumb model</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Used when data is sparse. Every assumption is explicit (no hidden constants).</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Gross margin = {Math.round(DEFAULTS.grossMarginPct * 100)}%</li>
                    <li>Annual churn = {Math.round(DEFAULTS.churnAnnualPct * 100)}%</li>
                    <li>Close rate on open pipeline = {Math.round(DEFAULTS.closeRate * 100)}%</li>
                    <li>Overhead = {Math.round(DEFAULTS.overheadPct * 100)}%</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="real" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Real-data derivation</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Derived from CRM opportunities + quotes + invoices currently available in the org.</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded border p-3">
                      <p className="text-xs text-muted-foreground">Won deals used for average contract value</p>
                      <p className="text-lg font-semibold">{wonDeals.length}</p>
                    </div>
                    <div className="rounded border p-3">
                      <p className="text-xs text-muted-foreground">Open deals used for projection</p>
                      <p className="text-lg font-semibold">{openDeals.length}</p>
                    </div>
                    <div className="rounded border p-3">
                      <p className="text-xs text-muted-foreground">Quotes sampled (proxy for acquisition spend envelope)</p>
                      <p className="text-lg font-semibold">{quotes.length}</p>
                    </div>
                    <div className="rounded border p-3">
                      <p className="text-xs text-muted-foreground">Invoice history sampled</p>
                      <p className="text-lg font-semibold">{invoices.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blended" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Blended/custom override mode</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Use this mode to calibrate by replacing defaults with field-observed values while preserving formula transparency.</p>
                  <div className="rounded border p-3 bg-muted/20">
                    <p className="font-medium">Override template</p>
                    <p className="text-muted-foreground mt-1">LTV = (Avg Contract Value × Gross Margin Override) ÷ Churn Override</p>
                    <p className="text-muted-foreground">CAC = Acquisition Spend Override ÷ New Customers Won Override</p>
                    <p className="text-muted-foreground">Projected Revenue = Actual Revenue + (Open Pipeline × Close Rate Override)</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current screen is read-only calibration guidance. To apply final overrides, wire these fields to org-level settings in a follow-on task.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="explainability" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Calculation panel</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded border p-3">
                  <p className="font-medium">LTV</p>
                  <p className="text-muted-foreground">(Avg won deal size × Gross margin) ÷ Churn</p>
                  <p className="mt-1">({fmtMoney(avgWonDealSize)} × {Math.round(DEFAULTS.grossMarginPct * 100)}%) ÷ {Math.round(DEFAULTS.churnAnnualPct * 100)}% = <span className="font-semibold">{fmtMoney(annualizedLtv)}</span></p>
                </div>
                <div className="rounded border p-3">
                  <p className="font-medium">CAC</p>
                  <p className="text-muted-foreground">(Quote volume proxy × 8% sales load) ÷ new customers</p>
                  <p className="mt-1">({fmtMoney(activeQuotes.reduce((sum, q) => sum + (q.total ?? 0), 0))} × 8%) ÷ {fmtNum(newCustomers, 0)} = <span className="font-semibold">{fmtMoney(actualCAC)}</span></p>
                </div>
                <div className="rounded border p-3">
                  <p className="font-medium">Projected EBITDA</p>
                  <p className="text-muted-foreground">Projected revenue × (gross margin % − overhead %)</p>
                  <p className="mt-1">{fmtMoney(projectedRevenue)} × ({Math.round(DEFAULTS.grossMarginPct * 100)}% − {Math.round(DEFAULTS.overheadPct * 100)}%) = <span className="font-semibold">{fmtMoney(projectedEbitda)}</span></p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Data quality panel</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Completeness score</span>
                    <span className="font-medium">{qualityScore}%</span>
                  </div>
                  <Progress value={qualityScore} className="h-2" />
                </div>
                {coverageChecks.map((check) => {
                  const pct = Math.round(Math.min(100, check.min > 0 ? (check.count / check.min) * 100 : 100));
                  return (
                    <div key={check.name} className="rounded border p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>{check.name}</span>
                        <span className="text-muted-foreground">{check.count}/{check.min} target</span>
                      </div>
                      <Progress value={pct} className="h-1.5 mt-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ownership" className="mt-0">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Open pipeline by owner</CardTitle></CardHeader>
            <CardContent>
              {ownershipRows.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No open opportunity ownership data is available yet.</p>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Assign opportunity owners in CRM pipeline to unlock owner-level accountability summaries.</AlertDescription>
                  </Alert>
                  <Button asChild variant="outline"><Link to="/crm/pipeline">Open CRM Pipeline</Link></Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {ownershipRows.map((row) => (
                    <div key={row.owner} className="rounded border p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">{row.owner}</p>
                        <p className="text-xs text-muted-foreground">{row.count} open deal{row.count === 1 ? "" : "s"}</p>
                      </div>
                      <p className="font-semibold">{fmtMoney(row.value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
