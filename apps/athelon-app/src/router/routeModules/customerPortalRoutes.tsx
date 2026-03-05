import { lazy } from "react";
import { Route } from "react-router-dom";
import { CustomerLayout } from "@/app/(customer)/layout";
import { CustomerAuthProvider } from "@/components/customer/CustomerAuthContext";
import { CustomerProtectedRoute } from "@/components/customer/CustomerProtectedRoute";

const CustomerSignInPage = lazy(() => import("@/app/(customer)/sign-in/page"));
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
const CustomerMessagesPage = lazy(() => import("@/app/(customer)/portal/messages/page"));

export function customerPortalRoutes() {
  return (
    <>
      <Route key="portal-sign-in" path="/portal/sign-in" element={<CustomerSignInPage />} />
      <Route
        key="portal"
        element={(
          <CustomerAuthProvider>
            <CustomerProtectedRoute />
          </CustomerAuthProvider>
        )}
      >
        <Route element={<CustomerLayout />}>
          <Route path="/portal" element={<CustomerDashboardPage />} />
          <Route path="/portal/work-orders" element={<CustomerWorkOrdersPage />} />
          <Route path="/portal/quotes" element={<CustomerQuotesPage />} />
          <Route path="/portal/invoices" element={<CustomerInvoicesPage />} />
          <Route path="/portal/fleet" element={<CustomerFleetPage />} />
        <Route path="/portal/messages" element={<CustomerMessagesPage />} />
        </Route>
      </Route>
    </>
  );
}
