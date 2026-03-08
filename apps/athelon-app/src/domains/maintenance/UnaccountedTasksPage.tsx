/**
 * domains/maintenance/UnaccountedTasksPage.tsx
 *
 * Maintenance > Unaccounted Tasks — triage workflow for AD, SB, and predicted
 * maintenance findings that have no linked work order.
 *
 * Tabs: All / AD / SB / Predicted
 * Filters: aircraft, status, severity, linked/unlinked, due window
 * Actions: triage, associate to WO, create WO from finding, defer, dismiss
 */

import { useMemo, useState, useCallback } from "react";
import {
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Link2,
  Unlink,
  FileWarning,
  ShieldAlert,
  TrendingUp,
  ChevronRight,
  Plus,
  ClipboardCheck,
  CalendarClock,
  Plane,
} from "lucide-react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { useRbac } from "@/hooks/useRbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

import type {
  UnaccountedFinding,
  FindingSource,
  FindingSeverity,
  FindingStatus,
  DueWindow,
  UnaccountedFilters,
} from "./types";
import {
  useUnaccountedFindings,
  useAvailableWorkOrders,
} from "./api";
import { TriageDialog } from "./dialogs/TriageDialog";
import { LinkWorkOrderDialog } from "./dialogs/LinkWorkOrderDialog";
import { CreateWorkOrderDialog } from "./dialogs/CreateWorkOrderDialog";
import { DeferDismissDialog } from "./dialogs/DeferDismissDialog";
import { FindingDetailSheet } from "./FindingDetailSheet";

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<FindingSource, string> = {
  ad: "Airworthiness Directive",
  sb: "Service Bulletin",
  predicted: "Predictive",
};

const SOURCE_SHORT: Record<FindingSource, string> = {
  ad: "AD",
  sb: "SB",
  predicted: "Predicted",
};

const SEVERITY_STYLES: Record<FindingSeverity, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const STATUS_STYLES: Record<FindingStatus, string> = {
  open: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  triaged: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  linked: "bg-green-500/15 text-green-400 border-green-500/30",
  deferred: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  dismissed: "bg-gray-500/15 text-gray-500 border-gray-500/30",
};

const STATUS_LABELS: Record<FindingStatus, string> = {
  open: "Open",
  triaged: "Triaged",
  linked: "Linked",
  deferred: "Deferred",
  dismissed: "Dismissed",
};

const SOURCE_ICONS: Record<FindingSource, typeof ShieldAlert> = {
  ad: ShieldAlert,
  sb: FileWarning,
  predicted: TrendingUp,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDueWindow(finding: UnaccountedFinding): DueWindow {
  if (!finding.dueDate) return "no_date";
  const now = Date.now();
  if (finding.dueDate < now) return "overdue";
  const daysUntil = (finding.dueDate - now) / 86_400_000;
  if (daysUntil <= 30) return "due_soon";
  return "upcoming";
}

function formatRelativeDate(ms: number): string {
  const now = Date.now();
  const diff = ms - now;
  const days = Math.abs(Math.round(diff / 86_400_000));
  if (diff < 0) return `${days}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d away`;
}

function applyFilters(
  findings: UnaccountedFinding[],
  filters: UnaccountedFilters,
): UnaccountedFinding[] {
  return findings.filter((f) => {
    // Tab filter
    if (filters.tab !== "all" && f.source !== filters.tab) return false;

    // Aircraft filter
    if (filters.aircraftId !== "all" && String(f.aircraftId) !== filters.aircraftId) return false;

    // Status filter
    if (filters.status && f.status !== filters.status) return false;

    // Severity filter
    if (filters.severity && f.severity !== filters.severity) return false;

    // Linkage filter
    if (filters.linkage === "linked" && !f.linkedWorkOrderId) return false;
    if (filters.linkage === "unlinked" && f.linkedWorkOrderId) return false;

    // Due window filter
    if (filters.dueWindow) {
      const window = computeDueWindow(f);
      if (window !== filters.dueWindow) return false;
    }

    // Search
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const searchable = [
        f.referenceNumber,
        f.title,
        f.description,
        f.aircraftRegistration,
        f.aircraftType,
        f.linkedWorkOrderNumber ?? "",
      ].join(" ").toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  });
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function UnaccountedTasksPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const { isAdmin, isManager, isInspector } = useRbac();
  const canTriage = isAdmin || isManager || isInspector;

  const rawFindings = useUnaccountedFindings(orgId);
  const availableWOs = useAvailableWorkOrders(orgId);

  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || rawFindings === undefined,
  });

  // ─── Filter state ─────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<UnaccountedFilters>({
    tab: "all",
    search: "",
    aircraftId: "all",
    status: "",
    severity: "",
    linkage: "",
    dueWindow: "",
  });
  const [filterOpen, setFilterOpen] = useState(false);

  // ─── Dialog state ─────────────────────────────────────────────────────────
  const [triageFinding, setTriageFinding] = useState<UnaccountedFinding | null>(null);
  const [linkFinding, setLinkFinding] = useState<UnaccountedFinding | null>(null);
  const [createWoFinding, setCreateWoFinding] = useState<UnaccountedFinding | null>(null);
  const [deferDismissFinding, setDeferDismissFinding] = useState<{
    finding: UnaccountedFinding;
    mode: "defer" | "dismiss";
  } | null>(null);
  const [detailFinding, setDetailFinding] = useState<UnaccountedFinding | null>(null);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const findings = rawFindings ?? [];

  const filtered = useMemo(
    () => applyFilters(findings, filters),
    [findings, filters],
  );

  // Unique aircraft for filter dropdown
  const uniqueAircraft = useMemo(() => {
    const map = new Map<string, { id: string; registration: string; type: string }>();
    for (const f of findings) {
      if (!map.has(String(f.aircraftId))) {
        map.set(String(f.aircraftId), {
          id: String(f.aircraftId),
          registration: f.aircraftRegistration,
          type: f.aircraftType,
        });
      }
    }
    return Array.from(map.values());
  }, [findings]);

  // Tab counts
  const counts = useMemo(() => {
    const c = { all: findings.length, ad: 0, sb: 0, predicted: 0 };
    for (const f of findings) {
      c[f.source]++;
    }
    return c;
  }, [findings]);

  // Summary stats
  const stats = useMemo(() => {
    const s = { overdue: 0, dueSoon: 0, unlinked: 0, critical: 0 };
    for (const f of findings) {
      const w = computeDueWindow(f);
      if (w === "overdue") s.overdue++;
      if (w === "due_soon") s.dueSoon++;
      if (!f.linkedWorkOrderId && f.status !== "dismissed") s.unlinked++;
      if (f.severity === "critical") s.critical++;
    }
    return s;
  }, [findings]);

  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.severity ? 1 : 0) +
    (filters.linkage ? 1 : 0) +
    (filters.dueWindow ? 1 : 0) +
    (filters.aircraftId !== "all" ? 1 : 0);

  const updateFilter = useCallback(
    <K extends keyof UnaccountedFilters>(key: K, value: UnaccountedFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ─── Loading state ────────────────────────────────────────────────────────
  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4" data-testid="unaccounted-loading">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // ─── Missing context ──────────────────────────────────────────────────────
  if (prereq.state === "missing_context" || !orgId) {
    return (
      <ActionableEmptyState
        title="Unaccounted tasks are unavailable"
        missingInfo="Complete onboarding to view and manage unaccounted maintenance findings."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
        testId="unaccounted-missing-context"
      />
    );
  }

  return (
    <div className="space-y-5" data-testid="unaccounted-tasks-page">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
            Unaccounted Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AD, SB, and predicted maintenance findings requiring triage
          </p>
        </div>
      </div>

      {/* ─── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-red-500/10">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground" data-testid="stat-overdue">
                  {stats.overdue}
                </p>
                <p className="text-[11px] text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-amber-500/10">
                <CalendarClock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground" data-testid="stat-due-soon">
                  {stats.dueSoon}
                </p>
                <p className="text-[11px] text-muted-foreground">Due Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-blue-500/10">
                <Unlink className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground" data-testid="stat-unlinked">
                  {stats.unlinked}
                </p>
                <p className="text-[11px] text-muted-foreground">Unlinked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-red-500/10">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground" data-testid="stat-critical">
                  {stats.critical}
                </p>
                <p className="text-[11px] text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Tabs + Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <Tabs
          value={filters.tab}
          onValueChange={(v) => updateFilter("tab", v as FindingSource | "all")}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-8 bg-muted/40 p-0.5" data-testid="finding-tabs">
            {(
              [
                ["all", "All", counts.all],
                ["ad", "AD", counts.ad],
                ["sb", "SB", counts.sb],
                ["predicted", "Predicted", counts.predicted],
              ] as const
            ).map(([tab, label, count]) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-7 px-3 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
                data-testid={`tab-${tab}`}
              >
                {label}
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 h-4 min-w-[16px] px-1 text-[9px] ${
                      filters.tab === tab
                        ? "bg-primary/15 text-primary"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}
                  >
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search ref#, title, aircraft..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-full sm:w-64 bg-muted/30 border-border/60"
              data-testid="finding-search"
            />
          </div>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 gap-1.5 text-xs border-border/60 ${activeFilterCount > 0 ? "border-primary/50 text-primary" : ""}`}
                data-testid="filter-button"
              >
                <Filter className="w-3.5 h-3.5" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground ml-0.5">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3 space-y-3">
              {/* Aircraft */}
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Aircraft</p>
                <Select
                  value={filters.aircraftId}
                  onValueChange={(v) => updateFilter("aircraftId", v)}
                >
                  <SelectTrigger className="h-8 text-xs" data-testid="filter-aircraft">
                    <SelectValue placeholder="All aircraft" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All aircraft</SelectItem>
                    {uniqueAircraft.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.registration} — {a.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="opacity-50" />

              {/* Status */}
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["", "open", "triaged", "linked", "deferred", "dismissed"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateFilter("status", s)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        filters.status === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/40"
                      }`}
                      data-testid={`filter-status-${s || "any"}`}
                    >
                      {s === "" ? "Any" : STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Severity */}
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Severity</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["", "critical", "high", "medium", "low"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateFilter("severity", s)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        filters.severity === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/40"
                      }`}
                      data-testid={`filter-severity-${s || "any"}`}
                    >
                      {s === "" ? "Any" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Linkage */}
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Linkage</p>
                <div className="flex gap-1.5">
                  {(["", "linked", "unlinked"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => updateFilter("linkage", l)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        filters.linkage === l
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/40"
                      }`}
                      data-testid={`filter-linkage-${l || "any"}`}
                    >
                      {l === "" ? "Any" : l.charAt(0).toUpperCase() + l.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Due window */}
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Due Window</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["", "overdue", "due_soon", "upcoming", "no_date"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => updateFilter("dueWindow", d)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        filters.dueWindow === d
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground hover:border-primary/40"
                      }`}
                      data-testid={`filter-due-${d || "any"}`}
                    >
                      {d === ""
                        ? "Any"
                        : d === "due_soon"
                          ? "Due Soon"
                          : d === "no_date"
                            ? "No Date"
                            : d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <>
                  <Separator className="opacity-50" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => {
                      setFilters((prev) => ({
                        ...prev,
                        aircraftId: "all",
                        status: "",
                        severity: "",
                        linkage: "",
                        dueWindow: "",
                      }));
                      setFilterOpen(false);
                    }}
                    data-testid="filter-clear-all"
                  >
                    Clear All Filters
                  </Button>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ─── Findings list ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        findings.length === 0 ? (
          <ActionableEmptyState
            title="No unaccounted findings"
            missingInfo="All AD/SB compliance items and predictive maintenance findings are accounted for. Great work!"
            primaryActionLabel="View Fleet"
            primaryActionType="link"
            primaryActionTarget="/fleet"
            testId="unaccounted-empty"
          />
        ) : (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center" data-testid="unaccounted-no-match">
              <ClipboardCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No findings match this filter
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try a different tab or clear your filters to see all {findings.length} finding{findings.length !== 1 ? "s" : ""}.
              </p>
              {filters.search.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => updateFilter("search", "")}
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-2" data-testid="findings-list">
          {filtered.map((finding) => {
            const SourceIcon = SOURCE_ICONS[finding.source];
            const dueWindow = computeDueWindow(finding);
            const isOverdue = dueWindow === "overdue";
            const isDueSoon = dueWindow === "due_soon";

            return (
              <Card
                key={finding._id}
                className={`border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer ${
                  isOverdue ? "border-l-4 border-l-red-500" : ""
                } ${isDueSoon ? "border-l-4 border-l-amber-500" : ""}`}
                onClick={() => setDetailFinding(finding)}
                data-testid={`finding-card-${finding._id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Source icon */}
                    <div
                      className={`p-2 rounded flex-shrink-0 ${
                        finding.source === "ad"
                          ? "bg-red-500/10"
                          : finding.source === "sb"
                            ? "bg-blue-500/10"
                            : "bg-purple-500/10"
                      }`}
                    >
                      <SourceIcon
                        className={`w-4 h-4 ${
                          finding.source === "ad"
                            ? "text-red-400"
                            : finding.source === "sb"
                              ? "text-blue-400"
                              : "text-purple-400"
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          {finding.referenceNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium border ${SOURCE_LABELS[finding.source] ? SEVERITY_STYLES[finding.severity] : ""}`}
                        >
                          {finding.severity.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium border ${STATUS_STYLES[finding.status]}`}
                          data-testid={`finding-status-${finding._id}`}
                        >
                          {STATUS_LABELS[finding.status]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground border-border/40"
                        >
                          {SOURCE_SHORT[finding.source]}
                        </Badge>
                        {finding.linkedWorkOrderNumber && (
                          <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[9px] gap-0.5">
                            <Link2 className="w-2.5 h-2.5" />
                            {finding.linkedWorkOrderNumber}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">
                          {finding.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Plane className="w-3 h-3" />
                          {finding.aircraftRegistration} — {finding.aircraftType}
                        </span>
                        {finding.dueDate && (
                          <>
                            <span className="text-muted-foreground/40 text-[11px]">·</span>
                            <span
                              className={`text-[11px] flex items-center gap-1 ${
                                isOverdue
                                  ? "text-red-400"
                                  : isDueSoon
                                    ? "text-amber-400"
                                    : "text-muted-foreground"
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {formatRelativeDate(finding.dueDate)}
                            </span>
                          </>
                        )}
                        {finding.dueHours && (
                          <>
                            <span className="text-muted-foreground/40 text-[11px]">·</span>
                            <span className="text-[11px] text-muted-foreground">
                              Due at {finding.dueHours.toLocaleString()} hrs
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {canTriage && finding.status === "open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTriageFinding(finding);
                          }}
                          data-testid={`triage-${finding._id}`}
                        >
                          <ClipboardCheck className="w-3 h-3" />
                          Triage
                        </Button>
                      )}
                      {canTriage && !finding.linkedWorkOrderId && finding.status !== "dismissed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkFinding(finding);
                          }}
                          data-testid={`link-wo-${finding._id}`}
                        >
                          <Link2 className="w-3 h-3" />
                          Link WO
                        </Button>
                      )}
                      {canTriage && !finding.linkedWorkOrderId && finding.status !== "dismissed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreateWoFinding(finding);
                          }}
                          data-testid={`create-wo-${finding._id}`}
                        >
                          <Plus className="w-3 h-3" />
                          New WO
                        </Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Dialogs ────────────────────────────────────────────────────────── */}
      <TriageDialog
        finding={triageFinding}
        onClose={() => setTriageFinding(null)}
      />
      <LinkWorkOrderDialog
        finding={linkFinding}
        workOrders={availableWOs ?? []}
        onClose={() => setLinkFinding(null)}
      />
      <CreateWorkOrderDialog
        finding={createWoFinding}
        onClose={() => setCreateWoFinding(null)}
      />
      <DeferDismissDialog
        finding={deferDismissFinding?.finding ?? null}
        mode={deferDismissFinding?.mode ?? "defer"}
        onClose={() => setDeferDismissFinding(null)}
      />
      <FindingDetailSheet
        finding={detailFinding}
        canTriage={canTriage}
        onClose={() => setDetailFinding(null)}
        onTriage={(f) => { setDetailFinding(null); setTriageFinding(f); }}
        onLink={(f) => { setDetailFinding(null); setLinkFinding(f); }}
        onCreateWO={(f) => { setDetailFinding(null); setCreateWoFinding(f); }}
        onDefer={(f) => { setDetailFinding(null); setDeferDismissFinding({ finding: f, mode: "defer" }); }}
        onDismiss={(f) => { setDetailFinding(null); setDeferDismissFinding({ finding: f, mode: "dismiss" }); }}
      />
    </div>
  );
}
