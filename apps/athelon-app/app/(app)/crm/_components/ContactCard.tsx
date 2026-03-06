import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, Star } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  dom: "Director of Maintenance",
  chief_pilot: "Chief Pilot",
  ap_manager: "AP Manager",
  operations: "Operations",
  dispatcher: "Dispatcher",
  other: "Other",
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  dom: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  chief_pilot: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  ap_manager: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  operations: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  dispatcher: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  other: "bg-muted text-muted-foreground border-muted-foreground/30",
};

interface ContactCardProps {
  firstName: string;
  lastName: string;
  title?: string;
  role?: string;
  companyName: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

export function ContactCard({
  firstName,
  lastName,
  title,
  role,
  companyName,
  phone,
  email,
  isPrimary,
}: ContactCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-sm truncate">
                {firstName} {lastName}
              </p>
              {isPrimary && (
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
              )}
            </div>
            {title && (
              <p className="text-xs text-muted-foreground truncate">{title}</p>
            )}
          </div>
          {role && (
            <Badge
              variant="outline"
              className={`text-[10px] font-medium border flex-shrink-0 ${ROLE_BADGE_STYLES[role] ?? ROLE_BADGE_STYLES.other}`}
            >
              {ROLE_LABELS[role] ?? role}
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{companyName}</p>

        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              <span>{phone}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3" />
              <span className="truncate">{email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
