import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/app/(app)/layout";
import SignInPage from "@/app/(auth)/sign-in/[[...sign-in]]/page";
import SignUpPage from "@/app/(auth)/sign-up/[[...sign-up]]/page";

// Core
import DashboardPage from "@/app/(app)/dashboard/page";
import MyWorkPage from "@/app/(app)/my-work/page";

// Work Orders
import WorkOrdersPage from "@/app/(app)/work-orders/page";
import WorkOrderDetailPage from "@/app/(app)/work-orders/[id]/page";
import NewWorkOrderPage from "@/app/(app)/work-orders/new/page";
import WorkOrderRecordsPage from "@/app/(app)/work-orders/[id]/records/page";
import ReleaseAircraftPage from "@/app/(app)/work-orders/[id]/release/page";
import RtsPage from "@/app/(app)/work-orders/[id]/rts/page";
import SignaturePage from "@/app/(app)/work-orders/[id]/signature/page";
import NewTaskCardPage from "@/app/(app)/work-orders/[id]/tasks/new/page";
import TaskCardPage from "@/app/(app)/work-orders/[id]/tasks/[cardId]/page";
import TemplatesPage from "@/app/(app)/work-orders/templates/page";

// Fleet
import FleetPage from "@/app/(app)/fleet/page";
import AircraftDetailPage from "@/app/(app)/fleet/[tail]/page";
import AircraftLogbookPage from "@/app/(app)/fleet/[tail]/logbook/page";

// Parts
import PartsPage from "@/app/(app)/parts/page";
import NewPartPage from "@/app/(app)/parts/new/page";
import PartsRequestsPage from "@/app/(app)/parts/requests/page";

// Squawks
import SquawksPage from "@/app/(app)/squawks/page";

// Personnel
import PersonnelPage from "@/app/(app)/personnel/page";

// Compliance
import CompliancePage from "@/app/(app)/compliance/page";
import AuditTrailPage from "@/app/(app)/compliance/audit-trail/page";
import QcmReviewPage from "@/app/(app)/compliance/qcm-review/page";

// Billing
import AnalyticsPage from "@/app/(app)/billing/analytics/page";
import ArDashboardPage from "@/app/(app)/billing/ar-dashboard/page";
import CreditMemosPage from "@/app/(app)/billing/credit-memos/page";
import CustomersPage from "@/app/(app)/billing/customers/page";
import CustomerDetailPage from "@/app/(app)/billing/customers/[id]/page";
import DepositsPage from "@/app/(app)/billing/deposits/page";
import InvoicesPage from "@/app/(app)/billing/invoices/page";
import NewInvoicePage from "@/app/(app)/billing/invoices/new/page";
import InvoiceDetailPage from "@/app/(app)/billing/invoices/[id]/page";
import PricingPage from "@/app/(app)/billing/pricing/page";
import PurchaseOrdersPage from "@/app/(app)/billing/purchase-orders/page";
import NewPOPage from "@/app/(app)/billing/purchase-orders/new/page";
import PODetailPage from "@/app/(app)/billing/purchase-orders/[id]/page";
import QuotesPage from "@/app/(app)/billing/quotes/page";
import NewQuotePage from "@/app/(app)/billing/quotes/new/page";
import QuoteDetailPage from "@/app/(app)/billing/quotes/[id]/page";
import RecurringBillingPage from "@/app/(app)/billing/recurring/page";
import BillingSettingsPage from "@/app/(app)/billing/settings/page";
import TaxConfigPage from "@/app/(app)/billing/tax-config/page";
import TimeApprovalPage from "@/app/(app)/billing/time-approval/page";
import TimeClockPage from "@/app/(app)/billing/time-clock/page";
import VendorsPage from "@/app/(app)/billing/vendors/page";
import NewVendorPage from "@/app/(app)/billing/vendors/new/page";
import VendorDetailPage from "@/app/(app)/billing/vendors/[id]/page";

// Settings
import ShopSettingsPage from "@/app/(app)/settings/shop/page";

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public auth routes — wildcard handles Clerk's OAuth/MFA sub-paths */}
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Protected app routes — all require an active Clerk session */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Core */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-work" element={<MyWorkPage />} />

          {/* Work Orders */}
          <Route path="/work-orders" element={<WorkOrdersPage />} />
          <Route path="/work-orders/new" element={<NewWorkOrderPage />} />
          <Route path="/work-orders/templates" element={<TemplatesPage />} />
          <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
          <Route path="/work-orders/:id/records" element={<WorkOrderRecordsPage />} />
          <Route path="/work-orders/:id/release" element={<ReleaseAircraftPage />} />
          <Route path="/work-orders/:id/rts" element={<RtsPage />} />
          <Route path="/work-orders/:id/signature" element={<SignaturePage />} />
          <Route path="/work-orders/:id/tasks/new" element={<NewTaskCardPage />} />
          <Route path="/work-orders/:id/tasks/:cardId" element={<TaskCardPage />} />

          {/* Fleet */}
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/fleet/:tail" element={<AircraftDetailPage />} />
          <Route path="/fleet/:tail/logbook" element={<AircraftLogbookPage />} />

          {/* Parts */}
          <Route path="/parts" element={<PartsPage />} />
          <Route path="/parts/new" element={<NewPartPage />} />
          <Route path="/parts/requests" element={<PartsRequestsPage />} />

          {/* Squawks */}
          <Route path="/squawks" element={<SquawksPage />} />

          {/* Personnel */}
          <Route path="/personnel" element={<PersonnelPage />} />

          {/* Compliance */}
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/compliance/audit-trail" element={<AuditTrailPage />} />
          <Route path="/compliance/qcm-review" element={<QcmReviewPage />} />

          {/* Billing */}
          <Route path="/billing/analytics" element={<AnalyticsPage />} />
          <Route path="/billing/ar-dashboard" element={<ArDashboardPage />} />
          <Route path="/billing/credit-memos" element={<CreditMemosPage />} />
          <Route path="/billing/customers" element={<CustomersPage />} />
          <Route path="/billing/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/billing/deposits" element={<DepositsPage />} />
          <Route path="/billing/invoices" element={<InvoicesPage />} />
          <Route path="/billing/invoices/new" element={<NewInvoicePage />} />
          <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/billing/pricing" element={<PricingPage />} />
          <Route path="/billing/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/billing/purchase-orders/new" element={<NewPOPage />} />
          <Route path="/billing/purchase-orders/:id" element={<PODetailPage />} />
          <Route path="/billing/quotes" element={<QuotesPage />} />
          <Route path="/billing/quotes/new" element={<NewQuotePage />} />
          <Route path="/billing/quotes/:id" element={<QuoteDetailPage />} />
          <Route path="/billing/recurring" element={<RecurringBillingPage />} />
          <Route path="/billing/settings" element={<BillingSettingsPage />} />
          <Route path="/billing/tax-config" element={<TaxConfigPage />} />
          <Route path="/billing/time-approval" element={<TimeApprovalPage />} />
          <Route path="/billing/time-clock" element={<TimeClockPage />} />
          <Route path="/billing/vendors" element={<VendorsPage />} />
          <Route path="/billing/vendors/new" element={<NewVendorPage />} />
          <Route path="/billing/vendors/:id" element={<VendorDetailPage />} />

          {/* Settings */}
          <Route path="/settings/shop" element={<ShopSettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
