import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, Wrench, DollarSign, Calendar } from "lucide-react";
import { HealthScoreBadge } from "./HealthScoreBadge";
import { formatDate, formatCurrency } from "@/lib/format";

type CustomerType =
  | "individual"
  | "company"
  | "charter_operator"
  | "flight_school"
  | "government";

const TYPE_BADGE_STYLES: Record<CustomerType, string> = {
  individual: "bg-muted text-muted-foreground border-muted-foreground/30",
  company: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  charter_operator: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  flight_school: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  government: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
};

const TYPE_LABELS: Record<CustomerType, string> = {
  individual: "Individual",
  company: "Company",
  charter_operator: "Charter Operator",
  flight_school: "Flight School",
  government: "Government",
};

interface AccountCardProps {
  id: string;
  name: string;
  companyName?: string;
  customerType: string;
  aircraftCount: number;
  openWoCount: number;
  totalRevenue: number;
  healthScore: number | null;
  lastInteractionDate: number | null;
  onClick: () => void;
}

export function AccountCard({
  name,
  companyName,
  customerType,
  aircraftCount,
  openWoCount,
  totalRevenue,
  healthScore,
  lastInteractionDate,
  onClick,
}: AccountCardProps) {
  const typedType = customerType as CustomerType;

  return (
    <Card
      className="border-border/60 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{name}</p>
            {companyName && (
              <p className="text-xs text-muted-foreground truncate">{companyName}</p>
            )}
          </div>
          <HealthScoreBadge score={healthScore} />
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[10px] font-medium border ${TYPE_BADGE_STYLES[typedType] ?? ""}`}
          >
            {TYPE_LABELS[typedType] ?? customerType}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Plane className="w-3 h-3" />
            <span>{aircraftCount} aircraft</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wrench className="w-3 h-3" />
            <span>{openWoCount} open WOs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" />
            <span>{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            <span>{lastInteractionDate ? formatDate(lastInteractionDate) : "Never"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
