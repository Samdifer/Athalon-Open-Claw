import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthRoutes } from "@/src/router/routeModules/authRoutes";
import { CustomerPortalRoutes } from "@/src/router/routeModules/customerPortalRoutes";
import { ProtectedAppRoutes } from "@/src/router/routeModules/protectedAppRoutes";

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

export default function AppRouter() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <AuthRoutes />
        <CustomerPortalRoutes />
        <ProtectedAppRoutes />
      </Routes>
    </Suspense>
  );
}
