import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { AlertCircle, ChevronDown, ChevronUp, Plane, Wrench } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

const STATUS_COLORS: Record<string, string> = {
  airworthy: "bg-green-100 text-green-700",
  in_maintenance: "bg-yellow-100 text-yellow-700",
  out_of_service: "bg-red-100 text-red-700",
};

export default function CustomerFleetPage() {
  const customerId = usePortalCustomerId();
  const aircraft = useQuery(
    api.customerPortal.listCustomerAircraft,
    customerId ? { customerId } : "skip",
  );
  const workOrders = useQuery(
    api.customerPortal.listCustomerWorkOrders,
    customerId ? { customerId } : "skip",
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!customerId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground text-lg">No customer account linked</p>
          <p className="text-muted-foreground mt-1 max-w-md">
            Your account is not linked to a customer profile. Contact your MRO provider to set up your portal access.
          </p>
        </div>
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getWosForAircraft(aircraftId: Id<"aircraft">) {
    return (
      workOrders?.filter(
        (wo: { aircraftId: Id<"aircraft"> }) => wo.aircraftId === aircraftId,
      ) ?? []
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Fleet</h1>
          <p className="text-muted-foreground mt-1">
            {aircraft.length} aircraft on file
          </p>
        </div>
      </div>

      {aircraft.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Plane className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No aircraft on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {aircraft.map((ac) => {
            const isOpen = expanded.has(ac._id);
            const acWos = getWosForAircraft(ac._id as Id<"aircraft">);

            return (
              <Card
                key={ac._id}
                className={
                  ac.activeWorkOrders > 0 ? "border-blue-200" : ""
                }
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold">
                          {ac.currentRegistration}
                        </p>
                        {ac.activeWorkOrders > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                            <Wrench className="w-3 h-3 mr-1" />
                            {ac.activeWorkOrders} Active WO
                            {ac.activeWorkOrders > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ac.make} {ac.model}
                      </p>
                      {ac.year && (
                        <p className="text-xs text-muted-foreground">
                          {ac.year as number}
                        </p>
                      )}
                    </div>
                    <Badge
                      className={`${STATUS_COLORS[ac.status] ?? "bg-muted text-muted-foreground"} border-0`}
                    >
                      {ac.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Serial Number</p>
                      <p className="font-medium">{ac.serialNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Time</p>
                      <p className="font-medium">
                        {ac.totalTimeAirframeHours?.toLocaleString() ?? "—"}{" "}
                        hrs
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Service</p>
                      <p className="font-medium">
                        {ac.lastServiceDate
                          ? new Date(ac.lastServiceDate).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Active WOs</p>
                      <p className="font-medium">{ac.activeWorkOrders}</p>
                    </div>
                  </div>

                  {/* Expand for WO history */}
                  {workOrders && (
                    <div className="mt-4 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between text-xs text-muted-foreground"
                        onClick={() => toggleExpand(ac._id)}
                      >
                        Work Order History ({acWos.length})
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                      {isOpen && (
                        <div className="mt-2 space-y-2">
                          {acWos.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              No work orders.
                            </p>
                          ) : (
                            acWos.slice(0, 10).map((wo: {
                              _id: string;
                              workOrderNumber: string;
                              status: string;
                              openedAt: number;
                              description?: string;
                            }) => (
                              <div
                                key={wo._id}
                                className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                              >
                                <div>
                                  <span className="font-mono font-semibold">
                                    {wo.workOrderNumber}
                                  </span>
                                  {wo.description && (
                                    <p className="text-muted-foreground mt-0.5 line-clamp-1">
                                      {wo.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">
                                    {new Date(wo.openedAt).toLocaleDateString()}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs capitalize"
                                  >
                                    {wo.status.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
