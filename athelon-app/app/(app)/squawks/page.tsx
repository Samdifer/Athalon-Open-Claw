import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { Id } from "@/convex/_generated/dataModel";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  mandatory: { bg: "bg-red-100", text: "text-red-700", label: "Critical" },
  recommended: { bg: "bg-orange-100", text: "text-orange-700", label: "Major" },
  customer_information: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Minor" },
  ops_check: { bg: "bg-blue-100", text: "text-blue-700", label: "Observation" },
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
        <p className="text-gray-500">Loading organization…</p>
      </div>
    );
  }

  if (!discrepancies) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function getSeverityBadge(type: string | undefined) {
    const style = SEVERITY_STYLES[type ?? ""] ?? {
      bg: "bg-gray-100",
      text: "text-gray-600",
      label: type ?? "Unknown",
    };
    return (
      <Badge className={`${style.bg} ${style.text} border-0`}>
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
          <h1 className="text-2xl font-bold text-gray-900">
            Squawks & Discrepancies
          </h1>
          <p className="text-gray-500 mt-1">
            Manage aircraft discrepancies and findings
          </p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="w-4 h-4" />
          New Squawk
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Open</p>
                <p className="text-3xl font-bold text-gray-900">{totalOpen}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={criticalCount > 0 ? "border-red-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Critical</p>
                <p className="text-3xl font-bold text-red-600">
                  {criticalCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Deferred</p>
                <p className="text-3xl font-bold text-amber-600">
                  {deferredCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No discrepancies found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card
              key={d._id}
              className="hover:shadow-sm transition-shadow"
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getStatusIcon(d.status, d.disposition)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-semibold text-gray-900">
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
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {d.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
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
        />
      )}
    </div>
  );
}
