"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineKanban } from "../_components/PipelineKanban";
import type {
  PipelineOpportunity,
  PipelineStatus,
} from "../_components/OpportunityCard";
import { Building2, DollarSign, Percent, Target } from "lucide-react";

const LOOKAHEAD_OPTIONS = [30, 60, 90, 180] as const;

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

export default function CrmPipelinePage() {
  const { orgId } = useCurrentOrg();
  const [lookaheadDays, setLookaheadDays] = useState<number>(90);

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

  const isLoading = !orgId || !predictions || !aircraft || !customers || !workOrders;

  const opportunities = useMemo<PipelineOpportunity[]>(() => {
    if (!predictions || !aircraft || !customers || !workOrders) return [];

    const endTs = Date.now() + lookaheadDays * 24 * 60 * 60 * 1000;

    const customerMap = new Map(customers.map((c) => [c._id, c.name]));
    const aircraftMap = new Map(aircraft.map((a) => [a._id, a]));

    const openWoAircraft = new Set(
      workOrders
        .filter((wo) => !["closed", "cancelled", "voided"].includes(wo.status))
        .map((wo) => wo.aircraft?._id)
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
        const estimatedRevenue = estimatedLaborHours * 185;
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

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Prediction-driven opportunities from upcoming maintenance demand.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
    </div>
  );
}
