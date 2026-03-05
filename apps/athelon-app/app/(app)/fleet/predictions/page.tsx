import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Sparkles,
  XCircle,
  Calendar,
  Plane,
} from "lucide-react";
import { PredictionToOpportunityBanner } from "@/app/(app)/crm/_components/PredictionToOpportunityBanner";
import type { Id } from "@/convex/_generated/dataModel";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";
import { MissingPrereqBanner } from "@/components/zero-state/MissingPrereqBanner";
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

type Severity = "critical" | "high" | "medium" | "low";

const SEVERITY_CONFIG: Record<
  Severity,
  { color: string; bg: string; border: string; icon: typeof AlertTriangle }
> = {
  critical: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: AlertTriangle,
  },
  high: {
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: AlertTriangle,
  },
  medium: {
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    icon: Clock,
  },
  low: {
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: CheckCircle,
  },
};

// BUG-DOM-106: formatDate was missing timeZone:"UTC". Prediction dates are stored
// as UTC-midnight timestamps. Without pinning UTC, a shop in UTC-5 would see
// "Dec 31" instead of "Jan 1" for a Jan 1 prediction — the DOM would plan for the
// wrong day. Every other date formatter in the app (fleet detail, WO history) already
// pins UTC; this was the only holdout.
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function PredictionsPage() {
  const { orgId, techId, isLoaded } = useCurrentOrg();
  const [severityTab, setSeverityTab] = useState("all");
  const [aircraftFilter, setAircraftFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [dismissTarget, setDismissTarget] = useState<{ id: Id<"maintenancePredictions">; severity: string; description: string } | null>(null);
  const [resolveTarget, setResolveTarget] = useState<{ id: Id<"maintenancePredictions">; severity: string; description: string } | null>(null);

  const predictions = useQuery(
    api.predictions.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const aircraftList = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const workOrders = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId ? { organizationId: orgId } : "skip",
  );
  const generatePredictions = useMutation(api.predictions.generatePredictions);
  const acknowledgePrediction = useMutation(api.predictions.acknowledge);
  const resolvePrediction = useMutation(api.predictions.resolve);
  const dismissPrediction = useMutation(api.predictions.dismiss);
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading:
      !isLoaded ||
      predictions === undefined ||
      aircraftList === undefined ||
      workOrders === undefined,
  });

  // Build aircraft lookup
  const aircraftMap = useMemo(() => {
    if (!aircraftList) return new Map<string, { tail: string; label: string }>();
    const m = new Map<string, { tail: string; label: string }>();
    for (const ac of aircraftList) {
      m.set(ac._id, {
        tail: ac.currentRegistration ?? `${ac.make} ${ac.model}`,
        label: `${ac.currentRegistration ?? ""} ${ac.make} ${ac.model}`.trim(),
      });
    }
    return m;
  }, [aircraftList]);

  // Filter predictions
  const filtered = useMemo(() => {
    if (!predictions) return [];
    return predictions.filter((p) => {
      if (severityTab !== "all" && p.severity !== severityTab) return false;
      if (aircraftFilter !== "all" && p.aircraftId !== aircraftFilter) return false;
      if (typeFilter !== "all" && p.predictionType !== typeFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [predictions, severityTab, aircraftFilter, typeFilter, statusFilter]);

  // Summary counts (active only) — used in the stat cards
  const summary = useMemo(() => {
    if (!predictions) return { critical: 0, high: 0, medium: 0, low: 0, nextDate: null as number | null };
    const active = predictions.filter((p) => p.status === "active");
    const counts = { critical: 0, high: 0, medium: 0, low: 0, nextDate: null as number | null };
    for (const p of active) {
      if (p.severity in counts) {
        counts[p.severity as Severity]++;
      }
      if (!counts.nextDate || p.predictedDate < counts.nextDate) {
        counts.nextDate = p.predictedDate;
      }
    }
    return counts;
  }, [predictions]);

  // Banner: predictions in next 90 days with no open WO on that aircraft.
  const opportunityCount = useMemo(() => {
    if (!predictions || !workOrders) return 0;
    const horizon = Date.now() + 90 * 24 * 60 * 60 * 1000;
    const openWoAircraft = new Set(
      workOrders
        .filter((wo) => !["closed", "cancelled", "voided"].includes(wo.status))
        .map((wo) => (wo as Record<string, unknown>).aircraftId as string | undefined)
        .filter((id): id is string => Boolean(id)),
    );

    return predictions.filter(
      (p) =>
        p.status === "active" &&
        p.predictedDate <= horizon &&
        !openWoAircraft.has(p.aircraftId),
    ).length;
  }, [predictions, workOrders]);

  // Tab label counts — reflects the currently applied status/aircraft/type filters
  // so the badge numbers match what you see in each tab's content
  // BUG-DOM-066: "All" tab badge used predictions.length (total unfiltered) instead of
  // the count after applying the aircraft/type/status filters. DOM sets "Active only" +
  // a specific aircraft filter, then the "All" tab badge still shows the grand total —
  // e.g. "All (24)" but only 3 cards visible. Confusing and erodes trust in the counts.
  // Fix: compute an `all` total in tabCounts using the same filter logic as severity counts.
  const tabCounts = useMemo(() => {
    if (!predictions) return { all: 0, critical: 0, high: 0, medium: 0, low: 0 };
    const c = { all: 0, critical: 0, high: 0, medium: 0, low: 0 };
    for (const p of predictions) {
      if (aircraftFilter !== "all" && p.aircraftId !== aircraftFilter) continue;
      if (typeFilter !== "all" && p.predictionType !== typeFilter) continue;
      if (statusFilter !== "all" && p.status !== statusFilter) continue;
      c.all++;
      if (p.severity in c) c[p.severity as Severity]++;
    }
    return c;
  }, [predictions, aircraftFilter, typeFilter, statusFilter]);

  async function handleGenerate() {
    if (!orgId) {
      toast.error("Complete setup before generating predictions.");
      return;
    }
    try {
      const result = await generatePredictions({ organizationId: orgId });
      toast.success(`Generated ${result.created} new prediction(s).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate predictions.");
    }
  }

  async function handleAcknowledge(id: Id<"maintenancePredictions">) {
    if (!techId) {
      toast.error("Technician profile required to acknowledge predictions.");
      return;
    }
    try {
      await acknowledgePrediction({ id, acknowledgedBy: techId });
      toast.success("Prediction acknowledged.");
    } catch (err) {
      toast.error("Failed to acknowledge.");
    }
  }

  async function handleResolve(id: Id<"maintenancePredictions">) {
    try {
      await resolvePrediction({ id });
      toast.success("Prediction resolved.");
    } catch (err) {
      toast.error("Failed to resolve.");
    }
  }

  async function handleDismiss(id: Id<"maintenancePredictions">) {
    try {
      await dismissPrediction({ id });
      toast.success("Prediction dismissed.");
    } catch (err) {
      toast.error("Failed to dismiss.");
    }
  }

  // Still loading org context
  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4" data-testid="page-loading-state">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Predictive maintenance setup required"
        missingInfo="Your account is missing organization context. Complete onboarding to generate predictions."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
        secondaryActionLabel="Go to Personnel"
        secondaryActionTarget="/personnel"
      />
    );
  }
  if (!orgId || !predictions || !aircraftList || !workOrders) return null;

  const uniqueAircraft = [...new Set(predictions.map((p) => p.aircraftId))];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Predictive Maintenance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-generated maintenance predictions based on aircraft usage and trends
          </p>
        </div>
        <Button size="sm" className="h-9" onClick={handleGenerate}>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Predictions
        </Button>
      </div>

      {!techId && (
        <MissingPrereqBanner
          kind="needs_technician_profile"
          actionLabel="Go to Personnel"
          actionTarget="/personnel"
        />
      )}

      <PredictionToOpportunityBanner opportunityCount={opportunityCount} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {(["critical", "high", "medium", "low"] as Severity[]).map((sev) => {
          const cfg = SEVERITY_CONFIG[sev];
          const Icon = cfg.icon;
          return (
            <Card key={sev} className={`${cfg.bg} ${cfg.border} border`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                  <span className="text-sm font-medium capitalize">{sev}</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${cfg.color}`}>
                  {summary[sev]}
                </p>
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Next Due</span>
            </div>
            <p className="text-sm font-bold mt-1">
              {summary.nextDate ? formatDate(summary.nextDate) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={aircraftFilter} onValueChange={setAircraftFilter}>
          <SelectTrigger className="w-[200px]">
            <Plane className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Aircraft" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Aircraft</SelectItem>
            {uniqueAircraft.map((id) => (
              <SelectItem key={id} value={id}>
                {aircraftMap.get(id)?.label ?? id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="time_based">Time Based</SelectItem>
            <SelectItem value="usage_based">Usage Based</SelectItem>
            <SelectItem value="trend_based">Trend Based</SelectItem>
            <SelectItem value="condition_based">Condition Based</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resolve confirmation for Critical / High predictions */}
      <AlertDialog open={!!resolveTarget} onOpenChange={(v) => { if (!v) setResolveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className={`h-5 w-5 ${resolveTarget?.severity === "critical" ? "text-red-500" : "text-orange-500"}`} />
              Resolve {resolveTarget?.severity === "critical" ? "Critical" : "High"} Prediction?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground italic">
                  &ldquo;{resolveTarget?.description}&rdquo;
                </p>
                <p className="text-sm text-muted-foreground">
                  Marking a{" "}
                  <span className={`font-semibold ${resolveTarget?.severity === "critical" ? "text-red-500" : "text-orange-500"}`}>
                    {resolveTarget?.severity}
                  </span>{" "}
                  prediction as resolved indicates the underlying condition has been corrected.
                  Ensure the associated maintenance action is documented in the logbook before resolving.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resolveTarget) handleResolve(resolveTarget.id);
                setResolveTarget(null);
              }}
            >
              Confirm Resolve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dismiss confirmation for Critical / High predictions */}
      <AlertDialog open={!!dismissTarget} onOpenChange={(v) => { if (!v) setDismissTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${dismissTarget?.severity === "critical" ? "text-red-500" : "text-orange-500"}`} />
              Dismiss {dismissTarget?.severity === "critical" ? "Critical" : "High"} Prediction?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground italic">
                  &ldquo;{dismissTarget?.description}&rdquo;
                </p>
                <p className="text-sm text-muted-foreground">
                  This prediction will be removed from your active list. Dismissing a{" "}
                  <span className={`font-semibold ${dismissTarget?.severity === "critical" ? "text-red-500" : "text-orange-500"}`}>
                    {dismissTarget?.severity}
                  </span>{" "}
                  prediction should only be done when you have verified the underlying condition
                  does not require maintenance action.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (dismissTarget) handleDismiss(dismissTarget.id);
                setDismissTarget(null);
              }}
            >
              Dismiss Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Severity tabs + cards */}
      <Tabs value={severityTab} onValueChange={setSeverityTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({tabCounts.all})
          </TabsTrigger>
          <TabsTrigger value="critical" className="text-red-500">
            Critical ({tabCounts.critical})
          </TabsTrigger>
          <TabsTrigger value="high" className="text-orange-500">
            High ({tabCounts.high})
          </TabsTrigger>
          <TabsTrigger value="medium" className="text-yellow-500">
            Medium ({tabCounts.medium})
          </TabsTrigger>
          <TabsTrigger value="low" className="text-blue-500">
            Low ({tabCounts.low})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={severityTab} className="mt-4">
          {filtered.length === 0 ? (
            predictions.length === 0 ? (
              <ActionableEmptyState
                title="No predictions yet"
                missingInfo="Generate predictions to identify upcoming maintenance risks."
                primaryActionLabel="Generate Predictions"
                primaryActionType="button"
                primaryActionTarget={handleGenerate}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center" data-testid="empty-state">
                  <p className="text-sm font-medium text-muted-foreground">No predictions match current filters</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting the severity tab or filters above.</p>
                </CardContent>
              </Card>
            )
          ) : (
            <div className="grid gap-4">
              {filtered.map((pred) => {
                // BUG-DOM-115: Prediction cards assumed every severity value was one of
                // critical/high/medium/low. If backend data contains an unknown severity
                // (stale enum, migration artifact, bad import), sev becomes undefined and
                // the page crashes while rendering cards. Fall back to "medium" styling
                // so DOM users can still review and action the prediction.
                const sev =
                  SEVERITY_CONFIG[pred.severity as Severity] ??
                  SEVERITY_CONFIG.medium;
                const ac = aircraftMap.get(pred.aircraftId);
                const SevIcon = sev.icon;

                return (
                  <Card
                    key={pred._id}
                    className={`${sev.border} border-l-4`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <SevIcon className={`h-4 w-4 ${sev.color}`} />
                            <Badge className={`${sev.bg} ${sev.color} ${sev.border} capitalize`}>
                              {pred.severity}
                            </Badge>
                            {/* BUG-DOM-072: String.replace("_", " ") only replaces the FIRST
                                underscore. "time_based" renders "time based" (OK), but any
                                future multi-word type like "time_based_interval" would show
                                "time based_interval". Use a global regex to replace all. */}
                            <Badge variant="outline" className="text-[10px]">
                              {pred.predictionType.replace(/_/g, " ")}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {pred.status}
                            </Badge>
                            {ac && (
                              <span className="text-sm font-medium flex items-center gap-1">
                                <Plane className="h-3 w-3" />
                                {ac.tail}
                              </span>
                            )}
                          </div>

                          <p className="text-sm">{pred.description}</p>

                          {pred.recommendation && (
                            <p className="text-xs text-muted-foreground">
                              💡 {pred.recommendation}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Predicted: <strong>{formatDate(pred.predictedDate)}</strong>
                            </span>
                            <div className="flex items-center gap-2 w-32">
                              <span>Confidence:</span>
                              <Progress value={pred.confidence} className="h-2 flex-1" />
                              <span className="font-mono">{pred.confidence}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          {/* BUG-DOM-104: Dismiss was only shown for "active" predictions.
                              Once a DOM acknowledges a prediction and then determines it is a
                              false positive (sensor glitch, stale data, etc.), there is no way
                              to dismiss it — the only available action is Resolve, which implies
                              maintenance was actually performed. This conflates "dismissed as
                              false positive" with "maintenance completed", corrupting the
                              prediction audit trail. Dismiss is now available on "acknowledged"
                              status too, with the same critical/high confirmation guard. */}
                          {pred.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              disabled={!techId}
                              onClick={() =>
                                handleAcknowledge(
                                  pred._id as Id<"maintenancePredictions">,
                                )
                              }
                            >
                              Acknowledge
                            </Button>
                          )}
                          {(pred.status === "active" || pred.status === "acknowledged") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                if (pred.severity === "critical" || pred.severity === "high") {
                                  setDismissTarget({
                                    id: pred._id as Id<"maintenancePredictions">,
                                    severity: pred.severity,
                                    description: pred.description,
                                  });
                                } else {
                                  handleDismiss(pred._id as Id<"maintenancePredictions">);
                                }
                              }}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Dismiss
                            </Button>
                          )}
                          {(pred.status === "active" ||
                            pred.status === "acknowledged") && (
                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs"
                              onClick={() => {
                                if (pred.severity === "critical" || pred.severity === "high") {
                                  setResolveTarget({
                                    id: pred._id as Id<"maintenancePredictions">,
                                    severity: pred.severity,
                                    description: pred.description,
                                  });
                                } else {
                                  handleResolve(pred._id as Id<"maintenancePredictions">);
                                }
                              }}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
