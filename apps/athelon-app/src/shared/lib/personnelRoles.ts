import type { MroRole } from "@/src/shared/lib/rbac";

export const TECHNICAL_ROLES: readonly MroRole[] = [
  "admin",
  "shop_manager",
  "qcm_inspector",
  "lead_technician",
  "technician",
  "parts_clerk",
];

export const NON_BILLABLE_SALES_ROLES: readonly MroRole[] = [
  "sales_rep",
  "sales_manager",
];

export const DEAL_OWNER_ROLES: readonly MroRole[] = [
  "admin",
  "shop_manager",
  "billing_manager",
  "sales_rep",
  "sales_manager",
  "lead_technician",
];

export function isMroRole(value: string | null | undefined): value is MroRole {
  if (!value) return false;
  return [
    "admin",
    "shop_manager",
    "qcm_inspector",
    "billing_manager",
    "lead_technician",
    "technician",
    "parts_clerk",
    "sales_rep",
    "sales_manager",
    "read_only",
  ].includes(value);
}

export function isTechnicalRole(role: string | null | undefined): boolean {
  return isMroRole(role) && TECHNICAL_ROLES.includes(role);
}

export function isNonBillableSalesRole(role: string | null | undefined): boolean {
  return isMroRole(role) && NON_BILLABLE_SALES_ROLES.includes(role);
}

export function isEligibleDealOwnerRole(role: string | null | undefined): boolean {
  return isMroRole(role) && DEAL_OWNER_ROLES.includes(role);
}
