import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";

const STATUS_COLORS: Record<string, string> = {
  airworthy: "bg-green-100 text-green-700",
  in_maintenance: "bg-yellow-100 text-yellow-700",
  out_of_service: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-500",
};

export default function CustomerFleetPage() {
  const customerId = usePortalCustomerId();
  const aircraft = useQuery(
    api.customerPortal.listCustomerAircraft,
    customerId ? { customerId } : "skip"
  );

  if (!customerId) {
    return <p className="text-center text-gray-500 py-16">No customer account linked.</p>;
  }

  if (!aircraft) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">My Fleet</h1>

      {aircraft.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No aircraft on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {aircraft.map((ac) => (
            <Card key={ac._id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xl font-bold">{ac.currentRegistration}</p>
                    <p className="text-sm text-gray-500">{ac.make} {ac.model}</p>
                    {ac.year && <p className="text-xs text-gray-400">{ac.year as number}</p>}
                  </div>
                  <Badge className={STATUS_COLORS[ac.status] ?? "bg-gray-100 text-gray-500"}>
                    {ac.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Serial Number</p>
                    <p className="font-medium">{ac.serialNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Time</p>
                    <p className="font-medium">{ac.totalTimeAirframeHours?.toLocaleString() ?? "—"} hrs</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Service</p>
                    <p className="font-medium">
                      {ac.lastServiceDate ? new Date(ac.lastServiceDate).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Active WOs</p>
                    <p className="font-medium">{ac.activeWorkOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
