"use client";

import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ClipboardList,
  ChevronRight,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AttentionSeverity = "critical" | "warning" | "info";

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  description: string;
  action: string;
  href: string;
  Icon: React.ElementType;
}

interface ActiveWorkOrder {
  _id: string;
  workOrderNumber: string;
  status: string;
  openedAt: number;
  description: string;
  aircraft?: {
    currentRegistration?: string;
    make?: string;
    model?: string;
  };
}

interface RecentActivityProps {
  attentionItems: AttentionItem[];
  activeWorkOrders: ActiveWorkOrder[] | undefined;
  statsLoading: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    in_progress: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30",
    pending_signoff:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    on_hold: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30",
    draft: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30",
    closed: "bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30",
    open: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30",
    pending_inspection:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    open_discrepancies: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30",
  };
  const statusLabels: Record<string, string> = {
    in_progress: "In Progress",
    pending_signoff: "Pending Sign-Off",
    on_hold: "On Hold",
    draft: "Draft",
    closed: "Closed",
    open: "Open",
    pending_inspection: "Pending Inspection",
    open_discrepancies: "Open Discrepancies",
  };
  return (
    <Badge
      variant="outline"
      className={`font-medium text-[10px] ${map[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {statusLabels[status] ?? status}
    </Badge>
  );
}

function getSeverityStyles(severity: AttentionSeverity) {
  const map: Record<
    AttentionSeverity,
    { border: string; icon: string; bg: string }
  > = {
    critical: {
      border: "border-l-red-500",
      icon: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/5",
    },
    warning: {
      border: "border-l-amber-500",
      icon: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/5",
    },
    info: {
      border: "border-l-sky-500",
      icon: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/5",
    },
  };
  return map[severity];
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function RecentActivity({
  attentionItems,
  activeWorkOrders,
  statsLoading,
}: RecentActivityProps) {
  return (
    <div className="space-y-6">
      {/* Attention Queue */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Attention Required
              {!statsLoading && (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                >
                  {attentionItems.length}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {statsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : attentionItems.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-400/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No attention items</p>
            </div>
          ) : (
            attentionItems.map((item) => {
              const styles = getSeverityStyles(item.severity);
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-l-2 ${styles.border} ${styles.bg} border border-border/40`}
                >
                  <item.Icon
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.icon}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] flex-shrink-0"
                  >
                    <Link to={item.href}>{item.action}</Link>
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Active Work Orders */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              Active Work Orders
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/work-orders" className="flex items-center gap-1">
                View All
                <ChevronRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          {activeWorkOrders === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activeWorkOrders.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-400/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No active work orders
              </p>
            </div>
          ) : (
            activeWorkOrders.map((wo, i) => {
              const daysOpen = Math.floor(
                (Date.now() - wo.openedAt) / (1000 * 60 * 60 * 24),
              );
              return (
                <div key={wo._id}>
                  {i > 0 && <Separator className="my-1 opacity-40" />}
                  <Link to={`/work-orders/${wo._id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs text-muted-foreground font-medium">
                            {wo.workOrderNumber}
                          </span>
                          {getStatusBadge(wo.status)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {wo.aircraft && (
                            <span className="font-mono text-sm font-semibold text-foreground">
                              {wo.aircraft.currentRegistration}
                            </span>
                          )}
                          {wo.aircraft && (
                            <span className="text-xs text-muted-foreground">
                              {wo.aircraft.make} {wo.aircraft.model}
                            </span>
                          )}
                          <span className="text-muted-foreground text-xs">·</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {wo.description}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Timer className="w-3 h-3 text-muted-foreground/60" />
                          <span className="text-[10px] text-muted-foreground/60">
                            {daysOpen}d open
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
