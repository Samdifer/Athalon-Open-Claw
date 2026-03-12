import { Outlet } from "react-router-dom";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { FirstRunWizard } from "@/components/FirstRunWizard";

export function OnboardingGate() {
  const { isLoaded, bootstrapStatus } = useCurrentOrg();

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

  if (bootstrapStatus === "needs_bootstrap") {
    return <FirstRunWizard />;
  }

  return <Outlet />;
}
