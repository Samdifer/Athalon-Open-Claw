"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, ClipboardCheck, FlaskConical, Ruler } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Measurement = {
  id: string;
  dimension: string;
  value: string;
  tolerance: string;
  pass: boolean;
};

type TestResult = {
  id: string;
  testName: string;
  result: string;
  pass: boolean;
  date: string;
  technician: string;
};

type ComplianceCheck = {
  id: string;
  label: string;
  checked: boolean;
};

type InDockEvidenceState = {
  photos: string[];
  measurements: Measurement[];
  tests: TestResult[];
  compliance: ComplianceCheck[];
};

const DEFAULT_COMPLIANCE_ITEMS = [
  "Required incoming visual inspection complete",
  "Damage mapping documented",
  "Logbooks and records reviewed",
  "Customer findings reconciled",
];

function createDefaultState(): InDockEvidenceState {
  return {
    photos: [],
    measurements: [],
    tests: [],
    compliance: DEFAULT_COMPLIANCE_ITEMS.map((label, idx) => ({
      id: `default-${idx + 1}`,
      label,
      checked: false,
    })),
  };
}

export function InDockEvidenceHub({ workOrderId }: { workOrderId: string }) {
  const storageKey = `wo:${workOrderId}:in-dock-evidence`;
  const [state, setState] = useState<InDockEvidenceState>(() => createDefaultState());

  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);

  const [measurementForm, setMeasurementForm] = useState({ dimension: "", value: "", tolerance: "", pass: true });
  const [testForm, setTestForm] = useState({ testName: "", result: "", pass: true, date: "", technician: "" });
  const [complianceLabel, setComplianceLabel] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<InDockEvidenceState>;
      setState({
        photos: parsed.photos ?? [],
        measurements: parsed.measurements ?? [],
        tests: parsed.tests ?? [],
        compliance:
          parsed.compliance && parsed.compliance.length > 0
            ? parsed.compliance
            : createDefaultState().compliance,
      });
    } catch {
      // ignore malformed local state
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const complianceProgress = useMemo(() => {
    const total = state.compliance.length;
    const checked = state.compliance.filter((item) => item.checked).length;
    return { total, checked };
  }, [state.compliance]);

  const addPhotoPlaceholder = () => {
    setState((prev) => ({
      ...prev,
      photos: [...prev.photos, `Photo ${prev.photos.length + 1}`],
    }));
    toast.info("Camera coming soon");
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">In-Dock Evidence Hub</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="photos" className="space-y-3">
          <TabsList className="h-9 bg-muted/40 p-0.5 overflow-x-auto max-w-full">
            <TabsTrigger value="photos" className="text-xs">Photos</TabsTrigger>
            <TabsTrigger value="measurements" className="text-xs">Measurements</TabsTrigger>
            <TabsTrigger value="tests" className="text-xs">Test Results</TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Camera className="w-3.5 h-3.5" />
                Inspection Photos
              </div>
              <Button size="sm" className="h-7 text-xs" onClick={addPhotoPlaceholder}>Add Photo</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {state.photos.length === 0 ? (
                <div className="col-span-full rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                  No inspection photos yet.
                </div>
              ) : (
                state.photos.map((label, idx) => (
                  <div key={`${label}-${idx}`} className="rounded-md border border-border/60 bg-muted/20 p-3 h-24 flex flex-col justify-between">
                    <span className="text-[11px] text-muted-foreground">Placeholder</span>
                    <span className="text-xs font-medium truncate">{label}</span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="measurements" className="mt-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Ruler className="w-3.5 h-3.5" />
                Recorded Measurements
              </div>
              <Dialog open={measurementOpen} onOpenChange={setMeasurementOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 text-xs">Add Measurement</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Measurement</DialogTitle></DialogHeader>
                  <div className="space-y-2">
                    <Input placeholder="Dimension" value={measurementForm.dimension} onChange={(e) => setMeasurementForm((p) => ({ ...p, dimension: e.target.value }))} />
                    <Input placeholder="Value" value={measurementForm.value} onChange={(e) => setMeasurementForm((p) => ({ ...p, value: e.target.value }))} />
                    <Input placeholder="Tolerance" value={measurementForm.tolerance} onChange={(e) => setMeasurementForm((p) => ({ ...p, tolerance: e.target.value }))} />
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={measurementForm.pass} onCheckedChange={(c) => setMeasurementForm((p) => ({ ...p, pass: Boolean(c) }))} /> Pass</label>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        if (!measurementForm.dimension.trim()) return;
                        setState((prev) => ({
                          ...prev,
                          measurements: [...prev.measurements, { id: crypto.randomUUID(), ...measurementForm }],
                        }));
                        setMeasurementForm({ dimension: "", value: "", tolerance: "", pass: true });
                        setMeasurementOpen(false);
                      }}
                    >Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dimension</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Tolerance</TableHead>
                  <TableHead>Pass/Fail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.measurements.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">No measurements recorded.</TableCell></TableRow>
                ) : (
                  state.measurements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.dimension}</TableCell>
                      <TableCell>{m.value}</TableCell>
                      <TableCell>{m.tolerance}</TableCell>
                      <TableCell><Badge variant="outline" className={m.pass ? "text-green-500" : "text-red-500"}>{m.pass ? "PASS" : "FAIL"}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="tests" className="mt-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FlaskConical className="w-3.5 h-3.5" />
                Test Results
              </div>
              <Dialog open={testOpen} onOpenChange={setTestOpen}>
                <DialogTrigger asChild><Button size="sm" className="h-7 text-xs">Add Test</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Test Result</DialogTitle></DialogHeader>
                  <div className="space-y-2">
                    <Input placeholder="Test name" value={testForm.testName} onChange={(e) => setTestForm((p) => ({ ...p, testName: e.target.value }))} />
                    <Input placeholder="Result" value={testForm.result} onChange={(e) => setTestForm((p) => ({ ...p, result: e.target.value }))} />
                    <Input type="date" value={testForm.date} onChange={(e) => setTestForm((p) => ({ ...p, date: e.target.value }))} />
                    <Input placeholder="Technician" value={testForm.technician} onChange={(e) => setTestForm((p) => ({ ...p, technician: e.target.value }))} />
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={testForm.pass} onCheckedChange={(c) => setTestForm((p) => ({ ...p, pass: Boolean(c) }))} /> Pass</label>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        if (!testForm.testName.trim()) return;
                        setState((prev) => ({ ...prev, tests: [...prev.tests, { id: crypto.randomUUID(), ...testForm }] }));
                        setTestForm({ testName: "", result: "", pass: true, date: "", technician: "" });
                        setTestOpen(false);
                      }}
                    >Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {state.tests.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">No test results logged.</div>
              ) : (
                state.tests.map((test) => (
                  <div key={test.id} className="rounded-md border border-border/60 p-3 text-xs flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{test.testName}</p>
                      <p className="text-muted-foreground">{test.result} · {test.date || "No date"} · {test.technician || "Unknown tech"}</p>
                    </div>
                    <Badge variant="outline" className={test.pass ? "text-green-500" : "text-red-500"}>{test.pass ? "PASS" : "FAIL"}</Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="mt-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardCheck className="w-3.5 h-3.5" />
                Compliance Checks
                <Badge variant="outline" className="text-[10px]">{complianceProgress.checked}/{complianceProgress.total}</Badge>
              </div>
              <Dialog open={complianceOpen} onOpenChange={setComplianceOpen}>
                <DialogTrigger asChild><Button size="sm" className="h-7 text-xs">Add Compliance Item</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Compliance Item</DialogTitle></DialogHeader>
                  <Input placeholder="Required compliance item" value={complianceLabel} onChange={(e) => setComplianceLabel(e.target.value)} />
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        if (!complianceLabel.trim()) return;
                        setState((prev) => ({
                          ...prev,
                          compliance: [...prev.compliance, { id: crypto.randomUUID(), label: complianceLabel.trim(), checked: false }],
                        }));
                        setComplianceLabel("");
                        setComplianceOpen(false);
                      }}
                    >Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {state.compliance.map((item) => (
                <label key={item.id} className="flex items-center justify-between rounded-md border border-border/60 p-2 text-sm">
                  <span>{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.checked && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) => {
                        setState((prev) => ({
                          ...prev,
                          compliance: prev.compliance.map((c) => (c.id === item.id ? { ...c, checked: Boolean(checked) } : c)),
                        }));
                      }}
                    />
                  </div>
                </label>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
