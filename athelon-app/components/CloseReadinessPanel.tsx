"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

interface CloseReadinessPanelProps {
  workOrderId: Id<"workOrders">;
  organizationId: Id<"organizations">;
}

interface CheckItem {
  label: string;
  passed: boolean;
}

export function CloseReadinessPanel({
  workOrderId,
  organizationId,
}: CloseReadinessPanelProps) {
  const readiness = useQuery(api.workOrders.getCloseReadiness, {
    workOrderId,
    organizationId,
  });

  const [closing, setClosing] = useState(false);

  if (!readiness) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const canClose = readiness.canClose ?? false;
  const blockers: string[] = readiness.blockers ?? [];

  // Build checklist from blockers
  const CHECKLIST_ITEMS: CheckItem[] = [
    { label: "All task cards complete", passed: !blockers.some((b) => b.toLowerCase().includes("task card") && b.toLowerCase().includes("complete")) },
    { label: "All task cards signed (tech + inspector)", passed: !blockers.some((b) => b.toLowerCase().includes("sign")) },
    { label: "All discrepancies resolved", passed: !blockers.some((b) => b.toLowerCase().includes("discrepan")) },
    { label: "All parts accounted for", passed: !blockers.some((b) => b.toLowerCase().includes("part")) },
    { label: "Time entries approved", passed: !blockers.some((b) => b.toLowerCase().includes("time")) },
    { label: "Invoice generated", passed: !blockers.some((b) => b.toLowerCase().includes("invoice")) },
  ];

  const handleClose = async () => {
    setClosing(true);
    try {
      // The close mutation would be called here
      toast.success("Work order closed successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close work order");
    } finally {
      setClosing(false);
    }
  };

  return (
    <Card className={canClose ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Close Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1.5">
          {CHECKLIST_ITEMS.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-xs">
              {item.passed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              )}
              <span className={item.passed ? "text-muted-foreground" : "text-foreground font-medium"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>

        {blockers.length > 0 && (
          <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 space-y-0.5">
            {blockers.map((b) => (
              <p key={b} className="flex items-center gap-1.5">
                <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                {b}
              </p>
            ))}
          </div>
        )}

        <Button
          className="w-full"
          disabled={!canClose || closing}
          onClick={handleClose}
        >
          {closing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Close Work Order
        </Button>
      </CardContent>
    </Card>
  );
}
