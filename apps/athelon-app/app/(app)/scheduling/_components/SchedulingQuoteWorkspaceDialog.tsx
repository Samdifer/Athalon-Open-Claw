"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WorkspaceWorkOrder = {
  _id: string;
  workOrderNumber: string;
  description: string;
  priority: "routine" | "urgent" | "aog";
  aircraft?: {
    currentRegistration?: string | null;
    make?: string | null;
    model?: string | null;
  } | null;
  sourceQuoteId?: string | null;
  quoteNumber?: string | null;
  quoteStatus?: string | null;
};

function priorityBadge(priority: WorkspaceWorkOrder["priority"]) {
  if (priority === "aog") {
    return <Badge className="text-[10px] bg-red-500/15 text-red-400 border-red-500/40">AOG</Badge>;
  }
  if (priority === "urgent") {
    return <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/40">Urgent</Badge>;
  }
  return (
    <Badge variant="outline" className="text-[10px] border-border/60 text-muted-foreground">
      Routine
    </Badge>
  );
}

export function SchedulingQuoteWorkspaceDialog({
  open,
  onOpenChange,
  workOrders,
  initialWorkOrderId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrders: WorkspaceWorkOrder[];
  initialWorkOrderId?: string;
}) {
  const ordered = useMemo(() => {
    const selected = workOrders.find((wo) => wo._id === initialWorkOrderId);
    if (!selected) return workOrders;
    return [selected, ...workOrders.filter((wo) => wo._id !== initialWorkOrderId)];
  }, [initialWorkOrderId, workOrders]);

  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (ordered.length === 0) {
      setSelectedWorkOrderId("");
      return;
    }

    if (initialWorkOrderId && ordered.some((wo) => wo._id === initialWorkOrderId)) {
      setSelectedWorkOrderId(initialWorkOrderId);
      return;
    }

    setSelectedWorkOrderId((prev) => {
      if (prev && ordered.some((wo) => wo._id === prev)) {
        return prev;
      }
      return ordered[0]._id;
    });
  }, [open, ordered, initialWorkOrderId]);

  const selectedWorkOrder =
    ordered.find((wo) => wo._id === selectedWorkOrderId) ?? ordered[0];

  const iframeSrc = selectedWorkOrder
    ? selectedWorkOrder.sourceQuoteId
      ? `/sales/quotes/${selectedWorkOrder.sourceQuoteId}?workOrderId=${selectedWorkOrder._id}`
      : `/sales/quotes/new?workOrderId=${selectedWorkOrder._id}`
    : "/sales/quotes";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[94vw] lg:max-w-6xl"
        data-testid="quote-workspace-dialog"
      >
        <DialogHeader>
          <DialogTitle>Quote Workspace</DialogTitle>
          <DialogDescription>
            Select a work order and use the embedded quote flow without leaving the scheduler.
          </DialogDescription>
        </DialogHeader>

        {ordered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No active work orders available for quote workspace.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
            <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border/50 divide-y divide-border/40">
              {ordered.map((wo) => {
                const isSelected = wo._id === selectedWorkOrder?._id;
                return (
                  <button
                    key={wo._id}
                    className={`w-full text-left p-3 transition-colors ${
                      isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                    }`}
                    onClick={() => setSelectedWorkOrderId(wo._id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{wo.workOrderNumber}</span>
                      {priorityBadge(wo.priority)}
                      {wo.quoteNumber ? (
                        <Badge variant="outline" className="text-[10px] border-border/60">
                          {wo.quoteNumber}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-border/60 text-muted-foreground"
                        >
                          No quote linked
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-foreground truncate mt-1">{wo.description}</div>
                    <div className="text-[11px] text-muted-foreground truncate mt-1">
                      {wo.aircraft?.currentRegistration ?? "—"} · {wo.aircraft?.make ?? ""} {wo.aircraft?.model ?? ""}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-md border border-border/50 overflow-hidden bg-background/70">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedWorkOrder?.workOrderNumber ?? "Quote Workspace"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {selectedWorkOrder?.description ?? ""}
                  </p>
                </div>
                {selectedWorkOrder && (
                  <Button asChild size="sm" variant="outline" className="h-7 text-[11px] gap-1.5 flex-shrink-0">
                    <Link to={iframeSrc} onClick={() => onOpenChange(false)}>
                      <FileText className="w-3.5 h-3.5" />
                      Open
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </Button>
                )}
              </div>

              <iframe
                title="Quote Workspace"
                src={iframeSrc}
                className="w-full h-[58vh] bg-background"
                data-testid="quote-workspace-iframe"
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
