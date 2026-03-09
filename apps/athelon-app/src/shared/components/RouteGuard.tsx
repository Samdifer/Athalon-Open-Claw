import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useUserRole } from "@/hooks/useUserRole";
import type { MroRole } from "@/lib/mro-constants";
import { hasPermission } from "@/lib/rbac";
import { ALL_ROLES, getAllowedRolesForPath } from "@/lib/route-permissions";

interface RouteGuardProps {
  requiredPermission?: string;
  allowedRoles?: string[];
  children: ReactNode;
}

function getAllowedRolesForRequiredPermission(
  requiredPermission: string,
): ReadonlyArray<MroRole> | undefined {
  const normalizedPermission = requiredPermission.includes(".")
    ? requiredPermission
    : `${requiredPermission}.view`;
  const allowedRoles = ALL_ROLES.filter((role) => hasPermission(role, normalizedPermission));
  return allowedRoles.length > 0 ? allowedRoles : undefined;
}

function LoadingState() {
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

export function RouteGuard({ requiredPermission, allowedRoles, children }: RouteGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded: orgLoaded } = useCurrentOrg();
  const { role, isLoading: roleLoading } = useUserRole();
  const hasRedirectedRef = useRef(false);

  const effectiveAllowedRoles = useMemo(() => {
    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      return allowedRoles as MroRole[];
    }

    if (requiredPermission) {
      const permissionAllowedRoles = getAllowedRolesForRequiredPermission(requiredPermission);
      if (permissionAllowedRoles) return permissionAllowedRoles;
    }

    return getAllowedRolesForPath(location.pathname);
  }, [allowedRoles, requiredPermission, location.pathname]);

  const isLoading = !orgLoaded || roleLoading;

  const isUnauthorized = useMemo(() => {
    if (isLoading) return false;
    if (role === null) return false;
    if (!effectiveAllowedRoles || effectiveAllowedRoles.length === 0) return false;
    return !effectiveAllowedRoles.includes(role as MroRole);
  }, [isLoading, role, effectiveAllowedRoles]);

  useEffect(() => {
    if (!isUnauthorized || hasRedirectedRef.current) return;

    hasRedirectedRef.current = true;
    toast.error("You don't have access to this page");
    navigate("/dashboard", { replace: true });
  }, [isUnauthorized, navigate]);

  useEffect(() => {
    hasRedirectedRef.current = false;
  }, [location.pathname]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isUnauthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
