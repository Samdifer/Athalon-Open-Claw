import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  DollarSign,
  Bell,
  ClipboardCheck,
  FileBox,
  Package,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

type InventoryValueResult = {
  totalValue: number;
  partCount: number;
  conditionBreakdown: Record<string, { count: number; value: number }>;
};

type AlertsSummaryResult = {
  lowStock: number;
  expiringSoon: number;
  total: number;
};

type OpenPartRequest = {
  _id: string;
  partNumber: string;
  status: string;
};

export function InventoryHealthSection() {
  const { orgId } = useCurrentOrg();

  const inventoryValue = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types resolve after convex dev
    (api as Record<string, Record<string, unknown>>).inventoryValuation?.getInventoryValue as typeof api.parts.listParts,
    orgId ? { organizationId: orgId } : "skip",
  ) as InventoryValueResult | undefined;

  const alertsSummary = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types resolve after convex dev
    (api as Record<string, Record<string, unknown>>).inventoryAlerts?.getReorderAlerts as typeof api.parts.listParts,
    orgId ? { organizationId: orgId } : "skip",
  ) as AlertsSummaryResult | undefined;

  const pendingInspection = useQuery(
    api.parts.listParts,
    orgId ? { organizationId: orgId, location: "pending_inspection" as const } : "skip",
  );

  const openRequests = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types resolve after convex dev
    (api as Record<string, Record<string, unknown>>).workOrderParts?.listOpenRequests as typeof api.parts.listParts,
    orgId ? { organizationId: orgId } : "skip",
  ) as OpenPartRequest[] | undefined;

  const totalValue = inventoryValue?.totalValue ?? null;
  const partCount = inventoryValue?.partCount ?? null;
  const alertCount = alertsSummary?.total ?? alertsSummary?.lowStock ?? null;
  const pendingCount = pendingInspection?.length ?? null;
  const openRequestCount = Array.isArray(openRequests) ? openRequests.length : null;

  const cards = [
    {
      title: "Total Inventory Value",
      value: totalValue !== null
        ? `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : null,
      sub: partCount !== null ? `${partCount} parts tracked` : "Loading...",
      icon: DollarSign,
      href: "/reports/inventory",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      alert: false,
    },
    {
      title: "Low Stock Alerts",
      value: alertCount,
      sub: "parts at or below reorder point",
      icon: Bell,
      href: "/parts/alerts",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      alert: (alertCount ?? 0) > 0,
    },
    {
      title: "Parts Awaiting Inspection",
      value: pendingCount,
      sub: "pending receiving inspection",
      icon: ClipboardCheck,
      href: "/parts/receiving",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      alert: (pendingCount ?? 0) > 0,
    },
    {
      title: "Open Part Requests",
      value: openRequestCount,
      sub: "work order parts needed",
      icon: FileBox,
      href: "/parts/requests",
      color: "text-sky-400",
      bgColor: "bg-sky-500/10",
      alert: (openRequestCount ?? 0) > 5,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          Inventory Health
        </h2>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link to="/parts" className="flex items-center gap-1">
            View Inventory
            <ChevronRight className="w-3 h-3" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link key={c.title} to={c.href}>
            <Card
              className={`hover:bg-card/80 transition-colors cursor-pointer border-border/60 ${
                c.alert ? "border-amber-500/30" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {c.title}
                    </p>
                    <span className="block text-2xl font-bold text-foreground mt-1">
                      {c.value ?? <Skeleton className="h-7 w-10 inline-block" />}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${c.bgColor}`}>
                    <c.icon className={`w-4 h-4 ${c.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
