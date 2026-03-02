import { Link, useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { NotFoundCard } from "@/components/NotFoundCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Wrench,
  ClipboardList,
  AlertTriangle,
  Pencil,
  Loader2,
  Zap,
  RotateCcw,
  PlaneTakeoff,
  ChevronRight,
  Plus,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { AircraftAdComplianceTab } from "./_components/AircraftAdComplianceTab";

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusStyle(status: string): { color: string; label: string } {
  const map: Record<string, { color: string; label: string }> = {
    airworthy: {
      color: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
      label: "Airworthy",
    },
    airworthy_with_limitations: {
      color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      label: "Airworthy w/ Limitations",
    },
    grounded_airworthiness: {
      color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
      label: "Grounded — Airworthiness",
    },
    grounded_registration: {
      color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
      label: "Grounded — Registration",
    },
    in_maintenance: {
      color: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
      label: "In Maintenance",
    },
    aog: {
      color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
      label: "AOG",
    },
    deregistered: {
      color: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30",
      label: "Deregistered",
    },
  };
  return (
    map[status] ?? {
      color: "bg-muted text-muted-foreground border-border/30",
      label: status,
    }
  );
}

function getWoStatusStyle(status: string): { color: string; label: string } {
  const map: Record<string, { color: string; label: string }> = {
    draft: { color: "bg-slate-500/15 text-slate-400 border-slate-500/30", label: "Draft" },
    open: { color: "bg-sky-500/15 text-sky-400 border-sky-500/30", label: "Open" },
    in_progress: { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "In Progress" },
    pending_inspection: { color: "bg-violet-500/15 text-violet-400 border-violet-500/30", label: "Pending Inspection" },
    pending_signoff: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Pending Sign-off" },
    on_hold: { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "On Hold" },
    open_discrepancies: { color: "bg-red-500/15 text-red-400 border-red-500/30", label: "Open Discrepancies" },
    closed: { color: "bg-green-500/15 text-green-400 border-green-500/30", label: "Closed" },
  };
  return map[status] ?? { color: "bg-muted text-muted-foreground border-border/30", label: status };
}

function formatRegulation(reg: string | undefined): string {
  if (!reg) return "—";
  return reg.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-2 gap-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ACTIVE_WO_STATUSES = [
  "open",
  "in_progress",
  "pending_inspection",
  "pending_signoff",
  "on_hold",
  "open_discrepancies",
];

export default function AircraftDetailPage() {
  const { tail = "" } = useParams<{ tail: string }>();
  const tailNumber = decodeURIComponent(tail);

  const { orgId } = useCurrentOrg();

  // Update TT dialog state
  const [updateTTOpen, setUpdateTTOpen] = useState(false);
  const [newTT, setNewTT] = useState("");
  const [asOfDate, setAsOfDate] = useState("");
  const [updateTTError, setUpdateTTError] = useState<string | null>(null);
  const [updateTTSubmitting, setUpdateTTSubmitting] = useState(false);

  const updateTotalTime = useMutation(api.gapFixes.updateAircraftTotalTime);

  async function handleUpdateTT(e: React.FormEvent) {
    e.preventDefault();
    if (!aircraft?._id || !newTT || !asOfDate) return;
    setUpdateTTSubmitting(true);
    setUpdateTTError(null);
    try {
      await updateTotalTime({
        aircraftId: aircraft._id,
        totalTimeAirframeHours: parseFloat(newTT),
        asOfDate: new Date(asOfDate).getTime(),
      });
      toast.success("Total time updated successfully");
      setUpdateTTOpen(false);
      setNewTT("");
      setAsOfDate("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update total time";
      setUpdateTTError(msg);
    } finally {
      setUpdateTTSubmitting(false);
    }
  }

  // Load aircraft by tail number
  const aircraft = useQuery(
    api.aircraft.getByTailNumber,
    orgId ? { organizationId: orgId, tailNumber } : "skip",
  );

  // Load engines for this aircraft
  const engines = useQuery(
    api.aircraft.listEnginesForAircraft,
    aircraft?._id && orgId
      ? { aircraftId: aircraft._id, organizationId: orgId }
      : "skip",
  );

  // Load propellers for this aircraft
  const propellers = useQuery(
    api.aircraft.listPropellersForAircraft,
    aircraft?._id && orgId
      ? { aircraftId: aircraft._id, organizationId: orgId }
      : "skip",
  );

  // Load work orders for this aircraft
  const workOrders = useQuery(
    api.workOrders.listByAircraft,
    aircraft?._id && orgId
      ? { aircraftId: aircraft._id, organizationId: orgId }
      : "skip",
  );

  // Load customers so we can display customer name instead of raw Convex ID
  const customers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId } : "skip",
  );
  const customerMap = useMemo(() => {
    if (!customers) return new Map<string, string>();
    return new Map(customers.map((c) => [c._id, c.name]));
  }, [customers]);

  const isLoading = aircraft === undefined;

  if (!isLoading && aircraft === null) {
    return (
      <NotFoundCard
        message={`Aircraft "${tailNumber}" not found. It may have been removed from the fleet or the registration is incorrect.`}
        backHref="/fleet"
        backLabel="Back to Fleet"
      />
    );
  }

  const status = aircraft?.status ?? "";
  const style = getStatusStyle(status);

  // Work order categorization — memoized so dialog open/close state changes don't recompute
  const activeWOs = useMemo(
    () => workOrders?.filter((wo: { status: string }) => ACTIVE_WO_STATUSES.includes(wo.status)) ?? [],
    [workOrders],
  );
  const plannedWOs = useMemo(
    () => workOrders?.filter((wo: { status: string }) => wo.status === "draft") ?? [],
    [workOrders],
  );
  const allPastWOs = useMemo(
    () => workOrders?.filter((wo: { status: string }) => wo.status === "closed") ?? [],
    [workOrders],
  );
  const pastWOs = useMemo(() => allPastWOs.slice(0, 20), [allPastWOs]);
  const pastWOsTruncated = allPastWOs.length > 20;

  // Derive open WO count from already-loaded workOrders — eliminates the full-fleet api.aircraft.list subscription
  const openWoCount = useMemo(() => activeWOs.length, [activeWOs]);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="sm" className="mt-0.5">
          <Link to="/fleet">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Fleet
          </Link>
        </Button>
        <div className="flex-1">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-foreground">
                  {aircraft!.currentRegistration}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-[11px] border ${style.color}`}
                >
                  {style.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {aircraft!.yearOfManufacture} {aircraft!.make} {aircraft!.model}
                {aircraft!.series ? ` ${aircraft!.series}` : ""} &mdash; S/N{" "}
                {aircraft!.serialNumber}
              </p>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <DetailSkeleton />
      ) : (
        <Tabs defaultValue="aircraft-info" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="aircraft-info">
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
              Aircraft Info
            </TabsTrigger>
            <TabsTrigger value="times-cycles">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Times & Cycles
            </TabsTrigger>
            <TabsTrigger value="work-orders">
              <Wrench className="w-3.5 h-3.5 mr-1.5" />
              Work Orders
              {openWoCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {openWoCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ad-compliance">
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
              AD Compliance
            </TabsTrigger>
            <TabsTrigger value="logbook">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Logbook
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB: Aircraft Info                                            */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="aircraft-info" className="space-y-4">
            {/* Identification Card */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Identification</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  <FieldRow label="Registration" value={aircraft!.currentRegistration ?? "—"} mono />
                  <FieldRow label="Serial Number" value={aircraft!.serialNumber} mono />
                  <Separator className="col-span-full opacity-40" />
                  <FieldRow
                    label="Make / Model / Series"
                    value={`${aircraft!.make} ${aircraft!.model}${aircraft!.series ? ` ${aircraft!.series}` : ""}`}
                  />
                  <FieldRow label="Year of Manufacture" value={aircraft!.yearOfManufacture?.toString() ?? "—"} />
                  <Separator className="col-span-full opacity-40" />
                  <FieldRow label="Type Certificate Number" value={aircraft!.typeCertificateNumber ?? "—"} />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                      Aircraft Category
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-foreground capitalize">{aircraft!.aircraftCategory}</p>
                      {aircraft!.experimental && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">
                          Experimental
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Separator className="col-span-full opacity-40" />
                  <FieldRow
                    label="Operating Regulation"
                    value={formatRegulation(aircraft!.operatingRegulation)}
                  />
                  <FieldRow
                    label="Max Gross Weight"
                    value={aircraft!.maxGrossWeightLbs ? `${aircraft!.maxGrossWeightLbs.toLocaleString()} lbs` : "—"}
                  />
                  <FieldRow label="Base Location" value={aircraft!.baseLocation ?? "—"} mono />
                  <div />
                  <Separator className="col-span-full opacity-40" />
                  <FieldRow label="Owner Name" value={aircraft!.ownerName ?? "—"} />
                  <FieldRow label="Owner Address" value={aircraft!.ownerAddress ?? "—"} />
                </div>
              </CardContent>
            </Card>

            {/* Customer Card */}
            {aircraft!.customerId && (
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Customer</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {customers === undefined ? (
                    <Skeleton className="h-5 w-40 mb-3" />
                  ) : (
                    <p className="text-sm font-medium text-foreground mb-3">
                      {customerMap.get(aircraft!.customerId) ?? (
                        <span className="font-mono text-muted-foreground text-xs">{aircraft!.customerId}</span>
                      )}
                    </p>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/billing/customers/${aircraft!.customerId}`}>
                      View Customer <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Engines Table */}
            <Card className="border-border/60">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  Engines ({engines?.length ?? 0})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info("Engine management coming soon. Contact support to add or update engine records.")}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Engine
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {engines === undefined ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : engines.length === 0 ? (
                  <EmptyState icon={Zap} message="No engines registered" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40 text-[11px] text-muted-foreground uppercase tracking-wide">
                          <th className="text-left py-2 pr-4 font-medium">Engine</th>
                          <th className="text-left py-2 pr-4 font-medium">Make/Model</th>
                          <th className="text-left py-2 pr-4 font-medium">Serial Number</th>
                          <th className="text-right py-2 pr-4 font-medium">Total Hours</th>
                          <th className="text-right py-2 pr-4 font-medium">Cycles</th>
                          <th className="text-right py-2 font-medium">TSO Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {engines.map((eng: EngineRow, idx: number) => (
                          <tr key={eng._id} className="border-b border-border/20 last:border-0">
                            <td className="py-2 pr-4 font-medium">{eng.position ?? `#${idx + 1}`}</td>
                            <td className="py-2 pr-4">{eng.make} {eng.model}</td>
                            <td className="py-2 pr-4 font-mono text-xs">{eng.serialNumber}</td>
                            <td className="py-2 pr-4 text-right font-mono">{eng.totalTimeHours.toFixed(1)}</td>
                            <td className="py-2 pr-4 text-right font-mono">{eng.totalCycles ?? "—"}</td>
                            <td className="py-2 text-right font-mono">{eng.timeSinceOverhaulHours?.toFixed(1) ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Propellers Table */}
            {(aircraft!.engineCount > 0) && (
              <Card className="border-border/60">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    Propellers
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Propeller management coming soon. Contact support to add or update propeller records.")}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Propeller
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  {propellers === undefined ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : propellers.length === 0 ? (
                    <EmptyState icon={RotateCcw} message="No propellers registered" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40 text-[11px] text-muted-foreground uppercase tracking-wide">
                            <th className="text-left py-2 pr-4 font-medium">Position</th>
                            <th className="text-left py-2 pr-4 font-medium">Make/Model</th>
                            <th className="text-left py-2 pr-4 font-medium">Serial Number</th>
                            <th className="text-right py-2 pr-4 font-medium">Total Hours</th>
                            <th className="text-right py-2 font-medium">TSOH</th>
                          </tr>
                        </thead>
                        <tbody>
                          {propellers.map((prop: PropellerRow) => (
                            <tr key={prop._id} className="border-b border-border/20 last:border-0">
                              <td className="py-2 pr-4 font-medium capitalize">{prop.position}</td>
                              <td className="py-2 pr-4">{prop.make} {prop.model}</td>
                              <td className="py-2 pr-4 font-mono text-xs">{prop.serialNumber}</td>
                              <td className="py-2 pr-4 text-right font-mono">{prop.totalTimeHours?.toFixed(1) ?? "—"}</td>
                              <td className="py-2 text-right font-mono">{prop.timeSinceOverhaulHours?.toFixed(1) ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB: Times & Cycles                                           */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="times-cycles" className="space-y-4">
            {/* Airframe Times */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Airframe Times
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Airframe Time (TTAF)</p>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {aircraft!.totalTimeAirframeHours.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">hrs</span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUpdateTTOpen(true)}
                  >
                    <Pencil className="w-3 h-3 mr-1.5" />
                    Update TT
                  </Button>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">As of Date</p>
                  <p className="text-sm text-foreground">
                    {new Date(aircraft!.totalTimeAirframeAsOfDate).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground/60">
                  Category: <span className="capitalize">{aircraft!.aircraftCategory}</span>
                  {aircraft!.experimental ? " (Experimental)" : " (Certificated)"}
                </p>
              </CardContent>
            </Card>

            {/* Landing Cycles */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PlaneTakeoff className="w-4 h-4 text-muted-foreground" />
                  Landing Cycles
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {aircraft!.totalLandingCycles != null ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {aircraft!.totalLandingCycles.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">cycles</span>
                    </p>
                    {aircraft!.totalLandingCyclesAsOfDate && (
                      <p className="text-xs text-muted-foreground">
                        As of {new Date(aircraft!.totalLandingCyclesAsOfDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-muted-foreground/40">&mdash;</p>
                    <p className="text-xs text-muted-foreground">Not tracked</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hobbs Meter */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  Hobbs Meter
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {aircraft!.hobbsReading != null ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {aircraft!.hobbsReading.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">hrs</span>
                    </p>
                    {aircraft!.hobbsAsOfDate && (
                      <p className="text-xs text-muted-foreground">
                        As of {new Date(aircraft!.hobbsAsOfDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-muted-foreground/40">&mdash;</p>
                    <p className="text-xs text-muted-foreground">Not tracked</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Engine Times Table */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  Engine Times
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {engines === undefined ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : engines.length === 0 ? (
                  <EmptyState icon={Zap} message="No engines registered" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40 text-[11px] text-muted-foreground uppercase tracking-wide">
                          <th className="text-left py-2 pr-4 font-medium">Engine</th>
                          <th className="text-left py-2 pr-4 font-medium">Make/Model</th>
                          <th className="text-left py-2 pr-4 font-medium">S/N</th>
                          <th className="text-right py-2 pr-4 font-medium">Total Hours</th>
                          <th className="text-right py-2 pr-4 font-medium">Cycles</th>
                          <th className="text-right py-2 pr-4 font-medium">HSO</th>
                          <th className="text-right py-2 pr-4 font-medium">CSO</th>
                          <th className="text-right py-2 font-medium">TBO Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {engines.map((eng: EngineRow, idx: number) => {
                          const tboHrs = eng.timeBetweenOverhaulLimit;
                          const tso = eng.timeSinceOverhaulHours;
                          let tboStatus: string | null = null;
                          let tboOverdue = false;
                          if (tboHrs != null && tso != null) {
                            const remaining = tboHrs - tso;
                            if (remaining <= 0) {
                              tboStatus = "OVERDUE";
                              tboOverdue = true;
                            } else {
                              tboStatus = `${remaining.toFixed(0)} hrs until TBO`;
                            }
                          }
                          return (
                            <tr key={eng._id} className="border-b border-border/20 last:border-0">
                              <td className="py-2 pr-4 font-medium">{eng.position ?? `#${idx + 1}`}</td>
                              <td className="py-2 pr-4">{eng.make} {eng.model}</td>
                              <td className="py-2 pr-4 font-mono text-xs">{eng.serialNumber}</td>
                              <td className="py-2 pr-4 text-right font-mono">{eng.totalTimeHours.toFixed(1)}</td>
                              <td className="py-2 pr-4 text-right font-mono">{eng.totalCycles ?? "—"}</td>
                              <td className="py-2 pr-4 text-right font-mono">{tso?.toFixed(1) ?? "—"}</td>
                              <td className="py-2 pr-4 text-right font-mono">{eng.cyclesSinceOverhaul ?? "—"}</td>
                              <td className={`py-2 text-right text-xs font-medium ${tboOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                                {tboStatus ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB: Work Orders                                              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="work-orders" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Work Orders</h2>
              <Button asChild variant="outline" size="sm">
                <Link to={`/work-orders/new?aircraft=${encodeURIComponent(tailNumber)}`}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Work Order
                </Link>
              </Button>
            </div>

            {workOrders === undefined ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                {/* Active */}
                <WoSection title="Active" count={activeWOs.length} wos={activeWOs} />
                {/* Planned */}
                <WoSection title="Planned" count={plannedWOs.length} wos={plannedWOs} />
                {/* Past */}
                <WoSection
                  title="Past"
                  count={allPastWOs.length}
                  wos={pastWOs}
                  emptyMessage="No closed work orders"
                  truncated={pastWOsTruncated}
                />
              </>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB: AD Compliance (Phase F)                                  */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="ad-compliance" className="space-y-4">
            {aircraft?._id && orgId ? (
              <AircraftAdComplianceTab
                aircraftId={aircraft._id}
                organizationId={orgId}
                tailNumber={tailNumber}
                totalTimeHours={aircraft.totalTimeAirframeHours}
              />
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB: Logbook                                                  */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="logbook" className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  Maintenance Logbook
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The maintenance logbook contains all 14 CFR 43.9 maintenance entries,
                  14 CFR 43.11 inspection entries, and correction records for{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {aircraft!.currentRegistration}
                  </span>
                  . Each entry includes work performed, approved data reference,
                  certifying technician, and return-to-service statements.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild size="sm" className="gap-1.5">
                    <Link to={`/fleet/${encodeURIComponent(tailNumber)}/logbook`}>
                      <BookOpen className="w-4 h-4" />
                      Open Full Logbook
                      <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
                    </Link>
                  </Button>
                </div>
                <div className="rounded-md border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">What&rsquo;s in the logbook?</p>
                  <ul className="space-y-0.5 ml-3 list-disc list-inside">
                    <li>Maintenance records (14 CFR 43.9) — all signed work entries</li>
                    <li>Inspection records (14 CFR 43.11) — annual, 100-hour, and progressive inspections</li>
                    <li>Correction entries — amendments to prior logbook entries per AC 43-9C</li>
                    <li>Parts replaced/installed per entry with part numbers and actions</li>
                    <li>Certifying technician name, cert number, and cert type per entry</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Update Total Time Dialog (GAP-01) ── */}
      <Dialog
        open={updateTTOpen}
        onOpenChange={(open) => {
          setUpdateTTOpen(open);
          if (!open) {
            setNewTT("");
            setAsOfDate("");
            setUpdateTTError(null);
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Total Time</DialogTitle>
            <DialogDescription>
              Enter the new total airframe time. Per INV-18, total time may only
              increase.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTT} className="space-y-4">
            <div>
              <Label
                htmlFor="new-tt"
                className="text-xs font-medium mb-1.5 block"
              >
                New Total Time (hours){" "}
                <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <Input
                id="new-tt"
                type="number"
                step="0.1"
                min="0"
                value={newTT}
                onChange={(e) => setNewTT(e.target.value)}
                placeholder={`Current: ${aircraft?.totalTimeAirframeHours.toFixed(1)}`}
                className="h-9 text-sm bg-muted/30 border-border/60 font-mono"
                required
              />
            </div>
            <div>
              <Label
                htmlFor="as-of-date"
                className="text-xs font-medium mb-1.5 block"
              >
                As of Date <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <Input
                id="as-of-date"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="h-9 text-sm bg-muted/30 border-border/60"
                required
              />
            </div>

            {updateTTError && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/5">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{updateTTError}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setUpdateTTOpen(false)}
                disabled={updateTTSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateTTSubmitting || !newTT || !asOfDate}
                className="gap-2"
              >
                {updateTTSubmitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
        {label}
      </p>
      <p
        className={`text-sm text-foreground mt-0.5 ${mono ? "font-mono font-semibold" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="py-6 text-center">
      <Icon className="w-5 h-5 text-muted-foreground/30 mx-auto mb-1.5" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Work Order section ───────────────────────────────────────────────────────

interface WoRow {
  _id: string;
  workOrderNumber: string;
  description?: string;
  title?: string;
  status: string;
  createdAt: number;
  openedAt?: number;
}

function WoSection({
  title,
  count,
  wos,
  emptyMessage,
  truncated,
}: {
  title: string;
  count: number;
  wos: WoRow[];
  emptyMessage?: string;
  truncated?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {count}
        </Badge>
      </div>
      {wos.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              {emptyMessage ?? `No ${title.toLowerCase()} work orders`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {wos.map((wo) => {
            const woStyle = getWoStatusStyle(wo.status);
            return (
              <Link key={wo._id} to={`/work-orders/${wo._id}`} className="block">
                <Card className="border-border/60 hover:border-border transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {wo.workOrderNumber}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] border ${woStyle.color}`}
                        >
                          {woStyle.label}
                        </Badge>
                      </div>
                      {(wo.title || wo.description) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {wo.title ?? wo.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(wo.openedAt ?? wo.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {truncated && (
            <p className="text-xs text-muted-foreground text-center py-2 border border-border/40 rounded-md bg-muted/20">
              Showing most recent 20 of {count} closed work orders
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Type helpers for query results (codegen pending) ─────────────────────────

interface EngineRow {
  _id: string;
  make: string;
  model: string;
  serialNumber: string;
  position?: string;
  totalTimeHours: number;
  totalCycles?: number;
  timeSinceOverhaulHours?: number;
  cyclesSinceOverhaul?: number;
  timeBetweenOverhaulLimit?: number;
}

interface PropellerRow {
  _id: string;
  position: string;
  make: string;
  model: string;
  serialNumber: string;
  totalTimeHours?: number;
  timeSinceOverhaulHours?: number;
}
