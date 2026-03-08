import { lazy } from "react";
import { Navigate, Outlet, Route, useParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingGate } from "@/components/OnboardingGate";
import { OrgContextProvider } from "@/components/OrgContextProvider";
import { AppLayout } from "@/app/(app)/layout";
import { RouteGuard } from "@/components/RouteGuard";

const DashboardPage = lazy(() => import("@/app/(app)/dashboard/page"));
const OnboardingPage = lazy(() => import("@/app/(app)/onboarding/page"));

const WorkOrdersPage = lazy(() => import("@/app/(app)/work-orders/page"));
const WorkOrdersDashboardPage = lazy(
  () => import("@/app/(app)/work-orders/dashboard/page"),
);
const WorkOrdersLeadPage = lazy(() => import("@/app/(app)/work-orders/lead/page"));
const WorkOrdersHandoffPage = lazy(() => import("@/app/(app)/work-orders/handoff/page"));
const LeadDashboardPage = lazy(() => import("@/app/(app)/lead/page"));
const WorkOrderDetailPage = lazy(() => import("@/app/(app)/work-orders/[id]/page"));
const NewWorkOrderPage = lazy(() => import("@/app/(app)/work-orders/new/page"));
const TaskCardPage = lazy(
  () => import("@/app/(app)/work-orders/[id]/tasks/[cardId]/page"),
);
const NewTaskCardPage = lazy(
  () => import("@/app/(app)/work-orders/[id]/tasks/new/page"),
);
const MaintenanceRecordsPage = lazy(
  () => import("@/app/(app)/work-orders/[id]/records/page"),
);
const RtsPage = lazy(() => import("@/app/(app)/work-orders/[id]/rts/page"));
const SignaturePage = lazy(() => import("@/app/(app)/work-orders/[id]/signature/page"));
const WorkOrderTemplatesPage = lazy(
  () => import("@/app/(app)/work-orders/templates/page"),
);
const ReleaseAircraftPage = lazy(
  () => import("@/app/(app)/work-orders/[id]/release/page"),
);
const CertificatesPage = lazy(
  () => import("@/app/(app)/work-orders/[id]/certificates/page"),
);
const KanbanPage = lazy(() => import("@/app/(app)/work-orders/kanban/page"));
const WOExecutionPage = lazy(
  () => import("@/app/(app)/work-orders/[id]/execution/page"),
);

const FleetPage = lazy(() => import("@/app/(app)/fleet/page"));
const FleetCalendarPage = lazy(() => import("@/app/(app)/fleet/calendar/page"));
const PredictionsPage = lazy(() => import("@/app/(app)/fleet/predictions/page"));
const FleetLLPDashboardPage = lazy(() => import("@/app/(app)/fleet/llp/page"));
const MaintenanceProgramsPage = lazy(() => import("@/app/(app)/fleet/maintenance-programs/page"));
const MaintenanceProgramDetailPage = lazy(() => import("@/app/(app)/fleet/maintenance-programs/[id]/page"));
const AircraftDetailPage = lazy(() => import("@/app/(app)/fleet/[tail]/page"));
const AircraftLLPDetailPage = lazy(() => import("@/app/(app)/fleet/[tail]/llp/page"));
const AircraftLogbookPage = lazy(() => import("@/app/(app)/fleet/[tail]/logbook/page"));
const AircraftAdsbPage = lazy(() => import("@/app/(app)/fleet/[tail]/adsb/page"));

const PartsPage = lazy(() => import("@/app/(app)/parts/page"));
const PartDetailPage = lazy(() => import("@/app/(app)/parts/[id]/page"));
const NewPartPage = lazy(() => import("@/app/(app)/parts/new/page"));
const PartsRequestsPage = lazy(() => import("@/app/(app)/parts/requests/page"));
const PartsReceivingPage = lazy(() => import("@/app/(app)/parts/receiving/page"));
const ToolCribPage = lazy(() => import("@/app/(app)/parts/tools/page"));
const CoresPage = lazy(() => import("@/app/(app)/parts/cores/page"));
const InventoryCountPage = lazy(
  () => import("@/app/(app)/parts/inventory-count/page"),
);
const ShippingPage = lazy(() => import("@/app/(app)/parts/shipping/page"));
const RotablesPage = lazy(() => import("@/app/(app)/parts/rotables/page"));
const LoanersPage = lazy(() => import("@/app/(app)/parts/loaners/page"));
const AlertsPage = lazy(() => import("@/app/(app)/parts/alerts/page"));
const LotsPage = lazy(() => import("@/app/(app)/parts/lots/page"));
const POReceivingPage = lazy(() => import("@/app/(app)/parts/receiving/po/page"));
const WarehouseLocationsPage = lazy(
  () => import("@/app/(app)/parts/warehouse/page"),
);
const PartsTagsPage = lazy(() => import("@/app/(app)/parts/tags/page"));

const SquawksPage = lazy(() => import("@/app/(app)/squawks/page"));
const PersonnelPage = lazy(() => import("@/app/(app)/personnel/page"));
const PersonnelTimeManagementPage = lazy(
  () => import("@/app/(app)/personnel/time-management/page"),
);
const TrainingPage = lazy(() => import("@/app/(app)/personnel/training/page"));
const TechnicianTrainingPage = lazy(() => import("@/app/(app)/personnel/[id]/training/page"));
const OjtDashboardPage = lazy(() => import("@/app/(app)/training/ojt/page"));
const OjtCurriculumDetailPage = lazy(() => import("@/app/(app)/training/ojt/[curriculumId]/page"));
const OjtJacketDetailPage = lazy(() => import("@/app/(app)/training/ojt/jackets/[jacketId]/page"));
const OjtJacketsPage = lazy(() => import("@/app/(app)/training/ojt/jackets/page"));
const OjtRosterPage = lazy(() => import("@/app/(app)/training/ojt/roster/page"));
const MyWorkPage = lazy(() => import("@/app/(app)/my-work/page"));
const MyTimePage = lazy(() => import("@/app/(app)/my-work/time/page"));

const CompliancePage = lazy(() => import("@/app/(app)/compliance/page"));
const QcmReviewPage = lazy(() => import("@/app/(app)/compliance/qcm-review/page"));
const AuditTrailPage = lazy(() => import("@/app/(app)/compliance/audit-trail/page"));
const AdSbCompliancePage = lazy(() => import("@/app/(app)/compliance/ad-sb/page"));
const UnaccountedTasksPage = lazy(() => import("@/app/(app)/maintenance/unaccounted/page"));
const AuditReadinessPage = lazy(() => import("@/app/(app)/compliance/audit-readiness/page"));
const DiamondAwardPage = lazy(() => import("@/app/(app)/compliance/diamond-award/page"));

const CustomersPage = lazy(() => import("@/app/(app)/billing/customers/page"));
const CustomerDetailPage = lazy(
  () => import("@/app/(app)/billing/customers/[id]/page"),
);
const InvoicesPage = lazy(() => import("@/app/(app)/billing/invoices/page"));
const NewInvoicePage = lazy(() => import("@/app/(app)/billing/invoices/new/page"));
const InvoiceDetailPage = lazy(() => import("@/app/(app)/billing/invoices/[id]/page"));
const QuotesPage = lazy(() => import("@/app/(app)/billing/quotes/page"));
const NewQuotePage = lazy(() => import("@/app/(app)/billing/quotes/new/page"));
const QuoteDetailPage = lazy(() => import("@/app/(app)/billing/quotes/[id]/page"));
const PurchaseOrdersPage = lazy(
  () => import("@/app/(app)/billing/purchase-orders/page"),
);
const NewPOPage = lazy(() => import("@/app/(app)/billing/purchase-orders/new/page"));
const PODetailPage = lazy(
  () => import("@/app/(app)/billing/purchase-orders/[id]/page"),
);
const VendorsPage = lazy(() => import("@/app/(app)/billing/vendors/page"));
const NewVendorPage = lazy(() => import("@/app/(app)/billing/vendors/new/page"));
const VendorDetailPage = lazy(() => import("@/app/(app)/billing/vendors/[id]/page"));
const ArDashboardPage = lazy(() => import("@/app/(app)/billing/ar-dashboard/page"));
const BillingAnalyticsPage = lazy(() => import("@/app/(app)/billing/analytics/page"));
const BillingPricingPage = lazy(() => import("@/app/(app)/billing/pricing/page"));
const BillingTimeClockPage = lazy(() => import("@/app/(app)/billing/time-clock/page"));
const BillingTimeApprovalPage = lazy(
  () => import("@/app/(app)/billing/time-approval/page"),
);
const BillingDepositsPage = lazy(() => import("@/app/(app)/billing/deposits/page"));
const BillingCreditMemosPage = lazy(
  () => import("@/app/(app)/billing/credit-memos/page"),
);
const BillingRecurringPage = lazy(() => import("@/app/(app)/billing/recurring/page"));
const BillingTaxConfigPage = lazy(() => import("@/app/(app)/billing/tax-config/page"));
const BillingSettingsPage = lazy(() => import("@/app/(app)/billing/settings/page"));
const CustomerRequestsQueuePage = lazy(() => import("@/app/(app)/billing/customer-requests/page"));
const OTCSalesPage = lazy(() => import("@/app/(app)/billing/otc/page"));
const WarrantyPage = lazy(() => import("@/app/(app)/billing/warranty/page"));
const LaborKitsPage = lazy(() => import("@/app/(app)/billing/labor-kits/page"));
const QuoteTemplatesPage = lazy(() => import("@/app/(app)/billing/quotes/templates/page"));

const SalesDashboardPage = lazy(() => import("@/app/(app)/sales/dashboard/page"));
const SalesOpsPage = lazy(() => import("@/app/(app)/sales/ops/page"));
const SalesTrainingPage = lazy(() => import("@/app/(app)/sales/training/page"));
const SalesQuotesPage = lazy(() => import("@/app/(app)/sales/quotes/page"));
const SalesNewQuotePage = lazy(() => import("@/app/(app)/sales/quotes/new/page"));
const SalesQuoteDetailPage = lazy(() => import("@/app/(app)/sales/quotes/[id]/page"));

const SchedulingPage = lazy(() => import("@/app/(app)/scheduling/page"));
const CapacityPage = lazy(() => import("@/app/(app)/scheduling/capacity/page"));
const BaysPage = lazy(() => import("@/app/(app)/scheduling/bays/page"));
const SchedulingRosterPage = lazy(() => import("@/app/(app)/scheduling/roster/page"));
const FinancialPlanningPage = lazy(
  () => import("@/app/(app)/scheduling/financial-planning/page"),
);
const SchedulingQuotesPage = lazy(() => import("@/app/(app)/scheduling/quotes/page"));
const SeedAuditPage = lazy(() => import("@/app/(app)/scheduling/seed-audit/page"));
const DueListWorkbenchPage = lazy(() => import("@/app/(app)/scheduling/due-list/page"));

const ReportsPage = lazy(() => import("@/app/(app)/reports/page"));
const InventoryReportsPage = lazy(() => import("@/app/(app)/reports/inventory/page"));
const FinancialDashboardPage = lazy(() => import("@/app/(app)/reports/financials/page"));
const FinancialForecastPage = lazy(
  () => import("@/app/(app)/reports/financials/forecast/page"),
);
const FinancialProfitabilityPage = lazy(
  () => import("@/app/(app)/reports/financials/profitability/page"),
);
const FinancialRunwayPage = lazy(
  () => import("@/app/(app)/reports/financials/runway/page"),
);
const RevenueReportPage = lazy(() => import("@/app/(app)/reports/revenue/page"));
const ThroughputReportPage = lazy(() => import("@/app/(app)/reports/throughput/page"));

const ShopSettingsPage = lazy(() => import("@/app/(app)/settings/shop/page"));
const UsersSettingsPage = lazy(() => import("@/app/(app)/settings/users/page"));
const NotificationPreferencesPage = lazy(
  () => import("@/app/(app)/settings/notifications/page"),
);
const ShopLocationsPage = lazy(() => import("@/app/(app)/settings/locations/page"));
const ImportPage = lazy(() => import("@/app/(app)/settings/import/page"));
const EmailLogPage = lazy(() => import("@/app/(app)/settings/email-log/page"));
const QuickBooksPage = lazy(() => import("@/app/(app)/settings/quickbooks/page"));
const StationConfigPage = lazy(() => import("@/app/(app)/settings/station-config/page"));
const RoutingTemplatesPage = lazy(
  () => import("@/app/(app)/settings/routing-templates/page"),
);
const CapabilitiesListPage = lazy(() => import("@/app/(app)/settings/capabilities/page"));
const AdsbSettingsPage = lazy(() => import("@/app/(app)/settings/adsb/page"));

const CrmPipelinePage = lazy(() => import("@/app/(app)/crm/pipeline/page"));
const CrmDashboardPage = lazy(() => import("@/app/(app)/crm/dashboard/page"));
const CrmAccountsPage = lazy(() => import("@/app/(app)/crm/accounts/page"));
const CrmAccountDetailPage = lazy(() => import("@/app/(app)/crm/accounts/[id]/page"));
const CrmContactsPage = lazy(() => import("@/app/(app)/crm/contacts/page"));
const CrmInteractionsPage = lazy(() => import("@/app/(app)/crm/interactions/page"));
const CrmAnalyticsPage = lazy(() => import("@/app/(app)/crm/analytics/page"));

const AppNotFoundPage = lazy(() => import("@/app/(app)/not-found/page"));


function BillingQuoteIdRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/sales/quotes/${id}` : "/sales/quotes"} replace />;
}

function ProtectedAppContext() {
  return (
    <OrgContextProvider>
      <Outlet />
    </OrgContextProvider>
  );
}

export function protectedAppRoutes() {
  return (
    <Route key="app" element={<ProtectedRoute />}>
      <Route element={<ProtectedAppContext />}>
        <Route path="/onboarding" element={<OnboardingPage />} />

        <Route element={<OnboardingGate />}>
          <Route
            element={(
              <RouteGuard>
                <AppLayout />
              </RouteGuard>
            )}
          >
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/work-orders/dashboard" element={<WorkOrdersDashboardPage />} />
            <Route path="/work-orders/lead" element={<WorkOrdersLeadPage />} />
            <Route path="/work-orders/handoff" element={<WorkOrdersHandoffPage />} />
            <Route path="/lead" element={<LeadDashboardPage />} />
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
            <Route path="/work-orders/:id/execution" element={<WOExecutionPage />} />
            <Route path="/work-orders/:id/signature" element={<SignaturePage />} />

            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/fleet/calendar" element={<FleetCalendarPage />} />
            <Route path="/fleet/predictions" element={<PredictionsPage />} />
            <Route path="/fleet/llp" element={<FleetLLPDashboardPage />} />
            <Route path="/fleet/maintenance-programs" element={<MaintenanceProgramsPage />} />
            <Route path="/fleet/maintenance-programs/:id" element={<MaintenanceProgramDetailPage />} />
            <Route path="/fleet/:tail" element={<AircraftDetailPage />} />
            <Route path="/fleet/:tail/llp" element={<AircraftLLPDetailPage />} />
            <Route path="/fleet/:tail/logbook" element={<AircraftLogbookPage />} />
            <Route path="/fleet/:tail/adsb" element={<AircraftAdsbPage />} />

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
            <Route path="/parts/alerts" element={<AlertsPage />} />
            <Route path="/parts/lots" element={<LotsPage />} />
            <Route path="/parts/receiving/po" element={<POReceivingPage />} />
            <Route path="/parts/warehouse" element={<WarehouseLocationsPage />} />
            <Route path="/parts/tags" element={<PartsTagsPage />} />
            <Route path="/parts/:id" element={<PartDetailPage />} />

            <Route path="/squawks" element={<SquawksPage />} />
            <Route path="/personnel" element={<PersonnelPage />} />
            <Route path="/personnel/time-management" element={<PersonnelTimeManagementPage />} />
            <Route path="/personnel/training" element={<TrainingPage />} />
            <Route path="/personnel/:id/training" element={<TechnicianTrainingPage />} />
            <Route path="/training/ojt" element={<OjtDashboardPage />} />
            <Route path="/training/ojt/:curriculumId" element={<OjtCurriculumDetailPage />} />
            <Route path="/training/ojt/jackets/:jacketId" element={<OjtJacketDetailPage />} />
            <Route path="/training/ojt/jackets" element={<OjtJacketsPage />} />
            <Route path="/training/ojt/roster" element={<OjtRosterPage />} />
            <Route path="/my-work" element={<MyWorkPage />} />
            <Route path="/my-work/time" element={<MyTimePage />} />

            <Route path="/maintenance/unaccounted" element={<UnaccountedTasksPage />} />

            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/compliance/qcm-review" element={<QcmReviewPage />} />
            <Route path="/compliance/audit-trail" element={<AuditTrailPage />} />
            <Route path="/compliance/ad-sb" element={<AdSbCompliancePage />} />
            <Route path="/compliance/audit-readiness" element={<AuditReadinessPage />} />
            <Route path="/compliance/diamond-award" element={<DiamondAwardPage />} />
            <Route
              path="/compliance/certificates"
              element={<Navigate to="/compliance/audit-trail" replace />}
            />

            <Route path="/billing" element={<Navigate to="/billing/customers" replace />} />
            <Route path="/billing/customers" element={<CustomersPage />} />
            <Route path="/billing/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/billing/invoices" element={<InvoicesPage />} />
            <Route path="/billing/invoices/new" element={<NewInvoicePage />} />
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/sales" element={<Navigate to="/sales/dashboard" replace />} />
            <Route path="/sales/dashboard" element={<SalesDashboardPage />} />
            <Route path="/sales/ops" element={<SalesOpsPage />} />
            <Route path="/sales/training" element={<SalesTrainingPage />} />
            <Route path="/sales/quotes" element={<SalesQuotesPage />} />
            <Route path="/sales/quotes/new" element={<SalesNewQuotePage />} />
            <Route path="/sales/quotes/templates" element={<QuoteTemplatesPage />} />
            <Route path="/sales/quotes/:id" element={<SalesQuoteDetailPage />} />

            <Route path="/billing/quotes" element={<Navigate to="/sales/quotes" replace />} />
            <Route path="/billing/quotes/new" element={<Navigate to="/sales/quotes/new" replace />} />
            <Route path="/billing/quotes/templates" element={<Navigate to="/sales/quotes/templates" replace />} />
            <Route path="/billing/quotes/:id" element={<BillingQuoteIdRedirect />} />
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
            <Route path="/billing/customer-requests" element={<CustomerRequestsQueuePage />} />
            <Route path="/billing/otc" element={<OTCSalesPage />} />
            <Route path="/billing/warranty" element={<WarrantyPage />} />
            <Route path="/billing/labor-kits" element={<LaborKitsPage />} />

            <Route path="/crm" element={<Navigate to="/crm/dashboard" replace />} />
            <Route path="/crm/dashboard" element={<CrmDashboardPage />} />
            <Route path="/crm/accounts" element={<CrmAccountsPage />} />
            <Route path="/crm/accounts/:id" element={<CrmAccountDetailPage />} />
            <Route path="/crm/contacts" element={<CrmContactsPage />} />
            <Route path="/crm/interactions" element={<CrmInteractionsPage />} />
            <Route path="/crm/pipeline" element={<CrmPipelinePage />} />
            <Route path="/crm/analytics" element={<CrmAnalyticsPage />} />

            <Route path="/scheduling" element={<SchedulingPage />} />
            <Route path="/scheduling/bays" element={<BaysPage />} />
            <Route path="/scheduling/capacity" element={<CapacityPage />} />
            <Route path="/scheduling/roster" element={<SchedulingRosterPage />} />
            <Route
              path="/scheduling/financial-planning"
              element={<FinancialPlanningPage />}
            />
            <Route path="/scheduling/quotes" element={<SchedulingQuotesPage />} />
            <Route path="/scheduling/due-list" element={<DueListWorkbenchPage />} />
            <Route path="/scheduling/seed-audit" element={<SeedAuditPage />} />

            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/inventory" element={<InventoryReportsPage />} />
            <Route path="/reports/financials" element={<FinancialDashboardPage />} />
            <Route path="/reports/financials/forecast" element={<FinancialForecastPage />} />
            <Route
              path="/reports/financials/profitability"
              element={<FinancialProfitabilityPage />}
            />
            <Route path="/reports/financials/runway" element={<FinancialRunwayPage />} />
            <Route path="/reports/revenue" element={<RevenueReportPage />} />
            <Route path="/reports/throughput" element={<ThroughputReportPage />} />

            <Route path="/settings/shop" element={<ShopSettingsPage />} />
            <Route path="/settings/users" element={<UsersSettingsPage />} />
            <Route
              path="/settings/notifications"
              element={<NotificationPreferencesPage />}
            />
            <Route path="/settings/locations" element={<ShopLocationsPage />} />
            <Route path="/settings/import" element={<ImportPage />} />
            <Route path="/settings/email-log" element={<EmailLogPage />} />
            <Route path="/settings/quickbooks" element={<QuickBooksPage />} />
            <Route path="/settings/station-config" element={<StationConfigPage />} />
            <Route
              path="/settings/routing-templates"
              element={<RoutingTemplatesPage />}
            />
            <Route path="/settings/capabilities" element={<CapabilitiesListPage />} />
            <Route path="/settings/adsb" element={<AdsbSettingsPage />} />

            <Route path="*" element={<AppNotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Route>
  );
}
