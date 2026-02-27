"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  Play,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────

type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
type LineItemType = "labor" | "part" | "external_service";

interface LineItem {
  id: string;
  type: LineItemType;
  description: string;
  qty: string;
  unitPrice: string;
}

// ─── Frequency Badge ──────────────────────────────────────────────────────────

const FREQ_BADGE: Record<Frequency, string> = {
  weekly: "bg-muted text-muted-foreground border-muted-foreground/30",
  biweekly: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  monthly: "bg-green-500/15 text-green-400 border-green-500/30",
  quarterly: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  annually: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

function FrequencyBadge({ freq }: { freq: string }) {
  const cls = FREQ_BADGE[freq as Frequency] ?? "bg-muted text-muted-foreground border-muted-foreground/30";
  return (
    <Badge variant="outline" className={`text-[10px] font-medium border capitalize ${cls}`}>
      {freq}
    </Badge>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTs(ts: number | undefined | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString();
}

function newLineItem(): LineItem {
  return { id: Math.random().toString(36).slice(2), type: "labor", description: "", qty: "1", unitPrice: "0" };
}

// ─── Create Template Dialog ───────────────────────────────────────────────────

interface CreateTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: Id<"organizations">;
  techId: Id<"technicians"> | undefined;
}

function CreateRecurringTemplateDialog({ open, onClose, orgId, techId }: CreateTemplateDialogProps) {
  const customers = useQuery(api.billingV4.listAllCustomers, { organizationId: orgId });
  const createTemplate = useMutation(api.billingV4b.createRecurringTemplate);

  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState("");
  const [nextGenerateAt, setNextGenerateAt] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([newLineItem()]);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, li) => {
      const qty = parseFloat(li.qty) || 0;
      const price = parseFloat(li.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }, [lineItems]);

  function addLineItem() {
    setLineItems((prev) => [...prev, newLineItem()]);
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }

  function updateLineItem(id: string, field: keyof Omit<LineItem, "id">, value: string) {
    setLineItems((prev) =>
      prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)),
    );
  }

  function reset() {
    setName("");
    setCustomerId("");
    setDescription("");
    setFrequency("monthly");
    setPaymentTerms("");
    setPaymentTermsDays("");
    setNextGenerateAt("");
    setLineItems([newLineItem()]);
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Template name is required."); return; }
    if (!customerId) { toast.error("Please select a customer."); return; }
    if (!nextGenerateAt) { toast.error("Please set the next generate date."); return; }
    if (lineItems.length === 0) { toast.error("At least one line item is required."); return; }

    const items = lineItems.map((li) => ({
      type: li.type,
      description: li.description,
      qty: parseFloat(li.qty) || 0,
      unitPrice: parseFloat(li.unitPrice) || 0,
    }));
    if (items.some((li) => !li.description.trim())) {
      toast.error("All line items must have a description.");
      return;
    }

    if (!techId) {
      toast.error("Unable to identify the current technician. Refresh and try again.");
      return;
    }
    const createdByTechId = techId;

    setSubmitting(true);
    try {
      await createTemplate({
        orgId,
        customerId: customerId as Id<"customers">,
        name: name.trim(),
        description: description.trim() || undefined,
        frequency,
        lineItems: items,
        paymentTerms: paymentTerms.trim() || undefined,
        paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays, 10) : undefined,
        nextGenerateAt: new Date(nextGenerateAt).getTime(),
        createdByTechId,
      });
      toast.success("Recurring template created.");
      reset();
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to create template.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Recurring Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Name <span className="text-red-500">*</span></Label>
            <Input
              id="tpl-name"
              placeholder="e.g. Monthly Maintenance Fee"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <Label>Customer <span className="text-red-500">*</span></Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers === undefined ? (
                  <SelectItem value="__loading" disabled>Loading...</SelectItem>
                ) : customers.length === 0 ? (
                  <SelectItem value="__empty" disabled>No customers found</SelectItem>
                ) : (
                  customers.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">Description</Label>
            <Textarea
              id="tpl-desc"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-next">Next Generate Date <span className="text-red-500">*</span></Label>
              <Input
                id="tpl-next"
                type="date"
                value={nextGenerateAt}
                onChange={(e) => setNextGenerateAt(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-terms">Payment Terms</Label>
              <Input
                id="tpl-terms"
                placeholder="e.g. Net 30"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-terms-days">Terms Days</Label>
              <Input
                id="tpl-terms-days"
                type="number"
                placeholder="e.g. 30"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(e.target.value)}
                className="h-8 text-sm"
                min={0}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button size="sm" variant="outline" onClick={addLineItem} className="h-7 text-xs px-2">
                <Plus className="w-3 h-3 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="rounded-md border border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs w-28">Type</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs w-16">Qty</TableHead>
                    <TableHead className="text-xs w-24">Unit Price</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell className="p-1.5">
                        <Select value={li.type} onValueChange={(v) => updateLineItem(li.id, "type", v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="labor">Labor</SelectItem>
                            <SelectItem value="part">Part</SelectItem>
                            <SelectItem value="external_service">External Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          value={li.description}
                          onChange={(e) => updateLineItem(li.id, "description", e.target.value)}
                          placeholder="Description"
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          type="number"
                          value={li.qty}
                          onChange={(e) => updateLineItem(li.id, "qty", e.target.value)}
                          className="h-7 text-xs"
                          min={0}
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          type="number"
                          value={li.unitPrice}
                          onChange={(e) => updateLineItem(li.id, "unitPrice", e.target.value)}
                          className="h-7 text-xs"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeLineItem(li.id)}
                          disabled={lineItems.length === 1}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          aria-label="Remove line item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>

            {/* Subtotal */}
            <div className="flex justify-end pr-1">
              <span className="text-sm text-muted-foreground">
                Subtotal:{" "}
                <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { reset(); onClose(); }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !techId}>
            {submitting ? "Creating..." : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecurringBillingPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();
  const [createOpen, setCreateOpen] = useState(false);

  const templates = useQuery(
    api.billingV4b.listRecurringTemplates,
    orgId ? { orgId } : "skip",
  );

  const toggleTemplate = useMutation(api.billingV4b.toggleRecurringTemplate);
  const generateNow = useMutation(api.billingV4b.generateInvoiceFromTemplate);

  const isLoading = !isLoaded || templates === undefined;

  async function handleToggle(templateId: Id<"recurringBillingTemplates">, currentActive: boolean) {
    if (!orgId) return;
    try {
      await toggleTemplate({ orgId, templateId, active: !currentActive });
      toast.success(`Template ${currentActive ? "paused" : "activated"}.`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to update template.");
    }
  }

  async function handleGenerateNow(templateId: Id<"recurringBillingTemplates">) {
    if (!orgId) return;
    try {
      const invoiceId = await generateNow({ orgId, templateId });
      toast.success(`Invoice generated (ID: ${String(invoiceId).slice(-6)}).`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to generate invoice.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Recurring Billing</h1>
            {isLoading ? (
              <Skeleton className="h-4 w-40 mt-1" />
            ) : (
              <p className="text-sm text-muted-foreground mt-0.5">
                {templates.length} template{templates.length !== 1 ? "s" : ""} ·{" "}
                {templates.filter((t) => t.active).length} active
              </p>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Template
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No recurring templates</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Create a template to automate recurring invoice generation.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Frequency</TableHead>
                <TableHead className="text-xs text-right">Subtotal</TableHead>
                <TableHead className="text-xs">Next Generate</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl._id} className="hover:bg-muted/20">
                  <TableCell className="text-sm font-medium">{tpl.name}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                    {tpl.customerId}
                  </TableCell>
                  <TableCell>
                    <FrequencyBadge freq={tpl.frequency} />
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    ${(tpl.subtotal ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtTs(tpl.nextGenerateAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] border ${
                        tpl.active
                          ? "bg-green-500/15 text-green-400 border-green-500/30"
                          : "bg-muted text-muted-foreground border-muted-foreground/30"
                      }`}
                    >
                      {tpl.active ? "Active" : "Paused"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleToggle(tpl._id, tpl.active)}
                        aria-label={tpl.active ? "Pause template" : "Activate template"}
                      >
                        {tpl.active ? (
                          <><PauseCircle className="w-3.5 h-3.5 mr-1" />Pause</>
                        ) : (
                          <><PlayCircle className="w-3.5 h-3.5 mr-1" />Activate</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => handleGenerateNow(tpl._id)}
                        disabled={!tpl.active}
                        aria-label="Generate invoice now"
                      >
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Generate Now
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

      {/* Create Dialog */}
      {orgId && (
        <CreateRecurringTemplateDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          orgId={orgId}
          techId={techId}
        />
      )}
    </div>
  );
}
