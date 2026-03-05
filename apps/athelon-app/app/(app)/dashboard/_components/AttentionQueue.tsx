import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { FunctionReturnType } from "convex/server";
import {
  AlertTriangle,
  ClipboardList,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { getSeverityStyles } from "./dashboardHelpers";

type WorkOrdersWithRisk = FunctionReturnType<typeof api.workOrders.getWorkOrdersWithScheduleRisk>;

export function AttentionQueue({ workOrders }: { workOrders: WorkOrdersWithRisk | undefined }) {
  const { orgId } = useCurrentOrg();

  const expiringCerts = useQuery(
    api.technicians.listWithExpiringCerts,
    orgId ? { organizationId: orgId, withinDays: 30 } : "skip",
  );

  const items = useMemo(() => {
    if (workOrders === undefined || expiringCerts === undefined) return null;

    type AttentionItem = {
      id: string;
      severity: "critical" | "warning" | "info";
      title: string;
      description: string;
      action: string;
      href: string;
      icon: typeof AlertTriangle;
    };

    const result: AttentionItem[] = [];

    // AOG aircraft
    const aogWOs = workOrders.filter(
      (wo) => wo.priority === "aog" && !["closed", "voided", "cancelled"].includes(wo.status),
    );
    for (const wo of aogWOs.slice(0, 2)) {
      const tail = wo.aircraft?.currentRegistration ?? "Unknown aircraft";
      const type = wo.aircraft ? `${wo.aircraft.make} ${wo.aircraft.model}` : "";
      result.push({
        id: `aog-${wo._id}`,
        severity: "critical",
        title: "AOG Aircraft",
        description: `${tail}${type ? ` ${type}` : ""} — ${wo.description ?? "No description"} (${wo.workOrderNumber})`,
        action: "View WO",
        href: `/work-orders/${wo._id}`,
        icon: AlertTriangle,
      });
    }

    // WOs with open squawks
    const squawkWOs = workOrders.filter(
      (wo) =>
        wo.priority !== "aog" &&
        (wo.openDiscrepancyCount ?? 0) > 0 &&
        !["closed", "voided", "cancelled"].includes(wo.status),
    );
    for (const wo of squawkWOs.slice(0, 2)) {
      const tail = wo.aircraft?.currentRegistration ?? "Unknown";
      const count = wo.openDiscrepancyCount ?? 0;
      result.push({
        id: `squawk-${wo._id}`,
        severity: "warning",
        title: "Open Squawk(s) Requiring Disposition",
        description: `${count} open squawk${count !== 1 ? "s" : ""} on ${wo.workOrderNumber} (${tail})`,
        action: "View",
        href: "/squawks",
        icon: AlertTriangle,
      });
    }

    // WOs awaiting QCM sign-off
    const pendingSignoffWOs = workOrders.filter((wo) => wo.status === "pending_signoff");
    if (pendingSignoffWOs.length > 0) {
      result.push({
        id: "pending-signoff",
        severity: "warning",
        title: `${pendingSignoffWOs.length} Work Order${pendingSignoffWOs.length !== 1 ? "s" : ""} Awaiting Sign-Off`,
        description: pendingSignoffWOs.length === 1
          ? `${pendingSignoffWOs[0]!.workOrderNumber} (${pendingSignoffWOs[0]!.aircraft?.currentRegistration ?? "—"}) is ready for QCM release`
          : `${pendingSignoffWOs.map((w) => w.workOrderNumber).slice(0, 3).join(", ")}${pendingSignoffWOs.length > 3 ? ` +${pendingSignoffWOs.length - 3} more` : ""} — QCM sign-off required`,
        action: "View",
        href: "/work-orders",
        icon: ClipboardList,
      });
    }

    // Expiring or expired IA certs
    for (const entry of (expiringCerts ?? []).slice(0, 3)) {
      const tech = entry.technician as { legalName?: string } | null;
      const name = tech?.legalName ?? "Unknown technician";
      const expiry = (entry.cert as { iaExpiryDate?: number }).iaExpiryDate;
      const daysLeft = expiry != null
        ? Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      const isPast = daysLeft !== null && daysLeft <= 0;
      result.push({
        id: `cert-${(entry.cert as { _id: string })._id}`,
        severity: isPast || (daysLeft !== null && daysLeft <= 7) ? "critical" : "warning",
        title: isPast ? "IA Certificate EXPIRED" : "IA Certificate Expiring",
        description: isPast
          ? `${name} — IA cert has expired`
          : `${name} — expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
        action: "View",
        href: "/compliance/audit-trail",
        icon: ShieldAlert,
      });
    }

    return result;
  }, [workOrders, expiringCerts]);

  if (items === null) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle2 className="w-6 h-6 mb-2 text-green-400" />
        <p className="text-sm">All clear — no items require attention</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const styles = getSeverityStyles(item.severity);
        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-lg border-l-2 ${styles.border} ${styles.bg} border border-border/40`}
          >
            <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.icon}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{item.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                {item.description}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[11px] flex-shrink-0">
              <Link to={item.href}>{item.action}</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
