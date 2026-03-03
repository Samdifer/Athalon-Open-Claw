// components/RoleGuard.tsx — Route guard that checks user role

import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { MRORole } from "@/lib/roles";
import type { ReactNode } from "react";

interface RoleGuardProps {
  allowedRoles: MRORole[];
  children: ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { isLoaded, needsBootstrap } = useCurrentOrg();
  const { role, isLoading } = useUserRole();

  if (!isLoaded || isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-[50vh]"
        data-testid="page-loading-state"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (needsBootstrap) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            </div>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Complete onboarding before accessing this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/onboarding">Complete Setup</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No role assigned = allow (legacy/migration compatibility)
  if (role === null) {
    return <>{children}</>;
  }

  if (!allowedRoles.includes(role!)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
