import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_OPTIONS = ["new", "in_review", "responded", "closed"] as const;

const STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  responded: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-700",
};

export default function CustomerRequestsQueuePage() {
  const { orgId } = useCurrentOrg();
  const [statusFilter, setStatusFilter] = useState<"all" | (typeof STATUS_OPTIONS)[number]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [response, setResponse] = useState("");

  const requests = useQuery(
    api.customerPortal.listInboundCustomerRequests,
    orgId
      ? {
          organizationId: orgId,
          status: statusFilter === "all" ? undefined : statusFilter,
        }
      : "skip",
  );

  const updateRequest = useMutation(api.customerPortal.updateInboundCustomerRequest);

  const selected = useMemo(
    () => (requests ?? []).find((r) => String(r._id) === selectedId) ?? null,
    [requests, selectedId],
  );

  async function handleSave(nextStatus: (typeof STATUS_OPTIONS)[number]) {
    if (!orgId || !selected) return;
    try {
      await updateRequest({
        organizationId: orgId,
        requestId: selected._id,
        status: nextStatus,
        internalResponse: response.trim() || undefined,
      });
      toast.success("Request updated.");
      setResponse("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update request.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Customer Request Queue</h1>
        <div className="w-[220px]">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inbound</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!requests ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests.</p>
            ) : (
              requests.map((req) => (
                <button
                  key={req._id}
                  className={`w-full text-left rounded border p-2.5 hover:bg-muted/40 transition ${selectedId === String(req._id) ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => {
                    setSelectedId(String(req._id));
                    setResponse(req.internalResponse ?? "");
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{req.subject}</p>
                    <Badge className={STATUS_BADGE[req.status] ?? ""}>{req.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {req.customerNameSnapshot} · {new Date(req.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Detail</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a request to review.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={STATUS_BADGE[selected.status] ?? ""}>{selected.status.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline">{selected.category.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline">{selected.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selected.customerNameSnapshot}
                  {selected.customerEmailSnapshot ? ` · ${selected.customerEmailSnapshot}` : ""}
                  {selected.workOrderId ? ` · WO ${selected.workOrderId}` : ""}
                </p>
                <p className="text-base font-semibold">{selected.subject}</p>
                <p className="text-sm whitespace-pre-wrap">{selected.message}</p>

                <div className="space-y-1.5 pt-2">
                  <Label>Internal response</Label>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value.slice(0, 2000))}
                    rows={6}
                    placeholder="Enter response to customer request..."
                  />
                </div>

                <div className="flex gap-2 flex-wrap pt-2">
                  <Button variant="outline" onClick={() => handleSave("in_review")}>Mark In Review</Button>
                  <Button onClick={() => handleSave("responded")}>Save Response</Button>
                  <Button variant="secondary" onClick={() => handleSave("closed")}>Close</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
