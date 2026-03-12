import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
  ShieldCheck,
  ChevronRight,
  Loader2,
  Users,
  BarChart3,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrainerSignOffQueue } from "./_components/TrainerSignOffQueue";
import { ComplianceRecords } from "./_components/ComplianceRecords";
import { RunTaxiQualifications } from "./_components/RunTaxiQualifications";

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
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link to="/personnel/training/analytics">
              <BarChart3 className="w-4 h-4" />
              Training Analytics
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link to="/training/ojt">
              <GraduationCap className="w-4 h-4" />
              OJT Curriculum
            </Link>
          </Button>
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
        <TabsList className="overflow-x-auto flex-nowrap w-full justify-start">
          <TabsTrigger value="records">Training Records</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="requirements">Qualification Requirements</TabsTrigger>
          <TabsTrigger value="signoff">Sign-Off Queue</TabsTrigger>
          <TabsTrigger value="runTaxi">Run/Taxi Quals</TabsTrigger>
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
          ) : filteredTechs.length === 0 ? (
            // BUG-DOM-130: When technicians loaded but none exist (new org) or
            // search matches nothing, the page rendered an empty div with zero
            // guidance. A DOM opening Training for the first time sees a blank
            // area and doesn't know whether the system is broken or they need to
            // add personnel first. Show an actionable empty state.
            <Card className="border-border/60">
              <CardContent className="py-12 text-center">
                <Users className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  {search ? "No technicians match your search" : "No technicians registered"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {search
                    ? "Try adjusting your search term."
                    : "Add technician profiles in Personnel before managing training records."}
                </p>
                {!search && (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to="/personnel">Go to Personnel</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
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
                              {new Date(rec.completedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                            </td>
                            <td className="py-2 pr-4">
                              {rec.expiresAt
                                ? new Date(rec.expiresAt).toLocaleDateString("en-US", { timeZone: "UTC" })
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
                            ? new Date(rec.expiresAt).toLocaleDateString("en-US", { timeZone: "UTC" })
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
                          ? new Date(rec.expiresAt).toLocaleDateString("en-US", { timeZone: "UTC" })
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-3 mt-3">
          {!allTraining || !technicians ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ComplianceRecords records={allTraining} technicians={technicians} />
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

        <TabsContent value="signoff" className="space-y-3 mt-3">
          <TrainerSignOffQueue orgId={orgId} />
        </TabsContent>

        <TabsContent value="runTaxi" className="space-y-3 mt-3">
          <RunTaxiQualifications orgId={orgId} />
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

