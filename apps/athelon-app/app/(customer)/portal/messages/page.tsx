import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_BADGES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  responded: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-700",
};

export default function CustomerMessagesPage() {
  const customerId = usePortalCustomerId();
  const workOrders = useQuery(
    api.customerPortal.listCustomerWorkOrders,
    customerId ? { customerId } : "skip",
  );
  const requests = useQuery(
    api.customerPortal.listCustomerRequests,
    customerId ? { customerId } : "skip",
  );
  const submitRequest = useMutation(api.customerPortal.submitCustomerRequest);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<"general" | "invoice" | "quote" | "work_order" | "technical" | "parts">("general");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [workOrderId, setWorkOrderId] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);

  const woOptions = useMemo(
    () => (workOrders ?? []).slice(0, 50).map((wo) => ({ value: String(wo._id), label: `${wo.workOrderNumber} · ${wo.aircraftRegistration}` })),
    [workOrders],
  );

  if (!customerId) {
    return <p className="text-center text-gray-500 py-16">No customer account linked.</p>;
  }

  async function handleSubmit() {
    const resolvedCustomerId = customerId;
    if (!resolvedCustomerId) return;
    if (subject.trim().length < 3 || message.trim().length < 10) {
      toast.error("Please provide a clear subject and message.");
      return;
    }

    setSubmitting(true);
    try {
      await submitRequest({
        customerId: resolvedCustomerId,
        subject,
        message,
        category,
        priority,
        workOrderId: workOrderId !== "none" ? (workOrderId as any) : undefined,
      });
      toast.success("Your request has been sent to the shop.");
      setSubject("");
      setMessage("");
      setCategory("general");
      setPriority("normal");
      setWorkOrderId("none");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Messages & Requests</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send a request to the shop</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="work_order">Work order</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="parts">Parts</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Related Work Order (optional)</Label>
            <Select value={workOrderId} onValueChange={setWorkOrderId}>
              <SelectTrigger><SelectValue placeholder="Select work order" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {woOptions.map((wo) => (
                  <SelectItem key={wo.value} value={wo.value}>{wo.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 120))} placeholder="Brief summary" />
          </div>

          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              rows={5}
              placeholder="Tell us what you need help with..."
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent requests</CardTitle>
        </CardHeader>
        <CardContent>
          {!requests ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-gray-500">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req._id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{req.subject}</p>
                    <Badge className={STATUS_BADGES[req.status] ?? "bg-slate-100 text-slate-700"}>
                      {req.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(req.createdAt).toLocaleString()} · {req.category.replace(/_/g, " ")} · {req.priority}
                  </p>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{req.message}</p>
                  {req.internalResponse ? (
                    <div className="mt-2 rounded bg-green-50 border border-green-100 p-2">
                      <p className="text-xs font-medium text-green-700">Shop response</p>
                      <p className="text-sm text-green-800 whitespace-pre-wrap">{req.internalResponse}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
