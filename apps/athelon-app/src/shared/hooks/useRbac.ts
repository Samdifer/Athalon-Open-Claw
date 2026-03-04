import { useMemo } from "react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  canAccessRoute,
  hasPermission as checkPermission,
  type MroRole,
  MRO_ROLES,
} from "@/lib/rbac";

function isMroRole(value: string | null | undefined): value is MroRole {
  return (MRO_ROLES as readonly string[]).includes(value ?? "");
}

export function useRbac() {
  const { tech } = useCurrentOrg();

  const role = useMemo<MroRole>(() => {
    const techRole = tech?.role;
    return isMroRole(techRole) ? techRole : "read_only";
  }, [tech?.role]);

  const hasPermission = useMemo(
    () => (permission: string) => checkPermission(role, permission),
    [role],
  );

  const canAccess = useMemo(
    () => (route: string) => canAccessRoute(role, route),
    [role],
  );

  const isAdmin = role === "admin";
  const isManager = role === "admin" || role === "shop_manager" || role === "billing_manager";
  const isInspector = role === "qcm_inspector";

  return {
    role,
    hasPermission,
    canAccess,
    isAdmin,
    isManager,
    isInspector,
  };
}
