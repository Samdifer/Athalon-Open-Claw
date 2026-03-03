import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  GraduationCap,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const COURSE_TYPES = [
  { value: "initial", label: "Initial" },
  { value: "recurrent", label: "Recurrent" },
  { value: "oem", label: "OEM" },
  { value: "regulatory", label: "Regulatory" },
  { value: "safety", label: "Safety" },
  { value: "hazmat", label: "HazMat" },
  { value: "custom", label: "Custom" },
] as const;

type CourseType = (typeof COURSE_TYPES)[number]["value"];

function statusBadge(status: string) {
  switch (status) {
    case "current":
      return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Current</Badge>;
    case "expiring_soon":
      return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Expiring Soon</Badge>;
    case "expired":
      return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const { orgId } = useCurrentOrg();
  const [search, setSearch] = useState("");
  const [selectedTechId, setSelectedTechId] = useState<Id<"technicians"> | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showReqDialog, setShowReqDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("records");
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isCreatingReq, setIsCreatingReq] = useState(false);

  // Queries
  const technicians = useQuery(
    api.technicians.list,
    orgId ? { organizationId: orgId } : "skip"
  );
  const allTraining = useQuery(
    api.training.listOrgTraining,
    orgId ? { orgId } : "skip"
  );
  const expiringTraining = useQuery(
    api.training.listExpiringTraining,
    orgId ? { orgId, withinDays: 30 } : "skip"
  );
  const selectedTechTraining = useQuery(
    api.training.listTrainingRecords,
    selectedTechId ? { technicianId: selectedTechId } : "skip"
  );
  const qualReqs = useQuery(
    api.training.listQualificationRequirements,
    orgId ? { orgId } : "skip"
  );

  // Mutations
  const addRecord = useMutation(api.training.addTrainingRecord);
  const createReq = useMutation(api.training.createQualificationRequirement);

  // ─── Add Training Dialog State ───────────────────────────────────────────
  const [formTechId, setFormTechId] = useState<string>("");
  const [formCourseName, setFormCourseName] = useState("");
  const [formCourseType, setFormCourseType] = useState<CourseType>("initial");
  const [formProvider, setFormProvider] = useState("");
  const [formCompletedAt, setFormCompletedAt] = useState("");
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [formCertNumber, setFormCertNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // ─── Req Dialog State ────────────────────────────────────────────────────
  const [reqName, setReqName] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqCourses, setReqCourses] = useState("");
  const [reqRecurrency, setReqRecurrency] = useState("");
  const [reqRoles, setReqRoles] = useState("");

  // Technician name lookup map
  const techMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of (technicians ?? [])) {
      m.set(t._id, t.legalName);
    }
    return m;
  }, [technicians]);

  // Compliance map: tech -> { current, expiringSoon, expired }
  const complianceMap = useMemo(() => {
    if (!allTraining || !technicians) return new Map<string, { current: number; expiringSoon: number; expired: number }>();
    const map = new Map<string, { current: number; expiringSoon: number; expired: number }>();
    for (const tech of technicians) {
      map.set(tech._id, { current: 0, expiringSoon: 0, expired: 0 });
    }
    for (const rec of allTraining) {
      const entry = map.get(rec.technicianId);
      if (entry) {
        if (rec.status === "current") entry.current++;
        else if (rec.status === "expiring_soon") entry.expiringSoon++;
        else if (rec.status === "expired") entry.expired++;
      }
    }
    return map;
  }, [allTraining, technicians]);

  const filteredTechs = useMemo(() => {
    if (!technicians) return [];
    if (!search) return technicians;
    const q = search.toLowerCase();
    return technicians.filter(
      (t) =>
        t.legalName.toLowerCase().includes(q) ||
        (t.role ?? "").toLowerCase().includes(q)
    );
  }, [technicians, search]);

  const expiredRecords = useMemo(
    () => (allTraining ?? []).filter((r) => r.status === "expired"),
    [allTraining]
  );

  const currentCount = useMemo(
    () => (allTraining ?? []).filter((r) => r.status === "current").length,
    [allTraining]
  );

  const expiringSoonCount = useMemo(
    () => (expiringTraining ?? []).filter((r) => r.status === "expiring_soon").length,
    [expiringTraining]
  );

  async function handleAddRecord() {
    if (!orgId || !formTechId || !formCourseName || !formCompletedAt) {
      toast.error("Please fill required fields");
      return;
    }
    // BUG-DOM-065: no validation that expiry date is after completion date.
    // Technicians could accidentally log expiry before completion and create
    // records that immediately show as expired or have invalid timelines.
    if (formExpiresAt && formExpiresAt <= formCompletedAt) {
      toast.error("Expiry date must be after the completion date");
      return;
    }
    setIsAddingRecord(true);
    try {
      await addRecord({
        organizationId: orgId,
        technicianId: formTechId as Id<"technicians">,
        courseName: formCourseName,
        courseType: formCourseType,
        provider: formProvider || undefined,
        completedAt: new Date(formCompletedAt).getTime(),
        expiresAt: formExpiresAt ? new Date(formExpiresAt).getTime() : undefined,
        certificateNumber: formCertNumber || undefined,
        notes: formNotes || undefined,
      });
      toast.success("Training record added");
      setShowAddDialog(false);
      resetAddForm();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add record");
    } finally {
      setIsAddingRecord(false);
    }
  }

  function resetAddForm() {
    setFormTechId("");
    setFormCourseName("");
    setFormCourseType("initial");
    setFormProvider("");
    setFormCompletedAt("");
    setFormExpiresAt("");
    setFormCertNumber("");
    setFormNotes("");
  }

  async function handleCreateReq() {
    if (!orgId || !reqName || !reqCourses) {
      toast.error("Name and courses are required");
      return;
    }
    setIsCreatingReq(true);
    try {
      await createReq({
        organizationId: orgId,
        name: reqName,
        description: reqDesc || undefined,
        requiredCourses: reqCourses.split(",").map((s) => s.trim()).filter(Boolean),
        recurrencyMonths: reqRecurrency ? parseInt(reqRecurrency) : undefined,
        applicableRoles: reqRoles ? reqRoles.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      toast.success("Requirement created");
      setShowReqDialog(false);
      setReqName("");
      setReqDesc("");
      setReqCourses("");
      setReqRecurrency("");
      setReqRoles("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create requirement");
    } finally {
      setIsCreatingReq(false);
    }
  }

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <GraduationCap className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No organization context available</p>
        <p className="text-xs text-muted-foreground/60">Ask your administrator to link your account to a technician record.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <GraduationCap className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
              Training &amp; Qualifications
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage technician training records and compliance requirements
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setShowReqDialog(true)}>
            <ShieldCheck className="w-4 h-4" />
            Add Requirement
          </Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" />
            Add Training
          </Button>
        </div>
      </div>

      {/* Stats Cards — show skeletons while either allTraining or expiringTraining is still loading
          to prevent the DOM from seeing "0 Expiring / 0 Expired" and assuming compliance is clean
          before data has arrived. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/10 p-2 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Current</p>
                {allTraining === undefined ? (
                  <Skeleton className="h-8 w-10 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{currentCount}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500/10 p-2 flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Expiring Soon</p>
                {expiringTraining === undefined ? (
                  <Skeleton className="h-8 w-10 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{expiringSoonCount}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/10 p-2 flex-shrink-0">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Expired</p>
                {allTraining === undefined ? (
                  <Skeleton className="h-8 w-10 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{expiredRecords.length}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records">Training Records</TabsTrigger>
          <TabsTrigger value="requirements">Qualification Requirements</TabsTrigger>
          <TabsTrigger value="constraints">Scheduling Constraints</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-3 mt-3">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search technicians..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Technician list with compliance status */}
          {!technicians ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTechs.map((tech) => {
                const c = complianceMap.get(tech._id);
                const totalRecords = c ? c.current + c.expiringSoon + c.expired : 0;
                const color =
                  c && c.expired > 0
                    ? "border-red-500/40"
                    : c && c.expiringSoon > 0
                    ? "border-amber-500/40"
                    : totalRecords === 0
                    ? "border-slate-500/40"
                    : "border-green-500/40";
                return (
                  <Card
                    key={tech._id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedTechId === tech._id ? "ring-2 ring-primary" : ""
                    } border-l-4 ${color}`}
                    onClick={() =>
                      setSelectedTechId(
                        selectedTechId === tech._id ? null : tech._id
                      )
                    }
                  >
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">
                            {getInitials(tech.legalName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{tech.legalName}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {tech.role ?? "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c && c.expired > 0 && (
                          <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-xs">
                            {c.expired} expired
                          </Badge>
                        )}
                        {c && c.expiringSoon > 0 && (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs">
                            {c.expiringSoon} expiring
                          </Badge>
                        )}
                        {c && c.expired === 0 && c.expiringSoon === 0 && totalRecords > 0 && (
                          <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">
                            Compliant
                          </Badge>
                        )}
                        {totalRecords === 0 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            No Records
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Selected Tech Training Detail */}
          {selectedTechId && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">
                  Training Records —{" "}
                  {technicians?.find((t) => t._id === selectedTechId)?.legalName ?? ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedTechTraining ? (
                  <Skeleton className="h-20 w-full" />
                ) : selectedTechTraining.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No training records found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4">Course</th>
                          <th className="pb-2 pr-4">Type</th>
                          <th className="pb-2 pr-4">Provider</th>
                          <th className="pb-2 pr-4">Completed</th>
                          <th className="pb-2 pr-4">Expires</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTechTraining.map((rec) => (
                          <tr key={rec._id} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{rec.courseName}</td>
                            <td className="py-2 pr-4 capitalize">{rec.courseType}</td>
                            <td className="py-2 pr-4">{rec.provider ?? "—"}</td>
                            <td className="py-2 pr-4">
                              {new Date(rec.completedAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 pr-4">
                              {rec.expiresAt
                                ? new Date(rec.expiresAt).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="py-2">{statusBadge(rec.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Expiring Soon Section */}
          {expiringTraining && expiringTraining.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Expiring Within 30 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expiringTraining
                    .filter((r) => r.status === "expiring_soon")
                    .map((rec) => (
                      <div
                        key={rec._id}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <div>
                          <span className="font-medium">{rec.courseName}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            — {techMap.get(rec.technicianId) ?? "Unknown"}
                          </span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          Expires{" "}
                          {rec.expiresAt
                            ? new Date(rec.expiresAt).toLocaleDateString()
                            : ""}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expired Section */}
          {expiredRecords.length > 0 && (
            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  Expired Training
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expiredRecords.map((rec) => (
                    <div
                      key={rec._id}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <div>
                        <span className="font-medium">{rec.courseName}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          — {techMap.get(rec.technicianId) ?? "Unknown"}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        Expired{" "}
                        {rec.expiresAt
                          ? new Date(rec.expiresAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requirements" className="space-y-3 mt-3">
          {!qualReqs ? (
            <Skeleton className="h-32 w-full" />
          ) : qualReqs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No qualification requirements defined yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {qualReqs.map((req) => (
                <Card key={req._id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{req.name}</p>
                        {req.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {req.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {req.requiredCourses.map((c) => (
                            <Badge key={c} variant="outline" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {req.recurrencyMonths && (
                          <p>Every {req.recurrencyMonths} months</p>
                        )}
                        {req.applicableRoles.length > 0 && (
                          <p className="capitalize">
                            {req.applicableRoles.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Scheduling Constraints Tab ─────────────────────────────────── */}
        <TabsContent value="constraints" className="space-y-3 mt-3">
          <SchedulingConstraintsTab orgId={orgId} technicians={technicians ?? []} techMap={techMap} />
        </TabsContent>
      </Tabs>

      {/* Add Training Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(v) => { if (!isAddingRecord) { setShowAddDialog(v); if (!v) resetAddForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Training Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Technician *</Label>
              <Select value={formTechId} onValueChange={setFormTechId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {(technicians ?? []).map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.legalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Course Name *</Label>
              <Input
                value={formCourseName}
                onChange={(e) => setFormCourseName(e.target.value)}
                placeholder="e.g. Hazardous Materials Handling"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Course Type</Label>
                <Select value={formCourseType} onValueChange={(v) => setFormCourseType(v as CourseType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Provider</Label>
                <Input
                  value={formProvider}
                  onChange={(e) => setFormProvider(e.target.value)}
                  placeholder="e.g. FlightSafety"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Completed Date *</Label>
                <Input
                  type="date"
                  value={formCompletedAt}
                  onChange={(e) => setFormCompletedAt(e.target.value)}
                />
              </div>
              <div>
                <Label>Expires</Label>
                <Input
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Certificate Number</Label>
              <Input
                value={formCertNumber}
                onChange={(e) => setFormCertNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetAddForm(); }} disabled={isAddingRecord}>
              Cancel
            </Button>
            <Button onClick={handleAddRecord} disabled={isAddingRecord}>
              {isAddingRecord ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding…
                </>
              ) : (
                "Add Record"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Requirement Dialog */}
      <Dialog open={showReqDialog} onOpenChange={(v) => {
          if (!isCreatingReq) {
            setShowReqDialog(v);
            // BUG-DOM-063: Requirement dialog didn't reset fields when closed via
            // X button or backdrop click — only the explicit Cancel button handled
            // cleanup. Re-opening would show stale data from the previous attempt.
            if (!v) {
              setReqName("");
              setReqDesc("");
              setReqCourses("");
              setReqRecurrency("");
              setReqRoles("");
            }
          }
        }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Qualification Requirement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={reqName}
                onChange={(e) => setReqName(e.target.value)}
                placeholder="e.g. HazMat Certification"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={reqDesc}
                onChange={(e) => setReqDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Required Courses * (comma-separated)</Label>
              <Input
                value={reqCourses}
                onChange={(e) => setReqCourses(e.target.value)}
                placeholder="HazMat Handling, HazMat Transport"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Recurrency (months)</Label>
                <Input
                  type="number"
                  value={reqRecurrency}
                  onChange={(e) => setReqRecurrency(e.target.value)}
                />
              </div>
              <div>
                <Label>Applicable Roles (comma-separated)</Label>
                <Input
                  value={reqRoles}
                  onChange={(e) => setReqRoles(e.target.value)}
                  placeholder="amt, inspector"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReqDialog(false); setReqName(""); setReqDesc(""); setReqCourses(""); setReqRecurrency(""); setReqRoles(""); }} disabled={isCreatingReq}>
              Cancel
            </Button>
            <Button onClick={handleCreateReq} disabled={isCreatingReq}>
              {isCreatingReq ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Scheduling Constraints Tab ─────────────────────────────────────────────

const TRAINING_PRESETS = [
  { value: "91.411", label: "FAR 91.411 (Altimeter/Pitot-Static)" },
  { value: "91.413", label: "FAR 91.413 (Transponder)" },
  { value: "borescope", label: "Borescope Inspection" },
  { value: "ndt", label: "Non-Destructive Testing (NDT)" },
];

function SchedulingConstraintsTab({
  orgId,
  technicians,
  techMap,
}: {
  orgId: Id<"organizations">;
  technicians: Array<{ _id: Id<"technicians">; legalName: string }>;
  techMap: Map<string, string>;
}) {
  const [selectedTech, setSelectedTech] = useState<Id<"technicians"> | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [trainingType, setTrainingType] = useState("");
  const [customType, setCustomType] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [certRef, setCertRef] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  // BUG-DOM-056: native confirm() blocks the main thread, looks wrong on mobile,
  // and doesn't integrate with the app's design system. Replace with AlertDialog.
  const [removeTarget, setRemoveTarget] = useState<Id<"technicianTraining"> | null>(null);

  const orgTraining = useQuery(
    api.technicianTraining.listByOrg,
    orgId ? { organizationId: orgId } : "skip",
  );
  const techTraining = useQuery(
    api.technicianTraining.listByTechnician,
    selectedTech ? { technicianId: selectedTech } : "skip",
  );

  const addTraining = useMutation(api.technicianTraining.addTraining);
  const removeTraining = useMutation(api.technicianTraining.removeTraining);

  const nowMs = Date.now();

  // Per-tech training count summary
  const techSummary = useMemo(() => {
    const map = new Map<string, { total: number; expired: number }>();
    for (const t of technicians) map.set(t._id, { total: 0, expired: 0 });
    for (const rec of orgTraining ?? []) {
      const entry = map.get(rec.technicianId);
      if (entry) {
        entry.total++;
        if (rec.expiresAt && rec.expiresAt < nowMs) entry.expired++;
      }
    }
    return map;
  }, [orgTraining, technicians, nowMs]);

  async function handleAdd() {
    if (!selectedTech || !completedAt) {
      toast.error("Select a technician and completion date");
      return;
    }
    const type = trainingType === "custom" ? customType : trainingType;
    if (!type) {
      toast.error("Select or enter a training type");
      return;
    }
    // BUG-DOM-100: Scheduling Constraints handleAdd() was missing expiry-after-completion
    // validation. The main Training Records form had this guard (BUG-DOM-065) but the
    // Scheduling Constraints tab didn't. A DOM or training coordinator could accidentally
    // log an expiry date before the completion date — the record would immediately show
    // as "expired" in the red-border lane and block valid technician task assignments.
    if (expiresAt && expiresAt <= completedAt) {
      toast.error("Expiry date must be after the completion date");
      return;
    }
    setIsAdding(true);
    try {
      await addTraining({
        technicianId: selectedTech,
        organizationId: orgId,
        trainingType: type,
        completedAt: new Date(completedAt).getTime(),
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
        certificateRef: certRef || undefined,
      });
      toast.success("Scheduling training added");
      setShowAdd(false);
      setTrainingType("");
      setCustomType("");
      setCompletedAt("");
      setExpiresAt("");
      setCertRef("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add training");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(id: Id<"technicianTraining">) {
    try {
      await removeTraining({ trainingId: id });
      toast.success("Training removed");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Training records used by the scheduler to validate technician–task assignments.
        </p>
        <Button
          size="sm"
          className="h-9 gap-1.5"
          disabled={!selectedTech}
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-4 h-4" />
          Add Constraint Training
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tech list */}
        <div className="space-y-2 md:col-span-1">
          {technicians.map((tech) => {
            const s = techSummary.get(tech._id);
            return (
              <Card
                key={tech._id}
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedTech === tech._id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedTech(selectedTech === tech._id ? null : tech._id)}
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
          })}
        </div>

        {/* Training records for selected tech */}
        <div className="md:col-span-2">
          {!selectedTech ? (
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
              <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
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
                          Completed: {new Date(rec.completedAt).toLocaleDateString()}
                          {rec.expiresAt && (
                            <> · Expires: <span className={isExpired ? "text-red-600 font-medium" : isExpiringSoon ? "text-amber-600 font-medium" : ""}>
                              {new Date(rec.expiresAt).toLocaleDateString()}
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
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* BUG-DOM-056: Remove confirmation AlertDialog — replaces native confirm() */}
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
                  handleRemove(removeTarget);
                  setRemoveTarget(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Constraint Training Dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => { if (!isAdding) setShowAdd(v); }}>
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
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={isAdding}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isAdding}>
              {isAdding ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
