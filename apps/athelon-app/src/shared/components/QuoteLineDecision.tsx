import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/format";

export type QuoteLineDecisionValue = "approved" | "declined" | "deferred";
export type QuoteLineCategory = "airworthiness" | "recommended" | "customer_info_only";

type QuoteLineDecisionProps = {
  decision?: QuoteLineDecisionValue;
  category: QuoteLineCategory;
  decidedAt?: number;
  decidedByName?: string;
  notes?: string;
  canDecide?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
};

const categoryStyles: Record<QuoteLineCategory, string> = {
  airworthiness: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  recommended: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  customer_info_only: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

const categoryLabels: Record<QuoteLineCategory, string> = {
  airworthiness: "Airworthiness",
  recommended: "Recommended",
  customer_info_only: "Customer Info",
};

export function QuoteLineDecision({
  decision,
  category,
  decidedAt,
  decidedByName,
  notes,
  canDecide = false,
  onAccept,
  onDecline,
}: QuoteLineDecisionProps) {
  const status =
    decision === "approved"
      ? { label: "Accepted", cls: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30", icon: CheckCircle2 }
      : decision === "declined"
        ? { label: "Declined", cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30", icon: XCircle }
        : { label: "Pending", cls: "bg-muted text-muted-foreground border-border/50", icon: Clock3 };

  const StatusIcon = status.icon;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={`text-[10px] border ${categoryStyles[category]}`}>
          {categoryLabels[category]}
        </Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`text-[10px] border gap-1 ${status.cls}`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-[11px]">
              <p>{status.label}</p>
              {decidedByName ? <p>By: {decidedByName}</p> : null}
              {decidedAt ? <p>At: {formatDate(decidedAt)}</p> : null}
              {notes ? <p>Notes: {notes}</p> : null}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {canDecide && (
        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px] border-green-500/40 text-green-600 dark:text-green-400"
            onClick={onAccept}
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px] border-red-500/40 text-red-600 dark:text-red-400"
            onClick={onDecline}
          >
            <XCircle className="mr-1 h-3 w-3" />
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}
