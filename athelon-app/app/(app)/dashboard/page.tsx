"use client";

import {
  AlertTriangle,
  ClipboardList,
  Package,
  ShieldAlert,
  Wrench,
  TrendingUp,
  Clock,
  ChevronRight,
  CheckCircle2,
  Circle,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusBadge(status: string, priority?: string) {
  if (priority === "aog")
    return (
      <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 font-medium text-[10px]">
        AOG
      </Badge>
    );
  const map: Record<string, string> = {
    in_progress: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    pending_signoff:
      "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    on_hold: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    draft: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
    closed: "bg-green-500/15 text-green-400 border border-green-500/30",
    open: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    pending_inspection:
      "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    open_discrepancies:
      "bg-red-500/15 text-red-400 border border-red-500/30",
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

function getSeverityStyles(severity: string) {
  const map: Record<string, { border: string; icon: string; bg: string }> = {
    critical: {
      border: "border-l-red-500",
      icon: "text-red-400",
      bg: "bg-red-500/5",
    },
    warning: {
      border: "border-l-amber-500",
      icon: "text-amber-400",
      bg: "bg-amber-500/5",
    },
    info: {
      border: "border-l-sky-500",
      icon: "text-sky-400",
      bg: "bg-sky-500/5",
    },
  };
  return map[severity] ?? map["info"]!;
}

function getAircraftStatusDot(status: string): string {
  const map: Record<string, string> = {
    airworthy: "bg-green-400",
    airworthy_with_limitations: "bg-amber-400",
    grounded_airworthiness: "bg-red-500",
    in_maintenance: "bg-sky-400",
    aog: "bg-red-500",
  };
  return map[status] ?? "bg-muted-foreground";
}

function getAircraftStatusColor(status: string): string {
  const map: Record<string, string> = {
    airworthy: "text-green-400",
    airworthy_with_limitations: "text-amber-400",
    grounded_airworthiness: "text-red-400",
    in_maintenance: "text-sky-400",
    aog: "text-red-400",
  };
  return map[status] ?? "text-muted-foreground";
}

function getAircraftStatusLabel(status: string): string {
  const map: Record<string, string> = {
    airworthy: "Airworthy",
    airworthy_with_limitations: "Airworthy w/ Limits",
    grounded_airworthiness: "Grounded",
    in_maintenance: "In Maintenance",
    aog: "AOG",
  };
  return map[status] ?? status;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id as Id<"organizations"> | undefined;
  const args = orgId ? { organizationId: orgId } : "skip";

  // ── Live data queries ──────────────────────────────────────────────────────
  const openWoCount = useQuery(api.workOrders.countActive, args as { organizationId: Id<"organizations"> } | "skip");

  const openSquawks = useQuery(
    api.discrepancies.listDiscrepancies,
    orgId ? { organizationId: orgId, status: "open" } : "skip",
  );

  const pendingParts = useQuery(
    api.parts.listParts,
    orgId ? { organizationId: orgId, location: "pending_inspection" } : "skip",
  );

  const expiringCerts = useQuery(
    api.technicians.listWithExpiringCerts,
    orgId ? { organizationId: orgId, withinDays: 30 } : "skip",
  );

  const activeWorkOrders = useQuery(
    api.workOrders.listActive,
    orgId ? { organizationId: orgId, limit: 5 } : "skip",
  );

  const fleet = useQuery(api.aircraft.list, args as { organizationId: Id<"organizations"> } | "skip");

  // ── Derived values ─────────────────────────────────────────────────────────
  const squawkCount = openSquawks?.length ?? 0;
  const partsCount = pendingParts?.length ?? 0;
  const expiringCertCount = expiringCerts?.length ?? 0;

  const statsLoading =
    openWoCount === undefined ||
    openSquawks === undefined ||
    pendingParts === undefined ||
    expiringCerts === undefined;

  // ── Build attention items from live data ───────────────────────────────────
  type AttentionItem = {
    id: string;
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    action: string;
    href: string;
    Icon: React.ElementType;
  };

  const attentionItems: AttentionItem[] = [];

  // Expiring certs → critical attention
  for (const entry of expiringCerts ?? []) {
    if (!entry.technician || !entry.cert.iaExpiryDate) continue;
    const daysLeft = Math.ceil(
      (entry.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24),
    );
    attentionItems.push({
      id: `cert-${entry.cert._id}`,
      severity: daysLeft <= 7 ? "critical" : "warning",
      title: "IA Certificate Expiring",
      description: `${entry.technician.legalName} — ${entry.cert.certificateNumber} expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      action: "View Personnel",
      href: "/personnel",
      Icon: ShieldAlert,
    });
  }

  // Open squawks → warning
  for (const sq of (openSquawks ?? []).slice(0, 2)) {
    attentionItems.push({
      id: `sq-${sq._id}`,
      severity: "warning",
      title: "Open Squawk",
      description: `${sq.discrepancyNumber} — ${sq.description.slice(0, 80)}${sq.description.length > 80 ? "…" : ""}`,
      action: "View Squawk",
      href: "/squawks",
      Icon: AlertTriangle,
    });
  }

  // Pending parts → info
  if (partsCount > 0) {
    attentionItems.push({
      id: "parts-pending",
      severity: "info",
      title: "Parts Pending Inspection",
      description: `${partsCount} part${partsCount !== 1 ? "s" : ""} received and awaiting inspection`,
      action: "View Parts",
      href: "/parts/requests",
      Icon: Package,
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {organization?.name ?? "Loading…"} —{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/work-orders/new">
            <Wrench className="w-3.5 h-3.5 mr-1.5" />
            New Work Order
          </Link>
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Open Work Orders */}
        <Link href="/work-orders">
          <Card className="hover:bg-card/80 transition-colors cursor-pointer border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Open Work Orders
                  </p>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {statsLoading ? (
                      <Skeleton className="h-7 w-10 inline-block" />
                    ) : (
                      (openWoCount ?? 0)
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    active
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-sky-500/10">
                  <ClipboardList className="w-4 h-4 text-sky-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Active Squawks */}
        <Link href="/squawks">
          <Card className="hover:bg-card/80 transition-colors cursor-pointer border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Active Squawks
                  </p>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {statsLoading ? (
                      <Skeleton className="h-7 w-10 inline-block" />
                    ) : (
                      squawkCount
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    open
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Parts Pending */}
        <Link href="/parts/requests">
          <Card className="hover:bg-card/80 transition-colors cursor-pointer border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Parts Pending
                  </p>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {statsLoading ? (
                      <Skeleton className="h-7 w-10 inline-block" />
                    ) : (
                      partsCount
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    awaiting inspection
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Package className="w-4 h-4 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Certs Expiring */}
        <Link href="/personnel">
          <Card className="hover:bg-card/80 transition-colors cursor-pointer border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Certs Expiring
                  </p>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {statsLoading ? (
                      <Skeleton className="h-7 w-10 inline-block" />
                    ) : (
                      expiringCertCount
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    within 30 days
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <ShieldAlert className="w-4 h-4 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Attention Queue + Work Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attention Queue */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Attention Required
                  {!statsLoading && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30"
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
                  <p className="text-sm text-muted-foreground">
                    No attention items
                  </p>
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
                        <Link href={item.href}>{item.action}</Link>
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
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Link href="/work-orders" className="flex items-center gap-1">
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
                      <Link href={`/work-orders/${wo.workOrderNumber}`}>
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
                              <span className="text-muted-foreground text-xs">
                                ·
                              </span>
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

        {/* Right: Fleet Status + Quick Actions */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Fleet Status
                </CardTitle>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Link href="/fleet" className="flex items-center gap-1">
                    View All
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {fleet === undefined ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : fleet.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No aircraft
                </p>
              ) : (
                fleet.map((aircraft, i) => (
                  <div key={aircraft._id}>
                    {i > 0 && <Separator className="my-1 opacity-40" />}
                    <Link href={`/fleet/${aircraft.currentRegistration}`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${getAircraftStatusDot(aircraft.status)}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-sm text-foreground">
                              {aircraft.currentRegistration}
                            </span>
                            {aircraft.openWorkOrderCount > 0 && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] h-4 px-1 bg-muted"
                              >
                                {aircraft.openWorkOrderCount} WO
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {aircraft.make} {aircraft.model}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-medium flex-shrink-0 ${getAircraftStatusColor(aircraft.status)}`}
                        >
                          {getAircraftStatusLabel(aircraft.status)}
                        </span>
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link href="/work-orders/new">
                  <Wrench className="w-3.5 h-3.5" />
                  New Work Order
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link href="/squawks">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Log Squawk
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link href="/parts/requests">
                  <Package className="w-3.5 h-3.5" />
                  View Parts Queue
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start h-9 text-xs gap-2 border-border/60"
                size="sm"
              >
                <Link href="/compliance/audit-trail">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Audit Trail
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
