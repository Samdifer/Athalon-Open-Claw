import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/app/(app)/layout";
import SignInPage from "@/app/(auth)/sign-in/[[...sign-in]]/page";
import SignUpPage from "@/app/(auth)/sign-up/[[...sign-up]]/page";
import DashboardPage from "@/app/(app)/dashboard/page";
import WorkOrdersPage from "@/app/(app)/work-orders/page";
import WorkOrderDetailPage from "@/app/(app)/work-orders/[id]/page";
import FleetPage from "@/app/(app)/fleet/page";
import SquawksPage from "@/app/(app)/squawks/page";
import PartsRequestsPage from "@/app/(app)/parts/requests/page";
import PersonnelPage from "@/app/(app)/personnel/page";
import AuditTrailPage from "@/app/(app)/compliance/audit-trail/page";
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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/work-orders" element={<WorkOrdersPage />} />
          <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/squawks" element={<SquawksPage />} />
          <Route path="/parts/requests" element={<PartsRequestsPage />} />
          <Route path="/personnel" element={<PersonnelPage />} />
          <Route path="/compliance/audit-trail" element={<AuditTrailPage />} />
          <Route path="/settings/shop" element={<ShopSettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
