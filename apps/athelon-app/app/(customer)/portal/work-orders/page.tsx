import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ArrowLeft, ChevronRight } from "lucide-react";
import { DownloadPDFButton } from "@/src/shared/components/pdf/DownloadPDFButton";
import { RtsDocumentPDF } from "@/src/shared/components/pdf/RtsDocumentPDF";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import type { Id } from "@/convex/_generated/dataModel";

const STATUS_STEPS = [
  { key: "awaiting_arrival", label: "Received" },
  { key: "received_inspection_pending", label: "Inspection" },
  { key: "work_in_progress", label: "In Progress" },
  { key: "final_inspection_pending", label: "Final Check" },
  { key: "ready_for_pickup", label: "Complete" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  pending_parts: "bg-orange-100 text-orange-700",
  on_hold: "bg-red-100 text-red-700",
  closed: "bg-green-100 text-green-700",
  voided: "bg-gray-100 text-gray-700",
};

function StatusTimeline({ customerFacingStatus }: { customerFacingStatus?: string }) {
  const activeIdx = STATUS_STEPS.findIndex((s) => s.key === customerFacingStatus);
  const currentIdx = activeIdx >= 0 ? activeIdx : customerFacingStatus === "completed" ? STATUS_STEPS.length : 0;

  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto py-2">
      {STATUS_STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {isCompleted ? "✓" : idx + 1}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">
                {step.label}
              </span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 min-w-2 ${isCompleted ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkOrderDetail({ woId, customerId, onBack }: {
  woId: Id<"workOrders">;
  customerId: Id<"customers">;
  onBack: () => void;
}) {
  const detail = useQuery(api.customerPortal.getCustomerWorkOrderDetail, { woId, customerId });
  const timeline = useQuery(api.customerPortal.getCustomerWorkOrderTimeline, { woId, customerId });

  if (!detail) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Work Orders
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">{detail.workOrderNumber}</CardTitle>
            <div className="flex items-center gap-2">
              {detail.hasRts && (
                <DownloadPDFButton
                  label="RTS PDF"
                  fileName={`${detail.workOrderNumber || "work-order"}-RTS.pdf`}
                  document={(
                    <RtsDocumentPDF
                      workOrder={{ _id: detail._id, workOrderNumber: detail.workOrderNumber }}
                      aircraft={{
                        currentRegistration: detail.aircraftRegistration,
                        make: detail.aircraftMake,
                        model: detail.aircraftModel,
                        serialNumber: detail.serialNumber,
                        totalTimeAirframeHours: detail.aircraftTotalTimeAtClose,
                      }}
                      taskCards={detail.taskSummaries}
                      discrepancies={detail.discrepancies ?? []}
                      parts={detail.partsSummary ?? []}
                      rtsData={{
                        statement: detail.rtsRecord?.returnToServiceStatement,
                        date: detail.rtsRecord?.returnToServiceDate,
                      }}
                      inspector={{
                        certificateNumber: detail.rtsRecord?.iaCertificateNumber,
                        date: detail.rtsRecord?.returnToServiceDate,
                      }}
                    />
                  )}
                />
              )}
              <Badge className={STATUS_COLORS[detail.status] ?? "bg-gray-100 text-gray-700"}>
                {detail.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {detail.aircraftRegistration} — {detail.aircraftMake} {detail.aircraftModel}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusTimeline customerFacingStatus={detail.customerFacingStatus} />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Type</p>
              <p className="font-medium">{detail.workOrderType.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-gray-500">Priority</p>
              <p className="font-medium capitalize">{detail.priority}</p>
            </div>
            <div>
              <p className="text-gray-500">Opened</p>
              <p className="font-medium">{new Date(detail.openedAt).toLocaleDateString()}</p>
            </div>
            {detail.targetCompletionDate && (
              <div>
                <p className="text-gray-500">Est. Completion</p>
                <p className="font-medium">{new Date(detail.targetCompletionDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-gray-500 text-sm mb-1">Description</p>
            <p className="text-sm">{detail.description}</p>
          </div>

          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-700">Overall Progress</p>
              <p className="text-sm font-bold text-blue-600">{detail.progressPercent}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${detail.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Task Cards */}
          {detail.taskSummaries.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Task Progress</p>
              <div className="space-y-2">
                {detail.taskSummaries.map((task) => (
                  <div key={task._id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.taskCardNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${task.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-8 text-right">
                        {task.progressPercent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-500" />
              Timeline
            </p>
            {!timeline ? (
              <p className="text-sm text-gray-500">Loading timeline...</p>
            ) : timeline.length === 0 ? (
              <p className="text-sm text-gray-500">No timeline events yet.</p>
            ) : (
              <div className="space-y-2">
                {timeline.map((event: any) => (
                  <div key={event._id} className="p-2 rounded-lg border bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-800">{event.title}</p>
                      <p className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerWorkOrdersPage() {
  const customerId = usePortalCustomerId();
  const [selectedWo, setSelectedWo] = useState<Id<"workOrders"> | null>(null);
  const workOrders = useQuery(
    api.customerPortal.listCustomerWorkOrders,
    customerId ? { customerId } : "skip"
  );

  if (!customerId) {
    return <p className="text-center text-gray-500 py-16">No customer account linked.</p>;
  }

  if (selectedWo) {
    return <WorkOrderDetail woId={selectedWo} customerId={customerId} onBack={() => setSelectedWo(null)} />;
  }

  if (!workOrders) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>

      {workOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No work orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workOrders.map((wo) => (
            <Card
              key={wo._id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedWo(wo._id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{wo.workOrderNumber}</p>
                      {wo.hasRts && <Badge className="bg-green-100 text-green-700">RTS available</Badge>}
                      <Badge className={STATUS_COLORS[wo.status] ?? "bg-gray-100 text-gray-700"} variant="outline">
                        {wo.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {wo.aircraftRegistration} — {wo.aircraftMake} {wo.aircraftModel}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Opened {new Date(wo.openedAt).toLocaleDateString()}
                      {wo.targetCompletionDate && ` · Est. ${new Date(wo.targetCompletionDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
                <StatusTimeline customerFacingStatus={wo.customerFacingStatus} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
