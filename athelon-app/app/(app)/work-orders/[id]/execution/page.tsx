"use client";

import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowLeft, Calendar } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WOExecutionGantt } from "@/app/(app)/work-orders/[id]/_components/WOExecutionGantt";
import {
  WO_STATUS_LABEL,
  WO_STATUS_STYLES,
  type WoStatus,
} from "@/lib/mro-constants";

export default function WOExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const { orgId } = useCurrentOrg();

  const woResult = useQuery(
    api.workOrders.getWorkOrder,
    id && orgId
      ? { workOrderId: id as Id<"workOrders">, organizationId: orgId }
      : "skip",
  );

  const workOrder = woResult?.workOrder ?? null;
  const aircraft = woResult?.aircraft ?? null;

  if (!id) return null;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/work-orders/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          {workOrder ? (
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-semibold">
                {workOrder.workOrderNumber} — Execution Planning
              </h1>
              <Badge
                className={
                  WO_STATUS_STYLES[workOrder.status as WoStatus] ?? ""
                }
              >
                {WO_STATUS_LABEL[workOrder.status as WoStatus] ??
                  workOrder.status}
              </Badge>
              {aircraft && (
                <span className="text-sm text-muted-foreground">
                  {aircraft.currentRegistration} ·{" "}
                  {`${aircraft.make} ${aircraft.model}`.trim()}
                </span>
              )}
            </div>
          ) : (
            <Skeleton className="h-6 w-72" />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Gantt */}
      <WOExecutionGantt workOrderId={id as Id<"workOrders">} />
    </div>
  );
}
