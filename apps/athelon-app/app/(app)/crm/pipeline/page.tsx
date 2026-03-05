"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineKanban } from "../_components/PipelineKanban";
import { CreateOpportunityDialog } from "../_components/CreateOpportunityDialog";
import type {
  PipelineOpportunity,
  PipelineStatus,
} from "../_components/OpportunityCard";
import {
  Building2,
  DollarSign,
  Percent,
  Target,
  Plus,
  TrendingUp,
  Award,
  XCircle,
  Calendar,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const LOOKAHEAD_OPTIONS = [30, 60, 90, 180] as const;

/** Default blended labor rate ($/hr) used for pipeline revenue estimates.
 *  TODO: pull from org billing settings once configurable. */
const DEFAULT_LABOR_RATE = 185;

const STATUS_LABELS: Record<PipelineStatus, string> = {
  new: "New Opportunity",
  contacted: "Contacted",
  quote_sent: "Quote Sent",
  won: "Won",
  lost: "Lost",
};

const STATUS_BADGES: Record<PipelineStatus, string> = {
  new: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  contacted: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  quote_sent: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  won: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  lost: "bg-red-500/15 text-red-500 border-red-500/30",
};

type ManualStage = "prospecting" | "qualification" | "proposal" | "negotiation" | "won" | "lost";

const MANUAL_STAGE_LABELS: Record<ManualStage, string> = {
  prospecting: "Prospecting",
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const MANUAL_STAGE_BADGES: Record<ManualStage, string> = {
  prospecting: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  qualification: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  proposal: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  negotiation: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  won: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  lost: "bg-red-500/15 text-red-500 border-red-500/30",
};

const SOURCE_LABELS: Record<string, string> = {
  prediction: "Prediction",
  referral: "Referral",
  walk_in: "Walk-in",
  phone: "Phone",
  website: "Website",
  trade_show: "Trade Show",
  existing_customer: "Existing Customer",
  other: "Other",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function estimateLaborHours(predictionType: string, severity: string) {
  const byType: Record<string, number> = {
    time_based: 28,
    usage_based: 22,
    trend_based: 14,
    condition_based: 18,
  };
  const severityMultiplier: Record<string, number> = {
    critical: 1.4,
    high: 1.2,
    medium: 1,
    low: 0.75,
  };

  return Math.round((byType[predictionType] ?? 16) * (severityMultiplier[severity] ?? 1));
}

function deriveStatus(predictionStatus: string, hasOpenWo: boolean): PipelineStatus {
  if (predictionStatus === "resolved") return "won";
  if (predictionStatus === "dismissed") return "lost";
  if (predictionStatus === "acknowledged") return "contacted";
  if (hasOpenWo) return "quote_sent";
  return "new";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CrmPipelinePage() {
  const { orgId } = useCurrentOrg();
  const [lookaheadDays, setLookaheadDays] = useState<number>(90);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Prediction pipeline data
  const predictions = useQuery(
    api.predictions.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const aircraft = useQuery(
    api.aircraft.list,
    orgId ? { organizationId: orgId } : "skip",
  );
  const customers = useQuery(
    api.customers.listCustomers,
    orgId ? { orgId } : "skip",
  );
  const workOrders = useQuery(
    api.workOrders.getWorkOrdersWithScheduleRisk,
    orgId ? { organizationId: orgId } : "skip",
  );

  // Manual pipeline data
  const manualOpportunities = useQuery(
    api.crm.listOpportunities,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  );

  // Customer list for name resolution in manual pipeline
  const allCustomers = useQuery(
    api.billingV4.listAllCustomers,
    orgId ? { organizationId: orgId as Id<"organizations"> } : "skip",
  );

  const isLoading = !orgId || !predictions || !aircraft || !customers || !workOrders;

  // ─── Prediction pipeline memos ───────────────────────────────────────

  const opportunities = useMemo<PipelineOpportunity[]>(() => {
    if (!predictions || !aircraft || !customers || !workOrders) return [];

    const endTs = Date.now() + lookaheadDays * 24 * 60 * 60 * 1000;

    const customerMap = new Map(customers.map((c) => [c._id, c.name]));
    const aircraftMap = new Map(aircraft.map((a) => [a._id, a]));

    const openWoAircraft = new Set(
      workOrders
        .filter((wo) => !["closed", "cancelled", "voided"].includes(wo.status))
        .map((wo) => (wo as Record<string, unknown>).aircraftId as string | undefined)
        .filter((id): id is string => Boolean(id)),
    );

    return predictions
      .filter((p) => p.predictedDate <= endTs)
      .map((p) => {
        const ac = aircraftMap.get(p.aircraftId);
        const tail = ac?.currentRegistration ?? `${ac?.make ?? "Aircraft"} ${ac?.model ?? ""}`.trim();
        const customerName = ac?.customerId
          ? customerMap.get(ac.customerId) ?? "Unassigned Customer"
          : "Unassigned Customer";

        const estimatedLaborHours = estimateLaborHours(p.predictionType, p.severity);
        const estimatedRevenue = estimatedLaborHours * DEFAULT_LABOR_RATE;
        const hasOpenWo = openWoAircraft.has(p.aircraftId);

        return {
          id: p._id,
          aircraftTail: tail,
          customerName,
          maintenanceType: p.description,
          dueDate: p.predictedDate,
          estimatedLaborHours,
          estimatedValue: estimatedRevenue,
          status: deriveStatus(p.status, hasOpenWo),
        };
      })
      .sort((a, b) => a.dueDate - b.dueDate);
  }, [predictions, aircraft, customers, workOrders, lookaheadDays]);

  const summary = useMemo(() => {
    const total = opportunities.length;
    const pipelineValue = opportunities.reduce((sum, o) => sum + o.estimatedValue, 0);
    const won = opportunities.filter((o) => o.status === "won").length;
    const closed = opportunities.filter((o) => o.status === "won" || o.status === "lost").length;
    const conversionRate = closed > 0 ? (won / closed) * 100 : 0;

    return { total, pipelineValue, conversionRate };
  }, [opportunities]);

  // ─── Manual pipeline memos ───────────────────────────────────────────

  const customerNameMap = useMemo(() => {
    if (!allCustomers) return new Map<string, string>();
    return new Map(allCustomers.map((c) => [c._id, c.name]));
  }, [allCustomers]);

  const manualGrouped = useMemo(() => {
    if (!manualOpportunities) return null;
    const stages: ManualStage[] = ["prospecting", "qualification", "proposal", "negotiation", "won", "lost"];
    const groups: Record<ManualStage, typeof manualOpportunities> = {
      prospecting: [],
      qualification: [],
      proposal: [],
      negotiation: [],
      won: [],
      lost: [],
    };

    for (const opp of manualOpportunities) {
      const stage = opp.stage as ManualStage;
      if (groups[stage]) {
        groups[stage].push(opp);
      }
    }

    return { stages, groups };
  }, [manualOpportunities]);

  const manualSummary = useMemo(() => {
    if (!manualOpportunities) return null;
    const wonOpps = manualOpportunities.filter((o) => o.stage === "won");
    const lostOpps = manualOpportunities.filter((o) => o.stage === "lost");
    const totalWonValue = wonOpps.reduce((sum, o) => sum + o.estimatedValue, 0);
    const totalClosed = wonOpps.length + lostOpps.length;
    const winRate = totalClosed > 0 ? (wonOpps.length / totalClosed) * 100 : 0;
    const avgDealSize =
      wonOpps.length > 0 ? totalWonValue / wonOpps.length : 0;

    return {
      wonCount: wonOpps.length,
      wonValue: totalWonValue,
      lostCount: lostOpps.length,
      winRate,
      avgDealSize,
    };
  }, [manualOpportunities]);

  // ─── Loading state ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[280px] w-full" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Prediction-driven opportunities from upcoming maintenance demand.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            variant="default"
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Opportunity
          </Button>
          <span className="text-xs text-muted-foreground">Lookahead</span>
          <Select
            value={String(lookaheadDays)}
            onValueChange={(value) => setLookaheadDays(Number(value))}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOOKAHEAD_OPTIONS.map((days) => (
                <SelectItem key={days} value={String(days)}>
                  {days} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Total Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(summary.pipelineValue)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Est. at {formatMoney(DEFAULT_LABOR_RATE)}/hr blended labor rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summary.conversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed View */}
      <Tabs defaultValue="prediction" className="w-full">
        <TabsList>
          <TabsTrigger value="prediction">Prediction Pipeline</TabsTrigger>
          <TabsTrigger value="manual">Manual Pipeline</TabsTrigger>
        </TabsList>

        {/* ── Prediction Pipeline Tab ────────────────────────────────────── */}
        <TabsContent value="prediction" className="space-y-5 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Opportunity Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Aircraft</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Predicted Maintenance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Est. Labor Hrs</TableHead>
                      <TableHead className="text-right">Est. Revenue</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                          No pipeline opportunities in this lookahead window.
                        </TableCell>
                      </TableRow>
                    ) : (
                      opportunities.map((opp) => (
                        <TableRow key={opp.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium">{opp.aircraftTail}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <Building2 className="w-3 h-3" />
                              {opp.customerName}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[420px] truncate">{opp.maintenanceType}</TableCell>
                          <TableCell>{formatDate(opp.dueDate)}</TableCell>
                          <TableCell className="text-right">{opp.estimatedLaborHours}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatMoney(opp.estimatedValue)}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_BADGES[opp.status]}>{STATUS_LABELS[opp.status]}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-base font-semibold mb-2">Pipeline Kanban</h2>
            <PipelineKanban opportunities={opportunities} />
          </div>
        </TabsContent>

        {/* ── Manual Pipeline Tab ────────────────────────────────────────── */}
        <TabsContent value="manual" className="space-y-5 mt-4">
          {manualOpportunities === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-64" />
            </div>
          ) : (
            <>
              {/* Manual Pipeline Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Manual Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead>Title</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-right">Probability</TableHead>
                          <TableHead>Expected Close</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manualOpportunities.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center text-sm text-muted-foreground py-10"
                            >
                              No manual opportunities yet. Click "Create Opportunity" to add one.
                            </TableCell>
                          </TableRow>
                        ) : (
                          manualGrouped?.stages.map((stage) =>
                            manualGrouped.groups[stage].map((opp) => (
                              <TableRow key={opp._id} className="hover:bg-muted/20">
                                <TableCell className="font-medium max-w-[240px] truncate">
                                  {opp.title}
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                    <Building2 className="w-3 h-3" />
                                    {customerNameMap.get(opp.customerId) ?? "Unknown"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge className={MANUAL_STAGE_BADGES[stage]}>
                                    {MANUAL_STAGE_LABELS[stage]}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatMoney(opp.estimatedValue)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {opp.probability != null ? `${opp.probability}%` : "--"}
                                </TableCell>
                                <TableCell>
                                  {opp.expectedCloseDate ? (
                                    <span className="inline-flex items-center gap-1 text-sm">
                                      <Calendar className="w-3 h-3 text-muted-foreground" />
                                      {formatDate(opp.expectedCloseDate)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">--</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {opp.source ? (
                                    <span className="text-sm">
                                      {SOURCE_LABELS[opp.source] ?? opp.source}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">--</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            )),
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Win/Loss Summary Cards */}
              {manualSummary && (
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                  <Card className="border-emerald-500/30">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Total Won
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold text-emerald-600">
                        {manualSummary.wonCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(manualSummary.wonValue)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-red-500/30">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Total Lost
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold text-red-600">
                        {manualSummary.lostCount}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Win Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">
                        {manualSummary.winRate.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Avg Deal Size
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">
                        {formatMoney(manualSummary.avgDealSize)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Opportunity Dialog */}
      <CreateOpportunityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
