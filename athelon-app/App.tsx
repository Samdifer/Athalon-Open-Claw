import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/app/(app)/layout";
import { Skeleton } from "@/components/ui/skeleton";

// Auth-critical — keep eager
import SignInPage from "@/app/(auth)/sign-in/[[...sign-in]]/page";
import SignUpPage from "@/app/(auth)/sign-up/[[...sign-up]]/page";

// Lazy page imports
const DashboardPage = lazy(() => import("@/app/(app)/dashboard/page"));

// Work Orders
const WorkOrdersPage = lazy(() => import("@/app/(app)/work-orders/page"));
const WorkOrderDetailPage = lazy(() => import("@/app/(app)/work-orders/[id]/page"));
const NewWorkOrderPage = lazy(() => import("@/app/(app)/work-orders/new/page"));
const TaskCardPage = lazy(() => import("@/app/(app)/work-orders/[id]/tasks/[cardId]/page"));
const NewTaskCardPage = lazy(() => import("@/app/(app)/work-orders/[id]/tasks/new/page"));
const MaintenanceRecordsPage = lazy(() => import("@/app/(app)/work-orders/[id]/records/page"));
const RtsPage = lazy(() => import("@/app/(app)/work-orders/[id]/rts/page"));
const SignaturePage = lazy(() => import("@/app/(app)/work-orders/[id]/signature/page"));
const WorkOrderTemplatesPage = lazy(() => import("@/app/(app)/work-orders/templates/page"));
const ReleaseAircraftPage = lazy(() => import("@/app/(app)/work-orders/[id]/release/page"));
const CertificatesPage = lazy(() => import("@/app/(app)/work-orders/[id]/certificates/page"));
const KanbanPage = lazy(() => import("@/app/(app)/work-orders/kanban/page"));

// Fleet
const FleetPage = lazy(() => import("@/app/(app)/fleet/page"));
const AircraftDetailPage = lazy(() => import("@/app/(app)/fleet/[tail]/page"));
const AircraftLogbookPage = lazy(() => import("@/app/(app)/fleet/[tail]/logbook/page"));

// Parts
const PartsPage = lazy(() => import("@/app/(app)/parts/page"));
const NewPartPage = lazy(() => import("@/app/(app)/parts/new/page"));
const PartsRequestsPage = lazy(() => import("@/app/(app)/parts/requests/page"));
const PartsReceivingPage = lazy(() => import("@/app/(app)/parts/receiving/page"));

// Squawks
const SquawksPage = lazy(() => import("@/app/(app)/squawks/page"));

// Personnel
const PersonnelPage = lazy(() => import("@/app/(app)/personnel/page"));
const TrainingPage = lazy(() => import("@/app/(app)/personnel/training/page"));

// Tool Crib
const ToolCribPage = lazy(() => import("@/app/(app)/parts/tools/page"));
const CoresPage = lazy(() => import("@/app/(app)/parts/cores/page"));

// My Work
const MyWorkPage = lazy(() => import("@/app/(app)/my-work/page"));

// Compliance
const CompliancePage = lazy(() => import("@/app/(app)/compliance/page"));
const QcmReviewPage = lazy(() => import("@/app/(app)/compliance/qcm-review/page"));
const AuditTrailPage = lazy(() => import("@/app/(app)/compliance/audit-trail/page"));
const AdSbCompliancePage = lazy(() => import("@/app/(app)/compliance/ad-sb/page"));

// Billing
const CustomersPage = lazy(() => import("@/app/(app)/billing/customers/page"));
const CustomerDetailPage = lazy(() => import("@/app/(app)/billing/customers/[id]/page"));
const InvoicesPage = lazy(() => import("@/app/(app)/billing/invoices/page"));
const NewInvoicePage = lazy(() => import("@/app/(app)/billing/invoices/new/page"));
const InvoiceDetailPage = lazy(() => import("@/app/(app)/billing/invoices/[id]/page"));
const QuotesPage = lazy(() => import("@/app/(app)/billing/quotes/page"));
const NewQuotePage = lazy(() => import("@/app/(app)/billing/quotes/new/page"));
const QuoteDetailPage = lazy(() => import("@/app/(app)/billing/quotes/[id]/page"));
const PurchaseOrdersPage = lazy(() => import("@/app/(app)/billing/purchase-orders/page"));
const NewPOPage = lazy(() => import("@/app/(app)/billing/purchase-orders/new/page"));
const PODetailPage = lazy(() => import("@/app/(app)/billing/purchase-orders/[id]/page"));
const VendorsPage = lazy(() => import("@/app/(app)/billing/vendors/page"));
const NewVendorPage = lazy(() => import("@/app/(app)/billing/vendors/new/page"));
const VendorDetailPage = lazy(() => import("@/app/(app)/billing/vendors/[id]/page"));
const ArDashboardPage = lazy(() => import("@/app/(app)/billing/ar-dashboard/page"));
const BillingAnalyticsPage = lazy(() => import("@/app/(app)/billing/analytics/page"));
const BillingPricingPage = lazy(() => import("@/app/(app)/billing/pricing/page"));
const BillingTimeClockPage = lazy(() => import("@/app/(app)/billing/time-clock/page"));
const BillingTimeApprovalPage = lazy(() => import("@/app/(app)/billing/time-approval/page"));
const BillingDepositsPage = lazy(() => import("@/app/(app)/billing/deposits/page"));
const BillingCreditMemosPage = lazy(() => import("@/app/(app)/billing/credit-memos/page"));
const BillingRecurringPage = lazy(() => import("@/app/(app)/billing/recurring/page"));
const BillingTaxConfigPage = lazy(() => import("@/app/(app)/billing/tax-config/page"));
const BillingSettingsPage = lazy(() => import("@/app/(app)/billing/settings/page"));
const OTCSalesPage = lazy(() => import("@/app/(app)/billing/otc/page"));
const WarrantyPage = lazy(() => import("@/app/(app)/billing/warranty/page"));

// Scheduling
const SchedulingPage = lazy(() => import("@/app/(app)/scheduling/page"));
const CapacityPage = lazy(() => import("@/app/(app)/scheduling/capacity/page"));
const BaysPage = lazy(() => import("@/app/(app)/scheduling/bays/page"));

// Reports
const ReportsPage = lazy(() => import("@/app/(app)/reports/page"));

// Settings
const ShopSettingsPage = lazy(() => import("@/app/(app)/settings/shop/page"));
const UsersSettingsPage = lazy(() => import("@/app/(app)/settings/users/page"));
const NotificationPreferencesPage = lazy(() => import("@/app/(app)/settings/notifications/page"));

// Customer Portal
import { CustomerLayout } from "@/app/(customer)/layout";
const CustomerDashboardPage = lazy(() => import("@/app/(customer)/portal/page"));
const CustomerWorkOrdersPage = lazy(() => import("@/app/(customer)/portal/work-orders/page"));
const CustomerQuotesPage = lazy(() => import("@/app/(customer)/portal/quotes/page"));
const CustomerInvoicesPage = lazy(() => import("@/app/(customer)/portal/invoices/page"));
const CustomerFleetPage = lazy(() => import("@/app/(customer)/portal/fleet/page"));

// Fleet Calendar
const FleetCalendarPage = lazy(() => import("@/app/(app)/fleet/calendar/page"));

// Labor Kits
const LaborKitsPage = lazy(() => import("@/app/(app)/billing/labor-kits/page"));

// Inventory Count
const InventoryCountPage = lazy(() => import("@/app/(app)/parts/inventory-count/page"));

// Gap closure modules
const ShippingPage = lazy(() => import("@/app/(app)/parts/shipping/page"));
const RotablesPage = lazy(() => import("@/app/(app)/parts/rotables/page"));
const LoanersPage = lazy(() => import("@/app/(app)/parts/loaners/page"));
const ShopLocationsPage = lazy(() => import("@/app/(app)/settings/locations/page"));
const PredictionsPage = lazy(() => import("@/app/(app)/fleet/predictions/page"));

// Import
const ImportPage = lazy(() => import("@/app/(app)/settings/import/page"));
const EmailLogPage = lazy(() => import("@/app/(app)/settings/email-log/page"));
const QuickBooksPage = lazy(() => import("@/app/(app)/settings/quickbooks/page"));

// Not Found
const AppNotFoundPage = lazy(() => import("@/app/(app)/not-found/page"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full min-h-[200px]">
      <div className="flex flex-col gap-3 w-64">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
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
            <Route path="/compliance/ad-sb" element={<AdSbCompliancePage />} />
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
    </Suspense>
  );
}
