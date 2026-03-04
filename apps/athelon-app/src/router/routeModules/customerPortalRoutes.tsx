import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CustomerLayout } from "@/app/(customer)/layout";

const CustomerDashboardPage = lazy(() => import("@/app/(customer)/portal/page"));
const CustomerWorkOrdersPage = lazy(() =>
  import("@/app/(customer)/portal/work-orders/page"),
);
const CustomerQuotesPage = lazy(() =>
  import("@/app/(customer)/portal/quotes/page"),
);
const CustomerInvoicesPage = lazy(() =>
  import("@/app/(customer)/portal/invoices/page"),
);
const CustomerFleetPage = lazy(() => import("@/app/(customer)/portal/fleet/page"));

export function CustomerPortalRoutes() {
  return (
    <Route element={<ProtectedRoute />}>
      <Route element={<CustomerLayout />}>
        <Route path="/portal" element={<CustomerDashboardPage />} />
        <Route path="/portal/work-orders" element={<CustomerWorkOrdersPage />} />
        <Route path="/portal/quotes" element={<CustomerQuotesPage />} />
        <Route path="/portal/invoices" element={<CustomerInvoicesPage />} />
        <Route path="/portal/fleet" element={<CustomerFleetPage />} />
      </Route>
    </Route>
  );
}
