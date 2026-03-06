"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BarChart3, Settings2, Users, Wrench } from "lucide-react";

type RosterSummary = {
  activeTechnicians: number;
  activeTeams: number;
  unsupervisedTeams: number;
  assignedCards: number;
  remainingHours: number;
};

type ConfigSummary = {
  baysCount: number;
  scheduledCount: number;
  unscheduledCount: number;
  conflictsCount: number;
};

type FinancialSummary = {
  defaultShopRate: number;
  defaultLaborCostRate: number;
  monthlyFixedOverhead: number;
  monthlyVariableOverhead: number;
  annualCapexAssumption: number;
};

type SchedulingSettingsSummary = {
  capacityBufferPercent: number;
  defaultStartHour: number;
  defaultEndHour: number;
  defaultEfficiencyMultiplier: number;
};

type CommandCenterTechnician = {
  technicianId: string;
  name: string;
  employeeId?: string;
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  efficiencyMultiplier: number;
  shiftSource?: string;
  usingDefaultShift?: boolean;
};

interface SchedulingCommandCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rosterSummary: RosterSummary;
  configSummary: ConfigSummary;
  financialSummary: FinancialSummary;
  schedulingSettingsSummary: SchedulingSettingsSummary;
  technicians: CommandCenterTechnician[];
  canManageScheduling: boolean;
  onSaveFinancialSummary: (next: FinancialSummary) => Promise<void>;
  onSaveSchedulingSettings: (next: SchedulingSettingsSummary) => Promise<void>;
  onSaveTechnicianShift: (next: {
    technicianId: string;
    daysOfWeek: number[];
    startHour: number;
    endHour: number;
    efficiencyMultiplier: number;
  }) => Promise<void>;
}

const SHIFT_DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

export function SchedulingCommandCenterDialog({
  open,
  onOpenChange,
  rosterSummary,
  configSummary,
  financialSummary,
  schedulingSettingsSummary,
  technicians,
  canManageScheduling,
  onSaveFinancialSummary,
  onSaveSchedulingSettings,
  onSaveTechnicianShift,
}: SchedulingCommandCenterDialogProps) {
  const [tab, setTab] = useState("personnel");
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [savingScheduling, setSavingScheduling] = useState(false);
  const [editingTechnicianId, setEditingTechnicianId] = useState<string | null>(null);
  const [savingTechnicianId, setSavingTechnicianId] = useState<string | null>(null);
  const [editShiftDays, setEditShiftDays] = useState<number[]>([]);
  const [editShiftStartHour, setEditShiftStartHour] = useState(7);
  const [editShiftEndHour, setEditShiftEndHour] = useState(17);
  const [editShiftEfficiency, setEditShiftEfficiency] = useState(1);

  const [shopRate, setShopRate] = useState(String(financialSummary.defaultShopRate));
  const [laborRate, setLaborRate] = useState(String(financialSummary.defaultLaborCostRate));
  const [fixedOverhead, setFixedOverhead] = useState(
    String(financialSummary.monthlyFixedOverhead),
  );
  const [variableOverhead, setVariableOverhead] = useState(
    String(financialSummary.monthlyVariableOverhead),
  );
  const [annualCapex, setAnnualCapex] = useState(
    String(financialSummary.annualCapexAssumption),
  );

  const [capacityBufferPercent, setCapacityBufferPercent] = useState(
    String(schedulingSettingsSummary.capacityBufferPercent),
  );
  const [defaultStartHour, setDefaultStartHour] = useState(
    String(schedulingSettingsSummary.defaultStartHour),
  );
  const [defaultEndHour, setDefaultEndHour] = useState(
    String(schedulingSettingsSummary.defaultEndHour),
  );
  const [defaultEfficiency, setDefaultEfficiency] = useState(
    String(schedulingSettingsSummary.defaultEfficiencyMultiplier),
  );

  useEffect(() => {
    setShopRate(String(financialSummary.defaultShopRate));
    setLaborRate(String(financialSummary.defaultLaborCostRate));
    setFixedOverhead(String(financialSummary.monthlyFixedOverhead));
    setVariableOverhead(String(financialSummary.monthlyVariableOverhead));
    setAnnualCapex(String(financialSummary.annualCapexAssumption));
  }, [financialSummary]);

  useEffect(() => {
    setCapacityBufferPercent(String(schedulingSettingsSummary.capacityBufferPercent));
    setDefaultStartHour(String(schedulingSettingsSummary.defaultStartHour));
    setDefaultEndHour(String(schedulingSettingsSummary.defaultEndHour));
    setDefaultEfficiency(String(schedulingSettingsSummary.defaultEfficiencyMultiplier));
  }, [schedulingSettingsSummary]);

  const projectedMonthlyBurn = useMemo(() => {
    const fixed = Number(fixedOverhead) || 0;
    const variable = Number(variableOverhead) || 0;
    const capex = Number(annualCapex) || 0;
    return fixed + variable + capex / 12;
  }, [fixedOverhead, variableOverhead, annualCapex]);

  async function handleSaveFinancial() {
    setSavingFinancial(true);
    try {
      await onSaveFinancialSummary({
        defaultShopRate: Number(shopRate) || financialSummary.defaultShopRate,
        defaultLaborCostRate: Number(laborRate) || financialSummary.defaultLaborCostRate,
        monthlyFixedOverhead: Number(fixedOverhead) || financialSummary.monthlyFixedOverhead,
        monthlyVariableOverhead:
          Number(variableOverhead) || financialSummary.monthlyVariableOverhead,
        annualCapexAssumption: Number(annualCapex) || financialSummary.annualCapexAssumption,
      });
      toast.success("Command center financial settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save financial settings");
    } finally {
      setSavingFinancial(false);
    }
  }

  async function handleSaveScheduling() {
    setSavingScheduling(true);
    try {
      await onSaveSchedulingSettings({
        capacityBufferPercent:
          Number(capacityBufferPercent) || schedulingSettingsSummary.capacityBufferPercent,
        defaultStartHour: Number(defaultStartHour) || schedulingSettingsSummary.defaultStartHour,
        defaultEndHour: Number(defaultEndHour) || schedulingSettingsSummary.defaultEndHour,
        defaultEfficiencyMultiplier:
          Number(defaultEfficiency) || schedulingSettingsSummary.defaultEfficiencyMultiplier,
      });
      toast.success("Scheduling settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save scheduling settings");
    } finally {
      setSavingScheduling(false);
    }
  }

  function beginInlineShiftEdit(technician: CommandCenterTechnician) {
    setEditingTechnicianId(technician.technicianId);
    setEditShiftDays([...technician.daysOfWeek]);
    setEditShiftStartHour(technician.startHour);
    setEditShiftEndHour(technician.endHour);
    setEditShiftEfficiency(technician.efficiencyMultiplier);
  }

  async function handleSaveInlineShift() {
    if (!editingTechnicianId) return;

    if (editShiftDays.length === 0) {
      toast.error("Select at least one active shift day");
      return;
    }
    if (editShiftStartHour < 0 || editShiftStartHour > 23) {
      toast.error("Start hour must be between 0 and 23");
      return;
    }
    if (editShiftEndHour < 1 || editShiftEndHour > 24) {
      toast.error("End hour must be between 1 and 24");
      return;
    }
    if (editShiftEndHour <= editShiftStartHour) {
      toast.error("Shift end hour must be after start hour");
      return;
    }
    if (editShiftEfficiency <= 0 || editShiftEfficiency > 2) {
      toast.error("Efficiency multiplier must be greater than 0 and up to 2.0");
      return;
    }

    const normalizedDays = Array.from(new Set(editShiftDays)).sort((a, b) => a - b);
    setSavingTechnicianId(editingTechnicianId);
    try {
      await onSaveTechnicianShift({
        technicianId: editingTechnicianId,
        daysOfWeek: normalizedDays,
        startHour: editShiftStartHour,
        endHour: editShiftEndHour,
        efficiencyMultiplier: editShiftEfficiency,
      });
      toast.success("Technician shift updated");
      setEditingTechnicianId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update technician shift");
    } finally {
      setSavingTechnicianId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Scheduling Command Center</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="personnel" data-testid="command-center-tab-personnel">
              <Users className="h-3.5 w-3.5" />
              Personnel
            </TabsTrigger>
            <TabsTrigger value="configuration" data-testid="command-center-tab-configuration">
              <Settings2 className="h-3.5 w-3.5" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="financial" data-testid="command-center-tab-financial">
              <BarChart3 className="h-3.5 w-3.5" />
              Financial
            </TabsTrigger>
          </TabsList>

          {!canManageScheduling && (
            <div className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Updates are blocked for your current role. Contact a scheduling admin to apply edits.
            </div>
          )}

          <TabsContent value="personnel" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded border border-border/60 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Active Techs</div>
                <div className="text-xl font-mono font-semibold mt-1">
                  {rosterSummary.activeTechnicians}
                </div>
              </div>
              <div className="rounded border border-border/60 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Active Teams</div>
                <div className="text-xl font-mono font-semibold mt-1">
                  {rosterSummary.activeTeams}
                </div>
              </div>
              <div className="rounded border border-border/60 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Unsupervised Teams</div>
                <div className="text-xl font-mono font-semibold mt-1 text-amber-500">
                  {rosterSummary.unsupervisedTeams}
                </div>
              </div>
              <div className="rounded border border-border/60 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Assigned Cards</div>
                <div className="text-xl font-mono font-semibold mt-1">
                  {rosterSummary.assignedCards}
                </div>
              </div>
              <div className="rounded border border-border/60 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Remaining Hours</div>
                <div className="text-xl font-mono font-semibold mt-1">
                  {Math.round(rosterSummary.remainingHours)}
                </div>
              </div>
            </div>

            <div className="rounded border border-border/60 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">Technician Shift Overrides</div>
                  <div className="text-xs text-muted-foreground">
                    Inline edit per-technician shift defaults used by capacity planning.
                  </div>
                </div>
                {!canManageScheduling && (
                  <Badge variant="outline" className="text-[10px]">
                    Read-only
                  </Badge>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {technicians.map((technician) => {
                  const editing = editingTechnicianId === technician.technicianId;
                  const saving = savingTechnicianId === technician.technicianId;
                  return (
                    <div
                      key={technician.technicianId}
                      className="rounded border border-border/60 p-2 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{technician.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {technician.employeeId ? `#${technician.employeeId} · ` : ""}
                            {technician.shiftSource === "technician_override"
                              ? "Custom override"
                              : technician.shiftSource === "team_shift"
                                ? "Team shift"
                                : "Org default"}
                          </div>
                        </div>
                        {editing ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              onClick={handleSaveInlineShift}
                              disabled={!canManageScheduling || saving}
                            >
                              {saving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTechnicianId(null)}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => beginInlineShiftEdit(technician)}
                            disabled={!canManageScheduling}
                          >
                            Edit Shift
                          </Button>
                        )}
                      </div>

                      {editing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[11px]">Start Hour</Label>
                            <Input
                              type="number"
                              min={0}
                              max={23}
                              value={editShiftStartHour}
                              onChange={(e) => setEditShiftStartHour(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">End Hour</Label>
                            <Input
                              type="number"
                              min={1}
                              max={24}
                              value={editShiftEndHour}
                              onChange={(e) => setEditShiftEndHour(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Efficiency</Label>
                            <Input
                              type="number"
                              min={0.1}
                              max={2}
                              step={0.05}
                              value={editShiftEfficiency}
                              onChange={(e) => setEditShiftEfficiency(Number(e.target.value))}
                            />
                          </div>
                          <div className="sm:col-span-3 flex flex-wrap gap-2">
                            {SHIFT_DAY_OPTIONS.map((day) => (
                              <Button
                                key={day.value}
                                type="button"
                                size="sm"
                                variant={editShiftDays.includes(day.value) ? "secondary" : "outline"}
                                onClick={() => {
                                  setEditShiftDays((prev) =>
                                    prev.includes(day.value)
                                      ? prev.filter((value) => value !== day.value)
                                      : [...prev, day.value],
                                  );
                                }}
                              >
                                {day.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {technician.daysOfWeek
                            .map((value) => SHIFT_DAY_OPTIONS.find((day) => day.value === value)?.label)
                            .filter(Boolean)
                            .join(", ") || "No days"}
                          {" · "}
                          {String(technician.startHour).padStart(2, "0")}:00-
                          {String(technician.endHour).padStart(2, "0")}:00
                          {" · "}
                          {Math.round(technician.efficiencyMultiplier * 100)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/personnel">Open Personnel</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/scheduling/capacity">Open Capacity</Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="configuration" className="mt-4 space-y-4">
            {configSummary.conflictsCount > 0 && (
              <div
                className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200"
                data-testid="command-center-conflict-warning"
              >
                {configSummary.conflictsCount}
                {" "}
                active scheduling conflict
                {configSummary.conflictsCount === 1 ? "" : "s"}
                {" "}
                detected. Resolve board conflicts before committing broad capacity changes.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded border border-border/60 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Bays</div>
                <div className="text-lg font-mono font-semibold mt-1">
                  {configSummary.baysCount}
                </div>
              </div>
              <div className="rounded border border-border/60 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Scheduled</div>
                <div className="text-lg font-mono font-semibold mt-1">
                  {configSummary.scheduledCount}
                </div>
              </div>
              <div className="rounded border border-border/60 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Unscheduled</div>
                <div className="text-lg font-mono font-semibold mt-1">
                  {configSummary.unscheduledCount}
                </div>
              </div>
              <div className="rounded border border-border/60 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Conflicts</div>
                <div className="text-lg font-mono font-semibold mt-1 flex items-center gap-1">
                  {configSummary.conflictsCount}
                  {configSummary.conflictsCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1">
                      <Wrench className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="cc-capacity-buffer">Capacity Buffer %</Label>
                <Input
                  id="cc-capacity-buffer"
                  value={capacityBufferPercent}
                  onChange={(e) => setCapacityBufferPercent(e.target.value)}
                  disabled={!canManageScheduling}
                />
              </div>
              <div>
                <Label htmlFor="cc-default-start">Default Start Hour</Label>
                <Input
                  id="cc-default-start"
                  value={defaultStartHour}
                  onChange={(e) => setDefaultStartHour(e.target.value)}
                  disabled={!canManageScheduling}
                />
              </div>
              <div>
                <Label htmlFor="cc-default-end">Default End Hour</Label>
                <Input
                  id="cc-default-end"
                  value={defaultEndHour}
                  onChange={(e) => setDefaultEndHour(e.target.value)}
                  disabled={!canManageScheduling}
                />
              </div>
              <div>
                <Label htmlFor="cc-default-eff">Default Efficiency</Label>
                <Input
                  id="cc-default-eff"
                  value={defaultEfficiency}
                  onChange={(e) => setDefaultEfficiency(e.target.value)}
                  disabled={!canManageScheduling}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveScheduling}
                disabled={savingScheduling || !canManageScheduling}
                data-testid="command-center-save-scheduling"
              >
                {savingScheduling ? "Saving..." : "Save Capacity Defaults"}
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/scheduling/bays">Manage Bays</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings/shop">Shop Settings</Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="cc-shop-rate">Default Shop Rate</Label>
                <Input
                  id="cc-shop-rate"
                  value={shopRate}
                  onChange={(e) => setShopRate(e.target.value)}
                  disabled={!canManageScheduling}
                />
              </div>
              <div>
                <Label htmlFor="cc-labor-rate">Default Labor Cost Rate</Label>
                <Input
                  id="cc-labor-rate"
                  value={laborRate}
                  onChange={(e) => setLaborRate(e.target.value)}
                  disabled={!canManageScheduling}
                />
              </div>
              <div>
                <Label htmlFor="cc-fixed-overhead">Monthly Fixed Overhead</Label>
                <Input
                  id="cc-fixed-overhead"
                  value={fixedOverhead}
                  onChange={(e) => setFixedOverhead(e.target.value)}
                  disabled={!canManageScheduling}
                />
              </div>
              <div>
                <Label htmlFor="cc-variable-overhead">Monthly Variable Overhead</Label>
                <Input
                  id="cc-variable-overhead"
                  value={variableOverhead}
                  onChange={(e) => setVariableOverhead(e.target.value)}
                  disabled={!canManageScheduling}
                />
              </div>
              <div>
                <Label htmlFor="cc-annual-capex">Annual Capex Assumption</Label>
                <Input
                  id="cc-annual-capex"
                  value={annualCapex}
                  onChange={(e) => setAnnualCapex(e.target.value)}
                  disabled={!canManageScheduling}
                />
              </div>
              <div className="rounded border border-border/60 p-3 bg-muted/20">
                <div className="text-[11px] uppercase text-muted-foreground">
                  Projected Monthly Burn
                </div>
                <div className="text-xl font-mono font-semibold mt-1">
                  ${Math.round(projectedMonthlyBurn).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveFinancial}
                disabled={savingFinancial || !canManageScheduling}
                data-testid="command-center-save-financial"
              >
                {savingFinancial ? "Saving..." : "Save Financial Defaults"}
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/scheduling/financial-planning">Open Financial Planning</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/reports/financials">Open Financial Reports</Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
