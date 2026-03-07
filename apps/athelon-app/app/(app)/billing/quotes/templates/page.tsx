"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { Plus, Copy, Power, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type LineItemType = "labor" | "part" | "external_service";

interface TemplateLineItem {
  type: LineItemType;
  description: string;
  qty: number;
  unitPrice: number;
  directCost?: number;
  markupMultiplier?: number;
}

export default function QuoteTemplatesPage() {
  const { orgId, isLoaded } = useCurrentOrg();

  const templates = useQuery(
    api.quoteTemplates.list,
    orgId ? { orgId } : "skip",
  );

  const createTemplate = useMutation(api.quoteTemplates.create);
  const updateTemplate = useMutation(api.quoteTemplates.update);
  const duplicateTemplate = useMutation(api.quoteTemplates.duplicate);
  const toggleActive = useMutation(api.quoteTemplates.toggleActive);

  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<Id<"quoteTemplates"> | null>(null);
  const [name, setName] = useState("");
  const [aircraftFilter, setAircraftFilter] = useState("");
  const [lineItems, setLineItems] = useState<TemplateLineItem[]>([
    { type: "labor", description: "", qty: 1, unitPrice: 0 },
  ]);

  const resetForm = () => {
    setName("");
    setAircraftFilter("");
    setLineItems([{ type: "labor", description: "", qty: 1, unitPrice: 0 }]);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!orgId || !name.trim()) return;
    const filtered = lineItems.filter((l) => l.description.trim());
    if (filtered.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    try {
      if (editId) {
        await updateTemplate({
          templateId: editId,
          name: name.trim(),
          aircraftTypeFilter: aircraftFilter.trim() || undefined,
          lineItems: filtered,
        });
        toast.success("Template updated");
      } else {
        await createTemplate({
          orgId,
          name: name.trim(),
          aircraftTypeFilter: aircraftFilter.trim() || undefined,
          lineItems: filtered,
        });
        toast.success("Template created");
      }
      setShowCreate(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    }
  };

  const handleEdit = (t: NonNullable<typeof templates>[number]) => {
    setEditId(t._id);
    setName(t.name);
    setAircraftFilter(t.aircraftTypeFilter ?? "");
    setLineItems(t.lineItems.map((l) => ({ ...l })));
    setShowCreate(true);
  };

  const addLine = () => {
    setLineItems([...lineItems, { type: "labor", description: "", qty: 1, unitPrice: 0 }]);
  };

  const updateLine = (idx: number, field: string, value: string | number) => {
    setLineItems(lineItems.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const removeLine = (idx: number) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  if (!isLoaded || templates === undefined) {
    return <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/sales/quotes">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Quote Templates</h1>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No templates yet. Create one to speed up quoting.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t._id} className="border-border/60">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">{t.name}</CardTitle>
                  {t.aircraftTypeFilter && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Aircraft: {t.aircraftTypeFilter}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={t.isActive ? "default" : "secondary"} className="text-[10px]">
                    {t.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Toggle active"
                    onClick={() => toggleActive({ templateId: t._id })}>
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit"
                    onClick={() => handleEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Duplicate"
                    onClick={async () => {
                      await duplicateTemplate({ templateId: t._id });
                      toast.success("Template duplicated");
                    }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{t.lineItems.length} line item{t.lineItems.length !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Template" : "New Quote Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Template Name</Label>
                <Input className="h-8 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Annual Inspection" />
              </div>
              <div>
                <Label className="text-xs">Aircraft Type Filter (optional)</Label>
                <Input className="h-8 text-sm" value={aircraftFilter} onChange={(e) => setAircraftFilter(e.target.value)} placeholder="e.g. Cessna 172" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Line Items</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addLine}>
                  <Plus className="w-3 h-3 mr-1" /> Add Line
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs w-20">Qty</TableHead>
                    <TableHead className="text-xs w-24">Unit $</TableHead>
                    <TableHead className="text-xs w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((li, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <select className="text-xs border rounded px-1 py-1 bg-background w-full"
                          value={li.type}
                          onChange={(e) => updateLine(idx, "type", e.target.value)}>
                          <option value="labor">Labor</option>
                          <option value="part">Part</option>
                          <option value="external_service">External</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input className="h-7 text-xs" value={li.description}
                          onChange={(e) => updateLine(idx, "description", e.target.value)}
                          placeholder="Description" />
                      </TableCell>
                      <TableCell>
                        <Input className="h-7 text-xs" type="number" value={li.qty}
                          onChange={(e) => updateLine(idx, "qty", parseFloat(e.target.value) || 0)} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-7 text-xs" type="number" step="0.01" value={li.unitPrice}
                          onChange={(e) => updateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                          onClick={() => removeLine(idx)} disabled={lineItems.length === 1}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{editId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
