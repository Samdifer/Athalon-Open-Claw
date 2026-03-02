"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

type QuoteWorkspaceWorkOrder = {
  _id: string;
  workOrderNumber: string;
  description: string;
  priority: "routine" | "urgent" | "aog";
  aircraft: { currentRegistration: string | undefined; make: string; model: string } | null;
  sourceQuoteId?: string;
  quoteNumber?: string | null;
  quoteStatus?: string | null;
};

type SchedulingQuoteWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrders: QuoteWorkspaceWorkOrder[];
  initialWorkOrderId?: string;
};

function priorityBadge(priority: QuoteWorkspaceWorkOrder["priority"]) {
  if (priority === "aog") {
    return <Badge className="text-[10px] bg-red-600 text-white border-red-500">AOG</Badge>;
  }
  if (priority === "urgent") {
    return <Badge className="text-[10px] bg-orange-500 text-white border-orange-400">URGENT</Badge>;
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      ROUTINE
    </Badge>
  );
}

export function SchedulingQuoteWorkspaceDialog({
  open,
  onOpenChange,
  workOrders,
  initialWorkOrderId,
}: SchedulingQuoteWorkspaceDialogProps) {
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | undefined>(
    initialWorkOrderId ?? workOrders[0]?._id,
  );

  useEffect(() => {
    if (!open) return;
    if (initialWorkOrderId && workOrders.some((wo) => wo._id === initialWorkOrderId)) {
      setSelectedWorkOrderId(initialWorkOrderId);
      return;
    }
    if (!selectedWorkOrderId || !workOrders.some((wo) => wo._id === selectedWorkOrderId)) {
      setSelectedWorkOrderId(workOrders[0]?._id);
    }
  }, [open, initialWorkOrderId, selectedWorkOrderId, workOrders]);

  const selectedWorkOrder = useMemo(
    () => workOrders.find((wo) => wo._id === selectedWorkOrderId) ?? null,
    [selectedWorkOrderId, workOrders],
  );

  const workspaceUrl = useMemo(() => {
    if (!selectedWorkOrder) return "/billing/quotes/new?from=scheduling";
    if (selectedWorkOrder.sourceQuoteId) {
      return `/billing/quotes/${selectedWorkOrder.sourceQuoteId}?from=scheduling`;
    }
    return `/billing/quotes/new?workOrderId=${selectedWorkOrder._id}&from=scheduling`;
  }, [selectedWorkOrder]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[96vw] w-[96vw] h-[88vh] p-0 gap-0 overflow-hidden"
        data-testid="quote-workspace-dialog"
      >
        <DialogHeader className="px-4 py-3 border-b border-border/50">
          <DialogTitle className="text-base">Scheduling Quote Workspace</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex flex-1">
          <aside className="w-80 border-r border-border/50 bg-muted/20 min-h-0 flex flex-col">
            <div className="px-3 py-2 border-b border-border/40 text-xs text-muted-foreground">
              Choose a work order to open quote workflow in-line.
            </div>
            <div className="flex-1 overflow-y-auto">
              {workOrders.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No active work orders available for quote workflow.
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {workOrders.map((wo) => {
                    const selected = wo._id === selectedWorkOrderId;
                    return (
                      <li key={wo._id}>
                        <button
                          type="button"
                          className={`w-full text-left px-3 py-2.5 transition-colors ${
                            selected
                              ? "bg-violet-500/10 border-l-2 border-violet-500"
                              : "hover:bg-muted/40"
                          }`}
                          onClick={() => setSelectedWorkOrderId(wo._id)}
                          data-testid={`quote-workspace-select-${wo._id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-semibold truncate">
                              {wo.workOrderNumber}
                            </span>
                            {priorityBadge(wo.priority)}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {wo.aircraft?.currentRegistration ?? "No aircraft"} • {wo.description}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {wo.quoteNumber
                              ? `${wo.quoteNumber}${wo.quoteStatus ? ` • ${wo.quoteStatus}` : ""}`
                              : "No linked quote yet"}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section className="min-w-0 flex-1 flex flex-col">
            <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between gap-2 bg-background">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">
                  {selectedWorkOrder?.workOrderNumber ?? "Quote Builder"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {selectedWorkOrder?.quoteNumber
                    ? `Editing ${selectedWorkOrder.quoteNumber}`
                    : "Creating a new quote draft"}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild className="text-xs h-7">
                <a href={workspaceUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Tab
                </a>
              </Button>
            </div>
            <div className="flex-1 min-h-0 bg-background">
              <iframe
                key={workspaceUrl}
                src={workspaceUrl}
                className="w-full h-full border-0"
                title="Scheduling Quote Workspace"
                data-testid="quote-workspace-iframe"
              />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
