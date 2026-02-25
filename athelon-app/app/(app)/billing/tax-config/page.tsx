"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Percent, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Add Tax Rate Dialog ──────────────────────────────────────────────────────

interface AddTaxRateDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
}

function AddTaxRateDialog({ open, onClose, orgId }: AddTaxRateDialogProps) {
  const createTaxRate = useMutation(api.billingV4.createTaxRate);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [appliesTo, setAppliesTo] = useState<"parts" | "labor" | "all">("all");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rateNum = parseFloat(rate);
    if (!name.trim()) { setError("Name is required."); return; }
    if (!rate || isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      setError("Rate must be a number between 0 and 100.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTaxRate({
        orgId: orgId as Parameters<typeof createTaxRate>[0]["orgId"],
        name: name.trim(),
        rate: rateNum,
        appliesTo,
        isDefault,
      });
      setName("");
      setRate("");
      setAppliesTo("all");
      setIsDefault(false);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create tax rate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Tax Rate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Name *</Label>
            <Input
              className="text-sm"
              placeholder="e.g., Colorado Sales Tax"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Rate (%) *</Label>
            <div className="relative">
              <Input
                className="pr-7 text-sm"
                type="number"
                step="0.001"
                min="0"
                max="100"
                placeholder="0.000"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Applies To *</Label>
            <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as "parts" | "labor" | "all")}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="parts">Parts only</SelectItem>
                <SelectItem value="labor">Labor only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isDefault"
              checked={isDefault}
              onCheckedChange={(v) => setIsDefault(!!v)}
            />
            <Label htmlFor="isDefault" className="text-xs cursor-pointer">
              Set as default tax rate
            </Label>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Add Tax Rate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const APPLIES_TO_LABELS: Record<string, string> = {
  all: "All",
  parts: "Parts",
  labor: "Labor",
};

export default function TaxConfigPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [addOpen, setAddOpen] = useState(false);

  const taxRates = useQuery(
    api.billingV4.listTaxRates,
    orgId ? { orgId } : "skip",
  );

  const isLoading = !isLoaded || taxRates === undefined;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Card className="border-border/60">
          <CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tax Configuration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage tax rates for invoices</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Tax Rate
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            Tax Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {taxRates.length === 0 ? (
            <div className="py-12 text-center">
              <Percent className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No tax rates configured.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add a tax rate to apply to invoices.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs text-right">Rate</TableHead>
                  <TableHead className="text-xs">Applies To</TableHead>
                  <TableHead className="text-xs">Default</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxRates.map((tr) => (
                  <TableRow key={tr._id} className="border-border/40">
                    <TableCell className="text-sm font-medium">{tr.name}</TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      {tr.rate.toFixed(3)}%
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {APPLIES_TO_LABELS[tr.appliesTo] ?? tr.appliesTo}
                    </TableCell>
                    <TableCell>
                      {tr.isDefault ? (
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">
                          Default
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border ${
                          tr.active
                            ? "bg-green-500/15 text-green-400 border-green-500/30"
                            : "bg-muted text-muted-foreground border-muted-foreground/30"
                        }`}
                      >
                        {tr.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {orgId && (
        <AddTaxRateDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          orgId={orgId}
        />
      )}
    </div>
  );
}
