"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

function fmtTs(ts: number | undefined | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function fmtDuration(clockIn: number, clockOut: number | undefined | null): string {
  if (!clockOut) return "—";
  const totalMin = Math.round((clockOut - clockIn) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-2 mt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className={`h-12 w-full rounded`} />
      ))}
    </div>
  );
}

interface RejectDialogState {
  open: boolean;
  entryId: Id<"timeEntries"> | null;
}

export default function TimeApprovalPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>({
    open: false,
    entryId: null,
  });
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pending = useQuery(
    api.billingV4b.listPendingTimeEntries,
    orgId ? { orgId } : "skip",
  );
  const approved = useQuery(
    api.billingV4b.listApprovedTimeEntries,
    orgId ? { orgId } : "skip",
  );
  const rejected = useQuery(
    api.billingV4b.listRejectedTimeEntries,
    orgId ? { orgId } : "skip",
  );

  // Resolve human-readable names instead of raw Convex IDs
  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  // listActive covers the vast majority of time entries in the approval queue
  // (time entries are almost always against active WOs). Limit 500 to avoid
  // pagination complexity; falls back to truncated ID for closed/historical WOs.
  const workOrders = useQuery(
    api.workOrders.listActive,
    orgId ? { organizationId: orgId, limit: 500 } : "skip",
  );

  /** Map technicianId → legalName */
  const techMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of technicians ?? []) m.set(t._id as string, t.legalName);
    return m;
  }, [technicians]);

  /** Map workOrderId → workOrderNumber */
  const woMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const wo of workOrders ?? []) m.set(wo._id as string, wo.workOrderNumber);
    return m;
  }, [workOrders]);

  const resolveTech = (id: string) => techMap.get(id) ?? id.slice(0, 8) + "…";
  const resolveWO = (id: string | null | undefined) =>
    id ? (woMap.get(id) ?? id.slice(0, 8) + "…") : "—";

  const approveEntry = useMutation(api.billingV4.approveTimeEntry);
  const rejectEntry = useMutation(api.billingV4.rejectTimeEntry);

  const isLoading = !isLoaded || pending === undefined;

  async function handleApprove(entryId: Id<"timeEntries">) {
    if (!orgId || !techId) return;
    try {
      await approveEntry({ orgId, timeEntryId: entryId, approvedByTechId: techId });
      toast.success("Time entry approved.");
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to approve.");
    }
  }

  function openRejectDialog(entryId: Id<"timeEntries">) {
    setRejectReason("");
    setRejectDialog({ open: true, entryId });
  }

  async function handleReject() {
    if (!orgId || !techId || !rejectDialog.entryId) return;
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    setSubmitting(true);
    try {
      await rejectEntry({
        orgId,
        timeEntryId: rejectDialog.entryId,
        rejectedByTechId: techId,
        reason: rejectReason.trim(),
      });
      toast.success("Time entry rejected.");
      setRejectDialog({ open: false, entryId: null });
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to reject.");
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = pending?.length ?? 0;
  const approvedCount = approved?.length ?? 0;
  const rejectedCount = rejected?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Time Clock Approval</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve technician time entries
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="h-8 bg-muted/40 p-0.5">
          <TabsTrigger value="pending" className="h-7 px-3 text-xs data-[state=active]:bg-background">
            Pending
            {!isLoading && pendingCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-4 min-w-[16px] px-1 text-[9px] bg-amber-500/20 text-amber-500"
              >
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="h-7 px-3 text-xs data-[state=active]:bg-background">
            Approved
            {!isLoading && approvedCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 min-w-[16px] px-1 text-[9px]">
                {approvedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="h-7 px-3 text-xs data-[state=active]:bg-background">
            Rejected
            {!isLoading && rejectedCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 min-w-[16px] px-1 text-[9px]">
                {rejectedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <TableSkeleton cols={7} />
          ) : pending!.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No pending time entries</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  All time entries have been reviewed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs">Technician</TableHead>
                    <TableHead className="text-xs">Work Order</TableHead>
                    <TableHead className="text-xs">Clock In</TableHead>
                    <TableHead className="text-xs">Clock Out</TableHead>
                    <TableHead className="text-xs">Duration</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending!.map((entry) => (
                    <TableRow key={entry._id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-medium text-foreground truncate max-w-[120px]">
                        {resolveTech(entry.technicianId as string)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[110px]">
                        {resolveWO(entry.workOrderId as string | undefined)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtTs(entry.clockInAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtTs(entry.clockOutAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDuration(entry.clockInAt, entry.clockOutAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                        {entry.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            onClick={() => handleApprove(entry._id)}
                            aria-label="Approve time entry"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => openRejectDialog(entry._id)}
                            aria-label="Reject time entry"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="mt-4">
          {approved === undefined ? (
            <TableSkeleton cols={6} />
          ) : approved.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center">
                <CheckCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No approved entries yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs">Technician</TableHead>
                    <TableHead className="text-xs">Work Order</TableHead>
                    <TableHead className="text-xs">Clock In</TableHead>
                    <TableHead className="text-xs">Clock Out</TableHead>
                    <TableHead className="text-xs">Duration</TableHead>
                    <TableHead className="text-xs">Approved At</TableHead>
                    <TableHead className="text-xs">Approved By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approved.map((entry) => (
                    <TableRow key={entry._id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-medium text-foreground truncate max-w-[120px]">
                        {resolveTech(entry.technicianId as string)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[110px]">
                        {resolveWO(entry.workOrderId as string | undefined)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtTs(entry.clockInAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtTs(entry.clockOutAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDuration(entry.clockInAt, entry.clockOutAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtTs((entry as { approvedAt?: number }).approvedAt)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground truncate max-w-[120px]">
                        {(entry as { approvedByTechId?: string }).approvedByTechId
                          ? resolveTech((entry as { approvedByTechId: string }).approvedByTechId)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="mt-4">
          {rejected === undefined ? (
            <TableSkeleton cols={6} />
          ) : rejected.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center">
                <XCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No rejected entries</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs">Technician</TableHead>
                    <TableHead className="text-xs">Work Order</TableHead>
                    <TableHead className="text-xs">Clock In</TableHead>
                    <TableHead className="text-xs">Clock Out</TableHead>
                    <TableHead className="text-xs">Duration</TableHead>
                    <TableHead className="text-xs">Rejection Reason</TableHead>
                    <TableHead className="text-xs">Rejected At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejected.map((entry) => (
                    <TableRow key={entry._id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-medium text-foreground truncate max-w-[120px]">
                        {resolveTech(entry.technicianId as string)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[110px]">
                        {resolveWO(entry.workOrderId as string | undefined)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtTs(entry.clockInAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtTs(entry.clockOutAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDuration(entry.clockInAt, entry.clockOutAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                        {(entry as { rejectionReason?: string }).rejectionReason ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtTs((entry as { rejectedAt?: number }).rejectedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((s) => ({ ...s, open }))}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reject-reason" className="text-sm">
              Rejection Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectDialog({ open: false, entryId: null })}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || !rejectReason.trim()}
            >
              {submitting ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
