"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

// ─── Status config ─────────────────────────────────────────────────────────────

export type CustomerFacingStatus =
  | "awaiting_arrival"
  | "received_inspection_pending"
  | "inspection_in_progress"
  | "discrepancy_authorization_required"
  | "awaiting_parts"
  | "work_in_progress"
  | "final_inspection_pending"
  | "ready_for_pickup"
  | "completed";

interface StatusConfig {
  label: string;
  color: string;
}

const STATUS_CONFIG: Record<CustomerFacingStatus, StatusConfig> = {
  awaiting_arrival: {
    label: "Awaiting Arrival",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  received_inspection_pending: {
    label: "Received — Inspection Pending",
    color: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
  inspection_in_progress: {
    label: "Inspection In Progress",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  discrepancy_authorization_required: {
    label: "Authorization Required",
    color: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  awaiting_parts: {
    label: "Awaiting Parts",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  work_in_progress: {
    label: "Work In Progress",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  final_inspection_pending: {
    label: "Final Inspection Pending",
    color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    color: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  completed: {
    label: "Completed",
    color: "bg-green-500/15 text-green-400 border-green-500/30",
  },
};

const ALL_STATUSES: CustomerFacingStatus[] = [
  "awaiting_arrival",
  "received_inspection_pending",
  "inspection_in_progress",
  "discrepancy_authorization_required",
  "awaiting_parts",
  "work_in_progress",
  "final_inspection_pending",
  "ready_for_pickup",
  "completed",
];

// ─── Component ─────────────────────────────────────────────────────────────────

interface CustomerStatusControlProps {
  workOrderId: Id<"workOrders">;
  customerFacingStatus?: string | null;
}

export function CustomerStatusControl({
  workOrderId,
  customerFacingStatus,
}: CustomerStatusControlProps) {
  const [updating, setUpdating] = useState(false);
  const setStatus = useMutation(api.gapFixes.setCustomerFacingStatus);

  const currentStatus = customerFacingStatus as CustomerFacingStatus | null | undefined;
  const config = currentStatus ? STATUS_CONFIG[currentStatus] : null;

  async function handleChange(newStatus: string) {
    setUpdating(true);
    try {
      await setStatus({
        workOrderId,
        customerFacingStatus: newStatus as CustomerFacingStatus,
      });
      toast.success("Customer status updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span className="font-medium">Customer Status:</span>
      </div>

      {/* Current badge */}
      {config && (
        <Badge
          variant="outline"
          className={`text-[11px] border ${config.color}`}
        >
          {config.label}
        </Badge>
      )}

      {/* Change dropdown */}
      <Select
        value={currentStatus ?? ""}
        onValueChange={handleChange}
        disabled={updating}
      >
        <SelectTrigger className="h-7 text-[11px] bg-muted/30 border-border/60 w-auto gap-1 px-2">
          <SelectValue placeholder="Set status…" />
        </SelectTrigger>
        <SelectContent align="end">
          {ALL_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full border ${STATUS_CONFIG[s].color}`}
                />
                {STATUS_CONFIG[s].label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
