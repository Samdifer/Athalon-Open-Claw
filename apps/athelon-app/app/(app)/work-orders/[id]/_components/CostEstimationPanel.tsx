"use client";

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type TimeEntry = {
  durationMinutes?: number;
  clockInAt: number;
  clockOutAt?: number;
};

type WorkOrderPart = {
  _id: Id<"parts">;
  partNumber: string;
  partName: string;
  serialNumber?: string;
  quantity?: number;
  quantityOnHand?: number;
  unitCost?: number;
  cost?: number;
};

type CostLine = {
  id: string;
  label: string;
  qty: number;
  unitCost: number;
};

function estimateStorageKey(orgId: string, workOrderId: string) {
  return `athelon:wo-estimate-to-quote:${orgId}:${workOrderId}`;
}

export function CostEstimationPanel({
  orgId,
  workOrderId,
  workOrderNumber,
  timeEntries,
  parts,
}: {
  orgId: Id<"organizations">;
  workOrderId: Id<"workOrders">;
  workOrderNumber: string;
  timeEntries: TimeEntry[];
  parts: WorkOrderPart[];
}) {
  const navigate = useNavigate();
  const [laborRate, setLaborRate] = useState("85");
  const [taxRate, setTaxRate] = useState("7.5");
  const [markupRate, setMarkupRate] = useState("12");

  const vendorServices = useQuery(api.taskCardVendorServices.getVendorServicesForWorkOrder, {
    workOrderId,
  });

  const laborHours = useMemo(() => {
    const now = Date.now();
    return timeEntries.reduce((sum, entry) => {
      if (typeof entry.durationMinutes === "number") return sum + entry.durationMinutes / 60;
      if (entry.clockOutAt) return sum + Math.max(0, entry.clockOutAt - entry.clockInAt) / 3600000;
      return sum + Math.max(0, now - entry.clockInAt) / 3600000;
    }, 0);
  }, [timeEntries]);

  const [partsOverrides, setPartsOverrides] = useState<Record<string, string>>({});
  const [vendorOverrides, setVendorOverrides] = useState<Record<string, string>>({});

  const partsLines = useMemo<CostLine[]>(() => {
    return parts.map((part) => {
      const qty =
        typeof part.quantity === "number"
          ? part.quantity
          : typeof part.quantityOnHand === "number"
            ? part.quantityOnHand
            : 1;
      const fallbackCost =
        typeof part.unitCost === "number"
          ? part.unitCost
          : typeof part.cost === "number"
            ? part.cost
            : 0;
      const override = parseFloat(partsOverrides[String(part._id)] ?? "");
      return {
        id: String(part._id),
        label: `${part.partNumber} ${part.serialNumber ? `(S/N ${part.serialNumber})` : ""}`,
        qty,
        unitCost: Number.isFinite(override) ? override : fallbackCost,
      };
    });
  }, [parts, partsOverrides]);

  const vendorLines = useMemo<CostLine[]>(() => {
    return (vendorServices ?? []).map((svc) => {
      const defaultCost = typeof svc.actualCost === "number" ? svc.actualCost : svc.estimatedCost ?? 0;
      const override = parseFloat(vendorOverrides[String(svc._id)] ?? "");
      return {
        id: String(svc._id),
        label: `${svc.vendorName} · ${svc.serviceName}`,
        qty: 1,
        unitCost: Number.isFinite(override) ? override : defaultCost,
      };
    });
  }, [vendorOverrides, vendorServices]);

  const laborCost = laborHours * (parseFloat(laborRate) || 0);
  const partsCost = partsLines.reduce((sum, line) => sum + line.qty * line.unitCost, 0);
  const vendorCost = vendorLines.reduce((sum, line) => sum + line.qty * line.unitCost, 0);
  const subtotal = laborCost + partsCost + vendorCost;
  const markup = subtotal * ((parseFloat(markupRate) || 0) / 100);
  const taxableBase = subtotal + markup;
  const tax = taxableBase * ((parseFloat(taxRate) || 0) / 100);
  const totalEstimated = taxableBase + tax;

  const money = (value: number) =>
    value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

  const generateQuoteFromEstimate = () => {
    try {
      const payload = {
        generatedAt: Date.now(),
        workOrderId: String(workOrderId),
        workOrderNumber,
        laborRate: parseFloat(laborRate) || 0,
        taxRate: parseFloat(taxRate) || 0,
        markupRate: parseFloat(markupRate) || 0,
        lineItems: [
          {
            type: "labor",
            description: `WO ${workOrderNumber} labor estimate (${laborHours.toFixed(2)}h @ $${(
              parseFloat(laborRate) || 0
            ).toFixed(2)}/hr)`,
            qty: Math.max(1, Number(laborHours.toFixed(2))),
            unitPrice: parseFloat(laborRate) || 0,
          },
          ...partsLines
            .filter((line) => line.qty > 0)
            .map((line) => ({
              type: "part",
              description: `WO ${workOrderNumber} part: ${line.label}`,
              qty: line.qty,
              unitPrice: line.unitCost,
            })),
          ...vendorLines
            .filter((line) => line.unitCost > 0)
            .map((line) => ({
              type: "external_service",
              description: `WO ${workOrderNumber} vendor service: ${line.label}`,
              qty: line.qty,
              unitPrice: line.unitCost,
            })),
        ],
        totals: {
          laborCost,
          partsCost,
          vendorCost,
          markup,
          tax,
          totalEstimated,
        },
      };

      window.localStorage.setItem(estimateStorageKey(String(orgId), String(workOrderId)), JSON.stringify(payload));
      toast.success("Estimate staged. Opening quote builder...");
      navigate(`/billing/quotes/new?workOrderId=${String(workOrderId)}`);
    } catch {
      toast.error("Unable to stage estimate for quote generation.");
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">WO Cost Estimation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Labor Rate ($/hr)</Label>
            <Input value={laborRate} onChange={(e) => setLaborRate(e.target.value)} type="number" step="0.01" min="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tax Rate (%)</Label>
            <Input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} type="number" step="0.01" min="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Markup (%)</Label>
            <Input value={markupRate} onChange={(e) => setMarkupRate(e.target.value)} type="number" step="0.01" min="0" />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Parts Cost Overrides</p>
          <div className="max-h-40 overflow-auto space-y-1 pr-1">
            {partsLines.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No WO parts available.</p>
            ) : (
              partsLines.map((line) => (
                <div key={line.id} className="grid grid-cols-[1fr_110px_110px] gap-2 items-center text-xs">
                  <span className="truncate">{line.label} · Qty {line.qty}</span>
                  <span className="text-right text-muted-foreground">{money(line.unitCost)}</span>
                  <Input
                    className="h-7 text-xs"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Override"
                    value={partsOverrides[line.id] ?? ""}
                    onChange={(e) => setPartsOverrides((prev) => ({ ...prev, [line.id]: e.target.value }))}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Vendor/Subcontractor Overrides</p>
          <div className="max-h-32 overflow-auto space-y-1 pr-1">
            {vendorLines.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No vendor services linked to this WO.</p>
            ) : (
              vendorLines.map((line) => (
                <div key={line.id} className="grid grid-cols-[1fr_110px_110px] gap-2 items-center text-xs">
                  <span className="truncate">{line.label}</span>
                  <span className="text-right text-muted-foreground">{money(line.unitCost)}</span>
                  <Input
                    className="h-7 text-xs"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Override"
                    value={vendorOverrides[line.id] ?? ""}
                    onChange={(e) => setVendorOverrides((prev) => ({ ...prev, [line.id]: e.target.value }))}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Labor ({laborHours.toFixed(2)}h)</span><span>{money(laborCost)}</span></div>
          <div className="flex justify-between"><span>Parts</span><span>{money(partsCost)}</span></div>
          <div className="flex justify-between"><span>Vendor Services</span><span>{money(vendorCost)}</span></div>
          <div className="flex justify-between"><span>Markup</span><span>{money(markup)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{money(tax)}</span></div>
          <Separator className="my-1" />
          <div className="flex justify-between font-semibold text-base"><span>Total Estimated Cost</span><span>{money(totalEstimated)}</span></div>
        </div>

        <Button onClick={generateQuoteFromEstimate} className="w-full sm:w-auto">
          Generate Quote from Estimate
        </Button>
      </CardContent>
    </Card>
  );
}
