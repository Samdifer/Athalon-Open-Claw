import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
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
import { DiscrepancyDispositionDialog } from "@/components/DiscrepancyDispositionDialog";
import { Link } from "react-router-dom";
import type { Id } from "@/convex/_generated/dataModel";

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

export default function SquawksPage() {
  const { orgId } = useCurrentOrg();
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

  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading organization…</p>
      </div>
    );
  }

  if (!discrepancies) {
    return (
      <div className="space-y-6">
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
            Squawks & Discrepancies
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage aircraft discrepancies and findings
          </p>
        </div>
        <Button className="gap-2" asChild title="Squawks are logged from within a Work Order">
          <Link to="/work-orders">
            <Plus className="w-4 h-4" />
            Log from Work Order
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
            placeholder="Search squawks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Discrepancy List */}
      {filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <Eye className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No discrepancies found.</p>
          </CardContent>
        </Card>
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
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/60">
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
                          {new Date(d.foundAt).toLocaleDateString()}
                        </span>
                      )}
                      {d.melCategory && (
                        <span>MEL Cat {d.melCategory}</span>
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
        <DiscrepancyDispositionDialog
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
