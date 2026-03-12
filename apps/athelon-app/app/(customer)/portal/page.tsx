import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Wrench,
  FileText,
  Receipt,
  Clock,
  ArrowRight,
  Plane,
  Activity,
} from "lucide-react";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";

export default function CustomerDashboardPage() {
  const customerId = usePortalCustomerId();
  const dashboard = useQuery(
    api.customerPortal.getCustomerDashboard,
    customerId ? { customerId } : "skip",
  );
  const fleet = useQuery(
    api.customerPortal.listCustomerAircraft,
    customerId ? { customerId } : "skip",
  );

  if (!customerId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground text-lg">No customer account linked</p>
          <p className="text-muted-foreground mt-1 max-w-md">
            Your account is not linked to a customer profile. Contact your MRO provider to set up your portal access.
          </p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const summaryCards = [
    {
      title: "Active Work Orders",
      value: dashboard.activeWorkOrders,
      icon: Wrench,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/portal/work-orders",
    },
    {
      title: "Pending Quotes",
      value: dashboard.openQuotes,
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-50",
      link: "/portal/quotes",
    },
    {
      title: "Outstanding Invoices",
      value: dashboard.outstandingInvoices,
      icon: Receipt,
      color: "text-red-600",
      bg: "bg-red-50",
      link: "/portal/invoices",
    },
    {
      title: "Total Fleet",
      value: fleet?.length ?? 0,
      icon: Plane,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      link: "/portal/fleet",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {dashboard.customer.companyName ?? dashboard.customer.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your account.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Link key={card.title} to={card.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 ${card.bg} rounded-lg flex items-center justify-center`}
                  >
                    <card.icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Outstanding Balance */}
      {dashboard.outstandingBalance > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">
                  Outstanding Balance
                </p>
                <p className="text-2xl font-bold text-amber-900">
                  $
                  {dashboard.outstandingBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <Link to="/portal/invoices">
                <Button variant="outline" size="sm" className="gap-1">
                  View Invoices <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {dashboard.recentActivity.map(
                    (activity: { type: string; description: string; timestamp: number; recordId: string }, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 relative">
                        <div className="w-8 h-8 bg-card border-2 border-border rounded-full flex items-center justify-center flex-shrink-0 z-10">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-sm text-foreground">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {activity.type === "work_order"
                                ? "WO"
                                : activity.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fleet Status Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plane className="w-5 h-5 text-muted-foreground" />
                Fleet Status
              </CardTitle>
              <Link to="/portal/fleet">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!fleet || fleet.length === 0 ? (
              <p className="text-muted-foreground text-sm">No aircraft on file.</p>
            ) : (
              <div className="space-y-3">
                {fleet.slice(0, 5).map((ac) => (
                  <div
                    key={ac._id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      ac.activeWorkOrders > 0
                        ? "border-blue-200 bg-blue-50/50"
                        : "border-border"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {ac.currentRegistration}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ac.make} {ac.model}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {ac.activeWorkOrders > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                          {ac.activeWorkOrders} WO
                          {ac.activeWorkOrders > 1 ? "s" : ""}
                        </Badge>
                      )}
                      <Badge
                        className={`text-xs border-0 ${
                          ac.status === "airworthy"
                            ? "bg-green-100 text-green-700"
                            : ac.status === "in_maintenance"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {ac.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            to: "/portal/work-orders",
            label: "View Work Orders",
            icon: Wrench,
          },
          { to: "/portal/quotes", label: "View Quotes", icon: FileText },
          { to: "/portal/invoices", label: "View Invoices", icon: Receipt },
          { to: "/portal/fleet", label: "My Fleet", icon: Plane },
          { to: "/portal/messages", label: "Support Tickets", icon: Activity },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex flex-col items-center gap-2 p-4 bg-card rounded-lg border hover:shadow-md transition-shadow text-center"
          >
            <link.icon className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {link.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
