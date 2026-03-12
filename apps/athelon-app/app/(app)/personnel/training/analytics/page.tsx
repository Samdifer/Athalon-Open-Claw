import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useUser } from "@clerk/clerk-react";
import {
  BarChart3,
  ArrowLeft,
  Plus,
  Loader2,
  GraduationCap,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { EfficiencyBaseline } from "../_components/EfficiencyBaseline";
import { GrowthCurveDashboard } from "../_components/GrowthCurveDashboard";
import { OKRProgressCard } from "../_components/OKRProgressCard";
import { TrainerRecords } from "../_components/TrainerRecords";
import { BalancedKPIPanel } from "../_components/BalancedKPIPanel";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const TRAINING_PRESETS = [
  { value: "91.411", label: "FAR 91.411 (Altimeter/Pitot-Static)" },
  { value: "91.413", label: "FAR 91.413 (Transponder)" },
  { value: "borescope", label: "Borescope Inspection" },
  { value: "ndt", label: "Non-Destructive Testing (NDT)" },
];

export default function TrainingAnalyticsPage() {
  const { user } = useUser();
  const { orgId } = useCurrentOrg();
  const [activeTab, setActiveTab] = useState("okr");
  const [goalTechId, setGoalTechId] = useState<string>("");
  const [goalPeriod, setGoalPeriod] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [goalTargetType, setGoalTargetType] = useState<"stages_completed" | "tasks_completed" | "hours_trained">("stages_completed");
  const [goalTargetValue, setGoalTargetValue] = useState("");
  const [goalPeriodStart, setGoalPeriodStart] = useState("");
  const [goalPeriodEnd, setGoalPeriodEnd] = useState("");
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip"
  );
  const goals = useQuery(
    api.ojt.listGoals,
    goalTechId ? { technicianId: goalTechId as Id<"technicians"> } : "skip",
  );
  const orgTraining = useQuery(
    api.technicianTraining.listByOrg,
    orgId ? { organizationId: orgId } : "skip",
  );

  const createGoal = useMutation(api.ojt.createGoal);

  const techMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of (technicians ?? [])) {
      m.set(t._id, t.legalName);
    }
    return m;
  }, [technicians]);

  const currentTech = useMemo(
    () => (technicians ?? []).find((t) => t.userId && user?.id && t.userId === user.id),
    [technicians, user?.id],
  );

  const nowMs = Date.now();

  const techSummary = useMemo(() => {
    const techList = technicians ?? [];
    const map = new Map<string, { total: number; expired: number }>();
    for (const t of techList) map.set(t._id, { total: 0, expired: 0 });
    for (const rec of orgTraining ?? []) {
      const entry = map.get(rec.technicianId);
      if (entry) {
        entry.total++;
        if (rec.expiresAt && rec.expiresAt < nowMs) entry.expired++;
      }
    }
    return map;
  }, [orgTraining, technicians, nowMs]);

  const [selectedConstraintTech, setSelectedConstraintTech] = useState<Id<"technicians"> | null>(null);
  const [showAddConstraint, setShowAddConstraint] = useState(false);
  const [trainingType, setTrainingType] = useState("");
  const [customType, setCustomType] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [certRef, setCertRef] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Id<"technicianTraining"> | null>(null);

  const techTraining = useQuery(
    api.technicianTraining.listByTechnician,
    selectedConstraintTech ? { technicianId: selectedConstraintTech } : "skip",
  );

  const addTraining = useMutation(api.technicianTraining.addTraining);
  const removeTraining = useMutation(api.technicianTraining.removeTraining);

  async function handleCreateGoal() {
    if (!orgId || !currentTech) {
      toast.error("Unable to resolve organization or your technician profile");
      return;
    }
    if (!goalTechId || !goalTargetValue || !goalPeriodStart || !goalPeriodEnd) {
      toast.error("All goal fields are required");
      return;
    }
    const targetValue = Number(goalTargetValue);
    if (Number.isNaN(targetValue) || targetValue <= 0) {
      toast.error("Target value must be greater than 0");
      return;
    }
    if (goalPeriodEnd <= goalPeriodStart) {
      toast.error("Period end must be after period start");
      return;
    }
    setIsCreatingGoal(true);
    try {
      await createGoal({
        organizationId: orgId,
        technicianId: goalTechId as Id<"technicians">,
        setByTechnicianId: currentTech._id,
        period: goalPeriod,
        periodStart: new Date(goalPeriodStart).getTime(),
        periodEnd: new Date(goalPeriodEnd).getTime(),
        targetType: goalTargetType,
        targetValue,
      });
      toast.success("Goal created");
      setShowGoalDialog(false);
      setGoalTargetValue("");
      setGoalPeriodStart("");
      setGoalPeriodEnd("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create goal");
    } finally {
      setIsCreatingGoal(false);
    }
  }

  async function handleAddConstraint() {
    if (!selectedConstraintTech || !completedAt) {
      toast.error("Select a technician and completion date");
      return;
    }
    const type = trainingType === "custom" ? customType : trainingType;
    if (!type) {
      toast.error("Select or enter a training type");
      return;
    }
    if (expiresAt && expiresAt <= completedAt) {
      toast.error("Expiry date must be after the completion date");
      return;
    }
    if (!orgId) return;
    setIsAdding(true);
    try {
      await addTraining({
        technicianId: selectedConstraintTech,
        organizationId: orgId,
        trainingType: type,
        completedAt: new Date(completedAt).getTime(),
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
        certificateRef: certRef || undefined,
      });
      toast.success("Scheduling training added");
      setShowAddConstraint(false);
      setTrainingType("");
      setCustomType("");
      setCompletedAt("");
      setExpiresAt("");
      setCertRef("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add training");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveConstraint(id: Id<"technicianTraining">) {
    try {
      await removeTraining({ trainingId: id });
      toast.success("Training removed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <BarChart3 className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No organization context available</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <BarChart3 className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 -ml-2 text-muted-foreground hover:text-foreground">
                <Link to="/personnel/training">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Training &amp; Qualifications
                </Link>
              </Button>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
              Training Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              OKR goals, efficiency metrics, growth curves, KPI dashboards, and scheduling constraints
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link to="/training/ojt">
              <GraduationCap className="w-4 h-4" />
              OJT Curriculum
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="overflow-x-auto flex-nowrap w-full justify-start">
          <TabsTrigger value="okr">OKR Tracking</TabsTrigger>
          <TabsTrigger value="trainer-records">Trainer Records</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="kpi">Balanced KPI</TabsTrigger>
          <TabsTrigger value="constraints">Scheduling Constraints</TabsTrigger>
        </TabsList>

        <TabsContent value="okr" className="space-y-3 mt-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-full sm:max-w-sm">
              <Label className="mb-1.5 block">Technician</Label>
              <Select value={goalTechId} onValueChange={setGoalTechId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {(technicians ?? []).map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.legalName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="sm:mt-6" onClick={() => setShowGoalDialog(true)} disabled={!goalTechId}>
              <Plus className="w-4 h-4 mr-1" /> Set New Goal
            </Button>
          </div>

          {!goalTechId ? (
            <p className="text-sm text-muted-foreground">Select a technician to view active goals.</p>
          ) : !goals ? (
            <Skeleton className="h-24 w-full" />
          ) : goals.filter((g) => g.status === "active").length === 0 ? (
            <p className="text-sm text-muted-foreground">No active goals found for this technician.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {goals
                .filter((g) => g.status === "active")
                .map((goal) => (
                  <OKRProgressCard
                    key={goal._id}
                    goal={goal}
                    technicianName={techMap.get(goal.technicianId) ?? "Unknown"}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trainer-records" className="space-y-3 mt-3">
          <TrainerRecords orgId={orgId} />
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-3 mt-3">
          <EfficiencyBaseline orgId={orgId} />
        </TabsContent>

        <TabsContent value="growth" className="space-y-3 mt-3">
          <GrowthCurveDashboard orgId={orgId} />
        </TabsContent>

        <TabsContent value="kpi" className="space-y-3 mt-3">
          <BalancedKPIPanel orgId={orgId} />
        </TabsContent>

        <TabsContent value="constraints" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Training records used by the scheduler to validate technician–task assignments.
            </p>
            <Button
              size="sm"
              className="h-9 gap-1.5"
              disabled={!selectedConstraintTech}
              onClick={() => setShowAddConstraint(true)}
            >
              <Plus className="w-4 h-4" />
              Add Constraint Training
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1">
              {!technicians ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                (technicians).map((tech) => {
                  const s = techSummary.get(tech._id);
                  return (
                    <Card
                      key={tech._id}
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedConstraintTech === tech._id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedConstraintTech(selectedConstraintTech === tech._id ? null : tech._id)}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">{getInitials(tech.legalName)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{tech.legalName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {s && s.expired > 0 && (
                            <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-xs">{s.expired} expired</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{s?.total ?? 0}</Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            <div className="md:col-span-2">
              {!selectedConstraintTech ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                  <Wrench className="w-6 h-6" />
                  <p className="text-sm">Select a technician to view scheduling training</p>
                </div>
              ) : !techTraining ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : techTraining.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                  <Wrench className="w-6 h-6" />
                  <p className="text-sm">No scheduling constraint training records</p>
                  <Button size="sm" variant="outline" onClick={() => setShowAddConstraint(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add First
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {techTraining.map((rec) => {
                    const isExpired = rec.expiresAt && rec.expiresAt < nowMs;
                    const isExpiringSoon = rec.expiresAt && !isExpired && rec.expiresAt < nowMs + 30 * 24 * 60 * 60 * 1000;
                    return (
                      <Card
                        key={rec._id}
                        className={`border-l-4 ${
                          isExpired ? "border-l-red-500" : isExpiringSoon ? "border-l-amber-500" : "border-l-green-500"
                        }`}
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{rec.trainingType}</p>
                            <p className="text-xs text-muted-foreground">
                              Completed: {new Date(rec.completedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                              {rec.expiresAt && (
                                <> · Expires: <span className={isExpired ? "text-red-600 font-medium" : isExpiringSoon ? "text-amber-600 font-medium" : ""}>
                                  {new Date(rec.expiresAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                                </span></>
                              )}
                              {rec.certificateRef && <> · Cert: {rec.certificateRef}</>}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                            onClick={() => setRemoveTarget(rec._id)}
                          >
                            <span className="sr-only">Remove</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => { if (!v) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Training Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the scheduling constraint training record for this technician.
              The technician may no longer be eligible for tasks requiring this qualification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeTarget) {
                  handleRemoveConstraint(removeTarget);
                  setRemoveTarget(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={showAddConstraint}
        onOpenChange={(v) => {
          if (isAdding) return;
          setShowAddConstraint(v);
          if (!v) {
            setTrainingType("");
            setCustomType("");
            setCompletedAt("");
            setExpiresAt("");
            setCertRef("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Scheduling Training</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Training Type *</Label>
              <Select value={trainingType} onValueChange={setTrainingType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select training type" />
                </SelectTrigger>
                <SelectContent>
                  {TRAINING_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {trainingType === "custom" && (
              <div>
                <Label>Custom Training Type *</Label>
                <Input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="e.g. Garmin G1000" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Completed Date *</Label>
                <Input type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
              </div>
              <div>
                <Label>Expires</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Certificate Reference</Label>
              <Input value={certRef} onChange={(e) => setCertRef(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddConstraint(false)} disabled={isAdding}>Cancel</Button>
            <Button onClick={handleAddConstraint} disabled={isAdding}>
              {isAdding ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGoalDialog} onOpenChange={(v) => { if (!isCreatingGoal) setShowGoalDialog(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Set New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Technician *</Label>
              <Select value={goalTechId} onValueChange={setGoalTechId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {(technicians ?? []).map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.legalName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period *</Label>
                <Select value={goalPeriod} onValueChange={(v) => setGoalPeriod(v as "weekly" | "monthly" | "quarterly" | "yearly")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Type *</Label>
                <Select value={goalTargetType} onValueChange={(v) => setGoalTargetType(v as "stages_completed" | "tasks_completed" | "hours_trained")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stages_completed">Stages Completed</SelectItem>
                    <SelectItem value="tasks_completed">Tasks Completed</SelectItem>
                    <SelectItem value="hours_trained">Hours Trained</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Target Value *</Label>
              <Input type="number" min={1} value={goalTargetValue} onChange={(e) => setGoalTargetValue(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start *</Label>
                <Input type="date" value={goalPeriodStart} onChange={(e) => setGoalPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label>Period End *</Label>
                <Input type="date" value={goalPeriodEnd} onChange={(e) => setGoalPeriodEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalDialog(false)} disabled={isCreatingGoal}>Cancel</Button>
            <Button onClick={handleCreateGoal} disabled={isCreatingGoal}>
              {isCreatingGoal ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
