import { Badge } from "@/components/ui/badge";
import { ROLE_DISPLAY_NAMES, type MroRole } from "@/lib/rbac";

type RoleBadgeProps = {
  role: string;
  className?: string;
};

const ROLE_BADGE_STYLES: Record<MroRole, string> = {
  admin: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  shop_manager: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  qcm_inspector: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  billing_manager: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
  lead_technician: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  technician: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  parts_clerk: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  read_only: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30",
};

function normalizeRole(role: string): MroRole {
  return role in ROLE_BADGE_STYLES ? (role as MroRole) : "read_only";
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const normalizedRole = normalizeRole(role);
  return (
    <Badge
      variant="outline"
      className={`text-[10px] border ${ROLE_BADGE_STYLES[normalizedRole]} ${className ?? ""}`}
    >
      {ROLE_DISPLAY_NAMES[normalizedRole]}
    </Badge>
  );
}
