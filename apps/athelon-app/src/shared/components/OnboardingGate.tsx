import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";

export function OnboardingGate() {
  const { isLoaded, bootstrapStatus, needsBootstrap, awaitingProfileLink } = useCurrentOrg();
  const { pathname } = useLocation();

  if (!isLoaded || bootstrapStatus === "loading") {
    return (
      <div
        data-testid="page-loading-state"
        className="min-h-screen flex items-center justify-center bg-background"
      >
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOnboardingRoute = pathname.startsWith("/onboarding");

  if (needsBootstrap && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (awaitingProfileLink && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!needsBootstrap && !awaitingProfileLink && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
