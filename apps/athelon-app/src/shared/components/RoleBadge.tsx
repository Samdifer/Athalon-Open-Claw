import { Badge } from "@/components/ui/badge";
import { ROLE_BADGE_COLORS, ROLE_DISPLAY_NAMES, type MroRole } from "@/lib/rbac";

type RoleBadgeProps = {
  role: string;
  className?: string;
};

function normalizeRole(role: string): MroRole {
  return role in ROLE_BADGE_COLORS ? (role as MroRole) : "read_only";
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const normalizedRole = normalizeRole(role);
  return (
    <Badge
      variant="outline"
      className={`text-[10px] border ${ROLE_BADGE_COLORS[normalizedRole]} ${className ?? ""}`}
    >
      {ROLE_DISPLAY_NAMES[normalizedRole]}
    </Badge>
  );
}
