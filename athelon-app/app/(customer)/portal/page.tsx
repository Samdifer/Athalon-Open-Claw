import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, FileText, Receipt, Clock, ArrowRight } from "lucide-react";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";

export default function CustomerDashboardPage() {
  const customerId = usePortalCustomerId();
  const dashboard = useQuery(
    api.customerPortal.getCustomerDashboard,
    customerId ? { customerId } : "skip"
  );

  if (!customerId) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-700">No customer account linked</h2>
        <p className="text-gray-500 mt-2">Please contact your service provider to set up portal access.</p>
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

  const cards = [
    {
      title: "Active Work Orders",
      value: dashboard.activeWorkOrders,
      icon: Wrench,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/portal/work-orders",
    },
    {
      title: "Open Quotes",
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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {dashboard.customer.companyName ?? dashboard.customer.name}
        </h1>
        <p className="text-gray-500 mt-1">Here's an overview of your account.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link key={card.title} to={card.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${card.bg} rounded-lg flex items-center justify-center`}>
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
                <p className="text-sm font-medium text-amber-700">Outstanding Balance</p>
                <p className="text-2xl font-bold text-amber-900">
                  ${dashboard.outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Link to="/portal/invoices" className="text-amber-700 hover:text-amber-900">
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.recentActivity.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {dashboard.recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {activity.type === "work_order" ? "WO" : activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: "/portal/work-orders", label: "View Work Orders", icon: Wrench },
          { to: "/portal/quotes", label: "Review Quotes", icon: FileText },
          { to: "/portal/invoices", label: "View Invoices", icon: Receipt },
          { to: "/portal/fleet", label: "My Fleet", icon: () => <span className="text-lg">✈️</span> },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow text-center"
          >
            <link.icon className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
