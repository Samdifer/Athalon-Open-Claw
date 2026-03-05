"use client";

import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Heart,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  UserPlus,
  UserMinus,
  ShieldCheck,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  company: "Company",
  charter_operator: "Charter Operator",
  flight_school: "Flight School",
  government: "Government",
};

const CUSTOMER_TYPE_BADGES: Record<string, string> = {
  individual: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  company: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  charter_operator: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  flight_school: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  government: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};

const CHURN_RISK_BADGES: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  medium: { label: "Medium", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  high: { label: "High", className: "bg-red-500/15 text-red-500 border-red-500/30" },
};

// ─── Health Score Algorithm Table Data ───────────────────────────────────────

const HEALTH_FACTORS = [
  { factor: "WO Frequency", weight: "20%", logic: "0 WOs in 12mo = 0, 4+ = 100" },
  { factor: "Payment Timeliness", weight: "25%", logic: "% invoices paid on time" },
  { factor: "Fleet Size", weight: "10%", logic: "1 aircraft = 50, 5+ = 100" },
  { factor: "Contract Value", weight: "20%", logic: "Revenue vs org average" },
  { factor: "Communication Freq", weight: "10%", logic: "Interactions in 90 days" },
  { factor: "Recency of Work", weight: "15%", logic: "0-30 days = 100, 180+ = 0" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CrmAnalyticsPage() {
  const { orgId } = useCurrentOrg();
  const navigate = useNavigate();

  const analytics = useQuery(
    api.crm.getAnalyticsSummary,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  );

  const isLoading = !orgId || analytics === undefined;

  // ─── Loading state ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-80 mt-1" />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Check if there's any data at all
  const hasData =
    analytics.healthDistribution.excellent > 0 ||
    analytics.healthDistribution.high > 0 ||
    analytics.healthDistribution.medium > 0 ||
    analytics.healthDistribution.low > 0 ||
    analytics.customerLifetimeValue.length > 0;

  if (!hasData && analytics.activeCustomers === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">
            Customer Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Health scoring, churn risk, and revenue insights
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">No analytics data available yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">
            Analytics will populate as customer health snapshots are recorded and
            invoices are processed.
          </p>
        </div>
      </div>
    );
  }

  const { healthDistribution, churnRiskDistribution, customerLifetimeValue, revenueByType } =
    analytics;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">
          Customer Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Health scoring, churn risk, and revenue insights
        </p>
      </div>

      {/* ── Health Score Distribution ──────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4" />
          Health Score Distribution
        </h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card className="border-emerald-500/30">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-emerald-600">
                Excellent (75-100)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-emerald-600">
                {healthDistribution.excellent}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-amber-600">
                Good (50-74)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-amber-600">
                {healthDistribution.high}
              </p>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-orange-600">
                At Risk (25-49)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-orange-600">
                {healthDistribution.medium}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-500/30">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-red-600">
                Critical (0-24)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-red-600">
                {healthDistribution.low}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Health Score Algorithm ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            MRO Health Scoring Algorithm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Factor</TableHead>
                  <TableHead className="text-center">Weight</TableHead>
                  <TableHead>Scoring Logic</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {HEALTH_FACTORS.map((row) => (
                  <TableRow key={row.factor} className="hover:bg-muted/20">
                    <TableCell className="font-medium">{row.factor}</TableCell>
                    <TableCell className="text-center">{row.weight}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.logic}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Churn Risk Distribution ───────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Churn Risk
        </h2>
        <div className="grid gap-3 grid-cols-3">
          <Card className="border-emerald-500/30">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-emerald-600">
                Low Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-emerald-600">
                {churnRiskDistribution.low}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/30">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-amber-600">
                Medium Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-amber-600">
                {churnRiskDistribution.medium}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-500/30">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-red-600">
                High Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-red-600">
                {churnRiskDistribution.high}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Customer Lifetime Value ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Customer Lifetime Value (Top 20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customerLifetimeValue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No revenue data available yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-center">Health Score</TableHead>
                    <TableHead className="text-center">Churn Risk</TableHead>
                    <TableHead className="text-right">Tenure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerLifetimeValue.map((row) => {
                    const churnBadge = row.churnRisk
                      ? CHURN_RISK_BADGES[row.churnRisk]
                      : null;
                    return (
                      <TableRow
                        key={row.customerId}
                        className="hover:bg-muted/20 cursor-pointer"
                        onClick={() => navigate(`/crm/accounts/${row.customerId}`)}
                      >
                        <TableCell className="font-medium text-primary hover:underline">
                          {row.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              CUSTOMER_TYPE_BADGES[row.customerType] ??
                              "bg-gray-500/15 text-gray-500 border-gray-500/30"
                            }
                          >
                            {CUSTOMER_TYPE_LABELS[row.customerType] ?? row.customerType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(row.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.healthScore !== null ? (
                            <span
                              className={
                                row.healthScore >= 75
                                  ? "text-emerald-600 font-semibold"
                                  : row.healthScore >= 50
                                    ? "text-amber-600 font-semibold"
                                    : row.healthScore >= 25
                                      ? "text-orange-600 font-semibold"
                                      : "text-red-600 font-semibold"
                              }
                            >
                              {row.healthScore}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {churnBadge ? (
                            <Badge className={churnBadge.className}>
                              {churnBadge.label}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.tenureMonths > 0 ? `${row.tenureMonths} mo` : "<1 mo"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Revenue by Segment ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Revenue by Segment
        </h2>
        {Object.keys(revenueByType).length === 0 ? (
          <p className="text-sm text-muted-foreground">No revenue data by segment yet.</p>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {Object.entries(revenueByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, revenue]) => (
                <Card key={type}>
                  <CardHeader className="pb-1">
                    <Badge
                      className={
                        CUSTOMER_TYPE_BADGES[type] ??
                        "bg-gray-500/15 text-gray-500 border-gray-500/30"
                      }
                    >
                      {CUSTOMER_TYPE_LABELS[type] ?? type}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{formatMoney(revenue)}</p>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* ── Acquisition & Retention ───────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Acquisition & Retention
        </h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                New (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{analytics.newCustomersLast30Days}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                New (90 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{analytics.newCustomersLast90Days}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserMinus className="w-4 h-4" />
                Inactive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{analytics.inactiveCustomers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Retention Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{analytics.retentionRate}%</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
