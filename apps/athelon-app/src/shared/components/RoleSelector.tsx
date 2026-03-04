import {
  MRO_ROLES,
  ROLE_BADGE_STYLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type MroRole,
} from "@/lib/mro-constants";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoleSelectorProps {
  value: MroRole;
  onChange: (role: MroRole) => void;
  disabled?: boolean;
  excludeRoles?: MroRole[];
}

export function RoleSelector({
  value,
  onChange,
  disabled = false,
  excludeRoles = [],
}: RoleSelectorProps) {
  const availableRoles = MRO_ROLES.filter((role) => !excludeRoles.includes(role));

  return (
    <Select
      value={value}
      onValueChange={(nextRole) => onChange(nextRole as MroRole)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>{ROLE_LABELS[value]}</span>
            <Badge variant="outline" className={ROLE_BADGE_STYLES[value]}>
              {ROLE_LABELS[value]}
            </Badge>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableRoles.map((role) => (
          <SelectItem key={role} value={role}>
            <span className="flex w-full items-center justify-between gap-3">
              <span className="flex flex-col text-left">
                <span>{ROLE_LABELS[role]}</span>
                <span className="text-muted-foreground text-xs">{ROLE_DESCRIPTIONS[role]}</span>
              </span>
              <Badge variant="outline" className={ROLE_BADGE_STYLES[role]}>
                {ROLE_LABELS[role]}
              </Badge>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
