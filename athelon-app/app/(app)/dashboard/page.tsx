"use client";

import Link from "next/link";
import { Wrench, ShieldAlert, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StatCards } from "./_components/StatCards";
import { RecentActivity, type AttentionItem } from "./_components/RecentActivity";
import { QuickActions } from "./_components/QuickActions";

export default function DashboardPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id as Id<"organizations"> | undefined;
  const args = orgId ? { organizationId: orgId } : "skip";

  // ── Live data queries ──────────────────────────────────────────────────────
  const openWoCount = useQuery(
    api.workOrders.countActive,
    args as { organizationId: Id<"organizations"> } | "skip",
  );

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

  const fleet = useQuery(
    api.aircraft.list,
    args as { organizationId: Id<"organizations"> } | "skip",
  );

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
      <StatCards
        openWoCount={openWoCount}
        squawkCount={squawkCount}
        partsCount={partsCount}
        expiringCertCount={expiringCertCount}
        isLoading={statsLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Attention Queue + Work Orders */}
        <div className="lg:col-span-2">
          <RecentActivity
            attentionItems={attentionItems}
            activeWorkOrders={activeWorkOrders}
            statsLoading={statsLoading}
          />
        </div>

        {/* Right: Fleet Status + Quick Actions */}
        <div>
          <QuickActions fleet={fleet} />
        </div>
      </div>
    </div>
  );
}
