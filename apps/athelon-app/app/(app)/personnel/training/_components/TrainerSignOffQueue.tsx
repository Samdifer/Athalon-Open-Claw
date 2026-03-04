import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS = ["pending", "approved", "rejected"] as const;
type SignOffStatus = (typeof STATUS_OPTIONS)[number];

type Props = {
  orgId: Id<"organizations">;
};

export function TrainerSignOffQueue({ orgId }: Props) {
  const technicianTraining = useQuery(api.technicianTraining.listByOrg, {
    organizationId: orgId,
  });
  const technicians = useQuery(api.technicians.list, { organizationId: orgId });
  const removeTraining = useMutation(api.technicianTraining.removeTraining);

  const [trainingFilter, setTrainingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SignOffStatus>("pending");

  const [statusMap, setStatusMap] = useState<Record<string, SignOffStatus>>({});
  const [rejectingId, setRejectingId] = useState<Id<"technicianTraining"> | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectionReasonMap, setRejectionReasonMap] = useState<Record<string, string>>({});

  const techNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of technicians ?? []) map.set(t._id, t.legalName);
    return map;
  }, [technicians]);

  const uniqueTypes = useMemo(() => {
    const all = new Set<string>();
    for (const rec of technicianTraining ?? []) all.add(rec.trainingType);
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [technicianTraining]);

  const rows = useMemo(() => {
    const list = (technicianTraining ?? []).map((rec) => {
      const status = statusMap[rec._id] ?? "pending";
      return {
        ...rec,
        signOffStatus: status,
        rejectionReason: rejectionReasonMap[rec._id],
      };
    });

    return list
      .filter((rec) => (trainingFilter === "all" ? true : rec.trainingType === trainingFilter))
      .filter((rec) => (statusFilter === "all" ? true : rec.signOffStatus === statusFilter))
      .sort((a, b) => b.completedAt - a.completedAt);
  }, [technicianTraining, statusMap, rejectionReasonMap, trainingFilter, statusFilter]);

  function approve(trainingId: Id<"technicianTraining">) {
    setStatusMap((prev) => ({ ...prev, [trainingId]: "approved" }));
    setRejectionReasonMap((prev) => {
      const next = { ...prev };
      delete next[trainingId];
      return next;
    });
    toast.success("Training completion approved");
  }

  function startReject(trainingId: Id<"technicianTraining">) {
    setRejectingId(trainingId);
    setRejectReason("");
  }

  function confirmReject() {
    if (!rejectingId) return;
    if (!rejectReason.trim()) {
      toast.error("Reject reason is required");
      return;
    }
    setStatusMap((prev) => ({ ...prev, [rejectingId]: "rejected" }));
    setRejectionReasonMap((prev) => ({ ...prev, [rejectingId]: rejectReason.trim() }));
    toast.success("Training completion rejected");
    setRejectingId(null);
    setRejectReason("");
  }

  async function clearRejectedEntry(trainingId: Id<"technicianTraining">) {
    try {
      await removeTraining({ trainingId });
      setStatusMap((prev) => {
        const next = { ...prev };
        delete next[trainingId];
        return next;
      });
      setRejectionReasonMap((prev) => {
        const next = { ...prev };
        delete next[trainingId];
        return next;
      });
      toast.success("Rejected record removed from queue");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to remove rejected record");
    }
  }

  const loading = technicianTraining === undefined || technicians === undefined;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Trainer Sign-Off Queue</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5 block">Training Type</Label>
            <Select value={trainingFilter} onValueChange={setTrainingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All training types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "all" | SignOffStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading sign-off queue…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No records match the current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Technician</th>
                  <th className="py-2 pr-3">Training Type</th>
                  <th className="py-2 pr-3">Completion Date</th>
                  <th className="py-2 pr-3">Evidence / Notes</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rec) => (
                  <tr key={rec._id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-3 font-medium">{techNameById.get(rec.technicianId) ?? "Unknown"}</td>
                    <td className="py-2 pr-3">{rec.trainingType}</td>
                    <td className="py-2 pr-3">
                      {new Date(rec.completedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                    </td>
                    <td className="py-2 pr-3 max-w-72">
                      <p className="line-clamp-2 text-muted-foreground">{rec.certificateRef ?? "—"}</p>
                      {rec.rejectionReason && (
                        <p className="mt-1 text-xs text-red-600">Reason: {rec.rejectionReason}</p>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {rec.signOffStatus === "pending" && <Badge variant="outline">Pending</Badge>}
                      {rec.signOffStatus === "approved" && (
                        <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Approved</Badge>
                      )}
                      {rec.signOffStatus === "rejected" && (
                        <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Rejected</Badge>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approve(rec._id)}
                          disabled={rec.signOffStatus === "approved"}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startReject(rec._id)}
                          disabled={rec.signOffStatus === "rejected"}
                        >
                          Reject
                        </Button>
                        {rec.signOffStatus === "rejected" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => clearRejectedEntry(rec._id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject training completion</DialogTitle>
            <DialogDescription>
              Enter a reason. Rejection cannot be submitted without one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Input
              id="reject-reason"
              placeholder="Missing certificate reference, invalid date, etc."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              Cancel
            </Button>
            <Button onClick={confirmReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
