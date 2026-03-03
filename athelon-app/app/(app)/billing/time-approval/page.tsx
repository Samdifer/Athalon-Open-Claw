"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import {
  CheckCircle,
  ClipboardCheck,
  Clock,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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

function TableSkeleton() {
  return (
    <div className="space-y-2 mt-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded" />
      ))}
    </div>
  );
}

type ContextFilter = "all" | "shop" | "work_order" | "task" | "step";

type RejectDialogState = {
  open: boolean;
  entryId: Id<"timeEntries"> | null;
};

export default function TimeApprovalPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();

  const [contextFilter, setContextFilter] = useState<ContextFilter>("all");
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>({
    open: false,
    entryId: null,
  });
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pending = useQuery(api.billingV4b.listPendingTimeEntries, orgId ? { orgId } : "skip");
  const approved = useQuery(api.billingV4b.listApprovedTimeEntries, orgId ? { orgId } : "skip");
  const rejected = useQuery(api.billingV4b.listRejectedTimeEntries, orgId ? { orgId } : "skip");

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip",
  );

  const workOrders = useQuery(
    api.workOrders.listActive,
    orgId ? { organizationId: orgId, limit: 500 } : "skip",
  );

  const approveEntry = useMutation(api.billingV4.approveTimeEntry);
  const bulkApproveEntries = useMutation(api.billingV4.bulkApproveTimeEntries);
  const rejectEntry = useMutation(api.billingV4.rejectTimeEntry);

  const techMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const tech of technicians ?? []) {
      map.set(tech._id as string, tech.legalName);
    }
    return map;
  }, [technicians]);

  const woMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const workOrder of workOrders ?? []) {
      map.set(workOrder._id as string, workOrder.workOrderNumber);
    }
    return map;
  }, [workOrders]);

  const resolveTech = (id: string) => techMap.get(id) ?? `${id.slice(0, 8)}…`;
  const resolveWO = (id: string | undefined | null) =>
    id ? (woMap.get(id) ?? `${id.slice(0, 8)}…`) : "—";

  const resolveContext = (entry: {
    entryType?: string;
    workOrderId?: string;
    taskCardId?: string;
    taskStepId?: string;
    shopActivityCode?: string;
  }) => {
    const entryType = entry.entryType ?? "work_order";
    if (entryType === "shop") {
      return entry.shopActivityCode ? `Shop · ${entry.shopActivityCode}` : "Shop";
    }
    if (entryType === "task") {
      return `Task ${entry.taskCardId ? `${entry.taskCardId.slice(0, 6)}…` : "—"} · WO ${resolveWO(entry.workOrderId)}`;
    }
    if (entryType === "step") {
      return `Step ${entry.taskStepId ? `${entry.taskStepId.slice(0, 6)}…` : "—"} · WO ${resolveWO(entry.workOrderId)}`;
    }
    return `WO ${resolveWO(entry.workOrderId)}`;
  };

  const applyContextFilter = <T extends { entryType?: string }>(entries: T[] | undefined): T[] => {
    const items = entries ?? [];
    if (contextFilter === "all") return items;
    return items.filter((entry) => (entry.entryType ?? "work_order") === contextFilter);
  };

  const filteredPending = useMemo(() => applyContextFilter(pending), [pending, contextFilter]);
  const filteredApproved = useMemo(() => applyContextFilter(approved), [approved, contextFilter]);
  const filteredRejected = useMemo(() => applyContextFilter(rejected), [rejected, contextFilter]);

  const isLoading = !isLoaded || pending === undefined;

  const pendingCount = filteredPending.length;
  const approvedCount = filteredApproved.length;
  const rejectedCount = filteredRejected.length;

  async function handleApprove(entryId: Id<"timeEntries">) {
    if (!orgId) return;
    if (!techId) {
      toast.error("A technician record is required to approve time entries. Go to Personnel and create your profile first.");
      return;
    }
    try {
      await approveEntry({ orgId, timeEntryId: entryId, approvedByTechId: techId });
      toast.success("Time entry approved.");
    } catch (error) {
      toast.error((error as Error).message ?? "Failed to approve.");
    }
  }

  async function handleBulkApprove() {
    if (!orgId || !techId) return;
    if (filteredPending.length === 0) return;

    setSubmitting(true);
    try {
      const result = await bulkApproveEntries({
        orgId,
        approvedByTechId: techId,
        timeEntryIds: filteredPending.map((entry) => entry._id),
      });
      toast.success(`Approved ${result.approvedCount} time entr${result.approvedCount === 1 ? "y" : "ies"}.`);
    } catch (error) {
      toast.error((error as Error).message ?? "Failed to bulk approve.");
    } finally {
      setSubmitting(false);
    }
  }

  function openRejectDialog(entryId: Id<"timeEntries">) {
    setRejectReason("");
    setRejectDialog({ open: true, entryId });
  }

  async function handleReject() {
    if (!orgId || !rejectDialog.entryId) return;
    if (!techId) {
      toast.error("A technician record is required to reject time entries. Go to Personnel and create your profile first.");
      return;
    }
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
    } catch (error) {
      toast.error((error as Error).message ?? "Failed to reject.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Time Clock Approval</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review and approve technician time entries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Context</Label>
          <Select value={contextFilter} onValueChange={(value) => setContextFilter(value as ContextFilter)}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Filter context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contexts</SelectItem>
              <SelectItem value="shop">Shop</SelectItem>
              <SelectItem value="work_order">Work Order</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="step">Step</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="h-8 bg-muted/40 p-0.5">
          <TabsTrigger value="pending" className="h-7 px-3 text-xs data-[state=active]:bg-background">
            Pending
            {!isLoading && pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 min-w-[16px] px-1 text-[9px] bg-amber-500/20 text-amber-500">
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

        <TabsContent value="pending" className="mt-4 space-y-3">
          {!isLoading && filteredPending.length > 0 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={handleBulkApprove}
                disabled={submitting}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                {submitting ? "Approving..." : `Approve All (${filteredPending.length})`}
              </Button>
            </div>
          )}

          {isLoading ? (
            <TableSkeleton />
          ) : filteredPending.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No pending time entries</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  All time entries have been reviewed for this context filter.
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs">Technician</TableHead>
                      <TableHead className="text-xs">Context</TableHead>
                      <TableHead className="text-xs">Clock In</TableHead>
                      <TableHead className="text-xs">Clock Out</TableHead>
                      <TableHead className="text-xs">Duration (min)</TableHead>
                      <TableHead className="text-xs">Notes</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPending.map((entry) => (
                      <TableRow key={entry._id} className="hover:bg-muted/20">
                        <TableCell className="text-xs font-medium text-foreground truncate max-w-[120px]">
                          {resolveTech(entry.technicianId as string)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {resolveContext(entry as { entryType?: string; workOrderId?: string; taskCardId?: string; taskStepId?: string; shopActivityCode?: string })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtTs(entry.clockInAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtTs(entry.clockOutAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDuration(entry.clockInAt, entry.clockOutAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{entry.notes ?? "—"}</TableCell>
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

        <TabsContent value="approved" className="mt-4">
          {approved === undefined ? (
            <TableSkeleton />
          ) : filteredApproved.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center">
                <CheckCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No approved entries</p>
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs">Technician</TableHead>
                      <TableHead className="text-xs">Context</TableHead>
                      <TableHead className="text-xs">Clock In</TableHead>
                      <TableHead className="text-xs">Clock Out</TableHead>
                      <TableHead className="text-xs">Duration (min)</TableHead>
                      <TableHead className="text-xs">Approved At</TableHead>
                      <TableHead className="text-xs">Approved By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApproved.map((entry) => (
                      <TableRow key={entry._id} className="hover:bg-muted/20">
                        <TableCell className="text-xs font-medium text-foreground truncate max-w-[120px]">
                          {resolveTech(entry.technicianId as string)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {resolveContext(entry as { entryType?: string; workOrderId?: string; taskCardId?: string; taskStepId?: string; shopActivityCode?: string })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtTs(entry.clockInAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtTs(entry.clockOutAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDuration(entry.clockInAt, entry.clockOutAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtTs((entry as { approvedAt?: number }).approvedAt)}</TableCell>
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

        <TabsContent value="rejected" className="mt-4">
          {rejected === undefined ? (
            <TableSkeleton />
          ) : filteredRejected.length === 0 ? (
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs">Technician</TableHead>
                      <TableHead className="text-xs">Context</TableHead>
                      <TableHead className="text-xs">Clock In</TableHead>
                      <TableHead className="text-xs">Clock Out</TableHead>
                      <TableHead className="text-xs">Duration (min)</TableHead>
                      <TableHead className="text-xs">Rejection Reason</TableHead>
                      <TableHead className="text-xs">Rejected At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRejected.map((entry) => (
                      <TableRow key={entry._id} className="hover:bg-muted/20">
                        <TableCell className="text-xs font-medium text-foreground truncate max-w-[120px]">
                          {resolveTech(entry.technicianId as string)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {resolveContext(entry as { entryType?: string; workOrderId?: string; taskCardId?: string; taskStepId?: string; shopActivityCode?: string })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtTs(entry.clockInAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtTs(entry.clockOutAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDuration(entry.clockInAt, entry.clockOutAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                          {(entry as { rejectionReason?: string }).rejectionReason ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtTs((entry as { rejectedAt?: number }).rejectedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
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
              onChange={(event) => setRejectReason(event.target.value)}
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
