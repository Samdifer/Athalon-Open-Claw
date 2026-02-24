"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-muted-foreground/30",
  SENT: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  APPROVED: "bg-green-500/15 text-green-400 border-green-500/30",
  CONVERTED: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  DECLINED: "bg-red-500/15 text-red-400 border-red-500/30",
};

const LINE_TYPE_LABELS: Record<string, string> = {
  labor: "Labor",
  part: "Part",
  external_service: "External Service",
};

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as Id<"quotes">;
  const { orgId, isLoaded } = useCurrentOrg();

  const quote = useQuery(
    api.billing.getQuote,
    orgId && quoteId ? { orgId, quoteId } : "skip",
  );

  const sendQuote = useMutation(api.billing.sendQuote);
  const approveQuote = useMutation(api.billing.approveQuote);
  const declineQuote = useMutation(api.billing.declineQuote);
  const convertQuote = useMutation(api.billing.convertQuoteToWorkOrder);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [declineDialog, setDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [convertDialog, setConvertDialog] = useState(false);
  const [woNumber, setWoNumber] = useState("");
  const [woDescription, setWoDescription] = useState("");
  const [woType, setWoType] = useState<"routine" | "unscheduled">("routine");
  const [woPriority, setWoPriority] = useState<"routine" | "urgent" | "aog">("routine");

  const isLoading = !isLoaded || quote === undefined;

  const handleSend = async () => {
    if (!orgId) return;
    setActionLoading("send"); setError(null);
    try {
      await sendQuote({ orgId, quoteId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send quote.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    if (!orgId) return;
    setActionLoading("approve"); setError(null);
    try {
      await approveQuote({ orgId, quoteId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve quote.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!orgId || !declineReason.trim()) return;
    setActionLoading("decline"); setError(null);
    try {
      await declineQuote({ orgId, quoteId, declineReason: declineReason.trim() });
      setDeclineDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline quote.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvert = async () => {
    if (!orgId || !woNumber.trim()) return;
    setActionLoading("convert"); setError(null);
    try {
      const newWoId = await convertQuote({
        orgId,
        quoteId,
        workOrderNumber: woNumber.trim(),
        workOrderType: woType,
        priority: woPriority,
        description: woDescription.trim() || `Work order from quote ${quote?.quoteNumber ?? ""}`,
      });
      setConvertDialog(false);
      router.push(`/work-orders/${newWoId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert quote.");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!quote) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Quote not found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  const canSend = quote.status === "DRAFT";
  const canApprove = quote.status === "SENT";
  const canDecline = quote.status === "SENT";
  const canConvert = quote.status === "APPROVED";

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground font-mono">{quote.quoteNumber}</h1>
              <Badge variant="outline" className={`text-[10px] font-medium border ${STATUS_STYLES[quote.status] ?? ""}`}>
                {quote.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created {formatDate(quote.createdAt)}
              {quote.expiresAt ? ` · Expires ${formatDate(quote.expiresAt)}` : ""}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canSend && (
            <Button size="sm" onClick={handleSend} disabled={actionLoading === "send"} className="h-8 gap-1.5 text-xs">
              <Send className="w-3.5 h-3.5" />
              {actionLoading === "send" ? "Sending..." : "Send"}
            </Button>
          )}
          {canApprove && (
            <Button size="sm" onClick={handleApprove} disabled={actionLoading === "approve"} className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-3.5 h-3.5" />
              {actionLoading === "approve" ? "Approving..." : "Approve"}
            </Button>
          )}
          {canDecline && (
            <Button size="sm" variant="outline" onClick={() => setDeclineDialog(true)} className="h-8 gap-1.5 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10">
              <XCircle className="w-3.5 h-3.5" />
              Decline
            </Button>
          )}
          {canConvert && (
            <Button size="sm" onClick={() => setConvertDialog(true)} className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700">
              <RefreshCw className="w-3.5 h-3.5" />
              Convert to WO
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Details Card */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quote Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Labor Total</p>
            <p className="text-sm font-semibold">${quote.laborTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Parts Total</p>
            <p className="text-sm font-semibold">${quote.partsTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Subtotal</p>
            <p className="text-sm font-semibold">${quote.subtotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5">Total</p>
            <p className="text-base font-bold text-foreground">${quote.total.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {quote.lineItems.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No line items on this quote.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right">Unit $</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.lineItems.map((item) => (
                  <TableRow key={item._id} className="border-border/40">
                    <TableCell className="text-sm">{item.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-border/50">
                        {LINE_TYPE_LABELS[item.type] ?? item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right">{item.qty}</TableCell>
                    <TableCell className="text-sm text-right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-sm font-medium text-right">${item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Departments (if any) */}
      {quote.departments.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Department Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quote.departments.map((dept) => (
              <div key={dept._id} className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <span className="text-sm">{dept.sectionName}</span>
                <Badge variant="outline" className="text-[10px] border-border/50">{dept.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Decline Dialog */}
      <Dialog open={declineDialog} onOpenChange={setDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Quote</DialogTitle>
            <DialogDescription>Provide a reason for declining this quote.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Reason *</Label>
              <Textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter decline reason..."
                className="text-sm resize-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeclineDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDecline}
              disabled={!declineReason.trim() || actionLoading === "decline"}
            >
              {actionLoading === "decline" ? "Declining..." : "Confirm Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to WO Dialog */}
      <Dialog open={convertDialog} onOpenChange={setConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Work Order</DialogTitle>
            <DialogDescription>Create a new work order from this approved quote.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Work Order Number *</Label>
              <Input
                value={woNumber}
                onChange={(e) => setWoNumber(e.target.value)}
                placeholder="e.g. WO-2026-001"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={woDescription}
                onChange={(e) => setWoDescription(e.target.value)}
                placeholder="Work order description..."
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <select
                  value={woType}
                  onChange={(e) => setWoType(e.target.value as "routine" | "unscheduled")}
                  className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                >
                  <option value="routine">Routine</option>
                  <option value="unscheduled">Unscheduled</option>
                  <option value="annual_inspection">Annual Inspection</option>
                  <option value="100hr_inspection">100hr Inspection</option>
                  <option value="major_repair">Major Repair</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <select
                  value={woPriority}
                  onChange={(e) => setWoPriority(e.target.value as "routine" | "urgent" | "aog")}
                  className="w-full h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="aog">AOG</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConvertDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleConvert}
              disabled={!woNumber.trim() || actionLoading === "convert"}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading === "convert" ? "Converting..." : "Create Work Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
