import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Calendar, DollarSign, Plane } from "lucide-react";

export type PipelineStatus =
  | "new"
  | "contacted"
  | "quote_sent"
  | "won"
  | "lost";

export type PipelineOpportunity = {
  id: string;
  aircraftTail: string;
  customerName: string;
  maintenanceType: string;
  dueDate: number;
  estimatedValue: number;
  estimatedLaborHours: number;
  status: PipelineStatus;
};

const STATUS_STYLES: Record<
  PipelineStatus,
  { label: string; className: string }
> = {
  new: {
    label: "New Opportunity",
    className: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  },
  contacted: {
    label: "Contacted",
    className: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  },
  quote_sent: {
    label: "Quote Sent",
    className: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  },
  won: {
    label: "Won",
    className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  },
  lost: {
    label: "Lost",
    className: "bg-red-500/15 text-red-500 border-red-500/30",
  },
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function OpportunityCard({ opportunity }: { opportunity: PipelineOpportunity }) {
  const status = STATUS_STYLES[opportunity.status];

  return (
    <Card className="border-border/60">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Plane className="w-3 h-3" />
              <span className="truncate">{opportunity.aircraftTail}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{opportunity.customerName}</span>
            </div>
          </div>
          <Badge className={status.className}>{status.label}</Badge>
        </div>

        <p className="text-sm font-medium leading-tight">{opportunity.maintenanceType}</p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(opportunity.dueDate)}</span>
          </div>
          <div className="flex items-center justify-end gap-1 text-foreground font-semibold">
            <DollarSign className="w-3 h-3" />
            <span>{formatMoney(opportunity.estimatedValue)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button size="sm" className="h-7 text-[11px] px-2" variant="default">
            Create Quote
          </Button>
          <Button size="sm" className="h-7 text-[11px] px-2" variant="outline">
            Contact Customer
          </Button>
          <Button size="sm" className="h-7 text-[11px] px-2" variant="ghost">
            Dismiss
          </Button>
          <Button asChild size="sm" variant="link" className="h-7 text-[11px] px-1">
            <Link to="/sales/quotes/new">Open Quotes</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
