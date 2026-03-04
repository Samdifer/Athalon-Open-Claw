"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Camera, CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type VisualCondition = "acceptable" | "damaged" | "rejected";
type Decision = "accepted" | "rejected" | "accepted_with_deviation";

type PendingPart = {
  _id: Id<"parts">;
  partNumber: string;
  partName?: string;
  description?: string;
  serialNumber?: string;
  purchaseOrderNumber?: string;
  quantity?: number;
  quantityOnHand?: number;
  hasShelfLifeLimit?: boolean;
};

type LogItem = {
  id: string;
  partNumber: string;
  decision: Decision;
  passed: boolean;
  inspector: string;
  inspectedAt: number;
};

export function ReceivingInspection() {
  const { orgId, techId } = useCurrentOrg();
  const pendingParts = useQuery(
    api.gapFixes.listPartsPendingInspection,
    orgId ? { organizationId: orgId } : "skip",
  ) as PendingPart[] | undefined;
  const completeInspection = useMutation(api.gapFixes.completeReceivingInspection);
  const isLoadingPending = pendingParts === undefined;

  const [selectedPart, setSelectedPart] = useState<PendingPart | null>(null);
  const [visualCondition, setVisualCondition] = useState<VisualCondition>("acceptable");
  const [certVerified, setCertVerified] = useState(false);
  const [shelfLifeChecked, setShelfLifeChecked] = useState(false);
  const [expectedQty, setExpectedQty] = useState("1");
  const [receivedQty, setReceivedQty] = useState("1");
  const [inspectorName, setInspectorName] = useState("");
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [log, setLog] = useState<LogItem[]>([]);
  const [saving, setSaving] = useState(false);

  const quantityMatches = Number(expectedQty || 0) === Number(receivedQty || 0);

  const checklistPass =
    visualCondition === "acceptable" &&
    certVerified &&
    (!selectedPart?.hasShelfLifeLimit || shelfLifeChecked) &&
    quantityMatches;

  const sortedLog = useMemo(() => [...log].sort((a, b) => b.inspectedAt - a.inspectedAt), [log]);

  function resetDialogState() {
    setSelectedPart(null);
    setVisualCondition("acceptable");
    setCertVerified(false);
    setShelfLifeChecked(false);
    setExpectedQty("1");
    setReceivedQty("1");
    setInspectorName("");
    setInspectionDate(new Date().toISOString().slice(0, 10));
    setNotes("");
  }

  async function submitDecision(decision: Decision) {
    if (!selectedPart || !techId) return;
    if (!inspectorName.trim()) {
      toast.error("Inspector name is required.");
      return;
    }

    const isRejected = decision === "rejected" || visualCondition === "rejected";

    setSaving(true);
    try {
      await completeInspection({
        partId: selectedPart._id,
        inspectedByTechnicianId: techId,
        inspectionResult: isRejected ? "rejected" : "approved",
        inspectionNotes: [
          `Inspector: ${inspectorName.trim()}`,
          `Date: ${inspectionDate}`,
          `Visual: ${visualCondition}`,
          `8130-3 verified: ${certVerified ? "yes" : "no"}`,
          `Shelf-life checked: ${selectedPart.hasShelfLifeLimit ? (shelfLifeChecked ? "yes" : "no") : "n/a"}`,
          `Expected Qty: ${expectedQty} / Received Qty: ${receivedQty}`,
          notes ? `Notes: ${notes}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        rejectionReason: isRejected
          ? notes.trim() || "Rejected during receiving inspection"
          : undefined,
      });

      setLog((prev) => [
        {
          id: `${selectedPart._id}_${Date.now()}`,
          partNumber: selectedPart.partNumber,
          decision,
          passed: !isRejected && checklistPass,
          inspector: inspectorName.trim(),
          inspectedAt: Date.now(),
        },
        ...prev,
      ]);

      toast.success(
        isRejected
          ? `${selectedPart.partNumber} rejected and moved to quarantine.`
          : `${selectedPart.partNumber} accepted into inventory.`,
      );
      resetDialogState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Inspection update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20">
              <TableHead>Part / PO</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingPending ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                  Loading receiving queue…
                </TableCell>
              </TableRow>
            ) : (pendingParts ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                  No incoming parts awaiting inspection.
                </TableCell>
              </TableRow>
            ) : (
              (pendingParts ?? []).map((part) => (
                <TableRow key={part._id}>
                  <TableCell className="font-mono text-xs">
                    {part.partNumber}
                    {part.purchaseOrderNumber && (
                      <p className="text-muted-foreground">PO {part.purchaseOrderNumber}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{part.partName ?? part.description ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {part.serialNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedPart(part)}>
                      <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-border/60 p-3">
        <h3 className="text-sm font-semibold mb-2">Receiving Log</h3>
        {sortedLog.length === 0 ? (
          <p className="text-xs text-muted-foreground">No inspections completed this session.</p>
        ) : (
          <div className="space-y-2">
            {sortedLog.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                <div>
                  <p className="text-xs font-mono font-semibold">{entry.partNumber}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.inspector} · {new Date(entry.inspectedAt).toLocaleString("en-US", { timeZone: "UTC" })}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={entry.passed ? "text-green-600 border-green-500/40" : "text-red-600 border-red-500/40"}
                >
                  {entry.passed ? "Pass" : "Fail"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedPart} onOpenChange={(open) => !open && !saving && resetDialogState()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receiving Inspection Checklist</DialogTitle>
            <DialogDescription>
              {selectedPart?.partNumber} · {selectedPart?.partName ?? selectedPart?.description ?? "Part"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Visual condition check</Label>
              <div className="flex gap-2">
                {(["acceptable", "damaged", "rejected"] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={visualCondition === v ? "default" : "outline"}
                    className="h-7 text-xs capitalize"
                    onClick={() => setVisualCondition(v)}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="cert" checked={certVerified} onCheckedChange={(v) => setCertVerified(Boolean(v))} />
              <Label htmlFor="cert" className="text-xs">8130-3 / certificate verified</Label>
            </div>

            {selectedPart?.hasShelfLifeLimit && (
              <div className="flex items-center gap-2">
                <Checkbox id="shelf" checked={shelfLifeChecked} onCheckedChange={(v) => setShelfLifeChecked(Boolean(v))} />
                <Label htmlFor="shelf" className="text-xs">Shelf life check complete</Label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Expected Qty</Label>
                <Input value={expectedQty} onChange={(e) => setExpectedQty(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Received Qty</Label>
                <Input value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => toast.info("Photo documentation coming soon")}
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              Add photo (coming soon)
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Inspector name</Label>
                <Input value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Inspection date</Label>
                <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes / deviation</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 text-xs" placeholder="Add details or rejection reason" />
            </div>

            <div className="text-[11px] text-muted-foreground">
              Checklist status: {checklistPass ? "Pass" : "Requires attention"}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700" disabled={saving} onClick={() => void submitDecision("accepted")}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Accept
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs border-amber-500/40 text-amber-600" disabled={saving} onClick={() => void submitDecision("accepted_with_deviation")}>
              Accept w/ deviation
            </Button>
            <Button type="button" size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700" disabled={saving} onClick={() => void submitDecision("rejected")}>
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
