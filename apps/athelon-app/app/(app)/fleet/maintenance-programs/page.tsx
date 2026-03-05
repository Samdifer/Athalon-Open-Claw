import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Eye } from "lucide-react";

const EMPTY_FORM = {
  aircraftType: "",
  serialNumberScope: "all" as "all" | "specific",
  specificSerials: "",
  taskName: "",
  ataChapter: "",
  approvedDataRef: "",
  calendarIntervalDays: "",
  hourInterval: "",
  cycleInterval: "",
  triggerLogic: "first" as "first" | "greater",
  isPhaseInspection: false,
  phaseNumber: "",
  requiredPartsTemplate: "",
  estimatedLaborHours: "",
  isActive: true,
};

export default function MaintenanceProgramsPage() {
  const { orgId } = useCurrentOrg();
  const programs = useQuery(api.maintenancePrograms.list, orgId ? { organizationId: orgId } : "skip");
  const createProgram = useMutation(api.maintenancePrograms.create);
  const updateProgram = useMutation(api.maintenancePrograms.update);
  const removeProgram = useMutation(api.maintenancePrograms.remove);

  const [aircraftFilter, setAircraftFilter] = useState("all");
  const [ataFilter, setAtaFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"maintenancePrograms"> | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const aircraftTypes = useMemo(
    () => [...new Set((programs ?? []).map((p) => p.aircraftType))].sort(),
    [programs],
  );
  const ataChapters = useMemo(
    () => [...new Set((programs ?? []).map((p) => p.ataChapter))].sort(),
    [programs],
  );

  const filtered = useMemo(() => {
    return (programs ?? []).filter((p) => {
      if (aircraftFilter !== "all" && p.aircraftType !== aircraftFilter) return false;
      if (ataFilter !== "all" && p.ataChapter !== ataFilter) return false;
      return true;
    });
  }, [programs, aircraftFilter, ataFilter]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(row: (typeof filtered)[number]) {
    setEditingId(row._id);
    setForm({
      aircraftType: row.aircraftType,
      serialNumberScope: row.serialNumberScope,
      specificSerials: (row.specificSerials ?? []).join(", "),
      taskName: row.taskName,
      ataChapter: row.ataChapter,
      approvedDataRef: row.approvedDataRef ?? "",
      calendarIntervalDays: row.calendarIntervalDays?.toString() ?? "",
      hourInterval: row.hourInterval?.toString() ?? "",
      cycleInterval: row.cycleInterval?.toString() ?? "",
      triggerLogic: row.triggerLogic,
      isPhaseInspection: row.isPhaseInspection,
      phaseNumber: row.phaseNumber?.toString() ?? "",
      requiredPartsTemplate: (row.requiredPartsTemplate ?? []).join("\n"),
      estimatedLaborHours: row.estimatedLaborHours?.toString() ?? "",
      isActive: row.isActive,
    });
    setDialogOpen(true);
  }

  async function onSave() {
    if (!orgId) return;
    if (!form.aircraftType || !form.taskName || !form.ataChapter) {
      toast.error("Aircraft type, task name, and ATA chapter are required.");
      return;
    }

    const payload = {
      taskName: form.taskName,
      ataChapter: form.ataChapter,
      approvedDataRef: form.approvedDataRef || undefined,
      calendarIntervalDays: form.calendarIntervalDays ? Number(form.calendarIntervalDays) : undefined,
      hourInterval: form.hourInterval ? Number(form.hourInterval) : undefined,
      cycleInterval: form.cycleInterval ? Number(form.cycleInterval) : undefined,
      triggerLogic: form.triggerLogic,
      isPhaseInspection: form.isPhaseInspection,
      phaseNumber: form.phaseNumber ? Number(form.phaseNumber) : undefined,
      requiredPartsTemplate: form.requiredPartsTemplate
        ? form.requiredPartsTemplate.split("\n").map((p) => p.trim()).filter(Boolean)
        : undefined,
      estimatedLaborHours: form.estimatedLaborHours ? Number(form.estimatedLaborHours) : undefined,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await updateProgram({ id: editingId, ...payload });
        toast.success("Maintenance program updated.");
      } else {
        await createProgram({
          organizationId: orgId,
          aircraftType: form.aircraftType,
          serialNumberScope: form.serialNumberScope,
          specificSerials:
            form.serialNumberScope === "specific"
              ? form.specificSerials.split(",").map((s) => s.trim()).filter(Boolean)
              : undefined,
          ...payload,
        });
        toast.success("Maintenance program created.");
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save program.");
    }
  }

  async function onToggleActive(id: Id<"maintenancePrograms">, isActive: boolean) {
    try {
      await updateProgram({ id, isActive: !isActive });
      toast.success(!isActive ? "Program activated." : "Program deactivated.");
    } catch {
      toast.error("Failed to update status.");
    }
  }

  // BUG-DOM-119: The "Deactivate" button called removeProgram (permanent delete)
  // but showed a "Program deactivated" toast. The DOM thought they were toggling
  // the program off (reversible), but the record was actually deleted (irreversible).
  // If they wanted to reactivate later, the data was gone. The inline Switch
  // already handles activation/deactivation correctly. Replace the destructive
  // delete with the same toggle-off behavior for consistency and data safety.
  async function onDeactivate(id: Id<"maintenancePrograms">) {
    try {
      await updateProgram({ id, isActive: false });
      toast.success("Program deactivated.");
    } catch {
      toast.error("Failed to deactivate program.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Maintenance Programs</h1>
          <p className="text-sm text-muted-foreground">Manage Chapter 5 interval definitions and trigger logic.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Program</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Aircraft Type</Label>
            <Select value={aircraftFilter} onValueChange={setAircraftFilter}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All aircraft</SelectItem>
                {aircraftTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ATA Chapter</Label>
            <Select value={ataFilter} onValueChange={setAtaFilter}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All chapters</SelectItem>
                {ataChapters.map((ata) => <SelectItem key={ata} value={ata}>{ata}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>ATA</TableHead>
                <TableHead>Aircraft</TableHead>
                <TableHead>Calendar</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Cycles</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>{row.taskName}</TableCell>
                  <TableCell>{row.ataChapter}</TableCell>
                  <TableCell>{row.aircraftType}</TableCell>
                  <TableCell>{row.calendarIntervalDays ? `${row.calendarIntervalDays} d` : "—"}</TableCell>
                  <TableCell>{row.hourInterval ? `${row.hourInterval} h` : "—"}</TableCell>
                  <TableCell>{row.cycleInterval ? `${row.cycleInterval} cyc` : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{row.triggerLogic === "first" ? "First due" : "Greatest"}</Badge></TableCell>
                  <TableCell>{row.isPhaseInspection ? `Phase ${row.phaseNumber ?? "?"}` : "—"}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-2">
                      <Switch checked={row.isActive} onCheckedChange={() => onToggleActive(row._id, row.isActive)} />
                      <span className="text-xs">{row.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button asChild variant="ghost" size="sm"><Link to={`/fleet/maintenance-programs/${row._id}`}><Eye className="w-4 h-4" /></Link></Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onDeactivate(row._id)} disabled={!row.isActive}>Deactivate</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && <p className="text-sm text-muted-foreground mt-4">No maintenance programs found.</p>}
        </CardContent>
      </Card>

      {/* BUG-DOM-117: Dialog onOpenChange didn't reset form state on close.
          If a DOM edits a program, closes via backdrop/X without saving, then
          clicks "Add Program", the previous program's fields are still populated.
          This is the same stale-dialog pattern found in billing (BUG-BM-HUNT-010).
          Reset form state on close so the next interaction starts clean. */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Maintenance Program</DialogTitle>
            <DialogDescription>Define all interval dimensions, trigger logic, and part/labor templates.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Aircraft Type</Label><Input value={form.aircraftType} disabled={!!editingId} onChange={(e) => setForm((f) => ({ ...f, aircraftType: e.target.value }))} /></div>
            <div><Label>Task Name</Label><Input value={form.taskName} onChange={(e) => setForm((f) => ({ ...f, taskName: e.target.value }))} /></div>
            <div><Label>ATA Chapter</Label><Input value={form.ataChapter} onChange={(e) => setForm((f) => ({ ...f, ataChapter: e.target.value }))} /></div>
            <div><Label>Approved Data Ref</Label><Input value={form.approvedDataRef} onChange={(e) => setForm((f) => ({ ...f, approvedDataRef: e.target.value }))} /></div>
            <div><Label>Calendar Interval (days)</Label><Input type="number" value={form.calendarIntervalDays} onChange={(e) => setForm((f) => ({ ...f, calendarIntervalDays: e.target.value }))} /></div>
            <div><Label>Hour Interval</Label><Input type="number" value={form.hourInterval} onChange={(e) => setForm((f) => ({ ...f, hourInterval: e.target.value }))} /></div>
            <div><Label>Cycle Interval</Label><Input type="number" value={form.cycleInterval} onChange={(e) => setForm((f) => ({ ...f, cycleInterval: e.target.value }))} /></div>
            <div>
              <Label>Trigger Logic</Label>
              <Select value={form.triggerLogic} onValueChange={(v: "first" | "greater") => setForm((f) => ({ ...f, triggerLogic: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First due (earliest)</SelectItem>
                  <SelectItem value="greater">Greatest interval (latest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Serial Scope</Label>
              <Select value={form.serialNumberScope} onValueChange={(v: "all" | "specific") => setForm((f) => ({ ...f, serialNumberScope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All serial numbers</SelectItem>
                  <SelectItem value="specific">Specific serial numbers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Estimated Labor Hours</Label><Input type="number" value={form.estimatedLaborHours} onChange={(e) => setForm((f) => ({ ...f, estimatedLaborHours: e.target.value }))} /></div>
            <div className="flex items-center gap-2 mt-6">
              <Switch checked={form.isPhaseInspection} onCheckedChange={(v) => setForm((f) => ({ ...f, isPhaseInspection: !!v }))} />
              <Label>Phase Inspection</Label>
            </div>
            <div><Label>Phase Number</Label><Input type="number" value={form.phaseNumber} onChange={(e) => setForm((f) => ({ ...f, phaseNumber: e.target.value }))} /></div>
            <div className="md:col-span-2">
              <Label>Specific Serials (comma-separated)</Label>
              <Input value={form.specificSerials} onChange={(e) => setForm((f) => ({ ...f, specificSerials: e.target.value }))} disabled={form.serialNumberScope !== "specific"} />
            </div>
            <div className="md:col-span-2">
              <Label>Required Parts Template (one per line)</Label>
              <Textarea rows={4} value={form.requiredPartsTemplate} onChange={(e) => setForm((f) => ({ ...f, requiredPartsTemplate: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: !!v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={onSave}>{editingId ? "Save Changes" : "Create Program"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
