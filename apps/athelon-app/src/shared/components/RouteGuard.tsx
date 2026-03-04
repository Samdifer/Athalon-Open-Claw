import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useUserRole } from "@/hooks/useUserRole";
import type { MroRole } from "@/lib/mro-constants";
import { ALL_ROLES, getAllowedRolesForPath } from "@/lib/route-permissions";

interface RouteGuardProps {
  requiredPermission?: string;
  allowedRoles?: string[];
  children: ReactNode;
}

const PERMISSION_ROLE_MAP: Record<string, ReadonlyArray<MroRole>> = {
  settings: ["admin"],
  billing: ["admin", "shop_manager", "billing_manager"],
  compliance: ["admin", "shop_manager", "qcm_inspector"],
  scheduling: ["admin", "shop_manager", "lead_technician"],
  personnel: ["admin", "shop_manager"],
  parts: ["admin", "shop_manager", "parts_clerk", "lead_technician"],
  fleet: ALL_ROLES,
  work_orders: ALL_ROLES,
  dashboard: ALL_ROLES,
  reports: ["admin", "shop_manager", "billing_manager", "qcm_inspector"],
};

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

    if (requiredPermission && PERMISSION_ROLE_MAP[requiredPermission]) {
      return PERMISSION_ROLE_MAP[requiredPermission];
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
