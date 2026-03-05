import { Badge } from "@/components/ui/badge";

type PartStatus =
  | "requested"
  | "ordered"
  | "shipped"
  | "received"
  | "in_stock"
  | "pending_inspection"
  | "issued"
  | "installed"
  | "returned"
  | "quarantine"
  | "scrapped";

const STATUS_META: Record<PartStatus, { label: string; className: string }> = {
  requested: {
    label: "Requested",
    className: "bg-transparent text-red-600 dark:text-red-400 border-red-500/50",
  },
  ordered: {
    label: "Ordered",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  shipped: {
    label: "Shipped",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  received: {
    label: "Received",
    className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  // BUG-PC-01: "inventory" (in-stock parts) was incorrectly mapped to the
  // "received" status (label: "Received", purple badge). Parts that have
  // passed receiving inspection and are available in stock should show
  // "In Stock" with a distinct green color — not the purple "Received" badge
  // which implies the part just arrived from a supplier.
  in_stock: {
    label: "In Stock",
    className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  },
  pending_inspection: {
    label: "Pending Inspection",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  issued: {
    label: "Issued",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  installed: {
    label: "Installed",
    className: "bg-green-600 text-white border-green-700/70",
  },
  returned: {
    label: "Returned",
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  },
  quarantine: {
    label: "Quarantine",
    className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  },
  scrapped: {
    label: "Scrapped",
    className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  },
};

function mapRawStatus(status: string): PartStatus {
  if (status === "requested" || status === "ordered" || status === "shipped" || status === "received") {
    return status;
  }
  if (status === "issued" || status === "removed_pending_disposition") return "issued";
  if (status === "installed") return "installed";
  if (status === "pending_inspection") return "pending_inspection";
  // BUG-PC-01 fix: "inventory" location = part is in stock after passing
  // receiving inspection. Map to "in_stock" (green "In Stock" badge) instead
  // of "received" (purple "Received" badge) which caused confusion for parts
  // clerks because "Received" implies the part just arrived, not that it's
  // cleared and available for issuance.
  if (status === "inventory") return "in_stock";
  if (status === "quarantine") return "quarantine";
  if (status === "scrapped") return "scrapped";
  if (status === "returned_to_stock" || status === "returned_to_vendor") return "returned";
  return "requested";
}

export function getPartStatusColor(status: string): string {
  return STATUS_META[mapRawStatus(status)].className;
}

export function PartStatusBadge({ status, className }: { status: string; className?: string }) {
  const normalized = mapRawStatus(status);
  const meta = STATUS_META[normalized];
  return (
    <Badge variant="outline" className={`text-[10px] font-medium border ${meta.className} ${className ?? ""}`}>
      {meta.label}
    </Badge>
  );
}
