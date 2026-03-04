import { Badge } from "@/components/ui/badge";

type PartStatus =
  | "requested"
  | "ordered"
  | "shipped"
  | "received"
  | "issued"
  | "installed"
  | "returned";

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
    className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  },
  issued: {
    label: "Issued",
    className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  installed: {
    label: "Installed",
    className: "bg-green-600 text-white border-green-700/70",
  },
  returned: {
    label: "Returned",
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  },
};

function mapRawStatus(status: string): PartStatus {
  if (status === "requested" || status === "ordered" || status === "shipped" || status === "received") {
    return status;
  }
  if (status === "issued") return "issued";
  if (status === "installed") return "installed";
  if (status === "pending_inspection") return "received";
  if (status === "inventory") return "received";
  if (status === "returned_to_stock" || status === "returned_to_vendor") return "returned";
  return "received";
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
