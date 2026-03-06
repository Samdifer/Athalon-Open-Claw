"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  DollarSign,
  Target,
  TrendingUp,
  Phone,
  Mail,
  Users,
  Activity,
  Plus,
  BarChart3,
  MapPin,
  FileText,
} from "lucide-react";
import { CrmKpiCard } from "../_components/CrmKpiCards";
import { HealthScoreBadge } from "../_components/HealthScoreBadge";

/* ---------- helpers ---------- */

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const INTERACTION_ICONS: Record<string, React.ElementType> = {
  phone_call: Phone,
  email: Mail,
  meeting: Users,
  site_visit: MapPin,
  note: FileText,
};

const TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  company: "Company",
  charter_operator: "Charter Operator",
  flight_school: "Flight School",
  government: "Government",
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  individual: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  company: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  charter_operator: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  flight_school: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  government: "bg-red-500/15 text-red-600 border-red-500/30",
};

/* ---------- loading skeleton ---------- */

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 mt-1" />
      </div>
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Skeleton className="h-[320px]" />
        <Skeleton className="h-[320px]" />
      </div>
      <Skeleton className="h-[200px]" />
    </div>
  );
}

/* ---------- page ---------- */

export default function CrmDashboardPage() {
  const { orgId } = useCurrentOrg();

  const dashboardData = useQuery(
    api.crm.getCrmDashboardData,
    orgId ? { organizationId: orgId } : "skip",
  );

  if (!orgId || !dashboardData) {
    return <DashboardSkeleton />;
  }

  const {
    totalAccounts,
    activeOpportunities,
    pipelineValue,
    monthlyRevenue,
    avgHealthScore,
    recentInteractions,
    revenueByType,
    topCustomers,
  } = dashboardData;

  const healthTrend: "up" | "down" | "neutral" =
    avgHealthScore >= 75 ? "up" : avgHealthScore >= 50 ? "neutral" : "down";

  const hasData = totalAccounts > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">CRM Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customer relationships, pipeline health, and revenue insights at a glance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <CrmKpiCard
          title="Total Accounts"
          value={totalAccounts}
          icon={Building2}
        />
        <CrmKpiCard
          title="Active Opportunities"
          value={activeOpportunities}
          subtitle={`${formatMoney(pipelineValue)} pipeline value`}
          icon={Target}
        />
        <CrmKpiCard
          title="Monthly Revenue"
          value={formatMoney(monthlyRevenue)}
          subtitle="Last 30 days"
          icon={DollarSign}
        />
        <CrmKpiCard
          title="Avg Health Score"
          value={avgHealthScore}
          icon={Activity}
          trend={healthTrend}
        />
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No customer data yet. Add your first customer to get started.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/billing/customers">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Customer
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Two-column: Activity Feed + Top Customers */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Recent Activity Feed */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentInteractions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No recent interactions recorded.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {recentInteractions.slice(0, 10).map((interaction: Record<string, unknown>) => {
                      const interactionType = (interaction.interactionType as string) ?? "note";
                      const TypeIcon = INTERACTION_ICONS[interactionType] ?? FileText;
                      return (
                        <div
                          key={interaction._id as string}
                          className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0"
                        >
                          <div className="mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {(interaction.subject as string) ?? "Untitled"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground truncate">
                                {(interaction.customerName as string) ?? "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate((interaction.interactionDate as number) ?? (interaction._creationTime as number) ?? Date.now())}
                              </span>
                            </div>
                            {interaction.createdByName ? (
                              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                                by {interaction.createdByName as string}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Customers by Revenue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Top Customers by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No revenue data available.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead>Customer</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCustomers.map((customer) => (
                          <TableRow key={customer.customerId} className="hover:bg-muted/20">
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-medium border ${TYPE_BADGE_STYLES[customer.customerType] ?? ""}`}
                              >
                                {TYPE_LABELS[customer.customerType] ?? customer.customerType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatMoney(customer.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Customer Type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Revenue by Customer Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(revenueByType).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No revenue breakdown available.
                </p>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {Object.entries(revenueByType)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([type, revenue]) => (
                      <div
                        key={type}
                        className="rounded-lg border border-border/60 p-3"
                      >
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium border mb-2 ${TYPE_BADGE_STYLES[type] ?? ""}`}
                        >
                          {TYPE_LABELS[type] ?? type}
                        </Badge>
                        <p className="text-lg font-semibold">{formatMoney(revenue as number)}</p>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/billing/customers">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Customer
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/billing/quotes/new">
                <DollarSign className="w-4 h-4 mr-1.5" />
                Create Quote
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/crm/pipeline">
                <TrendingUp className="w-4 h-4 mr-1.5" />
                View Pipeline
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
