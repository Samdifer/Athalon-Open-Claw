import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Search,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  Eye,
  Gavel,
} from "lucide-react";
import { FindingDispositionDialog } from "@/components/FindingDispositionDialog";
import { Link } from "react-router-dom";
import type { Id } from "@/convex/_generated/dataModel";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  mandatory: { bg: "bg-red-500/15", text: "text-red-600 dark:text-red-400", border: "border-red-500/30", label: "Critical" },
  recommended: { bg: "bg-orange-500/15", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/30", label: "Major" },
  customer_information: { bg: "bg-yellow-500/15", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-500/30", label: "Minor" },
  ops_check: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", label: "Observation" },
};

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "deferred", label: "Deferred" },
  { value: "resolved", label: "Resolved" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["value"];

export default function FindingsPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [dispositionTarget, setDispositionTarget] = useState<{
    id: Id<"discrepancies">;
    number: string;
    workOrderId?: Id<"workOrders">;
  } | null>(null);

  const discrepancies = useQuery(
    api.discrepancies.listDiscrepancies,
    orgId ? { organizationId: orgId } : "skip",
  );
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || discrepancies === undefined,
  });

  const filtered = useMemo(() => {
    if (!discrepancies) return [];

    let items = discrepancies;

    // Status filter
    if (statusFilter === "open") {
      items = items.filter((d) => d.status === "open" || d.status === "under_evaluation");
    } else if (statusFilter === "deferred") {
      items = items.filter(
        (d) =>
          d.disposition === "deferred_mel" || d.disposition === "deferred_grounded",
      );
    } else if (statusFilter === "resolved") {
      items = items.filter(
        (d) =>
          d.status === "dispositioned" &&
          d.disposition !== "deferred_mel" &&
          d.disposition !== "deferred_grounded",
      );
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (d) =>
          d.description?.toLowerCase().includes(q) ||
          d.discrepancyNumber?.toLowerCase().includes(q) ||
          d.componentAffected?.toLowerCase().includes(q),
      );
    }

    return items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [discrepancies, statusFilter, search]);

  // Summary counts
  const totalOpen = useMemo(
    () =>
      discrepancies?.filter(
        (d) => d.status === "open" || d.status === "under_evaluation",
      ).length ?? 0,
    [discrepancies],
  );
  const criticalCount = useMemo(
    () =>
      discrepancies?.filter(
        (d) =>
          d.discrepancyType === "mandatory" &&
          (d.status === "open" || d.status === "under_evaluation"),
      ).length ?? 0,
    [discrepancies],
  );
  const deferredCount = useMemo(
    () =>
      discrepancies?.filter(
        (d) =>
          d.disposition === "deferred_mel" || d.disposition === "deferred_grounded",
      ).length ?? 0,
    [discrepancies],
  );

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Finding tracking requires organization setup"
        missingInfo="Complete onboarding before viewing and managing findings."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-6" data-testid="page-loading-state">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!discrepancies) return null;

  function getSeverityBadge(type: string | undefined) {
    const style = SEVERITY_STYLES[type ?? ""] ?? {
      bg: "bg-muted/50",
      text: "text-muted-foreground",
      border: "border-border/40",
      label: type ?? "Unknown",
    };
    return (
      <Badge className={`${style.bg} ${style.text} border ${style.border}`}>
        {style.label}
      </Badge>
    );
  }

  function getStatusIcon(status: string, disposition?: string) {
    if (
      disposition === "deferred_mel" ||
      disposition === "deferred_grounded"
    ) {
      return <Clock className="w-4 h-4 text-amber-500" />;
    }
    if (status === "dispositioned") {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
            Findings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage aircraft findings and corrective actions
          </p>
        </div>
        <Button className="gap-2" asChild title="Findings are logged from within a Work Order">
          <Link to="/work-orders">
            <Plus className="w-4 h-4" />
            Log Finding from Work Order
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Open</p>
                <p className="text-3xl font-bold text-foreground">{totalOpen}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border/60 ${criticalCount > 0 ? "border-red-500/30" : ""}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {criticalCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deferred</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {deferredCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search findings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Finding List */}
      {filtered.length === 0 ? (
        discrepancies.length === 0 ? (
          <ActionableEmptyState
            title="No findings found"
            missingInfo="Findings are created from work orders during inspections and maintenance."
            primaryActionLabel="Open Work Orders"
            primaryActionType="link"
            primaryActionTarget="/work-orders"
          />
        ) : (
          <Card className="border-border/60">
            <CardContent className="py-12 text-center" data-testid="empty-state">
              <Eye className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No findings match your filters.</p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card
              key={d._id}
              className="border-border/60 hover:shadow-sm transition-shadow"
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getStatusIcon(d.status, d.disposition)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {d.discrepancyNumber}
                      </span>
                      {getSeverityBadge(d.discrepancyType)}
                      <Badge variant="outline" className="text-xs capitalize">
                        {d.status.replace(/_/g, " ")}
                      </Badge>
                      {d.disposition && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {d.disposition.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {d.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/60 flex-wrap">
                      {d.componentAffected && (
                        <span>Component: {d.componentAffected}</span>
                      )}
                      {d.foundDuring && (
                        <span className="capitalize">
                          Found: {d.foundDuring.replace(/_/g, " ")}
                        </span>
                      )}
                      {d.foundAt && (
                        <span>
                          {/* BUG-QCM-TZ-002: toLocaleDateString() without timeZone shifts UTC
                              midnight timestamps by the browser offset. A squawk logged at
                              00:05 UTC would show the prior day's date in UTC-5 — misrepresenting
                              when the discrepancy was actually found. Critical for Part 145 audit
                              trails where squawk discovery dates are regulatory records. */}
                          {new Date(d.foundAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
                        </span>
                      )}
                      {d.melCategory && (
                        <span>MEL Cat {d.melCategory}</span>
                      )}
                      {/* BUG-LT-HUNT-009: Add "View WO →" link so a Lead Tech can
                          navigate to the parent work order for full context (steps
                          completed, other task cards, parts used, audit trail).
                          Previously the squawks list was a dead-end — no path from
                          a squawk back to the WO where it was logged. The tech had
                          to go to Work Orders, search/scroll for the right WO, then
                          find the discrepancy — a multi-step detour mid-workflow. */}
                      {d.workOrderId && (
                        <Link
                          to={`/work-orders/${d.workOrderId}`}
                          className="text-primary hover:underline underline-offset-2 flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View WO →
                        </Link>
                      )}
                    </div>
                  </div>
                  {(d.status === "open" || d.status === "under_evaluation") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0 gap-1.5 text-xs"
                      onClick={() =>
                        setDispositionTarget({
                          id: d._id as Id<"discrepancies">,
                          number: d.discrepancyNumber ?? d._id,
                          workOrderId: d.workOrderId as Id<"workOrders"> | undefined,
                        })
                      }
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      Disposition
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Disposition Dialog */}
      {dispositionTarget && (
        <FindingDispositionDialog
          open={!!dispositionTarget}
          onOpenChange={(v) => { if (!v) setDispositionTarget(null); }}
          discrepancyId={dispositionTarget.id}
          discrepancyNumber={dispositionTarget.number}
          workOrderId={dispositionTarget.workOrderId}
        />
      )}
    </div>
  );
}
