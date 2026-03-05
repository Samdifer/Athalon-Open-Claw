import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/components/customer/CustomerAuthContext";

export function CustomerProtectedRoute() {
  const { signOut } = useAuth();
  const { isLoaded, isSignedIn, hasPortalAccess } = useCustomerAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/portal/sign-in" replace />;
  }

  if (!hasPortalAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center space-y-3">
          <h1 className="text-xl font-semibold text-foreground">No Customer Portal Access</h1>
          <p className="text-sm text-muted-foreground">
            Your account is signed in, but it is not linked to an active customer portal profile.
            Contact your maintenance provider to enable access.
          </p>
          <div className="pt-2">
            <Button variant="outline" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
