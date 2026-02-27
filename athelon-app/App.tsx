import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/app/(app)/layout";
import SignInPage from "@/app/(auth)/sign-in/[[...sign-in]]/page";
import SignUpPage from "@/app/(auth)/sign-up/[[...sign-up]]/page";
import DashboardPage from "@/app/(app)/dashboard/page";

// Work Orders
import WorkOrdersPage from "@/app/(app)/work-orders/page";
import WorkOrderDetailPage from "@/app/(app)/work-orders/[id]/page";
import NewWorkOrderPage from "@/app/(app)/work-orders/new/page";
import TaskCardPage from "@/app/(app)/work-orders/[id]/tasks/[cardId]/page";
import NewTaskCardPage from "@/app/(app)/work-orders/[id]/tasks/new/page";
import MaintenanceRecordsPage from "@/app/(app)/work-orders/[id]/records/page";
import RtsPage from "@/app/(app)/work-orders/[id]/rts/page";
import SignaturePage from "@/app/(app)/work-orders/[id]/signature/page";
import WorkOrderTemplatesPage from "@/app/(app)/work-orders/templates/page";
import ReleaseAircraftPage from "@/app/(app)/work-orders/[id]/release/page";
import CertificatesPage from "@/app/(app)/work-orders/[id]/certificates/page";
import KanbanPage from "@/app/(app)/work-orders/kanban/page";

// Fleet
import FleetPage from "@/app/(app)/fleet/page";
import AircraftDetailPage from "@/app/(app)/fleet/[tail]/page";
import AircraftLogbookPage from "@/app/(app)/fleet/[tail]/logbook/page";

// Parts
import PartsPage from "@/app/(app)/parts/page";
import NewPartPage from "@/app/(app)/parts/new/page";
import PartsRequestsPage from "@/app/(app)/parts/requests/page";
import PartsReceivingPage from "@/app/(app)/parts/receiving/page";

// Squawks
import SquawksPage from "@/app/(app)/squawks/page";

// Personnel
import PersonnelPage from "@/app/(app)/personnel/page";
import TrainingPage from "@/app/(app)/personnel/training/page";

// Tool Crib
import ToolCribPage from "@/app/(app)/parts/tools/page";
import CoresPage from "@/app/(app)/parts/cores/page";

// My Work
import MyWorkPage from "@/app/(app)/my-work/page";

// Compliance
import CompliancePage from "@/app/(app)/compliance/page";
import QcmReviewPage from "@/app/(app)/compliance/qcm-review/page";
import AuditTrailPage from "@/app/(app)/compliance/audit-trail/page";

// Billing
import CustomersPage from "@/app/(app)/billing/customers/page";
import CustomerDetailPage from "@/app/(app)/billing/customers/[id]/page";
import InvoicesPage from "@/app/(app)/billing/invoices/page";
import NewInvoicePage from "@/app/(app)/billing/invoices/new/page";
import InvoiceDetailPage from "@/app/(app)/billing/invoices/[id]/page";
import QuotesPage from "@/app/(app)/billing/quotes/page";
import NewQuotePage from "@/app/(app)/billing/quotes/new/page";
import QuoteDetailPage from "@/app/(app)/billing/quotes/[id]/page";
import PurchaseOrdersPage from "@/app/(app)/billing/purchase-orders/page";
import NewPOPage from "@/app/(app)/billing/purchase-orders/new/page";
import PODetailPage from "@/app/(app)/billing/purchase-orders/[id]/page";
import VendorsPage from "@/app/(app)/billing/vendors/page";
import NewVendorPage from "@/app/(app)/billing/vendors/new/page";
import VendorDetailPage from "@/app/(app)/billing/vendors/[id]/page";
import ArDashboardPage from "@/app/(app)/billing/ar-dashboard/page";
import BillingAnalyticsPage from "@/app/(app)/billing/analytics/page";
import BillingPricingPage from "@/app/(app)/billing/pricing/page";
import BillingTimeClockPage from "@/app/(app)/billing/time-clock/page";
import BillingTimeApprovalPage from "@/app/(app)/billing/time-approval/page";
import BillingDepositsPage from "@/app/(app)/billing/deposits/page";
import BillingCreditMemosPage from "@/app/(app)/billing/credit-memos/page";
import BillingRecurringPage from "@/app/(app)/billing/recurring/page";
import BillingTaxConfigPage from "@/app/(app)/billing/tax-config/page";
import BillingSettingsPage from "@/app/(app)/billing/settings/page";
import OTCSalesPage from "@/app/(app)/billing/otc/page";
import WarrantyPage from "@/app/(app)/billing/warranty/page";

// Scheduling
import SchedulingPage from "@/app/(app)/scheduling/page";
import CapacityPage from "@/app/(app)/scheduling/capacity/page";
import BaysPage from "@/app/(app)/scheduling/bays/page";

// Reports
import ReportsPage from "@/app/(app)/reports/page";

// Settings
import ShopSettingsPage from "@/app/(app)/settings/shop/page";
import UsersSettingsPage from "@/app/(app)/settings/users/page";
import NotificationPreferencesPage from "@/app/(app)/settings/notifications/page";

// Customer Portal
import { CustomerLayout } from "@/app/(customer)/layout";
import CustomerDashboardPage from "@/app/(customer)/portal/page";
import CustomerWorkOrdersPage from "@/app/(customer)/portal/work-orders/page";
import CustomerQuotesPage from "@/app/(customer)/portal/quotes/page";
import CustomerInvoicesPage from "@/app/(customer)/portal/invoices/page";
import CustomerFleetPage from "@/app/(customer)/portal/fleet/page";

// Fleet Calendar
import FleetCalendarPage from "@/app/(app)/fleet/calendar/page";

// Labor Kits
import LaborKitsPage from "@/app/(app)/billing/labor-kits/page";

// Inventory Count
import InventoryCountPage from "@/app/(app)/parts/inventory-count/page";

// Gap closure modules
import ShippingPage from "@/app/(app)/parts/shipping/page";
import RotablesPage from "@/app/(app)/parts/rotables/page";
import LoanersPage from "@/app/(app)/parts/loaners/page";
import ShopLocationsPage from "@/app/(app)/settings/locations/page";
import PredictionsPage from "@/app/(app)/fleet/predictions/page";

// Import
import ImportPage from "@/app/(app)/settings/import/page";
import EmailLogPage from "@/app/(app)/settings/email-log/page";
import QuickBooksPage from "@/app/(app)/settings/quickbooks/page";

// Not Found
import AppNotFoundPage from "@/app/(app)/not-found/page";

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public auth routes — wildcard handles Clerk's OAuth/MFA sub-paths */}
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Customer Portal routes — require Clerk session */}
      <Route element={<ProtectedRoute />}>
        <Route element={<CustomerLayout />}>
          <Route path="/portal" element={<CustomerDashboardPage />} />
          <Route path="/portal/work-orders" element={<CustomerWorkOrdersPage />} />
          <Route path="/portal/quotes" element={<CustomerQuotesPage />} />
          <Route path="/portal/invoices" element={<CustomerInvoicesPage />} />
          <Route path="/portal/fleet" element={<CustomerFleetPage />} />
        </Route>
      </Route>

      {/* Protected app routes — all require an active Clerk session */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Work Orders */}
          <Route path="/work-orders" element={<WorkOrdersPage />} />
          <Route path="/work-orders/kanban" element={<KanbanPage />} />
          <Route path="/work-orders/new" element={<NewWorkOrderPage />} />
          <Route path="/work-orders/templates" element={<WorkOrderTemplatesPage />} />
          <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
          <Route path="/work-orders/:id/tasks/new" element={<NewTaskCardPage />} />
          <Route path="/work-orders/:id/tasks/:cardId" element={<TaskCardPage />} />
          <Route path="/work-orders/:id/records" element={<MaintenanceRecordsPage />} />
          <Route path="/work-orders/:id/rts" element={<RtsPage />} />
          <Route path="/work-orders/:id/release" element={<ReleaseAircraftPage />} />
          <Route path="/work-orders/:id/certificates" element={<CertificatesPage />} />
          <Route path="/work-orders/:id/signature" element={<SignaturePage />} />

          {/* Fleet */}
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/fleet/calendar" element={<FleetCalendarPage />} />
          <Route path="/fleet/predictions" element={<PredictionsPage />} />
          <Route path="/fleet/:tail" element={<AircraftDetailPage />} />
          <Route path="/fleet/:tail/logbook" element={<AircraftLogbookPage />} />

          {/* Parts */}
          <Route path="/parts" element={<PartsPage />} />
          <Route path="/parts/new" element={<NewPartPage />} />
          <Route path="/parts/requests" element={<PartsRequestsPage />} />
          <Route path="/parts/receiving" element={<PartsReceivingPage />} />
          <Route path="/parts/tools" element={<ToolCribPage />} />
          <Route path="/parts/cores" element={<CoresPage />} />
          <Route path="/parts/inventory-count" element={<InventoryCountPage />} />
          <Route path="/parts/shipping" element={<ShippingPage />} />
          <Route path="/parts/rotables" element={<RotablesPage />} />
          <Route path="/parts/loaners" element={<LoanersPage />} />

          {/* Squawks */}
          <Route path="/squawks" element={<SquawksPage />} />

          {/* Personnel */}
          <Route path="/personnel" element={<PersonnelPage />} />
          <Route path="/personnel/training" element={<TrainingPage />} />

          {/* My Work */}
          <Route path="/my-work" element={<MyWorkPage />} />

          {/* Compliance */}
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/compliance/qcm-review" element={<QcmReviewPage />} />
          <Route path="/compliance/audit-trail" element={<AuditTrailPage />} />
          <Route
            path="/compliance/certificates"
            element={<Navigate to="/compliance/audit-trail" replace />}
          />

          {/* Billing */}
          <Route path="/billing" element={<Navigate to="/billing/customers" replace />} />
          <Route path="/billing/customers" element={<CustomersPage />} />
          <Route path="/billing/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/billing/invoices" element={<InvoicesPage />} />
          <Route path="/billing/invoices/new" element={<NewInvoicePage />} />
          <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/billing/quotes" element={<QuotesPage />} />
          <Route path="/billing/quotes/new" element={<NewQuotePage />} />
          <Route path="/billing/quotes/:id" element={<QuoteDetailPage />} />
          <Route path="/billing/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/billing/purchase-orders/new" element={<NewPOPage />} />
          <Route path="/billing/purchase-orders/:id" element={<PODetailPage />} />
          <Route path="/billing/vendors" element={<VendorsPage />} />
          <Route path="/billing/vendors/new" element={<NewVendorPage />} />
          <Route path="/billing/vendors/:id" element={<VendorDetailPage />} />
          <Route path="/billing/ar-dashboard" element={<ArDashboardPage />} />
          <Route path="/billing/analytics" element={<BillingAnalyticsPage />} />
          <Route path="/billing/pricing" element={<BillingPricingPage />} />
          <Route path="/billing/time-clock" element={<BillingTimeClockPage />} />
          <Route path="/billing/time-approval" element={<BillingTimeApprovalPage />} />
          <Route path="/billing/deposits" element={<BillingDepositsPage />} />
          <Route path="/billing/credit-memos" element={<BillingCreditMemosPage />} />
          <Route path="/billing/recurring" element={<BillingRecurringPage />} />
          <Route path="/billing/tax-config" element={<BillingTaxConfigPage />} />
          <Route path="/billing/settings" element={<BillingSettingsPage />} />
          <Route path="/billing/otc" element={<OTCSalesPage />} />
          <Route path="/billing/warranty" element={<WarrantyPage />} />
          <Route path="/billing/labor-kits" element={<LaborKitsPage />} />

          {/* Scheduling */}
          <Route path="/scheduling" element={<SchedulingPage />} />
          <Route path="/scheduling/bays" element={<BaysPage />} />
          <Route path="/scheduling/capacity" element={<CapacityPage />} />

          {/* Reports */}
          <Route path="/reports" element={<ReportsPage />} />

          {/* Settings */}
          <Route path="/settings/shop" element={<ShopSettingsPage />} />
          <Route path="/settings/users" element={<UsersSettingsPage />} />
          <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
          <Route path="/settings/locations" element={<ShopLocationsPage />} />
          <Route path="/settings/import" element={<ImportPage />} />
          <Route path="/settings/email-log" element={<EmailLogPage />} />
          <Route path="/settings/quickbooks" element={<QuickBooksPage />} />

          {/* 404 catch-all */}
          <Route path="*" element={<AppNotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
